package routes

import (
	"net/http"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
)

func RegisterPortfolioRoutes(router *gin.RouterGroup) {
	portfolio := router.Group("/portfolio")
	{
		portfolio.GET("/:userId", getUserPortfolio)
		portfolio.GET("/leaderboard", getLeaderboard)
	}
}

func getUserPortfolio(c *gin.Context) {
	userId := c.Param("userId")

	var ownerships []models.StockOwnership
	if err := database.DB.Preload("Subject").Where("owner_id = ?", userId).Find(&ownerships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch portfolio"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"portfolio": ownerships,
	})
}

func getLeaderboard(c *gin.Context) {
	var users []models.User
	// Get top 10 users sorted by current_price desc
	if err := database.DB.Order("current_price desc").Limit(10).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leaderboard"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"leaderboard": users,
	})
}
