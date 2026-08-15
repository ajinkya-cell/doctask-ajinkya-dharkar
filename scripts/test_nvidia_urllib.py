import urllib.request
import json
import ssl

api_key = "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"
url = "https://integrate.api.nvidia.com/v1/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "User-Agent": "SuperDocs-Agent"
}

payload = {
    "model": "meta/llama-3.3-70b-instruct",
    "messages": [
        {"role": "user", "content": "Extract budget from: Proposal DAO-PROP-042 approves 45,000 USDC. Return JSON."}
    ],
    "temperature": 0.1,
    "max_tokens": 100
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(url, data=data, headers=headers, method="POST")

ctx = ssl.create_default_context()
try:
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        res_body = resp.read().decode("utf-8")
        parsed = json.loads(res_body)
        print("[+] NVIDIA NIM Live API Success:")
        print(parsed["choices"][0]["message"]["content"])
except Exception as e:
    print(f"[-] NVIDIA NIM Error: {e}")
