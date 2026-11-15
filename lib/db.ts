import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');

const SCHEMA = fs.readFileSync(path.join(process.cwd(), 'lib', 'schema.sql'), 'utf8');

declare global {
  // eslint-disable-next-line no-var
  var __hgDb: Database.Database | undefined;
}

export function db(): Database.Database {
  if (!global.__hgDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const d = new Database(path.join(DATA_DIR, 'homegrown.db'));
    d.pragma('journal_mode = WAL');
    d.pragma('foreign_keys = ON');
    d.exec(SCHEMA);
    global.__hgDb = d;
  }
  return global.__hgDb;
}

export function newId(prefix: string): string {
  return prefix + '_' + crypto.randomBytes(9).toString('base64url');
}

export function nowIso(): string {
  return new Date().toISOString();
}
