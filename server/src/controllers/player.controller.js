import { openDB } from '../config/db.js';

// Simple endpoint to update player colors (mainly color_primary for now)
// Security note: we mirror the existing pattern (playerId in body).
export async function updateColors(req, res) {
  try {
    const { playerId, color_primary, color_secondary, color_tertiary } = req.body || {};

    if (!playerId) {
      return res.status(400).json({ success: false, message: 'playerId is required' });
    }

    const db = await openDB();

    // Build partial update to allow future extensions (secondary / tertiary)
    const fields = [];
    const values = [];

    if (typeof color_primary === 'string') {
      fields.push('color_primary = ?');
      values.push(color_primary);
    }
    if (typeof color_secondary === 'string') {
      fields.push('color_secondary = ?');
      values.push(color_secondary);
    }
    if (typeof color_tertiary === 'string') {
      fields.push('color_tertiary = ?');
      values.push(color_tertiary);
    }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No color fields provided' });
    }

    values.push(playerId);

    await db.run(`UPDATE player SET ${fields.join(', ')} WHERE id_player = ?`, values);

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
        character_gender: player.character_gender,
        hair_color: player.hair_color,
        tshirt_color: player.tshirt_color,
        color_primary: player.color_primary,
        color_secondary: player.color_secondary,
        color_tertiary: player.color_tertiary,
        role: player.role,
      },
    });
  } catch (err) {
    console.error('Failed to update player colors', err);
    res.status(500).json({ success: false, message: 'Failed to update colors' });
  }
}
