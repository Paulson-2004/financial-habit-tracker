import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import healthRouter from './routes/health.js';
import apiRouter from './routes/index.js';

/** Builds the Express app. Exported as a factory so tests get a fresh instance. */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Behind Render's proxy the client IP is in X-Forwarded-For; needed for correct rate limiting.
  app.set('trust proxy', env.isProduction ? 1 : false);

  app.use(helmet());
  app.use(
    cors({
      // Non-browser clients send no Origin header and are allowed; browsers must match the allowlist.
      origin: (origin, callback) => callback(null, !origin || env.CLIENT_ORIGINS.includes(origin)),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  app.use(express.json({ limit: '10kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api', apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
