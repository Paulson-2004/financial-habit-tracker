import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useState } from 'react';
import BootstrapLoading from '../components/ui/BootstrapLoading.jsx';
import { COLD_START_NOTICE_DELAY_MS } from '../hooks/useSlowRequest.js';

// Simulates one request lifecycle: pending -> (slow) -> resolved or rejected.
// Mirrors the bootstrap flow: normal loading first, the notice only while slow,
// and exactly one terminal state (content or error - never both, never stale).
function RequestHarness({ request }) {
  const [status, setStatus] = useState('pending'); // pending | done | failed

  useEffect(() => {
    let cancelled = false;
    request().then(
      () => {
        if (!cancelled) setStatus('done');
      },
      () => {
        if (!cancelled) setStatus('failed');
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'done') return <p>Content loaded</p>;
  if (status === 'failed') return <p>Could not load. Please try again.</p>;
  return <BootstrapLoading isPending />;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('BootstrapLoading cold-start notice', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows only the spinner before the threshold (fast path stays unchanged)', () => {
    render(<BootstrapLoading isPending />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
  });

  it('shows the notice while a request is still pending past the threshold', async () => {
    const gate = deferred();
    render(<RequestHarness request={() => gate.promise} />);
    await act(() => vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS + 100));
    expect(screen.getByText('Waking things up…')).toBeInTheDocument();
    expect(screen.getByText(/may take a little longer than usual/)).toBeInTheDocument();
    await act(async () => gate.resolve());
  });

  it('removes the notice immediately when a slow request succeeds', async () => {
    const gate = deferred();
    render(<RequestHarness request={() => gate.promise} />);
    await act(() => vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS + 100));
    expect(screen.getByText('Waking things up…')).toBeInTheDocument();
    await act(async () => gate.resolve());
    expect(screen.getByText('Content loaded')).toBeInTheDocument();
    expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
  });

  it('replaces the notice with the normal error state when a slow request fails', async () => {
    const gate = deferred();
    render(<RequestHarness request={() => gate.promise} />);
    await act(() => vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS + 100));
    expect(screen.getByText('Waking things up…')).toBeInTheDocument();
    await act(async () => gate.reject(new Error('boom')));
    expect(screen.getByText('Could not load. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
  });

  it('never shows the notice when the request settles before the threshold', async () => {
    const gate = deferred();
    render(<RequestHarness request={() => gate.promise} />);
    await act(async () => gate.resolve());
    await act(() => vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS + 5000));
    expect(screen.getByText('Content loaded')).toBeInTheDocument();
    expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
  });

  it('announces the notice politely exactly once', async () => {
    const gate = deferred();
    render(<RequestHarness request={() => gate.promise} />);
    await act(() => vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS + 100));
    const liveRegions = screen.getAllByRole('status');
    expect(liveRegions).toHaveLength(1);
    expect(screen.getAllByText('Waking things up…')).toHaveLength(1);
    await act(async () => gate.resolve());
  });
});
