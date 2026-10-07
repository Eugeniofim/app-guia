/* =====================================================
   PAINEL DA CAROL — o que a reunião de 28/09/2026 pediu para o ADM

   - HOJE: lembretes de véspera (1 toque, mensagem pronta), e-mails de agência
     que chegaram, invoices para mandar/cobrar, roteiros para validar,
     transfer esperando motorista, avaliações novas, tarefas.
   - AGÊNCIAS (ela chamou de B2C: empresas que a contratam por e-mail):
     trabalhos, INVOICE com prazo de corte, vencimento e pagamento. "Eu nunca
     vou dar mancada com a agência" → conflito avisa que agência tem prioridade.
   - E-MAILS: a varredura (hello@lovelylondon.uk + formulário do Guide London).
   - ROTEIROS: "Monte seu roteiro" pagos → rascunho automático → ela valida →
     publica o link privado (os "passeios ocultos").
   - TRANSFER: pedidos + motoristas parceiros + cotação + proposta ao cliente.
   - FINANCEIRO: recebido, a receber, prazos críticos, por canal.
   - PONTOS: o banco de pontos turísticos (texto, foto, áudio), importa KML.
   - AVALIAÇÕES: o QR do fim do tour + aprovar o que vai para o app.
   - TAREFAS e RECADOS: a parte de "gestão pessoal" que ela pediu.
   ===================================================== */
'use strict';

/* ---------- abas ---------- */
Object.assign(STR, {
  admTarefas: { pt: 'Tarefas', en: 'Tasks' }, admRoteiros: { pt: 'Roteiros', en: 'Itineraries' },
  admAgencias: { pt: 'Agências', en: 'Agencies' }, admEmails: { pt: 'E-mails', en: 'E-mails' },
  admTransfer: { pt: 'Transfer', en: 'Transfers' }, admFinanceiro: { pt: 'Financeiro', en: 'Finance' },
  admPontos: { pt: 'Pontos turísticos', en: 'Places' }, admAvaliacoes: { pt: 'Avaliações', en: 'Reviews' },
});
(function abas() {
  const poe = (id, k, depoisDe) => {
    if (ADM_TABS.some(([x]) => x === id)) return;
    const i = ADM_TABS.findIndex(([x]) => x === depoisDe);
    ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, [id, k]);
  };
  poe('tarefas', 'admTarefas', 'today');
  poe('roteiros', 'admRoteiros', 'bookings');
  poe('agencias', 'admAgencias', 'roteiros');
  poe('emails', 'admEmails', 'agencias');
  poe('transfer', 'admTransfer', 'emails');
  poe('financeiro', 'admFinanceiro', 'transfer');
  poe('pontos', 'admPontos', 'tours');
  poe('avaliacoes', 'admAvaliacoes', 'clients');
})();
const _viewAdmCarol = viewAdm;
viewAdm = function (tab, arg) {
  const m = { tarefas: admTarefas, roteiros: admRoteiros, agencias: admAgencias, emails: admEmails, transfer: admTransfer,
    financeiro: admFinanceiro, pontos: admPontos, avaliacoes: admAvaliacoes };
  if (m[tab]) return m[tab](arg);
  return _viewAdmCarol(tab, arg);
};
/* páginas avulsas do painel: invoice e QR em tela cheia */
const _rotaExtraCarol = rotaExtra;
rotaExtra = function (p) {
  if (p[0] === 'invoice') { viewInvoice(decodeURIComponent(p[1] || '')); return true; }
  if (p[0] === 'qr-avaliacao') { viewQrAvaliacao(); return true; }
  return _rotaExtraCarol(p);
};

const dtBR = (iso) => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '';
const grava = () => { localStorage.setItem(DB_KEY, JSON.stringify(DB)); };
const agenciaDe = (id) => (DB.agencias || []).find(a => a.id === id) || { nome: '?' };
const primeiroNome = (n) => String(n || '').trim().split(' ')[0];
const linkApp = (h) => location.origin + location.pathname + '#/' + h;

/* =====================================================
   INVOICES — prazos de cada agência
   ===================================================== */
function mesQueVem(iso) { const d = new Date(iso + 'T12:00:00'); d.setMonth(d.getMonth() + 1); return _isoLocal(d); }
function prazoInvoice(j) {
  const ag = agenciaDe(j.agencia);
  const hoje = isoToday();
  const inv = j.invoice || {};
  if (inv.paga) return { st: 'paga', txt: 'Paga em ' + dtBR(inv.paga), cls: 'ok' };
  if (inv.enviada) {
    const vence = inv.vence || hoje;
    return vence < hoje ? { st: 'vencida', txt: 'Venceu em ' + dtBR(vence) + ' — cobrar', cls: 'bad' } : { st: 'enviada', txt: 'Enviada · vence ' + dtBR(vence), cls: 'n' };
  }
  if (j.status !== 'feito') return { st: 'futuro', txt: 'Trabalho marcado', cls: 'n' };
  /* corte: agência que paga dia X do mês seguinte se a invoice chegar até o dia Y */
  if (ag.diaCorte) {
    const corte = j.data.slice(0, 8) + String(ag.diaCorte).padStart(2, '0');
    const limite = corte >= j.data ? corte : mesQueVem(corte);
    return limite < hoje ? { st: 'atrasada', txt: `Mandar hoje! O corte da ${ag.nome} era ${dtBR(limite)} — já vai para o próximo ciclo`, cls: 'bad' }
      : { st: 'mandar', txt: `Mandar até ${dtBR(limite)} (corte da ${ag.nome}) para receber dia ${ag.diaPagamento}`, cls: 'warn' };
  }
  return { st: 'mandar', txt: 'Invoice ainda não enviada', cls: 'warn' };
}
function venceInvoice(j, enviada) {
  const ag = agenciaDe(j.agencia);
  if (ag.diaPagamento) { const d = new Date(enviada + 'T12:00:00'); d.setMonth(d.getMonth() + 1); d.setDate(ag.diaPagamento); return _isoLocal(d); }
  return addDays(enviada, +ag.prazoDias || 30);
}
function proxNumeroInvoice() {
  const ano = isoToday().slice(0, 4);
  const ns = (DB.trabalhosAgencia || []).map(j => j.invoice && j.invoice.numero).filter(Boolean).map(n => +String(n).split('-').pop() || 0);
  return `LL-INV-${ano}-${String(Math.max(10, ...ns) + 1).padStart(3, '0')}`;
}
/* conflito de agenda: o dia já tem cliente direto? (agência tem prioridade) */
function conflitoDoDia(data) {
  if (!data) return '';
  const b = DB.bookings.find(z => z.date === data && z.status === 'confirmed' && !(Tours.get(z.tourId) || {}).naoOcupaDia);
  const j = (DB.trabalhosAgencia || []).find(z => z.data === data && z.status !== 'cancelado');
  if (j) return `${dtBR(data)} já tem trabalho da ${agenciaDe(j.agencia).nome}`;
  if (b) return `${dtBR(data)} já tem ${primeiroNome(b.name)} (cliente direto)`;
  return '';
}
function msgLembrete(b) {
  const x = Tours.get(b.tourId) || { name: { pt: 'tour' }, meeting: '' };
  const falta = Bookings.due(b);
  return `Olá, ${primeiroNome(b.name)}! Aqui é a Carol, da Lovely London 😊\n\nAmanhã é o nosso ${tl(x.name)}!\n🕘 ${janelaDoTour({ time: b.time, horas: b.horas })}\n📍 ${noIdioma(x.meeting)}\n`
    + (falta > 0 ? `💷 Restante a pagar no dia: ${eur(falta)}\n` : '')
    + `\nLembrete: eu espero até ${DB.settings.tolerancia || 30} minutos no ponto de encontro. Se for atrasar, me avise com antecedência.\n\nSeu voucher: ${linkApp('voucher/' + b.code)}\n\nAté amanhã! Come with me… London is lovely ❤️🇬🇧`;
}

/* =====================================================
   HOJE — o que precisa dela agora
   ===================================================== */
