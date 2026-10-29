/* =====================================================
   ORÇAMENTO PREMIUM (29/10/2026)

   O orçamento completo do app premium do estúdio, para os apps de guia
   desta família (base app-guia / Londres). O MESMO arquivo em todos; o
   que muda vem do APP_CONFIG. Junta o Orc da base de operação com o
   editor, a proposta e as travas do "nunca inventar".

   - O EDITOR: cliente (nome, WhatsApp, adultos e crianças, hotéis por
     período, chegada e partida com hora e voo); o ROTEIRO dia a dia —
     planilha no computador, cartões no celular —, o catálogo dela numa
     janela de um toque com busca, traslado de chegada e de saída, linha em
     branco; em cada serviço: incluso, não incluso, observação (balão),
     "à parte", foto, custo (só ela vê). Salva sozinho.
   - OS VALORES: serviços − desconto (+ imposto, se ela ligar) = total; ou o
     "total que você fecha"; por pessoa / por adulto e por criança; já pago
     e pendente; dividir por grupo, casal ou individual; link de pagamento.
   - A PROPOSTA (o que o cliente recebe): capa com fotos, o roteiro por dia,
     o investimento, condições e cancelamento, o diferencial e a validade.
     LINK curto #/p/<código> na tabela kits da sala (a mesma do kit da
     viagem: o cliente lê UM pelo código, só a dona grava); sem tabela ou
     sem login, o comprido #/pp/… leva tudo dentro. E o PDF.
   - FECHOU: cada serviço vira reserva e abre o kit da viagem.
   - NUNCA INVENTAR (28–29/10/2026): hora só a dela ou a do horário fixo do
     passeio; pedido sem preço fica FORA da proposta até ela pôr o valor;
     lembrete interno nunca vai para o cliente; os textos da proposta são
     os DELA (dos termos dela ou vazios).

   O que muda de app para app (APP_CONFIG.orc): o imposto (nasce
   DESLIGADO), o logo e as fotos da capa. A moeda é a do app
   (APP_CONFIG.guia.moeda).
   ===================================================== */
'use strict';

/* ---------- 0. o que vem do app ---------- */
const OY_CFG = Object.assign({ imposto: { nome: 'Imposto', pct: 0 }, logo: '', logoTopo: '', capa: [], saidaAntesMin: 0 },
  (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.orc) || {});
const OY_MOEDA = String((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.guia && APP_CONFIG.guia.moeda) || 'EUR').toUpperCase();
const OY_SIMB = { EUR: '€', GBP: '£', USD: 'US$', BRL: 'R$' }[OY_MOEDA] || OY_MOEDA;
const OY_IMP = String((OY_CFG.imposto && OY_CFG.imposto.nome) || 'Imposto');
const OY_VAT = Math.max(0, +(OY_CFG.imposto && OY_CFG.imposto.pct) || 0);
const PP_MOEDA_NOME = { USD: 'dólares americanos', EUR: 'euros', BRL: 'reais', GBP: 'libras esterlinas' };

/* os textos da proposta são DELA: o que ela guardou ("usar em todas"); o cancelamento nasce dos termos dela */
const ppTextoPadrao = (k) => {
  const s = (typeof DB !== 'undefined' && DB.settings) || {};
  if (k === 'politica') return s.propPolitica != null ? s.propPolitica : (typeof termosLista === 'function' ? termosLista().join('\n') : '');
  return k === 'condicoes' ? (s.propCondicoes || '') : (s.propDiferencial || '');
};

/* as peças da base de operação que o editor usa, no jeito destes apps */
const oyGrava = () => { localStorage.setItem(DB_KEY, JSON.stringify(DB)); if (typeof itAgendar === 'function') itAgendar(); };
const oyGravaReserva = (b) => { oyGrava(); if (b && typeof cloudUpdateBooking === 'function') cloudUpdateBooking(b); };
const opNum = (w) => { const d = String(w || '').replace(/\D/g, ''); return d.length >= 8 ? d : ''; };
const opPrimeiro = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const opCurta = (iso) => /^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
const _nomeN = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const oyFone = (w) => { const d = String(w || '').replace(/\D/g, ''); return d ? '+' + d : ''; };
async function opCopia(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e2) {} ta.remove(); return true;
  }
}
/* a janelinha (o opJanela da base de operação) */
function opJanela(titulo, html) {
  oyCss();
  const d = document.createElement('dialog'); d.className = 'oy-dlg';
  d.innerHTML = `<div class="oy-dlgcab"><h2>${esc(titulo)}</h2><button type="button" class="oy-dlgx" aria-label="Fechar">✕</button></div><div class="oy-dlgcorpo">${html}</div>`;
  document.body.appendChild(d);
  d.querySelector('.oy-dlgx').onclick = () => d.close();
  d.addEventListener('close', () => setTimeout(() => d.remove(), 0));
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  return d;
}

