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

type AIImpactAnalysis struct {
	ImpactDirection string  `json:"impactDirection"`
	Percentage      float64 `json:"percentage"`
}

var promptTemplate = `You are an expert financial analyst for a gamified university system where students are traded as "stocks".
Your task is to analyze a verified piece of news about a student and determine its impact on their stock price.
Consider the severity, social validation, and prestige associated with the event.
Events like getting a prestigious job (e.g., 50 LPA placement), winning a major hackathon, or doing something famously good should result in a POSITIVE impact, scaling with the prestige (1-10%%).
Events like a messy public breakup, disciplinary actions, or failing exams should result in a NEGATIVE impact, scaling with severity (1-10%%).

News content: "%s"

Respond ONLY with a raw JSON object in the following format (no markdown tags):
{
  "impactDirection": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "percentage": <integer between 1 and 10>
}`

func AnalyzeNewsImpact(newsContent string) (*AIImpactAnalysis, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" || apiKey == "your_gemini_api_key_here" {
		// Mock logic if no API key is provided
		return &AIImpactAnalysis{ImpactDirection: "NEUTRAL", Percentage: 0}, fmt.Errorf("GEMINI_API_KEY is not set")
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", apiKey)

	prompt := fmt.Sprintf(promptTemplate, strings.ReplaceAll(newsContent, "\"", "\\\""))

	requestBody, err := json.Marshal(map[string]interface{}{
		"contents": []interface{}{
			map[string]interface{}{
				"parts": []interface{}{
					map[string]interface{}{
						"text": prompt,
					},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":      0.1,
			"responseMimeType": "application/json",
		},
	})
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("gemini api error: %s", string(body))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse gemini response wrapper: %v", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from gemini")
	}

	rawJSON := geminiResp.Candidates[0].Content.Parts[0].Text

	var analysis AIImpactAnalysis
	if err := json.Unmarshal([]byte(strings.TrimSpace(rawJSON)), &analysis); err != nil {
		return nil, fmt.Errorf("failed to parse analysis JSON: %v. Raw string: %s", err, rawJSON)
	}

	return &analysis, nil
}
