import pytest
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts

def test_document_classification():
    assert classify_document("health_insurance_policy_gold.md", "Policy ID POL-APEX-7720 in-network specialist co-pay $50.00") == "insurance_policy"
    assert classify_document("hospital_itemized_bill_may2026.md", "Hospital itemized bill total billed charges $2,900.00") == "hospital_bill"
    assert classify_document("insurance_eob_may2026.json", '{"insurance_allowed_amount": 650.0}') == "eob_statement"
    assert classify_document("anesthesiology_delayed_bill.md", "Delayed Ancillary Physician bill $800.00") == "physician_bill"

def test_fact_extraction_with_spans():
    policy_text = """
    # Health Insurance Policy
    - Specialist Consultation Co-pay: $50.00
    - Annual Individual Deductible: $1,500.00
    """
    facts = extract_facts_from_doc("doc_1", "health_insurance_policy_gold.md", "insurance_policy", policy_text)
    assert len(facts) >= 2
    fields = {f["field_name"]: f for f in facts}
    
    assert "copay_specialist" in fields
    assert fields["copay_specialist"]["value"] == "50.00"
    assert "health_insurance_policy_gold.md:L3:" in fields["copay_specialist"]["source_span"]

def test_cross_document_conflict_detection():
    facts = [
        {
            "proposal_id": "PAT-SARAH-042",
            "field_name": "hospital_billed_total",
            "value": "2900.00",
            "source_doc_id": "doc_1",
            "source_span": "hospital_itemized_bill_may2026.md:L10: '$2,900.00'"
        },
        {
            "proposal_id": "PAT-SARAH-042",
            "field_name": "insurance_allowed_amount",
            "value": "650.00",
            "source_doc_id": "doc_2",
            "source_span": "insurance_eob_may2026.json: 'insurance_allowed_amount': 650.0"
        },
        {
            "proposal_id": "PAT-SARAH-042",
            "field_name": "patient_responsibility_eob",
            "value": "50.00",
            "source_doc_id": "doc_2",
            "source_span": "insurance_eob_may2026.json: 'patient_responsibility_total': 50.0"
        }
    ]
    conflicts = detect_cross_document_conflicts(facts)
    assert len(conflicts) >= 1
    assert conflicts[0]["field_name"] == "contractual_rate_overcharge"
