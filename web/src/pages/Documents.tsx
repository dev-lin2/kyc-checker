import { useState } from "react";
import { api } from "../api";
import { Alert, Button, Field, Input, Label, Section, Spinner } from "../components/ui";

export function DocumentsPage() {
  const [userId, setUserId] = useState<string>("");
  // file path removed; only uploads
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState<{register?: boolean; upload?: boolean}>({});
  const [docFile, setDocFile] = useState<File | null>(null);

  // Metadata registration removed; only file upload is supported now

  async function onUploadDoc() {
    if (!docFile) return;
    try {
      setErr("");
      setMsg("");
      setLoading((s) => ({ ...s, upload: true }));
      if (!userId) throw new Error("Enter user_id first");
      const res = await api.uploadDocumentImageByUser(userId, docFile);
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

      <Section title="Upload Document (front with face)">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field className="sm:col-span-3">
            <Label>user_id</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} />
          </Field>
          <Field className="sm:col-span-3">
            <Label>image</Label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) setDocFile(f);
              }}
              className="mt-1 flex h-32 w-full items-center justify-center rounded-lg border border-dashed text-sm text-slate-600"
            >
              {docFile ? docFile.name : "Drag & drop image here or click below"}
            </div>
            <input className="mt-2" type="file" accept="image/*" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
          </Field>
          <div className="flex items-end">
            <Button onClick={onUploadDoc} disabled={!userId || !docFile || loading.upload}>
              {loading.upload ? (<><Spinner className="mr-2"/>Uploading...</>) : "Upload & Embed"}
            </Button>
          </div>
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
