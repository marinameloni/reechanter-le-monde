import { Router } from 'express';
import { resetGame, grantAdminRocks } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Admin-only endpoint to reset the game state
router.post('/reset', requireAdmin, resetGame);
router.post('/grant-rocks', requireAdmin, grantAdminRocks);

export default router;
