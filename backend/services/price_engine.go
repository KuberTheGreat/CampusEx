package services

import (
	"log"
	"math"
	"sync"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
)

var (
	priceTickerMu       sync.Mutex
	priceTickerInterval time.Duration = 1 * time.Minute // Default 1 min
	priceTickerStop     chan struct{}
	priceTickerRunning  bool
)

// GetPriceEngineInterval returns the current interval in seconds
func GetPriceEngineInterval() int {
	priceTickerMu.Lock()
	defer priceTickerMu.Unlock()
	return int(priceTickerInterval.Seconds())
}

// SetPriceEngineInterval updates the ticker interval and restarts the engine
func SetPriceEngineInterval(seconds int) {
	priceTickerMu.Lock()
	defer priceTickerMu.Unlock()

	priceTickerInterval = time.Duration(seconds) * time.Second

	// Stop the current ticker if running
	if priceTickerRunning && priceTickerStop != nil {
		close(priceTickerStop)
		priceTickerRunning = false
	}

	// Start a new one with the updated interval
	priceTickerStop = make(chan struct{})
	priceTickerRunning = true
	go runPriceLoop(priceTickerStop, priceTickerInterval)

	log.Printf("[PriceEngine] Interval updated to %d seconds\n", seconds)
}

// StartPriceEngine initializes and starts the price calculation cron loop
func StartPriceEngine() {
	priceTickerMu.Lock()
	priceTickerStop = make(chan struct{})
	priceTickerRunning = true
	interval := priceTickerInterval
	priceTickerMu.Unlock()

	go runPriceLoop(priceTickerStop, interval)
	log.Printf("[PriceEngine] Started with %v interval\n", interval)
}

func runPriceLoop(stop chan struct{}, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			calculateAndUpdatePrices()
		case <-stop:
			log.Println("[PriceEngine] Stopped")
			return
		}
	}
}

func calculateAndUpdatePrices() {
	today := time.Now().UTC().Format("2006-01-02")

	// Fetch all daily stats that have unprocessed volume
	var allStats []models.DailyStats
	if err := database.DB.Where("date = ? AND (buy_volume > 0 OR sell_volume > 0)", today).Find(&allStats).Error; err != nil {
		log.Println("[PriceEngine] Error fetching daily stats:", err)
		return
	}

	if len(allStats) == 0 {
		return // Nothing to process
	}

	updatedCount := 0

	for _, stats := range allStats {
		totalVolume := stats.BuyVolume + stats.SellVolume
		if totalVolume == 0 {
			continue
		}

		// Fetch the stock user
		var u models.User
		if err := database.DB.First(&u, stats.StockUserID).Error; err != nil {
			continue
		}

		// Direction: which way the pressure pushes (+1 = pure buy, -1 = pure sell)
		direction := float64(stats.BuyVolume-stats.SellVolume) / float64(totalVolume)

		// Magnitude: how significant is this volume?
		// Scale logarithmically so 1 share = mild, 100 shares = strong
		// Base impact of 0.5% per unit of log-volume, scaled by direction
		magnitude := math.Log2(float64(totalVolume) + 1) * 0.005 // ~0.5% per doubling of volume

		changeFactor := direction * magnitude

		// Clamp to ±10% per tick
		changeFactor = math.Max(-0.10, math.Min(0.10, changeFactor))

		newPrice := u.CurrentPrice * (1.0 + changeFactor)

		// Enforce minimum price floor
		if newPrice < 1.0 {
			newPrice = 1.0
		}

		// Update the user's price
		database.DB.Model(&u).Update("current_price", newPrice)

		// Record price history — never overwrite, always append
		history := models.PriceHistory{
			UserID:     u.ID,
			Price:      newPrice,
			RecordedAt: time.Now().UTC(),
		}
		database.DB.Create(&history)

		// CRITICAL: Reset the consumed volume so it's not re-processed next tick
		database.DB.Model(&stats).Updates(map[string]interface{}{
			"buy_volume":  0,
			"sell_volume": 0,
		})

		log.Printf("[PriceEngine] %s: buyVol=%d sellVol=%d dir=%.2f mag=%.4f change=%.4f newPrice=%.2f",
			u.StockSymbol, stats.BuyVolume, stats.SellVolume, direction, magnitude, changeFactor, newPrice)

		updatedCount++
	}

	if updatedCount > 0 {
		log.Printf("[PriceEngine] Tick complete — updated %d stock(s)\n", updatedCount)
	}
}
