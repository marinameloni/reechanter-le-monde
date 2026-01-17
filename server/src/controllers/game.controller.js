import { applyProgress } from '../services/game.service.js';

export async function postProgress(req, res) {
	try {
		const {
			playerId,
			deltaBricks = 0,
			deltaRocks = 0,
			deltaWorldScore = 0,
		} = req.body || {};

		if (!playerId) {
			return res
				.status(400)
				.json({ success: false, message: 'playerId is required' });
		}

		await applyProgress({
			playerId,
			deltaBricks,
			deltaRocks,
			deltaWorldScore,
		});

		res.json({ success: true });
	} catch (err) {
		console.error('Failed to apply game progress', err);
		res
			.status(500)
			.json({ success: false, message: 'Failed to apply progress' });
	}
}
