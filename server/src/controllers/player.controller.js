import { openDB } from '../config/db.js';
import { buyTool, getInventoryWithTools } from '../services/game.service.js';

export async function updateColor(req, res) {
  try {
    const { playerId, color } = req.body || {};

    if (!playerId) {
      return res.status(400).json({ success: false, message: 'playerId is required' });
    }

    const db = await openDB();

    if (typeof color !== 'string') {
      return res.status(400).json({ success: false, message: 'No color field provided' });
    }

    await db.run(`UPDATE player SET color = ? WHERE id_player = ?`, [color, playerId]);

    const player = await db.get('SELECT * FROM player WHERE id_player = ?', [playerId]);

    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found after update' });
    }

    res.json({
      success: true,
      player: {
        id: player.id_player,
        username: player.username,
        email: player.email,
        color: player.color,
        role: player.role,
      },
    });
  } catch (err) {
    console.error('Failed to update player color', err);
    res.status(500).json({ success: false, message: 'Failed to update color' });
  }
}

export async function getInventory(req, res) {
  try {
    const playerId = parseInt(req.params.playerId, 10);
    if (!playerId) {
      return res.status(400).json({ success: false, message: 'playerId is required' });
    }
    const inv = await getInventoryWithTools(playerId);
    res.json({ success: true, inventory: inv });
  } catch (err) {
    console.error('Failed to get inventory', err);
    res.status(500).json({ success: false, message: 'Failed to get inventory' });
  }
}

export async function buyToolController(req, res) {
  try {
    const { playerId, type, costBricks = 0, costRocks = 0 } = req.body || {};
    if (!playerId || !type) {
      return res.status(400).json({ success: false, message: 'playerId and type are required' });
    }
    const inv = await buyTool({ playerId, type, costBricks, costRocks });
    res.json({ success: true, inventory: inv });
  } catch (err) {
    const code = err.message === 'Insufficient resources' ? 400 : 500;
    res.status(code).json({ success: false, message: err.message || 'Failed to buy tool' });
  }
}

export async function travel(req, res) {
  try {
    const { playerId, mapId, x = 1, y = 1 } = req.body || {};
    if (!playerId || !mapId) {
      return res.status(400).json({ success: false, message: 'playerId and mapId are required' });
    }

    const db = await openDB();
    await db.run(
      `UPDATE player SET id_map = ?, x = ?, y = ? WHERE id_player = ?;`,
      [mapId, x, y, playerId]
    );

    const updated = await db.get('SELECT id_player, id_map, x, y FROM player WHERE id_player = ?;', [playerId]);
    if (!updated) return res.status(404).json({ success: false, message: 'Player not found' });
    res.json({ success: true, player: updated });
  } catch (err) {
    console.error('Failed to travel', err);
    res.status(500).json({ success: false, message: 'Failed to travel' });
  }
}

export async function getPlayerInfo(req, res) {
  try {
    const playerId = parseInt(req.params.playerId, 10);
    if (!playerId) {
      return res.status(400).json({ success: false, message: 'playerId is required' });
    }
    const db = await openDB();
    const player = await db.get('SELECT id_player, username, color, id_map, x, y, role FROM player WHERE id_player = ?;', [playerId]);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }
    res.json({ success: true, player });
  } catch (err) {
    console.error('Failed to get player info', err);
    res.status(500).json({ success: false, message: 'Failed to get player info' });
  }
}
