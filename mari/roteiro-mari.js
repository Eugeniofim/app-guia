/* =====================================================
   ROTEIRO PERSONALIZADO (06/10/2026)

   O modelo é o PDF dela "Roteiro Personalizado — Um dia de bicicleta em
   Copenhagen com crianças": faixa laranja com o título em branco, fotos em
   polaroide meio tortas, paradas numeradas (título em negrito, frase em
   itálico, textinho), e em cada trecho o mapa do caminho com as paradas
   numeradas e o link do Google Maps embaixo; nas páginas seguintes, a
   moldura fina laranja-avermelhada.

   O MOTOR (para ela montar sozinha, em minutos):
   - lugares por busca no banco (pontos-mari.js) ou "Lugar novo" (nome,
     frase, texto e o link do Google Maps — a coordenada sai do próprio
     link, sem API); dá para guardar nos lugares dela (DB.pontosMari);
   - "Organizar pelo caminho": vizinho mais próximo a partir da 1ª parada
     (+ desfaz cruzamentos), sem coordenada vai para o fim; distância =
     linha reta × 1,3, tempo pela velocidade do meio de transporte;
   - "Sugerir um dia": 5–7 lugares do banco pelos gostos e pela região,
     já na ordem do caminho;
   - o link do Google Maps de cada trecho (até 9 paradas no meio, como pede
     o Google; dia comprido vira vários trechos, como no PDF dela);
   - o mapa de cada trecho (Leaflet + OpenStreetMap, carregados só quando
     precisa; se não carregar, fica só o link — a página nunca quebra).
   Sai em duas formas: o DOCUMENTO em A4 (Imprimir → Salvar como PDF) e o
   LINK para o celular do cliente (#/ro/…, conteúdo comprimido no próprio
   link; do banco viaja só {p: id} e o que ela mudou).

   Dados (privados): DB.roteiros [{id, num 'RT-0001', cliente {nome, chave,
   whats}, titulo, subtitulo, modo, ini, fim, dias [{id, data, titulo, modo,
   paradas [{id, pontoId, nome, frase, texto, foto, lat, lng, hora,
   opcional, quebra}]}], obs, status 'rascunho'|'enviado', criado}]
   quebra = "começa um mapa novo aqui" (sem nenhuma, o app divide sozinho).
   ===================================================== */
'use strict';

const RT_TITULO = 'Roteiro Personalizado';
const RT_MODOS = {
  walking: { nome: 'a pé', curto: 'a pé', kmh: 4.5 },
  bicycling: { nome: 'de bicicleta', curto: 'bicicleta', kmh: 14 },
  driving: { nome: 'de carro', curto: 'carro', kmh: 30 },
  transit: { nome: 'de transporte público', curto: 'transporte público', kmh: 20 },
};
const RT_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
const RT_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const RT_POR_TRECHO = 4;         /* sem quebra manual: trechos de ~4 paradas, como no PDF dela */
/* paradas no meio de UM link do Google Maps: o Google aceita até 9, mas no navegador do celular (iPhone sem o
   app do Google Maps) só 3 — e o cliente abre no celular. Os trechos automáticos (4 paradas + de onde vem)
   cabem certinho em 1 link. De transporte público o Google não garante paradas no meio: 1 link por perna. */
