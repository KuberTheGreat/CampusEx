package models

import (
	"time"

	"gorm.io/gorm"
)

type News struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	PublisherID uint           `gorm:"index;not null" json:"publisherId"`
	Publisher   User           `gorm:"foreignKey:PublisherID" json:"publisher"`
	Content     string         `gorm:"type:text;not null" json:"content"`
	EvidenceURL string         `json:"evidenceUrl"`
	Status      string         `gorm:"type:varchar(20);default:'PENDING'" json:"status"` // PENDING, CONFIRMED, REJECTED
	EndsAt      time.Time      `gorm:"not null" json:"endsAt"`
	Impacts     []NewsImpact   `gorm:"foreignKey:NewsID" json:"impacts"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
