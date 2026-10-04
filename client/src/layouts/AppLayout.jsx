import { useState } from 'react';
import { Github, Menu, X } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Button from '../components/ui/Button.jsx';

const GITHUB_REPO_URL = 'https://github.com/Paulson-2004/financial-habit-tracker';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/habits', label: 'Habits' },
  { to: '/goals', label: 'Goals' },
  { to: '/wealth', label: 'Wealth Analytics' },
  { to: '/profile', label: 'Profile' },
  { to: '/feedback', label: 'Feedback' },
];

function NavLinks({ isAdmin, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink
          to="/admin"
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          Admin Panel
        </NavLink>
      )}
    </nav>
  );
}

function ViewSourceLink({ onClick, className = '' }) {
  return (
    <a
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View FinGrow source code on GitHub"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${className}`}
    >
      <Github className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <span>View Source</span>
    </a>
  );
}

/** Sidebar at lg+, slide-over drawer below it (see architecture doc C - Frontend). */
export default function AppLayout() {
  const { user, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 lg:flex lg:flex-col">
        <p className="mb-6 px-3 text-lg font-semibold text-slate-900">FinGrow</p>
        <div className="flex-1">
          <NavLinks isAdmin={isAdmin} />
        </div>
        <div className="border-t border-slate-200 pt-3">
          <ViewSourceLink />
        </div>
      </aside>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setIsDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-lg font-semibold text-slate-900">FinGrow</p>
              <button aria-label="Close menu" onClick={() => setIsDrawerOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1">
              <NavLinks isAdmin={isAdmin} onNavigate={() => setIsDrawerOpen(false)} />
            </div>
            <div className="border-t border-slate-200 pt-3">
              <ViewSourceLink onClick={() => setIsDrawerOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:justify-end">
          <button aria-label="Open menu" className="lg:hidden" onClick={() => setIsDrawerOpen(true)}>
            <Menu className="h-6 w-6 text-slate-700" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user?.name}</span>
            <Button variant="secondary" onClick={logout}>
              Log out
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
