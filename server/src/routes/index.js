import { Router } from 'express';
import assetsRouter from './assets.js';
import authRouter from './auth.js';
import adminRouter from './admin.js';
import feedbackRouter from './feedback.js';
import goalsRouter from './goals.js';
import habitsRouter from './habits.js';
import liabilitiesRouter from './liabilities.js';
import transactionsRouter from './transactions.js';
import usersRouter from './users.js';
import wealthRouter from './wealth.js';

// Register new resource routers here (the rest of /api/admin, ...).
// /api/health is mounted separately in app.js so it is not rate limited.
const router = Router();

router.use('/auth', authRouter);
router.use('/admin', adminRouter);
router.use('/users', usersRouter);
router.use('/transactions', transactionsRouter);
router.use('/feedback', feedbackRouter);
router.use('/habits', habitsRouter);
router.use('/goals', goalsRouter);
router.use('/assets', assetsRouter);
router.use('/liabilities', liabilitiesRouter);
router.use('/wealth', wealthRouter);

export default router;
