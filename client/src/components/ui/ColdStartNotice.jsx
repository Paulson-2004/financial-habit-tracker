/**
 * In-card cold-start notice displayed when an authentication request
 * (login, register) or other action exceeds the cold-start delay threshold.
 * Uses polite live-region semantics so assistive technologies announce it
 * without interrupting the user.
 */
export default function ColdStartNotice({ className = '' }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center ${className}`}
    >
      <p className="text-sm font-medium text-slate-700">Waking things up…</p>
      <p className="mt-1 text-xs text-slate-500">
        The server is starting up. This may take a little longer than usual.
      </p>
    </div>
  );
}

