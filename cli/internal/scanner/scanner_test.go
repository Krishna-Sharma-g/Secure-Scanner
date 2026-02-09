package scanner

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewScanner_DefaultDetectors(t *testing.T) {
	s := NewScanner(nil)
	if s == nil {
		t.Fatal("expected non-nil scanner")
	}
	if len(s.detectors) == 0 {
		t.Fatal("expected default detectors to be loaded")
	}
}

func TestNewScanner_CustomDetectors(t *testing.T) {
	custom := []Detector{
		RegexDetector{typeName: "test", severity: SeverityInfo},
	}
	s := NewScanner(custom)
	if len(s.detectors) != 1 {
		t.Fatalf("expected 1 detector, got %d", len(s.detectors))
	}
}

func TestScanDirectory_RequiresPath(t *testing.T) {
	s := NewScanner(nil)
	_, err := s.ScanDirectory("", ScanOptions{})
	if err == nil {
		t.Fatal("expected error for empty path")
	}
}

func TestScanDirectory_RequiresDirectory(t *testing.T) {
	s := NewScanner(nil)
	// Use a file path instead of directory
	tmpFile := filepath.Join(os.TempDir(), "securescanner_test_file.txt")
	os.WriteFile(tmpFile, []byte("test"), 0644)
	defer os.Remove(tmpFile)

	_, err := s.ScanDirectory(tmpFile, ScanOptions{})
	if err == nil {
		t.Fatal("expected error for file path")
	}
}

func TestScanDirectory_VulnerableProject(t *testing.T) {
	// Create a temp directory with vulnerable files
	tmpDir := t.TempDir()

	// JS file with eval
	jsCode := `
const userInput = req.query.code;
const result = eval(userInput);
console.log(result);
`
	os.WriteFile(filepath.Join(tmpDir, "app.js"), []byte(jsCode), 0644)

	// Python file with command injection
	pyCode := `
import os
user_cmd = input("Enter command: ")
os.system(user_cmd)
`
	os.WriteFile(filepath.Join(tmpDir, "run.py"), []byte(pyCode), 0644)

	s := NewScanner(nil)
	result, err := s.ScanDirectory(tmpDir, ScanOptions{})
	if err != nil {
		t.Fatalf("scan failed: %v", err)
	}

	if result.Summary.TotalFiles != 2 {
		t.Errorf("expected 2 files scanned, got %d", result.Summary.TotalFiles)
	}
	if result.Summary.TotalVulnerabilities == 0 {
		t.Error("expected vulnerabilities to be found")
	}

	// Verify scan metadata
	if result.ScanID == "" {
		t.Error("expected non-empty scan ID")
	}
	if result.Timestamp == "" {
		t.Error("expected non-empty timestamp")
	}
}

func TestScanDirectory_CleanProject(t *testing.T) {
	tmpDir := t.TempDir()

	safeCode := `
function greet(name) {
    return "Hello, " + name;
}
module.exports = { greet };
`
	os.WriteFile(filepath.Join(tmpDir, "safe.js"), []byte(safeCode), 0644)

	s := NewScanner(nil)
	result, err := s.ScanDirectory(tmpDir, ScanOptions{})
	if err != nil {
		t.Fatalf("scan failed: %v", err)
	}

	if result.Summary.TotalFiles != 1 {
		t.Errorf("expected 1 file, got %d", result.Summary.TotalFiles)
	}
}

func TestScanDirectory_ExcludesDirectories(t *testing.T) {
	tmpDir := t.TempDir()

	// Create node_modules dir with a file
	nmDir := filepath.Join(tmpDir, "node_modules")
	os.Mkdir(nmDir, 0755)
	os.WriteFile(filepath.Join(nmDir, "pkg.js"), []byte(`eval("code")`), 0644)

	// Create src dir with a file
	srcDir := filepath.Join(tmpDir, "src")
	os.Mkdir(srcDir, 0755)
	os.WriteFile(filepath.Join(srcDir, "app.js"), []byte(`console.log("safe");`), 0644)

	s := NewScanner(nil)
	result, err := s.ScanDirectory(tmpDir, ScanOptions{})
	if err != nil {
		t.Fatalf("scan failed: %v", err)
	}

	// Should only scan src/app.js, not node_modules/pkg.js
	if result.Summary.TotalFiles != 1 {
		t.Errorf("expected 1 file (excluding node_modules), got %d", result.Summary.TotalFiles)
	}
}

func TestScanDirectory_LanguageFilter(t *testing.T) {
	tmpDir := t.TempDir()

	os.WriteFile(filepath.Join(tmpDir, "app.js"), []byte(`eval("x")`), 0644)
	os.WriteFile(filepath.Join(tmpDir, "main.py"), []byte(`eval("y")`), 0644)

	s := NewScanner(nil)
	result, err := s.ScanDirectory(tmpDir, ScanOptions{
		Languages: LanguageSet{"python": {}},
	})
	if err != nil {
		t.Fatalf("scan failed: %v", err)
	}

	// Should only scan Python file
	if result.Summary.TotalFiles != 1 {
		t.Errorf("expected 1 file (python only), got %d", result.Summary.TotalFiles)
	}
}

func TestScanDirectory_MinSeverityFilter(t *testing.T) {
	tmpDir := t.TempDir()

	// eval_injection is critical, prototype_pollution is medium
	code := `
const result = eval(input);
obj.__proto__ = payload;
`
	os.WriteFile(filepath.Join(tmpDir, "test.js"), []byte(code), 0644)

	s := NewScanner(nil)

	// Only critical
	result, err := s.ScanDirectory(tmpDir, ScanOptions{MinSeverity: SeverityCritical})
	if err != nil {
		t.Fatalf("scan failed: %v", err)
	}

	for _, v := range result.Vulnerabilities {
		if SeverityOrder(v.Severity) < SeverityOrder(SeverityCritical) {
			t.Errorf("found vulnerability below critical: %s (%s)", v.Type, v.Severity)
		}
	}
}
