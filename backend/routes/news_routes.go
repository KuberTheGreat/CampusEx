package routes

import (
	"net/http"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"github.com/gin-gonic/gin"
)

func RegisterNewsRoutes(router *gin.RouterGroup) {
	news := router.Group("/news")
	{
		news.POST("", createNews)
		news.GET("", getNews)
		news.POST("/:id/vote", voteNews)
	}
}

type CreateNewsInput struct {
	PublisherID uint   `json:"publisherId" binding:"required"`
	SubjectID   uint   `json:"subjectId" binding:"required"`
	Content     string `json:"content" binding:"required"`
}

func createNews(c *gin.Context) {
	var input CreateNewsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	news := models.News{
		PublisherID: input.PublisherID,
		SubjectID:   input.SubjectID,
		Content:     input.Content,
		Status:      "PENDING",
		EndsAt:      time.Now().Add(5 * time.Minute), // Closes in 5 mins for testing (normally 6 hours)
	}

	if err := database.DB.Create(&news).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create news: " + err.Error()})
		return
	}

	// Fetch related user details for a rich response
	database.DB.Preload("Publisher").Preload("Subject").First(&news, news.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "News created successfully",
		"news":    news,
	})
}

func getNews(c *gin.Context) {
	var newsList []models.News
	if err := database.DB.Preload("Publisher").Preload("Subject").Order("created_at desc").Find(&newsList).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch news"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"news": newsList})
}

type VoteInput struct {
	UserID      uint `json:"userId" binding:"required"`
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

	if news.Status != "PENDING" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Voting is closed for this news"})
		return
	}

	// Check if user has already voted
	var existingVote models.Vote
	if err := database.DB.Where("news_id = ? AND user_id = ?", news.ID, input.UserID).First(&existingVote).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User has already voted on this news"})
		return
	}

	vote := models.Vote{
		NewsID:      news.ID,
		UserID:      input.UserID,
		IsConfirmed: input.IsConfirmed,
	}

	if err := database.DB.Create(&vote).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record vote"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vote recorded successfully"})
}
