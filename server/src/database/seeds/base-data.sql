DELETE FROM player;
DELETE FROM map;
DELETE FROM tile;
DELETE FROM ruin;
DELETE FROM click_action;
DELETE FROM inventory;
DELETE FROM tool;
DELETE FROM inventory_tool;
DELETE FROM building;
DELETE FROM chat_message;
DELETE FROM world_state;

INSERT INTO map (name, width, height, description, is_final)
VALUES
  ('Level 1', 20, 15, 'Première carte du jeu', 0),
  ('Level 2', 20, 15, 'Deuxième carte', 0),
  ('Level 3', 20, 15, 'Troisième carte', 0),
  ('Level 4', 40, 30, 'Quatrième carte, plus grande', 0),
  ('Final Map', 50, 40, 'La carte finale à reconstruire', 1);

INSERT INTO tile (id_map, x, y, is_walkable, is_blocked, is_constructible, score)
SELECT
  m.id_map,
  t.x,
  t.y,
  1,
  0,
  CASE WHEN m.is_final = 1 THEN 1 ELSE 0 END,
  0
FROM map m
CROSS JOIN (
  -- Crée une grille de coordonnées
  WITH RECURSIVE
    xaxis(x) AS (SELECT 0 UNION ALL SELECT x + 1 FROM xaxis WHERE x < 49),
    yaxis(y) AS (SELECT 0 UNION ALL SELECT y + 1 FROM yaxis WHERE y < 39)
  SELECT x, y FROM xaxis, yaxis
) t
WHERE m.width > t.x AND m.height > t.y;

-- Insérer des ruines/usines sur les cartes
INSERT INTO ruin (id_map, id_tile, type, clicks_required)
VALUES
  (1, (SELECT id_tile FROM tile WHERE id_map = 1 AND x = 10 AND y = 8), 'factory', 100),
  (2, (SELECT id_tile FROM tile WHERE id_map = 2 AND x = 15 AND y = 5), 'factory', 200),
  (3, (SELECT id_tile FROM tile WHERE id_map = 3 AND x = 5 AND y = 10), 'factory', 300),
  (4, (SELECT id_tile FROM tile WHERE id_map = 4 AND x = 20 AND y = 15), 'factory', 500);

-- Marquer les tuiles des ruines comme non marchables
UPDATE tile SET is_walkable = 0
WHERE id_tile IN (
  SELECT id_tile FROM ruin
);