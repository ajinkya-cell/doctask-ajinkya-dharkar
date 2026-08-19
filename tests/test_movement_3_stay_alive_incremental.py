import os
import pytest
from app.extraction.incremental_watcher import IncrementalWatcher

def test_incremental_document_watcher(tmp_path):
    watch_folder = tmp_path / "watched"
    watch_folder.mkdir()
    
    watcher = IncrementalWatcher(str(watch_folder))
    
    # Step 1: Initial empty poll
    docs_step1 = watcher.check_for_new_documents()
    assert len(docs_step1) == 0
    
    # Step 2: Drop delayed anesthesiology bill
    delayed_bill = watch_folder / "anesthesiology_delayed_bill.md"
    delayed_bill.write_text("# Delayed Ancillary Physician Bill\nTotal Anesthesia Requested Amount: $800.00\nPatient Name: PAT-SARAH-042", encoding="utf-8")
    
    docs_step2 = watcher.check_for_new_documents()
    assert len(docs_step2) == 1
    assert docs_step2[0]["doc_type"] == "physician_bill"
    
    # Step 3: Zero re-runs when unchanged
    docs_step3 = watcher.check_for_new_documents()
    assert len(docs_step3) == 0
    
    # Step 4: Incremental delta processing
    existing_facts = [
        {"proposal_id": "PAT-SARAH-042", "field_name": "patient_responsibility_eob", "value": "50.00", "source_doc_id": "eob_1", "source_span": "eob: $50"}
    ]
    delta_result = watcher.process_incremental_delta(docs_step2[0], existing_facts)
    assert len(delta_result["change_events"]) >= 1
    assert len(delta_result["new_conflicts"]) >= 1
    assert delta_result["new_conflicts"][0]["field_name"] == "delayed_ancillary_fee_conflict"
