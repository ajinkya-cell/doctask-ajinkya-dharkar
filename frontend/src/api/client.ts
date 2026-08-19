const API_BASE = "http://localhost:8000";

export interface PatientCase {
  id: string;
  domain?: 'medical' | 'dao' | 'talent' | string;
  name: string;
  patient_name?: string;
  case_title?: string;
  description: string;
  policy_number?: string;
  created_at: string;
  document_count: number;
}

// Alias for backwards compatibility
export type DAOInstance = PatientCase;

export interface ExtractedCandidateProfile {
  name: string;
  email: string;
  phone: string;
  links: string;
  education: string;
  experience: string;
  num_years: number;
  skills: string[];
  projects: string[];
}

export interface DocumentItem {
  id: string;
  case_id?: string;
  dao_id?: string;
  filename: string;
  doc_type: string;
  sha256: string;
  raw_text?: string;
  extracted_profile?: ExtractedCandidateProfile;
  extracted_facts?: Array<{
    proposal_id: string;
    field_name: string;
    value: string;
    source_span: string;
    confidence: number;
  }>;
  uploaded_at?: string;
}

export interface PendingItem {
  id: string;
  type: 'conflict' | 'finding';
  proposal_id: string;
  title: string;
  description: string;
  values?: Array<{ source: string; value: string }>;
  source_span?: string;
}

export interface StageCost {
  stage: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  duration_ms: number;
}

export interface RunStatusResponse {
  run_id: string;
  case_id?: string;
  dao_id?: string;
  thread_id: string;
  status: string;
  pending_approvals: PendingItem[];
  approved: Record<string, boolean>;
  register_draft: Record<string, any>;
}

export async function fetchCases(): Promise<PatientCase[]> {
  try {
    const res = await fetch(`${API_BASE}/cases`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.cases || data.daos || [];
  } catch (e) {
    console.error("Failed to fetch patient cases", e);
    return [];
  }
}

export const fetchDAOs = fetchCases;

export async function createCase(id: string, name: string, description: string, policy_number?: string): Promise<PatientCase | null> {
  try {
    const res = await fetch(`${API_BASE}/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, description, policy_number })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.case || data.dao;
  } catch (e) {
    console.error("Failed to create patient case", e);
    return null;
  }
}

export const createDAO = createCase;

export async function fetchDocuments(caseId: string): Promise<DocumentItem[]> {
  try {
    const res = await fetch(`${API_BASE}/documents?case_id=${caseId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  } catch (e) {
    console.error("Failed to fetch documents", e);
    return [];
  }
}

export async function uploadDocuments(caseId: string, files: File[]): Promise<DocumentItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    const res = await fetch(`${API_BASE}/documents?case_id=${caseId}`, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  } catch (e) {
    console.warn("Backend upload unreachable, proceeding with client-side parser", e);
    return [];
  }
}

export async function triggerRun(caseId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.run_id;
  } catch (e) {
    console.error("Failed to trigger pipeline run", e);
    return null;
  }
}

export async function fetchRunStatus(runId: string): Promise<RunStatusResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/runs/${runId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch run status", e);
    return null;
  }
}

export async function submitApproval(runId: string, itemId: string, action: 'approve' | 'reject'): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/runs/${runId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, action })
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to submit approval", e);
    return false;
  }
}

export async function fetchRunCost(runId: string): Promise<{ total_cost_usd: number; total_duration_ms: number; stage_breakdown: StageCost[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/runs/${runId}/cost`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch run cost", e);
    return null;
  }
}
