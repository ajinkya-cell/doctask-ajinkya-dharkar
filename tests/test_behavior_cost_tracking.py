import pytest
from app.api.routes_cost import get_run_cost
from app.api.routes_run import active_runs_state

@pytest.mark.asyncio
async def test_stage_cost_and_latency_audit():
    run_id = "test_run_cost_1"
    
    active_runs_state[run_id] = {
        "run_id": run_id,
        "stage_costs": [
            {"stage": "classify", "tokens_in": 350, "tokens_out": 80, "cost_usd": 0.0004, "duration_ms": 45},
            {"stage": "extract_facts", "tokens_in": 1200, "tokens_out": 450, "cost_usd": 0.0018, "duration_ms": 180}
        ]
    }
    
    cost_res = await get_run_cost(run_id)
    assert cost_res["total_tokens_in"] == 1550
    assert cost_res["total_tokens_out"] == 530
    assert cost_res["total_cost_usd"] == 0.0022
    assert cost_res["total_duration_ms"] == 225
    assert len(cost_res["stage_breakdown"]) == 2
