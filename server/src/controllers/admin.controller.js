import { openDB } from '../config/db.js';

export async function resetGame(req, res) {
	try {
		const db = await openDB();
		await db.exec('BEGIN TRANSACTION;');

		// Reset player positions and map back to 1 (keep roles/colors)
		await db.run('UPDATE player SET x = 0, y = 0, id_map = 1;');

		// Clear resources and tools
		await db.run('DELETE FROM inventory_tool;');
		await db.run('DELETE FROM inventory;');

		// Reset ruins/factories/debris state
		await db.run('UPDATE ruin SET clicks_current = 0, is_destroyed = 0;');

		// Reset shared progress tables
		await db.run('UPDATE factory_progress SET clicks_current = 0;');
		await db.run('UPDATE flower_progress SET water_current = 0;');
		await db.run('UPDATE fence_progress SET built = 0;');
		await db.run('DELETE FROM house_progress;');

		// Reset map 5 buildings and world state
		await db.run('DELETE FROM building;');
		await db.run('UPDATE world_state SET world_score = 0, day = 1;');

		// Optional: clear chat
		await db.run('DELETE FROM chat_message;');

		await db.exec('COMMIT;');

		res.json({ success: true, message: 'Game reset to initial state' });
	} catch (err) {
		try { await openDB().then(db => db.exec('ROLLBACK;')); } catch {}
		console.error('Admin reset failed', err);
		res.status(500).json({ success: false, message: 'Failed to reset game' });
	}
}

export async function grantAdminRocks(req, res) {
	try {
		const adminId = req.adminId;
		if (!adminId) return res.status(401).json({ success: false, message: 'Admin not identified' });
		const db = await openDB();
		await db.exec('BEGIN TRANSACTION;');
		// Ensure inventory exists
		const inv = await db.get('SELECT id_inventory, bricks, rocks FROM inventory WHERE id_player = ?;', [adminId]);
		if (!inv) {
			await db.run('INSERT INTO inventory (id_player, bricks, rocks) VALUES (?, 0, 0);', [adminId]);
		}
		// Grant 500 rocks
		await db.run('UPDATE inventory SET rocks = COALESCE(rocks, 0) + 500 WHERE id_player = ?;', [adminId]);
		const updated = await db.get('SELECT bricks, rocks FROM inventory WHERE id_player = ?;', [adminId]);
		await db.exec('COMMIT;');
		res.json({ success: true, inventory: updated });
	} catch (err) {
		try { await openDB().then(db => db.exec('ROLLBACK;')); } catch {}
		console.error('Grant rocks failed', err);
		res.status(500).json({ success: false, message: 'Failed to grant rocks' });
	}
}

export async function grantAdminBricks(req, res) {
	try {
		const adminId = req.adminId;
		if (!adminId) return res.status(401).json({ success: false, message: 'Admin not identified' });
		const db = await openDB();
		await db.exec('BEGIN TRANSACTION;');
		const inv = await db.get('SELECT id_inventory, bricks, rocks FROM inventory WHERE id_player = ?;', [adminId]);
		if (!inv) {
			await db.run('INSERT INTO inventory (id_player, bricks, rocks) VALUES (?, 0, 0);', [adminId]);
		}
		await db.run('UPDATE inventory SET bricks = COALESCE(bricks, 0) + 500 WHERE id_player = ?;', [adminId]);
		const updated = await db.get('SELECT bricks, rocks FROM inventory WHERE id_player = ?;', [adminId]);
		await db.exec('COMMIT;');
		res.json({ success: true, inventory: updated });
	} catch (err) {
		try { await openDB().then(db => db.exec('ROLLBACK;')); } catch {}
		console.error('Grant bricks failed', err);
		res.status(500).json({ success: false, message: 'Failed to grant bricks' });
	}
}

