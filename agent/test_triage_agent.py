"""Tests for the triage agent — verifies graph structure and logic without LLM calls."""

import pytest
from unittest.mock import patch, MagicMock
from triage_agent import (
    TriageState,
    TriageVerdict,
    build_triage_graph,
    fetch_vulnerabilities,
    should_continue,
    generate_summary,
)


SAMPLE_VULNS = [
    {
        "id": "vuln-1",
        "type": "eval_injection",
        "severity": "critical",
        "filePath": "src/app.js",
        "lineNumber": 10,
        "codeSnippet": "eval(userInput)",
        "message": "Dangerous eval call",
        "cweId": "CWE-95",
    },
    {
        "id": "vuln-2",
        "type": "hardcoded_secret_ast",
        "severity": "critical",
        "filePath": "src/config.js",
        "lineNumber": 5,
        "codeSnippet": 'const password = "test123"',
        "message": "Hardcoded credential",
        "cweId": "CWE-798",
    },
]


class TestTriageState:
    def test_initial_state(self):
        state = TriageState(scan_id="scan-1", vulnerabilities=[])
        assert state.scan_id == "scan-1"
        assert state.current_index == 0
        assert state.classifications == []
        assert state.summary is None

    def test_state_with_vulns(self):
        state = TriageState(scan_id="scan-1", vulnerabilities=SAMPLE_VULNS)
        assert len(state.vulnerabilities) == 2


class TestFetchVulnerabilities:
    def test_uses_provided_vulns(self):
        state = TriageState(scan_id="scan-1", vulnerabilities=SAMPLE_VULNS)
        result = fetch_vulnerabilities(state)
        assert len(result.vulnerabilities) == 2
        assert result.current_index == 0

    @patch("triage_agent.BackendClient")
    def test_fetches_from_backend_when_empty(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client.get_vulnerabilities.return_value = SAMPLE_VULNS
        mock_client_cls.return_value = mock_client

        state = TriageState(scan_id="scan-1", vulnerabilities=[])
        result = fetch_vulnerabilities(state)

        mock_client.get_vulnerabilities.assert_called_once_with("scan-1")
        assert len(result.vulnerabilities) == 2


class TestShouldContinue:
    def test_returns_classify_when_more_vulns(self):
        state = TriageState(
            scan_id="scan-1",
            vulnerabilities=SAMPLE_VULNS,
            current_index=0,
        )
        assert should_continue(state) == "classify"

    def test_returns_update_when_done(self):
        state = TriageState(
            scan_id="scan-1",
            vulnerabilities=SAMPLE_VULNS,
            current_index=2,
        )
        assert should_continue(state) == "update"

    def test_returns_update_for_empty_vulns(self):
        state = TriageState(scan_id="scan-1", vulnerabilities=[])
        assert should_continue(state) == "update"


class TestGenerateSummary:
    def test_summary_statistics(self):
        state = TriageState(
            scan_id="scan-1",
            vulnerabilities=SAMPLE_VULNS,
            classifications=[
                {"verdict": "true_positive", "vulnerability_type": "eval_injection"},
                {"verdict": "false_positive", "vulnerability_type": "hardcoded_secret_ast"},
            ],
        )
        result = generate_summary(state)

        assert result.summary["scan_id"] == "scan-1"
        assert result.summary["total_findings"] == 2
        assert result.summary["true_positives"] == 1
        assert result.summary["false_positives"] == 1
        assert result.summary["needs_review"] == 0
        assert result.summary["false_positive_rate"] == "50%"

    def test_empty_classifications(self):
        state = TriageState(
            scan_id="scan-1",
            vulnerabilities=[],
            classifications=[],
        )
        result = generate_summary(state)

        assert result.summary["total_findings"] == 0
        assert result.summary["false_positive_rate"] == "N/A"


class TestGraphStructure:
    def test_graph_builds_without_error(self):
        graph = build_triage_graph()
        assert graph is not None

    def test_graph_compiles(self):
        graph = build_triage_graph()
        app = graph.compile()
        assert app is not None


class TestTriageVerdict:
    def test_verdict_values(self):
        assert TriageVerdict.TRUE_POSITIVE == "true_positive"
        assert TriageVerdict.FALSE_POSITIVE == "false_positive"
        assert TriageVerdict.NEEDS_REVIEW == "needs_review"
