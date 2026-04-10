package routes

import (
	"log"
	"net/http"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(router *gin.RouterGroup) {
	auth := router.Group("/auth")
	{
		// This simulates the OAuth callback from Google
		// In a real scenario, this would exchange an auth code for a token with Google,
		// and verify the hd (hosted domain) is `@iiitl.ac.in`.
		auth.POST("/google", handleGoogleCallback)
	}
}

type GoogleAuthInput struct {
	Email string `json:"email" binding:"required"`
	Token string `json:"token" binding:"required"` // mocked token for now
}

func handleGoogleCallback(c *gin.Context) {
	var input GoogleAuthInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Mock domain check
	// if !strings.HasSuffix(input.Email, "@iiitl.ac.in") {
	// 	c.JSON(http.StatusUnauthorized, gin.H{"error": "Only college email is allowed"})
	// 	return
	// }

	// Ensure user exists or create
	var user models.User
	result := database.DB.Where("email = ?", input.Email).First(&user)

	if result.Error != nil {
		// New User
		user = models.User{
			Email:            input.Email,
			ValidationStatus: true,
		}
		// Notice: To satisfy DB constraints before profile setup, we could set a dummy StockSymbol
		// but since it's unique we will create a random one or leave it pending. We'd rather not save 
		// to DB until the rest of the profile is done, or we save it without stock symbol if it's nullable.
		// For this implementation, let's assume stock symbol might not be null, so we'll wait for profile setup.
		// So we just return success with a "needs_profile: true" flag.
		
		c.JSON(http.StatusOK, gin.H{
			"message":       "Email verified",
			"needs_profile": true,
			"email":         input.Email,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Login successful",
		"needs_profile": user.StockSymbol == "",
		"user":          user,
	})
}
