import pytest
from app.rules.checks import evaluate_compliance_rules

def test_rule_5_1_initial_payout_threshold():
    facts = [
        {
            "proposal_id": "DAO-PROP-042",
            "field_name": "approved_budget",
            "value": "45000",
            "source_doc_id": "doc_amend",
            "source_span": "DAO-AMEND-042b.md:L3"
        },
        {
            "proposal_id": "DAO-PROP-042",
            "field_name": "initial_payout",
            "value": "40000",  # 40000 / 45000 = 88.9% > 85% threshold
            "source_doc_id": "doc_amend",
            "source_span": "DAO-AMEND-042b.md:L4"
        }
    ]
    findings = evaluate_compliance_rules("DAO-PROP-042", facts, [], [])
    rule_5_1_findings = [f for f in findings if f["rule_id"] == "5.1"]
    assert len(rule_5_1_findings) == 1
    assert "exceeding the 85% maximum threshold" in rule_5_1_findings[0]["description"]

def test_rule_5_3_disbursement_overrun():
    facts = [
        {
            "proposal_id": "DAO-PROP-042",
            "field_name": "approved_budget",
            "value": "45000",
            "source_doc_id": "doc_amend",
            "source_span": "DAO-AMEND-042b.md:L3"
        },
        {
            "proposal_id": "DAO-PROP-042",
            "field_name": "disbursed_amount",
            "value": "48000",  # 48,000 > 45,000 approved budget
            "source_doc_id": "doc_tx",
            "source_span": "treasury_tx.json:L5"
        }
    ]
    findings = evaluate_compliance_rules("DAO-PROP-042", facts, [], [])
    rule_5_3_findings = [f for f in findings if f["rule_id"] == "5.3"]
    assert len(rule_5_3_findings) == 1
    assert "exceeds approved budget cap" in rule_5_3_findings[0]["description"]
