package routes

import (
	"net/http"
	"strconv"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterDatingRoutes(router *gin.RouterGroup) {
	dating := router.Group("/dating")
	dating.Use(UserAuthMiddleware())
	{
		dating.GET("/matches", getMyMatches)
		dating.GET("/matches/:matchId", getMatchDetails)
		dating.GET("/matches/:matchId/chat", getMatchChat)
		dating.POST("/matches/:matchId/chat", sendMatchMessage)
		dating.POST("/matches/:matchId/rate", rateMatchPartner)
		dating.POST("/matches/:matchId/gift", giftAuraCoins)
	}
}

// getMyMatches returns all DatingMatches where the requesting user is User1 or User2.
func getMyMatches(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var matches []models.DatingMatch
	if err := database.DB.
		Preload("User1").
		Preload("User2").
		Where("user1_id = ? OR user2_id = ?", userID, userID).
		Order("created_at DESC").
		Find(&matches).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch matches"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"matches": matches})
}

// getMatchDetails returns full match info with both users' traits fully revealed.
func getMatchDetails(c *gin.Context) {
	matchID := c.Param("matchId")
	userID := c.MustGet("userID").(uint)

	var match models.DatingMatch
	if err := database.DB.
		Preload("User1.Traits").
		Preload("User2.Traits").
		First(&match, matchID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}

	// Verify requesting user is a participant
	if match.User1ID != userID && match.User2ID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not part of this match"})
		return
	}

	// For matched users, all traits (including hidden) are intentionally exposed.
	c.JSON(http.StatusOK, gin.H{"match": match})
}

// getMatchChat fetches all messages in a match's private chat room.
func getMatchChat(c *gin.Context) {
	matchID := c.Param("matchId")

	var messages []models.ChatMessage
	if err := database.DB.
		Preload("Sender").
		Where("match_id = ?", matchID).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

type SendMessageInput struct {
	Text     string `json:"text" binding:"required"`
}

// sendMatchMessage posts a new message to a match's chat.
func sendMatchMessage(c *gin.Context) {
	matchID := c.Param("matchId")
	var input SendMessageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var match models.DatingMatch
	if err := database.DB.First(&match, matchID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}

	senderID := c.MustGet("userID").(uint)

	if match.User1ID != senderID && match.User2ID != senderID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not part of this match"})
		return
	}

	msg := models.ChatMessage{
		MatchID:  match.ID,
		SenderID: senderID,
		Text:     input.Text,
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	database.DB.Preload("Sender").First(&msg, msg.ID)
	c.JSON(http.StatusOK, gin.H{"message": msg})
}

type RatePartnerInput struct {
	Score      int  `json:"score" binding:"required,min=1,max=5"`
}

// rateMatchPartner submits a 1–5 star rating for the partner.
// ≥4 stars → partner gets a +3% stock bump and +30 credibility.
// ≤2 stars → partner takes a -2% drop and -20 credibility.
func rateMatchPartner(c *gin.Context) {
	matchID := c.Param("matchId")
	var input RatePartnerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var match models.DatingMatch
	if err := database.DB.First(&match, matchID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}

	var toUserID uint
	fromUserID := c.MustGet("userID").(uint)

	if match.User1ID == fromUserID {
		if match.User1Rated {
			c.JSON(http.StatusConflict, gin.H{"error": "You have already submitted a rating for this match"})
			return
		}
		toUserID = match.User2ID
		match.User1Rated = true
	} else if match.User2ID == fromUserID {
		if match.User2Rated {
			c.JSON(http.StatusConflict, gin.H{"error": "You have already submitted a rating for this match"})
			return
		}
		toUserID = match.User1ID
		match.User2Rated = true
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not part of this match"})
		return
	}

	// Prevent duplicate ratings
	var existingRating models.MatchRating
	if database.DB.Where("match_id = ? AND from_user_id = ?", match.ID, fromUserID).First(&existingRating).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Rating already submitted"})
		return
	}

	// Persist the rating record
	rating := models.MatchRating{
		MatchID:    match.ID,
		FromUserID: fromUserID,
		ToUserID:   toUserID,
		Score:      input.Score,
	}
	database.DB.Create(&rating)

	// Apply stock price and credibility impact to the rated user
	var ratedUser models.User
	if err := database.DB.First(&ratedUser, toUserID).Error; err == nil {
		if input.Score >= 4 {
			ratedUser.CurrentPrice *= 1.03 // +3%
			ratedUser.CredibilityScore += 30
		} else if input.Score <= 2 {
			ratedUser.CurrentPrice *= 0.98 // -2%
			ratedUser.CredibilityScore -= 20
			if ratedUser.CredibilityScore < 0 {
				ratedUser.CredibilityScore = 0
			}
		}
		database.DB.Save(&ratedUser)
	}

	// Mark match as ended once both users have rated
	if match.User1Rated && match.User2Rated {
		match.Status = "ENDED"
	}
	database.DB.Save(&match)

	c.JSON(http.StatusOK, gin.H{"message": "Rating submitted successfully", "score": input.Score})
}

type GiftInput struct {
	Amount     float64 `json:"amount" binding:"required,min=1"`
}

// giftAuraCoins transfers Aura Coins from one matched user to their partner.
func giftAuraCoins(c *gin.Context) {
	matchID := c.Param("matchId")
	var input GiftInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var match models.DatingMatch
	if err := database.DB.First(&match, matchID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Match not found"})
		return
	}

	var toUserID uint
	fromUserID := c.MustGet("userID").(uint)

	if match.User1ID == fromUserID {
		toUserID = match.User2ID
	} else if match.User2ID == fromUserID {
		toUserID = match.User1ID
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not part of this match"})
		return
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var sender models.User
		if err := tx.First(&sender, fromUserID).Error; err != nil {
			return err
		}
		if sender.AuraCoins < input.Amount {
			return gorm.ErrInvalidData
		}

		var recipient models.User
		if err := tx.First(&recipient, toUserID).Error; err != nil {
			return err
		}

		sender.AuraCoins -= input.Amount
		recipient.AuraCoins += input.Amount
		tx.Save(&sender)
		tx.Save(&recipient)
		return nil
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Gift failed: insufficient coins or transfer error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Gift sent successfully",
		"giftedAmount": input.Amount,
	})
}
