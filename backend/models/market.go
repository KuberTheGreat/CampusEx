package models

import (
	"time"

	"gorm.io/gorm"
)

type TradeType string

const (
	TradeTypeBuy  TradeType = "BUY"
	TradeTypeSell TradeType = "SELL"
)

type Transaction struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	BuyerID        uint           `gorm:"index" json:"buyerId"`
	TargetUserID   uint           `gorm:"index" json:"targetUserId"`
	Shares         int            `json:"shares"`
	ExecutionPrice float64        `json:"executionPrice"`
	Type           TradeType      `json:"type"`
	CreatedAt      time.Time      `json:"createdAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

type Portfolio struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	OwnerID      uint           `gorm:"index;uniqueIndex:idx_owner_target" json:"ownerId"`
	StockUserID  uint           `gorm:"index;uniqueIndex:idx_owner_target" json:"stockUserId"`
	SharesOwned  int            `json:"sharesOwned"`
	AveragePrice float64        `json:"averagePrice"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
}

type PriceHistory struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"index" json:"userId"`
	Price      float64   `json:"price"`
	RecordedAt time.Time `gorm:"index" json:"recordedAt"`
}
