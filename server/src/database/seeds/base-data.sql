--------------------------------------------------
-- BASE DATA: MAPS & TILES
--------------------------------------------------

-- Map 1 definition (matches client src/assets/maps/map1.json)
INSERT OR IGNORE INTO map (id_map, name, width, height, is_final, description)
VALUES (1, 'Map 1', 32, 18, 0, 'First ruined area, collaborative cleanup.');

-- Unwalkable tiles for Map 1
-- For each tile, we set is_walkable = 0 and is_blocked = 1
INSERT INTO tile (id_map, x, y, is_walkable, is_blocked)
VALUES
	(1, 8, 0, 0, 1),
	(1, 9, 0, 0, 1),
	(1, 10, 0, 0, 1),
	(1, 23, 0, 0, 1),
	(1, 24, 0, 0, 1),
	(1, 25, 0, 0, 1),

	(1, 5, 1, 0, 1),
	(1, 9, 1, 0, 1),
	(1, 10, 1, 0, 1),
	(1, 18, 1, 0, 1),
	(1, 20, 1, 0, 1),
	(1, 21, 1, 0, 1),
	(1, 22, 1, 0, 1),
	(1, 23, 1, 0, 1),
	(1, 24, 1, 0, 1),
	(1, 25, 1, 0, 1),
	(1, 26, 1, 0, 1),
	(1, 27, 1, 0, 1),
	(1, 28, 1, 0, 1),
	(1, 29, 1, 0, 1),
	(1, 30, 1, 0, 1),

	(1, 2, 2, 0, 1),
	(1, 18, 2, 0, 1),
	(1, 19, 2, 0, 1),
	(1, 20, 2, 0, 1),
	(1, 21, 2, 0, 1),
	(1, 22, 2, 0, 1),
	(1, 23, 2, 0, 1),
	(1, 24, 2, 0, 1),
	(1, 25, 2, 0, 1),
	(1, 26, 2, 0, 1),
	(1, 27, 2, 0, 1),
	(1, 28, 2, 0, 1),
	(1, 29, 2, 0, 1),
	(1, 30, 2, 0, 1),

	(1, 0, 3, 0, 1),
	(1, 5, 3, 0, 1),
	(1, 18, 3, 0, 1),
	(1, 20, 3, 0, 1),
	(1, 21, 3, 0, 1),
	(1, 22, 3, 0, 1),
	(1, 23, 3, 0, 1),
	(1, 24, 3, 0, 1),
	(1, 25, 3, 0, 1),
	(1, 26, 3, 0, 1),
	(1, 27, 3, 0, 1),
	(1, 28, 3, 0, 1),
	(1, 29, 3, 0, 1),
	(1, 30, 3, 0, 1),

	(1, 5, 4, 0, 1),
	(1, 6, 4, 0, 1),
	(1, 19, 4, 0, 1),
	(1, 20, 4, 0, 1),
	(1, 21, 4, 0, 1),
	(1, 22, 4, 0, 1),
	(1, 23, 4, 0, 1),
	(1, 24, 4, 0, 1),
	(1, 25, 4, 0, 1),
	(1, 26, 4, 0, 1),
	(1, 27, 4, 0, 1),
	(1, 29, 4, 0, 1),
	(1, 30, 4, 0, 1),

	(1, 5, 5, 0, 1),
	(1, 7, 5, 0, 1),
	(1, 8, 5, 0, 1),
	(1, 20, 5, 0, 1),
	(1, 21, 5, 0, 1),
	(1, 22, 5, 0, 1),
	(1, 23, 5, 0, 1),
	(1, 24, 5, 0, 1),
	(1, 25, 5, 0, 1),
	(1, 26, 5, 0, 1),
	(1, 27, 5, 0, 1),
	(1, 29, 5, 0, 1),
	(1, 30, 5, 0, 1),

	(1, 5, 6, 0, 1),
	(1, 8, 6, 0, 1),
	(1, 15, 6, 0, 1),

	(1, 15, 7, 0, 1),
	(1, 30, 7, 0, 1),

	(1, 17, 8, 0, 1),

	(1, 9, 10, 0, 1),
	(1, 17, 10, 0, 1),
	(1, 30, 10, 0, 1),
	(1, 31, 10, 0, 1),

	(1, 9, 11, 0, 1),
	(1, 10, 11, 0, 1),
	(1, 17, 11, 0, 1),
	(1, 30, 11, 0, 1),
	(1, 31, 11, 0, 1),

	(1, 4, 12, 0, 1),
	(1, 5, 12, 0, 1),
	(1, 9, 12, 0, 1),
	(1, 10, 12, 0, 1),
	(1, 11, 12, 0, 1),
	(1, 13, 12, 0, 1),
	(1, 17, 12, 0, 1),
	(1, 30, 12, 0, 1),

	(1, 1, 13, 0, 1),
	(1, 2, 13, 0, 1),
	(1, 4, 13, 0, 1),
	(1, 5, 13, 0, 1),
	(1, 9, 13, 0, 1),
	(1, 10, 13, 0, 1),
	(1, 11, 13, 0, 1),
	(1, 12, 13, 0, 1),
	(1, 13, 13, 0, 1),
	(1, 16, 13, 0, 1),
	(1, 17, 13, 0, 1),
	(1, 30, 13, 0, 1),

	(1, 0, 14, 0, 1),
	(1, 1, 14, 0, 1),

	(1, 3, 15, 0, 1),

	(1, 5, 16, 0, 1),
	(1, 16, 16, 0, 1),
	(1, 17, 16, 0, 1),
	(1, 18, 16, 0, 1),
	(1, 19, 16, 0, 1),
	(1, 20, 16, 0, 1),

	(1, 1, 17, 0, 1),
	(1, 5, 17, 0, 1);

--------------------------------------------------
-- RUINS / FACTORIES FOR MAP 1
--------------------------------------------------

-- Each of these tiles represents part of a factory
-- that can be destroyed by players. We create one
-- ruin per tile, of type 'factory'.

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 20 AND y = 4;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 20 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 21 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 22 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 23 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 24 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 25 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 26 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 27 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 29 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'factory', 10
FROM tile
WHERE id_map = 1 AND x = 30 AND y = 5;

--------------------------------------------------
-- RUINS (DEBRIS / ROCKS) FOR MAP 1
--------------------------------------------------

-- These tiles are ruins that can be destroyed
-- to obtain rocks in the inventory.

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 5 AND y = 3;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 5 AND y = 4;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 6 AND y = 4;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 5 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 7 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 8 AND y = 5;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 5 AND y = 6;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 8 AND y = 6;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 9 AND y = 10;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 30 AND y = 10;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 31 AND y = 10;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 9 AND y = 11;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 10 AND y = 11;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 30 AND y = 11;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 9 AND y = 12;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 10 AND y = 12;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 11 AND y = 12;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 30 AND y = 12;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 9 AND y = 13;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 10 AND y = 13;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 11 AND y = 13;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 12 AND y = 13;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 13 AND y = 13;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 16 AND y = 13;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 17 AND y = 13;

INSERT INTO ruin (id_map, id_tile, type, clicks_required)
SELECT 1, id_tile, 'debris', 10 FROM tile WHERE id_map = 1 AND x = 30 AND y = 13;

