import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AdminPage from '../pages/AdminPage.jsx';

const overview = {
  users: { total: 2, active: 2, activeAdmins: 1, newLast7Days: 1, newLast30Days: 2 },
  content: {
    transactions: 3,
    habits: 1,
    habitCompletions: 5,
    savingsGoals: 1,
    goalContributions: 2,
    assets: 1,
    liabilities: 1,
  },
  feedback: { total: 1, open: 1, inReview: 0, resolved: 0, complaints: 1 },
  monthlyTrends: [{ month: '2026-10', newUsers: 2, transactions: 3, feedback: 1 }],
  recentUsers: [
    { id: 'u1', name: 'Ada', email: 'ada@example.com', role: 'user', isActive: true, lastLoginAt: null, createdAt: '2026-10-01T10:00:00.000Z' },
  ],
  recentFeedback: [
    { id: 'f1', type: 'complaint', subject: 'Something broke', status: 'open', createdAt: '2026-10-01T11:00:00.000Z', author: { name: 'Ada', email: 'ada@example.com' } },
  ],
};

const usersPage = {
  data: [
    { id: 'u1', name: 'Ada', email: 'ada@example.com', role: 'user', isActive: true, lastLoginAt: null, createdAt: '2026-10-01T10:00:00.000Z' },
    { id: 'u2', name: 'Root', email: 'root@example.com', role: 'admin', isActive: false, lastLoginAt: null, createdAt: '2026-09-01T10:00:00.000Z' },
  ],
  meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
};

const feedbackPage = {
  data: [
    {
      id: 'f1',
      type: 'complaint',
      subject: 'Something broke',
      message: 'A detailed description of the problem.',
      status: 'open',
      adminNote: null,
      createdAt: '2026-10-01T11:00:00.000Z',
      updatedAt: '2026-10-01T11:00:00.000Z',
      author: { id: 'u1', name: 'Ada', email: 'ada@example.com' },
    },
  ],
  meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
};

vi.mock('../hooks/useAdmin.js', () => ({
  useAdminOverview: () => ({ data: overview, isLoading: false, isError: false, refetch: vi.fn() }),
  useAdminUsers: () => ({ data: usersPage, isLoading: false, isError: false }),
  useSetUserActive: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAdminFeedback: () => ({ data: feedbackPage, isLoading: false, isError: false }),
  useUpdateAdminFeedback: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('AdminPage', () => {
  it('renders the overview with platform totals and trends', () => {
    render(<AdminPage />);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Total users')).toBeInTheDocument();
    expect(screen.getByText('Monthly activity (last 6 months)')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('switches to the users tab and lists accounts with statuses', () => {
    render(<AdminPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Users' }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('ada@example.com')).toBeInTheDocument();
    expect(within(table).getByText('Disabled')).toBeInTheDocument();
    expect(within(table).getByText('Deactivate')).toBeInTheDocument();
    expect(within(table).getByText('Activate')).toBeInTheDocument();
  });

  it('opens a feedback submission detail with triage controls', () => {
    render(<AdminPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Feedback' }));
    fireEvent.click(screen.getByText('Something broke'));
    expect(screen.getByText('A detailed description of the problem.')).toBeInTheDocument();
    expect(screen.getByText('Save changes')).toBeInTheDocument();
  });
});
