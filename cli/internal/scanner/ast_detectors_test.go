package scanner

import (
	"testing"
)

func getASTEngine() Detector {
	return NewASTEngine()
}

func TestAST_EvalInjection_JavaScript(t *testing.T) {
	engine := getASTEngine()
	tests := []struct {
		name string
		code string
		want int
	}{
		{
			name: "eval with variable",
			code: `const result = eval(userInput);`,
			want: 1,
		},
		{
			name: "eval with string literal",
			code: `const result = eval("1 + 2");`,
			want: 1, // still flagged — eval is always risky
		},
		{
			name: "Function constructor",
			code: `const fn = new Function("return " + code);`,
			want: 1,
		},
		{
			name: "safe function call",
			code: `const result = parseInt(value);`,
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			findings := engine.Detect("test.js", "javascript", []byte(tt.code))
			count := countByType(findings, "eval_injection")
			if count != tt.want {
				t.Errorf("got %d eval_injection findings, want %d", count, tt.want)
			}
		})
	}
}

func TestAST_EvalInjection_Python(t *testing.T) {
	engine := getASTEngine()
	tests := []struct {
		name string
		code string
		want int
	}{
		{
			name: "eval call",
			code: `result = eval(user_input)`,
			want: 1,
		},
		{
			name: "exec call",
			code: `exec(code_string)`,
			want: 1,
		},
		{
			name: "safe function",
			code: `result = int(value)`,
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			findings := engine.Detect("test.py", "python", []byte(tt.code))
			count := countByType(findings, "eval_injection")
			if count != tt.want {
				t.Errorf("got %d eval_injection findings, want %d", count, tt.want)
			}
		})
	}
}

func TestAST_CommandInjection_JavaScript(t *testing.T) {
	engine := getASTEngine()
	tests := []struct {
		name string
		code string
		want int
	}{
		{
			name: "exec with variable",
			code: `const { exec } = require("child_process"); exec(userCommand);`,
			want: 1,
		},
		{
			name: "spawn call",
			code: `spawn(cmd, args);`,
			want: 1,
		},
		{
			name: "safe console.log",
			code: `console.log("hello");`,
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			findings := engine.Detect("test.js", "javascript", []byte(tt.code))
			count := countByType(findings, "command_injection")
			if count != tt.want {
				t.Errorf("got %d command_injection findings, want %d", count, tt.want)
			}
		})
	}
}

func TestAST_CommandInjection_Python(t *testing.T) {
	engine := getASTEngine()
	tests := []struct {
		name string
		code string
		want int
	}{
		{
			name: "os.system with variable",
			code: `import os; os.system(user_cmd)`,
			want: 1,
		},
		{
			name: "subprocess.run with variable",
			code: `import subprocess; subprocess.run(cmd)`,
			want: 1,
		},
		{
			name: "os.system with string literal is safe",
			code: `import os; os.system("ls -la")`,
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			findings := engine.Detect("test.py", "python", []byte(tt.code))
			count := countByType(findings, "command_injection")
			if count != tt.want {
				t.Errorf("got %d command_injection findings, want %d", count, tt.want)
			}
		})
	}
}

func TestAST_DOMXSS(t *testing.T) {
	engine := getASTEngine()
	tests := []struct {
		name string
		code string
		want int
	}{
		{
			name: "innerHTML with variable",
			code: `document.getElementById("app").innerHTML = userContent;`,
			want: 1,
		},
		{
			name: "outerHTML with variable",
			code: `element.outerHTML = htmlString;`,
			want: 1,
		},
		{
			name: "innerHTML with string literal is safer",
			code: `element.innerHTML = "<p>Hello</p>";`,
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			findings := engine.Detect("test.js", "javascript", []byte(tt.code))
			count := countByType(findings, "xss_dom")
			if count != tt.want {
				t.Errorf("got %d xss_dom findings, want %d", count, tt.want)
			}
		})
	}
}

