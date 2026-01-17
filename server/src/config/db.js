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
    const sql = await fs.readFile(migrationsPath, 'utf8');
    await db.exec(sql);
  }

  // S'assure que la colonne "role" existe dans player (pour distinguer admin / user)
  const columns = await db.all("PRAGMA table_info('player');");
  const hasRoleColumn = columns.some((c) => c.name === 'role');
  if (!hasRoleColumn) {
    await db.exec("ALTER TABLE player ADD COLUMN role TEXT DEFAULT 'user';");
  }

  return db;
}
