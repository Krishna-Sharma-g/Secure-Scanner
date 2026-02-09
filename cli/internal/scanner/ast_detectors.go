package scanner

import (
	"context"
	"strings"

	sitter "github.com/smacker/go-tree-sitter"
	"github.com/smacker/go-tree-sitter/golang"
	"github.com/smacker/go-tree-sitter/javascript"
	"github.com/smacker/go-tree-sitter/python"
	tsTypescript "github.com/smacker/go-tree-sitter/typescript/typescript"
)

// ASTDetector detects vulnerabilities by analyzing tree-sitter ASTs.
// Unlike regex, it understands code structure — distinguishing function
// calls from comments, assignments from comparisons.
type ASTDetector struct {
	typeName string
	severity Severity
	cwe      string
	message  string
	check    func(root *sitter.Node, source []byte, language string) []astMatch
}

type astMatch struct {
	line    int
	column  int
	snippet string
}

// ASTEngine wraps multiple AST detectors and shares a single parse per file.
// This avoids re-parsing for every detector — tree-sitter parses once, all
// detectors walk the same tree.
type ASTEngine struct {
	detectors []*ASTDetector
}

func (e *ASTEngine) Type() string      { return "ast_engine" }
func (e *ASTEngine) Severity() Severity { return SeverityCritical }
func (e *ASTEngine) CWE() string       { return "" }

func (e *ASTEngine) Detect(path string, language string, content []byte) []Finding {
	grammar := languageGrammar(language)
	if grammar == nil {
		return nil
	}

	parser := sitter.NewParser()
	parser.SetLanguage(grammar)

	tree, err := parser.ParseCtx(context.Background(), nil, content)
	if err != nil {
		return nil
	}
	defer tree.Close()

	root := tree.RootNode()
	var allFindings []Finding

	for _, det := range e.detectors {
		for _, m := range det.check(root, content, language) {
			allFindings = append(allFindings, Finding{
				ID:          hashID(path, m.line, det.typeName),
				Type:        det.typeName,
				Severity:    det.severity,
				FilePath:    path,
				Line:        m.line,
				Column:      m.column,
				CodeSnippet: m.snippet,
				Message:     det.message,
				CWE:         det.cwe,
				Language:    language,
			})
		}
	}

	return allFindings
}

// NewASTEngine returns a single Detector that runs all AST-based checks.
func NewASTEngine() Detector {
	return &ASTEngine{
		detectors: []*ASTDetector{
			{
				typeName: "eval_injection",
				severity: SeverityCritical,
				cwe:      "CWE-95",
				message:  "Dangerous eval/exec call allows arbitrary code execution",
				check:    detectEvalInjection,
			},
			{
				typeName: "command_injection",
				severity: SeverityCritical,
				cwe:      "CWE-78",
				message:  "OS command execution with potentially unsanitized input",
				check:    detectCommandInjection,
			},
			{
				typeName: "path_traversal",
				severity: SeverityHigh,
				cwe:      "CWE-22",
				message:  "File operation with dynamic path may allow directory traversal",
				check:    detectPathTraversal,
			},
			{
				typeName: "xss_dom",
				severity: SeverityHigh,
				cwe:      "CWE-79",
				message:  "DOM-based XSS: unsafe assignment to innerHTML/outerHTML",
				check:    detectDOMXSS,
			},
			{
				typeName: "sql_injection_ast",
				severity: SeverityHigh,
				cwe:      "CWE-89",
				message:  "SQL query constructed with string interpolation or concatenation",
				check:    detectSQLInjectionAST,
			},
			{
				typeName: "hardcoded_secret_ast",
				severity: SeverityCritical,
				cwe:      "CWE-798",
				message:  "Hardcoded credential detected in variable assignment",
				check:    detectHardcodedSecretAST,
			},
			{
				typeName: "insecure_deserialization",
				severity: SeverityHigh,
				cwe:      "CWE-502",
				message:  "Deserialization of untrusted data (pickle/yaml.load without SafeLoader)",
				check:    detectInsecureDeserialization,
			},
			{
				typeName: "prototype_pollution",
				severity: SeverityMedium,
				cwe:      "CWE-1321",
				message:  "Potential prototype pollution via __proto__ or constructor.prototype",
				check:    detectPrototypePollution,
			},
		},
	}
}

// --- Language Grammar ---

