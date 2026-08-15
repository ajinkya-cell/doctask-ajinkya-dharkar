import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.config import settings
from app.db.models import Base, DAOModel

# Create async engine supporting both SQLite (aiosqlite) and Postgres (asyncpg)
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

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        # Verify dao_id exists or recreate tables if schema mismatch
        try:
            result = await session.execute(select(DAOModel))
            daos = result.scalars().all()
        except Exception:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
                await conn.run_sync(Base.metadata.create_all)
            result = await session.execute(select(DAOModel))
            daos = result.scalars().all()

        if not daos:
            default_daos = [
                DAOModel(id="treehouse-dao", name="Treehouse HQ Guild DAO", description="DAO governing community physical & digital HQ construction projects."),
                DAOModel(id="legal-dao", name="Legal & Compliance Guild DAO", description="DAO managing entity filings, legal retainers, and regulatory compliance.")
            ]
            session.add_all(default_daos)
            await session.commit()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
