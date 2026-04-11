package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/CampusEx/backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := os.Getenv("NEON_DB_CONNECTION_STRING")
	if dsn == "" {
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Kolkata",
			os.Getenv("DB_HOST"),
			os.Getenv("DB_USER"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_NAME"),
			os.Getenv("DB_PORT"),
		)
	}

	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		log.Fatal("Failed to connect to database. \n", err)
	}

	log.Println("Connected Successfully to Database")
	db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")

	err = db.AutoMigrate(
		&models.User{},
		&models.Trait{},
		&models.Transaction{},
		&models.Portfolio{},
		&models.PriceHistory{},
		&models.News{},
		&models.Vote{},
		&models.Admin{},
		&models.Event{},
		&models.EventParticipant{},
		&models.EventBid{},
		&models.ShopItem{},
		&models.UserInventory{},
	)
	if err != nil {
		log.Fatal("Migration Failed. \n", err)
	}

	log.Println("Database Migrated Successfully")
	DB = db
	seedShopItems(db)
}

func seedShopItems(db *gorm.DB) {
	var count int64
	db.Model(&models.ShopItem{}).Count(&count)
	if count == 0 {
		items := []models.ShopItem{
			{Name: "Trait Reveal Lens", Description: "Uncover one hidden trait of a targeted user.", Price: 200, Rarity: "Rare", RequiredScore: 400, EffectType: "REVEAL_TRAIT", ImageURL: "🔍"},
			{Name: "Credibility Shield", Description: "Protect your stock from negative news impact for 24h.", Price: 500, Rarity: "Epic", RequiredScore: 800, EffectType: "SHIELD", ImageURL: "🛡️"},
			{Name: "Market Whisper", Description: "Get early access to a breaking scoop before others.", Price: 1000, Rarity: "Legendary", RequiredScore: 1200, EffectType: "EARLY_NEWS", ImageURL: "🤫"},
			{Name: "Aura Boost", Description: "Immediately gain +50 credibility score.", Price: 300, Rarity: "Common", RequiredScore: 0, EffectType: "BOOST_CRED", ImageURL: "✨"},
		}
		db.Create(&items)
		log.Println("Seeded shop items.")
	}
}
