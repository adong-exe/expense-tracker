const CACHE_NAME = 'accounting-app-v1.4'; // 🌟 更新版本號，強制手機抓取新檔案
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2' // 🌟 補上圖表標籤外掛，確保離線圖表正常顯示
];

self.addEventListener('install', event => {
  self.skipWaiting(); // 強制 Service Worker 立刻進入安裝狀態，不要等待！
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 啟動新版 SW 時，順便把舊版快取垃圾清掉
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim()); // 強制新的 Service Worker 立刻接管目前所有開啟的網頁！
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // 🌟 放行 Google API 以及它的重新導向網址！不要快取動態資料！
  if (event.request.url.includes('script.google.com') || event.request.url.includes('googleusercontent.com')) {
    return; // 直接 return，交給瀏覽器正常發送網路請求
  }

  // 🌟 改用 Network-First (網路優先) 策略
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // 如果網路連線正常，抓到最新檔案後，順便更新到快取裡
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // 🚨 如果網路斷線 (catch 觸發)，就退回去找快取裡的備份檔案
        return caches.match(event.request);
      })
  );
});