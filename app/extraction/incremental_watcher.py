import os
import time
import hashlib
from typing import Dict, Any, List
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts

class IncrementalWatcher:
    def __init__(self, watch_dir: str = "./watched"):
        self.watch_dir = watch_dir
        self.processed_hashes: Dict[str, str] = {}  # filepath -> sha256
        
    def check_for_new_documents(self) -> List[Dict[str, Any]]:
        """
        Polls the watch directory for newly arrived documents.
        Returns newly detected document payloads.
        """
        if not os.path.exists(self.watch_dir):
            os.makedirs(self.watch_dir, exist_ok=True)
            
        new_docs = []
        for filename in os.listdir(self.watch_dir):
            filepath = os.path.join(self.watch_dir, filename)
            if os.path.isfile(filepath):
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                doc_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                
                if filepath not in self.processed_hashes or self.processed_hashes[filepath] != doc_hash:
                    self.processed_hashes[filepath] = doc_hash
                    doc_type = classify_document(filename, content)
                    new_docs.append({
                        "id": f"watched_{doc_hash[:8]}",
                        "filename": filename,
                        "doc_type": doc_type,
                        "raw_text": content,
                        "sha256": doc_hash
                    })
        return new_docs

    def process_incremental_delta(
        self,
        new_doc: Dict[str, Any],
        existing_facts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Computes an incremental delta update for a new document without re-running existing documents.
        """
        new_facts = extract_facts_from_doc(
            new_doc["id"],
            new_doc["filename"],
            new_doc["doc_type"],
            new_doc["raw_text"]
        )
        
        combined_facts = existing_facts + new_facts
        updated_conflicts = detect_cross_document_conflicts(combined_facts)
        
        change_events = []
        for fact in new_facts:
            change_events.append({
                "proposal_id": fact["proposal_id"],
                "field_name": fact["field_name"],
                "new_value": fact["value"],
                "source_doc_id": new_doc["id"],
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            })
            
        return {
            "new_facts": new_facts,
            "updated_conflicts": updated_conflicts,
            "new_conflicts": updated_conflicts,
            "change_events": change_events
        }
