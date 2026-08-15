# Progress & Decision Log — DAO Governance Conflict Analyst

## Assumptions Log & Architectural Trade-offs

1. **Disbursement Status vs Violation**:
   - *Assumption*: "Disbursed amount < Approved budget" is logged as an ongoing milestone status note, whereas "Disbursed amount > Approved budget" is logged as a severe Rule 5.3 compliance violation.

2. **Prompt Injection Defense Strategy**:
   - *Decision*: Prompt injection protection is implemented at two independent defense layers:
     1. System Prompt Fencing: Raw text is wrapped strictly inside `<untrusted_source_document>` XML tags.
     2. Heuristic Pre-Filter: `scan_for_prompt_injection()` scans text for imperative directives (e.g. `SYSTEM OVERRIDE`) and logs them as security findings rather than executing them.

3. **Keyless / Offline Deterministic Testing**:
   - *Decision*: Pytest test suite uses mock LLM drivers and deterministic response fixtures so anyone can test kill-resume, prompt injection, and clean corpus runs without live API keys.
