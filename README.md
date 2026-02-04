# Reenchanter le Monde
Application cliente Vue 3 + Vite avec un backend Express + Colyseus. Le gameplay, au tour par tour ou en temps réel, s'exécute dans une `GameRoom` Colyseus tandis que des endpoints REST gèrent l'authentification et les données de jeu. Ce README propose une prise en main rapide et les étapes pour le développement.

## Structure du monorepo
```

reechanter-le-monde/
├─ client/ # Application Vue 3 (Vite + Pinia + Vue Router)
│ ├─ src/
│ │ ├─ views/ # Pages : Auth, Game, Admin
│ │ ├─ components/ # Composants UI et de jeu (tuiles, bâtiments, sprites)
│ │ ├─ store/ # Stores Pinia : auth, game, map
│ │ ├─ router/ # Routes client et guards
│ │ ├─ services/ # Instance Axios, helpers côté client
│ │ ├─ utils/ # Helpers/constants partagés
│ │ └─ assets/ # Sprites, maps (ex. map1.json)
│ └─ vite.config.js
├─ server/ # Express + Colyseus
│ ├─ src/
│ │ ├─ server.js # Express + Colyseus sur le port HTTP 4000
│ │ ├─ controllers/ # Contrôleurs REST (auth, game, map, player)
│ │ ├─ routes/ # Routeurs Express pour les modules API
│ │ ├─ middlewares/ # Middlewares (auth/erreur)
│ │ ├─ rooms/ # `GameRoom` Colyseus
│ │ ├─ models/ # Modèles SQLite
│ │ ├─ services/ # Modules de logique métier
│ │ ├─ config/ # Connexion DB
│ │ └─ database/ # Fichier SQLite, migrations, seeds
└─ README.md

```

## Démarrage rapide (développement)

Lancez le backend et le frontend dans deux terminaux séparés :

```powershell
# Backend
Push-Location "server"
npm install
npm start     # démarre Express + Colyseus en ligne

# Frontend
Push-Location "client"
npm install
npm run dev   # démarre Vite sur http://localhost:5173
````

Remarques :


- Le client proxy les requêtes vers le backend en utilisant le `baseURL` défini dans `client/src/services/api.js`.

## Comportement de l'authentification

- Les actions de connexion/inscription renvoient un JWT qui expire actuellement au bout d'un jour.
- Le client persiste `user` et `token` dans le `localStorage` et les restaure au démarrage de l'application via `useAuthStore().init()`.
- Au démarrage, le store décode le champ `exp` et purge l'authentification si le token est expiré ; sinon l'utilisateur reste connecté jusqu'à déconnexion explicite ou la fin des 24h.
- Toutes les requêtes Axios incluent l'entête `Authorization: Bearer <token>` via un interceptor sur les requêtes.

## Fichiers clés

- Client
  - `client/src/main.js` : Initialise Vue, installe Pinia et le router, hydrate l'auth.
  - `client/src/router/index.js` : Routes `/auth`, `/game`, `/admin` avec guard admin.
  - `client/src/store/auth.store.js` : État d'auth, persistance, login/signup/logout.
  - `client/src/views/Auth.vue` : UI de connexion/inscription + sélection de couleur.
  - `client/src/views/Game.vue` : Affiche les infos joueur, sélecteur de couleur, liste des joueurs et `GameMap`.
  - `client/src/components/game/*` : Tuiles, bâtiments, ruines, sprite joueur, menu de construction, aperçu d'inscription.
  - `client/src/services/api.js` : Instance Axios + interceptor pour l'entête d'auth.

- Serveur
  - `server/src/server.js` : Application Express + `GameRoom` Colyseus sur le même serveur HTTP.
  - `server/src/controllers/auth.controller.js` : Inscription/Connexion avec bcrypt et JWT ; expiration 1 jour.
  - `server/src/routes/*.routes.js` : Modules routeurs qui montent les contrôleurs.
  - `server/src/rooms/GameRoom.js` : Logique temps réel de la salle de jeu.
  - `server/src/database/migrations/init.sql` : Schéma de base ; `game.sqlite` contient les données.

## Feuille de route / Prochaines étapes

- Implémenter et brancher `server/src/middlewares/auth.middleware.js` pour protéger les routes sensibles (`/api/player`, mutations `/api/game`).
- Déplacer le secret JWT vers des variables d'environnement.
- Ajouter un bouton de déconnexion visible dans l'en-tête, et éventuellement un interceptor de réponse Axios pour déconnecter automatiquement sur `401`.

## Dépannage

- Identifiants obsolètes : supprimez les clés `auth_token` et `auth_user` dans le `localStorage` du navigateur.
- Problèmes de base de données : supprimez `server/src/database/game.sqlite` et relancez les migrations/seeds à partir des fichiers SQL si nécessaire.

```

