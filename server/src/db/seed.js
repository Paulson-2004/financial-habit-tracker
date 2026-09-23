import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pool, closePool, withTransaction } from './pool.js';
import * as usersDb from './queries/users.js';
import { hashPassword } from '../utils/password.js';
import { registerSchema } from '../validators/authValidators.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Exported so tests/helpers/testDb.js can seed the same system-category data for
// integration tests, instead of maintaining a second copy of this logic.
export const SEEDS_DIR = path.resolve(__dirname, '../../../database/seeds');

/**
 * Ensures the admin account described by SEED_ADMIN_* exists (idempotent).
 * The password is read from the environment - it is never hard-coded.
 */
async function seedAdmin() {
  const input = registerSchema.safeParse({
    name: process.env.SEED_ADMIN_NAME || 'Platform Admin',
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  if (!input.success) {
    const problems = input.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Set valid SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env (${problems})`);
  }
  const { name, email, password } = input.data;

  const existing = await usersDb.findUserByEmail(email);
  if (existing) {
    if (existing.role !== 'admin' || !existing.isActive) {
      await usersDb.promoteToAdmin(existing.id);
      console.log(`Existing user ${email} promoted to an active admin.`);
    } else {
      console.log(`Admin ${email} already exists - nothing to do.`);
    }
    return;
  }

  const passwordHash = await hashPassword(password);
  await withTransaction(async (tx) => {
    const admin = await usersDb.insertUser({ name, email, passwordHash, role: 'admin' }, tx);
    await usersDb.insertDefaultProfile(admin.id, tx);
  });
  console.log(`Admin ${email} created.`);
}

/** Runs database/seeds/*.sql in filename order. Seed files must be idempotent. */
export async function runSqlSeeds() {
  const files = (await fs.readdir(SEEDS_DIR)).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files) {
    console.log(`Running seed ${file} ...`);
    await pool.query(await fs.readFile(path.join(SEEDS_DIR, file), 'utf8'));
  }
}

export async function runSeeds() {
  await seedAdmin();
  await runSqlSeeds();
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  runSeeds()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}
