from typing import List, Dict, Any

def evaluate_compliance_rules(
    proposal_id: str,
    facts: List[Dict[str, Any]],
    conflicts: List[Dict[str, Any]],
    documents: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Evaluates extracted facts and conflicts against the DAO Charter rules.
    Returns findings with exact source citations.
    """
    findings = []
    
    # Helper to lookup fact values
    fact_map = {}
    for f in facts:
        if f["proposal_id"] == proposal_id:
            fact_map[f["field_name"]] = f
            
    req_budget = float(fact_map["requested_budget"]["value"]) if "requested_budget" in fact_map else 0.0
    app_budget = float(fact_map["approved_budget"]["value"]) if "approved_budget" in fact_map else req_budget
    initial_payout = float(fact_map["initial_payout"]["value"]) if "initial_payout" in fact_map else 0.0
    disbursed = float(fact_map["disbursed_amount"]["value"]) if "disbursed_amount" in fact_map else 0.0
    escrow = float(fact_map["escrow_holdback"]["value"]) if "escrow_holdback" in fact_map else 0.0
    
    # Check Rule 5.1: Initial payout <= 85% of total approved budget
    if app_budget > 0 and initial_payout > 0:
        ratio = initial_payout / app_budget
        if ratio > 0.85:
            findings.append({
                "proposal_id": proposal_id,
                "rule_id": "5.1",
                "description": f"Rule 5.1 Violation: Initial payout of {initial_payout} USDC represents {ratio*100:.1f}% of approved budget ({app_budget} USDC), exceeding the 85% maximum threshold.",
                "source_doc_id": fact_map["initial_payout"]["source_doc_id"],
                "source_span": fact_map["initial_payout"]["source_span"],
                "status": "pending"
            })
            
    # Check Rule 5.3: Disbursed amount <= Total approved budget
    if app_budget > 0 and disbursed > app_budget:
        findings.append({
            "proposal_id": proposal_id,
            "rule_id": "5.3",
            "description": f"Rule 5.3 Violation: Total disbursed amount ({disbursed} USDC) exceeds approved budget cap ({app_budget} USDC).",
            "source_doc_id": fact_map["disbursed_amount"]["source_doc_id"],
            "source_span": fact_map["disbursed_amount"]["source_span"],
            "status": "pending"
        })
        
    # Check Rule 4.1: Supermajority approval for > 25k USDC
    if req_budget > 25000:
        vote_pct = float(fact_map.get("vote_yes_percentage", {}).get("value", 0))
        if vote_pct > 0 and vote_pct < 66.7:
            findings.append({
                "proposal_id": proposal_id,
                "rule_id": "4.1",
                "description": f"Rule 4.1 Violation: Proposal requested {req_budget} USDC but received only {vote_pct}% vote approval (requires >= 66.7%).",
                "source_doc_id": fact_map["vote_yes_percentage"]["source_doc_id"],
                "source_span": fact_map["vote_yes_percentage"]["source_span"],
                "status": "pending"
            })

    return findings
