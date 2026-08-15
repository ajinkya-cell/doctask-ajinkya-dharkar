import sys
import os
import traceback
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
import httpx
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def verify_nvidia():
    print(f"[*] Testing NVIDIA NIM API key with model: {settings.NVIDIA_MODEL}...")
    headers = {
        "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": settings.NVIDIA_MODEL,
        "messages": [
            {"role": "system", "content": "You are a DAO Governance Fact Extraction AI."},
            {"role": "user", "content": "Extract the approved budget: 'Proposal DAO-PROP-042 approves 45,000 USDC.' Return JSON."}
        ],
        "temperature": 0.1,
        "max_tokens": 100
    }
    async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
        try:
            res = await client.post(f"{settings.NVIDIA_BASE_URL}/chat/completions", headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                reply = data["choices"][0]["message"]["content"]
                print(f"[+] NVIDIA NIM API SUCCESS! Response:\n{reply.strip()}")
            else:
                print(f"[-] NVIDIA NIM API returned status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[-] NVIDIA NIM request failed: {repr(e)}")
            traceback.print_exc()

async def main():
    await verify_nvidia()

if __name__ == "__main__":
    asyncio.run(main())
