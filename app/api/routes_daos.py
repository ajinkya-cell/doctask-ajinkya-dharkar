from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import DAOModel, DocumentModel

router = APIRouter(prefix="/daos", tags=["DAO Instances"])

class DAOCreateRequest(BaseModel):
    id: str  # e.g. "defi-treasury-dao"
    name: str
    description: Optional[str] = ""

@router.get("")
async def list_daos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DAOModel))
    daos = result.scalars().all()
    
    output = []
    for dao in daos:
        doc_count = await db.execute(select(DocumentModel).where(DocumentModel.dao_id == dao.id))
        docs = doc_count.scalars().all()
        output.append({
            "id": dao.id,
            "name": dao.name,
            "description": dao.description,
            "created_at": dao.created_at.isoformat(),
            "document_count": len(docs)
        })
    return {"daos": output}

@router.post("")
async def create_dao(req: DAOCreateRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.get(DAOModel, req.id)
    if existing:
        raise HTTPException(status_code=400, detail=f"DAO with ID '{req.id}' already exists")
        
    dao = DAOModel(
        id=req.id.strip().lower().replace(" ", "-"),
        name=req.name,
        description=req.description
    )
    db.add(dao)
    await db.commit()
    await db.refresh(dao)
    
    return {
        "message": "DAO instance created successfully",
        "dao": {
            "id": dao.id,
            "name": dao.name,
            "description": dao.description,
            "created_at": dao.created_at.isoformat()
        }
    }

@router.get("/{dao_id}")
async def get_dao(dao_id: str, db: AsyncSession = Depends(get_db)):
    dao = await db.get(DAOModel, dao_id)
    if not dao:
        raise HTTPException(status_code=404, detail="DAO instance not found")
        
    doc_count = await db.execute(select(DocumentModel).where(DocumentModel.dao_id == dao_id))
    docs = doc_count.scalars().all()
    
    return {
        "id": dao.id,
        "name": dao.name,
        "description": dao.description,
        "created_at": dao.created_at.isoformat(),
        "documents": [
            {"id": d.id, "filename": d.filename, "doc_type": d.doc_type, "sha256": d.sha256}
            for d in docs
        ]
    }
