import { useState } from "react";
import { api, type Decision, type DocumentType, type SessionDetailOut } from "./api";

export default function App() {
  const [externalUserId, setExternalUserId] = useState("user_123");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SessionDetailOut | null>(null);
  const [err, setErr] = useState<string>("");

  const [docType, setDocType] = useState<DocumentType>("PASSPORT");
  const [docKey, setDocKey] = useState("docs/passport_1.jpg");

  const [videoKey, setVideoKey] = useState("liveness/video_1.webm");

  const [matchScore, setMatchScore] = useState(0.45);
  const [matchPercent, setMatchPercent] = useState(72);

  const [decision, setDecision] = useState<Decision>("APPROVED");
  const [note, setNote] = useState("looks ok");

  async function refresh(id: number) {
    const d = await api.getSession(id);
    setDetail(d);
  }

  async function onCreateSession() {
    try {
      setErr("");
      const s = await api.createSession(externalUserId);
      setSessionId(s.id);
      await refresh(s.id);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  async function onAddDoc() {
    if (!sessionId) return;
    try {
      setErr("");
      await api.addDocument(sessionId, docType, docKey);
      await refresh(sessionId);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  async function onSetLiveness() {
    if (!sessionId) return;
    try {
      setErr("");
      await api.setLiveness(sessionId, videoKey);
      await refresh(sessionId);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  async function onSetMatch() {
    if (!sessionId) return;
    try {
      setErr("");
      await api.setMatch(sessionId, Number(matchScore), Number(matchPercent), "mvp-v1");
      await refresh(sessionId);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  async function onDecide() {
    if (!sessionId) return;
    try {
      setErr("");
      await api.decide(sessionId, decision, note);
      await refresh(sessionId);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h2>KYC MVP</h2>

      {err ? <div style={{ background: "#fee", padding: 12, marginBottom: 12 }}>{err}</div> : null}

      <section style={{ border: "1px solid #ddd", padding: 16, marginBottom: 16 }}>
        <h3>1) Create Session</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={externalUserId} onChange={(e) => setExternalUserId(e.target.value)} />
          <button onClick={onCreateSession}>Create</button>
        </div>
        <div style={{ marginTop: 8 }}>session_id: {sessionId ?? "-"}</div>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 16, marginBottom: 16 }}>
        <h3>2) Register Document (metadata)</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
            <option value="PASSPORT">PASSPORT</option>
            <option value="NRIC">NRIC</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input style={{ width: 360 }} value={docKey} onChange={(e) => setDocKey(e.target.value)} />
          <button disabled={!sessionId} onClick={onAddDoc}>
            Add Document
          </button>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 16, marginBottom: 16 }}>
        <h3>3) Register Liveness (metadata)</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ width: 360 }} value={videoKey} onChange={(e) => setVideoKey(e.target.value)} />
          <button disabled={!sessionId} onClick={onSetLiveness}>
            Set Liveness
          </button>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 16, marginBottom: 16 }}>
        <h3>4) Store Match Result (simulated)</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="number"
            step="0.01"
            value={matchScore}
            onChange={(e) => setMatchScore(Number(e.target.value))}
          />
          <input
            type="number"
            step="1"
            value={matchPercent}
            onChange={(e) => setMatchPercent(Number(e.target.value))}
          />
          <button disabled={!sessionId} onClick={onSetMatch}>
            Save Match
          </button>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 16, marginBottom: 16 }}>
        <h3>5) Operator Decision (simulated)</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={decision} onChange={(e) => setDecision(e.target.value as Decision)}>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="NEEDS_RETRY">NEEDS_RETRY</option>
          </select>
          <input style={{ width: 360 }} value={note} onChange={(e) => setNote(e.target.value)} />
          <button disabled={!sessionId} onClick={onDecide}>
            Submit Decision
          </button>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 16 }}>
        <h3>Session Detail</h3>
        <button disabled={!sessionId} onClick={() => sessionId && refresh(sessionId)}>
          Refresh
        </button>
        <pre style={{ marginTop: 12, background: "#f7f7f7", padding: 12, overflow: "auto" }}>
          {detail ? JSON.stringify(detail, null, 2) : "No session loaded"}
        </pre>
      </section>
    </div>
  );
}
