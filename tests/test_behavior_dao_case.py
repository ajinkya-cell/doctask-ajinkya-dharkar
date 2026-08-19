import os
import pytest
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts
from app.rules.checks import evaluate_compliance_rules

TREEHOUSE_DIR = "seed_data/case-001-treehouse"

def test_dao_treehouse_classification():
    """Verify DAO proposal documents classify into appropriate types."""
    assert classify_document("DAO-PROP-042-treehouse.md", "Requested amount 50,000 USDC") == "proposal"
    assert classify_document("DAO-AMEND-042b.md", "Revised total approved budget 45,000 USDC") == "amendment"
    assert classify_document("treasury_tx_2026_Q2.json", '{"amount_disbursed": 40000}') == "treasury_log"
    assert classify_document("delegate_comments_thread.txt", "Delegate voted YES on 45,000 cap") == "forum_thread"
    assert classify_document("contractor_invoice_final.md", "Requested payment amount 10,000 USDC") == "invoice"

def test_dao_treehouse_fact_extraction():
    """Verify structured facts with line spans are extracted from proposal and amendment."""
    if not os.path.exists(TREEHOUSE_DIR):
        pytest.skip("Treehouse dir not found")
        
    with open(os.path.join(TREEHOUSE_DIR, "DAO-PROP-042-treehouse.md"), "r", encoding="utf-8") as f:
        prop_text = f.read()
    prop_facts = extract_facts_from_doc("doc_prop", "DAO-PROP-042-treehouse.md", "proposal", prop_text)
    
    req_fact = next(f for f in prop_facts if f["field_name"] == "requested_budget")
    assert req_fact["value"] == "50000"
    assert "DAO-PROP-042-treehouse.md:L" in req_fact["source_span"]

    with open(os.path.join(TREEHOUSE_DIR, "DAO-AMEND-042b.md"), "r", encoding="utf-8") as f:
        amend_text = f.read()
    amend_facts = extract_facts_from_doc("doc_amend", "DAO-AMEND-042b.md", "amendment", amend_text)
    
    app_fact = next(f for f in amend_facts if f["field_name"] == "approved_budget")
    assert app_fact["value"] == "45000"
    assert "DAO-AMEND-042b.md:L" in app_fact["source_span"]

def test_dao_treehouse_budget_conflict():
    """Verify cross-proposal conflict (50k original vs 45k ratified cap) is detected."""
    if not os.path.exists(TREEHOUSE_DIR):
        pytest.skip("Treehouse dir not found")
        
    all_facts = []
    for fname in ["DAO-PROP-042-treehouse.md", "DAO-AMEND-042b.md"]:
        with open(os.path.join(TREEHOUSE_DIR, fname), "r", encoding="utf-8") as f:
            text = f.read()
        dtype = classify_document(fname, text)
        all_facts.extend(extract_facts_from_doc(fname, fname, dtype, text))

    conflicts = detect_cross_document_conflicts(all_facts)
    conflict_fields = [c["field_name"] for c in conflicts]
    
    assert "total_approved_budget" in conflict_fields
    b_conf = next(c for c in conflicts if c["field_name"] == "total_approved_budget")
    assert "50000" in b_conf["description"]
    assert "45000" in b_conf["description"]

def test_dao_rule_5_1_payout_cap_violation():
    """Verify Rule 5.1 triggers when initial payout (40k/45k = 88.9%) exceeds 85% cap."""
    if not os.path.exists(TREEHOUSE_DIR):
        pytest.skip("Treehouse dir not found")
        
    all_facts = []
    for fname in ["DAO-PROP-042-treehouse.md", "DAO-AMEND-042b.md"]:
        with open(os.path.join(TREEHOUSE_DIR, fname), "r", encoding="utf-8") as f:
            text = f.read()
        dtype = classify_document(fname, text)
        all_facts.extend(extract_facts_from_doc(fname, fname, dtype, text))

    findings = evaluate_compliance_rules("DAO-PROP-042", all_facts, [], [])
    rule_5_1_findings = [f for f in findings if f["rule_id"] == "5.1"]
    
    assert len(rule_5_1_findings) == 1
    assert "88.9%" in rule_5_1_findings[0]["description"]
