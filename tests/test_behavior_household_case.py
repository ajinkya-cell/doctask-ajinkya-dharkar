import os
import pytest
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts
from app.rules.checks import evaluate_compliance_rules
from app.extraction.incremental_watcher import IncrementalWatcher

HOUSEHOLD_DIR = "seed_data/case-004-household"

def test_household_corpus_upload_classify():
    """Verify all household corpus files classify into their exact document types."""
    assert classify_document("internet_plan_agreement_2025.md", "Service Agreement $59.00 / month") == "agreement"
    assert classify_document("streaming_sub_confirmation.txt", "StreamPlus Subscription Confirmation") == "subscription"
    assert classify_document("internet_bill_mar_2026.md", "Monthly Invoice Billed Amount $79.00") == "bill"
    assert classify_document("bank_statement_mar_2026.txt", "Account Statement Transaction Postings") == "bank_statement"
    assert classify_document("budget_policy.md", "Household Financial Budget Policy") == "policy"
    assert classify_document("malicious_utility_notice.txt", "Metro Utility Notice") == "notice"

def test_household_facts_extracted_with_spans():
    """Verify exact line citations are captured for rates, fees, and bill amounts."""
    # 1. Agreement
    with open(os.path.join(HOUSEHOLD_DIR, "internet_plan_agreement_2025.md"), "r", encoding="utf-8") as f:
        ag_text = f.read()
    ag_facts = extract_facts_from_doc("doc_ag", "internet_plan_agreement_2025.md", "agreement", ag_text)
    rate_fact = next(f for f in ag_facts if f["field_name"] == "agreed_monthly_rate")
    assert rate_fact["value"] == "59.00"
    assert "internet_plan_agreement_2025.md:L" in rate_fact["source_span"]

    # 2. Bill
    with open(os.path.join(HOUSEHOLD_DIR, "internet_bill_mar_2026.md"), "r", encoding="utf-8") as f:
        bill_text = f.read()
    bill_facts = extract_facts_from_doc("doc_bill", "internet_bill_mar_2026.md", "bill", bill_text)
    billed_fact = next(f for f in bill_facts if f["field_name"] == "billed_amount")
    assert billed_fact["value"] == "79.00"
    assert "internet_bill_mar_2026.md:L" in billed_fact["source_span"]

def test_household_conflicts_detected():
    """Verify price-hike and duplicate charge conflicts are detected."""
    all_facts = []
    for fname in ["internet_plan_agreement_2025.md", "internet_bill_mar_2026.md", "bank_statement_mar_2026.txt"]:
        with open(os.path.join(HOUSEHOLD_DIR, fname), "r", encoding="utf-8") as f:
            text = f.read()
        dtype = classify_document(fname, text)
        all_facts.extend(extract_facts_from_doc(fname, fname, dtype, text))

    conflicts = detect_cross_document_conflicts(all_facts)
    conflict_fields = [c["field_name"] for c in conflicts]
    
    assert "price_hike_without_notice" in conflict_fields
    assert "duplicate_charge" in conflict_fields
    
    hike = next(c for c in conflicts if c["field_name"] == "price_hike_without_notice")
    assert "79.00" in hike["description"]
    assert "59.00" in hike["description"]

def test_household_rules_findings():
    """Verify Rule 6.1 (unnotified rate hike) and Rule 6.2 (recurring budget cap) trigger."""
    all_facts = []
    for fname in ["internet_plan_agreement_2025.md", "internet_bill_mar_2026.md", "bank_statement_mar_2026.txt"]:
        with open(os.path.join(HOUSEHOLD_DIR, fname), "r", encoding="utf-8") as f:
            text = f.read()
        dtype = classify_document(fname, text)
        all_facts.extend(extract_facts_from_doc(fname, fname, dtype, text))

    conflicts = detect_cross_document_conflicts(all_facts)
    findings = evaluate_compliance_rules("ACC-FIBER-992", all_facts, conflicts, [])
    
    rule_ids = [f["rule_id"] for f in findings]
    assert "6.1" in rule_ids
    assert "6.2" in rule_ids

def test_household_watcher_incremental():
    """Movement 3: Incremental delta computed when April bill arrives."""
    apr_bill_path = os.path.join(HOUSEHOLD_DIR, "watched", "internet_bill_apr_2026.md")
    with open(apr_bill_path, "r", encoding="utf-8") as f:
        apr_content = f.read()

    watcher = IncrementalWatcher()
    new_doc = {
        "id": "doc_apr",
        "filename": "internet_bill_apr_2026.md",
        "doc_type": "bill",
        "raw_text": apr_content
    }

    existing_facts = [
        {"proposal_id": "ACC-FIBER-992", "field_name": "agreed_monthly_rate", "value": "59.00", "source_doc_id": "d1", "source_span": "agreement.md:L10"}
    ]

    delta = watcher.process_incremental_delta(new_doc, existing_facts)
    assert len(delta["new_facts"]) == 1
    assert delta["new_facts"][0]["field_name"] == "billed_amount"
    assert delta["new_facts"][0]["value"] == "79.00"
    
    # Conflict re-asserted: $79 vs $59
    assert len(delta["updated_conflicts"]) == 1
    assert delta["updated_conflicts"][0]["field_name"] == "price_hike_without_notice"
