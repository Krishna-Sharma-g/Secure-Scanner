package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"securescanner/cli/internal/scanner"
)

const version = "0.1.0"

func main() {
	if len(os.Args) < 2 {
		printHelp()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "scan":
		runScan(os.Args[2:])
	case "version":
		fmt.Printf("SecureScanner v%s\n", version)
	case "help":
		printHelp()
	default:
		fmt.Printf("Unknown command: %s\n", os.Args[1])
		printHelp()
		os.Exit(1)
	}
}

func runScan(args []string) {
	flags := flag.NewFlagSet("scan", flag.ExitOnError)
	format := flags.String("format", "text", "Output format: text or json")
	minSeverity := flags.String("min-severity", "info", "Minimum severity to include")
	languages := flags.String("languages", "", "Comma-separated list of languages")
	concurrency := flags.Int("concurrency", 0, "Number of concurrent workers")
	failOn := flags.String("fail-on", "", "Exit with code 2 if findings at or above this severity exist")
	backendURL := flags.String("backend-url", "http://localhost:3000", "Backend base URL")
	authToken := flags.String("auth-token", "", "JWT token for backend auth")
	_ = flags.Parse(args)

	path := "."
	if flags.NArg() > 0 {
		path = flags.Arg(0)
	}

	languageSet := scanner.DefaultLanguageSet()
	if *languages != "" {
		languageSet = scanner.LanguageSet{}
		for _, lang := range strings.Split(*languages, ",") {
			lang = strings.TrimSpace(lang)
			if lang == "" {
				continue
			}
			languageSet[strings.ToLower(lang)] = struct{}{}
		}
	}

	minSeverityValue := parseSeverity(*minSeverity)
	if minSeverityValue == "" {
		fmt.Printf("Invalid min-severity: %s\n", *minSeverity)
		os.Exit(1)
	}

	opts := scanner.ScanOptions{
		Languages:    languageSet,
		ExcludedDirs: scanner.DefaultExcludedDirs(),
		Concurrency:  *concurrency,
		MinSeverity:  minSeverityValue,
	}

	s := scanner.NewScanner(nil)
	start := time.Now()
	result, err := s.ScanDirectory(path, opts)
	if err != nil {
		fmt.Printf("Scan failed: %v\n", err)
		os.Exit(1)
	}

	sendToBackend(*backendURL, *authToken, path, opts, result, time.Since(start))

	switch strings.ToLower(*format) {
	case "json":
		printJSON(result)
	case "sarif":
		printSARIF(result)
	default:
		printText(result, path)
	}

	if *failOn != "" {
		failSeverity := parseSeverity(*failOn)
		if failSeverity == "" {
			fmt.Printf("Invalid fail-on severity: %s\n", *failOn)
			os.Exit(1)
		}
		if hasSeverityAtOrAbove(result, failSeverity) {
			os.Exit(2)
		}
	}
}

