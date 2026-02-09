package scanner

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"
)

type BackendClient struct {
	baseURL string
	client  *http.Client
	token   string
}

type ProjectResponse struct {
	ID string `json:"id"`
}

type ScanResponse struct {
	ID string `json:"id"`
}

type CreateProjectRequest struct {
	Name string `json:"name"`
}

type CreateScanRequest struct {
	ProjectID  string         `json:"project_id"`
	ScanConfig map[string]any `json:"scan_config,omitempty"`
}

type ScanFilePayload struct {
	FilePath           string `json:"file_path"`
	Language           string `json:"language,omitempty"`
	LinesOfCode        int    `json:"lines_of_code,omitempty"`
	VulnerabilityCount int    `json:"vulnerability_count,omitempty"`
}

type VulnerabilityPayload struct {
	Type         string `json:"type"`
	Severity     string `json:"severity"`
	FilePath     string `json:"file_path"`
	LineNumber   int    `json:"line_number"`
	ColumnNumber int    `json:"column_number,omitempty"`
	CodeSnippet  string `json:"code_snippet,omitempty"`
	Message      string `json:"message"`
	CWEID        string `json:"cwe_id,omitempty"`
	Status       string `json:"status,omitempty"`
}

type ScanUpdatePayload struct {
	Status          string `json:"status,omitempty"`
	TotalFiles      int    `json:"total_files,omitempty"`
	FilesProcessed  int    `json:"files_processed,omitempty"`
	DurationSeconds int    `json:"duration_seconds,omitempty"`
}

func NewBackendClient(baseURL string, token string) *BackendClient {
	return &BackendClient{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 10 * time.Second},
		token:   token,
	}
}

func (b *BackendClient) CreateProject(name string) (string, error) {
	payload := CreateProjectRequest{Name: name}
	var resp ProjectResponse
	if err := b.postJSON("/api/projects", payload, &resp); err != nil {
		return "", err
	}
	if resp.ID == "" {
		return "", errors.New("missing project id")
	}
	return resp.ID, nil
}

func (b *BackendClient) CreateScan(projectID string, scanConfig map[string]any) (string, error) {
	payload := CreateScanRequest{ProjectID: projectID, ScanConfig: scanConfig}
	var resp ScanResponse
	if err := b.postJSON("/api/scans", payload, &resp); err != nil {
		return "", err
	}
	if resp.ID == "" {
		return "", errors.New("missing scan id")
	}
	return resp.ID, nil
}

func (b *BackendClient) SendFiles(scanID string, files []ScanFilePayload) error {
	if len(files) == 0 {
		return nil
	}
	return b.postJSON("/api/scans/"+scanID+"/files", files, nil)
}

func (b *BackendClient) SendVulnerabilities(scanID string, vulns []VulnerabilityPayload) error {
	if len(vulns) == 0 {
		return nil
	}
	return b.postJSON("/api/scans/"+scanID+"/vulnerabilities", vulns, nil)
}

func (b *BackendClient) UpdateScan(scanID string, update ScanUpdatePayload) error {
	return b.patchJSON("/api/scans/"+scanID, update, nil)
}

func (b *BackendClient) postJSON(path string, payload any, out any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, b.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if b.token != "" {
		req.Header.Set("Authorization", "Bearer "+b.token)
	}
	resp, err := b.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		payload, _ := io.ReadAll(resp.Body)
		if len(payload) > 0 {
			return errors.New(resp.Status + ": " + string(payload))
		}
		return errors.New(resp.Status)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

func (b *BackendClient) patchJSON(path string, payload any, out any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPatch, b.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if b.token != "" {
		req.Header.Set("Authorization", "Bearer "+b.token)
	}
	resp, err := b.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		payload, _ := io.ReadAll(resp.Body)
		if len(payload) > 0 {
			return errors.New(resp.Status + ": " + string(payload))
		}
		return errors.New(resp.Status)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}
