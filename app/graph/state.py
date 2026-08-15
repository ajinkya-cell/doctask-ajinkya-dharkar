from typing import TypedDict, List, Dict, Any, Optional

class GraphState(TypedDict):
    run_id: str
    thread_id: str
    documents: List[Dict[str, Any]]
    classified: Dict[str, str]
    extracted_facts: List[Dict[str, Any]]
    conflicts: List[Dict[str, Any]]
    findings: List[Dict[str, Any]]
    register_draft: Dict[str, Any]
    pending_approvals: List[Dict[str, Any]]
    approved: Dict[str, bool]
    stage_costs: List[Dict[str, Any]]
    status: str
    error: Optional[str]
