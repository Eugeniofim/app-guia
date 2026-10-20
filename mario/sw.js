/* 20/10/2026: o app do Mario mora em guiabrasileiroemmunique.app.
   Este service worker substitui o antigo nos celulares que já tinham o app
   instalado aqui: apaga o cache do Mario, se desliga e recarrega as abas,
   que então caem no index.html novo (o redirecionamento). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('mario-')).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const abas = await self.clients.matchAll({ type: 'window' });
    abas.forEach((c) => c.navigate(c.url));
  })());
});
