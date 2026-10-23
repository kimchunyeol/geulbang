// 예전 웹 버전 글방이 설치한 서비스 워커를 끄는 파일이에요.
// 예전 앱을 썼던 폰은 이 파일을 받아서, 저장해 둔 옛 화면을 지우고 스스로 꺼져요.
// 새 글방은 서비스 워커를 쓰지 않아요. (글은 서비스 워커와 상관없이 브라우저 저장소에 그대로 있어요)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
