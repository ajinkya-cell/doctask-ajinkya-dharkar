from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import PatientCaseModel, DocumentModel

router = APIRouter(tags=["Patient Medical Cases"])

class CaseCreateRequest(BaseModel):
    id: str  # e.g. "case-knee-surgery" or "treehouse-dao"
    domain: Optional[str] = None
    name: Optional[str] = None
    patient_name: Optional[str] = None
    case_title: Optional[str] = None
    description: Optional[str] = ""
    policy_number: Optional[str] = ""

async def _list_cases(db: AsyncSession):
    result = await db.execute(select(PatientCaseModel))
    cases = result.scalars().all()
    
    output = []
    for c in cases:
        doc_count = await db.execute(select(DocumentModel).where(DocumentModel.case_id == c.id))
        docs = doc_count.scalars().all()
        output.append({
            "id": c.id,
            "domain": getattr(c, "domain", "medical") or "medical",
            "name": c.case_title or c.patient_name,
            "patient_name": c.patient_name,
            "case_title": c.case_title,
            "description": c.description,
            "policy_number": c.policy_number,
            "created_at": c.created_at.isoformat(),
            "document_count": len(docs)
        })
    return output

@router.get("/cases")
@router.get("/daos")
async def list_cases(db: AsyncSession = Depends(get_db)):
    cases = await _list_cases(db)
    return {"cases": cases, "daos": cases}

@router.post("/cases")
@router.post("/daos")
async def create_case(req: CaseCreateRequest, db: AsyncSession = Depends(get_db)):
    case_id = req.id.strip().lower().replace(" ", "-")
    existing = await db.get(PatientCaseModel, case_id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Case with ID '{case_id}' already exists")
        
    p_name = req.patient_name or req.name or "Instance"
    c_title = req.case_title or req.name or f"{p_name} — Audit"
    
    # Infer or extract domain
    if req.domain:
        domain = req.domain
    elif "dao" in case_id or "treehouse" in case_id or "solaris" in case_id or "clean" in case_id:
        domain = "dao"
    elif "job" in case_id or "candidate" in case_id or "talent" in case_id:
        domain = "talent"
    else:
        domain = "medical"
    
    new_case = PatientCaseModel(
        id=case_id,
        domain=domain,
        patient_name=p_name,
        case_title=c_title,
        description=req.description,
        policy_number=req.policy_number
    )
    db.add(new_case)
    await db.commit()
    await db.refresh(new_case)
    
    case_dict = {
        "id": new_case.id,
        "domain": new_case.domain,
        "name": new_case.case_title,
        "patient_name": new_case.patient_name,
        "case_title": new_case.case_title,
        "description": new_case.description,
        "created_at": new_case.created_at.isoformat()
    }
    return {
        "message": "Instance created successfully",
        "case": case_dict,
        "dao": case_dict
    }

@router.get("/cases/{case_id}")
@router.get("/daos/{case_id}")
async def get_case(case_id: str, db: AsyncSession = Depends(get_db)):
    case = await db.get(PatientCaseModel, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Instance not found")
        
    doc_res = await db.execute(select(DocumentModel).where(DocumentModel.case_id == case_id))
    docs = doc_res.scalars().all()
    
    case_dict = {
        "id": case.id,
        "domain": getattr(case, "domain", "medical") or "medical",
        "name": case.case_title,
        "patient_name": case.patient_name,
        "case_title": case.case_title,
        "description": case.description,
        "policy_number": case.policy_number,
        "created_at": case.created_at.isoformat(),
        "documents": [
            {
                "id": d.id,
                "filename": d.filename,
                "doc_type": d.doc_type,
                "uploaded_at": d.uploaded_at.isoformat(),
                "sha256": d.sha256
            }
            for d in docs
        ]
    }
    return {"case": case_dict, "dao": case_dict}
