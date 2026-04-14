package routes

import (
	"net/http"
	"strings"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/CampusEx/backend/services"
	"github.com/gin-gonic/gin"
)

func UserAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header missing"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization header format"})
			c.Abort()
			return
		}

		claims, err := services.ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("userID", uint(claims["userId"].(float64)))
		c.Set("userEmail", claims["email"].(string))
		c.Next()
	}
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		adminEmail := c.GetHeader("X-Admin-Email")
		if adminEmail == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin credentials required (X-Admin-Email header missing)"})
			c.Abort()
			return
		}

		var admin models.Admin
		if err := database.DB.Where("email = ?", adminEmail).First(&admin).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized: Access restricted to Administrators only."})
			c.Abort()
			return
		}

		c.Next()
	}
}
