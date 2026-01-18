import { Router } from 'express';
import { updateColor } from '../controllers/player.controller.js';

const router = Router();

// Update the customizable color of a player
router.post('/color', updateColor);

export default router;
