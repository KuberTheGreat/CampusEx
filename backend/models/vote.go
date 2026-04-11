package models

import (
	"time"

	"gorm.io/gorm"
)

type Vote struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	NewsID      uint           `gorm:"index;not null" json:"newsId"`
	News        News           `gorm:"foreignKey:NewsID" json:"news"`
	UserID      uint           `gorm:"index;not null" json:"userId"`
	User        User           `gorm:"foreignKey:UserID" json:"user"`
	IsConfirmed bool           `gorm:"not null" json:"isConfirmed"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
