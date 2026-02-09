package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"os/exec"
)

// 1. Command injection — CWE-78
func handlePing(w http.ResponseWriter, r *http.Request) {
	host := r.URL.Query().Get("host")
	cmd := exec.Command(host)
	output, _ := cmd.Output()
	w.Write(output)
}

// 2. SQL injection — CWE-89
func getUser(db *sql.DB, id string) {
	query := fmt.Sprintf("SELECT * FROM users WHERE id = '%s'", id)
	db.Query(query)
}

// 3. Path traversal — CWE-22
func serveFile(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("file")
	data, _ := os.ReadFile(path)
	w.Write(data)
}

// 4. Hardcoded secret — CWE-798
dbPassword := "SuperSecretPassword123456"

func main() {
	http.HandleFunc("/ping", handlePing)
	http.HandleFunc("/user", func(w http.ResponseWriter, r *http.Request) {
		db, _ := sql.Open("postgres", "")
		getUser(db, r.URL.Query().Get("id"))
	})
	http.HandleFunc("/file", serveFile)
	http.ListenAndServe(":8080", nil)
}
