import jwt from 'jsonwebtoken';
import { openDB } from '../config/db.js';

// Keep in sync with auth.controller.js
const SECRET = 'supersecretkey';

export async function requireAdmin(req, res, next) {
	try {
		const auth = req.headers.authorization || '';
		const token = (auth.startsWith('Bearer ') ? auth.slice(7) : null);
		if (!token) return res.status(401).json({ success: false, message: 'Missing auth token' });

		let payload;
		try {
			payload = jwt.verify(token, SECRET);
		} catch (err) {
			return res.status(401).json({ success: false, message: 'Invalid token' });
		}

		const idPlayer = payload?.id_player;
		if (!idPlayer) return res.status(401).json({ success: false, message: 'Invalid token payload' });

		const db = await openDB();
		const player = await db.get('SELECT role FROM player WHERE id_player = ?;', [idPlayer]);
		if (!player || player.role !== 'admin') {
			return res.status(403).json({ success: false, message: 'Admin rights required' });
		}

		req.adminId = idPlayer;
		next();
	} catch (err) {
		console.error('Admin auth failed', err);
		res.status(500).json({ success: false, message: 'Auth middleware error' });
	}
}

