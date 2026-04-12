package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// AIEvaluation holds the resolved impact for a single student.
type AIEvaluation struct {
	Name            string  `json:"name"`
	ImpactDirection string  `json:"impactDirection"` // POSITIVE | NEGATIVE | NEUTRAL
	Percentage      float64 `json:"percentage"`
}

// AIImpactAnalysis is the top-level structure returned by AnalyzeNewsImpact.
type AIImpactAnalysis struct {
	Evaluations []AIEvaluation `json:"evaluations"`
}

// Groq API request / response shapes (OpenAI-compatible).
type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqRequest struct {
	Model          string        `json:"model"`
	Messages       []groqMessage `json:"messages"`
	Temperature    float64       `json:"temperature"`
	MaxTokens      int           `json:"max_tokens"`
	ResponseFormat struct {
		Type string `json:"type"`
	} `json:"response_format"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	} `json:"error,omitempty"`
}

// systemPrompt is a compact (~180 token) calibration guide for the model.
// Keeping it tight is critical — every token here is paid on EVERY analysis call.
const systemPrompt = `You are a ruthless financial algorithm for a gamified university stock market.
Analyze news about students and rate each student's individual stock price impact.

VOLATILITY SCALE (use as strict baselines):
Academic: Top GPA/batch→+10-15%, Research paper (top journal)→+15-20%, Cheating caught→-20-30%, National hackathon win→+15-20%, Intra-college win→+5-8%
Career: FAANG/Tier-1 offer→+15-35%, Startup (revenue)→+15-20%, Fired/internship lost→-15-25%, Freelance client→+6-10%
Social/Rep: Viral (cool)→+5-10%, Viral (cringe)→-8-15%, Public fight→-15-25%, Rude to staff→-10-15%, Free-rider exposed→-8-12%
Leadership: Student council president→+20-30%, Removed from council→-25-35%, Fest organized well→+12-18%, Funds mismanaged→-30-40%
Dating: Power couple→+8-12%, Cheating exposed→-20-30%, Public breakup→-5-10%

RULES:
- Evaluate ONLY students named in the news.
- Be savage and precise — never round to 5% unless the exact benchmark is 5%.
- Output ONLY valid JSON, no markdown.`

// userPromptTemplate wraps the raw news content for the user turn.
const userPromptTemplate = `News: "%s"

Return JSON exactly matching this schema — no other keys:
{
  "evaluations": [
    {"name": "<student name>", "impactDirection": "POSITIVE"|"NEGATIVE"|"NEUTRAL", "percentage": <number 1-40>}
  ]
}`

const (
	groqModel    = "llama-3.1-8b-instant"
	groqEndpoint = "https://api.groq.com/openai/v1/chat/completions"
)

// AnalyzeNewsImpact calls the Groq API and returns per-student stock impact data.
// It is safe to call concurrently; all state is local to the function.
func AnalyzeNewsImpact(newsContent string) (*AIImpactAnalysis, error) {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		return &AIImpactAnalysis{Evaluations: []AIEvaluation{}},
			fmt.Errorf("GROQ_API_KEY is not set — skipping AI analysis")
	}

	userMsg := fmt.Sprintf(userPromptTemplate, strings.ReplaceAll(newsContent, `"`, `\"`))

	payload := groqRequest{
		Model: groqModel,
		Messages: []groqMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userMsg},
		},
		Temperature: 0.1,  // Low temperature → deterministic, consistent scoring
		MaxTokens:   256,   // Enough for 5 subjects; keeps costs low
	}
	payload.ResponseFormat.Type = "json_object" // Guarantees valid JSON — no markdown stripping needed

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal groq request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, groqEndpoint, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to build groq http request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("groq http call failed: %w", err)
	}
	defer resp.Body.Close()

	rawBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read groq response body: %w", err)
	}

	var groqResp groqResponse
	if err := json.Unmarshal(rawBody, &groqResp); err != nil {
		return nil, fmt.Errorf("failed to parse groq response wrapper: %w — raw: %s", err, string(rawBody))
	}

	if groqResp.Error != nil {
		return nil, fmt.Errorf("groq api error [%s]: %s", groqResp.Error.Code, groqResp.Error.Message)
	}

	if len(groqResp.Choices) == 0 || groqResp.Choices[0].Message.Content == "" {
		return nil, fmt.Errorf("groq returned empty response")
	}

	rawJSON := strings.TrimSpace(groqResp.Choices[0].Message.Content)

	var analysis AIImpactAnalysis
	if err := json.Unmarshal([]byte(rawJSON), &analysis); err != nil {
		return nil, fmt.Errorf("failed to parse analysis JSON: %w — raw: %s", err, rawJSON)
	}

	return &analysis, nil
}
