import { defineStore } from 'pinia';
import api from '../services/api';
import { Client } from 'colyseus.js';

export const useGameStore = defineStore('game', {
	state: () => ({
		worldState: null,  // { world_score, day }
		tiles: [],         // tiles de la map courante
		ruins: [],         // ruines / factories
		buildings: [],     // bâtiments construits
		inventory: null,   // inventaire du joueur
		room: null,        // instance Colyseus Room
		connected: false,  // connexion temps réel active
		clients: [],       // joueurs connectés à la room (avec x, y, color, ...)
		loading: false,
		error: null,
	}),
		actions: {
			async connectToRoom(username, mapId = 1) {
			if (this.connected) return;

			try {
				// Colyseus est servi via le même port HTTP que l'API (4000)
				const client = new Client('ws://localhost:4000');
				const room = await client.joinOrCreate('game_room', { username, mapId });

				this.room = room;
				this.connected = true;

				// Écoute globale de l'état synchronisé par Colyseus
				room.onStateChange((state) => {
					// ici on suppose que state.tiles / ruins / buildings sont des tableaux simples
					this.tiles = state.tiles || [];
					this.ruins = state.ruins || [];
					this.buildings = state.buildings || [];
				});

				// Mise à jour de la liste des joueurs connectés (avec positions) via messages explicites
				room.onMessage('clients', (clients) => {
					this.clients = clients || [];
				});
			} catch (err) {
				console.error('Failed to connect to Colyseus room', err);
				this.error = 'Impossible de se connecter au serveur de jeu';
			}
		},

		async switchRoom(username, mapId) {
			try {
				// Leave current room if connected
				if (this.room) {
					try { await this.room.leave(); } catch {}
				}
				this.room = null;
				this.connected = false;

				// Reconnect to target map room using same server
				const client = new Client('ws://localhost:4000');
				const room = await client.joinOrCreate('game_room', { username, mapId });
				this.room = room;
				this.connected = true;

				// Basic state listeners
				room.onStateChange((state) => {
					this.tiles = state.tiles || [];
					this.ruins = state.ruins || [];
					this.buildings = state.buildings || [];
				});
				room.onMessage('clients', (clients) => {
					this.clients = clients || [];
				});
			} catch (err) {
				console.error('Failed to switch Colyseus room', err);
				this.error = 'Impossible de changer de salle de jeu';
			}
		},

		async updatePlayerColor(playerId, newColor) {
			try {
				// Persistance via API REST
				await api.post('/api/player/color', {
					playerId,
					color: newColor,
				});

				// Notification temps réel aux autres joueurs via Colyseus
				if (this.room) {
					this.room.send('updateColor', { color: newColor });
				}
			} catch (err) {
				console.error('Failed to update player color', err);
			}
		},

		async loadWorld(mapId) {
			this.loading = true;
			this.error = null;
			try {
				const res = await api.get(`/api/game/world/${mapId}`);
				this.tiles = res.data.tiles || [];
				this.ruins = res.data.ruins || [];
				this.buildings = res.data.buildings || [];
				this.worldState = res.data.worldState || null;
			} catch (err) {
				this.error = err.response?.data?.message || 'Failed to load world';
				console.error('Failed to load world', err);
			} finally {
				this.loading = false;
			}
		},

		async clickTile(playerId, ruinId, clickValue = 1) {
			// Si connecté à Colyseus, on envoie l'action en temps réel
			if (this.room) {
				try {
					this.room.send('clickRuin', { id_ruin: ruinId, click_value: clickValue });
				} catch (err) {
					console.error('Click via Colyseus failed', err);
				}
				return;
			}

			// Fallback HTTP classique si pas encore connecté au serveur temps réel
			try {
				await api.post('/api/game/click', { playerId, ruinId, clickValue });

				const ruin = this.ruins.find((r) => r.id_ruin === ruinId);
				if (ruin) {
					ruin.clicks_current += clickValue;
				}
			} catch (err) {
				console.error('Click failed', err);
			}
		},

		async loadInventory(playerId) {
			try {
				const res = await api.get(`/api/game/inventory/${playerId}`);
				this.inventory = res.data;
			} catch (err) {
				console.error('Failed to load inventory', err);
			}
		},
	},
});
