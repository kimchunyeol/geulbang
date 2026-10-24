// 브라우저(웹앱)용 연결 파일
// Electron에서는 preload.js가 window.geulbang을 먼저 만들어 두므로 여기서는 아무것도 하지 않는다.
// 브라우저에서는 같은 기능을 IndexedDB(글·사진)와 파일 다운로드/선택으로 대신한다.
(() => {
  if (window.geulbang) return;
  document.documentElement.classList.add('web');

  const DB_NAME = 'geulbang';
  const PHOTO_NAME = /^[a-z0-9-]+\.(jpg|jpeg|png|gif|webp|heic)$/;
  const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic' };
  const urls = new Map(); // 사진 파일명 -> blob: 주소

  let dbPromise;
  function openDB() {
    dbPromise ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('kv');
        req.result.createObjectStore('photos');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  async function tx(store, mode, fn) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const result = fn(t.objectStore(store));
      t.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('저장 공간이 부족할 수 있어요.'));
    });
  }
  const getKV = key => tx('kv', 'readonly', s => s.get(key));
  const putKV = (key, value) => tx('kv', 'readwrite', s => s.put(value, key));
  const getPhoto = name => tx('photos', 'readonly', s => s.get(name));
  const putPhoto = (name, blob) => tx('photos', 'readwrite', s => s.put(blob, name));

  async function loadPhotoUrls() {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const req = db.transaction('photos').objectStore('photos').openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return resolve();
        if (!urls.has(cur.key)) urls.set(cur.key, URL.createObjectURL(cur.value));
        cur.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => ((Math.random() * 16) | (c === 'x' ? 0 : 8)).toString(16)));

  // 큰 사진은 긴 변 2048px JPEG로 줄여 저장 공간을 아낀다 (GIF는 그대로)
  async function shrink(file) {
    if (file.type === 'image/gif') return { blob: file, ext: 'gif' };
    try {
      const img = await createImageBitmap(file);
      const scale = Math.min(1, 2048 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
      if (blob) return { blob, ext: 'jpg' };
    } catch {}
    const ext = Object.keys(MIME).find(k => MIME[k] === file.type) || 'jpg';
    return { blob: file, ext };
  }

  async function savePhotos(files) {
    const names = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const { blob, ext } = await shrink(file);
      const name = `${uuid()}.${ext}`;
      await putPhoto(name, blob);
      urls.set(name, URL.createObjectURL(blob));
      names.push(name);
    }
    return names;
  }

  // 파일 선택 창은 버튼을 누른 그 순간에 열어야 iPhone Safari가 막지 않는다
  function chooseFiles(accept, multiple) {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = 'none';
      input.addEventListener('change', () => { resolve([...input.files]); input.remove(); }, { once: true });
      input.addEventListener('cancel', () => { resolve([]); input.remove(); }, { once: true });
      document.body.append(input);
      input.click();
    });
  }

  // 공유 시트가 되면 AirDrop·파일 앱으로, 안 되면 다운로드로
  async function deliver(name, blob) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return true; }
      catch (e) { if (e.name === 'AbortError') return false; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return true;
  }

  const blobToBase64 = blob => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  const base64ToBlob = (b64, type) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  };

  // 파일 이름용 오늘 날짜 (기기 시간 기준)
  const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  let pendingSave = null;
  const noop = () => {};

  window.geulbang = {
    platform: 'web',
    async load() {
      const data = await getKV('data');
      await loadPhotoUrls();
      // 기기에 따라 저장소가 정리될 수 있어 영구 보관을 요청해 둔다
      navigator.storage?.persist?.();
      return data ?? null;
    },
    async save(data) {
      pendingSave = putKV('data', data);
      await pendingSave;
    },
    saveSync(data) { pendingSave = putKV('data', data).catch(noop); return true; },
    onChanged: noop,

    photoUrl: name => urls.get(name) || '',
    pickPhotos: async () => savePhotos(await chooseFiles('image/*', true)),
    importPhotos: files => savePhotos([...files]),

    syncStatus: async () => ({ enabled: false, available: false, running: false, lastSyncAt: null, error: null, pending: 0 }),
    setSyncEnabled: async () => ({ enabled: false, available: false }),
    syncNow: noop,
    revealSyncFolder: noop,
    onSyncStatus: noop,

    saveFile: (name, text) => deliver(name, new Blob([text], { type: 'text/markdown' })),
    exportPDF: () => window.print(),
    onMenu: noop,

    async exportBackup(data) {
      const photoData = {};
      for (const name of new Set(data.posts.flatMap(p => p.photos || []))) {
        const blob = await getPhoto(name);
        if (blob) photoData[name] = await blobToBase64(blob);
      }
      const json = JSON.stringify({ format: 'geulbang-backup', version: 2, exportedAt: Date.now(), ...data, photoData });
      return deliver(`geulbang-backup-${localDate()}.json`, new Blob([json], { type: 'application/json' }));
    },
    async openBackup() {
      const [file] = await chooseFiles('application/json,.json', false);
      if (!file) return null;
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.stories) || !Array.isArray(parsed.posts)) throw new Error('글방 백업 파일이 아니에요.');
      let photos = 0;
      for (const [name, b64] of Object.entries(parsed.photoData ?? {})) {
        if (!PHOTO_NAME.test(name) || typeof b64 !== 'string') continue;
        if (!(await getPhoto(name))) {
          const blob = base64ToBlob(b64, MIME[name.split('.').pop()] || 'image/jpeg');
          await putPhoto(name, blob);
          urls.set(name, URL.createObjectURL(blob));
        }
        photos++;
      }
      return {
        folders: parsed.folders ?? [],
        stories: parsed.stories,
        posts: parsed.posts.map(p => ({ ...p, photos: Array.isArray(p.photos) ? p.photos : [] })),
        settings: parsed.settings,
        photos,
      };
    },
  };

  // 홈 화면 앱으로 오프라인에서도 열리도록
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(noop);
  }
})();
