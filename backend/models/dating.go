package models

import (
	"time"

	"gorm.io/gorm"
)

// DatingMatch is created when a target user ACCEPTs a bid on their ProfileAuction.
type DatingMatch struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	AuctionID   uint           `gorm:"index;not null" json:"auctionId"`
	Auction     ProfileAuction `gorm:"foreignKey:AuctionID" json:"auction"`
	User1ID     uint           `gorm:"index;not null" json:"user1Id"` // Target (the auctioned profile)
	User1       User           `gorm:"foreignKey:User1ID" json:"user1"`
	User2ID     uint           `gorm:"index;not null" json:"user2Id"` // Accepted bidder
	User2       User           `gorm:"foreignKey:User2ID" json:"user2"`
	Status      string         `gorm:"type:varchar(20);default:'ACTIVE'" json:"status"` // ACTIVE, ENDED
	User1Rated  bool           `gorm:"default:false" json:"user1Rated"`
	User2Rated  bool           `gorm:"default:false" json:"user2Rated"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// ChatMessage stores messages sent within a DatingMatch private chat room.
type ChatMessage struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	MatchID   uint           `gorm:"index;not null" json:"matchId"`
	Match     DatingMatch    `gorm:"foreignKey:MatchID" json:"-"`
	SenderID  uint           `gorm:"index;not null" json:"senderId"`
	Sender    User           `gorm:"foreignKey:SenderID" json:"sender"`
	Text      string         `gorm:"type:text;not null" json:"text"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// MatchRating represents a post-match rating one user gives to another.
// Score is 1–5. Positive ratings bump stock price, negative ones drop it.
type MatchRating struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	MatchID    uint           `gorm:"index;not null" json:"matchId"`
	Match      DatingMatch    `gorm:"foreignKey:MatchID" json:"-"`
	FromUserID uint           `gorm:"index;not null" json:"fromUserId"`
	FromUser   User           `gorm:"foreignKey:FromUserID" json:"-"`
	ToUserID   uint           `gorm:"index;not null" json:"toUserId"`
	ToUser     User           `gorm:"foreignKey:ToUserID" json:"-"`
	Score      int            `gorm:"not null" json:"score"` // 1-5
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
