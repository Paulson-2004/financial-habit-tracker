import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { loginSchema, registerSchema } from '../validators/authValidators.js';
import * as authService from '../services/authService.js';

const router = Router();

// POST /api/auth/register -> 201 { data: { token, user } }
router.post('/register', authLimiter, validate({ body: registerSchema }), async (req, res) => {
  const result = await authService.register(req.valid.body);
  res.status(201).json({ data: result });
});

// POST /api/auth/login -> 200 { data: { token, user } }
router.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res) => {
  const result = await authService.login(req.valid.body);
  res.json({ data: result });
});

// GET /api/auth/me -> 200 { data: { user } }   (used by the client to restore a session)
router.get('/me', authenticate, (req, res) => {
  res.json({ data: { user: req.user } });
});

export default router;
