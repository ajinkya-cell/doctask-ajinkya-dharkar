try:
    import pytest
except ImportError:
    pytest = None  # type: ignore
from app.mcp.server import (
    configure_job_description,
    upload_candidate_document,
    run_screener_audit,
    review_candidate_flags,
    decide_candidate,
    export_shortlist_dossier,
    mcp_docs,
    mcp_runs,
    mcp_decisions
)

def test_mcp_server_flow():
    mcp_docs.clear()
    mcp_runs.clear()
    mcp_decisions.clear()

    # 1. Configure Benchmark JD via FastMCP
    configure_job_description(
        title="Senior Full-Stack Engineer",
        required_skills="TypeScript, React, Next.js, PostgreSQL, Node.js",
        min_experience=4.0
    )

    # 2. Upload Candidate Documents via FastMCP
    up1 = upload_candidate_document("resume_emma_davis.md", """Emma Davis
Email: emma.davis@mit.alum.edu
Phone: (555) 234-5678
6 years experience: React, Node.js, Python, TypeScript, PostgreSQL, Next.js
BS Computer Science, MIT
""")
    up2 = upload_candidate_document("resume_alex_miller.md", """"Lead Software Architect" for 5 years
Python, React, Node.js
BS Computer Science, Stanford
""")
    up2v = upload_candidate_document("verification_alex_miller.md", """Employment Verification Report
Candidate: Alex Miller
Role: Junior Developer (1.5 yrs)
""")

    assert "doc_id" in up1
    assert "doc_id" in up2
    assert "doc_id" in up2v
    
    # 3. Run Screener Audit via FastMCP
    run_res = run_screener_audit()
    assert "run_id" in run_res
    run_id = run_res["run_id"]
    assert run_res["candidates_evaluated"] >= 2
    assert run_res["conflicts_count"] >= 1  # Alex title inflation
    
    # 4. Review Flags via FastMCP
    review_res = review_candidate_flags(run_id)
    assert len(review_res["pending_flags"]) >= 1
    
    # 5. Decide Candidate via FastMCP
    decide_res = decide_candidate("cand-emma-davis", "pass", "Strong Match")
    assert decide_res["status"] == "success"
    
    # 6. Export Shortlist Dossier via FastMCP
    exp_res = export_shortlist_dossier(run_id)
    assert exp_res["run_id"] == run_id
    assert exp_res["shortlisted_count"] >= 1
