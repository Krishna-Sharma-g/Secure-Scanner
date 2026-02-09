package scanner

import (
	"path/filepath"
	"strings"
)

type LanguageSet map[string]struct{}

func DefaultLanguageSet() LanguageSet {
	return LanguageSet{
		"javascript": {},
		"typescript": {},
		"python":     {},
		"go":         {},
	}
}

func DefaultExcludedDirs() map[string]struct{} {
	return map[string]struct{}{
		"node_modules": {},
		"vendor":       {},
		".git":         {},
		"dist":         {},
		"build":        {},
	}
}

func LanguageForPath(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".js", ".jsx":
		return "javascript"
	case ".ts", ".tsx":
		return "typescript"
	case ".py":
		return "python"
	case ".go":
		return "go"
	default:
		return ""
	}
}

func (ls LanguageSet) Allows(path string) bool {
	lang := LanguageForPath(path)
	if lang == "" {
		return false
	}
	_, ok := ls[lang]
	return ok
}
