# Task 1 Build Plan — DAO Governance Reconciliation Agent
*doctask-ajinkya — private repo, not yet initialized*

This plan maps every requirement in the task doc to a concrete implementation
decision, so the next step is purely "create these files" with no open
design questions left.

---

## 1. What we are actually building, in one sentence

An agentic pipeline that ingests DAO governance documents (proposals,
amendments, treasury logs, forum threads), extracts structured facts with
full source attribution, checks them against a charter/compliance
playbook, produces a **grant register** as the grounded deliverable, and
incrementally updates that register as new documents arrive — all gated
by human approval, resumable, concurrent-safe, and cost-tracked.

---

## 2. The three movements → what each one is, concretely

### Movement 1: Understand the pile
- **Input**: mixed files (`.md`, `.json`, `.txt`) from `case-001-treehouse/`, `case-002-clean/`
- **Classify** each doc: proposal / amendment / treasury_log / forum_thread / charter
- **Extract facts** into structured rows: `(proposal_id, field, value, source_doc_id, source_span)`
- **Detect disagreement**: same `(proposal_id, field)` with conflicting `value` across sources
- **Output**: a **Grant Register** — one row per proposal, every field traceable to a `source_doc_id` + exact quote/line span

### Movement 2: Examine
- **Input**: the charter (`dao_charter_excerpt.md`) parsed into discrete numbered rules (4.1, 4.2, 4.3, 5.1–5.4, 9.1)
- Each rule becomes a **check function** run against the register + sources
- **Output**: a **Findings Report** — each finding cites the register entry, the source doc, and the exact rule violated. Zero findings is a valid, expected output (case-002).

### Movement 3: Stay alive
- A `watched/` directory (simulated file-drop) — new docs appearing trigger an **incremental update**, not a full re-run
- Diff against existing register: unaffected proposals get a content hash check to prove byte-identical non-change
- New contradictions get surfaced as a **pending conflict**, not silently merged
- Every update is logged: what changed, when, because of which source doc (an append-only `change_log` table)

---

## 3. The 10 behaviors → implementation decision

| # | Behavior | Concrete decision |
|---|---|---|
| 1 | Visible stages, branching | LangGraph graph with nodes: `classify → extract → detect_conflicts → check_rules → draft_register → human_gate → commit`. Conditional edges: `extract` can route to `retry_extraction` (low confidence) or `escalate_to_human` (unparseable doc) |
| 2 | Survives being killed | LangGraph's checkpointer (`langgraph-checkpoint-postgres` `AsyncPostgresSaver` / `MemorySaver`) persists state after every node. Resuming = re-invoking with the same `thread_id` |
| 3 | Human holds the gate | `human_gate` node halts the graph (`interrupt()`); nothing commits to the register until a `/approve` call resolves each pending item individually — reject one, others still commit |
| 4 | Machine can drive it | Same four operations (`upload`, `instruct/run`, `approve`, `export`) exposed as **both** REST endpoints and MCP tools via `fastmcp` (standalone FastMCP server). A script test drives the whole flow with zero UI |
| 5 | Never bluffs | Every register field has a `confidence` + `source_doc_id`; if extraction can't find a source, the field is `null` with `status: "unsupported"`, never guessed. `/status` endpoint reports true state, not "done" unless verified |
| 6 | Stranger can run it | `make setup` (venv, deps, migrations against Neon/SQLite, seed) + `make run`. Documented as a 2-minute setup in README |
| 7 | Proves itself | `pytest` suite with **mocked LLM calls** (fixture responses keyed by input hash) — tests run with `USE_MOCK_LLM=1`, no API key needed. Tests: kill-and-resume, concurrent double-run, injection doc |
| 8 | Doesn't take orders from docs | System prompt explicitly frames all document content as **data in a fenced `<source_document>` block**, never as instructions. A regex/heuristic pre-filter flags suspicious imperative language in source docs and logs it as a **finding**, not an action |
| 9 | Concurrency-safe | Postgres row-level locking (`SELECT ... FOR UPDATE`) on `proposal_id` during writes; idempotency key per operation so re-running the same instruction twice doesn't double-apply |
| 10 | Knows its cost | Every LLM call wrapped with a cost-tracking decorator → `run_costs` table (tokens in/out, $ estimate, stage, duration_ms). `/runs/{id}/cost` returns a stage-by-stage breakdown |

