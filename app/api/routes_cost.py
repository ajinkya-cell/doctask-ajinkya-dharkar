from fastapi import APIRouter, HTTPException
from app.api.routes_run import active_runs_state

router = APIRouter(prefix="/runs", tags=["Cost Breakdown"])

@router.get("/{run_id}/cost")
async def get_run_cost(run_id: str):
    if run_id not in active_runs_state:
        raise HTTPException(status_code=404, detail="Run not found")
        
    state = active_runs_state[run_id]
    stage_costs = state.get("stage_costs", [])
    
    total_tokens_in = sum(c.get("tokens_in", 0) for c in stage_costs)
    total_tokens_out = sum(c.get("tokens_out", 0) for c in stage_costs)
    total_cost_usd = sum(c.get("cost_usd", 0.0) for c in stage_costs)
    total_duration_ms = sum(c.get("duration_ms", 0) for c in stage_costs)
    
    return {
        "run_id": run_id,
        "total_tokens_in": total_tokens_in,
        "total_tokens_out": total_tokens_out,
        "total_cost_usd": round(total_cost_usd, 6),
        "total_duration_ms": total_duration_ms,
        "stage_breakdown": stage_costs
    }
