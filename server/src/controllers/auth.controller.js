import { openDB } from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SECRET = 'supersecretkey'; // à mettre en env plus tard

export async function signup(req, res) {
  try {
    const { username, email, password, character_gender, hair_color, tshirt_color } = req.body;
    const db = await openDB();

    const hash = await bcrypt.hash(password, 10);

    const result = await db.run(
      `INSERT INTO player (username, email, password_hash, character_gender, hair_color, tshirt_color)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hash, character_gender, hair_color, tshirt_color]
    );

    // Récupère le joueur fraîchement créé pour renvoyer toutes les infos utiles au front
    const player = await db.get(
      `SELECT * FROM player WHERE id_player = ?`,
      [result.lastID]
    );

    const token = jwt.sign({ id_player: player.id_player, username: player.username }, SECRET, {
      expiresIn: '1h',
    });

    res.json({
      success: true,
      token,
      player: {
        id: player.id_player,
        username: player.username,
        email: player.email,
        character_gender: player.character_gender,
        hair_color: player.hair_color,
        tshirt_color: player.tshirt_color,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Signup failed', error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body;
    const db = await openDB();

    const player = await db.get(`SELECT * FROM player WHERE username = ?`, [username]);
    if (!player) return res.status(400).json({ success: false, message: 'User not found' });

    const valid = await bcrypt.compare(password, player.password_hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid password' });

    const token = jwt.sign({ id_player: player.id_player, username: player.username }, SECRET, {
      expiresIn: '1h',
    });

    res.json({
      success: true,
      token,
      player: {
        id: player.id_player,
        username: player.username,
        email: player.email,
        character_gender: player.character_gender,
        hair_color: player.hair_color,
        tshirt_color: player.tshirt_color,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Login failed', error: err.message });
  }
}
