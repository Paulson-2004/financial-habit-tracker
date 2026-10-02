import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

// Unit tests never touch a real database. The optional integration tests in
// tests/integration only run when TEST_DATABASE_URL is set (shell or root .env).
const rootEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
const fileEnv = fs.existsSync(rootEnvPath) ? dotenv.parse(fs.readFileSync(rootEnvPath)) : {};
const testDatabaseUrl = process.env.TEST_DATABASE_URL || fileEnv.TEST_DATABASE_URL || '';
const testDatabaseSsl = process.env.TEST_DATABASE_SSL || fileEnv.TEST_DATABASE_SSL || 'false';

// `test.env` below exposes values through `import.meta.env`, but integration helpers
// intentionally read `process.env` before any app modules are imported. Populate the
// worker's process environment too, so a locally configured TEST_DATABASE_URL actually
// enables the opt-in integration suite.
if (testDatabaseUrl) {
  process.env.TEST_DATABASE_URL = testDatabaseUrl;
  process.env.TEST_DATABASE_SSL = testDatabaseSsl;
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Integration test files share one real Postgres database and each resets it
    // (TRUNCATE ... CASCADE) in beforeEach/beforeAll - see tests/helpers/testDb.js.
    // Vitest's default pool runs test FILES in parallel worker processes, which lets two
    // files' resets/queries race against the same tables and deadlock or wipe data
    // mid-test. Forcing sequential file execution removes the race entirely. Unit tests
    // (no DB) don't need this, but the cost of running them sequentially too is small
    // compared to the fragility of a mixed parallel/sequential setup.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/unit_test_placeholder',
      DATABASE_SSL: 'false',
      JWT_SECRET: 'test-secret-only-for-unit-tests-0123456789',
      JWT_EXPIRES_IN: '1h',
      BCRYPT_COST: '4',
      CLIENT_ORIGIN: 'http://localhost:5173',
      TEST_DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_SSL: testDatabaseSsl,
    },
  },
});
