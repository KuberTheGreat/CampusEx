package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Email            string         `gorm:"uniqueIndex;not null" json:"email"`
	Name             string         `json:"name"`
	ProfilePicture   string         `json:"profilePicture"`
	StockSymbol      string         `gorm:"uniqueIndex;not null" json:"stockSymbol"`
	CurrentPrice     float64        `gorm:"default:100.0" json:"currentPrice"`
	AuraCoins        int            `gorm:"default:1000" json:"auraCoins"`
	CredibilityScore int            `gorm:"default:500" json:"credibilityScore"`
	StockPrice       float64        `gorm:"default:10.0" json:"stockPrice"`
	IsListed         bool           `gorm:"default:false" json:"isListed"`
	TotalVolume      int            `gorm:"default:0" json:"totalVolume"`
	IPODate          *time.Time     `json:"ipoDate"`
	CreatedAt        time.Time      `json:"createdAt"`
	UpdatedAt        time.Time      `json:"updatedAt"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
	Traits           []Trait        `gorm:"foreignKey:UserID" json:"traits"`
}

type Trait struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"index" json:"userId"`
	Name      string         `json:"name"`
	IsHidden  bool           `json:"isHidden"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
