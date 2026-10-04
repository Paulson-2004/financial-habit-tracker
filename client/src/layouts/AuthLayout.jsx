import { Github } from 'lucide-react';
import { Outlet } from 'react-router-dom';

const GITHUB_REPO_URL = 'https://github.com/Paulson-2004/financial-habit-tracker';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-semibold text-slate-900">FinGrow</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Build better habits. Grow your wealth.</p>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Outlet />
        </div>
        <div className="mt-6 text-center">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View FinGrow source code on GitHub"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
          >
            <Github className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span>View Source on GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
}