func printJSON(result scanner.ScanResult) {
	payload, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Printf("Failed to render JSON: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(string(payload))
}

func printSARIF(result scanner.ScanResult) {
	sarif := scanner.ToSARIF(result, version)
	payload, err := json.MarshalIndent(sarif, "", "  ")
	if err != nil {
		fmt.Printf("Failed to render SARIF: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(string(payload))
}

func printText(result scanner.ScanResult, path string) {
	fmt.Printf("SecureScanner v%s\n\n", version)
	fmt.Printf("Scanning: %s\n", path)
	fmt.Printf("Files scanned: %d\n\n", result.Summary.TotalFiles)
	fmt.Println("Results:")
	fmt.Printf("  Critical: %d\n", result.Summary.BySeverity[scanner.SeverityCritical])
	fmt.Printf("  High:     %d\n", result.Summary.BySeverity[scanner.SeverityHigh])
	fmt.Printf("  Medium:   %d\n", result.Summary.BySeverity[scanner.SeverityMedium])
	fmt.Printf("  Low:      %d\n", result.Summary.BySeverity[scanner.SeverityLow])
	fmt.Printf("  Info:     %d\n", result.Summary.BySeverity[scanner.SeverityInfo])

	if len(result.Vulnerabilities) == 0 {
		fmt.Println("\nNo vulnerabilities found.")
		return
	}

	fmt.Println("\nFindings:")
	for i, vuln := range result.Vulnerabilities {
		if i >= 10 {
			fmt.Printf("  ... and %d more\n", len(result.Vulnerabilities)-10)
			break
		}
		fmt.Printf("  %d. %s [%s:%d]\n", i+1, formatType(vuln.Type), vuln.FilePath, vuln.Line)
	}
}

func printHelp() {
	fmt.Println("SecureScanner - Code Vulnerability Scanner")
	fmt.Println("")
	fmt.Println("Usage:")
	fmt.Println("  securescanner scan <path> [--format=text|json|sarif] [--min-severity=info] [--backend-url=http://localhost:3000]")
	fmt.Println("  securescanner version")
	fmt.Println("  securescanner help")
}

func parseSeverity(value string) scanner.Severity {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "critical":
		return scanner.SeverityCritical
	case "high":
		return scanner.SeverityHigh
	case "medium":
		return scanner.SeverityMedium
	case "low":
		return scanner.SeverityLow
	case "info":
		return scanner.SeverityInfo
	default:
		return ""
	}
}

func hasSeverityAtOrAbove(result scanner.ScanResult, threshold scanner.Severity) bool {
	for _, finding := range result.Vulnerabilities {
		if scanner.SeverityOrder(finding.Severity) >= scanner.SeverityOrder(threshold) {
			return true
		}
	}
	return false
}

func formatType(t string) string {
	parts := strings.Split(strings.ReplaceAll(t, "_", " "), " ")
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, " ")
}

func sendToBackend(baseURL string, token string, path string, opts scanner.ScanOptions, result scanner.ScanResult, duration time.Duration) {
	if baseURL == "" {
		return
	}
	client := scanner.NewBackendClient(baseURL, token)
	projectID, err := client.CreateProject(result.Project)
	if err != nil {
		fmt.Printf("Backend error (create project): %v\n", err)
		return
	}
	fmt.Printf("Backend: project_id=%s\n", projectID)

	scanConfig := map[string]any{
		"languages":     languagesList(opts.Languages),
		"excluded_dirs": mapKeys(opts.ExcludedDirs),
		"min_severity":  opts.MinSeverity,
		"concurrency":   opts.Concurrency,
		"scan_path":     path,
	}

	scanID, err := client.CreateScan(projectID, scanConfig)
	if err != nil {
		fmt.Printf("Backend error (create scan): %v\n", err)
		return
	}
	fmt.Printf("Backend: scan_id=%s\n", scanID)

	files := make([]scanner.ScanFilePayload, 0, len(result.Files))
	for _, file := range result.Files {
		files = append(files, scanner.ScanFilePayload{
			FilePath:           file.Path,
			Language:           file.Language,
			LinesOfCode:        file.Lines,
			VulnerabilityCount: len(file.Findings),
		})
	}

	vulns := make([]scanner.VulnerabilityPayload, 0, len(result.Vulnerabilities))
	for _, finding := range result.Vulnerabilities {
		vulns = append(vulns, scanner.VulnerabilityPayload{
			Type:         finding.Type,
			Severity:     string(finding.Severity),
			FilePath:     finding.FilePath,
			LineNumber:   finding.Line,
			ColumnNumber: finding.Column,
			CodeSnippet:  finding.CodeSnippet,
			Message:      finding.Message,
			CWEID:        finding.CWE,
			Status:       "open",
		})
	}

	if err := client.SendFiles(scanID, files); err != nil {
		fmt.Printf("Backend error (files): %v\n", err)
	}
	if err := client.SendVulnerabilities(scanID, vulns); err != nil {
		fmt.Printf("Backend error (vulnerabilities): %v\n", err)
	}
	_ = client.UpdateScan(scanID, scanner.ScanUpdatePayload{
		Status:          "completed",
		TotalFiles:      result.Summary.TotalFiles,
		FilesProcessed:  result.Summary.TotalFiles,
		DurationSeconds: int(duration.Seconds()),
	})
}

func languagesList(ls scanner.LanguageSet) []string {
	list := make([]string, 0, len(ls))
	for lang := range ls {
		list = append(list, lang)
	}
	return list
}

func mapKeys(m map[string]struct{}) []string {
	list := make([]string, 0, len(m))
	for key := range m {
		list = append(list, key)
	}
	return list
}
