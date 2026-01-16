import { useEffect, useState } from "react";
import { api, type SessionDetailOut, type SessionOut } from "../api";

export function StatusPage() {
  const [items, setItems] = useState<SessionOut[]>([]);
  const [selected, setSelected] = useState<SessionDetailOut | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Status</h1>
        <button
          onClick={loadList}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
        >
          Refresh
        </button>
      </div>

      {err ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Sessions</h2>
          {loading ? (
            <div className="mt-3 text-sm text-slate-600">Loading...</div>
          ) : items.length === 0 ? (
            <div className="mt-3 text-sm text-slate-600">No sessions.</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {items.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => loadDetail(s.id)}
                    className="w-full rounded-lg border px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-slate-900">#{s.id} {s.external_user_id}</div>
                      <div className="text-xs text-slate-600">{s.status}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{new Date(s.created_at).toLocaleString()}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Details</h2>
          <pre className="mt-3 max-h-[520px] overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
            {selected ? JSON.stringify(selected, null, 2) : "Select a session"}
          </pre>
        </div>
      </div>
    </div>
  );
}

