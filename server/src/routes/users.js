import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/profileValidators.js';
import * as profileService from '../services/profileService.js';

const router = Router();

router.use(authenticate);

// GET /api/users/me -> 200 { data: { profile: {...} } }
// Identity fields (name/email/role) come from GET /api/auth/me, unchanged from Day 1 -
// this endpoint is the financial profile only, per AGENTS.md section 6/11.
router.get('/me', async (req, res) => {
  const profile = await profileService.getProfile(req.user.id);
  res.json({ data: { profile } });
});

// PATCH /api/users/me -> 200 { data: { profile: {...} } }
router.patch('/me', validate({ body: updateProfileSchema }), async (req, res) => {
  const profile = await profileService.updateProfile(req.user.id, req.valid.body);
  res.json({ data: { profile } });
});

export default router;
