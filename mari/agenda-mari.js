/* =====================================================
   AGENDA E TAREFAS DA MARI (06/10/2026)

   Pedido do Eugênio: "aba TAREFAS pra anexar na agenda essas anotações…
   ABA agenda proativa… botar anotações e tarefas pessoais também… e isso
   ser sincronizado com a nuvem do Google Calendário da Mari".

   - DB.tarefas: tarefa (fazer), compromisso (tem hora marcada) e anotação
     (ideia solta, com ou sem dia). Área "trabalho" ou "pessoal". Pode
     repetir (todo dia / toda semana / todo mês) até uma data.
   - Aba Tarefas: atrasadas, hoje, amanhã, próximos dias, sem dia, anotações.
   - Agenda: o mês mostra os passeios E as tarefas (e os eventos do Google,
     se a ponte estiver ligada); o dia escolhido tem um "anotar" rápido.
   - Hoje (proativo): o que fazer agora — passeios, quem paga no dia,
     tarefas, pedidos do Personalize, aniversários, brindes para mandar.
   - GOOGLE AGENDA, três caminhos:
     1. um toque em "📅 Google" em qualquer tarefa ou passeio abre o Google
        Agenda dela já preenchido (sem configurar nada);
     2. a PONTE (um script que ela cola UMA vez na conta Google dela): o app
        manda sozinho tarefas e passeios reservados, com lembrete no celular,
        e mostra os compromissos pessoais do Google na agenda do app;
     3. com o app aberto, o aviso na tela na hora da tarefa.
   O endereço da ponte é PRIVADO (DB.privado, nunca nos Ajustes, que são
   públicos): quem tivesse o endereço escreveria na agenda dela.
   ===================================================== */
'use strict';

const AG_PAD = (n) => String(n).padStart(2, '0');
function agHoje() { const d = new Date(); return d.getFullYear() + '-' + AG_PAD(d.getMonth() + 1) + '-' + AG_PAD(d.getDate()); }
function agAgoraHM() { const d = new Date(); return AG_PAD(d.getHours()) + ':' + AG_PAD(d.getMinutes()); }
const AG_TIPOS = { tarefa: '✓ Tarefa', compromisso: '🕘 Compromisso', anotacao: '✎ Anotação' };
const AG_AREAS = { pro: 'Trabalho', pessoal: 'Pessoal' };
const AG_REP = { '': 'não repete', diario: 'todo dia', semanal: 'toda semana', mensal: 'todo mês' };
const agData = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? (typeof fmtDate === 'function' ? fmtDate(iso) : iso) : '';
const agDataCurta = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';

/* =====================================================
   OS DADOS
   ===================================================== */
const Tarefas = {
  all() { if (!Array.isArray(DB.tarefas)) DB.tarefas = []; return DB.tarefas; },
  get(id) { return this.all().find(x => x.id === id) || null; },
  add(c) {
    const x = Object.assign({ id: 'tf' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tipo: 'tarefa', texto: '', nota: '', data: '', hora: '', horaFim: '',
      area: 'pro', prioridade: 'media', feita: false, feitas: {}, repete: '', ate: '', lembrar: 30, criado: new Date().toISOString() }, c || {});
    if (x.tipo === 'compromisso' && !x.hora) x.tipo = 'tarefa';
    if (!x.data) x.hora = '';
    this.all().push(x); save(); GCal.agendarEnvio(); return x;
  },
  update(id, c) {
    const x = this.get(id); if (!x) return null;
    Object.assign(x, c || {});
    if (!x.data) { x.hora = ''; x.horaFim = ''; }
    x.mudado = new Date().toISOString(); save(); GCal.agendarEnvio(); return x;
  },
  remove(id) {
    const x = this.get(id); if (!x) return false;
    DB.tarefas = this.all().filter(z => z.id !== id); save(); GCal.apagarDepois('tarefa:' + id); return true;
  },
  /* repetida: "feita" vale para o DIA (feitas[dia]); simples: o campo feita */
  feitaEm(x, dia) { return x.repete ? !!(x.feitas && x.feitas[dia]) : !!x.feita; },
  concluir(id, sim, dia) {
    const x = this.get(id); if (!x) return null;
    if (x.repete) { x.feitas = x.feitas || {}; if (sim) x.feitas[dia || x.data] = new Date().toISOString(); else delete x.feitas[dia || x.data]; }
    else { x.feita = !!sim; x.feitaEm = sim ? new Date().toISOString() : ''; }
    save(); GCal.agendarEnvio(); return x;
  },
  /* os dias em que uma tarefa aparece, entre de e ate (repetição inclusa) */
  dias(x, de, ate) {
    if (!x.data) return [];
    if (!x.repete) return x.data >= de && x.data <= ate ? [x.data] : [];
    const fim = x.ate && x.ate < ate ? x.ate : ate, out = [];
    let d = x.data, n = 0;
    while (d <= fim && n++ < 800) {
      if (d >= de) out.push(d);
      if (x.repete === 'diario') d = addDays(d, 1);
      else if (x.repete === 'semanal') d = addDays(d, 7);
      else { const [Y, M, D] = x.data.split('-').map(Number); const k = n; const dt = new Date(Y, M - 1 + k, 1); const ult = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
        d = dt.getFullYear() + '-' + AG_PAD(dt.getMonth() + 1) + '-' + AG_PAD(Math.min(D, ult)); }
    }
    return out;
  },
  /* as ocorrências de um dia, em ordem de hora */
  doDia(dia) {
    return this.all().filter(x => this.dias(x, dia, dia).length)
      .map(x => ({ x, dia, feita: this.feitaEm(x, dia) }))
      .sort((a, b) => (a.x.hora || '99').localeCompare(b.x.hora || '99'));
  },
  grupos(hoje) {
    hoje = hoje || agHoje();
    const amanha = addDays(hoje, 1), semana = addDays(hoje, 7);
    const G = { atrasadas: [], hoje: this.doDia(hoje), amanha: this.doDia(amanha), proximas: [], depois: [], semDia: [], anotacoes: [], feitas: [] };
    for (const x of this.all()) {
      if (!x.data) { (x.tipo === 'anotacao' ? G.anotacoes : (x.feita ? G.feitas : G.semDia)).push({ x, dia: '', feita: !!x.feita }); continue; }
      if (x.repete) {
        /* repetida atrasada = a última ocorrência antes de hoje que não foi feita */
        const antes = this.dias(x, addDays(hoje, -14), addDays(hoje, -1)).filter(d => !this.feitaEm(x, d));
        if (antes.length && x.tipo !== 'anotacao') G.atrasadas.push({ x, dia: antes[antes.length - 1], feita: false });
        const prox = this.dias(x, addDays(hoje, 2), semana)[0];
        if (prox) G.proximas.push({ x, dia: prox, feita: false });
        else { const depois = this.dias(x, addDays(semana, 1), addDays(hoje, 400))[0]; if (depois) G.depois.push({ x, dia: depois, feita: false }); }
        continue;
      }
      if (x.data < hoje) { if (x.feita) G.feitas.push({ x, dia: x.data, feita: true }); else if (x.tipo !== 'anotacao') G.atrasadas.push({ x, dia: x.data, feita: false }); }
      else if (x.data > amanha && x.data <= semana) G.proximas.push({ x, dia: x.data, feita: !!x.feita });
      else if (x.data > semana) G.depois.push({ x, dia: x.data, feita: !!x.feita });
    }
    const ordem = (a, b) => (a.dia + (a.x.hora || '99')).localeCompare(b.dia + (b.x.hora || '99'));
    for (const k of ['atrasadas', 'proximas', 'depois']) G[k].sort(ordem);
    G.feitas.sort((a, b) => String(b.x.feitaEm || '').localeCompare(String(a.x.feitaEm || ''))); G.feitas = G.feitas.slice(0, 20);
    return G;
  },
};

/* =====================================================
   GOOGLE AGENDA
   ===================================================== */
