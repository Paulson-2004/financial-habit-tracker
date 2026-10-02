import '@testing-library/jest-dom/vitest';

// Recharts' ResponsiveContainer observes its parent size. jsdom has no native
// ResizeObserver, so provide the minimal browser-compatible test double needed for
// chart rendering tests.
class ResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserver;
