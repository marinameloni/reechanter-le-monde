import { Room } from "colyseus";
import { openDB } from "../config/db.js";

export class GameRoom extends Room {
  onCreate(options) {
    // Persist mapId for this room instance (per-map room)
    this.mapId = typeof options?.mapId === 'number' ? options.mapId : 1;

    // État minimal pour commencer : sera enrichi plus tard
    this.setState({
      tiles: [],
      ruins: [],
      buildings: [],
      clients: [], // { sessionId, username, x, y }
    });

    // Map username to Colyseus client for direct messaging
    this.clientByUsername = new Map();

    // Load ruins from DB for this map into room state so clients see them
    (async () => {
      try {
        const db = await openDB();
        const rows = await db.all(
          `SELECT r.id_ruin, r.id_tile, r.type, r.clicks_current, r.clicks_required, r.is_destroyed, t.x as x, t.y as y
           FROM ruin r JOIN tile t ON r.id_tile = t.id_tile
           WHERE r.id_map = ?;`,
          [this.mapId]
        );
        this.state.ruins = (rows || []).map(r => ({
          id_ruin: r.id_ruin,
          id_tile: r.id_tile,
          x: r.x,
          y: r.y,
          type: r.type,
          clicks_current: r.clicks_current || 0,
          clicks_required: r.clicks_required || 0,
          is_destroyed: r.is_destroyed || 0,
        }));
      } catch (err) {
        console.error('Failed to load ruins into room state', err);
      }
    })();

    // Per-player cooldowns / rate-limiting to avoid server overload
    // Map sessionId -> { move: ts, water: ts, fence: ts, house: ts }
    this.lastActionTime = new Map();
    // Helper to check and update cooldown timestamp
    this._canPerform = (sid, key, cooldownMs) => {
      const now = Date.now();
      const prev = this.lastActionTime.get(sid) || {};
      if (prev[key] && (now - prev[key]) < cooldownMs) return false;
      prev[key] = now;
      this.lastActionTime.set(sid, prev);
      return true;
    };

    // Helper to check player distance to a tile/element
    // returns true if within `range` tiles (Euclidean distance)
    this._isInRange = (sessionId, x, y, range = 6) => {
      const player = this.state.clients.find(c => c.sessionId === sessionId);
      if (!player || typeof player.x !== 'number' || typeof player.y !== 'number') return false;
      const dx = player.x - x;
      const dy = player.y - y;
      return (Math.sqrt(dx * dx + dy * dy) <= range + 1e-9);
    };

    // Cap per-player pending factory clicks per flush interval to avoid huge spikes
    this.factoryPerIntervalCap = 50;

    this.onMessage("clickRuin", (client, data) => {
      const ruin = this.state.ruins.find((r) => r.id_ruin === data.id_ruin);
      if (ruin) {
        // If ruin has coordinates, enforce proximity
        const rx = typeof ruin.x === 'number' ? ruin.x : (typeof ruin.tile_x === 'number' ? ruin.tile_x : null);
        const ry = typeof ruin.y === 'number' ? ruin.y : (typeof ruin.tile_y === 'number' ? ruin.tile_y : null);
        if (rx !== null && ry !== null && !this._isInRange(client.sessionId, rx, ry, 6)) {
          try { client.send('actionDenied', { action: 'clickRuin', reason: 'out_of_range' }); } catch {}
          return;
        }
        ruin.clicks_current = (ruin.clicks_current || 0) + (data.click_value || 1);
      }
      // Colyseus se charge de synchroniser l'état avec tous les clients
    });

    // Trade request: notify target player
    this.onMessage("requestTrade", (client, data) => {
      const from = this.state.clients.find(c => c.sessionId === client.sessionId);
      if (!from || !data || !data.toUsername) return;
      const targetClient = this.clientByUsername.get(data.toUsername);
      if (targetClient) {
        targetClient.send("tradeRequest", { fromUsername: from.username });
      }
    });

    // Trade response: notify requester
    this.onMessage("respondTrade", (client, data) => {
      const from = this.state.clients.find(c => c.sessionId === client.sessionId);
      if (!from || !data || !data.toUsername || typeof data.accepted !== 'boolean') return;
      const targetClient = this.clientByUsername.get(data.toUsername);
      if (targetClient) {
        targetClient.send("tradeResponse", { fromUsername: from.username, accepted: data.accepted });
      }
    });

    // Trade offer: forward proposed amounts to target
    this.onMessage("tradeOffer", (client, data) => {
      const from = this.state.clients.find(c => c.sessionId === client.sessionId);
      if (!from || !data || !data.toUsername) return;
      const targetClient = this.clientByUsername.get(data.toUsername);
      if (targetClient) {
        targetClient.send("tradeOffer", { fromUsername: from.username, bricks: data.bricks || 0, rocks: data.rocks || 0 });
      }
    });

    // Trade offer response (declined): notify proposer
    this.onMessage("tradeOfferResponse", (client, data) => {
      const from = this.state.clients.find(c => c.sessionId === client.sessionId);
      if (!from || !data || !data.toUsername || typeof data.accepted !== 'boolean') return;
      const targetClient = this.clientByUsername.get(data.toUsername);
      if (targetClient) {
        targetClient.send("tradeOfferResponse", { fromUsername: from.username, accepted: data.accepted });
      }
    });

    // Trade completed: inform both parties to refresh UI
    this.onMessage("tradeCompleted", (client, data) => {
      const from = this.state.clients.find(c => c.sessionId === client.sessionId);
      if (!from || !data || !data.otherUsername) return;
      const otherClient = this.clientByUsername.get(data.otherUsername);
      if (otherClient) {
        otherClient.send("tradeCompleted", { fromUsername: from.username });
      }
      // also confirm to sender
      const senderClient = this.clientByUsername.get(from.username);
      if (senderClient) {
        senderClient.send("tradeCompleted", { fromUsername: data.otherUsername });
      }
    });

    // Chat: broadcast bubbly messages to all clients
    this.onMessage("chatMessage", async (client, data) => {
      const from = this.state.clients.find(c => c.sessionId === client.sessionId);
      const text = (data && typeof data.text === 'string') ? data.text.trim() : '';
      if (!from || !text) return;
      // Persist chat message for leaderboard (most talkative)
      try {
        const db = await openDB();
        await db.run('INSERT INTO chat_message (id_player, message) VALUES (?, ?);', [from.id_player, text]);
      } catch (err) {
        console.warn('Failed to persist chat message', err?.message || err);
      }
      // Broadcast to everyone (including sender) to render bubbles
      this.broadcast("chatMessage", { fromUsername: from.username, text });
    });

    // Admin commands: kick a user in current room
    this.onMessage('adminKickUser', async (client, data) => {
      const ok = await this.isAdminClient(client.sessionId);
      if (!ok) return;
      const targetUsername = data?.username;
      if (!targetUsername) return;
      const targetClient = this.clientByUsername.get(targetUsername);
      if (targetClient) {
        try { targetClient.send('kicked', { reason: 'admin_kick' }); } catch {}
        try { targetClient.leave(0); } catch {}
      }
    });
    // Admin announce unlock for a map
    this.onMessage('adminAnnounceUnlock', async (client, data) => {
      const ok = await this.isAdminClient(client.sessionId);
      if (!ok) return;
      const mapId = Number(data?.mapId);
      if (!mapId) return;
      this.broadcast('mapUnlocked', { mapId });
    });

    // Shared factory clicks per map
    // We buffer clicks per-player and flush them every 500ms to avoid SQLite concurrency issues.
    this.pendingFactoryClicks = new Map(); // sessionId -> accumulated clicks

    // Called regularly to persist batched clicks in a single DB transaction
    this.flushFactoryClicks = async () => {
      if (!this.pendingFactoryClicks || this.pendingFactoryClicks.size === 0) return;
      // Aggregate total clicks across players
      let total = 0;
      for (const v of this.pendingFactoryClicks.values()) total += v || 0;
      if (total <= 0) {
        this.pendingFactoryClicks.clear();
        return;
      }

      const mapId = this.mapId ?? 1;
      try {
        const db = await openDB();
        await db.exec('BEGIN TRANSACTION;');
        const row = await db.get('SELECT clicks_current, clicks_required FROM factory_progress WHERE id_map = ?;', [mapId]);
        if (!row) {
          await db.run('INSERT INTO factory_progress (id_map, clicks_current, clicks_required) VALUES (?, 0, 500);', [mapId]);
        }
        await db.run(
          `UPDATE factory_progress
           SET clicks_current = clicks_current + ?, updated_at = CURRENT_TIMESTAMP
           WHERE id_map = ?;`,
          [total, mapId]
        );
        const updated = await db.get('SELECT clicks_current, clicks_required FROM factory_progress WHERE id_map = ?;', [mapId]);
        await db.exec('COMMIT;');

        // Broadcast updated progress to all clients
        this.broadcast('factoryProgress', { mapId, clicksCurrent: updated.clicks_current || 0, clicksRequired: updated.clicks_required || 500 });
        if ((updated.clicks_current || 0) >= (updated.clicks_required || 500)) {
          this.broadcast('mapUnlocked', { mapId: mapId + 1 });
        }

        // Optionally, send per-player ack for their queued contributions
        for (const [sessionId, clicks] of this.pendingFactoryClicks.entries()) {
          try {
            const playerClient = this.clients.find(c => c.sessionId === sessionId);
            if (playerClient) {
              // send targeted ack (best-effort)
              this.clientByUsername.get(playerClient.username)?.send('factoryClickFlushed', { inc: clicks, mapId });
            }
          } catch {}
        }
      } catch (err) {
        console.error('Failed to flush factory clicks', err);
        try { const db2 = await openDB(); await db2.exec('ROLLBACK;'); } catch {}
      } finally {
        this.pendingFactoryClicks.clear();
      }
    };

    // Start periodic flush every 500ms
    this._factoryFlushInterval = setInterval(() => { this.flushFactoryClicks().catch(e => console.error(e)); }, 500);

    // Accept individual or batched messages and buffer them
    this.onMessage("factoryClick", (client, data) => {
      const inc = (data && typeof data.inc === 'number') ? Math.max(0, Math.floor(data.inc)) : 1;
      if (inc <= 0) return;
      const sid = client.sessionId;
      const prev = this.pendingFactoryClicks.get(sid) || 0;
      const allowed = Math.max(0, this.factoryPerIntervalCap - prev);
      const toAdd = Math.min(inc, allowed);
      if (toAdd <= 0) {
        // optionally ignore excess clicks
        try { client.send('factoryClickDenied', { reason: 'rate_limited' }); } catch {}
        return;
      }
      this.pendingFactoryClicks.set(sid, prev + toAdd);
      // Immediate ack so client can update local UI optimistically
      try { client.send('factoryClickQueued', { inc: toAdd }); } catch {}
    });

    // Backwards-compatible alias: clients may send a batched message named "clickFactory"
    this.onMessage('clickFactory', (client, data) => {
      // data: { inc: number }
      const inc = (data && typeof data.inc === 'number') ? Math.max(0, Math.floor(data.inc)) : 0;
      if (inc <= 0) return;
      const sid = client.sessionId;
      const prev = this.pendingFactoryClicks.get(sid) || 0;
      const allowed = Math.max(0, this.factoryPerIntervalCap - prev);
      const toAdd = Math.min(inc, allowed);
      if (toAdd <= 0) {
        try { client.send('factoryClickDenied', { reason: 'rate_limited' }); } catch {}
        return;
      }
      this.pendingFactoryClicks.set(sid, prev + toAdd);
      try { client.send('factoryClickQueued', { inc: toAdd }); } catch {}
    });

    // Shared watering per tile on Map 3 (buffered to reduce DB writes)
    this.pendingFlowerClicks = new Map(); // sessionId -> Map('x,y' -> count)
    this.flowerPerIntervalCap = 100; // max clicks per player per flush interval

    this.onMessage("waterTile", (client, data) => {
      const inc = (data && typeof data.inc === 'number') ? Math.max(0, Math.floor(data.inc)) : 1;
      const mapId = this.mapId ?? 3;
      const x = (data && typeof data.x === 'number') ? data.x : null;
      const y = (data && typeof data.y === 'number') ? data.y : null;
      if (mapId !== 3 || x == null || y == null) return;
      const sid = client.sessionId;
      // enforce proximity: must be within 3 tiles
      if (!this._isInRange(sid, x, y, 6)) {
        try { client.send('actionDenied', { action: 'water', reason: 'out_of_range' }); } catch {}
        return;
      }
      // per-interval cap enforcement
      const playerMap = this.pendingFlowerClicks.get(sid) || new Map();
      const prevTotal = Array.from(playerMap.values()).reduce((a, b) => a + b, 0);
      const allowed = Math.max(0, this.flowerPerIntervalCap - prevTotal);
      const toAdd = Math.min(inc, allowed);
      if (toAdd <= 0) {
        try { client.send('flowerClickDenied', { reason: 'rate_limited' }); } catch {}
        return;
      }
      const key = `${x},${y}`;
      playerMap.set(key, (playerMap.get(key) || 0) + toAdd);
      this.pendingFlowerClicks.set(sid, playerMap);
      try { client.send('flowerClickQueued', { x, y, inc: toAdd }); } catch {}
    });

    // Flush pending flower clicks every 500ms
    this._flowerFlushInterval = setInterval(async () => {
      if (!this.pendingFlowerClicks || this.pendingFlowerClicks.size === 0) return;
      // Aggregate per-tile totals across players
      const tileTotals = new Map(); // 'x,y' -> total clicks
      for (const [, map] of this.pendingFlowerClicks.entries()) {
        for (const [k, v] of map.entries()) {
          tileTotals.set(k, (tileTotals.get(k) || 0) + v);
        }
      }
      if (tileTotals.size === 0) {
        this.pendingFlowerClicks.clear();
        return;
      }
      try {
        const db = await openDB();
        await db.exec('BEGIN TRANSACTION;');
        for (const [k, total] of tileTotals.entries()) {
          const [sx, sy] = k.split(',').map(Number);
          const row = await db.get('SELECT water_current, water_required FROM flower_progress WHERE id_map = ? AND tile_x = ? AND tile_y = ?;', [3, sx, sy]);
          if (!row) {
            await db.run('INSERT INTO flower_progress (id_map, tile_x, tile_y, water_current, water_required) VALUES (?, ?, ?, 0, 50);', [3, sx, sy]);
          }
          await db.run(
            `UPDATE flower_progress SET water_current = MIN(water_required, water_current + ?) , updated_at = CURRENT_TIMESTAMP WHERE id_map = ? AND tile_x = ? AND tile_y = ?;`,
            [total, 3, sx, sy]
          );
          const updated = await db.get('SELECT water_current, water_required FROM flower_progress WHERE id_map = ? AND tile_x = ? AND tile_y = ?;', [3, sx, sy]);
          this.broadcast('flowerProgress', { mapId: 3, x: sx, y: sy, current: updated.water_current || 0, required: updated.water_required || 50 });
          if ((updated.water_current || 0) >= (updated.water_required || 50)) {
            this.broadcast('tileFlowered', { mapId: 3, x: sx, y: sy });
          }
        }
        // Check overall completion
        const remaining = await db.get('SELECT COUNT(*) as c FROM flower_progress WHERE id_map = 3 AND water_current < water_required;');
        if ((remaining?.c || 0) === 0) {
          this.broadcast('mapUnlocked', { mapId: 4 });
        }
        await db.exec('COMMIT;');

        // send per-player flush acks
        for (const [sid, map] of this.pendingFlowerClicks.entries()) {
          try {
            const clientObj = [...this.clientByUsername.entries()].find(([, cl]) => cl.sessionId === sid);
            if (clientObj) {
              const cl = clientObj[1];
              const contributed = Array.from(map.values()).reduce((a, b) => a + b, 0);
              try { cl.send('flowerClickFlushed', { inc: contributed }); } catch {}
            }
          } catch {}
        }
      } catch (err) {
        console.error('Failed to flush flower clicks', err);
        try { const db2 = await openDB(); await db2.exec('ROLLBACK;'); } catch {}
      } finally {
        this.pendingFlowerClicks.clear();
      }
    }, 500);

    // Shared fence building on Map 4
    this.onMessage("buildFence", async (client, data) => {
      const x = (data && typeof data.x === 'number') ? data.x : null;
      const y = (data && typeof data.y === 'number') ? data.y : null;
      const mapId = this.mapId ?? 4;
      if (x == null || y == null) return;
      if (mapId !== 4) return; // only valid in Map 4 room
      // proximity check: must be near tile (3 tiles)
      if (!this._isInRange(client.sessionId, x, y, 6)) {
        try { client.send('actionDenied', { action: 'fence', reason: 'out_of_range' }); } catch {}
        return;
      }
      // (no per-player cooldown — fence builds are rate-limited by client resources)
      try {
        const db = await openDB();
        await db.exec('BEGIN TRANSACTION;');
        const row = await db.get('SELECT built FROM fence_progress WHERE id_map = ? AND tile_x = ? AND tile_y = ?;', [mapId, x, y]);
        if (!row) {
          // initialize if not existing
          await db.run('INSERT INTO fence_progress (id_map, tile_x, tile_y, built) VALUES (?, ?, ?, 0);', [mapId, x, y]);
        }
        // set as built
        await db.run(
          `UPDATE fence_progress
           SET built = 1, updated_at = CURRENT_TIMESTAMP
           WHERE id_map = ? AND tile_x = ? AND tile_y = ?;`,
          [mapId, x, y]
        );
        const countRow = await db.get('SELECT SUM(built) as built_count, COUNT(*) as total FROM fence_progress WHERE id_map = ?;', [mapId]);
        await db.exec('COMMIT;');

        // Broadcast built fence and counts
        this.broadcast('fenceBuilt', { mapId, x, y });
        this.broadcast('fenceCount', { mapId, built: countRow?.built_count || 0, total: countRow?.total || 0 });
        // Unlock map 5 when 11 fences (all) built
        if ((countRow?.built_count || 0) >= (countRow?.total || 0) && (countRow?.total || 0) > 0) {
          this.broadcast('mapUnlocked', { mapId: 5 });
        }
      } catch (err) {
        console.error('Failed to build fence', err);
      }
    });

    // Buffered house contributions to batch DB writes and avoid aggressive cooldowns
    this.pendingHouseContribs = new Map(); // sessionId -> Map('x,y' -> count)
    this.housePerIntervalCap = 20; // max contributions per player per flush interval
    const validHouseSites = new Set(['14,13','8,7','28,7']);

    this.onMessage("buildHouse", (client, data) => {
      const x = (data && typeof data.x === 'number') ? data.x : null;
      const y = (data && typeof data.y === 'number') ? data.y : null;
      const mapId = this.mapId ?? 5;
      if (x == null || y == null) return;
      if (mapId !== 5) return;
      // proximity check
      const sid = client.sessionId;
      if (!this._isInRange(sid, x, y, 6)) {
        try { client.send('actionDenied', { action: 'house', reason: 'out_of_range' }); } catch {}
        return;
      }
      const key = `${x},${y}`;
      if (!validHouseSites.has(key)) return;
      // per-interval cap enforcement per player across all sites
      const playerMap = this.pendingHouseContribs.get(sid) || new Map();
      const prevTotal = Array.from(playerMap.values()).reduce((a, b) => a + b, 0);
      const allowed = Math.max(0, this.housePerIntervalCap - prevTotal);
      const toAdd = Math.min(1, allowed); // each click contributes 1 rock
      if (toAdd <= 0) {
        try { client.send('houseContribDenied', { reason: 'rate_limited' }); } catch {}
        return;
      }
      playerMap.set(key, (playerMap.get(key) || 0) + toAdd);
      this.pendingHouseContribs.set(sid, playerMap);
      try { client.send('houseContribQueued', { x, y, inc: toAdd }); } catch {}
    });

    // Flush pending house contributions every 1s
    this._houseFlushInterval = setInterval(async () => {
      if (!this.pendingHouseContribs || this.pendingHouseContribs.size === 0) return;
      // Aggregate per-site totals while respecting each player's available rocks
      const siteTotals = new Map(); // 'x,y' -> total contributions
      const perPlayerProcessed = new Map(); // sid -> processed total
      try {
        const db = await openDB();
        await db.exec('BEGIN TRANSACTION;');

        // For each player, consume rocks up to their requested contributions
        for (const [sid, map] of this.pendingHouseContribs.entries()) {
          const clientEntry = [...this.clientByUsername.entries()].find(([, cl]) => cl.sessionId === sid);
          const cl = clientEntry ? clientEntry[1] : null;
          const me = this.state.clients.find(c => c.sessionId === sid);
          const idPlayer = me && me.id_player;
          if (!idPlayer) continue;
          // ensure inventory row exists
          const invRow = await db.get('SELECT rocks FROM inventory WHERE id_player = ?;', [idPlayer]);
          if (!invRow) {
            await db.run('INSERT INTO inventory (id_player, bricks, rocks) VALUES (?, 0, 0);', [idPlayer]);
          }
          let available = (invRow && typeof invRow.rocks === 'number') ? invRow.rocks : 0;
          let processedForPlayer = 0;
          for (const [k, req] of map.entries()) {
            if (available <= 0) break;
            const take = Math.min(req, available);
            if (take <= 0) continue;
            siteTotals.set(k, (siteTotals.get(k) || 0) + take);
            available -= take;
            processedForPlayer += take;
          }
          if (processedForPlayer > 0) {
            // decrement player's rocks
            await db.run('UPDATE inventory SET rocks = rocks - ? WHERE id_player = ? AND rocks >= ?;', [processedForPlayer, idPlayer, processedForPlayer]);
            perPlayerProcessed.set(sid, processedForPlayer);
          }
        }

        // Apply site totals to house_progress
        for (const [k, total] of siteTotals.entries()) {
          const [sx, sy] = k.split(',').map(Number);
          const row = await db.get('SELECT progress, required FROM house_progress WHERE id_map = 5 AND tile_x = ? AND tile_y = ?;', [sx, sy]);
          if (!row) {
            await db.run('INSERT INTO house_progress (id_map, tile_x, tile_y, progress, required) VALUES (5, ?, ?, 0, 50);', [sx, sy]);
          }
          await db.run('UPDATE house_progress SET progress = MIN(required, progress + ?) WHERE id_map = 5 AND tile_x = ? AND tile_y = ?;', [total, sx, sy]);
          const updated = await db.get('SELECT progress, required FROM house_progress WHERE id_map = 5 AND tile_x = ? AND tile_y = ?;', [sx, sy]);
          this.broadcast('houseProgress', { mapId: 5, x: sx, y: sy, current: updated.progress || 0, required: updated.required || 50 });
          if ((updated.progress || 0) >= (updated.required || 50)) {
            this.broadcast('houseBuilt', { mapId: 5, x: sx, y: sy });
          }
        }

        // Broadcast full house progress snapshot
        try {
          const allRows = await db.all('SELECT id_map, tile_x, tile_y, progress, required FROM house_progress WHERE id_map = 5;');
          this.broadcast('houseAllProgress', { mapId: 5, rows: (allRows || []).map(r => ({ x: r.tile_x, y: r.tile_y, current: r.progress || 0, required: r.required || 50 })) });
        } catch (e) {}

        await db.exec('COMMIT;');

        // Notify players about inventory updates and processed amounts
        for (const [sid, processed] of perPlayerProcessed.entries()) {
          try {
            const clientEntry = [...this.clientByUsername.entries()].find(([, cl]) => cl.sessionId === sid);
            if (!clientEntry) continue;
            const cl = clientEntry[1];
            const me = this.state.clients.find(c => c.sessionId === sid);
            const idPlayer = me && me.id_player;
            if (!idPlayer) continue;
            const newInv = await openDB().then(db2 => db2.get('SELECT bricks, rocks FROM inventory WHERE id_player = ?;', [idPlayer]));
            try { cl.send('inventoryUpdate', { bricks: newInv?.bricks || 0, rocks: newInv?.rocks || 0 }); } catch {}
          } catch (e) {}
        }

        // If all houses completed, maybe finish the game (reuse existing logic)
        try {
          const allRows = await openDB().then(db3 => db3.all('SELECT id_map, tile_x, tile_y, progress, required FROM house_progress WHERE id_map = 5;'));
          const allDone = (allRows || []).length > 0 && (allRows || []).every(r => (r.progress || 0) >= (r.required || 50));
          if (allDone) {
            const db3 = await openDB();
            const mostConstructive = await db3.get(`SELECT p.username as username FROM player_stats s JOIN player p ON p.id_player = s.id_player ORDER BY s.constructive DESC, p.id_player ASC LIMIT 1;`);
            const mostHarvest = await db3.get(`SELECT p.username as username FROM player_stats s JOIN player p ON p.id_player = s.id_player ORDER BY s.harvest DESC, p.id_player ASC LIMIT 1;`);
            const mostTalkative = await db3.get(`SELECT p.username as username, COUNT(*) as cnt FROM chat_message c JOIN player p ON p.id_player = c.id_player GROUP BY c.id_player ORDER BY cnt DESC, p.id_player ASC LIMIT 1;`);
            const didNothing = await db3.get(`
              SELECT p.username as username FROM player p
              LEFT JOIN player_stats s ON s.id_player = p.id_player
              LEFT JOIN (SELECT id_player, COUNT(*) as cnt FROM chat_message GROUP BY id_player) cm ON cm.id_player = p.id_player
              WHERE COALESCE(s.constructive, 0) = 0 AND COALESCE(s.harvest, 0) = 0 AND COALESCE(cm.cnt, 0) = 0
              ORDER BY p.id_player ASC LIMIT 1;
            `);
            this.broadcast('gameFinished', {
              title: 'Monde Réanchanté! Bravo ! :)',
              leaderboard: {
                mostConstructive: mostConstructive?.username || null,
                mostHarvest: mostHarvest?.username || null,
                mostTalkative: mostTalkative?.username || null,
                didNothing: didNothing?.username || null,
              }
            });
          }
        } catch (e) {}
      } catch (err) {
        console.error('Failed to flush house contributions', err);
        try { const db2 = await openDB(); await db2.exec('ROLLBACK;'); } catch {}
      } finally {
        this.pendingHouseContribs.clear();
      }
    }, 1000);

    // Partner sends counter-offer back to proposer
    this.onMessage("tradeCounterOffer", (client, data) => {
      const from = this.state.clients.find(c => c.sessionId === client.sessionId);
      if (!from || !data || !data.toUsername || !data.aToB || !data.bToA) return;
      const targetClient = this.clientByUsername.get(data.toUsername);
      if (targetClient) {
        targetClient.send("tradeCounterOffer", {
          fromUsername: from.username,
          aToB: data.aToB,
          bToA: data.bToA,
        });
      }
    });

    this.onMessage("updateColor", (client, data) => {
      const player = this.state.clients.find(c => c.sessionId === client.sessionId);
      if (player && data.color) {
        player.color = data.color;
        this.broadcast("clients", this.state.clients);
      }
    });

    // Réception des mises à jour de position des joueurs
    this.onMessage("updatePosition", async (client, data) => {
      if (!data || typeof data.x !== "number" || typeof data.y !== "number") {
        return;
      }

      const player = this.state.clients.find(
        (c) => c.sessionId === client.sessionId
      );
      if (!player) return;

      player.x = data.x;
      player.y = data.y;

      // diffuse les nouvelles positions à tous les clients (keep responsive)
      this.broadcast("clients", this.state.clients);

      // Persist player position to DB at most once every second per player
      const sid = client.sessionId;
      const movePersistMs = 1000;
      const prev = this.lastActionTime.get(sid) || {};
      const now = Date.now();
      if (!prev.move || (now - prev.move) >= movePersistMs) {
        try {
          const db = await openDB();
          await db.run(
            `UPDATE player SET x = ?, y = ? WHERE username = ?;`,
            [player.x, player.y, player.username]
          );
          prev.move = now;
          this.lastActionTime.set(sid, prev);
        } catch (err) {
          console.error("Failed to persist player position", err);
        }
      }
    });
  }

