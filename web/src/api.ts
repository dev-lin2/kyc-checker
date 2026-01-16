const API_BASE = "/api";

export type KycStatus =
  | "NEW"
  | "DOC_UPLOADED"
  | "LIVE_UPLOADED"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_RETRY";

export type DocumentType = "PASSPORT" | "NRIC" | "OTHER";
export type Decision = "APPROVED" | "REJECTED" | "NEEDS_RETRY";

export type SessionOut = {
  id: number;
  external_user_id: string;
  status: KycStatus;
  created_at: string;
  updated_at: string;
};

export type SessionDetailOut = SessionOut & {
  documents: { id: number; type: DocumentType; file_key: string; uploaded_at: string }[];
  liveness: { video_key: string; uploaded_at: string } | null;
  result: {
    match_score: number | null;
    match_percent: number | null;
    model_version: string | null;
    operator_decision: Decision | null;
    operator_note: string | null;
    decided_at: string | null;
    updated_at: string;
  } | null;
};

export type SessionListOut = {
  items: SessionOut[];
  total: number;
  limit: number;
  offset: number;
};

export type UserSummary = {
  external_user_id: string;
  doc_uploaded: boolean;
  kyc_uploaded: boolean;
  percent: number | null;
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createSession: (external_user_id: string) =>
    http<SessionOut>("/sessions", { method: "POST", body: JSON.stringify({ external_user_id }) }),

  getSession: (id: number) => http<SessionDetailOut>(`/sessions/${id}`),

  listSessions: (limit = 25, offset = 0) => http<SessionListOut>(`/sessions?limit=${limit}&offset=${offset}`),

  addDocument: (id: number, type: DocumentType, file_key: string) =>
    http(`/sessions/${id}/documents`, { method: "POST", body: JSON.stringify({ type, file_key }) }),

  setLiveness: (id: number, video_key: string) =>
    http(`/sessions/${id}/liveness`, { method: "POST", body: JSON.stringify({ video_key }) }),

  setMatch: (id: number, match_score: number, match_percent: number, model_version?: string) =>
    http(`/sessions/${id}/match`, {
      method: "POST",
      body: JSON.stringify({ match_score, match_percent, model_version: model_version ?? null }),
    }),

  decide: (id: number, operator_decision: Decision, operator_note?: string) =>
    http(`/sessions/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ operator_decision, operator_note: operator_note ?? null }),
    }),
  uploadFaceImage: async (id: number, file: Blob) => {
    const form = new FormData();
    form.append("file", file, "frame.jpg");
    const res = await fetch(`${API_BASE}/sessions/${id}/face-image`, { method: "POST", body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    return res.json() as Promise<{ ok: boolean; embedding_dim?: number; message?: string; file_key?: string }>;
  },
  uploadLivenessVideo: async (id: number, file: Blob) => {
    const form = new FormData();
    form.append("file", file, "liveness.webm");
    const res = await fetch(`${API_BASE}/sessions/${id}/liveness-video`, { method: "POST", body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    return res.json() as Promise<{ ok: boolean; message?: string; file_key?: string }>;
  },
  uploadDocumentImage: async (id: number, file: Blob) => {
    const form = new FormData();
    form.append("file", file, "document.jpg");
    const res = await fetch(`${API_BASE}/sessions/${id}/document-image`, { method: "POST", body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    return res.json() as Promise<{ ok: boolean; embedding_dim?: number; message?: string; file_key?: string }>;
  },
  computeMatch: async (id: number) => {
    const res = await fetch(`${API_BASE}/sessions/${id}/match/compute`, { method: "POST" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    return res.json() as Promise<{ ok: boolean; score?: number; percent?: number; message?: string }>;
  },
  listUserSummary: async () => {
    const res = await fetch(`${API_BASE}/users/summary`);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    return res.json() as Promise<{ items: UserSummary[] }>;
  },
  userComputeMatch: async (external_user_id: string) => {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(external_user_id)}/match/compute`, { method: "POST" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    return res.json() as Promise<{ ok: boolean; score?: number; percent?: number; message?: string }>;
  },
};
