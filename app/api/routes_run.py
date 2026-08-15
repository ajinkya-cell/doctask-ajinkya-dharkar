import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import DocumentModel, RunModel
from app.graph.build_graph import pipeline_graph

router = APIRouter(prefix="/runs", tags=["Runs"])

class RunCreateRequest(BaseModel):
    dao_id: Optional[str] = "treehouse-dao"
    document_ids: Optional[List[str]] = None
    thread_id: Optional[str] = None

# Global in-memory storage for state checkpoints across runs
active_runs_state = {}

@router.post("")
async def create_run(
    req: RunCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    dao_id = req.dao_id or "treehouse-dao"
    
    # Fetch documents from DB for this DAO instance
    query = select(DocumentModel).where(DocumentModel.dao_id == dao_id)
    if req.document_ids:
        query = query.where(DocumentModel.id.in_(req.document_ids))
    result = await db.execute(query)
    docs = result.scalars().all()
    
    if not docs:
        raise HTTPException(status_code=400, detail=f"No documents found for DAO instance '{dao_id}'. Please upload documents first.")
        
    doc_dicts = [
        {"id": d.id, "filename": d.filename, "raw_text": d.raw_text, "sha256": d.sha256}
        for d in docs
    ]
    
    run_id = str(uuid.uuid4())
    thread_id = req.thread_id or f"thread_{dao_id}_{uuid.uuid4()}"
    
    initial_state = {
        "run_id": run_id,
        "thread_id": thread_id,
        "documents": doc_dicts,
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
    
    config = {"configurable": {"thread_id": thread_id}}
    
    # Execute graph
    final_state = await pipeline_graph.ainvoke(initial_state, config)
    final_state["dao_id"] = dao_id
    active_runs_state[run_id] = final_state
    
    # Save run to DB
    run_record = RunModel(
        id=run_id,
        dao_id=dao_id,
        thread_id=thread_id,
        status=final_state.get("status", "completed")
    )
    db.add(run_record)
    await db.commit()
    
    return {
        "run_id": run_id,
        "dao_id": dao_id,
        "thread_id": thread_id,
        "status": final_state.get("status"),
        "pending_approvals_count": len(final_state.get("pending_approvals", [])),
        "conflicts_count": len(final_state.get("conflicts", [])),
        "findings_count": len(final_state.get("findings", []))
    }

@router.get("/{run_id}")
async def get_run_status(run_id: str):
    if run_id not in active_runs_state:
        raise HTTPException(status_code=404, detail="Run not found")
    state = active_runs_state[run_id]
    return {
        "run_id": run_id,
        "dao_id": state.get("dao_id", "treehouse-dao"),
        "thread_id": state.get("thread_id"),
        "status": state.get("status"),
        "pending_approvals": state.get("pending_approvals", []),
        "approved": state.get("approved", {}),
        "register_draft": state.get("register_draft", {})
    }
