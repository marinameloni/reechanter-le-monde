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
		clients: [],       // joueurs connectés à la room (avec x, y, color_primary, ...)
		loading: false,
		error: null,
	}),
		actions: {
			async connectToRoom(username) {
			if (this.connected) return;

			try {
				// Colyseus est servi via le même port HTTP que l'API (4000)
				const client = new Client('ws://localhost:4000');
				const room = await client.joinOrCreate('game_room', { username });

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

		async updatePlayerColor(playerId, newColor) {
			try {
				// Persistance via API REST
				await api.post('/api/player/colors', {
					playerId,
					color_primary: newColor,
				});

				// Notification temps réel aux autres joueurs via Colyseus
				if (this.room) {
					this.room.send('updateColor', { color_primary: newColor });
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
