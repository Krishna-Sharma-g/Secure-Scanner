package scanner

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

type ScanOptions struct {
	Languages    LanguageSet
	ExcludedDirs map[string]struct{}
	Concurrency  int
	MinSeverity  Severity
}

type Scanner struct {
	detectors []Detector
}

func NewScanner(detectors []Detector) *Scanner {
	if len(detectors) == 0 {
		detectors = DefaultDetectors()
	}
	return &Scanner{detectors: detectors}
}

func (s *Scanner) ScanDirectory(root string, opts ScanOptions) (ScanResult, error) {
	if root == "" {
		return ScanResult{}, errors.New("scan path required")
	}
	info, err := os.Stat(root)
	if err != nil {
		return ScanResult{}, err
	}
	if !info.IsDir() {
		return ScanResult{}, errors.New("scan path must be a directory")
	}

	if opts.Languages == nil {
		opts.Languages = DefaultLanguageSet()
	}
	if opts.ExcludedDirs == nil {
		opts.ExcludedDirs = DefaultExcludedDirs()
	}
	if opts.Concurrency <= 0 {
		opts.Concurrency = max(2, runtime.NumCPU())
	}

	filePaths := make(chan string, opts.Concurrency*2)
	results := make(chan FileResult, opts.Concurrency*2)
	var wg sync.WaitGroup

	for i := 0; i < opts.Concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for path := range filePaths {
				results <- s.scanFile(path, opts)
			}
		}()
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	go func() {
		_ = filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				return nil
			}
			if d.IsDir() {
				if _, ok := opts.ExcludedDirs[d.Name()]; ok {
					return filepath.SkipDir
				}
				return nil
			}
			if !opts.Languages.Allows(path) {
				return nil
			}
			filePaths <- path
			return nil
		})
		close(filePaths)
	}()

	result := ScanResult{
		ScanID:    newScanID(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Project:   filepath.Base(root),
		Summary: ScanSummary{
			BySeverity: map[Severity]int{
				SeverityCritical: 0,
				SeverityHigh:     0,
				SeverityMedium:   0,
				SeverityLow:      0,
				SeverityInfo:     0,
			},
		},
	}

	for fileResult := range results {
		if fileResult.Error != nil {
			continue
		}
		result.Summary.TotalFiles++
		result.Files = append(result.Files, fileResult)
		for _, finding := range fileResult.Findings {
			if SeverityOrder(finding.Severity) < SeverityOrder(opts.MinSeverity) {
				continue
			}
			result.Vulnerabilities = append(result.Vulnerabilities, finding)
			result.Summary.TotalVulnerabilities++
			result.Summary.BySeverity[finding.Severity]++
		}
	}

	return result, nil
}

func (s *Scanner) scanFile(path string, opts ScanOptions) FileResult {
	content, err := os.ReadFile(path)
	if err != nil {
		return FileResult{Path: path, Error: err}
	}
	language := LanguageForPath(path)
	lines := countLines(content)

	var findings []Finding
	for _, detector := range s.detectors {
		findings = append(findings, detector.Detect(path, language, content)...)
	}
	return FileResult{Path: path, Language: language, Lines: lines, Findings: findings}
}

func countLines(content []byte) int {
	count := 1
	for _, b := range content {
		if b == '\n' {
			count++
		}
	}
	return count
}

func newScanID() string {
	buf := make([]byte, 6)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
