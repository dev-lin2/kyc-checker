import { useState } from "react";
import { api, type Decision } from "../api";

export function KycPage() {
  const [externalUserId, setExternalUserId] = useState("user_123");
  const [sessionId, setSessionId] = useState<number | null>(null);

  const [videoKey, setVideoKey] = useState("liveness/video_1.webm");

  const [matchScore, setMatchScore] = useState(0.45);
  const [matchPercent, setMatchPercent] = useState(72);

  const [decision, setDecision] = useState<Decision>("APPROVED");
  const [note, setNote] = useState("looks ok");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function createSession() {
    try {
      setErr("");
      setMsg("");
      const s = await api.createSession(externalUserId);
      setSessionId(s.id);
      setMsg(`Session created: ${s.id}`);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  async function registerLiveness() {
    if (!sessionId) return;
    try {
      setErr("");
      setMsg("");
      await api.setLiveness(sessionId, videoKey);
      setMsg("Liveness registered.");
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  async function saveMatch() {
    if (!sessionId) return;
    try {
      setErr("");
      setMsg("");
      await api.setMatch(sessionId, Number(matchScore), Number(matchPercent), "mvp-v1");
      setMsg("Match saved. Status: READY_FOR_REVIEW");
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  async function submitDecision() {
    if (!sessionId) return;
    try {
      setErr("");
      setMsg("");
      await api.decide(sessionId, decision, note);
      setMsg(`Decision saved: ${decision}`);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">KYC</h1>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}
      {msg ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div> : null}

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-sm text-slate-600">external_user_id</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={externalUserId}
              onChange={(e) => setExternalUserId(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={createSession}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            >
              Create Session
            </button>
          </div>
        </div>

        <div className="text-sm text-slate-700">
          session_id: <span className="font-semibold">{sessionId ?? "-"}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="text-sm text-slate-600">liveness video_key</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={videoKey}
              onChange={(e) => setVideoKey(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <button
              disabled={!sessionId}
              onClick={registerLiveness}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Register Liveness
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm text-slate-600">match_score</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="number"
              step="0.01"
              value={matchScore}
              onChange={(e) => setMatchScore(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">match_percent</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="number"
              step="1"
              value={matchPercent}
              onChange={(e) => setMatchPercent(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <button
              disabled={!sessionId}
              onClick={saveMatch}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Save Match
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm text-slate-600">decision</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={decision}
              onChange={(e) => setDecision(e.target.value as Decision)}
            >
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="NEEDS_RETRY">NEEDS_RETRY</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-slate-600">operator note</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <button
              disabled={!sessionId}
              onClick={submitDecision}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Submit Decision
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

