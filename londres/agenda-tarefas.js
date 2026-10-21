/* =====================================================
   TAREFAS e AGENDA, versão 2 (18/10/2026)

   Pedido do Eugênio: "tem como melhorar a aba Tarefas e Agenda? dá pra
   deixar a agenda sincada com o Google Calendar?"

   TAREFAS
   - anotar é UMA linha: escreve e Enter. Quando: Hoje · Amanhã · Sem data ·
     Outro dia (um toque, sem calendário nativo no caminho). Hora opcional.
     ⚑ Importante e Pessoal são botões de liga/desliga, não formulário.
   - a lista vem em grupos que dizem o que fazer: Atrasadas, Hoje, Amanhã,
     Próximos 7 dias, Depois, Sem data. Feitas ficam escondidas (um toque mostra).
   - cada tarefa: concluir, "→ amanhã", editar no lugar, apagar, levar pro Google.
   AGENDA
   - o dia escolhido mostra as tarefas daquele dia, e o calendário marca os
     dias que têm tarefa. Abre no dia de hoje.
   - "Levar para o Google Agenda": baixa um .ics com as saídas, os trabalhos de
     agência e as tarefas dos próximos 90 dias (Google → Configurações →
     Importar). Cada reserva continua com o botão de um toque.
   Os campos da tarefa são os mesmos de antes (texto, data, prioridade, area,
   feita, nota) + hora: o assistente continua anotando do mesmo jeito.
   ===================================================== */
'use strict';

const tfGrava = () => { if (typeof save === 'function') save(); else localStorage.setItem(DB_KEY, JSON.stringify(DB)); };
const tfFuso = () => (typeof GUIA_CFG !== 'undefined' && GUIA_CFG.fuso) || 'Europe/London';
function tfDiaRot(iso) {
  const hoje = isoToday();
  if (iso === hoje) return 'hoje';
  if (iso === addDays(hoje, 1)) return 'amanhã';
  if (iso === addDays(hoje, -1)) return 'ontem';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
}
function tfGrupo(t2, hoje) {
  if (!t2.data) return 'semdata';
  if (t2.data < hoje) return 'atrasadas';
  if (t2.data === hoje) return 'hoje';
  if (t2.data === addDays(hoje, 1)) return 'amanha';
  if (t2.data <= addDays(hoje, 7)) return 'semana';
  return 'depois';
}
const TF_GRUPOS = [['atrasadas', 'Atrasadas'], ['hoje', 'Hoje'], ['amanha', 'Amanhã'], ['semana', 'Próximos 7 dias'], ['depois', 'Depois'], ['semdata', 'Sem data']];

