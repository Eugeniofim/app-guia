/* 28/10/2026: o app da Yalla mora só em yallaexperiences.com.
   Este service worker substitui o antigo nos celulares que tinham o app
   instalado por este endereço: apaga o cache da Yalla, se desliga e recarrega
   as abas, que então caem no index.html novo (o redirecionamento). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('yalla-')).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const abas = await self.clients.matchAll({ type: 'window' });
    abas.forEach((c) => c.navigate(c.url));
  })());
});
