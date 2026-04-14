package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/ledongthuc/pdf"
)

// ── Models ──────────────────────────────────────────────────────────────────

type ModerationResult struct {
	Safe   bool   `json:"safe"`
	Reason string `json:"reason"`
}

// ── Groq constants for the moderation engine ────────────────────────────────

const (
	moderatorTextModel   = "llama-3.1-8b-instant"         // Fast, cheap text moderation
	moderatorVisionModel = "llama-3.2-11b-vision-preview" // Vision model for images/frames
	moderatorEndpoint    = "https://api.groq.com/openai/v1/chat/completions"
)

const moderationSystemPrompt = `You are a strict Trust & Safety content moderator for a university social platform.
Your job is to detect clearly harmful, illegal, or policy-violating content.

Flag content if it contains ANY of the following:
- Sexual or explicit content (pornography, nudity, suggestive imagery)
- Graphic violence, gore, or self-harm encouragement
- Targeted harassment, threats, or doxxing of individuals
- Hate speech based on gender, caste, religion, race, or disability
- Drug or alcohol promotion to minors / illegal substance sales
- Deliberately defamatory or malicious false content designed to harm someone's reputation

Do NOT flag:
- Playful gossip, roasting, or competitive rivalry
- News about academic performance, relationships, or campus politics (even negative)
- Strong opinions or satire that does not cross into harassment

IMPORTANT: You must respond with ONLY valid JSON, no markdown, no explanation outside JSON.
Schema: {"safe": true|false, "reason": "<brief explanation if not safe, empty string if safe>"}`

// ── Entry point used by news_routes.go ──────────────────────────────────────

// ModerateAll checks the text content and, if evidenceURL is provided, the
// linked media (image, PDF, video). Returns a ModerationResult.
func ModerateAll(textContent string, evidenceURL string) ModerationResult {
	apiKey := os.Getenv("GROQ_MODERATOR_API_KEY")
	if apiKey == "" || apiKey == "PASTE_YOUR_SECOND_GROQ_KEY_HERE" {
		log.Println("[Moderation] GROQ_MODERATOR_API_KEY not set — skipping moderation")
		return ModerationResult{Safe: true, Reason: "Moderation key not configured"}
	}

	// Step 1: Check text content
	textResult := moderateText(apiKey, textContent)
	if !textResult.Safe {
		log.Printf("[Moderation] TEXT blocked: %s\n", textResult.Reason)
		return textResult
	}

	// Step 2: if no media attached, we're done
	if evidenceURL == "" {
		return ModerationResult{Safe: true}
	}

	// Step 3: detect media type and moderate accordingly
	lower := strings.ToLower(evidenceURL)
	switch {
	case isImageURL(lower):
		return moderateImage(apiKey, evidenceURL)
	case strings.Contains(lower, ".pdf"):
		return moderatePDF(apiKey, evidenceURL)
	case isVideoURL(lower):
		return moderateVideo(apiKey, evidenceURL)
	default:
		log.Printf("[Moderation] Unknown media type for URL: %s — skipping\n", evidenceURL)
		return ModerationResult{Safe: true}
	}
}

// ── Text moderation ──────────────────────────────────────────────────────────

func moderateText(apiKey, content string) ModerationResult {
	userMsg := fmt.Sprintf("Analyze this content for policy violations:\n\n\"%s\"", content)
	return callModerationLLM(apiKey, moderatorTextModel, []groqMessage{
		{Role: "system", Content: moderationSystemPrompt},
		{Role: "user", Content: userMsg},
	})
}

// ── Image moderation (Groq Vision) ──────────────────────────────────────────

func moderateImage(apiKey, imageURL string) ModerationResult {
	log.Printf("[Moderation] Checking image: %s\n", imageURL)

	messages := []map[string]interface{}{
		{
			"role":    "system",
			"content": moderationSystemPrompt,
		},
		{
			"role": "user",
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Analyze this image for policy violations. Respond with ONLY the JSON schema specified.",
				},
				{
					"type": "image_url",
					"image_url": map[string]string{
						"url": imageURL,
					},
				},
			},
		},
	}

	return callVisionLLM(apiKey, moderatorVisionModel, messages)
}

// ── PDF moderation (text extraction → text LLM) ──────────────────────────────