export async function giveAdminTool(req, res) {
	try {
		const adminId = req.adminId;
		const { type = 'shovel' } = req.body || {};
		if (!adminId) return res.status(401).json({ success: false, message: 'Admin not identified' });
		const db = await openDB();
		await db.exec('BEGIN TRANSACTION;');
		// Ensure inventory exists
		let inv = await db.get('SELECT id_inventory FROM inventory WHERE id_player = ?;', [adminId]);
		if (!inv) {
			await db.run('INSERT INTO inventory (id_player, bricks, rocks) VALUES (?, 0, 0);', [adminId]);
			inv = await db.get('SELECT id_inventory FROM inventory WHERE id_player = ?;', [adminId]);
		}
		// Ensure tool type exists
		let tool = await db.get('SELECT id_tool FROM tool WHERE type = ?;', [type]);
		if (!tool) {
			await db.run('INSERT INTO tool (type, base_bonus) VALUES (?, ?);', [type, type === 'shovel' ? 2 : 1]);
			tool = await db.get('SELECT id_tool FROM tool WHERE type = ?;', [type]);
		}
		// Add tool to inventory
		await db.run('INSERT INTO inventory_tool (id_inventory, id_tool, level, is_equipped) VALUES (?, ?, 1, 0);', [inv.id_inventory, tool.id_tool]);
		await db.exec('COMMIT;');
		res.json({ success: true });
	} catch (err) {
		try { await openDB().then(db => db.exec('ROLLBACK;')); } catch {}
		console.error('Give tool failed', err);
		res.status(500).json({ success: false, message: 'Failed to give tool' });
	}
}

export async function teleportAdmin(req, res) {
	try {
		const adminId = req.adminId;
		const { mapId = 1, x = 0, y = 0 } = req.body || {};
		if (!adminId) return res.status(401).json({ success: false, message: 'Admin not identified' });
		const db = await openDB();
		await db.exec('BEGIN TRANSACTION;');
		await db.run('UPDATE player SET id_map = ?, x = ?, y = ? WHERE id_player = ?;', [mapId, x, y, adminId]);
		const player = await db.get('SELECT id_player, username, id_map, x, y FROM player WHERE id_player = ?;', [adminId]);
		await db.exec('COMMIT;');
		res.json({ success: true, player });
	} catch (err) {
		try { await openDB().then(db => db.exec('ROLLBACK;')); } catch {}
		console.error('Teleport failed', err);
		res.status(500).json({ success: false, message: 'Failed to teleport' });
	}
}

// Fill level requirement: complete shared progress for a given map
export async function fillLevelRequirement(req, res) {
	try {
		const { mapId } = req.body || {};
		const db = await openDB();
		if (![1,2,3,4,5].includes(Number(mapId))) {
			return res.status(400).json({ success: false, message: 'Invalid mapId' });
		}
		await db.exec('BEGIN TRANSACTION;');
		let details = {};
		if (mapId === 1 || mapId === 2) {
			await db.run('UPDATE factory_progress SET clicks_current = clicks_required WHERE id_map = ?;', [mapId]);
			const row = await db.get('SELECT clicks_current, clicks_required FROM factory_progress WHERE id_map = ?;', [mapId]);
			details = { factory: row };
		} else if (mapId === 3) {
			await db.run('UPDATE flower_progress SET water_current = water_required WHERE id_map = 3;');
			const cnt = await db.get('SELECT COUNT(*) as total FROM flower_progress WHERE id_map = 3;');
			details = { flowersCompleted: cnt?.total || 0 };
		} else if (mapId === 4) {
			await db.run('UPDATE fence_progress SET built = 1 WHERE id_map = 4;');
			const cnt = await db.get('SELECT SUM(built) as built_count, COUNT(*) as total FROM fence_progress WHERE id_map = 4;');
			details = { fencesBuilt: cnt?.built_count || 0, total: cnt?.total || 0 };
		} else if (mapId === 5) {
			await db.run(`CREATE TABLE IF NOT EXISTS house_progress (
				id_map INTEGER,
				tile_x INTEGER,
				tile_y INTEGER,
				progress INTEGER DEFAULT 0,
				required INTEGER DEFAULT 50,
				PRIMARY KEY (id_map, tile_x, tile_y)
			);`);
			const sites = [
				{ x: 14, y: 13 },
				{ x: 8, y: 7 },
				{ x: 28, y: 7 },
			];
			for (const s of sites) {
				const row = await db.get('SELECT progress, required FROM house_progress WHERE id_map = 5 AND tile_x = ? AND tile_y = ?;', [s.x, s.y]);
				if (!row) {
					await db.run('INSERT INTO house_progress (id_map, tile_x, tile_y, progress, required) VALUES (5, ?, ?, 0, 50);', [s.x, s.y]);
				}
				await db.run('UPDATE house_progress SET progress = required WHERE id_map = 5 AND tile_x = ? AND tile_y = ?;', [s.x, s.y]);
			}
			const rows = await db.all('SELECT tile_x, tile_y, progress, required FROM house_progress WHERE id_map = 5;');
			details = { houses: rows };
		}
		await db.exec('COMMIT;');
		res.json({ success: true, details });
	} catch (err) {
		try { await openDB().then(db => db.exec('ROLLBACK;')); } catch {}
		console.error('Fill level requirement failed', err);
		res.status(500).json({ success: false, message: 'Failed to complete level' });
	}
}

