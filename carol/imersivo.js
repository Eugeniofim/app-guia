/* =====================================================
   ROTEIRO IMERSIVO — mapa + GPS + a voz da Carol (reunião 23:57–28:30)

   A rota e as 36 paradas vêm do My Maps DELA ("CITY OF LONDON"): a linha
   que ela desenhou (St. Paul's → Tower Bridge → Borough Market, 6,7 km) e
   os textos que ela escreveu em cada ponto. Ordem das paradas = a ordem em
   que a rota passa por elas (dados/rota-city.json).
   ===================================================== */
'use strict';

const ROTA_CITY = { linha: [[51.51352,-0.09864],[51.51338,-0.09858],[51.51336,-0.09844],[51.51321,-0.09843],[51.5132,-0.09826],[51.51046,-0.09846],[51.51227,-0.0983],[51.51224,-0.09797],[51.51232,-0.09772],[51.51227,-0.09677],[51.51281,-0.0966],[51.5128,-0.0963],[51.51322,-0.09607],[51.51322,-0.09592],[51.5131,-0.09582],[51.51338,-0.0957],[51.51307,-0.0936],[51.51278,-0.09261],[51.51281,-0.0924],[51.51375,-0.09224],[51.51384,-0.09209],[51.51408,-0.09205],[51.51498,-0.09143],[51.5147,-0.08962],[51.51453,-0.08964],[51.51354,-0.0889],[51.5135,-0.08885],[51.51358,-0.0887],[51.51346,-0.08854],[51.51383,-0.08744],[51.51403,-0.08654],[51.51439,-0.08384],[51.51449,-0.08381],[51.51467,-0.08341],[51.51453,-0.08366],[51.51444,-0.08345],[51.51488,-0.08291],[51.51463,-0.08211],[51.51452,-0.08201],[51.51455,-0.08128],[51.51422,-0.08044],[51.51415,-0.08],[51.51423,-0.0799],[51.51415,-0.08],[51.51422,-0.08044],[51.51439,-0.08079],[51.51442,-0.08107],[51.51358,-0.0815],[51.51348,-0.08343],[51.51348,-0.08399],[51.51354,-0.08396],[51.51357,-0.08417],[51.51281,-0.08456],[51.51289,-0.08487],[51.51281,-0.08456],[51.51197,-0.08528],[51.51167,-0.08537],[51.51165,-0.08517],[51.51076,-0.08592],[51.5107,-0.08569],[51.50962,-0.08631],[51.50918,-0.08281],[51.50939,-0.08281],[51.50939,-0.08258],[51.50959,-0.08227],[51.51021,-0.08177],[51.5096,-0.08015],[51.5097,-0.07977],[51.50953,-0.07786],[51.50957,-0.07685],[51.50976,-0.07685],[51.50985,-0.07662],[51.50998,-0.07666],[51.50998,-0.07699],[51.5098,-0.07705],[51.50963,-0.07737],[51.50962,-0.07795],[51.50826,-0.07884],[51.50805,-0.07871],[51.50757,-0.07688],[51.50787,-0.07597],[51.50785,-0.07551],[51.50748,-0.07563],[51.50755,-0.07626],[51.5072,-0.07648],[51.50678,-0.07432],[51.50703,-0.07422],[51.50443,-0.07604],[51.50413,-0.07611],[51.50423,-0.07602],[51.50437,-0.07623],[51.50557,-0.08002],[51.50594,-0.08151],[51.50651,-0.08472],[51.50643,-0.08518],[51.50652,-0.08652],[51.50622,-0.08673],[51.50635,-0.0871],[51.50642,-0.08803],[51.50674,-0.08983],[51.50669,-0.08996],[51.50634,-0.0902],[51.50633,-0.09032],[51.50569,-0.0904],[51.50562,-0.09084]], metros: 6678, paradas: ["st-pauls", "city-school", "millennium-bridge", "globe", "tate-modern", "bracken-house", "reflection-garden", "watling-street", "guildhall", "bank-of-england", "mansion-house", "royal-exchange", "horizon-22", "gherkin", "leadenhall", "sky-garden", "monument", "st-magnus", "old-billingsgate", "custom-house", "st-dunstan", "all-hallows", "sundial", "london-wall", "trinity-square", "four-seasons", "tower-of-london", "tower-bridge", "city-hall", "hms-belfast", "hays-galleria", "shard", "london-bridge", "southwark-cathedral", "borough-market", "george-inn"], desvio: {"globe": 280, "tate-modern": 325, "shard": 192, "london-bridge": 161} };

