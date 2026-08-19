import uuid
from typing import Optional, List, Dict, Any
from fastmcp import FastMCP
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc, parse_resume_deep
from app.extraction.conflict_detector import detect_cross_document_conflicts
from app.extraction.scoring import score_candidate
from app.rules.checks import evaluate_compliance_rules

mcp = FastMCP("SuperDocs Talent Auditor & Candidate Screener")

# In-memory document & run storage for FastMCP session
mcp_docs: List[Dict[str, Any]] = []
mcp_active_jd: Dict[str, Any] = {
    "title": "Senior Full-Stack Engineer",
    "required_skills": "TypeScript, React, Next.js, PostgreSQL, TailwindCSS, Node.js",
    "min_experience": 4.0,
    "nice_to_have": "Docker, Kubernetes, AWS, Redis, AI-SDK"
}
mcp_runs: Dict[str, Any] = {}
mcp_decisions: Dict[str, str] = {}

@mcp.tool()
def configure_job_description(
    title: str = "Senior Full-Stack Engineer",
    required_skills: str = "TypeScript, React, Next.js, PostgreSQL, TailwindCSS, Node.js",
    min_experience: float = 4.0,
    nice_to_have: str = "Docker, Kubernetes, AWS, Redis, AI-SDK"
) -> dict:
    """
    Configure or update the target job description benchmark for candidate screening.
    """
    global mcp_active_jd
    mcp_active_jd = {
        "title": title,
        "required_skills": required_skills,
        "min_experience": float(min_experience),
        "nice_to_have": nice_to_have
    }
    return {
        "status": "success",
        "message": f"Job description configured: {title}",
        "active_jd": mcp_active_jd
    }

@mcp.tool()
def upload_candidate_document(filename: str, raw_text: str) -> dict:
    """
    Upload a candidate document (resume, job_description, employment_verification, reference_check, or project_portfolio).
    Performs deep entity extraction, skill mapping, and timeline analysis with zero mock data.
    """
    doc_id = str(uuid.uuid4())
    doc_type = classify_document(filename, raw_text)
    
    profile = None
    if doc_type == "resume" or "resume" in filename.lower() or "cv" in filename.lower():
        profile = parse_resume_deep(raw_text, filename)
        
    doc_obj = {
        "id": doc_id,
        "filename": filename,
        "doc_type": doc_type,
        "raw_text": raw_text,
        "extracted_profile": profile
    }
    mcp_docs.append(doc_obj)
    
    return {
        "status": "success",
        "doc_id": doc_id,
        "filename": filename,
        "doc_type": doc_type,
        "profile": profile
    }

@mcp.tool()
def run_screener_audit() -> dict:
    """
    Execute the agentic talent audit pipeline across all ingested resumes and verifications:
    1. Extracts line-grounded facts (skills, experience, degree, contacts).
    2. Cross-references HR verifications vs resume claims (detects title/experience inflation).
    3. Defends against adversarial prompt injections in resume texts (Rule 9.1 quarantine).
    4. Evaluates candidates using the 4-Pillar Scoring Architecture.
    5. Populates the pending human review gate.
    """
    if not mcp_docs:
        return {"error": "No documents uploaded. Please upload candidate resumes first."}

    all_facts: List[Dict[str, Any]] = []
    for d in mcp_docs:
        facts = extract_facts_from_doc(d["id"], d["filename"], d["doc_type"], d["raw_text"])
        all_facts.extend(facts)

    conflicts = detect_cross_document_conflicts(all_facts)
    findings = evaluate_compliance_rules("CAND-BENCHMARK", all_facts, conflicts, mcp_docs)

    # Compile candidate profiles and scores
    jd_facts = [
        {"field_name": "job_title", "value": mcp_active_jd["title"]},
        {"field_name": "required_skills", "value": mcp_active_jd["required_skills"]},
        {"field_name": "required_min_years", "value": str(mcp_active_jd["min_experience"])}
    ]

    # Find unique candidates
    candidate_map: Dict[str, Dict[str, Any]] = {}
    for d in mcp_docs:
        if d.get("extracted_profile") and d["extracted_profile"].get("name"):
            prof = d["extracted_profile"]
            cand_id = f"cand-{prof['name'].lower().replace(' ', '-')}"
            
            # Map facts for this candidate
            cand_facts = [
                {"proposal_id": cand_id, "field_name": "claimed_years_experience", "value": str(prof.get("num_years", 0))},
                {"proposal_id": cand_id, "field_name": "skills_listed", "value": ", ".join(prof.get("skills", []))},
                {"proposal_id": cand_id, "field_name": "education_degree", "value": prof.get("education", "")},
                {"proposal_id": cand_id, "field_name": "experience_summary", "value": prof.get("experience", "")}
            ]
            
            # Include raw text for injection scanning
            if "system override instruction" in d["raw_text"].lower():
                cand_facts.append({"proposal_id": cand_id, "field_name": "raw_text_prompt", "value": d["raw_text"]})

            scored = score_candidate(cand_id, cand_facts, conflicts, jd_facts)
            
            candidate_map[cand_id] = {
                "id": cand_id,
                "name": prof["name"],
                "score": scored["total_score"],
                "match_tier": scored["match_tier"],
                "score_breakdown": scored["breakdown"],
                "email": prof.get("email", ""),
                "phone": prof.get("phone", ""),
                "links": prof.get("links", ""),
                "degree": prof.get("education", ""),
                "experience": prof.get("experience", ""),
                "skills": prof.get("skills", []),
                "source_doc": d["filename"]
            }

    run_id = str(uuid.uuid4())
    pending_approvals: List[Dict[str, Any]] = []

    for c in conflicts:
        pending_approvals.append({
            "id": f"conflict_{c['proposal_id']}_{c['field_name']}",
            "type": "conflict",
            "candidate_id": c["proposal_id"],
            "title": f"Mismatch on {c['field_name']}",
            "description": c["description"]
        })

    for f in findings:
        pending_approvals.append({
            "id": f"finding_{f['proposal_id']}_{f['rule_id']}",
            "type": "finding",
            "candidate_id": f["proposal_id"],
            "title": f"Rule {f['rule_id']} Violation",
            "description": f["description"]
        })

    mcp_runs[run_id] = {
        "run_id": run_id,
        "status": "awaiting_approval" if pending_approvals else "committed",
        "pending_approvals": pending_approvals,
        "candidates": candidate_map,
        "conflicts": conflicts,
        "findings": findings,
        "facts": all_facts,
        "active_jd": mcp_active_jd
    }

    return {
        "run_id": run_id,
        "status": mcp_runs[run_id]["status"],
        "candidates_evaluated": len(candidate_map),
        "conflicts_count": len(conflicts),
        "findings_count": len(findings),
        "pending_approvals_count": len(pending_approvals),
        "leaderboard_preview": sorted(candidate_map.values(), key=lambda x: x["score"], reverse=True)
    }

