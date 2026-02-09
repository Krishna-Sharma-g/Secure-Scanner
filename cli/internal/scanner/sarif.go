package scanner

// SARIF (Static Analysis Results Interchange Format) v2.1.0
// https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
//
// This output format integrates with:
// - GitHub Code Scanning (upload via github/codeql-action/upload-sarif)
// - VS Code SARIF Viewer extension
// - Azure DevOps
// - Any SARIF-compatible security dashboard

type SARIFReport struct {
	Version string    `json:"version"`
	Schema  string    `json:"$schema"`
	Runs    []SARIFRun `json:"runs"`
}

type SARIFRun struct {
	Tool    SARIFTool     `json:"tool"`
	Results []SARIFResult `json:"results"`
}

type SARIFTool struct {
	Driver SARIFDriver `json:"driver"`
}

type SARIFDriver struct {
	Name            string      `json:"name"`
	Version         string      `json:"version"`
	InformationURI  string      `json:"informationUri"`
	Rules           []SARIFRule `json:"rules"`
}

type SARIFRule struct {
	ID               string            `json:"id"`
	Name             string            `json:"name"`
	ShortDescription SARIFMessage      `json:"shortDescription"`
	HelpURI          string            `json:"helpUri,omitempty"`
	Properties       SARIFRuleProperties `json:"properties"`
}

type SARIFRuleProperties struct {
	Tags []string `json:"tags,omitempty"`
}

type SARIFResult struct {
	RuleID    string           `json:"ruleId"`
	Level     string           `json:"level"`
	Message   SARIFMessage     `json:"message"`
	Locations []SARIFLocation  `json:"locations"`
}

type SARIFMessage struct {
	Text string `json:"text"`
}

type SARIFLocation struct {
	PhysicalLocation SARIFPhysicalLocation `json:"physicalLocation"`
}

type SARIFPhysicalLocation struct {
	ArtifactLocation SARIFArtifactLocation `json:"artifactLocation"`
	Region           SARIFRegion           `json:"region"`
}

type SARIFArtifactLocation struct {
	URI string `json:"uri"`
}

type SARIFRegion struct {
	StartLine   int `json:"startLine"`
	StartColumn int `json:"startColumn,omitempty"`
}

// ToSARIF converts scan results to SARIF v2.1.0 format.
func ToSARIF(result ScanResult, version string) SARIFReport {
	rulesMap := map[string]SARIFRule{}
	var results []SARIFResult

	for _, finding := range result.Vulnerabilities {
		// Build rule entry (deduplicated by type)
		if _, exists := rulesMap[finding.Type]; !exists {
			rulesMap[finding.Type] = SARIFRule{
				ID:               finding.Type,
				Name:             finding.Type,
				ShortDescription: SARIFMessage{Text: finding.Message},
				HelpURI:          cweURL(finding.CWE),
				Properties: SARIFRuleProperties{
					Tags: buildTags(finding),
				},
			}
		}

		results = append(results, SARIFResult{
			RuleID:  finding.Type,
			Level:   severityToSARIFLevel(finding.Severity),
			Message: SARIFMessage{Text: finding.Message + ": " + finding.CodeSnippet},
			Locations: []SARIFLocation{
				{
					PhysicalLocation: SARIFPhysicalLocation{
						ArtifactLocation: SARIFArtifactLocation{
							URI: finding.FilePath,
						},
						Region: SARIFRegion{
							StartLine:   finding.Line,
							StartColumn: finding.Column,
						},
					},
				},
			},
		})
	}

	rules := make([]SARIFRule, 0, len(rulesMap))
	for _, rule := range rulesMap {
		rules = append(rules, rule)
	}

	return SARIFReport{
		Version: "2.1.0",
		Schema:  "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
		Runs: []SARIFRun{
			{
				Tool: SARIFTool{
					Driver: SARIFDriver{
						Name:           "SecureScanner",
						Version:        version,
						InformationURI: "https://github.com/securescanner/cli",
						Rules:          rules,
					},
				},
				Results: results,
			},
		},
	}
}

func severityToSARIFLevel(s Severity) string {
	switch s {
	case SeverityCritical, SeverityHigh:
		return "error"
	case SeverityMedium:
		return "warning"
	case SeverityLow, SeverityInfo:
		return "note"
	default:
		return "none"
	}
}

func cweURL(cwe string) string {
	if cwe == "" {
		return ""
	}
	// CWE-79 -> https://cwe.mitre.org/data/definitions/79.html
	id := cwe
	if len(cwe) > 4 && cwe[:4] == "CWE-" {
		id = cwe[4:]
	}
	return "https://cwe.mitre.org/data/definitions/" + id + ".html"
}

func buildTags(f Finding) []string {
	tags := []string{"security"}
	if f.CWE != "" {
		tags = append(tags, f.CWE)
	}
	if f.Language != "" {
		tags = append(tags, f.Language)
	}
	return tags
}
