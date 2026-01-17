import { Router } from 'express';
import { postProgress } from '../controllers/game.controller.js';

const router = Router();

// Persist important game progress (resources, world state)
router.post('/progress', postProgress);

export default router;
