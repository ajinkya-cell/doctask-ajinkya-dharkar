import pytest
from app.graph.build_graph import pipeline_graph

@pytest.mark.asyncio
async def test_clean_corpus_zero_findings():
    clean_docs = [
        {
            "id": "clean_001",
            "filename": "DAO-PROP-101-clean.md",
            "raw_text": "Proposal DAO-PROP-101 requested 15,000 USDC. Passed with 95% vote approval.",
            "sha256": "clean123hash"
        }
    ]
    
    initial_state = {
        "run_id": "run_clean_1",
        "thread_id": "thread_clean_1",
        "documents": clean_docs,
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
    
    config = {"configurable": {"thread_id": "thread_clean_1"}}
    final_state = await pipeline_graph.ainvoke(initial_state, config)
    
    # Clean corpus should have 0 conflicts and 0 rule violations
    assert len(final_state.get("conflicts", [])) == 0
    assert len(final_state.get("findings", [])) == 0
