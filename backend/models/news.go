package models

import (
	"time"

	"gorm.io/gorm"
)

type News struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	PublisherID     uint           `gorm:"index;not null" json:"publisherId"`
	Publisher       User           `gorm:"foreignKey:PublisherID" json:"publisher"`
	SubjectID       uint           `gorm:"index;not null" json:"subjectId"`
	Subject         User           `gorm:"foreignKey:SubjectID" json:"subject"`
	Content         string         `gorm:"type:text;not null" json:"content"`
	Status          string         `gorm:"type:varchar(20);default:'PENDING'" json:"status"` // PENDING, CONFIRMED, REJECTED
	EndsAt          time.Time      `gorm:"not null" json:"endsAt"`
	FinalImpactDir  string         `gorm:"type:varchar(20)" json:"finalImpactDir"`           // POSITIVE, NEGATIVE, NEUTRAL
	FinalImpactPct  float64        `json:"finalImpactPct"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}
