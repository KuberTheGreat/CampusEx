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

	// Fetch all listed users
	var users []models.User
	if err := database.DB.Where("is_listed = ?", true).Find(&users).Error; err != nil {
		log.Println("[PriceEngine] Error fetching users:", err)
		return
	}

	updatedCount := 0

	for _, u := range users {
		// Fetch today's volume stats for this user
		var stats models.DailyStats
		err := database.DB.Where("stock_user_id = ? AND date = ?", u.ID, today).First(&stats).Error
		if err != nil {
			// No trades today for this stock — skip
			continue
		}

		totalVolume := stats.BuyVolume + stats.SellVolume
		if totalVolume == 0 {
			continue
		}

		// Core formula: changeFactor = (buyVolume - sellVolume) / totalVolume
		changeFactor := float64(stats.BuyVolume-stats.SellVolume) / float64(totalVolume)

		// Clamp to ±10%
		changeFactor = math.Max(-0.10, math.Min(0.10, changeFactor))

		newPrice := u.CurrentPrice * (1.0 + changeFactor)

		// Enforce minimum price floor
		if newPrice < 1.0 {
			newPrice = 1.0
		}

		// Update the user's price
		u.CurrentPrice = newPrice
		database.DB.Model(&u).Update("current_price", newPrice)

		// Record price history — never overwrite, always append
		history := models.PriceHistory{
			UserID:     u.ID,
			Price:      newPrice,
			RecordedAt: time.Now().UTC(),
		}
		database.DB.Create(&history)

		updatedCount++
	}

	if updatedCount > 0 {
		log.Printf("[PriceEngine] Tick complete — updated %d stock(s)\n", updatedCount)
	}
}
