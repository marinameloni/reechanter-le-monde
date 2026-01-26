import { openDB } from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SECRET = 'supersecretkey'; // à mettre en env plus tard

async function computeHighestUnlockedMap(db) {
  let highest = 1;
  try {
    const fp1 = await db.get('SELECT clicks_current, clicks_required FROM factory_progress WHERE id_map = 1;');
    if (fp1 && (fp1.clicks_current || 0) >= (fp1.clicks_required || 500)) {
      highest = Math.max(highest, 2);
    }

    const fp2 = await db.get('SELECT clicks_current, clicks_required FROM factory_progress WHERE id_map = 2;');
    if (fp2 && (fp2.clicks_current || 0) >= (fp2.clicks_required || 1000)) {
      highest = Math.max(highest, 3);
    }

    const fTotal3 = await db.get('SELECT COUNT(*) as total FROM flower_progress WHERE id_map = 3;');
    const fRemaining3 = await db.get('SELECT COUNT(*) as remaining FROM flower_progress WHERE id_map = 3 AND water_current < water_required;');
    if ((fTotal3?.total || 0) > 0 && (fRemaining3?.remaining || 0) === 0) {
      highest = Math.max(highest, 4);
    }

    const fenceCounts4 = await db.get('SELECT SUM(built) as built_count, COUNT(*) as total_count FROM fence_progress WHERE id_map = 4;');
    const built = fenceCounts4?.built_count || 0;
    const total = fenceCounts4?.total_count || 0;
    if (total > 0 && built >= total) {
      highest = Math.max(highest, 5);
    }
  } catch (err) {
    // fall back to 1 on errors
    highest = 1;
  }
  return highest;
}

export async function signup(req, res) {
  try {
    const { username, email, password, color } = req.body;
    const db = await openDB();

    // Empêche de créer un compte "admin" via le formulaire classique
    if (username === 'admin') {
      return res
        .status(400)
        .json({ success: false, message: 'The admin account cannot be created via signup.' });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.run(
      `INSERT INTO player (
        username,
        email,
        password_hash,
        color
      )
       VALUES (?, ?, ?, ?)`,
      [
        username,
        email,
        hash,
        color,
      ]
    );

    // Récupère le joueur fraîchement créé pour renvoyer toutes les infos utiles au front
    const player = await db.get(
      `SELECT * FROM player WHERE id_player = ?`,
      [result.lastID]
    );

    // Set player's starting map to highest unlocked at signup
    try {
      const highest = await computeHighestUnlockedMap(db);
      await db.run('UPDATE player SET id_map = ? WHERE id_player = ?;', [highest, player.id_player]);
      player.id_map = highest;
    } catch {}

    const token = jwt.sign({ id_player: player.id_player, username: player.username }, SECRET, {
      expiresIn: '1d',
    });

    res.json({
      success: true,
      token,
      player: {
        id: player.id_player,
        username: player.username,
        email: player.email,
        color: player.color,
        id_map: player.id_map,
        role: 'user',
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

    let player = await db.get(`SELECT * FROM player WHERE username = ?`, [username]);

    // Gestion spéciale du compte admin
    if (username === 'admin') {
      // Crée le compte admin s'il n'existe pas encore
      if (!player) {
        const hash = await bcrypt.hash('clubpenguin123', 10);
        const result = await db.run(
          `INSERT INTO player (
            username,
            email,
            password_hash,
            color,
            role
          )
           VALUES ('admin', 'admin@example.com', ?, null, 'admin')`,
          [hash]
        );
        player = await db.get(`SELECT * FROM player WHERE id_player = ?`, [result.lastID]);
      }

      // Le seul mot de passe valide pour admin est "clubpenguin123"
      if (password !== 'clubpenguin123') {
        return res.status(400).json({ success: false, message: 'Invalid password' });
      }

      // S'assure que le rôle est bien "admin"
      if (player.role !== 'admin') {
        await db.run(`UPDATE player SET role = 'admin' WHERE id_player = ?`, [player.id_player]);
        player.role = 'admin';
      }
    } else {
      // Utilisateur classique
      if (!player) {
        return res.status(400).json({ success: false, message: 'User not found' });
      }

      const valid = await bcrypt.compare(password, player.password_hash);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid password' });

      // Défaut : user
      if (!player.role) {
        await db.run(`UPDATE player SET role = 'user' WHERE id_player = ?`, [player.id_player]);
        player.role = 'user';
      }
    }

    const token = jwt.sign({ id_player: player.id_player, username: player.username }, SECRET, {
      expiresIn: '1d',
    });

    // Ensure player's map is at least highest unlocked on login
    try {
      const highest = await computeHighestUnlockedMap(db);
      const currentMap = typeof player.id_map === 'number' ? player.id_map : 1;
      if (currentMap < highest) {
        await db.run('UPDATE player SET id_map = ? WHERE id_player = ?;', [highest, player.id_player]);
        player.id_map = highest;
      }
    } catch {}

    res.json({
      success: true,
      token,
      player: {
        id: player.id_player,
        username: player.username,
        email: player.email,
        color: player.color,
        id_map: player.id_map,
        role: player.role || (player.username === 'admin' ? 'admin' : 'user'),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Login failed', error: err.message });
  }
}
