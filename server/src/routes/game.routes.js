import { Router } from 'express';
import { postProgress, postTransfer, postExchange, getHighestUnlockedMap } from '../controllers/game.controller.js';
import { getLeaderboard } from '../controllers/leaderboard.controller.js';

const router = Router();

// Persist important game progress (resources, world state)
router.post('/progress', postProgress);
router.post('/trade/transfer', postTransfer);
router.post('/trade/exchange', postExchange);
router.get('/highest-unlocked', getHighestUnlockedMap);
router.get('/leaderboard', getLeaderboard);

export default router;
