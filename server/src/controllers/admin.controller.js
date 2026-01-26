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

