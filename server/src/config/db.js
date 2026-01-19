import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Resolve paths relative to this file (ESM-compatible __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../database/game.sqlite');
const migrationsPath = path.resolve(__dirname, '../database/migrations/init.sql');
const baseDataPath = path.resolve(__dirname, '../database/seeds/base-data.sql');

export async function openDB() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Ensure foreign keys are enforced
  await db.exec('PRAGMA foreign_keys = ON;');

  // Run initial migration once (if player table does not exist yet)
  const row = await db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='player';"
  );

  if (!row) {
    try {
      const sql = await fs.readFile(migrationsPath, 'utf8');
      await db.exec(sql);
    } catch (err) {
      // If concurrent migration attempts occur, ignore "table already exists" errors
      if (!String(err?.message || '').includes('already exists')) {
        throw err;
      }
    }
  }

  // Seed base data (maps, tiles...) if map table is empty
  const mapCountRow = await db.get('SELECT COUNT(*) as count FROM map;');
  if (mapCountRow?.count === 0) {
    try {
      const baseSql = await fs.readFile(baseDataPath, 'utf8');
      if (baseSql && baseSql.trim().length > 0) {
        await db.exec(baseSql);
      }
    } catch (err) {
      console.error('Failed to load base data seed:', err);
    }
  }

  // S'assure que la colonne "role" existe dans player (pour distinguer admin / user)
  const columns = await db.all("PRAGMA table_info('player');");
  const hasRoleColumn = columns.some((c) => c.name === 'role');
  if (!hasRoleColumn) {
    await db.exec("ALTER TABLE player ADD COLUMN role TEXT DEFAULT 'user';");
  }

  // S'assure que la colonne "color" existe dans player
  const hasColorColumn = columns.some((c) => c.name === 'color');
  if (!hasColorColumn) {
    await db.exec("ALTER TABLE player ADD COLUMN color TEXT;");
    
    // Si l'ancienne colonne "color_primary" existe, on migre les données
    const hasOldColorColumn = columns.some((c) => c.name === 'color_primary');
    if (hasOldColorColumn) {
      await db.exec("UPDATE player SET color = color_primary;");
    }
  }

  // S'assure que les colonnes bricks / rocks existent dans inventory
  const inventoryColumns = await db.all("PRAGMA table_info('inventory');");
  const hasBricksColumn = inventoryColumns.some((c) => c.name === 'bricks');
  const hasRocksColumn = inventoryColumns.some((c) => c.name === 'rocks');
  if (!hasBricksColumn) {
    await db.exec("ALTER TABLE inventory ADD COLUMN bricks INTEGER DEFAULT 0;");
  }
  if (!hasRocksColumn) {
    await db.exec("ALTER TABLE inventory ADD COLUMN rocks INTEGER DEFAULT 0;");
  }

  // Ensure factory_progress table exists for shared factory clicks per map
  await db.exec(`
    CREATE TABLE IF NOT EXISTS factory_progress (
      id_map INTEGER PRIMARY KEY,
      clicks_current INTEGER DEFAULT 0,
      clicks_required INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_map) REFERENCES map(id_map)
    );
  `);
  // Seed map 1 progress if missing (default required: 500)
  const prog = await db.get('SELECT id_map FROM factory_progress WHERE id_map = 1;');
  if (!prog) {
    await db.run('INSERT INTO factory_progress (id_map, clicks_current, clicks_required) VALUES (1, 0, 500);');
  }
  // Seed map 2 progress if missing (default required: 1000)
  const prog2 = await db.get('SELECT id_map FROM factory_progress WHERE id_map = 2;');
  if (!prog2) {
    await db.run('INSERT INTO factory_progress (id_map, clicks_current, clicks_required) VALUES (2, 0, 1000);');
  }

  return db;
}