/* =====================================================
   O MAPA (Leaflet, cdnjs) — carregado só quando a tela precisa
   Mapa de ruas: OpenStreetMap (com atribuição). O CARTO passou a pedir
   chave (visto em 28/09/2026). No app no ar: um provedor com plano comercial
   (MapTiler ou Stadia, grátis até um volume alto) — está na proposta.
   ===================================================== */
let _leaflet = null;
function carregaLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (_leaflet) return _leaflet;
  _leaflet = new Promise((ok, erro) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload = () => ok(window.L); s.onerror = () => { _leaflet = null; erro(new Error('mapa')); };
    document.head.appendChild(s);
  });
  return _leaflet;
}
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILES_ATR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
function pinoNumero(L, n, estado) {
  return L.divIcon({ className: 'pino ' + (estado || ''), html: `<span>${n}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
}
/* mapa simples de um dia (roteiro privado): paradas numeradas, enquadradas */
function mapaDoDia(elId, pontos) {
  const el = document.getElementById(elId);
  if (!el || !pontos.length) return;
  carregaLeaflet().then(L => {
    if (!document.getElementById(elId) || document.getElementById(elId)._leaflet_id) return;
    const m = L.map(el, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer(TILES, { attribution: TILES_ATR, maxZoom: 19 }).addTo(m);
    const ll = pontos.map(p => [p.lat, p.lng]);
    pontos.forEach((p, i) => L.marker([p.lat, p.lng], { icon: pinoNumero(L, i + 1) }).addTo(m).bindPopup(`<b>${esc(p.n)}</b>`));
    if (ll.length > 1) L.polyline(ll, { color: '#700420', weight: 3, opacity: .55, dashArray: '6 8' }).addTo(m);
    m.fitBounds(L.latLngBounds(ll).pad(0.25), { maxZoom: 16 });
  }).catch(() => { el.innerHTML = '<p class="why" style="padding:14px">Sem internet para o mapa agora — as paradas estão abaixo.</p>'; });
}

/* =====================================================
   A VOZ
   Hoje: a voz do próprio celular (pt-BR), marcada como PROVISÓRIA.
   Na versão final: arquivo de áudio por parada, na voz da Carol — gravada
   no estúdio ou clonada (ElevenLabs) com a autorização dela por escrito.
   O app já procura p.audio primeiro; sem arquivo, cai na voz do celular.
   ===================================================== */
let _falando = null;
function vozPt() {
  const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  return vs.find(v => /pt-BR/i.test(v.lang) && /Luciana|Francisca|Google/i.test(v.name)) || vs.find(v => /pt-BR/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
}
function textoFalado(p) {
  const d = (p.d || '').replace(/\s*\(\s*/g, ', ').replace(/\s*\)\s*/g, ', ').replace(/rs\b/g, '').replace(/\s+/g, ' ').trim();
  const corte = d.length > 700 ? d.slice(0, d.lastIndexOf('.', 700) + 1 || 700) : d;
  return p.n + '. ' + corte + (p.dica ? ' Dica da Carol: ' + p.dica : '');
}
function paraVoz() {
  if (_falando && _falando.pause) { _falando.pause(); }
  if (window.speechSynthesis) speechSynthesis.cancel();
  _falando = null;
  document.querySelectorAll('.falando').forEach(b => b.classList.remove('falando'));
}
function narra(p, botao) {
  paraVoz();
  if (p.audio) { const a = new Audio(p.audio); _falando = a; a.play().catch(() => {}); if (botao) botao.classList.add('falando'); a.onended = () => botao && botao.classList.remove('falando'); return; }
  if (!window.speechSynthesis) return toast('Este celular não tem voz para ler em voz alta');
  const u = new SpeechSynthesisUtterance(textoFalado(p));
  const v = vozPt(); if (v) u.voice = v;
  u.lang = 'pt-BR'; u.rate = 1.0; u.pitch = 1.05;
  if (botao) { botao.classList.add('falando'); u.onend = () => botao.classList.remove('falando'); }
  _falando = u;
  speechSynthesis.speak(u);
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};

/* =====================================================
   O ROTEIRO IMERSIVO (#/imersivo/city  ou  #/imersivo/r-<código>-<dia>)
   Reunião 23:57: "cada ponto da rota que ela vai clicando tem a foto, para
   ela saber que está olhando pro lugar certo, e um pequeno descritivo… e o
   meu sonho era fazer isso com voz, como se fosse um audioguia".
   ===================================================== */
const PERTO_M = 40;   /* chegou a 40 m da parada = abre e fala */
function distM(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function imersivoDados(id) {
  if (id === 'city') {
    return { titulo: 'City of London', sub: "De St. Paul's ao Borough Market", linha: ROTA_CITY.linha, metros: ROTA_CITY.metros,
      paradas: ROTA_CITY.paradas.map(ponto).filter(Boolean), desvio: ROTA_CITY.desvio, prévia: true };
  }
  const m = /^r-(.+)-(\d+)$/.exec(id || '');
  if (m) {
    const r = (DB.roteiros || []).find(z => z.codigo === m[1]);
    const dia = r && r.dias && r.dias[+m[2]];
    if (dia) {
      const ps = dia.periodos.flatMap(pe => pe.itens).map(ponto).filter(Boolean);
      return { titulo: 'Dia ' + (+m[2] + 1) + ' · ' + (r.nome || ''), sub: dia.periodos.map(pe => pe.titulo).join(' · '), linha: ps.map(p => [p.lat, p.lng]), metros: 0, paradas: ps, desvio: {}, voltar: '/r/' + r.codigo };
    }
  }
  return null;
}
const IM = { i: 0, visitadas: new Set(), gps: null, sim: null, auto: true, mapa: null, marcas: [], eu: null };
function viewImersivo(id) {
  imersivoSai();
  const D = imersivoDados(id);
  if (!D) { app.innerHTML = `${topoCarol()}<main class="wrap narrow"><p class="empty">Roteiro não encontrado.</p></main>`; ligaVoltar('/'); return; }
  IM.D = D; IM.i = 0; IM.visitadas = new Set(); IM.auto = true;
  const km = D.metros ? (D.metros / 1000).toFixed(1).replace('.', ',') + ' km · ' : '';
  app.innerHTML = `
  <div class="imTela">
    <header class="imTopo"><button class="backbtn" id="bk" aria-label="Voltar">←</button>
      <div class="imTit"><b>${esc(D.titulo)}</b><small>${esc(D.sub)}</small></div>
      <button class="imLista" id="imLista" aria-label="Lista de paradas">☰</button></header>
    <div class="imMapa" id="imMapa"></div>
    <div class="imIntro" id="imIntro">
      <p class="lema escuro">Come with me!</p>
      <h1>${esc(D.titulo)} com a Carol</h1>
      <p class="imMeta">${km}${D.paradas.length} paradas · no seu ritmo</p>
      <p>Ande com o celular na mão: quando você chegar perto de cada parada, ela abre sozinha — com a foto, para saber que está no lugar certo, e a Carol contando a história.</p>
      <div class="imBtns">
        <button class="cta" id="imGps">📍 Começar a caminhada</button>
        <button class="cta soft" id="imSim">▶ Simular a caminhada (para testar de casa)</button>
      </div>
      <p class="imVoz">🎙 Voz provisória do celular. Na versão final, é a voz da Carol — gravada no estúdio ou clonada com autorização dela.</p>
    </div>
    <section class="imCartao" id="imCartao" hidden></section>
    <section class="imPainel" id="imPainel" hidden></section>
  </div>`;
  $('#bk').onclick = () => { imersivoSai(); go(D.voltar || '/'); };
  $('#imGps').onclick = () => { $('#imIntro').hidden = true; imersivoGps(); abreParada(0, false); };
  $('#imSim').onclick = () => { $('#imIntro').hidden = true; imersivoSimula(); };
  $('#imLista').onclick = () => imersivoLista();
  carregaLeaflet().then(L => imersivoMapa(L)).catch(() => { if ($('#imMapa')) $('#imMapa').innerHTML = '<p class="why" style="padding:18px">O mapa precisa de internet. As paradas continuam na lista (☰).</p>'; });
}
function imersivoMapa(L) {
  const el = document.getElementById('imMapa'); if (!el || el._leaflet_id) return;   /* a tela pode ter sido desenhada duas vezes */
  const D = IM.D;
  IM.mapa = L.map(el, { zoomControl: false });
  L.tileLayer(TILES, { attribution: TILES_ATR, maxZoom: 19 }).addTo(IM.mapa);
  L.control.zoom({ position: 'bottomright' }).addTo(IM.mapa);
  if (D.linha.length > 1) L.polyline(D.linha, { color: '#700420', weight: 5, opacity: .8 }).addTo(IM.mapa);
  IM.marcas = D.paradas.map((p, i) => L.marker([p.lat, p.lng], { icon: pinoNumero(L, i + 1, D.desvio && D.desvio[p.id] ? 'desvio' : '') }).addTo(IM.mapa)
    .on('click', () => abreParada(i, false)));
  IM.mapa.fitBounds(L.latLngBounds(D.paradas.map(p => [p.lat, p.lng])).pad(0.12));
}
function marcaVisitada(i) {
  IM.visitadas.add(i);
  const L = window.L; if (!L || !IM.marcas[i]) return;
  IM.marcas.forEach((m, k) => m.setIcon(pinoNumero(L, k + 1, (k === i ? 'atual ' : '') + (IM.visitadas.has(k) ? 'feita' : '') + (IM.D.desvio && IM.D.desvio[IM.D.paradas[k].id] ? ' desvio' : ''))));
}
function abreParada(i, falar) {
  const D = IM.D, p = D.paradas[i]; if (!p) return;
  IM.i = i; marcaVisitada(i);
  const prox = D.paradas[i + 1];
  const dist = prox ? Math.round(distM([p.lat, p.lng], [prox.lat, prox.lng]) / 10) * 10 : 0;
  const c = $('#imCartao'); if (!c) return;
  c.hidden = false;
  c.innerHTML = `<div class="imFoto" style="background-image:url(${esc(p.ph)})"><small class="sccr">${esc(p.cr || '')}</small><span class="imNum">${i + 1}<i>/${D.paradas.length}</i></span></div>
    <div class="imTx">
      <b>${esc(p.n)}</b>
      ${D.desvio && D.desvio[p.id] ? `<small class="imDesvio">Do outro lado do rio: dá para ver da ponte, ou fazer um desvio de ~${D.desvio[p.id]} m</small>` : ''}
      <div class="imTexto">${esc(p.d || 'Texto da Carol aqui.')}${p.dica ? `<p class="rtDica">💡 ${esc(p.dica)}</p>` : ''}</div>
      <div class="imAcoes">
        <button class="mini" id="imAnt" ${i === 0 ? 'disabled' : ''} aria-label="Parada anterior">←</button>
        <button class="cta sm" id="imOuvir">▶ Ouvir a Carol</button>
        <button class="mini" id="imProx" ${prox ? '' : 'disabled'} aria-label="Próxima parada">→</button>
      </div>
      ${prox ? `<small class="imProxTx">Próxima: <b>${esc(prox.n)}</b> · ~${dist} m a pé</small>` : `<small class="imProxTx">Fim do roteiro. Obrigada por caminhar comigo! ❤️ <a href="#/avaliar">Avaliar</a></small>`}
    </div>`;
  $('#imOuvir').onclick = (e) => { if (e.currentTarget.classList.contains('falando')) paraVoz(); else narra(p, e.currentTarget); };
  $('#imAnt').onclick = () => abreParada(i - 1, false);
  $('#imProx').onclick = () => abreParada(i + 1, false);
  if (IM.mapa) IM.mapa.panTo([p.lat, p.lng], { animate: true });
  if (falar && IM.auto) { narra(p, $('#imOuvir')); if (navigator.vibrate) navigator.vibrate([80, 60, 80]); }
}
function imersivoLista() {
  const D = IM.D, el = $('#imPainel'); if (!el) return;
  el.hidden = !el.hidden;
  if (el.hidden) return;
  el.innerHTML = `<header><b>${D.paradas.length} paradas</b><button class="mini" id="imFechaLista">Fechar</button></header>
    <ol>${D.paradas.map((p, i) => `<li><button data-ir="${i}"><span class="rtFoto" style="background-image:url(${esc(p.ph)})"><i>${i + 1}</i></span><span><b>${esc(p.n)}</b>${IM.visitadas.has(i) ? '<small>✓ visitada</small>' : ''}</span></button></li>`).join('')}</ol>`;
  $('#imFechaLista').onclick = () => { el.hidden = true; };
  $$('[data-ir]', el).forEach(b => b.onclick = () => { el.hidden = true; $('#imIntro') && ($('#imIntro').hidden = true); abreParada(+b.dataset.ir, false); });
}
/* GPS de verdade: abre e fala a parada quando chega a 40 m */
function imersivoGps() {
  if (!navigator.geolocation) return toast('Este celular não tem localização');
  IM.gps = navigator.geolocation.watchPosition(pos => {
    const eu = [pos.coords.latitude, pos.coords.longitude];
    imersivoEu(eu);
    const D = IM.D;
    D.paradas.forEach((p, i) => { if (!IM.visitadas.has(i) && distM(eu, [p.lat, p.lng]) <= PERTO_M) abreParada(i, true); });
  }, () => toast('Ative a localização para o roteiro te acompanhar'), { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}
function imersivoEu(eu) {
  const L = window.L; if (!L || !IM.mapa) return;
  if (!IM.eu) IM.eu = L.circleMarker(eu, { radius: 8, color: '#fff', weight: 3, fillColor: '#1A73E8', fillOpacity: 1 }).addTo(IM.mapa);
  else IM.eu.setLatLng(eu);
}
/* SIMULAÇÃO: um "você" anda pela rota da Carol (bem mais rápido que a pé)
   e as paradas vão abrindo como abririam na rua. */
function imersivoSimula() {
  const D = IM.D;
  const linha = D.linha.length > 1 ? D.linha : D.paradas.map(p => [p.lat, p.lng]);
  const segs = [];
  for (let k = 1; k < linha.length; k++) segs.push({ a: linha[k - 1], b: linha[k], m: distM(linha[k - 1], linha[k]) });
  let s = 0, t = 0, parado = 0;
  const passo = 14;   /* metros por quadro de 120 ms ≈ 8x a caminhada */
  IM.sim = setInterval(() => {
    if (parado > 0) { parado--; return; }
    if (s >= segs.length) { imersivoSai(); toast('Fim da caminhada simulada'); return; }
    const g = segs[s]; t += passo;
    if (t >= g.m) { t -= g.m; s++; if (s >= segs.length) return; }
    const f = Math.min(1, t / (segs[s] || g).m), a = (segs[s] || g).a, b = (segs[s] || g).b;
    const eu = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    imersivoEu(eu);
    if (IM.mapa && (s % 3 === 0)) IM.mapa.panTo(eu, { animate: false });
    D.paradas.forEach((p, i) => {
      if (!IM.visitadas.has(i) && distM(eu, [p.lat, p.lng]) <= PERTO_M + (D.desvio && D.desvio[p.id] ? D.desvio[p.id] : 0)) {
        abreParada(i, true); parado = 40;   /* para ~5 s em cada parada, como na rua */
      }
    });
  }, 120);
}
function imersivoSai() {
  if (IM.gps != null && navigator.geolocation) navigator.geolocation.clearWatch(IM.gps);
  if (IM.sim) clearInterval(IM.sim);
  IM.gps = null; IM.sim = null; IM.eu = null; IM.mapa = null; IM.marcas = [];
  paraVoz();
}
addEventListener('hashchange', () => { if (!location.hash.startsWith('#/imersivo')) imersivoSai(); });

if (typeof module !== 'undefined') module.exports = { distM, textoFalado, imersivoDados };
