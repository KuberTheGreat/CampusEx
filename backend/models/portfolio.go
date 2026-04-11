package models

import (
	"time"

	"gorm.io/gorm"
)

type StockOwnership struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	OwnerID      uint           `gorm:"index" json:"ownerId"`
	SubjectID    uint           `gorm:"index" json:"subjectId"`
	Quantity     int            `json:"quantity"`
	AveragePrice float64        `json:"averagePrice"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Owner   User `gorm:"foreignKey:OwnerID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"owner,omitempty"`
	Subject User `gorm:"foreignKey:SubjectID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"subject,omitempty"`
}

type StockTransaction struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"index" json:"userId"`
	SubjectID uint           `gorm:"index" json:"subjectId"`
	Action    string         `json:"action"` // BUY or SELL
	Quantity  int            `json:"quantity"`
	Price     float64        `json:"price"`
	CreatedAt time.Time      `json:"createdAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	User    User `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"user,omitempty"`
	Subject User `gorm:"foreignKey:SubjectID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"subject,omitempty"`
}