/* 1) um toque: o Google Agenda abre com o evento preenchido (sem configurar nada) */
function agGoogleLink(o) {
  const z = (iso, hm) => iso.replace(/-/g, '') + (hm ? 'T' + hm.replace(':', '') + '00' : '');
  let dates;
  if (o.hora) { const fim = o.horaFim || agSomaHora(o.hora, o.duracaoMin || 60); dates = z(o.data, o.hora) + '/' + z(o.data, fim); }
  else dates = z(o.data) + '/' + z(addDays(o.data, 1));
  const p = new URLSearchParams({ action: 'TEMPLATE', text: o.titulo, dates, details: o.descricao || '', ctz: 'Europe/Copenhagen' });
  if (o.local) p.set('location', o.local);
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}
function agSomaHora(hm, min) {
  const [h, m] = String(hm || '09:00').split(':').map(Number); const t = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + (isFinite(+min) ? +min : 60)));
  return AG_PAD(Math.floor(t / 60)) + ':' + AG_PAD(t % 60);
}
function agDuracaoMin(x) { const m = String((x && x.duration) || '').match(/(\d+)\s*h/); return m ? +m[1] * 60 : 120; }
function agEventoTarefa(x, dia) {
  const feita = !x.repete && x.feita;
  const fim = x.hora && x.horaFim && x.horaFim > x.hora ? x.horaFim : '';
  return { id: 'tarefa:' + x.id, titulo: (feita ? '✔ feito · ' : x.tipo === 'anotacao' ? '✎ ' : x.tipo === 'compromisso' ? '' : '☐ ') + x.texto, data: dia || x.data, hora: x.hora || '', horaFim: fim,
    descricao: [x.nota, 'Anotado no app Tour na Dinamarca.'].filter(Boolean).join('\n\n'), lembrete: x.hora && !feita ? (+x.lembrar || 30) : 0, repete: x.repete || '', ate: x.ate || '' };
}
function agEventoSaida(x, date, time, bs) {
  const pax = bs.reduce((s, b) => s + (+b.pax || 0), 0);
  const quem = bs.map(b => `${b.name} (${b.pax}p)${Bookings.due(b) > 0 ? ' · recebe no dia ' + eur(Bookings.due(b)) : ''}${b.whats ? ' · ' + b.whats : ''}`).join('\n');
  return { id: 'saida:' + x.id + ':' + date + ':' + time, titulo: `🧭 ${tl(x.name)} · ${pax} pessoa${pax > 1 ? 's' : ''}`, data: date, hora: time,
    horaFim: agSomaHora(time, agDuracaoMin(x)), local: noIdioma(x.meeting) || '', descricao: quem + '\n\nReserva do app Tour na Dinamarca.', lembrete: 60 };
}

/* 2) a PONTE: um Apps Script na conta Google dela */
const GCal = {
  cfg() { DB.privado = DB.privado || {}; return DB.privado.gcal || {}; },
  grava(c) { DB.privado = DB.privado || {}; DB.privado.gcal = Object.assign({}, this.cfg(), c); save(); },
  ligada() { const c = this.cfg(); return !!(c.url && c.token && c.ligado !== false); },
  async chama(corpo, ms) {
    const c = this.cfg(); if (!c.url) throw new Error('Ponte com o Google não configurada');
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms || 25000);
    try {
      /* text/plain: sem "preflight" — o Google Apps Script não responde a OPTIONS */
      const r = await fetch(c.url, { method: 'POST', body: JSON.stringify(Object.assign({ token: c.token }, corpo)), signal: ac.signal, redirect: 'follow' });
      const j = await r.json().catch(() => null);
      if (!j) throw new Error('A ponte não respondeu certo (confira se publicou como "Qualquer pessoa")');
      if (j.erro) throw new Error(j.erro === 'token' ? 'O código do script não bate com o do app — copie o script de novo' : j.erro);
      return j;
    } catch (e) { throw new Error(e.name === 'AbortError' ? 'O Google demorou demais — tente de novo' : (e.message || 'sem internet')); }
    finally { clearTimeout(t); }
  },
  /* o que deveria estar no Google agora: tarefas com dia (de 7 dias atrás a 1 ano) e saídas com reserva */
  desejados() {
    const c = this.cfg(), hoje = agHoje(), de = addDays(hoje, -7), ate = addDays(hoje, 365), out = [];
    if (c.enviarTarefas !== false) for (const x of Tarefas.all()) {
      if (!x.data || (x.ate && x.ate < de) || (!x.repete && x.data < de)) continue;
      out.push(agEventoTarefa(x));
    }
    if (c.enviarPasseios !== false) {
      const grupos = {};
      for (const b of DB.bookings || []) {
        if (b.status === 'cancelled' || !b.date || b.date < de || b.date > ate) continue;
        const k = b.tourId + '|' + b.date + '|' + b.time; (grupos[k] = grupos[k] || []).push(b);
      }
      for (const k of Object.keys(grupos)) { const [tid, date, time] = k.split('|'); const x = Tours.get(tid); if (x) out.push(agEventoSaida(x, date, time, grupos[k])); }
    }
    return out;
  },
  _t: null,
  agendarEnvio() { if (!this.ligada()) return; clearTimeout(this._t); this._t = setTimeout(() => this.sincronizar().catch(() => {}), 2500); },
  /* o que ainda EXISTE no app (qualquer data): só isto fica no Google. O que só ficou velho (fora da
     janela de envio) não é apagado — antes, cada sincronia apagava do Google o histórico de mais de 7 dias */
  existentes() {
    const out = new Set();
    if (this.cfg().enviarTarefas !== false) for (const x of Tarefas.all()) if (x.data) out.add('tarefa:' + x.id);
    if (this.cfg().enviarPasseios !== false) for (const b of DB.bookings || []) if (b.status !== 'cancelled' && b.date) out.add('saida:' + b.tourId + ':' + b.date + ':' + b.time);
    return out;
  },
  /* manda o que mudou (sombra neste aparelho) e apaga do Google o que deixou de existir.
     forcar = reenvia tudo (sem esquecer o que precisa sair). Evento que o Google recusou volta na próxima. */
  async sincronizar(forcar) {
    if (!this.ligada()) return { ok: false, motivo: 'desligada' };
    const SOMBRA = IA_NS_AG + 'gcal_sombra';
    let sombra = {}; try { sombra = JSON.parse(localStorage.getItem(SOMBRA)) || {}; } catch (e) {}
    const quer = this.desejados(), existem = this.existentes(), salvar = [];
    for (const ev of quer) { const j = JSON.stringify(ev); if (forcar || sombra[ev.id] !== j) salvar.push(ev); }
    const apagar = [...new Set(Object.keys(sombra).filter(id => !existem.has(id)).concat(this.cfg().pendentesApagar || []))];
    if (!salvar.length && !apagar.length) return { ok: true, salvos: 0, apagados: 0 };
    const r = await this.chama({ acao: 'sincronizar', salvar, apagar }, 60000);
    const recusados = new Set((r.erros || []).map(e => e.id));
    for (const ev of salvar) if (!recusados.has(ev.id)) sombra[ev.id] = JSON.stringify(ev);
    for (const id of apagar) delete sombra[id];
    try { localStorage.setItem(SOMBRA, JSON.stringify(sombra)); } catch (e) {}
    this.grava({ ultimo: new Date().toISOString(), pendentesApagar: [] });
    return { ok: true, salvos: r.salvos ?? salvar.length, apagados: r.apagados ?? apagar.length, recusados: (r.erros || []).length };
  },
  apagarDepois(id) { if (!this.ligada()) return; const p = this.cfg().pendentesApagar || []; if (!p.includes(id)) this.grava({ pendentesApagar: p.concat([id]) }); this.agendarEnvio(); },
  /* os compromissos pessoais do Google (não os que o app mandou), guardados só neste aparelho */
  cacheChave() { return IA_NS_AG + 'gcal_eventos'; },
  eventosDoCache() { try { return JSON.parse(localStorage.getItem(this.cacheChave())) || {}; } catch (e) { return {}; } },
  async lerMes(mes) {
    if (!this.ligada() || this.cfg().lerEventos === false) return [];
    const [Y, M] = mes.split('-').map(Number), ult = new Date(Y, M, 0).getDate();
    const r = await this.chama({ acao: 'listar', de: mes + '-01', ate: mes + '-' + AG_PAD(ult) });
    const c = this.eventosDoCache(); c[mes] = { em: Date.now(), eventos: r.eventos || [] };
    try { localStorage.setItem(this.cacheChave(), JSON.stringify(c)); } catch (e) {}
    return c[mes].eventos;
  },
  /* "ate" (dia inteiro) é o ÚLTIMO dia, inclusive — a ponte manda assim (fim do Google − 12 h) */
  eventosDoDia(dia) { const c = this.eventosDoCache()[dia.slice(0, 7)]; return c ? (c.eventos || []).filter(e => e.data === dia || (e.ate && e.data <= dia && dia <= e.ate)) : []; },
};
const IA_NS_AG = (typeof DB_KEY !== 'undefined' ? String(DB_KEY).replace(/_db_v\d+$/, '') : 'guia') + '_';

