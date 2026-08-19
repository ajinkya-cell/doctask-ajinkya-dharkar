import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.models import Base
from app.db.session import engine, init_db

@pytest.mark.asyncio
async def test_multi_patient_case_isolation():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await init_db()
    
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Create two distinct patient cases
        case1 = "test-patient-alice"
        case2 = "test-patient-bob"
        
        await client.post("/cases", json={"id": case1, "name": "Alice Case", "description": "Patient Alice Knee Audit"})
        await client.post("/cases", json={"id": case2, "name": "Bob Case", "description": "Patient Bob Cardiac Audit"})
        
        # 2. Upload document to Alice Case
        f_alice = [("files", ("alice_bill.md", b"# Hospital Bill Alice\nTotal: $1,500.00", "text/plain"))]
        up_alice = await client.post(f"/documents?case_id={case1}", files=f_alice)
        assert up_alice.status_code == 200
        
        # 3. Upload document to Bob Case
        f_bob = [("files", ("bob_bill.md", b"# Hospital Bill Bob\nTotal: $2,500.00", "text/plain"))]
        up_bob = await client.post(f"/documents?case_id={case2}", files=f_bob)
        assert up_bob.status_code == 200
        
        # 4. Verify document listings are 100% isolated per patient case
        docs_alice = await client.get(f"/documents?case_id={case1}")
        docs_bob = await client.get(f"/documents?case_id={case2}")
        
        filenames_alice = [d["filename"] for d in docs_alice.json()["documents"]]
        filenames_bob = [d["filename"] for d in docs_bob.json()["documents"]]
        
        assert "alice_bill.md" in filenames_alice
        assert "alice_bill.md" not in filenames_bob
        assert "bob_bill.md" in filenames_bob
        assert "bob_bill.md" not in filenames_alice
