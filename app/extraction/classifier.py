import re
from typing import Dict, Any

def classify_document(filename: str, raw_text: str) -> str:
    """
    Classifies a document into:
    - DAO Domain: proposal, amendment, treasury_log, forum_thread, charter, invoice
    - Household Domain: agreement, subscription, bill, bank_statement, policy, notice
    """
    fname_lower = filename.lower()
    text_lower = raw_text.lower()
    
    # 1. Policies & Charters
    if "charter" in fname_lower or "governance charter" in text_lower:
        return "charter"
    if "policy" in fname_lower or "budget policy" in text_lower:
        return "policy"
        
    # 2. Financial Statements & Treasury Logs
    if "statement" in fname_lower or "account statement" in text_lower or "transaction postings" in text_lower:
        return "bank_statement"
    if fname_lower.endswith(".json") or "tx_hash" in text_lower or "amount_disbursed" in text_lower:
        return "treasury_log"
        
    # 3. Agreements & Subscriptions
    if "agreement" in fname_lower or "service agreement" in text_lower or "contract term" in text_lower:
        return "agreement"
    if "sub_confirmation" in fname_lower or "subscription" in text_lower or "streamplus" in text_lower:
        return "subscription"
        
    # 4. Invoices & Bills
    if "bill" in fname_lower or "monthly invoice" in text_lower or "billed amount" in text_lower:
        return "bill"
    if "invoice" in fname_lower or "invoice number" in text_lower:
        return "invoice"
        
    # 5. Amendments & Proposals
    if "amend" in fname_lower or "amendment #" in text_lower:
        return "amendment"
    if "prop" in fname_lower or "proposal #" in text_lower or "governance proposal" in text_lower:
        return "proposal"
        
    # 6. Notices & Discussions
    if "notice" in fname_lower or "utility notice" in text_lower or "rate adjustment" in text_lower:
        return "notice"
    if "forum" in fname_lower or "thread" in fname_lower or "discourse" in text_lower:
        return "forum_thread"
        
    return "unknown"
