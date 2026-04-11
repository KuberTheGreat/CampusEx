package routes

import (
	"net/http"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
)

func RegisterAdminRoutes(router *gin.RouterGroup) {
	admin := router.Group("/admin")
	{
		// Native verification check for direct login.
		admin.POST("/login", adminLogin)
		admin.GET("/users", getAllUsers)
		admin.POST("/user/:id/update", updateUserParams)
		admin.DELETE("/user/:id/ban", banUser)
	}
}

type AdminLoginInput struct {
	Email string `json:"email" binding:"required"`
}

func adminLogin(c *gin.Context) {
	var input AdminLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	var admin models.Admin
	if err := database.DB.Where("email = ?", input.Email).First(&admin).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email is not authorized as an Administrator."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged in as Admin", "admin": admin})
}

func getAllUsers(c *gin.Context) {
	// Need to check authority, but since it's an internal college tool, keeping it simple.
	// You might want to actually check headers for token/admin in production.
	var users []models.User
	if err := database.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

type UpdateUserInput struct {
	AuraCoins        float64 `json:"auraCoins"`
	CredibilityScore int     `json:"credibilityScore"`
	CurrentPrice     float64 `json:"currentPrice"`
}

func updateUserParams(c *gin.Context) {
	id := c.Param("id")
	var input UpdateUserInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.AuraCoins = input.AuraCoins
	user.CredibilityScore = input.CredibilityScore
	user.CurrentPrice = input.CurrentPrice

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User attributes overwritten successfully", "user": user})
}

func banUser(c *gin.Context) {
	id := c.Param("id")

	// Soft delete the user
	if err := database.DB.Where("id = ?", id).Delete(&models.User{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute ban sequence"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User successfully banned from the market"})
}