func moderatePDF(apiKey, pdfURL string) ModerationResult {
	log.Printf("[Moderation] Extracting PDF text from: %s\n", pdfURL)

	// Download PDF into a temp file
	tmpFile, err := downloadToTemp(pdfURL, ".pdf")
	if err != nil {
		log.Printf("[Moderation] PDF download failed: %v — passing\n", err)
		return ModerationResult{Safe: true, Reason: "PDF download failed; skipped"}
	}
	defer os.Remove(tmpFile)

	// Extract text using ledongthuc/pdf
	text, err := extractPDFText(tmpFile)
	if err != nil || strings.TrimSpace(text) == "" {
		log.Printf("[Moderation] PDF text extraction failed or empty: %v — passing\n", err)
		return ModerationResult{Safe: true, Reason: "PDF text extraction failed; skipped"}
	}

	// Truncate to first 3000 chars to keep within LLM token budget
	if len(text) > 3000 {
		text = text[:3000] + "... [truncated]"
	}

	log.Printf("[Moderation] PDF extracted %d chars, checking text\n", len(text))
	return moderateText(apiKey, text)
}

func extractPDFText(filePath string) (string, error) {
	f, r, err := pdf.Open(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	var sb strings.Builder
	numPages := r.NumPage()
	for i := 1; i <= numPages; i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}
		sb.WriteString(text)
		sb.WriteString("\n")

		// Stop after 10 pages to limit processing time
		if i >= 10 {
			break
		}
	}
	return sb.String(), nil
}

// ── Video moderation (ffmpeg frame extraction → Vision LLM) ─────────────────

func moderateVideo(apiKey, videoURL string) ModerationResult {
	log.Printf("[Moderation] Extracting frames from video: %s\n", videoURL)

	// Download video to temp file
	tmpVideo, err := downloadToTemp(videoURL, ".mp4")
	if err != nil {
		log.Printf("[Moderation] Video download failed: %v — passing\n", err)
		return ModerationResult{Safe: true, Reason: "Video download failed; skipped"}
	}
	defer os.Remove(tmpVideo)

	// Create temp directory for extracted frames
	tmpDir, err := os.MkdirTemp("", "campusex_frames_*")
	if err != nil {
		return ModerationResult{Safe: true}
	}
	defer os.RemoveAll(tmpDir)

	ffmpegBin := ffmpegPath()

	// Get video duration in seconds using ffprobe-like approach via ffmpeg
	duration := getVideoDuration(ffmpegBin, tmpVideo)

	// Extract 3 frames: 10% in, 50% in, 90% in (avoids blank start/end)
	timestamps := []float64{
		duration * 0.10,
		duration * 0.50,
		duration * 0.90,
	}

	var frameBase64s []string
	for i, ts := range timestamps {
		framePath := filepath.Join(tmpDir, fmt.Sprintf("frame%d.jpg", i))
		cmd := exec.Command(ffmpegBin,
			"-ss", fmt.Sprintf("%.2f", ts),
			"-i", tmpVideo,
			"-frames:v", "1",
			"-q:v", "3",
			"-f", "image2",
			framePath,
		)
		if err := cmd.Run(); err != nil {
			log.Printf("[Moderation] ffmpeg frame %d extraction error: %v\n", i, err)
			continue
		}

		data, err := os.ReadFile(framePath)
		if err != nil {
			continue
		}
		b64 := base64.StdEncoding.EncodeToString(data)
		frameBase64s = append(frameBase64s, b64)
	}

	if len(frameBase64s) == 0 {
		log.Println("[Moderation] No frames extracted — passing video")
		return ModerationResult{Safe: true}
	}

	log.Printf("[Moderation] Extracted %d frames, sending to vision model\n", len(frameBase64s))

	// Build vision message with all frames
	contentParts := []map[string]interface{}{
		{
			"type": "text",
			"text": fmt.Sprintf("These are %d frames extracted from a user-uploaded video. Analyze them for policy violations. Respond with ONLY the JSON schema specified.", len(frameBase64s)),
		},
	}
	for _, b64 := range frameBase64s {
		contentParts = append(contentParts, map[string]interface{}{
			"type": "image_url",
			"image_url": map[string]string{
				"url": "data:image/jpeg;base64," + b64,
			},
		})
	}

	messages := []map[string]interface{}{
		{"role": "system", "content": moderationSystemPrompt},
		{"role": "user", "content": contentParts},
	}

	return callVisionLLM(apiKey, moderatorVisionModel, messages)
}

