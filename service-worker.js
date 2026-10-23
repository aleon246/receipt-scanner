// ===== キャッシュ名（index.html などを更新したら、毎回ここを上げる） =====
const CACHE = 'receipt-scanner-v14-2';

// ===== 端末に保存するファイル一覧 =====
// index.html の <link> と「?v=14」まで完全に同じ文字にすること
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest?v=14',
  './libs/opencv.js',
  './libs/pdf-lib.min.js',
  './icons/icon-192.png?v=14',
  './icons/icon-512.png?v=14',
  './icons/icon-maskable-512.png?v=14',
  './favicon.ico?v=14',
  './icons/favicon-16.png?v=14',
  './icons/favicon-32.png?v=14'
];

// ===== インストール：1ファイルずつ保存（どれかが見つからなくても止まらない） =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(
        ASSETS.map(url =>
          cache.add(new Request(url, { cache: 'reload' }))
            .catch(err => console.warn('キャッシュ失敗:', url, err))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

// ===== 有効化：古いキャッシュを削除 =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ===== 読み込み =====
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 画面（index.html）：ネット優先。オンラインなら常に最新、オフラインなら保存版
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // それ以外（OpenCV・アイコンなど）：保存版優先。なければネットから取って保存
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
