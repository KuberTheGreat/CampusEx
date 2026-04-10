package routes

import (
	"context"
	"net/http"
	"os"
	"regexp"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/idtoken"
)

func RegisterAuthRoutes(router *gin.RouterGroup) {
	auth := router.Group("/auth")
	{
		auth.POST("/google", handleGoogleCallback)
	}
}

type GoogleAuthInput struct {
	Token string `json:"token" binding:"required"`
}

var emailRegex = regexp.MustCompile(`^(lci|lcb|lcs|lit)(2022|2023|2024|2025|2026)(00[1-9]|0[1-5][0-9]|060)@iiitl\.ac\.in$`)

func handleGoogleCallback(c *gin.Context) {
	var input GoogleAuthInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server missing Google Client ID"})
		return
	}

	payload, err := idtoken.Validate(context.Background(), input.Token, clientID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google token: " + err.Error()})
		return
	}

	email, ok := payload.Claims["email"].(string)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email not found in token"})
		return
	}

	// Validate email against the strict regex
	if !emailRegex.MatchString(email) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Email does not match the allowed college roll format."})
		return
	}

	// Ensure user exists or create
	var user models.User
	result := database.DB.Where("email = ?", email).First(&user)

	if result.Error != nil {
		// New User
		user = models.User{
			Email: email,
			Name:  payload.Claims["name"].(string), // Extract Name from Google
		}
		
		c.JSON(http.StatusOK, gin.H{
			"message":       "Email verified",
			"needs_profile": true,
			"email":         email,
			"name":          user.Name,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Login successful",
		"needs_profile": user.StockSymbol == "",
		"user":          user,
	})
}
