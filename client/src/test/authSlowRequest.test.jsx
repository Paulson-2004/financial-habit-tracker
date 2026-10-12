import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import { COLD_START_NOTICE_DELAY_MS } from '../hooks/useSlowRequest.js';

let mockLogin;
let mockRegister;

vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: () => ({
    login: (...args) => mockLogin(...args),
    register: (...args) => mockRegister(...args),
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Authentication cold-start notice on slow requests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLogin = vi.fn();
    mockRegister = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('LoginPage', () => {
    it('fast login success: no delayed notice is shown', async () => {
      const gate = deferred();
      mockLogin.mockReturnValue(gate.promise);

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<p>Dashboard Page</p>} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
      });

      expect(mockLogin).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' });
      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();

      // Fast request resolves in 1 second
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
        gate.resolve({ token: 'jwt', user: { id: 'u1' } });
      });

      // Let subsequent time pass: notice never appeared
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    it('slow login success: notice appears after 4 seconds and disappears on completion', async () => {
      const gate = deferred();
      mockLogin.mockReturnValue(gate.promise);

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<p>Dashboard Page</p>} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
      });

      // Just before threshold: notice not yet visible
      await act(async () => {
        await vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS - 200);
      });
      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();

      // Past 4s threshold: notice appears
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(screen.getByText('Waking things up…')).toBeInTheDocument();
      expect(screen.getByText(/The server is starting up/)).toBeInTheDocument();

      // When the request completes, notice disappears immediately
      await act(async () => {
        gate.resolve({ token: 'jwt', user: { id: 'u1' } });
      });

      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    it('slow login failure: notice appears after 4 seconds, then disappears and shows the authentication error', async () => {
      const gate = deferred();
      mockLogin.mockReturnValue(gate.promise);

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
      });

      // Advance past 4 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS + 100);
      });
      expect(screen.getByText('Waking things up…')).toBeInTheDocument();

      // Reject request with credentials error
      await act(async () => {
        gate.reject({ message: 'Invalid email or password.' });
      });

      // Notice vanishes immediately and normal error is displayed
      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    });

    it('a pending login request does not leave the notice visible after unmount', async () => {
      const gate = deferred();
      mockLogin.mockReturnValue(gate.promise);

      const { unmount } = render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS + 100);
      });
      expect(screen.getByText('Waking things up…')).toBeInTheDocument();

      unmount();
      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
    });
  });

  describe('RegisterPage', () => {
    it('fast registration success: no delayed notice is shown', async () => {
      const gate = deferred();
      mockRegister.mockReturnValue(gate.promise);

      render(
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<p>Dashboard Page</p>} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
      });

      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });
      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();

      // Fast resolution in 500ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
        gate.resolve({ token: 'jwt', user: { id: 'u2' } });
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    it('slow registration success: notice appears after 4 seconds and disappears on completion', async () => {
      const gate = deferred();
      mockRegister.mockReturnValue(gate.promise);

      render(
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<p>Dashboard Page</p>} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
      });

      // Just before threshold
      await act(async () => {
        await vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS - 200);
      });
      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();

      // Past 4s threshold
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(screen.getByText('Waking things up…')).toBeInTheDocument();
      expect(screen.getByText(/The server is starting up/)).toBeInTheDocument();

      // Resolves
      await act(async () => {
        gate.resolve({ token: 'jwt', user: { id: 'u2' } });
      });

      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    it('slow registration failure: notice appears after 4 seconds, then disappears and shows the error message', async () => {
      const gate = deferred();
      mockRegister.mockReturnValue(gate.promise);

      render(
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS + 100);
      });
      expect(screen.getByText('Waking things up…')).toBeInTheDocument();

      await act(async () => {
        gate.reject({ message: 'An account with this email already exists.' });
      });

      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
      expect(screen.getByText('An account with this email already exists.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
    });

    it('a pending registration request does not leave the notice visible after unmount', async () => {
      const gate = deferred();
      mockRegister.mockReturnValue(gate.promise);

      const { unmount } = render(
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(COLD_START_NOTICE_DELAY_MS + 100);
      });
      expect(screen.getByText('Waking things up…')).toBeInTheDocument();

      unmount();
      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
    });
  });
});

