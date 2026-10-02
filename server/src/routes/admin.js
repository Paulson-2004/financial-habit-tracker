import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  adminFeedbackIdParamsSchema,
  adminFeedbackQuerySchema,
  adminUserIdParamsSchema,
  adminUsersQuerySchema,
  updateFeedbackStatusSchema,
  updateUserStatusSchema,
} from '../validators/adminValidators.js';
import * as adminService from '../services/adminService.js';

const router = Router();

// Every /api/admin/* route requires an authenticated admin. The role always comes
// from the database (via authenticate), never from the token or the client.
router.use(authenticate, requireRole('admin'));

// GET /api/admin/ping -> 200 { data: { ok, role } } (RBAC wiring check, kept for Day 1 tests)
router.get('/ping', (req, res) => {
  res.json({ data: { ok: true, role: req.user.role } });
});

// GET /api/admin/overview -> 200 { data: { users, content, feedback, monthlyTrends, recentUsers, recentFeedback } }
// Platform-level aggregates only - never individual financial records.
router.get('/overview', async (req, res) => {
  const overview = await adminService.getOverview();
  res.json({ data: overview });
});

// GET /api/admin/users?search=&role=&isActive=&page=&pageSize= -> 200 { data: [...], meta }
router.get('/users', validate({ query: adminUsersQuerySchema }), async (req, res) => {
  const result = await adminService.listUsers(req.valid.query);
  res.json({ data: result.rows, meta: result.meta });
});

// GET /api/admin/users/:id -> 200 { data: {...} }
router.get('/users/:id', validate({ params: adminUserIdParamsSchema }), async (req, res) => {
  const user = await adminService.getUserById(req.valid.params.id);
  res.json({ data: user });
});

// PATCH /api/admin/users/:id { isActive } -> 200 { data: {...} }
// Activation toggle only - there is no endpoint that changes anyone's role.
router.patch(
  '/users/:id',
  validate({ params: adminUserIdParamsSchema, body: updateUserStatusSchema }),
  async (req, res) => {
    const user = await adminService.setUserActive(req.user.id, req.valid.params.id, req.valid.body.isActive);
    res.json({ data: user });
  },
);

// GET /api/admin/feedback?status=&type=&search=&page=&pageSize= -> 200 { data: [...], meta }
router.get('/feedback', validate({ query: adminFeedbackQuerySchema }), async (req, res) => {
  const result = await adminService.listAllFeedback(req.valid.query);
  res.json({ data: result.rows, meta: result.meta });
});

// GET /api/admin/feedback/:id -> 200 { data: {...} }
router.get('/feedback/:id', validate({ params: adminFeedbackIdParamsSchema }), async (req, res) => {
  const item = await adminService.getAnyFeedback(req.valid.params.id);
  res.json({ data: item });
});

// PATCH /api/admin/feedback/:id { status?, adminNote? } -> 200 { data: {...} }
router.patch(
  '/feedback/:id',
  validate({ params: adminFeedbackIdParamsSchema, body: updateFeedbackStatusSchema }),
  async (req, res) => {
    const item = await adminService.updateFeedback(req.valid.params.id, req.valid.body);
    res.json({ data: item });
  },
);

export default router;
