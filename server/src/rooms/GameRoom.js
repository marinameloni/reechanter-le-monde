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

      // Persiste également la position dans la base (player.x / player.y / id_map)
      try {
        const db = await openDB();
        await db.run(
          `UPDATE player SET x = ?, y = ?, id_map = ? WHERE username = ?;`,
          [player.x, player.y, 1, player.username]
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
