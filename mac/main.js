const { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol, net, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const db = require('./db');
const sync = require('./sync');

let win;
let photosDir;

// 파일 이름용 오늘 날짜 (한국 시간 기준, toISOString은 세계 표준시라 아침에 하루 밀림)
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const PHOTO_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
const PHOTO_NAME = /^[a-z0-9-]+\.(jpg|jpeg|png|gif|webp|heic)$/;

// 사진은 photo://local/<파일명> 으로만 화면에 노출
protocol.registerSchemesAsPrivileged([{ scheme: 'photo', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 600,
    minHeight: 400,
    title: '글방',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    backgroundColor: '#fbfaf7',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.on('focus', () => sync.schedule(500));

  // 외부 링크는 기본 브라우저로, 앱 창 안에서는 다른 페이지로 이동하지 않음
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', e => e.preventDefault());
}

function send(channel, ...args) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}
const sendMenu = cmd => send('menu', cmd);

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: '파일',
      submenu: [
        { label: '새 글', accelerator: 'CmdOrCtrl+N', click: () => sendMenu('newPost') },
        { label: '새 이야기', accelerator: 'CmdOrCtrl+Shift+N', click: () => sendMenu('newStory') },
        { type: 'separator' },
        { label: '이야기 내보내기 (Markdown)…', accelerator: 'CmdOrCtrl+E', click: () => sendMenu('export') },
        { label: 'PDF로 저장…', accelerator: 'CmdOrCtrl+P', click: () => sendMenu('pdf') },
        { type: 'separator' },
        { label: '지금 동기화', accelerator: 'CmdOrCtrl+R', click: () => sync.run() },
        { label: '전체 백업…', click: () => sendMenu('backup') },
        { label: '백업에서 복원…', click: () => sendMenu('restore') },
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit' }]),
      ],
    },
    { role: 'editMenu' },
    {
      label: '보기',
      submenu: [
        { label: '검색', accelerator: 'CmdOrCtrl+F', click: () => sendMenu('search') },
        { label: '휴지통', click: () => sendMenu('trash') },
        { label: '설정…', accelerator: 'CmdOrCtrl+,', click: () => sendMenu('settings') },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }]),
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- 저장소 ----------
ipcMain.handle('store:load', () => db.load());
ipcMain.handle('store:save', (_e, data) => { db.save(data); sync.schedule(); });
ipcMain.on('store:saveSync', (e, data) => {
  try { db.save(data); e.returnValue = true; } catch { e.returnValue = false; }
});

// ---------- 사진 ----------
async function importPhotos(paths) {
  const names = [];
  for (const src of paths) {
    const ext = path.extname(src).toLowerCase();
    if (!PHOTO_EXT.includes(ext)) continue;
    const name = crypto.randomUUID() + ext;
    await fs.copyFile(src, path.join(photosDir, name));
    names.push(name);
  }
  return names;
}
ipcMain.handle('photo:pick', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '사진', extensions: PHOTO_EXT.map(e => e.slice(1)) }],
  });
  return canceled ? [] : importPhotos(filePaths);
});
ipcMain.handle('photo:import', (_e, paths) => importPhotos(Array.isArray(paths) ? paths : []));

// ---------- 동기화 ----------
ipcMain.handle('sync:status', () => sync.status());
ipcMain.handle('sync:setEnabled', (_e, on) => sync.setEnabled(on));
ipcMain.handle('sync:now', () => sync.run());
ipcMain.handle('sync:reveal', () => shell.openPath(sync.status().folder));

// ---------- 파일 ----------
ipcMain.handle('file:save', async (_e, name, text) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('documents'), name),
  });
  if (canceled || !filePath) return false;
  await fs.writeFile(filePath, text, 'utf8');
  return true;
});

