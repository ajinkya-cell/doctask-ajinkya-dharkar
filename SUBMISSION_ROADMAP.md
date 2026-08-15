# SuperDocs Task 1 Submission Roadmap

This document maps the SuperDocs engineering PDF to this repository as it exists now, then lays out the upgrades that would make the project a stronger, more honest, and more usable submission.

The project direction is solid: a DAO treasury and governance analyst that ingests related proposal, amendment, treasury, forum, and invoice documents; extracts grounded facts; detects disagreements; checks charter rules; asks a human to approve or reject items; and exports a grant register plus audit findings.

The main work remaining is not adding more surface area. It is making the required behaviors real end to end, persistent across restarts, and easy for an evaluator to verify.

## Assignment Requirement Matrix

| PDF Requirement | Current Status | Current Evidence | Required Improvement |
|---|---:|---|---|
| 1. Visible agentic steps with dynamic routing | Partial | LangGraph stages exist in `app/graph/build_graph.py`; one conditional edge routes empty extraction to `draft_register`. | Persist and expose stage events, decisions, retries, skips, and escalations through API/UI. Add at least one meaningful retry/escalation path. |
| 2. Survives being stopped mid-run | Partial | Tests simulate resume with LangGraph `MemorySaver`. | Replace in-memory checkpointing with SQLite/Postgres-backed checkpoints and prove resume after actual process restart. |
| 3. Human holds the gate | Partial | `/runs/{id}/approve` updates item decisions in memory. | Stop the graph at `awaiting_approval`; do not commit until every pending item has an explicit approve/reject decision. Persist decisions. |
| 4. Machine can drive the whole flow | Partial | FastAPI routes and FastMCP tools exist. | Make REST and MCP use the same persistent run state and approval/commit semantics. Add one script that drives upload -> run -> approve/reject -> export. |
| 5. Never bluffs | Partial | Register fields include `source_span`; injection finding is grounded. | Remove fallback/default facts such as `DAO-PROP-042` where unsupported. Unsupported fields should be explicit `null` or `unsupported`, not guessed. |
| 6. Stranger can run it quickly | Partial | README and Makefile exist. | Make `pytest` work from a fresh shell without manual `PYTHONPATH=.`. Add one verified setup/run/test command. |
| 7. Proves itself without a live key | Partial | 14 tests pass with `PYTHONPATH=.` and mock logic. | Add stronger behavior tests: true restart recovery, API-level human gate, rejected-item export semantics, incremental update proof. |
| 8. Does not take orders from documents | Strong | `app/security/injection_guard.py` and tests detect imperative source instructions. | Keep as is, but include the malicious document in the demo path and final write-up. |
| 9. Concurrent runs stay isolated | Partial | Concurrent graph test uses separate thread IDs. | Add API/DB-level test with two simultaneous runs against same DAO and different DAOs; prove no state bleed. |
| 10. Reports cost and latency by stage | Partial | Stage costs are returned from in-memory state. | Persist costs in `run_costs`; distinguish measured duration from estimated/mock token cost. |

## Highest-Impact Fixes

1. **Make the human gate real.** The graph currently goes from `draft_register` to `commit`. Change the pipeline so `draft_register` produces `pending_approvals` and stops with `awaiting_approval`. The approval endpoint should commit only after every pending item has a decision.

2. **Persist run state.** `active_runs_state`, MCP `mcp_docs`, MCP `mcp_runs`, approval decisions, costs, conflicts, findings, register drafts, and change events should survive process restart. The DB models already point in this direction; use them as the source of truth.

3. **Replace memory checkpointing.** `MemorySaver` is fine for a demo, but the PDF explicitly asks to kill and restart the process. Use SQLite/Postgres checkpointing and add a subprocess test that starts a run, stops the process mid-run, restarts, and resumes from the last completed stage.

4. **Fix no-bluff defaults.** The extractor currently falls back to `DAO-PROP-042` and hardcoded values in some branches. For unsupported evidence, the system should emit an unsupported field or escalate to human, not invent a proposal ID or fact.

5. **Make setup claims true.** The README says `pytest`, but a fresh shell currently needs `PYTHONPATH=.`. Fix packaging or add pytest config so the documented command works exactly.

