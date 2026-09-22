import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';

const router = Router();

// Every /api/admin/* route requires an authenticated admin. Day 5 adds the real admin endpoints here.
router.use(authenticate, requireRole('admin'));

// GET /api/admin/ping -> RBAC wiring check. Replace/remove when the admin module is built.
router.get('/ping', (req, res) => {
  res.json({ data: { ok: true, role: req.user.role } });
});

export default router;