func languageGrammar(language string) *sitter.Language {
	switch language {
	case "javascript":
		return javascript.GetLanguage()
	case "typescript":
		return tsTypescript.GetLanguage()
	case "python":
		return python.GetLanguage()
	case "go":
		return golang.GetLanguage()
	default:
		return nil
	}
}

// --- AST Helpers ---

// walkAST recursively visits every node in the syntax tree.
func walkAST(node *sitter.Node, fn func(*sitter.Node)) {
	fn(node)
	for i := 0; i < int(node.ChildCount()); i++ {
		if child := node.Child(i); child != nil {
			walkAST(child, fn)
		}
	}
}

func nodeText(node *sitter.Node, source []byte) string {
	return node.Content(source)
}

func truncateSnippet(s string, maxLen int) string {
	s = strings.TrimSpace(s)
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}

func nodeToMatch(node *sitter.Node, source []byte) astMatch {
	return astMatch{
		line:    int(node.StartPoint().Row) + 1,
		column:  int(node.StartPoint().Column) + 1,
		snippet: truncateSnippet(nodeText(node, source), 120),
	}
}

// isDynamicValue returns true if the node represents a non-literal value
// (concatenation, template interpolation, variable reference, function call).
func isDynamicValue(node *sitter.Node, source []byte) bool {
	switch node.Type() {
	case "template_string", "template_literal":
		for i := 0; i < int(node.NamedChildCount()); i++ {
			if node.NamedChild(i).Type() == "template_substitution" {
				return true
			}
		}
		return false
	case "binary_expression":
		return true
	case "call_expression", "call":
		return true
	case "identifier", "member_expression":
		return true
	case "formatted_string", "f_string":
		return true
	default:
		return false
	}
}

// --- Detectors ---

// detectEvalInjection finds eval(), exec(), Function() calls.
// These allow arbitrary code execution and are almost always dangerous.
func detectEvalInjection(root *sitter.Node, source []byte, language string) []astMatch {
	dangerous := map[string]map[string]bool{
		"javascript": {"eval": true, "Function": true},
		"typescript": {"eval": true, "Function": true},
		"python":     {"eval": true, "exec": true, "compile": true},
	}
	fns, ok := dangerous[language]
	if !ok {
		return nil
	}

	var matches []astMatch
	walkAST(root, func(node *sitter.Node) {
		switch node.Type() {
		case "call_expression", "call":
			fnNode := node.ChildByFieldName("function")
			if fnNode == nil {
				return
			}
			if fns[nodeText(fnNode, source)] {
				matches = append(matches, nodeToMatch(node, source))
			}
		case "new_expression":
			// new Function("code") is equivalent to eval
			constructor := node.ChildByFieldName("constructor")
			if constructor == nil {
				return
			}
			if fns[nodeText(constructor, source)] {
				matches = append(matches, nodeToMatch(node, source))
			}
		}
	})
	return matches
}

// detectCommandInjection finds OS command execution functions with dynamic args.
// JS: exec(), spawn(), execSync()
// Python: os.system(), subprocess.run(), subprocess.Popen()
// Go: exec.Command() with non-literal arguments
func detectCommandInjection(root *sitter.Node, source []byte, language string) []astMatch {
	var matches []astMatch

	switch language {
	case "javascript", "typescript":
		dangerousFns := map[string]bool{
			"exec": true, "execSync": true,
			"spawn": true, "spawnSync": true,
		}
		walkAST(root, func(node *sitter.Node) {
			if node.Type() != "call_expression" {
				return
			}
			fnNode := node.ChildByFieldName("function")
			if fnNode == nil {
				return
			}
			fnName := nodeText(fnNode, source)
			if dangerousFns[fnName] {
				matches = append(matches, nodeToMatch(node, source))
				return
			}
			// member call: child_process.exec(...), cp.spawn(...)
			if fnNode.Type() == "member_expression" {
				prop := fnNode.ChildByFieldName("property")
				if prop != nil && dangerousFns[nodeText(prop, source)] {
					matches = append(matches, nodeToMatch(node, source))
				}
			}
		})

	case "python":
		dangerousPatterns := []string{
			"os.system", "os.popen", "os.exec",
			"subprocess.call", "subprocess.run", "subprocess.Popen",
			"subprocess.check_output", "subprocess.check_call",
			"commands.getoutput",
		}
		walkAST(root, func(node *sitter.Node) {
			if node.Type() != "call" {
				return
			}
			fnNode := node.ChildByFieldName("function")
			if fnNode == nil {
				return
			}
			fnText := nodeText(fnNode, source)
			for _, pattern := range dangerousPatterns {
				if fnText == pattern {
					args := node.ChildByFieldName("arguments")
					if args != nil && args.NamedChildCount() > 0 {
						firstArg := args.NamedChild(0)
						if firstArg.Type() != "string" {
							matches = append(matches, nodeToMatch(node, source))
						}
					}
					break
				}
			}
		})

	case "go":
		walkAST(root, func(node *sitter.Node) {
			if node.Type() != "call_expression" {
				return
			}
			fnNode := node.ChildByFieldName("function")
			if fnNode == nil {
				return
			}
			fnText := nodeText(fnNode, source)
			if fnText == "exec.Command" || fnText == "exec.CommandContext" {
				args := node.ChildByFieldName("arguments")
				if args != nil && args.NamedChildCount() > 0 {
					firstArg := args.NamedChild(0)
					if firstArg.Type() != "interpreted_string_literal" && firstArg.Type() != "raw_string_literal" {
						matches = append(matches, nodeToMatch(node, source))
					}
				}
			}
		})
	}

	return matches
}

