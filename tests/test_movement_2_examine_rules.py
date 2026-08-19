import pytest
from app.rules.checks import evaluate_compliance_rules

def test_rule_2_3_specialist_copay_cap():
    facts = [
        {
            "proposal_id": "PAT-SARAH-042",
            "field_name": "copay_specialist",
            "value": "50.00",
            "source_doc_id": "doc_policy",
            "source_span": "health_insurance_policy_gold.md:L10"
        },
        {
            "proposal_id": "PAT-SARAH-042",
            "field_name": "copay_specialist_charged",
            "value": "150.00",
            "source_doc_id": "doc_bill",
            "source_span": "hospital_itemized_bill_may2026.md:L9: '$150.00'"
        }
    ]
    findings = evaluate_compliance_rules("PAT-SARAH-042", facts, [], [])
    rule_2_3_findings = [f for f in findings if f["rule_id"] == "2.3"]
    assert len(rule_2_3_findings) == 1
    assert "Rule 2.3 Violation" in rule_2_3_findings[0]["description"]

def test_rule_3_1_no_surprises_act_balance_billing():
    facts = [
        {
            "proposal_id": "PAT-CHANG-884",
            "field_name": "balance_bill_amount",
            "value": "1800.00",
            "source_doc_id": "doc_oon",
            "source_span": "out_of_network_physician_balance_bill.md:L9: '$1,800.00'"
        }
    ]
    findings = evaluate_compliance_rules("PAT-CHANG-884", facts, [], [])
    rule_3_1_findings = [f for f in findings if f["rule_id"] == "3.1"]
    assert len(rule_3_1_findings) == 1
    assert "No Surprises Act" in rule_3_1_findings[0]["description"]
