import { openDB } from '../config/db.js';

export async function applyProgress({
	playerId,
	deltaBricks = 0,
	deltaRocks = 0,
	deltaWorldScore = 0,
}) {
	const db = await openDB();
	await db.exec('BEGIN TRANSACTION;');
	try {
		// Ensure inventory exists for this player
		let inventory = await db.get(
			'SELECT * FROM inventory WHERE id_player = ?;',
			playerId
		);
		if (!inventory) {
			await db.run(
				`INSERT INTO inventory (id_player, wood, stone, metal, glass, bricks, rocks)
				 VALUES (?, 0, 0, 0, 0, 0, 0);`,
				[playerId]
			);
		}

		if (deltaBricks !== 0 || deltaRocks !== 0) {
			await db.run(
				`UPDATE inventory
				 SET bricks = bricks + ?,
				     rocks = rocks + ?
				 WHERE id_player = ?;`,
				[deltaBricks, deltaRocks, playerId]
			);
		}

		if (deltaWorldScore !== 0) {
			let world = await db.get('SELECT * FROM world_state LIMIT 1;');
			if (!world) {
				await db.run(
					'INSERT INTO world_state (world_score, day) VALUES (?, 1);',
					[deltaWorldScore]
				);
			} else {
				await db.run(
					`UPDATE world_state
					 SET world_score = world_score + ?,
					     updated_at = CURRENT_TIMESTAMP
					 WHERE id_world = ?;`,
					[deltaWorldScore, world.id_world]
				);
			}
		}

		await db.exec('COMMIT;');
	} catch (err) {
		await db.exec('ROLLBACK;');
		throw err;
	}
}
