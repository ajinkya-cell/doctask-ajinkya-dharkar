import pytest
from app.mcp.server import upload_document, run_analysis, review_findings, approve_item, export_deliverable

def test_mcp_server_flow():
    # 1. Upload documents via FastMCP tool
    up1 = upload_document("DAO-PROP-042.md", "Proposal DAO-PROP-042 requesting 50,000 USDC upfront.")
    up2 = upload_document("DAO-AMEND-042b.md", "Revised total approved budget: 45,000 USDC. Initial disbursement: 40,000 USDC.")
    assert "doc_id" in up1
    assert "doc_id" in up2
    
    # 2. Run analysis via FastMCP tool
    run_res = run_analysis()
    assert "run_id" in run_res
    run_id = run_res["run_id"]
    assert run_res["status"] == "awaiting_approval"
    assert run_res["conflicts_count"] >= 1
    
    # 3. Review findings via FastMCP tool
    review_res = review_findings(run_id)
    assert len(review_res["pending_approvals"]) >= 1
    item_id = review_res["pending_approvals"][0]["id"]
    
    # 4. Approve item via FastMCP tool
    app_res = approve_item(run_id, item_id, "approve")
    assert app_res["item_id"] == item_id
    
    # 5. Export deliverable via FastMCP tool
    exp_res = export_deliverable(run_id)
    assert exp_res["run_id"] == run_id
    assert len(exp_res["conflicts"]) >= 1