/* ---------- 1. o modelo (o Orc da base de operação + o orçamento premium) ---------- */
const ORC_STATUS = [['novo', 'Novo'], ['rascunho', 'Em montagem'], ['enviado', 'Enviado'], ['fechado', 'Fechou'], ['perdido', 'Não fechou']];
const OY_OBS_INTERNA = /^(Sem preço na tabela|O cliente pediu — escolha|Defina o valor)/;
const OY_TIPOS = ['passeio', 'traslado', 'livre'];
const OY_RE_TRASLADO = /transfer|traslado|translado|aeroporto|airport/i;
const oyCent = (v) => Math.round((+v || 0) * 100) / 100;
const oyVatPct = (o) => o && o.semVat ? 0 : o && o.vatPct != null && o.vatPct !== '' ? Math.max(0, +o.vatPct || 0) : OY_VAT;
const oyTotInf = (o) => +(o && o.totalInformado) || 0;
const Orc = {
  all() { if (!Array.isArray(DB.orcamentos)) DB.orcamentos = []; return [...DB.orcamentos].sort((a, b) => (b.criado || '').localeCompare(a.criado || '')); },
  get(id) { return (DB.orcamentos || []).find(o => o.id === id) || null; },
  cria(d) {
    d = d || {};
    if (!Array.isArray(DB.orcamentos)) DB.orcamentos = [];
    const n = DB.orcamentos.reduce((m, o) => Math.max(m, +String(o.num || '').replace(/\D/g, '') || 0), 0) + 1;
    const c = d.cliente || {};
    const o = {
      id: uid() + uid(), num: 'ORC-' + String(n).padStart(4, '0'), criado: new Date().toISOString(),
      status: d.status || 'novo', origem: d.origem || 'manual', pedidoId: d.pedidoId || '',
      cliente: { nome: String(c.nome || '').trim(), whats: String(c.whats || '').trim(), email: String(c.email || '').trim() },
      itens: (d.itens || []).map(Orc._item),
      sinalPct: d.sinalPct != null ? +d.sinalPct : 30,
      validade: d.validade || addDays(isoToday(), 7),
      obs: String(d.obs || ''), resumo: String(d.resumo || ''), conversa: String(d.conversa || ''),
      pax: +d.pax || 0, adultos: d.adultos != null ? +d.adultos || 0 : (+d.pax || 0), criancas: +d.criancas || 0,
      chegada: d.chegada || { data: '', hora: '', voo: '' }, partida: d.partida || { data: '', hora: '', voo: '' },
      moeda: OY_MOEDA, bookingIds: [],
    };
    DB.orcamentos.push(o); oyGrava(); return o;
  },
  _item(i) {
    i = i || {};
    return {
      id: i.id || uid() + uid(), tourId: i.tourId || '', desc: String(i.desc || '').trim(),
      data: i.data || '', hora: i.hora || '', pax: Math.max(1, +i.pax || 1), opcao: +i.opcao || 0,
      valor: Math.max(0, +i.valor || 0), sinal: i.sinal != null && i.sinal !== '' ? Math.max(0, +i.sinal) : null,
      obs: String(i.obs || '').trim(), sugestao: !!i.sugestao, voo: String(i.voo || '').trim(),
      custo: Math.max(0, +i.custo || 0), cidade: String(i.cidade || '').trim(),
      horaFim: String(i.horaFim || '').trim(),
      texto: String(i.texto || '').trim(),           /* o que o cliente lê */
      incluso: String(i.incluso || '').trim(),
      rotulo: String(i.rotulo || '').trim(),         /* "manhã livre", "à noite" (opcional) */
      foto: String(i.foto || '').trim(),
      tipo: OY_TIPOS.includes(i.tipo) ? i.tipo : (i.tourId ? 'passeio' : OY_RE_TRASLADO.test(String(i.desc || '')) ? 'traslado' : 'livre'),
      auto: !!i.auto,                                /* o valor veio da tabela: muda junto com o nº de pessoas */
      criancas: Math.max(0, Math.min(+i.criancas || 0, Math.max(1, +i.pax || 1))),
      naoIncluso: String(i.naoIncluso || '').trim(),
      aParte: !!i.aParte,                            /* entra no roteiro, por conta do cliente, sem valor */
      horas: Math.max(0, Math.round(+i.horas || 0)),
    };
  },
  /* um passeio do catálogo, já com o preço da tabela dela para aquele grupo.
     Hora só se for certa: a que ela deu ou a do horário fixo do passeio. */
  itemDoCatalogo(tourId, { pax, data, hora, horas } = {}) {
    const x = Tours.get(tourId); if (!x) return null;
    const h = hora || (DB.rules.find(r => r.tourId === tourId) || {}).time || '';
    const pr = oyPrecoItem(x, { pax, data, hora: h, horas });
    return Orc._item({ tourId, desc: oyPt(x.name), data: data || '', hora: h, pax, valor: pr.total || 0,
      obs: pr.total ? '' : 'Sem preço na tabela — defina o valor' });
  },
  /* serviços − desconto = subtotal; + imposto (se ela ligou) = total. Com o "total que você fecha", vale esse número. */
  soma(o) { return (o.itens || []).reduce((s, i) => s + (+i.valor || 0), 0); },
  subtotal(o) { return oyTotInf(o) > 0 ? oyCent(oyTotInf(o) / (1 + oyVatPct(o) / 100)) : Math.max(0, Orc.soma(o) - (+(o && o.desconto) || 0)); },
  vat(o) { return oyTotInf(o) > 0 ? oyCent(oyTotInf(o) - Orc.subtotal(o)) : oyCent(Orc.subtotal(o) * oyVatPct(o) / 100); },
  total(o) { return oyTotInf(o) > 0 ? oyCent(oyTotInf(o)) : oyCent(Orc.subtotal(o) + Orc.vat(o)); },
  /* o que o resto do app já chama (Hoje, assistente) */
  totais(o) { return { total: Orc.total(o), aCombinar: (o.itens || []).filter(i => !i.aParte && !(+i.valor > 0)) }; },
  sinalDoItem(o, i) { return i.sinal != null ? +i.sinal : Math.round((+i.valor || 0) * (+o.sinalPct || 0) / 100); },
  sinal(o) { return (o.itens || []).reduce((s, i) => s + Orc.sinalDoItem(o, i), 0); },
  salva(o) {
    const x = Orc.get(o.id); if (!x) return null;
    Object.assign(x, o, { itens: (o.itens || x.itens).map(Orc._item) });
    oyGrava(); return x;
  },
  status(id, st) { const o = Orc.get(id); if (!o) return; o.status = st; oyGrava(); },
  linkAdd(id, nome, url) {
    const o = Orc.get(id); if (!o) return null;
    const u = String(url || '').trim(); if (!/^https?:\/\//i.test(u)) return { erro: 'o link precisa começar com http' };
    o.links = o.links || []; const l = { id: uid(), nome: String(nome || '').trim() || 'link', url: u }; o.links.push(l); oyGrava(); return l;
  },
  /* o nome do arquivo: "2026_05_26 Jo Souza" */
  nomeArquivo(o) { if (o.arquivo) return o.arquivo; const d = (o.itens.map(i => i.data).filter(Boolean).sort()[0] || String(o.criado).slice(0, 10)).replace(/-/g, '_'); return `${d} ${o.cliente.nome || 'Cliente'}`; },
  remove(id) { DB.orcamentos = (DB.orcamentos || []).filter(o => o.id !== id); oyGrava(); },
  /* Fechou: cada serviço vira uma reserva de verdade, com o cliente e o sinal; o desconto e o imposto
     entram repartidos na proporção de cada serviço (as reservas somam o que o cliente paga). */
  fecha(id, { sinalRecebido, metodo } = {}) {
    const o = Orc.get(id); if (!o || o.status === 'fechado') return [];
    const soma = Orc.soma(o), k = soma > 0 ? Orc.total(o) / soma : 1;
    const criadas = [];
    for (const i of o.itens) {
      const x = i.tourId && Tours.get(i.tourId), avulso = !x;
      /* pedido do cliente que ela não confirmou (sem valor) não estava na proposta: não vira reserva */
      if (i.sugestao) continue;
      if (avulso && (!i.data || !String(i.desc || '').trim())) continue;
      const total = oyCent((+i.valor || 0) * k);
      const b = oyReserva({ tourId: avulso ? oyTourAvulso(i) : i.tourId, date: i.data || isoToday(), time: i.hora || '09:00',
        name: o.cliente.nome || 'Cliente', whats: o.cliente.whats, email: o.cliente.email, pax: i.pax, total });
      Object.assign(b, { origin: 'orcamento', orcamentoId: o.id, arquivo: Orc.nomeArquivo(o), links: [...(o.links || [])],
        orcTitulo: i.desc || '', orcTexto: i.texto || '', orcIncluso: i.incluso || '', orcFoto: i.foto || '',
        orcObs: OY_OBS_INTERNA.test(i.obs || '') ? '' : (i.obs || ''), moeda: OY_MOEDA });
      if (avulso) b.servicoTxt = String(i.desc).trim();
      if (i.horaFim) b.horaFim = i.horaFim;
      /* serviço sem horário no orçamento: a reserva guarda 09:00 por dentro (a agenda precisa de uma hora),
         mas o roteiro que vai para o cliente NÃO mostra horário nenhum */
      if (!i.hora) b.semHora = true;
      if (i.voo) b.voo = i.voo;
      if (+i.custo > 0) b.custo = +i.custo;
      if (o.hotel) b.hotel = o.hotel;
      const sinal = Math.min(total, oyCent(Orc.sinalDoItem(o, i) * k));
      if (sinalRecebido && sinal > 0) b.payments.push({ amount: sinal, date: isoToday(), method: metodo || 'other', kind: sinal >= total ? 'full' : 'deposit' });
      criadas.push(b);
    }
    /* cada reserva sobe UMA vez, já completa (POST antes de qualquer PATCH — a ordem que já custou caro) */
    oyGrava();
    for (const b of criadas) if (typeof cloudPushBooking === 'function') cloudPushBooking(b);
    o.status = 'fechado'; o.bookingIds = criadas.map(b => b.id); o.fechadoEm = isoToday();
    oyGrava();
    return criadas;
  },
};
/* a reserva do Fechou: o mesmo desenho do Bookings.criarManual, montada inteira antes de subir */
function oyReserva({ tourId, date, time, name, whats, email, pax, total }) {
  const b = { id: uid(), code: bookCode(), tourId, date, time, name, email: email || '', whats: whats || '', insta: '',
    pax: +pax || 1, total: Math.max(0, +total || 0), coupon: null, discount: 0, policy: 'full', consent: { ok: false },
    payments: [], status: 'confirmed', createdAt: new Date().toISOString() };
  DB.bookings.push(b);
  return b;
}
/* serviço que não é do catálogo (traslado escrito à mão, hotel, jantar): um passeio-ponte em rascunho, invisível ao cliente */
function oyTourAvulso(i) {
  const tr = i.tipo === 'traslado' && (Tours.get('transfer') || Tours.all().find(x => x.type === 'transfer'));
  if (tr) return tr.id;
  const id = 'orc-servico';
  if (Tours.get(id)) return id;
  const base = Tours.all()[0] || {};
  const t = JSON.parse(JSON.stringify(base));
  /* nada herdado do passeio-modelo: nem tipo ("a pé"), nem encontro, duração ou cancelamento */
  Object.assign(t, { id, type: 'servico', order: DB.tours.length + 1, status: 'draft', avulso: true, oculto: true, servico: true, naoOcupaDia: true,
    name: { pt: 'Serviço do orçamento', en: 'Custom service' }, desc: { pt: '', en: '' }, tagline: { pt: '', en: '' },
    price: 0, photo: '', fotos: [], gallery: [], stops: [], meeting: { pt: '', en: '' }, duration: '', cancel: { pt: '', en: '' }, pickup: false, videos: [],
    includes: { pt: [], en: [] }, notIncludes: { pt: [], en: [] } });
  DB.tours.push(t);
  if (typeof save === 'function') save();
  return id;
}

const oyPt = (a) => !a ? '' : typeof a === 'string' ? a : (a.pt || a.en || '');
const oyLista = (a) => (a && !Array.isArray(a) && (a.pt || a.en) ? (a.pt || a.en) : Array.isArray(a) ? a : []).map(s => oyPt(s).trim()).filter(Boolean);
const oyParagrafo = (t) => (String(t || '').split(/\n\s*\n/)[0] || '').trim();
const oyFoto = (p) => /^data:/i.test(String(p || '')) ? '' : String(p || '');
const oyFotosDe = (x) => [...new Set([x && x.photo, ...((x && x.fotos) || []), ...((x && x.gallery) || [])].map(oyFoto).filter(Boolean))];
/* a hora do jeito que ela digitar: 14:30, 14h30, 14.30, 1430, 930, 14h, 14 → "14:30"/"09:30"/"14:00". Impossível → vazio. */
const oyHm = (h) => {
  const t = String(h || '').trim().toLowerCase(), ok = (H, M) => +H <= 23 && +M <= 59 ? String(+H).padStart(2, '0') + ':' + String(+M).padStart(2, '0') : '';
  let m = t.match(/(\d{1,2})\s*[:h.,\s]\s*(\d{2})/); if (m) return ok(m[1], m[2]);
  m = t.match(/^(\d{1,2})(\d{2})$/); if (m) return ok(m[1], m[2]);
  m = t.match(/^(\d{1,2})\s*h?$/); if (m) return ok(m[1], 0);
  return '';
};
/* "09:00–17:00", "9h às 17h", "20h às 22h30" → [início, fim] (o \b do JavaScript não enxerga "à") */
const oyFaixaPartes = (v) => String(v || '').trim().split(/\s*(?:–|—|-)\s*|\s+(?:às|as|até|ate|a)\s+/i);
function oySoma(hm, min) { if (!hm) return ''; const [h, m] = hm.split(':').map(Number); const t = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + min)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
/* NADA DE HORÁRIO INVENTADO: a hora dela manda e o fim só vem dela; sem hora dela, só a faixa
   que ela mesma escreveu na duração do passeio ("09h00 – 18h00"). Nunca o fim calculado. */
function oyHorasDe(x, hora) {
  if (hora) return [hora, ''];
  const par = String((x && x.duration) || '').match(/(\d{1,2}[:h]\d{2})\s*[–-]\s*(\d{1,2}[:h]\d{2})/);
  return par ? [oyHm(par[1]), oyHm(par[2])] : ['', ''];
}
const oyMoeda = () => OY_MOEDA;
function oyM(v) {
  const n = Number(v) || 0;
  return OY_SIMB + ' ' + n.toLocaleString('pt-BR', n % 1 === 0 ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const oyPax = (o) => ((+o.adultos || 0) + (+o.criancas || 0)) || +o.pax || 0;
function oyPaxTexto(o) {
  const a = +o.adultos || 0, c = +o.criancas || 0;
  if (!a && !c) return o.paxNota || (o.pax ? o.pax + (o.pax > 1 ? ' pessoas' : ' pessoa') : '');
  return [a ? a + (a > 1 ? ' adultos' : ' adulto') : '', c ? c + (c > 1 ? ' crianças' : ' criança') : ''].filter(Boolean).join(' + ');
}
const oyPorPessoa = (o) => { const p = oyPax(o); return p ? oyCent(Orc.total(o) / p) : 0; };
/* POR ADULTO E POR CRIANÇA: a criança paga o preço de criança da tabela (se o passeio tiver); sem ele, paga
   como adulto. A parte das crianças passa pela mesma régua do total e os adultos dividem o resto —
   adultos × por adulto + crianças × por criança = o total. */
function oyPorTipo(o) {
  const A = +o.adultos || 0, C = +o.criancas || 0, tot = Orc.total(o);
  if (!C) { const p = A || oyPax(o); return { adulto: p ? oyCent(tot / p) : 0, crianca: 0 }; }
  let soma = 0, partC = 0;
  for (const i of o.itens || []) {
    const v = +i.valor || 0; if (i.aParte || !v) continue;
    soma += v;
    const pax = Math.max(1, +i.pax || 1), x = i.tourId && Tours.get(i.tourId);
    const c = Math.min(pax, +i.criancas > 0 ? +i.criancas : (!x && pax >= oyPax(o) ? C : 0));
    if (!c) continue;
    let uc = v / pax;
    const pc = x ? oyPrecoCrianca(x, i.opcao) : 0;
    if (pc > 0) { const tab = oyPrecoItem(x, { ...i, criancas: c }).total || 0; uc = Math.min(v / c, pc * (tab > 0 ? v / tab : 1)); }
    partC += uc * c;
  }
  partC = soma > 0 ? partC * tot / soma : 0;
  return { adulto: A ? oyCent((tot - partC) / A) : 0, crianca: oyCent(partC / C) };
}
/* O LINK DE PAGAMENTO cobra o grupo, o casal ou cada um — o app mostra o valor; ela cria o link na plataforma dela */
const OY_PAG = [['total', 'Grupo'], ['casal', 'Casal'], ['pessoa', 'Individual']];
const oyPagModo = (o) => OY_PAG.some(x => x[0] === o.pagModo) ? o.pagModo : 'total';
function oyPagValor(o) {
  const t = oyPorTipo(o), modo = oyPagModo(o), cri = +o.criancas > 0;
  if (modo === 'pessoa') return { modo, v: t.adulto, rot: cri ? 'por adulto' : 'por pessoa', vc: cri ? t.crianca : 0 };
  if (modo === 'casal') return { modo, v: oyCent(t.adulto * 2), rot: 'por casal', vc: 0 };
  const p = +o.pago > 0;
  return { modo, v: p ? oyPendente(o) : Orc.total(o), rot: p ? 'do grupo (o que falta pagar)' : 'do grupo (total)', vc: 0 };
}
/* "NÃO INCLUSO" DE UM TOQUE: as frases que ELA mais escreveu nos orçamentos (2+ vezes) — nada inventado */
const oyFrases = (t) => String(t || '').split(/\n|[,;]/).map(x => x.trim().replace(/\.$/, '')).filter(Boolean);
const oyTemFrase = (t, f) => oyFrases(t).some(x => x.toLowerCase() === f.toLowerCase());
function oyRapidos() {
  const n = {};
  for (const o of DB.orcamentos || []) for (const i of o.itens || []) for (const f of oyFrases(i.naoIncluso)) if (f.length <= 40) { const k = f.toLowerCase(); n[k] = n[k] || { f, c: 0 }; n[k].c++; }
  return Object.values(n).filter(x => x.c >= 2).sort((a, b) => b.c - a.c).map(x => x.f).slice(0, 6);
}
function oyPorTipoTexto(o, curto) {
  const t = oyPorTipo(o);
  if (!(+o.criancas > 0)) return oyPax(o) > 1 ? oyM(t.adulto) + (curto ? '/pessoa' : ' por pessoa') : '';
  return oyM(t.adulto) + (curto ? '/adulto · ' : ' por adulto · ') + oyM(t.crianca) + (curto ? '/criança' : ' por criança');
}
const oyPendente = (o) => Math.max(0, Orc.total(o) - (+o.pago || 0));
const oyOrdena = (l) => [...l].sort((a, b) => ((a.data || '9999') + (a.hora || '99')).localeCompare((b.data || '9999') + (b.hora || '99')));
function oyDiasDaViagem(o) {
  const de = o.chegada && o.chegada.data, ate = o.partida && o.partida.data, l = [];
  if (de && ate && de <= ate) for (let d = de; d <= ate && l.length < 31; d = addDays(d, 1)) l.push(d);
  for (const i of o.itens) if (i.data && !l.includes(i.data)) l.push(i.data);
  return l.sort();
}
/* o próximo dia sem passeio (dentro da viagem), senão o dia depois do último serviço */
function oyProximoDia(o) {
  const dias = oyDiasDaViagem(o), ocupados = new Set(o.itens.filter(i => i.tipo === 'passeio' && i.data).map(i => i.data));
  const ch = o.chegada && o.chegada.data, pa = o.partida && o.partida.data;
  const livre = dias.find(d => !ocupados.has(d) && d !== ch && d !== pa) || dias.find(d => !ocupados.has(d));
  if (livre) return livre;
  const ult = oyOrdena(o.itens.filter(i => i.data)).pop();
  return ult ? addDays(ult.data, 1) : '';
}
/* OPÇÕES e PREÇO DE CRIANÇA: só quando o passeio tem (prime/non-prime, minutos de voo…; ficam quietos se não houver) */
const oyOpcoes = (x) => Array.isArray(x && x.opcoes) ? x.opcoes : [];
const oyOpNome = (op) => oyPt(op && op.nome).trim();
const oyTemOpcoes = (x) => oyOpcoes(x).length > 1;
const oyPrecoCrianca = (x, k) => +((oyOpcoes(x)[+k || 0] || {}).precoCrianca || (x && x.precoCrianca) || 0);
function oyPrecoItem(x, i) {
  const pax = Math.max(1, +i.pax || 1);
  try {
    const pr = Bookings.precoDe(x, x.id, i.data || isoToday(), i.hora || '09:00', pax, +i.horas || undefined);
    if (pr && +pr.total > 0 && !(typeof sobConsulta === 'function' && sobConsulta(x))) return pr;
  } catch (e) {}
  return { total: 0 };
}
const oyTituloDe = (x, k) => oyPt(x.name) + (oyTemOpcoes(x) && oyOpNome(oyOpcoes(x)[+k || 0]) ? ' · ' + oyOpNome(oyOpcoes(x)[+k || 0]) : '');
const oyHorasTour = (x) => x && (x.priceMode === 'hora' || x.porHora);
/* um passeio do catálogo, já com o preço da tabela dela, o texto, o incluso e a foto */
function oyDoCatalogo(o, tourId, extra) {
  extra = extra || {};
  const x = Tours.get(tourId); if (!x) return null;
  const pax = +extra.pax || oyPax(o) || 2;
  const opcao = Math.max(0, Math.min(+extra.opcao || 0, Math.max(0, oyOpcoes(x).length - 1)));
  const criancas = Math.min(pax, extra.criancas != null ? +extra.criancas || 0 : (+o.criancas || 0));
  const horas = oyHorasTour(x) ? Math.max(+x.minHoras || 1, Math.round(+extra.horas || 0)) : 0;
  const base = Orc.itemDoCatalogo(tourId, { pax, data: extra.data || '', hora: extra.hora || '', horas });
  const regra = (DB.rules || []).find(r => r.tourId === tourId);
  const [h1, h2] = oyHorasDe(x, extra.hora || (regra && regra.time) || '');
  return Orc._item({ ...base, obs: extra.obs || base.obs || '', pax, criancas, opcao, horas, desc: oyTituloDe(x, opcao),
    tipo: x.type === 'transfer' ? 'traslado' : 'passeio', auto: !(+extra.valor > 0),
    valor: +extra.valor > 0 ? +extra.valor : base.valor, hora: h1 || '', horaFim: extra.horaFim || h2,
    texto: extra.texto || oyParagrafo(oyPt(x.desc) || oyPt(x.tagline)), incluso: extra.incluso || oyLista(x.includes).join(', '),
    naoIncluso: extra.naoIncluso || '', foto: oyFotosDe(x)[0] || '' });
}
/* traslado de chegada ou de saída: o preço e o incluso vêm do transfer do catálogo dela (se houver) */
function oyTraslado(o, qual) {
  const ch = qual === 'chegada', p = (ch ? o.chegada : o.partida) || {};
  const hotel = o.hotel || 'o hotel';
  const tr = Tours.all().find(x => x.type === 'transfer' && x.status !== 'draft');
  const base = tr ? Orc.itemDoCatalogo(tr.id, { pax: oyPax(o) || 2, data: p.data || '' }) : { valor: 0 };
  /* saída: hora de buscar só se ELA configurou quanto antes do voo (ex.: 4 h); senão em branco */
  const antes = +OY_CFG.saidaAntesMin || 0;
  const hora = ch ? (p.hora || '') : (p.hora && antes ? oySoma(p.hora, -antes) : '');
  return Orc._item({ tipo: 'traslado', tourId: '', auto: false, pax: oyPax(o) || 2, data: p.data || '', hora, voo: p.voo || '',
    valor: +base.valor || 0, desc: ch ? 'Traslado Aeroporto → Hotel' : 'Traslado Hotel → Aeroporto',
    texto: ch ? `Chegada prevista${p.hora ? ' às ' + p.hora : ''}${p.voo ? ' (voo ' + p.voo + ')' : ''}. Recepção e traslado ao ${hotel}.`
      : `Saída do hotel${hora ? ' às ' + hora : ''} para o voo${p.hora ? ' das ' + p.hora : ''}${p.voo ? ' (' + p.voo + ')' : ''}.`,
    incluso: tr ? oyLista(tr.includes).join(', ') : '' });
}
/* o nº de pessoas mudou: quem tinha o grupo todo acompanha, e o preço da tabela refaz */
function oyMudaPax(o, antes) {
  const agora = oyPax(o);
  for (const i of o.itens) {
    if (i.pax === antes || !i.pax) { i.pax = agora || 1; i.criancas = Math.min(i.pax, +o.criancas || 0); }
    const x = i.tourId && Tours.get(i.tourId);
    if (i.auto && x) i.valor = oyPrecoItem(x, i).total || i.valor;
  }
  o.pax = agora; o.paxNota = oyPaxTexto(o);
}
function oyHoteis(o, comVazios) {
  const l = Array.isArray(o.hoteis) ? o.hoteis.filter(h => h && (comVazios || String(h.nome || '').trim())) : [];
  return l.length ? l : (o.hotel ? [{ de: '', ate: '', nome: o.hotel, situacao: '' }] : []);
}

/* o roteiro depois da compra (kit da viagem): título, texto, foto e incluso do orçamento */
if (typeof kitServico === 'function') {
  const _oyKitServ = kitServico;
  kitServico = function (b) {
    const sv = _oyKitServ.apply(this, arguments);
    if (!sv || !b) return sv;
    if (b.orcTitulo) sv.nome = b.orcTitulo;
    if (b.orcTexto) sv.resumo = b.orcTexto;
    if (b.orcFoto) sv.foto = b.orcFoto;
    if (b.horaFim) sv.horaFim = b.horaFim;
    if (b.semHora) sv.hora = '';
    if (b.orcObs) sv.obs = b.orcObs;
    const inc = String(b.orcIncluso || '').split(/\n|,\s*(?=[A-ZÀ-Ú])/).map(t => t.trim()).filter(Boolean);
    if (inc.length) sv.inclui = inc;
    /* serviço escrito à mão (traslado, hotel, jantar): só o que ela escreveu — nada de "a pé", encontro ou paradas de outro passeio */
    if ((Tours.get(b.tourId) || {}).avulso) {
      const trf = OY_RE_TRASLADO.test(b.orcTitulo || b.servicoTxt || ''), tipos = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.guia && APP_CONFIG.guia.tipos) || {};
      Object.assign(sv, { tipo: trf && tipos.transfer ? 'transfer' : '', levar: [], paradas: [], encontro: '', duracao: '', cancel: '' });
      if (!b.orcIncluso) sv.inclui = [];
    }
    return sv;
  };
}

/* ---------- a ficha do cliente: "Viagem e orçamentos" ---------- */
const oyDig8 = (w) => String(w || '').replace(/\D/g, '').slice(-8);
function oyOrcsDoCliente(c) {
  const w = oyDig8(c.whats), e = String(c.email || '').trim().toLowerCase(), n = _nomeN(c.nome || c.name || '');
  return Orc.all().filter(o => (w.length >= 8 && oyDig8(o.cliente.whats) === w) || (e.includes('@') && String(o.cliente.email || '').toLowerCase() === e)
    || (n && !(w.length >= 8 && opNum(o.cliente.whats)) && _nomeN(o.cliente.nome) === n));
}
const oyDM = (iso) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
function oyFichaHtml(c) {
  const l = oyOrcsDoCliente(c); if (!l.length) return '';
  const temViagem = (x) => (x.chegada && x.chegada.data) || (x.partida && x.partida.data) || oyHoteis(x).length || x.itens.length;
  const o = l.find(x => x.status === 'fechado') || l.find(temViagem) || l[0];
  const ch = o.chegada || {}, pa = o.partida || {}, hs = oyHoteis(o);
  const st = (x) => (ORC_STATUS.find(s2 => s2[0] === x.status) || ['', x.status])[1];
  return `<section class="card fc-viagem" id="fcViagem">
    <h3>Viagem e orçamentos</h3>
    <div class="fc-vg">
      ${ch.data ? `<div><small>Chegada</small><b>${esc(oyDM(ch.data))}${ch.hora ? ' · ' + esc(ch.hora) : ''}</b>${ch.voo ? `<span>voo ${esc(ch.voo)}</span>` : ''}</div>` : ''}
      ${pa.data ? `<div><small>Partida</small><b>${esc(oyDM(pa.data))}${pa.hora ? ' · ' + esc(pa.hora) : ''}</b>${pa.voo ? `<span>voo ${esc(pa.voo)}</span>` : ''}</div>` : ''}
      ${oyPax(o) ? `<div><small>Pessoas</small><b>${esc(oyPaxTexto(o))}</b></div>` : ''}
    </div>
    ${hs.length ? `<div class="fc-hots">${hs.map(h => `<p><b>${esc(h.nome)}</b>${h.de || h.ate ? ` <span>${esc([oyDM(h.de), oyDM(h.ate)].filter(Boolean).join(' a '))}</span>` : ''}${h.situacao ? ` <em>${h.situacao === 'incluso' ? 'incluso' : 'à parte'}</em>` : ''}</p>`).join('')}</div>` : ''}
    <div class="fc-orcs">${l.map(x => { const ds = oyOrdena(x.itens).filter(i => i.data);
      return `<div class="fc-orc"><div><b>${esc(x.num)}</b> <span class="pill">${esc(st(x))}</span><small>${ds.length ? esc(oyDM(ds[0].data) + (ds.length > 1 ? ' a ' + oyDM(ds[ds.length - 1].data) : '')) + ' · ' : ''}${x.itens.length} ${x.itens.length === 1 ? 'serviço' : 'serviços'} · ${esc(oyM(Orc.total(x)))}</small></div>
        <div class="fc-orc-acs"><a class="mini" href="#/adm/orcamentos/${esc(x.id)}">abrir</a><a class="mini" href="#/adm/proposta/${esc(x.id)}">proposta</a>${x.status === 'fechado' && (x.bookingIds || []).length && typeof Kit !== 'undefined' ? `<button type="button" class="mini strong" data-fckit="${esc(x.id)}">roteiro</button>` : ''}</div></div>`; }).join('')}</div>
  </section>`;
}
function oyFichaPoe(c) {
  try {
    if (!c || document.getElementById('fcViagem')) return;
    const html = oyFichaHtml(c); if (!html) return;
    const stage = document.getElementById('stage'); if (!stage) return;
    const ancora = stage.querySelector('.card') || stage.firstElementChild;
    if (ancora) ancora.insertAdjacentHTML('afterend', html); else stage.insertAdjacentHTML('beforeend', html);
    document.querySelectorAll('[data-fckit]').forEach(b => b.onclick = () => { const x = Orc.get(b.dataset.fckit), bk = x && DB.bookings.find(z => z.id === x.bookingIds[0]); if (bk) Kit.abrir(kitChaveDe(bk)); });
    oyCss();
  } catch (e) {}
}
/* a ficha do cliente: viewFicha(id) (fichas.js) ou admFichaCliente(chave) (ficha.js), conforme o app */
if (typeof viewFicha === 'function') {
  const _oyFicha = viewFicha;
  viewFicha = function (id) {
    const r = _oyFicha.apply(this, arguments);
    try { const f = typeof fichasTodas === 'function' && fichasTodas().find(z => z.id === id); if (f) oyFichaPoe({ nome: f.nome, whats: f.whats, email: f.email }); } catch (e) {}
    return r;
  };
}
if (typeof admFichaCliente === 'function') {
  const _oyFichaCli = admFichaCliente;
  admFichaCliente = function (chave) {
    const r = _oyFichaCli.apply(this, arguments);
    try {
      const b = DB.bookings.find(z => typeof kitChaveDe === 'function' && kitChaveDe(z) === chave);
      if (b) oyFichaPoe({ nome: b.name, whats: b.whats, email: b.email });
    } catch (e) {}
    return r;
  };
}

/* ---------- 2. a proposta: os dados que vão para o cliente ---------- */
function ppDados(o) {
  const st = DB.settings || {}, g = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.guia) || {};
  const regs = Object.fromEntries(regioes().map(r => [r[0], r[1]]));
  return {
    tipo: 'proposta', v: 1, num: o.num, negocio: guiaNegocio(),
    contato: { whats: st.whats || g.whats || '', email: st.email || g.email || '', insta: String(st.insta || g.insta || '').replace(/^@/, '') },
    nome: o.cliente.nome || '', pessoas: oyPaxTexto(o), pax: oyPax(o), hotel: o.hotel || '',
    hoteis: oyHoteis(o).map(h => ({ nome: String(h.nome || '').trim(), de: h.de || '', ate: h.ate || '', situacao: h.situacao || '' })),
    chegada: o.chegada || null, partida: o.partida || null, moeda: OY_MOEDA, imposto: OY_IMP,
    itens: oyOrdena(o.itens).filter(i => !i.sugestao).map(i => {
      const x = i.tourId && Tours.get(i.tourId);
      return { ...(o.mostraValores ? { valor: i.aParte ? null : +i.valor || 0 } : {}), data: i.data || '', hora: i.hora || '', horaFim: i.horaFim || '', rotulo: i.rotulo || '', titulo: i.desc || '', horas: oyHorasTour(x) ? +i.horas || +x.minHoras || 1 : 0,
        texto: i.texto || '', incluso: i.incluso || '', naoIncluso: i.naoIncluso || '', aParte: !!i.aParte,
        obs: i.sugestao || OY_OBS_INTERNA.test(i.obs || '') ? '' : (i.obs || ''), foto: i.foto || '', tipo: i.tipo, voo: i.voo || '',
        cidade: x && regs[x.region] ? regs[x.region] : '' };
    }),
    subtotal: Orc.subtotal(o), vatPct: oyVatPct(o), vat: Orc.vat(o),
    total: Orc.total(o), porPessoa: oyPorPessoa(o), porAdulto: oyPorTipo(o).adulto, porCrianca: oyPorTipo(o).crianca, criancas: +o.criancas || 0, pago: +o.pago || 0, pendente: oyPendente(o),
    validade: o.validade || '', obs: o.obs || '',
    pagar: /^https:\/\//i.test(String(o.linkPagamento || '').trim()) ? String(o.linkPagamento).trim() : '',
    pagarCrianca: oyPagModo(o) === 'pessoa' && +o.criancas > 0 && /^https:\/\//i.test(String(o.linkPagamentoCrianca || '').trim()) ? String(o.linkPagamentoCrianca).trim() : '',
    pagarModo: oyPagModo(o), pagarValor: oyPagValor(o).v, pagarValorCrianca: oyPagValor(o).vc,
    politica: o.politica != null ? o.politica : ppTextoPadrao('politica'),
    condicoes: o.condicoes != null ? o.condicoes : ppTextoPadrao('condicoes'),
    diferencial: o.diferencial != null ? o.diferencial : ppTextoPadrao('diferencial'),
    /* a capa: as fotos DELA — as da marca (config) e, se faltar, as dos passeios publicados (nunca foto de outra cidade) */
    logo: OY_CFG.logo || '', capa: [...(OY_CFG.capa || []), ...Tours.all().filter(x => x.status !== 'draft' && !x.avulso).flatMap(x => oyFotosDe(x).slice(0, 1))]
      .filter((f, k, l) => f && l.indexOf(f) === k).slice(0, 3),
  };
}
/* o quadro do investimento mostra SÓ o jeito de cobrar que ela escolheu (grupo, casal ou individual) */
function ppInvestimento(d) {
  const modo = d.pagarModo || 'total', cri = +d.criancas > 0, imp = d.imposto || OY_IMP;
  const vat = d.vatPct > 0
    ? `<p class="pp-vat">${d.itens.some(i => 'valor' in i) ? `Valores dos serviços sem ${esc(imp)}. ` : ''}Subtotal ${esc(oyM(d.subtotal))} + ${esc(imp)} ${esc(String(d.vatPct).replace('.', ','))}% ${esc(oyM(d.vat))}. O total já inclui o ${esc(imp)}.</p>` : '';
  const pago = d.pago > 0 ? `<div class="pp-pago"><span>Pago <b>${esc(oyM(d.pago))}</b></span><span>Pendente <b>${esc(oyM(d.pendente))}</b></span></div>` : '';
  const caixa = (rot, v) => `<div><small>${rot}</small><b>${esc(oyM(v))}</b></div>`;
  let extra = '', ind = '';
  if (modo === 'pessoa' && d.pax > 1) {
    extra = cri ? caixa('Por adulto', d.porAdulto) + caixa('Por criança', d.porCrianca) : caixa('Por pessoa', d.porPessoa);
    ind = `<div class="pp-ind">Pagamento individual | ${cri ? `adulto ${esc(oyM(d.porAdulto))} · criança ${esc(oyM(d.porCrianca))}` : esc(oyM(d.porPessoa))}</div>`;
  } else if (modo === 'casal') {
    extra = caixa('Por casal', d.pagarValor);
    ind = `<div class="pp-ind">Pagamento por casal | ${esc(oyM(d.pagarValor))}</div>`;
  }
  return `<div class="pp-invg${modo === 'pessoa' && cri ? ' pp-tres' : ''}">${caixa('Investimento total', d.total)}${extra}</div>${vat}${pago}${ind}`;
}
function ppBotoesPagar(d, cls, curto) {
  if (!d.pagar) return '';
  const modo = d.pagarModo || 'total', v = +d.pagarValor || 0, cri = +d.criancas > 0;
  const rot = modo === 'pessoa' ? (cri ? 'Pagar por adulto' : 'Pagar por pessoa') : modo === 'casal' ? 'Pagar por casal' : 'Pagar agora';
  const b = (href, txt) => `<a class="${cls}" data-pdf-fora href="${esc(href)}" target="_blank" rel="noopener">${esc(txt)}</a>`;
  return b(d.pagar, rot + (v ? ' · ' + oyM(v) : ''))
    + (d.pagarCrianca ? b(d.pagarCrianca, 'Pagar por criança' + (+d.pagarValorCrianca ? ' · ' + oyM(+d.pagarValorCrianca) : '')) : '');
}
const PP_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ppSemana = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
const ppDiaMes = (iso) => +iso.slice(8, 10) + ' de ' + PP_MES[+iso.slice(5, 7) - 1];
function ppPeriodo(d) {
  const ds = [d.chegada && d.chegada.data, d.partida && d.partida.data, ...d.itens.map(i => i.data)].filter(Boolean).sort();
  if (!ds.length) return '';
  const a = ds[0], b = ds[ds.length - 1];
  if (a === b) return ppDiaMes(a) + ' de ' + a.slice(0, 4);
  if (a.slice(0, 7) === b.slice(0, 7)) return `${+a.slice(8, 10)} a ${+b.slice(8, 10)} de ${PP_MES[+a.slice(5, 7) - 1]} de ${a.slice(0, 4)}`;
  return `${ppDiaMes(a)} a ${ppDiaMes(b)} de ${b.slice(0, 4)}`;
}
const ppHoras = (i) => i.hora ? (i.horaFim ? `${i.hora}–${i.horaFim}` : i.hora) : '';
const ppEsc = (t) => esc(String(t || '')).replace(/\n/g, '<br>');
const ppCssUrl = (f) => String(f || '').replace(/'/g, '%27');
function ppHtml(d) {
  const fotos = [...new Set(d.itens.map(i => i.foto).filter(Boolean))];
  /* a capa: as fotos dos serviços e as da marca dela; com menos de 3, repete (nunca foto de outro lugar) */
  const pool = [...fotos, ...(d.capa || [])].filter((f, k, l) => f && l.indexOf(f) === k);
  const capa = pool.length ? [0, 1, 2].map(k => pool[k % pool.length]) : [];
  const cidades = [...new Set(d.itens.map(i => i.cidade).filter(Boolean))];
  const linha = [d.nome, d.pessoas].filter(Boolean).join(' | ');
  const dias = []; for (const i of d.itens) { const k = i.data || ''; let g = dias.find(x => x.d === k); if (!g) dias.push(g = { d: k, l: [] }); g.l.push(i); }
  dias.sort((a, b) => (a.d || '9999').localeCompare(b.d || '9999'));
  const tag = (i) => [i.data ? ppSemana(i.data) : '', i.data ? i.data.slice(8, 10) + '/' + i.data.slice(5, 7) : '', ppHoras(i), i.horas ? i.horas + (i.horas > 1 ? ' horas' : ' hora') : '', i.rotulo, i.voo && i.tipo === 'traslado' ? 'voo ' + i.voo : ''].filter(Boolean).join(' | ');
  const cartao = (i) => `<section class="pp-card">
      ${tag(i) ? `<div class="pp-tag">${esc(tag(i))}</div>` : ''}
      <h3 class="pp-tit">${esc(i.titulo)}${i.aParte ? ' <span class="pp-aparte">(à parte)</span>' : ''}${'valor' in i && !i.aParte && +i.valor > 0 ? ` <span class="pp-preco">${esc(oyM(+i.valor))}</span>` : ''}</h3>
      ${i.foto ? `<div class="pp-foto" role="img" aria-label="${esc(i.titulo)}" style="background-image:url('${esc(ppCssUrl(i.foto))}')"></div>` : ''}
      ${i.texto ? `<p>${ppEsc(i.texto)}</p>` : ''}
      ${i.incluso ? `<p class="pp-inc"><b>INCLUSO:</b> ${ppEsc(i.incluso)}</p>` : ''}
      ${i.naoIncluso ? `<p class="pp-inc"><b>NÃO INCLUSO:</b> ${ppEsc(i.naoIncluso)}</p>` : ''}
      ${i.obs ? `<div class="pp-obs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12Z"/></svg><p>${ppEsc(i.obs)}</p></div>` : ''}
    </section>`;
  const cabDia = (g) => {
    const cid = [...new Set(g.l.map(i => i.cidade).filter(Boolean))].join(' & ');
    return `<p class="pp-kick">Roteiro personalizado</p><h2 class="pp-h2">${g.d ? esc(ppDiaMes(g.d)) : 'Mais experiências'}${cid ? ` <span>| ${esc(cid)}</span>` : ''}</h2>`;
  };
  const contato = [d.contato.whats && oyFone(d.contato.whats), d.contato.email, d.contato.insta && '@' + d.contato.insta].filter(Boolean);
  const mNome = PP_MOEDA_NOME[d.moeda] ? `${PP_MOEDA_NOME[d.moeda]} (${d.moeda})` : d.moeda;
  return `
  <section class="pp-capa${capa.length ? '' : ' pp-semfoto'}">
    <div class="pp-fotos" aria-hidden="true">
      ${capa.map((f, k) => `<div class="pp-f pp-f${k + 1}" style="background-image:url('${esc(ppCssUrl(f))}')"></div>`).join('')}
      ${capa.length ? '<i class="pp-corte pp-c1"></i><i class="pp-corte pp-c2"></i>' : ''}
    </div>
    ${d.logo ? `<div class="pp-logo"><img src="${esc(d.logo)}" alt="${esc(d.negocio)}"></div>` : ''}
    <div class="pp-capatxt">
      <p class="pp-capak">${esc(d.negocio)}${cidades.length ? ' <i>|</i> ' + esc(cidades.join(' & ')) : ''}</p>
      <h1>Proposta de<br>experiências</h1>
      ${linha ? `<p>${esc(linha)}</p>` : ''}
      ${ppPeriodo(d) ? `<p>${esc(ppPeriodo(d))}</p>` : ''}
      ${(d.hoteis || []).length > 1 ? `<p>${esc(d.hoteis.map(h => h.nome).join(' · '))}</p>` : d.hotel ? `<p>${esc(d.hotel)}</p>` : ''}
    </div>
  </section>
  ${dias.map(g => `<div class="pp-dia">
    <section class="pp-bloco">${cabDia(g)}${cartao(g.l[0])}</section>
    ${g.l.slice(1).map(cartao).join('')}
  </div>`).join('')}
  ${d.obs ? `<section class="pp-box"><h3>Observações</h3><p>${ppEsc(d.obs)}</p></section>` : ''}
  ${(d.hoteis || []).length ? `<section class="pp-box"><h3>Hospedagem</h3>${d.hoteis.map(h => `<p class="pp-hot"><b>${esc(h.nome)}</b>${h.de || h.ate ? `<span>${esc([h.de, h.ate].filter(Boolean).map(x => x.slice(8, 10) + '/' + x.slice(5, 7)).join(' a '))}</span>` : ''}${h.situacao ? `<em>${h.situacao === 'incluso' ? 'incluso' : 'à parte'}</em>` : ''}</p>`).join('')}</section>` : ''}
  <section class="pp-inv">
    ${ppInvestimento(d)}
    ${ppBotoesPagar(d, 'pp-pagar')}
  </section>
  ${d.politica || d.condicoes ? `<section class="pp-box"><h3>Condições e política de cancelamento</h3>
    ${d.politica ? `<p>${ppEsc(d.politica)}</p>` : ''}
    ${String(d.condicoes || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => `<p class="pp-forte">${esc(s)}</p>`).join('')}</section>` : ''}
  <section class="pp-box">
    ${d.diferencial ? `<h3 class="pp-ouro">O diferencial ${esc(d.negocio)}</h3><p>${ppEsc(d.diferencial)}</p>` : ''}
    <p class="pp-forte">${d.validade ? `Cotação válida até ${esc(d.validade.split('-').reverse().join('/'))}. ` : ''}Valores em ${esc(mNome)}.</p>
  </section>
  ${contato.length ? `<footer class="pp-pe">${contato.map(c => `<span>${esc(c)}</span>`).join('<i aria-hidden="true">|</i>')}</footer>` : ''}`;
}

/* as cores são as DA MARCA de cada app (tokens.css) — os tons dela */
function ppCss() {
  if (document.getElementById('ppCss')) return;
  const s = document.createElement('style'); s.id = 'ppCss';
  s.textContent = `
  /* a proposta é um DOCUMENTO: sempre clara, mesmo dentro do painel escuro (só as cores da marca vêm do app) */
  .pp{--pp-fundo:#F6F3EE;--pp-ouro:var(--brand-dourado,#C9A23B);--pp-ouro-t:var(--brand-primaria,#5C4812);--pp-n:#1C1A17;--pp-t:#4B463F;--pp-escuro:var(--brand-primaria,#141414);--pp-claro:#FBF8F3;
    color-scheme:light;background:var(--pp-fundo);color:var(--pp-n);font-family:var(--f-ui),system-ui,sans-serif;max-width:794px;margin:0 auto;padding-bottom:28px}
  .pp p{margin:0 0 8px;font-size:14.5px;line-height:1.55;color:var(--pp-t)}
  .pp-capa{position:relative;aspect-ratio:794/1123;min-height:480px;overflow:hidden;background:var(--pp-escuro);margin-bottom:26px}
  .pp-pg .pp-capa{max-height:calc(100svh - 56px)}
  .em-pdf .pp-capa{max-height:none!important}
  .pp-fotos{position:absolute;inset:0}
  .pp-f{position:absolute;left:0;right:0;background-size:cover;background-position:center}
  .pp-f1{top:0;height:38%}
  .pp-f2{top:33%;height:34%}
  .pp-f3{top:61%;bottom:0}
  .pp-corte{position:absolute;left:-10%;width:120%;height:16px;background:var(--pp-claro)}
  .pp-c1{top:34.6%;transform:rotate(-4deg)}
  .pp-c2{top:61.6%;transform:rotate(3deg)}
  .pp-logo{position:absolute;top:4%;left:5.5%;background:#fff;border-radius:16px;padding:14px 22px}
  .pp-logo img{display:block;height:54px;width:auto;max-width:260px;object-fit:contain}
  .pp-capatxt{position:absolute;left:0;right:0;bottom:0;padding:26px 6% 34px;background:rgba(15,15,15,.62);color:#fff}
  .pp-semfoto .pp-capatxt{background:none}
  .pp-capatxt p{color:#fff;margin:6px 0 0;font-size:15px}
  .pp-capak{font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pp-ouro)!important;font-size:12.5px!important;margin:0 0 10px!important}
  .pp-capak i{font-style:normal;opacity:.7;margin:0 6px}
  .pp-capatxt h1{font-family:var(--f-titulo,var(--f-display,var(--f-ui))),system-ui,sans-serif;font-weight:800;text-transform:uppercase;font-size:clamp(28px,7vw,40px);line-height:1.08;letter-spacing:.01em;margin:0 0 14px;color:#fff}
  .pp-dia,.pp-box,.pp-inv,.pp-pe{margin-left:5.5%;margin-right:5.5%}
  .pp-bloco{margin:0}
  .pp-kick{font-weight:700;font-size:12.5px!important;letter-spacing:.06em;text-transform:uppercase;color:var(--pp-ouro-t)!important;margin:30px 0 6px!important}
  .pp-h2{font-family:var(--f-titulo,var(--f-ui)),system-ui,sans-serif;font-weight:800;letter-spacing:-.01em;font-size:clamp(24px,5.6vw,32px);line-height:1.15;margin:0 0 14px;padding-bottom:14px;border-bottom:3px solid var(--pp-ouro);color:var(--pp-n)}
  .pp-h2 span{color:var(--pp-n)}
  .pp-card,.pp-box{background:#fff;border-radius:18px;padding:18px 18px 12px;margin:0 0 16px}
  .pp-box{margin:0 5.5% 16px}
  .pp-tag{background:var(--pp-escuro);color:#fff;border-radius:8px;padding:7px 11px;font-weight:800;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;margin-bottom:12px}
  .pp-tit{font-size:17px;font-weight:800;margin:0 0 10px;color:var(--pp-n);line-height:1.3}
  .pp-foto{height:230px;border-radius:10px;background-size:cover;background-position:center;margin:0 0 12px;background-color:#EDE8DF}
  .pp-inc{font-size:13.5px!important}
  .pp-inc b{color:var(--pp-n);font-weight:700}
  .pp-box h3{font-size:16px;font-weight:800;margin:4px 0 10px;color:var(--pp-n)}
  .pp-ouro{color:var(--pp-ouro-t)!important;text-transform:uppercase;letter-spacing:.04em;font-size:14px!important}
  .pp-forte{font-weight:700;color:var(--pp-n)!important;font-size:13.5px!important}
  .pp-inv{background:var(--pp-escuro);border-radius:18px;padding:22px;margin-bottom:16px;color:#fff}
  .pp-invg{display:grid;grid-template-columns:1fr 1fr;align-items:end;gap:14px;margin:0 0 16px}
  .pp-tres>div:first-child{grid-column:1/-1}
  .pp-preco{float:right;margin-left:12px;font-weight:800;white-space:nowrap;color:var(--pp-n)}
  .pp-invg small{display:block;color:var(--pp-ouro);font-weight:800;letter-spacing:.05em;text-transform:uppercase;font-size:12px}
  .pp-invg b{display:block;font-size:clamp(24px,6vw,34px);font-weight:800;margin-top:6px;color:#fff;letter-spacing:-.01em}
  .pp-vat{color:rgba(255,255,255,.82)!important;font-size:13px!important;margin:-6px 0 14px!important}
  .pp-obs{display:flex;gap:10px;align-items:flex-start;margin:6px 0 10px;padding:11px 14px;border-radius:14px 14px 14px 4px;background:#F3EFE8;border:1px solid #E6DED2}
  .pp-obs svg{flex:none;width:18px;height:18px;margin-top:2px;color:var(--pp-ouro-t)}
  .pp-obs p{margin:0!important;color:var(--pp-n)!important;font-size:14px!important}
  .pp-aparte{font-weight:500;color:var(--pp-t);font-size:14px}
  .pp-hot{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;padding:6px 0;border-top:1px solid #ECE5D8}
  .pp-hot:first-of-type{border-top:0}
  .pp-hot b{color:var(--pp-n)}
  .pp-hot span{color:var(--pp-t);font-size:13.5px}
  .pp-hot em{font-style:normal;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--pp-ouro-t)}
  .pp-pago{display:flex;flex-wrap:wrap;gap:8px 18px;margin:0 0 14px;color:rgba(255,255,255,.85);font-size:14px}
  .pp-pago b{color:#fff}
  .pp-ind{background:#fff;color:var(--pp-escuro);border-radius:10px;padding:14px;text-align:center;font-weight:800;letter-spacing:.02em}
  .pp-pe{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 0;font-size:12.5px;color:var(--pp-t);padding:18px 0 4px}
  .pp-pe span{white-space:nowrap}
  .pp-pe i{font-style:normal;margin:0 8px;opacity:.6}
  .pp-pg{background:#F6F3EE;color-scheme:light;min-height:100svh;padding-bottom:96px}
  .pp-topo{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:10px;padding:max(10px,env(safe-area-inset-top)) 16px 10px;background:#fff;color:#1C1A17;border-bottom:1px solid #E6DED2}
  .pp-topo img{height:26px;width:auto;max-width:180px;object-fit:contain}
  .pp-topo b{font-family:var(--f-titulo,var(--f-ui))}
  .pp-topo .mini{margin-left:auto}
  .pp-cta{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));z-index:60;display:flex;gap:8px;width:min(560px,calc(100% - 28px))}
  .pp-cta a,.pp-cta button{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;border-radius:999px;font-weight:800;font-size:15px;text-decoration:none;border:0;cursor:pointer}
  .pp-cta .pp-zap{background:var(--brand-primaria,#141414);color:#fff;box-shadow:0 14px 30px -14px rgba(0,0,0,.6)}
  .pp-cta .pp-zap svg{width:22px;height:22px}
  .pp-cta .pp-pg-pagar{background:#fff;color:var(--brand-primaria,#141414);border:2px solid var(--brand-primaria,#141414);box-shadow:0 14px 30px -14px rgba(0,0,0,.5)}
  .pp-pagar{display:flex;align-items:center;justify-content:center;min-height:52px;margin-top:12px;border-radius:999px;background:#fff;color:var(--pp-escuro);font-weight:800;text-decoration:none}
  .pp-pagar:focus-visible,.pp-cta a:focus-visible,.pp-cta button:focus-visible{outline:3px solid var(--pp-ouro);outline-offset:3px}
  .pp-pg .pdfPronto{margin:12px auto}
  @media(min-width:700px){.pp-foto{height:300px}.pp-card,.pp-box{padding:22px 24px 14px}}
  .em-pdf .pp-foto{height:200px}
  .em-pdf .pp-kick{margin-top:18px}.em-pdf .pp-h2{margin-bottom:10px}.em-pdf .pp-tag{margin-bottom:10px}
  @media print{.pp-cta,.pp-topo{display:none!important}}`;
  document.head.appendChild(s);
}

/* ---------- 3. o link: curto (tabela kits) ou comprido ---------- */
const ppPodeNuvem = () => typeof temNuvem === 'function' && temNuvem() && typeof isLoggedIn === 'function' && isLoggedIn() && !(typeof Kit !== 'undefined' && Kit.semTabela);
const ppBase = () => typeof kitBase === 'function' ? kitBase() : Publico.base();
function oyNovoToken() {
  if (typeof kitNovoToken === 'function') return kitNovoToken();
  const A = 'ACDEFGHJKMNPQRTUVWXYabcdefghjkmnpqrstuvwxyz34679', u = new Uint8Array(10);
  crypto.getRandomValues(u); return [...u].map(n => A[n % A.length]).join('');
}
async function ppLink(o) {
  const d = ppDados(o);
  if (ppPodeNuvem()) {
    o.prop = o.prop || {};
    if (!o.prop.token) { o.prop.token = oyNovoToken(); Orc.salva(o); }
    try {
      const r = await supaFetch('kits', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ token: o.prop.token, dados: d, atualizado_em: new Date().toISOString() }) });
      if (r.ok || r.status === 201 || r.status === 204) {
        o.prop.publicado = o.prop.publicado || new Date().toISOString(); o.prop.atualizado = new Date().toISOString(); Orc.salva(o);
        return ppBase() + '#/p/' + o.prop.token;
      }
      if (r.status === 404 || r.status === 400) { const j = await r.json().catch(() => ({})); if (/kits|relation|schema cache|PGRST205/i.test(JSON.stringify(j)) && typeof Kit !== 'undefined') Kit.semTabela = true; }
    } catch (e) {}
  }
  /* o comprido leva tudo dentro do link: foto colada (data:) não cabe */
  const leve = { ...d, itens: d.itens.map(i => /^data:/.test(i.foto || '') ? { ...i, foto: '' } : i) };
  return ppBase() + '#/pp/' + await Publico.codifica(leve);
}
/* mandou e depois mexeu: o mesmo link curto se atualiza */
let _ppRepub = null;
function ppRepublica(o) {
  if (!(o.prop && o.prop.publicado && ppPodeNuvem())) return;
  clearTimeout(_ppRepub);
  _ppRepub = setTimeout(() => { ppLink(Orc.get(o.id) || o).catch(() => {}); }, 2500);
}
function ppMensagem(o, url) {
  const n = opPrimeiro(o.cliente.nome);
  return `Olá${n ? ', ' + n : ''}! Tudo bem? 😊 Preparei a sua proposta de experiências: o roteiro dia a dia, com fotos, o que está incluso e o investimento.\n${url}\n\nSe quiser ajustar alguma coisa, é só me falar aqui. ${guiaNome()}`;
}
const ppArquivo = (nome) => String(guiaNegocio() || 'Proposta').replace(/[^\wÀ-ú]+/g, '_') + '_Proposta_' + String(nome || 'cliente').replace(/\s+/g, '_');

