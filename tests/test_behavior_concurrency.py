import pytest
import asyncio
from app.graph.build_graph import pipeline_graph

@pytest.mark.asyncio
async def test_concurrent_isolated_runs():
    thread_1 = "concurrent_thread_1"
    thread_2 = "concurrent_thread_2"
    
    doc1 = [{"id": "d1", "filename": "P1.md", "raw_text": "Proposal DAO-PROP-042 requesting 50,000 USDC.", "sha256": "h1"}]
    doc2 = [{"id": "d2", "filename": "P2.md", "raw_text": "Proposal DAO-PROP-101 requesting 15,000 USDC.", "sha256": "h2"}]
    
    state1 = {"run_id": "r1", "thread_id": thread_1, "documents": doc1, "classified": {}, "extracted_facts": [], "conflicts": [], "findings": [], "register_draft": {}, "pending_approvals": [], "approved": {}, "stage_costs": [], "status": "running", "error": None}
    state2 = {"run_id": "r2", "thread_id": thread_2, "documents": doc2, "classified": {}, "extracted_facts": [], "conflicts": [], "findings": [], "register_draft": {}, "pending_approvals": [], "approved": {}, "stage_costs": [], "status": "running", "error": None}
    
    # Run both concurrently
    res1, res2 = await asyncio.gather(
        pipeline_graph.ainvoke(state1, {"configurable": {"thread_id": thread_1}}),
        pipeline_graph.ainvoke(state2, {"configurable": {"thread_id": thread_2}})
    )
    
    # Verify isolation
    assert res1["thread_id"] == thread_1
    assert res2["thread_id"] == thread_2
    assert res1["documents"][0]["id"] == "d1"
    assert res2["documents"][0]["id"] == "d2"
