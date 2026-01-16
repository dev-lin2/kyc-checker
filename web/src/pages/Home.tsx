import { Link } from "@tanstack/react-router";

export function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Home</h1>

      <div className="rounded-xl border bg-white p-4">
        <p className="text-slate-700">
          MVP pages: create sessions, register document/liveness metadata, view status list.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800" to="/documents">
            Documents
          </Link>
          <Link className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800" to="/kyc">
            KYC
          </Link>
          <Link className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800" to="/status">
            Status
          </Link>
        </div>
      </div>
    </div>
  );
}