admTarefas = function () {
  const S = admTarefas._s = admTarefas._s || { area: 'todas', feitas: false, quando: 'hoje', imp: false, pessoal: false, editar: null };
  const hoje = isoToday();
  DB.tarefas = DB.tarefas || [];
  const daArea = (t2) => S.area === 'todas' || (S.area === 'pessoal' ? t2.area === 'pessoal' : t2.area !== 'pessoal');
  const abertas = DB.tarefas.filter(t2 => !t2.feita && daArea(t2));
  const feitas = DB.tarefas.filter(t2 => t2.feita && daArea(t2)).sort((a, b) => String(b.feitaEm || '').localeCompare(String(a.feitaEm || '')));
  const grupos = {}; abertas.forEach(t2 => (grupos[tfGrupo(t2, hoje)] = grupos[tfGrupo(t2, hoje)] || []).push(t2));
  const ordem = (a, b) => (a.data || '9').localeCompare(b.data || '9') || (a.hora || '99').localeCompare(b.hora || '99') || ((b.prioridade === 'alta') - (a.prioridade === 'alta'));
  const nHoje = (grupos.hoje || []).length, nAtras = (grupos.atrasadas || []).length;
  const recados = (DB.recados || []).filter(r => !r.atendido);

  const linha = (t2) => {
    if (S.editar === t2.id) return `<li class="tf2 editando"><div class="tfEd">
      <input id="edTx" value="${esc(t2.texto)}" aria-label="Tarefa">
      <div class="tfEdLinha"><input type="date" id="edData" value="${esc(t2.data || '')}" aria-label="Dia"><input type="time" id="edHora" value="${esc(t2.hora || '')}" aria-label="Hora">
        <label class="tfTog"><input type="checkbox" id="edImp" ${t2.prioridade === 'alta' ? 'checked' : ''}> ⚑ Importante</label>
        <label class="tfTog"><input type="checkbox" id="edPes" ${t2.area === 'pessoal' ? 'checked' : ''}> Pessoal</label></div>
      <input id="edNota" value="${esc(t2.nota || '')}" placeholder="Nota (opcional)" aria-label="Nota">
      <div class="tfEdBts"><button class="cta sm" data-edsalva="${t2.id}">Salvar</button><button class="mini" data-edcancela>Cancelar</button></div></div></li>`;
    const atras = !t2.feita && t2.data && t2.data < hoje;
    const meta = [t2.hora, t2.data && !['hoje', 'amanha'].includes(tfGrupo(t2, hoje)) ? tfDiaRot(t2.data) : '', t2.area === 'pessoal' ? 'pessoal' : '', t2.nota ? esc(t2.nota) : '']
      .filter(Boolean).join(' · ');
    return `<li class="tf2 ${t2.feita ? 'feita' : ''} ${atras ? 'atrasada' : ''} ${t2.prioridade === 'alta' ? 'imp' : ''}">
      <input type="checkbox" class="tfChk" data-tf="${t2.id}" ${t2.feita ? 'checked' : ''} aria-label="Concluir: ${esc(t2.texto)}">
      <div class="tfTx"><b>${t2.prioridade === 'alta' ? '<span class="tfFlag" aria-label="importante">⚑</span> ' : ''}${esc(t2.texto)}</b>${meta ? `<small>${meta}</small>` : ''}</div>
      <div class="tfAcoes">${!t2.feita && (!t2.data || t2.data <= hoje) ? `<button class="mini" data-adia="${t2.id}" title="Passar para amanhã">→ amanhã</button>` : ''}
        ${!t2.feita && t2.data && typeof linkGoogleAgenda === 'function' ? `<a class="mini" target="_blank" rel="noopener" title="Pôr no Google Agenda" aria-label="Pôr no Google Agenda" href="${esc(linkGoogleAgenda({ titulo: t2.texto, data: t2.data, hora: t2.hora, horas: 0.5, detalhes: t2.nota || '' }))}">📅</a>` : ''}
        <button class="mini" data-ed="${t2.id}" aria-label="Editar">✎</button><button class="mini" data-del="${t2.id}" aria-label="Apagar">✕</button></div></li>`;
  };

  admShell('tarefas', `
    <div class="pagehead"><h1 class="pageh">Tarefas</h1>
      <p class="tfResumo">${nAtras ? `<span class="tfAtrasN">${nAtras} atrasada${nAtras > 1 ? 's' : ''}</span> · ` : ''}${nHoje ? `${nHoje} pra hoje` : 'nada pra hoje'}</p></div>
    <section class="card tfNova2">
      <input id="tfTx" placeholder="O que precisa fazer? Escreva e aperte Enter" autocomplete="off" aria-label="Nova tarefa">
      <div class="tfQuando" role="group" aria-label="Quando">
        ${[['hoje', 'Hoje'], ['amanha', 'Amanhã'], ['sem', 'Sem data'], ['outro', '📅 Outro dia']].map(([k, n]) => `<button class="chip ${S.quando === k ? 'on' : ''}" data-qd="${k}" aria-pressed="${S.quando === k}">${n}</button>`).join('')}
        ${S.quando === 'outro' ? `<input type="date" id="tfData" value="${esc(S.data || addDays(hoje, 2))}" aria-label="Dia">` : ''}
        <input type="time" id="tfHora" aria-label="Hora (opcional)" title="Hora (opcional)">
      </div>
      <div class="tfQuando">
        <button class="chip tgl ${S.imp ? 'on' : ''}" id="tfImp" aria-pressed="${S.imp}">⚑ Importante</button>
        <button class="chip tgl ${S.pessoal ? 'on' : ''}" id="tfPes" aria-pressed="${S.pessoal}">Pessoal</button>
        <button class="cta sm" id="tfAdd">Anotar</button>
      </div>
      <p class="why">Ou peça ao assistente: “anota: comprar ingressos da Abadia amanhã às 10”.</p>
    </section>
    <div class="chips tfFiltro">${[['todas', 'Tudo'], ['pro', 'Profissional'], ['pessoal', 'Pessoal']].map(([v, n]) => `<button class="chip ${S.area === v ? 'on' : ''}" data-ar="${v}">${n}</button>`).join('')}</div>
    ${abertas.length ? TF_GRUPOS.filter(([k]) => (grupos[k] || []).length).map(([k, n]) => `
      <section class="card tfGrupo ${k}"><h3>${n} <span class="pill ${k === 'atrasadas' ? 'warn' : ''}">${grupos[k].length}</span></h3>
        <ul class="tfLista2">${grupos[k].sort(ordem).map(linha).join('')}</ul></section>`).join('')
      : '<section class="card"><p class="empty">Nada pendente. ✨ Anote a próxima coisa aí em cima.</p></section>'}
    ${feitas.length ? `<button class="mini tfVerFeitas" id="tfFeitas">${S.feitas ? 'Esconder' : 'Mostrar'} as feitas (${feitas.length})</button>
      ${S.feitas ? `<section class="card tfGrupo feitas"><ul class="tfLista2">${feitas.slice(0, 40).map(linha).join('')}</ul></section>` : ''}` : ''}
    <section class="card"><h3>Recados ${recados.length ? `<span class="pill warn">${recados.length}</span>` : ''}</h3>
      <p class="why">O que chega pelo atendimento (WhatsApp e Instagram) e precisa de você.</p>
      ${recados.map(r => `<div class="hjItem"><span class="hjIc">${r.canal === 'insta' ? '📸' : '💬'}</span><div><b>${esc(r.nome)}</b><small>${esc(r.texto)}</small></div><button class="mini" data-rc="${r.id}">Resolvido</button></div>`).join('') || '<p class="empty">Nenhum recado.</p>'}
    </section>`);

  const redesenha = () => admTarefas();
  const acha = (id) => DB.tarefas.find(z => z.id === id);
  const anota = () => {
    const tx = $('#tfTx').value.trim();
    if (!tx) { $('#tfTx').focus(); return; }
    const data = S.quando === 'hoje' ? hoje : S.quando === 'amanha' ? addDays(hoje, 1) : S.quando === 'outro' ? ($('#tfData').value || '') : '';
    DB.tarefas.push({ id: 'tf' + uid(), texto: tx, data, hora: $('#tfHora').value || '', prioridade: S.imp ? 'alta' : 'media', area: S.pessoal ? 'pessoal' : 'pro', feita: false, criada: new Date().toISOString() });
    tfGrava(); toast('Anotado ✓'); redesenha();
    setTimeout(() => { const i = $('#tfTx'); if (i) i.focus(); }, 30);
  };
  $('#tfTx').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); anota(); } };
  $('#tfAdd').onclick = anota;
  $$('[data-qd]').forEach(b => b.onclick = () => { const tx = $('#tfTx').value; S.quando = b.dataset.qd; redesenha(); $('#tfTx').value = tx; });
  if ($('#tfData')) $('#tfData').onchange = (e) => { S.data = e.target.value; };
  $('#tfImp').onclick = () => { const tx = $('#tfTx').value; S.imp = !S.imp; redesenha(); $('#tfTx').value = tx; };
  $('#tfPes').onclick = () => { const tx = $('#tfTx').value; S.pessoal = !S.pessoal; redesenha(); $('#tfTx').value = tx; };
  $$('[data-ar]').forEach(b => b.onclick = () => { S.area = b.dataset.ar; redesenha(); });
  if ($('#tfFeitas')) $('#tfFeitas').onclick = () => { S.feitas = !S.feitas; redesenha(); };
  $$('[data-tf]').forEach(c => c.onchange = () => {
    const t2 = acha(c.dataset.tf); if (!t2) return;
    t2.feita = c.checked; t2.feitaEm = c.checked ? new Date().toISOString() : '';
    tfGrava(); if (c.checked) toast('Feito ✓'); redesenha();
  });
  $$('[data-adia]').forEach(b => b.onclick = () => { const t2 = acha(b.dataset.adia); if (!t2) return; t2.data = addDays(hoje, 1); tfGrava(); toast('Passou para amanhã'); redesenha(); });
  $$('[data-ed]').forEach(b => b.onclick = () => { S.editar = b.dataset.ed; redesenha(); setTimeout(() => { const i = $('#edTx'); if (i) i.focus(); }, 30); });
  $$('[data-edcancela]').forEach(b => b.onclick = () => { S.editar = null; redesenha(); });
  $$('[data-edsalva]').forEach(b => b.onclick = () => {
    const t2 = acha(b.dataset.edsalva); if (!t2) return;
    const tx = $('#edTx').value.trim(); if (!tx) { $('#edTx').focus(); return; }
    Object.assign(t2, { texto: tx, data: $('#edData').value || '', hora: $('#edHora').value || '', prioridade: $('#edImp').checked ? 'alta' : 'media',
      area: $('#edPes').checked ? 'pessoal' : 'pro', nota: $('#edNota').value.trim() });
    S.editar = null; tfGrava(); toast('Salvo ✓'); redesenha();
  });
  $$('[data-del]').forEach(b => b.onclick = () => {
    const t2 = acha(b.dataset.del); if (!t2 || !confirm(`Apagar “${t2.texto}”?`)) return;
    DB.tarefas = DB.tarefas.filter(z => z.id !== t2.id); tfGrava(); redesenha();
  });
  $$('[data-rc]').forEach(b => b.onclick = () => { const r = (DB.recados || []).find(z => z.id === b.dataset.rc); if (r) r.atendido = true; tfGrava(); redesenha(); });
};

