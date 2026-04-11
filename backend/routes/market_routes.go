package routes

import (
	"math/rand"
	"net/http"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
)

func RegisterMarketRoutes(router *gin.RouterGroup) {
	market := router.Group("/market")
	{
		market.GET("/leaderboard", getLeaderboard)
		market.POST("/trade", executeTrade)
		market.POST("/test-tick", testTick)
	}
}

func getLeaderboard(c *gin.Context) {
	// Query params: filterBy, sortBy (price, popularity, recent)
	sortBy := c.DefaultQuery("sort", "price")
	year := c.Query("year")
	trait := c.Query("trait")

	db := database.DB.Model(&models.User{}).Where("is_listed = ?", true)

	if year != "" {
		// E.g. email LIKE '%2024%'
		db = db.Where("email LIKE ?", "%"+year+"%")
	}

	if trait != "" {
		// Join with traits table implicitly
		db = db.Joins("JOIN traits ON traits.user_id = users.id").
			Where("traits.name ILIKE ? AND traits.is_hidden = ?", "%"+trait+"%", false)
	}

	switch sortBy {
	case "popularity":
		db = db.Order("total_volume DESC")
	case "recent":
		db = db.Order("ipo_date DESC")
	default:
		db = db.Order("current_price DESC")
	}

	var users []models.User
	if err := db.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leaderboard"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"leaderboard": users})
}

type TradeRequest struct {
	BuyerID      uint    `json:"buyerId"`
	TargetUserID uint    `json:"targetUserId"`
	Shares       int     `json:"shares"`
	Type         string  `json:"type"` // "BUY" or "SELL"
}

func executeTrade(c *gin.Context) {
	var req TradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var buyer models.User
	if err := tx.First(&buyer, req.BuyerID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Buyer not found"})
		return
	}

	var target models.User
	if err := tx.First(&target, req.TargetUserID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Target stock not found"})
		return
	}

	totalValue := float64(req.Shares) * target.CurrentPrice

	if req.Type == "BUY" {
		if buyer.AuraCoins < totalValue {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient AURA coins"})
			return
		}
		buyer.AuraCoins -= totalValue
		target.TotalVolume += req.Shares

		// Add to portfolio
		var portfolio models.Portfolio
		err := tx.Where("owner_id = ? AND stock_user_id = ?", buyer.ID, target.ID).First(&portfolio).Error
		if err != nil {
			portfolio = models.Portfolio{
				OwnerID:      buyer.ID,
				StockUserID:  target.ID,
				SharesOwned:  req.Shares,
				AveragePrice: target.CurrentPrice,
			}
			tx.Create(&portfolio)
		} else {
			// Update average price
			totalCost := (float64(portfolio.SharesOwned) * portfolio.AveragePrice) + totalValue
			portfolio.SharesOwned += req.Shares
			portfolio.AveragePrice = totalCost / float64(portfolio.SharesOwned)
			tx.Save(&portfolio)
		}

	} else if req.Type == "SELL" {
		var portfolio models.Portfolio
		err := tx.Where("owner_id = ? AND stock_user_id = ?", buyer.ID, target.ID).First(&portfolio).Error
		if err != nil || portfolio.SharesOwned < req.Shares {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient shares to sell"})
			return
		}

		buyer.AuraCoins += totalValue
		target.TotalVolume += req.Shares

		portfolio.SharesOwned -= req.Shares
		if portfolio.SharesOwned == 0 {
			tx.Delete(&portfolio)
		} else {
			tx.Save(&portfolio)
		}
	} else {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trade type"})
		return
	}

	// Record transaction
	trade := models.Transaction{
		BuyerID:        buyer.ID,
		TargetUserID:   target.ID,
		Shares:         req.Shares,
		ExecutionPrice: target.CurrentPrice,
		Type:           models.TradeType(req.Type),
	}
	tx.Create(&trade)

	tx.Save(&buyer)
	tx.Save(&target)
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Trade successful", "newBalance": buyer.AuraCoins})
}

func testTick(c *gin.Context) {
	// A simple endpoint to instantly update stock prices randomly to simulate market forces
	var users []models.User
	database.DB.Where("is_listed = ?", true).Find(&users)

	for _, u := range users {
		// Random volatility between -5% to +5%
		changePercent := (rand.Float64() * 0.1) - 0.05
		u.CurrentPrice = u.CurrentPrice * (1.0 + changePercent)
		
		database.DB.Save(&u)

		// Record history
		history := models.PriceHistory{
			UserID:     u.ID,
			Price:      u.CurrentPrice,
			RecordedAt: time.Now(),
		}
		database.DB.Create(&history)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Market prices updated tick"})
}