// detectPathTraversal finds file operations where the path is dynamic.
// JS: fs.readFile(userInput), fs.writeFile(req.path)
// Python: open(user_path)
// Go: os.Open(variable), os.ReadFile(param)
func detectPathTraversal(root *sitter.Node, source []byte, language string) []astMatch {
	var matches []astMatch

	switch language {
	case "javascript", "typescript":
		fsOps := map[string]bool{
			"readFile": true, "readFileSync": true,
			"writeFile": true, "writeFileSync": true,
			"unlink": true, "unlinkSync": true,
			"readdir": true, "readdirSync": true,
			"createReadStream": true, "createWriteStream": true,
		}
		walkAST(root, func(node *sitter.Node) {
			if node.Type() != "call_expression" {
				return
			}
			fnNode := node.ChildByFieldName("function")
			if fnNode == nil || fnNode.Type() != "member_expression" {
				return
			}
			prop := fnNode.ChildByFieldName("property")
			if prop == nil || !fsOps[nodeText(prop, source)] {
				return
			}
			args := node.ChildByFieldName("arguments")
			if args != nil && args.NamedChildCount() > 0 {
				if isDynamicValue(args.NamedChild(0), source) {
					matches = append(matches, nodeToMatch(node, source))
				}
			}
		})

	case "python":
		fileOps := map[string]bool{"open": true}
		walkAST(root, func(node *sitter.Node) {
			if node.Type() != "call" {
				return
			}
			fnNode := node.ChildByFieldName("function")
			if fnNode == nil || !fileOps[nodeText(fnNode, source)] {
				return
			}
			args := node.ChildByFieldName("arguments")
			if args != nil && args.NamedChildCount() > 0 {
				if isDynamicValue(args.NamedChild(0), source) {
					matches = append(matches, nodeToMatch(node, source))
				}
			}
		})

	case "go":
		goFileOps := map[string]bool{
			"os.Open": true, "os.Create": true, "os.OpenFile": true,
			"os.ReadFile": true, "os.WriteFile": true,
		}
		walkAST(root, func(node *sitter.Node) {
			if node.Type() != "call_expression" {
				return
			}
			fnNode := node.ChildByFieldName("function")
			if fnNode == nil {
				return
			}
			if goFileOps[nodeText(fnNode, source)] {
				args := node.ChildByFieldName("arguments")
				if args != nil && args.NamedChildCount() > 0 {
					if isDynamicValue(args.NamedChild(0), source) {
						matches = append(matches, nodeToMatch(node, source))
					}
				}
			}
		})
	}

	return matches
}

// detectDOMXSS finds innerHTML/outerHTML assignments with non-literal values.
func detectDOMXSS(root *sitter.Node, source []byte, language string) []astMatch {
	if language != "javascript" && language != "typescript" {
		return nil
	}

	dangerousProps := map[string]bool{
		"innerHTML": true, "outerHTML": true,
	}

	var matches []astMatch
	walkAST(root, func(node *sitter.Node) {
		if node.Type() != "assignment_expression" {
			return
		}
		left := node.ChildByFieldName("left")
		if left == nil || left.Type() != "member_expression" {
			return
		}
		prop := left.ChildByFieldName("property")
		if prop == nil || !dangerousProps[nodeText(prop, source)] {
			return
		}
		right := node.ChildByFieldName("right")
		if right != nil && right.Type() != "string" && right.Type() != "string_literal" {
			matches = append(matches, nodeToMatch(node, source))
		}
	})
	return matches
}

