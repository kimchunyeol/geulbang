// SQLite 저장소 (Electron 내장 node:sqlite 사용 — 네이티브 모듈 빌드 불필요)
//
// 화면은 전체 상태를 보내오지만, 여기서는 "화면이 마지막으로 받은 상태(base)"와 비교해
// 실제로 바뀐 레코드만 반영한다. 그래야 그 사이 동기화로 들어온 다른 기기의 글을 덮어쓰지 않는다.
// 바뀐 레코드에는 updatedAt을, 사라진 레코드에는 tombstone을 남겨 기기 간 병합에 쓴다.
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, createdAt INTEGER NOT NULL, rank INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY, folderId TEXT, title TEXT NOT NULL, subtitle TEXT NOT NULL,
  createdAt INTEGER NOT NULL, trashedAt INTEGER, orderBy TEXT NOT NULL DEFAULT 'writedAt',
  orderDir TEXT NOT NULL DEFAULT 'desc', rank INTEGER NOT NULL, dateVisible INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY, storyId TEXT NOT NULL, title TEXT NOT NULL, text TEXT NOT NULL,
  writedAt INTEGER NOT NULL, editedAt INTEGER NOT NULL, trashedAt INTEGER, align TEXT NOT NULL DEFAULT 'left');
CREATE TABLE IF NOT EXISTS app (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tombstones (kind TEXT NOT NULL, id TEXT NOT NULL, deletedAt INTEGER NOT NULL, PRIMARY KEY (kind, id));
CREATE INDEX IF NOT EXISTS idx_posts_story ON posts (trashedAt, storyId, writedAt);
`;

// 레코드 종류별 필드 (updatedAt 제외) — 비교와 저장에 같은 순서를 쓴다
const FIELDS = {
  folders: ['id', 'title', 'createdAt', 'rank'],
  stories: ['id', 'folderId', 'title', 'subtitle', 'createdAt', 'trashedAt', 'orderBy', 'orderDir', 'rank', 'dateVisible'],
  posts: ['id', 'storyId', 'title', 'text', 'writedAt', 'editedAt', 'trashedAt', 'align', 'photos'],
};
const KINDS = Object.keys(FIELDS);
const TOMBSTONE_TTL = 90 * 86400000;

let db;
let base = null; // { kind: Map(id -> 정규화 문자열) }

function open(file) {
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  migrate();
}

// 예전 버전 DB에 updatedAt / photos 열 추가
function migrate() {
  const has = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
  for (const kind of KINDS) {
    if (!has(kind, 'updatedAt')) db.exec(`ALTER TABLE ${kind} ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`);
  }
  if (!has('posts', 'photos')) db.exec(`ALTER TABLE posts ADD COLUMN photos TEXT NOT NULL DEFAULT '[]'`);
}

// DB 행 <-> 화면 객체
function fromRow(kind, row) {
  const r = { ...row };
  if (kind === 'stories') r.dateVisible = !!r.dateVisible;
  if (kind === 'posts') { try { r.photos = JSON.parse(r.photos || '[]'); } catch { r.photos = []; } }
  return r;
}
function normalize(kind, rec) {
  const defaults = { folderId: null, trashedAt: null, subtitle: '', orderBy: 'writedAt', orderDir: 'desc', rank: 0, align: 'left', photos: [] };
  return FIELDS[kind].map(f => {
    let v = rec[f] ?? defaults[f] ?? null;
    if (f === 'dateVisible') v = v ? 1 : 0;
    if (f === 'photos') v = JSON.stringify(Array.isArray(v) ? v : []);
    if (f === 'editedAt' && v == null) v = rec.writedAt;
    if (f === 'createdAt' && v == null) v = Date.now();
    return v;
  });
}
const key = (kind, rec) => JSON.stringify(normalize(kind, rec));

function readAll(kind) {
  return db.prepare(`SELECT * FROM ${kind}`).all().map(r => fromRow(kind, r));
}
function upsert(kind, rec, updatedAt) {
  const cols = [...FIELDS[kind], 'updatedAt'];
  db.prepare(`INSERT OR REPLACE INTO ${kind} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
    .run(...normalize(kind, rec), updatedAt);
  db.prepare('DELETE FROM tombstones WHERE kind = ? AND id = ?').run(kind, rec.id);
}
function remove(kind, id, deletedAt) {
  db.prepare(`DELETE FROM ${kind} WHERE id = ?`).run(id);
  db.prepare('INSERT OR REPLACE INTO tombstones (kind, id, deletedAt) VALUES (?, ?, ?)').run(kind, id, deletedAt);
}
function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

