import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  createLiabilitySchema,
  liabilityIdParamsSchema,
  updateLiabilitySchema,
} from '../validators/liabilityValidators.js';
import * as liabilityService from '../services/liabilityService.js';

const router = Router();

router.use(authenticate);

// GET /api/liabilities -> 200 { data: [...] }
router.get('/', async (req, res) => {
  const liabilities = await liabilityService.listLiabilities(req.user.id);
  res.json({ data: liabilities });
});

// POST /api/liabilities -> 201 { data: {...} }
router.post('/', validate({ body: createLiabilitySchema }), async (req, res) => {
  const liability = await liabilityService.createLiability(req.user.id, req.valid.body);
  res.status(201).json({ data: liability });
});

// GET /api/liabilities/:id -> 200 { data: {...} }
router.get('/:id', validate({ params: liabilityIdParamsSchema }), async (req, res) => {
  const liability = await liabilityService.getLiability(req.user.id, req.valid.params.id);
  res.json({ data: liability });
});

// PATCH /api/liabilities/:id (partial update, at least one field) -> 200 { data: {...} }
router.patch(
  '/:id',
  validate({ params: liabilityIdParamsSchema, body: updateLiabilitySchema }),
  async (req, res) => {
    const liability = await liabilityService.updateLiability(req.user.id, req.valid.params.id, req.valid.body);
    res.json({ data: liability });
  },
);

// DELETE /api/liabilities/:id -> 204
router.delete('/:id', validate({ params: liabilityIdParamsSchema }), async (req, res) => {
  await liabilityService.deleteLiability(req.user.id, req.valid.params.id);
  res.status(204).end();
});

export default router;
