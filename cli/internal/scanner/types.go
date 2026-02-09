package scanner

type Severity string

const (
	SeverityCritical Severity = "critical"
	SeverityHigh     Severity = "high"
	SeverityMedium   Severity = "medium"
	SeverityLow      Severity = "low"
	SeverityInfo     Severity = "info"
)

type Finding struct {
	ID          string   `json:"id"`
	Type        string   `json:"type"`
	Severity    Severity `json:"severity"`
	FilePath    string   `json:"file"`
	Line        int      `json:"line"`
	Column      int      `json:"column,omitempty"`
	CodeSnippet string   `json:"code_snippet"`
	Message     string   `json:"message"`
	CWE         string   `json:"cwe"`
	Language    string   `json:"language"`
}

type FileResult struct {
	Path     string
	Language string
	Lines    int
	Findings []Finding
	Error    error
}

type ScanSummary struct {
	TotalFiles           int              `json:"total_files"`
	TotalVulnerabilities int              `json:"total_vulnerabilities"`
	BySeverity           map[Severity]int `json:"by_severity"`
}

type ScanResult struct {
	ScanID          string       `json:"scan_id"`
	Timestamp       string       `json:"timestamp"`
	Project         string       `json:"project"`
	Summary         ScanSummary  `json:"summary"`
	Vulnerabilities []Finding    `json:"vulnerabilities"`
	Files           []FileResult `json:"-"`
}

type Detector interface {
	Type() string
	Severity() Severity
	CWE() string
	Detect(path string, language string, content []byte) []Finding
}

func SeverityOrder(s Severity) int {
	switch s {
	case SeverityCritical:
		return 5
	case SeverityHigh:
		return 4
	case SeverityMedium:
		return 3
	case SeverityLow:
		return 2
	case SeverityInfo:
		return 1
	default:
		return 0
	}
}