const _admTodayBase = admToday;
admToday = function () {
  _admTodayBase();
  const stage = $('#stage'); if (!stage) return;
  const hoje = isoToday(), amanha = addDays(hoje, 1);
  const lembretes = DB.bookings.filter(b => b.status === 'confirmed' && b.date === amanha);
  const agAmanha = (DB.trabalhosAgencia || []).filter(j => j.data === amanha && j.status !== 'cancelado');
  const emails = (DB.emails || []).filter(e => !e.tratado && e.tipo !== 'ignorado');
  const invoices = (DB.trabalhosAgencia || []).map(j => ({ j, p: prazoInvoice(j) })).filter(x => ['mandar', 'atrasada', 'vencida'].includes(x.p.st));
  const roteiros = (DB.roteiros || []).filter(r => r.pago && r.status !== 'publicado');
  const transfers = (DB.pedidos || []).filter(p => p.tipo === 'transfer' && !p.respondido);
  const aval = (DB.avaliacoes || []).filter(a => !a.publicar && !a.vista);
  const tarefas = (DB.tarefas || []).filter(t2 => !t2.feita && t2.data && t2.data <= hoje);
  const proximas = DB.bookings.filter(b => b.status === 'confirmed' && b.date > amanha && b.date <= addDays(hoje, 14)).sort((a, b) => a.date.localeCompare(b.date));
  const item = (ic, tit, sub, acao, cls = '') => `<div class="hjItem ${cls}"><span class="hjIc">${ic}</span><div><b>${tit}</b>${sub ? `<small>${sub}</small>` : ''}</div>${acao || ''}</div>`;
  const blocos = [];
  if (emails.length) blocos.push(`<section class="card hj"><h3>✉️ E-mails que pedem resposta <span class="pill warn">${emails.length}</span></h3>
    ${emails.map(e => { const c = conflitoDoDia(e.data); return item(e.tipo === 'agencia' ? '🏢' : '🙋', esc(e.nome), esc(e.assunto) + (c ? ` · <span class="bad">⚠ ${esc(c)}</span>` : ''), `<button class="mini" data-ir="/adm/emails">Ver</button>`, c ? 'alerta' : ''); }).join('')}</section>`);
  blocos.push(`<section class="card hj"><h3>🔔 Amanhã — lembretes de véspera</h3>
    ${lembretes.length || agAmanha.length ? '' : '<p class="empty">Nenhum tour amanhã.</p>'}
    ${lembretes.map(b => { const x = Tours.get(b.tourId) || { name: { pt: '' } }; return item('🗓', esc(b.name) + ' · ' + esc(tl(x.name)), janelaDoTour({ time: b.time, horas: b.horas }) + ' · ' + b.pax + ' pessoas',
      `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink(msgLembrete(b), String(b.whats).replace(/\D/g, '')))}">Mandar lembrete</a>${typeof fichaDe === 'function' ? `<a class="mini" href="#/adm/clients/${encodeURIComponent(fichaDe(b))}">Ficha</a>` : ''}`); }).join('')}
    ${agAmanha.map(j => item('🏢', esc(agenciaDe(j.agencia).nome) + ' · ' + esc(j.servico), esc(j.cliente) + ' · ' + j.pax + ' pessoas')).join('')}
    ${proximas.length ? `<p class="rotMini">Próximos tours</p>${proximas.slice(0, 4).map(b => { const x = Tours.get(b.tourId) || { name: { pt: '' } }; return item('📅', dtBR(b.date) + ' · ' + esc(primeiroNome(b.name)), esc(tl(x.name)) + ' · ' + janelaDoTour({ time: b.time, horas: b.horas }),
      `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink(msgLembrete(b), String(b.whats).replace(/\D/g, '')))}">Lembrete</a>`); }).join('')}` : ''}
    <p class="why">A mensagem já vem pronta: horário, ponto de encontro, tolerância de ${DB.settings.tolerancia || 30} min, saldo a pagar e o link do voucher. No app no ar, sai sozinha às 16h da véspera (e-mail + WhatsApp).</p></section>`);
  if (invoices.length) blocos.push(`<section class="card hj"><h3>🧾 Invoices das agências</h3>
    ${invoices.map(({ j, p }) => item(p.st === 'mandar' ? '🧾' : '⚠️', esc(agenciaDe(j.agencia).nome) + ' · ' + eur(j.valor), esc(p.txt), `<button class="mini" data-ir="/adm/agencias">Abrir</button>`, p.cls === 'bad' ? 'alerta' : '')).join('')}</section>`);
  if (roteiros.length) blocos.push(`<section class="card hj"><h3>🗺️ Roteiros pagos para validar</h3>
    ${roteiros.map(r => item('🗺️', esc(r.nome) + ' · ' + diasEntre(r.ini, r.fim) + ' dias', 'Pagou ' + eur(r.pago.valor) + ' · rascunho automático pronto', `<button class="mini" data-ir="/adm/roteiros/${r.id}">Validar</button>`)).join('')}</section>`);
  if (transfers.length) blocos.push(`<section class="card hj"><h3>🚘 Transfer esperando cotação</h3>
    ${transfers.map(p => item('🚘', esc(p.nome), esc(p.resumo || ''), `<button class="mini" data-ir="/adm/transfer">Cotar</button>`)).join('')}</section>`);
  if (aval.length) blocos.push(`<section class="card hj"><h3>⭐ Avaliações novas</h3>
    ${aval.map(a => item('★'.repeat(a.estrelas), esc(a.nome), esc(a.texto.slice(0, 90)) + (a.texto.length > 90 ? '…' : ''), `<button class="mini" data-ir="/adm/avaliacoes">Aprovar</button>`)).join('')}</section>`);
  if (tarefas.length) blocos.push(`<section class="card hj"><h3>✅ Tarefas de hoje</h3>
    ${tarefas.map(t2 => item(t2.prioridade === 'alta' ? '🔴' : '🟡', esc(t2.texto), esc(t2.nota || ''), `<button class="mini" data-feita="${t2.id}">Feito</button>`)).join('')}</section>`);
  const h1 = stage.querySelector('.pageh');
  const html = `<div class="hjGrade">${blocos.join('')}</div>`;
  if (h1) h1.insertAdjacentHTML('afterend', html); else stage.insertAdjacentHTML('afterbegin', html);
  $$('[data-ir]', stage).forEach(b => b.onclick = () => go(b.dataset.ir));
  $$('[data-feita]', stage).forEach(b => b.onclick = () => { const t2 = DB.tarefas.find(z => z.id === b.dataset.feita); if (t2) { t2.feita = true; t2.feitaEm = new Date().toISOString(); grava(); } admToday(); });
};

/* =====================================================
   AGÊNCIAS E INVOICES
   ===================================================== */
function admAgencias() {
  const ags = DB.agencias || [];
  const jobs = DB.trabalhosAgencia || [];
  const aberto = jobs.filter(j => j.invoice && j.invoice.enviada && !j.invoice.paga).reduce((s, j) => s + (+j.valor || 0), 0);
  const aMandar = jobs.filter(j => ['mandar', 'atrasada'].includes(prazoInvoice(j).st));
  const vencidas = jobs.filter(j => prazoInvoice(j).st === 'vencida');
  admShell('agencias', `
    <div class="pagehead"><h1 class="pageh">Agências</h1><div class="chips"><button class="cta sm" id="agNovoJob">+ Lançar trabalho</button><button class="mini" id="agNova">+ Agência</button></div></div>
    <p class="why">As empresas que te contratam por e-mail. Cada trabalho vira uma linha da agenda (ocupa o dia) e uma invoice com prazo. <b>Agência tem prioridade</b>: se o dia já tiver cliente direto, o app avisa.</p>
    <div class="kpis">
      <div class="kpi"><small>A receber (invoices enviadas)</small><b>${eur(aberto)}</b></div>
      <div class="kpi ${aMandar.length ? 'warn' : ''}"><small>Invoices para mandar</small><b>${aMandar.length}</b></div>
      <div class="kpi ${vencidas.length ? 'bad' : ''}"><small>Vencidas</small><b>${vencidas.length}</b></div>
    </div>
    <div id="agForm"></div>
    ${ags.map(ag => { const js = jobs.filter(j => j.agencia === ag.id).sort((a, b) => b.data.localeCompare(a.data)); return `<section class="card agCard">
      <div class="agTopo"><div><h3>${esc(ag.nome)}${ag.exemplo ? ' <em class="exTag">exemplo</em>' : ''}</h3><small>${esc(ag.cidade || '')} · ${esc(ag.contato || '')} · ${esc(ag.email || '')}</small></div>
        ${ag.email ? `<a class="mini" href="mailto:${esc(ag.email)}">E-mail</a>` : ''}</div>
      <p class="agPg">💷 ${esc(ag.pagamento || '')}</p>
      ${js.length ? `<div class="agJobs">${js.map(j => { const p = prazoInvoice(j); return `<div class="agJob">
          <div class="agJobTx"><span class="mono">${dtBR(j.data)}</span><b>${esc(j.servico)}</b><small>${esc(j.cliente)} · ${j.pax} pessoas · <b>${eur(j.valor)}</b></small>
            <span class="pill ${p.cls}">${esc(p.txt)}</span>${j.invoice && j.invoice.numero ? `<small class="mono">${esc(j.invoice.numero)}</small>` : ''}</div>
          <div class="tacts">${j.status === 'feito' && !(j.invoice && j.invoice.enviada) ? `<button class="cta sm" data-inv="${j.id}">Gerar e mandar invoice</button>` : ''}
            ${j.invoice && j.invoice.enviada && !j.invoice.paga ? `<button class="mini" data-paga="${j.id}">Marcar paga</button><a class="mini" href="#/invoice/${j.id}">Ver invoice</a>` : ''}
            ${j.invoice && j.invoice.paga ? `<a class="mini" href="#/invoice/${j.id}">Invoice</a>` : ''}
            ${j.status === 'marcado' && j.data < isoToday() ? `<button class="mini" data-feito="${j.id}">Marcar feito</button>` : ''}
            <a class="mini" href="#/voucher/${j.id}">Voucher</a>${j.status === 'marcado' ? `<a class="mini gcal" target="_blank" rel="noopener" href="${esc(gcalTrabalho(j))}">📅 Agenda</a>` : ''}</div></div>`; }).join('')}</div>` : '<p class="empty">Nenhum trabalho ainda.</p>'}
    </section>`; }).join('')}`);
  $('#agNovoJob').onclick = () => formTrabalho();
  $('#agNova').onclick = () => formAgencia();
  $$('[data-inv]').forEach(b => b.onclick = () => {
    const j = jobs.find(z => z.id === b.dataset.inv); const hoje = isoToday();
    j.invoice = { ...(j.invoice || {}), numero: (j.invoice && j.invoice.numero) || proxNumeroInvoice(), emitida: hoje, enviada: hoje, vence: venceInvoice(j, hoje) };
    grava();
    const ag = agenciaDe(j.agencia);
    if (ag.email) window.open(`mailto:${ag.email}?subject=${encodeURIComponent('Invoice ' + j.invoice.numero + ' — Lovely London by Carol')}&body=${encodeURIComponent('Olá, ' + (ag.contato || '') + '!\n\nSegue a invoice ' + j.invoice.numero + ' referente a ' + j.servico + ' em ' + dtBR(j.data) + ' (' + j.cliente + '), no valor de ' + eur(j.valor) + '.\n\nInvoice: ' + linkApp('invoice/' + j.id) + '\n\nObrigada!\nCarol — Lovely London')}`, '_blank');
    toast('Invoice ' + j.invoice.numero + ' enviada · vence ' + dtBR(j.invoice.vence));
    admAgencias();
  });
  $$('[data-paga]').forEach(b => b.onclick = () => { const j = jobs.find(z => z.id === b.dataset.paga); j.invoice.paga = isoToday(); grava(); toast('Recebido ✓'); admAgencias(); });
  $$('[data-feito]').forEach(b => b.onclick = () => { const j = jobs.find(z => z.id === b.dataset.feito); j.status = 'feito'; grava(); admAgencias(); });
}
function formTrabalho(pre = {}) {
  const el = $('#agForm'); if (!el) return;
  el.innerHTML = `<section class="card"><h3>Lançar trabalho de agência</h3>
    <div class="frow"><label class="fld">Agência<select id="tjAg">${(DB.agencias || []).map(a => `<option value="${a.id}" ${pre.agencia === a.id ? 'selected' : ''}>${esc(a.nome)}</option>`).join('')}</select></label>
      <label class="fld">Data<input type="date" id="tjData" value="${esc(pre.data || '')}"></label></div>
    <label class="fld">Serviço<input id="tjServ" value="${esc(pre.servico || '')}" placeholder="ex.: City tour privativo 4h"></label>
    <div class="frow"><label class="fld">Cliente da agência<input id="tjCli" value="${esc(pre.cliente || '')}"></label>
      <label class="fld">Pessoas<input type="number" id="tjPax" min="1" value="${esc(pre.pax || 2)}"></label>
      <label class="fld">Valor (£)<input type="number" id="tjVal" min="0" value="${esc(pre.valor || '')}"></label></div>
    <div id="tjConf"></div>
    <button class="cta sm" id="tjSalva">Salvar na agenda</button></section>`;
  const confere = () => {
    const c = conflitoDoDia($('#tjData').value);
    const b = DB.bookings.find(z => z.date === $('#tjData').value && z.status === 'confirmed' && !(Tours.get(z.tourId) || {}).naoOcupaDia);
    $('#tjConf').innerHTML = c ? `<div class="alert warn">⚠ ${esc(c)}. ${b ? `Agência tem prioridade: <a target="_blank" rel="noopener" href="${esc(waLink('Olá, ' + primeiroNome(b.name) + '! Aqui é a Carol. Surgiu um compromisso no dia ' + dtBR(b.date) + ' e, para você não ficar sem tour, quero te indicar uma colega Blue Badge excelente, que fala português. Posso passar o seu contato para ela?', String(b.whats).replace(/\D/g, '')))}">preparar a mensagem para repassar ${esc(primeiroNome(b.name))} a uma colega</a>.` : ''}</div>` : '';
  };
  $('#tjData').onchange = confere; confere();
  el.scrollIntoView({ behavior: 'instant', block: 'start' });
  $('#tjSalva').onclick = () => {
    const j = { id: 'tj' + uid(), agencia: $('#tjAg').value, data: $('#tjData').value, servico: $('#tjServ').value.trim(), cliente: $('#tjCli').value.trim(),
      pax: +$('#tjPax').value || 1, valor: +$('#tjVal').value || 0, status: $('#tjData').value < isoToday() ? 'feito' : 'marcado', invoice: {} };
    if (!j.data || !j.servico) return toast('Falta a data e o serviço');
    DB.trabalhosAgencia.push(j);
    if (pre.emailId) { const e = DB.emails.find(z => z.id === pre.emailId); if (e) e.tratado = true; }
    grava(); toast('Na agenda ✓');
    admAgencias();
  };
}
function formAgencia() {
  const el = $('#agForm'); if (!el) return;
  el.innerHTML = `<section class="card"><h3>Nova agência</h3>
    <div class="frow"><label class="fld">Nome<input id="agNome"></label><label class="fld">Cidade<input id="agCid"></label></div>
    <div class="frow"><label class="fld">Contato<input id="agCont"></label><label class="fld">E-mail<input id="agMail" type="email"></label></div>
    <div class="frow"><label class="fld">Paga quantos dias depois da invoice?<input id="agPrazo" type="number" value="30"></label>
      <label class="fld">Ou: dia do corte (opcional)<input id="agCorte" type="number" placeholder="ex.: 25"></label>
      <label class="fld">Dia do pagamento (se tem corte)<input id="agPgDia" type="number" placeholder="ex.: 10"></label></div>
    <button class="cta sm" id="agSalva">Salvar</button></section>`;
  $('#agSalva').onclick = () => {
    const corte = +$('#agCorte').value || 0, pgDia = +$('#agPgDia').value || 0, prazo = +$('#agPrazo').value || 30;
    const a = { id: 'ag' + uid(), nome: $('#agNome').value.trim(), cidade: $('#agCid').value.trim(), contato: $('#agCont').value.trim(), email: $('#agMail').value.trim(),
      diaCorte: corte || undefined, diaPagamento: pgDia || undefined, prazoDias: corte ? undefined : prazo,
      pagamento: corte && pgDia ? `Paga dia ${pgDia} do mês seguinte, se a invoice chegar até o dia ${corte}` : `${prazo} dias depois da invoice` };
    if (!a.nome) return toast('Falta o nome');
    DB.agencias.push(a); grava(); admAgencias();
  };
}
function viewInvoice(id) {
  const j = (DB.trabalhosAgencia || []).find(z => z.id === id);
  if (!j) { app.innerHTML = `${topoCarol()}<main class="wrap narrow"><p class="empty">Invoice não encontrada.</p></main>`; ligaVoltar('/adm/agencias'); return; }
  const ag = agenciaDe(j.agencia), inv = j.invoice || {}, st = DB.settings;
  app.innerHTML = `${topoCarol()}<main class="wrap vchWrap">
    <div class="vchAcoes noprint"><button class="cta sm" id="ivPdf">Salvar em PDF / imprimir</button></div>
    <article class="voucherCarol" id="voucherFolha">
      <header class="vchFaixa"><img src="arte/logo-escuro.png" alt="Lovely London by Carol"><div><b>INVOICE</b><small>Carolina Carvalho · Blue Badge Tourist Guide · London</small></div></header>
      <div class="vchCorpo">
        <h1>INVOICE ${esc(inv.numero || '(rascunho)')}</h1>
        <dl class="vchDados">
          <div><dt>Bill to</dt><dd>${esc(ag.nome)}${ag.cidade ? ', ' + esc(ag.cidade) : ''}</dd></div><div><dt>Issue date</dt><dd>${dtBR(inv.emitida || isoToday())}</dd></div>
          <div><dt>Attn.</dt><dd>${esc(ag.contato || '—')}</dd></div><div><dt>Due date</dt><dd>${dtBR(inv.vence || '')}</dd></div>
        </dl>
        <h2>SERVICES</h2>
        <table class="vchTab"><thead><tr><th>DATE</th><th>DESCRIPTION</th><th>AMOUNT</th></tr></thead>
          <tbody><tr><td>${dtBR(j.data)}</td><td><b>${esc(j.servico)}</b><small>Guest: ${esc(j.cliente)} · ${j.pax} pax</small></td><td>${eur(j.valor)}</td></tr></tbody></table>
        <p class="vchTotal"><span>TOTAL DUE</span><b>${eur(j.valor)}</b></p>
        ${inv.paga ? `<p class="vchEstado ok">✓ PAID — ${dtBR(inv.paga)}</p>` : ''}
        <div class="vchTermos"><b>Payment details</b><ul><li>${st.iban ? 'Account: ' + esc(st.iban) + (st.ibanName ? ' · ' + esc(st.ibanName) : '') : 'Bank details: (a Carol preenche em Ajustes → Pagamentos)'}</li><li>Payment terms: ${esc(ag.pagamento || '')}</li></ul></div>
        <p class="vchAss">Thank you,<br><span>Carol</span> — Lovely London</p>
      </div>
      <footer class="vchPe"><span>☎ +44 7950 400919</span><span>✉ hello@lovelylondon.uk</span><span>⌂ lovelylondon.uk</span><span class="bb">${IC.selo} Blue Badge · APTG member</span></footer>
    </article></main>`;
  ligaVoltar('/adm/agencias');
  $('#ivPdf').onclick = () => window.print();
}

/* =====================================================
   E-MAILS — a varredura (reunião 52:38–54:21)
   ===================================================== */
function admEmails() {
  const ems = [...(DB.emails || [])].sort((a, b) => (b.chegou || '').localeCompare(a.chegou || ''));
  admShell('emails', `
    <h1 class="pageh">E-mails</h1>
    <div class="alert demo"><b>Como funciona:</b> o assistente olha a caixa <b>hello@lovelylondon.uk</b> (e o que chega pelo formulário do Guide London) a cada 10 minutos, com permissão só de leitura. Separa <b>agência</b>, <b>cliente</b> e o que é para ignorar, lê a data e o nº de pessoas, confere a sua agenda e te avisa no celular — "chegou e-mail da agência X, você pode atender?".</div>
    ${ems.map(e => { const c = e.tipo !== 'ignorado' ? conflitoDoDia(e.data) : ''; return `<section class="card emCard ${e.tratado ? 'tratado' : ''}">
      <div class="emTopo"><span class="pill ${e.tipo === 'agencia' ? 'warn' : e.tipo === 'cliente' ? 'ok' : 'n'}">${e.tipo === 'agencia' ? '🏢 Agência' : e.tipo === 'cliente' ? '🙋 Cliente' : 'Ignorado'}</span>
        <small>${esc(new Date(e.chegou).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))}</small></div>
      <b>${esc(e.assunto)}</b><small class="emDe">${esc(e.nome)} · ${esc(e.de)}</small>
      <p>${esc(e.resumo)}</p>
      ${e.data ? `<p class="emData">📅 ${dtBR(e.data)}${e.pax ? ' · ' + e.pax + ' pessoas' : ''} · ${c ? `<span class="bad">⚠ ${esc(c)}${e.tipo === 'agencia' ? ' — agência tem prioridade' : ''}</span>` : '<span class="okt">✓ dia livre</span>'}</p>` : ''}
      ${e.tratado ? '<small>✓ tratado</small>' : `<div class="tacts">
        ${e.tipo === 'agencia' ? `<button class="cta sm" data-lanca="${e.id}">Aceitar e lançar na agenda</button>` : ''}
        ${e.tipo === 'cliente' && e.whats ? `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink('Olá! Aqui é a Carol, da Lovely London. Recebi seu pedido pelo Guide London para ' + dtBR(e.data) + '. Vamos combinar?', String(e.whats).replace(/\D/g, '')))}">Responder no WhatsApp</a>` : ''}
        <a class="mini" href="mailto:${esc(e.de)}?subject=${encodeURIComponent('Re: ' + e.assunto)}">Responder por e-mail</a>
        <button class="mini ghost" data-trata="${e.id}">Marcar tratado</button></div>`}
    </section>`; }).join('')}`);
  $$('[data-trata]').forEach(b => b.onclick = () => { const e = DB.emails.find(z => z.id === b.dataset.trata); e.tratado = true; grava(); admEmails(); });
  $$('[data-lanca]').forEach(b => b.onclick = () => {
    const e = DB.emails.find(z => z.id === b.dataset.lanca);
    admAgencias();
    formTrabalho({ agencia: e.agencia, data: e.data, servico: 'City tour privativo 4h', pax: e.pax, emailId: e.id });
  });
}

/* =====================================================
   ROTEIROS ("Monte seu roteiro" e passeios ocultos)
   ===================================================== */
function admRoteiros(id) {
  if (id) return editaRoteiro(id);
  const rs = [...(DB.roteiros || [])].sort((a, b) => (b.criado || '').localeCompare(a.criado || ''));
  const ST = { rascunho: ['warn', 'Rascunho automático — validar'], publicado: ['ok', 'Publicado para o cliente'] };
  admShell('roteiros', `
    <h1 class="pageh">Roteiros</h1>
    <p class="why">Cada "Monte seu roteiro" pago chega aqui com um <b>rascunho automático</b>, montado com o seu banco de pontos. Você só valida: tira, põe, reordena, escreve uma nota — e publica. O cliente recebe um <b>link privado</b> (não aparece na vitrine).</p>
    ${rs.length ? rs.map(r => { const [cls, txt] = ST[r.status] || ST.rascunho; return `<section class="card rtAdm">
      <div class="agTopo"><div><h3>${esc(r.nome)}${r.exemplo ? ' <em class="exTag">exemplo</em>' : ''}</h3><small>${dtBR(r.ini)} a ${dtBR(r.fim)} · ${diasEntre(r.ini, r.fim)} dias · ${r.adultos + r.criancas} pessoas · ${esc((NIVEIS.find(n => n.id === r.nivel) || {}).n || '')}</small></div>
        <span class="pill ${cls}">${txt}</span></div>
      <p class="agPg">💷 ${r.pago ? 'Pagou ' + eur(r.pago.valor) + ' (' + (r.pago.metodo === 'pix' ? 'Pix' : 'cartão') + ')' : 'Sem pagamento'} · quer: ${esc((r.querem || []).map(q => (DESTAQUES.find(d => d.id === q) || {}).n || q).join(', '))}</p>
      <div class="tacts"><button class="cta sm" data-rt="${r.id}">${r.status === 'publicado' ? 'Editar' : 'Revisar e validar'}</button><a class="mini" href="#/r/${esc(r.codigo)}">Ver como o cliente vê</a></div>
    </section>`; }).join('') : '<p class="empty">Nenhum roteiro ainda.</p>'}`);
  $$('[data-rt]').forEach(b => b.onclick = () => go('/adm/roteiros/' + b.dataset.rt));
}
function editaRoteiro(id) {
  const r = (DB.roteiros || []).find(z => z.id === id);
  if (!r) return admRoteiros();
  if (!r.dias || !r.dias.length) { gerarRascunho(r); grava(); }
  const opcoes = Object.entries(AREAS).map(([a, nome]) => `<optgroup label="${esc(nome)}">${todosPontos().filter(p => p.area === a).map(p => `<option value="${p.id}">${esc(p.n)}</option>`).join('')}</optgroup>`).join('');
  admShell('roteiros', `
    <div class="pagehead"><h1 class="pageh">Roteiro · ${esc(r.nome)}</h1><button class="mini" id="rtVolta">← Todos</button></div>
    <p class="why">${dtBR(r.ini)} a ${dtBR(r.fim)} · hotel: ${esc(r.hotel || '—')} · ritmo ${esc(r.ritmo)} · interesses: ${esc((r.interesses || []).join(', ') || '—')}${r.obs ? ' · “' + esc(r.obs) + '”' : ''}${r.comCarol ? ' · <b>quer 1 dia de tour com você</b>' : ''}</p>
    ${r.dias.map((d, di) => `<section class="card rtDiaAdm"><h3>Dia ${di + 1} · ${fmtDiaCurto(d.data)}${d.chegada ? ' · chegada' : d.volta ? ' · volta' : ''}</h3>
      ${d.periodos.map((pe, pi) => `<div class="rtPeAdm">
        <label class="fld">${PERIODO_ROT[pe.p]}<input data-tit="${di}.${pi}" value="${esc(pe.titulo)}"></label>
        <ol>${pe.itens.map((pid, ii) => { const p = ponto(pid) || { n: pid }; return `<li><span>${esc(p.n)}</span>
          <button class="mini" data-mv="${di}.${pi}.${ii}.-1" aria-label="subir">↑</button><button class="mini" data-mv="${di}.${pi}.${ii}.1" aria-label="descer">↓</button><button class="mini ghost" data-rm="${di}.${pi}.${ii}" aria-label="tirar">✕</button></li>`; }).join('')}</ol>
        <div class="rtAdd"><select data-addsel="${di}.${pi}"><option value="">+ pôr um ponto…</option>${opcoes}</select></div>
        <label class="fld">Nota sua para este período<input data-nota="${di}.${pi}" value="${esc(pe.nota || '')}" placeholder="ex.: compre o ingresso da Torre para 10h"></label>
      </div>`).join('')}
    </section>`).join('')}
    <div class="rtAcoesAdm">
      <button class="cta" id="rtPublica">${r.status === 'publicado' ? 'Salvar e manter publicado' : 'Validar e publicar para o cliente'}</button>
      <a class="mini" href="#/r/${esc(r.codigo)}">Ver como o cliente vê</a>
      <button class="mini ghost" id="rtRefaz">Gerar o rascunho de novo</button>
    </div>
    ${r.status === 'publicado' ? `<p class="why">Publicado. <a target="_blank" rel="noopener" href="${esc(waLink('Olá, ' + primeiroNome(r.nome) + '! Seu roteiro de Londres está pronto 🎉 ' + linkApp('r/' + r.codigo), String(r.whats).replace(/\D/g, '')))}">Mandar o link no WhatsApp</a></p>` : ''}`);
  const campo = (s) => s.split('.').map(Number);
  $('#rtVolta').onclick = () => go('/adm/roteiros');
  $$('[data-tit]').forEach(i => i.onchange = () => { const [di, pi] = campo(i.dataset.tit); r.dias[di].periodos[pi].titulo = i.value; grava(); });
  $$('[data-nota]').forEach(i => i.onchange = () => { const [di, pi] = campo(i.dataset.nota); r.dias[di].periodos[pi].nota = i.value; grava(); });
  $$('[data-rm]').forEach(b => b.onclick = () => { const [di, pi, ii] = campo(b.dataset.rm); r.dias[di].periodos[pi].itens.splice(ii, 1); grava(); editaRoteiro(id); });
  $$('[data-mv]').forEach(b => b.onclick = () => { const [di, pi, ii, dd] = campo(b.dataset.mv); const it = r.dias[di].periodos[pi].itens, j = ii + dd; if (j < 0 || j >= it.length) return; [it[ii], it[j]] = [it[j], it[ii]]; grava(); editaRoteiro(id); });
  $$('[data-addsel]').forEach(s => s.onchange = () => { if (!s.value) return; const [di, pi] = campo(s.dataset.addsel); r.dias[di].periodos[pi].itens.push(s.value); grava(); editaRoteiro(id); });
  $('#rtRefaz').onclick = () => { if (!confirm('Gerar de novo apaga as suas mudanças neste roteiro. Continuar?')) return; gerarRascunho(r); grava(); editaRoteiro(id); };
  $('#rtPublica').onclick = () => { r.status = 'publicado'; r.publicadoEm = new Date().toISOString(); grava(); toast('Publicado ✓ — mande o link para ' + primeiroNome(r.nome)); editaRoteiro(id); };
}

/* =====================================================
   TRANSFER — pedidos + motoristas parceiros (reunião 33:30)
   ===================================================== */
function admTransfer() {
  const ps = (DB.pedidos || []).filter(p => p.tipo === 'transfer').sort((a, b) => (b.criado || '').localeCompare(a.criado || ''));
  const ms = DB.motoristas || [];
  admShell('transfer', `
    <h1 class="pageh">Transfer</h1>
    <p class="why">O cliente pede pelo app; você consulta os motoristas (eles cobram por hora e deslocamento), põe a sua parte e manda a proposta. Tudo com a mensagem pronta.</p>
    ${ps.length ? ps.map(p => `<section class="card trCard ${p.respondido ? 'tratado' : ''}">
      <div class="agTopo"><div><h3>🚘 ${esc(p.nome)}${p.exemplo ? ' <em class="exTag">exemplo</em>' : ''}</h3><small>${esc(p.resumo || '')}</small></div><span class="pill ${p.respondido ? 'ok' : 'warn'}">${p.respondido ? 'Proposta enviada' : 'Novo'}</span></div>
      <pre class="pdmsg">${esc(p.ficha || '')}</pre>
      <p class="rotMini">1 · Pedir cotação ao motorista</p>
      <div class="tacts">${ms.map(m => `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink('Oi, ' + primeiroNome(m.nome) + '! Aqui é a Carol. Tenho um transfer: ' + (p.de || '') + ' → ' + (p.para || '') + ', ' + dtBR(p.data) + ' ' + (p.hora || '') + (p.voo ? ' (voo ' + p.voo + ')' : '') + ', ' + (p.adultos + p.criancas) + ' pessoas e ' + p.malas + ' malas grandes. Qual o valor?', String(m.whats).replace(/\D/g, '')))}">${esc(m.nome)} · ${esc(m.carro)}</a>`).join('')}</div>
      <p class="rotMini">2 · Montar a proposta</p>
      <div class="frow"><label class="fld">Valor do motorista (£)<input type="number" data-mot="${p.id}" value="${esc(p.cotacao || '')}"></label>
        <label class="fld">Sua parte (£)<input type="number" data-marg="${p.id}" value="${esc(p.margem || '')}"></label>
        <label class="fld">Cliente paga<input readonly id="tot-${p.id}" value="${p.cotacao ? eur((+p.cotacao || 0) + (+p.margem || 0)) : ''}"></label></div>
      <div class="tacts"><button class="cta sm" data-prop="${p.id}">3 · Mandar proposta ao cliente</button></div>
    </section>`).join('') : '<p class="empty">Nenhum pedido de transfer ainda.</p>'}
    <section class="card"><h3>Motoristas parceiros</h3>
      ${ms.map(m => `<div class="trMot"><b>${esc(m.nome)}</b>${m.exemplo ? ' <em class="exTag">exemplo</em>' : ''}<small>${esc(m.carro)} · até ${m.lugares} pessoas e ${m.malas} malas · ${esc(m.obs || '')}</small></div>`).join('')}
      <div class="frow"><label class="fld">Nome<input id="mtNome"></label><label class="fld">WhatsApp<input id="mtWa"></label></div>
      <div class="frow"><label class="fld">Carro<input id="mtCarro"></label><label class="fld">Lugares<input id="mtLug" type="number" value="4"></label><label class="fld">Malas<input id="mtMal" type="number" value="4"></label></div>
      <button class="mini" id="mtSalva">+ Salvar motorista</button></section>`);
  const atualiza = (id) => { const p = DB.pedidos.find(z => z.id === id); p.cotacao = +($(`[data-mot="${id}"]`).value) || 0; p.margem = +($(`[data-marg="${id}"]`).value) || 0; $('#tot-' + id).value = eur(p.cotacao + p.margem); grava(); };
  $$('[data-mot]').forEach(i => i.oninput = () => atualiza(i.dataset.mot));
  $$('[data-marg]').forEach(i => i.oninput = () => atualiza(i.dataset.marg));
  $$('[data-prop]').forEach(b => b.onclick = () => {
    const p = DB.pedidos.find(z => z.id === b.dataset.prop); const total = (+p.cotacao || 0) + (+p.margem || 0);
    if (!total) return toast('Ponha o valor do motorista');
    window.open(waLink(`Olá, ${primeiroNome(p.nome)}! Aqui é a Carol 😊\n\nSeu transfer ${p.de} → ${p.para}, ${dtBR(p.data)} às ${p.hora}${p.voo ? ' (voo ' + p.voo + ')' : ''}, para ${p.adultos + p.criancas} pessoas: ${eur(total)}.\nMotorista parceiro, carro com espaço para as malas, acompanhamento do voo.\n\nPara confirmar, é só me responder aqui. ❤️`, String(p.whats).replace(/\D/g, '')), '_blank');
    p.respondido = true; grava(); admTransfer();
  });
  $('#mtSalva').onclick = () => { const m = { id: 'mt' + uid(), nome: $('#mtNome').value.trim(), whats: $('#mtWa').value.trim(), carro: $('#mtCarro').value.trim(), lugares: +$('#mtLug').value || 4, malas: +$('#mtMal').value || 4 }; if (!m.nome) return toast('Falta o nome'); DB.motoristas.push(m); grava(); admTransfer(); };
}

