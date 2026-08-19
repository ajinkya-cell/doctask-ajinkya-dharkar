import pytest
from app.extraction.conflict_detector import detect_cross_document_conflicts
from app.rules.checks import evaluate_compliance_rules

def test_title_inflation_conflict():
    facts = [
        {"proposal_id": "ALEX", "field_name": "claimed_job_title", "value": "Lead Software Architect",
         "source_doc_id": "r1", "source_span": "resume_alex_miller.md:L1: 'Lead Software Architect'"},
        {"proposal_id": "ALEX", "field_name": "verified_job_title", "value": "Junior Developer",
         "source_doc_id": "v1", "source_span": "verification_alex_miller.md:L2: 'Junior Developer'"}
    ]
    conflicts = detect_cross_document_conflicts(facts)
    assert any(c["field_name"] == "title_inflation" for c in conflicts)
    title_c = next(c for c in conflicts if c["field_name"] == "title_inflation")
    assert "Lead Software Architect" in title_c["description"]
    assert "Junior Developer" in title_c["description"]

def test_experience_inflation_conflict():
    facts = [
        {"proposal_id": "ALEX", "field_name": "claimed_years_experience", "value": "5",
         "source_doc_id": "r1", "source_span": "resume_alex_miller.md:L1"},
        {"proposal_id": "ALEX", "field_name": "verified_years", "value": "1.5",
         "source_doc_id": "v1", "source_span": "verification_alex_miller.md:L3"}
    ]
    conflicts = detect_cross_document_conflicts(facts)
    assert any(c["field_name"] == "experience_inflation" for c in conflicts)

def test_salary_budget_breach_conflict():
    facts = [
        {"proposal_id": "JAKE", "field_name": "salary_expectation", "value": "160000",
         "source_doc_id": "r2", "source_span": "resume_jake_wilson.md:L2"},
        {"proposal_id": "JAKE", "field_name": "salary_budget_cap", "value": "130000",
         "source_doc_id": "jd", "source_span": "jd_senior_fullstack_engineer.md:L4"}
    ]
    conflicts = detect_cross_document_conflicts(facts)
    assert any(c["field_name"] == "salary_budget_breach" for c in conflicts)

def test_rule_5_1_salary_cap_violation():
    facts = [
        {"proposal_id": "JAKE", "field_name": "salary_expectation", "value": "160000",
         "source_doc_id": "r2", "source_span": "resume_jake_wilson.md:L2"},
        {"proposal_id": "JAKE", "field_name": "salary_budget_cap", "value": "130000",
         "source_doc_id": "jd", "source_span": "jd_senior_fullstack_engineer.md:L4"}
    ]
    findings = evaluate_compliance_rules("JAKE", facts, [], [])
    rule_5_1 = [f for f in findings if f["rule_id"] == "5.1"]
    assert len(rule_5_1) == 1
    assert "160000" in rule_5_1[0]["description"]

def test_rule_5_3_experience_inflation_finding():
    facts = [
        {"proposal_id": "ALEX", "field_name": "claimed_years_experience", "value": "5",
         "source_doc_id": "r1", "source_span": "resume_alex_miller.md:L1"},
        {"proposal_id": "ALEX", "field_name": "verified_years", "value": "1.5",
         "source_doc_id": "v1", "source_span": "verification_alex_miller.md:L3"}
    ]
    findings = evaluate_compliance_rules("ALEX", facts, [], [])
    rule_5_3 = [f for f in findings if f["rule_id"] == "5.3"]
    assert len(rule_5_3) == 1
    assert "inflated" in rule_5_3[0]["description"].lower()
