# SuperDocs Talent Auditor (`doctask-ajinkya`)

> **SuperDocs Engineering Task Submission — Task 1: "The Analyst That Never Sleeps"**  
> Autonomous Candidate Screening, Grounded Fact Extraction, Cross-Document HR Discrepancy Auditing & FastMCP Machine Driving Interface.

---

## 1. Quick Start (1-Command Stranger-Friendly Setup)

Run the full backend server and frontend in under 2 minutes:

```bash
# 1. Virtual environment setup & install dependencies
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Run FastAPI Backend & FastMCP Server (Port 8000)
python -m app.main
```

In a separate terminal, launch the React Frontend UI:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** to access the **SuperDocs Talent Auditor** dashboard.

FastAPI Interactive Docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## 2. Key Behaviors & Architecture

This system satisfies all **5 Mandatory Floor Requirements** and **5 Strong Behaviors** of SuperDocs Task 1:

1. **Autonomous 5-Stage Agentic Pipeline:** State machine implemented with **LangGraph**:
   `Document Ingestion` $\rightarrow$ `Deep Fact Extraction` $\rightarrow$ `Cross-Document Conflict Detection` $\rightarrow$ `4-Pillar Scoring & Ranking` $\rightarrow$ `Human Decision Gate & Dossier Export`.
2. **Zero Bluffing / Grounded Citations:** Every extracted skill, experience year, degree, and contact datum is grounded with exact line-level document citations (`source_span`).
3. **4-Pillar Transparent Scoring Architecture:**
   - **Pillar 1: Technical Skills Match (Max 50 pts)** — Mandatory match ratio + secondary technology bonus.
   - **Pillar 2: Professional Experience Fulfillment (Max 40 pts)** — Proportional experience fulfillment `(cand_yrs / req_yrs) * 40`.
   - **Pillar 3: Projects & Education Depth (Max 10 pts)** — Degree relevance (5 pts) + verified production systems built (5 pts).
   - **Pillar 4: Red Flag Deductions** — -30 pts for title/experience inflation, -50 pts for prompt injection override attempts.
4. **Security & Prompt Injection Resistance (Rule 9.1):** Untrusted document texts are treated strictly as passive data inside fenced blocks (`<untrusted_source_document>`). Adversarial prompts attempting to hijack scoring criteria are quarantined and automatically penalized.
5. **Human-in-the-Loop Gate:** Recruiter holds final authority to `pass`, `stop`, or mark candidates for `review` with persistent audit logs before exporting dossiers.
6. **Machine Interface (FastMCP Server):** AI agents (Cursor, Claude, Antigravity) can drive the entire candidate screening lifecycle over **Model Context Protocol (MCP)** via `app/mcp/server.py`.
7. **One-Click Interview Dossier Generation:** Client-side generation of multi-page, formatted PDF dossiers with candidate summary, skill matrix, and AI-tailored system design interview questions.

---

## 3. FastMCP Machine Interface & OpenCode Integration

AI agents (OpenCode, Claude Desktop, Cursor, Antigravity) can drive the entire candidate screening lifecycle over **Model Context Protocol (MCP)** via `app/mcp/server.py`.

👉 **For the complete architecture deep dive and function catalog, see [MCP_ARCHITECTURE.md](MCP_ARCHITECTURE.md).**

### 🔌 OpenCode Configuration (`opencode.json`)
```json
{
  "mcpServers": {
    "superdocs-talent-auditor": {
      "command": "C:/path/to/superdocs-assignment/.venv/Scripts/python.exe",
      "args": ["-m", "app.mcp.server"],
      "cwd": "C:/path/to/superdocs-assignment"
    }
  }
}
```

### Available FastMCP Catalog (`app/mcp/server.py`):
- **13 Tools:** `reset_candidate_pool`, `configure_job_description`, `ingest_resumes_from_directory`, `upload_candidate_pdf`, `upload_candidate_document`, `run_screener_audit`, `get_candidate_leaderboard`, `get_candidate_dossier`, `add_candidate_pointer`, `remove_candidate_pointer`, `compare_candidates`, `decide_candidate`, `export_shortlist_dossier`.
- **4 Resources:** `talent://active-jd`, `talent://leaderboard`, `talent://security-flags`, `talent://telemetry`.
- **3 Prompts:** `screen_candidate_pool`, `generate_interview_guide`, `detect_adversarial_attacks`.

```bash
# Run the autonomous end-to-end FastMCP driver script:
python scripts/mcp_screener_driver.py
```

---

## 4. Running the Keyless Test Suite

Run the full automated test suite offline without requiring live LLM API keys:

```bash
pytest
```
*Result: 42 passed in ~2.1s*

