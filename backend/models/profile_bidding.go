package models

import (
	"time"

	"gorm.io/gorm"
)

type ProfileAuction struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	TargetUserID     uint           `gorm:"index;not null" json:"targetUserId"`
	TargetUser       User           `gorm:"foreignKey:TargetUserID" json:"targetUser"`
	StartTime        time.Time      `gorm:"not null" json:"startTime"`
	EndTime          time.Time      `gorm:"not null" json:"endTime"`
	Status           string         `gorm:"type:varchar(20);default:'ACTIVE'" json:"status"` // ACTIVE, RESOLVING, COMPLETED
	RejectionsLeft   int            `gorm:"default:3" json:"rejectionsLeft"`
	AcceptedBidderID *uint          `gorm:"index" json:"acceptedBidderId"`
	AcceptedBidder   *User          `gorm:"foreignKey:AcceptedBidderID" json:"acceptedBidder"`
	CreatedAt        time.Time      `json:"createdAt"`
	UpdatedAt        time.Time      `json:"updatedAt"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

type ProfileBid struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	AuctionID uint           `gorm:"index;not null" json:"auctionId"`
	Auction   ProfileAuction `gorm:"foreignKey:AuctionID" json:"auction"`
	BidderID  uint           `gorm:"index;not null" json:"bidderId"`
	Bidder    User           `gorm:"foreignKey:BidderID" json:"bidder"`
	Amount    float64        `gorm:"not null" json:"amount"`
	Message   string         `gorm:"type:text" json:"message"`
	Status    string         `gorm:"type:varchar(20);default:'PENDING'" json:"status"` // PENDING, ACCEPTED, REJECTED, OUTBID
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
