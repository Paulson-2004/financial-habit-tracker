import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';

// useAuth is mocked directly (rather than mounting a real AuthProvider) so this test
// exercises only ProtectedRoute's redirect logic, with no network/API involved.
vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false }),
}));

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<p>Secret dashboard</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument();
  });
});
