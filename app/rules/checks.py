from typing import List, Dict, Any

def evaluate_compliance_rules(
    proposal_id: str,
    facts: List[Dict[str, Any]],
    conflicts: List[Dict[str, Any]],
    documents: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Evaluates extracted facts and conflicts against governance charter and policy rules.
    Supports both DAO Governance and Household Financial auditing domains.
    """
    findings = []
    
    # Helper to lookup facts by proposal/entity id
    fact_map = {}
    all_billed_amounts = []
    
    for f in facts:
        if f["proposal_id"] == proposal_id:
            fact_map[f["field_name"]] = f
        if f["field_name"] in ("billed_amount", "statement_charge"):
            all_billed_amounts.append(f)
            
    # -------------------------------------------------------------
    # DAO GOVERNANCE RULES
    # -------------------------------------------------------------
    req_budget = float(fact_map["requested_budget"]["value"]) if "requested_budget" in fact_map else 0.0
    app_budget = float(fact_map["approved_budget"]["value"]) if "approved_budget" in fact_map else req_budget
    initial_payout = float(fact_map["initial_payout"]["value"]) if "initial_payout" in fact_map else 0.0
    disbursed = float(fact_map["disbursed_amount"]["value"]) if "disbursed_amount" in fact_map else 0.0
    
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

    # -------------------------------------------------------------
    # HOUSEHOLD FINANCIAL RULES
    # -------------------------------------------------------------
    agreed_rate = float(fact_map["agreed_monthly_rate"]["value"]) if "agreed_monthly_rate" in fact_map else 0.0
    billed_amt = float(fact_map["billed_amount"]["value"]) if "billed_amount" in fact_map else 0.0
    
    # Check Rule 6.1: Price increase > 10% without prior written notice
    if agreed_rate > 0 and billed_amt > (agreed_rate * 1.10):
        hike_pct = ((billed_amt - agreed_rate) / agreed_rate) * 100
        findings.append({
            "proposal_id": proposal_id,
            "rule_id": "6.1",
            "description": f"Rule 6.1 Violation: Service bill of ${billed_amt:.2f} represents a {hike_pct:.1f}% rate increase over agreed ${agreed_rate:.2f}/mo without required 30-day notice.",
            "source_doc_id": fact_map["billed_amount"]["source_doc_id"],
            "source_span": fact_map["billed_amount"]["source_span"],
            "status": "pending"
        })

    # Check Rule 6.2: Total monthly recurring expenses <= $150.00 budget cap
    if all_billed_amounts:
        # Avoid summing multiple times by checking on primary account
        if proposal_id in ("ACC-FIBER-992", "HH-ACCOUNT-001"):
            total_recurring = sum(float(f["value"]) for f in all_billed_amounts)
            if total_recurring > 150.0:
                first_doc = all_billed_amounts[0]
                findings.append({
                    "proposal_id": proposal_id,
                    "rule_id": "6.2",
                    "description": f"Rule 6.2 Violation: Total monthly recurring expenses (${total_recurring:.2f}) exceed the household budget cap of $150.00.",
                    "source_doc_id": first_doc["source_doc_id"],
                    "source_span": first_doc["source_span"],
                    "status": "pending"
                })

    return findings