function getApp(k) {
  const row = db.prepare('SELECT value FROM app WHERE key = ?').get(k);
  return row ? JSON.parse(row.value) : undefined;
}
function setApp(k, v) {
  db.prepare('INSERT OR REPLACE INTO app (key, value) VALUES (?, ?)').run(k, JSON.stringify(v));
}

// 데이터가 비어 있으면 null을 돌려주어 화면 쪽에서 기본 예시 데이터를 만들게 한다
function load() {
  const data = { folders: readAll('folders'), stories: readAll('stories'), posts: readAll('posts'), settings: getApp('settings') };
  base = {};
  for (const kind of KINDS) base[kind] = new Map(data[kind].map(r => [r.id, key(kind, r)]));
  if (!data.stories.length && !data.settings) return null;
  return data;
}

// 화면이 보낸 상태에서 base 대비 바뀐 것만 반영
function save(data) {
  const now = Date.now();
  tx(() => {
    for (const kind of KINDS) {
      const prev = base?.[kind] ?? new Map();
      const next = new Map();
      for (const rec of data[kind] ?? []) {
        const k = key(kind, rec);
        next.set(rec.id, k);
        if (prev.get(rec.id) !== k) upsert(kind, rec, now);
      }
      for (const id of prev.keys()) if (!next.has(id)) remove(kind, id, now);
      if (base) base[kind] = next;
    }
    setApp('settings', data.settings ?? {});
  });
}

// ---------- 동기화용 ----------
function snapshot() {
  const out = { tombstones: db.prepare('SELECT * FROM tombstones').all() };
  for (const kind of KINDS) out[kind] = readAll(kind);
  return out;
}

// 다른 기기의 스냅샷을 레코드 단위로 병합 (수정 시각이 늦은 쪽이 이김)
function applyRemote(remote) {
  let changed = false;
  tx(() => {
    const localTomb = new Map(db.prepare('SELECT * FROM tombstones').all().map(t => [t.kind + ':' + t.id, t.deletedAt]));
    for (const kind of KINDS) {
      const local = new Map(readAll(kind).map(r => [r.id, r]));
      for (const rec of remote[kind] ?? []) {
        const mine = local.get(rec.id);
        const tomb = localTomb.get(kind + ':' + rec.id);
        const ts = rec.updatedAt || 0;
        if (mine ? ts > (mine.updatedAt || 0) : !(tomb >= ts)) {
          if (mine && key(kind, mine) === key(kind, rec)) continue;
          upsert(kind, rec, ts);
          changed = true;
        }
      }
    }
    for (const t of remote.tombstones ?? []) {
      if (!KINDS.includes(t.kind)) continue;
      const row = db.prepare(`SELECT updatedAt FROM ${t.kind} WHERE id = ?`).get(t.id);
      if (row && (row.updatedAt || 0) <= t.deletedAt) { remove(t.kind, t.id, t.deletedAt); changed = true; }
      else if (!row) db.prepare('INSERT OR IGNORE INTO tombstones (kind, id, deletedAt) VALUES (?, ?, ?)').run(t.kind, t.id, t.deletedAt);
    }
    db.prepare('DELETE FROM tombstones WHERE deletedAt < ?').run(Date.now() - TOMBSTONE_TTL);
  });
  return changed;
}

function referencedPhotos() {
  const set = new Set();
  for (const p of readAll('posts')) for (const name of p.photos) set.add(name);
  return set;
}

function close() {
  if (db) db.close();
}

module.exports = { open, load, save, snapshot, applyRemote, referencedPhotos, getApp, setApp, close };
