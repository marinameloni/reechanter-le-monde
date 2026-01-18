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

    this.onMessage("clickRuin", (client, data) => {
      const ruin = this.state.ruins.find((r) => r.id_ruin === data.id_ruin);
      if (ruin) {
        ruin.clicks_current = (ruin.clicks_current || 0) + (data.click_value || 1);
      }
      // Colyseus se charge de synchroniser l'état avec tous les clients
    });

    // Mise à jour de la couleur du joueur (personnalisation temps réel)
    this.onMessage("updateColor", async (client, data) => {
      if (!data || typeof data.color_primary !== "string") {
        return;
      }

      const player = this.state.clients.find(
        (c) => c.sessionId === client.sessionId
      );
      if (!player) return;

      player.color_primary = data.color_primary;

      // diffuse la nouvelle couleur à tous les clients
      this.broadcast("clients", this.state.clients);

      // Persiste également la couleur dans la base
      try {
        const db = await openDB();
        await db.run(
          `UPDATE player SET color_primary = ? WHERE username = ?;`,
          [player.color_primary, player.username]
        );
      } catch (err) {
        console.error("Failed to persist player color", err);
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
    let colorPrimary = "#D674CB";

    try {
      const db = await openDB();
      const row = await db.get(
        `SELECT x, y, color_primary FROM player WHERE username = ?`,
        [username]
      );

      if (row) {
        if (typeof row.x === "number") startX = row.x;
        if (typeof row.y === "number") startY = row.y;
        if (typeof row.color_primary === "string" && row.color_primary.length) {
          colorPrimary = row.color_primary;
        }
      }
    } catch (err) {
      console.error("Failed to load player data on join", err);
    }

    this.state.clients.push({
      sessionId: client.sessionId,
      username,
      x: startX,
      y: startY,
      color_primary: colorPrimary,
    });

    // diffuse la liste complète à tous les clients
    this.broadcast("clients", this.state.clients);
  }

  onLeave(client, consented) {
    console.log(`${client.sessionId} left GameRoom`);
    this.state.clients = this.state.clients.filter(
      (c) => c.sessionId !== client.sessionId
    );

    // met à jour la liste côté clients
    this.broadcast("clients", this.state.clients);
  }
}
