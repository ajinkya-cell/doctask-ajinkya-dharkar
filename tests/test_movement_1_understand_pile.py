import pytest
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts

def test_document_classification():
    assert classify_document("DAO-PROP-042.md", "Proposal DAO-PROP-042 requesting funds") == "proposal"
    assert classify_document("DAO-AMEND-042b.md", "Revised total approved budget") == "amendment"
    assert classify_document("treasury_tx.json", '{"transaction_id": "TX-101"}') == "treasury_log"
    assert classify_document("forum_thread.txt", "Delegate discussion thread") == "forum_thread"
    assert classify_document("contractor_invoice.md", "Requested Payment Amount") == "invoice"
    assert classify_document("dao_charter.md", "# DAO Charter & Rules") == "charter"

def test_fact_extraction_with_spans():
    prop_text = "Proposal DAO-PROP-042\nTotal Requested Amount: 50,000 USDC\nRecipient wallet address: 0x71A982C318F923"
    facts = extract_facts_from_doc("doc_1", "DAO-PROP-042.md", "proposal", prop_text)
    
    fields = {f["field_name"]: f for f in facts}
    assert "requested_budget" in fields
    assert fields["requested_budget"]["value"] == "50000"
    assert "source_span" in fields["requested_budget"]
    assert "DAO-PROP-042.md:L2" in fields["requested_budget"]["source_span"]

def test_cross_document_conflict_detection():
    facts = [
        {
            "proposal_id": "DAO-PROP-042",
            "field_name": "requested_budget",
            "value": "50000",
            "source_doc_id": "doc_1",
            "source_span": "DAO-PROP-042.md:L2: '50,000 USDC'"
        },
        {
            "proposal_id": "DAO-PROP-042",
            "field_name": "approved_budget",
            "value": "45000",
            "source_doc_id": "doc_2",
            "source_span": "DAO-AMEND-042b.md:L3: '45,000 USDC'"
        }
    ]
    conflicts = detect_cross_document_conflicts(facts)
    assert len(conflicts) == 1
    assert conflicts[0]["field_name"] == "total_approved_budget"
    assert "50000 USDC" in conflicts[0]["description"]
    assert "45000 USDC" in conflicts[0]["description"]
