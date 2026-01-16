import { useEffect, useMemo, useState } from "react";
import { api, type UserSummary } from "../api";
import { Alert, Button, Card, CardBody, CardHeader, CardTitle, Field, Input, Label } from "../components/ui";

export function StatusPage() {
  const [items, setItems] = useState<UserSummary[]>([]);
  // no selected state in this view
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function loadList() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.listUserSummary();
      setItems(res.items);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // no detail loader in this view

  useEffect(() => {
    loadList();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((u) => u.external_user_id.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Status</h1>
        <Button onClick={loadList}>Refresh</Button>
      </div>

      {err ? <Alert variant="error">{err}</Alert> : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users</CardTitle>
            <div className="w-60">
              <Field>
                <Label>Search</Label>
                <Input placeholder="user id" value={query} onChange={(e) => setQuery(e.target.value)} />
              </Field>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-600">No users.</div>
          ) : (
            <div className="overflow-hidden rounded-lg border w-full">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">User ID</th>
                    <th className="px-3 py-2 font-medium">Doc Uploaded</th>
                    <th className="px-3 py-2 font-medium">KYC Uploaded</th>
                    <th className="px-3 py-2 font-medium">Percent</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.external_user_id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{u.external_user_id}</td>
                      <td className="px-3 py-2">{u.doc_uploaded ? "Yes" : "No"}</td>
                      <td className="px-3 py-2">{u.kyc_uploaded ? "Yes" : "No"}</td>
                      <td className="px-3 py-2">{u.percent != null ? `${u.percent}%` : "-"}</td>
                      <td className="px-3 py-2">
                        <Button onClick={async () => {
                          try {
                            setErr("");
                            await api.userComputeMatch(u.external_user_id);
                            await loadList();
                          } catch (e: any) {
                            setErr(e.message || String(e));
                          }
                        }}>Compute</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
