import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  categoryListQuerySchema,
  transactionBodySchema,
  transactionIdParamsSchema,
  transactionListQuerySchema,
  transactionSummaryQuerySchema,
} from '../validators/transactionValidators.js';
import * as transactionService from '../services/transactionService.js';

const router = Router();

router.use(authenticate);

// /categories and /summary are declared BEFORE /:id so Express doesn't treat
// "categories"/"summary" as an :id value - see AGENTS.md section 10 and docs/api.md.

// GET /api/transactions/categories?type= -> 200 { data: [...] }
router.get('/categories', validate({ query: categoryListQuerySchema }), async (req, res) => {
  const categories = await transactionService.listCategories(req.valid.query.type);
  res.json({ data: categories });
});

// GET /api/transactions/summary?month=YYYY-MM -> 200 { data: {...} }
router.get('/summary', validate({ query: transactionSummaryQuerySchema }), async (req, res) => {
  const summary = await transactionService.getMonthlySummary(req.user.id, req.valid.query.month);
  res.json({ data: summary });
});

// GET /api/transactions -> 200 { data: [...], meta, totals }
router.get('/', validate({ query: transactionListQuerySchema }), async (req, res) => {
  const result = await transactionService.listTransactions(req.user.id, req.valid.query);
  res.json(result);
});

// GET /api/transactions/:id -> 200 { data: {...} }
router.get('/:id', validate({ params: transactionIdParamsSchema }), async (req, res) => {
  const transaction = await transactionService.getTransaction(req.user.id, req.valid.params.id);
  res.json({ data: transaction });
});

// POST /api/transactions -> 201 { data: {...} }
router.post('/', validate({ body: transactionBodySchema }), async (req, res) => {
  const transaction = await transactionService.createTransaction(req.user.id, req.valid.body);
  res.status(201).json({ data: transaction });
});

// PUT /api/transactions/:id (full replace) -> 200 { data: {...} }
router.put(
  '/:id',
  validate({ params: transactionIdParamsSchema, body: transactionBodySchema }),
  async (req, res) => {
    const transaction = await transactionService.updateTransaction(req.user.id, req.valid.params.id, req.valid.body);
    res.json({ data: transaction });
  },
);

// DELETE /api/transactions/:id -> 204
router.delete('/:id', validate({ params: transactionIdParamsSchema }), async (req, res) => {
  await transactionService.deleteTransaction(req.user.id, req.valid.params.id);
  res.status(204).end();
});

export default router;
