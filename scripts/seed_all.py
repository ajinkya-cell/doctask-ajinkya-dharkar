import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
from app.db.session import init_db, engine
from sqlalchemy import text

async def seed_all():
    print("[*] Running init_db() to seed all instances & corpus files into database...")
    await init_db()
    print("[+] Database successfully seeded!")
    
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, name FROM daos;"))
        daos = res.fetchall()
        print(f"\n[+] Active Instances in DB: {len(daos)}")
        for d in daos:
            doc_count = await conn.execute(text(f"SELECT count(*) FROM documents WHERE dao_id='{d[0]}';"))
            print(f"  - [{d[0]}] {d[1]} -> {doc_count.scalar()} documents seeded")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_all())
