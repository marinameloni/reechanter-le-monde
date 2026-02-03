import { openDB } from '../config/db.js';
import { GameRoom } from '../rooms/GameRoom.js';

export async function getLeaderboard(req, res) {
  try {
    const db = await openDB();

    // All-time leaderboard
    // All-time leaderboard with numeric scores
    const mostConstructive = await db.get(`SELECT p.username as username, COALESCE(s.constructive,0) as value FROM player_stats s JOIN player p ON p.id_player = s.id_player ORDER BY s.constructive DESC, p.id_player ASC LIMIT 1;`);
    const mostHarvest = await db.get(`SELECT p.username as username, COALESCE(s.harvest,0) as value FROM player_stats s JOIN player p ON p.id_player = s.id_player ORDER BY s.harvest DESC, p.id_player ASC LIMIT 1;`);
    const mostTalkative = await db.get(`SELECT p.username as username, COUNT(*) as value FROM chat_message c JOIN player p ON p.id_player = c.id_player GROUP BY c.id_player ORDER BY value DESC, p.id_player ASC LIMIT 1;`);
    const didNothing = await db.get(`
      SELECT p.username as username FROM player p
      LEFT JOIN player_stats s ON s.id_player = p.id_player
      LEFT JOIN (SELECT id_player, COUNT(*) as cnt FROM chat_message GROUP BY id_player) cm ON cm.id_player = p.id_player
      WHERE COALESCE(s.constructive, 0) = 0 AND COALESCE(s.harvest, 0) = 0 AND COALESCE(cm.cnt, 0) = 0
      ORDER BY p.id_player ASC LIMIT 1;
    `);

    // also return top-3 constructive all-time
    const topConstructiveAll = await db.all(`SELECT p.username as username, COALESCE(s.constructive,0) as value FROM player_stats s JOIN player p ON p.id_player = s.id_player ORDER BY s.constructive DESC, p.id_player ASC LIMIT 3;`);

    const allTime = {
      mostConstructive: mostConstructive ? { username: mostConstructive.username, value: mostConstructive.value } : null,
      mostHarvest: mostHarvest ? { username: mostHarvest.username, value: mostHarvest.value } : null,
      mostTalkative: mostTalkative ? { username: mostTalkative.username, value: mostTalkative.value } : null,
      didNothing: didNothing?.username || null,
      topConstructive: topConstructiveAll || [],
    };

    // Current game leaderboard: inspect active rooms and pick first active room (if any)
    let currentGame = null;
    try {
      const rooms = GameRoom.activeRooms || new Map();
      const firstRoom = rooms.values().next().value;
      if (firstRoom && Array.isArray(firstRoom.state?.clients) && firstRoom.state.clients.length > 0) {
        const ids = firstRoom.state.clients.map(c => c.id_player).filter(Boolean);
        if (ids.length > 0) {
          // MOST CONSTRUCTIVE in current room (by player_stats) and top-3 constructive
          const mostCons = await db.get(`SELECT p.username as username, COALESCE(s.constructive,0) as value FROM player_stats s JOIN player p ON p.id_player = s.id_player WHERE p.id_player IN (${ids.map(()=>'?').join(',')}) ORDER BY s.constructive DESC, p.id_player ASC LIMIT 1;`, ids);
          const mostHar = await db.get(`SELECT p.username as username, COALESCE(s.harvest,0) as value FROM player_stats s JOIN player p ON p.id_player = s.id_player WHERE p.id_player IN (${ids.map(()=>'?').join(',')}) ORDER BY s.harvest DESC, p.id_player ASC LIMIT 1;`, ids);
          const mostTalk = await db.get(`SELECT p.username as username, COUNT(*) as value FROM chat_message c JOIN player p ON p.id_player = c.id_player WHERE p.id_player IN (${ids.map(()=>'?').join(',')}) GROUP BY c.id_player ORDER BY value DESC, p.id_player ASC LIMIT 1;`, ids);
          const didN = await db.get(`SELECT p.username as username FROM player p LEFT JOIN player_stats s ON s.id_player = p.id_player LEFT JOIN (SELECT id_player, COUNT(*) as cnt FROM chat_message GROUP BY id_player) cm ON cm.id_player = p.id_player WHERE p.id_player IN (${ids.map(()=>'?').join(',')}) AND COALESCE(s.constructive, 0) = 0 AND COALESCE(s.harvest, 0) = 0 AND COALESCE(cm.cnt, 0) = 0 ORDER BY p.id_player ASC LIMIT 1;`, ids);
          const topCons = await db.all(`SELECT p.username as username, COALESCE(s.constructive,0) as value FROM player_stats s JOIN player p ON p.id_player = s.id_player WHERE p.id_player IN (${ids.map(()=>'?').join(',')}) ORDER BY s.constructive DESC, p.id_player ASC LIMIT 3;`, ids);

          currentGame = {
            mapId: firstRoom.mapId || null,
            players: firstRoom.state.clients.map(c => ({ username: c.username || null, sessionId: c.sessionId, id_player: c.id_player || null })),
            mostConstructive: mostCons ? { username: mostCons.username, value: mostCons.value } : null,
            mostHarvest: mostHar ? { username: mostHar.username, value: mostHar.value } : null,
            mostTalkative: mostTalk ? { username: mostTalk.username, value: mostTalk.value } : null,
            didNothing: didN?.username || null,
            topConstructive: topCons || [],
          };
        } else {
          // No player ids persisted; fallback to simple name-based picks from room state
          const clients = firstRoom.state.clients || [];
          currentGame = {
            mapId: firstRoom.mapId || null,
            players: clients.map(c => ({ username: c.username || null, sessionId: c.sessionId })),
            mostConstructive: clients[0]?.username || null,
            mostHarvest: clients[0]?.username || null,
            mostTalkative: clients[0]?.username || null,
            didNothing: null,
          };
        }
      }
    } catch (e) {
      // ignore per-room inspection errors
      currentGame = null;
    }

    res.json({ ok: true, allTime, currentGame });
  } catch (err) {
    console.error('Failed to compute leaderboard', err);
    res.status(500).json({ ok: false, error: 'Failed to compute leaderboard' });
  }
}

export default { getLeaderboard };
