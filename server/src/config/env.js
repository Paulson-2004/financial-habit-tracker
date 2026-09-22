import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the repository-root .env (server/src/config -> ../../../.env).
// A missing file is fine: hosted environments inject real environment variables,
// and dotenv never overrides variables that are already set.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_SSL: z.enum(['true', 'false']).default('false'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/, 'Use a number followed by s, m, h or d (for example 8h)')
      .default('8h'),
    BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
    CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && /change-me/i.test(value.JWT_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET still contains the placeholder from .env.example',
      });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  console.error(`Invalid environment configuration:\n${lines.join('\n')}\nSee .env.example.`);
  throw new Error('Invalid environment configuration');
}

const data = parsed.data;

export const env = Object.freeze({
  ...data,
  DATABASE_SSL: data.DATABASE_SSL === 'true',
  // Comma-separated list, trailing slashes removed so it matches the browser's Origin header.
  CLIENT_ORIGINS: data.CLIENT_ORIGIN.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  isProduction: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
});