/* =====================================================
   FINANCEIRO — "a minha vida financeira é uma bagunça" (1:09:41)
   ===================================================== */
function admFinanceiro() {
  const hoje = isoToday(), mes = hoje.slice(0, 7), em30 = addDays(hoje, 30);
  let recMes = 0, recCartao = 0, recPix = 0, recAg = 0;
  for (const b of DB.bookings) for (const p of b.payments) if ((p.date || '').slice(0, 7) === mes && p.date <= hoje) { recMes += p.amount; if (p.method === 'pix') recPix += p.amount; else recCartao += p.amount; }
  for (const j of DB.trabalhosAgencia || []) if (j.invoice && j.invoice.paga && j.invoice.paga.slice(0, 7) === mes) { recMes += +j.valor; recAg += +j.valor; }
  const saldos = DB.bookings.filter(b => b.status === 'confirmed' && b.date >= hoje && Bookings.due(b) > 0);
  const aReceberCli = saldos.reduce((s, b) => s + Bookings.due(b), 0);
  const invAbertas = (DB.trabalhosAgencia || []).filter(j => j.invoice && j.invoice.enviada && !j.invoice.paga);
  const invAMandar = (DB.trabalhosAgencia || []).filter(j => ['mandar', 'atrasada'].includes(prazoInvoice(j).st));
  const aReceberAg = invAbertas.reduce((s, j) => s + +j.valor, 0) + invAMandar.reduce((s, j) => s + +j.valor, 0);
  const prazos = [
    ...invAMandar.map(j => ({ d: j.data, cls: prazoInvoice(j).cls, txt: `Invoice ${agenciaDe(j.agencia).nome} (${eur(j.valor)}): ${prazoInvoice(j).txt}` })),
    ...invAbertas.map(j => ({ d: j.invoice.vence, cls: prazoInvoice(j).cls, txt: `${agenciaDe(j.agencia).nome} paga ${eur(j.valor)} — ${prazoInvoice(j).txt}` })),
    ...saldos.filter(b => b.date <= em30).map(b => ({ d: b.date, cls: 'n', txt: `${primeiroNome(b.name)} paga ${eur(Bookings.due(b))} no dia do tour` })),
  ].sort((a, b) => (a.d || '').localeCompare(b.d || ''));
  const ano = +hoje.slice(0, 4), porMes = Reports.byMonth(ano);
  for (const j of DB.trabalhosAgencia || []) if (j.invoice && j.invoice.paga && +j.invoice.paga.slice(0, 4) === ano) porMes[+j.invoice.paga.slice(5, 7) - 1] += +j.valor;
  const max = Math.max(1, ...porMes);
  admShell('financeiro', `
    <div class="pagehead"><h1 class="pageh">Financeiro</h1><div class="chips"><button class="mini" data-ir="/adm/money">Extrato para o contador →</button></div></div>
    <div class="kpis">
      <div class="kpi"><small>Recebido em ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}</small><b>${eur(recMes)}</b><i>cartão ${eur(recCartao)} · Pix ${eur(recPix)} · agências ${eur(recAg)}</i></div>
      <div class="kpi"><small>A receber de clientes (no dia do tour)</small><b>${eur(aReceberCli)}</b><i>${saldos.length} reservas com saldo</i></div>
      <div class="kpi ${invAMandar.length ? 'warn' : ''}"><small>A receber de agências</small><b>${eur(aReceberAg)}</b><i>${invAbertas.length} enviadas · ${invAMandar.length} para mandar</i></div>
    </div>
    <section class="card"><h3>⏰ Prazos críticos</h3>
      ${prazos.length ? prazos.map(p => `<div class="przRow ${p.cls}"><span class="mono">${dtBR(p.d)}</span><span>${esc(p.txt)}</span></div>`).join('') : '<p class="empty">Nada vencendo.</p>'}</section>
    <section class="card"><h3>Entradas por mês · ${ano}</h3>
      <div class="barras">${porMes.map((v, i) => `<div class="barra"><i style="height:${Math.round(v / max * 100)}%"></i><small>${['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</small>${v ? `<b>${Math.round(v)}</b>` : ''}</div>`).join('')}</div>
      <p class="why">Clientes diretos (cartão pelo Stripe na conta do Reino Unido, Pix no Brasil) e agências (transferência). O extrato separa as contas e gera o CSV do contador.</p></section>`);
  $$('[data-ir]').forEach(b => b.onclick = () => go(b.dataset.ir));
}

/* =====================================================
   PONTOS TURÍSTICOS — o banco (reunião 25:57)
   ===================================================== */
function todosPontos() { const meus = DB.pontos || []; return PONTOS.map(p => meus.find(m => m.id === p.id) || p).concat(meus.filter(m => !PONTOS.some(p => p.id === m.id))); }
function admPontos(id) {
  if (id) return editaPonto(id);
  const area = admPontos._a || 'city';
  const todos = todosPontos();
  const lista = todos.filter(p => area === 'todos' || p.area === area);
  const nCarol = todos.filter(p => p.fonte === 'carol').length;
  admShell('pontos', `
    <div class="pagehead"><h1 class="pageh">Pontos turísticos</h1><div class="chips"><label class="mini kmlBtn">Importar do My Maps (KML)<input type="file" id="kmlIn" accept=".kml,.xml" hidden></label></div></div>
    <p class="why">O banco que alimenta os tours, o "Monte seu roteiro" e o imersivo: ${todos.length} pontos, <b>${nCarol} com o seu texto</b> (do seu mapa da City). Os outros já têm foto e esperam o seu texto. Cada ponto vai ganhar o áudio na sua voz.</p>
    <div class="chips">${['todos', ...Object.keys(AREAS)].map(a => `<button class="chip ${a === area ? 'on' : ''}" data-area="${a}">${a === 'todos' ? 'Todos' : esc(AREAS[a])}</button>`).join('')}</div>
    <div class="ptGrade">${lista.map(p => `<button class="ptCard" data-pt="${p.id}"><span class="ptFoto" style="background-image:url(${esc(p.ph)})"></span>
      <span class="ptTx"><b>${esc(p.n)}</b><small>${p.fonte === 'carol' ? '✎ texto da Carol' : '… falta o texto'} · ${p.audio ? '🎙 voz da Carol' : '🔈 voz provisória'}</small></span></button>`).join('')}</div>`);
  $$('[data-area]').forEach(b => b.onclick = () => { admPontos._a = b.dataset.area; admPontos(); });
  $$('[data-pt]').forEach(b => b.onclick = () => go('/adm/pontos/' + b.dataset.pt));
  $('#kmlIn').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const doc = new DOMParser().parseFromString(await f.text(), 'text/xml');
    let n = 0;
    doc.querySelectorAll('Placemark').forEach(pm => {
      const c = pm.querySelector('Point coordinates'); if (!c) return;
      const [lng, lat] = c.textContent.trim().split(',').map(Number);
      const nome = (pm.querySelector('name') || {}).textContent || 'Ponto';
      const desc = ((pm.querySelector('description') || {}).textContent || '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').trim();
      const id = 'kml-' + nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      if (todosPontos().some(p => p.id === id)) return;
      DB.pontos.push({ id, n: nome.split(' - ')[0].trim(), area: 'city', lat, lng, d: desc, dica: '', ph: '', cr: '', fonte: 'carol' }); n++;
    });
    grava(); toast(n + ' pontos importados do seu mapa'); admPontos();
  };
}
function editaPonto(id) {
  const p = todosPontos().find(z => z.id === id); if (!p) return admPontos();
  admShell('pontos', `
    <div class="pagehead"><h1 class="pageh">${esc(p.n)}</h1><button class="mini" id="ptVolta">← Todos</button></div>
    <div class="ptEd"><span class="ptFotoG" style="background-image:url(${esc(p.ph)})">${p.cr ? `<small class="sccr">${esc(p.cr)}</small>` : ''}</span>
    <section class="card">
      <label class="fld">Nome<input id="ptN" value="${esc(p.n)}"></label>
      <label class="fld">O que você conta aqui <small class="why">é o texto do roteiro e o que a sua voz vai ler no audioguia</small><textarea id="ptD" rows="9">${esc(p.d || '')}</textarea></label>
      <label class="fld">Dica curta<input id="ptDica" value="${esc(p.dica || '')}" placeholder="ex.: suba no 6º andar, a vista é linda"></label>
      <div class="tacts"><button class="cta sm" id="ptSalva">Salvar</button><button class="mini" id="ptOuvir">▶ Ouvir (voz provisória)</button></div>
      <p class="why">🎙 Áudio: ${p.audio ? 'gravado na sua voz ✓' : 'por enquanto, a voz do celular. Na entrega: gravado por você no estúdio (ou clonado, com a sua autorização) e ligado aqui.'}</p>
    </section></div>`);
  $('#ptVolta').onclick = () => go('/adm/pontos');
  $('#ptOuvir').onclick = (e) => { if (e.currentTarget.classList.contains('falando')) return paraVoz(); narra({ ...p, n: $('#ptN').value, d: $('#ptD').value, dica: $('#ptDica').value }, e.currentTarget); };
  $('#ptSalva').onclick = () => {
    const novo = { ...p, n: $('#ptN').value.trim(), d: $('#ptD').value.trim(), dica: $('#ptDica').value.trim(), fonte: $('#ptD').value.trim() ? 'carol' : p.fonte };
    DB.pontos = (DB.pontos || []).filter(z => z.id !== id).concat([novo]); grava(); toast('Salvo ✓'); editaPonto(id);
  };
}

/* =====================================================
   AVALIAÇÕES + o QR do fim do tour (reunião 14:20)
   ===================================================== */
function admAvaliacoes() {
  const as = [...(DB.avaliacoes || [])].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  as.forEach(a => { a.vista = true; }); grava();
  const link = linkApp('avaliar');
  admShell('avaliacoes', `
    <h1 class="pageh">Avaliações</h1>
    <section class="card qrCard"><div class="qrBox">${typeof qrSvg === 'function' ? qrSvg(link, { tamanho: 180, alt: 'QR para avaliar o tour' }) : ''}</div>
      <div><h3>O QR do fim do tour</h3><p class="why">No fim do tour, mostre este QR no seu celular: a pessoa aponta a câmera, dá as estrelas e escreve — sem baixar nada. Depois o app convida a avaliar também no Google (hoje você tem 0 avaliações públicas).</p>
        <div class="tacts"><button class="cta sm" id="qrCheio">Mostrar em tela cheia</button><button class="mini" id="qrImp">Imprimir cartão</button></div>
        <label class="fld">Seu link de avaliação no Google<input id="revG" value="${esc(DB.settings.reviewGoogle || '')}"></label></div></section>
    ${as.map(a => { const x = Tours.get(a.tourId); return `<section class="card avAdm"><div class="agTopo"><div><b>${'★'.repeat(a.estrelas)}${'☆'.repeat(5 - a.estrelas)} · ${esc(a.nome)}</b>${a.exemplo ? ' <em class="exTag">exemplo</em>' : ''}<small>${dtBR(a.data)}${x ? ' · ' + esc(tl(x.name)) : ''}${a.autorizou === false ? ' · não autorizou publicar' : ''}</small></div>
      <label class="avPub"><input type="checkbox" data-pub="${a.id}" ${a.publicar ? 'checked' : ''} ${a.autorizou === false ? 'disabled' : ''}> Mostrar no app</label></div><p>${esc(a.texto)}</p></section>`; }).join('')}`);
  $('#qrCheio').onclick = () => go('/qr-avaliacao');
  $('#qrImp').onclick = () => { go('/qr-avaliacao'); setTimeout(() => window.print(), 400); };
  $('#revG').onchange = (e) => { DB.settings.reviewGoogle = e.target.value.trim(); save(); toast('Salvo ✓'); };
  $$('[data-pub]').forEach(c => c.onchange = () => { const a = DB.avaliacoes.find(z => z.id === c.dataset.pub); a.publicar = c.checked; grava(); toast(c.checked ? 'Aparece no app ✓' : 'Escondida'); });
}
function viewQrAvaliacao() {
  const link = linkApp('avaliar');
  app.innerHTML = `<main class="qrTela rtFolha"><img src="arte/logo-escuro.png" alt="Lovely London by Carol">
    <p class="lema">Thank you for coming with me!</p>
    <div class="qrGrande">${qrSvg(link, { tamanho: 280, alt: 'QR para avaliar' })}</div>
    <p class="qrTx">Aponte a câmera e conte como foi ⭐⭐⭐⭐⭐</p>
    <button class="mini noprint" id="qrSai">Fechar</button></main>`;
  $('#qrSai').onclick = () => go('/adm/avaliacoes');
}

/* =====================================================
   TAREFAS e RECADOS
   ===================================================== */
function admTarefas() {
  const aba = admTarefas._a || 'hoje', area = admTarefas._ar || 'todas';
  const hoje = isoToday(), fimSemana = addDays(hoje, 7);
  let ts = (DB.tarefas || []).filter(t2 => area === 'todas' || t2.area === area);
  const atrasada = t2 => !t2.feita && t2.data && t2.data < hoje;
  if (aba === 'hoje') ts = ts.filter(t2 => !t2.feita && (!t2.data || t2.data <= hoje));
  else if (aba === 'semana') ts = ts.filter(t2 => !t2.feita && (!t2.data || t2.data <= fimSemana));
  else if (aba === 'feitas') ts = ts.filter(t2 => t2.feita);
  ts.sort((a, b) => (a.data || '9').localeCompare(b.data || '9') || (a.prioridade === 'alta' ? -1 : 1));
  const recados = (DB.recados || []).filter(r => !r.atendido);
  admShell('tarefas', `
    <h1 class="pageh">Tarefas</h1>
    <div class="chips">${[['hoje', 'Hoje'], ['semana', 'Semana'], ['todas', 'Todas'], ['feitas', 'Feitas']].map(([v, n]) => `<button class="chip ${aba === v ? 'on' : ''}" data-aba="${v}">${n}</button>`).join('')}</div>
    <div class="chips">${[['todas', 'Tudo'], ['pro', 'Profissional'], ['pessoal', 'Pessoal']].map(([v, n]) => `<button class="chip ${area === v ? 'on' : ''}" data-ar="${v}">${n}</button>`).join('')}</div>
    <section class="card"><div class="tfNova"><input id="tfTx" placeholder="O que precisa fazer? (ou fale com o assistente: “anota: filmar 3 tours amanhã”)">
      <div class="frow"><input type="date" id="tfData" value="${hoje}"><select id="tfPri"><option value="media">média</option><option value="alta">alta</option><option value="baixa">baixa</option></select>
      <select id="tfArea"><option value="pro">profissional</option><option value="pessoal">pessoal</option></select></div><button class="cta sm" id="tfAdd">Anotar</button></div>
      ${ts.length ? `<ul class="tfLista">${ts.map(t2 => `<li class="${atrasada(t2) ? 'atrasada' : ''} ${t2.feita ? 'feita' : ''}"><label><input type="checkbox" data-tf="${t2.id}" ${t2.feita ? 'checked' : ''}>
        <span><b>${esc(t2.texto)}</b><small>${t2.data ? dtBR(t2.data) : 'sem data'} · ${t2.prioridade || 'média'} · ${t2.area === 'pessoal' ? 'pessoal' : 'profissional'}${t2.nota ? ' · ' + esc(t2.nota) : ''}${atrasada(t2) ? ' · atrasada' : ''}</small></span></label></li>`).join('')}</ul>` : '<p class="empty">Nada por aqui. ✨</p>'}
    </section>
    <section class="card"><h3>Recados ${recados.length ? `<span class="pill warn">${recados.length}</span>` : ''}</h3>
      <p class="why">O que chega pelo atendimento (WhatsApp e Instagram) e precisa de você.</p>
      ${recados.map(r => `<div class="hjItem"><span class="hjIc">${r.canal === 'insta' ? '📸' : '💬'}</span><div><b>${esc(r.nome)}</b><small>${esc(r.texto)}</small></div><button class="mini" data-rc="${r.id}">Resolvido</button></div>`).join('') || '<p class="empty">Nenhum recado.</p>'}
    </section>`);
  $$('[data-aba]').forEach(b => b.onclick = () => { admTarefas._a = b.dataset.aba; admTarefas(); });
  $$('[data-ar]').forEach(b => b.onclick = () => { admTarefas._ar = b.dataset.ar; admTarefas(); });
  $('#tfAdd').onclick = () => { const tx = $('#tfTx').value.trim(); if (!tx) return; DB.tarefas.push({ id: 'tf' + uid(), texto: tx, data: $('#tfData').value, prioridade: $('#tfPri').value, area: $('#tfArea').value, feita: false }); grava(); admTarefas(); };
  $$('[data-tf]').forEach(c => c.onchange = () => { const t2 = DB.tarefas.find(z => z.id === c.dataset.tf); t2.feita = c.checked; t2.feitaEm = c.checked ? new Date().toISOString() : ''; grava(); admTarefas(); });
  $$('[data-rc]').forEach(b => b.onclick = () => { const r = DB.recados.find(z => z.id === b.dataset.rc); r.atendido = true; grava(); admTarefas(); });
}

/* =====================================================
   GOOGLE AGENDA — um toque abre o evento já preenchido na agenda dela
   (hora de Londres). No app no ar, a sincronia automática substitui isto.
   Só primeiro nome + passeio: nada de telefone ou e-mail no link.
   ===================================================== */
function linkGoogleAgenda({ titulo, data, hora, horas, local, detalhes }) {
  const d = String(data || '').replace(/-/g, '');
  let datas;
  if (hora) {
    const [h, m] = hora.split(':').map(Number), fimMin = h * 60 + m + Math.round((+horas || 4) * 60);
    const hh = (x) => String(Math.floor(x / 60) % 24).padStart(2, '0') + String(x % 60).padStart(2, '0') + '00';
    const dFim = fimMin >= 1440 ? String(addDays(data, 1)).replace(/-/g, '') : d;   /* passou da meia-noite */
    datas = `${d}T${hh(h * 60 + m)}/${dFim}T${hh(fimMin)}`;
  } else datas = `${d}/${String(addDays(data, 1)).replace(/-/g, '')}`;   /* dia inteiro */
  const q = new URLSearchParams({ action: 'TEMPLATE', text: titulo, dates: datas, ctz: (typeof GUIA_CFG !== 'undefined' && GUIA_CFG.fuso) || 'Europe/London' });
  if (local) q.set('location', local);
  if (detalhes) q.set('details', detalhes);
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
function gcalReserva(b) {
  const x = Tours.get(b.tourId) || { name: { pt: 'Tour' }, meeting: '' };
  return linkGoogleAgenda({ titulo: `${tl(x.name)} — ${primeiroNome(b.name)} (${b.pax} pax)`, data: b.date, hora: b.time, horas: b.horas || (x.type === 'consult' ? 1 : Array.isArray(x.horas) ? x.horas[0] : 4),
    local: noIdioma(x.meeting), detalhes: `Reserva ${b.code} · Lovely London\n${linkApp('voucher/' + b.code)}` });
}
function gcalTrabalho(j) {
  return linkGoogleAgenda({ titulo: `${agenciaDe(j.agencia).nome}: ${j.servico} (${j.pax} pax)`, data: j.data, detalhes: `Trabalho de agência · ${j.cliente || ''}` });
}

/* =====================================================
   RESERVAS: botão de voucher em cada reserva
   AJUSTES: as regras da Lovely London
   ===================================================== */
const _admBookingsBase = admBookings;
admBookings = function () {
  _admBookingsBase();
  DB.bookings.forEach(b => {
    const cx = document.getElementById('ta-' + b.id);
    if (cx && !cx.querySelector('.vchLink')) cx.insertAdjacentHTML('beforeend', `<a class="mini vchLink" href="#/voucher/${esc(b.code)}">🎟 Voucher</a>`
      + (b.status === 'confirmed' ? `<a class="mini gcal" target="_blank" rel="noopener" href="${esc(gcalReserva(b))}">📅 Google Agenda</a>` : ''));
  });
};
const _admSettingsBase = admSettings;
admSettings = function () {
  _admSettingsBase();
  const stage = $('#stage'); if (!stage) return;
  const st = DB.settings, pr = st.precosRoteiro || {};
  const h1 = stage.querySelector('.pageh'); if (!h1) return;
  h1.insertAdjacentHTML('afterend', `<section class="card" id="regrasLL"><h3>Regras da Lovely London</h3>
    <div class="frow"><label class="fld">Sinal para reservar (%)<input type="number" id="rgSinal" min="0" max="100" value="${sinalPct()}"></label>
      <label class="fld">Tolerância de atraso (min)<input type="number" id="rgTol" value="${esc(st.tolerancia || 30)}"></label>
      <label class="fld">Hora extra (£)<input type="number" id="rgHora" value="${esc(st.horaExtra || 70)}"></label></div>
    <label class="pdCheck"><input type="checkbox" id="rgDia" ${diaExclusivo() ? 'checked' : ''}> Um grupo por dia (desligue no alto verão para abrir manhã e tarde)</label>
    <p class="rotMini">"Monte seu roteiro" — preço por dia</p>
    <div class="frow"><label class="fld">Dia a dia (£)<input type="number" id="rgP1" value="${esc(pr.arquivo || 0)}"></label><label class="fld">+ mapa (£)<input type="number" id="rgP2" value="${esc(pr.mapa || 0)}"></label><label class="fld">Imersivo (£)<input type="number" id="rgP3" value="${esc(pr.imersivo || 0)}"></label></div>
    <label class="fld">Termos e condições <small class="why">uma regra por linha — vão junto do preço, no checkout e no voucher</small><textarea id="rgTermos" rows="7">${esc(termosLista().join('\n'))}</textarea></label>
    <p class="why">📅 Google Agenda: hoje, o botão 📅 em cada reserva e em cada trabalho de agência abre o evento já preenchido — é só salvar. No app no ar, isso fica automático (e o que você marcar lá bloqueia o dia aqui).</p>
    <button class="cta sm" id="rgSalva">Salvar regras</button></section>`);
  $('#rgSalva').onclick = () => {
    st.sinalPct = Math.max(0, Math.min(100, +$('#rgSinal').value || 30)); st.tolerancia = +$('#rgTol').value || 30; st.horaExtra = +$('#rgHora').value || 0;
    st.diaExclusivo = $('#rgDia').checked;
    st.precosRoteiro = { arquivo: +$('#rgP1').value || 0, mapa: +$('#rgP2').value || 0, imersivo: +$('#rgP3').value || 0 };
    st.termos = { pt: $('#rgTermos').value.split('\n').map(s => s.trim()).filter(Boolean), en: (st.termos && st.termos.en) || [] };
    save(); toast('Regras salvas ✓');
  };
};

if (typeof module !== 'undefined') module.exports = { prazoInvoice, conflitoDoDia, msgLembrete };

/* =====================================================
   eBOOKS DE PRESENTE — dentro de "Cupons e brindes" (07/10/2026)
   A Carol escolhe um guia e manda o link de presente (WhatsApp/e-mail/copiar).
   Quem abre o link vê o guia COMPLETO (o link libera tudo no aparelho dele).
   ===================================================== */
const _admCouponsEbooks = admCoupons;
admCoupons = function () {
  _admCouponsEbooks();
  const stage = document.getElementById('stage'); if (!stage || document.getElementById('ebGiftCard')) return;
  if (typeof ebooksLista !== 'function') return;
  const guias = ebooksLista();
  const opts = guias.map(g => `<option value="${esc(g.id)}">${esc(g.titulo)}</option>`).join('');
  stage.insertAdjacentHTML('beforeend', `<section class="card" id="ebGiftCard">
    <h3>📚 Enviar um guia de Londres de presente</h3>
    <p class="why">Mande um dos eBooks completos pra quem você quiser — cliente ou não. Quem abrir o link vê o guia inteiro.</p>
    <div class="frow">
      <label class="fld">Guia<select id="ebgSel">${opts}</select></label>
      <label class="fld">Para quem <small class="why">opcional, só pra personalizar</small><input id="ebgNome" placeholder="nome"></label>
      <label class="fld">WhatsApp <small class="why">opcional</small><input id="ebgWa" placeholder="+55…"></label>
    </div>
    <div class="tacts"><a class="cta sm" id="ebgWaBtn" target="_blank" rel="noopener">📲 Enviar no WhatsApp</a>
      <a class="mini" id="ebgMail" target="_blank" rel="noopener">✉️ Por e-mail</a>
      <button class="mini" id="ebgCopy" type="button">Copiar o link</button>
      <a class="mini" id="ebgVer" target="_blank" rel="noopener">👁 Ver o guia</a></div>
    <p class="why" id="ebgMsg"></p>
  </section>`);
  const g = document.getElementById('ebGiftCard');
  const monta = () => {
    const id = g.querySelector('#ebgSel').value;
    const tit = (guias.find(x => x.id === id) || {}).titulo || 'guia de Londres';
    const nome = g.querySelector('#ebgNome').value.trim();
    const link = ebookLinkPresente(id);
    const ola = nome ? `Oi, ${nome}! ` : 'Oi! ';
    const texto = `${ola}Aqui é a Carol, da Lovely London 😊 Preparei um presente pra você: o meu guia *${tit}*, completo. É só abrir: ${link}`;
    const wa = g.querySelector('#ebgWa').value.replace(/\D/g, '');
    g.querySelector('#ebgWaBtn').href = (typeof waLink === 'function') ? waLink(texto, wa) : ('https://wa.me/' + wa + '?text=' + encodeURIComponent(texto));
    g.querySelector('#ebgMail').href = 'mailto:?subject=' + encodeURIComponent('Seu guia de Londres — presente da Carol') + '&body=' + encodeURIComponent(texto);
    g.querySelector('#ebgVer').href = '#/g/' + id;
    g._link = link;
  };
  monta();
  ['#ebgSel', '#ebgNome', '#ebgWa'].forEach(sel => { const el = g.querySelector(sel); el.oninput = monta; el.onchange = monta; });
  g.querySelector('#ebgCopy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(g._link).then(() => { g.querySelector('#ebgMsg').textContent = 'Link copiado ✓ — cole onde quiser.'; }); };
};

/* =====================================================
   PAINEL LATERAL — agrupar as 20 abas por assunto (UI/UX, 28/09)
   A lista corrida cansava. Aqui os botões são reagrupados sob títulos,
   sem reordenar o ADM_TABS nem mexer no roteador: só movo os botões no
   DOM (o onclick fica no próprio botão, então continua funcionando) e
   ponho um rótulo antes de cada grupo. Aba que eu não listar (ou futura)
   vai para "Mais", nunca some.
   ===================================================== */
const NAV_GRUPOS = [
  ['Dia a dia', ['today', 'tarefas', 'agenda']],
  ['Passeios e reservas', ['tours', 'pontos', 'bookings', 'roteiros']],
  ['Clientes', ['clients', 'avaliacoes']],
  ['Agências e pedidos', ['agencias', 'emails', 'transfer']],
  ['Dinheiro', ['financeiro', 'money', 'extrato', 'reports']],
  ['Crescer', ['atendimento', 'inbox', 'marketing', 'coupons']],
  ['Configurar', ['look', 'settings']],
];
const _admShellBase = admShell;
admShell = function (tab, inner) {
  _admShellBase(tab, inner);
  const nav = document.querySelector('.rail nav'); if (!nav || nav.dataset.agrupado) return;
  const botoes = {};
  nav.querySelectorAll('.nb[data-tab]').forEach(b => { botoes[b.dataset.tab] = b; });
  const usados = new Set();
  nav.innerHTML = '';
  const grupo = (titulo, ids) => {
    const nos = ids.map(id => botoes[id]).filter(Boolean); if (!nos.length) return;
    const h = document.createElement('p'); h.className = 'navRot'; h.textContent = titulo; nav.appendChild(h);
    nos.forEach(b => { nav.appendChild(b); usados.add(b.dataset.tab); });
  };
  NAV_GRUPOS.forEach(([t2, ids]) => grupo(t2, ids));
  const sobra = Object.values(botoes).filter(b => !usados.has(b.dataset.tab));
  if (sobra.length) { const h = document.createElement('p'); h.className = 'navRot'; h.textContent = 'Mais'; nav.appendChild(h); sobra.forEach(b => nav.appendChild(b)); }
  nav.dataset.agrupado = '1';
};
