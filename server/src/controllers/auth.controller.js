import { openDB } from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SECRET = 'supersecretkey'; // à mettre en env plus tard

export async function signup(req, res) {
  try {
    const { username, email, password, character_gender, hair_color, tshirt_color } = req.body;
    const db = await openDB();

    // Empêche de créer un compte "admin" via le formulaire classique
    if (username === 'admin') {
      return res
        .status(400)
        .json({ success: false, message: 'The admin account cannot be created via signup.' });
    }

    const hash = await bcrypt.hash(password, 10);

    // couleur principale par défaut : on réutilise une des anciennes couleurs si présente
    const defaultPrimaryColor = tshirt_color || hair_color || '#D674CB';

    const result = await db.run(
      `INSERT INTO player (
        username,
        email,
        password_hash,
        character_gender,
        hair_color,
        tshirt_color,
        color_primary,
        color_secondary,
        color_tertiary,
        role
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')`,
      [
        username,
        email,
        hash,
        character_gender,
        hair_color,
        tshirt_color,
        defaultPrimaryColor,
        null,
        null,
      ]
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
        color_primary: player.color_primary,
        color_secondary: player.color_secondary,
        color_tertiary: player.color_tertiary,
        role: player.role || 'user',
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
            character_gender,
            hair_color,
            tshirt_color,
            color_primary,
            color_secondary,
            color_tertiary,
            role
          )
           VALUES ('admin', 'admin@example.com', ?, 'female', '#000000', '#ffffff', '#000000', NULL, NULL, 'admin')`,
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

    // Assure une couleur principale même pour les anciens comptes
    if (!player.color_primary) {
      const inferredPrimary = player.tshirt_color || player.hair_color || '#D674CB';
      await db.run(
        `UPDATE player SET color_primary = ? WHERE id_player = ?`,
        [inferredPrimary, player.id_player]
      );
      player.color_primary = inferredPrimary;
    }

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
        color_primary: player.color_primary,
        color_secondary: player.color_secondary,
        color_tertiary: player.color_tertiary,
        role: player.role || (player.username === 'admin' ? 'admin' : 'user'),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Login failed', error: err.message });
  }
}