6. **Decide PDF support honestly.** The UI accepts `.pdf`, but upload currently decodes bytes as UTF-8 text. Either add PDF text extraction or state that v1 supports Markdown, JSON, and TXT only.

## Implementation Roadmap

### Phase 1: Submission Honesty And Testability

- Add pytest/package configuration so `pytest -q` works from repo root.
- Update README to describe the exact supported formats and commands.
- Remove production fallback demo data from the frontend or clearly isolate it behind a demo mode flag.
- Add a short `ARCHITECTURE.md` or README section explaining current trade-offs: mock LLM, SQLite default, deterministic synthetic corpus, and known limitations.

### Phase 2: Real Human Gate

- Change graph flow to end at `awaiting_approval` after `draft_register` when there are pending approvals.
- Add a commit operation that runs only after all pending items have explicit decisions.
- Persist each approval decision with `run_id`, `item_id`, `action`, `notes`, and timestamp.
- Export should show approved, rejected, and pending states honestly. Rejected findings must not silently appear as accepted findings.

### Phase 3: Persistent Runs And Crash Resume

- Make `RunModel` the source of truth for run status.
- Persist stage snapshots or LangGraph checkpoints in SQLite/Postgres.
- Store conflicts, findings, facts, register rows, cost rows, and change log rows during the run.
- Add a restart test that proves a run can resume after process death without duplicating already-completed work.

### Phase 4: Incremental Watcher Proof

- Expose a watcher/delta endpoint or command that processes only new files in `watched/`.
- Store unchanged register row hashes before and after the update.
- On `watched/contractor_invoice_final.md`, show the focused delta: new invoice fact, escrow overrun conflict, and unchanged proposal facts.
- Add a test that proves unaffected rows remain byte-identical.

### Phase 5: Machine Interface And UI Alignment

- Make MCP tools call the same services used by FastAPI instead of keeping separate in-memory state.
- Add an end-to-end driver script for upload, run, review, approve/reject, cost, and export.
- Make the frontend stage tracker reflect backend stage events instead of timers.
- Add a real citation inspector that pulls the stored document text and highlights the cited line/span.

## Demo Path To Optimize For

1. Start from a fresh clone and run the documented setup command.
2. Run tests without API keys.
3. Upload `seed_data/case-001-treehouse` documents.
4. Start a run and show visible stages.
5. Show detected budget conflict, rule finding, and prompt injection finding.
6. Approve one item and reject another.
7. Export the grounded register and findings report.
8. Restart during a run and resume from checkpoint.
9. Drop `watched/contractor_invoice_final.md` and show a focused update with the escrow overrun conflict.
10. Run `seed_data/case-002-clean` and show an honest no-findings result.

## Usability Ideas

- Add a single “Load Seed Case” button or CLI command for each case so evaluators do not need to manually upload files.
- Add a run timeline: `stage`, `decision`, `input count`, `output count`, `duration`, and `status`.
- Add a reviewer decision log beside the export so item-by-item human control is obvious.
- Add a “why this is grounded” view that opens each register field with its source file, line, and exact quote.
- Add a “known limitations” box in README. Honest limitations are better than inflated claims.
- Add small sample mode and deterministic mode labels so reviewers understand which parts are mocked and which are live.

## Acceptance Criteria

- `pytest -q` passes from a fresh shell at repo root.
- A run with pending items cannot reach `committed` before approvals are submitted.
- Approval/rejection decisions survive process restart.
- Export reflects decisions accurately.
- Stage costs are returned from persisted rows.
- MCP and REST produce compatible results for the same corpus.
- A process restart test proves checkpoint recovery beyond in-memory state.
- Incremental watcher test proves unchanged register rows remain byte-identical.
- README setup, supported formats, and demo commands match actual behavior.

## Current Recommended Cut Line

If time is tight, prioritize the first five PDF requirements over breadth:

1. Real visible stages.
2. Real persistent restart recovery.
3. Real itemized human gate.
4. Real machine-driven flow.
5. Real grounded/no-bluff output.

The PDF explicitly says a defended cut beats a hollow stage. It is better to ship fewer behaviors that genuinely hold than claim every behavior while key pieces remain in memory or hardcoded.

