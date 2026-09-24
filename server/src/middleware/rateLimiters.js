import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

/** Factory so tests (and later modules) can build limiters with their own limits. */
export function createLimiter({ windowMs, limit, message = 'Too many requests. Please try again later.', skip }) {
  const options = {
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
    },
  };
  if (skip) options.skip = skip;
  return rateLimit(options);
}

// Automated tests make many requests from one IP, so the shared limiters are disabled under NODE_ENV=test.
const skipInTests = () => env.isTest;

/** Generous limit for all /api routes. */
export const apiLimiter = createLimiter({ windowMs: 15 * 60 * 1000, limit: 300, skip: skipInTests });

/** Strict limit for register/login to slow down password guessing. */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many attempts. Please wait a few minutes and try again.',
  skip: skipInTests,
});

/** Limits spam on feedback/complaint submission - keyed per-IP like the others above. */
export const feedbackLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many submissions. Please wait a while and try again.',
  skip: skipInTests,
});