/* ---------- a página do cliente: #/p/<código> e #/pp/<tudo dentro> ---------- */
const _oyTituloApp = typeof document !== 'undefined' ? document.title : '';
function ppPagina(d) {
  ppCss();
  const nome = d.nome || '', neg = d.negocio || guiaNegocio();
  document.title = 'Proposta de experiências' + (nome ? ' · ' + nome : '') + ' · ' + neg;
  const logo = OY_CFG.logoTopo || d.logo;
  app.innerHTML = `<div class="pp-pg">
    <header class="pp-topo">${logo ? `<img src="${esc(logo)}" alt="${esc(neg)}">` : `<b>${esc(neg)}</b>`}<button class="mini" id="ppPdf" type="button">Baixar PDF</button></header>
    <main class="pp" id="ppDoc">${ppHtml(d)}</main>
    <div class="pp-cta" data-pdf-fora>${ppBotoesPagar(d, 'pp-pg-pagar', true)}<a class="pp-zap" target="_blank" rel="noopener" href="${esc(waLink(`Olá! Vi a proposta ${d.num || ''}${nome ? ' (' + nome + ')' : ''} e quero reservar.`))}">${ICONE_WA} ${d.pagar ? 'Falar' : 'Quero reservar'}</a></div>
  </div>`;
  if (typeof pdfLiga === 'function') pdfLiga($('#ppPdf'), () => $('#ppDoc'), () => ppArquivo(nome));
  route._oyPub = location.hash;
  scrollTo(0, 0);
}
async function ppAbreCurto(partes) {
  const tok = String((partes || [])[0] || '').replace(/[^A-Za-z0-9]/g, '');
  if (!tok) return paginaPublicaErro();
  if (!(typeof temNuvem === 'function' && temNuvem())) return paginaPublicaErro('Este link de proposta não abre aqui. Peça um novo pelo WhatsApp.');
  app.innerHTML = '<main class="wrap"><p class="why center" style="margin-top:40px">Abrindo a sua proposta…</p></main>';
  const { ok, d } = await lerLinkPublico(tok);
  if (!ok) return paginaPublicaErro('A conexão falhou ao abrir a sua proposta. Confira a internet e toque em "Tentar de novo".', true);
  if (!d || d.tipo !== 'proposta') return paginaPublicaErro('Esta proposta não existe mais. Peça uma nova pelo WhatsApp.');
  try { ppPagina(d); } catch (e) { paginaPublicaErro('Não consegui montar a proposta agora. Toque em "Tentar de novo".', true); }
}
/* as rotas públicas (sem login). A nuvem atualizou enquanto o cliente lê? A proposta NÃO redesenha
   (voltava ao topo — achado em 29/10/2026); e o mesmo link não é buscado de novo. */
