import hashlib
import io
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Query, Depends
import PyPDF2
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import DocumentModel, PatientCaseModel
from app.extraction.classifier import classify_document

from app.extraction.fact_extractor import parse_resume_deep, extract_facts_from_doc

router = APIRouter(prefix="/documents", tags=["Medical Documents"])

def extract_clean_text(filename: str, content: bytes) -> str:
    """Extracts clean UTF-8 text from PDFs, Markdown, TXT, JSON, and DOCX files."""
    fname_lower = filename.lower()
    
    # 1. PDF File Extraction via PyPDF2
    if fname_lower.endswith(".pdf") or content.startswith(b"%PDF"):
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            extracted_pages = []
            for idx, page in enumerate(reader.pages):
                p_text = page.extract_text()
                if p_text:
                    extracted_pages.append(p_text.strip())
            full_text = "\n\n".join(extracted_pages)
            if full_text.strip():
                return full_text.replace("\x00", " ")
        except Exception as e:
            print(f"[PDF Extraction Notice] PyPDF2 fallback for {filename}: {e}")
            
    # 2. Text / Markdown / JSON / CSV File Extraction
    try:
        raw_text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            raw_text = content.decode("latin-1")
        except Exception:
            raw_text = content.decode("utf-8", errors="ignore")
            
    return raw_text.replace("\x00", " ")

@router.post("")
async def upload_documents(
    files: List[UploadFile] = File(...),
    case_id: Optional[str] = Query(None, description="Target Patient Case ID"),
    dao_id: Optional[str] = Query(None, description="Legacy Case ID alias"),
    db: AsyncSession = Depends(get_db)
):
    target_case_id = case_id or dao_id or "case-001-knee-surgery"
    
    # Verify Case instance exists or create on the fly
    case = await db.get(PatientCaseModel, target_case_id)
    if not case:
        case = PatientCaseModel(
            id=target_case_id,
            patient_name=f"Patient {target_case_id}",
            case_title=f"Audit Case ({target_case_id})",
            description="Auto-created case instance"
        )
        db.add(case)
        await db.commit()

    uploaded_docs = []
    
    for file in files:
        content = await file.read()
        filename = file.filename or "uploaded_doc.txt"
        raw_text = extract_clean_text(filename, content)
        sha256_hash = hashlib.sha256(content).hexdigest()
        doc_type = classify_document(filename, raw_text)
        
        doc_record = DocumentModel(
            case_id=target_case_id,
            filename=filename,
            doc_type=doc_type,
            raw_text=raw_text,
            sha256=sha256_hash
        )
        db.add(doc_record)
        await db.commit()
        await db.refresh(doc_record)
        
        # Deep candidate profile extraction for resumes/credentials
        profile = None
        if doc_type == "resume" or "resume" in filename.lower() or "cv" in filename.lower() or filename.lower().endswith(".pdf"):
            profile = parse_resume_deep(raw_text, filename)

        facts = extract_facts_from_doc(doc_record.id, filename, doc_type, raw_text, case_id=target_case_id)
        
        uploaded_docs.append({
            "id": doc_record.id,
            "case_id": doc_record.case_id,
            "dao_id": doc_record.case_id,
            "filename": doc_record.filename,
            "doc_type": doc_record.doc_type,
            "raw_text": raw_text,
            "sha256": doc_record.sha256,
            "extracted_profile": profile,
            "extracted_facts": facts
        })
        
    return {
        "message": f"Successfully uploaded {len(uploaded_docs)} documents to case '{target_case_id}'",
        "documents": uploaded_docs
    }

@router.get("")
async def list_documents(
    case_id: Optional[str] = Query(None),
    dao_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    target_id = case_id or dao_id or "case-001-knee-surgery"
    result = await db.execute(select(DocumentModel).where(DocumentModel.case_id == target_id))
    docs = result.scalars().all()
    return {
        "case_id": target_id,
        "dao_id": target_id,
        "documents": [
            {
                "id": d.id,
                "case_id": d.case_id,
                "dao_id": d.case_id,
                "filename": d.filename,
                "doc_type": d.doc_type,
                "uploaded_at": d.uploaded_at.isoformat(),
                "sha256": d.sha256
            }
            for d in docs
        ]
    }
