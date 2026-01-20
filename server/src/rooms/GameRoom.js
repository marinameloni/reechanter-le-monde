import { Room } from "colyseus";
import { openDB } from "../config/db.js";

export class GameRoom extends Room {
  onCreate(options) {
    // État minimal pour commencer : sera enrichi plus tard
    this.setState({
      tiles: [],
      ruins: [],
      buildings: [],
      clients: [], // { sessionId, username, x, y }
    });

    // Map username to Colyseus client for direct messaging
    this.clientByUsername = new Map();

    this.onMessage("clickRuin", (client, data) => {
      const ruin = this.state.ruins.find((r) => r.id_ruin === data.id_ruin);
      if (ruin) {
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
    this.onMessage("chatMessage", (client, data) => {
      const from = this.state.clients.find(c => c.sessionId === client.sessionId);
      const text = (data && typeof data.text === 'string') ? data.text.trim() : '';
      if (!from || !text) return;
      // Broadcast to everyone (including sender) to render bubbles
      this.broadcast("chatMessage", { fromUsername: from.username, text });
    });

    // Shared factory clicks per map
    this.onMessage("factoryClick", async (client, data) => {
      const inc = (data && typeof data.inc === 'number') ? data.inc : 1;
      const mapId = (data && typeof data.mapId === 'number') ? data.mapId : 1;
      try {
        const db = await openDB();
        await db.exec('BEGIN TRANSACTION;');
        const row = await db.get('SELECT clicks_current, clicks_required FROM factory_progress WHERE id_map = ?;', mapId);
        if (!row) {
          // initialize if not existing
          await db.run('INSERT INTO factory_progress (id_map, clicks_current, clicks_required) VALUES (?, 0, 500);', mapId);
        }
        await db.run(
          `UPDATE factory_progress
           SET clicks_current = clicks_current + ?, updated_at = CURRENT_TIMESTAMP
           WHERE id_map = ?;`,
          [inc, mapId]
        );
        const updated = await db.get('SELECT clicks_current, clicks_required FROM factory_progress WHERE id_map = ?;', mapId);
        await db.exec('COMMIT;');

        // Broadcast updated progress to all
        this.broadcast('factoryProgress', { mapId, clicksCurrent: updated.clicks_current || 0, clicksRequired: updated.clicks_required || 500 });
        if ((updated.clicks_current || 0) >= (updated.clicks_required || 500)) {
          this.broadcast('mapUnlocked', { mapId: mapId + 1 });
        }
      } catch (err) {
        console.error('Failed to update factory progress', err);
      }
    });

    // Shared watering per tile on Map 3 (former factory tiles)
    this.onMessage("waterTile", async (client, data) => {
      const inc = (data && typeof data.inc === 'number') ? data.inc : 1;
      const mapId = (data && typeof data.mapId === 'number') ? data.mapId : 3;
      const x = (data && typeof data.x === 'number') ? data.x : null;
      const y = (data && typeof data.y === 'number') ? data.y : null;
      if (mapId !== 3 || x == null || y == null) return;
      try {
        const db = await openDB();
        await db.exec('BEGIN TRANSACTION;');
        const row = await db.get('SELECT water_current, water_required FROM flower_progress WHERE id_map = ? AND tile_x = ? AND tile_y = ?;', [mapId, x, y]);
        if (!row) {
          // initialize if not existing
          await db.run('INSERT INTO flower_progress (id_map, tile_x, tile_y, water_current, water_required) VALUES (?, ?, ?, 0, 50);', [mapId, x, y]);
        }
        await db.run(
          `UPDATE flower_progress
           SET water_current = MIN(water_required, water_current + ?), updated_at = CURRENT_TIMESTAMP
           WHERE id_map = ? AND tile_x = ? AND tile_y = ?;`,
          [inc, mapId, x, y]
        );
        const updated = await db.get('SELECT water_current, water_required FROM flower_progress WHERE id_map = ? AND tile_x = ? AND tile_y = ?;', [mapId, x, y]);
        await db.exec('COMMIT;');

        // Broadcast updated tile progress to all
        this.broadcast('flowerProgress', { mapId, x, y, current: updated.water_current || 0, required: updated.water_required || 50 });
        // If tile completed, broadcast tileFlowered
        if ((updated.water_current || 0) >= (updated.water_required || 50)) {
          this.broadcast('tileFlowered', { mapId, x, y });
          // Check if all tiles on map 3 completed
          const remaining = await db.get('SELECT COUNT(*) as c FROM flower_progress WHERE id_map = 3 AND water_current < water_required;');
          if ((remaining?.c || 0) === 0) {
            this.broadcast('mapUnlocked', { mapId: 4 });
          }
        }
      } catch (err) {
        console.error('Failed to update flower progress', err);
      }
    });

    // Shared fence building on Map 4
    this.onMessage("buildFence", async (client, data) => {
      const x = (data && typeof data.x === 'number') ? data.x : null;
      const y = (data && typeof data.y === 'number') ? data.y : null;
      const mapId = 4;
      if (x == null || y == null) return;
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

      // diffuse les nouvelles positions à tous les clients
      this.broadcast("clients", this.state.clients);

      // Persiste également la position dans la base (player.x / player.y)
      try {
        const db = await openDB();
        await db.run(
          `UPDATE player SET x = ?, y = ? WHERE username = ?;`,
          [player.x, player.y, player.username]
        );
      } catch (err) {
        console.error("Failed to persist player position", err);
      }
    });
  }

  async onJoin(client, options) {
    console.log(`${client.sessionId} joined GameRoom`);

    const username = options?.username || client.sessionId;
    // position et couleur de départ depuis la DB si possible
    let startX = 1;
    let startY = 1;
    let color = null;

    let playerRow = null;
    try {
      const db = await openDB();
      const row = await db.get(
        `SELECT id_player, x, y, color FROM player WHERE username = ?`,
        [username]
      );
      playerRow = row;
      if (row) {
        if (typeof row.x === "number") startX = row.x;
        if (typeof row.y === "number") startY = row.y;
        if (typeof row.color === "string" && row.color.length) {
          color = row.color;
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

    // Send current factory progress (for all maps) to the newly joined client
    try {
      const db = await openDB();
      const rows = await db.all('SELECT id_map, clicks_current, clicks_required FROM factory_progress;');
      for (const row of rows || []) {
        client.send('factoryProgress', { mapId: row.id_map, clicksCurrent: row.clicks_current || 0, clicksRequired: row.clicks_required || 0 });
      }
      // Also send current flower progress for map 3
      const flowers = await db.all('SELECT id_map, tile_x, tile_y, water_current, water_required FROM flower_progress WHERE id_map = 3;');
      for (const f of flowers || []) {
        client.send('flowerProgress', { mapId: f.id_map, x: f.tile_x, y: f.tile_y, current: f.water_current || 0, required: f.water_required || 50 });
        if ((f.water_current || 0) >= (f.water_required || 50)) {
          client.send('tileFlowered', { mapId: f.id_map, x: f.tile_x, y: f.tile_y });
        }
      }
      // Send current fence progress for map 4
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
    } catch (err) {
      console.error('Failed to load factory progress on join', err);
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
}
