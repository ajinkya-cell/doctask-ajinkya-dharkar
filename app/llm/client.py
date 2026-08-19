import asyncio
import httpx
from typing import Tuple, Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

async def call_llm(system_prompt: str, user_message: str) -> Tuple[str, int, int]:
    """
    Calls the NVIDIA NIM API (OpenAI-compatible) and returns the response text,
    prompt_tokens, and completion_tokens.
    """
    if settings.USE_MOCK_LLM or not settings.NVIDIA_API_KEY or not settings.NVIDIA_API_KEY.strip():
        return "", 0, 0

    url = f"{settings.NVIDIA_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.NVIDIA_API_KEY.strip()}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": settings.NVIDIA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "temperature": 0.1,
        "max_tokens": 1024
    }
        
    async with httpx.AsyncClient(timeout=4.0) as client:
        try:
            import time
            t0 = time.time()
            res = await client.post(url, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()
            
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens", 0)
            completion_tokens = usage.get("completion_tokens", 0)
                
            elapsed = int((time.time() - t0) * 1000)
            print(f"[NVIDIA NIM RESPONSE] Received in {elapsed}ms | {prompt_tokens} in / {completion_tokens} out tokens")
            return content, prompt_tokens, completion_tokens
            
        except Exception as e:
            logger.warning(f"NVIDIA NIM API call notice: {e}")
            return "", 0, 0
