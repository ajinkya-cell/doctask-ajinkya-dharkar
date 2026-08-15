import pytest
from app.api.routes_approve import approve_item, ApprovalDecisionRequest
from app.api.routes_run import active_runs_state

@pytest.mark.asyncio
async def test_item_by_item_human_gate_approval():
    run_id = "test_run_human_gate_1"
    
    active_runs_state[run_id] = {
        "run_id": run_id,
        "pending_approvals": [
            {"id": "item_1", "type": "conflict", "title": "Mismatch 1"},
            {"id": "item_2", "type": "finding", "title": "Finding 2"}
        ],
        "approved": {},
        "status": "awaiting_approval"
    }
    
    # 1. Reject item_1 (rejecting one item does NOT discard the rest)
    res1 = await approve_item(run_id, ApprovalDecisionRequest(item_id="item_1", action="reject"))
    assert res1["remaining_pending"] == 1
    assert active_runs_state[run_id]["approved"]["item_1"] == False
    assert active_runs_state[run_id]["status"] == "awaiting_approval"
    
    # 2. Approve item_2
    res2 = await approve_item(run_id, ApprovalDecisionRequest(item_id="item_2", action="approve"))
    assert res2["remaining_pending"] == 0
    assert active_runs_state[run_id]["approved"]["item_2"] == True
    assert active_runs_state[run_id]["status"] == "committed"
