import { useState } from "react";
import { api } from "../api";
import { Alert, Button, Field, Input, Label, Section, Spinner } from "../components/ui";
import { useLocalStorage } from "../lib/useLocalStorage";
import { KycRecorder } from "../components/KycRecorder";

export function KycPage() {
  const [externalUserId, setExternalUserId] = useState("user_123");
  const [sessionId, setSessionId] = useLocalStorage<number | null>("kyc.sessionId", null);

  // const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState<{create?: boolean; upload?: boolean}>({});

  async function createSession() {
    try {
      setErr("");
      setMsg("");
      setLoading((s) => ({ ...s, create: true }));
      const s = await api.createSession(externalUserId);
      setSessionId(s.id);
      setMsg(`Session created: ${s.id}`);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading((s) => ({ ...s, create: false }));
    }
  }

  // upload handled inside KycRecorder's onSubmit

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">KYC Workflow</h1>

      {err ? <Alert variant="error">{err}</Alert> : null}
      {msg ? <Alert variant="success">{msg}</Alert> : null}

      <Section title="1) Create Session">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field className="sm:col-span-2">
            <Label>external_user_id</Label>
            <Input value={externalUserId} onChange={(e) => setExternalUserId(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button className="w-full" onClick={createSession} disabled={loading.create}>
              {loading.create ? (<><Spinner className="mr-2"/>Creating...</>) : "Create Session"}
            </Button>
          </div>
        </div>
        <div className="mt-2 text-sm text-slate-700">
          session_id: <span className="font-semibold">{sessionId ?? "-"}</span>
        </div>
      </Section>

      {sessionId ? (
        <Section title="2) Liveness Recording (video)">
          <KycRecorder onSubmit={async (blob) => {
            if (!sessionId) { setErr("Create session first"); return; }
            try {
              setErr("");
              setMsg("");
              setLoading((s) => ({ ...s, upload: true }));
              const res = await api.uploadLivenessVideo(sessionId, blob);
              setMsg(`Liveness video uploaded. ${res.ok ? "" : res.message || ""}`);
            } catch (e: any) {
              setErr(e.message || String(e));
            } finally {
              setLoading((s) => ({ ...s, upload: false }));
            }
          }} />
        </Section>
      ) : null}

      
    </div>
  );
}
