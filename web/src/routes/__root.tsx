import { Link, Outlet, createRootRoute } from "@tanstack/react-router";

function NavLink(props: { to: string; label: string }) {
  return (
    <Link
      to={props.to}
      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      activeProps={{ className: "bg-slate-200 text-slate-900" }}
    >
      {props.label}
    </Link>
  );
}

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="text-base font-semibold text-slate-900">KYC MVP</div>
          <nav className="flex gap-2">
            <NavLink to="/" label="Home" />
            <NavLink to="/documents" label="Documents" />
            <NavLink to="/kyc" label="KYC" />
            <NavLink to="/status" label="Status" />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  ),
});