/* =====================================================
   AGENDA: tarefas do dia + Google Agenda
   ===================================================== */
const _admAgendaBase = admAgenda;
admAgenda = function () {
  /* abre no dia de hoje (antes abria no 1º dia com saída do mês, às vezes já passado) */
  if (!admAgenda._d && (!admAgenda._m || admAgenda._m === isoToday().slice(0, 7))) admAgenda._d = isoToday();
  _admAgendaBase();
  const hoje = isoToday(), tarefas = (DB.tarefas || []).filter(t2 => !t2.feita && t2.data);
  const porDia = {}; tarefas.forEach(t2 => (porDia[t2.data] = porDia[t2.data] || []).push(t2));
  /* marquinha nos dias com tarefa */
  $$('#agGrid .agc[data-d]').forEach(c => {
    const n = (porDia[c.dataset.d] || []).length;
    if (n) c.insertAdjacentHTML('beforeend', `<em class="agTf" title="${n} tarefa${n > 1 ? 's' : ''}">✓${n}</em>`);
  });
  const selEl = $('#agGrid .agc.on'), sel = selEl ? selEl.dataset.d : hoje;
  const doDia = (porDia[sel] || []).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
  const cartaoDia = $$('.two-col > .card')[1];
  if (cartaoDia) cartaoDia.insertAdjacentHTML('beforeend', `<div class="agTarefas"><h4>Tarefas do dia ${doDia.length ? `<span class="pill">${doDia.length}</span>` : ''}</h4>
    ${doDia.length ? doDia.map(t2 => `<label class="agTfItem"><input type="checkbox" data-agtf="${t2.id}"><span>${t2.hora ? `<b class="mono">${t2.hora}</b> ` : ''}${t2.prioridade === 'alta' ? '⚑ ' : ''}${esc(t2.texto)}</span></label>`).join('')
      : '<p class="empty">Nenhuma tarefa neste dia.</p>'}
    <button class="mini" id="agNovaTf">+ Tarefa neste dia</button></div>`);
  /* Google Agenda */
  const ate = addDays(hoje, 90), ev = eventosAgenda(hoje, ate);
  const main = $('.two-col');
  if (main) main.insertAdjacentHTML('afterend', `<section class="card agGoogle"><h3>📅 Levar para o Google Agenda</h3>
    <p class="why">Cada reserva tem o botão <b>Google Agenda</b>: um toque e o passeio entra na sua agenda. Para levar <b>tudo de uma vez</b>:</p>
    <div class="ctBtns"><button class="cta sm" id="agIcs">⬇ Baixar a agenda dos próximos 90 dias</button>
      <span class="why">${ev.filter(e => e.tipo === 'saida').length} passeios · ${ev.filter(e => e.tipo === 'agencia').length} trabalhos de agência · ${ev.filter(e => e.tipo === 'tarefa').length} tarefas</span></div>
    <ol class="agPassos"><li>Toque em baixar: vem um arquivo <span class="mono">.ics</span>.</li>
      <li>No computador, abra o <b>Google Agenda</b> → ⚙ Configurações → <b>Importar e exportar</b> → Importar.</li>
      <li>Escolha o arquivo e a agenda. Pronto: tudo aparece no celular também.</li></ol></section>`);
  $$('[data-agtf]').forEach(c => c.onchange = () => { const t2 = (DB.tarefas || []).find(z => z.id === c.dataset.agtf); if (t2) { t2.feita = true; t2.feitaEm = new Date().toISOString(); tfGrava(); toast('Feito ✓'); admAgenda(); } });
  if ($('#agNovaTf')) $('#agNovaTf').onclick = () => { const S = admTarefas._s = admTarefas._s || {}; S.quando = sel === hoje ? 'hoje' : sel === addDays(hoje, 1) ? 'amanha' : 'outro'; S.data = sel; go('/adm/tarefas'); };
  if ($('#agIcs')) $('#agIcs').onclick = () => baixaIcs(ev);
};

