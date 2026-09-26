import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  contributionIdParamsSchema,
  createContributionSchema,
  createGoalSchema,
  goalIdParamsSchema,
  updateGoalSchema,
} from '../validators/goalValidators.js';
import * as goalService from '../services/goalService.js';

const router = Router();

router.use(authenticate);

// GET /api/goals -> 200 { data: [...] }
router.get('/', async (req, res) => {
  const goals = await goalService.listGoals(req.user.id);
  res.json({ data: goals });
});

// POST /api/goals -> 201 { data: {...} }
router.post('/', validate({ body: createGoalSchema }), async (req, res) => {
  const goal = await goalService.createGoal(req.user.id, req.valid.body);
  res.status(201).json({ data: goal });
});

// GET /api/goals/:id -> 200 { data: {...} }
router.get('/:id', validate({ params: goalIdParamsSchema }), async (req, res) => {
  const goal = await goalService.getGoal(req.user.id, req.valid.params.id);
  res.json({ data: goal });
});

// PUT /api/goals/:id (full replace) -> 200 { data: {...} }
router.put('/:id', validate({ params: goalIdParamsSchema, body: updateGoalSchema }), async (req, res) => {
  const goal = await goalService.updateGoal(req.user.id, req.valid.params.id, req.valid.body);
  res.json({ data: goal });
});

// DELETE /api/goals/:id -> 204 (cascades contributions)
router.delete('/:id', validate({ params: goalIdParamsSchema }), async (req, res) => {
  await goalService.deleteGoal(req.user.id, req.valid.params.id);
  res.status(204).end();
});

// GET /api/goals/:id/contributions -> 200 { data: [...] }
router.get('/:id/contributions', validate({ params: goalIdParamsSchema }), async (req, res) => {
  const contributions = await goalService.listContributions(req.user.id, req.valid.params.id);
  res.json({ data: contributions });
});

// POST /api/goals/:id/contributions -> 201 { data: { contribution, goal } }
// Returns the updated goal alongside the new contribution so the client can refresh
// progress without a second round-trip.
router.post(
  '/:id/contributions',
  validate({ params: goalIdParamsSchema, body: createContributionSchema }),
  async (req, res) => {
    const result = await goalService.addContribution(req.user.id, req.valid.params.id, req.valid.body);
    res.status(201).json({ data: result });
  },
);

// DELETE /api/goals/:id/contributions/:contributionId -> 200 { data: { goal } }
router.delete(
  '/:id/contributions/:contributionId',
  validate({ params: contributionIdParamsSchema }),
  async (req, res) => {
    const goal = await goalService.deleteContribution(req.user.id, req.valid.params.id, req.valid.params.contributionId);
    res.json({ data: { goal } });
  },
);

export default router;
