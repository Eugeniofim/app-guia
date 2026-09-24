/* Service worker — app-guia
   Estratégia: rede primeiro (o app novo chega sempre que houver internet),
   cache como reserva (o app abre mesmo sem internet).
   Para publicar uma atualização: subir os arquivos novos e trocar a VERSION. */
'use strict';

const VERSION = 'berlim-v0.5.2';
const CORE = [
  './', './index.html', './config.js', './app.js', './fx.js', './pix.js', './qr.js', './qrcode.js', './traduz.js', './idiomas.js', './store.js', './assistente.js', './auth.js', './logo.js', './cloud.js', './i18n.js', './avisos.js', './creditos.js', './tokens.css', './fontes/arapey-regular.woff2', './fontes/arapey-italic.woff2', './fontes/instrument-serif-regular.woff2', './fontes/instrument-serif-italic.woff2',
  './manifest.webmanifest', './arte/selo-capsula.svg', './arte/logo-horizontal.svg', './arte/logo-palavra.svg', './arte/favicon.svg', './capa.jpg', './home.jpg', './og.jpg', './guia.jpg', './exemplo-1.jpg', './exemplo-2.jpg', './exemplo-3.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('berlim-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  /* O GitHub manda o index.html com max-age=600: o navegador guarda a pagina
     por 10 minutos e continua servindo a versao velha mesmo com recarga
     forcada. Para a pagina e para o codigo do app, furamos esse cache. */
  const ehApp = e.request.mode === 'navigate'
    || /\.(?:js|css|webmanifest)$/.test(url.pathname);
  e.respondWith(
    fetch(e.request, ehApp ? { cache: 'reload' } : undefined)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((hit) => hit ||
          (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
      )
  );
});

/* ---------- aviso de reserva nova (push) ----------
   Quem manda é o servidor dela (função cofre, /api/avisar), chamado pelo
   banco quando a reserva é gravada. Aqui só se mostra e se abre o painel. */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Conexão Berlim', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Reserva nova', {
    body: d.body || '', tag: d.tag || 'reserva', renotify: true,
    icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [120, 80, 120],
    data: { url: d.url || './#/adm/today' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || './#/adm/today', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abertas) => {
    for (const c of abertas) if (c.url.startsWith(self.registration.scope)) { c.navigate(alvo).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(alvo);
  }));
});
