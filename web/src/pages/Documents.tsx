import { useState } from "react";
import { api, type DocumentType } from "../api";
import { Alert, Button, Field, Input, Label, Section, Select, Spinner } from "../components/ui";

export function DocumentsPage() {
  const [userId, setUserId] = useState<string>("");
  const [docType, setDocType] = useState<DocumentType>("PASSPORT");
  const [docKey, setDocKey] = useState("docs/passport_1.jpg");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState<{register?: boolean; upload?: boolean}>({});
  const [docFile, setDocFile] = useState<File | null>(null);

  async function onRegister() {
    try {
      setErr("");
      setMsg("");
      setLoading((s) => ({ ...s, register: true }));
      if (!userId) throw new Error("Enter user_id first");
      const s = await api.createSession(userId);
      await api.addDocument(s.id, docType, docKey);
      setMsg("Document registered.");
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading((s) => ({ ...s, register: false }));
    }
  }

  async function onUploadDoc() {
    if (!docFile) return;
    try {
      setErr("");
      setMsg("");
      setLoading((s) => ({ ...s, upload: true }));
      if (!userId) throw new Error("Enter user_id first");
      const s = await api.createSession(userId);
      const res = await api.uploadDocumentImage(s.id, docFile);
      setMsg(`Document image uploaded${res.embedding_dim ? ", embedding dim=" + res.embedding_dim : ""}.`);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading((s) => ({ ...s, upload: false }));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Document Metadata</h1>

      {err ? <Alert variant="error">{err}</Alert> : null}
      {msg ? <Alert variant="success">{msg}</Alert> : null}

      <Section title="Register Document Metadata">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label>user_id</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} />
          </Field>

          <Field>
            <Label>document type</Label>
            <Select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
              <option value="PASSPORT">PASSPORT</option>
              <option value="NRIC">NRIC</option>
              <option value="OTHER">OTHER</option>
            </Select>
          </Field>

          <Field className="sm:col-span-3">
            <Label>file_key</Label>
            <Input value={docKey} onChange={(e) => setDocKey(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">Metadata only: store the path/key for the file.</p>
          </Field>
        </div>

        <div className="mt-4">
          <Button onClick={onRegister} disabled={!userId || !docKey || loading.register}>
            {loading.register ? (<><Spinner className="mr-2"/>Saving...</>) : "Register Document"}
          </Button>
        </div>
      </Section>

      <Section title="Upload Document Image (embedding)">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field className="sm:col-span-2">
            <Label>image file</Label>
            <input type="file" accept="image/*" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
          </Field>
          <div className="flex items-end">
            <Button onClick={onUploadDoc} disabled={!userId || !docFile || loading.upload}>
              {loading.upload ? (<><Spinner className="mr-2"/>Uploading...</>) : "Upload & Embed"}
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