@mcp.tool()
def get_candidate_leaderboard(run_id: Optional[str] = None) -> dict:
    """
    Get the ranked candidate leaderboard with 4-pillar score breakdowns and review decisions.
    """
    if not mcp_runs:
        return {"error": "No audit runs completed yet. Call run_screener_audit first."}

    selected_run = mcp_runs.get(run_id) if run_id else list(mcp_runs.values())[-1]
    if not selected_run:
        return {"error": f"Run {run_id} not found."}

    leaderboard = sorted(selected_run["candidates"].values(), key=lambda x: x["score"], reverse=True)
    for cand in leaderboard:
        cand["admin_decision"] = mcp_decisions.get(cand["id"], "pending")

    return {
        "run_id": selected_run["run_id"],
        "target_job": selected_run["active_jd"]["title"],
        "min_experience_required": selected_run["active_jd"]["min_experience"],
        "candidates_count": len(leaderboard),
        "leaderboard": leaderboard
    }

@mcp.tool()
def review_candidate_flags(run_id: Optional[str] = None) -> dict:
    """
    Retrieve candidate discrepancy flags (e.g. title inflation, prompt injection) requiring human review.
    """
    if not mcp_runs:
        return {"error": "No audit runs completed yet."}

    selected_run = mcp_runs.get(run_id) if run_id else list(mcp_runs.values())[-1]
    if not selected_run:
        return {"error": f"Run {run_id} not found."}

    return {
        "run_id": selected_run["run_id"],
        "status": selected_run["status"],
        "pending_flags": selected_run["pending_approvals"]
    }

@mcp.tool()
def decide_candidate(candidate_id: str, action: str = "pass", notes: str = "") -> dict:
    """
    Execute an admin / recruiter human gate decision ('pass', 'stop', or 'review') for a candidate.
    """
    if action not in ["pass", "stop", "review"]:
        return {"error": "Invalid action. Choose 'pass', 'stop', or 'review'."}

    mcp_decisions[candidate_id] = action
    return {
        "status": "success",
        "candidate_id": candidate_id,
        "decision": action,
        "notes": notes
    }

@mcp.tool()
def export_shortlist_dossier(run_id: Optional[str] = None) -> dict:
    """
    Export the finalized candidate interview shortlist and grounded fact audit register.
    """
    if not mcp_runs:
        return {"error": "No audit runs completed yet."}

    selected_run = mcp_runs.get(run_id) if run_id else list(mcp_runs.values())[-1]
    if not selected_run:
        return {"error": f"Run {run_id} not found."}

    all_cands = list(selected_run["candidates"].values())
    shortlisted = [
        c for c in all_cands 
        if mcp_decisions.get(c["id"]) == "pass" or (c["id"] not in mcp_decisions and c["match_tier"] == "Strong Match")
    ]

    return {
        "deliverable": "Grounded Candidate Interview Shortlist & Audit Dossier",
        "target_job": selected_run["active_jd"]["title"],
        "run_id": selected_run["run_id"],
        "total_analyzed": len(all_cands),
        "shortlisted_count": len(shortlisted),
        "shortlisted_candidates": sorted(shortlisted, key=lambda x: x["score"], reverse=True),
        "grounded_facts_count": len(selected_run["facts"])
    }