// Block/Ban a user by username
export async function blockUser(req, res) {
	try {
		const { username } = req.body || {};
		if (!username) return res.status(400).json({ success: false, message: 'Missing username' });
		const db = await openDB();
		await db.run('UPDATE player SET is_blocked = 1 WHERE username = ?;', [username]);
		const row = await db.get('SELECT id_player, username, is_blocked FROM player WHERE username = ?;', [username]);
		res.json({ success: true, player: row });
	} catch (err) {
		console.error('Block user failed', err);
		res.status(500).json({ success: false, message: 'Failed to block user' });
	}
}

export async function unblockUser(req, res) {
	try {
		const { username } = req.body || {};
		if (!username) return res.status(400).json({ success: false, message: 'Missing username' });
		const db = await openDB();
		await db.run('UPDATE player SET is_blocked = 0 WHERE username = ?;', [username]);
		const row = await db.get('SELECT id_player, username, is_blocked FROM player WHERE username = ?;', [username]);
		res.json({ success: true, player: row });
	} catch (err) {
		console.error('Unblock user failed', err);
		res.status(500).json({ success: false, message: 'Failed to unblock user' });
	}
}

// Grant all tools to a target user (or admin if omitted)
export async function giveAllToolsToUser(req, res) {
	try {
		const { username } = req.body || {};
		const db = await openDB();
		let player;
		if (username) {
			player = await db.get('SELECT id_player, username FROM player WHERE username = ?;', [username]);
			if (!player) return res.status(404).json({ success: false, message: 'User not found' });
		} else {
			const adminId = req.adminId;
			player = await db.get('SELECT id_player, username FROM player WHERE id_player = ?;', [adminId]);
		}
		await db.exec('BEGIN TRANSACTION;');
		// Ensure inventory exists
		let inv = await db.get('SELECT id_inventory FROM inventory WHERE id_player = ?;', [player.id_player]);
		if (!inv) {
			await db.run('INSERT INTO inventory (id_player, bricks, rocks) VALUES (?, 0, 0);', [player.id_player]);
			inv = await db.get('SELECT id_inventory FROM inventory WHERE id_player = ?;', [player.id_player]);
		}
		const types = ['shovel','bucket','pickaxe','axe','hammer'];
		for (const type of types) {
			let tool = await db.get('SELECT id_tool FROM tool WHERE type = ?;', [type]);
			if (!tool) {
				await db.run('INSERT INTO tool (type, base_bonus) VALUES (?, ?);', [type, type === 'shovel' ? 2 : 1]);
				tool = await db.get('SELECT id_tool FROM tool WHERE type = ?;', [type]);
			}
			const exists = await db.get('SELECT 1 FROM inventory_tool WHERE id_inventory = ? AND id_tool = ?;', [inv.id_inventory, tool.id_tool]);
			if (!exists) {
				await db.run('INSERT INTO inventory_tool (id_inventory, id_tool, level, is_equipped) VALUES (?, ?, 1, 0);', [inv.id_inventory, tool.id_tool]);
			}
		}
		await db.exec('COMMIT;');
		res.json({ success: true, username: player.username });
	} catch (err) {
		try { await openDB().then(db => db.exec('ROLLBACK;')); } catch {}
		console.error('Give all tools failed', err);
		res.status(500).json({ success: false, message: 'Failed to grant tools' });
	}
}

