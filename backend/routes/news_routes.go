package routes

import (
	"net/http"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/CampusEx/backend/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterNewsRoutes(router *gin.RouterGroup) {
	news := router.Group("/news")
	{
		news.GET("", getNews)
		
		secured := news.Group("")
		secured.Use(UserAuthMiddleware())
		secured.POST("", createNews)
		secured.POST("/:id/vote", voteNews)
		secured.GET("/user-votes", getUserNewsVotes)
	}
}

type CreateNewsInput struct {
	SubjectIDs  []uint `json:"subjectIds" binding:"required"`
	Content     string `json:"content" binding:"required"`
	EvidenceURL string `json:"evidenceUrl"`
}

func createNews(c *gin.Context) {
	var input CreateNewsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(input.SubjectIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one subject must be tagged."})
		return
	}

	// ── AI Safety Moderation Gate ──────────────────────────────────────────────
	// This runs BEFORE the content ever touches the database.
	// We check both the text content and any attached media (image/pdf/video).
	modResult := services.ModerateAll(input.Content, input.EvidenceURL)
	if !modResult.Safe {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":           "Your post was blocked by the AI Safety Engine.",
			"moderationBlock": true,
			"reason":          modResult.Reason,
		})
		return
	}

	publisherID := c.MustGet("userID").(uint)

	news := models.News{
		PublisherID: publisherID,
		Content:     input.Content,
		EvidenceURL: input.EvidenceURL,
		Status:      "PENDING",
		EndsAt:      time.Now().Add(time.Duration(services.GetNewsVotingDuration()) * time.Minute),
	}

	for _, sID := range input.SubjectIDs {
		news.Impacts = append(news.Impacts, models.NewsImpact{
			SubjectID: sID,
		})
	}

	if err := database.DB.Create(&news).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create news: " + err.Error()})
		return
	}

	// Fetch related user details for a rich response
	database.DB.Preload("Publisher").Preload("Impacts", func(db *gorm.DB) *gorm.DB {
		return db.Preload("Subject")
	}).First(&news, news.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "News created successfully",
		"news":    news,
	})
}

func getNews(c *gin.Context) {
	var newsList []models.News
	if err := database.DB.Preload("Publisher").Preload("Impacts", func(db *gorm.DB) *gorm.DB {
		return db.Preload("Subject")
	}).Order("created_at desc").Find(&newsList).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch news: " + err.Error()})
		return
	}
	for i := range newsList {
		newsList[i].Publisher.Name = "Anonymous Scholar"
	}

	c.JSON(http.StatusOK, gin.H{"news": newsList})
}

type VoteInput struct {
	IsConfirmed bool `json:"isConfirmed"`
}

func voteNews(c *gin.Context) {
	newsID := c.Param("id")

	var input VoteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var news models.News
	if err := database.DB.First(&news, newsID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "News not found"})
		return
	}

	userID := c.MustGet("userID").(uint)

	if news.Status != "PENDING" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Voting is closed for this news"})
		return
	}

	// Check if user has already voted
	var existingVote models.Vote
	if err := database.DB.Where("news_id = ? AND user_id = ?", news.ID, userID).First(&existingVote).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User has already voted on this news"})
		return
	}

	vote := models.Vote{
		NewsID:      news.ID,
		UserID:      userID,
		IsConfirmed: input.IsConfirmed,
	}

	if err := database.DB.Create(&vote).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record vote"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vote recorded successfully"})
}

func getUserNewsVotes(c *gin.Context) {
	userId := c.MustGet("userID").(uint)
	var votes []models.Vote
	if err := database.DB.Where("user_id = ?", userId).Find(&votes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch votes"})
		return
	}
	var votedNewsIds []uint
	for _, v := range votes {
		votedNewsIds = append(votedNewsIds, v.NewsID)
	}
	c.JSON(http.StatusOK, gin.H{"votedNewsIds": votedNewsIds})
}
