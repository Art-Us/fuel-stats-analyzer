import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.resolve(process.cwd(), 'database.sqlite');

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await initDatabase(dbInstance);

  return dbInstance;
}

async function initDatabase(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS refuelings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      cost REAL NOT NULL,
      liters REAL NOT NULL,
      price_per_liter REAL NOT NULL,
      mileage REAL NOT NULL,
      receipt_image_url TEXT,
      dashboard_image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
