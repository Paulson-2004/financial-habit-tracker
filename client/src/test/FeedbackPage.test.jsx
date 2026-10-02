import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeedbackPage from '../pages/FeedbackPage.jsx';

vi.mock('../hooks/useFeedback.js', () => ({
  useMyFeedback: () => ({
    data: {
      data: [
        {
          id: 'f1',
          type: 'feedback',
          subject: 'Love the app',
          message: 'The tracker is really easy to use.',
          status: 'open',
          createdAt: '2026-10-01T11:00:00.000Z',
          updatedAt: '2026-10-01T11:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
  }),
  useCreateFeedback: () => ({ mutateAsync: vi.fn() }),
}));

describe('FeedbackPage', () => {
  it('renders the submission form and the user’s own submissions', () => {
    render(<FeedbackPage />);
    expect(screen.getByText('Send feedback')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByText('Love the app')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});
