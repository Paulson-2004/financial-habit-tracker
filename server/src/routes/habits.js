import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  habitBodySchema,
  habitCompletionDateParamsSchema,
  habitIdParamsSchema,
  habitTodayQuerySchema,
  markCompletionBodySchema,
} from '../validators/habitValidators.js';
import * as habitService from '../services/habitService.js';

const router = Router();

router.use(authenticate);

// GET /api/habits?today=YYYY-MM-DD -> 200 { data: [...] }
// `today` is the client's own local date, so streaks are computed relative to the user's
// calendar day rather than the server's - see docs/business-rules.md.
router.get('/', validate({ query: habitTodayQuerySchema }), async (req, res) => {
  const habits = await habitService.listHabits(req.user.id, req.valid.query.today);
  res.json({ data: habits });
});

// POST /api/habits -> 201 { data: {...} }
router.post('/', validate({ body: habitBodySchema }), async (req, res) => {
  const habit = await habitService.createHabit(req.user.id, req.valid.body);
  res.status(201).json({ data: habit });
});

// GET /api/habits/:id?today=YYYY-MM-DD -> 200 { data: {...} }
router.get('/:id', validate({ params: habitIdParamsSchema, query: habitTodayQuerySchema }), async (req, res) => {
  const habit = await habitService.getHabit(req.user.id, req.valid.params.id, req.valid.query.today);
  res.json({ data: habit });
});

// PUT /api/habits/:id (full replace of name/description/category) -> 200 { data: {...} }
router.put('/:id', validate({ params: habitIdParamsSchema, body: habitBodySchema }), async (req, res) => {
  const habit = await habitService.updateHabit(req.user.id, req.valid.params.id, req.valid.body);
  res.json({ data: habit });
});

// DELETE /api/habits/:id -> 204 (cascades completions)
router.delete('/:id', validate({ params: habitIdParamsSchema }), async (req, res) => {
  await habitService.deleteHabit(req.user.id, req.valid.params.id);
  res.status(204).end();
});

// GET /api/habits/:id/completions -> 200 { data: ["YYYY-MM-DD", ...] }
router.get('/:id/completions', validate({ params: habitIdParamsSchema }), async (req, res) => {
  const dates = await habitService.getCompletionHistory(req.user.id, req.valid.params.id);
  res.json({ data: dates });
});

// POST /api/habits/:id/completions?today=YYYY-MM-DD  body: { date } -> 200 { data: {...} }
// Idempotent (marking an already-completed date again is a no-op). Returns the
// recomputed habit so the client's streak display updates immediately.
router.post(
  '/:id/completions',
  validate({ params: habitIdParamsSchema, query: habitTodayQuerySchema, body: markCompletionBodySchema }),
  async (req, res) => {
    const habit = await habitService.markCompletion(
      req.user.id,
      req.valid.params.id,
      req.valid.body.date,
      req.valid.query.today,
    );
    res.json({ data: habit });
  },
);

// DELETE /api/habits/:id/completions/:date?today=YYYY-MM-DD -> 200 { data: {...} }
router.delete(
  '/:id/completions/:date',
  validate({ params: habitCompletionDateParamsSchema, query: habitTodayQuerySchema }),
  async (req, res) => {
    const habit = await habitService.undoCompletion(
      req.user.id,
      req.valid.params.id,
      req.valid.params.date,
      req.valid.query.today,
    );
    res.json({ data: habit });
  },
);

export default router;
