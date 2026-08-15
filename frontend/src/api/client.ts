const API_BASE = "http://localhost:8000";

export interface DAOInstance {
  id: string;
  name: string;
  description: string;
  created_at: string;
  document_count: number;
}

export interface DocumentItem {
  id: string;
  filename: string;
  doc_type: string;
  sha256: string;
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
  dao_id: string;
  thread_id: string;
  status: string;
  pending_approvals: PendingItem[];
  approved: Record<string, boolean>;
  register_draft: Record<string, any>;
}

export async function fetchDAOs(): Promise<DAOInstance[]> {
  try {
    const res = await fetch(`${API_BASE}/daos`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.daos || [];
  } catch (e) {
    console.error("Failed to fetch DAOs", e);
    return [];
  }
}

export async function createDAO(id: string, name: string, description: string): Promise<DAOInstance | null> {
  try {
    const res = await fetch(`${API_BASE}/daos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, description })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.dao;
  } catch (e) {
    console.error("Failed to create DAO", e);
    return null;
  }
}

export async function fetchDocuments(daoId: string): Promise<DocumentItem[]> {
  try {
    const res = await fetch(`${API_BASE}/documents?dao_id=${daoId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  } catch (e) {
    console.error("Failed to fetch documents", e);
    return [];
  }
}

export async function uploadDocuments(daoId: string, files: File[]): Promise<DocumentItem[]> {
  const formData = new FormData();
  files.forEach(f => formData.append("files", f));
  
  try {
    const res = await fetch(`${API_BASE}/documents?dao_id=${daoId}`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  } catch (e) {
    console.error("Failed to upload documents", e);
    return [];
  }
}

export async function triggerRun(daoId: string, docIds?: string[]): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dao_id: daoId, document_ids: docIds })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.run_id || null;
  } catch (e) {
    console.error("Failed to trigger run", e);
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

export async function submitApproval(runId: string, itemId: string, action: "approve" | "reject"): Promise<boolean> {
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

export async function fetchRunCost(runId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/runs/${runId}/cost`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch run cost", e);
    return null;
  }
}
