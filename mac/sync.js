// iCloud Drive 폴더 동기화
//
// iCloud Drive/글방/
//   devices/<기기ID>.json   각 기기가 자기 파일만 쓴다 → iCloud 쓰기 충돌이 생기지 않음
//   photos/<파일명>          사진 원본 (파일명은 고유 ID라 덮어쓰기 없음)
// 동기화 때마다 다른 기기 파일을 레코드 단위로 병합하고, 내 스냅샷을 다시 쓴다.
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const db = require('./db');

const ICLOUD_DRIVE = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs');

let photosDir;
let state = { enabled: false, available: false, running: false, lastSyncAt: null, error: null, pending: 0 };
let onChange = () => {};
let onStatus = () => {};
let timer = null;

const root = () => process.env.GEULBANG_SYNC_DIR || path.join(ICLOUD_DRIVE, '글방');

// 예전 이름의 iCloud 폴더가 있으면 새 이름으로 바꾼다
function migrateLegacyFolder() {
  if (process.env.GEULBANG_SYNC_DIR || fs.existsSync(root())) return;
  for (const name of ['Crêpe', 'Crêpe'.normalize('NFD')]) {
    const old = path.join(ICLOUD_DRIVE, name);
    if (fs.existsSync(old)) { try { fs.renameSync(old, root()); } catch {} return; }
  }
}

function init(opts) {
  photosDir = opts.photosDir;
  onChange = opts.onChange;
  onStatus = opts.onStatus;
  if (!db.getApp('deviceId')) db.setApp('deviceId', crypto.randomUUID());
  state.enabled = !!db.getApp('syncEnabled');
  state.lastSyncAt = db.getApp('lastSyncAt') ?? null;
  state.available = !!process.env.GEULBANG_SYNC_DIR || fs.existsSync(ICLOUD_DRIVE);
  if (state.available) migrateLegacyFolder();
  setInterval(() => run(), 60000);
}

function status() {
  return { ...state, folder: root() };
}
function setStatus(patch) {
  Object.assign(state, patch);
  onStatus(status());
}

function setEnabled(on) {
  db.setApp('syncEnabled', !!on);
  setStatus({ enabled: !!on, error: null });
  if (on) run();
  return status();
}

// 저장 직후 너무 자주 돌지 않도록 몇 초 모았다가 실행
function schedule(delay = 5000) {
  clearTimeout(timer);
  timer = setTimeout(run, delay);
}

// 아직 내려받지 않은 iCloud 파일은 ".이름.icloud" 자리표시자로 남아 있어 내려받기를 요청한다
function requestDownload(file) {
  execFile('brctl', ['download', file], () => {});
}
function listDir(dir) {
  try { return fs.readdirSync(dir); } catch { return []; }
}

async function writeAtomic(file, text) {
  const tmp = file + '.tmp';
  await fsp.writeFile(tmp, text, 'utf8');
  await fsp.rename(tmp, file);
}

async function run() {
  if (!state.enabled || !state.available || state.running) return;
  setStatus({ running: true });
  try {
    const dir = root();
    const devicesDir = path.join(dir, 'devices');
    const cloudPhotos = path.join(dir, 'photos');
    await fsp.mkdir(devicesDir, { recursive: true });
    await fsp.mkdir(cloudPhotos, { recursive: true });
    const me = db.getApp('deviceId');
    let pending = 0;
    let changed = false;

    // 1) 다른 기기 스냅샷 병합
    for (const name of listDir(devicesDir)) {
      if (name.endsWith('.icloud') && name.startsWith('.')) {
        requestDownload(path.join(devicesDir, name.slice(1, -'.icloud'.length)));
        pending++;
        continue;
      }
      if (!name.endsWith('.json') || name === me + '.json') continue;
      try {
        const remote = JSON.parse(await fsp.readFile(path.join(devicesDir, name), 'utf8'));
        if (db.applyRemote(remote)) changed = true;
      } catch {
        pending++; // 다른 기기가 쓰는 중이거나 손상된 파일 — 다음 차례에 다시 시도
      }
    }

    // 2) 사진: 올라가지 않은 건 올리고, 필요한데 없는 건 받아 온다
    const cloudNames = new Set(listDir(cloudPhotos));
    for (const name of listDir(photosDir)) {
      if (!cloudNames.has(name) && !cloudNames.has('.' + name + '.icloud')) {
        await fsp.copyFile(path.join(photosDir, name), path.join(cloudPhotos, name));
      }
    }
    const localNames = new Set(listDir(photosDir));
    let photosArrived = false;
    for (const name of db.referencedPhotos()) {
      if (localNames.has(name)) continue;
      const src = path.join(cloudPhotos, name);
      if (cloudNames.has(name)) { await fsp.copyFile(src, path.join(photosDir, name)); photosArrived = true; }
      else if (cloudNames.has('.' + name + '.icloud')) { requestDownload(src); pending++; }
    }

    // 3) 내 스냅샷 기록
    await writeAtomic(path.join(devicesDir, me + '.json'), JSON.stringify({ deviceId: me, host: os.hostname(), writtenAt: Date.now(), ...db.snapshot() }));

    const now = Date.now();
    db.setApp('lastSyncAt', now);
    setStatus({ running: false, lastSyncAt: now, error: null, pending });
    if (changed || photosArrived) onChange();
  } catch (e) {
    setStatus({ running: false, error: e.message });
  }
}

// 어떤 글에서도 쓰지 않는 로컬 사진 정리 (방금 추가해 아직 저장 전인 파일은 하루 동안 남김)
async function cleanupPhotos() {
  const used = db.referencedPhotos();
  const dayAgo = Date.now() - 86400000;
  for (const name of listDir(photosDir)) {
    if (used.has(name)) continue;
    const file = path.join(photosDir, name);
    try { if ((await fsp.stat(file)).mtimeMs < dayAgo) await fsp.unlink(file); } catch {}
  }
}

module.exports = { init, status, setEnabled, schedule, run, cleanupPhotos };