function ppRota(qual, partes) {
  if (route._oyPub === location.hash && document.getElementById('ppDoc')) return true;
  if (route._oyAbrindo === location.hash) return true;
  route._oyAbrindo = location.hash;
  const fim = () => { if (route._oyAbrindo === location.hash) route._oyAbrindo = ''; };
  if (qual === 'p') ppAbreCurto(partes).finally(fim);
  else { abrePublico(partes, (d) => d && d.tipo === 'proposta' ? ppPagina(d) : paginaPublicaErro()); setTimeout(fim, 1500); }
  return true;
}
/* as rotas públicas: rotaExtra(p) ou ROTAS_EXTRA[nome] (o route() chama antes das rotas dele), conforme o app */
if (typeof rotaExtra === 'function') {
  const _rotaExtraOrc = rotaExtra;
  rotaExtra = function (p) { return p[0] === 'p' || p[0] === 'pp' ? ppRota(p[0], p.slice(1)) : _rotaExtraOrc(p); };
} else {
  window.ROTAS_EXTRA = window.ROTAS_EXTRA || {};
  ROTAS_EXTRA.p = (partes) => ppRota('p', partes);
  ROTAS_EXTRA.pp = (partes) => ppRota('pp', partes);
}
/* saindo da proposta, o título da aba volta a ser do site */
if (typeof addEventListener === 'function') addEventListener('hashchange', () => {
  if (!/^#\/pp?\//.test(location.hash) && route._oyPub) { document.title = _oyTituloApp; route._oyPub = ''; }
});

/* ---------- 4. a proposta dentro do painel: conferir, PDF, link, WhatsApp ---------- */
async function ppAdm(id) {
  const o = Orc.get(id); if (!o) return go('/adm/orcamentos');
  ppCss(); oyCss();
  const temWa = !!opNum(o.cliente.whats);
  const f = o.itens.filter(i => i.sugestao);
  admShell('orcamentos', `<div class="pp-adm">
    <div class="doc-barra pp-adbar">
      <a class="mini" href="#/adm/orcamentos/${esc(o.id)}">← editar</a>
      <button class="cta sm" id="ppPdf" type="button">Gerar PDF</button>
      <button class="mini" id="ppLk" type="button" disabled>Preparando o link…</button>
      ${temWa ? `<a class="mini strong" id="ppWa" target="_blank" rel="noopener" aria-disabled="true">WhatsApp</a>` : ''}
      ${o.status === 'fechado' && (o.bookingIds || []).length && typeof Kit !== 'undefined' ? `<button class="mini" id="ppKit" type="button">Roteiro da viagem</button>` : ''}
    </div>
    <p class="why pp-adwhy">É assim que o cliente vê. ${temWa ? '' : 'Sem o WhatsApp do cliente: copie o link e mande você.'}</p>
    ${f.length ? `<p class="alert warn pp-adwhy">${f.length === 1 ? 'Ficou fora desta proposta' : `Ficaram fora desta proposta ${f.length} pedidos`} da conversa, ainda sem valor: ${esc(f.map(i => i.desc).join(', '))}. Volte em ← editar, ponha o valor (ou apague).</p>` : ''}
    <main class="pp" id="ppDoc">${ppHtml(ppDados(o))}</main>
  </div>`);
  if (typeof pdfLiga === 'function') pdfLiga($('#ppPdf'), () => $('#ppDoc'), () => ppArquivo(o.cliente.nome || o.num), { aoEntregar: () => oyMarcaEnviado(o) });
  const pk = $('#ppKit'); if (pk) pk.onclick = () => { const b = DB.bookings.find(z => z.id === o.bookingIds[0]); if (b) Kit.abrir(kitChaveDe(b)); };
  let url = '';
  try { url = await ppLink(o); } catch (e) { url = ''; }
  const lk = $('#ppLk'); if (!lk) return;
  if (!url) { lk.textContent = 'Sem internet para o link'; return; }
  lk.disabled = false; lk.textContent = 'Copiar link';
  lk.onclick = () => opCopia(url).then(() => { toast('Link da proposta copiado'); oyMarcaEnviado(o); });
  const wa = $('#ppWa');
  if (wa) { wa.href = waLink(ppMensagem(o, url), opNum(o.cliente.whats)); wa.removeAttribute('aria-disabled'); wa.onclick = () => oyMarcaEnviado(o); }
}
/* mandou: "enviado" + a tarefa de esperar a resposta (a "Espera" da base de operação, nas tarefas dela) */
function oyMarcaEnviado(o) {
  if (['fechado', 'perdido', 'enviado'].includes(o.status)) return;
  o.status = 'enviado'; o.enviadoEm = isoToday(); Orc.salva(o);
  let tarefa = false;
  if (Array.isArray(DB.tarefas)) {
    DB.tarefas.push({ id: uid() + uid(), texto: `Aguardar resposta da proposta ${o.num}${o.cliente.nome ? ' (' + o.cliente.nome + ')' : ''}`, nota: 'Se não responder, mandar uma mensagem leve perguntando se ficou alguma dúvida.',
      data: addDays(isoToday(), 3), feita: false, area: 'pro', criado: new Date().toISOString(), orcamentoId: o.id });
    oyGrava(); tarefa = true;
  }
  toast(tarefa ? 'Proposta enviada · tarefa "aguardar resposta" em 3 dias' : 'Proposta marcada como enviada');
}

/* ---------- 5. o editor ---------- */
const OY_IC = {
  mais: '<path d="M12 5v14M5 12h14"/>',
  aviao: '<path d="M2.5 13.5l7-2.3L13 3.6c.4-.9 1.8-.7 1.8.3l-.6 6.6 6.2-.1c.9 0 1.2 1.2.4 1.6l-6.8 3.5-1.9 5.3c-.3.8-1.5.7-1.6-.2l-.6-4.4-5.9.3c-.8 0-1.2-1-.5-1.5Z"/>',
  livre: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  seta: '<path d="M9 5l7 7-7 7"/>',
  conversa: '<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12Z"/>',
};
const oyIc = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${OY_IC[k]}</svg>`;
const oyDiaLongo = (iso) => { if (!iso) return 'Sem dia definido'; const w = new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }); return w.charAt(0).toUpperCase() + w.slice(1) + ', ' + iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(2, 4); };
const oyDiaCurto = (iso) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') + ' · ' + iso.slice(8, 10) + '/' + iso.slice(5, 7) : 'Sem dia';
const oyImpPadrao = (o) => o.vatPct != null && o.vatPct !== '' ? +o.vatPct : OY_VAT;

function oyTela(id) {
  const o = Orc.get(id);
  if (!o) { go('/adm/orcamentos'); return; }
  oyCss();
  if (o.adultos == null && o.criancas == null) { o.adultos = +o.pax || 0; o.criancas = 0; }
  o.chegada = o.chegada || { data: '', hora: '', voo: '' };
  o.partida = o.partida || { data: '', hora: '', voo: '' };
  o.moeda = OY_MOEDA;
  const m = OY_MOEDA, S = oyTela._s = oyTela._s && oyTela._s.id === id ? oyTela._s : { id, aberto: '' };
  const itens = oyOrdena(o.itens);
  const grupos = []; for (const i of itens) { const k = i.data || ''; let g = grupos.find(x => x.d === k); if (!g) grupos.push(g = { d: k, l: [] }); g.l.push(i); }
  const nDias = grupos.filter(g => g.d).length;
  const st = (ORC_STATUS.find(s => s[0] === o.status) || ['', o.status])[1];
  const custoTot = o.itens.reduce((s, x) => s + (+x.custo || 0), 0);

  /* os campos de um serviço; "so" = só o que não aparece na linha da planilha */
  const campos = (i, so) => {
    const x = i.tourId && Tours.get(i.tourId), fotos = x ? oyFotosDe(x) : [];
    const rap = oyRapidos();
    return `${so ? '' : `<div class="oy-g3 oy-quando">
          <label class="fld">Dia<input type="date" data-k="data" value="${esc(i.data)}"></label>
          <label class="fld">Início<input type="time" data-k="hora" value="${esc(oyHm(i.hora) || '')}"></label>
          <label class="fld">Fim<input type="time" data-k="horaFim" value="${esc(oyHm(i.horaFim) || '')}"></label>
        </div>
        <label class="fld">Título<input data-k="desc" value="${esc(i.desc)}"></label>
        <label class="fld">O que o cliente vai ler<textarea data-k="texto" rows="4">${esc(i.texto)}</textarea></label>`}
        <label class="fld">Incluso<textarea data-k="incluso" rows="2">${esc(i.incluso)}</textarea></label>
        <label class="fld">Não incluso<textarea data-k="naoIncluso" rows="2">${esc(i.naoIncluso || '')}</textarea></label>
        ${rap.length ? `<div class="oy-rap" role="group" aria-label="Não incluso de um toque">${rap.map(t => `<button type="button" class="chip ${oyTemFrase(i.naoIncluso, t) ? 'on' : ''}" data-rap="${esc(t)}" aria-pressed="${oyTemFrase(i.naoIncluso, t)}">${esc(t)}</button>`).join('')}</div>` : ''}
        <label class="fld">Observação <small class="why">(aparece num balão na proposta e no roteiro)</small><textarea data-k="obs" rows="2" placeholder="Ex.: volta para o hotel por conta do cliente">${esc(OY_OBS_INTERNA.test(i.obs || '') ? '' : (i.obs || ''))}</textarea></label>
        <label class="optin oy-aparte"><input type="checkbox" data-k="aParte" ${i.aParte ? 'checked' : ''}><span><b>À parte</b><small>entra no roteiro, por conta do cliente, sem valor</small></span></label>
        ${x ? (() => { const pc = oyPrecoCrianca(x, i.opcao), idade = +((oyOpcoes(x)[+i.opcao || 0] || {}).idadeCrianca || x.idadeCrianca || 0);
          return `<div class="oy-g3 oy-opc">
          ${oyTemOpcoes(x) ? `<label class="fld oy-opsel">Opção<select data-k="opcao">${oyOpcoes(x).map((op, k) => `<option value="${k}" ${+i.opcao === k ? 'selected' : ''}>${esc(oyOpNome(op) || 'Opção ' + (k + 1))} · ${esc(oyM(+op.preco || 0))}</option>`).join('')}</select></label>` : ''}
          <label class="fld">Adultos<input type="number" min="0" inputmode="numeric" data-k="adultosIt" value="${Math.max(0, (+i.pax || 1) - (+i.criancas || 0))}"></label>
          <label class="fld">Crianças<input type="number" min="0" inputmode="numeric" data-k="criancas" value="${+i.criancas || 0}"></label>
          ${oyHorasTour(x) ? `<label class="fld">Horas<input type="number" min="${+x.minHoras || 1}" step="1" inputmode="numeric" data-k="horas" value="${+i.horas || +x.minHoras || 1}"></label>` : ''}
        </div>
        <p class="why oy-pcri">${pc > 0 ? `Criança${idade ? ' até ' + idade + ' anos' : ''} paga ${esc(oyM(pc))}.` : 'Criança paga como adulto neste passeio.'} O valor refaz sozinho ao mudar as pessoas.</p>`; })() : ''}
        <div class="oy-g3">
          ${i.tipo === 'traslado' ? `<label class="fld">Voo<input data-k="voo" value="${esc(i.voo)}" placeholder="voo"></label>` : `<label class="fld">Destaque<input data-k="rotulo" value="${esc(i.rotulo)}" placeholder="manhã livre"></label>`}
          ${x ? '' : `<label class="fld">Pessoas<input type="number" min="1" inputmode="numeric" data-k="pax" value="${i.pax}"></label>`}
          ${so ? `<label class="fld oy-custo2" title="o que você paga a quem faz o serviço — nunca vai para o cliente">Custo (só você vê)<input type="number" min="0" inputmode="decimal" data-k="custo" value="${i.custo || ''}" placeholder="0"></label>`
            : `<label class="fld">Valor ${esc(OY_SIMB)}<input type="number" min="0" inputmode="decimal" data-k="valor" value="${i.valor || ''}" placeholder="0"></label>`}
        </div>
        <span class="op-lbl">Foto na proposta</span><div class="oy-fotos" role="group" aria-label="Foto na proposta">
          <button type="button" class="oy-ft oy-ftno ${!i.foto ? 'on' : ''}" data-foto="" aria-pressed="${!i.foto}">sem foto</button>
          ${(i.foto && !fotos.includes(i.foto) ? [i.foto, ...fotos] : fotos).slice(0, 12).map(f => `<button type="button" class="oy-ft ${i.foto === f ? 'on' : ''}" data-foto="${esc(f)}" aria-pressed="${i.foto === f}" aria-label="usar esta foto" style="background-image:url('${esc(ppCssUrl(f))}')"></button>`).join('')}
          <label class="oy-ft oy-ftup" title="enviar uma foto (hotel, restaurante, o que não está no catálogo)">+ foto<input type="file" accept="image/*" data-fotoup hidden></label></div>
        <div class="oy-itacs">
          ${so ? '' : `<label class="fld oy-custo" title="o que você paga a quem faz o serviço — nunca vai para o cliente">Custo (só você vê)<input type="number" min="0" inputmode="decimal" data-k="custo" value="${i.custo || ''}" placeholder="0"></label>`}
          ${x ? `<button type="button" class="mini" data-recalc="${esc(i.id)}">preço da tabela</button>` : ''}
          <button type="button" class="mini" data-dup="${esc(i.id)}">duplicar</button>
          <button type="button" class="mini danger" data-rmi="${esc(i.id)}">tirar</button>
        </div>`;
  };
  /* celular: um cartão por serviço (toque abre) */
  const linhaItem = (i) => {
    const aberto = S.aberto === i.id;
    return `<article class="oy-it ${aberto ? 'aberto' : ''}" data-it="${esc(i.id)}">
      <button type="button" class="oy-itcab" data-oyabre="${esc(i.id)}" aria-expanded="${aberto}">
        <span class="oy-ithr">${esc(ppHoras(i) || 'sem horário')}</span>
        <span class="oy-itn">${i.foto ? `<span class="oy-itf" style="background-image:url('${esc(ppCssUrl(i.foto))}')" aria-hidden="true"></span>` : ''}<b>${esc(i.desc || 'Sem título')}</b>${i.tipo === 'traslado' && i.voo ? `<small>voo ${esc(i.voo)}</small>` : ''}${i.sugestao ? '<small class="oy-alerta">pedido do cliente · fora da proposta até você pôr o valor</small>' : i.aParte ? '<small>à parte</small>' : !i.valor ? '<small class="oy-alerta">sem valor</small>' : ''}</span>
        <span class="oy-itv">${i.aParte ? 'à parte' : i.valor ? esc(oyM(i.valor)) : '—'}</span>
        <span class="oy-chev">${oyIc('seta')}</span>
      </button>
      ${aberto ? `<div class="oy-ited">${campos(i, false)}</div>` : ''}
    </article>`;
  };
  /* computador: a PLANILHA — uma faixa por dia e, em cada linha, dia · horário · serviço em negrito
     com os detalhes embaixo · valor. Edita direto na linha (Tab passa de campo em campo); o ⋯ guarda o resto. */
  const planilha = () => {
    let ult = null;
    return `<div class="oy-sheet" role="table" aria-label="Roteiro">
      <div class="oy-shh" role="row"><span role="columnheader">Dia</span><span role="columnheader">Horário</span><span role="columnheader">Serviço e detalhes</span><span role="columnheader" class="oy-r">Valor ${esc(OY_SIMB)}</span><span role="columnheader"><span class="sr">Mais</span></span></div>
      ${itens.map(i => {
        const band = i.data !== ult ? `<div class="oy-band" role="row"><span role="cell">${esc(oyDiaLongo(i.data))}</span>${i.data ? `<button type="button" class="oy-band-add" data-adddia="${esc(i.data)}" aria-label="Acrescentar passeio em ${esc(oyDiaLongo(i.data))}">+ neste dia</button>` : ''}</div>` : '';
        ult = i.data;
        const aberto = S.aberto === i.id;
        const nl = (i.texto || '').split('\n').length;
        return band + `<div class="oy-row ${aberto ? 'aberto' : ''}" data-it="${esc(i.id)}" role="row">
          <label class="oy-c oy-cd" role="cell"><span class="sr">Dia</span><input type="date" data-k="data" value="${esc(i.data)}"></label>
          <label class="oy-c oy-ch" role="cell"><span class="sr">Horário</span><input data-k="faixa" value="${esc(ppHoras(i))}" placeholder="horário" aria-label="Horário (ex.: 09:00–17:00)"></label>
          <div class="oy-c oy-cs" role="cell">
            <input class="oy-ct" data-k="desc" value="${esc(i.desc)}" placeholder="Serviço" aria-label="Serviço">
            <textarea class="oy-cx" data-k="texto" rows="${Math.min(10, Math.max(2, nl + 1))}" placeholder="detalhes (opcional)" aria-label="Detalhes, um por linha">${esc(i.texto)}</textarea>
            ${i.foto ? `<button type="button" class="oy-cfoto" data-oyabre="${esc(i.id)}" style="background-image:url('${esc(ppCssUrl(i.foto))}')" aria-label="Foto deste serviço na proposta (toque para trocar)" title="foto na proposta"></button>` : ''}
            ${i.tipo === 'traslado' && i.voo ? `<small class="oy-cvoo">voo ${esc(i.voo)}</small>` : ''}
            ${i.sugestao ? '<small class="oy-cobs oy-alerta">pedido do cliente · fora da proposta até você pôr o valor</small>' : ''}
            ${i.obs && !OY_OBS_INTERNA.test(i.obs) ? `<small class="oy-cobs" title="${esc(i.obs)}">obs: ${esc(i.obs.length > 60 ? i.obs.slice(0, 60) + '…' : i.obs)}</small>` : ''}
          </div>
          <label class="oy-c oy-cv" role="cell"><span class="sr">Valor ${esc(OY_SIMB)}</span>${i.aParte ? '<span class="oy-aparte-v">à parte</span>' : `<input type="number" min="0" inputmode="decimal" data-k="valor" value="${i.valor || ''}" placeholder="0">`}</label>
          <span class="oy-c oy-cacs" role="cell"><button type="button" class="oy-cm" data-oyabre="${esc(i.id)}" aria-expanded="${aberto}" aria-label="Mais deste serviço: incluso, foto, pessoas, custo, observação">⋯</button><button type="button" class="oy-cm oy-crm" data-rmi="${esc(i.id)}" aria-label="Tirar este serviço" title="tirar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:17px;height:17px"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg></button></span>
        </div>${aberto ? `<div class="oy-rowmais" data-it="${esc(i.id)}">${campos(i, true)}</div>` : ''}`;
      }).join('')}
    </div>`;
  };
  const largo = typeof matchMedia === 'function' && matchMedia('(min-width: 761px)').matches;
  const fechado = o.status === 'fechado';
  admShell('orcamentos', `
  <div class="oy">
    <div class="oy-top">
      <a class="linkbtn" href="#/adm/orcamentos">← Orçamentos</a>
      <div class="oy-tit"><h1 class="pageh">${esc(o.num)}</h1><span class="pill">${esc(st)}</span><small class="oy-salvo" id="oySalvo" aria-live="polite">${o.salvoEm ? 'salvo às ' + esc(o.salvoEm) : 'salva sozinho'}</small></div>
    </div>

    <section class="card oy-card">
      <h2 class="oy-h">Cliente</h2>
      <div class="oy-g2">
        <label class="fld">Nome<input id="oyNome" value="${esc(o.cliente.nome)}" autocomplete="off" placeholder="Nome do cliente"></label>
        <label class="fld">WhatsApp<input id="oyWhats" value="${esc(o.cliente.whats)}" inputmode="tel" autocomplete="off" placeholder="+55 11 99999-9999"></label>
      </div>
      <div class="oy-g2">
        ${['adultos', 'criancas'].map(k => `<div class="fld oy-pax"><span id="oyL-${k}">${k === 'adultos' ? 'Adultos' : 'Crianças'}</span>
          <div class="oy-step" role="group" aria-labelledby="oyL-${k}">
            <button type="button" data-step="${k}" data-d="-1" aria-label="menos">−</button>
            <output id="oy-${k}">${+o[k] || 0}</output>
            <button type="button" data-step="${k}" data-d="1" aria-label="mais">+</button></div></div>`).join('')}
      </div>
      <div class="oy-hots"><span class="op-lbl">Hotéis</span>
        ${(oyHoteis(o, true).length ? oyHoteis(o, true) : [{ de: '', ate: '', nome: '', situacao: '' }]).map((h, k) => `<div class="oy-hot" data-h="${k}">
          <label class="fld"><span class="sr">Hotel</span><input data-hk="nome" value="${esc(h.nome || '')}" placeholder="Nome do hotel" aria-label="Hotel" autocomplete="off"></label>
          <label class="fld"><span class="sr">De</span><input type="date" data-hk="de" value="${esc(h.de || '')}" aria-label="Entrada"></label>
          <label class="fld"><span class="sr">Até</span><input type="date" data-hk="ate" value="${esc(h.ate || '')}" aria-label="Saída"></label>
          <label class="fld"><span class="sr">Situação</span><select data-hk="situacao" aria-label="Situação"><option value="">—</option><option value="incluso" ${h.situacao === 'incluso' ? 'selected' : ''}>incluso</option><option value="a parte" ${h.situacao === 'a parte' ? 'selected' : ''}>à parte</option></select></label>
          <button type="button" class="mini ghost" data-hrm="${k}" aria-label="Tirar este hotel">✕</button></div>`).join('')}
        <button type="button" class="mini" id="oyHotAdd">+ hotel</button></div>
      <div class="oy-g2">
        ${[['chegada', 'Chegada'], ['partida', 'Partida']].map(([k, n]) => `<fieldset class="oy-voo"><legend>${n}</legend>
          <div class="oy-vg">
            <label class="fld"><span class="sr">${n}: dia</span><input type="date" data-v="${k}.data" value="${esc(o[k].data)}" aria-label="${n}: dia"></label>
            <label class="fld"><span class="sr">${n}: hora do voo</span><input type="time" data-v="${k}.hora" value="${esc(oyHm(o[k].hora) || '')}" aria-label="${n}: hora do voo"></label>
            <label class="fld"><span class="sr">${n}: voo</span><input data-v="${k}.voo" value="${esc(o[k].voo)}" placeholder="voo" aria-label="${n}: número do voo"></label>
          </div></fieldset>`).join('')}
      </div>
    </section>

    <section class="card oy-card">
      <div class="oy-hrow"><h2 class="oy-h">Roteiro</h2><span class="oy-sub">${o.itens.length ? `${o.itens.length} ${o.itens.length === 1 ? 'serviço' : 'serviços'}${nDias ? ' · ' + nDias + (nDias === 1 ? ' dia' : ' dias') : ''}` : ''}</span></div>
      ${!o.itens.length ? '<p class="why">Nenhum serviço ainda. Comece pelo passeio, pelo traslado de chegada ou por uma linha em branco.</p>'
        : largo ? planilha() : grupos.map(g => `<div class="oy-dia"><h3 class="oy-diah"><span>${esc(oyDiaCurto(g.d))}</span>${g.d ? `<button type="button" class="oy-band-add" data-adddia="${esc(g.d)}" aria-label="Acrescentar passeio em ${esc(oyDiaCurto(g.d))}">+ neste dia</button>` : ''}</h3>${g.l.map(linhaItem).join('')}</div>`).join('')}
      <div class="oy-add" role="group" aria-label="Acrescentar ao roteiro">
        <button type="button" class="oy-addb oy-addf" id="oyAddP">${oyIc('mais')}<span>Passeio</span></button>
        <button type="button" class="oy-addb" data-tr="chegada">${oyIc('aviao')}<span>Traslado chegada</span></button>
        <button type="button" class="oy-addb" data-tr="partida">${oyIc('aviao')}<span>Traslado saída</span></button>
        <button type="button" class="oy-addb" id="oyAddL">${oyIc('livre')}<span>${largo ? 'Linha em branco' : 'Item livre'}</span></button>
      </div>
    </section>

    <section class="card oy-card oy-val" id="oyVal">${oyValoresHtml(o)}</section>

    ${fechado ? (() => { const bs = (o.bookingIds || []).map(bid => DB.bookings.find(z => z.id === bid)).filter(Boolean);
      return `<section class="card oy-card oy-fechou"><div class="oy-hrow"><h2 class="oy-h">Fechou${o.fechadoEm ? ' em ' + esc(opCurta(o.fechadoEm)) : ''}</h2><span class="oy-sub">${bs.length} ${bs.length === 1 ? 'reserva' : 'reservas'}</span></div>
        ${bs.length && typeof Kit !== 'undefined' ? `<button type="button" class="cta oy-kitb" id="oyKit" data-kitb="${esc(kitChaveDe(bs[0]))}">Roteiro da viagem</button><p class="why">O que o cliente recebe depois da compra: o roteiro dia a dia com os horários, os encontros e o pagamento, em link ou PDF.</p>` : ''}
        <details class="oy-res"><summary>Ver as reservas</summary>${bs.map(b => `<p class="oy-resl"><b>${esc(opCurta(b.date))}${b.semHora ? '' : ' · ' + esc(b.time)}</b> ${esc(b.orcTitulo || oyPt((Tours.get(b.tourId) || {}).name))} · ${+b.pax || 1}p · ${esc(oyM(+b.total || 0))} <span class="mono">${esc(b.code)}</span></p>`).join('')}</details></section>`; })()
      : o.status === 'enviado' ? `<section class="card oy-card oy-fechou"><div class="oy-hrow"><h2 class="oy-h">O cliente fechou?</h2></div>
        <p class="why">Cada serviço vira reserva e abre o roteiro da viagem, pronto para mandar no WhatsApp, por link ou PDF.</p>
        <button type="button" class="cta" id="oyFecha2">Fechou — criar as reservas</button></section>` : ''}

    <details class="card oy-card oy-mais" ${S.mais ? 'open' : ''}><summary><b>Mais opções</b><small>e-mail, situação, sinal, textos da proposta, arquivos</small></summary>
      <div class="oy-g2">
        <label class="fld">E-mail do cliente<input id="oyEmail" value="${esc(o.cliente.email)}" inputmode="email" autocomplete="off"></label>
        <label class="fld">Situação<select id="oySt">${ORC_STATUS.map(s => `<option value="${s[0]}" ${o.status === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}</select></label>
      </div>
      <div class="oy-g2">
        <label class="fld">Sinal para reservar (%)<input type="number" min="0" max="100" inputmode="numeric" id="oyPct" value="${o.sinalPct}"></label>
        <label class="fld">${esc(OY_IMP)} (%)<input type="number" min="0" max="30" step="0.5" inputmode="decimal" id="oyVat" value="${oyImpPadrao(o)}"></label>
        <div class="fld"><span>Sinal / sua margem</span><b class="oy-num">${esc(oyM(Orc.sinal(o)))}${custoTot ? ' · ' + esc(oyM(Orc.total(o) - custoTot)) : ''}</b></div>
      </div>
      <label class="fld">Observação para o cliente (vai na proposta)<textarea id="oyObs" rows="2">${esc(o.obs)}</textarea></label>
      <label class="fld">Condições e cancelamento<textarea id="oyPol" rows="5" placeholder="A sua política de cancelamento (vai na proposta)">${esc(o.politica != null ? o.politica : ppTextoPadrao('politica'))}</textarea></label>
      <label class="fld">Linhas em destaque (uma por linha)<textarea id="oyCond" rows="2" placeholder="Ex.: formas de pagamento">${esc(o.condicoes != null ? o.condicoes : ppTextoPadrao('condicoes'))}</textarea></label>
      <label class="fld">O diferencial<textarea id="oyDif" rows="3" placeholder="O que faz o seu trabalho diferente (vai no fim da proposta)">${esc(o.diferencial != null ? o.diferencial : ppTextoPadrao('diferencial'))}</textarea></label>
      <button type="button" class="mini" id="oyPadrao">usar estes textos em todas as propostas</button>
      ${o.conversa ? `<details class="oy-conv"><summary>A conversa original</summary><pre class="oy-pre">${esc(o.conversa)}</pre></details>` : ''}
      <div class="orc-links"><span class="op-lbl">Arquivo: ${esc(Orc.nomeArquivo(o))}</span>
        ${(o.links || []).map(l => `<a class="mini" target="_blank" rel="noopener" href="${esc(l.url)}">${esc(l.nome)}</a>`).join('')}
        <div class="oy-g2"><label class="fld"><span class="sr">nome do link</span><input id="orLkNome" placeholder="nome (ex.: comprovante)" aria-label="nome do link"></label><label class="fld"><span class="sr">endereço</span><input id="orLkUrl" placeholder="https://drive.google.com/…" aria-label="endereço do link"></label></div>
        <button type="button" class="mini" id="orLkAdd">+ link</button></div>
      <div class="btnrow">${!fechado ? '<button type="button" class="mini strong" id="oyFecha">Fechou — criar as reservas</button>' : ''}<button type="button" class="mini danger" id="oyApaga">apagar orçamento</button></div>
    </details>

    <div class="oy-barra">
      <span class="oy-btxt">${esc(oyBarraTexto(o))}</span>
      <div class="oy-barra-acs"><button type="button" class="mini strong oy-salvar" id="oySalvar">Salvar</button><a class="cta sm" href="#/adm/proposta/${esc(o.id)}">Ver e enviar a proposta</a></div>
    </div>
  </div>`);
  S.pendente = false;
  S.foto = JSON.stringify(o);
  oyLiga(o);
  oyBarraPos();
  /* o menu do celular e as fontes terminam de montar depois: confere de novo */
  setTimeout(oyBarraPos, 250); setTimeout(oyBarraPos, 1200);
}
/* a barra de baixo (total + Salvar + proposta) fica fora do menu do painel: ao lado dele no computador,
   em cima dele no celular (a barra de abas do celular cobria o "Ver e enviar a proposta") */
function oyBarraPos() {
  const barra = document.querySelector('.oy-barra'), rail = document.querySelector('.adm .rail'); if (!barra) return;
  barra.style.left = ''; barra.style.bottom = '';
  if (!rail) return;
  const r = rail.getBoundingClientRect();
  if (r.top > innerHeight / 2) barra.style.bottom = Math.max(0, Math.round(innerHeight - r.top)) + 'px';
  else if (r.left <= 1 && r.height > innerHeight / 2) barra.style.left = Math.round(r.right) + 'px';
  /* o botão do Assistente sobe acima da barra (senão um tapa o outro) */
  const fab = document.getElementById('iaFab');
  if (fab) fab.style.setProperty('bottom', Math.round(innerHeight - barra.getBoundingClientRect().top + 12) + 'px', 'important');
}
if (typeof addEventListener === 'function') {
  addEventListener('resize', () => { if (document.querySelector('.oy-barra')) oyBarraPos(); });
  /* saiu do editor: o botão do Assistente volta ao lugar dele */
  addEventListener('hashchange', () => setTimeout(() => { const fab = document.getElementById('iaFab'); if (fab && !document.querySelector('.oy-barra')) fab.style.removeProperty('bottom'); }, 50));
}

/* os três números do alto (sem campo dentro: refazem a cada mudança) */
function oyTotHtml(o) {
  const soma = Orc.soma(o), pv = String(oyVatPct(o)).replace('.', ',');
  const t = oyPorTipo(o), cri = +o.criancas > 0, imp = oyVatPct(o) > 0;
  return `<div><small>${oyTotInf(o) ? 'Total que você fechou' : imp ? 'Total com ' + esc(OY_IMP) : 'Total'}</small><b>${esc(oyM(Orc.total(o)))}</b><small>${oyTotInf(o)
      ? (imp ? 'já com ' + esc(OY_IMP) + ' ' + esc(pv) + '% (' + esc(oyM(Orc.vat(o))) + ') dentro · ' : '') + 'serviços somam ' + esc(oyM(soma))
      : esc(oyM(Orc.subtotal(o))) + (+o.desconto ? ' (com desconto)' : '') + (imp ? ' + ' + esc(OY_IMP) + ' ' + esc(pv) + '% ' + esc(oyM(Orc.vat(o))) : '')}</small></div>
    <div class="oy-pp"><small>Por pessoa</small>${!oyPax(o) ? '<b>—</b>' : cri
      ? `<b>${esc(oyM(t.adulto))} <i>adulto</i></b><b>${esc(oyM(t.crianca))} <i>criança</i></b>`
      : `<b>${esc(oyM(t.adulto))}</b>`}<small>${esc(oyPaxTexto(o) || 'informe as pessoas')}</small></div>
    <div><small>Pendente</small><b>${esc(oyM(oyPendente(o)))}</b></div>`;
}
function oyPagValHtml(o) {
  const p = oyPagValor(o);
  const linha = (rot, v) => `<div class="oy-pagv"><span>Valor ${esc(rot)}</span><b>${esc(oyM(v))}</b><button type="button" class="mini" data-copia="${v.toFixed(2)}" aria-label="Copiar o valor ${esc(rot)}">copiar</button></div>`;
  return linha(p.rot, p.v) + (p.vc ? linha('por criança', p.vc) : '');
}
function oyValoresHtml(o) {
  const pct = oyImpPadrao(o);
  return `<div class="oy-hrow"><h2 class="oy-h">Valores</h2></div>
    <div class="oy-tot" id="oyTot">${oyTotHtml(o)}</div>
    ${pct > 0 ? `<label class="optin oy-vatck"><input type="checkbox" id="oyComVat" ${o.semVat ? '' : 'checked'}><span><b>Incluir ${esc(OY_IMP)} de ${esc(String(pct).replace('.', ','))}%</b><small>desmarque quando este orçamento for sem ${esc(OY_IMP)}</small></span></label>` : ''}
    <div class="oy-g3v">
      <label class="fld">Já pago (${esc(OY_SIMB)})<input type="number" min="0" inputmode="decimal" id="oyPago" value="${+o.pago || ''}" placeholder="0"></label>
      <label class="fld">Desconto (${esc(OY_SIMB)})<input type="number" min="0" inputmode="decimal" id="oyDesc" value="${+o.desconto || ''}" placeholder="0"></label>
      <label class="fld" title="o total que você fecha com o cliente; em branco, o app soma os serviços">Total que você fecha (${esc(OY_SIMB)})<input type="number" min="0" step="0.01" inputmode="decimal" id="oyTotInf" value="${oyTotInf(o) || ''}" placeholder="soma dos serviços"></label>
      <label class="fld">Válida até<input type="date" id="oyVal2" value="${esc(o.validade)}"></label>
    </div>
    <label class="optin oy-vatck"><input type="checkbox" id="oyMostraVal" ${o.mostraValores ? 'checked' : ''}><span><b>Mostrar o valor de cada serviço na proposta</b><small>desmarcado, a proposta mostra só o total</small></span></label>
    <div class="oy-pag"><span class="op-lbl">Dividir o valor por</span>
      <div class="chips" role="group" aria-label="Dividir o valor por">${OY_PAG.map(([k, n]) => `<button type="button" class="chip ${oyPagModo(o) === k ? 'on' : ''}" data-pagmodo="${k}" aria-pressed="${oyPagModo(o) === k}">${n}</button>`).join('')}</div>
      <div id="oyPagV">${oyPagValHtml(o)}</div>
      <label class="fld">Link de pagamento ${esc(oyPagValor(o).rot)} (da sua plataforma)<input type="url" inputmode="url" id="oyLinkPag" value="${esc(o.linkPagamento || '')}" placeholder="https://…" autocomplete="off"></label>
      ${oyPagModo(o) === 'pessoa' && +o.criancas > 0 ? `<label class="fld">Link por criança<input type="url" inputmode="url" id="oyLinkPagC" value="${esc(o.linkPagamentoCrianca || '')}" placeholder="https://…" autocomplete="off"></label>` : ''}
    </div>
    <p class="why oy-usd">Valores em ${esc(PP_MOEDA_NOME[OY_MOEDA] || OY_MOEDA)}. Tem link de pagamento? Crie com o valor acima e cole aqui: a proposta mostra o botão "Pagar".</p>`;
}

/* salva o que está na tela (sem redesenhar) */
function oyLe(o) {
  const v = (s) => { const e = document.querySelector(s); return e ? e.value : null; };
  const nome = v('#oyNome'); if (nome == null) return;
  o.cliente = { nome: nome.trim(), whats: (v('#oyWhats') || '').trim(), email: (v('#oyEmail') ?? o.cliente.email ?? '').trim() };
  const hs = [...document.querySelectorAll('.oy-hot')].map(r => { const g = (k) => (r.querySelector(`[data-hk="${k}"]`) || {}).value || ''; return { nome: g('nome').trim(), de: g('de'), ate: g('ate'), situacao: g('situacao') }; });
  if (hs.length) { o.hoteis = hs; o.hotel = (hs.find(h => h.nome) || {}).nome || ''; }
  $$('[data-v]').forEach(e => { const [k, c] = e.dataset.v.split('.'); o[k] = o[k] || {}; o[k][c] = c === 'hora' ? (oyHm(e.value) || e.value.trim()) : e.value.trim(); });
  document.querySelectorAll('.oy [data-it]').forEach(box => {
    const i = o.itens.find(z => z.id === box.dataset.it); if (!i) return;
    const antes = { opcao: +i.opcao || 0, pax: +i.pax || 1, cri: +i.criancas || 0, horas: +i.horas || 0, desc: i.desc, data: i.data }, x = i.tourId && Tours.get(i.tourId);
    const tituloAuto = x && i.desc === oyTituloDe(x, antes.opcao);
    const ad = box.querySelector('[data-k="adultosIt"]'), cr = box.querySelector('[data-k="criancas"]');
    if (ad && cr && ad.closest('[data-it]') === box) { const a = Math.max(0, +ad.value || 0), c = Math.max(0, +cr.value || 0); i.pax = Math.max(1, a + c); i.criancas = Math.min(c, i.pax); }
    box.querySelectorAll('[data-k]').forEach(e => {
      if (e.closest('[data-it]') !== box) return;
      const k = e.dataset.k;
      if (k === 'pax') i.pax = Math.max(1, +e.value || 1);
      else if (k === 'valor') { const n = +e.value || 0; if (n !== i.valor) i.auto = false; i.valor = n; }
      else if (k === 'custo') i.custo = +e.value || 0;
      else if (k === 'hora' || k === 'horaFim') i[k] = oyHm(e.value) || e.value.trim();
      else if (k === 'faixa') { const fv = String(e.value).trim(); if (!fv) { i.hora = ''; i.horaFim = ''; } else { const [a, b] = oyFaixaPartes(fv); i.hora = oyHm(a) || String(a || '').trim(); i.horaFim = b ? (oyHm(b) || String(b).trim()) : ''; } }
      else if (k === 'opcao') i.opcao = Math.max(0, +e.value || 0);
      else if (k === 'horas') i.horas = Math.max(x && +x.minHoras || 1, Math.round(+e.value || 1));
      else if (k === 'aParte') { i.aParte = !!e.checked; if (i.aParte) { i.valor = 0; i.auto = false; } }
      else if (k === 'adultosIt' || k === 'criancas') { /* já lidos acima */ }
      else i[k] = e.value;
    });
    if (x && (i.opcao !== antes.opcao || i.pax !== antes.pax || (+i.criancas || 0) !== antes.cri || (+i.horas || 0) !== antes.horas)) {
      if ((+i.horas || 0) !== antes.horas || i.opcao !== antes.opcao) i.auto = true;
      if (i.auto) i.valor = oyPrecoItem(x, i).total || i.valor;
      if (tituloAuto && i.opcao !== antes.opcao) i.desc = oyTituloDe(x, i.opcao);
    }
    /* PEDIDO DO CLIENTE: fica fora da proposta até ela confirmar — pôr o valor, marcar "à parte" ou
       mudar o nome/dia já é confirmar (antes nada tirava a marca e o serviço sumia da proposta) */
    if (i.sugestao && (+i.valor > 0 || i.aParte || i.desc !== antes.desc || i.data !== antes.data)) i.sugestao = false;
  });
  const n = (s, d) => { const x = v(s); return x == null ? d : (+x || 0); };
  o.pago = n('#oyPago', o.pago); o.desconto = n('#oyDesc', o.desconto); o.totalInformado = n('#oyTotInf', o.totalInformado || 0);
  if (v('#oyLinkPag') != null) o.linkPagamento = String(v('#oyLinkPag')).trim();
  if (v('#oyLinkPagC') != null) o.linkPagamentoCrianca = String(v('#oyLinkPagC')).trim();
  o.moeda = OY_MOEDA; o.validade = v('#oyVal2') || o.validade;
  if (v('#oySt')) o.status = v('#oySt');
  if (v('#oyPct') != null) o.sinalPct = +v('#oyPct') || 0;
  if (v('#oyVat') != null && v('#oyVat') !== '') o.vatPct = Math.max(0, +v('#oyVat') || 0);
  const cv = document.getElementById('oyComVat'); if (cv) o.semVat = !cv.checked;
  const mv = document.getElementById('oyMostraVal'); if (mv) o.mostraValores = !!mv.checked;
  if (v('#oyObs') != null) o.obs = v('#oyObs');
  if (v('#oyPol') != null) { o.politica = v('#oyPol'); o.condicoes = v('#oyCond'); o.diferencial = v('#oyDif'); }
  if (o.status === 'novo') o.status = 'rascunho';
}
/* redesenha (a ordem dos dias mudou) e devolve o cursor ao campo para onde ela foi */
function oyRedesenha(o) {
  setTimeout(() => {
    const a = document.activeElement, box = a && a.closest && a.closest('[data-it]');
    const alvo = box && a.dataset.k ? `[data-it="${box.dataset.it}"] [data-k="${a.dataset.k}"]` : (a && a.id ? '#' + a.id : '');
    const y = scrollY; oyTela(o.id); scrollTo(0, y);
    if (alvo) { const e = document.querySelector(alvo); if (e) e.focus({ preventScroll: true }); }
  }, 0);
}
const oyHoraAgora = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
function oySalva(o, redesenha) {
  oyLe(o);
  o.salvoEm = oyHoraAgora();
  Orc.salva(o); ppRepublica(o);
  if (oyTela._s) oyTela._s.foto = JSON.stringify(Orc.get(o.id) || o);
  const s = $('#oySalvo'); if (s) s.textContent = 'salvo às ' + o.salvoEm;
  const tot = $('#oyTot'); if (tot) tot.innerHTML = oyTotHtml(o);
  const pv = $('#oyPagV'); if (pv) { pv.innerHTML = oyPagValHtml(o); oyLigaCopia(); }
  const bar = document.querySelector('.oy-barra .oy-btxt'); if (bar) bar.textContent = oyBarraTexto(o);
  if (redesenha === 'quieto') { const S = oyTela._s; if (S) S.pendente = true; oyQuieto(o); }
  else if (redesenha) oyRedesenha(o);
}
/* DATA E HORÁRIO: o que só muda a ORDEM (dia, hora, faixa, valor do cartão) espera ela sair de todos os
   campos para reorganizar — redesenhar na hora trocava o campo debaixo do dedo (28/10/2026) */
const oyNumCampo = () => { const a = document.activeElement; return !!(a && a.closest && a.closest('.oy') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
let oyDedo = false;
if (typeof addEventListener === 'function') {
  addEventListener('pointerdown', () => { oyDedo = true; }, true);
  for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, () => { oyDedo = false; }, true);
}
function oyQuieto(o) {
  setTimeout(() => {
    const S = oyTela._s; if (!S || !S.pendente || oyNumCampo()) return;
    if (oyDedo) return oyQuieto(o);
    if (!document.querySelector('.oy') || location.hash !== '#/adm/orcamentos/' + o.id) { S.pendente = false; return; }
    S.pendente = false; oyRedesenha(o);
  }, 220);
}
const oyBarraTexto = (o) => oyM(Orc.total(o)) + (oyPorTipoTexto(o, true) ? ' · ' + oyPorTipoTexto(o, true) : '');
function oyLigaValores(o) {
  $$('#oyVal input').forEach(e => { e.onchange = () => oySalva(o, e.id === 'oyComVat'); });
  $$('[data-pagmodo]').forEach(b => b.onclick = () => { oyLe(o); o.pagModo = b.dataset.pagmodo; oySalva(o, true); });
  oyLigaCopia();
}
function oyLigaCopia() {
  $$('[data-copia]').forEach(b => b.onclick = () => opCopia(b.dataset.copia).then(() => toast('Valor copiado: ' + b.dataset.copia)));
}
function oyLiga(o) {
  /* cada botão lê a tela (oyLe) ANTES de mexer; depois só grava e redesenha */
  const S = oyTela._s, re = () => { o.salvoEm = oyHoraAgora(); Orc.salva(o); ppRepublica(o); oyRedesenha(o); };
  $$('.oy input, .oy textarea, .oy select').forEach(e => {
    if (e.closest('#oyVal') || e.id === 'orLkNome' || e.id === 'orLkUrl' || e.type === 'file') return;
    e.oninput = () => { clearTimeout(e._t); e._t = setTimeout(() => oySalva(o, false), 700); };
    if (e.type === 'date' || e.type === 'time') { e.onchange = () => oySalva(o, 'quieto'); return; }
    e.onchange = () => {
      const naPlanilha = !!e.closest('.oy-row');
      const muda = e.matches('[data-k="aParte"],[data-k="pax"],[data-k="opcao"],[data-k="adultosIt"],[data-k="criancas"],[data-k="horas"],#oyVat');
      const ordem = e.matches('[data-k="faixa"]') || (!naPlanilha && e.matches('[data-k="valor"]'));
      oySalva(o, muda ? true : ordem ? 'quieto' : false);
    };
  });
  const raiz = document.querySelector('.oy'); if (raiz) raiz.addEventListener('focusout', () => { if (S.pendente) oyQuieto(o); });
  const cresce = (t) => { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; };
  $$('.oy-cx').forEach(t => { cresce(t); t.addEventListener('input', () => cresce(t)); });
  oyLigaValores(o);
  $$('[data-oyabre]').forEach(b => b.onclick = () => { oyLe(o); Orc.salva(o); S.aberto = S.aberto === b.dataset.oyabre ? '' : b.dataset.oyabre; re(); });
  $$('[data-step]').forEach(b => b.onclick = () => {
    oyLe(o); const antes = oyPax(o), k = b.dataset.step;
    o[k] = Math.max(0, (+o[k] || 0) + +b.dataset.d);
    if (k === 'adultos' && !o.adultos && !o.criancas) o.adultos = 1;
    oyMudaPax(o, antes); re();
  });
  $$('[data-rap]').forEach(b => b.onclick = () => {
    const box = b.closest('[data-it]'), ta = box && box.querySelector('[data-k="naoIncluso"]'); if (!ta) return;
    const l = oyFrases(ta.value), f = b.dataset.rap, tem = l.some(x => x.toLowerCase() === f.toLowerCase());
    ta.value = (tem ? l.filter(x => x.toLowerCase() !== f.toLowerCase()) : [...l, f]).join(', ');
    b.classList.toggle('on', !tem); b.setAttribute('aria-pressed', String(!tem)); oySalva(o, false);
  });
  /* FOTO para o que não está no catálogo (hotel, restaurante): fica guardada leve no orçamento */
  $$('[data-fotoup]').forEach(inp => inp.onchange = async () => {
    const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
    const box = inp.closest('[data-it]'); oyLe(o); const i = box && o.itens.find(z => z.id === box.dataset.it); if (!i) return;
    toast('Lendo a foto…');
    try { i.foto = await readImageResized(f, 1000, 0.74); re(); toast('Foto na proposta ✓'); } catch (e) { toast('Não consegui ler essa foto'); }
  });
  $$('[data-foto]').forEach(b => b.onclick = () => { oyLe(o); const i = o.itens.find(z => z.id === S.aberto); if (i) i.foto = b.dataset.foto; re(); });
  $$('[data-rmi]').forEach(b => b.onclick = () => {
    oyLe(o); const k = o.itens.findIndex(i => i.id === b.dataset.rmi); if (k < 0) return;
    const [tirado] = o.itens.splice(k, 1); S.aberto = ''; S.desfazer = { item: tirado, k }; re();
    setTimeout(() => oyDesfazBarra(o), 60);
  });
  $$('[data-dup]').forEach(b => b.onclick = () => { oyLe(o); const i = o.itens.find(z => z.id === b.dataset.dup); if (!i) return; const n = Orc._item({ ...i, id: '' }); o.itens.push(n); S.aberto = n.id; re(); });
  $$('[data-recalc]').forEach(b => b.onclick = () => {
    oyLe(o); const i = o.itens.find(z => z.id === b.dataset.recalc); if (!i) return;
    const x = Tours.get(i.tourId);
    if (x) { const v = oyPrecoItem(x, i).total; if (v) { i.valor = v; i.auto = true; } else toast('Este passeio não tem preço na tabela'); }
    re();
  });
  $$('[data-tr]').forEach(b => b.onclick = () => {
    oyLe(o); const qual = b.dataset.tr, p = o[qual] || {};
    if (!p.data) { toast(`Coloque o dia da ${qual === 'chegada' ? 'chegada' : 'partida'} primeiro`); const e = document.querySelector(`[data-v="${qual}.data"]`); if (e) e.focus(); return; }
    const n = oyTraslado(o, qual === 'chegada' ? 'chegada' : 'saida'); o.itens.push(n); S.aberto = n.id; re();
  });
  $('#oyAddL').onclick = () => { oyLe(o); const ult = oyOrdena(o.itens.filter(i => i.data)).pop(); const n = Orc._item({ tipo: 'livre', desc: '', pax: oyPax(o) || 2, data: S.ultimoDia || (ult && ult.data) || oyProximoDia(o) }); o.itens.push(n); S.aberto = matchMedia('(min-width: 761px)').matches ? '' : n.id; re(); setTimeout(() => { const e = document.querySelector(`[data-it="${n.id}"] [data-k="desc"]`); if (e) e.focus(); }, 60); };
  $('#oyAddP').onclick = () => { oyLe(o); Orc.salva(o); oyCatalogo(o); };
  $$('[data-adddia]').forEach(b => b.onclick = () => { oyLe(o); Orc.salva(o); S.ultimoDia = b.dataset.adddia; oyCatalogo(o, b.dataset.adddia); });
  $('#oySalvar').onclick = () => { oySalva(o, S.pendente ? true : false); toast('Orçamento salvo ✓'); };
  $('#oyHotAdd').onclick = () => { oyLe(o); o.hoteis = [...oyHoteis(o, true), { nome: '', de: '', ate: '', situacao: '' }]; re(); };
  $$('[data-hrm]').forEach(b => b.onclick = () => { oyLe(o); o.hoteis = oyHoteis(o, true).filter((_, k) => k !== +b.dataset.hrm); o.hotel = (o.hoteis.find(h => String(h.nome || '').trim()) || {}).nome || ''; re(); });
  const det = document.querySelector('.oy-mais'); if (det) det.ontoggle = () => { S.mais = det.open; };
  $('#oyPadrao').onclick = () => { oyLe(o); DB.settings.propPolitica = o.politica; DB.settings.propCondicoes = o.condicoes; DB.settings.propDiferencial = o.diferencial; save(); Orc.salva(o); toast('Textos guardados para as próximas propostas'); };
  $('#orLkAdd').onclick = () => { oyLe(o); Orc.salva(o); const r = Orc.linkAdd(o.id, $('#orLkNome').value, $('#orLkUrl').value); if (r && r.erro) return toast(r.erro); oyRedesenha(o); };
  $('#oyApaga').onclick = () => { if (confirm('Apagar este orçamento?')) { Orc.remove(o.id); go('/adm/orcamentos'); } };
  for (const fid of ['#oyFecha', '#oyFecha2']) { const fb = $(fid); if (fb) fb.onclick = () => { oyLe(o); Orc.salva(o); oyFechar(o); }; }
  const kb = $('#oyKit'); if (kb) kb.onclick = () => Kit.abrir(kb.dataset.kitb);
}

/* "Serviço tirado · desfazer" por 8 segundos */
function oyDesfazBarra(o) {
  const S = oyTela._s; if (!S || !S.desfazer) return;
  document.querySelectorAll('.oy-desfaz').forEach(e => e.remove());
  const el = document.createElement('div'); el.className = 'oy-desfaz'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>Tirado: ${esc(S.desfazer.item.desc || 'serviço')}</span><button type="button">desfazer</button>`;
  document.body.appendChild(el);
  const some = setTimeout(() => { el.remove(); if (S.desfazer) S.desfazer = null; }, 8000);
  el.querySelector('button').onclick = () => {
    clearTimeout(some); el.remove(); const x = Orc.get(o.id), d = S.desfazer; if (!x || !d) return;
    x.itens.splice(Math.min(d.k, x.itens.length), 0, d.item); S.desfazer = null; Orc.salva(x); toast('Voltou'); const y = scrollY; oyTela(o.id); scrollTo(0, y);
  };
}

/* a janela do catálogo: busca, filtro por região, um toque acrescenta. O dia escolhido fica até ela trocar. */
function oyCatalogo(o, diaFixo) {
  const dias = oyDiasDaViagem(o); if (diaFixo && !dias.includes(diaFixo)) { dias.push(diaFixo); dias.sort(); }
  const S0 = oyTela._s || {};
  const C = oyCatalogo._s = { q: '', r: '', dia: diaFixo || S0.ultimoDia || oyProximoDia(o), n: 0 };
  const regs = regioes().filter(r => Tours.all().some(x => x.region === r[0] && !x.avulso));
  const d = opJanela('Acrescentar passeio', `
    <div class="oy-cdias">${dias.length ? `<span class="op-lbl">Para o dia</span><div class="chips" id="oyCDias">${dias.map(x => `<button type="button" class="chip ${x === C.dia ? 'on' : ''}" data-cdia="${x}">${esc(oyDiaCurto(x))}</button>`).join('')}</div>`
      : `<label class="fld">Para o dia<input type="date" id="oyCDia" value="${esc(C.dia)}"></label>`}</div>
    <label class="oy-busca">${oyIc('busca')}<span class="sr">Buscar passeio</span><input type="search" id="oyCQ" placeholder="Buscar passeio…" autocomplete="off"></label>
    ${regs.length > 1 ? `<div class="chips oy-creg" id="oyCReg"><button type="button" class="chip on" data-creg="">Todos</button>${regs.map(r => `<button type="button" class="chip" data-creg="${esc(r[0])}">${esc(r[1])}</button>`).join('')}</div>` : ''}
    <div class="oy-clista" id="oyCL"></div>
    <div class="btnrow oy-cpe"><span class="why" id="oyCN" aria-live="polite"></span><button type="button" class="cta sm" id="oyCOk">Pronto</button></div>`);
  d.classList.add('oy-cdlg');
  const pinta = () => {
    const q = _nomeN(C.q);
    const ja = new Set(o.itens.map(i => i.tourId).filter(Boolean));
    const l = Tours.all().filter(x => !x.avulso && (x.status !== 'draft' || ja.has(x.id)))
      .filter(x => !C.r || x.region === C.r)
      .filter(x => !q || _nomeN(oyPt(x.name) + ' ' + oyPt(x.tagline) + ' ' + (x.region || '')).includes(q));
    const pax = oyPax(o) || 2, cri = Math.min(pax, +o.criancas || 0);
    const grupo = `${pax - cri} ${pax - cri === 1 ? 'adulto' : 'adultos'}${cri ? ' + ' + cri + (cri === 1 ? ' criança' : ' crianças') : ''}`;
    const preco = (x, k) => oyPrecoItem(x, { pax, criancas: cri, opcao: k, horas: oyHorasTour(x) ? +x.minHoras || 1 : 0 }).total || 0;
    d.querySelector('#oyCL').innerHTML = l.length ? l.map(x => {
      const f = oyFotosDe(x)[0], ops = oyOpcoes(x);
      const foto = `<span class="oy-cft" ${f ? `style="background-image:url('${esc(ppCssUrl(f))}')"` : ''} aria-hidden="true"></span>`;
      if (oyTemOpcoes(x)) return `<div class="oy-cit oy-citop ${ja.has(x.id) ? 'ja' : ''}">${foto}
        <div class="oy-cnm"><b>${esc(oyPt(x.name))}</b><small>${esc(grupo)}${ja.has(x.id) ? ' · já no roteiro' : ''}</small>
          <div class="oy-cops" role="group" aria-label="Opções de ${esc(oyPt(x.name))}">${ops.map((op, k) => { const v = preco(x, k), pc = +op.precoCrianca || 0;
            return `<button type="button" class="oy-cop" data-cadd="${esc(x.id)}" data-cop="${k}"><span><b>${esc(oyOpNome(op) || 'Opção ' + (k + 1))}</b><small>${esc(oyM(+op.preco || 0))}${pc ? ' · criança ' + esc(oyM(pc)) : ''}</small></span><em>${v ? esc(oyM(v)) : 'consultar'}</em>${oyIc('mais')}</button>`; }).join('')}</div></div></div>`;
      const v = preco(x, 0), pc = oyPrecoCrianca(x, 0);
      return `<button type="button" class="oy-cit ${ja.has(x.id) ? 'ja' : ''}" data-cadd="${esc(x.id)}">${foto}
        <span class="oy-cnm"><b>${esc(oyPt(x.name))}</b><small>${v ? esc(oyM(v)) + ' · ' + esc(grupo) : 'sob consulta'}${pc ? ' · criança ' + esc(oyM(pc)) : ''}${x.status === 'draft' ? ' · rascunho' : ''}${ja.has(x.id) ? ' · já no roteiro' : ''}</small></span>
        <span class="oy-cmais">${oyIc('mais')}</span></button>`;
    }).join('') : '<p class="why">Nada com esse nome. Use "Item livre" para escrever à mão.</p>';
    d.querySelectorAll('[data-cadd]').forEach(b => b.onclick = () => {
      const dia = C.dia || '';
      const n = oyDoCatalogo(o, b.dataset.cadd, { data: dia, opcao: +b.dataset.cop || 0 });
      if (!n) return;
      o.itens.push(n); Orc.salva(o); ppRepublica(o); C.n++;
      d.querySelector('#oyCN').textContent = `${C.n} acrescentado${C.n > 1 ? 's' : ''} · ${n.desc}${dia ? ' em ' + opCurta(dia) : ''}`;
      S0.ultimoDia = C.dia;
      pinta();
    });
  };
  pinta();
  d.querySelector('#oyCQ').oninput = (e) => { C.q = e.target.value; pinta(); };
  if (typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches) setTimeout(() => d.querySelector('#oyCQ').focus(), 30);
  d.querySelectorAll('[data-creg]').forEach(b => b.onclick = () => { C.r = b.dataset.creg; d.querySelectorAll('[data-creg]').forEach(c => c.classList.toggle('on', c === b)); pinta(); });
  d.querySelectorAll('[data-cdia]').forEach(b => b.onclick = () => { C.dia = b.dataset.cdia; S0.ultimoDia = C.dia; d.querySelectorAll('[data-cdia]').forEach(c => c.classList.toggle('on', c === b)); });
  const diaOn = d.querySelector('#oyCDias .chip.on'), fila = d.querySelector('#oyCDias');
  if (diaOn && fila) fila.scrollLeft += diaOn.getBoundingClientRect().left - fila.getBoundingClientRect().left - (fila.clientWidth - diaOn.offsetWidth) / 2;
  const di = d.querySelector('#oyCDia'); if (di) di.onchange = () => { C.dia = di.value; S0.ultimoDia = C.dia; };
  d.querySelector('#oyCOk').onclick = () => d.close();
  d.addEventListener('close', () => { if (location.hash.includes(o.id)) { const y = scrollY; oyTela(o.id); scrollTo(0, y); } });
}

/* fechou: cada serviço vira reserva, numa janelinha */
const OY_METODOS = [['pix', 'Pix'], ['card', 'Cartão'], ['transfer', 'Transferência'], ['wise', 'Wise'], ['cash', 'Dinheiro'], ['other', 'Outro']];
function oyFechar(o) {
  const sin = Orc.sinal(o);
  if (!o.cliente.nome) { toast('Falta o nome do cliente.'); const e = $('#oyNome'); if (e) e.focus(); return; }
  const semData = o.itens.filter(i => i.tourId && !i.data);
  if (semData.length) return toast('Falta o dia em ' + semData.map(i => i.desc).join(', '));
  const d = opJanela('Fechou?', `<p class="why">Cada serviço vira uma reserva, com o cliente e o dia. Aparece no Hoje, na agenda e na ficha dele.</p>
    <label class="optin"><input type="checkbox" id="oyFSin" ${sin ? '' : 'disabled'}><span><b>O sinal de ${esc(oyM(sin))} já caiu</b><small>registra o pagamento nas reservas</small></span></label>
    <label class="fld">Como pagou<select id="oyFConta">${OY_METODOS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
    <div class="btnrow"><button type="button" class="cta sm" id="oyFOk">Fechou — criar as reservas</button></div>`);
  d.querySelector('#oyFOk').onclick = () => {
    const bs = Orc.fecha(o.id, { sinalRecebido: d.querySelector('#oyFSin').checked, metodo: d.querySelector('#oyFConta').value });
    d.close();
    if (bs.length && typeof Kit !== 'undefined') { toast(`${bs.length} ${bs.length === 1 ? 'reserva criada' : 'reservas criadas'} 🎉 · agora é só mandar o roteiro`); Kit.abrir(kitChaveDe(bs[0])); }
    else { toast(bs.length ? `${bs.length} ${bs.length === 1 ? 'reserva criada' : 'reservas criadas'} 🎉` : 'Nenhum serviço com dia para virar reserva'); oyTela(o.id); scrollTo(0, 0); }
  };
}

/* ---------- 6. a lista: orçamentos, pedidos do site e a conversa colada ---------- */
function oyPedidosAbertos() { return (DB.pedidos || []).filter(p => !p.respondido && !p.orcamentoId).sort((a, b) => (b.criado || '').localeCompare(a.criado || '')); }
function admOrcamentos() {
  oyCss();
  const S = admOrcamentos._s = admOrcamentos._s || { f: 'abertos' };
  const todos = Orc.all();
  const filtros = [['abertos', 'Em aberto', (o) => ['novo', 'rascunho', 'enviado'].includes(o.status)], ['fechado', 'Fecharam', (o) => o.status === 'fechado'], ['perdido', 'Não fecharam', (o) => o.status === 'perdido'], ['todos', 'Todos', () => true]];
  const f = filtros.find(x => x[0] === S.f) || filtros[0];
  const l = todos.filter(f[2]);
  const peds = oyPedidosAbertos();
  const st = (o) => (ORC_STATUS.find(s => s[0] === o.status) || ['', o.status])[1];
  admShell('orcamentos', `<div class="oy oy-lista">
    <div class="pagehead"><h1 class="pageh">Orçamentos</h1>
      <div class="oy-lacs"><button class="mini" id="oyConv" type="button">${oyIc('conversa')} Colar conversa</button><button class="cta sm" id="oyNovo" type="button">Novo orçamento</button></div></div>
    ${peds.length ? `<section class="card oy-card"><h2 class="oy-h">Pedidos esperando orçamento</h2>${peds.map(p => `<div class="oy-ped"><div><b>${esc(p.nome || 'Sem nome')}</b><small>${esc(typeof pedidoRotulo === 'function' ? pedidoRotulo(p) : p.tipo || '')}${p.resumo ? ' · ' + esc(String(p.resumo).slice(0, 140)) : ''}</small></div><button type="button" class="mini strong" data-ped="${esc(p.id)}">Montar orçamento</button></div>`).join('')}</section>` : ''}
    <div class="chips oy-filt" role="group" aria-label="Mostrar">${filtros.map(x => `<button type="button" class="chip ${x[0] === f[0] ? 'on' : ''}" data-filt="${x[0]}" aria-pressed="${x[0] === f[0]}">${x[1]} <small>${todos.filter(x[2]).length}</small></button>`).join('')}</div>
    ${l.length ? `<div class="oy-ls">${l.map(o => { const ds = oyOrdena(o.itens).filter(i => i.data);
      return `<a class="oy-lit" href="#/adm/orcamentos/${esc(o.id)}"><span class="oy-litn"><b>${esc(o.cliente.nome || 'Sem nome')}</b><small>${esc(o.num)}${ds.length ? ' · ' + esc(opCurta(ds[0].data) + (ds.length > 1 && ds[ds.length - 1].data !== ds[0].data ? ' a ' + opCurta(ds[ds.length - 1].data) : '')) : ''} · ${o.itens.length} ${o.itens.length === 1 ? 'serviço' : 'serviços'}</small></span>
        <span class="oy-litv">${esc(oyM(Orc.total(o)))}</span><span class="pill">${esc(st(o))}</span></a>`; }).join('')}</div>`
      : `<div class="emptybox"><p>${todos.length ? 'Nenhum orçamento aqui.' : 'Nenhum orçamento ainda. Comece pelo "Novo orçamento" ou cole a conversa do WhatsApp do cliente.'}</p></div>`}
  </div>`);
  $('#oyNovo').onclick = () => { const o = Orc.cria({ status: 'rascunho' }); go('/adm/orcamentos/' + o.id); };
  $('#oyConv').onclick = () => oyColaConversa();
  $$('[data-filt]').forEach(b => b.onclick = () => { S.f = b.dataset.filt; admOrcamentos(); });
  $$('[data-ped]').forEach(b => b.onclick = () => { const p = (DB.pedidos || []).find(x => x.id === b.dataset.ped); if (!p) return; const o = oyDoPedido(p); go('/adm/orcamentos/' + o.id); });
}
/* o pedido da vitrine (transfer ou "Monte seu roteiro") vira orçamento: cliente, pessoas, datas e o que ele pediu —
   o que tem na tabela dela vem com o preço; o resto entra SEM preço, fora da proposta até ela pôr o valor */
function oyDoPedido(p) {
  const tr = p.tipo === 'transfer';
  const chegada = tr && (p.tipoTrf === 'chegada' || p.tipoTrf === 'ida') ? { data: p.data || '', hora: oyHm(p.hora), voo: p.voo || '' } : { data: tr ? '' : (p.ini || ''), hora: '', voo: '' };
  const partida = tr && p.tipoTrf === 'saida' ? { data: p.data || '', hora: oyHm(p.hora), voo: p.voo || '' } : tr && p.volta ? { data: p.voltaData || '', hora: oyHm(p.voltaHora), voo: p.voltaVoo || '' } : { data: tr ? '' : (p.fim || ''), hora: '', voo: '' };
  const o = Orc.cria({ status: 'rascunho', origem: 'pedido', pedidoId: p.id, cliente: { nome: p.nome, whats: p.whats, email: p.email },
    adultos: +p.adultos || 0, criancas: +p.criancas || 0, pax: (+p.adultos || 0) + (+p.criancas || 0), chegada, partida,
    conversa: String(p.ficha || p.obs || ''), resumo: String(p.resumo || '') });
  if (tr) {
    const ida = p.tipoTrf !== 'saida';
    const n = Orc._item({ tipo: 'traslado', desc: ida ? `Traslado ${p.de || 'Aeroporto'} → ${p.para || 'Hotel'}` : `Traslado ${p.de || 'Hotel'} → ${p.para || 'Aeroporto'}`,
      data: p.data || '', hora: oyHm(p.hora), voo: p.voo || '', pax: oyPax(o) || 1, valor: 0, sugestao: true, obs: 'O cliente pediu — escolha no catálogo e ponha o valor' });
    o.itens.push(n);
    if (p.volta) o.itens.push(Orc._item({ tipo: 'traslado', desc: `Traslado ${p.para || 'Hotel'} → ${p.de || 'Aeroporto'}`, data: p.voltaData || '', hora: oyHm(p.voltaHora), voo: p.voltaVoo || '', pax: oyPax(o) || 1, valor: 0, sugestao: true, obs: 'O cliente pediu — escolha no catálogo e ponha o valor' }));
  } else {
    /* a viagem sob medida (o passeio "sob-medida", onde existe) e o passeio do "pedir valor" */
    if (p.tipo === 'sobmedida' && Tours.get('sob-medida')) { const n = oyDoCatalogo(o, 'sob-medida', { data: '' }); if (n) { n.sugestao = true; o.itens.push(n); } }
    if (p.tourId && Tours.get(p.tourId)) { const n = oyDoCatalogo(o, p.tourId, { data: p.data || '' }); if (n) { n.sugestao = true; o.itens.push(n); } }
    for (const nome of p.passeios || []) {
      const x = Tours.get(nome) || Tours.all().find(t => !t.avulso && _nomeN(oyPt(t.name)) === _nomeN(nome));
      const n = x && x.status !== 'draft' ? oyDoCatalogo(o, x.id, { data: '' }) : Orc._item({ tipo: 'passeio', desc: x ? oyPt(x.name) : String(nome), pax: oyPax(o) || 1, valor: 0, obs: 'O cliente pediu — escolha no catálogo e ponha o valor' });
      if (n) { n.sugestao = true; o.itens.push(n); }
    }
    if ((p.precisa || []).includes('transfer')) o.itens.push(Orc._item({ tipo: 'traslado', desc: 'Traslado aeroporto ↔ hotel', pax: oyPax(o) || 1, valor: 0, sugestao: true, obs: 'O cliente pediu — escolha no catálogo e ponha o valor' }));
  }
  if (p.hotel) o.hotel = p.hotel;
  Orc.salva(o);
  p.orcamentoId = o.id;
  if (typeof Pedidos !== 'undefined' && Pedidos.ligaOrcamento) Pedidos.ligaOrcamento(p.id, o.id);
  else if (typeof Pedidos !== 'undefined' && Pedidos.marca) Pedidos.marca(p.id, true);
  else { p.respondido = true; oyGrava(); }
  return Orc.get(o.id);
}

/* ---------- ler uma conversa colada do WhatsApp (o "apanhador" da base de operação) ----------
   Tira nome, telefone, datas (inclusive o período "de 12 a 18 de março"), adultos e crianças, voo,
   e os passeios DELA que o cliente citou pelo nome. Nunca responde nada, nunca inventa. */
const MESES_PT = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function _isoDe(d, m, y) {
  const hoje = isoToday();
  let ano = y ? (+y < 100 ? 2000 + +y : +y) : +hoje.slice(0, 4);
  const iso = (a) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (!(+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31)) return '';
  if (!y && iso(ano) < hoje) ano += 1;
  return iso(ano);
}
function lerConversa(txt) {
  const bruto = String(txt || '');
  const low = bruto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let nome = '';
  const nomeDono = String((typeof guiaNome === 'function' && guiaNome()) || '').toLowerCase();
  const neg = String((typeof guiaNegocio === 'function' && guiaNegocio()) || '').toLowerCase();
  const reAutor = /^(?:\[[^\]]+\]\s*|\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*-\s*)([^:\n]{2,40}):/gm;
  let m;
  while ((m = reAutor.exec(bruto))) {
    const quem = m[1].trim();
    if (nomeDono && quem.toLowerCase().includes(nomeDono)) continue;
    if (neg && quem.toLowerCase().includes(neg)) continue;
    if (/^\+?[\d\s()-]+$/.test(quem)) continue;
    nome = quem; break;
  }
  if (!nome) { const mm = bruto.match(/(?:meu nome [eé]|me chamo|sou (?:a|o))\s+([A-ZÀ-Ú][\wÀ-ú]+(?:\s+[A-ZÀ-Ú][\wÀ-ú]+)?)/); if (mm) nome = mm[1]; }
  const tel = (bruto.match(/\+\d[\d\s().-]{8,}\d/) || [''])[0].replace(/[^\d+]/g, '');
  const semCarimbo = bruto.replace(/^\[[^\]]+\]/gm, '').replace(/^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*-/gm, '');
  const datas = new Set();
  for (const d of semCarimbo.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) { const i = _isoDe(d[1], d[2], d[3]); if (i) datas.add(i); }
  const semCarLow = semCarimbo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const d of semCarLow.matchAll(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/g)) {
    const mi = MESES_PT.indexOf(d[2]); if (mi >= 0) { const i = _isoDe(d[1], mi + 1, d[3]); if (i) datas.add(i); }
  }
  for (const d of semCarLow.matchAll(/\b(\d{1,2})\s*(?:a|ao|ate|-|–|e)\s*(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/g)) {
    const mi = MESES_PT.indexOf(d[3]); if (mi >= 0 && +d[1] < +d[2]) { const i = _isoDe(d[1], mi + 1, d[4]); if (i) datas.add(i); }
  }
  for (const d of semCarLow.matchAll(/\b(\d{1,2})\s*(?:a|ao|ate|-|–)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) {
    if (+d[1] < +d[2]) { const i = _isoDe(d[1], d[3], d[4]); if (i) datas.add(i); }
  }
  const num = (re) => { const x = low.match(re); return x ? +x[1] : 0; };
  const pessoas = num(/(\d{1,2})\s*(?:pessoas|pax|people)/);
  const adultos = num(/(\d{1,2})\s*(?:adultos?|adults?)/);
  const criancas = num(/(\d{1,2})\s*(?:criancas?|filhos?|kids?|children)/);
  const pax = pessoas || (adultos + criancas) || (/\b(casal|eu e (meu|minha))\b/.test(low) ? 2 : 0);
  const chegada = /chegada|chego|chegamos|desembarc|pousa|aterriss/.test(low);
  const partida = /partida|saida|embarque|vou embora|vamos embora|voo de volta|volta(?:mos)? (?:ao|para o) (?:brasil|aeroporto)/.test(low);
  const transfer = /transfer|traslado|translado/.test(low);
  const voo = (bruto.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/) || [])[0] || '';
  /* os passeios DELA citados pelo nome inteiro (sem o que vem entre parênteses) */
  const passeios = Tours.all().filter(x => !x.avulso && x.status !== 'draft').filter(x => {
    const n = _nomeN(oyPt(x.name).replace(/\(.*?\)/g, '')).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    return n.length >= 5 && (' ' + low.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ').includes(' ' + n + ' ');
  }).map(x => x.id);
  const partes = [];
  if (datas.size) partes.push([...datas].sort().map(d => d.slice(8, 10) + '/' + d.slice(5, 7)).join(', '));
  if (pax) partes.push(pax + (criancas ? ` pessoas (${criancas} criança${criancas > 1 ? 's' : ''})` : ' pessoas'));
  if (transfer) partes.push('traslado' + (chegada && partida ? ' (chegada e partida)' : chegada ? ' (chegada)' : partida ? ' (partida)' : ''));
  if (passeios.length) partes.push(passeios.map(id => oyPt(Tours.get(id).name)).join(', '));
  if (voo) partes.push('voo ' + voo);
  return { nome, whats: tel, datas: [...datas].sort(), adultos, criancas, pax, chegada, partida, transfer, voo, passeios, resumo: partes.join(' · ') };
}
/* o rascunho da conversa: cada pedido vira um item marcado como PEDIDO — ela confere antes de mandar */
function oyDaConversa(txt) {
  const r = lerConversa(txt);
  const ad = r.adultos || (r.pax ? Math.max(0, r.pax - r.criancas) : 0);
  const o = Orc.cria({ status: 'rascunho', origem: 'conversa', cliente: { nome: r.nome, whats: r.whats }, conversa: String(txt || '').slice(0, 20000), resumo: r.resumo,
    adultos: ad, criancas: r.criancas, pax: ad + r.criancas,
    chegada: { data: r.datas[0] || '', hora: '', voo: r.chegada ? r.voo : '' },
    partida: { data: r.datas.length > 1 ? r.datas[r.datas.length - 1] : '', hora: '', voo: '' } });
  if (r.transfer && o.chegada.data && (r.chegada || !r.partida)) { const n = oyTraslado(o, 'chegada'); n.sugestao = true; o.itens.push(n); }
  if (r.transfer && o.partida.data && r.partida) { const n = oyTraslado(o, 'saida'); n.sugestao = true; o.itens.push(n); }
  for (const id of r.passeios) { const n = oyDoCatalogo(o, id, { data: '' }); if (n) { n.sugestao = true; o.itens.push(n); } }
  Orc.salva(o);
  return { o: Orc.get(o.id), r };
}
function oyColaConversa() {
  const d = opJanela('Colar a conversa do WhatsApp', `<p class="why">Cole a conversa (ou o pedido do cliente). O app tira o nome, o telefone, as datas, as pessoas e os passeios que você já tem. Nada é inventado: o que não tem preço na sua tabela entra sem valor, para você pôr.</p>
    <label class="fld"><span class="sr">Conversa</span><textarea id="ccTxt" rows="9" placeholder="[05/10/26 14:32] Maria Silva: Oi! Somos 2 adultos e 1 criança, chegamos de 12 a 18 de março…"></textarea></label>
    <p class="why" id="ccPrev" aria-live="polite"></p>
    <div class="btnrow"><button type="button" class="cta sm" id="ccCria" disabled>Criar o orçamento</button></div>`);
  const ta = d.querySelector('#ccTxt'), pv = d.querySelector('#ccPrev'), bt = d.querySelector('#ccCria');
  ta.oninput = () => {
    const txt = ta.value.trim(); bt.disabled = !txt;
    if (!txt) { pv.textContent = ''; return; }
    const r = lerConversa(txt);
    pv.textContent = [r.nome && 'Cliente: ' + r.nome, r.whats && 'WhatsApp: ' + r.whats, r.resumo].filter(Boolean).join(' · ') || 'Não achei nome nem datas — dá para criar e completar à mão.';
  };
  bt.onclick = () => { const { o } = oyDaConversa(ta.value); d.close(); go('/adm/orcamentos/' + o.id); };
  setTimeout(() => ta.focus(), 30);
}

/* ---------- 7. o painel: a aba, as rotas e o redesenho da nuvem ---------- */
if (typeof STR !== 'undefined') Object.assign(STR, { admOrcamentos: Object.assign({ pt: 'Orçamentos', en: 'Quotes', es: 'Presupuestos', fr: 'Devis', it: 'Preventivi', de: 'Angebote' }, STR.admOrcamentos || {}) });
if (typeof ADM_TABS !== 'undefined' && !ADM_TABS.some(([id]) => id === 'orcamentos')) {
  const k = ADM_TABS.findIndex(([id]) => id === 'voucher'), b = ADM_TABS.findIndex(([id]) => id === 'bookings');
  ADM_TABS.splice(k >= 0 ? k : b >= 0 ? b + 1 : ADM_TABS.length, 0, ['orcamentos', 'admOrcamentos']);
}
if (typeof viewAdm === 'function') {
  const _oyViewAdm = viewAdm;
  viewAdm = function (tab, arg) {
    if (tab === 'orcamentos' && arg) {
      /* a nuvem chamou route() com o editor aberto: só redesenha se o orçamento mudou (e na mesma altura) */
      const S = oyTela._s;
      if (S && S.id === arg && document.querySelector('.oy') && !document.querySelector('.oy-lista')) {
        const agora = JSON.stringify(Orc.get(arg) || {});
        if (agora === S.foto) return;
        if (oyNumCampo()) return;
        const y = scrollY; oyTela(arg); scrollTo(0, y); return;
      }
      return oyTela(arg);
    }
    if (tab === 'orcamentos') { const y = document.querySelector('.oy-lista') ? scrollY : 0; admOrcamentos(); if (y) scrollTo(0, y); return; }
    if (tab === 'proposta' && arg) { if (document.getElementById('ppDoc') && ppAdm._id === arg) return; ppAdm._id = arg; return ppAdm(arg); }
    ppAdm._id = '';
    return _oyViewAdm(tab, arg);
  };
}

function oyCss() {
  if (document.getElementById('oyCss')) return;
  const s = document.createElement('style'); s.id = 'oyCss';
  s.textContent = `
  .oy{max-width:860px;margin:0 auto;padding-bottom:84px}
  .oy .sr,.oy-dlg .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .oy .op-lbl,.oy-dlg .op-lbl{display:block;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:6px 0 6px}
  .oy .linkbtn{color:var(--ink-2);text-decoration:none;font-weight:600}
  .oy .optin,.oy-dlg .optin{display:flex;gap:10px;align-items:flex-start;cursor:pointer}
  .oy .optin input,.oy-dlg .optin input{width:20px;height:20px;margin-top:2px;flex:none;accent-color:var(--accent)}
  .oy .optin span,.oy-dlg .optin span{display:grid}
  .oy .optin small,.oy-dlg .optin small{color:var(--ink-3);font-size:12.5px}
  .oy-pre{white-space:pre-wrap;font:inherit;font-size:13px;background:var(--surface-2);border-radius:12px;padding:10px 12px;max-height:280px;overflow:auto}
  .oy-top{margin-bottom:10px}
  .oy-tit{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:6px}
  .oy-tit .pageh{margin:0}
  .oy-salvo{color:var(--ok);font-size:var(--fs-2);min-width:40px}
  .oy-card{margin-bottom:14px}
  .oy-h{font-size:var(--fs-4,18px);margin:0 0 12px}
  .oy-hrow{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
  .oy-sub{color:var(--ink-3);font-size:var(--fs-2)}
  .oy-g2{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
  .oy-g3{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:0 8px}
  .oy-g3v{display:grid;grid-template-columns:repeat(4,1fr);gap:0 10px}
  .oy-usd{margin:2px 0 0;font-size:12px}
  .oy .fld input,.oy .fld select,.oy .fld textarea{min-height:44px}
  .oy-pax > span{display:block}
  .oy-step{display:flex;align-items:center;justify-content:space-between;gap:6px;border:1px solid var(--line-2);border-radius:var(--r-pill);padding:3px;background:var(--surface);min-height:44px;margin-top:4px}
  .oy-step button{width:40px;height:40px;border-radius:50%;border:0;background:var(--surface-2);color:var(--ink);font-size:20px;line-height:1;cursor:pointer}
  .oy-step button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .oy-step output{font-weight:700;font-size:var(--fs-4,18px);min-width:24px;text-align:center}
  .oy-voo{border:0;margin:0;padding:0;min-width:0}
  .oy-vg{display:grid;grid-template-columns:1fr 1fr;gap:0 8px}
  .oy-vg .fld:first-child{grid-column:1/-1}
  .oy .fld{min-width:0}.oy .fld input{min-width:0}
  .oy-voo legend{font-size:var(--fs-2);font-weight:var(--t-strong);color:var(--ink-2);padding:0;margin-bottom:2px}
  .oy-dia{margin:6px 0 10px}
  .oy-diah{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-primaria,var(--accent));margin:12px 0 6px;font-weight:700;display:flex;align-items:center;justify-content:space-between;gap:8px}
  .oy-it{border:1px solid var(--line);border-radius:12px;background:var(--surface);margin-bottom:6px;overflow:hidden}
  .oy-it.aberto{border-color:var(--accent-line);box-shadow:var(--sh-1)}
  .oy-itcab{display:grid;grid-template-columns:74px 1fr auto 18px;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 12px;background:none;border:0;text-align:left;font:inherit;color:var(--ink);cursor:pointer}
  .oy-itcab:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .oy-ithr{font-size:var(--fs-2);color:var(--ink-2);font-variant-numeric:tabular-nums}
  .oy-itn{min-width:0}
  .oy-itn b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .oy-itn small{display:inline-block;margin-right:8px;color:var(--ink-3);font-size:12px}
  .oy .oy-alerta{color:var(--warn)}
  .oy-itv{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
  .oy-chev svg{width:16px;height:16px;color:var(--ink-3);transition:transform .2s ease}
  .oy-it.aberto .oy-chev svg{transform:rotate(90deg)}
  .oy-ited{padding:4px 12px 12px;border-top:1px solid var(--line)}
  .oy-ited textarea{resize:vertical}
  .oy-fotos{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;margin-bottom:4px}
  .oy-ft{flex:none;width:64px;height:48px;border-radius:8px;border:2px solid transparent;background:var(--surface-2) center/cover;cursor:pointer;font:inherit;font-size:11px;color:var(--ink-2)}
  .oy-ft.on{border-color:var(--accent)}
  .oy-ft:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .oy-itacs{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px}
  .oy-custo{flex:1;min-width:140px;margin:0}
  .oy-add{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px}
  .oy-addb{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:64px;padding:8px 4px;border-radius:12px;border:1px dashed var(--line-2);background:var(--surface-2);color:var(--ink);font:inherit;font-size:12.5px;font-weight:var(--t-strong);text-align:center;line-height:1.15;cursor:pointer}
  .oy-addb svg{width:20px;height:20px}
  .oy-addb:hover{border-color:var(--accent-line);background:var(--accent-wash)}
  .oy-addb:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .oy-addf{border-style:solid;background:var(--brand-primaria,var(--accent));border-color:var(--brand-primaria,var(--accent));color:#fff}
  .oy-addf:hover{background:var(--brand-primaria,var(--accent));filter:brightness(1.08)}
  .oy-tot{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
  .oy-tot > div{background:var(--surface-2);border-radius:12px;padding:10px 12px}
  .oy-tot small{display:block;color:var(--ink-3);font-size:12px}
  .oy-tot b{display:block;font-size:clamp(17px,4.4vw,22px);font-variant-numeric:tabular-nums;margin:2px 0}
  .oy-pp b i{font-style:normal;font-size:12px;font-weight:600;color:var(--ink-3)}
  .oy-vatck{margin:0 0 12px}
  .oy-pag{display:grid;gap:8px;margin:4px 0 8px}
  .oy-rap{display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 12px}
  .oy-ftup{display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:600;font-size:13px;border:1px dashed var(--line-2);background:var(--surface)}
  .oy-cfoto{display:block;width:96px;height:64px;margin:6px 0 2px;border:0;border-radius:8px;background-size:cover;background-position:center;background-color:var(--surface-2);cursor:pointer}
  .oy-itf{float:left;width:40px;height:40px;margin-right:10px;border-radius:8px;background-size:cover;background-position:center}
  .oy-rap .chip{min-height:36px}
  .oy-pag .chips{display:flex;flex-wrap:wrap;gap:6px}
  .oy-pagv{display:flex;align-items:center;gap:10px;background:var(--surface-2);border-radius:12px;padding:8px 12px}
  .oy-pagv span{color:var(--ink-3);font-size:13px}.oy-pagv b{margin-left:auto;font-variant-numeric:tabular-nums}
  .oy-num{display:block;margin-top:12px;font-variant-numeric:tabular-nums}
  .oy-mais summary{cursor:pointer;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;min-height:32px}
  .oy-mais summary small{color:var(--ink-3)}
  .oy-mais[open] summary{margin-bottom:12px}
  .oy-conv{margin:8px 0}
  .oy-fechou{border:1px solid var(--accent-line);background:var(--accent-wash)}
  .oy-kitb{display:flex;width:100%;justify-content:center;margin:4px 0 6px}
  .oy-res summary{cursor:pointer;margin-top:8px;min-height:32px}
  .oy-resl{margin:6px 0;font-size:14px}
  .oy-barra{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px max(16px,env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));background:var(--surface);border-top:1px solid var(--line);box-shadow:0 -8px 24px -18px rgba(0,0,0,.35)}
  .oy-barra .oy-btxt{font-weight:700;font-variant-numeric:tabular-nums;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .oy-barra .cta{flex:none;text-decoration:none}
  .oy-barra-acs{display:flex;gap:8px;align-items:center}
  .oy-sheet{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface);margin-top:4px}
  .oy-shh,.oy-row{display:grid;grid-template-columns:150px 118px minmax(0,1fr) 112px 84px;align-items:start}
  .oy-cacs{display:flex;gap:2px}
  .oy-crm:hover{color:var(--danger);background:var(--danger-wash)}
  .oy-desfaz{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:300;display:flex;align-items:center;gap:14px;padding:10px 10px 10px 16px;border-radius:999px;background:var(--ink);color:var(--paper);box-shadow:var(--sh-2);max-width:92vw}
  .oy-desfaz span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}
  .oy-desfaz button{border:0;border-radius:999px;padding:8px 14px;background:var(--accent);color:var(--accent-ink);font:inherit;font-weight:700;cursor:pointer}
  .oy-shh{background:var(--brand-primaria,#141414);color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
  .oy-shh > span{padding:9px 12px}
  .oy-r{text-align:right}
  .oy-band{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--accent-wash);color:var(--ink);font-weight:700;font-size:13.5px;padding:5px 8px 5px 12px;border-top:1px solid var(--accent-line)}
  .oy-band-add{border:1px solid var(--accent-line);background:var(--surface);color:var(--ink-2);border-radius:999px;min-height:30px;padding:0 12px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}
  .oy-band-add:hover{background:var(--surface-2)}
  .oy-band-add:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .oy-row{border-top:1px solid var(--line)}
  .oy-row.aberto{background:var(--accent-wash)}
  .oy-c{padding:5px 4px;min-width:0}
  .oy-c input,.oy-c textarea{display:block;width:100%;min-height:38px;border:1px solid transparent;border-radius:8px;background:transparent;padding:7px 8px;font:inherit;font-size:var(--fs-3);color:var(--ink);resize:none}
  .oy-c input:hover,.oy-c textarea:hover{border-color:var(--line)}
  .oy-c input:focus,.oy-c textarea:focus{border-color:var(--accent);background:var(--surface);outline:none;box-shadow:0 0 0 3px var(--accent-wash)}
  .oy-cd input{font-size:13px;padding:7px 4px;color:var(--ink-3)}
  .oy-cd input:focus{color:var(--ink)}
  .oy-ch input{font-variant-numeric:tabular-nums}
  .oy-ct{font-weight:700}
  .oy-cx{color:var(--ink-2);line-height:1.45;margin-top:2px;overflow:hidden;min-height:58px}
  .oy-cobs{display:inline-block;margin:2px 8px 4px;padding:3px 9px;border-radius:10px 10px 10px 3px;background:var(--accent-wash);color:var(--ink-2);font-size:12px}
  .oy-cvoo{display:block;padding:0 8px 4px;color:var(--ink-3);font-size:12px}
  .oy-cv input{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
  .oy-cm{display:grid;place-items:center;width:38px;height:38px;border:0;border-radius:50%;background:none;color:var(--ink-2);font-size:20px;line-height:1;cursor:pointer}
  .oy-cm:hover,.oy-cm[aria-expanded="true"]{background:var(--surface-2);color:var(--ink)}
  .oy-cm:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .oy-rowmais{padding:10px 14px 14px;background:var(--accent-wash);border-top:1px dashed var(--accent-line)}
  .oy-custo2{min-width:0}
  .oy-opc{align-items:end}
  .oy-hots{margin:4px 0 10px}
  .oy-hot{display:grid;grid-template-columns:minmax(0,1.6fr) 1fr 1fr .9fr 40px;gap:0 8px;align-items:end}
  .oy-hot .fld{margin-bottom:6px}
  .oy-aparte{margin:2px 0 10px}
  .oy-aparte-v{display:block;padding:9px 8px;text-align:right;color:var(--ink-3);font-style:italic}
  .oy-opsel select{min-width:0}
  .oy-pcri{margin:-4px 0 10px;font-size:12.5px}
  .oy-lacs{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .oy-lacs .mini svg{width:15px;height:15px;vertical-align:-3px}
  .oy-filt{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 12px}
  .oy-filt small{opacity:.7;margin-left:4px}
  .oy-ls{display:grid;gap:6px}
  .oy-lit{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);text-decoration:none;min-height:56px}
  .oy-lit:hover{border-color:var(--accent-line);background:var(--accent-wash)}
  .oy-lit:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .oy-litn b{display:block}
  .oy-litn small{color:var(--ink-3);font-size:12.5px}
  .oy-litv{font-weight:700;font-variant-numeric:tabular-nums}
  .oy-ped{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--line)}
  .oy-ped:first-of-type{border-top:0}
  .oy-ped small{display:block;color:var(--ink-3);font-size:12.5px}
  .oy-dlg{margin:auto;width:min(640px,96vw);max-height:92vh;border:0;border-radius:18px;padding:0;background:var(--surface);color:var(--ink);box-shadow:var(--sh-3,0 20px 60px -20px rgba(0,0,0,.5))}
  .oy-dlg::backdrop{background:rgba(0,0,0,.45)}
  .oy-dlgcab{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px 6px}
  .oy-dlgcab h2{font-size:var(--fs-4,18px);margin:0}
  .oy-dlgx{width:40px;height:40px;border:0;border-radius:50%;background:var(--surface-2);color:var(--ink);font-size:16px;cursor:pointer}
  .oy-dlgcorpo{padding:4px 16px 16px}
  .oy-dlg textarea{width:100%}
  .oy-cdias .chips,.oy-creg{display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}
  .oy-cdias .chip,.oy-creg .chip{white-space:nowrap;flex:none}
  .oy-busca{display:flex;align-items:center;gap:8px;border:1px solid var(--line-2);border-radius:var(--r-pill);padding:0 14px;background:var(--surface);margin:10px 0 8px;min-height:46px}
  .oy-busca svg{width:18px;height:18px;color:var(--ink-3);flex:none}
  .oy-busca input{border:0;outline:0;background:none;flex:1;min-height:44px;font:inherit;color:var(--ink)}
  .oy-busca:focus-within{border-color:var(--accent)}
  .oy-clista{display:grid;gap:6px;max-height:min(52vh,460px);overflow-y:auto;margin:6px 0 10px;padding-right:2px}
  .oy-cit{display:grid;grid-template-columns:56px 1fr 36px;align-items:center;gap:12px;padding:6px;border:1px solid var(--line);border-radius:12px;background:var(--surface);text-align:left;font:inherit;color:var(--ink);cursor:pointer;min-height:56px}
  .oy-cit:hover{border-color:var(--accent-line);background:var(--accent-wash)}
  .oy-cit:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .oy-cit.ja{border-color:var(--accent-line)}
  .oy-cft{width:56px;height:44px;border-radius:8px;background:var(--surface-2) center/cover}
  .oy-cnm b{display:block;font-weight:600;font-size:var(--fs-3);line-height:1.25}
  .oy-cnm small{color:var(--ink-3);font-size:12px}
  .oy-citop{grid-template-columns:56px 1fr;cursor:default;align-items:start}
  .oy-citop:hover{background:var(--surface);border-color:var(--line)}
  .oy-cops{display:grid;gap:4px;margin-top:8px}
  .oy-cop{display:grid;grid-template-columns:1fr auto 32px;align-items:center;gap:8px;min-height:44px;padding:6px 6px 6px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);text-align:left;font:inherit;color:var(--ink);cursor:pointer}
  .oy-cop b{display:block;font-size:13.5px;font-weight:600}
  .oy-cop small{display:block;color:var(--ink-3);font-size:12px}
  .oy-cop em{font-style:normal;font-weight:700;font-variant-numeric:tabular-nums;font-size:13.5px}
  .oy-cop svg,.oy-cmais svg{width:18px;height:18px}
  .oy-cop svg{width:30px;height:30px;padding:6px;border-radius:50%;background:var(--brand-primaria,var(--accent));color:#fff}
  .oy-cmais{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--brand-primaria,var(--accent));color:#fff}
  .oy-cpe{justify-content:space-between;align-items:center}
  .fc-vg{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:6px 0 10px}
  .fc-vg>div{background:var(--surface-2);border-radius:12px;padding:10px 12px}.fc-vg small{display:block;color:var(--ink-3);font-size:12px}.fc-vg b{display:block}.fc-vg span{font-size:12.5px;color:var(--ink-2)}
  .fc-hots p{margin:4px 0}.fc-hots span{color:var(--ink-2);font-size:13px}.fc-hots em{font-style:normal;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--accent)}
  .fc-orcs{display:grid;gap:6px;margin-top:10px}.fc-orc{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px 12px}
  .fc-orc small{display:block;color:var(--ink-3);margin-top:2px}.fc-orc-acs{display:flex;gap:6px;flex-wrap:wrap}
  .pp-adm .doc-barra{display:flex;align-items:center;gap:8px;flex-wrap:wrap;position:sticky;top:0;z-index:30;padding:10px 0;background:var(--paper,var(--surface))}
  .pp-adm .pp{border-radius:14px;overflow:hidden}
  .pp-adwhy{max-width:794px;margin:8px auto 10px!important}
  @media(max-width:600px){
    .oy-g2{grid-template-columns:1fr}
    .oy-g2:has(.oy-pax){grid-template-columns:1fr 1fr}
    .oy-g3v{grid-template-columns:1fr 1fr}
    .oy-g3{grid-template-columns:1.4fr 1fr 1fr}
    .oy-hot{grid-template-columns:1fr 1fr 40px}
    .oy-hot .fld:first-child{grid-column:1/-1}
    .oy-quando{grid-template-columns:1fr 1fr}
    .oy-quando .fld:first-child{grid-column:1/-1}
    .oy-tot{grid-template-columns:1fr 1fr}
    .oy-tot > div:first-child{grid-column:1/-1}
    .oy-add{grid-template-columns:1fr 1fr}
    .oy-itcab{grid-template-columns:1fr auto 14px;grid-template-areas:'hr v ch' 'n n n';gap:2px 8px;padding:10px 12px}
    .oy-ithr{grid-area:hr}.oy-itv{grid-area:v}.oy-chev{grid-area:ch}.oy-itn{grid-area:n}
    .oy-itn b{white-space:normal;overflow:visible}
    .oy-barra{flex-wrap:wrap}.oy-barra .oy-btxt{flex-basis:100%}.oy-barra-acs{flex:1}.oy-barra-acs .cta{flex:1;text-align:center;justify-content:center}
    .oy-lit{grid-template-columns:1fr auto;grid-template-areas:'n v' 'n p'}
    .oy-litn{grid-area:n}.oy-litv{grid-area:v;text-align:right}.oy-lit .pill{grid-area:p;justify-self:end}
  }
  @media(prefers-reduced-motion:reduce){.oy-chev svg{transition:none}}`;
  document.head.appendChild(s);
}

/* abriu direto num destes endereços (link da proposta, editor, proposta no painel):
   o route() do começo rodou antes deste arquivo existir — desenha de novo */
if (/^#\/pp?\//.test(location.hash) || /^#\/adm\/(orcamentos|proposta)(\/|$)/.test(location.hash)) route();
