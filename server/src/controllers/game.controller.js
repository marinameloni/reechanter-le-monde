import { applyProgress, transferResources, exchangeResources } from '../services/game.service.js';

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

export async function postTransfer(req, res) {
	try {
		const { fromId, toId, bricks = 0, rocks = 0 } = req.body || {};
		if (!fromId || !toId) {
			return res.status(400).json({ success: false, message: 'fromId and toId are required' });
		}
		const result = await transferResources({ fromId, toId, bricks, rocks });
		res.json({ success: true, result });
	} catch (err) {
		const code = err.message === 'Insufficient resources' ? 400 : 500;
		res.status(code).json({ success: false, message: err.message || 'Failed to transfer resources' });
	}
}

export async function postExchange(req, res) {
	try {
		const { aId, bId, aToBBricks = 0, aToBRocks = 0, bToABricks = 0, bToARocks = 0 } = req.body || {};
		if (!aId || !bId) {
			return res.status(400).json({ success: false, message: 'aId and bId are required' });
		}
		const result = await exchangeResources({ aId, bId, aToBBricks, aToBRocks, bToABricks, bToARocks });
		res.json({ success: true, result });
	} catch (err) {
		const insufficient = (err.message || '').includes('insufficient');
		const code = insufficient ? 400 : 500;
		res.status(code).json({ success: false, message: err.message || 'Failed to exchange resources' });
	}
}
