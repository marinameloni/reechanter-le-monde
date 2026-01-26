import { Router } from 'express';
import { resetGame, grantAdminRocks, fillLevelRequirement, blockUser, unblockUser, giveAllToolsToUser } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Admin-only endpoint to reset the game state
router.post('/reset', requireAdmin, resetGame);
router.post('/grant-rocks', requireAdmin, grantAdminRocks);
router.post('/fill-level', requireAdmin, fillLevelRequirement);
router.post('/block-user', requireAdmin, blockUser);
router.post('/unblock-user', requireAdmin, unblockUser);
router.post('/give-all-tools', requireAdmin, giveAllToolsToUser);

export default router;
