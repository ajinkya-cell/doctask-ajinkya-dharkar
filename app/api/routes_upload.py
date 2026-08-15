import hashlib
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Query, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import DocumentModel, DAOModel
from app.extraction.classifier import classify_document

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("")
async def upload_documents(
    files: List[UploadFile] = File(...),
    dao_id: str = Query("treehouse-dao", description="Target DAO instance ID"),
    db: AsyncSession = Depends(get_db)
):
    # Verify DAO instance exists or create on the fly
    dao = await db.get(DAOModel, dao_id)
    if not dao:
        dao = DAOModel(id=dao_id, name=f"DAO Instance ({dao_id})", description="Auto-created DAO instance")
        db.add(dao)
        await db.commit()

    uploaded_docs = []
    
    for file in files:
        content = await file.read()
        raw_text = content.decode("utf-8", errors="ignore")
        sha256_hash = hashlib.sha256(content).hexdigest()
        doc_type = classify_document(file.filename or "doc.txt", raw_text)
        
        doc_record = DocumentModel(
            dao_id=dao_id,
            filename=file.filename or "uploaded_doc.txt",
            doc_type=doc_type,
            raw_text=raw_text,
            sha256=sha256_hash
        )
        db.add(doc_record)
        await db.commit()
        await db.refresh(doc_record)
        
        uploaded_docs.append({
            "id": doc_record.id,
            "dao_id": doc_record.dao_id,
            "filename": doc_record.filename,
            "doc_type": doc_record.doc_type,
            "sha256": doc_record.sha256
        })
        
    return {"message": f"Successfully uploaded {len(uploaded_docs)} documents to DAO '{dao_id}'", "documents": uploaded_docs}

@router.get("")
async def list_documents(
    dao_id: str = Query("treehouse-dao"),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(DocumentModel).where(DocumentModel.dao_id == dao_id))
    docs = result.scalars().all()
    return {
        "dao_id": dao_id,
        "documents": [
            {"id": d.id, "filename": d.filename, "doc_type": d.doc_type, "sha256": d.sha256, "uploaded_at": d.uploaded_at.isoformat()}
            for d in docs
        ]
    }
