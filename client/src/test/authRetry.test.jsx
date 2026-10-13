import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api, tokenStorage } from '../lib/axios.js';
import {
  DEFAULT_AUTH_RETRY_CONFIG,
  TRANSIENT_AUTH_ERROR_MESSAGE,
  UNCERTAIN_REGISTRATION_MESSAGE,
  isTransientAuthError,
  loginRequest,
  registerRequest,
} from '../services/authService.js';
import { AuthProvider } from '../hooks/useAuth.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';

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

describe('Authentication retry and registration safety', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('isTransientAuthError helper', () => {
    it('identifies network errors and gateway cold-start errors as transient', () => {
      expect(isTransientAuthError({ status: 0, code: 'NETWORK_ERROR' })).toBe(true);
      expect(isTransientAuthError({ status: 502, code: 'UNKNOWN_ERROR' })).toBe(true);
      expect(isTransientAuthError({ status: 503, code: 'UNKNOWN_ERROR' })).toBe(true);
      expect(isTransientAuthError({ status: 504, code: 'UNKNOWN_ERROR' })).toBe(true);
      expect(isTransientAuthError({ code: 'ERR_NETWORK' })).toBe(true);
      expect(isTransientAuthError({ code: 'ECONNABORTED' })).toBe(true);
    });

    it('identifies HTTP 4xx and application 500 errors as non-transient', () => {
      expect(isTransientAuthError({ status: 400, code: 'VALIDATION_ERROR' })).toBe(false);
      expect(isTransientAuthError({ status: 401, code: 'INVALID_CREDENTIALS' })).toBe(false);
      expect(isTransientAuthError({ status: 403, code: 'FORBIDDEN' })).toBe(false);
      expect(isTransientAuthError({ status: 404, code: 'NOT_FOUND' })).toBe(false);
      expect(isTransientAuthError({ status: 409, code: 'EMAIL_TAKEN' })).toBe(false);
      expect(isTransientAuthError({ status: 429, code: 'RATE_LIMITED' })).toBe(false);
      expect(isTransientAuthError({ status: 500, code: 'INTERNAL_ERROR' })).toBe(false);
      expect(isTransientAuthError(null)).toBe(false);
      expect(isTransientAuthError(undefined)).toBe(false);
    });
  });

  describe('Axios interceptor 401 session protection', () => {
    it('does not clear tokenStorage or redirect when 401 occurs on auth endpoints (/auth/login or /auth/register)', async () => {
      tokenStorage.set('valid-preexisting-token');
      const assignSpy = vi.fn();
      const originalLocation = window.location;
      delete window.location;
      window.location = { ...originalLocation, pathname: '/register', assign: assignSpy };

      const error = {
        config: { url: '/api/auth/login' },
        response: {
          status: 401,
          data: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } },
        },
      };

      try {
        // Run interceptor error handler
        await api.interceptors.response.handlers[0].rejected(error);
      } catch (err) {
        expect(err.status).toBe(401);
      }

      // Crucial: token was NOT cleared and window.location.assign was NOT called
      expect(tokenStorage.get()).toBe('valid-preexisting-token');
      expect(assignSpy).not.toHaveBeenCalled();

      window.location = originalLocation;
    });

    it('clears tokenStorage and redirects to /login when 401 occurs on protected routes', async () => {
      tokenStorage.set('expired-token');
      const assignSpy = vi.fn();
      const originalLocation = window.location;
      delete window.location;
      window.location = { ...originalLocation, pathname: '/dashboard', assign: assignSpy };

      const error = {
        config: { url: '/api/transactions' },
        response: {
          status: 401,
          data: { error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } },
        },
      };

      try {
        await api.interceptors.response.handlers[0].rejected(error);
      } catch (err) {
        expect(err.status).toBe(401);
      }

      expect(tokenStorage.get()).toBeNull();
      expect(assignSpy).toHaveBeenCalledWith('/login');

      window.location = originalLocation;
    });
  });

  describe('loginRequest service', () => {
    it('transient login network failure followed by successful recovery', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const networkError = { status: 0, code: 'NETWORK_ERROR', message: 'Network error.' };
      const successData = { data: { data: { token: 'jwt-123', user: { id: 'u1', email: 'user@test.com' } } } };

      postSpy
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successData);

      const loginPromise = loginRequest(
        { email: 'user@test.com', password: 'password123' },
        { maxRetries: 2, retryDelayMs: 500 },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      const result = await loginPromise;
      expect(result).toEqual({ token: 'jwt-123', user: { id: 'u1', email: 'user@test.com' } });
      expect(postSpy).toHaveBeenCalledTimes(2);
    });

    it('transient login failure that ultimately fails stops after configured limit', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const gatewayError = { status: 502, code: 'UNKNOWN_ERROR', message: 'Bad Gateway' };

      postSpy.mockRejectedValue(gatewayError);

      let caughtError = null;
      const loginPromise = loginRequest(
        { email: 'user@test.com', password: 'password123' },
        { maxRetries: 2, retryDelayMs: 300 },
      ).catch((err) => {
        caughtError = err;
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
        await vi.advanceTimersByTimeAsync(300);
      });

      await loginPromise;

      expect(postSpy).toHaveBeenCalledTimes(3);
      expect(caughtError).toBeDefined();
      expect(caughtError.message).toBe(TRANSIENT_AUTH_ERROR_MESSAGE);
      expect(caughtError.status).toBe(502);
    });

    it('invalid credentials (401) are not retried', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const invalidCredsError = {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      };

      postSpy.mockRejectedValueOnce(invalidCredsError);

      let caughtError = null;
      try {
        await loginRequest({ email: 'user@test.com', password: 'wrong' });
      } catch (err) {
        caughtError = err;
      }

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(caughtError).toEqual(invalidCredsError);
    });

    it('HTTP 4xx responses (400, 403) are not retried', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const validationError = {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format.',
      };

      postSpy.mockRejectedValueOnce(validationError);

      let caughtError = null;
      try {
        await loginRequest({ email: 'bad-email', password: 'pass' });
      } catch (err) {
        caughtError = err;
      }

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(caughtError).toEqual(validationError);
    });
  });

  describe('registerRequest service & non-idempotent registration safety', () => {
    it('registration succeeds and returns normally without retry', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const successData = { data: { data: { token: 'jwt-normal', user: { id: 'u1', email: 'normal@test.com' } } } };
      postSpy.mockResolvedValueOnce(successData);

      const result = await registerRequest({
        name: 'Normal User',
        email: 'normal@test.com',
        password: 'Password123',
      });

      expect(result).toEqual({ token: 'jwt-normal', user: { id: 'u1', email: 'normal@test.com' } });
      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith('/auth/register', {
        name: 'Normal User',
        email: 'normal@test.com',
        password: 'Password123',
      });
    });

    it('registration succeeds on server but response is lost: login probe recovers session without re-calling register', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const transientError = { status: 0, code: 'NETWORK_ERROR', message: 'Connection dropped' };
      const loginSuccessData = {
        data: { data: { token: 'jwt-recovered', user: { id: 'u2', email: 'new@test.com' } } },
      };

      // Initial POST /auth/register fails transiently
      postSpy.mockImplementation((url) => {
        if (url === '/auth/register') {
          return Promise.reject(transientError);
        }
        if (url === '/auth/login') {
          return Promise.resolve(loginSuccessData);
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const registerPromise = registerRequest(
        { name: 'New User', email: 'new@test.com', password: 'Password123' },
        { maxRetries: 2, retryDelayMs: 400 },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });

      const result = await registerPromise;
      expect(result).toEqual({ token: 'jwt-recovered', user: { id: 'u2', email: 'new@test.com' } });

      const registerCalls = postSpy.mock.calls.filter(([url]) => url === '/auth/register');
      const loginCalls = postSpy.mock.calls.filter(([url]) => url === '/auth/login');

      expect(registerCalls).toHaveLength(1); // Never blindly called register twice!
      expect(loginCalls).toHaveLength(1);
      expect(loginCalls[0][1]).toEqual({ email: 'new@test.com', password: 'Password123' });
    });

    it('login probe returning 401 does NOT repeat registration; halts and reports uncertain outcome', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const transientError = { status: 504, code: 'UNKNOWN_ERROR', message: 'Gateway Timeout' };
      const probe401Error = { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' };

      postSpy.mockImplementation((url) => {
        if (url === '/auth/register') {
          return Promise.reject(transientError);
        }
        if (url === '/auth/login') {
          return Promise.reject(probe401Error);
        }
        return Promise.reject(new Error('Unknown url'));
      });

      let caughtError = null;
      const registerPromise = registerRequest(
        { name: 'Uncertain User', email: 'uncertain@test.com', password: 'Password123' },
        { maxRetries: 2, retryDelayMs: 300 },
      ).catch((err) => {
        caughtError = err;
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      await registerPromise;

      const registerCalls = postSpy.mock.calls.filter(([url]) => url === '/auth/register');
      const loginCalls = postSpy.mock.calls.filter(([url]) => url === '/auth/login');

      // CRUCIAL: POST /auth/register was called ONLY ONCE. It did NOT repeat registration on 401!
      expect(registerCalls).toHaveLength(1);
      expect(loginCalls).toHaveLength(1);

      // Throws clear informative error instructing user to try logging in first
      expect(caughtError).toBeDefined();
      expect(caughtError.code).toBe('REGISTRATION_UNCERTAIN');
      expect(caughtError.message).toBe(UNCERTAIN_REGISTRATION_MESSAGE);
    });

    it('transient probe failures do not blindly repeat registration; stops after limit with uncertain error', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const transientError = { status: 502, code: 'UNKNOWN_ERROR', message: 'Bad Gateway' };

      postSpy.mockRejectedValue(transientError);

      let caughtError = null;
      const registerPromise = registerRequest(
        { name: 'Down User', email: 'down@test.com', password: 'Password123' },
        { maxRetries: 2, retryDelayMs: 200 },
      ).catch((err) => {
        caughtError = err;
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
        await vi.advanceTimersByTimeAsync(200);
      });

      await registerPromise;

      const registerCalls = postSpy.mock.calls.filter(([url]) => url === '/auth/register');
      const loginCalls = postSpy.mock.calls.filter(([url]) => url === '/auth/login');

      // Register was called only once initially; all retries were non-destructive login probes
      expect(registerCalls).toHaveLength(1);
      expect(loginCalls).toHaveLength(2);

      expect(caughtError).toBeDefined();
      expect(caughtError.code).toBe('REGISTRATION_UNCERTAIN');
      expect(caughtError.message).toBe(UNCERTAIN_REGISTRATION_MESSAGE);
    });

    it('registration duplicate email (409) is not retried', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const conflictError = {
        status: 409,
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists.',
      };

      postSpy.mockRejectedValueOnce(conflictError);

      let caughtError = null;
      try {
        await registerRequest({ name: 'Taken', email: 'taken@test.com', password: 'Password123' });
      } catch (err) {
        caughtError = err;
      }

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(caughtError).toEqual(conflictError);
    });
  });

  describe('UI Component integration (LoginPage & RegisterPage)', () => {
    it('LoginPage: a slow request still pending after 4 seconds shows the cold-start notice', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const gate = deferred();
      postSpy.mockReturnValue(gate.promise);

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<p>Dashboard Page</p>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
      });

      // At 3.8s: notice is not yet visible
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3800);
      });
      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();

      // At 4.1s: notice is visible
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(screen.getByText('Waking things up…')).toBeInTheDocument();

      // Completes successfully: notice disappears, navigates to dashboard
      await act(async () => {
        gate.resolve({ data: { data: { token: 'jwt', user: { id: 'u1' } } } });
      });

      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    it('LoginPage: transient network failure recovers transparently without premature network error', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const networkError = { status: 0, code: 'NETWORK_ERROR', message: 'Network error.' };
      const successData = { data: { data: { token: 'jwt-auth', user: { id: 'u1' } } } };

      postSpy
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successData);

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<p>Dashboard Page</p>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
      });

      // Submit button is loading and disabled (Button displays 'Please wait...')
      expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();

      // Crucial: No premature network error is displayed to the user
      expect(screen.queryByText(/Network error/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();

      // Advance through default retry delay (1000ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEFAULT_AUTH_RETRY_CONFIG.retryDelayMs);
      });

      // Resolves to dashboard
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
      expect(postSpy).toHaveBeenCalledTimes(2);
    });

    it('LoginPage: submit button and error state recover correctly when transient failure ultimately exhausts retries', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const networkError = { status: 0, code: 'NETWORK_ERROR', message: 'Network error.' };

      // Each network attempt takes 1500ms before failing
      postSpy.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(networkError), 1500)),
      );

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
      });

      expect(screen.queryByText(TRANSIENT_AUTH_ERROR_MESSAGE)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();

      // At 4100ms: attempt 1 (1500ms) + retry delay (1000ms) + attempt 2 in flight (1600ms) -> > 4s:
      // Cold-start notice appears while request is still pending
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4100);
      });
      expect(screen.getByText('Waking things up…')).toBeInTheDocument();

      // Advance past remaining attempts and delays
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Retries exhausted:
      // 1. Cold start notice is cleared
      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
      // 2. Actionable error message is displayed
      expect(screen.getByText(TRANSIENT_AUTH_ERROR_MESSAGE)).toBeInTheDocument();
      // 3. Submit button is re-enabled
      expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    });

    it('RegisterPage: uncertain registration outcome shows clear message and re-enables submit button', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const networkError = { status: 0, code: 'NETWORK_ERROR', message: 'Network error.' };

      postSpy.mockRejectedValue(networkError);

      render(
        <MemoryRouter initialEntries={['/register']}>
          <AuthProvider>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
      });

      expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();
      expect(screen.queryByText(UNCERTAIN_REGISTRATION_MESSAGE)).not.toBeInTheDocument();

      // Advance through probe retries (1000ms + 1000ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // Informative error displayed and button re-enabled
      expect(screen.getByText(UNCERTAIN_REGISTRATION_MESSAGE)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
      expect(screen.queryByText('Waking things up…')).not.toBeInTheDocument();
    });

    it('RegisterPage: manual retry after uncertain registration does not duplicate account if previous succeeded', async () => {
      const postSpy = vi.spyOn(api, 'post');
      const transientError = { status: 504, code: 'UNKNOWN_ERROR', message: 'Gateway Timeout' };
      const probe401 = { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' };
      const conflictError = {
        status: 409,
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists.',
        fieldErrors: {},
      };

      // 1st submit: register 504 -> probe 401 -> uncertain
      postSpy
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(probe401);

      render(
        <MemoryRouter initialEntries={['/register']}>
          <AuthProvider>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(screen.getByText(UNCERTAIN_REGISTRATION_MESSAGE)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();

      // User clicks submit again:
      // The server had actually committed the first attempt, so the 2nd attempt returns 409 EMAIL_TAKEN
      postSpy.mockRejectedValueOnce(conflictError);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
      });

      // Shows email already exists error without duplicating
      expect(screen.getByText('An account with this email already exists.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
    });
  });
});
