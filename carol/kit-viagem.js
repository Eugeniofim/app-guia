/* =====================================================
   O KIT DA VIAGEM (27/10/2026) — contrato v1 dos apps da Ti Artes

   Quem reservou recebe UM link (ou PDF) com tudo: uma página só, "Sua viagem
   com a <guia>", com todos os tours do mesmo cliente em ordem de data. Cada
   tour traz o voucher (código), data/hora/duração, ponto de encontro com
   "abrir no mapa", o programa (paradas), incluso e não incluso, o que levar,
   o pagamento (pago, falta, restante no dia) e "pôr na minha agenda". Depois:
   as dicas da cidade (ela edita), as indicações dela (hotel, chip, seguro),
   presentes e roteiro quando o app tem, e o contato.

   Peças que este arquivo liga no app (o mesmo arquivo nos apps da família):
   - #/kt/<conteúdo> — o kit viaja dentro do link (publico.js). Sempre abre.
     É o formato que o servidor (função avisos) manda no e-mail do cliente.
   - #/k/<código> — o link CURTO e sempre atualizado: o kit fica na tabela
     <sala>.kits (LIGAR-KIT-*.sql); o cliente lê UM kit pelo código (função
     <sala>.kit), nunca a tabela; só a dona grava. Mudou a hora ou um
     pagamento → o app republica sozinho. Sem a tabela, sem banco ou sem
     login, cai no comprido (funciona, mas não se atualiza).
     O código de cada cliente mora em DB.kits = [{ id, chave, token, criado,
     publicado }] (privado: sobe pela tabela itens, nunca vai para o appstate).
   - Painel: #/adm/kit/<chave> — "Copiar link", "Mandar no WhatsApp", "Gerar
     PDF" (pdf.js) e as dicas da cidade. Botão "Kit da viagem" ao lado de
     cada "Voucher" (Reservas, ficha do cliente, aba Voucher).
   - settings.kitVersao = 1: avisa o servidor que este app abre o #/kt/.
   - "Avisar cliente": publica o kit antes (no máximo 5 s) — a confirmação
     do servidor leva o link curto.
   - Assistente: kit_viagem {cliente} → link + mensagem pronta (só lê).
   O que muda de um app para o outro (cores, dicas, palavras) mora no
   config.js, em APP_CONFIG.kit.

   Kit.dados(chave) · Kit.link(chave) → url · Kit.mensagem(chave) → texto
   Kit.abrir(chave) · Kit.urlConhecida(chave) (o curto, se já existe)
   NUNCA vai no kit o e-mail ou o telefone DO CLIENTE (é página pública).
   ===================================================== */
'use strict';

const KIT_CFG = Object.assign({
  artigo: 'a', servico: 'tour', servicos: 'tours', dicasTitulo: 'Dicas para a viagem', mapaCidade: '',
  dicas: [], levar: {}, mapaPorRegiao: {}, fusoPorRegiao: {}, cores: {}, sql: 'LIGAR-KIT.sql',
}, (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.kit) || {});

const kitGuia = () => (typeof guiaNome === 'function' && guiaNome()) || 'sua guia';
const kitComA = () => KIT_CFG.artigo + ' ' + kitGuia();                       /* "a Carol" */
const kitNeg = () => (typeof guiaNegocio === 'function' && guiaNegocio()) || kitGuia();
const kitFuso = () => (typeof GUIA_CFG !== 'undefined' && GUIA_CFG.fuso) || 'Europe/London';
const kitPt = (a) => !a ? '' : typeof a === 'string' ? a : String(a.pt || a.en || '');
const kitLista = (a) => (a && !Array.isArray(a) && (a.pt || a.en) ? (a.pt || a.en) : Array.isArray(a) ? a : []).map(s => String(s || '').trim()).filter(Boolean);
const kitDicas = () => (Array.isArray(DB.settings.kitDicas) ? DB.settings.kitDicas : KIT_CFG.dicas || []).map(x => String(x || '').trim()).filter(Boolean);
const kitChaveDe = (b) => String((b && (b.email || b.whats || b.name)) || '').toLowerCase();
const kitPrim = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const kitDig = (w) => String(w || '').replace(/\D/g, '');
const kitBase = () => Publico.base();
const kitCap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
function kitData(iso, opts) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', Object.assign({ weekday: 'long', day: 'numeric', month: 'long' }, opts || {}));
}
function kitPeriodo(sv) {
  if (!sv.length) return '';
  const a = sv[0].data, b = sv[sv.length - 1].data;
  const f = (iso, ano) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', Object.assign({ day: 'numeric', month: 'long' }, ano ? { year: 'numeric' } : {}));
  return a === b ? f(a, true) : f(a, false) + ' a ' + f(b, true);
}
/* "4h", "2h30", "4h ou 6h" → minutos (o primeiro número) */
function kitMinutos(txt) { const m = String(txt || '').match(/(\d+(?:[.,]\d+)?)\s*h\s*(\d{1,2})?/i); return m ? Math.round(parseFloat(m[1].replace(',', '.')) * 60) + (+m[2] || 0) : 0; }

