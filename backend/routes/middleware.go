package routes

import (
	"net/http"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
)

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