  async onJoin(client, options) {
    console.log(`${client.sessionId} joined GameRoom(mapId=${this.mapId})`);

    const username = options?.username || client.sessionId;
    // position et couleur de départ depuis la DB si possible
    let startX = 1;
    let startY = 1;
    let color = null;
    let currentMapId = this.mapId;

    let playerRow = null;
    try {
      const db = await openDB();
      const row = await db.get(
        `SELECT id_player, id_map, x, y, color, is_blocked FROM player WHERE username = ?`,
        [username]
      );
      playerRow = row;
      // If blocked, refuse join immediately
      if (row && Number(row.is_blocked) === 1) {
        try { client.send('blocked', { reason: 'user_blocked' }); } catch {}
        try { client.leave(0); } catch {}
        return;
      }
      if (row) {
        if (typeof row.x === "number") startX = row.x;
        if (typeof row.y === "number") startY = row.y;
        if (typeof row.color === "string" && row.color.length) {
          color = row.color;
        }
        if (typeof row.id_map === 'number') {
          currentMapId = row.id_map;
        }
      }
    } catch (err) {
      console.error("Failed to load player data on join", err);
    }

    this.state.clients.push({
      sessionId: client.sessionId,
      username,
      id_player: (playerRow && typeof playerRow.id_player === 'number') ? playerRow.id_player : undefined,
      x: startX,
      y: startY,
      color: color,
    });

    // map username to client for direct messaging
    this.clientByUsername.set(username, client);

    // diffuse la liste complète à tous les clients
    this.broadcast("clients", this.state.clients);

    // Send current progress for THIS map only
    try {
      const db = await openDB();
      // Factory progress for current map
      const fp = await db.get('SELECT id_map, clicks_current, clicks_required FROM factory_progress WHERE id_map = ?;', [this.mapId]);
      if (fp) {
        client.send('factoryProgress', { mapId: fp.id_map, clicksCurrent: fp.clicks_current || 0, clicksRequired: fp.clicks_required || 0 });
      }
      // Flower progress only if this is Map 3
      if (this.mapId === 3) {
        const flowers = await db.all('SELECT id_map, tile_x, tile_y, water_current, water_required FROM flower_progress WHERE id_map = 3;');
        for (const f of flowers || []) {
          client.send('flowerProgress', { mapId: f.id_map, x: f.tile_x, y: f.tile_y, current: f.water_current || 0, required: f.water_required || 50 });
          if ((f.water_current || 0) >= (f.water_required || 50)) {
            client.send('tileFlowered', { mapId: f.id_map, x: f.tile_x, y: f.tile_y });
          }
        }
      }
      // Fence progress only if this is Map 4
      if (this.mapId === 4) {
        const fences = await db.all('SELECT id_map, tile_x, tile_y, built FROM fence_progress WHERE id_map = 4;');
        let builtCount = 0, totalCount = 0;
        for (const fc of fences || []) {
          totalCount++;
          if ((fc.built || 0) > 0) {
            builtCount++;
            client.send('fenceBuilt', { mapId: fc.id_map, x: fc.tile_x, y: fc.tile_y });
          }
        }
        client.send('fenceCount', { mapId: 4, built: builtCount, total: totalCount });
      }

      // House building progress only if this is Map 5
      if (this.mapId === 5) {
        // ensure progress table exists
        await db.run(`CREATE TABLE IF NOT EXISTS house_progress (
          id_map INTEGER,
          tile_x INTEGER,
          tile_y INTEGER,
          progress INTEGER DEFAULT 0,
          required INTEGER DEFAULT 50,
          PRIMARY KEY (id_map, tile_x, tile_y)
        );`);
        const houseSites = [
          { x: 14, y: 13 },
          { x: 8, y: 7 },
          { x: 28, y: 7 },
        ];
        // initialize rows if missing
        for (const s of houseSites) {
          const row = await db.get('SELECT progress, required FROM house_progress WHERE id_map = 5 AND tile_x = ? AND tile_y = ?;', [s.x, s.y]);
          if (!row) {
            await db.run('INSERT INTO house_progress (id_map, tile_x, tile_y, progress, required) VALUES (5, ?, ?, 0, 50);', [s.x, s.y]);
          }
        }
        const rows = await db.all('SELECT id_map, tile_x, tile_y, progress, required FROM house_progress WHERE id_map = 5;');
        for (const r of rows || []) {
          client.send('houseProgress', { mapId: r.id_map, x: r.tile_x, y: r.tile_y, current: r.progress || 0, required: r.required || 50 });
        }
      }
    } catch (err) {
      console.error('Failed to load factory progress on join', err);
    }
  }

  // Admin-only helpers
  async isAdminClient(sessionId) {
    try {
      const player = this.state.clients.find(c => c.sessionId === sessionId);
      if (!player || !player.id_player) return false;
      const db = await openDB();
      const row = await db.get('SELECT role FROM player WHERE id_player = ?;', [player.id_player]);
      return !!row && row.role === 'admin';
    } catch {
      return false;
    }
  }

  onLeave(client, consented) {
    console.log(`${client.sessionId} left GameRoom`);
    this.state.clients = this.state.clients.filter(
      (c) => c.sessionId !== client.sessionId
    );

    // Remove mapping if present
    const entry = [...this.clientByUsername.entries()].find(([, cl]) => cl.sessionId === client.sessionId);
    if (entry) {
      this.clientByUsername.delete(entry[0]);
    }

    // met à jour la liste côté clients
    this.broadcast("clients", this.state.clients);
  }

  // Clean up intervals when room is disposed
  onDispose() {
    try { clearInterval(this._factoryFlushInterval); } catch {}
    try { clearInterval(this._flowerFlushInterval); } catch {}
    try { clearInterval(this._houseFlushInterval); } catch {}
  }
}
