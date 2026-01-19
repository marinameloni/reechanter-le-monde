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

async function ensureInventory(db, playerId) {
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
		inventory = await db.get(
			'SELECT * FROM inventory WHERE id_player = ?;',
			playerId
		);
	}
	return inventory;
}

export async function getInventoryWithTools(playerId) {
	const db = await openDB();
	const inv = await ensureInventory(db, playerId);

	const rows = await db.all(
		`SELECT t.type
		 FROM inventory_tool it
		 JOIN tool t ON t.id_tool = it.id_tool
		 WHERE it.id_inventory = ?;`,
		inv.id_inventory
	);

	const tools = rows.map((r) => r.type);
	const counts = tools.reduce((acc, t) => {
		acc[t] = (acc[t] || 0) + 1;
		return acc;
	}, {});

	return {
		bricks: inv.bricks || 0,
		rocks: inv.rocks || 0,
		tools: counts,
	};
}

async function ensureToolType(db, type) {
	let tool = await db.get('SELECT * FROM tool WHERE type = ?;', type);
	if (!tool) {
		await db.run(
			'INSERT INTO tool (type, base_bonus) VALUES (?, ?);',
			[type, type === 'shovel' ? 2 : 1]
		);
		tool = await db.get('SELECT * FROM tool WHERE type = ?;', type);
	}
	return tool;
}

export async function buyTool({ playerId, type, costBricks = 0, costRocks = 0 }) {
	const db = await openDB();
	await db.exec('BEGIN TRANSACTION;');
	try {
		const inv = await ensureInventory(db, playerId);

		// Validate cost
		if ((inv.bricks || 0) < costBricks || (inv.rocks || 0) < costRocks) {
			throw new Error('Insufficient resources');
		}

		// Deduct resources
		await db.run(
			`UPDATE inventory
			 SET bricks = bricks - ?, rocks = rocks - ?
			 WHERE id_inventory = ?;`,
			[costBricks, costRocks, inv.id_inventory]
		);

		// Ensure tool type exists and add to inventory
		const tool = await ensureToolType(db, type);
		await db.run(
			`INSERT INTO inventory_tool (id_inventory, id_tool, level, is_equipped)
			 VALUES (?, ?, 1, 0);`,
			[inv.id_inventory, tool.id_tool]
		);

		await db.exec('COMMIT;');

		return await getInventoryWithTools(playerId);
	} catch (err) {
		await db.exec('ROLLBACK;');
		throw err;
	}
}

export async function transferResources({ fromId, toId, bricks = 0, rocks = 0 }) {
	if (bricks < 0 || rocks < 0) throw new Error('Invalid transfer amounts');
	const db = await openDB();
	await db.exec('BEGIN TRANSACTION;');
	try {
		const fromInv = await ensureInventory(db, fromId);
		const toInv = await ensureInventory(db, toId);

		// Validate availability
		if ((fromInv.bricks || 0) < bricks || (fromInv.rocks || 0) < rocks) {
			throw new Error('Insufficient resources');
		}

		// Deduct from sender
		await db.run(
			`UPDATE inventory
			 SET bricks = bricks - ?, rocks = rocks - ?
			 WHERE id_inventory = ?;`,
			[bricks, rocks, fromInv.id_inventory]
		);

		// Add to recipient
		await db.run(
			`UPDATE inventory
			 SET bricks = bricks + ?, rocks = rocks + ?
			 WHERE id_inventory = ?;`,
			[bricks, rocks, toInv.id_inventory]
		);

		await db.exec('COMMIT;');

		return {
			from: await getInventoryWithTools(fromId),
			to: await getInventoryWithTools(toId),
		};
	} catch (err) {
		await db.exec('ROLLBACK;');
		throw err;
	}
}

export async function exchangeResources({
	aId,
	bId,
	aToBBricks = 0,
	aToBRocks = 0,
	bToABricks = 0,
	bToARocks = 0,
}) {
	const db = await openDB();
	await db.exec('BEGIN TRANSACTION;');
	try {
		const aInv = await ensureInventory(db, aId);
		const bInv = await ensureInventory(db, bId);

		// Validate availability for both sides
		if ((aInv.bricks || 0) < aToBBricks || (aInv.rocks || 0) < aToBRocks) {
			throw new Error('A insufficient resources');
		}
		if ((bInv.bricks || 0) < bToABricks || (bInv.rocks || 0) < bToARocks) {
			throw new Error('B insufficient resources');
		}

		// A -> B
		if (aToBBricks || aToBRocks) {
			await db.run(
				`UPDATE inventory SET bricks = bricks - ?, rocks = rocks - ? WHERE id_inventory = ?;`,
				[aToBBricks, aToBRocks, aInv.id_inventory]
			);
			await db.run(
				`UPDATE inventory SET bricks = bricks + ?, rocks = rocks + ? WHERE id_inventory = ?;`,
				[aToBBricks, aToBRocks, bInv.id_inventory]
			);
		}

		// B -> A
		if (bToABricks || bToARocks) {
			await db.run(
				`UPDATE inventory SET bricks = bricks - ?, rocks = rocks - ? WHERE id_inventory = ?;`,
				[bToABricks, bToARocks, bInv.id_inventory]
			);
			await db.run(
				`UPDATE inventory SET bricks = bricks + ?, rocks = rocks + ? WHERE id_inventory = ?;`,
				[bToABricks, bToARocks, aInv.id_inventory]
			);
		}

		await db.exec('COMMIT;');
		return {
			a: await getInventoryWithTools(aId),
			b: await getInventoryWithTools(bId),
		};
	} catch (err) {
		await db.exec('ROLLBACK;');
		throw err;
	}
}
