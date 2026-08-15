import os
import hashlib
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.config import settings
from app.db.models import Base, DAOModel, DocumentModel
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

DEFAULT_INSTANCES = [
    {
        "id": "treehouse-dao",
        "name": "Treehouse HQ Guild DAO",
        "description": "DAO governing community physical & digital HQ construction projects.",
        "seed_dir": "seed_data/case-001-treehouse"
    },
    {
        "id": "legal-dao",
        "name": "Legal & Compliance Guild DAO",
        "description": "DAO managing entity filings, legal retainers, and regulatory compliance.",
        "seed_dir": None
    },
    {
        "id": "household-account",
        "name": "Household Financial Auditor",
        "description": "Auditor for recurring household utility bills, service agreements, and bank statements.",
        "seed_dir": "seed_data/case-004-household"
    },
    {
        "id": "solaris-dao",
        "name": "Solaris Community Microgrid DAO",
        "description": "DAO managing community solar panel procurement and battery storage allocations.",
        "seed_dir": "seed_data/case-003-solaris"
    }
]

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        # Upsert default instances
        for inst in DEFAULT_INSTANCES:
            res = await session.execute(select(DAOModel).where(DAOModel.id == inst["id"]))
            existing_dao = res.scalar_one_or_none()
            if not existing_dao:
                new_dao = DAOModel(
                    id=inst["id"],
                    name=inst["name"],
                    description=inst["description"]
                )
                session.add(new_dao)
                await session.flush()
            
            # Pre-seed documents if folder exists
            if inst["seed_dir"] and os.path.exists(inst["seed_dir"]):
                for fname in os.listdir(inst["seed_dir"]):
                    fpath = os.path.join(inst["seed_dir"], fname)
                    if os.path.isfile(fpath):
                        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        sha = hashlib.sha256(content.encode("utf-8")).hexdigest()
                        
                        # Check if document already seeded for this DAO
                        doc_res = await session.execute(
                            select(DocumentModel).where(
                                DocumentModel.dao_id == inst["id"],
                                DocumentModel.filename == fname
                            )
                        )
                        if not doc_res.scalar_one_or_none():
                            doc_type = classify_document(fname, content)
                            new_doc = DocumentModel(
                                dao_id=inst["id"],
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
