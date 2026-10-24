// 오프라인에서도 홈 화면의 글방이 열리도록 앱 파일을 보관한다.
// 글과 사진은 IndexedDB에 있으므로 여기서 다루지 않는다.
const CACHE = 'geulbang-202610242315';
const APP_FILES = ['./', 'index.html', 'web-bridge.js', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 앱 파일은 새 버전을 먼저 받아 보고, 인터넷이 없으면 보관본을 쓴다. 글꼴은 보관본을 먼저 쓴다
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  if (isFont) {
    e.respondWith(caches.match(request).then(hit => hit || fetch(request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(request, copy));
      return res;
    })));
    return;
  }
  e.respondWith(fetch(request).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(request, copy));
    }
    return res;
  }).catch(() => caches.match(request).then(hit => hit || caches.match('index.html'))));
});
