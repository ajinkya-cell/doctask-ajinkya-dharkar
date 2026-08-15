import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
import httpx
from app.config import settings

async def test_models():
    models = [
        "meta/llama-3.1-8b-instruct",
        "mistralai/mistral-7b-instruct-v0.3",
        "meta/llama-3.3-70b-instruct"
    ]
    headers = {
        "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for m in models:
            print(f"[*] Trying NVIDIA model: {m}...")
            payload = {
                "model": m,
                "messages": [
                    {"role": "user", "content": "Extract budget from: Proposal DAO-PROP-042 approves 45,000 USDC. Return JSON only: {\"budget\": 45000}."}
                ],
                "temperature": 0.1,
                "max_tokens": 50
            }
            try:
                res = await client.post(f"{settings.NVIDIA_BASE_URL}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    reply = data["choices"][0]["message"]["content"]
                    print(f"[+] SUCCESS with {m}!\nResponse: {reply.strip()}\n")
                    return m
                else:
                    print(f"[-] Status {res.status_code}: {res.text}")
            except Exception as e:
                print(f"[-] Failed with {m}: {e}")

if __name__ == "__main__":
    asyncio.run(test_models())
