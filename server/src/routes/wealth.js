import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import * as wealthService from '../services/wealthService.js';

const router = Router();

router.use(authenticate);

// GET /api/wealth/summary -> 200 { data: {...} }
// Consolidated read for the Dashboard/Wealth page - totals, allocation, breakdown, and
// snapshot history in one call. There is no separate GET /api/wealth/snapshots: this
// endpoint's netWorthHistory already is that list, so a second endpoint would be
// redundant - see docs/api.md.
router.get('/summary', async (req, res) => {
  const summary = await wealthService.getSummary(req.user.id);
  res.json({ data: summary });
});

// POST /api/wealth/snapshots -> 201 { data: {...} }
// Takes no body: always records TODAY's totals from the user's CURRENT assets/
// liabilities (never a client-supplied date or client-supplied totals) - user-triggered,
// no scheduler. A second call on the same day upserts (see
// db/queries/netWorthSnapshots.js).
router.post('/snapshots', async (req, res) => {
  const snapshot = await wealthService.recordSnapshot(req.user.id);
  res.status(201).json({ data: snapshot });
});

export default router;