// detectSQLInjectionAST finds SQL query methods called with interpolated strings.
// JS: db.query(`SELECT * FROM ${table}`), connection.execute("SELECT " + input)
// Python: cursor.execute(f"SELECT * FROM {table}")
// Go: db.Query(fmt.Sprintf("SELECT * FROM %s", table))
func detectSQLInjectionAST(root *sitter.Node, source []byte, language string) []astMatch {
	var matches []astMatch

	switch language {
	case "javascript", "typescript":
		queryMethods := map[string]bool{
			"query": true, "execute": true, "raw": true, "prepare": true,
		}
		walkAST(root, func(node *sitter.Node) {
			if node.Type() != "call_expression" {
				return
			}
			fnNode := node.ChildByFieldName("function")
			if fnNode == nil || fnNode.Type() != "member_expression" {
				return
			}
			prop := fnNode.ChildByFieldName("property")
			if prop == nil || !queryMethods[nodeText(prop, source)] {
				return
			}
			args := node.ChildByFieldName("arguments")
			if args == nil || args.NamedChildCount() == 0 {
				return
			}
			firstArg := args.NamedChild(0)
			if firstArg.Type() == "template_string" || firstArg.Type() == "binary_expression" {
				matches = append(matches, nodeToMatch(node, source))
			}
		})

	case "python":
		walkAST(root, func(node *sitter.Node) {
			if node.Type() != "call" {
				return
			}
			fnNode := node.ChildByFieldName("function")
			if fnNode == nil {
				return
			}
			fnText := nodeText(fnNode, source)
			if !strings.HasSuffix(fnText, ".execute") && !strings.HasSuffix(fnText, ".executemany") {
				return
			}
			args := node.ChildByFieldName("arguments")
			if args == nil || args.NamedChildCount() == 0 {
				return
			}
			firstArg := args.NamedChild(0)
			argText := nodeText(firstArg, source)
			if firstArg.Type() == "binary_expression" ||
				strings.HasPrefix(argText, "f\"") || strings.HasPrefix(argText, "f'") ||
				strings.Contains(argText, ".format(") {
				matches = append(matches, nodeToMatch(node, source))
			}
		})

	case "go":
		sqlMethods := map[string]bool{
			"Query": true, "Exec": true, "QueryRow": true,
			"QueryContext": true, "ExecContext": true, "QueryRowContext": true,
		}
		walkAST(root, func(node *sitter.Node) {
			if node.Type() != "call_expression" {
				return
			}
			fnNode := node.ChildByFieldName("function")
			if fnNode == nil || fnNode.Type() != "selector_expression" {
				return
			}
			field := fnNode.ChildByFieldName("field")
			if field == nil || !sqlMethods[nodeText(field, source)] {
				return
			}
			args := node.ChildByFieldName("arguments")
			if args == nil || args.NamedChildCount() == 0 {
				return
			}
			firstArg := args.NamedChild(0)
			if firstArg.Type() == "call_expression" {
				// Check for fmt.Sprintf or similar
				innerFn := firstArg.ChildByFieldName("function")
				if innerFn != nil {
					fnText := nodeText(innerFn, source)
					if fnText == "fmt.Sprintf" || fnText == "fmt.Sprint" {
						matches = append(matches, nodeToMatch(node, source))
					}
				}
			}
			if firstArg.Type() == "binary_expression" {
				matches = append(matches, nodeToMatch(node, source))
			}
		})
	}

	return matches
}

