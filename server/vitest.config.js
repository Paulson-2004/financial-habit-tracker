import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

// Unit tests never touch a real database. The optional integration tests in
// tests/integration only run when TEST_DATABASE_URL is set (shell or root .env).
const rootEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
const fileEnv = fs.existsSync(rootEnvPath) ? dotenv.parse(fs.readFileSync(rootEnvPath)) : {};

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/unit_test_placeholder',
      DATABASE_SSL: 'false',
      JWT_SECRET: 'test-secret-only-for-unit-tests-0123456789',
      JWT_EXPIRES_IN: '1h',
      BCRYPT_COST: '4',
      CLIENT_ORIGIN: 'http://localhost:5173',
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || fileEnv.TEST_DATABASE_URL || '',
      TEST_DATABASE_SSL: process.env.TEST_DATABASE_SSL || fileEnv.TEST_DATABASE_SSL || 'false',
    },
  },
});
