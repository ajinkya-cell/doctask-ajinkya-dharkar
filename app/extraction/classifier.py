import re
from typing import Tuple
from app.config import settings
from app.llm.client import call_llm

VALID_DOC_TYPES = [
    "insurance_policy",
    "hospital_bill",
    "eob_statement",
    "physician_bill",
    "lab_report",
    "notice",
    "proposal",
    "amendment",
    "treasury_log",
    "forum_thread",
    "invoice",
    "resume",
    "job_description",
    "employment_verification",
    "reference_check",
    "unknown"
]

def classify_document_regex(filename: str, raw_text: str) -> str:
    """
    Classifies a healthcare, DAO, or talent document into standard types.
    """
    fname_lower = filename.lower()
    text_lower = raw_text.lower()
    
    # 1. Insurance Policies & Benefit Schedules
    if "policy" in fname_lower or "benefit" in text_lower or "insurance policy" in text_lower or "mandate" in text_lower:
        return "insurance_policy"
        
    # 2. Explanation of Benefits (EOB)
    if "eob" in fname_lower or "explanation of benefits" in text_lower or "insurance_allowed_amount" in text_lower:
        return "eob_statement"
        
    # 3. Physician & Ancillary Bills
    if "physician" in fname_lower or "anesthesia" in fname_lower or "delayed_bill" in fname_lower or "professional fee" in text_lower or "ancillary" in text_lower:
        return "physician_bill"
        
    # 4. Hospital Itemized Bills
    if "hospital" in fname_lower or ("bill" in fname_lower and "contractor" not in fname_lower) or "itemized" in text_lower or "facility fee" in text_lower:
        return "hospital_bill"
        
    # 5. DAO Governance Document Types
    if "amend" in fname_lower or "amendment" in text_lower:
        return "amendment"
    if "prop-" in fname_lower or "proposal" in fname_lower or "dao proposal" in text_lower or ("requested amount" in text_lower and "usdc" in text_lower):
        return "proposal"
    if "treasury" in fname_lower or "disbursement" in fname_lower or "amount_disbursed" in text_lower:
        return "treasury_log"
    if "thread" in fname_lower or "forum" in fname_lower or "delegate" in fname_lower or "debate" in fname_lower:
        return "forum_thread"
    if "invoice" in fname_lower or "contractor" in fname_lower:
        return "invoice"
        
    # 5. Lab Reports
    if "lab" in fname_lower or "panel" in text_lower or "pathology" in text_lower:
        return "lab_report"
        
    # 6. Notices
    if "notice" in fname_lower or "collection" in text_lower or "override" in text_lower:
        return "notice"
        
    # 7. Job Descriptions / Requisitions
    if "jd" in fname_lower or "job description" in text_lower or "job requisition" in text_lower or "requisition" in text_lower or "job-req" in fname_lower or "salary budget cap" in text_lower or "required skills" in text_lower or ("minimum" in text_lower and "experience" in text_lower):
        return "job_description"

    # 8. Resumes / CVs
    if "resume" in fname_lower or "cv" in fname_lower or "curriculum vitae" in text_lower or "salary expectation" in text_lower or "experience:" in text_lower or ("skills:" in text_lower and "required" not in text_lower):
        return "resume"
        
    # 9. Employment Verification
    if "verification" in fname_lower or "employment verification" in text_lower or "hr records" in text_lower or "verified title" in text_lower:
        return "employment_verification"
        
    # 10. Reference Checks
    if "reference" in fname_lower or "manager confirms" in text_lower or "past manager" in text_lower:
        return "reference_check"

    return "unknown"

async def classify_document_llm(filename: str, raw_text: str) -> Tuple[str, int, int]:
    system_prompt = (
        "You are an expert healthcare document classifier. Classify the document into one of the following exact categories: "
        f"{', '.join(VALID_DOC_TYPES)}. "
        "Return ONLY the category name and nothing else."
    )
    user_message = f"Filename: {filename}\n\n<untrusted_source_document>\n{raw_text}\n</untrusted_source_document>"
    
    try:
        response_text, p_tokens, c_tokens = await call_llm(system_prompt, user_message)
        response_text = response_text.strip().lower()
        if response_text in VALID_DOC_TYPES:
            return response_text, p_tokens, c_tokens
    except Exception:
        pass
        
    return classify_document_regex(filename, raw_text), 0, 0

async def classify_document_async(filename: str, raw_text: str) -> Tuple[str, int, int]:
    if settings.USE_MOCK_LLM or not settings.NVIDIA_API_KEY or not settings.NVIDIA_API_KEY.strip():
        return classify_document_regex(filename, raw_text), 0, 0
    return await classify_document_llm(filename, raw_text)

def classify_document(filename: str, raw_text: str) -> str:
    """Synchronous classifier function for API endpoints, tests, and watcher."""
    return classify_document_regex(filename, raw_text)
