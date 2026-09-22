import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <Link to="/dashboard" className="text-brand-600 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
