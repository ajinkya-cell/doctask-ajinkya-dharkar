import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts

def test_solaris_case():
    folder = "seed_data/case-003-solaris"
    all_facts = []
    
    print(f"[*] Testing 5 files in {folder}:")
    for f in os.listdir(folder):
        filepath = os.path.join(folder, f)
        with open(filepath, "r", encoding="utf-8") as fp:
            content = fp.read()
        doc_type = classify_document(f, content)
        facts = extract_facts_from_doc(f, f, doc_type, content)
        all_facts.extend(facts)
        print(f"  - [{doc_type.upper()}] {f} -> {len(facts)} facts extracted")
        
    conflicts = detect_cross_document_conflicts(all_facts)
    print(f"\n[+] Total facts extracted: {len(all_facts)}")
    print(f"[+] Total cross-document conflicts detected: {len(conflicts)}")
    for c in conflicts:
        print(f"  * {c['field_name']}: {c['description']}")

if __name__ == "__main__":
    test_solaris_case()
