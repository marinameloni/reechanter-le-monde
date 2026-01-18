import { openDB } from '../config/db.js';

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
