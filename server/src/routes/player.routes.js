import { Router } from 'express';
import { updateColor, getInventory, buyToolController } from '../controllers/player.controller.js';

const router = Router();

// Update the customizable color of a player
router.post('/color', updateColor);
router.get('/inventory/:playerId', getInventory);
router.post('/tools/buy', buyToolController);

export default router;
