package services

import (
	"log"
	"strings"
	"sync"
	"time"

	"github.com/CampusEx/backend/database"
	"github.com/CampusEx/backend/models"
	"gorm.io/gorm"
)

var (
	newsTimerMu           sync.Mutex
	newsVotingDurationMin int = 5 // Default 5 mins
)

func GetNewsVotingDuration() int {
	newsTimerMu.Lock()
	defer newsTimerMu.Unlock()
	return newsVotingDurationMin
}

func SetNewsVotingDuration(minutes int) {
	newsTimerMu.Lock()
	defer newsTimerMu.Unlock()
	newsVotingDurationMin = minutes
}

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
		err := database.DB.Transaction(func(tx *gorm.DB) error {
			return processNewsResolution(tx, newsItem)
		})
		if err != nil {
			log.Printf("Failed to resolve news %d: %v\n", newsItem.ID, err)
		}
	}
}

func processNewsResolution(tx *gorm.DB, news models.News) error {
	// Re-fetch with associations inside the transaction for a consistent snapshot
	if err := tx.Preload("Publisher").Preload("Impacts.Subject").First(&news, news.ID).Error; err != nil {
		return err
	}

	var votes []models.Vote
	if err := tx.Preload("User").Where("news_id = ?", news.ID).Find(&votes).Error; err != nil {
		return err
	}

	// Tally credibility-weighted votes
	confirmWeight := 0
	denyWeight := 0
	for _, v := range votes {
		if v.IsConfirmed {
			confirmWeight += v.User.CredibilityScore
		} else {
			denyWeight += v.User.CredibilityScore
		}
	}

	totalWeight := confirmWeight + denyWeight
	if totalWeight == 0 {
		news.Status = "REJECTED"
		return tx.Save(&news).Error
	}

	if confirmWeight >= denyWeight {
		// ── CONFIRMED PATH ──────────────────────────────────────────────────────
		news.Status = "CONFIRMED"
		log.Printf("News %d confirmed. Calling AI...\n", news.ID)

		aiResp, aiErr := AnalyzeNewsImpact(news.Content)
		if aiErr != nil {
			log.Println("AI Analysis failed:", aiErr)
			aiResp = &AIImpactAnalysis{Evaluations: []AIEvaluation{}}
		}

		log.Printf("[CRON] News %d confirmed — %d impacts to process, %d AI evaluations received\n",
			news.ID, len(news.Impacts), len(aiResp.Evaluations))
		for _, e := range aiResp.Evaluations {
			log.Printf("  [AI eval] name=%q dir=%s pct=%.2f\n", e.Name, e.ImpactDirection, e.Percentage)
		}

		// ── Apply AI impact per subject ──────────────────────────────────────
		for i, impactRow := range news.Impacts {
			direction := "NEUTRAL"
			percentage := 0.0

			log.Printf("  [CRON] Impact[%d] subjectID=%d subjectName=%q",
				i, impactRow.SubjectID, impactRow.Subject.Name)

			// Robust Match: strip spaces, '@', '$' to compare "Devang Vaishnav" vs "DevangVaishnav"
			dbName := strings.ToLower(strings.ReplaceAll(impactRow.Subject.Name, " ", ""))
			dbSymbol := strings.ToLower(impactRow.Subject.StockSymbol)

			for _, eval := range aiResp.Evaluations {
				aiName := strings.ToLower(eval.Name)
				aiName = strings.ReplaceAll(aiName, " ", "")
				aiName = strings.ReplaceAll(aiName, "@", "")
				aiName = strings.ReplaceAll(aiName, "$", "")

				// Match if AI name contains the DB name/symbol or vice-versa
				overlap := strings.Contains(aiName, dbName) || strings.Contains(dbName, aiName) ||
					strings.Contains(aiName, dbSymbol)

				log.Printf("    match? dbName=%s dbSymbol=%s aiName=%s overlap=%v", dbName, dbSymbol, aiName, overlap)
				if overlap {
					direction = eval.ImpactDirection
					percentage = eval.Percentage
					break
				}
			}

			log.Printf("  [CRON] → resolved direction=%s pct=%.2f\n", direction, percentage)

			news.Impacts[i].FinalImpactDir = direction
			news.Impacts[i].FinalImpactPct = percentage
			if err := tx.Save(&news.Impacts[i]).Error; err != nil {
				log.Printf("  [CRON] ✗ failed to save impact row %d: %v\n", news.Impacts[i].ID, err)
			} else {
				log.Printf("  [CRON] ✓ impact row %d saved\n", news.Impacts[i].ID)
			}

			// Ensure percentage is always logically positive for the multiplier calculation
			if percentage < 0 {
				percentage = -percentage
			}

			// Apply price change — only when there is a real, non-neutral impact
			if percentage > 0 && direction != "NEUTRAL" {
				modifier := 1.0 + (percentage / 100.0)
				if direction == "NEGATIVE" {
					modifier = 1.0 - (percentage / 100.0)
				}
				log.Printf("  [CRON] Applying modifier=%.4f to subjectID=%d\n", modifier, impactRow.SubjectID)

				var subject models.User
				if err := tx.First(&subject, impactRow.SubjectID).Error; err != nil {
					log.Printf("  [CRON] ✗ could not fetch subject %d: %v\n", impactRow.SubjectID, err)
					continue
				}
				oldPrice := subject.CurrentPrice
				subject.CurrentPrice = roundToTwo(subject.CurrentPrice * modifier)
				if err := tx.Save(&subject).Error; err != nil {
					log.Printf("  [CRON] ✗ failed to update price for %s: %v\n", subject.Name, err)
				} else {
					log.Printf("  [CRON] ✓ %s price: %.2f → %.2f\n", subject.Name, oldPrice, subject.CurrentPrice)
				}
			} else {
				log.Printf("  [CRON] No price change (direction=%s pct=%.2f)\n", direction, percentage)
			}
		} // END impact loop

		// ── Reward publisher ─────────────────────────────────────────────────
		var publisher models.User
		if err := tx.First(&publisher, news.PublisherID).Error; err == nil {
			publisher.CredibilityScore += 50
			publisher.CurrentPrice = roundToTwo(publisher.CurrentPrice * 1.02)
			tx.Save(&publisher)
		}

		// ── Reward/penalise voters ────────────────────────────────────────────
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
		// ── REJECTED PATH ────────────────────────────────────────────────────
		news.Status = "REJECTED"
		log.Printf("News %d rejected.\n", news.ID)

		for i := range news.Impacts {
			news.Impacts[i].FinalImpactDir = "NEUTRAL"
			news.Impacts[i].FinalImpactPct = 0
			tx.Save(&news.Impacts[i])
		}

		var publisher models.User
		if err := tx.First(&publisher, news.PublisherID).Error; err == nil {
			publisher.CredibilityScore -= 50
			if publisher.CredibilityScore < 0 {
				publisher.CredibilityScore = 0
			}
			publisher.CurrentPrice = roundToTwo(publisher.CurrentPrice * 0.98)
			tx.Save(&publisher)
		}

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

// wordOverlap returns true if any word in slice a appears in slice b.
// Used for fuzzy name matching between AI output and DB subject names.
func wordOverlap(a, b []string) bool {
	set := make(map[string]struct{}, len(a))
	for _, w := range a {
		set[w] = struct{}{}
	}
	for _, w := range b {
		if _, ok := set[w]; ok {
			return true
		}
	}
	return false
}

// roundToTwo rounds a float to 2 decimal places to avoid floating-point drift
// in repeated price multiplications.
func roundToTwo(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}

func StartAuctionCronJob() {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			resolveExpiredAuctions()
		}
	}()
	log.Println("Auction resolution cron job started...")
}

func resolveExpiredAuctions() {
	var expiredAuctions []models.ProfileAuction
	// Transition ACTIVE auctions whose EndTime has passed into RESOLVING state
	if err := database.DB.Where("status = ? AND end_time <= ?", "ACTIVE", time.Now()).Find(&expiredAuctions).Error; err != nil {
		log.Println("Error fetching expired auctions:", err)
		return
	}

	for _, auction := range expiredAuctions {
		auction.Status = "RESOLVING"
		var count int64
		// Optional: if no bids, immediately mark as COMPLETED
		database.DB.Model(&models.ProfileBid{}).Where("auction_id = ?", auction.ID).Count(&count)
		if count == 0 {
			auction.Status = "COMPLETED"
		}
		
		if err := database.DB.Save(&auction).Error; err != nil {
			log.Printf("Failed to update auction %d: %v\n", auction.ID, err)
		} else {
			log.Printf("Auction %d is now %s\n", auction.ID, auction.Status)
		}
	}
}