---

## 4. Repo file structure

```
doctask-ajinkya/
├── README.md                     # setup, one-command run, design decisions log
├── TASK.md                       # how to work with this repo (per doc's suggestion)
├── PROGRESS.md                   # running log of assumptions made
├── Makefile                      # setup, run, test, seed targets
├── pyproject.toml
├── .env.example
│
├── app/
│   ├── main.py                   # FastAPI entrypoint
│   ├── config.py
│   │
│   ├── graph/
│   │   ├── state.py               # TypedDict: GraphState schema
│   │   ├── nodes.py               # classify, extract, detect_conflicts, check_rules, draft_register, human_gate, commit
│   │   ├── edges.py               # conditional routing logic
│   │   └── build_graph.py         # assembles the LangGraph StateGraph + checkpointer
│   │
│   ├── extraction/
│   │   ├── classifier.py          # doc type classification
│   │   ├── fact_extractor.py      # structured extraction w/ source spans
│   │   └── conflict_detector.py   # cross-doc field disagreement logic
│   │
│   ├── rules/
│   │   ├── charter_parser.py      # parses charter doc into rule objects
│   │   └── checks.py              # one function per rule (4.1, 4.2, 4.3, 5.1-5.4, 9.1)
│   │
│   ├── db/
│   │   ├── models.py               # SQLAlchemy models
│   │   ├── migrations/             # alembic
│   │   └── session.py
│   │
│   ├── api/
│   │   ├── routes_upload.py       # POST /documents
│   │   ├── routes_run.py          # POST /runs, GET /runs/{id}
│   │   ├── routes_approve.py      # POST /runs/{id}/approve  (item-by-item)
│   │   ├── routes_export.py       # GET /runs/{id}/export
│   │   └── routes_cost.py         # GET /runs/{id}/cost
│   │
│   ├── mcp/
│   │   └── server.py              # exposes upload/instruct/approve/export as MCP tools
│   │
│   └── security/
│       └── injection_guard.py     # flags imperative/instruction-like content in source docs
│
├── frontend/                     # React review UI
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── DiffCard.tsx        # per-finding approve/reject
│       │   ├── RegisterView.tsx
│       │   └── CostBreakdown.tsx
│       └── api/client.ts
│
├── tests/
│   ├── conftest.py                 # mock LLM fixture harness
│   ├── test_resume_after_kill.py
│   ├── test_concurrent_runs.py
│   ├── test_injection_resistance.py
│   ├── test_clean_corpus_no_findings.py
│   └── fixtures/                   # cached mock LLM responses keyed by input hash
│
├── watched/                       # simulated drop folder for "stays alive" behavior
│
└── seed-data/                     # symlink or copy of dao-docs/ synthetic pile
    ├── case-001-treehouse/
    ├── case-002-clean/
    └── rules/
```

---

## 5. Database schema (Neon Postgres + pgvector)

Neon supports the `pgvector` extension directly — no separate vector DB needed. One gotcha: Neon's pooled connection (PgBouncer, transaction mode) doesn't support prepared statements well, so use the **direct/unpooled** connection string for Alembic migrations and the **pooled** one for the running app's async engine.

```
documents        (id, filename, doc_type, raw_text, embedding[vector], uploaded_at, sha256)
proposals        (id, proposal_id, title, status, created_at)
facts            (id, proposal_id FK, field_name, value, source_doc_id FK, source_span, confidence, extracted_at)
conflicts        (id, proposal_id FK, field_name, values_json, status[pending/resolved/rejected], resolved_by, resolved_at)
findings         (id, proposal_id FK, rule_id, description, source_doc_id FK, source_span, status[pending/approved/rejected])
runs             (id, thread_id, status, started_at, finished_at, killed_and_resumed bool)
run_costs        (id, run_id FK, stage, tokens_in, tokens_out, cost_usd, duration_ms)
change_log       (id, proposal_id FK, field_name, old_value, new_value, source_doc_id FK, changed_at)
idempotency_keys (key, run_id, operation, result_hash, created_at)
```

