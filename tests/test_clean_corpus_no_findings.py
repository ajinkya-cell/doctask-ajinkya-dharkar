import os
import pytest
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts
from app.rules.checks import evaluate_compliance_rules

def test_clean_corpus_zero_findings():
    clean_dir = "seed_data/case-002-clean-wellness"
    if not os.path.exists(clean_dir):
        pytest.skip("Seed dir not found")
        
    facts = []
    docs = []
    for fname in os.listdir(clean_dir):
        fpath = os.path.join(clean_dir, fname)
        if os.path.isfile(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                text = f.read()
            doc_type = classify_document(fname, text)
            docs.append({"id": fname, "filename": fname, "doc_type": doc_type, "raw_text": text})
            facts.extend(extract_facts_from_doc(fname, fname, doc_type, text))
            
    conflicts = detect_cross_document_conflicts(facts)
    findings = evaluate_compliance_rules("PAT-DAVID-101", facts, conflicts, docs)
    
    # Behavior #7: Honest zero findings on compliant routine wellness checkup
    assert len(conflicts) == 0
    assert len(findings) == 0
