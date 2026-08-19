def score_candidate(candidate_id: str, facts: list, conflicts: list, job_facts: list = None) -> dict:
    """
    Evaluates a candidate profile against job description criteria across 4 pillars:
    - Pillar 1: Technical Skills Match (Max 50 pts)
    - Pillar 2: Professional Experience Fulfillment (Max 40 pts)
    - Pillar 3: Education & Project Depth (Max 10 pts)
    - Pillar 4: Red Flag & Security Deductions (Deductions: -20 to -50 pts)
    """
    cand_norm = candidate_id.upper().replace("-", "_").replace("CAND_", "").strip()
    
    # Match candidate facts
    cand_facts = {}
    for f in facts:
        p_id = str(f.get("proposal_id", "")).upper().replace("-", "_").replace("CAND_", "").strip()
        if p_id == cand_norm or p_id in cand_norm or cand_norm in p_id or f.get("proposal_id") == candidate_id:
            cand_facts[f["field_name"]] = f.get("value", "")

    job_fact_map = {f["field_name"]: f.get("value", "") for f in (job_facts or [])}
    breakdown = {}
    
    # ─── PILLAR 1: Technical Skills Match (Max 50 pts) ───
    skills_score = 0.0
    missing_skills = []
    
    if "required_skills" in job_fact_map and job_fact_map["required_skills"]:
        req_list = [s.strip().lower() for s in job_fact_map["required_skills"].split(",") if s.strip()]
        cand_skills_raw = str(cand_facts.get("skills_listed", "")).lower()
        cand_skills_list = [s.strip().lower() for s in cand_skills_raw.split(",") if s.strip()]
        
        matched_count = 0
        for req in req_list:
            if any(req == cs or req in cs or cs in req for cs in cand_skills_list) or req in cand_skills_raw:
                matched_count += 1
            else:
                missing_skills.append(req)
                
        if len(req_list) > 0:
            match_ratio = matched_count / len(req_list)
            if match_ratio >= 1.0:
                skills_score = 50.0
            else:
                extra_skills_count = max(0, len(cand_skills_list) - matched_count)
                skills_score = min(48.0, (match_ratio * 45.0) + min(5.0, extra_skills_count * 1.0))
        else:
            skills_score = 50.0
    else:
        skills_score = 50.0

    breakdown["skills_score"] = round(skills_score, 1)
    if missing_skills:
        breakdown["missing_skills_list"] = missing_skills

    # ─── PILLAR 2: Professional Experience Fulfillment (Max 40 pts) ───
    experience_score = 0.0
    req_yrs = 0.0
    cand_yrs = 0.0
    
    if "required_min_years" in job_fact_map and job_fact_map["required_min_years"]:
        try:
            req_yrs = float(job_fact_map["required_min_years"])
        except (ValueError, TypeError):
            req_yrs = 0.0

    if "claimed_years_experience" in cand_facts and cand_facts["claimed_years_experience"]:
        try:
            cand_yrs = float(cand_facts["claimed_years_experience"])
        except (ValueError, TypeError):
            cand_yrs = 0.0

    if req_yrs <= 0.0:
        experience_score = 40.0
    else:
        ratio = min(1.0, max(0.0, cand_yrs / req_yrs))
        experience_score = ratio * 40.0

    exp_gap = max(0.0, req_yrs - cand_yrs)
    breakdown["experience_score"] = round(experience_score, 1)
    breakdown["required_min_years"] = req_yrs
    breakdown["candidate_years"] = cand_yrs
    if exp_gap > 0:
        breakdown["experience_gap_years"] = round(exp_gap, 1)

    # ─── PILLAR 3: Education & Project Depth (Max 10 pts) ───
    education_score = 0.0
    edu_val = str(cand_facts.get("education_degree", "")).lower()
    if any(k in edu_val for k in ["bachelor", "b.tech", "master", "m.tech", "phd", "bs ", "ms ", "b.e.", "mit", "stanford", "harvard", "technology"]):
        education_score += 5.0
    elif "education_degree" not in cand_facts:
        education_score += 5.0
    elif len(edu_val) > 3:
        education_score += 3.0

    cand_skills_raw = str(cand_facts.get("skills_listed", "")).strip()
    cand_skills_count = len([s for s in cand_skills_raw.split(",") if s.strip()]) if cand_skills_raw else 0
    if "skills_listed" not in cand_facts or cand_skills_count >= 5 or "projects" in str(cand_facts.get("experience_summary", "")).lower():
        education_score += 5.0
    else:
        education_score += min(5.0, cand_skills_count * 1.0)

    breakdown["education_and_projects_score"] = round(education_score, 1)

    # ─── PILLAR 4: Red Flag Deductions ───
    deductions = 0
    for conflict in conflicts:
        p_id = str(conflict.get("proposal_id", "")).upper().replace("-", "_").replace("CAND_", "").strip()
        if p_id == cand_norm or (p_id and p_id in cand_norm) or (cand_norm and cand_norm in p_id) or conflict.get("proposal_id") == candidate_id:
            field = conflict.get("field_name", "")
            if field == "salary_budget_breach":
                deductions += 20
                breakdown["salary_budget_breach"] = -20
            elif field == "experience_inflation":
                deductions += 30
                breakdown["experience_inflation"] = -30
            elif field == "title_inflation":
                deductions += 20
                breakdown["title_inflation"] = -20
            elif field == "team_size_inflation":
                deductions += 10
                breakdown["team_size_inflation"] = -10
            elif "injection" in field.lower() or "override" in str(conflict.get("description", "")).lower():
                deductions += 50
                breakdown["prompt_injection_violation"] = -50

    if any("system override instruction" in str(v).lower() for v in cand_facts.values()):
        deductions += 50
        breakdown["prompt_injection_violation"] = -50

    raw_total = skills_score + experience_score + education_score - deductions
    final_score = int(max(0, min(100, round(raw_total))))

    # ─── Match Tier & Gating Logic ───
    has_injection = "prompt_injection_violation" in breakdown
    has_discrepancy = "experience_inflation" in breakdown or "title_inflation" in breakdown
    
    is_experience_sufficient = True
    if req_yrs > 0:
        is_experience_sufficient = (cand_yrs >= req_yrs * 0.75)

    if final_score >= 80 and not has_injection and not has_discrepancy and is_experience_sufficient:
        match_tier = "Great Match"
    elif final_score >= 65 and not has_injection:
        match_tier = "Good Match"
    elif final_score >= 50:
        match_tier = "Moderate Match"
    else:
        match_tier = "Low Match"

    return {
        "candidate_id": candidate_id,
        "total_score": final_score,
        "match_tier": match_tier,
        "breakdown": breakdown
    }
