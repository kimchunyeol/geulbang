// SQLite 저장소 — Mac 글방(db.js)과 같은 테이블 구조
import * as SQLite from 'expo-sqlite';

import { DEFAULT_SETTINGS, type Data, type Folder, type Post, type Story } from './types';

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, createdAt INTEGER NOT NULL, rank INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY, folderId TEXT, title TEXT NOT NULL, subtitle TEXT NOT NULL,
  createdAt INTEGER NOT NULL, trashedAt INTEGER, orderBy TEXT NOT NULL DEFAULT 'writedAt',
  orderDir TEXT NOT NULL DEFAULT 'desc', rank INTEGER NOT NULL, dateVisible INTEGER NOT NULL DEFAULT 1,
  updatedAt INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY, storyId TEXT NOT NULL, title TEXT NOT NULL, text TEXT NOT NULL,
  writedAt INTEGER NOT NULL, editedAt INTEGER NOT NULL, trashedAt INTEGER, align TEXT NOT NULL DEFAULT 'left',
  photos TEXT NOT NULL DEFAULT '[]', updatedAt INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS app (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tombstones (kind TEXT NOT NULL, id TEXT NOT NULL, deletedAt INTEGER NOT NULL, PRIMARY KEY (kind, id));
CREATE INDEX IF NOT EXISTS idx_posts_story ON posts (trashedAt, storyId, writedAt);
`;

export type Kind = 'folders' | 'stories' | 'posts';

const db = SQLite.openDatabaseSync('geulbang.db');
db.execSync(SCHEMA);

type Row = Record<string, string | number | null>;

export function loadAll(): Data | null {
  const folders = db.getAllSync<Folder>('SELECT * FROM folders');
  const stories = db.getAllSync<Row>('SELECT * FROM stories').map(
    r => ({ ...r, dateVisible: !!r.dateVisible }) as unknown as Story,
  );
  const posts = db.getAllSync<Row>('SELECT * FROM posts').map(r => {
    let photos: string[] = [];
    try { photos = JSON.parse(String(r.photos ?? '[]')); } catch {}
    return { ...r, photos } as unknown as Post;
  });
  const settingsRow = db.getFirstSync<{ value: string }>("SELECT value FROM app WHERE key = 'settings'");
  if (!stories.length && !settingsRow) return null;
  return {
    folders,
    stories,
    posts,
    settings: { ...DEFAULT_SETTINGS, ...(settingsRow ? JSON.parse(settingsRow.value) : {}) },
  };
}

function upsertSync(kind: Kind, rec: Folder | Story | Post, now: number) {
  if (kind === 'folders') {
    const f = rec as Folder;
    db.runSync('INSERT OR REPLACE INTO folders (id, title, createdAt, rank, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [f.id, f.title, f.createdAt, f.rank, now]);
  } else if (kind === 'stories') {
    const s = rec as Story;
    db.runSync(`INSERT OR REPLACE INTO stories (id, folderId, title, subtitle, createdAt, trashedAt, orderBy, orderDir, rank, dateVisible, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.folderId, s.title, s.subtitle, s.createdAt, s.trashedAt, s.orderBy, s.orderDir, s.rank, s.dateVisible ? 1 : 0, now]);
  } else {
    const p = rec as Post;
    db.runSync(`INSERT OR REPLACE INTO posts (id, storyId, title, text, writedAt, editedAt, trashedAt, align, photos, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.storyId, p.title, p.text, p.writedAt, p.editedAt, p.trashedAt, p.align, JSON.stringify(p.photos), now]);
  }
  db.runSync('DELETE FROM tombstones WHERE kind = ? AND id = ?', [kind, rec.id]);
}

function removeSync(kind: Kind, id: string, now: number) {
  db.runSync(`DELETE FROM ${kind} WHERE id = ?`, [id]);
  db.runSync('INSERT OR REPLACE INTO tombstones (kind, id, deletedAt) VALUES (?, ?, ?)', [kind, id, now]);
}

export function upsert(kind: Kind, rec: Folder | Story | Post) {
  upsertSync(kind, rec, Date.now());
}

export function remove(kind: Kind, ids: string[]) {
  const now = Date.now();
  db.withTransactionSync(() => ids.forEach(id => removeSync(kind, id, now)));
}

export function saveSettings(settings: Data['settings']) {
  db.runSync("INSERT OR REPLACE INTO app (key, value) VALUES ('settings', ?)", [JSON.stringify(settings)]);
}

// 백업 복원: 전체를 한 번에 바꾼다
export function replaceAll(data: Data) {
  const now = Date.now();
  db.withTransactionSync(() => {
    db.execSync('DELETE FROM folders; DELETE FROM stories; DELETE FROM posts; DELETE FROM tombstones;');
    data.folders.forEach(f => upsertSync('folders', f, f.updatedAt || now));
    data.stories.forEach(s => upsertSync('stories', s, s.updatedAt || now));
    data.posts.forEach(p => upsertSync('posts', p, p.updatedAt || now));
    saveSettings(data.settings);
  });
}