/* o script que ela cola em script.google.com (o código secreto vai dentro) */
function agScriptPonte(token) {
  return `/* Ponte entre o app Tour na Dinamarca e o seu Google Agenda.
   Cole tudo isto em script.google.com, salve e publique como
   "App da Web" (executar como: você; acesso: qualquer pessoa). */
const TOKEN = '${token}';

function doPost(e) {
  let p = {};
  try { p = JSON.parse(e.postData.contents); } catch (x) {}
  if (p.token !== TOKEN) return saida({ erro: 'token' });
  const cal = CalendarApp.getDefaultCalendar();
  TZ = cal.getTimeZone() || Session.getScriptTimeZone();
  const props = PropertiesService.getScriptProperties();
  if (p.acao === 'teste') return saida({ ok: true, calendario: cal.getName(), fuso: TZ });
  if (p.acao === 'listar') {
    const meus = new Set(Object.values(props.getProperties()));
    const evs = cal.getEvents(inicioDoDia(p.de), fimDoDia(p.ate)).filter(ev => !meus.has(ev.getId()));
    return saida({ ok: true, eventos: evs.slice(0, 300).map(ev => ({
      titulo: ev.getTitle(), data: ev.isAllDayEvent() ? isoDia(ev.getAllDayStartDate()) : iso(ev.getStartTime()), ate: ev.isAllDayEvent() ? isoDia(new Date(ev.getAllDayEndDate().getTime() - 43200000)) : '',
      hora: ev.isAllDayEvent() ? '' : hm(ev.getStartTime()), horaFim: ev.isAllDayEvent() ? '' : hm(ev.getEndTime()), local: ev.getLocation() })) });
  }
  if (p.acao === 'sincronizar') {
    let salvos = 0, apagados = 0;
    for (const id of p.apagar || []) {
      const eid = props.getProperty(id);
      if (eid) { try { const s = cal.getEventSeriesById(eid); if (s) s.deleteEventSeries(); } catch (x) { try { const ev = cal.getEventById(eid); if (ev) ev.deleteEvent(); } catch (y) {} } props.deleteProperty(id); apagados++; }
    }
    const erros = [];
    for (const o of p.salvar || []) {
      try {
        const eid = props.getProperty(o.id);
        if (eid) { try { const s = cal.getEventSeriesById(eid); if (s) s.deleteEventSeries(); } catch (x) {} }
        const op = { description: o.descricao || '', location: o.local || '' };
        let ev;
        const regra = o.repete ? repeticao(o) : null;
        if (o.hora) {
          const ini = quando(o.data, o.hora);
          let fim = quando(o.data, o.horaFim || mais(o.hora, 60));
          if (fim <= ini) fim = new Date(ini.getTime() + 3600000);
          ev = regra ? cal.createEventSeries(o.titulo, ini, fim, regra, op) : cal.createEvent(o.titulo, ini, fim, op);
        } else {
          ev = regra ? cal.createAllDayEventSeries(o.titulo, dia(o.data), regra, op) : cal.createAllDayEvent(o.titulo, dia(o.data), op);
        }
        if (o.lembrete) { try { ev.removeAllReminders(); ev.addPopupReminder(o.lembrete); } catch (x) {} }
        props.setProperty(o.id, ev.getId());
        salvos++;
      } catch (x) { erros.push({ id: o.id, erro: String(x && x.message || x) }); }
    }
    return saida({ ok: true, salvos, apagados, erros });
  }
  return saida({ erro: 'ação desconhecida' });
}
function repeticao(o) {
  let r = CalendarApp.newRecurrence();
  let regra = o.repete === 'diario' ? r.addDailyRule() : o.repete === 'semanal' ? r.addWeeklyRule() : r.addMonthlyRule();
  if (o.ate) regra = regra.until(fimDoDia(o.ate));
  return regra;
}
/* as horas são as de Copenhague (o fuso da SUA agenda), seja qual for o fuso deste projeto */
let TZ = 'Europe/Copenhagen';
function dia(s) { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d, 12, 0); }   /* meio-dia: o dia certo em qualquer fuso */
function inicioDoDia(s) { return Utilities.parseDate(s + ' 00:00', TZ, 'yyyy-MM-dd HH:mm'); }
function fimDoDia(s) { return Utilities.parseDate(s + ' 23:59', TZ, 'yyyy-MM-dd HH:mm'); }
function quando(s, h) { const [hh, mm] = h.split(':').map(Number); return Utilities.parseDate(s + ' ' + ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2), TZ, 'yyyy-MM-dd HH:mm'); }
function mais(h, min) { const [hh, mm] = h.split(':').map(Number); const t = Math.min(1439, hh * 60 + mm + min); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
function iso(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function hm(d) { return Utilities.formatDate(d, TZ, 'HH:mm'); }
function isoDia(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }   /* dia inteiro: o Google entrega no fuso do projeto */
function saida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
`;
}

/* 3) com o app aberto: o aviso na hora (e uma vez só por tarefa e dia) */
const AG_AVISADOS = IA_NS_AG + 'ag_avisados';
function agVigia() {
  const hoje = agHoje(), agora = agAgoraHM();
  let vistos = {}; try { vistos = JSON.parse(sessionStorage.getItem(AG_AVISADOS)) || {}; } catch (e) {}
  for (const o of Tarefas.doDia(hoje)) {
    if (o.feita || !o.x.hora) continue;
    const antes = agSomaHora(o.x.hora, -(+o.x.lembrar || 30));
    if (agora >= antes && agora <= o.x.hora && !vistos[o.x.id + hoje]) {
      vistos[o.x.id + hoje] = 1;
      const txt = `${o.x.hora} · ${o.x.texto}`;
      if (typeof toast === 'function') toast('⏰ ' + txt);
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Tour na Dinamarca', { body: txt, icon: 'icon-192.png' }); } catch (e) {}
    }
  }
  try { sessionStorage.setItem(AG_AVISADOS, JSON.stringify(vistos)); } catch (e) {}
}
setInterval(() => { try { if (location.hash.startsWith('#/adm')) agVigia(); } catch (e) {} }, 60000);

/* =====================================================
   AS TELAS
   ===================================================== */
