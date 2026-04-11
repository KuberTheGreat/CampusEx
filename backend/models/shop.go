package models

import (
	"time"

	"gorm.io/gorm"
)

type ShopItem struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Name          string         `gorm:"not null" json:"name"`
	Description   string         `json:"description"` // The "Purpose"
	Price         float64        `gorm:"not null" json:"price"`
	Rarity        string         `json:"rarity"`                         // Common, Rare, Epic, Legendary
	RequiredScore int            `gorm:"default:0" json:"requiredScore"` // Credibility Gate
	EffectType    string         `json:"effectType"`                     // Internal key (e.g. "TRAIT_REVEAL")
	ImageURL      string         `json:"imageUrl"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

type UserInventory struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	UserID     uint       `gorm:"index" json:"userId"`
	ShopItemID uint       `gorm:"index" json:"shopItemId"`
	Item       ShopItem   `gorm:"foreignKey:ShopItemID"`
	IsActive   bool       `gorm:"default:true" json:"isActive"`
	ExpiresAt  *time.Time `json:"expiresAt"`
	CreatedAt  time.Time  `json:"createdAt"`
}
