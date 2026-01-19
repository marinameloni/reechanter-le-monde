# Reenchanter le Monde

A Vue 3 + Vite client with an Express + Colyseus backend. Turn-based/real-time gameplay runs through a Colyseus `GameRoom` while REST endpoints handle auth and game data. This README is a quick orientation plus run steps for development.

## Monorepo Structure

```
reechanter-le-monde/
├─ client/                   # Vue 3 app (Vite + Pinia + Vue Router)
│  ├─ src/
│  │  ├─ views/             # Auth, Game, Admin pages
│  │  ├─ components/        # UI + game components (tiles, buildings, sprites)
│  │  ├─ store/             # Pinia stores: auth, game, map
│  │  ├─ router/            # Client-side routes & guards
│  │  ├─ services/          # Axios instance, client helpers
│  │  ├─ utils/             # Shared helpers/constants
│  │  └─ assets/            # Sprites, maps (e.g., map1.json)
│  └─ vite.config.js
├─ server/                   # Express + Colyseus
│  ├─ src/
│  │  ├─ server.js          # Express + Colyseus on HTTP port 4000
│  │  ├─ controllers/       # REST controllers (auth, game, map, player)
│  │  ├─ routes/            # Express routers for API modules
│  │  ├─ middlewares/       # (auth/error) middleware scaffolding
│  │  ├─ rooms/             # Colyseus GameRoom
│  │  ├─ models/            # SQLite models
│  │  ├─ services/          # Business logic modules
│  │  ├─ config/            # DB connection
│  │  └─ database/          # SQLite file, migrations, seeds
└─ README.md
```

## Quick Start (Dev)

Run backend and frontend in separate terminals:

```powershell
# Backend
Push-Location "server"
npm install
npm start     # starts Express + Colyseus on http://localhost:4000

# Frontend
Push-Location "client"
npm install
npm run dev   # starts Vite on http://localhost:5173
```

Notes:

- The backend binds to port `4000`. If you see `EADDRINUSE`, stop the existing process or change the port in `server/src/server.js`.
- The client proxies requests to the backend using the `baseURL` in `client/src/services/api.js`.

## Auth Behavior

- Login/Signup returns a JWT that now expires in 1 day.
- The client persists `user` and `token` to `localStorage` and restores them on app start via `useAuthStore().init()`.
- On startup, the store decodes `exp` and clears auth if expired; otherwise the user stays logged in until explicit logout or 24h passes.
- All Axios calls include the `Authorization: Bearer <token>` header via a request interceptor.

Admin account for development:

- Username: `admin`
- Password: `clubpenguin123`
- The account is created automatically on first login if missing. Do not use in production.

## Key Files

- Client
  - `client/src/main.js`: Bootstraps Vue, installs Pinia and router, hydrates auth.
  - `client/src/router/index.js`: `/auth`, `/game`, `/admin` with admin guard.
  - `client/src/store/auth.store.js`: Auth state, persistence, login/signup/logout.
  - `client/src/views/Auth.vue`: Login/Signup UI + color selection.
  - `client/src/views/Game.vue`: Shows player info, color picker, players list, and `GameMap`.
  - `client/src/components/game/*`: Map tiles, buildings, ruins, player sprite, construction menu, signup preview.
  - `client/src/services/api.js`: Axios instance + auth header interceptor.

- Server
  - `server/src/server.js`: Express app + Colyseus `GameRoom` on the same HTTP server.
  - `server/src/controllers/auth.controller.js`: Signup/Login with bcrypt and JWT; 1‑day expiry.
  - `server/src/routes/*.routes.js`: Router modules mounting controllers.
  - `server/src/rooms/GameRoom.js`: Real-time game room logic.
  - `server/src/database/migrations/init.sql`: Base schema; `game.sqlite` holds data.

## Roadmap / Next Steps

- Implement and wire `server/src/middlewares/auth.middleware.js` to protect sensitive routes (`/api/player`, `/api/game` mutations).
- Move JWT secret to environment variables.
- Add a visible logout button in the header, and optionally an Axios response interceptor to auto-logout on `401`.

## Troubleshooting

- Port conflict on `4000`: terminate existing server (`Ctrl+C`) or change port.
- Stale credentials: clear browser `localStorage` keys `auth_token` and `auth_user`.
- DB issues: remove `server/src/database/game.sqlite` and re-run migration/seed from SQL files, if needed.
