import { Router } from 'express';
import authRouter from './auth.js';
import adminRouter from './admin.js';
import feedbackRouter from './feedback.js';
import goalsRouter from './goals.js';
import habitsRouter from './habits.js';
import transactionsRouter from './transactions.js';
import usersRouter from './users.js';

// Register new resource routers here (assets, liabilities, ...).
// /api/health is mounted separately in app.js so it is not rate limited.
const router = Router();

router.use('/auth', authRouter);
router.use('/admin', adminRouter);
router.use('/users', usersRouter);
router.use('/transactions', transactionsRouter);
router.use('/feedback', feedbackRouter);
router.use('/habits', habitsRouter);
router.use('/goals', goalsRouter);

export default router;