`embedding` column via `pgvector` for semantic retrieval when a doc doesn't cleanly match a known type.

---

## 6. LangGraph state shape (sketch)

```python
class GraphState(TypedDict):
    run_id: str
    documents: list[DocumentRef]
    classified: dict[str, str]           # doc_id -> doc_type
    extracted_facts: list[Fact]
    conflicts: list[Conflict]
    findings: list[Finding]
    register_draft: dict
    pending_approvals: list[str]         # ids awaiting human decision
    approved: dict[str, bool]
    stage_costs: list[StageCost]
    status: Literal["running","awaiting_approval","committed","failed"]
```

---

## 7. What "what we actually read" (the founder's grading section) maps to in this plan

- **Architecture + reasons**: this document, committed as `ARCHITECTURE.md` in the repo, referenced from the write-up
- **Trade-off costs** (latency/money/simplicity): logged per design decision in `PROGRESS.md` as we build
- **Behavior on step failure**: `retry_extraction` / `escalate_to_human` conditional edges — tested explicitly in `tests/`
- **Works a second time**: case-002 run after case-001, different proposal, different (empty) findings outcome

---

## 8. Initialization steps (do these in order)

```bash
# 1. Repo setup
mkdir doctask-ajinkya && cd doctask-ajinkya
git init
gh repo create doctask-ajinkya --private --source=. 2>/dev/null || echo "create manually on GitHub, private"
# invite github.com/o-kadam as collaborator once repo exists

# 2. Python environment
python3.11 -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn langgraph langchain langchain-anthropic \
            sqlalchemy alembic asyncpg pgvector pydantic-settings \
            pytest pytest-asyncio httpx python-multipart

# 3. Neon Postgres (managed, no local container)
# - Create a project at neon.tech (or `neonctl projects create` if using the CLI)
# - Create a database, e.g. `dao_agent`
# - Copy the pooled connection string into .env as DATABASE_URL
#   postgresql://user:pass@ep-xxxx-pooler.region.aws.neon.tech/dao_agent?sslmode=require
# - Enable pgvector once, via any Postgres client (psql, Neon SQL editor, or a one-off script):
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"
# Note: use the pooled connection string for the app (asyncpg + PgBouncer-compatible),
# and the direct (unpooled) connection string for Alembic migrations if pooled mode
# gives you trouble with DDL statements.

# 4. Alembic init + first migration
alembic init app/db/migrations
# edit alembic.ini + env.py to point at models, then:
alembic revision --autogenerate -m "init schema"
alembic upgrade head

# 5. Seed synthetic data
cp -r ../dao-docs/* seed-data/

# 6. Frontend scaffold
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install && cd ..

# 7. Verify the four minimum-contract calls work end to end
uvicorn app.main:app --reload
# in another shell: curl the upload -> run -> approve -> export sequence against seed-data/case-002-clean/
```

---

## 9. Build order (so nothing blocks anything else)

1. DB models + migrations (schema first, everything else depends on it)
2. `classify` + `fact_extractor` nodes, tested against case-002 (no conflicts, simplest path)
3. `conflict_detector`, tested against case-001 (the real disagreement)
4. `charter_parser` + `checks.py`, tested against both cases
5. LangGraph assembly with checkpointer — get kill/resume working early, it's required behavior #2 and easy to defer/forget
6. `human_gate` + approve endpoint (item-by-item, partial rejection)
7. MCP server wrapping the same four operations
8. `injection_guard` + the planted forum-thread test doc
9. Cost tracking decorator across all LLM calls
10. Concurrency test (two runs on same pile) + row locking
11. React review UI last — it's a thin client over already-working endpoints
12. Tests throughout, not bolted on at the end — mock fixtures get harder to backfill later

---

## 10. Open assumptions to log in PROGRESS.md once building starts

- Treating "amount disbursed so far < approved amount" as a **status note**, not a compliance finding (only exceeding the approved amount is a 5.3 violation)
- Charter section 9.1 (no doc treated as instruction) implemented as both a system-prompt constraint AND a detectable/loggable event, not just prompt-level trust
- "Second run" proof = case-002 run independently after case-001 in the same running instance, not a fresh deploy
