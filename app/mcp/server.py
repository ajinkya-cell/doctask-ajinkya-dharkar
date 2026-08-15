import uuid
from fastmcp import FastMCP
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts
from app.rules.checks import evaluate_compliance_rules

mcp = FastMCP("DAO Governance Conflict Analyst")

# In-memory document storage for MCP session
mcp_docs = []
mcp_runs = {}

@mcp.tool()
def upload_document(filename: str, raw_text: str) -> dict:
    """Upload a DAO governance document (proposal, amendment, treasury log, forum thread, invoice)."""
    doc_id = str(uuid.uuid4())
    doc_type = classify_document(filename, raw_text)
    doc_obj = {
        "id": doc_id,
        "filename": filename,
        "doc_type": doc_type,
        "raw_text": raw_text
    }
    mcp_docs.append(doc_obj)
    return {"message": "Document uploaded successfully", "doc_id": doc_id, "doc_type": doc_type}

@mcp.tool()
def run_analysis() -> dict:
    """Run the agentic conflict detection and compliance audit pipeline."""
    if not mcp_docs:
        return {"error": "No documents uploaded yet."}
        
    all_facts = []
    for d in mcp_docs:
        facts = extract_facts_from_doc(d["id"], d["filename"], d["doc_type"], d["raw_text"])
        all_facts.extend(facts)
        
    conflicts = detect_cross_document_conflicts(all_facts)
    findings = evaluate_compliance_rules("DAO-PROP-042", all_facts, conflicts, mcp_docs)
    
    run_id = str(uuid.uuid4())
    pending_approvals = []
    
    for c in conflicts:
        pending_approvals.append({
            "id": f"conflict_{c['proposal_id']}_{c['field_name']}",
            "type": "conflict",
            "title": f"Mismatch on {c['field_name']}",
            "description": c["description"]
        })
        
    for f in findings:
        pending_approvals.append({
            "id": f"finding_{f['proposal_id']}_{f['rule_id']}",
            "type": "finding",
            "title": f"Rule {f['rule_id']} Violation",
            "description": f["description"]
        })
        
    mcp_runs[run_id] = {
        "run_id": run_id,
        "facts": all_facts,
        "conflicts": conflicts,
        "findings": findings,
        "pending_approvals": pending_approvals,
        "approved": {},
        "status": "awaiting_approval"
    }
    
    return {
        "run_id": run_id,
        "status": "awaiting_approval",
        "pending_count": len(pending_approvals),
        "conflicts_count": len(conflicts),
        "findings_count": len(findings)
    }

@mcp.tool()
def review_findings(run_id: str) -> dict:
    """Retrieve pending review items and compliance findings for a run."""
    if run_id not in mcp_runs:
        return {"error": "Run ID not found"}
    run = mcp_runs[run_id]
    return {
        "run_id": run_id,
        "pending_approvals": run["pending_approvals"],
        "approved": run["approved"]
    }

@mcp.tool()
def approve_item(run_id: str, item_id: str, action: str) -> dict:
    """Approve or reject a specific pending conflict or compliance finding."""
    if run_id not in mcp_runs:
        return {"error": "Run ID not found"}
    run = mcp_runs[run_id]
    
    is_approved = action.lower() == "approve"
    run["approved"][item_id] = is_approved
    
    run["pending_approvals"] = [i for i in run["pending_approvals"] if i["id"] != item_id]
    if not run["pending_approvals"]:
        run["status"] = "committed"
        
    return {
        "run_id": run_id,
        "item_id": item_id,
        "action": action,
        "remaining_pending": len(run["pending_approvals"]),
        "status": run["status"]
    }

@mcp.tool()
def export_deliverable(run_id: str) -> dict:
    """Export the grounded Grant Register deliverable."""
    if run_id not in mcp_runs:
        return {"error": "Run ID not found"}
    run = mcp_runs[run_id]
    return {
        "run_id": run_id,
        "conflicts": run["conflicts"],
        "findings": run["findings"],
        "decisions": run["approved"],
        "status": run["status"]
    }

if __name__ == "__main__":
    mcp.run()