func TestAST_SQLInjection_JavaScript(t *testing.T) {
	engine := getASTEngine()
	tests := []struct {
		name string
		code string
		want int
	}{
		{
			name: "template literal in query",
			code: "db.query(`SELECT * FROM users WHERE id = ${userId}`);",
			want: 1,
		},
		{
			name: "concatenation in execute",
			code: `connection.execute("SELECT * FROM users WHERE id = " + id);`,
			want: 1,
		},
		{
			name: "parameterized query is safe",
			code: `db.query("SELECT * FROM users WHERE id = $1", [userId]);`,
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			findings := engine.Detect("test.js", "javascript", []byte(tt.code))
			count := countByType(findings, "sql_injection_ast")
			if count != tt.want {
				t.Errorf("got %d sql_injection_ast findings, want %d", count, tt.want)
			}
		})
	}
}

func TestAST_HardcodedSecret(t *testing.T) {
	engine := getASTEngine()
	tests := []struct {
		name     string
		code     string
		language string
		want     int
	}{
		{
			name:     "JS password assignment",
			code:     `const password = "myS3cretP@ssw0rd";`,
			language: "javascript",
			want:     1,
		},
		{
			name:     "Python api_key",
			code:     `api_key = "sk_live_1234567890abcdef"`,
			language: "python",
			want:     1,
		},
		{
			name:     "Go secret",
			code:     `dbPassword := "hunter2secret"`,
			language: "go",
			want:     1,
		},
		{
			name:     "non-secret variable",
			code:     `const username = "admin";`,
			language: "javascript",
			want:     0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ext := map[string]string{"javascript": "test.js", "python": "test.py", "go": "test.go"}
			findings := engine.Detect(ext[tt.language], tt.language, []byte(tt.code))
			count := countByType(findings, "hardcoded_secret_ast")
			if count != tt.want {
				t.Errorf("got %d hardcoded_secret_ast findings, want %d", count, tt.want)
			}
		})
	}
}

func TestAST_InsecureDeserialization(t *testing.T) {
	engine := getASTEngine()
	tests := []struct {
		name string
		code string
		want int
	}{
		{
			name: "pickle.loads",
			code: `data = pickle.loads(user_data)`,
			want: 1,
		},
		{
			name: "yaml.load without SafeLoader",
			code: `config = yaml.load(raw_yaml)`,
			want: 1,
		},
		{
			name: "yaml.load with SafeLoader is safe",
			code: `config = yaml.load(raw_yaml, Loader=yaml.SafeLoader)`,
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			findings := engine.Detect("test.py", "python", []byte(tt.code))
			count := countByType(findings, "insecure_deserialization")
			if count != tt.want {
				t.Errorf("got %d insecure_deserialization findings, want %d", count, tt.want)
			}
		})
	}
}

func TestAST_PrototypePollution(t *testing.T) {
	engine := getASTEngine()
	tests := []struct {
		name string
		code string
		want int
	}{
		{
			name: "__proto__ assignment",
			code: `obj.__proto__ = malicious;`,
			want: 1,
		},
		{
			name: "reading __proto__ is not flagged",
			code: `const proto = obj.__proto__;`,
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			findings := engine.Detect("test.js", "javascript", []byte(tt.code))
			count := countByType(findings, "prototype_pollution")
			if count != tt.want {
				t.Errorf("got %d prototype_pollution findings, want %d", count, tt.want)
			}
		})
	}
}

func TestAST_IgnoresUnsupportedLanguages(t *testing.T) {
	engine := getASTEngine()
	findings := engine.Detect("test.rb", "ruby", []byte(`eval(user_input)`))
	if len(findings) != 0 {
		t.Errorf("expected 0 findings for unsupported language, got %d", len(findings))
	}
}

// --- Test Helpers ---

func countByType(findings []Finding, typeName string) int {
	count := 0
	for _, f := range findings {
		if f.Type == typeName {
			count++
		}
	}
	return count
}
