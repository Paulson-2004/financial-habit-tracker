import { api } from '../lib/axios.js';

export const DEFAULT_AUTH_RETRY_CONFIG = {
  maxRetries: 2,
  retryDelayMs: 1000,
};

export const TRANSIENT_AUTH_ERROR_MESSAGE =
  'Unable to connect to the server. Please check your connection and try again.';

/**
 * Identifies transient network and gateway errors plausibly caused by Render backend
 * cold start or brief connection drops (status 0 / NETWORK_ERROR, 502, 503, 504).
 * Returns false for definitive application responses (400 validation, 401 invalid credentials,
 * 403 forbidden, 409 conflict, 429 rate limit, 500 internal server error).
 */
export function isTransientAuthError(error) {
  if (!error) return false;
  if (error.status === 0 || error.code === 'NETWORK_ERROR') return true;
  if (error.status === 502 || error.status === 503 || error.status === 504) return true;
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') return true;
  return false;
}

function delay(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const UNCERTAIN_REGISTRATION_MESSAGE =
  'Registration status could not be confirmed due to a connection issue. Please try logging in before attempting to register again.';

/**
 * Registers a new user.
 *
 * If initial registration encounters a transient network/gateway failure (status 0, 502, 503, 504),
 * the server might or might not have processed the creation. Because the server does not support
 * an idempotency mechanism and a repeated registration could trigger a false 409 conflict if the
 * first request committed, the client NEVER automatically repeats POST /auth/register.
 *
 * Instead:
 * 1. It probes POST /auth/login with the submitted credentials.
 * 2. If the login probe succeeds (200 OK), the account was conclusively created; the session is returned.
 * 3. If the login probe returns 401 or cannot be confirmed within the bounded retry limit, the outcome
 *    remains uncertain. The client stops without repeating registration, and presents an informative
 *    message instructing the user to try logging in before registering again.
 */
export async function registerRequest(payload, options = {}) {
  const maxRetries = options.maxRetries ?? DEFAULT_AUTH_RETRY_CONFIG.maxRetries;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_AUTH_RETRY_CONFIG.retryDelayMs;

  try {
    const { data } = await api.post('/auth/register', payload);
    return data.data; // { token, user }
  } catch (initialError) {
    // Definitive failures (HTTP 4xx such as validation error 400 or duplicate email 409) are never retried
    if (!isTransientAuthError(initialError)) {
      throw initialError;
    }

    // A transient network/gateway error occurred.
    // Probing login checks whether the user was actually created before the connection dropped.
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt += 1;
      await delay(retryDelayMs);

      try {
        const loginResponse = await api.post('/auth/login', {
          email: payload.email,
          password: payload.password,
        });
        // Conclusive proof: Login succeeded, meaning the account was created on the initial attempt!
        // Return session immediately without repeating registration.
        return loginResponse.data.data;
      } catch (probeError) {
        if (probeError.status === 401) {
          // A 401 on login probe does NOT guarantee that registration did not or will not commit
          // (it may still be processing in PostgreSQL or under a cold start race).
          // To prevent race-condition duplicates or false 409 conflicts, DO NOT automatically repeat registration.
          throw {
            status: 0,
            code: 'REGISTRATION_UNCERTAIN',
            message: UNCERTAIN_REGISTRATION_MESSAGE,
            fieldErrors: {},
          };
        }

        if (!isTransientAuthError(probeError)) {
          // Non-transient probe failure (e.g. 403 ACCOUNT_DISABLED)
          throw probeError;
        }
        // If probe error is transient (0, 502, 503, 504), continue to next retry probe
      }
    }

    // All probes exhausted while connection was unavailable or outcome uncertain.
    // Never blindly repeat registration; report uncertain outcome to user.
    throw {
      status: 0,
      code: 'REGISTRATION_UNCERTAIN',
      message: UNCERTAIN_REGISTRATION_MESSAGE,
      fieldErrors: {},
    };
  }
}

/**
 * Logs in with email and password. Retries transient network/gateway failures using a small,
 * bounded retry policy. Never retries 401 INVALID_CREDENTIALS or 4xx errors.
 */
export async function loginRequest(payload, options = {}) {
  const maxRetries = options.maxRetries ?? DEFAULT_AUTH_RETRY_CONFIG.maxRetries;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_AUTH_RETRY_CONFIG.retryDelayMs;

  let attempt = 0;
  while (true) {
    try {
      const { data } = await api.post('/auth/login', payload);
      return data.data; // { token, user }
    } catch (error) {
      if (!isTransientAuthError(error) || attempt >= maxRetries) {
        if (isTransientAuthError(error)) {
          throw {
            ...error,
            message: TRANSIENT_AUTH_ERROR_MESSAGE,
          };
        }
        throw error;
      }
      attempt += 1;
      await delay(retryDelayMs);
    }
  }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.data.user;
}
