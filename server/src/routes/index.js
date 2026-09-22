import { Router } from 'express';
import authRouter from './auth.js';
import adminRouter from './admin.js';

// Register new resource routers here (transactions, habits, goals, ...).
// /api/health is mounted separately in app.js so it is not rate limited.
const router = Router();

router.use('/auth', authRouter);
router.use('/admin', adminRouter);

export default router;
