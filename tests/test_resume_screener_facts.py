import pytest
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts

def test_resume_document_classification():
    assert classify_document("resume_emma_davis.md", "6 years experience Skills: React, Node.js") == "resume"
    assert classify_document("jd_senior_fullstack_engineer.md", "Minimum 4 years experience Salary Budget Cap: $130,000") == "job_description"
    assert classify_document("verification_alex_miller.md", "Employment Verification Role: Junior Developer") == "employment_verification"
    assert classify_document("reference_check_emma_davis.md", "Manager confirms excellent performance") == "reference_check"

def test_resume_fact_extraction_with_spans():
    resume_text = """6 years experience: React, Node.js, Python
Current: Senior Full-Stack Engineer at TechCorp (3 years)
BS Computer Science, MIT
Salary expectation: $125,000
Skills: React, Node.js, Python, TypeScript, Docker, Kubernetes
"""
    facts = extract_facts_from_doc("doc_r1", "resume_emma_davis.md", "resume", resume_text)
    fields = {f["field_name"]: f for f in facts}
    
    assert "claimed_years_experience" in fields
    assert fields["claimed_years_experience"]["value"] == "6"
    assert "resume_emma_davis.md:L1:" in fields["claimed_years_experience"]["source_span"]
    
    assert "salary_expectation" in fields
    assert fields["salary_expectation"]["value"] == "125000"

def test_job_description_fact_extraction():
    jd_text = """Title: Senior Full-Stack Engineer
Required: Python, React, Node.js, PostgreSQL, Docker, Kubernetes
Minimum 4 years experience
Salary Budget Cap: $130,000/year
Must have: CS degree or equivalent
"""
    facts = extract_facts_from_doc("doc_jd", "jd_senior_fullstack_engineer.md", "job_description", jd_text)
    fields = {f["field_name"]: f for f in facts}
    
    assert "required_min_years" in fields
    assert fields["required_min_years"]["value"] == "4"
    
    assert "salary_budget_cap" in fields
    assert fields["salary_budget_cap"]["value"] == "130000"
    
    assert "required_skills" in fields

def test_employment_verification_extraction():
    verify_text = """Employment Verification for Alex Miller
Role: Junior Developer
Duration: 1.5 years
Team size: 3
Skills on record: Python, React, Node.js (No Kubernetes or Terraform)
"""
    facts = extract_facts_from_doc("doc_v1", "verification_alex_miller.md", "employment_verification", verify_text)
    fields = {f["field_name"]: f for f in facts}
    
    assert "verified_job_title" in fields
    assert fields["verified_job_title"]["value"] == "Junior Developer"
    
    assert "verified_years" in fields
    assert fields["verified_years"]["value"] == "1.5"
    
    assert "verified_team_size" in fields
    assert fields["verified_team_size"]["value"] == "3"