const RT_MAX_WAY = 3;
const RT_ST = { rascunho: ['n', 'rascunho'], enviado: ['ok', 'enviado'] };
const RT_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const RT_SEM = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const rtNovoId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const rtNum = (v) => (v === '' || v === null || v === undefined || isNaN(+v)) ? null : +v;
const rtTemCoord = (p) => !!p && rtNum(p.lat) !== null && rtNum(p.lng) !== null && Math.abs(+p.lat) <= 90 && Math.abs(+p.lng) <= 180 && !(+p.lat === 0 && +p.lng === 0);
const rtIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const rtData = (iso) => rtIso(iso) ? new Date(iso + 'T12:00:00') : null;
function rtMaisDias(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function rtDiasDoPeriodo(ini, fim) {
  if (!rtIso(ini)) return [''];
  const out = [ini];
  if (rtIso(fim) && fim > ini) { let d = ini; while (out.length < 10) { d = rtMaisDias(d, 1); if (d > fim) break; out.push(d); } }
  return out;
}
function rtDataLonga(iso) { const d = rtData(iso); return d ? `${RT_SEM[d.getDay()]}, ${d.getDate()} de ${RT_MES[d.getMonth()]}` : ''; }
function rtPeriodo(r) {
  const a = rtData(r.ini), b = rtData(r.fim);
  if (!a) return '';
  if (!b || +b <= +a) return `${a.getDate()} de ${RT_MES[a.getMonth()]} de ${a.getFullYear()}`;
  if (a.getFullYear() !== b.getFullYear()) return `${a.getDate()} de ${RT_MES[a.getMonth()]} de ${a.getFullYear()} a ${b.getDate()} de ${RT_MES[b.getMonth()]} de ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} de ${RT_MES[a.getMonth()]} a ${b.getDate()} de ${RT_MES[b.getMonth()]} de ${b.getFullYear()}`;
  return `${a.getDate()} a ${b.getDate()} de ${RT_MES[a.getMonth()]} de ${a.getFullYear()}`;
}
const rtKm = (km) => (Math.round(km * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km';
function rtTempo(min) { min = Math.max(1, Math.round(min)); if (min < 60) return min + ' min'; const h = Math.floor(min / 60), m = Math.round((min - h * 60) / 5) * 5; return h + ' h' + (m ? ' ' + m + ' min' : ''); }
const rtModo = (r, d) => (d && RT_MODOS[d.modo]) ? d.modo : (RT_MODOS[r && r.modo] ? r.modo : 'walking');
const rtNorm = (s) => (typeof Pontos !== 'undefined' ? Pontos.norm(s) : String(s || '').toLowerCase());

/* ---------- contas do caminho ---------- */
function rtDist(a, b) {
  const R = 6371, k = Math.PI / 180, dLa = (b.lat - a.lat) * k, dLo = (b.lng - a.lng) * k;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * k) * Math.cos(b.lat * k) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
const rtCompr = (l) => { let s = 0; for (let i = 1; i < l.length; i++) s += rtDist(l[i - 1], l[i]); return s; };
/* linha reta × 1,3 (as ruas não são retas) e a velocidade de cada jeito de ir */
function rtPercurso(paradas, modo) {
  const km = rtCompr((paradas || []).filter(rtTemCoord)) * 1.3, v = (RT_MODOS[modo] || RT_MODOS.walking).kmh;
  return { km: Math.round(km * 10) / 10, minutos: Math.round(km / v * 60) };
}
/* vizinho mais próximo a partir do primeiro (que fica), depois desfaz os cruzamentos (2-opt) */
function rtOrdena(l) {
  if (l.length < 3) return l.slice();
  const resto = l.slice(1), out = [l[0]];
  while (resto.length) { const u = out[out.length - 1]; let m = 0; for (let i = 1; i < resto.length; i++) if (rtDist(u, resto[i]) < rtDist(u, resto[m])) m = i; out.push(resto.splice(m, 1)[0]); }
  for (let volta = 0, mudou = true; mudou && volta < 40; volta++) {
    mudou = false;
    for (let i = 1; i < out.length - 1; i++) for (let j = i + 1; j < out.length; j++) {
      const a = out[i - 1], b = out[i], c = out[j], d = out[j + 1];
      const antes = rtDist(a, b) + (d ? rtDist(c, d) : 0), depois = rtDist(a, c) + (d ? rtDist(b, d) : 0);
      if (depois < antes - 1e-9) { out.splice(i, j - i + 1, ...out.slice(i, j + 1).reverse()); mudou = true; }
    }
  }
  return out;
}
/* "Frase. Resto do texto." → frase em itálico + texto (como no PDF dela) */
function rtPartir(s) {
  s = String(s || '').trim();
  const m = s.match(/^(.+?[.!?])\s+(\S[\s\S]*)$/);
  let fr = m ? m[1] : s, tx = m ? m[2] : '';
  const dp = fr.indexOf(': ');
  if (dp >= 15) { tx = (fr.slice(dp + 2).replace(/^./, c => c.toUpperCase()) + ' ' + tx).trim(); fr = fr.slice(0, dp) + '.'; }
  else if (!m) return { frase: '', texto: s };
  return { frase: fr, texto: tx };
}
/* a coordenada de dentro de um link do Google Maps (ou "55.67, 12.56" colado) */
function rtCoordsDoLink(txt) {
  const s = String(txt || '').trim(); if (!s) return null;
  let u = s; try { u = decodeURIComponent(s); } catch (e) {}
  const ok = (a, b) => { const la = +a, ln = +b; return isFinite(la) && isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 && !(la === 0 && ln === 0) ? { lat: Math.round(la * 1e6) / 1e6, lng: Math.round(ln * 1e6) / 1e6 } : null; };
  const N = '(-?\\d{1,3}(?:\\.\\d+)?)';
  let m = u.match(new RegExp('!3d' + N + '!4d' + N)) || u.match(new RegExp('[?&](?:q|query|ll|destination|center|daddr|sll)=(?:loc:)?' + N + '\\s*,\\s*\\+?' + N)) || u.match(new RegExp('@' + N + ',' + N)) || u.match(new RegExp('^' + N + '\\s*[,;]\\s*' + N + '$'));
  const c = m ? ok(m[1], m[2]) : null;
  if (!c) return null;
  const nm = u.match(/\/maps\/place\/([^/@?]+)/);
  if (nm) c.nome = nm[1].replace(/\+/g, ' ').trim();
  return c;
}
const rtLinkCurto = (s) => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(String(s || '').trim());

/* ---------- os trechos (um mapa e um link do Google para cada) ---------- */
function rtTrechos(dia) {
  const ps = (dia && dia.paradas) || []; if (!ps.length) return [];
  let grupos = [];
  if (ps.some((p, k) => k > 0 && p.quebra)) { let cur = []; ps.forEach((p, k) => { if (k > 0 && p.quebra && cur.length) { grupos.push(cur); cur = []; } cur.push(p); }); grupos.push(cur); }
  else if (ps.length <= 6) grupos = [ps.slice()];
  else { const n = Math.ceil(ps.length / RT_POR_TRECHO), base = Math.floor(ps.length / n), sobra = ps.length % n; let i = 0; for (let g = 0; g < n; g++) { const t = base + (g < sobra ? 1 : 0); grupos.push(ps.slice(i, i + t)); i += t; } }
  let de = 1, ant = null, antN = 0;
  return grupos.map(g => {
    const t = { paradas: g, de, anterior: ant, anteriorN: antN };
    g.forEach((p, k) => { if (rtTemCoord(p)) { ant = p; antN = de + k; } });
    de += g.length; return t;
  });
}
const rtLL = (p) => (+p.lat).toFixed(5) + ',' + (+p.lng).toFixed(5);
function rtDirUrl(seg, modo) {
  if (seg.length === 1) return 'https://www.google.com/maps/search/?api=1&query=' + rtLL(seg[0]);
  const meio = seg.slice(1, -1).map(rtLL).join('|');
  return 'https://www.google.com/maps/dir/?api=1&origin=' + rtLL(seg[0]) + '&destination=' + rtLL(seg[seg.length - 1]) + (meio ? '&waypoints=' + encodeURIComponent(meio) : '') + '&travelmode=' + (RT_MODOS[modo] ? modo : 'walking');
}
function rtLinksTrechoDet(t, modo, maxWay) {
  const pts = (t.anterior && rtTemCoord(t.anterior) ? [{ p: t.anterior, n: t.anteriorN }] : []).concat(t.paradas.map((p, k) => ({ p, n: t.de + k })).filter(x => rtTemCoord(x.p)));
  if (!pts.length) return [];
  if (pts.length === 1) return [{ url: rtDirUrl([pts[0].p], modo), de: pts[0].n, ate: pts[0].n }];
  const max = modo === 'transit' ? 0 : Math.max(0, Math.min(9, maxWay === undefined ? RT_MAX_WAY : +maxWay));
  const out = []; let i = 0;
  while (i < pts.length - 1) { const fim = Math.min(i + max + 1, pts.length - 1); const seg = pts.slice(i, fim + 1); out.push({ url: rtDirUrl(seg.map(x => x.p), modo), de: seg[0].n, ate: seg[seg.length - 1].n }); i = fim; }
  return out;
}
const rtLinksTrecho = (t, modo, maxWay) => rtLinksTrechoDet(t, modo, maxWay).map(x => x.url);

/* ---------- os dados e o motor ---------- */
function rtCliente(c, antes) {
  if (typeof c === 'string') c = { nome: c };
  const o = Object.assign({ nome: '', chave: '', whats: '' }, antes || {}, c || {});
  o.nome = String(o.nome || '').trim();
  /* nome de cliente conhecido: guarda a chave e o WhatsApp */
  if (o.nome && !o.chave && typeof Clients !== 'undefined') {
    try { const k = Clients.all().find(x => rtNorm(x.name) === rtNorm(o.nome)); if (k) { o.chave = k.chave || String(k.email || k.whats || k.name).toLowerCase(); o.whats = o.whats || k.whats || ''; } } catch (e) {}
  }
  return o;
}
const Roteiro = {
  MODOS: RT_MODOS, TITULO: RT_TITULO,
  all() { if (!Array.isArray(DB.roteiros)) DB.roteiros = []; return DB.roteiros; },
  get(id) { return this.all().find(r => r.id === id || r.num === id) || null; },
  proxNum() { const n = this.all().reduce((m, r) => Math.max(m, +(String(r.num || '').match(/(\d+)$/) || [0, 0])[1]), 0) + 1; return 'RT-' + String(n).padStart(4, '0'); },
  /* uma parada: {pontoId} puxa nome, frase, texto, foto e coordenada do banco; o resto que vier por cima vale */
  parada(x) {
    if (typeof x === 'string') x = { pontoId: x };
    x = Object.assign({}, x || {});
    const b = x.pontoId && typeof Pontos !== 'undefined' ? Pontos.get(x.pontoId) : null;
    const o = { id: x.id || rtNovoId('pa'), pontoId: b ? b.id : String(x.pontoId || ''), nome: '', frase: '', texto: '', foto: '', lat: null, lng: null, hora: '', opcional: false, quebra: false };
    if (b) for (const k of ['nome', 'frase', 'texto', 'foto', 'lat', 'lng']) o[k] = b[k] === undefined ? o[k] : b[k];
    for (const k of ['nome', 'frase', 'texto', 'foto', 'hora']) if (x[k] !== undefined && x[k] !== null) o[k] = String(x[k]).trim();
    for (const k of ['lat', 'lng']) if (x[k] !== undefined) o[k] = rtNum(x[k]);
    if (!rtTemCoord(o)) { o.lat = null; o.lng = null; }
    o.opcional = !!x.opcional; o.quebra = !!x.quebra;
    return o;
  },
  dia(x) { x = x || {}; return { id: x.id || rtNovoId('di'), data: rtIso(x.data) ? x.data : '', titulo: String(x.titulo || '').trim(), modo: RT_MODOS[x.modo] ? x.modo : '', paradas: (x.paradas || []).map(p => this.parada(p)).filter(p => p.nome || p.pontoId) }; },
  novo(c) {
    c = Object.assign({}, c || {});
    const r = { id: rtNovoId('rt'), num: this.proxNum(), criado: new Date().toISOString(), status: 'rascunho', cliente: { nome: '', chave: '', whats: '' },
      titulo: RT_TITULO, subtitulo: '', modo: 'walking', ini: '', fim: '', dias: [], obs: '' };
    const { id, num, criado, dias, cliente, ...resto } = c;
    Object.assign(r, resto);
    if (!RT_MODOS[r.modo]) r.modo = 'walking';
    if (!RT_ST[r.status]) r.status = 'rascunho';
    r.titulo = String(r.titulo || '').trim() || RT_TITULO;
    r.ini = rtIso(r.ini) ? r.ini : ''; r.fim = rtIso(r.fim) ? r.fim : '';
    r.cliente = rtCliente(cliente);
    r.dias = (Array.isArray(dias) && dias.length ? dias : rtDiasDoPeriodo(r.ini, r.fim).map(data => ({ data }))).map(d => this.dia(d));
    this.all().push(r); save(); return r;
  },
  atualiza(id, c) {
    const r = this.get(id); if (!r) return null;
    c = Object.assign({}, c || {}); delete c.id; delete c.num; delete c.criado;
    if ('cliente' in c) c.cliente = rtCliente(c.cliente, typeof c.cliente === 'string' ? {} : r.cliente);
    if (Array.isArray(c.dias)) c.dias = c.dias.map(d => this.dia(d));
    if ('modo' in c && !RT_MODOS[c.modo]) delete c.modo;
    if ('status' in c && !RT_ST[c.status]) delete c.status;
    if ('titulo' in c) c.titulo = String(c.titulo || '').trim() || RT_TITULO;
    for (const k of ['ini', 'fim']) if (k in c && !rtIso(c[k])) c[k] = '';
    Object.assign(r, c); r.mudado = new Date().toISOString(); save(); return r;
  },
  remove(id) { const r = this.get(id); if (!r) return false; DB.roteiros = this.all().filter(x => x.id !== r.id); save(); return true; },
  duplica(id) {
    const r = this.get(id); if (!r) return null;
    const c = JSON.parse(JSON.stringify(r)); delete c.id; delete c.num; delete c.criado; delete c.enviadoEm; delete c.mudado; delete c.pedidoId; c.status = 'rascunho';
    c.dias = c.dias.map(({ id, paradas, ...d }) => Object.assign(d, { paradas: paradas.map(({ id, ...p }) => p) }));
    return this.novo(c);
  },
  /* dia: o id, ou o número do dia (1 = o primeiro); sem dia = o último */
  acharDia(r, diaId) {
    if (!r) return null;
    if (diaId !== undefined && diaId !== null && diaId !== '') {
      const d = r.dias.find(x => x.id === diaId); if (d) return d;
      const n = +diaId; if (Number.isInteger(n) && n >= 1 && n <= r.dias.length) return r.dias[n - 1];
      return null;
    }
    if (!r.dias.length) r.dias.push(this.dia({ data: r.ini }));
    return r.dias[r.dias.length - 1];
  },
  addDia(rotId, c) { const r = this.get(rotId); if (!r) return null; const ult = r.dias[r.dias.length - 1]; const d = this.dia(Object.assign({ data: ult && ult.data ? rtMaisDias(ult.data, 1) : r.ini }, c || {})); r.dias.push(d); save(); return d; },
  removeDia(rotId, diaId) { const r = this.get(rotId), d = this.acharDia(r, diaId); if (!d || !diaId) return false; r.dias = r.dias.filter(x => x !== d); save(); return true; },
  addParada(rotId, diaId, x) {
    const r = this.get(rotId), d = this.acharDia(r, diaId); if (!d) return null;
    const p = this.parada(x); if (!p.nome && !p.pontoId) return null;
    d.paradas.push(p); save(); return p;
  },
  atualizaParada(rotId, diaId, paradaId, campos) {
    const d = this.acharDia(this.get(rotId), diaId); const p = d && d.paradas.find(x => x.id === paradaId); if (!p) return null;
    const novo = this.parada(Object.assign({}, p, campos || {}, { id: p.id, pontoId: (campos && campos.pontoId) || p.pontoId }));
    if (campos && !('lat' in campos) && !campos.pontoId) { novo.lat = p.lat; novo.lng = p.lng; }
    Object.assign(p, novo); save(); return p;
  },
  removeParada(rotId, diaId, paradaId) { const d = this.acharDia(this.get(rotId), diaId); if (!d) return false; const n = d.paradas.length; d.paradas = d.paradas.filter(p => p.id !== paradaId); save(); return d.paradas.length < n; },
  moveParada(rotId, diaId, paradaId, delta) {
    const d = this.acharDia(this.get(rotId), diaId); if (!d) return false;
    const k = d.paradas.findIndex(p => p.id === paradaId), j = k + (+delta || 0);
    if (k < 0 || j < 0 || j >= d.paradas.length || j === k) return false;
    const [p] = d.paradas.splice(k, 1); d.paradas.splice(j, 0, p); save(); return true;
  },
  percurso(dia, modo) { return rtPercurso(dia && dia.paradas, modo || 'walking'); },
  /* "Organizar pelo caminho": a 1ª fica, o resto pelo mais perto; sem coordenada vai para o fim.
     Os mapas voltam a ser divididos sozinhos (as quebras manuais saem). */
  organizarDia(rotId, diaId) {
    const r = this.get(rotId), d = this.acharDia(r, diaId); if (!d) return null;
    const modo = rtModo(r, d), antes = rtPercurso(d.paradas, modo);
    const com = d.paradas.filter(rtTemCoord), sem = d.paradas.filter(p => !rtTemCoord(p));
    d.paradas = rtOrdena(com).concat(sem);
    d.paradas.forEach(p => { p.quebra = false; });
    save();
    const depois = rtPercurso(d.paradas, modo);
    return { km: depois.km, minutos: depois.minutos, antes, semCoordenada: sem.length };
  },
  /* "Sugerir um dia": n lugares do banco pelos gostos e pela região, perto uns dos outros, na ordem do caminho.
     opts: { evitar: [pontoId], incluir: [pontoId], modo, vez (outra sugestão) } → [paradas] (não grava nada) */
  sugerirDia(tags, n, area, opts) {
    opts = opts || {}; n = Math.max(1, Math.min(10, Math.round(+n || 6)));
    const ts = [...new Set((Array.isArray(tags) ? tags : String(tags || '').split(/[,;]+/)).map(t => Pontos.tag(t)).filter(Boolean))];
    const evitar = new Set(opts.evitar || []);
    const incluir = (opts.incluir || []).map(id => Pontos.get(id)).filter(rtTemCoord);
    const regiao = PONTOS_AREAS.includes(area) ? area : (incluir[0] ? incluir[0].area : 'Copenhague');
    const todos = Pontos.todos(), ordem = new Map(todos.map((p, i) => [p.id, i]));
    const nota = (p) => ts.length ? ts.filter(t => (p.tags || []).includes(t)).length : 1;
    const querInteiro = ts.includes('dia-inteiro');
    const inteiro = (p) => (p.tags || []).includes('dia-inteiro');
    let cand = todos.filter(p => rtTemCoord(p) && p.area === regiao && !evitar.has(p.id) && !incluir.some(x => x.id === p.id));
    const modo = RT_MODOS[opts.modo] ? opts.modo : 'walking';
    const raio = regiao === 'Copenhague' ? ({ walking: 1.6, bicycling: 3.2, driving: 5, transit: 4 })[modo] : 30;
    const bons = cand.filter(p => nota(p) > 0).sort((a, b) => nota(b) - nota(a) || ordem.get(a.id) - ordem.get(b.id));
    let escolha = incluir.slice();
    if (!escolha.length) {
      if (!bons.length) return [];
      /* a semente: o melhor; a cada "outra sugestão", o melhor mais longe dos já usados (outro canto da cidade) */
      const topo = bons.filter(p => nota(p) === nota(bons[0])).slice(0, 10), sem = [topo[0]];
      while (sem.length < topo.length) { const r = topo.filter(p => !sem.includes(p)); r.sort((a, b) => Math.min(...sem.map(x => rtDist(x, b))) - Math.min(...sem.map(x => rtDist(x, a)))); sem.push(r[0]); }
      escolha.push(sem[(+opts.vez || 0) % sem.length]);
    }
    const s0 = escolha[0];
    if ((s0.tags || []).includes('dia-inteiro')) n = Math.min(n, 2);
    const longe = (p) => Math.min(...escolha.map(e => rtDist(e, p)));
    const pega = (lista) => {
      while (escolha.length < n) {
        const ok = lista.filter(p => !escolha.includes(p) && (querInteiro || !inteiro(p)) && longe(p) <= raio && rtDist(s0, p) <= raio * 2.2);
        if (!ok.length) return;
        ok.sort((a, b) => (nota(b) * 2 - longe(b) / raio) - (nota(a) * 2 - longe(a) / raio) || ordem.get(a.id) - ordem.get(b.id));
        escolha.push(ok[0]);
      }
    };
    pega(bons);
    if (escolha.length < Math.min(n, 4)) pega(cand);        /* pouca coisa com esses gostos ali perto: completa com o que tem */
    /* a ordem: o caminho mais curto entre os começos possíveis */
    let melhor = null;
    for (const ini of escolha) { const l = rtOrdena([ini].concat(escolha.filter(x => x !== ini))); const c = rtCompr(l); if (!melhor || c < melhor.c - 1e-9) melhor = { l, c }; }
    return melhor.l.map(p => this.parada({ pontoId: p.id }));
  },
  trechos: rtTrechos,
  /* os links do Google Maps do dia, trecho por trecho (maxWay: paradas no meio de cada link, padrão 3, máximo 9) */
  mapsLinks(dia, modo, maxWay) { return rtTrechos(dia).flatMap(t => rtLinksTrecho(t, RT_MODOS[modo] ? modo : (dia && RT_MODOS[dia.modo] ? dia.modo : 'walking'), maxWay)); },
  coordsDoLink: rtCoordsDoLink,
  partirTexto: rtPartir,
  /* o link para o cliente: só o necessário, e do banco só o id e o que ela mudou */
  compacta(r) {
    const o = { v: 1, n: r.num || undefined, t: r.titulo && r.titulo !== RT_TITULO ? r.titulo : undefined, s: r.subtitulo || undefined, c: (r.cliente && r.cliente.nome) || undefined,
      m: r.modo && r.modo !== 'walking' ? r.modo : undefined, i: r.ini || undefined, f: r.fim || undefined, o: r.obs || undefined };
    const MAPA = { nome: 'n', frase: 'fr', texto: 'tx', foto: 'ft', lat: 'la', lng: 'ln' };
    o.d = (r.dias || []).map(d => ({ t: d.titulo || undefined, a: d.data || undefined, m: d.modo || undefined, q: d.paradas.map(p => {
      const b = p.pontoId ? Pontos.doBanco(p.pontoId) : null, q = {};
      if (b) q.p = b.id;
      for (const [k, c] of Object.entries(MAPA)) {
        let v = p[k]; if ((k === 'lat' || k === 'lng') && v !== null && v !== undefined) v = Math.round(v * 1e5) / 1e5;
        const bv = b ? ((k === 'lat' || k === 'lng') && b[k] !== null ? Math.round(b[k] * 1e5) / 1e5 : b[k]) : undefined;
        if (b ? v !== bv && !(v == null && bv == null) : (v !== '' && v !== null && v !== undefined)) q[c] = v === null || v === undefined ? '' : v;
      }
      if (p.hora) q.h = p.hora; if (p.opcional) q.op = 1; if (p.quebra) q.b = 1;
      return q; }) }));
    return JSON.parse(JSON.stringify(o));
  },
  expande(o) {
    o = o || {};
    const r = { num: o.n || '', titulo: o.t || RT_TITULO, subtitulo: o.s || '', cliente: { nome: o.c || '' }, modo: RT_MODOS[o.m] ? o.m : 'walking', ini: o.i || '', fim: o.f || '', obs: o.o || '', dias: [] };
    r.dias = (o.d || []).map((d, k) => ({ id: 'd' + k, data: d.a || '', titulo: d.t || '', modo: RT_MODOS[d.m] ? d.m : '',
      paradas: (d.q || []).map((q, j) => {
        const b = q.p ? Pontos.doBanco(q.p) : null;
        if (!b && !q.n) return null;
        const v = (c, k2) => (c in q) ? q[c] : (b ? b[k2] : '');
        const p = { id: 'p' + k + '_' + j, pontoId: b ? b.id : '', nome: String(v('n', 'nome') || ''), frase: String(v('fr', 'frase') || ''), texto: String(v('tx', 'texto') || ''), foto: String(v('ft', 'foto') || ''),
          lat: rtNum(v('la', 'lat')), lng: rtNum(v('ln', 'lng')), hora: q.h || '', opcional: !!q.op, quebra: !!q.b };
        if (!/^(fotos|arte|apresentacao)\/[\w./-]+\.(jpe?g|png|webp)$/i.test(p.foto)) p.foto = '';
        return p;
      }).filter(Boolean) }));
    return r;
  },
  async linkCliente(id) { const r = this.get(id); if (!r) return ''; return Publico.link('ro', this.compacta(r)); },
  mensagem(id, url) {
    const r = this.get(id); if (!r) return '';
    const nm = String((r.cliente && r.cliente.nome) || '').trim(), pn = /^fam[ií]lia\s/i.test(nm) ? 'família ' + nm.replace(/^fam[ií]lia\s+/i, '') : nm.split(/\s+/)[0];   /* "Oi, família Lima!", não "Oi, Família!" */
    const dias = r.dias.length, per = rtPeriodo(r);
    return `Oi${pn ? ', ' + pn : ''}! Aqui está o seu ${r.titulo.toLowerCase() === RT_TITULO.toLowerCase() ? 'roteiro personalizado' : r.titulo}${r.subtitulo ? ` — ${r.subtitulo}` : ''}${per ? ` (${per})` : ''}, com ${dias > 1 ? dias + ' dias, ' : ''}as paradas, os mapas e o caminho no Google Maps:\n${url}\n\nAbre direto no celular, e dá para salvar em PDF. Qualquer dúvida, me chama!`;
  },
  marcaEnviado(id) { return this.atualiza(id, { status: 'enviado', enviadoEm: new Date().toISOString() }); },
  /* "Mandar no WhatsApp": abre a conversa do cliente com a mensagem e o link (sem WhatsApp, copia) */
  async manda(id) {
    const r = this.get(id); if (!r) return null;
    const url = await this.linkCliente(id), msg = this.mensagem(id, url);
    let whats = (r.cliente && r.cliente.whats) || '';
    if (!whats && r.cliente && r.cliente.chave && typeof window.fichaDe === 'function') { try { whats = (window.fichaDe(r.cliente.chave) || {}).whats || ''; } catch (e) {} }
    const dig = String(whats).replace(/\D/g, '');
    this.marcaEnviado(id);
    if (dig.length >= 8) { window.open(waLink(msg, dig), '_blank', 'noopener'); return { url, msg, whats: dig, copiado: false }; }
    try { await navigator.clipboard.writeText(msg); } catch (e) {}
    return { url, msg, whats: '', copiado: true };
  },
  abrirDoc(id) { const r = this.get(id); if (r) go('/adm/roteirodoc/' + encodeURIComponent(r.id)); return !!r; },
  /* do pedido do "Personalize": cliente, dias do período (até 10), gostos → tags, e cada dia já sugerido.
     As ideias para crianças que ficam longe (LEGOLAND, Roskilde…) ganham um dia só delas. Já existe? devolve o mesmo. */
  doPedido(pedidoId, opts) {
    const p = (DB.pedidos || []).find(x => x.id === pedidoId); if (!p) return null;
    const ja = this.all().find(r => r.pedidoId === p.id); if (ja && !(opts && opts.novo)) return ja;
    const MAPA = { criancas: 'criancas', bike: 'bike', historia: 'historia', arquitetura: 'arquitetura', natureza: 'natureza', gastronomia: 'comida', compras: 'compras' };
    const comCri = +p.criancas > 0 || (p.gosto || []).includes('criancas') || (p.kids || []).length > 0;
    const tags = [...new Set((p.gosto || []).map(g => MAPA[g]).filter(Boolean).concat(comCri ? ['criancas'] : []))];
    const modo = tags.includes('bike') ? 'bicycling' : 'walking';
    const datas = rtDiasDoPeriodo(p.ini, p.fim);
    const kids = [...new Set((p.kids || []).map(k => (window.PONTOS_KIDS || {})[k]).filter(Boolean))].map(id => Pontos.get(id)).filter(Boolean);
    const longe = kids.filter(x => x.area !== 'Copenhague'), perto = kids.filter(x => x.area === 'Copenhague');
    const usados = new Set(), dias = [];
    datas.forEach((data, k) => {
      let paradas, titulo = '', dm = '';
      const fora = (k > 0 || datas.length === 1 && !perto.length) ? longe.shift() : null;
      if (fora) {
        paradas = this.sugerirDia(tags.length ? tags : ['criancas'], (fora.tags || []).includes('dia-inteiro') ? 2 : 4, fora.area, { incluir: [fora.id], evitar: [...usados], modo: 'driving' });
        titulo = 'Um dia em ' + (fora.nome.match(/\(([^)]+)\)$/) ? fora.nome.match(/\(([^)]+)\)$/)[1] : fora.nome); dm = 'driving';
      } else {
        const inc = perto.splice(0, 2).map(x => x.id);
        paradas = this.sugerirDia(tags, 6, 'Copenhague', { incluir: inc, evitar: [...usados], modo, vez: k });
      }
      paradas.forEach(x => usados.add(x.pontoId));
      dias.push({ data, titulo, modo: dm, paradas });
    });
    const sobrou = longe.concat(perto).map(x => x.nome);
    const obs = [sobrou.length ? 'Também pediram: ' + sobrou.join(', ') + '.' : '', p.obs ? 'Do pedido: ' + p.obs : ''].filter(Boolean).join('\n');
    const sub = (datas.length > 1 ? datas.length + ' dias em Copenhague' : modo === 'bicycling' ? 'Um dia de bicicleta em Copenhague' : 'Um dia em Copenhague') + (comCri ? ' – com crianças' : '');
    return this.novo({ cliente: { nome: p.nome || '', chave: p.clienteChave || '', whats: p.whats || '' }, ini: p.ini || '', fim: p.fim || '', modo, subtitulo: sub, dias, obs, pedidoId: p.id, tags });
  },
  /* de um passeio dela (as paradas com texto e coordenada; o bike em família tem as 16) */
  doPasseio(tourId, c) {
    const t = typeof Tours !== 'undefined' ? Tours.get(tourId) : null; if (!t) return null;
    const txt = (x) => (x && (x.pt || x.en)) || (typeof x === 'string' ? x : '');
    const areas = { copenhague: ['Copenhague'], arredores: ['Arredores', 'Dinamarca'], suecia: ['Suécia'] }[t.region] || null;
    const paradas = (t.stops || []).map(s => {
      const nome0 = txt(s.n).trim(), opc = /\(opcional\)/i.test(nome0), nome = nome0.replace(/\s*\(opcional\)\s*/i, '').trim();
      const b = rtAchaNoBanco(nome, rtTemCoord(s) ? s : null, areas);
      const { frase, texto } = rtPartir(txt(s.d));
      const x = { nome, frase, texto, opcional: opc };
      if (s.ph) x.foto = s.ph;
      if (b) x.pontoId = b.id; else if (rtTemCoord(s)) { x.lat = s.lat; x.lng = s.lng; }
      return x;
    }).filter(x => x.nome);
    const tipo = { bike: 'bicycling', carro: 'driving', day: 'driving', transfer: 'driving' }[t.type] || 'walking';
    return this.novo(Object.assign({ subtitulo: txt(t.name), modo: tipo, dias: [{ titulo: '', paradas }], passeioId: t.id }, c || {}));
  },
};
/* um lugar do banco com esse nome (ou a menos de 300 m), na região do passeio */
function rtAchaNoBanco(nome, coord, areas) {
  if (typeof Pontos === 'undefined') return null;
  const GEN = new Set(['castelo', 'castle', 'igreja', 'church', 'museu', 'museum', 'parque', 'park', 'jardim', 'garden', 'palacio', 'palace', 'centro', 'praca', 'pracas', 'porto', 'historia', 'vista', 'trilha', 'torre', 'fabrica', 'estadio', 'ponte', 'cidade', 'bairro', 'salao', 'saloes', 'reais', 'real', 'joias', 'coroa', 'dia', 'jogo', 'volta', 'retorno', 'nacional', 'primeiro', 'novo', 'nova']);
  const pal = (s) => rtNorm(s).split(' ').filter(w => w.length > 2);
  const tw = new Set(pal(nome)), tSig = [...tw].filter(w => !GEN.has(w));
  const todos = Pontos.todos().filter(b => !areas || !areas.length || areas.includes(b.area));
  /* nome principal igual (4), nome principal contém o da parada (3), o mesmo com o nome entre parênteses (2, 1) */
  const nota = (b) => {
    const principal = b.nome.replace(/\s*\([^)]*\)\s*/g, ' '), outros = (b.nome.match(/\(([^)]+)\)/g) || []).map(x => x.slice(1, -1));
    const f = (pt) => { const bw = pal(pt); return bw.length > 0 && bw.every(w => tw.has(w)); };
    const rv = (pt) => { const bw = pal(pt); return tSig.length > 0 && tSig.every(w => bw.includes(w)); };
    return f(principal) ? 4 : rv(principal) ? 3 : outros.some(f) ? 2 : outros.some(rv) ? 1 : 0;
  };
  const l = todos.map(b => [nota(b), b]).filter(([n]) => n > 0);
  if (l.length) {
    const top = Math.max(...l.map(([n]) => n)), melhores = l.filter(([n]) => n === top).map(([, b]) => b);
    if (melhores.length === 1 || !coord) return melhores.sort((a, b) => a.nome.length - b.nome.length)[0];
    return melhores.map(b => [rtTemCoord(b) ? rtDist(b, coord) : 1e9, b]).sort((a, b) => a[0] - b[0])[0][1];
  }
  if (coord) { const m = todos.filter(rtTemCoord).map(b => [rtDist(b, coord), b]).sort((a, b) => a[0] - b[0])[0]; if (m && m[0] < 0.3) return m[1]; }
  return null;
}
window.Roteiro = Roteiro;

