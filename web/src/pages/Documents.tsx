import { useState } from "react";
import { api, type DocumentType } from "../api";

export function DocumentsPage() {
  const [sessionId, setSessionId] = useState<number>(1);
  const [docType, setDocType] = useState<DocumentType>("PASSPORT");
  const [docKey, setDocKey] = useState("docs/passport_1.jpg");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onRegister() {
    try {
      setErr("");
      setMsg("");
      await api.addDocument(sessionId, docType, docKey);
      setMsg("Document registered.");
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Document Upload (metadata)</h1>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div> : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm text-slate-600">session_id</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="number"
              value={sessionId}
              onChange={(e) => setSessionId(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">document type</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
            >
              <option value="PASSPORT">PASSPORT</option>
              <option value="NRIC">NRIC</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="text-sm text-slate-600">file_key</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={docKey}
              onChange={(e) => setDocKey(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">For now this is just metadata (path/key).</p>
          </div>
        </div>

        <button
          onClick={onRegister}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
        >
          Register Document
        </button>
      </div>
    </div>
  );
}

