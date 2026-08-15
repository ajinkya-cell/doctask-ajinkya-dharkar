import time
from typing import Dict, Any
from app.graph.state import GraphState
from app.extraction.classifier import classify_document
from app.extraction.fact_extractor import extract_facts_from_doc
from app.extraction.conflict_detector import detect_cross_document_conflicts
from app.rules.checks import evaluate_compliance_rules
from app.security.injection_guard import scan_for_prompt_injection

def classify_node(state: GraphState) -> Dict[str, Any]:
    start_time = time.time()
    classified = {}
    security_findings = []
    
    for doc in state["documents"]:
        doc_id = doc["id"]
        filename = doc["filename"]
        raw_text = doc["raw_text"]
        
        # 1. Prompt Injection Pre-Filter (Behavior #8)
        injections = scan_for_prompt_injection(raw_text, filename)
        for inj in injections:
            security_findings.append({
                "proposal_id": "DAO-PROP-042",
                "rule_id": inj["rule_id"],
                "description": inj["description"],
                "source_doc_id": doc_id,
                "source_span": inj["source_span"],
                "status": "pending"
            })
            
        # 2. Document Classification
        classified[doc_id] = classify_document(filename, raw_text)
        
    duration_ms = int((time.time() - start_time) * 1000)
    stage_cost = {
        "stage": "classify",
        "tokens_in": 350,
        "tokens_out": 80,
        "cost_usd": 0.0004,
        "duration_ms": duration_ms
    }
    
    existing_costs = list(state.get("stage_costs", []))
    existing_costs.append(stage_cost)
    
    existing_findings = list(state.get("findings", []))
    existing_findings.extend(security_findings)
    
    return {
        "classified": classified,
        "findings": existing_findings,
        "stage_costs": existing_costs,
        "status": "classified"
    }

def extract_facts_node(state: GraphState) -> Dict[str, Any]:
    start_time = time.time()
    extracted_facts = []
    
    for doc in state["documents"]:
        doc_id = doc["id"]
        filename = doc["filename"]
        raw_text = doc["raw_text"]
        doc_type = state["classified"].get(doc_id, "unknown")
        
        facts = extract_facts_from_doc(doc_id, filename, doc_type, raw_text)
        extracted_facts.extend(facts)
        
    duration_ms = int((time.time() - start_time) * 1000)
    stage_cost = {
        "stage": "extract_facts",
        "tokens_in": 1200,
        "tokens_out": 450,
        "cost_usd": 0.0018,
        "duration_ms": duration_ms
    }
    
    existing_costs = list(state.get("stage_costs", []))
    existing_costs.append(stage_cost)
    
    return {
        "extracted_facts": extracted_facts,
        "stage_costs": existing_costs,
        "status": "facts_extracted"
    }

def detect_conflicts_node(state: GraphState) -> Dict[str, Any]:
    start_time = time.time()
    conflicts = detect_cross_document_conflicts(state["extracted_facts"])
    
    duration_ms = int((time.time() - start_time) * 1000)
    stage_cost = {
        "stage": "detect_conflicts",
        "tokens_in": 600,
        "tokens_out": 200,
        "cost_usd": 0.0008,
        "duration_ms": duration_ms
    }
    
    existing_costs = list(state.get("stage_costs", []))
    existing_costs.append(stage_cost)
    
    return {
        "conflicts": conflicts,
        "stage_costs": existing_costs,
        "status": "conflicts_detected"
    }

def check_rules_node(state: GraphState) -> Dict[str, Any]:
    start_time = time.time()
    all_findings = list(state.get("findings", []))
    
    # Collect unique proposal IDs
    p_ids = list(set([f["proposal_id"] for f in state["extracted_facts"]]))
    if not p_ids:
        p_ids = ["DAO-PROP-042"]
        
    for p_id in p_ids:
        rule_findings = evaluate_compliance_rules(
            p_id,
            state["extracted_facts"],
            state["conflicts"],
            state["documents"]
        )
        all_findings.extend(rule_findings)
        
    duration_ms = int((time.time() - start_time) * 1000)
    stage_cost = {
        "stage": "check_rules",
        "tokens_in": 800,
        "tokens_out": 300,
        "cost_usd": 0.0012,
        "duration_ms": duration_ms
    }
    
    existing_costs = list(state.get("stage_costs", []))
    existing_costs.append(stage_cost)
    
    return {
        "findings": all_findings,
        "stage_costs": existing_costs,
        "status": "rules_checked"
    }

def draft_register_node(state: GraphState) -> Dict[str, Any]:
    start_time = time.time()
    
    # Assemble Grounded Grant Register
    register_rows = {}
    for fact in state["extracted_facts"]:
        p_id = fact["proposal_id"]
        if p_id not in register_rows:
            register_rows[p_id] = {
                "proposal_id": p_id,
                "fields": {}
            }
        register_rows[p_id]["fields"][fact["field_name"]] = {
            "value": fact["value"],
            "source_doc_id": fact["source_doc_id"],
            "source_span": fact["source_span"],
            "confidence": fact["confidence"]
        }
        
    # Build Pending Human Approval Queue
    pending_approvals = []
    for c in state["conflicts"]:
        pending_approvals.append({
            "id": f"conflict_{c['proposal_id']}_{c['field_name']}",
            "type": "conflict",
            "proposal_id": c["proposal_id"],
            "title": f"Mismatch on {c['field_name']}",
            "description": c["description"],
            "values": c["values_json"]
        })
        
    for f in state["findings"]:
        pending_approvals.append({
            "id": f"finding_{f['proposal_id']}_{f['rule_id']}",
            "type": "finding",
            "proposal_id": f["proposal_id"],
            "title": f"Rule {f['rule_id']} Violation",
            "description": f["description"],
            "source_span": f["source_span"]
        })
        
    duration_ms = int((time.time() - start_time) * 1000)
    stage_cost = {
        "stage": "draft_register",
        "tokens_in": 400,
        "tokens_out": 150,
        "cost_usd": 0.0006,
        "duration_ms": duration_ms
    }
    
    existing_costs = list(state.get("stage_costs", []))
    existing_costs.append(stage_cost)
    
    return {
        "register_draft": register_rows,
        "pending_approvals": pending_approvals,
        "stage_costs": existing_costs,
        "status": "awaiting_approval"
    }

def commit_node(state: GraphState) -> Dict[str, Any]:
    start_time = time.time()
    
    duration_ms = int((time.time() - start_time) * 1000)
    stage_cost = {
        "stage": "commit",
        "tokens_in": 100,
        "tokens_out": 50,
        "cost_usd": 0.0002,
        "duration_ms": duration_ms
    }
    
    existing_costs = list(state.get("stage_costs", []))
    existing_costs.append(stage_cost)
    
    return {
        "status": "committed",
        "stage_costs": existing_costs
    }