/* ---------- o mapa (Leaflet só quando precisa) ---------- */
let _rtLeaf = null;
function rtLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (_rtLeaf) return _rtLeaf;
  _rtLeaf = new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('o mapa demorou demais')), 10000);
    let css = document.getElementById('rtLeafCss');
    const cssPronto = new Promise(r => {
      if (!css) { css = document.createElement('link'); css.id = 'rtLeafCss'; css.rel = 'stylesheet'; css.href = RT_CDN + 'leaflet.min.css'; css.onload = r; css.onerror = r; document.head.appendChild(css); }
      else r();
    });
    const s = document.createElement('script'); s.src = RT_CDN + 'leaflet.min.js'; s.async = true;
    const jsPronto = new Promise((r, e) => { s.onload = r; s.onerror = () => e(new Error('o mapa não carregou')); });
    document.head.appendChild(s);
    Promise.all([cssPronto, jsPronto]).then(() => { clearTimeout(t); window.L && window.L.map ? ok(window.L) : falha(new Error('o mapa não carregou')); }, (e) => { clearTimeout(t); falha(e); });
  });
  _rtLeaf.catch(() => { _rtLeaf = null; });
  return _rtLeaf;
}
/* pontos de um trecho para o mapa: [lat, lng, número, tipo] (tipo: 'ant' = de onde vem, 'opc' = opcional) */
function rtPontosMapa(t) {
  const l = [];
  if (t.anterior && rtTemCoord(t.anterior)) l.push([+t.anterior.lat, +t.anterior.lng, t.anteriorN, 'ant']);
  t.paradas.forEach((p, k) => { if (rtTemCoord(p)) l.push([+p.lat, +p.lng, t.de + k, p.opcional ? 'opc' : '']); });
  return l;
}
async function rtMapas(raiz) {
  const els = [...(raiz || document).querySelectorAll('.rt-map[data-pts]:not([data-feito])')];
  if (!els.length) return 0;
  els.forEach(el => { el.dataset.feito = '1'; });
  let L;
  try { L = await rtLeaflet(); } catch (e) { els.forEach(el => el.remove()); return 0; }
  let n = 0;
  for (const el of els) {
    if (!el.isConnected) continue;
    try {
      const pts = JSON.parse(el.dataset.pts || '[]').filter(p => isFinite(p[0]) && isFinite(p[1]));
      if (!pts.length) { el.remove(); continue; }
      const m = L.map(el, { zoomControl: false, attributionControl: true, scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, keyboard: false, zoomSnap: 0.25, fadeAnimation: false, zoomAnimation: false });
      m.attributionControl.setPrefix(false);
      const camada = L.tileLayer(RT_TILES, { maxZoom: 19, attribution: '© OpenStreetMap' });
      let carregou = 0; camada.on('tileload', () => { carregou++; el.classList.add('ok'); });
      camada.on('loading', () => el.classList.remove('pronto')); camada.on('load', () => el.classList.add('pronto'));
      camada.addTo(m);
      const ll = pts.map(p => [p[0], p[1]]);
      if (ll.length > 1) L.polyline(ll, { color: '#E4572E', weight: 3.5, opacity: 0.95, dashArray: '7 7', interactive: false }).addTo(m);
      pts.forEach(p => L.marker([p[0], p[1]], { interactive: false, keyboard: false,
        icon: L.divIcon({ className: 'rt-mki', html: `<span class="rt-mk ${p[3] || ''}">${esc(String(p[2]))}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(m));
      if (ll.length === 1) m.setView(ll[0], 15); else m.fitBounds(ll, { padding: [28, 28], maxZoom: 16 });
      el.style.setProperty('--rt-wtela', el.clientWidth + 'px');
      el._rtMapa = m;
      /* sem nenhum pedaço do mapa em 12 s: some o mapa, fica o link */
      setTimeout(() => { if (!carregou && el.isConnected) el.classList.add('falhou'); }, 12000);
      camada.on('tileerror', () => { setTimeout(() => { if (!carregou && el.isConnected) el.classList.add('falhou'); }, 4000); });
      n++;
    } catch (e) { el.remove(); }
  }
  return n;
}
/* espera os pedaços do mapa chegarem (para imprimir) */
function rtMapasProntos(raiz, ms) {
  const fim = Date.now() + (ms || 8000);
  return new Promise(ok => { const olha = () => {
    const els = [...(raiz || document).querySelectorAll('.rt-map')];
    const pronto = els.every(el => el.classList.contains('falhou') || el.classList.contains('pronto'));
    if (pronto || Date.now() > fim) ok(pronto); else setTimeout(olha, 200); }; olha(); });
}
window.rtMapas = rtMapas;

/* ---------- o documento (a arte dela) ---------- */
const _rtIc = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
const RT_IC = {
  bicycling: _rtIc + '<circle cx="5.5" cy="16" r="3.5"/><circle cx="18.5" cy="16" r="3.5"/><path d="M5.5 16l4-7h6l3 7M9.5 9L12 16h-6.5M14 6h2.5l-1 3"/></svg>',
  walking: _rtIc + '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 3 3v3M9 12.5l1.5-5 3 1.5 2 3.5 2.5 1M10.5 7.5L7 10v3"/></svg>',
  driving: _rtIc + '<path d="M5 16.5V11l1.8-4.2A2 2 0 0 1 8.6 5.5h6.8a2 2 0 0 1 1.8 1.3L19 11v5.5M5 11h14M5 16.5h14v1.8a.7.7 0 0 1-.7.7h-1.6a.7.7 0 0 1-.7-.7v-1.8M7 16.5v1.8a.7.7 0 0 1-.7.7H5.7a.7.7 0 0 1-.7-.7v-1.8"/></svg>',
  transit: _rtIc + '<rect x="5" y="3.5" width="14" height="13" rx="2.5"/><path d="M5 10.5h14M8.5 20l1.5-3.5M15.5 20L14 16.5"/><circle cx="8.5" cy="13.5" r=".9" fill="currentColor"/><circle cx="15.5" cy="13.5" r=".9" fill="currentColor"/></svg>',
  mapa: _rtIc + '<path d="M9 4.5L3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5l-6-2Z"/><path d="M9 4.5v13M15 6.5v13"/></svg>',
};
function rtCss() {
  if (document.getElementById('rtCss')) return;
  const s = document.createElement('style'); s.id = 'rtCss';
  s.textContent = `
  .rtDoc{--rt-lar:#F28C4B;--rt-ver:#E4572E;--rt-ink:#202020;--rt-ink2:#4a4a4a;--rt-ink3:#8b8b8b;font-family:"Karla",-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--rt-ink);-webkit-print-color-adjust:exact;print-color-adjust:exact;line-height:1.4}
  .rtDoc *{box-sizing:border-box}
  .rtDoc p,.rtDoc h1,.rtDoc h2,.rtDoc h3,.rtDoc figure{margin:0}
  .rt-pages{width:210mm;margin:0 auto}
  .rt-pg{width:210mm;height:297mm;background:#fff;position:relative;overflow:hidden;margin:0 auto 22px;box-shadow:0 22px 60px -30px rgba(0,0,0,.55)}
  .rt-pg .rt-in{position:absolute;left:15mm;right:15mm;top:15mm;bottom:13mm}
  .rt-pg.um .rt-in{top:6mm}
  .rt-pg:not(.um)::before{content:"";position:absolute;inset:8mm;border:1.3px solid var(--rt-ver);pointer-events:none;z-index:2}
  .rt-pe{position:absolute;left:0;right:0;bottom:3.2mm;text-align:center;font-size:7.5px;letter-spacing:.26em;text-transform:uppercase;color:#8f877e}
  .rt-b{display:flow-root;margin:0 0 6mm}
  .rt-b-map{margin-top:-2mm}
  .rt-medir{position:absolute;left:-12000px;top:0;visibility:hidden;pointer-events:none}
  /* a faixa laranja da primeira página */
  .rt-topo{margin:0 -9mm}
  .rt-faixa{background:var(--rt-lar);color:#fff;text-align:center;padding:9mm 12mm 31mm}
  .rt-faixa h1{font:400 44px/1.08 "Karla",-apple-system,sans-serif;letter-spacing:-.005em;color:#fff}
  .rt-sub{font:italic 500 15.5px/1.4 "Playfair Display",Georgia,serif;margin-top:7px!important}
  .rt-para{font-size:9.5px;letter-spacing:.28em;text-transform:uppercase;margin-top:9px!important;opacity:.95;font-weight:600}
  .rt-polas-topo{display:flex;justify-content:center;align-items:flex-start;gap:4.5mm;margin:-25mm 2mm 0;position:relative}
  .rt-polas-topo .rt-pola{width:41mm;height:32mm}
  .rt-polas-topo .rt-pola:nth-child(2){width:45mm;height:35mm;margin-top:-3mm}
  .rt-polas-topo .rt-pola:nth-child(3){margin-top:2mm}
  .rt-polas-topo .rt-pola:nth-child(4){width:43mm;height:33mm;margin-top:-1mm}
  /* polaroide */
  .rt-pola{background:#fff;padding:2mm;box-shadow:0 6px 14px -4px rgba(0,0,0,.38),0 0 0 .4px rgba(0,0,0,.18);transform:rotate(var(--r,0deg));flex:none}
  .rt-pola img{display:block;width:100%;height:100%;object-fit:cover}
  .rt-pola.rt-selo span{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#262b47}
  .rt-pola.rt-selo img{width:auto;height:94%;object-fit:contain}
  .rt-polas{display:flex;gap:6mm;justify-content:flex-end;padding:1.5mm 2mm 0;margin:0 0 6mm}
  .rt-polas .rt-pola{width:47mm;height:35mm}
  .rt-txt.rt-v1{display:grid;grid-template-columns:1fr 52mm;gap:4mm 8mm;align-items:start}
  .rt-txt.rt-v1 .rt-polas{flex-direction:column;align-items:center;justify-content:flex-start;gap:5mm;margin:0;grid-column:2;grid-row:1}
  .rt-txt.rt-v1 .rt-cols{grid-column:1;grid-row:1;column-count:1}
  .rt-lado{display:grid;grid-template-columns:1fr 92mm;gap:0 8mm;align-items:stretch}
  .rt-lado.inv{grid-template-columns:92mm 1fr}.rt-lado.inv .rt-lado-txt{order:2}
  .rt-lado-txt{padding-top:2mm}
  .rt-lado-map{display:flex;flex-direction:column;min-width:0}
  .rt-lado-map .rt-mapbox{flex:1;display:flex;flex-direction:column}
  .rt-lado-map .rt-map{flex:1;min-height:66mm;height:auto}
  .rt-lado-polas{display:flex;gap:4mm;justify-content:flex-end;margin:0 0 -10mm;padding:0 3mm;position:relative;z-index:3}
  .rt-lado.inv .rt-lado-polas{justify-content:flex-start}
  .rt-lado-polas .rt-pola{width:35mm;height:26mm}
  /* as paradas */
  .rt-cols{column-count:2;column-gap:11mm}
  .rt-cols.um{column-count:1}
  .rt-st{break-inside:avoid;page-break-inside:avoid;padding:0 0 4.4mm;display:block}
  .rt-st h3{display:flex;gap:3mm;align-items:baseline;font:600 14.5px/1.3 "Karla",-apple-system,sans-serif;color:#1c1c1c;margin:0 0 2.2mm}
  .rt-st h3 .n{flex:none;min-width:6.5mm}
  .rt-st h3 small{font-weight:400;font-size:12.5px;color:var(--rt-ink2)}
  .rt-st .hr{display:block;font-size:9.5px;letter-spacing:.2em;font-weight:700;color:var(--rt-ver);margin:-1mm 0 1.6mm 9.5mm}
  .rt-st .fr{font:italic 500 12.8px/1.45 "Playfair Display",Georgia,serif;color:#2a2a2a;margin:0 0 2mm 9.5mm}
  .rt-st .tx{font-size:12.2px;line-height:1.5;color:#363636;margin-left:9.5mm}
  .rt-st.opc h3 .n{color:var(--rt-ink3)}
  /* o mapa e o link do trecho */
  .rt-map{height:82mm;border:1px solid #e3dccf;background:#efeae1;position:relative;z-index:0;overflow:hidden}
  .rt-map.falhou{display:none}
  .rt-map .leaflet-control-attribution{font-size:8px;background:rgba(255,255,255,.78)}
  .rt-ml{display:flex;flex-wrap:wrap;gap:1.6mm 5mm;align-items:center;margin-top:2.4mm;font-size:11.5px;color:#444}
  .rt-ml a{color:var(--rt-ver);text-decoration:underline;text-underline-offset:2px;font-weight:600}
  .rt-ml .km{display:inline-flex;gap:1.6mm;align-items:center;font-weight:600;color:#333}
  .rt-ml svg{width:15px;height:15px;flex:none}
  .rt-mki{background:none!important;border:0!important}
  .rt-mk{display:block;width:24px;height:24px;border-radius:50%;background:#F28C4B;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);font:700 11.5px/20px "Karla",-apple-system,sans-serif;text-align:center}
  .rt-mk.ant{background:#8f8f8f}
  .rt-mk.opc{background:#fff;color:#E4572E;border-color:#F28C4B}
  /* cabeçalho de cada dia, dicas e o fim */
  .rt-dia{border-bottom:1.5px solid var(--rt-lar);padding:0 0 3mm}
  .rt-dia small{display:block;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--rt-ver);font-weight:700}
  .rt-dia h2{font:600 21px/1.2 "Karla",-apple-system,sans-serif;margin:1.4mm 0 1mm}
  .rt-dia .km{font-size:11.5px;color:#555;display:flex;gap:1.6mm;align-items:center}.rt-dia .km svg{width:15px;height:15px}
  .rt-obs{background:#FDF1E8;border-left:3px solid var(--rt-lar);padding:4mm 5mm}
  .rt-obs h3{font:700 10.5px/1.2 "Karla",sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--rt-ver);margin:0 0 2mm}
  .rt-obs p{font-size:12.2px;line-height:1.55}
  .rt-fim{display:flex;gap:4mm;align-items:center;justify-content:center;color:#555;font-size:11.5px;text-align:left}
  .rt-fim img{width:13mm;height:13mm;border-radius:50%;flex:none}
  .rt-fim b{display:block;font:italic 600 16px "Playfair Display",Georgia,serif;color:#222}
  /* no celular do cliente: o mesmo conteúdo, em coluna */
  .rtFlow{max-width:190mm;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 18px 50px -30px rgba(0,0,0,.5);padding-bottom:6px}
  .rtFlow .rt-b{margin:0 18px 24px}
  .rtFlow .rt-b-topo{margin:0 0 22px}
  .rtFlow .rt-b-map{margin-top:-8px}
  .rtFlow .rt-topo{margin:0}
  .rtFlow .rt-faixa{padding:30px 18px 70px}
  .rtFlow .rt-faixa h1{font-size:clamp(31px,8.6vw,44px)}
  .rtFlow .rt-polas-topo{margin:-52px 10px 0;gap:8px}
  .rtFlow .rt-polas-topo .rt-pola,.rtFlow .rt-polas-topo .rt-pola:nth-child(n){flex:1 1 0;min-width:0;max-width:150px;width:auto;height:auto;aspect-ratio:4/3;padding:5px;margin-top:0}
  .rtFlow .rt-polas-topo .rt-pola:nth-child(2){margin-top:-8px}
  .rtFlow .rt-polas{justify-content:center;padding:4px 0 0;gap:12px;margin-bottom:18px}
  .rtFlow .rt-polas .rt-pola{flex:1 1 0;min-width:0;max-width:170px;width:auto;height:auto;aspect-ratio:4/3;padding:5px}
  .rtFlow .rt-txt.rt-v1{display:block}
  .rtFlow .rt-txt.rt-v1 .rt-polas{flex-direction:row;align-items:flex-start;margin:0 0 18px}
  .rtFlow .rt-cols{column-count:1}
  .rtFlow .rt-st{padding-bottom:18px}
  .rtFlow .rt-st h3{font-size:17px}.rtFlow .rt-st .fr{font-size:15px}.rtFlow .rt-st .tx{font-size:15px;line-height:1.55}
  .rtFlow .rt-st h3{gap:8px}.rtFlow .rt-st h3 .n{min-width:24px}
  .rtFlow .rt-st .fr,.rtFlow .rt-st .tx,.rtFlow .rt-st .hr{margin-left:32px}
  .rtFlow .rt-map{height:250px;border-radius:12px}
  .rtFlow .rt-ml{font-size:14px;gap:10px 14px}
  .rtFlow .rt-ml a{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border:1.5px solid var(--rt-ver);border-radius:99px;text-decoration:none;background:#fff}
  .rtFlow .rt-dia h2{font-size:22px}.rtFlow .rt-obs p{font-size:15px}
  @media(min-width:700px){.rtFlow .rt-cols{column-count:2;column-gap:36px}.rtFlow .rt-map{height:330px}}
  /* o editor (painel) */
  .rtLista .linha{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .rtLista .linha .tx{flex:1;min-width:200px}.rtLista .linha small{display:block;color:var(--ink-3)}
  .rtEd .frow{display:flex;gap:10px;flex-wrap:wrap}.rtEd .frow .fld{flex:1;min-width:170px}
  .rtEd textarea,.rtPa textarea{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical;min-height:0}
  .rtEd input[type=checkbox],.rtPa input[type=checkbox],.rtTags input[type=checkbox]{width:auto;padding:0;margin:0}
  .rtDiaEd{display:grid;gap:10px;margin-top:14px}
  .rtDiaCab{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .rtDiaCab b{font-family:var(--f-display);font-size:18px;min-width:64px}
  .rtDiaCab input[type=date]{width:auto;flex:0 0 170px}.rtDiaCab .rtDT{flex:1;min-width:200px}.rtDiaCab select{width:auto;flex:0 0 auto}
  .rtResumo{font-size:var(--fs-3);color:var(--ink-2);display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center}
  .rtResumo a{color:var(--accent);font-weight:600}
  .rtAcoes{display:flex;gap:8px;flex-wrap:wrap}
  .rtParadas{list-style:none;padding:0;margin:0;display:grid;gap:8px}
  .rtPa{border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--surface);display:grid;gap:7px}
  .rtPa.opc{border-style:dashed;background:var(--surface-2)}
  .rtPa.quebra{border-top:3px solid #F28C4B}
  .rtPaCab{display:flex;gap:8px;align-items:center}
  .rtPaN{flex:none;width:28px;height:28px;border-radius:50%;background:#D9652A;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:13px}
  .rtPaFoto{flex:none;width:58px;height:44px;border-radius:7px;overflow:hidden;background:var(--surface-2);font-size:10px;color:var(--ink-3);border:1px dashed var(--line-2)}
  .rtPaFoto img{width:100%;height:100%;object-fit:cover;display:block}
  .rtPaCab .rtPaNome{flex:1;font-weight:600}
  .rtPaBt{display:flex;gap:4px;flex:none}
  .rtPaOp{display:flex;gap:6px 16px;flex-wrap:wrap;align-items:center;font-size:var(--fs-3);color:var(--ink-2)}
  .rtPaOp label{display:flex;gap:6px;align-items:center}
  .rtPaOp .rtHora input{width:84px;padding:5px 8px}
  .rtFotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:6px;max-height:240px;overflow:auto;padding:4px;background:var(--surface-2);border-radius:10px}
  .rtFotos button{height:54px;border-radius:6px;overflow:hidden;border:2px solid transparent;background:var(--surface);font-size:11px;color:var(--ink-3)}
  .rtFotos button.on{border-color:#F28C4B}
  .rtFotos img{width:100%;height:100%;object-fit:cover;display:block}
  .rtAdd{position:relative;display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start}
  .rtAdd .rtBusca{flex:1;min-width:220px}
  .rtRes{position:absolute;left:0;right:0;top:46px;z-index:20;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 14px 34px -14px rgba(0,0,0,.4);max-height:330px;overflow:auto}
  .rtRes:empty{display:none}
  .rtRes button{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
  .rtRes button:hover,.rtRes button:focus{background:var(--surface-2)}
  .rtRes img,.rtRes .sf{width:44px;height:34px;object-fit:cover;border-radius:5px;flex:none;background:var(--surface-2)}
  .rtRes small{display:block;color:var(--ink-3);font-size:12px}
  .rtBox{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface-2);display:grid;gap:8px}
  .rtTags{display:flex;gap:6px;flex-wrap:wrap}
  .rtTags button{padding:6px 12px;border-radius:99px;background:var(--surface);border:1px solid var(--line);font-size:var(--fs-3);font-weight:600;color:var(--ink-2)}
  .rtTags button.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}
  .rtSugLista{margin:0;padding-left:22px;font-size:var(--fs-3);color:var(--ink-2)}
  .rtMapaEd .rt-map{height:230px;border-radius:12px}
  .rtLinkBox{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .rtLinkBox input{flex:1;min-width:220px;font-size:12px}
  .rtBarra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;max-width:210mm;margin:0 auto 14px}
  .rtDica{text-align:center;max-width:210mm;margin:4px auto 10px}
  .rtBanco summary{cursor:pointer;font-weight:600}
  .rtBanco ul{columns:2 240px;margin:8px 0 0;padding-left:18px;font-size:var(--fs-3);color:var(--ink-2)}
  @media print{
    .rtFlow{box-shadow:none;border-radius:0;max-width:none}
    .rtFlow .rt-b{break-inside:auto}
    .rtFlow .rt-st,.rtFlow .rt-b-map,.rtFlow .rt-pola,.rtFlow .rt-dia{break-inside:avoid;page-break-inside:avoid}
    .rtFlow .rt-map{width:var(--rt-wtela,100%);max-width:100%}
    .rtFlow .rt-ml a{border:0;padding:0;text-decoration:underline}
  }`;
  document.head.appendChild(s);
}
const rtMd = (s) => esc(s || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
const rtPola = (src, rot) => `<figure class="rt-pola" style="--r:${rot}deg"><img src="${esc(src)}" alt="" decoding="async"></figure>`;
const RT_ROT = [-4, 3.5, -1.5, 4, -3, 2];
function rtTopoHtml(r, fotos) {
  const para = [r.cliente && r.cliente.nome ? 'Para ' + r.cliente.nome : '', rtPeriodo(r)].filter(Boolean).join(' · ');
  return `<header class="rt-topo"><div class="rt-faixa"><h1>${esc(r.titulo || RT_TITULO)}</h1>${r.subtitulo ? `<p class="rt-sub">${esc(r.subtitulo)}</p>` : ''}${para ? `<p class="rt-para">${esc(para)}</p>` : ''}</div>
    <div class="rt-polas-topo"><figure class="rt-pola rt-selo" style="--r:-4deg"><span><img src="arte/selo-mari-circ.png" alt="Tour na Dinamarca"></span></figure>${fotos.map((f, k) => rtPola(f, [5, 0, 4][k] || 0)).join('')}</div></header>`;
}
function rtParadaHtml(p, n) {
  return `<article class="rt-st${p.opcional ? ' opc' : ''}"><h3><span class="n">${n}.</span><span>${esc(p.nome)}${p.opcional ? ' <small>(opcional)</small>' : ''}</span></h3>
    ${p.hora ? `<span class="hr">${esc(p.hora)}</span>` : ''}${p.frase ? `<p class="fr">${esc(p.frase)}</p>` : ''}${p.texto ? `<p class="tx">${esc(p.texto)}</p>` : ''}</article>`;
}
function rtTxtHtml(paradas, de, fotos, variante) {
  const v = fotos.length && variante === 1 ? 1 : 0;
  const polas = fotos.length ? `<div class="rt-polas">${fotos.map((f, k) => rtPola(f, RT_ROT[(de + k) % RT_ROT.length])).join('')}</div>` : '';
  return `<section class="rt-txt rt-v${v}">${polas}<div class="rt-cols ${paradas.length < 2 ? 'um' : ''}">${paradas.map((p, k) => rtParadaHtml(p, de + k)).join('')}</div></section>`;
}
function rtMapBlocoHtml(t, modo, semMapa) {
  const pts = rtPontosMapa(t), links = rtLinksTrechoDet(t, modo);
  if (!pts.length && !links.length) return '';
  const perc = rtPercurso([t.anterior].concat(t.paradas).filter(rtTemCoord), modo), M = RT_MODOS[modo] || RT_MODOS.walking;
  const km = pts.length > 1 ? `<span class="km">${RT_IC[modo] || ''}~${rtTempo(perc.minutos)} · ${rtKm(perc.km)} ${M.nome}</span>` : '';
  return `<div class="rt-mapbox">${semMapa || !pts.length ? '' : `<div class="rt-map" data-pts="${esc(JSON.stringify(pts))}"></div>`}
    <p class="rt-ml">${km}${links.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${links.length > 1 ? `Google Maps (${x.de} → ${x.ate})` : 'Abrir este trecho no Google Maps'}</a>`).join('')}</p></div>`;
}
/* o trecho lado a lado (texto | mapa, as polaroides por cima do canto do mapa), como na pág. 3 do PDF dela */
function rtLadoHtml(paradas, de, fotos, t, modo, inv) {
  const mb = rtMapBlocoHtml(t, modo, false);
  const polas = fotos.length ? `<div class="rt-lado-polas">${fotos.slice(0, 2).map((f, k) => rtPola(f, RT_ROT[(de + k + 1) % RT_ROT.length])).join('')}</div>` : '';
  return `<section class="rt-lado ${inv ? 'inv' : ''}"><div class="rt-lado-txt"><div class="rt-cols um">${paradas.map((p, k) => rtParadaHtml(p, de + k)).join('')}</div></div>
    <div class="rt-lado-map">${polas}${mb}</div></section>`;
}
function rtDiaHtml(r, d, k) {
  const modo = rtModo(r, d), perc = rtPercurso(d.paradas, modo), n = d.paradas.length;
  const cab = [r.dias.length > 1 ? 'Dia ' + (k + 1) : '', rtDataLonga(d.data)].filter(Boolean).join(' · ');
  return `<div class="rt-dia">${cab ? `<small>${esc(cab)}</small>` : ''}${d.titulo ? `<h2>${esc(d.titulo)}</h2>` : ''}
    <span class="km">${RT_IC[modo] || ''}${n} parada${n === 1 ? '' : 's'}${perc.km > 0 ? ` · ~${rtKm(perc.km)} · ~${rtTempo(perc.minutos)} ${RT_MODOS[modo].nome}` : ''}</span></div>`;
}
function rtFimHtml() {
  const st = DB.settings || {}, nome = (typeof guiaNome === 'function' && guiaNome()) || 'Mari', neg = (typeof guiaNegocio === 'function' && guiaNegocio()) || 'Tour na Dinamarca';
  const whats = st.whats ? 'WhatsApp ' + st.whats : '', insta = st.insta ? '@' + String(st.insta).replace(/^@/, '') : '';
  return `<div class="rt-fim"><img src="arte/selo-mari-circ.png" alt=""><div><b>Boa viagem!</b><span>Qualquer dúvida no caminho, me chame. — ${esc(nome)} · ${esc(neg)}${whats || insta ? '<br>' + esc([whats, insta].filter(Boolean).join(' · ')) : ''}</span></div></div>`;
}
/* os blocos do documento, na ordem; o A4 e o celular usam os mesmos */
function rtBlocos(r, opts) {
  opts = opts || {};
  const B = [], usadas = new Set();
  const todas = r.dias.flatMap(d => d.paradas);
  const topo = [...new Set(todas.map(p => p.foto).filter(Boolean))].slice(0, 3); topo.forEach(f => usadas.add(f));
  B.push({ k: 'topo', html: rtTopoHtml(r, topo) });
  let sec = 0;
  r.dias.forEach((d, di) => {
    const modo = rtModo(r, d);
    if (r.dias.length > 1 || d.titulo || d.data) B.push({ k: 'dia', novaPagina: di > 0, html: rtDiaHtml(r, d, di) });
    if (!d.paradas.length) return;
    rtTrechos(d).forEach(t => {
      const fotos = sec === 0 ? [] : [...new Set(t.paradas.map(p => p.foto).filter(f => f && !usadas.has(f)))].slice(0, t.paradas.length > 2 ? 3 : 2); fotos.forEach(f => usadas.add(f));
      const variante = sec++ % 2 === 1 && fotos.length <= 2 ? 1 : 0;
      const mh = rtMapBlocoHtml(t, modo, opts.semMapa);
      const lado = mh && !opts.semMapa && rtPontosMapa(t).length ? rtLadoHtml(t.paradas, t.de, fotos, t, modo, sec % 2 === 0) : '';
      B.push({ k: 'txt', html: rtTxtHtml(t.paradas, t.de, fotos, variante), paradas: t.paradas, de: t.de, fotos, variante, lado });
      if (mh) B.push({ k: 'map', html: mh });
    });
  });
  if (r.obs) B.push({ k: 'obs', html: `<div class="rt-obs"><h3>Dicas da ${esc((typeof guiaNome === 'function' && guiaNome()) || 'Mari')}</h3><p>${rtMd(r.obs)}</p></div>` });
  B.push({ k: 'fim', html: rtFimHtml() });
  return B;
}
const rtEmBloco = (b) => `<div class="rt-b rt-b-${b.k}">${b.html}</div>`;
/* monta as páginas A4: mede cada bloco e vai enchendo a folha (o texto de um trecho fica junto do seu mapa) */
async function rtPaginas(r, alvo) {
  rtCss();
  let okL = false; try { await rtLeaflet(); okL = true; } catch (e) {}
  const blocos = rtBlocos(r, { semMapa: !okL });
  try { await Promise.race([document.fonts && document.fonts.ready, new Promise(ok => setTimeout(ok, 1500))]); } catch (e) {}
  const med = document.createElement('div'); med.className = 'rtDoc rt-medir';
  med.innerHTML = '<div class="rt-pages"><div class="rt-pg"><div class="rt-in"></div></div></div>'; document.body.appendChild(med);
  const inn = med.querySelector('.rt-in'), mm = inn.getBoundingClientRect().width / 180;
  const capUm = (297 - 6 - 13) * mm, cap = (297 - 15 - 13) * mm, gap = 6 * mm;
  const alt = (b) => { inn.innerHTML = rtEmBloco(b); const el = inn.firstElementChild; const cs = getComputedStyle(el); return el.getBoundingClientRect().height + Math.max(0, parseFloat(cs.marginTop) || 0) + gap; };
  /* grupos que andam juntos: o cabeçalho do dia com o 1º trecho; o texto de um trecho com o seu mapa */
  const grupos = [];
  for (let i = 0; i < blocos.length; i++) {
    const g = [blocos[i]];
    if (blocos[i].k === 'dia' && blocos[i + 1] && blocos[i + 1].k === 'txt') g.push(blocos[++i]);
    if (g[g.length - 1].k === 'txt' && blocos[i + 1] && blocos[i + 1].k === 'map') g.push(blocos[++i]);
    grupos.push(g);
  }
  const base = 82 * mm, MIN = 58 * mm;          /* o mapa pode encolher até ~58 mm para o trecho caber na folha */
  const H = (b) => (b._h === undefined ? (b._h = alt(b)) : b._h) + (b.k === 'map' && b.mapPx ? b.mapPx - base : 0);
  const altG = (g) => g.reduce((t, b) => t + H(b), 0);
  const folga = (g) => g.filter(b => b.k === 'map').reduce((t, b) => t + (b.mapPx || base) - MIN, 0);
  const encolhe = (g, falta) => { for (const m of g.filter(b => b.k === 'map')) { const t = Math.min((m.mapPx || base) - MIN, falta); if (t > 0) { m.mapPx = (m.mapPx || base) - t; falta -= t; } } };
  const pags = [[]]; let livre = capUm;
  const nova = () => { pags.push([]); livre = cap; };
  const vazia = () => !pags[pags.length - 1].length;
  const poe = (g) => { g.forEach(b => pags[pags.length - 1].push(b)); livre -= altG(g); };
  for (let gi = 0; gi < grupos.length; gi++) {
    const g = grupos[gi];
    if (g[0].k === 'dia' && g[0].novaPagina && !vazia()) nova();
    let h = altG(g);
    if (h <= livre) { poe(g); continue; }
    if (!vazia()) {
      /* 1) o mapa do próprio trecho encolhe um pouco */
      if (h - livre <= folga(g) && h - livre <= 30 * mm) { encolhe(g, h - livre); poe(g); continue; }
      /* 2) o trecho lado a lado (texto | mapa) cabe no resto da folha */
      const tx = g.find(b => b.k === 'txt');
      if (tx && tx.lado && g.some(b => b.k === 'map')) { const gl = g.filter(b => b.k === 'dia').concat([{ k: 'lado', html: tx.lado }]); if (altG(gl) <= livre) { poe(gl); continue; } }
      /* 3) as dicas e o "boa viagem" não ficam sozinhos numa folha: os mapas desta folha cedem o espaço */
      if (g.every(b => b.k === 'obs' || b.k === 'fim')) { const f = pags[pags.length - 1]; if (h - livre <= folga(f) && h - livre <= 45 * mm) { encolhe(f, h - livre); livre = h; poe(g); continue; } }
      nova(); h = altG(g);
    }
    if (h <= livre) { poe(g); continue; }
    if (h - livre <= folga(g)) { encolhe(g, h - livre); poe(g); continue; }
    /* nem numa folha inteira: divide as paradas do trecho em duas partes */
    const k = g.findIndex(b => b.k === 'txt' && b.paradas.length > 1);
    if (k >= 0) {
      const b = g[k], meio = Math.ceil(b.paradas.length / 2), pa = b.paradas.slice(0, meio), pc = b.paradas.slice(meio);
      const A = { k: 'txt', html: rtTxtHtml(pa, b.de, b.fotos, b.variante), paradas: pa, de: b.de, fotos: b.fotos, variante: b.variante };
      const C = { k: 'txt', html: rtTxtHtml(pc, b.de + meio, [], 0), paradas: pc, de: b.de + meio, fotos: [], variante: 0 };
      grupos.splice(gi, 1, g.slice(0, k).concat([A]), [C].concat(g.slice(k + 1))); gi--; continue;
    }
    poe(g);
  }
  pags.forEach(p => p.forEach((b, j) => { if (b.k === 'map' && b.mapPx) p[j] = Object.assign({}, b, { html: b.html.replace('<div class="rt-map"', `<div class="rt-map" style="height:${Math.round(b.mapPx)}px"`) }); }));
  med.remove();
  const neg = (typeof guiaNegocio === 'function' && guiaNegocio()) || 'Tour na Dinamarca';
  alvo.innerHTML = `<div class="rt-pages">${pags.filter(p => p.length).map((p, k, l) => `<div class="rt-pg ${k === 0 ? 'um' : ''}"><div class="rt-in">${p.map(rtEmBloco).join('')}</div>
    <div class="rt-pe">${esc(neg)} · ${esc(r.num || '')} · ${k + 1}/${l.length}</div></div>`).join('')}</div>`;
  /* a folha que sobrou espaço: os mapas crescem e ocupam (mais fáceis de ler, a folha fica cheia como a dela) */
  const folhas = [...alvo.querySelectorAll('.rt-pg')];
  folhas.forEach((pg, k) => {
    const inn = pg.querySelector('.rt-in'), mapas = [...inn.querySelectorAll('.rt-b-map .rt-map')], ult = inn.lastElementChild;
    if (!mapas.length || !ult) return;
    let sobra = inn.clientHeight - (ult.getBoundingClientRect().bottom - inn.getBoundingClientRect().top) - 2 * mm;
    if (k === folhas.length - 1) sobra = Math.min(sobra, 22 * mm);
    const cada = Math.min(sobra / mapas.length, 60 * mm);
    if (cada > 3 * mm) mapas.forEach(m => { m.style.height = (m.getBoundingClientRect().height + cada) + 'px'; });
  });
  rtEscala(alvo);
  await rtMapas(alvo);
  return pags.length;
}
/* no celular a folha A4 inteira cabe na tela (na impressão volta ao tamanho real) */
function rtEscala(alvo) {
  const p = alvo && alvo.querySelector('.rt-pages'); if (!p) return;
  const w = alvo.clientWidth - 4, a4 = p.offsetWidth || 794;
  p.style.zoom = a4 > 0 && w < a4 ? String(Math.max(0.3, w / a4)) : '';
}
function rtPaginaCss(liga) {
  let s = document.getElementById('rtPgCss');
  if (!liga) { if (s) s.remove(); document.body.classList.remove('rt-doc-on'); return; }
  document.body.classList.add('rt-doc-on');
  if (s) return;
  s = document.createElement('style'); s.id = 'rtPgCss';
  s.textContent = `@media print{
    @page{size:A4;margin:0}
    html,body{background:#fff!important;margin:0!important;padding:0!important}
    body.rt-doc-on > *:not(#app){display:none!important}
    body.rt-doc-on .rtBarra,body.rt-doc-on .rtDica{display:none!important}
    body.rt-doc-on .rtDocWrap{padding:0!important;background:#fff!important;min-height:0!important}
    body.rt-doc-on .rt-pages{zoom:1!important;width:210mm}
    body.rt-doc-on .rt-pg{margin:0!important;box-shadow:none!important;break-after:page;page-break-after:always}
    body.rt-doc-on .rt-pg:last-child{break-after:auto;page-break-after:auto}
  }`;
  document.head.appendChild(s);
}
addEventListener('hashchange', () => { if (!/^#\/adm\/roteirodoc\//.test(location.hash)) rtPaginaCss(false); });

/* ---------- o link do cliente (#/ro/…) ---------- */
ROTAS_EXTRA['ro'] = (partes) => abrePublico(partes, (obj) => {
  rtCss();
  const r = Roteiro.expande(obj);
  const html = `<div class="rtDoc rtFlow" id="rtPub">${rtBlocos(r).map(rtEmBloco).join('')}</div>`;
  paginaPublica(`${r.titulo}${r.cliente.nome ? ' - ' + r.cliente.nome : ''}`, html, {
    rodape: 'Qualquer dúvida no caminho, fale com a ' + ((typeof guiaNome === 'function' && guiaNome()) || 'Mari') + ' no WhatsApp.',
    waTexto: `Oi, Mari! Estou vendo o roteiro${r.num ? ' ' + r.num : ''}.` });
  rtMapas(document.getElementById('rtPub'));
});
addEventListener('beforeprint', () => { document.querySelectorAll('.rtFlow .rt-map').forEach(el => { if (el._rtMapa) try { el._rtMapa.invalidateSize({ pan: false }); } catch (e) {} }); });

/* ---------- a aba Roteiros ---------- */
function admRoteiros(arg) {
  rtCss();
  if (arg) return admRoteiroEditar(decodeURIComponent(arg));
  const l = Roteiro.all().slice().sort((a, b) => String(b.criado).localeCompare(String(a.criado)));
  const pedidos = (DB.pedidos || []).slice(0, 8);
  const passeios = (typeof Tours !== 'undefined' ? Tours.all() : []).filter(t => (t.stops || []).length);
  const meus = Pontos.meus();
  const porArea = PONTOS_AREAS.map(a => [a, Pontos.todos().filter(p => p.area === a)]).filter(([, x]) => x.length);
  admShell('roteiros', `
    <div class="pagehead"><h1 class="pageh">Roteiros</h1><div class="chips"><button class="cta sm" id="rtNovo">+ Novo roteiro</button></div></div>
    <p class="why">No modelo do seu "Roteiro Personalizado": faixa laranja, fotos em polaroide, paradas numeradas e o mapa de cada trecho com o link do Google Maps. Você monta por dia, o app organiza o caminho, e sai em <b>PDF</b> e em <b>link</b> para o celular do cliente.</p>
    <section class="card rtLista">${l.length ? l.map(r => { const [c, n] = RT_ST[r.status] || RT_ST.rascunho; const np = r.dias.reduce((s, d) => s + d.paradas.length, 0);
      return `<div class="linha"><div class="tx"><b>${esc(r.num)} · ${esc(r.cliente.nome || 'sem cliente')}</b><small>${esc([r.subtitulo, rtPeriodo(r)].filter(Boolean).join(' · ') || r.titulo)} · ${r.dias.length} dia(s) · ${np} parada(s)</small></div>
        <span class="pill ${c}">${n}</span><a class="mini" href="#/adm/roteiros/${encodeURIComponent(r.id)}">Abrir</a><button class="mini" data-dup="${esc(r.id)}">Duplicar</button><button class="mini ghost" data-del="${esc(r.id)}" aria-label="Apagar">×</button></div>`; }).join('')
      : '<p class="empty">Nenhum roteiro ainda. Comece do zero, de um pedido do Personalize ou de um passeio seu.</p>'}</section>
    ${pedidos.length ? `<section class="card"><h3>Montar a partir de um pedido do "Personalize"</h3><p class="why">O app cria os dias do período e já sugere as paradas pelos gostos do cliente (e encaixa as ideias para as crianças que ele marcou).</p>
      <div class="rtLista">${pedidos.map(p => { const ja = Roteiro.all().find(r => r.pedidoId === p.id);
        return `<div class="linha"><div class="tx"><b>${esc(p.nome || 'sem nome')}</b><small>${esc([p.quando || [p.ini, p.fim].filter(Boolean).join(' → '), p.pessoas ? p.pessoas + ' pessoa(s)' : '', (p.gostos || []).join(', '), (p.kidsTxt || []).join(', ')].filter(Boolean).join(' · '))}</small></div>
        ${ja ? `<a class="mini" href="#/adm/roteiros/${encodeURIComponent(ja.id)}">Abrir ${esc(ja.num)}</a>` : `<button class="mini" data-ped="${esc(p.id)}">Montar roteiro</button>`}</div>`; }).join('')}</div></section>` : ''}
    ${passeios.length ? `<section class="card"><h3>Começar de um passeio seu</h3><p class="why">As paradas do passeio entram com os seus textos; depois é só ajustar para o cliente.</p>
      <div class="frow" style="display:flex;gap:8px;flex-wrap:wrap"><select id="rtPas" style="flex:1;min-width:220px">${passeios.map(t => `<option value="${esc(t.id)}" ${t.id === 'bike-familia' ? 'selected' : ''}>${esc(tl(t.name))} (${t.stops.length} paradas)</option>`).join('')}</select><button class="mini" id="rtPasBt">Criar o roteiro</button></div></section>` : ''}
    <section class="card rtBanco"><h3>Lugares</h3><p class="why">${window.PONTOS_MARI.length} lugares já vêm com foto, frase e texto${meus.length ? ` + ${meus.length} seus` : ''}. Um lugar novo que você cria num roteiro pode ficar guardado aqui para a próxima vez.</p>
      ${meus.length ? `<div class="rtLista">${meus.map(p => `<div class="linha"><div class="tx"><b>${esc(p.nome)}</b><small>${esc([p.area, p.frase].filter(Boolean).join(' · '))}${rtTemCoord(p) ? '' : ' · sem mapa'}</small></div><button class="mini ghost" data-pdel="${esc(p.id)}" aria-label="Tirar">×</button></div>`).join('')}</div>` : ''}
      <details><summary>Ver todos os lugares do app</summary>${porArea.map(([a, x]) => `<p class="tfGrupo" style="margin:10px 0 0">${esc(a)} (${x.length})</p><ul>${x.map(p => `<li>${esc(p.nome)}</li>`).join('')}</ul>`).join('')}</details></section>`);
  $('#rtNovo').onclick = () => { const r = Roteiro.novo({}); go('/adm/roteiros/' + r.id); };
  $$('[data-dup]').forEach(b => b.onclick = () => { const r = Roteiro.duplica(b.dataset.dup); toast('Duplicado: ' + r.num); go('/adm/roteiros/' + r.id); });
  $$('[data-del]').forEach(b => b.onclick = () => { const r = Roteiro.get(b.dataset.del); if (r && confirm(`Apagar o ${r.num}${r.cliente.nome ? ' (' + r.cliente.nome + ')' : ''}?`)) { Roteiro.remove(r.id); admRoteiros(); } });
  $$('[data-ped]').forEach(b => b.onclick = () => { const r = Roteiro.doPedido(b.dataset.ped); if (r) { toast(`${r.num}: ${r.dias.length} dia(s) montados — confira e ajuste`); go('/adm/roteiros/' + r.id); } });
  $$('[data-pdel]').forEach(b => b.onclick = () => { const p = Pontos.get(b.dataset.pdel); if (p && confirm(`Tirar "${p.nome}" dos seus lugares? (os roteiros que já usam continuam iguais)`)) { Pontos.remove(p.id); admRoteiros(); } });
  if ($('#rtPasBt')) $('#rtPasBt').onclick = () => { const r = Roteiro.doPasseio($('#rtPas').value); if (r) { toast(`${r.num} criado com ${r.dias[0].paradas.length} paradas`); go('/adm/roteiros/' + r.id); } };
}
const RT_SUG_TAGS = ['criancas', 'bike', 'chuva', 'historia', 'realeza', 'arte', 'arquitetura', 'natureza', 'comida', 'gratis', 'compras', 'vida-local'];
const rtEdEstado = { sug: {}, vez: {}, novo: {}, mapa: {}, foto: {} };
function rtOptsModo(cur, herda) {
  return (herda ? `<option value="">como o roteiro (${esc(RT_MODOS[herda].curto)})</option>` : '') + Object.entries(RT_MODOS).map(([k, m]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${esc(m.curto.replace(/^./, c => c.toUpperCase()))}</option>`).join('');
}
function rtParadaEdHtml(p, k, n, idDia) {
  const comC = rtTemCoord(p), aberta = rtEdEstado.foto[p.id];
  return `<li class="rtPa ${p.opcional ? 'opc' : ''} ${k > 0 && p.quebra ? 'quebra' : ''}" data-pa="${esc(p.id)}">
    <div class="rtPaCab"><span class="rtPaN">${k + 1}</span><button type="button" class="rtPaFoto" data-foto title="Trocar a foto">${p.foto ? `<img src="${esc(p.foto)}" alt="">` : 'sem foto'}</button>
      <input class="rtPaNome" data-pf="nome" value="${esc(p.nome)}" aria-label="Nome da parada">
      <span class="rtPaBt"><button type="button" class="mini" data-mv="-1" ${k === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button type="button" class="mini" data-mv="1" ${k === n - 1 ? 'disabled' : ''} aria-label="Descer">↓</button><button type="button" class="mini ghost" data-tira aria-label="Tirar">×</button></span></div>
    ${aberta ? `<div class="rtFotos">${['', ...Pontos.fotos()].map(f => `<button type="button" data-ft="${esc(f)}" class="${f === p.foto ? 'on' : ''}">${f ? `<img src="${esc(f)}" alt="" loading="lazy">` : 'sem foto'}</button>`).join('')}</div>` : ''}
    <input data-pf="frase" value="${esc(p.frase)}" placeholder="Frase em itálico (uma linha)" aria-label="Frase em itálico" style="font-style:italic">
    <textarea data-pf="texto" rows="2" placeholder="O texto da parada" aria-label="Texto">${esc(p.texto)}</textarea>
    <div class="rtPaOp"><label><input type="checkbox" data-pf="opcional" ${p.opcional ? 'checked' : ''}> opcional</label>
      ${k > 0 ? `<label><input type="checkbox" data-pf="quebra" ${p.quebra ? 'checked' : ''}> mapa novo a partir daqui</label>` : ''}
      <label class="rtHora">horário <input data-pf="hora" value="${esc(p.hora)}" placeholder="10:00" inputmode="numeric"></label>
      ${comC ? `<a class="why" href="https://www.google.com/maps/search/?api=1&query=${rtLL(p)}" target="_blank" rel="noopener">ver no mapa</a>` : '<span class="pill warn">sem mapa</span>'}</div>
  </li>`;
}
function rtDiaEdHtml(r, d, k) {
  const modo = rtModo(r, d), perc = rtPercurso(d.paradas, modo), links = Roteiro.mapsLinks(d, modo), ts = rtTrechos(d);
  const sug = rtEdEstado.sug[d.id], nv = rtEdEstado.novo[d.id], mp = rtEdEstado.mapa[d.id];
  const tagsSel = (sug && sug.tags) || r.tags || [];
  return `<section class="card rtDiaEd" data-dia="${esc(d.id)}">
    <div class="rtDiaCab"><b>Dia ${k + 1}</b><input type="date" data-df="data" value="${esc(d.data)}" aria-label="Data do dia">
      <input class="rtDT" data-df="titulo" value="${esc(d.titulo)}" placeholder="Título do dia (opcional)" aria-label="Título do dia">
      <select data-df="modo" aria-label="Como vão">${rtOptsModo(d.modo, r.modo)}</select>
      ${r.dias.length > 1 ? '<button type="button" class="mini ghost" data-dtira aria-label="Tirar o dia">×</button>' : ''}</div>
    <div class="rtResumo">${d.paradas.length ? `<span><b>${d.paradas.length}</b> parada(s)${perc.km > 0 ? ` · ~${rtKm(perc.km)} · ~${rtTempo(perc.minutos)} ${RT_MODOS[modo].nome}` : ''}${ts.length > 1 ? ` · ${ts.length} mapas` : ''}</span>` : '<span>Dia vazio: procure os lugares abaixo ou peça uma sugestão.</span>'}
      ${links.map((u, j) => `<a href="${esc(u)}" target="_blank" rel="noopener">Google Maps${links.length > 1 ? ' ' + (j + 1) : ''}</a>`).join('')}</div>
    <div class="rtAcoes">${d.paradas.length > 2 ? '<button type="button" class="mini" data-org>Organizar pelo caminho</button>' : ''}
      <button type="button" class="mini" data-sug>${sug ? 'Fechar a sugestão' : 'Sugerir um dia'}</button>
      ${d.paradas.some(rtTemCoord) ? `<button type="button" class="mini" data-vermapa>${mp ? 'Esconder o mapa' : 'Ver no mapa'}</button>` : ''}</div>
    ${sug ? `<div class="rtBox" data-sugbox>
      <div class="rtTags">${RT_SUG_TAGS.map(t => `<button type="button" data-tg="${t}" class="${tagsSel.includes(t) ? 'on' : ''}">${esc(Pontos.rotuloTag(t))}</button>`).join('')}</div>
      <div class="frow" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select data-sarea style="width:auto">${PONTOS_AREAS.map(a => `<option ${((sug && sug.area) || 'Copenhague') === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
        <select data-sn style="width:auto">${[5, 6, 7].map(x => `<option value="${x}" ${((sug && sug.n) || 6) === x ? 'selected' : ''}>${x} paradas</option>`).join('')}</select>
        <button type="button" class="mini" data-sugfaz>${sug.lista ? 'Outra sugestão' : 'Sugerir'}</button></div>
      ${sug.lista ? (sug.lista.length ? `<ol class="rtSugLista">${sug.lista.map(p => `<li>${esc(p.nome)}</li>`).join('')}</ol>
        <div class="frow" style="display:flex;gap:8px;flex-wrap:wrap">${d.paradas.length ? '<button type="button" class="cta sm" data-sugtroca>Trocar as paradas do dia por estas</button><button type="button" class="mini" data-sugjunta>Juntar no fim</button>' : '<button type="button" class="cta sm" data-sugjunta>Pôr no dia</button>'}</div>`
        : '<p class="why">Não achei lugares com esses gostos nessa região. Tire um gosto ou mude a região.</p>') : ''}
    </div>` : ''}
    ${mp ? `<div class="rtMapaEd"><div class="rt-map" data-pts="${esc(JSON.stringify(d.paradas.map((p, j) => rtTemCoord(p) ? [+p.lat, +p.lng, j + 1, p.opcional ? 'opc' : ''] : null).filter(Boolean)))}"></div></div>` : ''}
    <ol class="rtParadas">${d.paradas.map((p, j) => rtParadaEdHtml(p, j, d.paradas.length, d.id)).join('')}</ol>
    <div class="rtAdd"><input class="rtBusca" data-busca placeholder="Procurar um lugar: nome, ou crianças, chuva, comida…" aria-label="Procurar um lugar" autocomplete="off"><div class="rtRes" data-res></div>
      <button type="button" class="mini" data-novo>${nv ? 'Fechar' : '+ Lugar novo'}</button></div>
    ${nv ? `<div class="rtBox" data-novobox>
      <div class="frow"><label class="fld">Nome do lugar<input data-nf="nome" value="${esc(nv.nome || '')}" placeholder="Ex.: Café Atelier September"></label>
        <label class="fld">Região<select data-nf="area">${PONTOS_AREAS.map(a => `<option ${(nv.area || 'Copenhague') === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label></div>
      <label class="fld">Link do Google Maps (para o mapa e o caminho)<input data-nf="link" value="${esc(nv.link || '')}" placeholder="Cole o link do lugar no Google Maps" inputmode="url"></label>
      <small class="why" data-nfcoord>${rtNovoCoordTxt(nv.link)}</small>
      <label class="fld">Frase em itálico<input data-nf="frase" value="${esc(nv.frase || '')}" placeholder="Uma linha que dá vontade de ir"></label>
      <label class="fld">Texto<textarea data-nf="texto" rows="2" placeholder="Uma ou duas frases: o que fazer ali">${esc(nv.texto || '')}</textarea></label>
      <div class="rtTags" data-nftags>${RT_SUG_TAGS.map(t => `<button type="button" data-ntg="${t}" class="${(nv.tags || []).includes(t) ? 'on' : ''}">${esc(Pontos.rotuloTag(t))}</button>`).join('')}</div>
      <label class="fld chk"><input type="checkbox" data-nf="guardar" ${nv.guardar === false ? '' : 'checked'}> Guardar nos meus lugares para usar de novo</label>
      <div><button type="button" class="cta sm" data-nfok>Pôr no dia</button></div></div>` : ''}
  </section>`;
}
function rtNovoCoordTxt(link) {
  if (!link) return 'Sem link o lugar entra no roteiro, só sem mapa.';
  const c = rtCoordsDoLink(link);
  if (c) return `Achei o lugar no mapa: ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
  if (rtLinkCurto(link)) return 'Esse é um link curto (maps.app.goo.gl): abra no navegador e copie o endereço completo, o que tem @55,… — ou cole as coordenadas (ex.: 55.6761, 12.5683).';
  return 'Não achei a coordenada nesse link. Copie o endereço completo do lugar no Google Maps (o que tem @55,…).';
}
function admRoteiroEditar(id) {
  rtCss();
  const r = Roteiro.get(id);
  if (!r) { admShell('roteiros', '<a class="mini" href="#/adm/roteiros">← roteiros</a><h1 class="pageh">Roteiro não encontrado</h1>'); return; }
  const clientes = (typeof Clients !== 'undefined' ? Clients.all() : []).map(c => c.name).filter(Boolean);
  const periodo = rtDiasDoPeriodo(r.ini, r.fim).filter(Boolean);
  const faltaDias = periodo.length > 1 && periodo.length !== r.dias.length;
  admShell('roteiros', `
    <a class="mini" href="#/adm/roteiros">← roteiros</a>
    <div class="pagehead"><h1 class="pageh">${esc(r.num)}${r.cliente.nome ? ' · ' + esc(r.cliente.nome) : ''}</h1>
      <div class="chips"><select id="rtSt" aria-label="Situação" style="width:auto">${Object.keys(RT_ST).map(k => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${RT_ST[k][1]}</option>`).join('')}</select>
        <button class="cta sm" id="rtVer">Ver o documento / PDF</button></div></div>
    <section class="card rtEd" id="rtEd">
      <div class="frow"><label class="fld">Cliente<input id="rtCli" list="rtCliL" value="${esc(r.cliente.nome)}" placeholder="nome do cliente ou da família"><datalist id="rtCliL">${clientes.map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>
        <label class="fld">WhatsApp do cliente<input id="rtWa" value="${esc(r.cliente.whats || '')}" placeholder="+55 11 9…" inputmode="tel"></label></div>
      <div class="frow"><label class="fld">Título (na faixa laranja)<input id="rtTit" value="${esc(r.titulo)}"></label>
        <label class="fld" style="flex:2">Subtítulo<input id="rtSub" value="${esc(r.subtitulo)}" placeholder="Um dia de bicicleta em Copenhagen – com crianças"></label></div>
      <div class="frow"><label class="fld">Chegam em<input type="date" id="rtIni" value="${esc(r.ini)}"></label><label class="fld">Voltam em<input type="date" id="rtFim" value="${esc(r.fim)}"></label>
        <label class="fld">Como vão (o roteiro todo)<select id="rtModo">${rtOptsModo(r.modo)}</select></label></div>
      ${faltaDias ? `<div class="frow" style="align-items:center"><span class="why">O período tem ${periodo.length} dias e o roteiro tem ${r.dias.length}.</span><button type="button" class="mini" id="rtDiasPer">Montar os ${periodo.length} dias</button></div>` : ''}
      <label class="fld">Dicas no fim do roteiro (opcional)<textarea id="rtObs" rows="2" placeholder="Ex.: aluguel de bicicleta infantil na Donkey Republic; levar capa de chuva…">${esc(r.obs)}</textarea></label>
      <div class="frow" style="align-items:center;gap:8px"><button type="button" class="mini" id="rtLink">Link para o cliente</button><button type="button" class="mini" id="rtWaBt">Mandar no WhatsApp</button>
        <span class="why">O link abre no celular do cliente, com os mapas e o botão de salvar em PDF.</span></div>
      <div id="rtLinkOut"></div>
    </section>
    ${r.dias.map((d, k) => rtDiaEdHtml(r, d, k)).join('')}
    <div style="margin:14px 0 30px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="mini" id="rtAddDia">+ Dia</button><button type="button" class="cta sm" id="rtVer2">Ver o documento / PDF</button></div>`);
  rtLigarEditor(r);
}
/* lê a tela inteira e grava (sem redesenhar) — chamado antes de qualquer ação */
function rtLeTela(r) {
  const ed = document.getElementById('rtEd'); if (!ed || !Roteiro.get(r.id)) return r;
  const v = (sel) => { const el = document.querySelector(sel); return el ? el.value : undefined; };
  const nome = (v('#rtCli') || '').trim(), mesmo = rtNorm(nome) === rtNorm(r.cliente.nome);
  const cli = { nome, chave: mesmo ? r.cliente.chave : '', whats: (v('#rtWa') || '').trim() };
  const dias = r.dias.map(d => {
    const el = document.querySelector(`[data-dia="${CSS.escape(d.id)}"]`); if (!el) return d;
    const g = (f) => el.querySelector(`[data-df="${f}"]`);
    const paradas = d.paradas.map(p => {
      const pe = el.querySelector(`[data-pa="${CSS.escape(p.id)}"]`); if (!pe) return p;
      const q = (f) => pe.querySelector(`[data-pf="${f}"]`);
      return Object.assign({}, p, { nome: q('nome').value.trim() || p.nome, frase: q('frase').value.trim(), texto: q('texto').value.trim(), hora: q('hora').value.trim(), opcional: q('opcional').checked, quebra: q('quebra') ? q('quebra').checked : false });
    });
    return Object.assign({}, d, { data: g('data').value, titulo: g('titulo').value.trim(), modo: g('modo').value, paradas });
  });
  return Roteiro.atualiza(r.id, { cliente: cli, titulo: v('#rtTit'), subtitulo: (v('#rtSub') || '').trim(), ini: v('#rtIni'), fim: v('#rtFim'), modo: v('#rtModo'), obs: v('#rtObs') || '', dias });
}
function rtLigarEditor(r0) {
  const id = r0.id;
  const R = () => Roteiro.get(id);
  const grava = () => rtLeTela(R());
  const redesenha = (foco) => { const y = scrollY; admRoteiroEditar(id); scrollTo(0, y); if (foco) { const el = document.querySelector(foco); if (el) el.focus(); } };
  const diaDe = (el) => { const de = el.closest('[data-dia]'); return de ? R().dias.find(d => d.id === de.dataset.dia) : null; };
  /* grava sozinho: ao sair de um campo, e um pouco depois de parar de digitar */
  let tempo = null;
  const stage = document.getElementById('stage');
  stage.addEventListener('change', (e) => { if (e.target.matches('#rtEd input, #rtEd select, #rtEd textarea, [data-df], [data-pf]')) { clearTimeout(tempo); grava(); if (e.target.matches('[data-pf="opcional"], [data-pf="quebra"], [data-df="modo"], #rtModo, #rtIni, #rtFim')) redesenha(); } });
  stage.addEventListener('input', (e) => { if (e.target.matches('#rtEd input, #rtEd textarea, [data-df], [data-pf]')) { clearTimeout(tempo); tempo = setTimeout(grava, 700); } });
  $('#rtSt').onchange = (e) => { grava(); Roteiro.atualiza(id, { status: e.target.value }); toast('Situação: ' + RT_ST[e.target.value][1]); };
  $('#rtVer').onclick = $('#rtVer2').onclick = () => { grava(); Roteiro.abrirDoc(id); };
  $('#rtAddDia').onclick = () => { grava(); Roteiro.addDia(id); redesenha(); };
  if ($('#rtDiasPer')) $('#rtDiasPer').onclick = () => {
    const r = grava(); const datas = rtDiasDoPeriodo(r.ini, r.fim);
    const dias = datas.map((data, k) => Object.assign({}, r.dias[k] || { titulo: '', modo: '', paradas: [] }, { data }));
    const sobram = r.dias.slice(datas.length).flatMap(d => d.paradas);
    if (sobram.length && dias.length) dias[dias.length - 1].paradas = dias[dias.length - 1].paradas.concat(sobram);
    Roteiro.atualiza(id, { dias }); redesenha();
  };
  $('#rtLink').onclick = async () => {
    grava(); const url = await Roteiro.linkCliente(id);
    $('#rtLinkOut').innerHTML = `<div class="rtLinkBox"><input readonly value="${esc(url)}" aria-label="Link do cliente"><button type="button" class="mini" id="rtCopia">Copiar</button><a class="mini" href="${esc(url)}" target="_blank" rel="noopener">Abrir</a></div>`;
    $('#rtCopia').onclick = async () => { try { await navigator.clipboard.writeText(url); toast('Link copiado'); } catch (e) { $('#rtLinkOut input').select(); } };
  };
  $('#rtWaBt').onclick = async () => {
    grava(); const x = await Roteiro.manda(id);
    toast(x && x.copiado ? 'Mensagem com o link copiada — o cliente não tem WhatsApp aqui. Cole na conversa dele.' : 'Abrindo o WhatsApp do cliente');
    const st = $('#rtSt'); if (st) st.value = 'enviado';
  };
  /* cada dia */
  $$('[data-dia]').forEach(el => {
    const dId = el.dataset.dia;
    const q = (s) => el.querySelector(s);
    if (q('[data-dtira]')) q('[data-dtira]').onclick = () => { const d = diaDe(el); if (d.paradas.length && !confirm(`Tirar este dia e as ${d.paradas.length} paradas dele?`)) return; grava(); Roteiro.removeDia(id, dId); redesenha(); };
    if (q('[data-org]')) q('[data-org]').onclick = () => { grava(); const x = Roteiro.organizarDia(id, dId); redesenha(); toast(`Organizado: ~${rtKm(x.km)} (antes ~${rtKm(x.antes.km)}) · ~${rtTempo(x.minutos)}${x.semCoordenada ? ` · ${x.semCoordenada} sem mapa foram para o fim` : ''}`); };
    q('[data-sug]').onclick = () => { grava(); rtEdEstado.sug[dId] = rtEdEstado.sug[dId] ? null : { tags: (R().tags || []).slice(), area: 'Copenhague', n: 6 }; redesenha(); };
    if (q('[data-vermapa]')) q('[data-vermapa]').onclick = () => { rtEdEstado.mapa[dId] = !rtEdEstado.mapa[dId]; redesenha(); };
    q('[data-novo]').onclick = () => { grava(); rtEdEstado.novo[dId] = rtEdEstado.novo[dId] ? null : { area: 'Copenhague', tags: [], guardar: true }; redesenha(rtEdEstado.novo[dId] ? `[data-dia="${dId}"] [data-nf="nome"]` : null); };
    /* sugerir */
    const sb = q('[data-sugbox]');
    if (sb) {
      const S = rtEdEstado.sug[dId];
      sb.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { const i = S.tags.indexOf(b.dataset.tg); i < 0 ? S.tags.push(b.dataset.tg) : S.tags.splice(i, 1); b.classList.toggle('on', i < 0); });
      sb.querySelector('[data-sarea]').onchange = (e) => { S.area = e.target.value; };
      sb.querySelector('[data-sn]').onchange = (e) => { S.n = +e.target.value; };
      sb.querySelector('[data-sugfaz]').onclick = () => {
        const r = grava(); Roteiro.atualiza(id, { tags: S.tags.slice() });
        S.vez = S.lista ? (S.vez || 0) + 1 : 0;
        const outros = r.dias.filter(d => d.id !== dId).flatMap(d => d.paradas.map(p => p.pontoId)).filter(Boolean);
        const md = rtModo(r, r.dias.find(d => d.id === dId)), antes = (S.lista || []).map(p => p.pontoId);
        let l = Roteiro.sugerirDia(S.tags, S.n || 6, S.area, { evitar: outros.concat(antes), modo: md, vez: S.vez });
        if (l.length < 3) l = Roteiro.sugerirDia(S.tags, S.n || 6, S.area, { evitar: outros, modo: md, vez: S.vez });
        S.lista = l;
        redesenha();
      };
      const usa = (troca) => {
        grava(); const r = R(), d = r.dias.find(x => x.id === dId);
        const novas = S.lista.map(p => Roteiro.parada(p));
        Roteiro.atualiza(id, { dias: r.dias.map(x => x === d ? Object.assign({}, x, { paradas: (troca ? [] : x.paradas).concat(novas) }) : x) });
        rtEdEstado.sug[dId] = null; redesenha(); toast(`${novas.length} paradas no dia${troca ? '' : ' (no fim)'}`);
      };
      if (sb.querySelector('[data-sugtroca]')) sb.querySelector('[data-sugtroca]').onclick = () => usa(true);
      if (sb.querySelector('[data-sugjunta]')) sb.querySelector('[data-sugjunta]').onclick = () => usa(false);
    }
    /* procurar no banco (enquanto digita) */
    const bus = q('[data-busca]'), res = q('[data-res]');
    const mostra = () => {
      const t = bus.value.trim(); if (!t) { res.innerHTML = ''; return; }
      const d = diaDe(el), ja = new Set(d.paradas.map(p => p.pontoId).filter(Boolean));
      const l = Pontos.busca(t, { max: 8 });
      res.innerHTML = l.length ? l.map(p => `<button type="button" data-pt="${esc(p.id)}">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy">` : '<span class="sf"></span>'}<span><b>${esc(p.nome)}</b>${ja.has(p.id) ? ' <span class="pill ok">já está no dia</span>' : ''}<small>${esc([p.area, (p.tags || []).slice(0, 4).map(x => Pontos.rotuloTag(x)).join(', ')].filter(Boolean).join(' · '))}</small></span></button>`).join('')
        : `<button type="button" data-semres><span><b>Não achei "${esc(t)}"</b><small>Toque para criar como lugar novo</small></span></button>`;
      res.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { grava(); const p = Roteiro.addParada(id, dId, b.dataset.pt); redesenha(`[data-dia="${dId}"] [data-busca]`); toast(`${p.nome} entrou no dia`); });
      const sr = res.querySelector('[data-semres]'); if (sr) sr.onclick = () => { grava(); rtEdEstado.novo[dId] = { nome: t, area: 'Copenhague', tags: [], guardar: true }; redesenha(`[data-dia="${dId}"] [data-nf="link"]`); };
    };
    bus.addEventListener('input', mostra);
    bus.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const b = res.querySelector('button'); if (b) b.click(); } else if (e.key === 'Escape') { bus.value = ''; res.innerHTML = ''; } });
    /* lugar novo */
    const nb = q('[data-novobox]');
    if (nb) {
      const N = rtEdEstado.novo[dId];
      const lerN = () => { nb.querySelectorAll('[data-nf]').forEach(i => { N[i.dataset.nf] = i.type === 'checkbox' ? i.checked : i.value; }); };
      nb.addEventListener('input', () => { lerN(); const c = rtCoordsDoLink(N.link); nb.querySelector('[data-nfcoord]').textContent = rtNovoCoordTxt(N.link); if (c && c.nome && !N.nome) { N.nome = c.nome; nb.querySelector('[data-nf="nome"]').value = c.nome; } });
      nb.addEventListener('change', lerN);
      nb.querySelectorAll('[data-ntg]').forEach(b => b.onclick = () => { N.tags = N.tags || []; const i = N.tags.indexOf(b.dataset.ntg); i < 0 ? N.tags.push(b.dataset.ntg) : N.tags.splice(i, 1); b.classList.toggle('on', i < 0); });
      nb.querySelector('[data-nfok]').onclick = () => {
        lerN(); if (!String(N.nome || '').trim()) { toast('Falta o nome do lugar'); nb.querySelector('[data-nf="nome"]').focus(); return; }
        grava();
        const c = rtCoordsDoLink(N.link) || {};
        const lugar = { nome: N.nome.trim(), frase: (N.frase || '').trim(), texto: (N.texto || '').trim(), lat: c.lat, lng: c.lng, area: N.area || 'Copenhague', tags: N.tags || [], foto: '' };
        let x = lugar;
        if (N.guardar !== false) { const g = Pontos.salva(lugar); x = { pontoId: g.id }; }
        const p = Roteiro.addParada(id, dId, x);
        rtEdEstado.novo[dId] = null; redesenha(); toast(`${p.nome} entrou no dia${N.guardar !== false ? ' e ficou nos seus lugares' : ''}${rtTemCoord(p) ? '' : ' (sem mapa)'}`);
      };
    }
    /* cada parada */
    el.querySelectorAll('[data-pa]').forEach(pe => {
      const pId = pe.dataset.pa;
      pe.querySelector('[data-tira]').onclick = () => { grava(); Roteiro.removeParada(id, dId, pId); redesenha(); };
      pe.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { grava(); Roteiro.moveParada(id, dId, pId, +b.dataset.mv); redesenha(); });
      pe.querySelector('[data-foto]').onclick = () => { grava(); rtEdEstado.foto[pId] = !rtEdEstado.foto[pId]; redesenha(); };
      pe.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { grava(); Roteiro.atualizaParada(id, dId, pId, { foto: b.dataset.ft }); rtEdEstado.foto[pId] = false; redesenha(); });
    });
  });
  rtMapas(stage);
}
/* o documento em tela cheia, pronto para "Salvar como PDF" */
async function admRoteiroDoc(id) {
  rtCss();
  const r = Roteiro.get(decodeURIComponent(id || ''));
  if (!r) { go('/adm/roteiros'); return; }
  document.title = `Roteiro ${r.num} - ${r.cliente.nome || r.subtitulo || 'cliente'}`;
  rtPaginaCss(true);
  app.innerHTML = `<div class="rtDocWrap" style="padding:16px 8px;background:var(--paper);min-height:100vh">
    <div class="rtBarra"><a class="mini" href="#/adm/roteiros/${encodeURIComponent(r.id)}">← editar</a>
      <span style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini" id="rdLink">Copiar o link do cliente</button><button class="cta sm" id="rdPdf">Imprimir / Salvar em PDF</button></span></div>
    <p class="why rtDica">Montando as páginas…</p>
    <div id="rtPrint" class="rtDoc"></div>
    <p class="why rtDica">No "Imprimir", escolha <b>Salvar como PDF</b>, papel A4, sem margens. O arquivo sai com o nome do cliente.</p></div>`;
  $('#rdPdf').onclick = async () => { const b = $('#rdPdf'); b.disabled = true; await rtMapasProntos($('#rtPrint'), 6000); b.disabled = false; window.print(); };
  $('#rdLink').onclick = async () => { const url = await Roteiro.linkCliente(r.id); try { await navigator.clipboard.writeText(url); toast('Link do cliente copiado'); } catch (e) { prompt('Copie o link:', url); } };
  const alvo = $('#rtPrint');
  try { const n = await rtPaginas(r, alvo); const d = document.querySelector('.rtDica'); if (d) d.textContent = `${n} página(s) em A4 — o que você vê é o que sai no PDF.`; }
  catch (e) { alvo.innerHTML = `<div class="rtFlow">${rtBlocos(r, { semMapa: true }).map(rtEmBloco).join('')}</div>`; }
  addEventListener('afterprint', () => { document.title = 'Tour na Dinamarca — ' + ((typeof guiaNome === 'function' && guiaNome()) || 'Mari'); }, { once: true });
}
addEventListener('resize', () => { const a = document.getElementById('rtPrint'); if (a && a.querySelector('.rt-pages')) rtEscala(a); });

/* ---------- ligar no app ---------- */
STR.admRoteiros = { pt: 'Roteiros', en: 'Itineraries' };
if (!ADM_TABS.some(([id]) => id === 'roteiros')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'orcamentos');
  ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['roteiros', 'admRoteiros']);
}
const _viewAdmRt = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'roteiros') return admRoteiros(arg);
  if (tab === 'roteirodoc') return admRoteiroDoc(arg);
  return _viewAdmRt(tab, arg);
};
