import { Link } from "@tanstack/react-router";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui";

export function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">KYC MVP</h1>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-slate-700">
            Create sessions, register document and liveness metadata, save match results, and record
            an operator decision. Use Status to monitor progress.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link className="rounded-lg border p-4 hover:bg-slate-50" to="/documents">
              <div className="text-sm font-semibold text-slate-900">Documents</div>
              <div className="mt-1 text-xs text-slate-600">Register document metadata for a session.</div>
            </Link>
            <Link className="rounded-lg border p-4 hover:bg-slate-50" to="/kyc">
              <div className="text-sm font-semibold text-slate-900">KYC</div>
              <div className="mt-1 text-xs text-slate-600">Create session, liveness, match, decision.</div>
            </Link>
            <Link className="rounded-lg border p-4 hover:bg-slate-50" to="/status">
              <div className="text-sm font-semibold text-slate-900">Status</div>
              <div className="mt-1 text-xs text-slate-600">List sessions and view details.</div>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
