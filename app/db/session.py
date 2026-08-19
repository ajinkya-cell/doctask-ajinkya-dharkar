import os
import hashlib
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.config import settings
from app.db.models import Base, PatientCaseModel, DocumentModel
from app.extraction.classifier import classify_document

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

DEFAULT_PATIENT_CASES = [
    {
        "id": "case-001-knee-surgery",
        "domain": "medical",
        "patient_name": "Sarah Jenkins",
        "case_title": "Sarah Jenkins — Knee Arthroscopy & Physical Therapy",
        "description": "Hospital billed $2,900.00 vs $50.00 specialist co-pay limit on in-network outpatient surgery.",
        "policy_number": "POL-APEX-7720",
        "seed_dir": "seed_data/case-001-knee-surgery"
    },
    {
        "id": "case-002-clean-wellness",
        "domain": "medical",
        "patient_name": "David Ross",
        "case_title": "David Ross — Annual Preventative Wellness Exam",
        "description": "Routine annual checkup covered 100% under statutory preventative care mandate (0 findings clean run).",
        "policy_number": "POL-HORIZON-101",
        "seed_dir": "seed_data/case-002-clean-wellness"
    },
    {
        "id": "case-003-er-surprise",
        "domain": "medical",
        "patient_name": "Michael Chang",
        "case_title": "Michael Chang — Emergency Care & CT Scan Balance Billing",
        "description": "Emergency hospital visit with illegal $1,800 out-of-network balance bill violating the No Surprises Act.",
        "policy_number": "POL-UNITED-8840",
        "seed_dir": "seed_data/case-003-er-surprise"
    },
    {
        "id": "treehouse-dao",
        "domain": "dao",
        "patient_name": "Treehouse Guild",
        "case_title": "Treehouse HQ Guild DAO — Proposal #042 Audit",
        "description": "Cross-proposal budget contradiction (50k vs 45k), 88.9% initial payout cap breach (Rule 5.1), and prompt injection threat.",
        "policy_number": "DAO-CHARTER-2026",
        "seed_dir": "seed_data/case-001-treehouse"
    },
    {
        "id": "case-001-treehouse",
        "domain": "dao",
        "patient_name": "Treehouse Guild",
        "case_title": "Treehouse HQ Guild DAO — Proposal #042 Audit",
        "description": "Cross-proposal budget contradiction (50k vs 45k), 88.9% initial payout cap breach (Rule 5.1), and prompt injection threat.",
        "policy_number": "DAO-CHARTER-2026",
        "seed_dir": "seed_data/case-001-treehouse"
    },
    {
        "id": "solaris-dao",
        "domain": "dao",
        "patient_name": "Solaris Governance",
        "case_title": "Solaris Microgrid DAO — Proposal #108 Audit",
        "description": "Microgrid battery procurement with milestone budget caps, multiple disbursements, and contractor invoice reconciliation.",
        "policy_number": "DAO-CHARTER-2026",
        "seed_dir": "seed_data/case-003-solaris"
    },
    {
        "id": "case-003-solaris",
        "domain": "dao",
        "patient_name": "Solaris Governance",
        "case_title": "Solaris Microgrid DAO — Proposal #108 Audit",
        "description": "Microgrid battery procurement with milestone budget caps, multiple disbursements, and contractor invoice reconciliation.",
        "policy_number": "DAO-CHARTER-2026",
        "seed_dir": "seed_data/case-003-solaris"
    },
    {
        "id": "clean-dao",
        "domain": "dao",
        "patient_name": "Clean DAO Council",
        "case_title": "Clean Governance DAO — Proposal #101 Clean Run",
        "description": "15,000 USDC community initiative with 100% rule compliance and zero detected contradictions.",
        "policy_number": "DAO-CHARTER-2026",
        "seed_dir": "seed_data/case-002-clean"
    },
    {
        "id": "case-002-clean",
        "domain": "dao",
        "patient_name": "Clean DAO Council",
        "case_title": "Clean Governance DAO — Proposal #101 Clean Run",
        "description": "15,000 USDC community initiative with 100% rule compliance and zero detected contradictions.",
        "policy_number": "DAO-CHARTER-2026",
        "seed_dir": "seed_data/case-002-clean"
    },
    {
        "id": "job-001-senior-fullstack",
        "domain": "talent",
        "patient_name": "Hiring Manager",
        "case_title": "Senior Full-Stack Engineer — Candidate Screening Pool",
        "description": "Multi-candidate credential audit screening 3 applicants against job requirements.",
        "policy_number": "JOB-REQ-2026-FSE",
        "seed_dir": "seed_data/job-001-senior-fullstack"
    }
]

async def init_db(reset: bool = False):
    async with engine.begin() as conn:
        if reset or os.getenv("RESET_DB", "0") == "1":
            await conn.run_sync(Base.metadata.drop_all)
        # Attempt create_all, and if column mismatch occurs, drop and recreate
        try:
            await conn.run_sync(Base.metadata.create_all)
        except Exception:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        
    try:
        async with async_session() as session:
            # Upsert default cases
            for inst in DEFAULT_PATIENT_CASES:
                res = await session.execute(select(PatientCaseModel).where(PatientCaseModel.id == inst["id"]))
                existing_case = res.scalar_one_or_none()
                if not existing_case:
                    new_case = PatientCaseModel(
                        id=inst["id"],
                        domain=inst.get("domain", "medical"),
                        patient_name=inst["patient_name"],
                        case_title=inst["case_title"],
                        description=inst["description"],
                        policy_number=inst["policy_number"]
                    )
                    session.add(new_case)
                    await session.flush()
                
                # Pre-seed documents if folder exists
                if inst["seed_dir"] and os.path.exists(inst["seed_dir"]):
                    for fname in os.listdir(inst["seed_dir"]):
                        fpath = os.path.join(inst["seed_dir"], fname)
                        if os.path.isfile(fpath):
                            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                            sha = hashlib.sha256(content.encode("utf-8")).hexdigest()
                            
                            # Check if document already seeded for this case
                            doc_res = await session.execute(
                                select(DocumentModel).where(
                                    DocumentModel.case_id == inst["id"],
                                    DocumentModel.filename == fname
                                )
                            )
                            if not doc_res.scalars().first():
                                doc_type = classify_document(fname, content)
                                new_doc = DocumentModel(
                                    case_id=inst["id"],
                                    filename=fname,
                                    doc_type=doc_type,
                                    raw_text=content,
                                    sha256=sha
                                )
                                session.add(new_doc)
            await session.commit()
    except Exception:
        # Schema mismatch detected on existing DB, recreate tables fresh
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
            
        async with async_session() as session:
            for inst in DEFAULT_PATIENT_CASES:
                new_case = PatientCaseModel(
                    id=inst["id"],
                    patient_name=inst["patient_name"],
                    case_title=inst["case_title"],
                    description=inst["description"],
                    policy_number=inst["policy_number"]
                )
                session.add(new_case)
                await session.flush()
                
                if inst["seed_dir"] and os.path.exists(inst["seed_dir"]):
                    for fname in os.listdir(inst["seed_dir"]):
                        fpath = os.path.join(inst["seed_dir"], fname)
                        if os.path.isfile(fpath):
                            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                            sha = hashlib.sha256(content.encode("utf-8")).hexdigest()
                            doc_type = classify_document(fname, content)
                            new_doc = DocumentModel(
                                case_id=inst["id"],
                                filename=fname,
                                doc_type=doc_type,
                                raw_text=content,
                                sha256=sha
                            )
                            session.add(new_doc)
            await session.commit()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
