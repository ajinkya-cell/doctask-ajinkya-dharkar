from typing import List, Dict, Any, Optional

def evaluate_dao_rules(
    proposal_id: str,
    fact_map: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Evaluates DAO governance proposals and disbursements against the DAO Charter."""
    findings = []
    
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
                "domain": "dao",
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
            "domain": "dao",
            "description": f"Rule 5.3 Violation: Total disbursed amount ({disbursed} USDC) exceeds approved budget cap ({app_budget} USDC).",
            "source_doc_id": fact_map["disbursed_amount"]["source_doc_id"],
            "source_span": fact_map["disbursed_amount"]["source_span"],
            "status": "pending"
        })
        
    # Check Rule 4.1: Supermajority approval for > 25k USDC
    if req_budget > 25000 and "vote_yes_percentage" in fact_map:
        vote_pct = float(fact_map["vote_yes_percentage"]["value"])
        if vote_pct > 0 and vote_pct < 66.7:
            findings.append({
                "proposal_id": proposal_id,
                "rule_id": "4.1",
                "domain": "dao",
                "description": f"Rule 4.1 Violation: Proposal requested {req_budget} USDC but received only {vote_pct}% vote approval (requires >= 66.7%).",
                "source_doc_id": fact_map["vote_yes_percentage"]["source_doc_id"],
                "source_span": fact_map["vote_yes_percentage"]["source_span"],
                "status": "pending"
            })

    return findings

def evaluate_medical_rules(
    proposal_id: str,
    fact_map: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Evaluates healthcare facts against statutory compliance rules and the No Surprises Act."""
    findings = []
    
    # Check Rule 2.3: Specialist Co-pay Billed > Policy Schedule
    if "copay_specialist" in fact_map and "copay_specialist_charged" in fact_map:
        policy_copay = float(fact_map["copay_specialist"]["value"])
        billed_copay = float(fact_map["copay_specialist_charged"]["value"])
        
        if billed_copay > policy_copay:
            findings.append({
                "proposal_id": proposal_id,
                "rule_id": "2.3",
                "domain": "medical",
                "description": f"Rule 2.3 Violation: Hospital billed ${billed_copay:.2f} for in-network specialist consultation, exceeding the policy benefit maximum co-pay limit of ${policy_copay:.2f}.",
                "source_doc_id": fact_map["copay_specialist_charged"]["source_doc_id"],
                "source_span": fact_map["copay_specialist_charged"]["source_span"],
                "status": "pending"
            })
            
    # Check Rule 3.1: No Surprises Act / Balance Billing Prohibition
    if "balance_bill_amount" in fact_map:
        bb_amount = float(fact_map["balance_bill_amount"]["value"])
        if bb_amount > 0:
            findings.append({
                "proposal_id": proposal_id,
                "rule_id": "3.1",
                "domain": "medical",
                "description": f"Rule 3.1 Violation (No Surprises Act): Out-of-network balance billing of ${bb_amount:.2f} for emergency care is prohibited under federal and state consumer protection standards.",
                "source_doc_id": fact_map["balance_bill_amount"]["source_doc_id"],
                "source_span": fact_map["balance_bill_amount"]["source_span"],
                "status": "pending"
            })

    # Check Rule 1.1: Preventative Care Mandate ($0 Co-pay / 100% Coverage)
    if "preventative_copay_mandate" in fact_map and "procedure_billed_amount" in fact_map:
        if "patient_responsibility_eob" in fact_map:
            patient_owed = float(fact_map["patient_responsibility_eob"]["value"])
            if patient_owed > 0:
                findings.append({
                    "proposal_id": proposal_id,
                    "rule_id": "1.1",
                    "domain": "medical",
                    "description": f"Rule 1.1 Violation: Patient billed ${patient_owed:.2f} for routine preventative care, violating the statutory $0.00 cost-sharing mandate.",
                    "source_doc_id": fact_map["patient_responsibility_eob"]["source_doc_id"],
                    "source_span": fact_map["patient_responsibility_eob"]["source_span"],
                    "status": "pending"
                })

    return findings

def evaluate_talent_rules(
    proposal_id: str,
    fact_map: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Evaluates candidate credentials and experience against job description requirements."""
    findings = []
    
    # Rule 5.1: Salary Budget Cap Violation
    if "salary_expectation" in fact_map and "salary_budget_cap" in fact_map:
        try:
            exp = float(fact_map["salary_expectation"]["value"])
            cap = float(fact_map["salary_budget_cap"]["value"])
            if exp > cap:
                findings.append({
                    "proposal_id": proposal_id,
                    "rule_id": "5.1",
                    "domain": "talent",
                    "description": f"Rule 5.1 Violation: Candidate salary expectation of ${exp} exceeds the job budget cap of ${cap}.",
                    "source_doc_id": fact_map["salary_expectation"]["source_doc_id"],
                    "source_span": fact_map["salary_expectation"]["source_span"],
                    "status": "pending"
                })
        except ValueError:
            pass

    # Rule 5.2: Missing Mandatory Skill
    if "skills_listed" in fact_map and "required_skills" in fact_map:
        cand_skills = fact_map["skills_listed"]["value"].lower()
        req_skills_raw = fact_map["required_skills"]["value"].lower()
        req_skills = [s.strip() for s in req_skills_raw.split(',')]
        for skill in req_skills:
            if skill and skill not in cand_skills:
                findings.append({
                    "proposal_id": proposal_id,
                    "rule_id": "5.2",
                    "domain": "talent",
                    "description": f"Rule 5.2 Violation: Candidate is missing mandatory required skill '{skill}'.",
                    "source_doc_id": fact_map["skills_listed"]["source_doc_id"],
                    "source_span": fact_map["skills_listed"]["source_span"],
                    "status": "pending"
                })
                break

    # Rule 5.3: Experience Inflation Flag
    if "claimed_years_experience" in fact_map and "verified_years" in fact_map:
        try:
            cy = float(fact_map["claimed_years_experience"]["value"])
            vy = float(fact_map["verified_years"]["value"])
            if (cy - vy) > 1.0:
                 findings.append({
                    "proposal_id": proposal_id,
                    "rule_id": "5.3",
                    "domain": "talent",
                    "description": f"Rule 5.3 Violation: Candidate experience inflated by more than 1 year (claimed {cy}, verified {vy}).",
                    "source_doc_id": fact_map["claimed_years_experience"]["source_doc_id"],
                    "source_span": fact_map["claimed_years_experience"]["source_span"],
                    "status": "pending"
                })
        except ValueError:
            pass

    return findings

def evaluate_compliance_rules(
    proposal_id: str,
    facts: List[Dict[str, Any]],
    conflicts: List[Dict[str, Any]],
    documents: List[Dict[str, Any]],
    domain: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Main rule evaluation dispatcher. Scopes evaluation cleanly to the target domain
    (medical, dao, or talent) based on explicit domain parameter or proposal ID prefix.
    Robust for real custom files where policy terms apply across claims.
    """
    fact_map = {}
    
    # 1. First populate case-level policy/charter fields
    policy_keys = {
        "copay_specialist", "copay_er", "deductible_annual", "preventative_copay_mandate",
        "salary_budget_cap", "required_skills", "required_min_years", "approved_budget"
    }
    for f in facts:
        if f["field_name"] in policy_keys and f["field_name"] not in fact_map:
            fact_map[f["field_name"]] = f

    # 2. Overlay entity-specific facts
    for f in facts:
        if f["proposal_id"] == proposal_id:
            fact_map[f["field_name"]] = f

    p_id_upper = proposal_id.upper()
    findings = []
    
    # 1. Explicit or Inferred DAO Governance Domain
    if domain == "dao" or p_id_upper.startswith("DAO-") or "TREEHOUSE" in p_id_upper or "SOLARIS" in p_id_upper or "CLEAN" in p_id_upper:
        findings.extend(evaluate_dao_rules(proposal_id, fact_map))
    # 2. Explicit or Inferred Talent Acquisition Domain
    elif domain == "talent" or p_id_upper.startswith("JOB-") or p_id_upper.startswith("CAND-") or "CANDIDATE" in p_id_upper:
        findings.extend(evaluate_talent_rules(proposal_id, fact_map))
    # 3. Explicit or Inferred Healthcare Clinical Domain
    elif domain == "medical" or p_id_upper.startswith("PAT-") or p_id_upper.startswith("POL-") or p_id_upper.startswith("CLAIM-") or "SARAH" in p_id_upper or "DAVID" in p_id_upper or "CHANG" in p_id_upper:
        findings.extend(evaluate_medical_rules(proposal_id, fact_map))
    # 4. Fallback: Aggregate safely
    else:
        findings.extend(evaluate_medical_rules(proposal_id, fact_map))
        findings.extend(evaluate_dao_rules(proposal_id, fact_map))
        findings.extend(evaluate_talent_rules(proposal_id, fact_map))

    # Check Rule 9.1: Prompt Injection / Untrusted Directive Quarantine across documents
    for doc in documents:
        raw_t = doc.get("raw_text", "")
        if "SYSTEM OVERRIDE INSTRUCTION" in raw_t or "IGNORE PREVIOUS INSTRUCTIONS" in raw_t:
            findings.append({
                "proposal_id": proposal_id,
                "rule_id": "9.1",
                "domain": domain or "security",
                "description": f"Security Alert: Untrusted prompt injection directive detected in '{doc.get('filename')}'. Quarantined as untrusted data.",
                "source_doc_id": doc.get("id", "doc-untrusted"),
                "source_span": f"{doc.get('filename')}: 'SYSTEM OVERRIDE INSTRUCTION'",
                "status": "pending"
            })
            break

    return findings
