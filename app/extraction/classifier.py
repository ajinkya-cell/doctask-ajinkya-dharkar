import re
from typing import Dict, Any

def classify_document(filename: str, raw_text: str) -> str:
    """
    Classifies a document into proposal, amendment, treasury_log, forum_thread, charter, or invoice.
    """
    fname_lower = filename.lower()
    text_lower = raw_text.lower()
    
    if "charter" in fname_lower or "governance charter" in text_lower:
        return "charter"
    if "invoice" in fname_lower or "invoice number" in text_lower:
        return "invoice"
    if fname_lower.endswith(".json") or "tx_hash" in text_lower or "amount_disbursed" in text_lower:
        return "treasury_log"
    if "amend" in fname_lower or "amendment #" in text_lower:
        return "amendment"
    if "prop" in fname_lower or "proposal #" in text_lower or "governance proposal" in text_lower:
        return "proposal"
    if "forum" in fname_lower or "thread" in fname_lower or "discourse" in text_lower:
        return "forum_thread"
        
    return "unknown"
