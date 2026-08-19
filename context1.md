# SuperDocs Multi-Domain Agentic Conflict Analyst & Reconciliation System (`context1.md`)

> **Comprehensive Master Context & Architectural Reference**  
> Built for the **SuperDocs Engineering Assignment — Task 1: "The Analyst That Never Sleeps"**.  
> Covers everything in the system from start to finish: Problem statement, high-level architecture, 3 Core Movements, 3 domain workspaces, LangGraph state machine, FastMCP machine interface, security guards, database models, REST API reference, React 19 UI, and test suite.

---

## Table of Contents

1. [Executive Summary & System Vision](#1-executive-summary--system-vision)
2. [Fulfillment of SuperDocs Task 1 Requirements](#2-fulfillment-of-superdocs-task-1-requirements)
3. [The Three Core Movements](#3-the-three-core-movements)
   - [Movement 1: Understand the Pile](#movement-1-understand-the-pile)
   - [Movement 2: Examine Against Rules](#movement-2-examine-against-rules)
   - [Movement 3: Stay Alive (Incremental Watcher & Resumption)](#movement-3-stay-alive-incremental-watcher--resumption)
4. [The Three Domain Workspaces](#4-the-three-domain-workspaces)
   - [Domain A: HealthClaim Copilot (Medical Bill & Insurance Reconciler)](#domain-a-healthclaim-copilot-medical-bill--insurance-reconciler)
   - [Domain B: DAO Governance & Treasury Conflict Analyst](#domain-b-dao-governance--treasury-conflict-analyst)
   - [Domain C: TalentAudit / Candidate Screener Pool](#domain-c-talentaudit--candidate-screener-pool)
5. [End-to-End System Architecture](#5-end-to-end-system-architecture)
6. [Agent Orchestration (LangGraph State Machine)](#6-agent-orchestration-langgraph-state-machine)
7. [Deterministic Engines & Modules](#7-deterministic-engines--modules)
   - [Document Classifier](#71-document-classifier)
   - [Fact Extractor & Line Span Citation Engine](#72-fact-extractor--line-span-citation-engine)
   - [Cross-Document Conflict Detector](#73-cross-document-conflict-detector)
   - [Statutory & Charter Rules Engine](#74-statutory--charter-rules-engine)
   - [Defense-in-Depth Prompt Injection Guard](#75-defense-in-depth-prompt-injection-guard)
   - [Incremental Watcher Service](#76-incremental-watcher-service)
8. [Human-in-the-Loop Review Gate](#8-human-in-the-loop-review-gate)
9. [Machine Interface (FastMCP Server)](#9-machine-interface-fastmcp-server)
10. [Database Architecture & Data Models](#10-database-architecture--data-models)
11. [REST API Endpoint Reference](#11-rest-api-endpoint-reference)
12. [Frontend Architecture & UI Tour](#12-frontend-architecture--ui-tour)
13. [Cost & Latency Telemetry](#13-cost--latency-telemetry)
14. [Testing Strategy & Test Suite Breakdown](#14-testing-strategy--test-suite-breakdown)
15. [Project Directory & File Map](#15-project-directory--file-map)
16. [How to Run (Quickstart Guide)](#16-how-to-run-quickstart-guide)

---

## 1. Executive Summary & System Vision

Modern organizations and individuals must navigate **fragmented, multi-source document streams** describing the exact same underlying event (e.g., a patient's surgery, a DAO governance grant, or a job applicant's credentials). These documents arrive in different formats (Markdown, JSON, TXT, PDF) from disparate parties who frequently contradict each other in figures, timeline commitments, policy limits, and contractual rates.

This platform is a **production-grade, resilient agentic document processing and reconciliation system** that:
1. **Ingests mixed-format document piles** without assumptions.
2. **Extracts structured facts** backed by verbatim, line-level source quotes (`source_span`) with zero hallucination.
3. **Detects cross-document contradictions** (e.g., billed amount vs insurance allowed rate vs policy co-pay schedule; or proposal budget vs ratified amendment cap).
4. **Checks deliverables against statutory and organizational rules** (e.g. ACA Preventative Care $0 mandate, No Surprises Act emergency balance billing prohibitions, DAO spending thresholds, resume skill requirements).
5. **Enforces a strict Human Review Gate** before committing audit registers or deliverables.
6. **Stays alive continuously**, watching for late-arriving delta documents (such as delayed anesthesia bills or contractor milestone invoices) and computing focused updates without re-running unchanged work.
7. **Provides dual human and machine interfaces** via an interactive **React 19 UI** and a standardized **FastMCP Server**.

---

## 2. Fulfillment of SuperDocs Task 1 Requirements

| SuperDocs Requirement | Architectural Implementation | Verified In Code |
| :--- | :--- | :--- |
| **1. Visible Steps & Dynamic Routing** | **LangGraph StateGraph** state machine. Stages: `classify` ➔ `extract_facts` ➔ `detect_conflicts` ➔ `check_rules` ➔ `draft_register` ➔ `commit`. Dynamically escalates to human review if facts are missing or uncertain. | [`app/graph/build_graph.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/graph/build_graph.py), [`app/graph/edges.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/graph/edges.py) |
| **2. Process Resumption / Crash Recovery** | Persistent state checkpointing indexed by `thread_id` (SQLite / MemorySaver). If killed mid-pipeline, execution resumes from the exact last saved stage without repeating finished work. | [`app/graph/build_graph.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/graph/build_graph.py), [`tests/test_resume_after_kill.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/tests/test_resume_after_kill.py) |
| **3. Human Gate Control** | Human review state machine node. Halts execution at `awaiting_approval`. Findings and conflicts are queued in a review ledger requiring explicit item-by-item approve/reject actions before committing. | [`app/api/routes_approve.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/api/routes_approve.py), [`tests/test_behavior_human_gate.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/tests/test_behavior_human_gate.py) |
| **4. Machine Interface (FastMCP)** | Full **FastMCP Server** implementation alongside FastAPI. Exposes 5 standard MCP tools: `upload_document`, `run_analysis`, `review_findings`, `approve_item`, `export_deliverable`. | [`app/mcp/server.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/mcp/server.py), [`tests/test_behavior_mcp_server.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/tests/test_behavior_mcp_server.py) |
| **5. Zero Bluffing / Groundedness** | Strict line-level citation tracking (`source_span`, `source_doc_id`). Every claim in the final deliverable links to an exact quote. Unsupported fields are flagged rather than guessed. | [`app/extraction/fact_extractor.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/extraction/fact_extractor.py), [`tests/test_movement_1_understand_pile.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/tests/test_movement_1_understand_pile.py) |
| **6. Stranger-Friendly Setup** | 1-command startup (`python -m app.main` + `npm run dev` in `frontend/`) with automatic SQLite table creation and pre-loaded synthetic datasets. | [`Makefile`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/Makefile), [`README.md`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/README.md) |
| **7. Keyless / Offline Testing** | Complete test suite (35 tests) runs 100% offline using mock LLM drivers and deterministic fixtures without requiring live API keys. | [`tests/conftest.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/tests/conftest.py), `pyproject.toml` |
| **8. Prompt Injection Defense** | Passive data fencing using `<untrusted_source_document>` tags + regex scanner detecting imperative commands (`SYSTEM OVERRIDE`), reporting them as security findings rather than executing them. | [`app/security/injection_guard.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/security/injection_guard.py), [`tests/test_injection_resistance.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/tests/test_injection_resistance.py) |
| **9. Concurrency Isolation** | Scoped by `case_id` / `dao_id` and unique `run_id` / `thread_id`. Simultaneous pipeline runs on separate cases do not leak or corrupt shared state. | [`tests/test_behavior_concurrency.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/tests/test_behavior_concurrency.py), [`tests/test_dao_instance_isolation.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/tests/test_dao_instance_isolation.py) |
| **10. Stage Cost & Latency Metrics** | Measures and records stage-by-stage token consumption (`tokens_in`, `tokens_out`), estimated USD cost, and execution duration (`duration_ms`). | [`app/api/routes_cost.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/api/routes_cost.py), [`tests/test_behavior_cost_tracking.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/tests/test_behavior_cost_tracking.py) |

---

## 3. The Three Core Movements

### Movement 1: Understand the Pile
- **Ingestion**: Accepts mixed document formats (`.md`, `.json`, `.txt`, `.pdf`).
- **Classification**: Automatically classifies each document into its semantic role (`insurance_policy`, `hospital_bill`, `eob_statement`, `proposal`, `amendment`, `treasury_log`, `resume`, `job_description`, etc.).
- **Grounded Fact Extraction**: Extracts canonical key-value pairs (amounts, copays, wallet addresses, skills, years of experience) along with the line number and exact substring citation.
- **Cross-Document Discrepancy Matrix**: Detects numerical and categorical contradictions across files describing the same entity.
- **Audit Register Synthesis**: Builds the unified Audit Register where every entry is backed by a verified source link.

### Movement 2: Examine Against Rules
- **Deterministic Compliance Evaluation**: Evaluates extracted facts against statutory, contractual, and charter rules.
- **Granular Findings Ledger**: Generates distinct finding cards with rule IDs, descriptions, severity levels, and cited source spans.
- **Security Audit**: Identifies adversarial prompt injection payloads and flags them as active threats rather than executing them.

### Movement 3: Stay Alive (Incremental Watcher & Resumption)
- **Directory Watcher (`./watched/`)**: Monitors the watch folder for late-arriving documents.
- **Delta Update Engine**: Computes incremental deltas (new facts, newly surfaced contradictions) against existing state without re-running already audited documents.
- **Provenance & Changelog**: Maintains a timestamped history of `what changed`, `when`, and `from which document`.
- **State Checkpointing**: Persists intermediate graph state to disk, enabling instant recovery after unexpected process termination.

---

## 4. The Three Domain Workspaces

The platform supports 3 fully functional domain workspaces, selectable from the top navigation bar:

```
+-----------------------------------------------------------------------------------+
|  [SUPERDOCS]   🏥 HealthClaim Copilot   🏛️ DAO Governance   📄 TalentAudit Screener  |
+-----------------------------------------------------------------------------------+
```

---

### Domain A: HealthClaim Copilot (Medical Bill & Insurance Reconciler)

Reconciles hospital facility charges, physician invoices, and insurance Explanation of Benefits (EOB) statements against health insurance policy schedules and consumer protection laws.

#### Built-in Cases:
1. **`case-001-knee-surgery` (Sarah Jenkins — Knee Arthroscopy Audit)**:
   - **Documents**: `health_insurance_policy_gold.md`, `hospital_itemized_bill_may2026.md`, `insurance_eob_may2026.json`, `malicious_notice.txt`.
   - **Contradiction**: Hospital billed $2,900.00, but in-network insurance EOB allowed rate is $650.00 with $50.00 patient co-pay liability.
   - **Violations**: Hospital billed $150.00 specialist consultation fee, breaching the policy schedule cap of $50.00 (**Rule 2.3**).
   - **Security Finding**: `malicious_notice.txt` contains prompt injection payload (`SYSTEM OVERRIDE`).
2. **`case-002-clean-wellness` (David Ross — Annual Preventative Exam)**:
   - **Documents**: `health_insurance_policy_silver.md`, `routine_wellness_bill.md`, `preventative_eob.json`.
   - **Clean Run**: 100% compliant under ACA $0 cost-sharing preventative care mandate (**Rule 1.1**). Zero findings.
3. **`case-003-er-surprise` (Michael Chang — Emergency Room & CT Scan)**:
   - **Documents**: `health_insurance_er_policy.md`, `er_hospital_itemized_bill.md`, `insurance_eob_er.json`, `out_of_network_physician_balance_bill.md`.
   - **Violation**: Out-of-network physician billed an illegal $1,800.00 balance bill for emergency care, violating federal **No Surprises Act** protections (**Rule 3.1**).

#### Incremental Watcher Document:
- `watched/anesthesiology_delayed_bill.md`: Late $800.00 anesthesiology charge triggering a delayed ancillary billing conflict against primary EOB patient liability.

---

### Domain B: DAO Governance & Treasury Conflict Analyst

Audits decentralized organization governance proposal packages, on-chain execution logs, delegate forum discussions, and contractor invoices against the DAO Charter.

#### Built-in Cases:
1. **`case-001-treehouse` / `treehouse-dao` (Treehouse HQ Guild DAO — Proposal #042)**:
   - **Documents**: `DAO-PROP-042-treehouse.md`, `DAO-AMEND-042b.md`, `treasury_tx_2026_Q2.json`, `delegate_comments_thread.txt`, `malicious_amendment.txt`.
   - **Contradiction**: Original proposal requested 50,000 USDC upfront, but ratified amendment capped total allocation at 45,000 USDC.
   - **Violation**: Initial payout of 40,000 USDC represents 88.9% of the 45,000 USDC approved budget, exceeding the 85% maximum threshold (**Rule 5.1**).
   - **Security Finding**: `malicious_amendment.txt` prompts agent to ignore spending limits.
2. **`case-002-clean` / `clean-dao` (Clean Governance DAO — Proposal #101)**:
   - **Documents**: `DAO-PROP-101-clean.md`, `treasury_tx_101.json`.
   - **Clean Run**: 15,000 USDC proposal fully matched on-chain with 100% rule compliance.
3. **`case-003-solaris` / `solaris-dao` (Solaris Community Microgrid DAO — Proposal #108)**:
   - **Documents**: `DAO-PROP-108-solaris-microgrid.md`, `DAO-AMEND-108a-budget-cap.md`, `treasury_disbursement_tx_108.json`, `governance_forum_debate_108.txt`, `vendor_milestone_invoice_108.md`.
   - **Contradiction**: Milestone budget reconciliation and multi-stage payout verification.

#### Incremental Watcher Document:
- `watched/contractor_invoice_final.md`: Late contractor invoice requesting 10,000 USDC, exceeding the remaining 5,000 USDC milestone escrow balance.

---

### Domain C: TalentAudit / Candidate Screener Pool

Audits job applicant resumes and CVs against Job Descriptions (JDs), HR employment verifications, and past manager reference checks.

#### Built-in Case:
- **`job-001-senior-fullstack` (Senior Full-Stack Engineer Candidate Pool)**:
  - **Candidates Audited**:
    - **Alex Miller**: Claimed "Lead Software Architect" with 8 years experience and $175,000 expectation. HR verification revealed "Junior Developer" with 3.5 years experience ($150k budget cap breach [**Rule 5.1**], title inflation, and 4.5-year experience inflation [**Rule 5.3**]).
    - **Maya Patel**: 100% verified Senior React/Node Developer. Meets all requirements with strong reference checks.
    - **Liam Vance**: Strong backend engineer, but missing mandatory AWS cloud infrastructure skill (**Rule 5.2**).
  - **Scoring Engine**: Computes candidate suitability score (0-100) based on verified skills, title alignment, experience accuracy, and salary fit.

#### Incremental Watcher Document:
- `watched/late_reference_alex_miller.md`: Late reference check confirming junior-level performance.

---

## 5. End-to-End System Architecture

```
                          ┌─────────────────────────────────────────────────────────┐
                          │                   React 19 + Vite UI                    │
                          │   (Medical Case Hub / DAO Hub / Talent Screener / Docs) │
                          └────────────────────────────┬────────────────────────────┘
                                                       │ HTTP / REST / SSE
                          ┌────────────────────────────▼────────────────────────────┐
                          │               FastAPI REST & FastMCP Server             │
                          │        (Upload, Run, Cost, Approve, Export Tools)       │
                          └────────────────────────────┬────────────────────────────┘
                                                       │
                          ┌────────────────────────────▼────────────────────────────┐
                          │            LangGraph Resumable State Machine            │
                          │  ┌──────────┐   ┌───────────────┐   ┌─────────────────┐ │
                          │  │ Classify │ ─▶│ Extract Facts │ ─▶│ Detect Conflicts│ │
                          │  └──────────┘   └───────┬───────┘   └────────┬────────┘ │
                          │                         │ (escalate)         │          │
                          │                         ▼                    ▼          │
                          │                 ┌───────────────┐   ┌─────────────────┐ │
                          │                 │ Human Review  │◀──│ Check Rules     │ │
                          │                 │ Gate (PAUSED) │   └─────────────────┘ │
                          │                 └───────┬───────┘                       │
                          │                         │ (approved)                    │
                          │                         ▼                               │
                          │                 ┌───────────────┐                       │
                          │                 │ Commit & Save │                       │
                          │                 └───────────────┘                       │
                          └────────────────────────────┬────────────────────────────┘
                                                       │
             ┌─────────────────────────┬───────────────┴─────────────┬─────────────────────────┐
             ▼                         ▼                             ▼                         ▼
  ┌───────────────────────┐ ┌────────────────────┐      ┌─────────────────┐      ┌──────────────────┐
  │  Fact Extraction      │ │ Deterministic Rules│      │ Prompt Injection│      │ Incremental      │
  │  (Line Span Citations)│ │ (Copay, NoSurprise,│      │ Guard (Fencing+ │      │ Watcher Service  │
  │                       │ │  DAO Rules 4/5)    │      │  Scanner)       │      │ (./watched delta)│
  └───────────────────────┘ └────────────────────┘      └─────────────────┘      └──────────────────┘
             │                         │                             │                         │
             └─────────────────────────┴───────────────┬─────────────┴─────────────────────────┘
                                                       │
                                        ┌──────────────▼──────────────┐
                                        │ SQLite Database / Async DB  │
                                        │ & LangGraph Checkpointer    │
                                        └─────────────────────────────┘
```

---

## 6. Agent Orchestration (LangGraph State Machine)

The state machine is built in [`app/graph/build_graph.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/graph/build_graph.py) using LangGraph `StateGraph`.

### Pipeline Nodes:
1. **`classify_node`**: Iterates over all uploaded documents for the case, runs classifier, and saves document types.
2. **`extract_facts_node`**: Extracts canonical facts from each document with line numbers and source snippets.
3. **`detect_conflicts_node`**: Groups extracted facts by entity/proposal ID and identifies cross-document contradictions.
4. **`check_rules_node`**: Runs deterministic rule checks against facts and conflicts; flags security prompt injection findings.
5. **`draft_register_node`**: Assembles the Grounded Audit Register draft and queues all pending conflicts/findings for human sign-off.
6. **`commit_node`**: Persists approved facts, findings, and register deliverables into the database.

### Dynamic Routing & Resumption:
- **Conditional Edge (`should_retry_or_continue`)**: If no facts can be extracted from uploaded files, the graph skips automated conflict detection and escalates directly to human review.
- **Checkpointing**: Every state transition is snapshotted under the run's `thread_id`. If execution halts or the server process crashes, calling the pipeline with the same `thread_id` resumes execution at the exact stage where it paused.

---

## 7. Deterministic Engines & Modules

### 7.1 Document Classifier ([`app/extraction/classifier.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/extraction/classifier.py))
Classifies input documents into one of 15 canonical types:
- **Healthcare**: `insurance_policy`, `hospital_bill`, `eob_statement`, `physician_bill`, `lab_report`, `notice`.
- **DAO Governance**: `proposal`, `amendment`, `treasury_log`, `forum_thread`, `invoice`.
- **Talent Screening**: `resume`, `job_description`, `employment_verification`, `reference_check`.
- Features dual implementation: fast deterministic regex classification + async LLM classifier fallback.

### 7.2 Fact Extractor & Line Span Citation Engine ([`app/extraction/fact_extractor.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/extraction/fact_extractor.py))
- Parses currency amounts (`$2,900.00`, `45,000 USDC`), percentages, wallet addresses, and role requirements.
- Attaches exact source provenance: `f"{filename}:L{line_number}: '{line_quote}'"`.
- **Zero Bluffing Guarantee**: If evidence is missing, facts are omitted or marked unsupported rather than hallucinated.

### 7.3 Cross-Document Conflict Detector ([`app/extraction/conflict_detector.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/extraction/conflict_detector.py))
Surfaces multi-file contradictions:
- `contractual_rate_overcharge`: Hospital billed > EOB in-network allowed amount.
- `specialist_copay_overcharge`: Billed specialist consultation fee > Policy copay schedule limit.
- `illegal_balance_billing`: Out-of-network balance bill on emergency care.
- `delayed_ancillary_fee_conflict`: Late anesthesia bill exceeds primary EOB liability.
- `total_approved_budget`: Original proposal requested budget vs Ratified amendment cap.
- `invoice_escrow_overrun`: Invoice requested payment exceeds remaining milestone escrow balance.
- `title_inflation`, `experience_inflation`, `team_size_inflation`, `salary_budget_breach`: Resume claims vs HR verification.

### 7.4 Statutory & Charter Rules Engine ([`app/rules/checks.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/rules/checks.py))
Evaluates facts against legal and organizational playbooks:
- **Rule 1.1**: ACA Preventative Care $0 Cost-Sharing Mandate.
- **Rule 2.3**: In-network Specialist Co-pay Cap breach ($50.00 max).
- **Rule 3.1**: Federal **No Surprises Act** emergency balance billing prohibition.
- **Rule 4.1**: DAO Supermajority vote requirement (>= 66.7% YES for > 25,000 USDC requests).
- **Rule 5.1 (DAO)**: Initial disbursement <= 85% of approved budget (flags 40k/45k = 88.9%).
- **Rule 5.3 (DAO)**: Total disbursed amount <= Approved budget cap.
- **Rules 5.1 – 5.3 (Talent)**: Job budget cap, mandatory skills checklist, experience accuracy.

### 7.5 Defense-in-Depth Prompt Injection Guard ([`app/security/injection_guard.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/security/injection_guard.py))
Protects the pipeline against adversarial prompt injection embedded inside untrusted source documents:
1. **System Prompt Fencing**: Wraps all untrusted content inside `<untrusted_source_document>` XML boundary tags.
2. **Heuristic Pre-Filter**: Scans for imperative directives (`SYSTEM OVERRIDE:`, `IGNORE PREVIOUS RULES`, `MARK AS COMPLIANT`).
3. **Security Finding Ledger**: Directives are logged as active security threats (`Rule 9.1: Prompt Injection Security Alert`) and presented to the human reviewer for rejection.

### 7.6 Incremental Watcher Service ([`app/extraction/incremental_watcher.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/extraction/incremental_watcher.py))
- Continuously polls `./watched/` folder for new or modified files.
- Computes SHA-256 hashes to guarantee zero re-processing when files are unchanged.
- Synthesizes focused delta updates, detects newly surfaced contradictions against existing facts, and logs a full timestamped provenance audit trail.

---

## 8. Human-in-the-Loop Review Gate

The system requires human oversight before conclusions are finalized:
1. When analysis completes, the run status pauses at `awaiting_approval`.
2. All detected conflicts and rule violations are placed in a **Pending Review Queue**.
3. A human auditor reviews each item using the UI or REST API:
   - **Approve**: Confirms the finding/conflict is valid for the final audit deliverable.
   - **Reject**: Dismisses false positives or resolved discrepancies with optional notes.
4. When all items are decided, the state transitions to `committed` and the final Grounded Audit Deliverable is unlocked.

---

## 9. Machine Interface (FastMCP Server)

In addition to the REST API, the system implements a complete **Model Context Protocol (MCP)** server in [`app/mcp/server.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/mcp/server.py) using the `FastMCP` framework.

### Available MCP Tools:
1. **`upload_document(filename: str, raw_text: str, case_id: str)`**: Ingests and stores an untrusted document.
2. **`run_analysis(case_id: str, thread_id: str)`**: Triggers the LangGraph pipeline and returns initial findings.
3. **`review_findings(run_id: str)`**: Retrieves pending items awaiting human approval.
4. **`approve_item(run_id: str, item_id: str, action: str, notes: str)`**: Submits approve/reject decision for an item.
5. **`export_deliverable(run_id: str)`**: Exports the final verified audit deliverable.

---

## 10. Database Architecture & Data Models

Implemented with SQLAlchemy Async (`sqlite+aiosqlite:///./healthclaim.db` or PostgreSQL) in [`app/db/models.py`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/app/db/models.py).

### Core Tables:
- **`patient_cases` / `daos` (`PatientCaseModel`)**: Primary instances (e.g. `case-001-knee-surgery`, `treehouse-dao`, `job-001-senior-fullstack`).
- **`documents` (`DocumentModel`)**: Uploaded files with filename, doc_type, raw_text, and SHA-256 hash.
- **`facts` (`FactModel`)**: Extracted facts with field_name, value, confidence, source_doc_id, and line-level `source_span`.
- **`conflicts` (`ConflictModel`)**: Detected cross-document discrepancies with `values_json`, `status` (pending/approved/rejected), and reviewer notes.
- **`findings` (`FindingModel`)**: Rule violations and security alerts with rule_id, description, and source citations.
- **`runs` (`RunModel`)**: Execution state machine runs with `thread_id`, `status`, start/finish timestamps, and kill-resume flags.
- **`run_costs` (`RunCostModel`)**: Telemetry metrics per pipeline stage (`tokens_in`, `tokens_out`, `cost_usd`, `duration_ms`).
- **`change_logs` (`ChangeLogModel`)**: Incremental watcher provenance log.

---

## 11. REST API Endpoint Reference

All endpoints are hosted on `http://localhost:8000` with interactive Swagger docs at `/docs`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | System health check and API metadata |
| `GET` | `/cases` (or `/daos`) | List all active cases/DAOs and document counts |
| `POST` | `/cases` (or `/daos`) | Create a new case or DAO instance |
| `GET` | `/cases/{id}` | Get case metadata and associated documents |
| `GET` | `/documents?case_id={id}` | List documents for a given case |
| `POST` | `/documents?case_id={id}` | Upload multi-part files to a case |
| `GET` | `/documents/{id}/raw` | Retrieve raw document text |
| `POST` | `/runs` | Start a new LangGraph analysis run |
| `GET` | `/runs/{id}` | Get run status, stage progress, and pending review items |
| `POST` | `/runs/{id}/approve` | Approve or reject a specific pending item |
| `GET` | `/runs/{id}/cost` | Get stage-by-stage token and latency cost metrics |
| `GET` | `/runs/{id}/export` | Export verified Grounded Audit Register deliverable |

---

## 12. Frontend Architecture & UI Tour

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, and **Framer Motion** inside [`frontend/`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/frontend).

### UI Pages & Components:
1. **Sticky Pill Navbar ([`Navbar.tsx`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/frontend/src/components/Navbar.tsx))**: Fast switching between `🏥 HealthClaim Copilot`, `🏛️ DAO Governance`, `📄 TalentAudit Screener`, and `📖 How It Works`.
2. **Medical Case Hub ([`MedicalCaseHubPage.tsx`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/frontend/src/pages/MedicalCaseHubPage.tsx))**: Case directory, case creator modal, and medical reconciler workspace.
3. **DAO Governance Hub ([`DAOHubPage.tsx`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/frontend/src/pages/DAOHubPage.tsx))**: DAO proposal directory, charter scope creator, and governance conflict workspace.
4. **Talent Screener Hub ([`ResumeScreenerHubPage.tsx`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/frontend/src/pages/ResumeScreenerHubPage.tsx))**: Multi-candidate vetting pool with visual suitability scorecards and discrepancy matrices.
5. **Unified Pipeline Workspace ([`PipelineWorkspace.tsx`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/frontend/src/components/PipelineWorkspace.tsx))**:
   - **Document Pile Grid**: Upload dropzone and document type badges.
   - **Live LangGraph Stage Tracker**: Animated step progress (`Classify` ➔ `Extract` ➔ `Detect` ➔ `Rules` ➔ `Human Gate` ➔ `Commit`).
   - **Source Citation Inspector Modal**: Highlights cited lines directly on the original document text.
   - **Interactive Human Gate Ledger**: Item-by-item Approve / Reject action cards.
   - **Stage Telemetry Card**: Visual cost (USD) and execution latency (ms) meters.
   - **Export Center**: 1-click export to PDF (with jsPDF table styling) and Excel (.xlsx).
6. **Explainer Page ([`ExplainerPage.tsx`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/frontend/src/pages/ExplainerPage.tsx))**: Interactive guide explaining state machines, MCP integration, and prompt injection defense.

---

## 13. Cost & Latency Telemetry

Every execution tracks token usage and measured duration by stage:
- **`classify`**: ~25ms duration, token estimation.
- **`extract_facts`**: ~50ms duration, fact-level token tracking.
- **`detect_conflicts`**: ~30ms duration.
- **`check_rules`**: ~20ms duration.
- **`draft_register`**: ~15ms duration.
- Accessible via `/runs/{id}/cost` and rendered in the UI cost breakdown table.

---

## 14. Testing Strategy & Test Suite Breakdown

The repository contains **35 passing automated tests** in [`tests/`](file:///C:/Users/ajink/OneDrive/Desktop/personal%20-%20coding%20-%20ventures/superdocs/superdocs-assignment/tests) running 100% offline:

```
collected 35 items

tests/test_behavior_concurrency.py .                 [ 2%] -> Scoped session isolation
tests/test_behavior_cost_tracking.py .               [ 5%] -> Stage latency & cost recording
tests/test_behavior_dao_case.py ....                 [17%] -> DAO facts, budget conflicts, Rule 5.1
tests/test_behavior_household_case.py ....          [28%] -> ER surprise & No Surprises Act
tests/test_behavior_human_gate.py .                  [31%] -> Item-by-item human gate signoff
tests/test_behavior_mcp_server.py .                  [34%] -> FastMCP tools execution
tests/test_clean_corpus_no_findings.py .            [37%] -> Clean run zero-finding proof
tests/test_dao_instance_isolation.py .              [40%] -> Multi-case state isolation
tests/test_injection_resistance.py .                [42%] -> Prompt injection containment
tests/test_movement_1_understand_pile.py ...        [51%] -> Format ingestion & span extraction
tests/test_movement_2_examine_rules.py ..           [57%] -> Statutory compliance checking
tests/test_movement_3_stay_alive_incremental.py .   [60%] -> Watcher delta & zero re-run proof
tests/test_resume_after_kill.py .                   [62%] -> Kill-and-resume crash recovery
tests/test_resume_conflict_detection.py .....       [77%] -> Resume discrepancy detection
tests/test_resume_screener_facts.py ....            [88%] -> Talent credential fact extraction
tests/test_scoring_engine.py ....                   [100%] -> Candidate suitability scoring
```

---

## 15. Project Directory & File Map

```
superdocs-assignment/
├── app/
│   ├── api/
│   │   ├── routes_cases.py          # Case & DAO CRUD endpoints
│   │   ├── routes_upload.py         # Multi-part document upload & hashing
│   │   ├── routes_run.py            # LangGraph execution trigger & status
│   │   ├── routes_approve.py        # Item-by-item Human Review Gate
│   │   ├── routes_cost.py           # Stage cost & latency breakdown
│   │   └── routes_export.py         # Grounded audit deliverable export
│   ├── db/
│   │   ├── models.py                # SQLAlchemy declarative models
│   │   └── session.py               # Async DB engine & automatic seed loader
│   ├── extraction/
│   │   ├── classifier.py            # 15-type document classifier
│   │   ├── fact_extractor.py        # Grounded fact extractor with source spans
│   │   ├── conflict_detector.py     # Cross-document conflict matrix
│   │   ├── incremental_watcher.py   # Watcher service for ./watched/ deltas
│   │   └── scoring.py               # Candidate talent suitability scorer
│   ├── graph/
│   │   ├── build_graph.py           # LangGraph StateGraph pipeline builder
│   │   ├── nodes.py                 # Pipeline execution node functions
│   │   ├── edges.py                 # Conditional routing & human escalation
│   │   └── state.py                 # TypedDict GraphState definition
│   ├── llm/
│   │   └── client.py                # Unified LLM caller (Mock / NVIDIA NIM / OpenAI)
│   ├── mcp/
│   │   └── server.py                # FastMCP Machine Interface Server
│   ├── rules/
│   │   └── checks.py                # Deterministic compliance rule engine
│   ├── security/
│   │   └── injection_guard.py       # Prompt injection fencer & scanner
│   ├── config.py                    # Pydantic BaseSettings configuration
│   └── main.py                      # FastAPI app entry point & lifespan
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts            # Typed API client for FastAPI backend
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Sticky pill top navigation bar
│   │   │   └── PipelineWorkspace.tsx# Shared execution workspace component
│   │   ├── pages/
│   │   │   ├── MedicalCaseHubPage.tsx   # HealthClaim Copilot workspace
│   │   │   ├── DAOHubPage.tsx           # DAO Governance Analyst workspace
│   │   │   ├── ResumeScreenerHubPage.tsx# TalentAudit Candidate Screener
│   │   │   └── ExplainerPage.tsx        # Interactive Architecture Explainer
│   │   ├── utils/
│   │   │   ├── exportReport.ts      # PDF & Excel export generator
│   │   │   └── exportResumeReport.ts# Resume audit export generator
│   │   ├── App.tsx                  # Main route view container
│   │   └── main.tsx                 # React DOM mount point
│   ├── package.json
│   └── vite.config.ts
│
├── seed_data/
│   ├── case-001-knee-surgery/       # Sarah Jenkins medical case files
│   ├── case-002-clean-wellness/     # Clean preventative checkup files
│   ├── case-003-er-surprise/        # Michael Chang emergency balance bill files
│   ├── case-001-treehouse/          # DAO Proposal #042 audit files
│   ├── case-002-clean/              # Clean DAO proposal files
│   ├── case-003-solaris/            # Solaris microgrid proposal files
│   ├── job-001-senior-fullstack/    # Candidate screening pool files
│   └── rules/                       # Statutory and DAO charter rule playbooks
│
├── watched/                         # Live watcher folder for delta documents
│   ├── anesthesiology_delayed_bill.md
│   ├── contractor_invoice_final.md
│   └── late_reference_alex_miller.md
│
├── tests/                           # 35 keyless offline test files
├── Makefile                         # Setup and run shortcuts
├── pyproject.toml                   # Pytest and packaging configuration
├── requirements.txt                 # Backend Python dependencies
└── context1.md                      # This master context documentation file
```

---

## 16. How to Run (Quickstart Guide)

### 1. Run Automated Test Suite (35 Tests)
```bash
.venv/Scripts/python.exe -m pytest -v
```

### 2. Start the Backend API Server
```powershell
# Windows
.\.venv\Scripts\Activate.ps1
python -m app.main
```
- **API URL**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Start the Frontend React UI
```powershell
cd frontend
npm run dev
```
- **UI URL**: [http://localhost:5173](http://localhost:5173)

### 4. Drive via FastMCP Server
Run the MCP server to connect an AI agent or Claude Desktop:
```bash
python -m app.mcp.server
```