/* tudo que tem dia e hora entre de..ate: reservas confirmadas, trabalhos de agência marcados, tarefas abertas */
function eventosAgenda(de, ate) {
  const L = [];
  for (const b of DB.bookings || []) {
    if (b.status !== 'confirmed' || b.date < de || b.date > ate) continue;
    const x = Tours.get(b.tourId) || { name: { pt: 'Passeio' }, meeting: '' };
    L.push({ tipo: 'saida', uid: 'res-' + b.code, data: b.date, hora: b.time, horas: b.horas || (Array.isArray(x.horas) ? x.horas[0] : 4),
      titulo: `${tl(x.name)} — ${String(b.name).split(' ')[0]} (${b.pax} pax)`, local: noIdioma(x.meeting) || '', nota: `Reserva ${b.code}` });
  }
  for (const j of DB.trabalhosAgencia || []) {
    if (j.status === 'cancelado' || !j.data || j.data < de || j.data > ate) continue;
    const ag = (DB.agencias || []).find(a => a.id === j.agencia) || { nome: 'Agência' };
    L.push({ tipo: 'agencia', uid: 'ag-' + j.id, data: j.data, hora: j.hora || '', horas: 4, titulo: `${ag.nome}: ${j.servico || 'trabalho'}${j.pax ? ' (' + j.pax + ' pax)' : ''}`, local: '', nota: j.cliente || '' });
  }
  for (const t2 of DB.tarefas || []) {
    if (t2.feita || !t2.data || t2.data < de || t2.data > ate) continue;
    L.push({ tipo: 'tarefa', uid: 'tf-' + t2.id, data: t2.data, hora: t2.hora || '', horas: 0.5, titulo: (t2.prioridade === 'alta' ? '⚑ ' : '') + t2.texto, local: '', nota: t2.nota || '' });
  }
  return L.sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
}
function icsTexto(ev) {
  const fz = tfFuso(), esc2 = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
  const dia = (iso) => iso.replace(/-/g, '');
  const carimbo = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rotta//Agenda do guia//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc2(guiaNegocio())}`, `X-WR-TIMEZONE:${fz}`];
  for (const e of ev) {
    linhas.push('BEGIN:VEVENT', `UID:${e.uid}@rotta`, `DTSTAMP:${carimbo}`);
    const hm = /^(\d{1,2}):(\d{2})/.exec(e.hora || '');
    if (hm) {
      const ini = +hm[1] * 60 + +hm[2], fim = ini + Math.round((+e.horas || 1) * 60);
      const hh = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + String(m % 60).padStart(2, '0') + '00';
      const dFim = fim >= 1440 ? addDays(e.data, 1) : e.data;
      linhas.push(`DTSTART;TZID=${fz}:${dia(e.data)}T${hh(ini)}`, `DTEND;TZID=${fz}:${dia(dFim)}T${hh(fim)}`);
    } else linhas.push(`DTSTART;VALUE=DATE:${dia(e.data)}`, `DTEND;VALUE=DATE:${dia(addDays(e.data, 1))}`);
    linhas.push(`SUMMARY:${esc2(e.titulo)}`);
    if (e.local) linhas.push(`LOCATION:${esc2(e.local)}`);
    if (e.nota) linhas.push(`DESCRIPTION:${esc2(e.nota)}`);
    linhas.push('END:VEVENT');
  }
  linhas.push('END:VCALENDAR');
  return linhas.join('\r\n');
}
function baixaIcs(ev) {
  if (!ev.length) { toast('Nada nos próximos 90 dias.'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([icsTexto(ev)], { type: 'text/calendar;charset=utf-8' }));
  a.download = `agenda-${isoToday()}.ics`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Agenda baixada ✓ Agora é só importar no Google Agenda');
}

if (typeof module !== 'undefined') module.exports = { tfGrupo, eventosAgenda, icsTexto };