/* as reservas do cliente que entram no kit: as que estão por vir (e as de ontem); se a viagem já passou, as 3 últimas */
function kitReservas(chave) {
  const todas = DB.bookings.filter(b => b.status === 'confirmed' && kitChaveDe(b) === chave)
    .sort((a, b) => ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')));
  const desde = addDays(isoToday(), -1), vivas = todas.filter(b => b.date >= desde);
  return vivas.length ? vivas : todas.slice(-3);
}
/* a hospedagem: a da reserva, senão a da ficha da pessoa (mesmo WhatsApp ou e-mail) */
function kitHotelDe(b) {
  if (b.hotel) return String(b.hotel);
  try {
    if (typeof fichasTodas !== 'function') return '';
    const d = kitDig(b.whats), e = String(b.email || '').toLowerCase();
    const f = fichasTodas().find(z => (d.length >= 8 && kitDig(z.whats) === d) || (e.includes('@') && String(z.email || '').toLowerCase() === e));
    return (f && f.hotel) || '';
  } catch (e) { return ''; }
}
/* o que levar: o bloco "o que levar" do voucher (quando o app tem o modelo editável), senão o do tipo de tour */
function kitLevar(x) {
  try {
    if (typeof voucherModelo === 'function') {
      const bl = (voucherModelo().blocos || []).find(z => z && z.k === 'levar' && z.ativo !== false);
      if (bl) return String(bl.texto || '').split('\n').map(l => l.trim().replace(/^[-•]\s*/, '')).filter(Boolean).slice(0, 8);
    }
  } catch (e) {}
  const L = KIT_CFG.levar || {};
  return (Array.isArray(L[x.type]) ? L[x.type] : (L.padrao || [])).slice(0, 8);
}
/* foto: caminho do app ou http(s); foto colada (data:) só se for pequena */
const kitFoto = (u) => { u = String(u || ''); return /^data:/.test(u) ? (u.length < 150000 ? u : '') : u; };
function kitServico(b) {
  const x = Tours.get(b.tourId) || {};
  const pago = Bookings.paid(b), restante = Bookings.due(b);
  const horas = +b.horas || 0;
  const online = x.region === 'online';
  const hotel = online ? '' : kitHotelDe(b);
  const s = {
    code: b.code, nome: kitPt(x.name) || b.tourName || 'Tour', tipo: x.type || '',
    data: b.date, hora: b.time || '', pessoas: +b.pax || 1,
    duracao: horas && typeof rotuloHoras === 'function' ? rotuloHoras(horas) : (x.duration || ''),
    durMin: horas ? Math.round(horas * 60) : (kitMinutos(x.duration) || 120),
    encontro: online ? 'Online, por chamada de vídeo (o link vai pelo WhatsApp)' : x.encontroAberto ? '' : kitPt(x.meeting),
    hotel, guia: kitGuia(), foto: kitFoto(x.photo),
    resumo: kitPt(x.tagline),
    paradas: (x.stops || []).map(p => { const d = kitPt(p && p.d); return { n: kitPt(p && p.n), d: d.length > 200 ? d.slice(0, d.lastIndexOf(' ', 190)) + '…' : d }; }).filter(p => p.n).slice(0, 12),
    inclui: kitLista(x.includes), naoInclui: kitLista(x.notIncludes),
    levar: online ? [] : kitLevar(x),
    pago, restante, cancel: kitPt(x.cancel),
  };
  if (x.pickup && hotel) s.buscaNoHotel = true;
  if (KIT_CFG.mapaPorRegiao && KIT_CFG.mapaPorRegiao[x.region]) s.cidade = KIT_CFG.mapaPorRegiao[x.region];
  const fz = (KIT_CFG.fusoPorRegiao && KIT_CFG.fusoPorRegiao[x.region]) || '';
  if (fz && fz !== kitFuso()) s.fuso = fz;
  if (restante > 0) {
    const sinal = b.policy === 'split' && typeof valorSinal === 'function' ? valorSinal(+b.total || 0, +b.depositPct || undefined) : 0;
    const saldoNoDia = typeof GUIA_CFG !== 'undefined' && GUIA_CFG.saldoNoDia;
    if (sinal > 0 && pago < sinal) s.sinal = Math.round((sinal - pago) * 100) / 100;
    if (saldoNoDia && b.policy === 'split' && !(s.sinal > 0)) s.noDia = true;
    else if (typeof Bookings.dueDate === 'function') { const v = Bookings.dueDate(b); if (v && v !== b.date) s.vence = v; }
  }
  return s;
}
/* indicações (hotel, chip, seguro): links de parceira DELA, fora do campo `parceiros` (que é de desconto) */
function kitIndicacoes() {
  if (typeof parceiros !== 'function') return [];
  return parceiros().map(p => {
    const dst = typeof parcDestino === 'function' ? parcDestino(p) : { href: (typeof linkExterno === 'function' && linkExterno(p.url)) || '', wa: false };
    return dst.href ? { titulo: String(p.titulo || ''), sub: String(p.sub || ''), url: dst.href, tipo: p.tipo || '', wa: !!dst.wa } : null;
  }).filter(Boolean).slice(0, 6);
}
/* presentes: os guias que o voucher já dá de presente (quando o app tem), com link público */
function kitBrindes() {
  try {
    if (typeof voucherModelo !== 'function' || !voucherModelo().presente || typeof ebooksLista !== 'function' || typeof ebookLinkPresente !== 'function') return [];
    return ebooksLista().filter(e => e.pronto).map(e => ({ titulo: e.titulo, url: ebookLinkPresente(e.id) }));
  } catch (e) { return []; }
}
/* o roteiro dela, se for desta pessoa e estiver publicado (só onde o cliente consegue abrir pelo código) */
function kitRoteiro(bs) {
  try {
    if (typeof itRoteiroPublico !== 'function' || !Array.isArray(DB.roteiros)) return '';
    const ds = new Set(bs.map(b => kitDig(b.whats)).filter(d => d.length >= 8)), es = new Set(bs.map(b => String(b.email || '').toLowerCase()).filter(e => e.includes('@')));
    const r = DB.roteiros.filter(z => z && z.codigo && z.status === 'publicado' && Array.isArray(z.dias) && z.dias.length
      && (ds.has(kitDig(z.whats)) || es.has(String(z.email || '').toLowerCase()))).pop();
    return r ? kitBase() + '#/r/' + encodeURIComponent(r.codigo) : '';
  } catch (e) { return ''; }
}
/* o kit inteiro (é ISTO que vai para o cliente: sem e-mail nem telefone dele) */
async function kitDados(chave) {
  const bs = kitReservas(chave); if (!bs.length) return null;
  const sv = bs.map(kitServico);
  const st = DB.settings;
  return { v: 1, nome: bs[0].name || '', periodo: kitPeriodo(sv), servicos: sv, dicas: kitDicas(), parceiros: [],
    brindes: kitBrindes(), roteiro: kitRoteiro(bs), indicacoes: kitIndicacoes(),
    whats: kitDig(st.whats), email: String(st.email || '').trim(), insta: String(st.insta || '').replace(/^@/, ''),
    negocio: kitNeg(), gerado: new Date().toISOString() };
}
/* o do link comprido: sem as descrições das paradas, sem foto colada e sem roteiro (link menor) */
function kitEnxuto(d) {
  const o = JSON.parse(JSON.stringify(d));
  o.servicos.forEach(s => { s.paradas = (s.paradas || []).map(p => ({ n: p.n })); if (/^data:/.test(s.foto || '')) s.foto = ''; });
  delete o.roteiro; return o;
}

/* ---------- o link: curto (tabela) ou comprido (dentro do link) ---------- */
function kitTokens() { if (!Array.isArray(DB.kits)) DB.kits = []; return DB.kits; }
const kitTokenDe = (chave) => (Array.isArray(DB.kits) ? DB.kits : []).find(k => k && k.chave === chave && k.token) || null;
function kitNovoToken() {
  const A = 'ACDEFGHJKMNPQRTUVWXYabcdefghjkmnpqrstuvwxyz34679', u = new Uint8Array(10);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(u) : u.forEach((_, i) => { u[i] = Math.random() * 256; });
  return [...u].map(n => A[n % A.length]).join('');
}
const kitPodeNuvem = () => typeof temNuvem === 'function' && temNuvem() && typeof isLoggedIn === 'function' && isLoggedIn() && !Kit.semTabela;
async function kitPublica(chave, dados) {
  if (!kitPodeNuvem()) return false;
  let t = kitTokenDe(chave);
  if (!t) { const tok = kitNovoToken(); t = { id: tok, chave, token: tok, criado: new Date().toISOString() }; kitTokens().push(t); save(); }
  try {
    const r = await supaFetch('kits', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ token: t.token, dados, atualizado_em: new Date().toISOString() }) });
    if (r.status === 404 || r.status === 400) { const j = await r.json().catch(() => ({})); if (/kits|relation|schema cache|PGRST205/i.test(JSON.stringify(j))) Kit.semTabela = true; return false; }
    if (!r.ok && r.status !== 201 && r.status !== 204) return false;
    if (!t.publicado) { t.publicado = new Date().toISOString(); save(); }
    return true;
  } catch (e) { return false; }
}
const Kit = {
  semTabela: false,
  dados: kitDados,
  async link(chave) {
    const d = await kitDados(chave); if (!d) throw new Error('esse cliente ainda não tem reserva confirmada');
    if (await kitPublica(chave, d)) return kitBase() + '#/k/' + kitTokenDe(chave).token;
    return kitBase() + '#/kt/' + await Publico.codifica(kitEnxuto(d));
  },
  urlConhecida(chave) { const t = kitTokenDe(chave); return t && t.publicado ? kitBase() + '#/k/' + t.token : ''; },
  curto(chave) { return !!this.urlConhecida(chave); },
  async mensagem(chave, url) {
    const d = await kitDados(chave); if (!d) throw new Error('esse cliente ainda não tem reserva confirmada');
    url = url || await this.link(chave);
    const n = d.servicos.length, varios = d.servicos.some(s => +s.pessoas > 1);
    return `Oi, ${kitPrim(d.nome)}! Tudo bem? 😊 Preparei o kit da sua viagem: ${n > 1 ? 'os vouchers dos ' + n + ' ' + KIT_CFG.servicos : 'o voucher'}, ${n > 1 ? 'os horários, os pontos de encontro' : 'o horário, o ponto de encontro'} e tudo o que ${varios ? 'vocês precisam' : 'você precisa'} saber, numa página só.\n${url}\n\nGuarde no celular: no dia, é só me mostrar o voucher. Qualquer dúvida, me chama aqui!`;
  },
  abrir(chave) { if (!chave) return; const h = location.hash.slice(1); if (h && !/^\/adm\/kit\//.test(h)) Kit._volta = h; go('/adm/kit/' + encodeURIComponent(chave)); },
  /* republica os kits já mandados quando a reserva muda (hora, pagamento, cancelamento) */
  _fila: new Set(), _t: null,
  agendar(chave) {
    if (!chave || !kitTokenDe(chave)) return;
    this._fila.add(chave); clearTimeout(this._t);
    this._t = setTimeout(async () => { const l = [...this._fila]; this._fila.clear(); for (const c of l) { try { const d = await kitDados(c); if (d) await kitPublica(c, d); } catch (e) {} } }, 2500);
  },
};
window.Kit = Kit;

/* ---------- a agenda do cliente (.ics e Google) ---------- */
function kitSoma(hm, min) { const [h, m] = (hm || '09:00').split(':').map(Number); const t = h * 60 + m + (min || 120); return { hm: String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'), dia: t >= 1440 ? 1 : 0 }; }
function kitGoogle(s, d) {
  const D = String(s.data || '').replace(/-/g, '');
  let datas;
  if (s.hora) { const f = kitSoma(s.hora, s.durMin); datas = `${D}T${s.hora.replace(':', '')}00/${f.dia ? addDays(s.data, 1).replace(/-/g, '') : D}T${f.hm.replace(':', '')}00`; }
  else datas = `${D}/${addDays(s.data, 1).replace(/-/g, '')}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: s.nome + ' · ' + (d.negocio || kitNeg()), dates: datas, ctz: s.fuso || kitFuso() });
  const local = s.buscaNoHotel ? s.hotel : (s.encontro || s.hotel || '');
  if (local) q.set('location', local);
  q.set('details', `Voucher ${s.code}${d.whats ? ' · WhatsApp ' + kitGuia() + ' +' + d.whats : ''}`);
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
function kitIcs(d) {
  const z = (iso, hm) => iso.replace(/-/g, '') + 'T' + (hm || '09:00').replace(':', '') + '00';
  const e = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const dom = (location.hostname || 'kit.viagem').replace(/[^a-z0-9.-]/gi, '');
  const ev = (d.servicos || []).map(s => { const f = kitSoma(s.hora, s.durMin), tz = s.fuso || kitFuso();
    return ['BEGIN:VEVENT', 'UID:' + s.code + '@' + dom, 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      s.hora ? 'DTSTART;TZID=' + tz + ':' + z(s.data, s.hora) : 'DTSTART;VALUE=DATE:' + s.data.replace(/-/g, ''),
      s.hora ? 'DTEND;TZID=' + tz + ':' + z(f.dia ? addDays(s.data, 1) : s.data, f.hm) : 'DTEND;VALUE=DATE:' + addDays(s.data, 1).replace(/-/g, ''),
      'SUMMARY:' + e(s.nome + ' · ' + (d.negocio || '')), 'LOCATION:' + e(s.buscaNoHotel ? s.hotel : (s.encontro || s.hotel || '')), 'DESCRIPTION:' + e('Voucher ' + s.code + ' · ' + kitComA()),
      'BEGIN:VALARM', 'TRIGGER:-PT12H', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(s.nome), 'END:VALARM', 'END:VEVENT'].join('\r\n'); });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + e(d.negocio || 'Viagem') + '//Kit//PT', ...ev, 'END:VCALENDAR'].join('\r\n');
}
function kitBaixaIcs(d) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([kitIcs(d)], { type: 'text/calendar' }));
  a.download = 'viagem-' + (kitPrim(d.nome) || 'tour').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '') + '.ics'; document.body.appendChild(a); a.click(); a.remove();
}
function kitMapa(q, s) {
  const c = (s && s.cidade) || KIT_CFG.mapaCidade || '';
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q + (c && !String(q).toLowerCase().includes(c.toLowerCase().split(',')[0]) ? ', ' + c : ''));
}
const kitTipo = (s) => (s.tipo && typeof tipoLabel === 'function' && typeof APP_CONFIG !== 'undefined' && APP_CONFIG.guia && APP_CONFIG.guia.tipos && APP_CONFIG.guia.tipos[s.tipo]) ? tipoLabel(s.tipo) : kitCap(KIT_CFG.servico);

/* ---------- o documento (o mesmo no painel, na página do cliente e no PDF) ---------- */
function kitDocHtml(d) {
  const ic = { mapa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>' };
  const sv = d.servicos || [], quem = kitComA(), num = (v) => +v || 0;
  const pagoT = sv.reduce((s, x) => s + num(x.pago), 0), faltaT = sv.reduce((s, x) => s + num(x.restante), 0);
  const logo = (typeof marcaCfg === 'function' && marcaCfg().logoEscuro) || '';
  const lst = (a) => Array.isArray(a) ? a.filter(Boolean) : [];
  const servico = (s, k) => {
    const par = lst(s.paradas), inc = lst(s.inclui), nao = lst(s.naoInclui), lev = lst(s.levar);
    const lugar = s.buscaNoHotel && s.hotel ? s.hotel : (s.encontro || s.hotel || '');
    return `<section class="kt-sv kt-bl" id="kt-sv-${k}">
      <div class="kt-svTopo">${s.foto ? `<img src="${esc(s.foto)}" alt="" loading="lazy">` : ''}<div class="kt-dia"><small>${esc(kitCap(kitData(s.data, { weekday: 'short', day: undefined, month: undefined })).replace('.', ''))}</small><b>${esc(String(s.data || '').slice(8, 10))}</b><small>${esc(/^\d{4}-\d{2}-\d{2}$/.test(s.data || '') ? new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : '')}</small></div></div>
      <div class="kt-svCorpo">
        <div class="kt-cab"><p class="kt-eyebrow">${esc(kitTipo(s))}</p><div class="kt-cod"><small>Voucher</small><b>${esc(s.code)}</b></div></div>
        <h2>${esc(s.nome)}</h2>${s.resumo ? `<p class="kt-res">${esc(s.resumo)}</p>` : ''}
        <div class="kt-grade">
          <div><small>Quando</small><b>${esc(kitCap(kitData(s.data)))}</b>${s.hora ? `<span>às ${esc(s.hora)}${s.duracao && !/conforme/i.test(s.duracao) ? ' · ' + esc(s.duracao) : ''}</span>` : ''}</div>
          <div><small>Pessoas</small><b>${esc(s.pessoas)} ${+s.pessoas > 1 ? 'pessoas' : 'pessoa'}</b>${s.guia ? `<span>com ${esc(KIT_CFG.artigo + ' ' + s.guia)}</span>` : ''}</div>
          <div class="kt-lg"><small>${s.buscaNoHotel ? 'Onde eu te encontro' : 'Ponto de encontro'}</small><b>${esc(s.buscaNoHotel && s.hotel ? 'No seu hotel: ' + s.hotel : (s.encontro || `${kitCap(quem)} confirma pelo WhatsApp`))}</b>${s.hotel && !s.buscaNoHotel ? `<span>Hospedagem: ${esc(s.hotel)}</span>` : ''}
            ${lugar && !/^online/i.test(lugar) ? `<a class="kt-lk" href="${esc(kitMapa(/hospedagem|hotel/i.test(s.encontro || '') && s.hotel ? s.hotel : lugar, s))}" target="_blank" rel="noopener">${ic.mapa}Abrir no mapa</a>` : ''}</div>
        </div>
        ${par.length ? `<div class="kt-bl"><h3>O programa</h3><ol class="kt-par">${par.map(p => `<li><b>${esc(p.n)}</b>${p.d ? `<span>${esc(p.d)}</span>` : ''}</li>`).join('')}</ol></div>` : ''}
        ${inc.length || nao.length ? `<div class="kt-duas kt-bl">${inc.length ? `<div><h3>Incluso</h3><ul class="kt-ok">${inc.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}${nao.length ? `<div><h3>Não incluso</h3><ul class="kt-no">${nao.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</div>` : ''}
        ${lev.length ? `<div class="kt-bl"><h3>O que levar</h3><ul class="kt-levar">${lev.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${num(s.pago) > 0 || num(s.restante) > 0 ? `<div class="kt-pg kt-bl"><div><small>Pago</small><b>${esc(eur(num(s.pago)))}</b></div>${num(s.restante) > 0 ? `<div class="resta"><small>${s.noDia ? 'Restante no dia' : 'Falta pagar'}</small><b>${esc(eur(num(s.restante)))}</b><span>${s.sinal > 0 ? 'o sinal de ' + esc(eur(s.sinal)) + ' garante a data' : s.noDia ? 'no dia do ' + esc(KIT_CFG.servico) : s.vence ? 'até ' + esc(kitData(s.vence, { weekday: undefined })) : ''}</span></div>` : '<div><small>Situação</small><b>Tudo pago ✓</b></div>'}</div>
          ${s.pagarUrl ? `<a class="kt-cta kt-tela" href="${esc(s.pagarUrl)}">Pagar ${esc(eur(s.pagarValor || s.restante))} agora</a>` : ''}` : ''}
        <div class="kt-acs kt-tela"><a class="kt-lk" href="${esc(kitGoogle(s, d))}" target="_blank" rel="noopener">${ic.cal}Pôr no Google Agenda</a></div>
        ${s.cancel ? `<p class="kt-fino">${esc(s.cancel)}</p>` : ''}
      </div></section>`;
  };
  const ind = lst(d.indicacoes), par = lst(d.parceiros), bri = lst(d.brindes), dic = lst(d.dicas);
  return `<article class="ktDoc">
    <header class="kt-topo kt-bl">${logo ? `<img class="kt-logo" src="${esc(logo)}" alt="${esc(d.negocio || '')}">` : `<p class="kt-marca">${esc(d.negocio || '')}</p>`}
      <p class="kt-eyebrow">Sua viagem com ${esc(quem)}</p>
      <h1>${esc(d.nome || 'Sua viagem')}</h1>
      <p class="kt-per">${esc(d.periodo || '')}${d.periodo ? ' · ' : ''}${sv.length} ${sv.length > 1 ? esc(KIT_CFG.servicos) : esc(KIT_CFG.servico)}</p>
      <div class="kt-acsTopo kt-tela">${d.whats ? `<a class="kt-cta" href="${esc(waLink('Olá, ' + kitGuia() + '! Sobre a minha viagem…', d.whats))}" target="_blank" rel="noopener">${typeof ICONE_WA !== 'undefined' ? ICONE_WA : ''}WhatsApp ${esc(KIT_CFG.artigo === 'o' ? 'do' : 'da')} ${esc(kitGuia())}</a>` : ''}<button type="button" class="kt-bt" data-kt-ics>Pôr tudo na minha agenda</button></div>
    </header>
    ${sv.length > 1 ? `<nav class="kt-lista kt-bl" aria-label="Os ${esc(KIT_CFG.servicos)} da viagem">${sv.map((s, k) => `<a href="#kt-sv-${k}" data-kt-ir="${k}"><span class="kt-ld">${esc(String(s.data || '').slice(8, 10))}/${esc(String(s.data || '').slice(5, 7))}</span><b>${esc(s.nome)}</b><span>${esc(s.hora || '')}</span></a>`).join('')}</nav>` : ''}
    ${sv.length > 1 && (pagoT || faltaT) ? `<div class="kt-pg kt-tot kt-bl"><div><small>Total pago</small><b>${esc(eur(pagoT))}</b></div><div class="${faltaT > 0 ? 'resta' : ''}"><small>Falta</small><b>${esc(eur(faltaT))}</b></div></div>` : ''}
    ${sv.map(servico).join('')}
    ${d.roteiro ? `<section class="kt-box kt-bl"><h3>O seu roteiro</h3><p>Os dias livres, com mapas, montados por ${esc(quem)} para vocês.</p><a class="kt-cta kt-cta2" href="${esc(d.roteiro)}" target="_blank" rel="noopener">Abrir o roteiro</a></section>` : ''}
    ${dic.length ? `<section class="kt-box kt-bl"><h3>${esc(KIT_CFG.dicasTitulo)}</h3><ul class="kt-levar">${dic.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
    ${ind.length ? `<section class="kt-box kt-bl"><h3>Para a sua viagem</h3><p class="kt-fino kt-fino0">Indicações ${esc(KIT_CFG.artigo === 'o' ? 'do' : 'da')} ${esc(kitGuia())}.</p>${ind.map(p => `<a class="kt-ind" href="${esc(p.url)}" target="_blank" rel="noopener sponsored">${typeof PARC_ICONE !== 'undefined' ? `<span class="kt-indIc">${PARC_ICONE[p.tipo] || PARC_ICONE.outro || ''}</span>` : ''}<span class="kt-indTx"><b>${esc(p.titulo)}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}</span><span class="kt-indVai kt-tela" aria-hidden="true">${p.wa && typeof ICONE_WA !== 'undefined' ? ICONE_WA : ic.link}</span></a>`).join('')}</section>` : ''}
    ${par.length ? `<section class="kt-box kt-bl"><h3>Descontos dos parceiros</h3><p class="kt-fino kt-fino0">Com esta viagem você tem desconto nestas lojas. Para usar, é só pedir à sua guia.</p>${par.map(p => `<div class="kt-parc"><i>${esc((+p.desconto || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }))}%</i><div><b>${esc(p.nome)}</b>${p.cat || p.como ? `<small>${esc([p.cat, p.como].filter(Boolean).join(' · '))}</small>` : ''}</div></div>`).join('')}</section>` : ''}
    ${bri.length ? `<section class="kt-box kt-bl"><h3>Presentes para a viagem</h3>${bri.map(b => `<a class="kt-lk" href="${esc(b.url)}" target="_blank" rel="noopener">🎁 ${esc(b.titulo)}</a>`).join('')}</section>` : ''}
    <footer class="kt-pe kt-bl"><div class="kt-qr" data-kt-qr></div>
      <div><b>No dia, é só mostrar o voucher</b><span>No celular ou impresso. O código de cada ${esc(KIT_CFG.servico)} está no topo dele.</span>
        <span class="kt-cont">${d.whats ? `WhatsApp: +${esc(d.whats)}` : ''}${d.email ? `${d.whats ? ' · ' : ''}${esc(d.email)}` : ''}${d.insta ? `${d.whats || d.email ? ' · ' : ''}@${esc(d.insta)}` : ''}</span></div></footer>
  </article>`;
}
function kitLiga(raiz, d, url) {
  if (!raiz) return;
  const b = raiz.querySelector('[data-kt-ics]'); if (b) b.onclick = () => { kitBaixaIcs(d); toast('Agenda baixada: abra o arquivo para pôr tudo no celular'); };
  raiz.querySelectorAll('[data-kt-ir]').forEach(a => a.onclick = (e) => { e.preventDefault(); const el = raiz.querySelector('#kt-sv-' + a.dataset.ktIr); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  const q = raiz.querySelector('[data-kt-qr]'); if (q) q.innerHTML = url && typeof qrSvg === 'function' ? (qrSvg(url, { tamanho: 110, alt: 'QR code do kit da viagem' }) || '') : '';
}

/* ---------- a página do cliente ---------- */
function kitPaginaCliente(d, url) {
  kitCss();
  paginaPublica('Sua viagem · ' + (d.nome || d.negocio || kitNeg()), kitDocHtml(d),
    { rodape: `Guarde este link no celular. Qualquer dúvida, fale com ${kitComA()} no WhatsApp.`, waTexto: 'Olá, ' + kitGuia() + '! Sobre a minha viagem…' });
  kitLiga(document.getElementById('pubPrint'), d, url || location.href);
}
/* o curto: lê o kit no banco pelo código */
async function kitAbreCurto(partes) {
  const tok = String((partes || [])[0] || '').replace(/[^A-Za-z0-9]/g, '');
  if (!tok) return paginaPublicaErro();
  if (!(typeof temNuvem === 'function' && temNuvem())) return paginaPublicaErro(`Este link de viagem não abre aqui. Peça para ${kitComA()} mandar de novo pelo WhatsApp.`);
  app.innerHTML = '<main class="wrap"><p class="why center" style="margin-top:40px">Abrindo a sua viagem…</p></main>';
  const { ok, d } = await lerLinkPublico(tok);
  if (!ok) return paginaPublicaErro('A conexão falhou ao abrir a sua viagem. Confira a internet e toque em "Tentar de novo".', true);
  if (!d || !d.servicos) return paginaPublicaErro(`Este link de viagem não existe mais. Peça para ${kitComA()} um novo pelo WhatsApp.`);
  try { kitPaginaCliente(d, location.href); } catch (e) { paginaPublicaErro('Não consegui montar a sua viagem agora. Toque em "Tentar de novo".', true); }
}
/* as rotas públicas (sem login): #/k/<código> e #/kt/<conteúdo> */
const _rotaExtraKit = rotaExtra;
rotaExtra = function (p) {
  if (p[0] === 'k') { kitAbreCurto(p.slice(1)); return true; }
  if (p[0] === 'kt') { abrePublico(p.slice(1), (d) => kitPaginaCliente(d, location.href)); return true; }
  return _rotaExtraKit(p);
};

/* ---------- a tela do painel: #/adm/kit/<chave> ---------- */
function kitEstado(chave) {
  return Kit.curto(chave) ? '✓ Link curto e sempre atualizado: o cliente vê as mudanças no mesmo link.'
    : kitPodeNuvem() ? 'O link curto nasce quando você mandar ou copiar.'
      : Kit.semTabela ? `Link comprido: falta ligar a tabela do kit no Supabase (${KIT_CFG.sql}). Funciona, mas não se atualiza sozinho.`
        : 'Link comprido (sem login ou sem nuvem): funciona, mas não se atualiza sozinho.';
}
async function admKit(chave) {
  kitCss();
  const d = await kitDados(chave);
  if (!d) { toast('Esse cliente ainda não tem reserva confirmada'); go(Kit._volta || '/adm/bookings'); return; }
  const fone = kitDig((kitReservas(chave)[0] || {}).whats);
  const voltar = '#' + (Kit._volta || '/adm/bookings');
  admShell('clients', `<div class="ktTela">
    <div class="ktBarra"><a class="mini" href="${esc(voltar)}">← voltar</a>
      <span class="ktAcs"><button class="mini" id="ktCopia">Copiar link</button><button class="mini" id="ktZap">${fone.length >= 8 ? 'Mandar no WhatsApp' : 'Mandar no WhatsApp (escolher contato)'}</button><button class="cta sm" id="ktPdf">Gerar PDF</button></span></div>
    <h1 class="pageh ktTit">Kit da viagem</h1>
    <p class="ktEstado" id="ktEstado">${esc(kitEstado(chave))}</p>
    <div id="ktPrint">${kitDocHtml(d)}</div>
    <section class="card ktDicasEd"><h3>${esc(KIT_CFG.dicasTitulo)}</h3><p class="why">Vão em todo kit. Uma por linha.</p>
      <textarea id="ktDicasTx" rows="7">${esc(kitDicas().join('\n'))}</textarea>
      <div class="ktDicasAcs"><button class="cta sm" id="ktDicasOk">Salvar as dicas</button><button class="mini" id="ktDicasPadrao">Voltar às dicas padrão</button></div></section>
  </div>`);
  document.title = 'Viagem - ' + (d.nome || 'cliente');
  kitLiga(document.getElementById('ktPrint'), d, Kit.urlConhecida(chave) || kitBase());
  if (typeof pdfLiga === 'function') pdfLiga($('#ktPdf'), () => $('#ktPrint'), () => 'Viagem - ' + (d.nome || 'cliente'));
  const pega = async (b) => { b.disabled = true; try { const url = await Kit.link(chave); const e = $('#ktEstado'); if (e) e.textContent = kitEstado(chave); kitLiga(document.getElementById('ktPrint'), d, url); return url; } finally { b.disabled = false; } };
  $('#ktCopia').onclick = async (e) => { try { const url = await pega(e.currentTarget); try { await navigator.clipboard.writeText(url); toast('Link copiado'); } catch (x) { prompt('Copie o link:', url); } } catch (x) { toast(x.message); } };
  $('#ktZap').onclick = async (e) => { try { const url = await pega(e.currentTarget); const msg = await Kit.mensagem(chave, url);
    window.open(fone.length >= 8 ? waLink(msg, fone) : 'https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener'); } catch (x) { toast(x.message); } };
  $('#ktDicasOk').onclick = () => { DB.settings.kitDicas = $('#ktDicasTx').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 14); save(); Kit.agendar(chave); toast('Dicas salvas'); admKit(chave); };
  $('#ktDicasPadrao').onclick = () => { delete DB.settings.kitDicas; save(); Kit.agendar(chave); toast('Dicas padrão de volta'); admKit(chave); };
  /* abriu o kit: republica (se já tem o curto), para o link do cliente estar igual ao que ela vê */
  if (Kit.curto(chave)) kitPublica(chave, d);
}
const _viewAdmKit = viewAdm;
viewAdm = function (tab, arg) { if (tab === 'kit') return admKit(arg ? decodeURIComponent(arg) : ''); return _viewAdmKit(tab, arg); };

/* ---------- os botões "Kit da viagem" ao lado de cada "Voucher" do painel ---------- */
function ktInjeta() {
  try {
    const st = document.getElementById('stage'); if (!st) return;
    st.querySelectorAll('a[href^="#/voucher/"], [data-voucher]').forEach(v => {
      if (v.nextElementSibling && v.nextElementSibling.hasAttribute('data-kit')) return;
      let cod = v.dataset.voucher || String(v.getAttribute('href') || '').replace(/^#\/voucher\//, '').split('/')[0];
      try { cod = decodeURIComponent(cod); } catch (e) {}
      const b = DB.bookings.find(x => x.code === cod || x.id === cod); if (!b || b.status !== 'confirmed') return;
      const cls = String(v.className || 'mini').replace(/\bvchLink\b/g, '').trim() || 'mini';
      v.insertAdjacentHTML('afterend', `<button type="button" class="${esc(cls)} ktLink" data-kit="${esc(kitChaveDe(b))}">🧳 Kit da viagem</button>`);
    });
    st.querySelectorAll('[data-kit]').forEach(bt => { if (bt._kt) return; bt._kt = true; bt.onclick = (e) => { e.preventDefault(); e.stopPropagation(); Kit.abrir(bt.dataset.kit); }; });
  } catch (e) { console.warn('kit', e); }
}
let _ktT = 0;
if (typeof MutationObserver === 'function' && typeof app !== 'undefined' && app) new MutationObserver(() => { if (!_ktT) _ktT = setTimeout(() => { _ktT = 0; ktInjeta(); }, 30); }).observe(app, { childList: true, subtree: true });

/* ---------- reserva mudou → o kit que o cliente já tem se atualiza ---------- */
/* toda mudança de reserva passa por cloudPushBooking/cloudUpdateBooking (painel, assistente, pagamento) */
for (const nome of ['cloudPushBooking', 'cloudUpdateBooking']) {
  if (typeof window[nome] !== 'function') continue;
  const orig = window[nome];
  window[nome] = function (b) { try { if (b) Kit.agendar(kitChaveDe(b)); } catch (e) {} return orig.apply(this, arguments); };
}

/* "Avisar cliente": o e-mail de confirmação (função avisos, no servidor) leva o link do kit.
   O gatilho do banco dispara quando a reserva é marcada — então o kit é publicado ANTES (no máximo 5 s). */
if (typeof Bookings !== 'undefined' && typeof Bookings.confirmarCliente === 'function') {
  const _conf = Bookings.confirmarCliente.bind(Bookings);
  Bookings.confirmarCliente = function (id) {
    const b = Bookings.get(id); if (!b || b.clienteConfirmado) return null;
    if (!kitPodeNuvem()) return _conf(id);
    b.clienteConfirmado = { em: new Date().toISOString(), publicandoKit: true };   /* a tela já mostra "avisado" */
    Promise.race([Kit.link(kitChaveDe(b)), new Promise(r => setTimeout(r, 5000))]).catch(() => {})
      .finally(() => { delete b.clienteConfirmado; _conf(id); });
    return b;
  };
}

/* o lembrete da véspera leva o kit (o link do voucher do painel não abre no celular do cliente) */
if (typeof msgLembrete === 'function') {
  const _lembrete = msgLembrete;
  msgLembrete = function (b) {
    const txt = _lembrete.apply(this, arguments);
    try { const u = b && Kit.urlConhecida(kitChaveDe(b)); if (u) return txt.replace(/Seu voucher: \S+/, '🧳 O kit da sua viagem (voucher e tudo): ' + u); } catch (e) {}
    return txt;
  };
}

/* ---------- os ajustes que o servidor lê (appstate, público) ----------
   kitVersao = 1: o servidor só põe o link #/kt/ no e-mail de app que sabe abrir o kit.
   avisarClientes: liga UMA vez (avisoClientesV1) para o "Avisar cliente" aparecer; ela
   desliga em Ajustes → Avisos (e aí avisoClientesEscolhido = true vale no servidor). */
function kitMigraAjustes(s) {
  if (!s) return false;
  let mudou = false;
  if (+s.kitVersao !== 1) { s.kitVersao = 1; mudou = true; }
  if (!s.avisoClientesV1) { s.avisarClientes = true; s.avisoClientesV1 = true; mudou = true; }
  return mudou;
}
if (typeof DB !== 'undefined' && DB && DB.settings && kitMigraAjustes(DB.settings)) { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) {} }
/* a nuvem troca os ajustes a cada busca: completa de novo e, com a dona logada, grava no banco uma vez */
if (typeof fillSettings === 'function') {
  const _fill = fillSettings;
  let _ktSubiu = false;
  fillSettings = function (s) {
    const r = _fill.apply(this, arguments);
    if (kitMigraAjustes(r) && !_ktSubiu) setTimeout(() => {
      try { if (typeof isLoggedIn === 'function' && isLoggedIn() && typeof nuvemJaCarregada !== 'undefined' && nuvemJaCarregada && typeof cloudPushState === 'function') { _ktSubiu = true; cloudPushState(); } } catch (e) {}
    }, 1500);
    return r;
  };
}

/* ---------- o assistente: kit_viagem {cliente} (só lê; devolve o link e a mensagem pronta) ---------- */
function kitAchaCliente(q) {
  const s = String(q || '').trim(); if (!s) return { erro: 'diga o nome, o WhatsApp, o e-mail ou o código da reserva' };
  const low = s.toLowerCase(), dig = kitDig(s);
  const bs = DB.bookings.filter(b => b.status === 'confirmed');
  let hit = bs.filter(b => String(b.code || '').toLowerCase() === low);
  if (!hit.length && low.includes('@')) hit = bs.filter(b => String(b.email || '').toLowerCase() === low);
  if (!hit.length && dig.length >= 6) hit = bs.filter(b => kitDig(b.whats).endsWith(dig.slice(-8)));
  if (!hit.length) hit = bs.filter(b => String(b.name || '').toLowerCase().includes(low));
  const chaves = [...new Set(hit.map(kitChaveDe))];
  if (!chaves.length) return { erro: `não achei reserva confirmada de "${s}" — o kit nasce quando a reserva confirma` };
  if (chaves.length > 1) return { erro: 'serve para mais de um cliente — pergunte qual', opcoes: chaves.slice(0, 8).map(c => { const b = hit.find(x => kitChaveDe(x) === c); return `${b.name} (${b.code})`; }) };
  return { chave: chaves[0] };
}
async function kitParaAssistente(i) {
  const r = kitAchaCliente(i && i.cliente); if (r.erro) return r;
  const d = await Kit.dados(r.chave); if (!d) return { erro: 'esse cliente ainda não tem reserva confirmada' };
  const url = await Kit.link(r.chave);
  return { cliente: d.nome, servicos: d.servicos.map(s => `${s.data} ${s.hora || ''} · ${s.nome} · voucher ${s.code}`), link: url, link_curto_e_atualizado: Kit.curto(r.chave),
    mensagem_pronta: await Kit.mensagem(r.chave, url), onde: 'em Reservas ou na ficha do cliente, botão "Kit da viagem" (dá para gerar o PDF ali)',
    regra: 'mostre a mensagem pronta para ela copiar; você não envia nada' };
}
if (typeof IA_FERRAMENTAS !== 'undefined' && typeof IA_LEITURA !== 'undefined' && typeof iaLeitura === 'function') {
  IA_FERRAMENTAS.push({ name: 'kit_viagem', description: `O KIT DA VIAGEM de um cliente que reservou: uma página só com os vouchers de todas as reservas confirmadas dele, horários, ponto de encontro (mapa), programa, incluso/não incluso, o que levar, pagamento, ${KIT_CFG.dicasTitulo.toLowerCase()} e indicações. Devolve o link (abre no celular, sem senha; o curto se atualiza sozinho) e a mensagem pronta para ELA mandar. Use para "manda o kit da Ana", "o que mando pro cliente que reservou". Não envia nada.`,
    input_schema: { type: 'object', properties: { cliente: { type: 'string', description: 'nome, WhatsApp, e-mail ou código da reserva' } }, required: ['cliente'] } });
  IA_LEITURA.add('kit_viagem');
  const _iaLeituraKit = iaLeitura;
  iaLeitura = function (nome, i) { if (nome === 'kit_viagem') return kitParaAssistente(i || {}); return _iaLeituraKit.apply(this, arguments); };
  if (typeof iaSistema === 'function') {
    const _iaSistemaKit = iaSistema;
    iaSistema = function () {
      const blocos = _iaSistemaKit.apply(this, arguments);
      if (Array.isArray(blocos)) blocos.push({ type: 'text', text: '## Kit da viagem\nQuem reservou recebe UM link com tudo (vouchers de todas as reservas, encontro, programa, o que levar, pagamento, dicas e indicações). Botão "Kit da viagem" ao lado de cada "Voucher"; ou peça kit_viagem. Mandar o kit é o passo natural depois de confirmar uma reserva.' });
      return blocos;
    };
  }
}

/* ---------- o desenho, na marca de cada app (APP_CONFIG.kit.cores) ---------- */
function kitCss() {
  if (document.getElementById('ktCss')) return;
  const C = Object.assign({ faixa: '#1F2421', destaque: '#E7C9A0', sobreFaixa: '#E7C9A0', ctaTinta: '#1F2421', papel: '#FBF8F3', tinta: '#1E2433', tinta2: '#545B6B',
    linha: '#E6E0D4', rotulo: '#8A5518', pago: '#EAF4EE', resta: '#FFF4D6' }, KIT_CFG.cores || {});
  for (const k of Object.keys(C)) if (!/^#[0-9a-f]{3,8}$/i.test(String(C[k]))) C[k] = '#888888';
  const s = document.createElement('style'); s.id = 'ktCss';
  s.textContent = `
  .ktTela{max-width:840px;margin:0 auto}
  .ktBarra{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:4px 0 6px}
  .ktAcs{display:flex;gap:8px;flex-wrap:wrap}
  .ktTit{margin:16px 0 4px}
  .ktEstado{max-width:794px;margin:0 0 12px;font-size:13.5px;color:var(--ink-2)}
  .ktDicasEd{max-width:794px;margin:16px 0}.ktDicasEd textarea{width:100%;font:inherit}
  .ktDicasAcs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  #ktPrint,#pubPrint .ktDoc{max-width:794px}
  .ktDoc{--kt-n:${C.faixa};--kt-a:${C.destaque};--kt-s:${C.sobreFaixa};--kt-ct:${C.ctaTinta};--kt-c:${C.papel};--kt-t:${C.tinta};--kt-t2:${C.tinta2};--kt-l:${C.linha};--kt-r:${C.rotulo};
    max-width:794px;margin:0 auto;background:var(--kt-c);color:var(--kt-t);border-radius:18px;overflow:hidden;box-shadow:0 18px 50px -30px rgba(0,0,0,.4);font-family:var(--f-ui,system-ui);font-size:15px;line-height:1.5;text-align:left}
  .ktDoc h1,.ktDoc h2,.ktDoc h3{font-family:var(--f-display,system-ui);color:var(--kt-n);margin:0;letter-spacing:0}
  .ktDoc p{margin:0}
  .kt-topo{background:var(--kt-n);color:var(--kt-c);padding:26px 28px 24px;position:relative}
  .kt-logo{display:block;height:38px;width:auto;max-width:62%;margin:0 0 14px}
  .kt-marca{font:700 15px/1.2 var(--f-display,system-ui);color:#fff;margin:0 0 12px}
  .kt-topo h1{color:#fff;font-size:30px;line-height:1.15;margin:6px 0 4px}
  .kt-eyebrow{margin:0;font:700 11px/1.3 var(--f-ui,system-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--kt-s)}
  .kt-svCorpo .kt-eyebrow{color:var(--kt-r)}
  .kt-cab{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
  .kt-cod{flex:none;text-align:center;padding:6px 12px;border:1.5px dashed var(--kt-n);border-radius:12px;background:var(--kt-c);line-height:1.1;margin-top:-8px}
  .kt-cod small{display:block;font:700 9.5px/1.2 var(--f-ui,system-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--kt-t2)}
  .kt-cod b{display:block;font:800 17px/1.2 var(--f-mono,ui-monospace);color:var(--kt-n);letter-spacing:.04em}
  .kt-per{margin:0;opacity:.9}
  .kt-acsTopo{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
  .kt-cta{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;background:var(--kt-a);color:var(--kt-ct);font-weight:700;text-decoration:none;border:0;cursor:pointer;font-size:14.5px}
  .kt-cta svg{width:18px;height:18px}
  .kt-cta2{margin-top:10px}
  .kt-bt{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;font:600 14px/1 var(--f-ui,system-ui);cursor:pointer}
  .kt-lista{display:grid;margin:18px 22px 4px;border:1px solid var(--kt-l);border-radius:14px;overflow:hidden;background:#fff}
  .kt-lista a{display:grid;grid-template-columns:58px 1fr auto;gap:10px;align-items:center;padding:11px 14px;border-top:1px solid var(--kt-l);color:var(--kt-t);text-decoration:none}
  .kt-lista a:first-child{border-top:0}
  .kt-ld{font:700 13px/1 var(--f-mono,ui-monospace);color:var(--kt-n)}
  .kt-lista span:last-child{color:var(--kt-t2);font-size:13px}
  .kt-sv{margin:18px 22px;background:#fff;border:1px solid var(--kt-l);border-radius:16px;overflow:hidden}
  .kt-svTopo{position:relative;min-height:12px}
  .kt-svTopo img{display:block;width:100%;height:170px;object-fit:cover}
  .kt-dia{position:absolute;left:14px;bottom:-22px;width:60px;padding:6px 0;border-radius:12px;background:var(--kt-n);color:#fff;text-align:center;line-height:1.05;box-shadow:0 6px 16px -8px rgba(0,0,0,.5)}
  .kt-svTopo:not(:has(img)) .kt-dia{position:static;margin:14px 0 0 14px}
  .kt-dia b{display:block;margin:3px 0 2px;font:700 22px/1 var(--f-display,system-ui);color:var(--kt-s)}
  .kt-dia small{display:block;font-size:10px;line-height:1.2;letter-spacing:.12em;text-transform:uppercase;color:#fff;opacity:.9}
  .kt-svCorpo{padding:30px 20px 18px}
  .kt-svCorpo h2{font-size:21px;line-height:1.25;margin:4px 0 2px}
  .kt-res{margin:0 0 6px;color:var(--kt-t2)}
  .kt-grade{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
  .kt-grade > div{background:var(--kt-c);border-radius:12px;padding:10px 12px}
  .kt-grade .kt-lg{grid-column:1/-1}
  .kt-grade small,.kt-pg small{display:block;font:700 10.5px/1.2 var(--f-ui,system-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--kt-t2)}
  .kt-grade b{display:block;color:var(--kt-n);margin-top:2px}
  .kt-grade span{display:block;color:var(--kt-t2);font-size:13.5px}
  .kt-lk{display:inline-flex;align-items:center;gap:6px;margin-top:6px;color:var(--kt-n);font-weight:700;font-size:14px;text-decoration:underline;text-underline-offset:3px}
  .kt-lk svg{width:16px;height:16px}
  .kt-sv h3,.kt-box h3{font-size:15px;margin:14px 0 6px}
  .kt-box h3{margin-top:0}
  .kt-par{margin:0;padding-left:22px}.kt-par li{margin:5px 0}.kt-par li b{display:block;color:var(--kt-n)}.kt-par li span{color:var(--kt-t2);font-size:13.5px}
  .kt-duas{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .kt-ok,.kt-no,.kt-levar{margin:0;padding:0;list-style:none}
  .kt-ok li,.kt-no li,.kt-levar li{position:relative;padding:3px 0 3px 22px;font-size:14px}
  .kt-ok li::before{content:"✓";position:absolute;left:2px;color:#1F7A4D;font-weight:800}
  .kt-no li::before{content:"–";position:absolute;left:4px;color:#A3202F;font-weight:800}
  .kt-levar li::before{content:"";position:absolute;left:6px;top:11px;width:7px;height:7px;border-radius:50%;background:var(--kt-n)}
  .kt-pg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px}
  .kt-pg > div{border-radius:12px;padding:10px 12px;background:${C.pago}}
  .kt-pg > div.resta{background:${C.resta}}
  .kt-pg b{display:block;font:700 19px/1.2 var(--f-display,system-ui);color:var(--kt-n)}
  .kt-pg span{display:block;font-size:12.5px;color:var(--kt-t2)}
  .kt-tot{margin:14px 22px 0}
  .kt-acs{margin-top:8px}
  .kt-fino{margin:10px 0 0;font-size:12.5px;color:var(--kt-t2)}
  .kt-fino0{margin:0 0 8px}
  .kt-box{margin:18px 22px;padding:16px 18px;background:#fff;border:1px solid var(--kt-l);border-radius:16px}
  .kt-box > .kt-lk{display:flex}
  .kt-ind{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--kt-l);color:var(--kt-t);text-decoration:none}
  .kt-fino0 + .kt-ind{border-top:0}
  .kt-indIc{flex:none;width:38px;height:38px;border-radius:12px;background:var(--kt-c);color:var(--kt-n);display:grid;place-items:center}
  .kt-indIc svg{width:22px;height:22px}
  .kt-indTx{flex:1;min-width:0}.kt-indTx b{display:block;color:var(--kt-n)}.kt-indTx small{display:block;color:var(--kt-t2);font-size:13px}
  .kt-indVai{flex:none;color:var(--kt-n)}.kt-indVai svg{width:18px;height:18px}
  .kt-parc{display:flex;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--kt-l)}
  .kt-parc i{font-style:normal;min-width:54px;text-align:center;padding:6px 8px;border-radius:10px;background:var(--kt-n);color:var(--kt-s);font-weight:800}
  .kt-parc small{display:block;color:var(--kt-t2)}
  .kt-pe{display:flex;gap:16px;align-items:center;margin:18px 0 0;padding:18px 22px;background:var(--kt-n);color:#fff}
  .kt-pe b{display:block;color:#fff}.kt-pe span{display:block;font-size:13px;color:#fff;opacity:.9}
  .kt-qr{flex:none;width:110px;min-height:10px;background:#fff;border-radius:10px;padding:6px}
  .kt-qr:empty{display:none}
  .kt-qr svg{display:block;width:100%;height:auto}
  .kt-cont{margin-top:6px;word-break:break-word}
  @media(max-width:620px){.kt-topo{padding:22px 18px 18px}.kt-topo h1{font-size:25px}.kt-logo{height:32px}
    .kt-sv,.kt-box{margin:14px 10px}.kt-lista,.kt-tot{margin-left:10px;margin-right:10px}.kt-grade,.kt-duas{grid-template-columns:1fr}.kt-svCorpo{padding:28px 14px 14px}.kt-pe{flex-direction:column;align-items:flex-start}
    .kt-lista a{grid-template-columns:48px 1fr auto}.kt-cab{flex-wrap:wrap}}
  @media print{.kt-tela{display:none!important}}`;
  document.head.appendChild(s);
}
