package routes

import (
	"net/http"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterEventRoutes(router *gin.RouterGroup) {
	events := router.Group("/events")
	{
		events.GET("/active", getActiveEvents)
		events.POST("/bid", placeEventBid)
	}

	admin := router.Group("/admin/events")
	{
		admin.POST("/", createEvent)
		admin.POST("/:eventId/resolve", resolveEvent)
	}
}

func getActiveEvents(c *gin.Context) {
	var events []models.Event
	if err := database.DB.Preload("Participants.User").Where("status = ?", "Active").Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active events"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"events": events})
}

type BidInput struct {
	EventID       uint   `json:"eventId" binding:"required"`
	ParticipantID uint   `json:"participantId" binding:"required"`
	BidderID      uint   `json:"bidderId" binding:"required"` // Should ideally come from auth token in production
	BidType       string `json:"bidType" binding:"required"`
	Amount        int    `json:"amount" binding:"required,gt=0"`
}

func placeEventBid(c *gin.Context) {
	var input BidInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Start a transaction
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Verify event is active
		var event models.Event
		if err := tx.First(&event, input.EventID).Error; err != nil {
			return err
		}
		if event.Status != "Active" {
			return gorm.ErrInvalidData
		}

		// Check if user already bid on this participant
		var count int64
		tx.Model(&models.EventBid{}).Where("event_id = ? AND participant_id = ? AND bidder_id = ?", input.EventID, input.ParticipantID, input.BidderID).Count(&count)
		if count > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "You have already bid on this profile for this event"})
			return nil // returning nil to not rollback just because of validation, we handle it in response
			// Wait, if it errors we want to rollback. We'll return an error instead so transaction rolls back.
		}

		// Deduct amount from user
		var user models.User
		if err := tx.First(&user, input.BidderID).Error; err != nil {
			return err
		}
		if user.AuraCoins < input.Amount {
			return gorm.ErrInvalidTransaction
		}
		
		user.AuraCoins -= input.Amount
		if err := tx.Save(&user).Error; err != nil {
			return err
		}

		// Create Bid
		bid := models.EventBid{
			EventID:       input.EventID,
			ParticipantID: input.ParticipantID,
			BidderID:      input.BidderID,
			BidType:       input.BidType,
			Amount:        input.Amount,
			Status:        "Pending",
		}
		if err := tx.Create(&bid).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		if err == gorm.ErrInvalidTransaction {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient Aura Coins"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to place bid: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bid placed successfully"})
}

type CreateEventInput struct {
	Title             string    `json:"title" binding:"required"`
	Description       string    `json:"description" binding:"required"`
	StartTime         time.Time `json:"startTime" binding:"required"`
	EndTime           time.Time `json:"endTime" binding:"required"`
	ParticipantUserIDs []uint   `json:"participantUserIds" binding:"required"`
}

func createEvent(c *gin.Context) {
	var input CreateEventInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event := models.Event{
		Title:       input.Title,
		Description: input.Description,
		StartTime:   input.StartTime,
		EndTime:     input.EndTime,
		Status:      "Active",
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&event).Error; err != nil {
			return err
		}

		for _, userID := range input.ParticipantUserIDs {
			participant := models.EventParticipant{
				EventID: event.ID,
				UserID:  userID,
				Outcome: "Pending",
			}
			if err := tx.Create(&participant).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event created", "eventId": event.ID})
}

type ParticipantOutcome struct {
	ParticipantID uint   `json:"participantId"`
	Outcome       string `json:"outcome"` // "Won" or "Lost"
}

type ResolveEventInput struct {
	Outcomes []ParticipantOutcome `json:"outcomes"`
}

func resolveEvent(c *gin.Context) {
	eventId := c.Param("eventId")
	var input ResolveEventInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var event models.Event
		if err := tx.First(&event, eventId).Error; err != nil {
			return err
		}
		if event.Status == "Resolved" {
			return gorm.ErrInvalidData
		}

		// Update participant outcomes
		outcomeMap := make(map[uint]string)
		for _, o := range input.Outcomes {
			outcomeMap[o.ParticipantID] = o.Outcome
			tx.Model(&models.EventParticipant{}).Where("id = ?", o.ParticipantID).Update("outcome", o.Outcome)
		}

		// Fetch all bids for this event
		var bids []models.EventBid
		if err := tx.Where("event_id = ?", eventId).Find(&bids).Error; err != nil {
			return err
		}

		totalLoserPool := 0
		totalWinnerPool := 0
		var winningBids []models.EventBid

		// Determine winners and losers
		for i, bid := range bids {
			outcome := outcomeMap[bid.ParticipantID]
			isWinner := false

			// Assuming BidType "For" matches Outcome "Won" to win
			if bid.BidType == "For" && outcome == "Won" {
				isWinner = true
			} else if bid.BidType == "Against" && outcome == "Lost" {
				isWinner = true
			}

			if isWinner {
				bids[i].Status = "Won"
				totalWinnerPool += bid.Amount
				winningBids = append(winningBids, bids[i])
			} else {
				bids[i].Status = "Lost"
				totalLoserPool += bid.Amount
			}
			tx.Save(&bids[i])
		}

		// Distribute prizes
		for _, wBid := range winningBids {
			// They get their money back
			payout := float64(wBid.Amount)
			
			// Plus a percentage of the loser pool
			if totalWinnerPool > 0 {
				share := float64(wBid.Amount) / float64(totalWinnerPool)
				payout += share * float64(totalLoserPool)
			}

			// Add to user balance
			tx.Model(&models.User{}).Where("id = ?", wBid.BidderID).UpdateColumn("aura_coins", gorm.Expr("aura_coins + ?", int(payout)))
		}

		// Mark event as resolved
		event.Status = "Resolved"
		tx.Save(&event)

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve event: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event resolved successfully"})
}
