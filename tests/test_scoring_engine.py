import pytest
from app.extraction.scoring import score_candidate

def test_clean_candidate_high_score():
    """Emma Davis: no conflicts, should score high (near 100)."""
    facts = [
        {"proposal_id": "EMMA", "field_name": "claimed_years_experience", "value": "6",
         "source_doc_id": "r1", "source_span": "resume_emma_davis.md:L1"},
        {"proposal_id": "EMMA", "field_name": "salary_expectation", "value": "125000",
         "source_doc_id": "r1", "source_span": "resume_emma_davis.md:L5"},
        {"proposal_id": "EMMA", "field_name": "skills_listed", "value": "React, Node.js, Python, TypeScript, Docker, Kubernetes",
         "source_doc_id": "r1", "source_span": "resume_emma_davis.md:L6"}
    ]
    conflicts = []
    job_facts = []
    result = score_candidate("EMMA", facts, conflicts, job_facts)
    assert result["total_score"] == 100
    assert result["candidate_id"] == "EMMA"

def test_inflated_candidate_penalized():
    """Alex Miller: title + experience + team inflation, score must drop."""
    facts = []
    conflicts = [
        {"proposal_id": "ALEX", "field_name": "title_inflation", "values_json": [], "description": "..."},
        {"proposal_id": "ALEX", "field_name": "experience_inflation", "values_json": [], "description": "..."},
        {"proposal_id": "ALEX", "field_name": "team_size_inflation", "values_json": [], "description": "..."}
    ]
    result = score_candidate("ALEX", facts, conflicts, [])
    assert result["total_score"] <= 40, f"Expected score <= 40 for heavily inflated candidate, got {result['total_score']}"
    assert "title_inflation" in result["breakdown"]
    assert "experience_inflation" in result["breakdown"]

def test_budget_breach_penalty():
    """Jake Wilson: salary budget breach should penalize 20 pts."""
    facts = []
    conflicts = [
        {"proposal_id": "JAKE", "field_name": "salary_budget_breach", "values_json": [], "description": "..."}
    ]
    result = score_candidate("JAKE", facts, conflicts, [])
    assert result["total_score"] == 80
    assert result["breakdown"]["salary_budget_breach"] == -20

def test_conflicts_from_other_candidate_ignored():
    """Conflicts belonging to another candidate shouldn't affect scoring."""
    conflicts = [
        {"proposal_id": "ALEX", "field_name": "title_inflation", "values_json": [], "description": "..."}
    ]
    result = score_candidate("EMMA", [], conflicts, [])
    assert result["total_score"] == 100
