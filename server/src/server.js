import { env } from './config/env.js';
import { createApp } from './app.js';
import { closePool } from './db/pool.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// listen()'s own callback never receives an error (e.g. EADDRINUSE) - only this event does.
server.on('error', (error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
  // Force exit if connections do not drain in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
