import Spinner from './Spinner.jsx';
import { useSlowRequest } from '../../hooks/useSlowRequest.js';

/**
 * Full-screen bootstrap loader (session restore on app start). Behaves exactly
 * like the plain spinner for fast responses; only if the first request is still
 * pending past the cold-start threshold does it add a small "waking up" note.
 * The note renders once (never re-announced) and unmounts with this component
 * the moment the request settles - success continues normally, failure falls
 * through to the existing error/redirect handling.
 */
export default function BootstrapLoading({ isPending = true }) {
  const showNotice = useSlowRequest(isPending);

  return (
    <div className="flex h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Spinner />
        {showNotice && (
          <div aria-live="polite" aria-atomic="true">
            <p className="text-sm font-medium text-slate-700">Waking things up…</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              The server is starting up. This may take a little longer than usual.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
