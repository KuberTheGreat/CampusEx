package main

import (
	"log"
	"os"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/routes"
	"github.com/CampusEx/backend/services"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	database.ConnectDB()

	go services.StartNewsCronJob()

	r := gin.Default()

	// CORS middleware for local dev
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	api := r.Group("/api")
	routes.RegisterAuthRoutes(api)
	routes.RegisterUserRoutes(api)
	routes.RegisterMarketRoutes(api)
	routes.RegisterNewsRoutes(api)
	routes.RegisterAdminRoutes(api)
	routes.RegisterPortfolioRoutes(api)
	routes.RegisterEventRoutes(api)
	routes.RegisterShopRoutes(api)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}
