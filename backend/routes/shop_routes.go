package routes

import (
	"net/http"
	"strconv"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
)

func RegisterShopRoutes(router *gin.RouterGroup) {
	shop := router.Group("/shop")
	{
		shop.GET("/items", getShopItems)
		shop.POST("/buy/:id", buyShopItem)
		shop.GET("/inventory/:userId", getUserInventory)
		// Admin route could be added here if needed, keeping it simple for now
		shop.POST("/admin/items", createShopItem)
	}
}

func getShopItems(c *gin.Context) {
	var items []models.ShopItem
	if err := database.DB.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shop items"})
		return
	}
	c.JSON(http.StatusOK, items)
}

func createShopItem(c *gin.Context) {
	var item models.ShopItem
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shop item"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func buyShopItem(c *gin.Context) {
	itemIDStr := c.Param("id")
	itemID, err := strconv.ParseUint(itemIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID"})
		return
	}

	// Assuming user ID is passed in body for simplicity, or we could get it from a token in a real app.
	// For this prototype, let's take `userId` from JSON body: {"userId": 1}
	var req struct {
		UserID uint `json:"userId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	tx := database.DB.Begin()

	// 1. Get the shop item
	var item models.ShopItem
	if err := tx.First(&item, itemID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	// 2. Get the user
	var user models.User
	if err := tx.First(&user, req.UserID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// 3. Check credibility requirement
	if user.CredibilityScore < item.RequiredScore {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Credibility score too low"})
		return
	}

	// 4. Check funds
	if user.AuraCoins < item.Price {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Not enough Aura Coins"})
		return
	}

	// 5. Deduct funds
	user.AuraCoins -= item.Price
	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user balance"})
		return
	}

	// 6. Apply immediate effects
	if item.EffectType == "BOOST_CRED" {
		// Assuming aura boost gives +50 credibility (can be made dynamic)
		user.CredibilityScore += 50
		if err := tx.Save(&user).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply boost"})
			return
		}
	}

	// 7. Add to inventory
	var expiresAt *time.Time
	// Suppose there's a duration or it's permanent. For now permanent if 'expiresAt' logic isn't strictly defined by item.
	// We can implement different expiry logic based on EffectType if needed.
	
	inventory := models.UserInventory{
		UserID:     user.ID,
		ShopItemID: uint(itemID),
		IsActive:   true,
		ExpiresAt:  expiresAt,
	}
	if err := tx.Create(&inventory).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to inventory"})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Item purchased successfully", "auraCoins": user.AuraCoins})
}

func getUserInventory(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var inventory []models.UserInventory
	// Preload the Item so we get its details
	if err := database.DB.Preload("Item").Where("user_id = ? AND is_active = ?", userID, true).Find(&inventory).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch inventory"})
		return
	}

	c.JSON(http.StatusOK, inventory)
}
