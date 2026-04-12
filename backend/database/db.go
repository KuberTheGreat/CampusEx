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
			LogLevel:                  logger.Warn, // Reduced from Info — less log noise, faster I/O
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	// Disable prepared statements — critical for Neon's PgBouncer pooler
	// which runs in transaction mode and doesn't support them
	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // Disables implicit prepared statements
	}), &gorm.Config{
		Logger:                 newLogger,
		SkipDefaultTransaction: true, // Single queries don't need a wrapping transaction
	})
	if err != nil {
		log.Fatal("Failed to connect to database. \n", err)
	}

	// Configure the underlying sql.DB connection pool
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to access underlying sql.DB: ", err)
	}

	sqlDB.SetMaxIdleConns(10)                  // Keep 10 warm connections ready
	sqlDB.SetMaxOpenConns(25)                  // Cap total open connections
	sqlDB.SetConnMaxLifetime(30 * time.Minute) // Recycle connections every 30 min
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)  // Drop idle connections after 5 min

	log.Println("Connected Successfully to Database (pooled)")

	// Warm the pool — fire a quick ping so the first real request isn't cold
	if err := sqlDB.Ping(); err != nil {
		log.Println("Warning: initial DB ping failed:", err)
	}

	db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")

	// Conditional migration: only run AutoMigrate if schema is missing
	// This saves ~13 round-trips on every restart when tables already exist
	var tableExists bool
	db.Raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')").Scan(&tableExists)

	if !tableExists {
		log.Println("Schema not found — running full migration...")
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
	} else {
		log.Println("Schema exists — skipping migration (use FORCE_MIGRATE=1 to override)")
		// Allow forced migration via env var when you add new models/columns
		if os.Getenv("FORCE_MIGRATE") == "1" {
			log.Println("FORCE_MIGRATE=1 detected — running migration anyway...")
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
			log.Println("Forced migration complete.")
		}
	}

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
