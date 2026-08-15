from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.api.routes_run import active_runs_state

router = APIRouter(prefix="/runs", tags=["Approvals"])

class ApprovalDecisionRequest(BaseModel):
    item_id: str
    action: str  # "approve" or "reject"
    notes: str = ""

@router.post("/{run_id}/approve")
async def approve_item(run_id: str, req: ApprovalDecisionRequest):
    if run_id not in active_runs_state:
        raise HTTPException(status_code=404, detail="Run not found")
        
    state = active_runs_state[run_id]
    approved_map = state.get("approved", {})
    
    is_approved = req.action.lower() == "approve"
    approved_map[req.item_id] = is_approved
    state["approved"] = approved_map
    
    # Filter pending approvals list
    pending = state.get("pending_approvals", [])
    updated_pending = [item for item in pending if item["id"] != req.item_id]
    state["pending_approvals"] = updated_pending
    
    if not updated_pending:
        state["status"] = "committed"
        
    return {
        "run_id": run_id,
        "item_id": req.item_id,
        "action": req.action,
        "remaining_pending": len(updated_pending),
        "status": state["status"]
    }
