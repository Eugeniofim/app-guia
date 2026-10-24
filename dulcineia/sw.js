/* 24/10/2026: o app da Dulcineia mora em conexaoberlim.com.
   Este service worker substitui o antigo nos aparelhos que já tinham o app
   aberto aqui: apaga o cache dela (berlim-*), se desliga e recarrega as abas,
   que então caem no index.html novo (o redirecionamento). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('berlim-')).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const abas = await self.clients.matchAll({ type: 'window' });
    abas.forEach((c) => c.navigate(c.url));
  })());
});