function agCss() {
  if (document.getElementById('agCss')) return;
  const s = document.createElement('style'); s.id = 'agCss';
  s.textContent = `
  .tfAdd{display:grid;grid-template-columns:1fr auto;gap:8px}
  .tfAdd .linha2{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .tfAdd input[type=text],.tfAdd textarea{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit}
  .tfAdd textarea{min-height:64px;grid-column:1/-1;resize:vertical}
  .tfAdd select,.tfAdd input[type=date],.tfAdd input[type=time]{min-height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit}
  .tfGrupo{margin:14px 0 4px;font:700 11px/1 var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
  .tfGrupo.bad{color:var(--danger)}
  .tf{display:flex;gap:10px;align-items:flex-start;padding:10px 4px;border-bottom:1px solid var(--line)}
  .tf:last-child{border-bottom:0}
  .tf .ck{width:26px;height:26px;flex:none;border-radius:8px;border:2px solid var(--line-2);background:var(--surface);display:grid;place-items:center;cursor:pointer;color:transparent;font-weight:800}
  .tf .ck.on{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
  .tf.feita .tx b{text-decoration:line-through;opacity:.55}
  .tf .tx{flex:1;min-width:0}
  .tf .tx b{display:block;font-weight:600}
  .tf .tx small{display:block;color:var(--ink-3);font-size:12.5px;margin-top:2px}
  .tf .tx .nota{white-space:pre-wrap;color:var(--ink-2);font-size:13px;margin-top:4px}
  .tf .acs{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
  .tf .acs a,.tf .acs button{min-height:34px;padding:0 9px;font-size:12.5px}
  .tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:var(--surface-2);color:var(--ink-2);margin-right:4px}
  .tag.pessoal{background:var(--highlight-wash);color:var(--highlight-text)}
  .tag.alta{background:var(--danger-wash);color:var(--danger)}
  .tag.g{background:#E8F0FE;color:#1A56C4}
  .agc .agtf{position:absolute;right:5px;top:5px;width:7px;height:7px;border-radius:2px;background:var(--highlight)}
  .agc .aggo{position:absolute;left:5px;top:5px;width:7px;height:7px;border-radius:50%;background:#4285F4}
  .agc{position:relative}
  .hj-sec h3{display:flex;justify-content:space-between;align-items:center;gap:8px}
  .hj-sec h3 small{font-weight:500;color:var(--ink-3);font-size:12.5px}
  .hj-item{display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}
  .hj-item:last-child{border-bottom:0}
  .hj-item .tx{flex:1;min-width:0}.hj-item .tx b{display:block}.hj-item .tx small{color:var(--ink-3)}
  .hj-item .hr{font-family:var(--f-mono);font-weight:700;min-width:48px}
  .hj-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
  .gcCod{width:100%;min-height:160px;font:12px/1.4 var(--f-mono);padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);color:var(--ink)}
  .gcPassos{margin:8px 0 12px 18px;line-height:1.6}
  .gcPassos li{margin-bottom:4px}
  `;
  document.head.appendChild(s);
}

/* uma linha de tarefa (lista, agenda e Hoje usam a mesma) */
function agLinhaTarefa(o, opts) {
  const x = o.x, dia = o.dia;
  const quando = [dia ? (dia === agHoje() ? 'hoje' : dia === addDays(agHoje(), 1) ? 'amanhã' : agData(dia)) : '', x.hora ? x.hora + (x.horaFim ? '–' + x.horaFim : '') : '', x.repete ? AG_REP[x.repete] + (x.ate ? ' até ' + agDataCurta(x.ate) : '') : ''].filter(Boolean).join(' · ');
  const tags = `${x.area === 'pessoal' ? '<span class="tag pessoal">Pessoal</span>' : ''}${x.prioridade === 'alta' ? '<span class="tag alta">Importante</span>' : ''}${x.tipo !== 'tarefa' ? `<span class="tag">${x.tipo === 'anotacao' ? 'Anotação' : 'Compromisso'}</span>` : ''}`;
  const gl = (dia || x.data) ? agGoogleLink(Object.assign(agEventoTarefa(x, dia || x.data), {})) : '';
  return `<div class="tf ${o.feita ? 'feita' : ''}" data-tf="${esc(x.id)}" data-dia="${esc(dia || '')}">
    ${x.tipo === 'anotacao' ? '<span class="ck" style="border-style:dashed;color:var(--ink-3)">✎</span>' : `<button type="button" class="ck ${o.feita ? 'on' : ''}" data-ck aria-label="${o.feita ? 'Desmarcar' : 'Marcar como feita'}">✓</button>`}
    <div class="tx"><b>${esc(x.texto)}</b><small>${tags}${esc(quando)}</small>${x.nota && !(opts && opts.semNota) ? `<div class="nota">${esc(x.nota)}</div>` : ''}</div>
    <div class="acs">${gl && !GCal.ligada() ? `<a class="mini" target="_blank" rel="noopener" href="${esc(gl)}" title="Pôr no Google Agenda">📅 Google</a>` : ''}
      <button type="button" class="mini" data-ed>Editar</button><button type="button" class="mini ghost" data-del aria-label="Apagar">×</button></div>
  </div>`;
}
function agLigaLinhas(root, redesenha) {
  root.querySelectorAll('.tf[data-tf]').forEach(el => {
    const id = el.dataset.tf, dia = el.dataset.dia;
    const ck = el.querySelector('[data-ck]');
    if (ck) ck.onclick = () => { const x = Tarefas.get(id); if (!x) return; Tarefas.concluir(id, !Tarefas.feitaEm(x, dia || x.data), dia || x.data); redesenha(); };
    el.querySelector('[data-del]').onclick = () => { const x = Tarefas.get(id); if (x && confirm(`Apagar "${x.texto}"?`)) { Tarefas.remove(id); toast('Apagada'); redesenha(); } };
    el.querySelector('[data-ed]').onclick = () => agEditar(id, redesenha);
  });
}

