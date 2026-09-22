import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

// Liveness + database connectivity. Public, no auth. Used for deployment verification / uptime checks.
router.get('/', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    await query('SELECT 1');
    res.json({ data: { status: 'ok', database: 'up', uptimeSeconds: Math.round(process.uptime()), timestamp } });
  } catch {
    res.status(503).json({ data: { status: 'degraded', database: 'down', timestamp } });
  }
});

export default router;
