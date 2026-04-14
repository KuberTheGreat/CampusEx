package routes

import (
	"net/http"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func RegisterMarketRoutes(router *gin.RouterGroup) {
	market := router.Group("/market")
	{
		market.GET("/leaderboard", getLeaderboard)
		market.GET("/stocks", getAllStocks)
		market.GET("/stocks/:userId/history", getStockHistory)

		secured := market.Group("")
		secured.Use(UserAuthMiddleware())
		secured.POST("/trade", executeTrade)
	}
}

func getLeaderboard(c *gin.Context) {
	sortBy := c.DefaultQuery("sort", "price")
	year := c.Query("year")
	trait := c.Query("trait")

	db := database.DB.Model(&models.User{}).Where("is_listed = ?", true)

	if year != "" {
		db = db.Where("email LIKE ?", "%"+year+"%")
	}

	if trait != "" {
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
	TargetUserID uint   `json:"targetUserId"`
	Shares       int    `json:"shares"`
	Type         string `json:"type"` // "BUY" or "SELL"
}

func executeTrade(c *gin.Context) {
	var req TradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	buyerID := c.MustGet("userID").(uint)

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var buyer models.User
	if err := tx.First(&buyer, buyerID).Error; err != nil {
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
	today := time.Now().UTC().Format("2006-01-02")

	if req.Type == "BUY" {
		if buyer.AuraCoins < totalValue {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient AURA coins"})
			return
		}
		buyer.AuraCoins -= totalValue
		target.TotalVolume += req.Shares

		// Portfolio upsert
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
			totalCost := (float64(portfolio.SharesOwned) * portfolio.AveragePrice) + totalValue
			portfolio.SharesOwned += req.Shares
			portfolio.AveragePrice = totalCost / float64(portfolio.SharesOwned)
			tx.Save(&portfolio)
		}

		// Upsert daily buy volume
		tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "stock_user_id"}, {Name: "date"}},
			DoUpdates: clause.Assignments(map[string]interface{}{"buy_volume": gorm.Expr("daily_stats.buy_volume + ?", req.Shares)}),
		}).Create(&models.DailyStats{
			StockUserID: target.ID,
			Date:        today,
			BuyVolume:   req.Shares,
			SellVolume:  0,
		})

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

		// Upsert daily sell volume
		tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "stock_user_id"}, {Name: "date"}},
			DoUpdates: clause.Assignments(map[string]interface{}{"sell_volume": gorm.Expr("daily_stats.sell_volume + ?", req.Shares)}),
		}).Create(&models.DailyStats{
			StockUserID: target.ID,
			Date:        today,
			BuyVolume:   0,
			SellVolume:  req.Shares,
		})

	} else {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trade type"})
		return
	}

	// Record transaction — price does NOT change here
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

// getAllStocks returns all listed users with current prices
func getAllStocks(c *gin.Context) {
	var users []models.User
	if err := database.DB.Where("is_listed = ?", true).Order("current_price DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stocks"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"stocks": users})
}

// getStockHistory returns price history for a specific user
func getStockHistory(c *gin.Context) {
	userId := c.Param("userId")
	rangeParam := c.DefaultQuery("range", "7d")

	var since time.Time
	switch rangeParam {
	case "24h":
		since = time.Now().UTC().Add(-24 * time.Hour)
	case "30d":
		since = time.Now().UTC().Add(-30 * 24 * time.Hour)
	default: // 7d
		since = time.Now().UTC().Add(-7 * 24 * time.Hour)
	}

	var history []models.PriceHistory
	if err := database.DB.Where("user_id = ? AND recorded_at >= ?", userId, since).
		Order("recorded_at ASC").
		Find(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch price history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"history": history})
}