// 백업 파일: 아이폰 글방과 같은 형식. 사진은 photoData에 base64로 함께 담는다
ipcMain.handle('backup:export', async (_e, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('documents'), `geulbang-backup-${localDate()}.json`),
    filters: [{ name: '글방 백업', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  const photoData = {};
  for (const name of new Set(data.posts.flatMap(p => p.photos || []))) {
    if (!PHOTO_NAME.test(name)) continue;
    try { photoData[name] = (await fs.readFile(path.join(photosDir, name))).toString('base64'); } catch {}
  }
  await fs.writeFile(filePath, JSON.stringify({ format: 'geulbang-backup', version: 2, exportedAt: Date.now(), ...data, photoData }));
  return true;
});

// 고른 백업의 사진은 바로 사진 폴더에 풀어 둔다 (복원을 취소하면 하루 뒤 자동 정리됨)
ipcMain.handle('backup:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: '글방 백업', extensions: ['json'] }],
  });
  if (canceled || !filePaths[0]) return null;
  const parsed = JSON.parse(await fs.readFile(filePaths[0], 'utf8'));
  if (!Array.isArray(parsed.stories) || !Array.isArray(parsed.posts)) throw new Error('글방 백업 파일이 아니에요.');
  let photos = 0;
  for (const [name, base64] of Object.entries(parsed.photoData ?? {})) {
    if (!PHOTO_NAME.test(name) || typeof base64 !== 'string') continue;
    const dest = path.join(photosDir, name);
    if (!(await fs.stat(dest).catch(() => null))) await fs.writeFile(dest, Buffer.from(base64, 'base64'));
    photos++;
  }
  return {
    folders: parsed.folders ?? [],
    stories: parsed.stories,
    posts: parsed.posts.map(p => ({ ...p, photos: Array.isArray(p.photos) ? p.photos : [] })),
    settings: parsed.settings,
    photos,
  };
});

ipcMain.handle('file:pdf', async (_e, name) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('documents'), name),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return false;
  const pdf = await win.webContents.printToPDF({ printBackground: false, pageSize: 'A4' });
  await fs.writeFile(filePath, pdf);
  return true;
});

// 데이터 폴더는 영문 이름으로 고정 (테스트에서는 --user-data-dir 로 바꿀 수 있음)
if (!app.commandLine.hasSwitch('user-data-dir')) {
  app.setPath('userData', path.join(app.getPath('appData'), 'Geulbang'));
}

// 예전 이름(Crêpe)으로 쓰던 글과 사진을 처음 한 번 옮겨 온다. 원본 폴더는 그대로 둔다
async function migrateLegacyData(userData, dbFile) {
  if (await fs.stat(dbFile).catch(() => null)) return;
  const appData = path.dirname(userData);
  const candidates = ['Crêpe', 'Crêpe'.normalize('NFD'), 'Crepe'].map(n => path.join(appData, n));
  for (const dir of candidates) {
    const old = path.join(dir, 'crepe.sqlite');
    if (dir === userData || !(await fs.stat(old).catch(() => null))) continue;
    for (const suffix of ['', '-wal', '-shm']) {
      await fs.copyFile(old + suffix, dbFile + suffix).catch(() => {});
    }
    await fs.cp(path.join(dir, 'photos'), path.join(userData, 'photos'), { recursive: true, force: false }).catch(() => {});
    return;
  }
}

app.whenReady().then(async () => {
  const userData = app.getPath('userData');
  const dbFile = path.join(userData, 'geulbang.sqlite');
  photosDir = path.join(userData, 'photos');
  await fs.mkdir(photosDir, { recursive: true });
  await migrateLegacyData(userData, dbFile);
  db.open(dbFile);

  protocol.handle('photo', req => {
    const name = decodeURIComponent(new URL(req.url).pathname.slice(1));
    if (!PHOTO_NAME.test(name)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(path.join(photosDir, name)).toString());
  });

  sync.init({
    photosDir,
    onChange: () => send('store:changed'),
    onStatus: s => send('sync:status', s),
  });
  sync.cleanupPhotos();

  if (!app.isPackaged && process.platform === 'darwin') {
    app.dock.setIcon(nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png')));
  }

  buildMenu();
  createWindow();
  sync.schedule(1500);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => db.close());
