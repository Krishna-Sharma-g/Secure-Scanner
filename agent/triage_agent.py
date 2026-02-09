"""
SecureScanner Triage Agent

An AI agent built with LangGraph that automatically triages vulnerability
scan results. It classifies findings as true positives, false positives,
or needs-review, and generates remediation guidance.

Architecture:
  1. Fetch scan results from the backend API
  2. For each vulnerability, run through a classification pipeline
  3. Generate remediation suggestions for confirmed vulnerabilities
  4. Update vulnerability statuses via the backend API

This demonstrates the "Agents" workflow pattern:
  fetch → classify → suggest fix → update status
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum
from typing import Annotated, Any

import httpx
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field


# ── Configuration ────────────────────────────────────────

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


# ── Models ───────────────────────────────────────────────

class TriageVerdict(str, Enum):
    TRUE_POSITIVE = "true_positive"
    FALSE_POSITIVE = "false_positive"
    NEEDS_REVIEW = "needs_review"


class VulnerabilityClassification(BaseModel):
    verdict: TriageVerdict = Field(description="Classification of the finding")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score 0-1")
    reasoning: str = Field(description="Why this classification was chosen")
    remediation: str = Field(default="", description="Suggested fix if true positive")


@dataclass
class TriageState:
    """State that flows through the LangGraph pipeline."""
    scan_id: str
    vulnerabilities: list[dict[str, Any]]
    current_index: int = 0
    classifications: list[dict[str, Any]] | None = None
    summary: dict[str, Any] | None = None

    def __post_init__(self):
        if self.classifications is None:
            self.classifications = []


# ── Backend Client ───────────────────────────────────────

class BackendClient:
    """HTTP client for the SecureScanner backend API."""

    def __init__(self, base_url: str = BACKEND_URL):
        self.client = httpx.Client(base_url=base_url, timeout=30.0)

    def get_scan(self, scan_id: str) -> dict:
        resp = self.client.get(f"/api/scans/{scan_id}")
        resp.raise_for_status()
        return resp.json()

    def get_vulnerabilities(self, scan_id: str) -> list[dict]:
        scan = self.get_scan(scan_id)
        return scan.get("vulnerabilities", [])

    def update_vulnerability_status(
        self, vuln_id: str, status: str, notes: str = ""
    ) -> dict:
        resp = self.client.patch(
            f"/api/vulnerabilities/{vuln_id}/status",
            json={"status": status, "notes": notes},
        )
        resp.raise_for_status()
        return resp.json()


# ── LLM Setup ───────────────────────────────────────────

def get_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model="claude-sonnet-4-5-20250929",
        api_key=ANTHROPIC_API_KEY,
        max_tokens=1024,
    )


# ── Graph Nodes ──────────────────────────────────────────

def fetch_vulnerabilities(state: TriageState) -> TriageState:
    """Node 1: Fetch vulnerabilities from the backend."""
    if not state.vulnerabilities:
        client = BackendClient()
        state.vulnerabilities = client.get_vulnerabilities(state.scan_id)
    state.current_index = 0
    state.classifications = []
    return state


def classify_vulnerability(state: TriageState) -> TriageState:
    """Node 2: Use LLM to classify the current vulnerability."""
    if state.current_index >= len(state.vulnerabilities):
        return state

    vuln = state.vulnerabilities[state.current_index]
    llm = get_llm()

    system_prompt = """You are a security expert triaging vulnerability scan findings.
For each finding, determine if it is:
- true_positive: A real security vulnerability that needs fixing
- false_positive: Not actually a vulnerability (pattern matched incorrectly)
- needs_review: Ambiguous, requires human review

Consider:
1. The vulnerability type and CWE
2. The code snippet and context
3. Whether the pattern could be a false positive
4. The severity and potential impact

Respond with JSON matching this schema:
{
    "verdict": "true_positive" | "false_positive" | "needs_review",
    "confidence": 0.0-1.0,
    "reasoning": "explanation",
    "remediation": "suggested fix (only for true_positive)"
}"""

    user_prompt = f"""Triage this vulnerability finding:

Type: {vuln.get('type', 'unknown')}
Severity: {vuln.get('severity', 'unknown')}
CWE: {vuln.get('cweId', vuln.get('cwe_id', 'N/A'))}
File: {vuln.get('filePath', vuln.get('file_path', 'unknown'))}
Line: {vuln.get('lineNumber', vuln.get('line_number', 'N/A'))}
Code Snippet: {vuln.get('codeSnippet', vuln.get('code_snippet', 'N/A'))}
Message: {vuln.get('message', 'N/A')}

