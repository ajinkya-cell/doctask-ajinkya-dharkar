# SuperDocs DAO Treasury & Governance Conflict Analyst (`doctask-ajinkya`)

> **SuperDocs Engineering Task Submission**  
> Full-Stack Agentic Document Processing & Governance Audit System. Built for **Task 1: "The Analyst That Never Sleeps"**.

---

## 1. Quick Start (Stranger-Friendly 1-Command Setup)

Run the full backend server and test suite in under 2 minutes:

```bash
# Clone and enter repo
git clone https://github.com/your-username/doctask-ajinkya.git
cd doctask-ajinkya

# Execute single-command setup and run
make setup && make run
```

Or manually:

```bash
# 1. Virtual environment setup
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run FastAPI Backend & FastMCP Server
python -m app.main
```

FastAPI Documentation is available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 2. Key Behaviors & Architecture

This system satisfies all **5 Mandatory Floor Requirements** and **5 Strong Behaviors**:

1. **Visible Stages & Dynamic Routing:** State machine implemented with **LangGraph**. Graph stages: `classify` -> `extract_facts` -> `detect_conflicts` -> `check_rules` -> `draft_register` -> `human_gate` -> `commit`.
2. **Process Resumption / Crash Recovery:** Graph checkpointer persists state per `thread_id`. Interrupted processes resume from the exact last saved stage.
3. **Human Gate Control:** Pending items (conflicts, findings) halt state transition until a human calls `/runs/{id}/approve` item-by-item.
4. **Machine Interface (FastMCP):** Four core operations (`upload`, `run`, `approve`, `export`) exposed via FastAPI REST and **FastMCP Server** (`app/mcp/server.py`).
5. **Zero Bluffing / Groundedness:** Claims in the Grant Register link directly to line-level source quotes (`source_span`).
6. **Keyless / Offline Testing:** Pytest suite runs without live LLM keys (`USE_MOCK_LLM=1`).
7. **Prompt Injection Defense:** Source documents are treated strictly as passive data inside fenced blocks (`app/security/injection_guard.py`).
8. **Cost & Latency Metrics:** Stage-by-stage token and USD cost tracking (`/runs/{id}/cost`).

---

## 3. Synthetic Test Pile (DAO Governance)

The synthetic corpus lives in `seed_data/`:
* `seed_data/case-001-treehouse/DAO-PROP-042-treehouse.md`: Original proposal asking for 50,000 USDC.
* `seed_data/case-001-treehouse/DAO-AMEND-042b.md`: Amendment capping total budget at 45,000 USDC (40k initial + 5k escrow).
* `seed_data/case-001-treehouse/treasury_tx_2026_Q2.json`: On-chain log showing 40,000 USDC transfer to recipient `0x71A982C318F923`.
* `seed_data/case-001-treehouse/delegate_comments_thread.txt`: Forum vote rationale.
* `seed_data/case-001-treehouse/malicious_amendment.txt`: Prompt injection safety test doc.
* `watched/contractor_invoice_final.md`: Incremental watcher document requesting 10,000 USDC (exceeds remaining 5k escrow).

---

## 4. Running Tests

Run the keyless test suite:

```bash
pytest
```
