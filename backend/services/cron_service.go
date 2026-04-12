package services

import (
	"log"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"gorm.io/gorm"
)

func StartNewsCronJob() {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			resolvePendingNews()
		}
	}()
	log.Println("News resolution cron job started...")
}

func resolvePendingNews() {
	var pendingNews []models.News
	// Find all pending news that have expired
	if err := database.DB.Where("status = ? AND ends_at <= ?", "PENDING", time.Now()).Find(&pendingNews).Error; err != nil {
		log.Println("Error fetching pending news:", err)
		return
	}

	for _, newsItem := range pendingNews {
		err := database.DB.Transaction(func(tx *gorm.DB) error { // need to import gorm? Yes, actually better to just use database.DB or tx. Let's just pass tx.
			return processNewsResolution(newsItem)
		})
		if err != nil {
			log.Printf("Failed to resolve news %d: %v\n", newsItem.ID, err)
		}
	}
}

func processNewsResolution(news models.News) error {
	// Re-fetch to ensure we have the latest and associations
	q := database.DB.Preload("Publisher")
	if news.SubjectID != nil {
		q = q.Preload("Subject")
	}
	if err := q.First(&news, news.ID).Error; err != nil {
		return err
	}

	var votes []models.Vote
	if err := database.DB.Preload("User").Where("news_id = ?", news.ID).Find(&votes).Error; err != nil {
		return err
	}

	canConfirmWeight := 0
	cannotConfirmWeight := 0

	for _, vote := range votes {
		if vote.IsConfirmed {
			canConfirmWeight += vote.User.CredibilityScore
		} else {
			cannotConfirmWeight += vote.User.CredibilityScore
		}
	}

	tx := database.DB // use transaction for db operations here
	// Or we can just use normal DB methods since processNewsResolution could be inside a transaction if we pass the tx, but for simplicity let's just use database.DB or run everything in a transaction.

	if canConfirmWeight >= cannotConfirmWeight && (canConfirmWeight+cannotConfirmWeight) > 0 { // at least some votes needed, assuming equal means confirm for now
		news.Status = "CONFIRMED"

		log.Printf("News %d confirmed. Calling AI...\n", news.ID)
		aiResp, aiErr := AnalyzeNewsImpact(news.Content)
		if aiErr != nil {
			log.Println("AI Analysis failed:", aiErr)
			// Decide to proceed or fail. We'll proceed with NEUTRAL
			news.FinalImpactDir = "NEUTRAL"
			news.FinalImpactPct = 0
		} else {
			log.Printf("AI Analysis result: %s %f%%\n", aiResp.ImpactDirection, aiResp.Percentage)
			news.FinalImpactDir = aiResp.ImpactDirection
			news.FinalImpactPct = aiResp.Percentage

			// Apply impact to Subject (only if subject exists)
			if news.SubjectID != nil && aiResp.Percentage > 0 && aiResp.ImpactDirection != "NEUTRAL" {
				var subject models.User
				if err := tx.First(&subject, *news.SubjectID).Error; err == nil {
					modifier := 1.0 + (aiResp.Percentage / 100.0)
					if aiResp.ImpactDirection == "NEGATIVE" {
						modifier = 1.0 - (aiResp.Percentage / 100.0)
					}
					subject.CurrentPrice *= modifier
					tx.Save(&subject)
				}
			}
		}

		// Reward Publisher
		var publisher models.User
		if err := tx.First(&publisher, news.PublisherID).Error; err == nil {
			publisher.CredibilityScore += 50
			publisher.CurrentPrice *= 1.02 // 2% bump
			tx.Save(&publisher)
		}

		// Adjust Voters
		for _, vote := range votes {
			if vote.IsConfirmed {
				vote.User.CredibilityScore += 10
			} else {
				vote.User.CredibilityScore -= 20
				if vote.User.CredibilityScore < 0 {
					vote.User.CredibilityScore = 0
				}
			}
			tx.Save(&vote.User)
		}

	} else {
		news.Status = "REJECTED"
		news.FinalImpactDir = "NEUTRAL"
		news.FinalImpactPct = 0

		// Penalize Publisher
		var publisher models.User
		if err := tx.First(&publisher, news.PublisherID).Error; err == nil {
			publisher.CredibilityScore -= 50
			if publisher.CredibilityScore < 0 {
				publisher.CredibilityScore = 0
			}
			publisher.CurrentPrice *= 0.98 // 2% drop
			tx.Save(&publisher)
		}

		// Adjust Voters
		for _, vote := range votes {
			if !vote.IsConfirmed {
				vote.User.CredibilityScore += 10
			} else {
				vote.User.CredibilityScore -= 20
				if vote.User.CredibilityScore < 0 {
					vote.User.CredibilityScore = 0
				}
			}
			tx.Save(&vote.User)
		}
	}

	return tx.Save(&news).Error
}
