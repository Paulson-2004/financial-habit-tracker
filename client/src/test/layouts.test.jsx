import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';

vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    user: { name: 'Alex Developer', email: 'alex@example.com', role: 'user' },
    logout: vi.fn(),
  }),
}));

const GITHUB_REPO_URL = 'https://github.com/Paulson-2004/financial-habit-tracker';

describe('Layouts - View Source Link', () => {
  it('renders the View Source link in AppLayout with correct attributes', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link', { name: /view fingrow source code on github/i });
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      expect(link).toHaveAttribute('href', GITHUB_REPO_URL);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('aria-label', 'View FinGrow source code on GitHub');
    }
  });

  it('renders the View Source link in AuthLayout with correct attributes', () => {
    render(
      <MemoryRouter>
        <AuthLayout />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /view fingrow source code on github/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', GITHUB_REPO_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('aria-label', 'View FinGrow source code on GitHub');
  });
});
