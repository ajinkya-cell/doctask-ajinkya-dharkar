import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
from app.db.session import init_db, engine
from sqlalchemy import text

async def test_init_neon():
    print("[*] Initializing tables in live Neon PostgreSQL...")
    await init_db()
    print("[+] Database schema successfully created in Neon PostgreSQL!")
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, name FROM daos;"))
        rows = res.fetchall()
        print(f"[+] Default seeded DAOs in Neon: {rows}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_init_neon())