Provide your classification as JSON."""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    # Parse LLM response
    try:
        import json
        # Extract JSON from response
        text = response.content
        start = text.index("{")
        end = text.rindex("}") + 1
        classification = json.loads(text[start:end])
    except (ValueError, json.JSONDecodeError):
        classification = {
            "verdict": "needs_review",
            "confidence": 0.0,
            "reasoning": "Failed to parse LLM response",
            "remediation": "",
        }

    state.classifications.append({
        "vulnerability_id": vuln.get("id"),
        "vulnerability_type": vuln.get("type"),
        "file_path": vuln.get("filePath", vuln.get("file_path")),
        **classification,
    })

    state.current_index += 1
    return state


def should_continue(state: TriageState) -> str:
    """Edge: decide whether to classify the next vulnerability or move on."""
    if state.current_index < len(state.vulnerabilities):
        return "classify"
    return "update"


def update_statuses(state: TriageState) -> TriageState:
    """Node 3: Update vulnerability statuses in the backend."""
    client = BackendClient()

    for classification in state.classifications:
        vuln_id = classification.get("vulnerability_id")
        if not vuln_id:
            continue

        verdict = classification.get("verdict", "needs_review")
        status_map = {
            "true_positive": "open",
            "false_positive": "false_positive",
            "needs_review": "open",
        }
        status = status_map.get(verdict, "open")
        notes = (
            f"AI Triage: {verdict} (confidence: {classification.get('confidence', 0):.0%})\n"
            f"Reasoning: {classification.get('reasoning', 'N/A')}\n"
        )
        if classification.get("remediation"):
            notes += f"Suggested fix: {classification['remediation']}"

        try:
            client.update_vulnerability_status(vuln_id, status, notes)
        except httpx.HTTPError as e:
            print(f"Failed to update {vuln_id}: {e}")

    return state


def generate_summary(state: TriageState) -> TriageState:
    """Node 4: Generate a summary report of the triage."""
    total = len(state.classifications)
    true_pos = sum(1 for c in state.classifications if c.get("verdict") == "true_positive")
    false_pos = sum(1 for c in state.classifications if c.get("verdict") == "false_positive")
    needs_review = sum(1 for c in state.classifications if c.get("verdict") == "needs_review")

    state.summary = {
        "scan_id": state.scan_id,
        "total_findings": total,
        "true_positives": true_pos,
        "false_positives": false_pos,
        "needs_review": needs_review,
        "false_positive_rate": f"{false_pos / total:.0%}" if total > 0 else "N/A",
        "classifications": state.classifications,
    }
    return state


# ── Build the Graph ──────────────────────────────────────

def build_triage_graph() -> StateGraph:
    """
    Build the LangGraph triage pipeline:

        fetch → classify ←──┐
                  │          │
                  ├── more? ─┘
                  │
                  ▼
               update → summary → END
    """
    graph = StateGraph(TriageState)

    # Add nodes
    graph.add_node("fetch", fetch_vulnerabilities)
    graph.add_node("classify", classify_vulnerability)
    graph.add_node("update", update_statuses)
    graph.add_node("summary", generate_summary)

    # Add edges
    graph.set_entry_point("fetch")
    graph.add_edge("fetch", "classify")
    graph.add_conditional_edges("classify", should_continue, {
        "classify": "classify",
        "update": "update",
    })
    graph.add_edge("update", "summary")
    graph.add_edge("summary", END)

    return graph


def triage_scan(scan_id: str, vulnerabilities: list[dict] | None = None) -> dict:
    """
    Run the triage agent on a scan.

    Args:
        scan_id: The scan ID to triage
        vulnerabilities: Optional pre-fetched vulnerabilities (skips API call)

    Returns:
        Summary dict with classifications and statistics
    """
    graph = build_triage_graph()
    app = graph.compile()

    initial_state = TriageState(
        scan_id=scan_id,
        vulnerabilities=vulnerabilities or [],
    )

    final_state = app.invoke(initial_state)
    return final_state.summary


# ── CLI Entry Point ──────────────────────────────────────

if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="SecureScanner Triage Agent")
    parser.add_argument("scan_id", help="Scan ID to triage")
    parser.add_argument("--backend-url", default=BACKEND_URL, help="Backend API URL")
    parser.add_argument("--dry-run", action="store_true", help="Classify only, don't update statuses")
    args = parser.parse_args()

    if args.backend_url:
        BACKEND_URL = args.backend_url

    print(f"Triaging scan: {args.scan_id}")
    print(f"Backend: {BACKEND_URL}")
    print()

    result = triage_scan(args.scan_id)

    print("=" * 60)
    print("TRIAGE SUMMARY")
    print("=" * 60)
    print(f"Total findings:    {result['total_findings']}")
    print(f"True positives:    {result['true_positives']}")
    print(f"False positives:   {result['false_positives']}")
    print(f"Needs review:      {result['needs_review']}")
    print(f"False positive rate: {result['false_positive_rate']}")
    print()

    for c in result["classifications"]:
        icon = {"true_positive": "!!", "false_positive": "OK", "needs_review": "??"}
        print(f"  [{icon.get(c['verdict'], '??')}] {c['vulnerability_type']} in {c['file_path']}")
        print(f"       Verdict: {c['verdict']} ({c.get('confidence', 0):.0%})")
        print(f"       Reason: {c['reasoning']}")
        if c.get("remediation"):
            print(f"       Fix: {c['remediation']}")
        print()

    # Also dump full JSON
    print(json.dumps(result, indent=2, default=str))
