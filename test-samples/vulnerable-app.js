// Vulnerable JavaScript file for testing SecureScanner detectors

const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const app = express();

// 1. Eval injection — CWE-95
app.get("/calc", (req, res) => {
  const expr = req.query.expression;
  const result = eval(expr);                    // AST: eval_injection
  res.json({ result });
});

// 2. Command injection — CWE-78
app.get("/ping", (req, res) => {
  const host = req.query.host;
  exec("ping -c 1 " + host, (err, stdout) => {  // AST: command_injection
    res.send(stdout);
  });
});

// 3. SQL injection — CWE-89
app.get("/user", async (req, res) => {
  const id = req.query.id;
  const result = await db.query(`SELECT * FROM users WHERE id = ${id}`);  // AST: sql_injection_ast
  res.json(result);
});

// 4. DOM XSS — CWE-79
function renderProfile(user) {
  document.getElementById("profile").innerHTML = user.bio;  // AST: xss_dom
}

// 5. Path traversal — CWE-22
app.get("/file", (req, res) => {
  const filePath = req.query.path;
  fs.readFile(filePath, "utf8", (err, data) => {  // AST: path_traversal
    res.send(data);
  });
});

// 6. Hardcoded secret — CWE-798
const api_key = "sk_live_abcdef1234567890abcdef";    // Regex + AST: hardcoded_secret
const db_password = "SuperSecretDatabasePassword123"; // AST: hardcoded_secret_ast

// 7. Prototype pollution — CWE-1321
function merge(target, source) {
  for (const key in source) {
    target.__proto__ = source[key];  // AST: prototype_pollution
  }
}

// 8. new Function() injection
const dynamicFn = new Function("return " + userCode);  // AST: eval_injection (new_expression)

app.listen(3000);
