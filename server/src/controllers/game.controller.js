import { applyProgress, transferResources, exchangeResources } from '../services/game.service.js';
import { openDB } from '../config/db.js';

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
		const { aId, bId } = req.body || {};
		let { aToBBricks = 0, aToBRocks = 0, bToABricks = 0, bToARocks = 0 } = req.body || {};

		if (!aId || !bId) {
			return res.status(400).json({ success: false, message: 'aId and bId are required' });
		}

		// Normalize numeric inputs
		aToBBricks = Number(aToBBricks) || 0;
		aToBRocks = Number(aToBRocks) || 0;
		bToABricks = Number(bToABricks) || 0;
		bToARocks = Number(bToARocks) || 0;

		// simple validation
		if (aToBBricks < 0 || aToBRocks < 0 || bToABricks < 0 || bToARocks < 0) {
			return res.status(400).json({ success: false, message: 'Invalid exchange amounts' });
		}

		try {
			const result = await exchangeResources({ aId, bId, aToBBricks, aToBRocks, bToABricks, bToARocks });
			return res.json({ success: true, result });
		} catch (errInner) {
			console.error('exchangeResources failed', { err: errInner, body: req.body });
			throw errInner;
		}
	} catch (err) {
		console.error('postExchange error', err);
		const insufficient = (err.message || '').toLowerCase().includes('insufficient');
		const code = insufficient ? 400 : 500;
		res.status(code).json({ success: false, message: err.message || 'Failed to exchange resources' });
	}
}

// Returns the highest unlocked map id based on server-side progress
export async function getHighestUnlockedMap(req, res) {
	try {
		const db = await openDB();

		let highest = 1;

		// Map 1 -> 2 unlocked when factory 1 complete
		const fp1 = await db.get('SELECT clicks_current, clicks_required FROM factory_progress WHERE id_map = 1;');
		if (fp1 && (fp1.clicks_current || 0) >= (fp1.clicks_required || 500)) {
			highest = Math.max(highest, 2);
		}

		// Map 2 -> 3 unlocked when factory 2 complete
		const fp2 = await db.get('SELECT clicks_current, clicks_required FROM factory_progress WHERE id_map = 2;');
		if (fp2 && (fp2.clicks_current || 0) >= (fp2.clicks_required || 1000)) {
			highest = Math.max(highest, 3);
		}

		// Map 3 -> 4 unlocked when all flower tiles completed
		const fTotal3 = await db.get('SELECT COUNT(*) as total FROM flower_progress WHERE id_map = 3;');
		const fRemaining3 = await db.get('SELECT COUNT(*) as remaining FROM flower_progress WHERE id_map = 3 AND water_current < water_required;');
		if ((fTotal3?.total || 0) > 0 && (fRemaining3?.remaining || 0) === 0) {
			highest = Math.max(highest, 4);
		}

		// Map 4 -> 5 unlocked when all fences built
		const fenceCounts4 = await db.get('SELECT SUM(built) as built_count, COUNT(*) as total_count FROM fence_progress WHERE id_map = 4;');
		const built = fenceCounts4?.built_count || 0;
		const total = fenceCounts4?.total_count || 0;
		if (total > 0 && built >= total) {
			highest = Math.max(highest, 5);
		}

		res.json({ success: true, highestUnlockedMapId: highest });
	} catch (err) {
		console.error('Failed to compute highest unlocked map', err);
		res.status(500).json({ success: false, message: 'Failed to compute highest unlocked map' });
	}
}
