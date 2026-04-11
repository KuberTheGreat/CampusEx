package routes

import (
	crand "crypto/rand"
	"encoding/hex"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(router *gin.RouterGroup) {
	user := router.Group("/user")
	{
		user.POST("/profile", createProfile)
		user.POST("/ipo", scheduleIPO)
		user.GET("/profile/:id", getProfile)
	}
}

type ProfileInput struct {
	Email          string   `json:"email" binding:"required"`
	Name           string   `json:"name" binding:"required"`
	ProfilePicture string   `json:"profilePicture"`
	Traits         []string `json:"traits"`
	StockSymbol    string   `json:"stockSymbol"`
}

func createProfile(c *gin.Context) {
	var input ProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate a random stock symbol if not provided
	if input.StockSymbol == "" {
		b := make([]byte, 3)
		crand.Read(b)
		input.StockSymbol = strings.ToUpper(hex.EncodeToString(b))
	}

	// Prepare user model
	user := models.User{
		Email:            input.Email,
		Name:             input.Name,
		ProfilePicture:   input.ProfilePicture,
		StockSymbol:      input.StockSymbol,
		AuraCoins:        1000,
		CredibilityScore: 500,
		IsListed:         false, // Becomes true or pre-order once IPO is set
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create profile: " + err.Error()})
		return
	}

	// Process traits
	// E.g. half of them will randomly be hidden
	if len(input.Traits) > 0 {
		hideCount := len(input.Traits) / 2
		hiddenIndices := make(map[int]bool)

		// Naive random selection
		for len(hiddenIndices) < hideCount {
			idx := rand.Intn(len(input.Traits))
			hiddenIndices[idx] = true
		}

		for i, traitName := range input.Traits {
			isHidden := hiddenIndices[i]

			trait := models.Trait{
				UserID:   user.ID,
				Name:     traitName,
				IsHidden: isHidden,
			}
			database.DB.Create(&trait)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile created successfully",
		"user":    user,
	})
}

type IPOInput struct {
	Email   string    `json:"email" binding:"required"`
	IPODate time.Time `json:"ipoDate" binding:"required"`
}

func scheduleIPO(c *gin.Context) {
	var input IPOInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.IPODate = &input.IPODate
	user.IsListed = true
	database.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{
		"message": "IPO scheduled successfully",
		"user":    user,
	})
}

func getProfile(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	
	if err := database.DB.Preload("Traits").First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}
