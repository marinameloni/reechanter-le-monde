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
        // Local batching for factory clicks
        factoryClickQueue: 0, // accumulated clicks waiting to be sent
        _factoryFlushTimer: null,
    }),
        actions: {
            async connectToRoom(username, mapId = 1) {
            if (this.connected) return;

            try {
                                     // Colyseus: VITE_COLYSEUS_URL prioritaire; sinon fallback basé sur l'origine
                                     const wsUrl = (() => {
                                         const envUrl = (import.meta.env && import.meta.env.VITE_COLYSEUS_URL) || '';
                                         if (envUrl && envUrl.trim()) return envUrl.trim();
                                         try {
                                             const { protocol, hostname, port } = window.location;
                                             const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
                                             if (port === '3000') return `${wsProto}//${hostname}:3001/colyseus`;
                                             return `${wsProto}//${hostname}/colyseus`;
                                         } catch {
                                             const apiUrl = import.meta.env.VITE_API_URL || 'http://193.168.146.9:3001';
                                             return apiUrl.replace(/^http/, 'ws') + '/colyseus';
                                         }
                                     })();
                                     const client = new Client(wsUrl);
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

                // Listen for factory progress updates from server and reconcile optimistic clicks
                room.onMessage('factoryProgress', (data) => {
                    // data: { mapId, clicksCurrent, clicksRequired }
                    // Update ruins or global UI as appropriate. We try to find a factory ruin and update its authoritative clicks.
                    if (data && typeof data.clicksCurrent === 'number') {
                        // Find any ruin that looks like a factory (id property may differ per project)
                        const factory = this.ruins && this.ruins.find(r => r && (r.type === 'factory' || r.isFactory || r.id_ruin));
                        if (factory) {
                            // Replace the authoritative value and clear optimistic local counter
                            factory.clicks_current = data.clicksCurrent;
                            factory._optimisticClicks = 0;
                        }
                    }
                });

                // ack that server queued the click (useful if you want to clear local queued counter immediately)
                room.onMessage('factoryClickQueued', (m) => {
                    // m: { inc }
                    // we already updated UI optimistically on client; no-op or could mark pending state
                });

                // server flush acknowledgement
                room.onMessage('factoryClickFlushed', (m) => {
                    // m: { inc, mapId } - optional per-player confirmation
                    // We rely on the authoritative 'factoryProgress' broadcast for final reconciliation
                });

                // start periodic flush of local queue
                if (!this._factoryFlushTimer) {
                    this._factoryFlushTimer = setInterval(() => {
                        if (!this.room || !this.connected) return;
                        const toSend = this.factoryClickQueue || 0;
                        if (toSend > 0) {
                            try {
                                // send batched clicks to Colyseus; server buffers and persists atomically
                                this.room.send('clickFactory', { inc: toSend });
                            } catch (err) {
                                console.error('Failed to send batched factory clicks', err);
                            }
                            // reset local queue after sending; keep optimistic increments in UI until server confirms
                            this.factoryClickQueue = 0;
                        }
                    }, 500);
                }
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
                                     const wsUrl2 = (() => {
                                         const envUrl = (import.meta.env && import.meta.env.VITE_COLYSEUS_URL) || '';
                                         if (envUrl && envUrl.trim()) return envUrl.trim();
                                         try {
                                             const { protocol, hostname, port } = window.location;
                                             const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
                                             if (port === '3000') return `${wsProto}//${hostname}:3001/colyseus`;
                                             return `${wsProto}//${hostname}/colyseus`;
                                         } catch {
                                             const apiUrl = import.meta.env.VITE_API_URL || 'http://193.168.146.9:3001';
                                             return apiUrl.replace(/^http/, 'ws') + '/colyseus';
                                         }
                                     })();
                                     const client = new Client(wsUrl2);
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
                // reset/ensure flush timer when switching rooms
                if (!this._factoryFlushTimer) {
                    this._factoryFlushTimer = setInterval(() => {
                        if (!this.room || !this.connected) return;
                        const toSend = this.factoryClickQueue || 0;
                        if (toSend > 0) {
                            try { this.room.send('clickFactory', { inc: toSend }); } catch (err) { console.error(err); }
                            this.factoryClickQueue = 0;
                        }
                    }, 500);
                }
            } catch (err) {
                console.error('Failed to switch Colyseus room', err);
                this.error = 'Impossible de changer de salle de jeu';
            }
        },

        // Queue a factory click locally (optimistic UI). Will be flushed periodically in batch to the room.
        queueFactoryClick(ruinId, inc = 1) {
            // Increment local queue count
            this.factoryClickQueue = (this.factoryClickQueue || 0) + inc;
            // Optimistic UI update: increase a local counter on the ruin so player sees immediate feedback
            if (ruinId && this.ruins && Array.isArray(this.ruins)) {
                const r = this.ruins.find(x => x && (x.id_ruin === ruinId || x.id === ruinId));
                if (r) {
                    r._optimisticClicks = (r._optimisticClicks || 0) + inc;
                }
            }
        },

        async updatePlayerColor(color) {
            try {
                await api.post('/api/player/color', {
                    color,
                });
            } catch (err) {
                console.error('Failed to update player color', err);
            }
        },

        async fetchWorldState(mapId) {
            try {
                this.loading = true;
                const res = await api.get(`/api/game/world/${mapId}`);
                this.worldState = res.data;
            } catch (err) {
                console.error('Failed to fetch world state', err);
                this.error = 'Impossible de récupérer l\'état du monde';
            } finally {
                this.loading = false;
            }
        },

        async sendClick(playerId, ruinId, clickValue) {
            try {
                await api.post('/api/game/click', { playerId, ruinId, clickValue });
            } catch (err) {
                console.error('Failed to send click', err);
            }
        },

        async fetchInventory(playerId) {
            try {
                const res = await api.get(`/api/game/inventory/${playerId}`);
                this.inventory = res.data;
            } catch (err) {
                console.error('Failed to fetch inventory', err);
            }
        },
    },
});