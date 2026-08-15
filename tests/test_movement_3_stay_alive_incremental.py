import os
import tempfile
import pytest
from app.extraction.incremental_watcher import IncrementalWatcher

def test_incremental_document_watcher():
    with tempfile.TemporaryDirectory() as tmp_dir:
        watcher = IncrementalWatcher(watch_dir=tmp_dir)
        
        # 1. No documents initially
        docs_step1 = watcher.check_for_new_documents()
        assert len(docs_step1) == 0
        
        # 2. Add a new document into watch directory
        invoice_path = os.path.join(tmp_dir, "contractor_invoice_final.md")
        with open(invoice_path, "w", encoding="utf-8") as f:
            f.write("# Contractor Final Invoice\nRequested Payment Amount: 10,000 USDC")
            
        docs_step2 = watcher.check_for_new_documents()
        assert len(docs_step2) == 1
        assert docs_step2[0]["doc_type"] == "invoice"
        
        # 3. Check again without modifying file - should detect 0 new documents (no unneeded re-runs)
        docs_step3 = watcher.check_for_new_documents()
        assert len(docs_step3) == 0
        
        # 4. Compute incremental delta against existing facts
        existing_facts = [
            {"proposal_id": "DAO-PROP-042", "field_name": "approved_budget", "value": "45000", "source_doc_id": "d1", "source_span": "s1"},
            {"proposal_id": "DAO-PROP-042", "field_name": "disbursed_amount", "value": "40000", "source_doc_id": "d2", "source_span": "s2"}
        ]
        
        delta = watcher.process_incremental_delta(docs_step2[0], existing_facts)
        assert len(delta["new_facts"]) == 1
        assert delta["new_facts"][0]["field_name"] == "invoice_requested_amount"
        assert delta["new_facts"][0]["value"] == "10000"
        
        # Surfaced contradiction: 10,000 requested invoice exceeds 5,000 remaining escrow limit
        assert len(delta["updated_conflicts"]) == 1
        assert delta["updated_conflicts"][0]["field_name"] == "invoice_escrow_overrun"
