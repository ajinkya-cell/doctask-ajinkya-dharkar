import pytest
from app.graph.build_graph import pipeline_graph

@pytest.mark.asyncio
async def test_resume_after_simulated_kill():
    thread_id = "test_thread_kill_resume_101"
    config = {"configurable": {"thread_id": thread_id}}
    
    docs = [
        {
            "id": "doc_001",
            "filename": "DAO-PROP-042-treehouse.md",
            "raw_text": "Proposal DAO-PROP-042 requesting 50,000 USDC upfront for Treehouse HQ.",
            "sha256": "abc123hash"
        }
    ]
    
    initial_state = {
        "run_id": "run_kill_1",
        "thread_id": thread_id,
        "documents": docs,
        "classified": {},
        "extracted_facts": [],
        "conflicts": [],
        "findings": [],
        "register_draft": {},
        "pending_approvals": [],
        "approved": {},
        "stage_costs": [],
        "status": "running",
        "error": None
    }
    
    # 1. Run initial execution
    res1 = await pipeline_graph.ainvoke(initial_state, config)
    assert res1["status"] in ["classified", "awaiting_approval", "facts_extracted", "committed"]
    
    # 2. Simulate process kill and resume from checkpointer with thread_id
    resumed_state = await pipeline_graph.ainvoke(None, config)
    assert resumed_state["thread_id"] == thread_id
    assert len(resumed_state["documents"]) == 1
    assert resumed_state["status"] == "committed"
