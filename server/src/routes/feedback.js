import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { feedbackLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import {
  createFeedbackSchema,
  feedbackIdParamsSchema,
  feedbackListQuerySchema,
} from '../validators/feedbackValidators.js';
import * as feedbackService from '../services/feedbackService.js';

const router = Router();

router.use(authenticate);

// /mine is declared BEFORE /:id for the same reason as transactions' /categories,/summary.

// GET /api/feedback/mine -> 200 { data: [...], meta }
router.get('/mine', validate({ query: feedbackListQuerySchema }), async (req, res) => {
  const result = await feedbackService.listMyFeedback(req.user.id, req.valid.query);
  res.json({ data: result.rows, meta: result.meta });
});

// GET /api/feedback/:id -> 200 { data: {...} }
router.get('/:id', validate({ params: feedbackIdParamsSchema }), async (req, res) => {
  const item = await feedbackService.getFeedback(req.user.id, req.valid.params.id);
  res.json({ data: item });
});

// POST /api/feedback -> 201 { data: {...} }
router.post('/', feedbackLimiter, validate({ body: createFeedbackSchema }), async (req, res) => {
  const item = await feedbackService.createFeedback(req.user.id, req.valid.body);
  res.status(201).json({ data: item });
});

export default router;
