import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server as ColyseusServer } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';

import authRoutes from './routes/auth.routes.js';
import { GameRoom } from './rooms/GameRoom.js';

const { json } = bodyParser;

// --- Express HTTP API (REST) + Colyseus on the same HTTP server ---
const app = express();
app.use(cors());
app.use(json());

// routes REST classiques
app.use('/api/auth', authRoutes);

// Crée le serveur HTTP partagé entre Express et Colyseus
const server = createServer(app);

// Colyseus utilise le même serveur HTTP
const gameServer = new ColyseusServer({
  transport: new WebSocketTransport({ server }),
});

gameServer.define('game_room', GameRoom);

const PORT = 4000;
gameServer.listen(PORT);
console.log(`HTTP + Colyseus listening on http://localhost:${PORT} (ws sur le même port)`);
