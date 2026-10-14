'use strict';
const CACHE='cacg-shell-v5-config-check-20261014';
const SHELL=['/','/index.html','/style.css','/app.js','/assessment.js','/offline.js','/pwa.js','/manifest.webmanifest','/assets/icon-192.png','/assets/icon-512.png','/assets/school.png','/assets/anglican.png','/assets/proprietors.webp','/assets/students-reading.webp','/assets/students-praying.webp','/assets/journal.webp','/assets/chiatech.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cacg-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/.netlify/'))return;
 if(req.mode==='navigate'){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match('/index.html'))||fetch(req)));return;}
 if(!SHELL.includes(url.pathname))return;event.respondWith(caches.open(CACHE).then(async cache=>{const saved=await cache.match(url.pathname);if(saved)return saved;const response=await fetch(req);if(response.ok)await cache.put(url.pathname,response.clone());return response;}));
});
