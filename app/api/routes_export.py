from fastapi import APIRouter, HTTPException
from app.api.routes_run import active_runs_state

router = APIRouter(prefix="/runs", tags=["Export"])

@router.get("/{run_id}/export")
async def export_deliverable(run_id: str):
    if run_id not in active_runs_state:
        raise HTTPException(status_code=404, detail="Run not found")
        
    state = active_runs_state[run_id]
    
    return {
        "run_id": run_id,
        "deliverable_type": "Medical Bill & Health Insurance Reconciliation Certificate",
        "register": state.get("register_draft", {}),
        "conflicts": state.get("conflicts", []),
        "findings": state.get("findings", []),
        "decisions": state.get("approved", {}),
        "status": state.get("status")
    }
