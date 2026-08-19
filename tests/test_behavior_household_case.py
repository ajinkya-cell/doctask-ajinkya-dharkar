import os
import pytest
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts
from app.rules.checks import evaluate_compliance_rules

ER_DIR = "seed_data/case-003-er-surprise"

def test_er_case_upload_classify():
    """Verify all emergency case files classify into their exact document types."""
    assert classify_document("health_insurance_er_policy.md", "Emergency Services Co-pay $250.00") == "insurance_policy"
    assert classify_document("er_hospital_itemized_bill.md", "Emergency Room Level 5 Facility Visit $1,200.00") == "hospital_bill"
    assert classify_document("insurance_eob_er.json", '{"insurance_allowed_amount": 1400.0}') == "eob_statement"
    assert classify_document("out_of_network_physician_balance_bill.md", "Out-of-Network Balance Billing Amount $1,800.00") == "physician_bill"

def test_er_case_facts_extracted_with_spans():
    """Verify exact line citations are captured for emergency room charges and co-pays."""
    if not os.path.exists(ER_DIR):
        pytest.skip("ER dir not found")
        
    with open(os.path.join(ER_DIR, "health_insurance_er_policy.md"), "r", encoding="utf-8") as f:
        pol_text = f.read()
    facts = extract_facts_from_doc("doc_pol", "health_insurance_er_policy.md", "insurance_policy", pol_text)
    copay_fact = next(f for f in facts if f["field_name"] == "copay_er")
    assert copay_fact["value"] == "250.00"
    assert "health_insurance_er_policy.md:L" in copay_fact["source_span"]

def test_er_case_balance_billing_conflict():
    """Verify No Surprises Act balance billing conflict is detected."""
    if not os.path.exists(ER_DIR):
        pytest.skip("ER dir not found")
        
    all_facts = []
    for fname in ["health_insurance_er_policy.md", "out_of_network_physician_balance_bill.md"]:
        with open(os.path.join(ER_DIR, fname), "r", encoding="utf-8") as f:
            text = f.read()
        dtype = classify_document(fname, text)
        all_facts.extend(extract_facts_from_doc(fname, fname, dtype, text))

    conflicts = detect_cross_document_conflicts(all_facts)
    conflict_fields = [c["field_name"] for c in conflicts]
    
    assert "illegal_balance_billing" in conflict_fields
    bb = next(c for c in conflicts if c["field_name"] == "illegal_balance_billing")
    assert "1800.00" in bb["description"]

def test_er_case_rule_3_1_finding():
    """Verify Rule 3.1 (No Surprises Act balance billing prohibition) triggers."""
    if not os.path.exists(ER_DIR):
        pytest.skip("ER dir not found")
        
    all_facts = []
    for fname in ["health_insurance_er_policy.md", "out_of_network_physician_balance_bill.md"]:
        with open(os.path.join(ER_DIR, fname), "r", encoding="utf-8") as f:
            text = f.read()
        dtype = classify_document(fname, text)
        all_facts.extend(extract_facts_from_doc(fname, fname, dtype, text))

    conflicts = detect_cross_document_conflicts(all_facts)
    findings = evaluate_compliance_rules("PAT-CHANG-884", all_facts, conflicts, [])
    
    rule_3_1 = [f for f in findings if f["rule_id"] == "3.1"]
    assert len(rule_3_1) == 1
    assert "1800.00" in rule_3_1[0]["description"]
