import { Room } from "colyseus";

export class GameRoom extends Room {
  onCreate(options) {
    // État minimal pour commencer : sera enrichi plus tard
    this.setState({
      tiles: [],
      ruins: [],
      buildings: [],
      clients: [], // { sessionId, username }
    });

    this.onMessage("clickRuin", (client, data) => {
      const ruin = this.state.ruins.find((r) => r.id_ruin === data.id_ruin);
      if (ruin) {
        ruin.clicks_current = (ruin.clicks_current || 0) + (data.click_value || 1);
      }
      // Colyseus se charge de synchroniser l'état avec tous les clients
    });
  }

  onJoin(client, options) {
    console.log(`${client.sessionId} joined GameRoom`);

    const username = options?.username || client.sessionId;
    this.state.clients.push({ sessionId: client.sessionId, username });

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
