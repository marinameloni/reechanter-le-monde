import { Router } from 'express';
import { updateColors } from '../controllers/player.controller.js';

const router = Router();

// Update the customizable colors of a player
router.post('/colors', updateColors);

export default router;