// detectHardcodedSecretAST finds variable assignments where the name matches
// secret patterns (password, api_key, token, etc.) and the value is a string literal.
func detectHardcodedSecretAST(root *sitter.Node, source []byte, language string) []astMatch {
	secretPatterns := []string{
		"password", "passwd", "secret", "api_key", "apikey", "api_secret",
		"access_token", "auth_token", "private_key", "secret_key",
		"database_url", "db_password",
	}

	isSecretName := func(name string) bool {
		lower := strings.ToLower(name)
		for _, pattern := range secretPatterns {
			if strings.Contains(lower, pattern) {
				return true
			}
		}
		return false
	}

	isStringLiteral := func(nodeType string) bool {
		switch nodeType {
		case "string", "string_literal", "template_string",
			"interpreted_string_literal", "raw_string_literal",
			"concatenated_string":
			return true
		default:
			return false
		}
	}

	var matches []astMatch
	walkAST(root, func(node *sitter.Node) {
		switch language {
		case "javascript", "typescript":
			if node.Type() == "variable_declarator" {
				name := node.ChildByFieldName("name")
				value := node.ChildByFieldName("value")
				if name != nil && value != nil &&
					isSecretName(nodeText(name, source)) &&
					isStringLiteral(value.Type()) &&
					len(nodeText(value, source)) > 4 {
					matches = append(matches, nodeToMatch(node, source))
				}
			}
			if node.Type() == "assignment_expression" {
				left := node.ChildByFieldName("left")
				right := node.ChildByFieldName("right")
				if left != nil && right != nil &&
					isSecretName(nodeText(left, source)) &&
					isStringLiteral(right.Type()) {
					matches = append(matches, nodeToMatch(node, source))
				}
			}

		case "python":
			if node.Type() == "assignment" {
				left := node.ChildByFieldName("left")
				right := node.ChildByFieldName("right")
				if left != nil && right != nil &&
					isSecretName(nodeText(left, source)) &&
					isStringLiteral(right.Type()) &&
					len(nodeText(right, source)) > 4 {
					matches = append(matches, nodeToMatch(node, source))
				}
			}

		case "go":
			if node.Type() == "short_var_declaration" {
				left := node.ChildByFieldName("left")
				right := node.ChildByFieldName("right")
				if left != nil && right != nil && isSecretName(nodeText(left, source)) {
					hasStringLiteral := false
					walkAST(right, func(child *sitter.Node) {
						if isStringLiteral(child.Type()) && len(nodeText(child, source)) > 4 {
							hasStringLiteral = true
						}
					})
					if hasStringLiteral {
						matches = append(matches, nodeToMatch(node, source))
					}
				}
			}
		}
	})

	return matches
}

// detectInsecureDeserialization finds pickle.load, yaml.load without SafeLoader, etc.
func detectInsecureDeserialization(root *sitter.Node, source []byte, language string) []astMatch {
	if language != "python" {
		return nil
	}

	dangerousCalls := map[string]bool{
		"pickle.loads": true, "pickle.load": true,
		"cPickle.loads": true, "cPickle.load": true,
		"yaml.load": true,
		"marshal.loads": true,
		"shelve.open": true,
	}

	var matches []astMatch
	walkAST(root, func(node *sitter.Node) {
		if node.Type() != "call" {
			return
		}
		fnNode := node.ChildByFieldName("function")
		if fnNode == nil {
			return
		}
		fnText := nodeText(fnNode, source)
		if !dangerousCalls[fnText] {
			return
		}
		// yaml.load is safe if Loader=SafeLoader is used
		if fnText == "yaml.load" {
			fullCall := nodeText(node, source)
			if strings.Contains(fullCall, "SafeLoader") || strings.Contains(fullCall, "FullLoader") {
				return
			}
		}
		matches = append(matches, nodeToMatch(node, source))
	})

	return matches
}

// detectPrototypePollution finds __proto__ or constructor.prototype assignments.
func detectPrototypePollution(root *sitter.Node, source []byte, language string) []astMatch {
	if language != "javascript" && language != "typescript" {
		return nil
	}

	var matches []astMatch
	walkAST(root, func(node *sitter.Node) {
		if node.Type() == "member_expression" {
			prop := node.ChildByFieldName("property")
			if prop == nil {
				return
			}
			propText := nodeText(prop, source)
			if propText != "__proto__" && propText != "constructor" {
				return
			}
			parent := node.Parent()
			if parent != nil && parent.Type() == "assignment_expression" {
				left := parent.ChildByFieldName("left")
				if left != nil && strings.Contains(nodeText(left, source), propText) {
					matches = append(matches, nodeToMatch(parent, source))
				}
			}
		}
		// bracket notation: obj["__proto__"] = ...
		if node.Type() == "subscript_expression" {
			text := nodeText(node, source)
			if strings.Contains(text, "__proto__") || strings.Contains(text, "constructor") {
				parent := node.Parent()
				if parent != nil && parent.Type() == "assignment_expression" {
					matches = append(matches, nodeToMatch(parent, source))
				}
			}
		}
	})

	return matches
}
