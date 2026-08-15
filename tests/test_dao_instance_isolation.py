import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.models import Base
from app.db.session import engine, init_db

@pytest.mark.asyncio
async def test_multi_dao_instance_isolation():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await init_db()
    
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Create two distinct DAOs
        dao1 = "test-alpha-dao"
        dao2 = "test-beta-dao"
        
        await client.post("/daos", json={"id": dao1, "name": "Alpha DAO", "description": "Alpha DAO Instance"})
        await client.post("/daos", json={"id": dao2, "name": "Beta DAO", "description": "Beta DAO Instance"})
        
        # 2. Upload document to Alpha DAO
        f_alpha = [("files", ("DAO-PROP-1.md", b"# Proposal 1\nRequested Amount: 10000 USDC", "text/plain"))]
        up_alpha = await client.post(f"/documents?dao_id={dao1}", files=f_alpha)
        assert up_alpha.status_code == 200
        
        # 3. Upload document to Beta DAO
        f_beta = [("files", ("DAO-PROP-2.md", b"# Proposal 2\nRequested Amount: 20000 USDC", "text/plain"))]
        up_beta = await client.post(f"/documents?dao_id={dao2}", files=f_beta)
        assert up_beta.status_code == 200
        
        # 4. Verify document listings are 100% isolated per DAO
        docs_alpha = await client.get(f"/documents?dao_id={dao1}")
        docs_beta = await client.get(f"/documents?dao_id={dao2}")
        
        filenames_alpha = [d["filename"] for d in docs_alpha.json()["documents"]]
        filenames_beta = [d["filename"] for d in docs_beta.json()["documents"]]
        
        assert "DAO-PROP-1.md" in filenames_alpha
        assert "DAO-PROP-1.md" not in filenames_beta
        assert "DAO-PROP-2.md" in filenames_beta
        assert "DAO-PROP-2.md" not in filenames_alpha
