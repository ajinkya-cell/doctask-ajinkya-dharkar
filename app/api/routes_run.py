import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import DocumentModel, RunModel, PatientCaseModel
from app.graph.build_graph import pipeline_graph

router = APIRouter(prefix="/runs", tags=["Pipeline Runs"])

class RunCreateRequest(BaseModel):
    case_id: Optional[str] = None
    dao_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    thread_id: Optional[str] = None

# Global in-memory storage for state checkpoints across runs
active_runs_state = {}

@router.post("")
async def create_run(
    req: RunCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    target_case_id = req.case_id or req.dao_id or "case-001-knee-surgery"
    
    # Infer target domain from case record or case identifier prefix
    case = await db.get(PatientCaseModel, target_case_id)
    target_domain = getattr(case, "domain", None) if case else None
    if not target_domain:
        tid = target_case_id.lower()
        if "dao" in tid or "treehouse" in tid or "solaris" in tid:
            target_domain = "dao"
        elif "job" in tid or "cand" in tid or "talent" in tid:
            target_domain = "talent"
        else:
            target_domain = "medical"
    
    # Fetch documents from DB for this case instance
    query = select(DocumentModel).where(DocumentModel.case_id == target_case_id)
    if req.document_ids:
        query = query.where(DocumentModel.id.in_(req.document_ids))
    result = await db.execute(query)
    docs = result.scalars().all()
    
    if not docs:
        raise HTTPException(status_code=400, detail=f"No documents found for case '{target_case_id}'. Please upload documents first.")
        
    doc_dicts = [
        {"id": d.id, "filename": d.filename, "raw_text": d.raw_text, "sha256": d.sha256}
        for d in docs
    ]
    
    run_id = str(uuid.uuid4())
    thread_id = req.thread_id or f"thread_{target_case_id}_{uuid.uuid4()}"
    
    initial_state = {
        "run_id": run_id,
        "thread_id": thread_id,
        "case_id": target_case_id,
        "domain": target_domain,
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
    final_state["case_id"] = target_case_id
    final_state["dao_id"] = target_case_id
    active_runs_state[run_id] = final_state
    
    # Save run to DB
    run_record = RunModel(
        id=run_id,
        case_id=target_case_id,
        thread_id=thread_id,
        status=final_state.get("status", "completed")
    )
    db.add(run_record)
    await db.commit()
    
    return {
        "run_id": run_id,
        "case_id": target_case_id,
        "dao_id": target_case_id,
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
        "case_id": state.get("case_id", "case-001-knee-surgery"),
        "dao_id": state.get("dao_id", "case-001-knee-surgery"),
        "thread_id": state.get("thread_id"),
        "status": state.get("status"),
        "pending_approvals": state.get("pending_approvals", []),
        "approved": state.get("approved", {}),
        "register_draft": state.get("register_draft", {})
    }
