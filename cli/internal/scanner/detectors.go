package scanner

import (
	"bufio"
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"regexp"
	"strconv"
	"strings"
)

type RegexDetector struct {
	typeName string
	severity Severity
	cwe      string
	message  string
	re       *regexp.Regexp
}

func (d RegexDetector) Type() string      { return d.typeName }
func (d RegexDetector) Severity() Severity { return d.severity }
func (d RegexDetector) CWE() string       { return d.cwe }

func (d RegexDetector) Detect(path string, language string, content []byte) []Finding {
	var findings []Finding
	scanner := bufio.NewScanner(bytes.NewReader(content))
	lineNo := 0
	for scanner.Scan() {
		lineNo++
		line := scanner.Text()
		loc := d.re.FindStringIndex(line)
		if loc == nil {
			continue
		}
		snippet := strings.TrimSpace(line)
		finding := Finding{
			ID:          hashID(path, lineNo, d.typeName),
			Type:        d.typeName,
			Severity:    d.severity,
			FilePath:    path,
			Line:        lineNo,
			Column:      loc[0] + 1,
			CodeSnippet: snippet,
			Message:     d.message,
			CWE:         d.cwe,
			Language:    language,
		}
		findings = append(findings, finding)
	}
	return findings
}

func DefaultDetectors() []Detector {
	return []Detector{
		// Regex detectors — fast line-by-line pattern matching
		RegexDetector{
			typeName: "hardcoded_secret",
			severity: SeverityCritical,
			cwe:      "CWE-798",
			message:  "Hardcoded secret detected",
			re: regexp.MustCompile(`(?i)(api[_-]?key|password|secret|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{16,}['\"]`),
		},
		RegexDetector{
			typeName: "sql_injection",
			severity: SeverityHigh,
			cwe:      "CWE-89",
			message:  "Possible SQL injection via string concatenation",
			re: regexp.MustCompile(`(?i)select\s+.+\s+from\s+.+\s*(\+|\%s|\{)`),
		},
		RegexDetector{
			typeName: "xss",
			severity: SeverityHigh,
			cwe:      "CWE-79",
			message:  "Potential XSS: unescaped HTML assignment",
			re: regexp.MustCompile(`(?i)innerHTML\s*=`),
		},
		// AST engine — tree-sitter structural analysis (parses once per file)
		NewASTEngine(),
	}
}

func hashID(path string, line int, kind string) string {
	h := sha1.Sum([]byte(path + "|" + kind + "|" + intToString(line)))
	return hex.EncodeToString(h[:8])
}

func intToString(v int) string {
	return strconv.Itoa(v)
}
