import os
import pytest
import PyPDF2
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc, parse_resume_deep
from app.extraction.scoring import score_candidate

def test_candidate_contact_extraction():
    resume_text = """Alex Miller
Email: alex.miller@example.com
Phone: (555) 019-2834
LinkedIn: linkedin.com/in/alexmiller-tech
5 years experience: Python, React, Node.js
BS Computer Science, Stanford
"""
    facts = extract_facts_from_doc("doc_alex", "resume_alex.md", "resume", resume_text)
    field_map = {f["field_name"]: f["value"] for f in facts}
    
    assert "candidate_email" in field_map
    assert field_map["candidate_email"] == "alex.miller@example.com"
    assert "candidate_phone" in field_map
    assert "(555) 019-2834" in field_map["candidate_phone"]
    assert "candidate_links" in field_map
    assert "linkedin.com/in/alexmiller-tech" in field_map["candidate_links"]
    assert field_map["education_degree"] == "BS Computer Science, Stanford"

def test_ajinkya_resume_pdf_deep_parsing():
    pdf_path = "Ajinkya Resume (2026).pdf"
    if not os.path.exists(pdf_path):
        pytest.skip("Ajinkya Resume (2026).pdf not found in root")
        
    reader = PyPDF2.PdfReader(pdf_path)
    raw_text = "".join([p.extract_text() for p in reader.pages])
    
    parsed = parse_resume_deep(raw_text, pdf_path)
    
    assert parsed["name"] == "Ajinkya Dharkar"
    assert parsed["email"] == "ajinkyaadharkar@gmail.com"
    assert "GitHub" in parsed["links"]
    assert "LinkedIn" in parsed["links"]
    assert "Portfolio" in parsed["links"]
    assert "Bachelor of Technology" in parsed["education"]
    assert parsed["num_years"] == 0
    assert "0 years" in parsed["experience"]
    assert "Projects Built" in parsed["experience"]
    
    # Verify core full-stack and AI skills
    skills_set = set(parsed["skills"])
    expected_skills = ["JavaScript", "TypeScript", "React", "Next.js", "Express.js", "PostgreSQL", "MongoDB", "Redis", "TailwindCSS", "Socket.IO", "WebSockets", "Drizzle ORM", "Prisma", "AI-SDK"]
    for s in expected_skills:
        assert s in skills_set, f"Expected skill {s} in parsed skills"

def test_dynamic_jd_and_candidate_matching():
    jd_facts = [
        {"field_name": "job_title", "value": "Staff AI Engineer"},
        {"field_name": "required_skills", "value": "Python, PyTorch, LangGraph, FastAPI, Docker"},
        {"field_name": "required_min_years", "value": "5"}
    ]
    
    cand_facts = [
        {"proposal_id": "CAND-SARAH", "field_name": "claimed_years_experience", "value": "6"},
        {"proposal_id": "CAND-SARAH", "field_name": "skills_listed", "value": "Python, PyTorch, LangGraph, FastAPI, Docker, Kubernetes"},
        {"proposal_id": "CAND-SARAH", "field_name": "education_degree", "value": "BS in Computer Science, MIT"}
    ]
    
    res = score_candidate("CAND-SARAH", cand_facts, [], jd_facts)
    assert res["total_score"] == 100
    assert res["match_tier"] == "Great Match"
    assert res["breakdown"]["skills_score"] == 50.0
    assert res["breakdown"]["experience_score"] == 40.0
    assert res["breakdown"]["education_and_projects_score"] == 10.0

def test_zero_experience_candidate_on_senior_role_scoring():
    """Ajinkya (0 yrs corporate experience) applying for 4-year Senior role must score ~60 (Moderate Match), not 86."""
    jd_facts = [
        {"field_name": "job_title", "value": "Senior Full-Stack Engineer"},
        {"field_name": "required_skills", "value": "TypeScript, React, Next.js, PostgreSQL, TailwindCSS, Node.js"},
        {"field_name": "required_min_years", "value": "4"}
    ]
    
    cand_facts = [
        {"proposal_id": "CAND-AJINKYA", "field_name": "claimed_years_experience", "value": "0"},
        {"proposal_id": "CAND-AJINKYA", "field_name": "skills_listed", "value": "JavaScript, TypeScript, React, Next.js, Node.js, Express.js, PostgreSQL, MongoDB, Redis, TailwindCSS, Socket.IO, Drizzle ORM, Prisma, AI-SDK"},
        {"proposal_id": "CAND-AJINKYA", "field_name": "education_degree", "value": "Bachelor of Technology, MITS Gwalior (2022-2026)"},
        {"proposal_id": "CAND-AJINKYA", "field_name": "experience_summary", "value": "0 years (Fresh Graduate / Entry-Level · 5 Projects Built)"}
    ]
    
    res = score_candidate("CAND-AJINKYA", cand_facts, [], jd_facts)
    assert res["total_score"] == 60
    assert res["match_tier"] == "Moderate Match"
    assert res["breakdown"]["skills_score"] == 50.0
    assert res["breakdown"]["experience_score"] == 0.0
    assert res["breakdown"]["education_and_projects_score"] == 10.0
    assert res["breakdown"]["experience_gap_years"] == 4.0

def test_zero_experience_candidate_on_junior_role_scoring():
    """Ajinkya (0 yrs corporate experience) applying for Junior role (0 min yrs) scores 100 (Great Match)."""
    jd_facts = [
        {"field_name": "job_title", "value": "Junior Full-Stack Developer"},
        {"field_name": "required_skills", "value": "TypeScript, React, Next.js, PostgreSQL"},
        {"field_name": "required_min_years", "value": "0"}
    ]
    
    cand_facts = [
        {"proposal_id": "CAND-AJINKYA", "field_name": "claimed_years_experience", "value": "0"},
        {"proposal_id": "CAND-AJINKYA", "field_name": "skills_listed", "value": "JavaScript, TypeScript, React, Next.js, Express.js, PostgreSQL, MongoDB, Redis, TailwindCSS, Socket.IO, Drizzle ORM, Prisma, AI-SDK"},
        {"proposal_id": "CAND-AJINKYA", "field_name": "education_degree", "value": "Bachelor of Technology, MITS Gwalior (2022-2026)"},
        {"proposal_id": "CAND-AJINKYA", "field_name": "experience_summary", "value": "0 years (Fresh Graduate / Entry-Level · 5 Projects Built)"}
    ]
    
    res = score_candidate("CAND-AJINKYA", cand_facts, [], jd_facts)
    assert res["total_score"] == 100
    assert res["match_tier"] == "Great Match"
    assert res["breakdown"]["skills_score"] == 50.0
    assert res["breakdown"]["experience_score"] == 40.0
    assert res["breakdown"]["education_and_projects_score"] == 10.0
