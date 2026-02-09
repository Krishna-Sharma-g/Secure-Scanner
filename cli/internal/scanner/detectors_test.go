package scanner

import (
	"testing"
)

func TestRegexDetector_HardcodedSecret(t *testing.T) {
	detectors := DefaultDetectors()
	var secretDetector Detector
	for _, d := range detectors {
		if d.Type() == "hardcoded_secret" {
			secretDetector = d
			break
		}
	}
	if secretDetector == nil {
		t.Fatal("hardcoded_secret detector not found")
	}

	tests := []struct {
		name     string
		code     string
		language string
		want     int
	}{
		{
			name:     "detects api key in JS",
			code:     `const apiKey = "sk_live_abcdef1234567890"`,
			language: "javascript",
			want:     1,
		},
		{
			name:     "detects password in Python",
			code:     `password = "SuperSecretPassword123"`,
			language: "python",
			want:     1,
		},
		{
			name:     "ignores short values",
			code:     `const token = "short"`,
			language: "javascript",
			want:     0,
		},
		{
			name:     "ignores non-secret variables",
			code:     `const name = "abcdefghijklmnopqrstuvwxyz"`,
			language: "javascript",
			want:     0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			findings := secretDetector.Detect("test.js", tt.language, []byte(tt.code))
			if len(findings) != tt.want {
				t.Errorf("got %d findings, want %d", len(findings), tt.want)
			}
		})
	}
}

func TestRegexDetector_SQLInjection(t *testing.T) {
	detectors := DefaultDetectors()
	var sqlDetector Detector
	for _, d := range detectors {
		if d.Type() == "sql_injection" {
			sqlDetector = d
			break
		}
	}
	if sqlDetector == nil {
		t.Fatal("sql_injection detector not found")
	}

	tests := []struct {
		name string
		code string
		want int
	}{
		{
			name: "detects string concatenation in SELECT",
			code: `query("SELECT * FROM users WHERE id = " + userId)`,
			want: 1,
		},
		{
			name: "detects format string in SELECT",
			code: `query("SELECT * FROM users WHERE id = %s" % user_id)`,
			want: 1,
		},
		{
			name: "safe parameterized query",
			code: `query("SELECT * FROM users WHERE id = $1", userId)`,
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			findings := sqlDetector.Detect("test.js", "javascript", []byte(tt.code))
			if len(findings) != tt.want {
				t.Errorf("got %d findings, want %d", len(findings), tt.want)
			}
		})
	}
}

func TestSeverityOrder(t *testing.T) {
	if SeverityOrder(SeverityCritical) <= SeverityOrder(SeverityHigh) {
		t.Error("critical should be higher than high")
	}
	if SeverityOrder(SeverityHigh) <= SeverityOrder(SeverityMedium) {
		t.Error("high should be higher than medium")
	}
	if SeverityOrder(SeverityMedium) <= SeverityOrder(SeverityLow) {
		t.Error("medium should be higher than low")
	}
	if SeverityOrder(SeverityLow) <= SeverityOrder(SeverityInfo) {
		t.Error("low should be higher than info")
	}
}
