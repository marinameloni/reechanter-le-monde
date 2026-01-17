PRAGMA foreign_keys = ON;

--------------------------------------------------
-- PLAYER
--------------------------------------------------
CREATE TABLE player (
  id_player INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,

  character_gender TEXT CHECK(character_gender IN ('female', 'male')),
  hair_color TEXT,
  tshirt_color TEXT,

  x INTEGER DEFAULT 0,
  y INTEGER DEFAULT 0,
  id_map INTEGER,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------
-- MAP
--------------------------------------------------
CREATE TABLE map (
  id_map INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,

  is_final INTEGER DEFAULT 0,
  description TEXT
);

--------------------------------------------------
-- TILE
--------------------------------------------------
CREATE TABLE tile (
  id_tile INTEGER PRIMARY KEY AUTOINCREMENT,
  id_map INTEGER NOT NULL,

  x INTEGER NOT NULL,
  y INTEGER NOT NULL,

  is_walkable INTEGER DEFAULT 1,
  is_blocked INTEGER DEFAULT 0,         -- décor bloquant
  is_constructible INTEGER DEFAULT 0,   -- uniquement map finale

  score INTEGER DEFAULT 0,              -- état visible de la tile

  FOREIGN KEY (id_map) REFERENCES map(id_map)
);

--------------------------------------------------
-- RUINS / FACTORIES / OBSTACLES
--------------------------------------------------
CREATE TABLE ruin (
  id_ruin INTEGER PRIMARY KEY AUTOINCREMENT,
  id_map INTEGER NOT NULL,
  id_tile INTEGER NOT NULL,

  type TEXT NOT NULL,                   -- factory, debris, bridge, wall
  clicks_required INTEGER NOT NULL,
  clicks_current INTEGER DEFAULT 0,

  is_destroyed INTEGER DEFAULT 0,

  FOREIGN KEY (id_map) REFERENCES map(id_map),
  FOREIGN KEY (id_tile) REFERENCES tile(id_tile)
);

--------------------------------------------------
-- CLICK ACTIONS (COLLABORATIF)
--------------------------------------------------
CREATE TABLE click_action (
  id_click INTEGER PRIMARY KEY AUTOINCREMENT,

  id_player INTEGER NOT NULL,
  id_ruin INTEGER NOT NULL,
  click_value INTEGER DEFAULT 1,        -- dépend du tool équipé

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_player) REFERENCES player(id_player),
  FOREIGN KEY (id_ruin) REFERENCES ruin(id_ruin)
);

--------------------------------------------------
-- INVENTORY (RESSOURCES)
--------------------------------------------------
CREATE TABLE inventory (
  id_inventory INTEGER PRIMARY KEY AUTOINCREMENT,
  id_player INTEGER NOT NULL,

  wood INTEGER DEFAULT 0,
  stone INTEGER DEFAULT 0,
  metal INTEGER DEFAULT 0,
  glass INTEGER DEFAULT 0,

  bricks INTEGER DEFAULT 0,
  rocks INTEGER DEFAULT 0,

  FOREIGN KEY (id_player) REFERENCES player(id_player)
);

--------------------------------------------------
-- TOOL CATALOG
--------------------------------------------------
CREATE TABLE tool (
  id_tool INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                   -- shovel, hammer, watering_can
  base_bonus INTEGER DEFAULT 1           -- bonus par clic
);

--------------------------------------------------
-- INVENTORY TOOLS (POSSESSION)
--------------------------------------------------
CREATE TABLE inventory_tool (
  id_inventory_tool INTEGER PRIMARY KEY AUTOINCREMENT,
  id_inventory INTEGER NOT NULL,
  id_tool INTEGER NOT NULL,

  level INTEGER DEFAULT 1,               -- bois, métal, etc.
  is_equipped INTEGER DEFAULT 0,

  FOREIGN KEY (id_inventory) REFERENCES inventory(id_inventory),
  FOREIGN KEY (id_tool) REFERENCES tool(id_tool)
);

--------------------------------------------------
-- BUILDINGS (MAP FINALE)
--------------------------------------------------
CREATE TABLE building (
  id_building INTEGER PRIMARY KEY AUTOINCREMENT,

  id_map INTEGER NOT NULL,
  id_tile INTEGER NOT NULL,
  id_player INTEGER NOT NULL,

  type TEXT NOT NULL,                    -- house, farm
  sprite_path TEXT NOT NULL,

  build_score INTEGER DEFAULT 0,         -- progression de construction

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_map) REFERENCES map(id_map),
  FOREIGN KEY (id_tile) REFERENCES tile(id_tile),
  FOREIGN KEY (id_player) REFERENCES player(id_player)
);

--------------------------------------------------
-- CHAT (GLOBAL)
--------------------------------------------------
CREATE TABLE chat_message (
  id_message INTEGER PRIMARY KEY AUTOINCREMENT,
  id_player INTEGER NOT NULL,

  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_player) REFERENCES player(id_player)
);

--------------------------------------------------
-- WORLD STATE (PROGRESSION GLOBALE)
--------------------------------------------------
CREATE TABLE world_state (
  id_world INTEGER PRIMARY KEY AUTOINCREMENT,

  world_score INTEGER DEFAULT 0,
  day INTEGER DEFAULT 1,

  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

