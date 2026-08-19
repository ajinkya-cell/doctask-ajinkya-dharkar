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

## 3. FastMCP Machine Interface Driver

External AI agents or automated scripts can drive the full screening process via Model Context Protocol:

```bash
# Run the autonomous FastMCP screener driver script:
python scripts/mcp_screener_driver.py
```

### Available FastMCP Tools (`app/mcp/server.py`):
- `configure_job_description(title, required_skills, min_experience, nice_to_have)`
- `upload_candidate_document(filename, raw_text)`
- `run_screener_audit()`
- `get_candidate_leaderboard(run_id)`
- `review_candidate_flags(run_id)`
- `decide_candidate(candidate_id, action, notes)`
- `export_shortlist_dossier(run_id)`

---

## 4. Running the Keyless Test Suite

Run the full automated test suite offline without requiring live LLM API keys:

```bash
pytest
```
*Result: 42 passed in ~2.1s*
