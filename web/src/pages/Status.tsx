import { useEffect, useMemo, useState } from "react";
import { api, type SessionDetailOut, type SessionOut } from "../api";
import { Alert, Button, Card, CardBody, CardHeader, CardTitle, Field, Input, Label } from "../components/ui";

export function StatusPage() {
  const [items, setItems] = useState<SessionOut[]>([]);
  const [selected, setSelected] = useState<SessionDetailOut | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function loadList() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.listSessions(25, 0);
      setItems(res.items);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: number) {
    setErr("");
    try {
      const d = await api.getSession(id);
      setSelected(d);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (s) =>
        String(s.id).includes(q) ||
        s.external_user_id.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Status</h1>
        <Button onClick={loadList}>Refresh</Button>
      </div>

      {err ? <Alert variant="error">{err}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sessions</CardTitle>
              <div className="w-60">
                <Field>
                  <Label>Search</Label>
                  <Input placeholder="id, user id, or status" value={query} onChange={(e) => setQuery(e.target.value)} />
                </Field>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="text-sm text-slate-600">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-slate-600">No sessions.</div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">ID</th>
                      <th className="px-3 py-2 font-medium">External User</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => loadDetail(s.id)}>
                        <td className="px-3 py-2 font-medium text-slate-900">#{s.id}</td>
                        <td className="px-3 py-2">{s.external_user_id}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{s.status}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{new Date(s.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody>
            <pre className="max-h-[520px] overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
              {selected ? JSON.stringify(selected, null, 2) : "Select a session"}
            </pre>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
