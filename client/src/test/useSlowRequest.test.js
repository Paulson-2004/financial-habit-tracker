import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLD_START_NOTICE_DELAY_MS, useSlowRequest } from '../hooks/useSlowRequest.js';

describe('useSlowRequest', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('stays false when nothing is pending', () => {
    const { result } = renderHook(() => useSlowRequest(false));
    act(() => vi.advanceTimersByTime(COLD_START_NOTICE_DELAY_MS + 1000));
    expect(result.current).toBe(false);
  });

  it('stays false for a fast request that settles before the threshold', () => {
    const { result, rerender } = renderHook(({ pending }) => useSlowRequest(pending), {
      initialProps: { pending: true },
    });
    act(() => vi.advanceTimersByTime(COLD_START_NOTICE_DELAY_MS - 1000));
    rerender({ pending: false });
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current).toBe(false);
  });

  it('turns true once a request stays pending past the threshold', () => {
    const { result } = renderHook(() => useSlowRequest(true));
    act(() => vi.advanceTimersByTime(COLD_START_NOTICE_DELAY_MS - 1));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it('resets to false the moment the request settles', () => {
    const { result, rerender } = renderHook(({ pending }) => useSlowRequest(pending), {
      initialProps: { pending: true },
    });
    act(() => vi.advanceTimersByTime(COLD_START_NOTICE_DELAY_MS + 1000));
    expect(result.current).toBe(true);
    rerender({ pending: false });
    expect(result.current).toBe(false);
  });

  it('handles back-to-back requests as independent pending cycles', () => {
    const { result, rerender } = renderHook(({ pending }) => useSlowRequest(pending), {
      initialProps: { pending: true },
    });
    // First request is slow enough to trigger the notice, then succeeds.
    act(() => vi.advanceTimersByTime(COLD_START_NOTICE_DELAY_MS + 100));
    expect(result.current).toBe(true);
    rerender({ pending: false });
    expect(result.current).toBe(false);
    // Second request starts fresh - no stale notice while it is fast.
    rerender({ pending: true });
    act(() => vi.advanceTimersByTime(COLD_START_NOTICE_DELAY_MS - 100));
    expect(result.current).toBe(false);
  });
});
