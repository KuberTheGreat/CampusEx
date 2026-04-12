package routes

import (
	"net/http"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterProfileBiddingRoutes(router *gin.RouterGroup) {
	api := router.Group("/profile-bids")
	{
		api.POST("/admin/auction", createProfileAuction)
		api.GET("/active", getActiveProfileAuctions)
		api.GET("/auction/:id", getAuctionDetails)
		api.POST("/auction/:id/bid", placeProfileBid)
		api.POST("/auction/:id/resolve", resolveProfileAuction)
	}
}

type CreateAuctionInput struct {
	TargetUserID uint      `json:"targetUserId" binding:"required"`
	StartTime    time.Time `json:"startTime" binding:"required"`
	EndTime      time.Time `json:"endTime" binding:"required"`
}

func createProfileAuction(c *gin.Context) {
	var input CreateAuctionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	auction := models.ProfileAuction{
		TargetUserID:   input.TargetUserID,
		StartTime:      input.StartTime,
		EndTime:        input.EndTime,
		Status:         "ACTIVE",
		RejectionsLeft: 3,
	}

	if err := database.DB.Create(&auction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create auction: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Auction created successfully", "auction": auction})
}

func getActiveProfileAuctions(c *gin.Context) {
	var auctions []models.ProfileAuction
	if err := database.DB.Preload("TargetUser").Where("status = ?", "ACTIVE").Find(&auctions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active auctions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"auctions": auctions})
}

type AuctionDetailsResponse struct {
	Auction models.ProfileAuction `json:"auction"`
	Bids    []models.ProfileBid   `json:"bids"` // ordered by amount descending
}

func getAuctionDetails(c *gin.Context) {
	id := c.Param("id")
	var auction models.ProfileAuction

	if err := database.DB.Preload("TargetUser").First(&auction, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Auction not found"})
		return
	}

	var bids []models.ProfileBid
	if err := database.DB.Preload("Bidder").Where("auction_id = ?", auction.ID).Order("amount DESC").Find(&bids).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bids"})
		return
	}

	c.JSON(http.StatusOK, AuctionDetailsResponse{
		Auction: auction,
		Bids:    bids,
	})
}

type PlaceBidInput struct {
	BidderID uint    `json:"bidderId" binding:"required"`
	Amount   float64 `json:"amount" binding:"required"`
	Message  string  `json:"message"`
}

func placeProfileBid(c *gin.Context) {
	auctionID := c.Param("id")
	var input PlaceBidInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var auction models.ProfileAuction
		if err := tx.First(&auction, auctionID).Error; err != nil {
			return err
		}

		if auction.Status != "ACTIVE" || time.Now().After(auction.EndTime) {
			return gin.Error{Err: gorm.ErrInvalidData, Type: gin.ErrorTypePrivate} // Auction not active
		}

		var bidder models.User
		if err := tx.First(&bidder, input.BidderID).Error; err != nil {
			return err
		}

		if bidder.AuraCoins < input.Amount {
			return gin.Error{Err: gorm.ErrInvalidData, Type: gin.ErrorTypePrivate} // Insufficient funds
		}

		// Deduct coins immediately
		bidder.AuraCoins -= input.Amount
		if err := tx.Save(&bidder).Error; err != nil {
			return err
		}

		bid := models.ProfileBid{
			AuctionID: auction.ID,
			BidderID:  bidder.ID,
			Amount:    input.Amount,
			Message:   input.Message,
			Status:    "PENDING",
		}

		return tx.Create(&bid).Error
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to place bid. Ensure auction is active and you have enough coins."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bid placed successfully"})
}

type ResolveInput struct {
	TargetUserID uint   `json:"targetUserId" binding:"required"` // For security
	Action       string `json:"action" binding:"required"`       // "ACCEPT" or "REJECT"
	BidID        uint   `json:"bidId" binding:"required"`
}

func resolveProfileAuction(c *gin.Context) {
	auctionID := c.Param("id")
	var input ResolveInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var auction models.ProfileAuction
		if err := tx.First(&auction, auctionID).Error; err != nil {
			return err
		}

		if auction.TargetUserID != input.TargetUserID {
			return gin.Error{Err: gorm.ErrInvalidData}
		}

		// It must be at least resolving or ended
		if auction.Status == "COMPLETED" {
			return gin.Error{Err: gorm.ErrInvalidData}
		}

		var bid models.ProfileBid
		if err := tx.First(&bid, input.BidID).Error; err != nil {
			return err
		}

		if bid.AuctionID != auction.ID || bid.Status != "PENDING" {
			return gin.Error{Err: gorm.ErrInvalidData}
		}

		if input.Action == "ACCEPT" {
			bid.Status = "ACCEPTED"
			auction.AcceptedBidderID = &bid.BidderID
			auction.Status = "COMPLETED"
			tx.Save(&bid)
			tx.Save(&auction)

			// Refund all other pending bids
			var remainingBids []models.ProfileBid
			tx.Where("auction_id = ? AND status = ?", auction.ID, "PENDING").Find(&remainingBids)
			for _, rb := range remainingBids {
				rb.Status = "REJECTED"
				tx.Save(&rb)
				var bidder models.User
				if err := tx.First(&bidder, rb.BidderID).Error; err == nil {
					bidder.AuraCoins += rb.Amount
					tx.Save(&bidder)
				}
			}
		} else if input.Action == "REJECT" {
			bid.Status = "REJECTED"
			tx.Save(&bid)

			// Refund this specific bid
			var bidder models.User
			if err := tx.First(&bidder, bid.BidderID).Error; err == nil {
				bidder.AuraCoins += bid.Amount
				tx.Save(&bidder)
			}

			auction.RejectionsLeft--
			if auction.RejectionsLeft <= 0 {
				// Find next highest bid and accept automatically
				var nextBid models.ProfileBid
				if err := tx.Where("auction_id = ? AND status = ?", auction.ID, "PENDING").Order("amount DESC").First(&nextBid).Error; err == nil {
					nextBid.Status = "ACCEPTED"
					auction.AcceptedBidderID = &nextBid.BidderID
					auction.Status = "COMPLETED"
					tx.Save(&nextBid)
				} else {
					auction.Status = "COMPLETED" // No bids left
				}
				
				// Refund any other existing pending bids
				if auction.Status == "COMPLETED" {
					var remainingBids []models.ProfileBid
					tx.Where("auction_id = ? AND status = ?", auction.ID, "PENDING").Find(&remainingBids)
					for _, rb := range remainingBids {
						rb.Status = "REJECTED"
						tx.Save(&rb)
						var rbBidder models.User
						if err := tx.First(&rbBidder, rb.BidderID).Error; err == nil {
							rbBidder.AuraCoins += rb.Amount
							tx.Save(&rbBidder)
						}
					}
				}
			}
			tx.Save(&auction)
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to resolve auction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Action processed successfully"})
}
