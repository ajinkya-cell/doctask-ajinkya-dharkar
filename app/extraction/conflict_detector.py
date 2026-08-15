from typing import List, Dict, Any

def detect_cross_document_conflicts(facts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Identifies fact mismatches and cross-document discrepancies across documents
    for both DAO Governance and Household Financial auditing domains.
    """
    conflicts = []
    
    # Group facts by entity/proposal ID
    proposal_facts: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    for fact in facts:
        p_id = fact["proposal_id"]
        f_name = fact["field_name"]
        if p_id not in proposal_facts:
            proposal_facts[p_id] = {}
        if f_name not in proposal_facts[p_id]:
            proposal_facts[p_id][f_name] = []
        proposal_facts[p_id][f_name].append(fact)
        
    for p_id, fields in proposal_facts.items():
        # -------------------------------------------------------------
        # DAO CONFLICTS
        # -------------------------------------------------------------
        req_budgets = fields.get("requested_budget", [])
        app_budgets = fields.get("approved_budget", [])
        disbursed_list = fields.get("disbursed_amount", [])
        invoice_list = fields.get("invoice_requested_amount", [])
        
        # Conflict 1: Original Proposal Amount vs Approved Amendment Amount
        if req_budgets and app_budgets:
            req_val = req_budgets[0]["value"]
            app_val = app_budgets[0]["value"]
            if float(req_val) != float(app_val):
                conflicts.append({
                    "proposal_id": p_id,
                    "field_name": "total_approved_budget",
                    "values_json": [
                        {"source": req_budgets[0]["source_span"], "value": f"{req_val} USDC (Original Proposal)"},
                        {"source": app_budgets[0]["source_span"], "value": f"{app_val} USDC (Ratified Amendment Cap)"}
                    ],
                    "description": f"Mismatch on Proposal {p_id}: Original proposal requested {req_val} USDC upfront, but ratified amendment capped total allocation at {app_val} USDC."
                })

        # Conflict 2: Incremental Invoice Request vs Remaining Escrow Limit
        if app_budgets and disbursed_list and invoice_list:
            app_num = float(app_budgets[0]["value"])
            disb_num = float(disbursed_list[0]["value"])
            inv_num = float(invoice_list[0]["value"])
            remaining_escrow = app_num - disb_num
            
            if inv_num > remaining_escrow:
                conflicts.append({
                    "proposal_id": p_id,
                    "field_name": "invoice_escrow_overrun",
                    "values_json": [
                        {"source": invoice_list[0]["source_span"], "value": f"{inv_num} USDC (Invoice Payment Request)"},
                        {"source": app_budgets[0]["source_span"], "value": f"{remaining_escrow} USDC (Remaining Escrow Balance)"}
                    ],
                    "description": f"Incremental Contradiction on {p_id}: Invoice requests {inv_num} USDC, exceeding the remaining milestone escrow balance of {remaining_escrow} USDC."
                })

        # -------------------------------------------------------------
        # HOUSEHOLD CONFLICTS
        # -------------------------------------------------------------
        agreed_rates = fields.get("agreed_monthly_rate", [])
        billed_amounts = fields.get("billed_amount", [])
        statement_charges = fields.get("statement_charge", [])
        
        # Conflict 3: Billed Rate vs Agreed Monthly Plan Rate (Unannounced Price Hike)
        if agreed_rates and (billed_amounts or statement_charges):
            agreed_num = float(agreed_rates[0]["value"])
            active_bill_num = float(billed_amounts[0]["value"]) if billed_amounts else float(statement_charges[0]["value"])
            active_source = billed_amounts[0]["source_span"] if billed_amounts else statement_charges[0]["source_span"]
            
            if active_bill_num > agreed_num:
                conflicts.append({
                    "proposal_id": p_id,
                    "field_name": "price_hike_without_notice",
                    "values_json": [
                        {"source": agreed_rates[0]["source_span"], "value": f"${agreed_num:.2f}/mo (Locked Agreement Rate)"},
                        {"source": active_source, "value": f"${active_bill_num:.2f}/mo (Current Billed Amount)"}
                    ],
                    "description": f"Price Discrepancy on {p_id}: Current service bill of ${active_bill_num:.2f} exceeds locked agreement rate of ${agreed_num:.2f} with no rate-change notice."
                })

        # Conflict 4: Duplicate Charges on Bank Statement
        if len(statement_charges) >= 2:
            vals = [float(sc["value"]) for sc in statement_charges]
            if len(vals) == 2 and vals[0] == vals[1]:
                conflicts.append({
                    "proposal_id": p_id,
                    "field_name": "duplicate_charge",
                    "values_json": [
                        {"source": statement_charges[0]["source_span"], "value": f"${vals[0]:.2f} (Charge 1)"},
                        {"source": statement_charges[1]["source_span"], "value": f"${vals[1]:.2f} (Charge 2)"}
                    ],
                    "description": f"Duplicate Posting on {p_id}: Two identical debit postings of ${vals[0]:.2f} detected on the same monthly statement."
                })

    return conflicts