/* o formulário de anotar (o mesmo para novo e editar) */
function agFormHtml(x, diaPadrao) {
  x = x || { tipo: 'tarefa', texto: '', nota: '', data: diaPadrao || '', hora: '', horaFim: '', area: 'pro', prioridade: 'media', repete: '', ate: '', lembrar: 30 };
  const op = (obj, v) => Object.entries(obj).map(([k, n]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${n}</option>`).join('');
  return `<div class="tfAdd">
    <input type="text" id="tfTexto" maxlength="200" placeholder="O que é? (ex.: ligar pro hotel, dentista, ideia de passeio…)" value="${esc(x.texto)}">
    <button type="button" class="cta sm" id="tfOk">${x.id ? 'Salvar' : 'Anotar'}</button>
    <div class="linha2">
      <select id="tfTipo" aria-label="Tipo">${op({ tarefa: 'Tarefa', compromisso: 'Compromisso', anotacao: 'Anotação' }, x.tipo)}</select>
      <select id="tfArea" aria-label="Área">${op(AG_AREAS, x.area)}</select>
      <input type="date" id="tfData" value="${esc(x.data)}" aria-label="Dia">
      <input type="time" id="tfHora" value="${esc(x.hora)}" aria-label="Hora">
      <input type="time" id="tfFim" value="${esc(x.horaFim || '')}" aria-label="Até que horas" title="Até que horas (opcional)">
      <select id="tfRep" aria-label="Repetir">${op(AG_REP, x.repete || '')}</select>
      <input type="date" id="tfAte" value="${esc(x.ate || '')}" aria-label="Repetir até" title="Repetir até (opcional)" ${x.repete ? '' : 'hidden'}>
      <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="tfAlta" ${x.prioridade === 'alta' ? 'checked' : ''}> importante</label>
    </div>
    <textarea id="tfNota" placeholder="Detalhes (opcional): a ideia inteira, o endereço, o que levar…">${esc(x.nota || '')}</textarea>
  </div>`;
}
function agLeForm(root) {
  const q = (s) => root.querySelector(s);
  const texto = q('#tfTexto').value.trim();
  if (!texto) { toast('Escreva o que é'); q('#tfTexto').focus(); return null; }
  const data = q('#tfData').value, hora = data ? q('#tfHora').value : '';
  let tipo = q('#tfTipo').value; if (tipo === 'compromisso' && !hora) tipo = 'tarefa';
  let horaFim = hora ? q('#tfFim').value : '';
  if (horaFim && horaFim <= hora) { toast('O "até" é antes do começo — deixei sem hora de fim'); horaFim = ''; }
  return { texto, nota: q('#tfNota').value.trim(), tipo, area: q('#tfArea').value, data, hora, horaFim,
    repete: data ? q('#tfRep').value : '', ate: data && q('#tfRep').value ? q('#tfAte').value : '', prioridade: q('#tfAlta').checked ? 'alta' : 'media' };
}
function agLigaForm(root, aoSalvar, id) {
  const rep = root.querySelector('#tfRep'), ate = root.querySelector('#tfAte');
  rep.onchange = () => { ate.hidden = !rep.value; };
  const vai = () => { const c = agLeForm(root); if (!c) return; if (id) Tarefas.update(id, c); else Tarefas.add(c); toast(id ? 'Salvo' : (c.tipo === 'anotacao' ? 'Anotado' : 'Anotado na agenda')); aoSalvar(); };
  root.querySelector('#tfOk').onclick = vai;
  root.querySelector('#tfTexto').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); vai(); } };
}
function agEditar(id, redesenha) {
  const x = Tarefas.get(id); if (!x) return;
  const fundo = document.createElement('div'); fundo.className = 'modalbg';
  fundo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:900;display:grid;place-items:center;padding:16px';
  fundo.innerHTML = `<div class="card" style="max-width:640px;width:100%;max-height:90vh;overflow:auto"><h3>Editar</h3>${agFormHtml(x)}
    <div style="display:flex;justify-content:flex-end;margin-top:10px"><button type="button" class="mini" id="tfFecha">Fechar</button></div></div>`;
  document.body.appendChild(fundo);
  const fecha = () => fundo.remove();
  fundo.onclick = (e) => { if (e.target === fundo) fecha(); };
  fundo.querySelector('#tfFecha').onclick = fecha;
  agLigaForm(fundo, () => { fecha(); redesenha(); }, id);
  fundo.querySelector('#tfTexto').focus();
}

/* =====================================================
   ABA TAREFAS
   ===================================================== */
function admTarefas() {
  agCss();
  const filtro = admTarefas._f || 'tudo';
  const G = Tarefas.grupos();
  const passa = (o) => filtro === 'tudo' || (filtro === 'pessoal' ? o.x.area === 'pessoal' : o.x.area !== 'pessoal');
  const bloco = (tit, lista, cls) => { const l = lista.filter(passa); return l.length ? `<p class="tfGrupo ${cls || ''}">${tit} · ${l.length}</p>${l.map(o => agLinhaTarefa(o)).join('')}` : ''; };
  const corpo = [bloco('Atrasadas', G.atrasadas, 'bad'), bloco('Hoje', G.hoje), bloco('Amanhã', G.amanha), bloco('Próximos 7 dias', G.proximas), bloco('Mais pra frente', G.depois), bloco('Sem dia', G.semDia), bloco('Anotações', G.anotacoes), bloco('Feitas (últimas)', G.feitas)].join('');
  admShell('tarefas', `
    <div class="pagehead"><h1 class="pageh">Tarefas e anotações</h1>
      <div class="chips">${[['tudo', 'Tudo'], ['pro', 'Trabalho'], ['pessoal', 'Pessoal']].map(([k, n]) => `<button class="chip ${filtro === k ? 'on' : ''}" data-f="${k}">${n}</button>`).join('')}</div></div>
    <section class="card"><h3>Anotar</h3>${agFormHtml(null, agHoje())}
      <p class="why">Com dia, entra na Agenda${GCal.ligada() ? ' e no seu Google Agenda, com lembrete no celular' : ''}. Sem dia, fica na lista. Ou é só pedir ao assistente: "anota: ligar pro hotel sexta às 10h".</p></section>
    <section class="card" id="tfLista">${corpo || '<p class="empty">Nada anotado ainda.</p>'}</section>
    ${GCal.ligada() ? '' : `<p class="why">📅 Quer que tudo isso apareça sozinho no seu Google Agenda, com lembrete no celular? <a href="#/adm/settings" class="mini">Ligar em Ajustes → Google Agenda</a></p>`}`);
  $$('[data-f]').forEach(b => b.onclick = () => { admTarefas._f = b.dataset.f; admTarefas(); });
  const st = document.getElementById('stage') || document;
  agLigaForm(st.querySelector('.tfAdd').parentNode, admTarefas);
  agLigaLinhas(document.getElementById('tfLista'), admTarefas);
}

/* =====================================================
   AGENDA DO MÊS — passeios + tarefas + Google
   ===================================================== */
function admAgendaMari() {
  agCss();
  const cur = admAgendaMari._m || agHoje().slice(0, 7);
  const [Y, M] = cur.split('-').map(Number);
  const first = `${cur}-01`, daysIn = new Date(Y, M, 0).getDate(), last = `${cur}-${AG_PAD(daysIn)}`;
  const startWd = (new Date(first + 'T12:00:00').getDay() + 6) % 7;
  const deps = [];
  for (const x of Tours.all()) for (const d of Cal.departures(x.id, first, last)) {
    const left = Cal.seatsLeft(x.id, d.date, d.time, d.capacity); deps.push({ ...d, tour: x, left, booked: d.capacity - left });
  }
  const byDay = {};
  deps.forEach(d => (byDay[d.date] = byDay[d.date] || []).push(d));
  Bookings.all().filter(b => b.status !== 'cancelled' && b.date >= first && b.date <= last).forEach(b => {
    const lista = byDay[b.date] = byDay[b.date] || [];
    if (lista.some(d => d.time === b.time && d.tour && d.tour.id === b.tourId)) return;
    const x = Tours.get(b.tourId); if (!x) return;
    const cap = x.max || 0, left = Cal.seatsLeft(x.id, b.date, b.time, cap);
    lista.push({ date: b.date, time: b.time, capacity: cap, tour: x, left, booked: cap - left, pastOnly: true });
  });
  /* só as saídas com gente marcam o dia (o catálogo dela tem horário em quase todo dia) */
  const comGente = (d) => d.booked > 0;
  const tfDia = {};
  for (const x of Tarefas.all()) for (const d of Tarefas.dias(x, first, last)) (tfDia[d] = tfDia[d] || []).push(x);
  const sel = admAgendaMari._d && admAgendaMari._d.slice(0, 7) === cur ? admAgendaMari._d : (cur === agHoje().slice(0, 7) ? agHoje() : first);
  const WD = [5, 6, 7, 8, 9, 10, 11].map(d => new Date(2026, 0, d).toLocaleDateString(locale(), { weekday: 'short' }).replace('.', ''));
  const MN = [...Array(12)].map((_, m) => new Date(2026, m, 1).toLocaleDateString(locale(), { month: 'long' }));
  let cells = '';
  for (let i = 0; i < startWd; i++) cells += '<span class="agc empty"></span>';
  for (let d = 1; d <= daysIn; d++) {
    const iso = `${cur}-${AG_PAD(d)}`;
    const list = (byDay[iso] || []).filter(comGente);
    const dots = list.slice(0, 4).map(x => `<i class="${x.left === 0 ? 'full' : x.left <= 2 ? 'low' : ''}"></i>`).join('');
    cells += `<button class="agc ${list.length ? 'has' : ''} ${iso === sel ? 'on' : ''} ${iso === agHoje() ? 'today' : ''}" data-d="${iso}">
      ${(tfDia[iso] || []).length ? '<span class="agtf" aria-hidden="true"></span>' : ''}${GCal.eventosDoDia(iso).length ? '<span class="aggo" aria-hidden="true"></span>' : ''}
      <b>${d}</b>${list.length ? `<span class="agdots">${dots}</span>` : ''}</button>`;
  }
  const selDeps = (byDay[sel] || []).sort((a, b) => a.time.localeCompare(b.time));
  const comReserva = selDeps.filter(comGente), vazias = selDeps.filter(d => !comGente(d));
  const tfs = Tarefas.doDia(sel), gEv = GCal.eventosDoDia(sel);
  admShell('agenda', `
    <div class="pagehead"><h1 class="pageh">${t('agTitle')}</h1>
      <div class="chips">
        <button class="mini" id="agPrev" aria-label="${t('agPrev')}">←</button>
        <button class="chip on">${MN[M - 1]} ${Y}</button>
        <button class="mini" id="agNext" aria-label="${t('agNext')}">→</button>
        <button class="mini" id="agNow">${t('agToday')}</button>
      </div></div>
    <div class="two-col">
      <section class="card">
        <div class="agrid head">${WD.map(w => `<span class="agwd">${w}</span>`).join('')}</div>
        <div class="agrid" id="agGrid">${cells}</div>
        <p class="why">Bolinhas: passeios com reserva. <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--highlight)"></span> tarefa ou anotação${GCal.ligada() ? ' · <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#4285F4"></span> compromisso do seu Google Agenda' : ''}.</p>
      </section>
      <section class="card">
        <h3>${t('agDayOf', { d: fmtDate(sel) })}</h3>
        ${comReserva.length ? comReserva.map(d => {
          const bs = DB.bookings.filter(b => b.tourId === d.tour.id && b.date === d.date && b.time === d.time && b.status !== 'cancelled');
          const gl = agGoogleLink(agEventoSaida(d.tour, d.date, d.time, bs));
          return `<div class="deprow"><div class="tinfo"><b>${esc(d.time)} · ${esc(tl(d.tour.name))}</b>
              <small>${t('agBooked', { n: d.booked })} · ${t('agFree', { n: d.left })}</small></div>
            <div class="paxlist">${bs.map(b => `<span class="pill ${Bookings.due(b) > 0 ? 'warn' : 'ok'}">${esc(String(b.name || '').split(' ')[0])} ×${esc(b.pax)}${Bookings.due(b) > 0 ? ' · no dia ' + eur(Bookings.due(b)) : ''}</span>`).join('')}
            ${GCal.ligada() ? '' : `<a class="mini" target="_blank" rel="noopener" href="${esc(gl)}">📅 Google</a>`}</div></div>`;
        }).join('') : `<p class="empty">Nenhum passeio reservado neste dia.</p>`}
        ${vazias.length ? `<p class="why">Horários abertos sem reserva: ${vazias.map(d => `${esc(d.time)} ${esc(tl(d.tour.name))}`).slice(0, 6).join(' · ')}${vazias.length > 6 ? '…' : ''}</p>` : ''}
        ${gEv.length ? `<p class="tfGrupo">Seu Google Agenda</p>${gEv.map(e => `<div class="tf"><span class="ck" style="border-color:#4285F4;color:#4285F4">G</span><div class="tx"><b>${esc(e.titulo)}</b><small>${e.hora ? esc(e.hora + (e.horaFim ? '–' + e.horaFim : '')) : 'dia inteiro'}${e.local ? ' · ' + esc(e.local) : ''}</small></div></div>`).join('')}` : ''}
        <p class="tfGrupo">Tarefas e anotações</p>
        <div id="agTfs">${tfs.length ? tfs.map(o => agLinhaTarefa(o)).join('') : '<p class="empty" style="margin:4px 0">Nada anotado para este dia.</p>'}</div>
        <details style="margin-top:10px" ${tfs.length ? '' : 'open'}><summary class="mini" style="display:inline-flex;cursor:pointer">+ Anotar neste dia</summary><div id="agForm" style="margin-top:8px">${agFormHtml(null, sel)}</div></details>
      </section>
    </div>`);
  const shift = (n) => { const d = new Date(Y, M - 1 + n, 1); admAgendaMari._m = d.getFullYear() + '-' + AG_PAD(d.getMonth() + 1); admAgendaMari._d = null; admAgendaMari(); };
  $('#agPrev').onclick = () => shift(-1);
  $('#agNext').onclick = () => shift(1);
  $('#agNow').onclick = () => { admAgendaMari._m = agHoje().slice(0, 7); admAgendaMari._d = agHoje(); admAgendaMari(); };
  $$('#agGrid .agc[data-d]').forEach(c => c.onclick = () => { admAgendaMari._d = c.dataset.d; admAgendaMari(); });
  agLigaLinhas(document.getElementById('agTfs'), admAgendaMari);
  agLigaForm(document.getElementById('agForm'), admAgendaMari);
  /* os compromissos do Google do mês (uma vez a cada 10 min) */
  const c = GCal.eventosDoCache()[cur];
  if (GCal.ligada() && GCal.cfg().lerEventos !== false && (!c || Date.now() - c.em > 600000) && !admAgendaMari._lendo) {
    admAgendaMari._lendo = true;
    GCal.lerMes(cur).then(() => { admAgendaMari._lendo = false; if (location.hash.startsWith('#/adm/agenda') && !isBusyEditing()) admAgendaMari(); })
      .catch((e) => { admAgendaMari._lendo = false; toast('Google Agenda: ' + e.message); });
  }
}

/* =====================================================
   HOJE — proativo
   ===================================================== */
function agAniversarios(hoje, dias) {
  const out = [], F = DB.fichas || {};
  for (const [k, f] of Object.entries(F)) {
    const n = f && f.cadastro && f.cadastro.nascimento; if (!/^\d{4}-\d{2}-\d{2}$/.test(n || '')) continue;
    for (let i = 0; i <= dias; i++) { const d = addDays(hoje, i); if (d.slice(5) === n.slice(5)) { out.push({ chave: k, nome: f.cadastro.nomeCompleto || f.nome || k, dia: d }); break; } }
  }
  return out;
}
function admTodayMari() {
  agCss();
  if (temNuvem() && !(typeof painelTrancado === 'function' ? painelTrancado() : DB.settings.authRequired) && !isLoggedIn() && !admTodayMari._asked) {
    admTodayMari._asked = true;
    setTimeout(() => { if (confirm(t('protectWhy') + '\n\n' + t('protectNow') + '?')) go('/login'); }, 900);
  }
  const hoje = agHoje(), amanha = addDays(hoje, 1);
  const vivas = Bookings.all().filter(b => b.status === 'confirmed');
  const doDia = (d) => vivas.filter(b => b.date === d).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const hj = doDia(hoje), am = doDia(amanha);
  const late = vivas.filter(b => Bookings.due(b) > 0 && Bookings.dueDate(b) < hoje);
  /* sinal ainda não pago, de passeio que ainda vai acontecer (reserva com mais de 1 dia) */
  const semSinal = vivas.filter(b => b.date >= hoje && +b.total > 0 && typeof mariSinalFalta === 'function' && mariEhSinal(b) && mariSinalFalta(b) > 0 && String(b.createdAt || '').slice(0, 10) < hoje);
  const receberHoje = hj.filter(b => Bookings.due(b) > 0);
  const G = Tarefas.grupos(hoje);
  const pedidos = (DB.pedidos || []).filter(p => !p.respondido);
  const aniv = agAniversarios(hoje, 7);
  const semBrinde = typeof brindesPendentes === 'function' ? brindesPendentes() : [];
  const h = new Date().getHours();
  const ola = (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + ', ' + esc((typeof guiaNome === 'function' && guiaNome()) || 'Mari') + '.';
  const linhaRes = (b) => { const x = Tours.get(b.tourId); return `<div class="hj-item"><span class="hr">${esc(b.time || '')}</span>
    <div class="tx"><b>${esc(b.name)} · ${esc(b.pax)} pessoa${+b.pax > 1 ? 's' : ''}</b><small>${esc(x ? tl(x.name) : '')}${x && noIdioma(x.meeting) ? ' · ' + esc(noIdioma(x.meeting)) : ''}${Bookings.due(b) > 0 ? ` · <b style="color:var(--warn)">recebe no dia ${eur(Bookings.due(b))}</b>` : ' · pago'}</small></div>
    ${b.whats ? `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink('Oi ' + b.name.split(' ')[0] + '! Tudo certo para ' + (b.date === hoje ? 'hoje' : 'amanhã') + ' às ' + b.time + '?', b.whats.replace(/\D/g, '')))}">WhatsApp</a>` : ''}</div>`; };
  const resumo = [hj.length ? `${hj.length} passeio${hj.length > 1 ? 's' : ''} hoje` : 'nenhum passeio hoje',
    receberHoje.length ? `receber ${eur(receberHoje.reduce((s, b) => s + Bookings.due(b), 0))} no dia` : '',
    (G.hoje.filter(o => !o.feita).length + G.atrasadas.length) ? `${G.hoje.filter(o => !o.feita).length + G.atrasadas.length} tarefa(s)` : '',
    pedidos.length ? `${pedidos.length} pedido(s) do site` : ''].filter(Boolean).join(' · ');
  admShell('today', `
    <h1 class="pageh">${ola}</h1>
    <p class="desc lead" style="margin-top:-6px">${esc(fmtDate(hoje))} · ${esc(resumo)}</p>
    ${late.length ? `<div class="alert bad">⚠ ${late.length} ${t('xAtrasados')} · ${eur(late.reduce((s, b) => s + Bookings.due(b), 0))} <button class="mini" id="goLate">${t('admBookings')} →</button></div>` : ''}
    ${semSinal.length ? `<div class="alert warn">Sinal ainda não pago: ${semSinal.slice(0, 4).map(b => `<a href="#/adm/clients/${encodeURIComponent(String(b.email || b.whats || b.name).toLowerCase())}">${esc(String(b.name || '').split(' ')[0])}</a> (${eur(mariSinalFalta(b))}, passeio ${esc(agDataCurta(b.date))})`).join(' · ')}${semSinal.length > 4 ? ' …' : ''}</div>` : ''}
    <div class="hj-grade">
      <section class="card hj-sec"><h3>Hoje <small>${esc(agDataCurta(hoje))}</small></h3>
        ${hj.length ? hj.map(linhaRes).join('') : '<p class="empty">Nenhum passeio reservado hoje.</p>'}
        ${receberHoje.length ? `<p class="why">💶 Receber no dia, em euro: ${receberHoje.map(b => `${esc(b.name.split(' ')[0])} ${eur(Bookings.due(b))}`).join(' · ')}</p>` : ''}</section>
      <section class="card hj-sec"><h3>Tarefas <small><a href="#/adm/tarefas">ver todas →</a></small></h3>
        <div id="hjTfs">${[...G.atrasadas, ...G.hoje].length ? [...G.atrasadas, ...G.hoje].map(o => agLinhaTarefa(o, { semNota: true })).join('') : '<p class="empty">Nada para hoje. 🎉</p>'}</div>
        <details style="margin-top:8px"><summary class="mini" style="display:inline-flex;cursor:pointer">+ Anotar</summary><div id="hjForm" style="margin-top:8px">${agFormHtml(null, hoje)}</div></details></section>
      <section class="card hj-sec"><h3>Amanhã <small>${esc(agDataCurta(amanha))}</small></h3>
        ${am.length ? am.map(linhaRes).join('') : '<p class="empty">Nenhum passeio amanhã.</p>'}
        ${G.amanha.length ? `<p class="tfGrupo">Tarefas</p>${G.amanha.map(o => `<div class="hj-item"><span class="hr">${esc(o.x.hora || '—')}</span><div class="tx"><b>${esc(o.x.texto)}</b></div></div>`).join('')}` : ''}</section>
      ${pedidos.length ? `<section class="card hj-sec"><h3>Pedidos do site <small>${pedidos.length} sem resposta</small></h3>
        ${pedidos.slice(0, 6).map(p => `<div class="hj-item"><div class="tx"><b>${esc(p.nome || 'Cliente')} <span class="tag">${p.tipo === 'mudanca' ? 'Mudança' : 'Personalize'}</span></b><small>${esc([p.quando, p.pessoas ? p.pessoas + ' pessoa(s)' : '', (p.gostos || []).slice(0, 3).join(', ')].filter(Boolean).join(' · '))}</small></div>
          ${p.whats ? `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink('Oi ' + String(p.nome || '').split(' ')[0] + '! Recebi o seu pedido do passeio personalizado. ', String(p.whats).replace(/\D/g, '')))}">Responder</a>` : ''}
          ${typeof Orc !== 'undefined' && p.tipo !== 'mudanca' ? `<button type="button" class="mini" data-porc="${esc(p.id)}">Orçamento</button>` : ''}
          <button type="button" class="mini ghost" data-resp="${esc(p.id)}">✓ respondido</button></div>`).join('')}</section>` : ''}
      ${aniv.length ? `<section class="card hj-sec"><h3>Aniversários <small>próximos 7 dias</small></h3>
        ${aniv.map(a => `<div class="hj-item"><span class="hr">🎂</span><div class="tx"><b>${esc(a.nome)}</b><small>${a.dia === hoje ? 'hoje' : esc(agData(a.dia))}</small></div><a class="mini" href="#/adm/clients/${encodeURIComponent(a.chave)}">Ficha</a></div>`).join('')}</section>` : ''}
      ${semBrinde.length ? `<section class="card hj-sec"><h3>Brindes para mandar <small>${semBrinde.length}</small></h3>
        ${semBrinde.slice(0, 5).map(c => `<div class="hj-item"><span class="hr">🎁</span><div class="tx"><b>${esc(c.nome)}</b><small>${esc(c.motivo)}</small></div><a class="mini" href="#/adm/coupons">Mandar</a></div>`).join('')}</section>` : ''}
    </div>`);
  $('#goLate')?.addEventListener('click', () => go('/adm/bookings'));
  agLigaLinhas(document.getElementById('hjTfs'), admTodayMari);
  agLigaForm(document.getElementById('hjForm'), admTodayMari);
  $$('[data-porc]').forEach(b => b.onclick = () => {
    const p = (DB.pedidos || []).find(z => z.id === b.dataset.porc); if (!p) return;
    const chave = typeof fichaChavePara === 'function' ? fichaChavePara({ nome: p.nome, whats: p.whats }) : '';
    const o = Orc.novo({ cliente: { nome: p.nome || 'Cliente', chave }, titulo: p.nome || '', ini: p.ini || '', fim: p.fim || '',
      pessoas: [p.adultos ? p.adultos + ' adulto(s)' : '', p.criancas ? p.criancas + ' criança(s)' + (p.idades ? ' (' + p.idades + ')' : '') : ''].filter(Boolean).join(' + '),
      resumo: [...(p.precisaTxt || []), ...(p.kidsTxt || [])].slice(0, 4).join(' · ') });
    go('/adm/orcamentos/' + o.id);
  });
  $$('[data-resp]').forEach(b => b.onclick = () => { const p = (DB.pedidos || []).find(z => z.id === b.dataset.resp); if (p) { p.respondido = new Date().toISOString(); save(); admTodayMari(); } });
  if (typeof Coach !== 'undefined') Coach.start([
    { sel: '#nb-tarefas', txt: { pt: 'Tarefas e anotações, de trabalho e pessoais. Com dia, entram na Agenda e no seu Google Agenda.', en: 'Work and personal tasks and notes. With a date, they go to your Agenda and Google Calendar.' } },
    { sel: '#nb-bookings', txt: { pt: 'Cada reserva aparece aqui: quem pagou tudo, quem pagou o sinal, quem paga no dia.', en: 'Every booking lands here: paid in full, deposit only, or paying on the day.' } },
    { sel: '#viewSite', txt: { pt: 'A qualquer momento, veja o site exatamente como o cliente vê.', en: 'At any time, see the site exactly as your guest does.' } },
  ], 'tutorialAdm');
}

/* =====================================================
   AJUSTES → GOOGLE AGENDA (a ponte)
   ===================================================== */
function agCartaoGoogle() {
  const c = GCal.cfg();
  return `<section class="card" id="gcCard"><h3>📅 Google Agenda</h3>
    ${GCal.ligada() ? `<p><span class="pill ok">✓ ligado</span> ${c.calendario ? 'Agenda: <b>' + esc(c.calendario) + '</b>' : ''} ${c.ultimo ? '· última sincronia ' + esc(new Date(c.ultimo).toLocaleString('pt-BR')) : ''}</p>
      <label class="optin"><input type="checkbox" id="gcTf" ${c.enviarTarefas !== false ? 'checked' : ''}><span><b>Mandar as tarefas e anotações com dia</b><small>Com lembrete no celular, na hora que você marcou.</small></span></label>
      <label class="optin"><input type="checkbox" id="gcPs" ${c.enviarPasseios !== false ? 'checked' : ''}><span><b>Mandar os passeios reservados</b><small>Com o nome de cada cliente, o WhatsApp e quanto ele paga no dia.</small></span></label>
      <label class="optin"><input type="checkbox" id="gcLe" ${c.lerEventos !== false ? 'checked' : ''}><span><b>Mostrar meus compromissos do Google na agenda do app</b><small>Só para você ver: o app não muda nada que você criou no Google.</small></span></label>
      <div class="fc-acoes" style="display:flex;gap:8px;flex-wrap:wrap"><button class="cta sm" id="gcSync">Sincronizar agora</button><button class="mini" id="gcTeste">Testar</button><button class="mini" id="gcVer">Ver o script de novo</button><button class="mini ghost" id="gcDesliga">Desligar</button></div>`
    : `<p class="why">Ligue uma vez e o app passa a mandar sozinho, para o seu Google Agenda, as tarefas e os passeios reservados, com lembrete no celular. Seus compromissos pessoais do Google aparecem na agenda do app. Leva uns 5 minutos.</p>
      <button class="cta sm" id="gcComecar">Ligar o Google Agenda</button>`}
    <div id="gcPassos"></div></section>`;
}
function agPassosGoogle(cont) {
  const c = GCal.cfg();
  const token = c.token || (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36));
  if (!c.token) GCal.grava({ token, ligado: false });
  cont.innerHTML = `<ol class="gcPassos">
      <li>No computador, abra <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener"><b>script.google.com</b></a> com a sua conta Google (a mesma do seu Google Agenda) → <b>Novo projeto</b>.</li>
      <li>Apague o que estiver lá, cole o código abaixo e clique em <b>Salvar</b> (💾). Dê o nome "Ponte Tour na Dinamarca".</li>
      <li>Clique em <b>Implantar → Nova implantação</b> → engrenagem → <b>App da Web</b>. Em "Executar como": <b>Eu</b>. Em "Quem pode acessar": <b>Qualquer pessoa</b>. Clique em <b>Implantar</b>.</li>
      <li>O Google pede autorização: <b>Autorizar acesso</b> → escolha a sua conta → se aparecer "o Google não verificou este app", clique em <b>Avançado → Acessar Ponte (não seguro)</b>. É o seu próprio script, só você usa.</li>
      <li>Copie o <b>URL do app da Web</b> (termina em <code>/exec</code>) e cole aqui embaixo.</li></ol>
    <textarea class="gcCod" id="gcCod" readonly>${esc(agScriptPonte(token))}</textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px"><button class="mini" id="gcCopia">Copiar o código</button></div>
    <label class="fld">URL do app da Web<input id="gcUrl" type="url" inputmode="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.url || '')}"></label>
    <button class="cta sm" id="gcSalva">Ligar e testar</button>`;
  cont.querySelector('#gcCopia').onclick = async () => { try { await navigator.clipboard.writeText(agScriptPonte(token)); toast('Código copiado'); } catch (e) { const ta = cont.querySelector('#gcCod'); ta.select(); document.execCommand('copy'); toast('Código copiado'); } };
  cont.querySelector('#gcSalva').onclick = async () => {
    const url = cont.querySelector('#gcUrl').value.trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) { toast('Cole o URL que termina em /exec'); return; }
    const b = cont.querySelector('#gcSalva'); b.disabled = true; b.textContent = 'Testando…';
    GCal.grava({ url, token, ligado: true });
    try {
      const r = await GCal.chama({ acao: 'teste' });
      GCal.grava({ calendario: r.calendario || '', fuso: r.fuso || '' });
      toast('Ligado! Agenda: ' + (r.calendario || 'principal'));
      const s = await GCal.sincronizar(true).catch(e => ({ erro: e.message }));
      if (s && s.erro) toast('Ligado, mas a primeira sincronia falhou: ' + s.erro);
      admSettings();
    } catch (e) { GCal.grava({ ligado: false }); toast('Não funcionou: ' + e.message); b.disabled = false; b.textContent = 'Ligar e testar'; }
  };
}
function agLigaCartaoGoogle() {
  const card = document.getElementById('gcCard'); if (!card) return;
  const q = (s) => card.querySelector(s);
  if (q('#gcComecar')) q('#gcComecar').onclick = () => agPassosGoogle(q('#gcPassos'));
  if (q('#gcVer')) q('#gcVer').onclick = () => agPassosGoogle(q('#gcPassos'));
  for (const [id, k] of [['#gcTf', 'enviarTarefas'], ['#gcPs', 'enviarPasseios'], ['#gcLe', 'lerEventos']]) if (q(id)) q(id).onchange = (e) => { GCal.grava({ [k]: e.target.checked }); GCal.agendarEnvio(); };
  if (q('#gcSync')) q('#gcSync').onclick = async (e) => { const b = e.target; b.disabled = true; b.textContent = 'Sincronizando…';
    try { const r = await GCal.sincronizar(true); toast(`Google Agenda em dia (${r.salvos || 0} enviado(s), ${r.apagados || 0} tirado(s))`); } catch (x) { toast('Google Agenda: ' + x.message); }
    admSettings(); };
  if (q('#gcTeste')) q('#gcTeste').onclick = async () => { try { const r = await GCal.chama({ acao: 'teste' }); toast('Funcionando · agenda ' + (r.calendario || '')); } catch (x) { toast('Não respondeu: ' + x.message); } };
  if (q('#gcDesliga')) q('#gcDesliga').onclick = () => { if (!confirm('Desligar a ponte com o Google Agenda? O que já está lá continua lá.')) return; GCal.grava({ ligado: false }); admSettings(); };
}

/* =====================================================
   LIGAR NO APP: aba nova, rotas e Ajustes
   ===================================================== */
STR.admTarefas = { pt: 'Tarefas', en: 'Tasks' };
if (!ADM_TABS.some(([id]) => id === 'tarefas')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'agenda');
  ADM_TABS.splice(i < 0 ? 1 : i + 1, 0, ['tarefas', 'admTarefas']);
}
admToday = admTodayMari;
admAgenda = admAgendaMari;
const _viewAdmAgenda = viewAdm;
viewAdm = function (tab, arg) { if (tab === 'tarefas') return admTarefas(arg); return _viewAdmAgenda(tab, arg); };
const _admSettingsAgenda = admSettings;
admSettings = function () {
  _admSettingsAgenda();
  const stage = document.getElementById('stage'); if (!stage || document.getElementById('gcCard')) return;
  const ref = stage.querySelector('section.card'); if (!ref) return;
  ref.insertAdjacentHTML('beforebegin', agCartaoGoogle());
  agLigaCartaoGoogle();
};
/* uma reserva nova/mudada também vai para o Google (quando a ponte está ligada) */
if (typeof Bookings !== 'undefined') for (const k of ['create', 'criarManual', 'cancel', 'update', 'addPayment', 'payBalance']) {
  if (typeof Bookings[k] !== 'function') continue;
  const orig = Bookings[k];
  Bookings[k] = function () { const r = orig.apply(this, arguments); try { GCal.agendarEnvio(); } catch (e) {} return r; };
}
