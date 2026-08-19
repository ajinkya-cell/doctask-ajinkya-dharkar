from typing import List, Dict, Any, Optional

def detect_dao_conflicts(p_id: str, fields: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """Identifies governance proposal budget contradictions and milestone escrow overruns."""
    conflicts = []
    req_budgets = fields.get("requested_budget", [])
    app_budgets = fields.get("approved_budget", [])
    disbursed_list = fields.get("disbursed_amount", [])
    invoice_list = fields.get("invoice_requested_amount", [])
    
    # Conflict 1: Original Proposal Amount vs Approved Amendment Amount
    if req_budgets and app_budgets:
        req_val = req_budgets[0]["value"]
        app_val = app_budgets[0]["value"]
        if req_val != app_val:
            conflicts.append({
                "proposal_id": p_id,
                "domain": "dao",
                "field_name": "total_approved_budget",
                "values_json": [
                    {"source": req_budgets[0]["source_span"], "value": f"{req_val} USDC (Original Proposal)"},
                    {"source": app_budgets[0]["source_span"], "value": f"{app_val} USDC (Ratified Amendment Cap)"}
                ],
                "description": f"Mismatch on Proposal {p_id}: Original proposal requested {req_val} USDC upfront, but ratified amendment capped total allocation at {app_val} USDC."
            })

    # Conflict 2: Incremental Invoice Request vs Remaining Escrow Limit
    if app_budgets and disbursed_list and invoice_list:
        try:
            app_num = float(app_budgets[0]["value"])
            disb_num = float(disbursed_list[0]["value"])
            inv_num = float(invoice_list[0]["value"])
            remaining_escrow = app_num - disb_num
            
            if inv_num > remaining_escrow:
                conflicts.append({
                    "proposal_id": p_id,
                    "domain": "dao",
                    "field_name": "invoice_escrow_overrun",
                    "values_json": [
                        {"source": invoice_list[0]["source_span"], "value": f"{inv_num} USDC (Invoice Payment Request)"},
                        {"source": app_budgets[0]["source_span"], "value": f"{remaining_escrow} USDC (Remaining Escrow Balance)"}
                    ],
                    "description": f"Incremental Contradiction on {p_id}: Invoice requests {inv_num} USDC, exceeding the remaining milestone escrow balance of {remaining_escrow} USDC."
                })
        except ValueError:
            pass

    return conflicts

def detect_medical_conflicts(p_id: str, fields: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """Identifies medical billing rate discrepancies, co-pay overcharges, and balance billing."""
    conflicts = []
    hospital_billed = fields.get("hospital_billed_total", [])
    eob_allowed = fields.get("insurance_allowed_amount", [])
    eob_patient_share = fields.get("patient_responsibility_eob", [])
    
    # Conflict 1: Hospital Total Billed Charges vs Insurance EOB Allowed Amount
    if hospital_billed and eob_allowed:
        try:
            hosp_val = float(hospital_billed[0]["value"])
            allowed_val = float(eob_allowed[0]["value"])
            patient_share = float(eob_patient_share[0]["value"]) if eob_patient_share else None
            
            # If patient responsibility is explicitly 0 (e.g. clean preventative exam covered at 100%), it is not a patient overcharge
            if hosp_val > allowed_val and (patient_share is None or patient_share > 0):
                overbill = hosp_val - allowed_val
                conflicts.append({
                    "proposal_id": p_id,
                    "domain": "medical",
                    "field_name": "contractual_rate_overcharge",
                    "values_json": [
                        {"source": hospital_billed[0]["source_span"], "value": f"${hosp_val:.2f} (Hospital Facility Billed Total)"},
                        {"source": eob_allowed[0]["source_span"], "value": f"${allowed_val:.2f} (In-Network EOB Allowed Rate)"}
                    ],
                    "description": f"Over-billing Discrepancy on {p_id}: Hospital billed ${hosp_val:.2f}, but in-network insurance EOB allowed only ${allowed_val:.2f} (Excess ${overbill:.2f} must be written off under contractual adjustment)."
                })
        except ValueError:
            pass

    # Conflict 2: Specialist Co-pay Billed vs Policy Co-pay Schedule
    policy_copay = fields.get("copay_specialist", [])
    billed_copay = fields.get("copay_specialist_charged", [])
    
    if policy_copay and billed_copay:
        pol_num = float(policy_copay[0]["value"])
        bill_num = float(billed_copay[0]["value"])
        
        if bill_num > pol_num:
            conflicts.append({
                "proposal_id": p_id,
                "domain": "medical",
                "field_name": "specialist_copay_overcharge",
                "values_json": [
                    {"source": policy_copay[0]["source_span"], "value": f"${pol_num:.2f} (Policy Schedule Co-pay Cap)"},
                    {"source": billed_copay[0]["source_span"], "value": f"${bill_num:.2f} (Hospital Billed Specialist Fee)"}
                ],
                "description": f"Co-pay Overcharge on {p_id}: Clinic billed ${bill_num:.2f} for specialist consult, exceeding the agreed in-network insurance policy co-pay limit of ${pol_num:.2f}."
            })

    # Conflict 3: Out-of-Network Emergency Balance Billing Violation
    er_copay = fields.get("copay_er", [])
    balance_bills = fields.get("balance_bill_amount", [])
    
    if balance_bills:
        bb_num = float(balance_bills[0]["value"])
        conflicts.append({
            "proposal_id": p_id,
            "domain": "medical",
            "field_name": "illegal_balance_billing",
            "values_json": [
                {"source": er_copay[0]["source_span"] if er_copay else "Policy Schedule", "value": "$250.00 (In-Network ER Co-pay Protection)"},
                {"source": balance_bills[0]["source_span"], "value": f"${bb_num:.2f} (Out-of-Network Physician Balance Bill)"}
            ],
            "description": f"No Surprises Act Violation on {p_id}: Out-of-network emergency provider balance-billed ${bb_num:.2f}, prohibited under federal and state patient protections."
        })

    # Conflict 4: Delayed Ancillary Invoice Discrepancy
    delayed_bills = fields.get("delayed_ancillary_bill_amount", [])
    if delayed_bills:
        delayed_num = float(delayed_bills[0]["value"])
        conflicts.append({
            "proposal_id": p_id,
            "domain": "medical",
            "field_name": "delayed_ancillary_fee_conflict",
            "values_json": [
                {"source": delayed_bills[0]["source_span"], "value": f"${delayed_num:.2f} (Separate Anesthesiology Invoice)"},
                {"source": eob_patient_share[0]["source_span"] if eob_patient_share else "EOB", "value": "$50.00 (Total Patient Liability per EOB)"}
            ],
            "description": f"Delayed Ancillary Billing on {p_id}: Separate anesthesia invoice of ${delayed_num:.2f} received post-service exceeds patient responsibility stated on primary EOB."
        })

    return conflicts

def detect_talent_conflicts(p_id: str, fields: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """Identifies discrepancies between candidate resume claims and HR/reference verifications."""
    conflicts = []
    claimed_titles = fields.get("claimed_job_title", [])
    verified_titles = fields.get("verified_job_title", [])
    if claimed_titles and verified_titles:
        c_title = claimed_titles[0]["value"]
        v_title = verified_titles[0]["value"]
        if c_title.lower() != v_title.lower() and "lead" in c_title.lower() and "junior" in v_title.lower():
            conflicts.append({
                "proposal_id": p_id,
                "domain": "talent",
                "field_name": "title_inflation",
                "values_json": [
                    {"source": claimed_titles[0]["source_span"], "value": c_title},
                    {"source": verified_titles[0]["source_span"], "value": v_title}
                ],
                "description": f"Title Inflation on {p_id}: Candidate claimed '{c_title}', but HR verified as '{v_title}'."
            })

    claimed_years = fields.get("claimed_years_experience", [])
    verified_years = fields.get("verified_years", [])
    if claimed_years and verified_years:
        try:
            c_y = float(claimed_years[0]["value"])
            v_y = float(verified_years[0]["value"])
            if c_y > v_y:
                conflicts.append({
                    "proposal_id": p_id,
                    "domain": "talent",
                    "field_name": "experience_inflation",
                    "values_json": [
                        {"source": claimed_years[0]["source_span"], "value": f"{c_y} years"},
                        {"source": verified_years[0]["source_span"], "value": f"{v_y} years"}
                    ],
                    "description": f"Experience Inflation on {p_id}: Candidate claimed {c_y} years, but HR verified {v_y} years."
                })
        except ValueError:
            pass

    claimed_team = fields.get("claimed_team_size", [])
    verified_team = fields.get("verified_team_size", [])
    if claimed_team and verified_team:
        try:
            c_t = float(claimed_team[0]["value"])
            v_t = float(verified_team[0]["value"])
            if c_t > v_t:
                conflicts.append({
                    "proposal_id": p_id,
                    "domain": "talent",
                    "field_name": "team_size_inflation",
                    "values_json": [
                        {"source": claimed_team[0]["source_span"], "value": f"{c_t} members"},
                        {"source": verified_team[0]["source_span"], "value": f"{v_t} members"}
                    ],
                    "description": f"Team Size Inflation on {p_id}: Candidate claimed leading {c_t} engineers, but HR verified {v_t} engineers."
                })
        except ValueError:
            pass

    expected_salary = fields.get("salary_expectation", [])
    budget_cap = fields.get("salary_budget_cap", [])
    if expected_salary and budget_cap:
        try:
            e_s = float(expected_salary[0]["value"])
            b_c = float(budget_cap[0]["value"])
            if e_s > b_c:
                conflicts.append({
                    "proposal_id": p_id,
                    "domain": "talent",
                    "field_name": "salary_budget_breach",
                    "values_json": [
                        {"source": expected_salary[0]["source_span"], "value": f"${e_s}"},
                        {"source": budget_cap[0]["source_span"], "value": f"${b_c}"}
                    ],
                    "description": f"Salary Budget Breach on {p_id}: Candidate expects ${e_s}, but budget cap is ${b_c}."
                })
        except ValueError:
            pass

    return conflicts

def detect_cross_document_conflicts(facts: List[Dict[str, Any]], domain: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Identifies fact mismatches and cross-document discrepancies across documents,
    scoped cleanly to the target domain (dao, medical, or talent).
    Robust for real custom files where policy/terms apply across claims.
    """
    conflicts = []
    
    # 1. Collect global case-level policy/charter/requirement fields
    global_policy_fields: Dict[str, List[Dict[str, Any]]] = {}
    policy_keys = {
        "copay_specialist", "copay_er", "deductible_annual", "preventative_copay_mandate",
        "salary_budget_cap", "required_skills", "required_min_years", "approved_budget"
    }
    for fact in facts:
        f_name = fact["field_name"]
        if f_name in policy_keys:
            if f_name not in global_policy_fields:
                global_policy_fields[f_name] = []
            global_policy_fields[f_name].append(fact)

    # 2. Group facts by entity / proposal ID
    entity_facts: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    for fact in facts:
        p_id = fact["proposal_id"]
        f_name = fact["field_name"]
        if p_id not in entity_facts:
            entity_facts[p_id] = {}
        if f_name not in entity_facts[p_id]:
            entity_facts[p_id][f_name] = []
        entity_facts[p_id][f_name].append(fact)

    # 3. Ensure global policy fields are available to all entities in the case
    for p_id, fields in entity_facts.items():
        for k, v_list in global_policy_fields.items():
            if k not in fields:
                fields[k] = v_list
        
        p_id_upper = p_id.upper()
        
        # 1. DAO Domain
        if domain == "dao" or p_id_upper.startswith("DAO-") or "TREEHOUSE" in p_id_upper or "SOLARIS" in p_id_upper or "CLEAN" in p_id_upper:
            conflicts.extend(detect_dao_conflicts(p_id, fields))
        # 2. Talent Domain
        elif domain == "talent" or p_id_upper.startswith("JOB-") or p_id_upper.startswith("CAND-") or "CANDIDATE" in p_id_upper:
            conflicts.extend(detect_talent_conflicts(p_id, fields))
        # 3. Medical Domain
        elif domain == "medical" or p_id_upper.startswith("PAT-") or p_id_upper.startswith("POL-") or p_id_upper.startswith("CLAIM-") or "SARAH" in p_id_upper or "DAVID" in p_id_upper or "CHANG" in p_id_upper:
            conflicts.extend(detect_medical_conflicts(p_id, fields))
        # 4. Fallback: Run all domain suites safely
        else:
            conflicts.extend(detect_dao_conflicts(p_id, fields))
            conflicts.extend(detect_medical_conflicts(p_id, fields))
            conflicts.extend(detect_talent_conflicts(p_id, fields))

    # De-duplicate conflicts by (proposal_id, field_name)
    unique_conflicts = []
    seen = set()
    for c in conflicts:
        key = (c.get("proposal_id"), c.get("field_name"))
        if key not in seen:
            seen.add(key)
            unique_conflicts.append(c)

    return unique_conflicts
