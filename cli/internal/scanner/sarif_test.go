package scanner

import (
	"encoding/json"
	"testing"
)

func TestToSARIF_Structure(t *testing.T) {
	result := ScanResult{
		ScanID:    "test-123",
		Timestamp: "2024-01-01T00:00:00Z",
		Project:   "test-project",
		Vulnerabilities: []Finding{
			{
				ID:          "f1",
				Type:        "xss_dom",
				Severity:    SeverityHigh,
				FilePath:    "src/app.js",
				Line:        10,
				Column:      5,
				CodeSnippet: `el.innerHTML = data`,
				Message:     "DOM-based XSS",
				CWE:         "CWE-79",
				Language:    "javascript",
			},
			{
				ID:          "f2",
				Type:        "eval_injection",
				Severity:    SeverityCritical,
				FilePath:    "src/utils.js",
				Line:        25,
				Column:      1,
				CodeSnippet: `eval(input)`,
				Message:     "Dangerous eval call",
				CWE:         "CWE-95",
				Language:    "javascript",
			},
		},
	}

	sarif := ToSARIF(result, "0.1.0")

	if sarif.Version != "2.1.0" {
		t.Errorf("expected SARIF version 2.1.0, got %s", sarif.Version)
	}
	if len(sarif.Runs) != 1 {
		t.Fatalf("expected 1 run, got %d", len(sarif.Runs))
	}

	run := sarif.Runs[0]
	if run.Tool.Driver.Name != "SecureScanner" {
		t.Errorf("expected tool name SecureScanner, got %s", run.Tool.Driver.Name)
	}
	if len(run.Results) != 2 {
		t.Errorf("expected 2 results, got %d", len(run.Results))
	}
	if len(run.Tool.Driver.Rules) != 2 {
		t.Errorf("expected 2 rules, got %d", len(run.Tool.Driver.Rules))
	}
}

func TestToSARIF_SeverityMapping(t *testing.T) {
	tests := []struct {
		severity Severity
		want     string
	}{
		{SeverityCritical, "error"},
		{SeverityHigh, "error"},
		{SeverityMedium, "warning"},
		{SeverityLow, "note"},
		{SeverityInfo, "note"},
	}

	for _, tt := range tests {
		t.Run(string(tt.severity), func(t *testing.T) {
			got := severityToSARIFLevel(tt.severity)
			if got != tt.want {
				t.Errorf("severity %s -> got %s, want %s", tt.severity, got, tt.want)
			}
		})
	}
}

func TestToSARIF_CWELinks(t *testing.T) {
	tests := []struct {
		cwe  string
		want string
	}{
		{"CWE-79", "https://cwe.mitre.org/data/definitions/79.html"},
		{"CWE-89", "https://cwe.mitre.org/data/definitions/89.html"},
		{"", ""},
	}

	for _, tt := range tests {
		t.Run(tt.cwe, func(t *testing.T) {
			got := cweURL(tt.cwe)
			if got != tt.want {
				t.Errorf("cweURL(%s) = %s, want %s", tt.cwe, got, tt.want)
			}
		})
	}
}

func TestToSARIF_ValidJSON(t *testing.T) {
	result := ScanResult{
		Vulnerabilities: []Finding{
			{
				Type:     "test",
				Severity: SeverityHigh,
				FilePath: "test.js",
				Line:     1,
				Message:  "test finding",
				CWE:      "CWE-1",
			},
		},
	}

	sarif := ToSARIF(result, "0.1.0")
	data, err := json.Marshal(sarif)
	if err != nil {
		t.Fatalf("SARIF should produce valid JSON: %v", err)
	}

	// Verify it can be unmarshaled back
	var parsed SARIFReport
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("SARIF JSON should be parseable: %v", err)
	}
}