func getVideoDuration(ffmpegBin, videoPath string) float64 {
	// Use ffmpeg to probe duration
	cmd := exec.Command(ffmpegBin,
		"-i", videoPath,
		"-show_entries", "format=duration",
		"-v", "quiet",
		"-of", "csv=p=0",
	)
	out, _ := cmd.Output()
	var dur float64
	fmt.Sscanf(strings.TrimSpace(string(out)), "%f", &dur)
	if dur <= 0 {
		dur = 60 // fallback: assume 60s so fractions work
	}
	return dur
}

func ffmpegPath() string {
	// prefer ~/bin/ffmpeg (our manually installed one), then look in PATH
	home, _ := os.UserHomeDir()
	localBin := filepath.Join(home, "bin", "ffmpeg")
	if _, err := os.Stat(localBin); err == nil {
		return localBin
	}
	if path, err := exec.LookPath("ffmpeg"); err == nil {
		return path
	}
	return "ffmpeg"
}

// ── Shared HTTP helpers ──────────────────────────────────────────────────────

// callModerationLLM calls a text-only Groq model with the given messages.
func callModerationLLM(apiKey, model string, messages []groqMessage) ModerationResult {
	payload := groqRequest{
		Model:       model,
		Messages:    messages,
		Temperature: 0.0,
		MaxTokens:   128,
	}
	payload.ResponseFormat.Type = "json_object"

	body, _ := json.Marshal(payload)
	return doGroqCall(apiKey, body)
}

// callVisionLLM calls the Groq vision-capable model with flexible content parts.
func callVisionLLM(apiKey, model string, messages []map[string]interface{}) ModerationResult {
	payload := map[string]interface{}{
		"model":       model,
		"messages":    messages,
		"temperature": 0.0,
		"max_tokens":  128,
	}
	body, _ := json.Marshal(payload)
	return doGroqCall(apiKey, body)
}

// doGroqCall executes the actual HTTP request and parses ModerationResult JSON.
func doGroqCall(apiKey string, body []byte) ModerationResult {
	req, err := http.NewRequest(http.MethodPost, moderatorEndpoint, bytes.NewBuffer(body))
	if err != nil {
		log.Printf("[Moderation] Request build error: %v\n", err)
		return ModerationResult{Safe: true}
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Moderation] HTTP error: %v — passing content\n", err)
		return ModerationResult{Safe: true}
	}
	defer resp.Body.Close()

	rawBody, _ := io.ReadAll(resp.Body)

	var groqResp groqResponse
	if err := json.Unmarshal(rawBody, &groqResp); err != nil {
		log.Printf("[Moderation] Parse error: %v — raw: %s\n", err, string(rawBody))
		return ModerationResult{Safe: true}
	}

	if groqResp.Error != nil {
		log.Printf("[Moderation] Groq error [%s]: %s\n", groqResp.Error.Code, groqResp.Error.Message)
		return ModerationResult{Safe: true}
	}

	if len(groqResp.Choices) == 0 {
		return ModerationResult{Safe: true}
	}

	rawJSON := strings.TrimSpace(groqResp.Choices[0].Message.Content)
	log.Printf("[Moderation] LLM result: %s\n", rawJSON)

	var result ModerationResult
	if err := json.Unmarshal([]byte(rawJSON), &result); err != nil {
		log.Printf("[Moderation] Result parse error: %v\n", err)
		return ModerationResult{Safe: true}
	}
	return result
}

// ── Utilities ────────────────────────────────────────────────────────────────

func isImageURL(url string) bool {
	for _, ext := range []string{".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"} {
		if strings.Contains(url, ext) {
			return true
		}
	}
	return false
}

func isVideoURL(url string) bool {
	for _, ext := range []string{".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv"} {
		if strings.Contains(url, ext) {
			return true
		}
	}
	return false
}

func downloadToTemp(url, ext string) (string, error) {
	resp, err := http.Get(url) // #nosec G107 — URL comes from our own Cloudinary, not user-controlled
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	tmpFile, err := os.CreateTemp("", "campusex_media_*"+ext)
	if err != nil {
		return "", err
	}
	defer tmpFile.Close()

	if _, err := io.Copy(tmpFile, resp.Body); err != nil {
		os.Remove(tmpFile.Name())
		return "", err
	}
	return tmpFile.Name(), nil
}
