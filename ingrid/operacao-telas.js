/* =====================================================
   OPERACAO — as telas (pedido de 28/09/2026)

   HOJE         a planilha dela, em cartoes: cliente, voo, quem faz,
                quanto paga no dia e para quem. Busca de emergencia.
   GUIAS        quem esta livre, por preferencia; perguntar pelo WhatsApp;
                escalar; a semana de cada guia.
   FICHA        tudo de um cliente num lugar so (#/adm/clients/<chave>).
   CONTABILIDADE  por conta, Brasil de um lado, Europa do outro; acertos.
   SOB CONSULTA   pedidos -> orcamento com termos -> reservas.
   VOUCHER / ORCAMENTO  paginas para imprimir (PDF) ou mandar no WhatsApp.
   MEU PEDIDO   (cliente) junta varios servicos num pedido so.

   Carrega ANTES do app.js: aqui so ha funcoes; elas usam $, esc, eur,
   admShell... na hora em que sao chamadas, quando o app.js ja rodou.
   ===================================================== */
'use strict';

const L = (pt, en) => (LANG === 'en' ? en : pt);
const OP_ICO = { transfer: '🚐', walk: '🏛️', day: '🚗', papal: '⛪', conexao: '🚢', trem: '🚆' };
function opNomeServ(b) { const x = Tours.get(b.tourId); return x ? (x.name[LANG] || x.name.pt) : '?'; }
function opNum(n) { return String(n || '').replace(/\D/g, ''); }
function opCurta(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
function opFicha(b) { return '#/adm/clients/' + encodeURIComponent(chaveCliente(b)); }
function opPapel(b) {
  const x = Tours.get(b.tourId);
  return x && (x.priceMode === 'transfer' || x.type === 'transfer') ? 'motorista' : 'guia';
}
function opPrimeiro(n) { return String(n || '').split(' ')[0]; }
function opBaixa(nome, linhas) {
  const csv = linhas.map(l => l.map(v => String(v ?? '').replace(/;/g, ',').replace(/\n/g, ' ')).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function opCopia(txt) {
  try { await navigator.clipboard.writeText(txt); toast(L('Copiado', 'Copied')); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(L('Copiado', 'Copied')); }
}
function opContaOpts(sel) {
  const g = (pais, rot) => {
    const cs = Contas.all().filter(c => c.pais === pais);
    return cs.length ? `<optgroup label="${rot}">${cs.map(c => `<option value="${esc(c.id)}" ${sel === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</optgroup>` : '';
  };
  return g('brasil', 'Brasil') + g('europa', 'Europa')
    + `<optgroup label="Fora do seu caixa"><option value="${CONTA_PRESTADOR}" ${sel === CONTA_PRESTADOR ? 'selected' : ''}>Pago no dia direto ao guia/motorista</option></optgroup>`;
}

/* A mensagem para quem vai fazer o servico — "manda um WhatsApp aqui
   dentro mesmo pro motorista". Tudo que a guia precisa saber, sem ligar. */
function opMsgPrestador(b) {
  const nd = Op.noDia(b);
  const linhas = [
    `Oi ${opPrimeiro((Equipe.get(b.prestadorId) || {}).nome)}! Confirmando o serviço:`,
    `• ${opNomeServ(b)}`,
    `• ${fmtDate(b.date)} às ${b.time} · ${b.pax} ${b.pax > 1 ? 'pessoas' : 'pessoa'}${b.veiculo ? ' · ' + b.veiculo : ''}`,
    `• Cliente: ${b.name}${b.whats ? ' · ' + b.whats : ''}`,
  ];
  if (b.voo) linhas.push(`• Voo/trem: ${b.voo}`);
  if (b.origem) linhas.push(`• Buscar em: ${b.origem}`);
  if (b.destino) linhas.push(`• Levar para: ${b.destino}`);
  if (nd.valor > 0 && nd.para === 'prestador') linhas.push(`• O cliente paga a você no dia: ${eur(nd.valor)}`);
  else linhas.push('• O cliente não paga nada no dia (já está tudo pago comigo).');
  if (b.obsOp) linhas.push(`• Obs.: ${b.obsOp}`);
  linhas.push('', 'Obrigada! ' + guiaNome());
  return linhas.join('\n');
}

/* =====================================================
   O CARTAO DE UM SERVICO — usado no Hoje, na ficha e na busca
===================================================== */
function opCardServico(b, o) {
  o = o || {};
  const x = Tours.get(b.tourId);
  const ico = (x && OP_ICO[x.type]) || '📌';
  const pres = b.prestadorId ? Equipe.get(b.prestadorId) : null;
  const papel = opPapel(b);
  const nd = Op.noDia(b);
  const pago = Bookings.paid(b);
  let din;
  if (b.status === 'cancelled') din = `<span class="pill n">${L('Cancelado', 'Cancelled')}</span>`;
  else if (nd.valor <= 0) din = `<span class="svc-din ok">✓ Tudo pago · ${eur(pago)}</span>`;
  else if (nd.para === 'prestador') din = `<span class="svc-din warn">💶 Paga no dia: <b>${eur(nd.valor)}</b> ${pres ? 'para ' + esc(opPrimeiro(pres.nome)) : (papel === 'motorista' ? 'ao motorista' : 'à guia')}
      <small>já pagou ${eur(pago)} de ${eur(b.total)}</small></span>`;
  else din = `<span class="svc-din bad">Falta pagar a você: <b>${eur(nd.valor)}</b>
      <small>já pagou ${eur(pago)} de ${eur(b.total)} · até ${fmtDate(Bookings.dueDate(b))}</small></span>`;

  const presLinha = pres
    ? `<span>👤 ${papel === 'motorista' ? 'Motorista' : 'Guia'}: <b>${esc(pres.nome)}</b>
        ${pres.whats ? `<a class="mini wa-mini" target="_blank" rel="noopener" href="${waLink(opMsgPrestador(b), opNum(pres.whats))}">💬 mandar o serviço</a>` : ''}</span>`
    : (b.status !== 'cancelled' ? `<span class="svc-alerta">⚠ Sem ${papel} — <a href="#/adm/guias/servico:${esc(b.id)}">achar ${papel === 'motorista' ? 'motorista' : 'guia'}</a></span>` : '');
  const grupo = (b.group || []).length ? `<span>👥 com ${b.group.map(g => esc(opPrimeiro(g.nome))).join(', ')}</span>` : '';
  const trajeto = (b.origem || b.destino) ? `<span>📍 ${esc(b.origem || '?')}${b.destino ? ' → ' + esc(b.destino) : ''}</span>` : '';
  const cliWa = b.whats ? `<a class="mini" target="_blank" rel="noopener" href="${waLink(t('waHi', { name: opPrimeiro(b.name), tour: opNomeServ(b), when: fmtDate(b.date) + ' ' + b.time }), opNum(b.whats))}">WhatsApp</a>` : '';

  return `<article class="svc ${b.status === 'cancelled' ? 'cancel' : ''}" id="svc-${esc(b.id)}">
    <div class="svc-hora"><b>${esc(b.time)}</b>${o.comData ? `<small>${opCurta(b.date)}</small>` : `<small>${turnoNome(turnoDaHora(b.time))}</small>`}</div>
    <div class="svc-corpo">
      <div class="svc-top">${ico} <b>${esc(opNomeServ(b))}</b> <small>· ${b.pax} ${b.pax > 1 ? 'pessoas' : 'pessoa'}${b.veiculo ? ' · ' + esc(b.veiculo) : ''} · <span class="mono">${esc(b.code)}</span></small></div>
      <div class="svc-cli"><a href="${opFicha(b)}">${esc(b.name)}</a> ${cliWa}</div>
      <div class="svc-linhas">
        ${b.voo ? `<span>✈ ${esc(b.voo)}</span>` : ''}${trajeto}${grupo}
        ${presLinha}
        ${din}
        ${b.obsOp ? `<span class="svc-obs">📝 ${esc(b.obsOp)}</span>` : ''}
      </div>
      <div class="tacts">
        <a class="mini" href="${opFicha(b)}">Ficha</a>
        <a class="mini" href="#/adm/voucher/${esc(b.id)}">Voucher</a>
        ${b.status !== 'cancelled' && Bookings.due(b) > 0 ? `<button class="mini strong" data-abre="pg-${esc(b.id)}">Registrar pagamento</button>` : ''}
        <button class="mini" data-abre="dt-${esc(b.id)}">Detalhes</button>
      </div>
      ${opFormPagamento(b)}
      ${opFormDetalhes(b)}
    </div>
  </article>`;
}
function opFormPagamento(b) {
  const due = Bookings.due(b);
  if (b.status === 'cancelled' || due <= 0) return '';
  const sug = (!Bookings.paid(b) && b.sinal) ? Math.min(b.sinal, due) : due;
  return `<div class="svc-form" id="pg-${esc(b.id)}" hidden>
    <div class="frow">
      <label class="fld">Valor recebido<input type="number" min="0" step="0.01" id="pgv-${esc(b.id)}" value="${sug}"></label>
      <label class="fld">Onde caiu<select id="pgc-${esc(b.id)}">${opContaOpts(Op.restoPara(b) === 'prestador' && Bookings.paid(b) > 0 ? CONTA_PRESTADOR : 'nubank')}</select></label>
      <label class="fld">Data<input type="date" id="pgd-${esc(b.id)}" value="${isoToday()}"></label>
    </div>
    <p class="why">Falta ${eur(due)}. A conta decide se vai para o contador do Brasil ou da Europa. "Pago direto ao guia/motorista" não entra no seu caixa.</p>
    <button class="cta sm" data-pgok="${esc(b.id)}">Registrar</button>
  </div>`;
}
function opFormDetalhes(b) {
  const opts = (tipo) => Equipe.all(tipo).map(p => `<option value="${esc(p.id)}" ${b.prestadorId === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('');
  return `<div class="svc-form" id="dt-${esc(b.id)}" hidden>
    <div class="frow">
      <label class="fld">Voo / trem<input id="dtv-${esc(b.id)}" value="${esc(b.voo || '')}" placeholder="AZ 673 · chega 14:40"></label>
      <label class="fld">Buscar em / encontro<input id="dto-${esc(b.id)}" value="${esc(b.origem || '')}" placeholder="Fiumicino T3"></label>
      <label class="fld">Levar para<input id="dtd-${esc(b.id)}" value="${esc(b.destino || '')}" placeholder="Hotel, endereço"></label>
    </div>
    <div class="frow">
      <label class="fld">Quem faz<select id="dtp-${esc(b.id)}"><option value="">— ninguém ainda —</option>
        <optgroup label="Guias">${opts('guia')}</optgroup><optgroup label="Motoristas">${opts('motorista')}</optgroup></select></label>
      <label class="fld">Você paga a quem faz (€)<input type="number" min="0" id="dtc-${esc(b.id)}" value="${+b.custo || ''}" placeholder="0"></label>
      <label class="fld">O resto é pago<select id="dtr-${esc(b.id)}">
        <option value="" ${!b.restoPara ? 'selected' : ''}>automático (${Op.restoPara(Object.assign({}, b, { restoPara: '' })) === 'prestador' ? 'no dia, a quem faz' : 'a você'})</option>
        <option value="prestador" ${b.restoPara === 'prestador' ? 'selected' : ''}>no dia, a quem faz o serviço</option>
        <option value="ingrid" ${b.restoPara === 'ingrid' ? 'selected' : ''}>a você (você acerta com quem faz)</option></select></label>
    </div>
    <label class="fld">Observação da operação<textarea id="dtn-${esc(b.id)}" rows="2">${esc(b.obsOp || '')}</textarea></label>
    <button class="cta sm" data-dtok="${esc(b.id)}">Salvar</button>
  </div>`;
}
function opLigaCards(redesenha) {
  $$('[data-abre]').forEach(btn => btn.onclick = () => {
    const el = document.getElementById(btn.dataset.abre);
    if (el) { el.hidden = !el.hidden; if (!el.hidden) { const i = el.querySelector('input,select'); if (i) i.focus(); } }
  });
  $$('[data-pgok]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.pgok;
    const p = registraPagamento(id, { valor: +$('#pgv-' + id).value, conta: $('#pgc-' + id).value, data: $('#pgd-' + id).value });
    if (!p) return toast('Valor inválido (maior que zero e até o que falta).');
    toast(`${eur(p.amount)} registrado · ${Contas.nome(p.conta)}`);
    redesenha();
  });
  $$('[data-dtok]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.dtok;
    Op.detalhes(id, { voo: $('#dtv-' + id).value, origem: $('#dto-' + id).value, destino: $('#dtd-' + id).value,
      prestadorId: $('#dtp-' + id).value, custo: $('#dtc-' + id).value, restoPara: $('#dtr-' + id).value, obsOp: $('#dtn-' + id).value });
    toast('Salvo');
    redesenha();
  });
}

/* =====================================================
   HOJE — a planilha de 15 anos, agora no app
===================================================== */
function admHoje(arg) {
  const hoje = isoToday();
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : hoje;
  const lista = Op.doDia(dia);
  const late = Bookings.all().filter(b => b.status === 'confirmed' && Bookings.due(b) > 0 && Op.restoPara(b) === 'ingrid' && Bookings.dueDate(b) < hoje);
  const semPres = Op.semPrestador(3);
  const novos = Orc.all().filter(o => o.status === 'novo').length
    + Roteiros.all().filter(p => !p.respondido && !(DB.orcamentos || []).some(o => o.pedidoId === p.id)).length;
  const noDia = lista.reduce((s, b) => { const n = Op.noDia(b); return s + (n.para === 'prestador' ? n.valor : 0); }, 0);
  const pax = lista.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (+b.pax || 0), 0);
  const dias = [[hoje, 'Hoje'], [addDays(hoje, 1), 'Amanhã'], [addDays(hoje, 2), 'Depois de amanhã']];
  admShell('today', `
    <div class="pagehead"><h1 class="pageh">${dia === hoje ? t('goodMorning') : 'Dia ' + opCurta(dia)}</h1>
      <div class="chips">
        ${dias.map(([d, l]) => `<button class="chip ${d === dia ? 'on' : ''}" data-dia="${d}">${l}</button>`).join('')}
        <button class="mini" data-dia="${addDays(dia, -1)}" aria-label="dia anterior">←</button>
        <input type="date" id="hjData" class="op-date" value="${dia}" aria-label="escolher dia">
        <button class="mini" data-dia="${addDays(dia, 1)}" aria-label="próximo dia">→</button>
      </div></div>
    <div class="op-busca">
      <input id="hjBusca" type="search" autocomplete="off" placeholder="🔎 Emergência? Nome do cliente, voo, código ou telefone">
      <div id="hjRes"></div>
    </div>
    ${dia === hoje && (late.length || semPres.length || novos) ? `<div class="op-pend">
      ${novos ? `<a class="alert warn" href="#/adm/consulta">🧾 ${novos} ${novos > 1 ? 'pedidos esperando orçamento' : 'pedido esperando orçamento'} →</a>` : ''}
      ${semPres.length ? `<a class="alert warn" href="#/adm/guias">👤 ${semPres.length} ${semPres.length > 1 ? 'serviços' : 'serviço'} sem guia/motorista nos próximos 3 dias →</a>` : ''}
      ${late.length ? `<a class="alert bad" href="#/adm/bookings">⚠ ${late.length} ${late.length > 1 ? 'pagamentos atrasados' : 'pagamento atrasado'} · ${eur(late.reduce((s, b) => s + Bookings.due(b), 0))} →</a>` : ''}
    </div>` : ''}
    <p class="op-resumo"><b>${fmtDate(dia)}</b> · ${lista.length} ${lista.length === 1 ? 'serviço' : 'serviços'} · ${pax} pessoas${noDia ? ` · <b>${eur(noDia)}</b> pagos no dia a guias e motoristas` : ''}</p>
    ${lista.length ? lista.map(b => opCardServico(b)).join('')
      : `<div class="emptybox"><p>Nenhum serviço neste dia.</p><a class="mini" href="#/adm/consulta">Ver pedidos sob consulta</a></div>`}
  `);
  const vai = (d) => go('/adm/today/' + d);
  $$('[data-dia]').forEach(b => b.onclick = () => vai(b.dataset.dia));
  $('#hjData').onchange = (e) => { if (e.target.value) vai(e.target.value); };
  const res = $('#hjRes');
  $('#hjBusca').oninput = (e) => {
    const r = Op.busca(e.target.value).slice(0, 8);
    res.innerHTML = r.length ? `<div class="op-resbusca">${r.map(b => `<button class="op-achado" data-ir="${esc(b.id)}">
        <b>${esc(b.name)}</b><small>${fmtDate(b.date)} ${esc(b.time)} · ${esc(opNomeServ(b))}${b.voo ? ' · ✈ ' + esc(b.voo) : ''} · ${esc(b.code)}</small></button>`).join('')}</div>`
      : (e.target.value.trim().length >= 2 ? '<p class="why">Nada encontrado.</p>' : '');
    $$('[data-ir]', res).forEach(btn => btn.onclick = () => {
      const b = Bookings.get(btn.dataset.ir);
      admHoje._foco = b.id; vai(b.date);
    });
  };
  opLigaCards(() => admHoje(dia));
  if (admHoje._foco) {
    const el = document.getElementById('svc-' + admHoje._foco);
    admHoje._foco = null;
    if (el) { el.classList.add('foco'); setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60); }
  }
  Coach.start([
    { sel: '#hjBusca',     audio: 'adm-5', txt: { pt: 'Emergência: digite um pedaço do nome, o voo ou o telefone e o serviço aparece na hora.', en: 'Emergency: type part of the name, the flight or the phone and the service shows up at once.' } },
    { sel: '#nb-guias',    audio: 'adm-6', txt: { pt: 'Suas guias e motoristas: quem está livre, por preferência, e o WhatsApp pronto para perguntar.', en: 'Your guides and drivers: who is free, by preference, with the WhatsApp message ready.' } },
    { sel: '#nb-consulta', audio: 'adm-7', txt: { pt: 'Pedidos sob consulta: o app deixa o orçamento pronto, você confere e manda.', en: 'Quote requests: the app drafts the quote, you check and send it.' } },
    { sel: '#nb-money',    audio: 'adm-8', txt: { pt: 'Contabilidade: cada conta no seu lado — Brasil para um contador, Europa para o outro.', en: 'Accounting: each account on its side — Brazil for one accountant, Europe for the other.' } },
  ], 'tutorialAdm');
}

/* =====================================================
   GUIAS — bater a agenda delas com os passeios
===================================================== */
function admGuias(arg) {
  const S = admGuias._s = admGuias._s || { data: addDays(isoToday(), 1), turno: 'manha', cidade: 'Roma', tipo: 'guia', servico: '', sem: isoToday(), ed: '' };
  if (arg && arg.startsWith('servico:')) {
    const b = Bookings.get(arg.slice(8));
    if (b) {
      const x = Tours.get(b.tourId), tt = turnosDoServico(b);
      S.servico = b.id; S.data = b.date; S.turno = tt.length > 1 ? 'dia' : tt[0];
      S.tipo = opPapel(b);
      S.cidade = x && (x.region === 'roma' || x.region === 'transfer') ? 'Roma' : '';
    }
    history.replaceState(null, '', '#/adm/guias');
  }
  const doDia = Op.doDia(S.data);
  if (S.servico && !doDia.some(b => b.id === S.servico)) S.servico = '';
  const serv = S.servico ? Bookings.get(S.servico) : null;
  const r = Disp.quem({ data: S.data, turno: S.turno, cidade: S.cidade, tipo: S.tipo });
  const cidades = Equipe.cidades();
  const turnoTxt = S.turno === 'manha' ? 'de manhã' : S.turno === 'tarde' ? 'à tarde' : S.turno === 'noite' ? 'à noite' : 'o dia inteiro';
  const msgPara = (p) => serv
    ? `Oi ${opPrimeiro(p.nome)}! Tudo bem? Você tem disponibilidade dia ${opCurta(S.data)} ${turnoTxt} para ${opNomeServ(serv)}? São ${serv.pax} ${serv.pax > 1 ? 'pessoas' : 'pessoa'}, às ${serv.time}. Se puder, me diz até que horas você fica livre. Obrigada! ${guiaNome()}`
    : `Oi ${opPrimeiro(p.nome)}! Tudo bem? Você tem disponibilidade dia ${opCurta(S.data)} ${turnoTxt}${S.cidade ? ' em ' + S.cidade : ''}? Me diz até que horas você fica livre. Obrigada! ${guiaNome()}`;

  const linha = (it, i) => {
    const p = it.p;
    const pill = it.estado === 'livre' ? `<span class="pill ok">✓ livre${it.nota ? ' · ' + esc(it.nota) : ''}</span>`
      : it.estado === 'ocupada' ? `<span class="pill bad">✕ ocupada${it.servico ? ' · ' + esc(opNomeServ(it.servico)) + ' ' + esc(it.servico.time) : it.nota ? ' · ' + esc(it.nota) : ''}</span>`
      : '<span class="pill n">não perguntei</span>';
    const podeEscalar = serv && it.estado !== 'ocupada' && serv.prestadorId !== p.id;
    return `<div class="gl-row ${it.estado}">
      <span class="gl-pref">${i}</span>
      <div class="gl-nome"><b>${esc(p.nome)}</b><small>${esc((p.cidades || []).join(', '))}${p.idiomas ? ' · ' + esc(p.idiomas) : ''}</small></div>
      ${pill}
      <div class="tacts">
        ${p.whats ? `<a class="mini cta-ish" target="_blank" rel="noopener" href="${waLink(msgPara(p), opNum(p.whats))}">💬 Perguntar</a>` : ''}
        ${it.servico ? '' : `<button class="mini" data-mk="${esc(p.id)}|livre">Livre</button>
        <button class="mini" data-mk="${esc(p.id)}|ocupada">Ocupada</button>
        ${it.estado ? `<button class="mini ghost" data-mk="${esc(p.id)}|">Limpar</button>` : ''}`}
        ${podeEscalar ? `<button class="mini strong" data-esc="${esc(p.id)}">Escalar</button>` : ''}
        ${serv && serv.prestadorId === p.id ? '<span class="pill ok">escalada neste serviço</span>' : ''}
      </div>
    </div>`;
  };
  const ordem = (lista, off) => lista.map((it, k) => linha(it, off + k + 1)).join('');

  /* a semana: gente x dias x turnos, como a planilha dela */
  const dias7 = Array.from({ length: 7 }, (_, i) => addDays(S.sem, i));
  const tts = ['manha', 'tarde', 'noite'];
  const gente = Equipe.all(S.tipo).filter(p => Equipe.atende(p, S.cidade));
  const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const grade = `<div class="gsem-wrap"><table class="gsem"><thead>
      <tr><th></th>${dias7.map(d => `<th colspan="3" class="${d === S.data ? 'on' : ''}">${WD[new Date(d + 'T12:00:00').getDay()]} ${opCurta(d)}</th>`).join('')}</tr>
      <tr><th></th>${dias7.map(() => tts.map(tu => `<th class="tu">${tu === 'manha' ? 'M' : tu === 'tarde' ? 'T' : 'N'}</th>`).join('')).join('')}</tr></thead>
    <tbody>${gente.map(p => `<tr><th class="gnome">${esc(opPrimeiro(p.nome))}</th>${dias7.map(d => tts.map(tu => {
      const e = Disp.estado(p.id, d, tu);
      const tit = e.servico ? opNomeServ(e.servico) + ' ' + e.servico.time + ' · ' + e.servico.name : (e.nota || '');
      return `<td class="gc ${e.estado} ${e.servico ? 'serv' : ''}" data-gc="${esc(p.id)}|${d}|${tu}" title="${esc(tit)}">${e.estado === 'livre' ? '✓' : e.estado === 'ocupada' ? (e.servico ? '●' : '✕') : '·'}</td>`;
    }).join('')).join('')}</tr>`).join('') || `<tr><td class="why" colspan="22">Ninguém cadastrado ${S.cidade ? 'em ' + esc(S.cidade) : ''}.</td></tr>`}</tbody></table></div>`;

  const semP = Op.semPrestador(14);
  const ed = S.ed ? Equipe.get(S.ed) : null;

  admShell('guias', `
    <div class="pagehead"><h1 class="pageh">Guias e motoristas</h1>
      <div class="chips">
        <button class="chip ${S.tipo === 'guia' ? 'on' : ''}" data-tipo="guia">Guias</button>
        <button class="chip ${S.tipo === 'motorista' ? 'on' : ''}" data-tipo="motorista">Motoristas</button>
      </div></div>

    <section class="card">
      <h3>Quem está livre?</h3>
      <div class="frow">
        <label class="fld">Dia<input type="date" id="gqData" value="${S.data}"></label>
        <label class="fld">Turno<select id="gqTurno">${[...TURNOS.map(x => x[0]), 'dia'].map(tu => `<option value="${tu}" ${S.turno === tu ? 'selected' : ''}>${turnoNome(tu)}</option>`).join('')}</select></label>
        <label class="fld">Cidade<select id="gqCid"><option value="">Todas</option>${cidades.map(c => `<option ${S.cidade === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      </div>
      <label class="fld">Para qual serviço (opcional)<select id="gqServ"><option value="">— só perguntar a disponibilidade —</option>
        ${doDia.map(b => `<option value="${esc(b.id)}" ${S.servico === b.id ? 'selected' : ''}>${esc(b.time)} · ${esc(opNomeServ(b))} · ${esc(b.name)} (${b.pax}p)${b.prestadorId ? ' — com ' + esc(opPrimeiro((Equipe.get(b.prestadorId) || {}).nome)) : ' — sem ' + opPapel(b)}</option>`).join('')}</select></label>
      ${serv && serv.prestadorId ? `<div class="alert">✓ ${esc(opNomeServ(serv))} já está com <b>${esc((Equipe.get(serv.prestadorId) || {}).nome || '')}</b>
        <a class="mini cta-ish" target="_blank" rel="noopener" href="${waLink(opMsgPrestador(serv), opNum((Equipe.get(serv.prestadorId) || {}).whats))}">💬 mandar o serviço</a>
        <button class="mini ghost" data-desescala="1">tirar</button></div>` : ''}

      <div class="gl-grupo"><span class="op-lbl">Livres · por preferência</span>${r.livres.length ? ordem(r.livres, 0) : '<p class="why">Ninguém confirmou ainda.</p>'}</div>
      <div class="gl-grupo"><span class="op-lbl">Sem resposta</span>${r.semResposta.length ? ordem(r.semResposta, r.livres.length) : '<p class="why">—</p>'}
        ${r.semResposta.filter(it => it.p.whats).length > 1 ? `<button class="mini" id="gqTodas">💬 Perguntar a todas de uma vez (${r.semResposta.filter(it => it.p.whats).length})</button>` : ''}
        <div id="gqLote"></div></div>
      <div class="gl-grupo"><span class="op-lbl">Ocupadas</span>${r.ocupadas.length ? ordem(r.ocupadas, r.livres.length + r.semResposta.length) : '<p class="why">—</p>'}</div>
    </section>

    <section class="card">
      <div class="pagehead"><h3 style="margin:0;flex:1">A semana${S.cidade ? ' · ' + esc(S.cidade) : ''}</h3>
        <div class="chips" style="margin:0">
          <button class="mini" id="gsPrev">←</button><button class="mini" id="gsHoje">esta semana</button><button class="mini" id="gsNext">→</button></div></div>
      <p class="why">Toque num quadrinho para marcar: · não perguntei → ✓ livre → ✕ ocupada. ● é serviço que você já passou para ela.</p>
      ${grade}
    </section>

    <section class="card">
      <h3>Serviços sem guia ou motorista · próximos 14 dias</h3>
      ${semP.length ? semP.map(b => `<div class="deprow"><b class="mono">${opCurta(b.date)} ${esc(b.time)}</b>
        <span>${esc(opNomeServ(b))} · ${esc(b.name)} · ${b.pax}p</span>
        <a class="mini strong" href="#/adm/guias/servico:${esc(b.id)}">achar ${opPapel(b)}</a></div>`).join('') : '<p class="why">Tudo escalado. 👏</p>'}
    </section>

    <section class="card">
      <h3>${ed ? 'Editar ' + esc(ed.nome) : 'Cadastrar ' + (S.tipo === 'motorista' ? 'motorista' : 'guia')}</h3>
      <div class="frow">
        <label class="fld">Nome<input id="geNome" value="${esc(ed ? ed.nome : '')}"></label>
        <label class="fld">WhatsApp<input id="geWa" value="${esc(ed ? ed.whats : '')}" placeholder="+39 ..."></label>
        <label class="fld">É<select id="geTipo"><option value="guia" ${(ed ? ed.tipo : S.tipo) === 'guia' ? 'selected' : ''}>Guia</option><option value="motorista" ${(ed ? ed.tipo : S.tipo) === 'motorista' ? 'selected' : ''}>Motorista / parceiro de transfer</option></select></label>
      </div>
      <div class="frow">
        <label class="fld">Cidades que atende<input id="geCid" value="${esc(ed ? (ed.cidades || []).join(', ') : (S.cidade || 'Roma'))}" placeholder="Roma, Florença"></label>
        <label class="fld">Idiomas<input id="geIdi" value="${esc(ed ? ed.idiomas : '')}" placeholder="português, italiano"></label>
      </div>
      <label class="fld">Observação<input id="geObs" value="${esc(ed ? ed.obs : '')}" placeholder="ex.: ótima com crianças, não faz Vaticano"></label>
      <div class="btnrow"><button class="cta sm" id="geSalva">${ed ? 'Salvar' : 'Cadastrar'}</button>${ed ? '<button class="mini" id="geCancela">cancelar</button>' : ''}</div>
      <div class="rulesep"></div>
      <span class="op-lbl">Ordem de preferência — ${S.tipo === 'motorista' ? 'motoristas' : 'guias'}</span>
      ${Equipe.all(S.tipo).map((p, i) => `<div class="gl-row">
        <span class="gl-pref">${i + 1}</span>
        <div class="gl-nome"><b>${esc(p.nome)}</b><small>${esc((p.cidades || []).join(', '))}${p.whats ? ' · ' + esc(p.whats) : ''}${p.obs ? ' · ' + esc(p.obs) : ''}</small></div>
        <div class="tacts"><button class="mini" data-mv="${esc(p.id)}|-1" aria-label="subir">↑</button><button class="mini" data-mv="${esc(p.id)}|1" aria-label="descer">↓</button>
          <button class="mini" data-ed="${esc(p.id)}">editar</button><button class="mini danger" data-rm="${esc(p.id)}">remover</button></div>
      </div>`).join('') || '<p class="why">Ninguém cadastrado ainda.</p>'}
    </section>`);

  const re = () => admGuias();
  $$('[data-tipo]').forEach(b => b.onclick = () => { S.tipo = b.dataset.tipo; S.servico = ''; re(); });
  $('#gqData').onchange = (e) => { S.data = e.target.value || S.data; S.servico = ''; re(); };
  $('#gqTurno').onchange = (e) => { S.turno = e.target.value; re(); };
  $('#gqCid').onchange = (e) => { S.cidade = e.target.value; re(); };
  $('#gqServ').onchange = (e) => {
    S.servico = e.target.value;
    const b = Bookings.get(S.servico);
    if (b) { const tt = turnosDoServico(b); S.turno = tt.length > 1 ? 'dia' : tt[0]; S.tipo = opPapel(b); }
    re();
  };
  $$('[data-mk]').forEach(b => b.onclick = () => {
    const [id, estado] = b.dataset.mk.split('|');
    Disp.marca(id, S.data, S.turno, estado, estado === 'livre' ? (prompt('Até que horas? (opcional)') || '') : estado === 'ocupada' ? '' : '');
    re();
  });
  $$('[data-esc]').forEach(b => b.onclick = () => {
    Op.escala(S.servico, b.dataset.esc);
    const p = Equipe.get(b.dataset.esc);
    toast(`${opNomeServ(serv)} → ${p.nome}. Mande o serviço pelo WhatsApp.`);
    re();
  });
  $('[data-desescala]')?.addEventListener('click', () => { Op.escala(S.servico, ''); re(); });
  const lote = $('#gqTodas');
  if (lote) lote.onclick = () => {
    const alvo = r.semResposta.filter(it => it.p.whats);
    $('#gqLote').innerHTML = `<div class="gq-lote"><p class="why">O WhatsApp não deixa mandar para várias pessoas com um toque só: abra uma por uma (cada botão já leva a mensagem escrita) ou copie o texto para a sua lista de transmissão.</p>
      <div class="tacts">${alvo.map(it => `<a class="mini cta-ish" target="_blank" rel="noopener" href="${waLink(msgPara(it.p), opNum(it.p.whats))}">💬 ${esc(opPrimeiro(it.p.nome))}</a>`).join('')}
      <button class="mini" id="gqCopia">copiar a mensagem</button></div></div>`;
    $('#gqCopia').onclick = () => opCopia(msgPara({ nome: '' }).replace('Oi !', 'Oi!'));
  };
  $$('[data-gc]').forEach(td => td.onclick = () => {
    const [id, d, tu] = td.dataset.gc.split('|');
    const e = Disp.estado(id, d, tu);
    if (e.servico) return toast(`Ocupada: ${opNomeServ(e.servico)} ${e.servico.time} · ${e.servico.name}`);
    Disp.marca(id, d, tu, e.estado === '' ? 'livre' : e.estado === 'livre' ? 'ocupada' : '', e.nota || '');
    re();
  });
  $('#gsPrev').onclick = () => { S.sem = addDays(S.sem, -7); re(); };
  $('#gsNext').onclick = () => { S.sem = addDays(S.sem, 7); re(); };
  $('#gsHoje').onclick = () => { S.sem = isoToday(); re(); };
  $('#geSalva').onclick = () => {
    const p = Equipe.salva({ id: S.ed, nome: $('#geNome').value, whats: $('#geWa').value, tipo: $('#geTipo').value,
      cidades: $('#geCid').value, idiomas: $('#geIdi').value, obs: $('#geObs').value });
    if (!p) { $('#geNome').focus(); return toast('Falta o nome.'); }
    toast(S.ed ? 'Salvo' : `${p.nome} cadastrada`);
    S.ed = ''; S.tipo = p.tipo; re();
  };
  $('#geCancela')?.addEventListener('click', () => { S.ed = ''; re(); });
  $$('[data-mv]').forEach(b => b.onclick = () => { const [id, d] = b.dataset.mv.split('|'); Equipe.move(id, +d); re(); });
  $$('[data-ed]').forEach(b => b.onclick = () => { S.ed = b.dataset.ed; re(); setTimeout(() => $('#geNome').scrollIntoView({ block: 'center' }), 30); });
  $$('[data-rm]').forEach(b => b.onclick = () => {
    const p = Equipe.get(b.dataset.rm);
    if (p && confirm(`Remover ${p.nome}? Os serviços com ela ficam sem ${p.tipo}.`)) { Equipe.remove(p.id); re(); }
  });
}

/* =====================================================
   FICHA DO CLIENTE
===================================================== */
function admFicha(chave) {
  const k = decodeURIComponent(chave || '');
  const c = Clients.all().find(x => x.key === k);
  let reservas;
  if (k.startsWith('g:')) {
    const nome = k.slice(2);
    reservas = DB.bookings.filter(b => (b.group || []).some(g => String(g.nome || '').trim().toLowerCase() === nome));
  } else reservas = Fichas.reservas(k);
  reservas = reservas.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const base = c || (reservas[0] ? { name: reservas[0].name, email: reservas[0].email, whats: reservas[0].whats, insta: reservas[0].insta } : null);
  if (!base) { admShell('clients', '<h1 class="pageh">Cliente não encontrado</h1><a class="mini" href="#/adm/clients">← clientes</a>'); return; }
  const f = Fichas.get(k);
  const { pedidos, orcamentos } = Fichas.doCliente(k, base.whats, base.email);
  const ativas = reservas.filter(b => b.status !== 'cancelled');
  const total = ativas.reduce((s, b) => s + (+b.total || 0), 0);
  const pago = ativas.reduce((s, b) => s + Bookings.paid(b), 0);
  const pend = ativas.reduce((s, b) => s + Bookings.due(b), 0);
  const hoje = isoToday();
  const futuras = ativas.filter(b => b.date >= hoje).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const passadas = reservas.filter(b => !(b.status !== 'cancelled' && b.date >= hoje));
  const grupo = new Map();
  for (const b of reservas) for (const g of b.group || []) if (g.nome) grupo.set(g.nome, g.nasc || '');
  const pgs = reservas.flatMap(b => (b.payments || []).map(p => ({ ...p, b }))).sort((a, b) => b.date.localeCompare(a.date));
  const tags = String(f.tags || '').split(',').map(s => s.trim()).filter(Boolean);

  admShell('clients', `
    <a class="linkbtn" href="#/adm/clients">← clientes</a>
    <section class="card ficha-top">
      <div class="ficha-id">
        <h1 class="pageh" style="margin:0">${esc(base.name)}</h1>
        <div class="chips" style="margin:6px 0 0">${tags.map(tg => `<span class="pill conta">${esc(tg)}</span>`).join('')}
          ${c && c.acompanhante ? `<span class="pill">${t('grpCameWith', { n: esc(c.veioCom || '') })}</span>` : ''}
          ${c && c.tours > 1 ? `<span class="pill ok">${t('clRepeat', { n: c.tours })}</span>` : ''}</div>
      </div>
      <div class="tacts">
        ${base.whats ? `<a class="mini cta-ish" target="_blank" rel="noopener" href="${waLink(t('waHi', { name: opPrimeiro(base.name), tour: '', when: '' }), opNum(base.whats))}">WhatsApp ${esc(base.whats)}</a>` : ''}
        ${base.email ? `<a class="mini" href="mailto:${esc(base.email)}">${esc(base.email)}</a>` : ''}
        ${base.insta ? `<a class="mini" target="_blank" rel="noopener" href="https://instagram.com/${esc(String(base.insta).replace(/^@/, ''))}">@${esc(String(base.insta).replace(/^@/, ''))}</a>` : ''}
      </div>
      <div class="kpis">
        <div class="kpi"><small>Serviços</small><b>${ativas.length}</b></div>
        <div class="kpi"><small>Total</small><b>${eur(total)}</b></div>
        <div class="kpi"><small>Já pagou</small><b>${eur(pago)}</b></div>
        <div class="kpi"><small>Falta</small><b>${eur(pend)}</b></div>
      </div>
    </section>
    <div class="two-col">
      <div>
        <section class="card"><h3>Próximos serviços</h3>
          ${futuras.length ? futuras.map(b => opCardServico(b, { comData: true })).join('') : '<p class="why">Nenhum serviço marcado.</p>'}
        </section>
        ${passadas.length ? `<details class="card"><summary><b>Histórico · ${passadas.length}</b></summary>
          ${passadas.map(b => `<div class="deprow"><b class="mono">${opCurta(b.date)}</b><span>${esc(opNomeServ(b))} · ${b.pax}p${b.status === 'cancelled' ? ' · cancelado' : ''}</span><b class="mono">${eur(b.total)}</b></div>`).join('')}
        </details>` : ''}
        <section class="card"><h3>Pagamentos</h3>
          ${pgs.length ? `<table class="tbl"><thead><tr><th>Data</th><th>Serviço</th><th>Conta</th><th class="right">Valor</th></tr></thead><tbody>
            ${pgs.map(p => `<tr><td class="mono">${opCurta(p.date)}</td><td>${esc(opNomeServ(p.b))}</td>
              <td>${esc(Contas.nome(p.conta) || formaPg(p.method))} <small class="why">${ladoDoPagamento(p) === 'brasil' ? '🇧🇷' : ladoDoPagamento(p) === 'europa' ? '🇪🇺' : '(com o prestador)'}</small></td>
              <td class="mono right">${eur(p.amount)}</td></tr>`).join('')}</tbody></table>` : '<p class="why">Nenhum pagamento registrado.</p>'}
        </section>
      </div>
      <div>
        <section class="card"><h3>Anotações</h3>
          <label class="fld">Etiquetas<input id="fcTags" value="${esc(f.tags || '')}" placeholder="VIP, vegana, alergia a lactose, indicação da Patrícia"></label>
          <label class="fld">O que você sabe dele<textarea id="fcNotas" rows="7" placeholder="Gostos, restrições, como chegou, o que já comprou fora do app...">${esc(f.notas || '')}</textarea></label>
          <button class="cta sm" id="fcSalva">Salvar anotações</button>
        </section>
        ${grupo.size ? `<section class="card"><h3>Quem vem junto</h3>
          ${[...grupo].map(([n, nasc]) => `<div class="deprow"><a href="#/adm/clients/${encodeURIComponent('g:' + n.toLowerCase())}">${esc(n)}</a>${nasc ? `<small class="mono">${esc(nasc)}</small>` : ''}</div>`).join('')}
        </section>` : ''}
        <section class="card"><h3>Pedidos e orçamentos</h3>
          ${orcamentos.map(o => `<div class="deprow"><a href="#/adm/consulta/${esc(o.id)}">${esc(o.num)}</a><span>${o.itens.length} itens · ${eur(Orc.total(o))}</span>${opOrcPill(o)}</div>`).join('')}
          ${pedidos.map(p => `<div class="deprow"><span>🗺️ Monte seu roteiro · ${p.ini ? opCurta(p.ini) : ''}</span><span class="pill ${p.respondido ? 'ok' : 'warn'}">${p.respondido ? 'respondido' : 'novo'}</span></div>`).join('')}
          ${!orcamentos.length && !pedidos.length ? '<p class="why">Nenhum.</p>' : ''}
          <button class="mini" id="fcOrc">+ novo orçamento para ${esc(opPrimeiro(base.name))}</button>
        </section>
      </div>
    </div>`);
  $('#fcSalva').onclick = () => { Fichas.salva(k, { notas: $('#fcNotas').value, tags: $('#fcTags').value }); toast('Anotações salvas'); admFicha(chave); };
  $('#fcOrc').onclick = () => {
    const o = Orc.cria({ origem: 'manual', status: 'rascunho', clienteKey: k, cliente: { nome: base.name, whats: base.whats, email: base.email } });
    go('/adm/consulta/' + o.id);
  };
  opLigaCards(() => admFicha(chave));
}

/* =====================================================
   CONTABILIDADE
===================================================== */
function admContabilidade() {
  const S = admContabilidade._s = admContabilidade._s || { mes: isoToday().slice(0, 7), ano: false };
  const hoje = isoToday();
  const de = S.ano ? S.mes.slice(0, 4) + '-01-01' : S.mes + '-01';
  const ate = S.ano ? S.mes.slice(0, 4) + '-12-31' : addDays(addDays(S.mes + '-28', 4).slice(0, 7) + '-01', -1);
  const rows = extratoContas(de, ate);
  const lado = (l) => rows.filter(r => r.lado === l);
  const soma = (a) => a.reduce((s, r) => s + r.amount, 0);
  const br = lado('brasil'), eu = lado('europa'), pr = lado('prestador');
  const porConta = {};
  for (const r of rows) { const k = r.conta || ('metodo:' + r.method); (porConta[k] = porConta[k] || { n: 0, v: 0, lado: r.lado, nome: r.conta ? Contas.nome(r.conta) : formaPg(r.method) + ' (sem conta)' }); porConta[k].n++; porConta[k].v += r.amount; }
  const ac = acertos(de, ate);
  const KIND = { full: 'integral', deposit: 'sinal/parcial', balance: 'restante' };
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const titulo = S.ano ? 'Ano de ' + S.mes.slice(0, 4) : MESES[+S.mes.slice(5, 7) - 1] + ' de ' + S.mes.slice(0, 4);
  const tabela = (lista, vazio) => lista.length ? `<table class="tbl"><thead><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Tipo</th><th>Conta</th><th class="right">Valor</th></tr></thead>
    <tbody>${lista.map(r => `<tr><td class="mono">${r.date}</td><td>${esc(r.client)}</td><td>${esc(opNomeServ(r))}</td><td>${KIND[r.kind] || r.kind}</td>
      <td>${esc(r.conta ? Contas.nome(r.conta) : formaPg(r.method))}</td><td class="mono right">${eur(r.amount)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="5"><b>Total</b></td><td class="mono right"><b>${eur(soma(lista))}</b></td></tr></tfoot></table>` : `<p class="empty">${vazio}</p>`;

  admShell('money', `
    <div class="pagehead"><h1 class="pageh">Contabilidade · ${titulo}</h1>
      <div class="chips">
        <button class="mini" id="ctPrev">←</button>
        <button class="chip ${!S.ano && S.mes === hoje.slice(0, 7) ? 'on' : ''}" id="ctEste">este mês</button>
        <button class="chip ${S.ano ? 'on' : ''}" id="ctAno">o ano</button>
        <button class="mini" id="ctNext">→</button>
        <button class="mini" id="ctPrint">imprimir / PDF</button>
      </div></div>
    <div class="kpis">
      <div class="kpi"><small>🇧🇷 Brasil</small><b>${eur(soma(br))}</b></div>
      <div class="kpi"><small>🇪🇺 Europa</small><b>${eur(soma(eu))}</b></div>
      <div class="kpi"><small>Recebido direto por guias/motoristas</small><b>${eur(soma(pr))}</b></div>
    </div>
    <section class="card">
      <h3>Por conta</h3>
      ${Object.keys(porConta).length ? `<table class="tbl"><thead><tr><th>Conta</th><th>Lado</th><th class="right">Pagamentos</th><th class="right">Total</th></tr></thead><tbody>
        ${Object.values(porConta).sort((a, b) => b.v - a.v).map(c => `<tr><td>${esc(c.nome)}</td><td>${c.lado === 'brasil' ? '🇧🇷 Brasil' : c.lado === 'europa' ? '🇪🇺 Europa' : 'fora do caixa'}</td><td class="right">${c.n}</td><td class="mono right">${eur(c.v)}</td></tr>`).join('')}
      </tbody></table>` : '<p class="empty">Nenhum pagamento no período.</p>'}
      <p class="why">As contas (Nubank, Wise, Revolut...) e de que lado cada uma fica estão em Ajustes → Suas contas.</p>
    </section>
    <section class="card">
      <div class="pagehead"><span class="seclabel" style="flex:1">🇪🇺 Para o contador da Europa</span><button class="mini" id="csvEu">baixar planilha (CSV)</button></div>
      ${tabela(eu, 'Nada entrou nas contas europeias no período.')}
    </section>
    <section class="card">
      <div class="pagehead"><span class="seclabel" style="flex:1">🇧🇷 Para o contador do Brasil</span><button class="mini" id="csvBr">baixar planilha (CSV)</button></div>
      ${tabela(br, 'Nada entrou nas contas brasileiras no período.')}
    </section>
    <section class="card">
      <h3>Acerto com guias e motoristas</h3>
      <p class="why">"Custo" é o que você paga a quem fez o serviço (preencha em Detalhes, no cartão do serviço). O que a pessoa recebeu do cliente no dia já conta como pagamento a ela.</p>
      ${ac.length ? `<table class="tbl"><thead><tr><th>Dia</th><th>Quem</th><th>Serviço</th><th class="right">Custo</th><th class="right">Recebeu do cliente</th><th>Acerto</th><th></th></tr></thead><tbody>
        ${ac.map(a => `<tr class="${a.acertado ? 'ok' : ''}"><td class="mono">${opCurta(a.b.date)}</td><td>${esc(a.pessoa ? a.pessoa.nome : '?')}</td><td>${esc(opNomeServ(a.b))} · ${esc(a.b.name)}</td>
          <td class="mono right">${a.custo ? eur(a.custo) : '—'}</td><td class="mono right">${eur(a.comPrestador)}</td>
          <td>${!a.custo ? '<small class="why">falta o custo</small>' : a.saldo > 0 ? `você paga <b>${eur(a.saldo)}</b>` : a.saldo < 0 ? `devolve a você <b>${eur(-a.saldo)}</b>` : 'zerado'}</td>
          <td>${a.custo ? `<button class="mini ${a.acertado ? '' : 'strong'}" data-acert="${esc(a.b.id)}|${a.acertado ? '0' : '1'}">${a.acertado ? '✓ acertado' : 'marcar acertado'}</button>` : ''}</td></tr>`).join('')}
      </tbody></table>` : '<p class="empty">Nenhum serviço com guia ou motorista no período.</p>'}
      <div class="btnrow"><button class="mini" id="csvAc">baixar acertos (CSV)</button><button class="mini" id="csvTudo">baixar tudo (CSV)</button></div>
    </section>`);
  const mudaMes = (n) => { const d = new Date(S.mes + '-15T12:00:00'); d.setMonth(d.getMonth() + (S.ano ? n * 12 : n)); S.mes = d.toISOString().slice(0, 7); admContabilidade(); };
  $('#ctPrev').onclick = () => mudaMes(-1);
  $('#ctNext').onclick = () => mudaMes(1);
  $('#ctEste').onclick = () => { S.mes = hoje.slice(0, 7); S.ano = false; admContabilidade(); };
  $('#ctAno').onclick = () => { S.ano = !S.ano; admContabilidade(); };
  $('#ctPrint').onclick = () => print();
  const cab = ['Data', 'Cliente', 'Serviço', 'Tipo', 'Conta', 'Lado', 'Valor (EUR)', 'Código'];
  const lin = (l) => l.map(r => [r.date, r.client, opNomeServ(r), KIND[r.kind] || r.kind, r.conta ? Contas.nome(r.conta) : formaPg(r.method), r.lado, String(r.amount).replace('.', ','), r.code]);
  $('#csvEu').onclick = () => opBaixa(`contador-europa-${de}-a-${ate}.csv`, [cab, ...lin(eu)]);
  $('#csvBr').onclick = () => opBaixa(`contador-brasil-${de}-a-${ate}.csv`, [cab, ...lin(br)]);
  $('#csvTudo').onclick = () => opBaixa(`recebimentos-${de}-a-${ate}.csv`, [cab, ...lin(rows)]);
  $('#csvAc').onclick = () => opBaixa(`acertos-${de}-a-${ate}.csv`, [['Dia', 'Quem', 'Serviço', 'Cliente', 'Custo', 'Recebeu do cliente', 'Saldo (positivo = você paga)', 'Acertado'],
    ...ac.map(a => [a.b.date, a.pessoa ? a.pessoa.nome : '', opNomeServ(a.b), a.b.name, a.custo, a.comPrestador, a.saldo, a.acertado ? 'sim' : 'não'])]);
  $$('[data-acert]').forEach(b => b.onclick = () => { const [id, v] = b.dataset.acert.split('|'); marcaAcertado(id, v === '1'); admContabilidade(); });
}

/* =====================================================
   SOB CONSULTA — pedidos e orcamentos
===================================================== */
function opOrcPill(o) {
  const st = ORC_STATUS.find(s => s[0] === o.status) || ORC_STATUS[0];
  const cl = { novo: 'warn', rascunho: 'warn', enviado: 'n', fechado: 'ok', perdido: 'bad' }[o.status] || 'n';
  return `<span class="pill ${cl}">${L(st[1], st[2])}</span>`;
}
const ORIGEM_ORC = { whats: '💬 WhatsApp', site: '🧾 pelo app', roteiro: '🗺️ Monte seu roteiro', manual: '✍️ você' };
function admConsulta(arg) {
  if (arg) return admOrcEditor(arg);
  const S = admConsulta._s = admConsulta._s || { f: 'abertos' };
  const todos = Orc.all();
  const lista = S.f === 'abertos' ? todos.filter(o => ['novo', 'rascunho', 'enviado'].includes(o.status))
    : S.f === 'todos' ? todos : todos.filter(o => o.status === S.f);
  const rotSemOrc = Roteiros.all().filter(p => !todos.some(o => o.pedidoId === p.id));
  admShell('consulta', `
    <div class="pagehead"><h1 class="pageh">Sob consulta</h1>
      <div class="chips">
        ${[['abertos', 'Em aberto'], ['fechado', 'Fechados'], ['perdido', 'Não fecharam'], ['todos', 'Todos']].map(([v, l]) =>
          `<button class="chip ${S.f === v ? 'on' : ''}" data-f="${v}">${l}</button>`).join('')}
      </div></div>
    <p class="why">O app lê o pedido e deixa o orçamento montado com os preços da sua tabela. <b>Nada vai para o cliente sem você conferir e mandar.</b></p>

    <details class="card" ${todos.length ? '' : 'open'}>
      <summary><b>+ Novo pedido</b> <small class="why">cole a conversa do WhatsApp ou comece em branco</small></summary>
      <label class="fld">Conversa do WhatsApp / Instagram / e-mail<textarea id="ccTxt" rows="6" placeholder="Cole aqui a conversa inteira. O app tira nome, telefone, datas, quantas pessoas, cidades e serviços."></textarea></label>
      <div class="btnrow"><button class="cta sm" id="ccLer">Ler e montar o rascunho</button><button class="mini" id="ccBranco">começar em branco</button></div>
      <div id="ccPrev"></div>
    </details>

    ${rotSemOrc.length ? `<section class="card"><h3>🗺️ Monte seu roteiro · ${rotSemOrc.length} ${rotSemOrc.length > 1 ? 'pedidos' : 'pedido'}</h3>
      ${rotSemOrc.map(p => `<div class="orc-row">
        <div class="tinfo"><b>${esc(p.nome)}</b><small>${[p.ini && opCurta(p.ini), p.fim && opCurta(p.fim)].filter(Boolean).join(' → ')} · ${p.adultos} adultos${p.criancas ? ' + ' + p.criancas + ' crianças' : ''} · ${(p.onde || []).join(', ')}${p.modo === 'consultoria' ? ' · <b>consultoria</b>' : ''}</small></div>
        <button class="mini strong" data-rot="${esc(p.id)}">Montar orçamento</button>
      </div>`).join('')}</section>` : ''}

    <section class="card">
      ${lista.length ? lista.map(o => `<a class="orc-row" href="#/adm/consulta/${esc(o.id)}">
        <div class="tinfo"><b>${esc(o.cliente.nome || 'Sem nome')}</b>
          <small><span class="mono">${esc(o.num)}</span> · ${ORIGEM_ORC[o.origem] || o.origem} · ${new Date(o.criado).toLocaleDateString('pt-BR')} ${new Date(o.criado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
          ${o.resumo ? `<small>${esc(o.resumo)}</small>` : ''}</div>
        <b class="mono">${o.itens.length ? eur(Orc.total(o)) : '—'}</b>${opOrcPill(o)}
      </a>`).join('') : '<p class="empty">Nenhum pedido aqui.</p>'}
    </section>`);
  $$('[data-f]').forEach(b => b.onclick = () => { S.f = b.dataset.f; admConsulta(); });
  $('#ccBranco').onclick = () => { const o = Orc.cria({ origem: 'manual', status: 'rascunho' }); go('/adm/consulta/' + o.id); };
  $('#ccLer').onclick = () => {
    const txt = $('#ccTxt').value;
    if (!txt.trim()) return toast('Cole a conversa primeiro.');
    const c = lerConversa(txt);
    const itens = rascunhoDaConversa(c);
    $('#ccPrev').innerHTML = `<div class="cc-lido">
      <p><b>O que o app entendeu</b> — confira:</p>
      <ul><li>Nome: <b>${esc(c.nome || '?')}</b></li><li>WhatsApp: <b>${esc(c.whats || '?')}</b></li>
        <li>Resumo: ${esc(c.resumo || '—')}</li><li>Rascunho: ${itens.length} ${itens.length === 1 ? 'serviço' : 'serviços'} com preço da tabela</li></ul>
      <button class="cta sm" id="ccCria">Criar o orçamento</button></div>`;
    $('#ccCria').onclick = () => {
      const o = Orc.cria({ origem: 'whats', status: 'rascunho', cliente: { nome: c.nome, whats: c.whats }, conversa: txt, resumo: c.resumo, pax: c.pax, datas: c.datas, itens });
      go('/adm/consulta/' + o.id);
    };
  };
  $$('[data-rot]').forEach(b => b.onclick = () => {
    const p = (DB.pedidos || []).find(x => x.id === b.dataset.rot); if (!p) return;
    const o = Orc.cria({ origem: 'roteiro', status: 'rascunho', pedidoId: p.id, cliente: { nome: p.nome, whats: p.whats, email: p.email },
      resumo: msgRoteiro(p).split('\n').slice(1, 6).join(' · '), itens: rascunhoDoRoteiro(p), pax: (+p.adultos || 0) + (+p.criancas || 0) });
    go('/adm/consulta/' + o.id);
  });
}

function opMsgOrc(o) {
  const nome = opPrimeiro(o.cliente.nome) || '';
  const tot = Orc.total(o), sin = Orc.sinal(o);
  const l = [`Olá${nome ? ' ' + nome : ''}! Segue o seu orçamento ${o.num} — ${guiaNegocio()}`, ''];
  o.itens.forEach((i, n) => l.push(`${n + 1}. ${i.desc}${i.data ? ' — ' + opCurta(i.data) + (i.hora ? ' ' + i.hora : '') : ''} · ${i.pax} ${i.pax > 1 ? 'pessoas' : 'pessoa'} — ${i.valor ? eur(i.valor) : 'a definir'}`));
  l.push('', `Total: ${eur(tot)}`);
  if (sin) l.push(`Para reservar: sinal de ${eur(sin)}. O restante (${eur(Math.max(0, tot - sin))}) é pago no dia, a quem faz cada serviço.`);
  const formas = [DB.settings.pixKey && 'Pix', DB.settings.wiseLink && 'Wise', DB.settings.iban && 'transferência (IBAN)'].filter(Boolean);
  if (formas.length) l.push('Formas de pagamento: ' + formas.join(' · '));
  l.push(`Orçamento válido até ${opCurta(o.validade)}.`);
  if (o.termos) l.push('', 'Ao pagar o sinal você declara que leu e aceita os termos e condições:', termosTexto().replace(/^MODELO.*\n\n?/, ''));
  l.push('', guiaNome());
  return l.join('\n');
}

function admOrcEditor(id) {
  const o = Orc.get(id);
  if (!o) { go('/adm/consulta'); return; }
  const tours = Tours.all();
  const tot = Orc.total(o), sin = Orc.sinal(o);
  const linhaItem = (i) => `<div class="orc-item ${i.sugestao ? 'sug' : ''}" data-item="${esc(i.id)}">
    <div class="frow">
      <label class="fld grow">Serviço<input data-k="desc" value="${esc(i.desc)}"></label>
      <label class="fld">Dia<input type="date" data-k="data" value="${esc(i.data)}"></label>
      <label class="fld sm">Hora<input data-k="hora" value="${esc(i.hora)}" placeholder="09:00"></label>
      <label class="fld sm">Pessoas<input type="number" min="1" data-k="pax" value="${i.pax}"></label>
      <label class="fld sm">Valor €<input type="number" min="0" data-k="valor" value="${i.valor}"></label>
      <label class="fld sm">Sinal €<input type="number" min="0" data-k="sinal" value="${i.sinal ?? ''}" placeholder="${Orc.sinalDoItem(o, i)}"></label>
      ${(Tours.get(i.tourId) || {}).priceMode === 'transfer' ? `<label class="fld sm">Voo / trem<input data-k="voo" value="${esc(i.voo || '')}" placeholder="AZ 673"></label>` : ''}
    </div>
    <div class="orc-item-pe">
      ${i.tourId ? `<small class="why">da tabela: ${esc((Tours.get(i.tourId) || { name: { pt: '?' } }).name.pt)}</small>` : '<small class="why">item avulso (não vira reserva)</small>'}
      ${i.sugestao ? '<span class="pill warn">sugestão do app — confira</span>' : ''}
      <input class="orc-obs" data-k="obs" value="${esc(i.obs)}" placeholder="observação para o cliente">
      ${i.tourId ? `<button class="mini" data-recalc="${esc(i.id)}">preço da tabela</button>` : ''}
      <button class="mini danger" data-rmi="${esc(i.id)}">tirar</button>
    </div>
  </div>`;
  admShell('consulta', `
    <a class="linkbtn" href="#/adm/consulta">← sob consulta</a>
    <div class="pagehead"><h1 class="pageh">${esc(o.num)} ${opOrcPill(o)}</h1>
      <div class="chips">
        <a class="mini" href="#/adm/orcdoc/${esc(o.id)}">ver / imprimir PDF</a>
        ${o.cliente.whats ? `<a class="mini cta-ish" id="orWa" target="_blank" rel="noopener" href="${waLink(opMsgOrc(o), opNum(o.cliente.whats))}">💬 mandar no WhatsApp</a>` : ''}
        <button class="mini" id="orCopia">copiar texto</button>
      </div></div>
    ${o.conversa || o.resumo ? `<details class="card"><summary><b>O pedido</b> <small class="why">${esc(o.resumo || '')}</small></summary>
      ${o.conversa ? `<pre class="pdmsg">${esc(o.conversa)}</pre>` : ''}</details>` : ''}
    <section class="card">
      <h3>Cliente</h3>
      <div class="frow">
        <label class="fld">Nome<input id="orNome" value="${esc(o.cliente.nome)}"></label>
        <label class="fld">WhatsApp<input id="orWhats" value="${esc(o.cliente.whats)}"></label>
        <label class="fld">E-mail<input id="orEmail" value="${esc(o.cliente.email)}"></label>
      </div>
    </section>
    <section class="card">
      <h3>Serviços</h3>
      <div id="orItens">${o.itens.map(linhaItem).join('') || '<p class="why">Nenhum serviço ainda.</p>'}</div>
      <div class="frow orc-add">
        <label class="fld grow">Acrescentar da sua tabela<select id="orAddT"><option value="">escolha…</option>
          ${regioes().map(([rg, pt]) => { const ts = tours.filter(x => x.region === rg); return ts.length ? `<optgroup label="${esc(pt)}">${ts.map(x => `<option value="${esc(x.id)}">${esc(x.name.pt)}</option>`).join('')}</optgroup>` : ''; }).join('')}
        </select></label>
        <label class="fld sm">Pessoas<input type="number" min="1" id="orAddP" value="${o.pax || 2}"></label>
        <label class="fld">Dia<input type="date" id="orAddD"></label>
        <button class="mini strong" id="orAdd">+ acrescentar</button>
        <button class="mini" id="orAvulso">+ item avulso</button>
      </div>
    </section>
    <section class="card">
      <div class="frow">
        <label class="fld sm">Sinal (% nos passeios)<input type="number" min="0" max="100" id="orPct" value="${o.sinalPct}"></label>
        <label class="fld">Válido até<input type="date" id="orVal" value="${esc(o.validade)}"></label>
        <label class="fld">Situação<select id="orSt">${ORC_STATUS.map(s => `<option value="${s[0]}" ${o.status === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}</select></label>
      </div>
      <label class="optin"><input type="checkbox" id="orTermos" ${o.termos ? 'checked' : ''}><span><b>Incluir os termos e condições</b><small>Pagou o sinal = aceitou. Edite os seus em Ajustes.${DB.settings.termos && DB.settings.termos.pt ? '' : ' <b>Hoje ainda é o MODELO.</b>'}</small></span></label>
      <label class="fld">Observações para o cliente<textarea id="orObs" rows="2">${esc(o.obs)}</textarea></label>
      <div class="orc-tot"><span>Total <b>${eur(tot)}</b></span><span>Sinal <b>${eur(sin)}</b></span><span>No dia <b>${eur(Math.max(0, tot - sin))}</b></span></div>
      <div class="btnrow"><button class="cta sm" id="orSalva">Salvar</button><button class="mini danger" id="orApaga">apagar</button></div>
    </section>
    ${o.status !== 'fechado' ? `<section class="card orc-fecha">
      <h3>Fechou?</h3>
      <p class="why">Cada serviço da sua tabela vira uma reserva, com o cliente, o dia e o sinal. Aparece no Hoje, na agenda e na ficha dele.</p>
      <label class="optin"><input type="checkbox" id="orSinalOk" checked><span><b>O sinal de ${eur(sin)} já caiu</b><small>registra o pagamento na conta abaixo</small></span></label>
      <label class="fld">Conta<select id="orConta">${opContaOpts('nubank')}</select></label>
      <button class="cta sm" id="orFecha">Fechou — criar as reservas</button>
    </section>` : `<section class="card"><h3>✓ Fechado${o.fechadoEm ? ' em ' + opCurta(o.fechadoEm) : ''}</h3>
      ${(o.bookingIds || []).map(bid => Bookings.get(bid)).filter(Boolean).map(b => opCardServico(b, { comData: true })).join('')}</section>`}`);

  const lerTela = () => {
    o.cliente = { nome: $('#orNome').value.trim(), whats: $('#orWhats').value.trim(), email: $('#orEmail').value.trim() };
    o.itens = o.itens.map(i => {
      const el = document.querySelector(`[data-item="${i.id}"]`); if (!el) return i;
      const v = (k) => el.querySelector(`[data-k="${k}"]`).value;
      return { ...i, desc: v('desc'), data: v('data'), hora: v('hora'), pax: +v('pax') || 1, valor: +v('valor') || 0,
               sinal: v('sinal') === '' ? null : +v('sinal'), obs: v('obs'),
               voo: el.querySelector('[data-k="voo"]') ? v('voo') : (i.voo || '') };
    });
    o.sinalPct = +$('#orPct').value || 0; o.validade = $('#orVal').value; o.status = $('#orSt').value;
    o.termos = $('#orTermos').checked; o.obs = $('#orObs').value;
    if (o.status === 'novo') o.status = 'rascunho';
    Orc.salva(o);
  };
  const re = () => admOrcEditor(id);
  $('#orSalva').onclick = () => { lerTela(); toast('Orçamento salvo'); re(); };
  $('#orCopia').onclick = () => { lerTela(); opCopia(opMsgOrc(Orc.get(id))); };
  const wa = $('#orWa');
  if (wa) wa.onclick = () => { lerTela(); wa.href = waLink(opMsgOrc(Orc.get(id)), opNum(o.cliente.whats)); if (o.status !== 'fechado') { o.status = 'enviado'; Orc.salva(o); setTimeout(re, 300); } };
  $('#orApaga').onclick = () => { if (confirm('Apagar este orçamento?')) { Orc.remove(id); go('/adm/consulta'); } };
  $('#orAdd').onclick = () => {
    const tid = $('#orAddT').value; if (!tid) return toast('Escolha um serviço.');
    lerTela();
    const it = Orc.itemDoCatalogo(tid, { pax: +$('#orAddP').value || 1, data: $('#orAddD').value });
    o.itens.push(it); Orc.salva(o); re();
  };
  $('#orAvulso').onclick = () => { lerTela(); o.itens.push(Orc._item({ desc: 'Roteiro com consultoria de especialista', pax: o.pax || 2 })); Orc.salva(o); re(); };
  $$('[data-rmi]').forEach(b => b.onclick = () => { lerTela(); o.itens = o.itens.filter(i => i.id !== b.dataset.rmi); Orc.salva(o); re(); });
  $$('[data-recalc]').forEach(b => b.onclick = () => {
    lerTela();
    const i = o.itens.find(z => z.id === b.dataset.recalc);
    const n = Orc.itemDoCatalogo(i.tourId, { pax: i.pax, data: i.data, hora: i.hora, opcao: i.opcao });
    Object.assign(i, { valor: n.valor, sinal: n.sinal }); Orc.salva(o); re();
  });
  $('#orFecha')?.addEventListener('click', () => {
    lerTela();
    if (!o.cliente.nome) { $('#orNome').focus(); return toast('Falta o nome do cliente.'); }
    const semData = o.itens.filter(i => i.tourId && !i.data);
    if (semData.length) return toast('Falta o dia em ' + semData.map(i => i.desc).join(', '));
    const bs = Orc.fecha(id, { sinalRecebido: $('#orSinalOk').checked, conta: $('#orConta').value });
    toast(`${bs.length} ${bs.length === 1 ? 'reserva criada' : 'reservas criadas'} 🎉`);
    re();
  });
  opLigaCards(re);
}

/* =====================================================
   DOCUMENTOS — voucher e orcamento, para imprimir ou mandar
===================================================== */
function opDoc(titulo, corpo, acoes) {
  document.body.classList.add('em-adm');
  app.innerHTML = `<div class="doc-barra">
      <button class="mini" id="docVolta">← voltar</button>
      ${acoes || ''}
      <button class="cta sm" id="docPrint">imprimir / salvar PDF</button>
    </div>
    <article class="doc">
      <header class="doc-cab">${logoFull({ mark: 34 })}<div><b>${esc(titulo)}</b><small>${esc(guiaNegocio())} · ${esc(guiaNome())}${DB.settings.whats ? ' · WhatsApp ' + esc(DB.settings.whats) : ''}</small></div></header>
      ${corpo}
    </article>`;
  $('#docVolta').onclick = () => history.length > 1 ? history.back() : go('/adm/today');
  $('#docPrint').onclick = () => print();
}
function opVoucherTexto(b) {
  const x = Tours.get(b.tourId);
  const nd = Op.noDia(b);
  const pres = b.prestadorId ? Equipe.get(b.prestadorId) : null;
  const l = [`VOUCHER ${b.code} — ${guiaNegocio()}`, '', `${opNomeServ(b)}`, `${fmtDate(b.date)} às ${b.time} · ${b.pax} ${b.pax > 1 ? 'pessoas' : 'pessoa'}${b.veiculo ? ' · ' + b.veiculo : ''}`,
    `Cliente: ${b.name}${(b.group || []).length ? ' + ' + b.group.map(g => g.nome).join(', ') : ''}`];
  if (b.voo) l.push(`Voo/trem: ${b.voo}`);
  l.push(`Encontro: ${b.origem || noIdioma(x && x.meeting) || 'combinado pelo WhatsApp'}`);
  if (b.destino) l.push(`Destino: ${b.destino}`);
  if (pres) l.push(`${opPapel(b) === 'motorista' ? 'Motorista' : 'Guia'}: ${pres.nome}`);
  l.push('', nd.valor > 0 ? (nd.para === 'prestador'
    ? `No dia: pague ${eur(nd.valor)} em dinheiro ${opPapel(b) === 'motorista' ? 'ao motorista' : 'à guia'}.`
    : `Falta pagar ${eur(nd.valor)} até ${fmtDate(Bookings.dueDate(b))}.`) : 'Tudo pago. Não há nada a pagar no dia.');
  l.push('', 'Dicas: ' + dicasDo(b));
  if (DB.settings.plantao) l.push('', `Plantão (emergências): ${DB.settings.plantao}`);
  l.push(`WhatsApp: ${DB.settings.whats || ''}`);
  return l.join('\n');
}
function opDocVoucher(id) {
  const b = Bookings.get(id);
  if (!b) return go('/adm/today');
  const x = Tours.get(b.tourId);
  const nd = Op.noDia(b);
  const pres = b.prestadorId ? Equipe.get(b.prestadorId) : null;
  const pago = Bookings.paid(b);
  const corpo = `
    <div class="doc-grande"><small>Código</small><b class="mono">${esc(b.code)}</b></div>
    <h2>${esc(opNomeServ(b))}</h2>
    <dl class="doc-dl">
      <dt>Quando</dt><dd>${fmtDate(b.date)} às ${esc(b.time)}</dd>
      <dt>Quem</dt><dd>${esc(b.name)}${(b.group || []).length ? '<br>' + b.group.map(g => esc(g.nome)).join(', ') : ''} · ${b.pax} ${b.pax > 1 ? 'pessoas' : 'pessoa'}</dd>
      ${b.veiculo ? `<dt>Veículo</dt><dd>${esc(b.veiculo)}${b.malas ? ' · ' + esc(b.malas) : ''}</dd>` : ''}
      ${b.voo ? `<dt>Voo / trem</dt><dd>${esc(b.voo)}</dd>` : ''}
      <dt>Encontro</dt><dd>${esc(b.origem || noIdioma(x && x.meeting) || 'combinado pelo WhatsApp')}</dd>
      ${b.destino ? `<dt>Destino</dt><dd>${esc(b.destino)}</dd>` : ''}
      ${pres ? `<dt>${opPapel(b) === 'motorista' ? 'Motorista' : 'Guia'}</dt><dd>${esc(pres.nome)}</dd>` : ''}
    </dl>
    <div class="doc-pag ${nd.valor > 0 ? 'falta' : 'ok'}">
      ${nd.valor > 0 ? (nd.para === 'prestador'
        ? `<b>No dia, pague ${eur(nd.valor)} em dinheiro ${opPapel(b) === 'motorista' ? 'ao motorista' : 'à guia'}.</b><small>Já pago: ${eur(pago)} de ${eur(b.total)}</small>`
        : `<b>Falta pagar ${eur(nd.valor)} até ${fmtDate(Bookings.dueDate(b))}.</b><small>Já pago: ${eur(pago)} de ${eur(b.total)}</small>`)
        : `<b>✓ Tudo pago.</b><small>Não há nada a pagar no dia.</small>`}
    </div>
    <h3>Para o dia</h3><p class="doc-dica">${esc(dicasDo(b))}</p>
    <div class="doc-contato">
      ${DB.settings.plantao ? `<p><b>Plantão (emergências):</b> ${esc(DB.settings.plantao)}</p>` : '<p class="why nao-imprime">Dica: cadastre o número de plantão em Ajustes para ele sair no voucher.</p>'}
      <p><b>WhatsApp:</b> ${esc(DB.settings.whats || '')}</p>
    </div>`;
  opDoc('Voucher', corpo, b.whats ? `<a class="mini cta-ish" target="_blank" rel="noopener" href="${waLink(opVoucherTexto(b), opNum(b.whats))}">💬 mandar ao cliente</a>` : '');
}
function opDocOrc(id) {
  const o = Orc.get(id);
  if (!o) return go('/adm/consulta');
  const tot = Orc.total(o), sin = Orc.sinal(o);
  const termos = termosTexto();
  const modelo = /^MODELO/.test(termos);
  const corpo = `
    <div class="doc-grande"><small>Orçamento</small><b class="mono">${esc(o.num)}</b></div>
    <p>Para <b>${esc(o.cliente.nome || '')}</b>${o.cliente.whats ? ' · ' + esc(o.cliente.whats) : ''} · emitido em ${opCurta(o.criado.slice(0, 10))} · válido até ${opCurta(o.validade)}</p>
    <table class="tbl doc-tbl"><thead><tr><th>Serviço</th><th>Dia</th><th class="right">Pessoas</th><th class="right">Valor</th></tr></thead><tbody>
      ${o.itens.map(i => `<tr><td>${esc(i.desc)}${i.obs && !i.sugestao ? `<br><small>${esc(i.obs)}</small>` : ''}</td><td class="mono">${i.data ? opCurta(i.data) + (i.hora ? ' ' + esc(i.hora) : '') : '—'}</td><td class="right">${i.pax}</td><td class="mono right">${i.valor ? eur(i.valor) : 'a definir'}</td></tr>`).join('')}
    </tbody><tfoot>
      <tr><td colspan="3"><b>Total</b></td><td class="mono right"><b>${eur(tot)}</b></td></tr>
      ${sin ? `<tr><td colspan="3">Sinal para reservar</td><td class="mono right">${eur(sin)}</td></tr>
      <tr><td colspan="3">No dia, a quem faz cada serviço</td><td class="mono right">${eur(Math.max(0, tot - sin))}</td></tr>` : ''}
    </tfoot></table>
    ${o.obs ? `<p>${esc(o.obs).replace(/\n/g, '<br>')}</p>` : ''}
    <h3>Como pagar o sinal</h3>
    <p>${[DB.settings.pixKey && 'Pix: ' + esc(DB.settings.pixKey), DB.settings.wiseLink && 'Wise: ' + esc(DB.settings.wiseLink), DB.settings.iban && 'IBAN: ' + esc(DB.settings.iban) + (DB.settings.ibanName ? ' (' + esc(DB.settings.ibanName) + ')' : '')].filter(Boolean).join('<br>') || 'Os dados de pagamento seguem pelo WhatsApp.'}</p>
    ${o.termos ? `<h3>Termos e condições</h3>
      ${modelo ? '<div class="alert warn nao-imprime">Estes ainda são os termos MODELO. Cole os seus em Ajustes → Termos e condições.</div>' : ''}
      <p class="doc-termos">${esc(termos.replace(/^MODELO.*\n\n?/, '')).replace(/\n/g, '<br>')}</p>
      <p><b>Ao pagar o sinal, você declara que leu e aceita estes termos.</b></p>` : ''}`;
  opDoc('Orçamento', corpo, `<a class="mini" href="#/adm/consulta/${esc(o.id)}">editar</a>`);
}

/* =====================================================
   AJUSTES — contas, termos e plantao
===================================================== */
function opAjustesHtml() {
  const s = DB.settings.termos || {};
  return `<section class="card" id="opContas">
      <h3>Suas contas</h3>
      <p class="why">Onde o dinheiro cai. Na hora de registrar um pagamento você escolhe a conta, e a contabilidade separa: Brasil para o contador do Brasil, Europa para o da Europa.</p>
      ${Contas.all().map(c => `<div class="frow conta-row" data-conta="${esc(c.id)}">
        <label class="fld grow">Nome<input data-ck="nome" value="${esc(c.nome)}"></label>
        <label class="fld">Lado<select data-ck="pais"><option value="brasil" ${c.pais === 'brasil' ? 'selected' : ''}>🇧🇷 Brasil</option><option value="europa" ${c.pais === 'europa' ? 'selected' : ''}>🇪🇺 Europa</option></select></label>
        <label class="fld">Tipo<select data-ck="metodo">${[['pix', 'Pix'], ['transfer', 'Transferência / Wise / Revolut'], ['card', 'Cartão'], ['cash', 'Dinheiro'], ['other', 'Outro']].map(([v, l]) => `<option value="${v}" ${c.metodo === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <button class="mini danger" data-crm="${esc(c.id)}" aria-label="remover">✕</button>
      </div>`).join('')}
      <div class="btnrow"><button class="mini" id="ctNova">+ conta</button><button class="cta sm" id="ctSalva">Salvar contas</button></div>
    </section>
    <section class="card">
      <h3>Termos e condições</h3>
      <p class="why">Saem no orçamento: pagou o sinal, aceitou — como passagem aérea. Cole aqui os seus.</p>
      <label class="fld">Português<textarea id="tmPt" rows="8" placeholder="${esc(TERMOS_MODELO)}">${esc(s.pt || '')}</textarea></label>
      <label class="fld">English<textarea id="tmEn" rows="4">${esc(s.en || '')}</textarea></label>
      <label class="fld">Número de plantão (sai no voucher)<input id="tmPlantao" value="${esc(DB.settings.plantao || '')}" placeholder="+39 ..."></label>
      <button class="cta sm" id="tmSalva">Salvar</button>
    </section>`;
}
function opAjustesLiga() {
  const lerContas = () => $$('[data-conta]').forEach(row => {
    const c = Contas.get(row.dataset.conta); if (!c) return;
    const v = (k) => row.querySelector(`[data-ck="${k}"]`).value;
    Object.assign(c, { nome: v('nome').trim() || c.nome, pais: v('pais'), metodo: v('metodo') });
  });
  $('#ctSalva').onclick = () => { lerContas(); save(); toast('Contas salvas'); };
  $('#ctNova').onclick = () => { lerContas(); Contas.salva({ nome: 'Nova conta', pais: 'europa', metodo: 'transfer' }); admSettings(); setTimeout(() => $('#opContas').scrollIntoView(), 30); };
  $$('[data-crm]').forEach(b => b.onclick = () => {
    const c = Contas.get(b.dataset.crm);
    if (c && confirm(`Remover a conta "${c.nome}"? Os pagamentos já registrados nela continuam no extrato.`)) { lerContas(); Contas.remove(c.id); admSettings(); }
  });
  $('#tmSalva').onclick = () => {
    DB.settings.termos = { pt: $('#tmPt').value.trim(), en: $('#tmEn').value.trim() };
    DB.settings.plantao = $('#tmPlantao').value.trim();
    save(); toast('Salvo');
  };
}

/* =====================================================
   MEU PEDIDO — o cliente junta varios servicos num orcamento so
   "ela quer fazer o orcamento de varias coisas: o passeio, o transfer,
   um passeio em Florenca, o transfer de partida em Milao"
===================================================== */
const CESTA_KEY = 'ingrid_cesta_v1';
function cesta() { try { return JSON.parse(localStorage.getItem(CESTA_KEY)) || []; } catch (e) { return []; } }
function cestaSalva(l) { try { localStorage.setItem(CESTA_KEY, JSON.stringify(l)); } catch (e) {} }
function cestaAdd(it) { const l = cesta(); l.push({ ...it, id: uid() }); cestaSalva(l); }
function cestaBarra(rota) {
  const velha = document.getElementById('cestaBar'); if (velha) velha.remove();
  if (rota === 'adm' || rota === 'pedido') return;
  const n = cesta().length; if (!n) return;
  const el = document.createElement('a');
  el.id = 'cestaBar'; el.className = 'cesta-bar'; el.href = '#/pedido';
  el.innerHTML = `🧾 <b>${L('Meu pedido', 'My request')}</b> · ${n} ${n === 1 ? L('serviço', 'service') : L('serviços', 'services')} <span>${L('ver e enviar', 'review & send')} →</span>`;
  document.body.appendChild(el);
}
function viewPedido() {
  const itens = cesta();
  const tot = itens.reduce((s, i) => s + (+i.valor || 0), 0);
  app.innerHTML = `
  <header class="topbar">
    <button class="backbtn" id="bk" aria-label="${t('back')}">←</button>
    <span class="tbrand">${logoMark(24, 'var(--brand-assinatura)')}<b>${esc(guiaNome())}</b></span>
    ${langBar('right')}
  </header>
  <main class="wrap roteiro">
    <h1 class="pageh">${L('Meu pedido', 'My request')}</h1>
    <p class="rtintro">${L(`Junte tudo o que você quer — passeios, transfers, outras cidades — e mande de uma vez. ${esc(guiaNome())} confere e responde com o orçamento completo.`,
      `Gather everything you want — tours, transfers, other cities — and send it at once. ${esc(guiaNome())} checks it and replies with the full quote.`)}</p>
    <section class="card">
      ${itens.length ? itens.map(i => `<div class="deprow"><div class="tinfo"><b>${esc(i.nome)}</b><small>${i.data ? fmtDate(i.data) + (i.hora ? ' ' + esc(i.hora) : '') : ''} · ${i.pax} ${i.pax > 1 ? L('pessoas', 'people') : L('pessoa', 'person')}${i.valor ? ' · ' + eur(i.valor) : ''}</small></div>
        <button class="mini danger" data-tira="${esc(i.id)}">${L('tirar', 'remove')}</button></div>`).join('')
        : `<p class="why">${L('Nenhum serviço ainda.', 'Nothing yet.')}</p>`}
      <a class="mini" href="#/tours">+ ${L('acrescentar da vitrine', 'add from the showcase')}</a>
      ${tot ? `<p class="why">${L('Valor de referência pela tabela', 'Reference price')}: <b>${eur(tot)}</b>. ${L('O orçamento final vem da Ingrid.', 'The final quote comes from Ingrid.').replace('Ingrid', esc(guiaNome()))}</p>` : ''}
    </section>
    <section class="card">
      <label class="fld">${L('O que mais você quer?', 'Anything else?')}<textarea id="pdMais" rows="3" placeholder="${L('Ex.: passeio em Florença dia 14, transfer de saída em Milão, jantar...', 'E.g.: Florence tour on the 14th, departure transfer in Milan...')}"></textarea></label>
      <div class="frow">
        <label class="fld">${t('fullName')}<input id="pdNome" autocomplete="name"></label>
        <label class="fld">${t('whatsLbl')}<input id="pdWa" placeholder="+55 ..."></label>
      </div>
      <label class="fld">${t('email')}<input id="pdEmail" type="email" autocomplete="email"></label>
      <button class="cta" id="pdEnvia">${L('Enviar pedido para', 'Send request to')} ${esc(guiaNome())}</button>
      <p class="fine">${L('Nada é cobrado agora. Você recebe o orçamento com os termos e o valor do sinal.', 'Nothing is charged now. You will get the quote with the terms and the deposit.')}</p>
    </section>
  </main>`;
  $('#bk').onclick = () => history.length > 1 ? history.back() : go('/');
  $$('[data-tira]').forEach(b => b.onclick = () => { cestaSalva(cesta().filter(i => i.id !== b.dataset.tira)); viewPedido(); });
  $('#pdEnvia').onclick = () => {
    const nome = $('#pdNome').value.trim(), wa = $('#pdWa').value.trim(), mais = $('#pdMais').value.trim();
    if (!nome || !wa) return toast(L('Preencha nome e WhatsApp.', 'Fill in name and WhatsApp.'));
    if (!itens.length && !mais) return toast(L('Conte o que você quer.', 'Tell us what you want.'));
    const o = Orc.cria({
      origem: 'site', status: 'novo', cliente: { nome, whats: wa, email: $('#pdEmail').value.trim() }, obs: '',
      resumo: mais, conversa: mais,
      itens: itens.map(i => (i.tourId && Tours.get(i.tourId))
        ? { ...Orc.itemDoCatalogo(i.tourId, { pax: i.pax, data: i.data, hora: i.hora, opcao: i.opcao }), obs: '' }
        : { desc: i.nome, pax: i.pax, data: i.data, valor: i.valor || 0 }),
    });
    const msg = [L(`Olá ${guiaNome()}! Meu pedido (${o.num}):`, `Hi ${guiaNome()}! My request (${o.num}):`), '',
      ...itens.map((i, n) => `${n + 1}. ${i.nome}${i.data ? ' — ' + opCurta(i.data) + (i.hora ? ' ' + i.hora : '') : ''} · ${i.pax}p`),
      ...(mais ? ['', mais] : []), '', `${nome} · ${wa}`].join('\n');
    cestaSalva([]);
    window.open(waLink(msg), '_blank');
    app.querySelector('main').innerHTML = `<div class="okc">✓</div><h2 class="okh">${L('Pedido enviado', 'Request sent')}</h2>
      <p class="hint center">${L(`${esc(guiaNome())} recebeu tudo e responde com o orçamento.`, `${esc(guiaNome())} got everything and will reply with the quote.`)}</p>
      <a class="cta soft" href="#/">${L('Voltar ao início', 'Back to start')}</a>`;
  };
}

/* =====================================================
   RELATORIOS — o painel de numeros dela

   Um numero principal (o dinheiro que entrou), marcadores com a comparacao
   contra o periodo anterior e um mini-grafico de 12 semanas, e graficos que
   respondem perguntas dela: o que ja esta vendido para as proximas semanas,
   quando a semana aperta (para as guias), o que mais vende, de onde vem o
   cliente, com quanta antecedencia reservam, como vao os orcamentos.

   Regras dos graficos (guia de visualizacao): uma cor so por serie (o vinho
   dela), destaque em vinho e o resto em cinza, grade em linha fina e solida,
   rotulo so onde importa, dica ao passar o dedo/mouse e, em todo grafico,
   "ver em tabela" — nenhum numero fica preso so no desenho.
===================================================== */
const RP_ORIGEM = { site: 'Site', instagram: 'Instagram', whatsapp: 'WhatsApp', agency: 'Agência', friend: 'Indicação',
                    orcamento: 'Orçamento', manual: 'Lançada por você' };
function rpEur(v) {
  const n = Math.round(+v || 0);
  if (Math.abs(n) >= 10000) return '€ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
  return eur(n);
}
function rpPct(x) { return x == null ? '—' : Math.round(x * 100) + '%'; }
function rpTopo(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}
/* a setinha do marcador: sobe/desce com texto, nunca so cor */
function rpDelta(d, bomSubir, antNome) {
  if (d == null) return `<span class="rp-d n" title="sem base de comparação">novo · ${esc(antNome)} sem movimento</span>`;
  const r = Math.round(d * 100);
  if (r === 0) return `<span class="rp-d n">= igual a ${esc(antNome)}</span>`;
  const bom = (r > 0) === (bomSubir !== false);
  return `<span class="rp-d ${bom ? 'ok' : 'bad'}">${r > 0 ? '▲ +' : '▼ '}${r}% <span class="rp-vs">vs ${esc(antNome)}</span></span>`;
}
/* mini-grafico: 12 semanas em cinza, a atual em vinho */
function rpSpark(vals) {
  const W = 120, H = 30, n = vals.length;
  if (!n) return '';
  const max = Math.max(1, ...vals), x = (i) => 2 + i * ((W - 6) / Math.max(1, n - 1)), y = (v) => H - 4 - (v / max) * (H - 8);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="rp-spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
    <polygon points="${x(0)},${H - 4} ${pts} ${x(n - 1)},${H - 4}" fill="var(--cv-mute)" opacity=".18"/>
    <polyline points="${pts}" fill="none" stroke="var(--cv-mute)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(n - 1)}" cy="${y(vals[n - 1])}" r="4" fill="var(--cv-main)" stroke="var(--surface)" stroke-width="2"/></svg>`;
}
function rpTile(rotulo, valor, delta, spark, extra) {
  return `<div class="rp-tile"><small>${rotulo}</small><b>${valor}</b>${delta || ''}${extra ? `<span class="rp-extra">${extra}</span>` : ''}${spark || ''}</div>`;
}
function rpTabela(cabecalho, linhas) {
  return `<details class="rp-tab"><summary>ver em tabela</summary><div class="rp-tabwrap"><table class="tbl"><thead><tr>${cabecalho.map((c, i) => `<th class="${i ? 'right' : ''}">${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${linhas.map(l => `<tr>${l.map((c, i) => `<td class="${i ? 'mono right' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}

/* colunas em SVG, na largura real do cartao. Uma serie: destaque em vinho,
   o resto em cinza. Duas (empilhadas): o mesmo vinho em dois tons, com
   legenda. A dica sai do atributo data-tip (texto puro). */
function rpColunas(el, dados, opt) {
  if (!el) return;
  const W = Math.max(260, el.clientWidth || 600), H = opt.h || 190;
  const tot = (d) => opt.pilha ? d.partes.reduce((s, p) => s + p.v, 0) : d.v;
  const topo = rpTopo(Math.max(0, ...dados.map(tot)) * 1.05);
  const fmtE = (t) => opt.fmtEixo ? opt.fmtEixo(t) : rpEur(t);
  /* 10px mono: ~6.2px por letra. A margem cabe o maior numero do eixo. */
  const pL = Math.ceil(Math.max(...[0, topo / 2, topo].map(t => fmtE(t).length)) * 6.2) + 12;
  const pR = 6, pT = 24, pB = 26, w = W - pL - pR, h = H - pT - pB;
  const Y = (v) => pT + h - (v / topo) * h;
  const banda = w / dados.length, bw = Math.min(24, banda * 0.62);
  const max = Math.max(...dados.map(tot));
  /* rotulos que nao cabem nao encavalam: com coluna estreita, mostra uma data
     sim outra nao (a da coluna em destaque sempre); o valor da maior coluna so
     aparece se ela nao estiver colada na coluna em destaque */
  const cada = Math.max(1, Math.ceil((Math.max(...dados.map(d => String(d.rot).length)) * 6.2 + 10) / banda));
  const iDest = dados.findIndex(d => d.destaque);
  const iMax = dados.findIndex(d => tot(d) === max);
  const mostraValor = (i) => i === iDest || (i === iMax && (iDest < 0 || Math.abs(iMax - iDest) > 1));
  let g = '';
  for (const t of [0, topo / 2, topo]) {
    g += `<line x1="${pL}" x2="${W - pR}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--cv-grid)" stroke-width="1"/>`
       + `<text x="${pL - 8}" y="${Y(t) + 4}" text-anchor="end" class="rp-ax">${esc(fmtE(t))}</text>`;
  }
  const colTopo = (x, y0, y1, cor, arred) => {
    const hh = y0 - y1; if (hh <= 0.5) return '';
    const r = arred ? Math.min(4, hh, bw / 2) : 0;
    return `<path d="M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 + r} V${y0} Z" fill="${cor}"/>`;
  };
  dados.forEach((d, i) => {
    const x = pL + i * banda + (banda - bw) / 2;
    if (opt.pilha) {
      let base = Y(0);
      d.partes.forEach((p, k) => {
        const topoY = Y(d.partes.slice(0, k + 1).reduce((s, q) => s + q.v, 0));
        const ultimo = d.partes.slice(k + 1).every(q => q.v <= 0);
        /* 2px de fundo entre os pedacos: separa sem desenhar borda */
        g += colTopo(x, base - (k ? 2 : 0), topoY, p.cor, ultimo);
        if (p.v > 0) base = topoY;
      });
    } else {
      g += colTopo(x, Y(0), Y(d.v), d.cor || (d.destaque ? 'var(--cv-main)' : (opt.cor || 'var(--cv-mute)')), true);
    }
    const v = tot(d);
    if (mostraValor(i) && v > 0 && !opt.semRotulo) {
      const txt = opt.fmt ? opt.fmt(v) : rpEur(v), meia = txt.length * 3.6;
      const cx = Math.min(W - 2 - meia, Math.max(pL + meia, x + bw / 2));
      g += `<text x="${cx}" y="${Y(v) - 7}" text-anchor="middle" class="rp-val">${esc(txt)}</text>`;
    }
    if (d.destaque || (opt.rotDoInicio ? i : dados.length - 1 - i) % cada === 0) g += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="rp-ax ${d.destaque ? 'on' : ''}">${esc(d.rot)}</text>`;
    g += `<rect class="rp-hit" x="${pL + i * banda}" y="${pT}" width="${banda}" height="${h}" fill="transparent" tabindex="0" role="img"
      aria-label="${esc(d.tip.join(' · '))}" data-tip="${esc(JSON.stringify(d.tip))}"/>`;
  });
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="rp-svg">${g}</svg>`;
}
/* barras deitadas em HTML: nome, barra fina e o valor na ponta */
function rpBarras(lista, opt) {
  const max = Math.max(1, ...lista.map(r => r.v));
  return `<div class="rp-hbars">${lista.map(r => `<div class="rp-hb" tabindex="0" data-tip="${esc(JSON.stringify(r.tip || [r.rotulo, String(r.v)]))}">
      <span class="rp-hb-nome">${esc(r.rotulo)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>
      <span class="rp-hb-pista"><i style="width:${Math.max(2, r.v / max * 100)}%;${r.cor ? 'background:' + r.cor : ''}"></i><em>${esc(r.txt)}</em></span>
    </div>`).join('')}</div>`;
}
/* a dica: uma so para a tela toda, texto puro (textContent) */
function rpLigaDicas(raiz) {
  let tip = document.getElementById('rpTip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'rpTip'; tip.className = 'rp-tip'; tip.hidden = true; document.body.appendChild(tip); }
  const mostra = (alvo, x, y) => {
    let linhas; try { linhas = JSON.parse(alvo.dataset.tip); } catch (e) { return; }
    tip.textContent = '';
    linhas.forEach((l, i) => { const el = document.createElement(i ? 'span' : 'b'); el.textContent = l; tip.appendChild(el); });
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, x - r.width / 2)) + 'px';
    tip.style.top = Math.max(8, y - r.height - 14) + 'px';
    alvo.classList.add('rp-on');
  };
  const some = (alvo) => { tip.hidden = true; if (alvo) alvo.classList.remove('rp-on'); };
  raiz.querySelectorAll('[data-tip]').forEach(a => {
    a.addEventListener('pointermove', (e) => mostra(a, e.clientX, e.clientY));
    a.addEventListener('pointerleave', () => some(a));
    a.addEventListener('focus', () => { const r = a.getBoundingClientRect(); mostra(a, r.left + r.width / 2, r.top); });
    a.addEventListener('blur', () => some(a));
  });
}

function admRelatorios() {
  const S = admRelatorios._s = admRelatorios._s || { p: 'mes' };
  const hoje = isoToday();
  const P = Painel.periodo(S.p, hoje);
  const rec = Painel.recebido(P.de, P.ate), recA = Painel.recebido(P.antDe, P.antAte);
  const ven = Painel.vendido(P.de, P.ate), venA = Painel.vendido(P.antDe, P.antAte);
  const srv = Painel.servicos(P.de, P.ate), srvA = Painel.servicos(P.antDe, P.antAte);
  const mg = Painel.margem(P.de, P.ate);
  const ar = Painel.aReceber(hoje);
  const oc = Painel.orcamentos(P.de, P.ate);
  const cli = Painel.clientes(P.de, P.ate);
  const fut = Painel.futuro(8, hoje);
  const calor = Painel.calor(P.de, P.ate);
  const porS = Painel.porServico(P.de, P.ate);
  const ori = Painel.origens(P.de, P.ate);
  const eq = Painel.equipe(P.de, P.ate);
  const ant = Painel.antecedencia(P.de, P.ate);
  const ticket = ven.n ? ven.valor / ven.n : 0, ticketA = venA.n ? venA.valor / venA.n : 0;
  const sem12 = (fn) => Painel.semanas(12, hoje, fn).map(s => s.v);
  const entrada = S.p === 'ano'
    ? Painel.meses(+hoje.slice(0, 4), (a, z) => Painel.recebido(a, z > hoje ? hoje : z).voce).map((m, i) => ({ ...m, destaque: i === +hoje.slice(5, 7) - 1 }))
    : Painel.semanas(12, hoje, (a, z) => Painel.recebido(a, z).voce).map((s, i, arr) => ({ ...s, destaque: i === arr.length - 1 }));
  const futTot = fut.reduce((s, f) => s + f.total, 0), futPago = fut.reduce((s, f) => s + f.pago, 0);
  const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
  const TUR = [['manha', 'Manhã'], ['tarde', 'Tarde'], ['noite', 'Noite']];
  const calMax = Math.max(0, ...calor.flatMap(d => TUR.map(([k]) => d[k])));
  const passo = (n) => !n ? 0 : Math.min(4, Math.max(1, Math.ceil(n / calMax * 4)));
  let pico = null;
  const DIAS_EXT = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  const TUR_EXT = { manha: 'de manhã', tarde: 'à tarde', noite: 'à noite' };
  calor.forEach((d, i) => TUR.forEach(([k]) => { if (d[k] && (!pico || d[k] > pico.n)) pico = { n: d[k], txt: DIAS_EXT[i] + ' ' + TUR_EXT[k] }; }));

  /* o que os numeros dizem, em frases — o "detalhe incrivel" e ler isto */
  const frases = [];
  if (porS[0]) { const x = Tours.get(porS[0].tourId); frases.push(`<b>${esc(x ? x.name.pt : '?')}</b> é o serviço que mais rende no período: ${rpEur(porS[0].valor)} em ${porS[0].n} ${porS[0].n > 1 ? 'reservas' : 'reserva'}.`); }
  if (futTot) frases.push(`Você já tem <b>${rpEur(futTot)}</b> vendidos para as próximas 8 semanas — ${rpEur(futPago)} já entraram e ${rpEur(futTot - futPago)} ainda vão chegar.`);
  if (pico) frases.push(`O turno mais cheio é <b>${pico.txt}</b> (${pico.n} ${pico.n > 1 ? 'serviços' : 'serviço'}). É onde vale ter guias confirmadas com antecedência.`);
  if (ant.mediana != null) frases.push(`Metade dos clientes reserva com até <b>${ant.mediana} ${ant.mediana === 1 ? 'dia' : 'dias'}</b> de antecedência — é esse o prazo para começar a divulgar uma data.`);
  if (cli.junto) frases.push(`<b>${cli.junto} ${cli.junto > 1 ? 'pessoas vieram' : 'pessoa veio'} junto</b> com quem reservou. Estão na sua base com o nome de quem trouxe: são as suas próximas indicações.`);
  if (cli.voltaram) frases.push(`<b>${cli.voltaram} de ${cli.n}</b> clientes do período já tinham viajado com você antes.`);
  if (mg.semCusto && srv.n) frases.push(`Em ${mg.semCusto} ${mg.semCusto > 1 ? 'serviços' : 'serviço'} falta o custo da guia/motorista. Preencha em Detalhes para ver a sua margem real.`);
  if (rec.prest) frases.push(`${rpEur(rec.prest)} foram pagos no dia direto às guias e motoristas — não contam como entrada sua.`);

  admShell('reports', `
    <div class="pagehead"><h1 class="pageh">Relatórios</h1>
      <div class="chips">${[['semana', '7 dias'], ['mes', 'Este mês'], ['90', '90 dias'], ['ano', 'Este ano']].map(([v, l]) =>
        `<button class="chip ${S.p === v ? 'on' : ''}" data-rp="${v}">${l}</button>`).join('')}</div></div>
    <p class="why rp-per">${fmtDate(P.de)} a ${fmtDate(P.ate)} · comparado com ${esc(P.ant)} (${opCurta(P.antDe)} a ${opCurta(P.antAte)})</p>

    <section class="card rp-hero">
      <div class="rp-hero-num">
        <small>Entrou para você · ${esc(P.nome)}</small>
        <b>${eur(rec.voce)}</b>
        ${rpDelta(Painel.delta(rec.voce, recA.voce), true, P.antCurto)}
        <span class="rp-extra">${rec.n} ${rec.n === 1 ? 'pagamento' : 'pagamentos'}${rec.prest ? ` · + ${rpEur(rec.prest)} pagos direto às guias e motoristas` : ''}</span>
      </div>
      <div class="rp-hero-graf">
        <span class="op-lbl">${S.p === 'ano' ? 'Mês a mês' : 'Semana a semana · últimas 12'}</span>
        <div id="rpEntrada" class="rp-plot"></div>
      </div>
      <div class="rp-full">${rpTabela([S.p === 'ano' ? 'Mês' : 'Semana', 'Entrou'], entrada.map(e => [S.p === 'ano' ? e.rot : `${opCurta(e.de)} a ${opCurta(e.ate)}`, eur(e.v)]))}</div>
    </section>

    ${frases.length ? `<section class="card rp-frases"><h3>O que os números dizem</h3><ul>${frases.map(f => `<li>${f}</li>`).join('')}</ul></section>` : ''}

    <div class="rp-tiles">
      ${rpTile('Vendido no período', eur(ven.valor), rpDelta(Painel.delta(ven.valor, venA.valor), true, P.antCurto), rpSpark(sem12((a, z) => Painel.vendido(a, z).valor)), `${ven.n} ${ven.n === 1 ? 'reserva' : 'reservas'} feitas`)}
      ${rpTile('Serviços no período', `${srv.n} <span class="rp-un">· ${srv.pax} pessoas</span>`, rpDelta(Painel.delta(srv.pax, srvA.pax), true, P.antCurto), rpSpark(sem12((a, z) => Painel.servicos(a, z).pax)), 'a setinha compara as pessoas')}
      ${rpTile('Ticket médio', eur(Math.round(ticket)), rpDelta(Painel.delta(ticket, ticketA), true, P.antCurto), '', 'por reserva vendida')}
      ${rpTile('Sua margem', mg.n ? eur(mg.margem) : '—', mg.n ? `<span class="rp-d n">${rpPct(mg.pct)} do valor dos serviços</span>` : '', '', mg.n ? `em ${mg.n} ${mg.n > 1 ? 'serviços' : 'serviço'} com custo preenchido` : 'preencha o custo em Detalhes')}
      ${rpTile('A receber', eur(ar.comVoce), ar.atrasado ? `<span class="rp-d bad">⚠ ${eur(ar.atrasado)} atrasados</span>` : `<span class="rp-d ok">✓ nada atrasado</span>`, '', `+ ${rpEur(ar.noDia)} que os clientes pagam no dia às guias e motoristas`)}
      ${rpTile('Orçamentos', oc.taxa == null ? `${oc.n}` : rpPct(oc.taxa), oc.taxa == null ? `<span class="rp-d n">nenhum decidido ainda</span>` : `<span class="rp-d n">fecharam ${oc.fechados} de ${oc.fechados + oc.perdidos}</span>`, '', `${oc.n} no período · ${rpEur(oc.valorFechado)} fechados`)}
    </div>

    <section class="card">
      <div class="rp-cab"><h3>Já vendido para as próximas 8 semanas</h3>
        <span class="rp-leg"><i style="background:var(--cv-main)"></i>já entrou <i style="background:var(--cv-soft)"></i>falta receber</span></div>
      <p class="why">${rpEur(futTot)} em serviços marcados daqui para frente · ${rpEur(futPago)} já pagos. Cada coluna é uma semana, a partir de hoje.</p>
      <div id="rpFuturo" class="rp-plot"></div>
      ${rpTabela(['Semana', 'Serviços', 'Pessoas', 'Já entrou', 'Falta', 'Total'], fut.map(f => [`${opCurta(f.de)} a ${opCurta(f.ate)}`, f.n, f.pax, eur(f.pago), eur(f.falta), eur(f.total)]))}
    </section>

    <div class="two-col rp-duas">
      <section class="card">
        <h3>Quando a semana aperta</h3>
        <p class="why">Serviços por dia e turno no período. Onde está mais escuro é onde você mais precisa de guia confirmada.</p>
        <div class="rp-calor" role="table" aria-label="Serviços por dia da semana e turno">
          <span></span>${DIAS.map(d => `<span class="rp-cd">${d}</span>`).join('')}
          ${TUR.map(([k, nome]) => `<span class="rp-ct">${nome}</span>${calor.map((d, i) => `<span class="rp-cel s${passo(d[k])}" tabindex="0"
             data-tip="${esc(JSON.stringify([d[k] + (d[k] === 1 ? ' serviço' : ' serviços'), DIAS[i] + ' · ' + nome.toLowerCase()]))}">${d[k] || ''}</span>`).join('')}`).join('')}
        </div>
        <div class="rp-escala"><span>menos</span>${[1, 2, 3, 4].map(n => `<i class="s${n}"></i>`).join('')}<span>mais</span></div>
        ${rpTabela(['Turno', ...DIAS], TUR.map(([k, nome]) => [nome, ...calor.map(d => d[k])]))}
      </section>
      <section class="card">
        <h3>Com quanta antecedência reservam</h3>
        <p class="why">${ant.n ? `Dias entre a reserva e o serviço. Mediana: <b>${ant.mediana} ${ant.mediana === 1 ? 'dia' : 'dias'}</b> (${ant.n} ${ant.n > 1 ? 'reservas' : 'reserva'}).` : 'Sem reservas no período.'}</p>
        <div id="rpAntec" class="rp-plot"></div>
        ${rpTabela(['Antecedência', 'Reservas'], ant.faixas.map(f => [f.rot, f.n]))}
      </section>
    </div>

    <div class="two-col rp-duas">
      <section class="card">
        <h3>Os serviços que mais rendem</h3>
        ${porS.length ? rpBarras(porS.slice(0, 7).map(r => { const x = Tours.get(r.tourId); const nm = x ? x.name.pt : '?';
          return { rotulo: nm, sub: `${r.n} ${r.n > 1 ? 'reservas' : 'reserva'} · ${r.pax} pessoas`, v: r.valor, txt: rpEur(r.valor), tip: [eur(r.valor), nm, `${r.n} reservas · ${r.pax} pessoas`] }; })) : '<p class="empty">Nenhum serviço no período.</p>'}
        ${porS.length > 7 ? `<p class="why">+ ${porS.length - 7} outros serviços na tabela abaixo.</p>` : ''}
        ${rpTabela(['Serviço', 'Reservas', 'Pessoas', 'Valor'], porS.map(r => [(Tours.get(r.tourId) || { name: { pt: '?' } }).name.pt, r.n, r.pax, eur(r.valor)]))}
      </section>
      <section class="card">
        <h3>De onde vêm os clientes</h3>
        ${ori.length ? rpBarras(ori.map(o => ({ rotulo: RP_ORIGEM[o.origem] || o.origem, v: o.n, txt: `${rpPct(o.pct)} · ${o.n}`,
          tip: [`${o.n} ${o.n > 1 ? 'reservas' : 'reserva'} (${rpPct(o.pct)})`, RP_ORIGEM[o.origem] || o.origem] }))) : '<p class="empty">Nenhum serviço no período.</p>'}
        <div class="rp-mini">
          <div><b>${cli.novos}</b><small>clientes novos</small></div>
          <div><b>${cli.voltaram}</b><small>voltaram</small></div>
          <div><b>${cli.junto}</b><small>vieram junto · indicações</small></div>
        </div>
        ${rpTabela(['Origem', 'Reservas', '%'], ori.map(o => [RP_ORIGEM[o.origem] || o.origem, o.n, rpPct(o.pct)]))}
      </section>
    </div>

    <div class="two-col rp-duas">
      <section class="card">
        <h3>Guias e motoristas no período</h3>
        ${eq.lista.length ? rpBarras(eq.lista.map(r => ({ rotulo: r.pessoa.nome, sub: `${r.pessoa.tipo === 'motorista' ? 'motorista' : 'guia'} · ${r.pax} pessoas`, v: r.n,
          txt: `${r.n} ${r.n > 1 ? 'serviços' : 'serviço'}`, tip: [`${r.n} serviços · ${r.pax} pessoas`, r.pessoa.nome, `${eur(r.noDia)} pagos pelos clientes no dia`] }))) : '<p class="empty">Ninguém escalado no período.</p>'}
        ${eq.sem ? `<p class="why">⚠ ${eq.sem} ${eq.sem > 1 ? 'serviços' : 'serviço'} do período sem guia ou motorista. <a href="#/adm/guias">Escalar</a></p>` : ''}
        ${rpTabela(['Quem', 'Serviços', 'Pessoas', 'Recebeu no dia'], eq.lista.map(r => [r.pessoa.nome, r.n, r.pax, eur(r.noDia)]))}
      </section>
      <section class="card">
        <h3>Sob consulta: do pedido ao fechado</h3>
        ${oc.n ? rpBarras([
          { rotulo: 'Pedidos que chegaram', v: oc.n, txt: String(oc.n), cor: 'var(--cv-s1)', tip: [oc.n + ' pedidos', 'chegaram no período'] },
          { rotulo: 'Orçamentos enviados', v: oc.enviados + oc.fechados + oc.perdidos, txt: String(oc.enviados + oc.fechados + oc.perdidos), cor: 'var(--cv-s2)', tip: [(oc.enviados + oc.fechados + oc.perdidos) + ' enviados', 'inclui os que já fecharam ou não fecharam'] },
          { rotulo: 'Fecharam', v: oc.fechados, txt: `${oc.fechados} · ${rpEur(oc.valorFechado)}`, cor: 'var(--cv-s4)', tip: [oc.fechados + ' fechados', rpEur(oc.valorFechado)] },
        ]) : '<p class="empty">Nenhum pedido no período.</p>'}
        ${oc.novos ? `<p class="why">${oc.novos} ${oc.novos > 1 ? 'pedidos esperando' : 'pedido esperando'} você montar o orçamento. <a href="#/adm/consulta">Abrir</a></p>` : ''}
        ${rpTabela(['Etapa', 'Quantos'], [['Chegaram', oc.n], ['Em montagem', oc.novos], ['Enviados (aguardando)', oc.enviados], ['Fecharam', oc.fechados], ['Não fecharam', oc.perdidos]])}
      </section>
    </div>`);

  $$('[data-rp]').forEach(b => b.onclick = () => { S.p = b.dataset.rp; admRelatorios(); });
  const desenha = () => {
    rpColunas($('#rpEntrada'), entrada.map(e => ({ rot: e.rot, v: e.v, destaque: e.destaque,
      tip: [eur(e.v), S.p === 'ano' ? e.rot + ' ' + hoje.slice(0, 4) : `semana de ${opCurta(e.de)} a ${opCurta(e.ate)}`] })), { h: 180 });
    rpColunas($('#rpFuturo'), fut.map(f => ({ rot: f.rot, pilha: true,
      partes: [{ v: f.pago, cor: 'var(--cv-main)' }, { v: f.falta, cor: 'var(--cv-soft)' }],
      tip: [eur(f.total), `semana de ${opCurta(f.de)} a ${opCurta(f.ate)}`, `${eur(f.pago)} já entrou · ${eur(f.falta)} falta`, `${f.n} serviços · ${f.pax} pessoas`] })), { h: 200, pilha: true, rotDoInicio: true });
    const cores = ['var(--cv-s1)', 'var(--cv-s2)', 'var(--cv-s3)', 'var(--cv-s4)'];
    /* faixas de antecedencia em ordem: um tom do vinho por faixa, do claro ao escuro */
    rpColunas($('#rpAntec'), ant.faixas.map((f, i) => ({ rot: f.curto, v: f.n, cor: cores[i],
      tip: [`${f.n} ${f.n === 1 ? 'reserva' : 'reservas'}`, f.rot + ' antes'] })), { h: 170, fmt: (v) => String(v), fmtEixo: (v) => String(Math.round(v * 10) / 10) });
    rpLigaDicas($('#stage'));
  };
  desenha();
  clearTimeout(admRelatorios._t);
  if (!admRelatorios._ro) {
    admRelatorios._ro = true;
    addEventListener('resize', () => { clearTimeout(admRelatorios._t); admRelatorios._t = setTimeout(() => { if (location.hash.startsWith('#/adm/reports')) admRelatorios(); }, 200); });
  }
}
