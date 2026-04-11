package models

import (
	"time"

	"gorm.io/gorm"
)

type Event struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	StartTime   time.Time      `json:"startTime"`
	EndTime     time.Time      `json:"endTime"`
	Status      string         `gorm:"default:'Active'" json:"status"` // Active, Completed, Resolved
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Participants []EventParticipant `gorm:"foreignKey:EventID" json:"participants,omitempty"`
}

type EventParticipant struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	EventID   uint           `gorm:"index" json:"eventId"`
	UserID    uint           `gorm:"index" json:"userId"`
	Outcome   string         `gorm:"default:'Pending'" json:"outcome"` // Pending, Won, Lost
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type EventBid struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	EventID       uint           `gorm:"index" json:"eventId"`
	ParticipantID uint           `gorm:"index" json:"participantId"` // Refers to EventParticipant ID
	BidderID      uint           `gorm:"index" json:"bidderId"`
	BidType       string         `json:"bidType"` // For, Against
	Amount        float64        `json:"amount"`  // In Aura coins
	Status        string         `gorm:"default:'Pending'" json:"status"` // Pending, Won, Lost
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	Bidder      User             `gorm:"foreignKey:BidderID" json:"bidder,omitempty"`
	Participant EventParticipant `gorm:"foreignKey:ParticipantID" json:"participant,omitempty"`
}
