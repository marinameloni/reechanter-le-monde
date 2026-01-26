import { Router } from 'express';
import { postProgress, postTransfer, postExchange, getHighestUnlockedMap } from '../controllers/game.controller.js';

const router = Router();

// Persist important game progress (resources, world state)
router.post('/progress', postProgress);
router.post('/trade/transfer', postTransfer);
router.post('/trade/exchange', postExchange);
router.get('/highest-unlocked', getHighestUnlockedMap);

export default router;
