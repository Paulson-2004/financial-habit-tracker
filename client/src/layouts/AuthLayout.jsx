import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-900">Wealth Tracker</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
