/* =====================================================
   PAINEL DO FOTÓGRAFO — contas, tarefas e anotações (29/09/2026)

   Pedido do Eugênio: "tinha que ter um dashboard inicial das contas da
   pessoa, entradas e tudo mais, e ter o tarefas, anotações".

   Fica num arquivo próprio, pendurado no app por fora (como o
   assistente.js faz com Atendimento e Marketing): o app do guia continua
   sendo a fonte, e uma atualização vinda dele não apaga nada disto.

   Três peças:
   1. A aba HOJE vira um painel: recebido no mês, a receber, ensaios do
      mês, ticket médio, os últimos seis meses em barras, os próximos
      ensaios e as tarefas do dia.
   2. Uma aba TAREFAS: coisa para fazer (com ou sem dia) e anotação solta
      (ideia, local novo, parceria).
   3. O ASSISTENTE alcança as duas — lê as contas e as tarefas, anota,
      risca e apaga, sempre com o cartão de confirmação (regra da casa:
      aba nova sem ferramenta é assistente pela metade).

   Carregado DEPOIS do assistente.js.
   ===================================================== */
'use strict';

/* ---------- 1. as tarefas ---------- */
const Tarefas = {
  all() { if (!Array.isArray(DB.tarefas)) DB.tarefas = []; return DB.tarefas; },
  get(id) { return this.all().find(x => x.id === id); },
  add({ texto, nota = '', dia = '', tipo = 'tarefa' }) {
    const x = { id: uid(), tipo: tipo === 'nota' ? 'nota' : 'tarefa', texto: String(texto).slice(0, 160),
      nota: String(nota || '').slice(0, 1200), dia: /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : '',
      feita: false, feitaEm: '', criadaEm: new Date().toISOString() };
    this.all().unshift(x); save(); return x;
  },
  /* riscar grava a hora junto — senão a lista de feitas não sabe ordenar */
  alterna(id) {
    const x = this.get(id); if (!x) return;
    x.feita = !x.feita; x.feitaEm = x.feita ? new Date().toISOString() : ''; save();
  },
  remove(id) { DB.tarefas = this.all().filter(x => x.id !== id); save(); },
  pendentes() {
    return this.all().filter(x => x.tipo === 'tarefa' && !x.feita)
      .sort((a, b) => (a.dia || '9999').localeCompare(b.dia || '9999'));
  },
  notas() { return this.all().filter(x => x.tipo === 'nota'); },
  feitas() { return this.all().filter(x => x.tipo === 'tarefa' && x.feita).sort((a, b) => b.feitaEm.localeCompare(a.feitaEm)); },
};

/* exemplos da demonstração — só quando é demo e ainda não há nada */
(function sementeTarefas() {
  if (!DB || !DB.demo || Array.isArray(DB.tarefas)) return;
  const h = isoToday(), d = (n) => addDays(h, n), agora = new Date().toISOString();
  const T = (texto, dia, nota = '', feita = false) => ({ id: uid(), tipo: 'tarefa', texto, nota, dia,
    feita, feitaEm: feita ? agora : '', criadaEm: agora });
  const N = (texto, nota) => ({ id: uid(), tipo: 'nota', texto, nota, dia: '', feita: false, feitaEm: '', criadaEm: agora });
  DB.tarefas = [
    T('Cobrar o saldo da Luiza (15 anos da filha)', d(1), 'Metade já veio no sinal. Combinado: o resto até a véspera.'),
    T('Editar e entregar as fotos da Camila', d(2), '30 fotos tratadas, entrega por link.'),
    T('Confirmar o ponto do pedido do Gustavo', d(5), "Ele quer a Pont d'Iéna, 7h, antes do sol. Ver o sinal combinado."),
    T('Renovar o seguro do equipamento', d(12)),
    T('Mandar o orçamento de família para a Paula', d(-1), '', true),
    N('Ideia: pacote de Natal nas Galeries Lafayette', 'Ensaio de 40 min com a árvore ao fundo. Testar € 250 em dezembro.'),
    N('Locais novos para testar', 'Rue Crémieux (casas coloridas) · Pont Alexandre III no pôr do sol · Café de Flore bem cedo.'),
    N('Parceria com o hotel no Marais', 'Falar com a concierge sobre deixar os cartões com o QR na recepção.'),
  ];
  save();
})();

/* ---------- 2. as contas ---------- */
const Contas = {
  ativas() { return DB.bookings.filter(b => b.status !== 'cancelled'); },
  recebidoEm(prefixo) {
    let s = 0;
    for (const b of this.ativas()) for (const p of (b.payments || [])) if ((p.date || '').startsWith(prefixo)) s += +p.amount || 0;
    return s;
  },
  aReceber() { return this.ativas().filter(b => b.status === 'confirmed').reduce((s, b) => s + Bookings.due(b), 0); },
  ensaiosNoMes(prefixo) { return this.ativas().filter(b => (b.date || '').startsWith(prefixo)).length; },
  ticketMedio() {
    const desde = addDays(isoToday(), -120);
    const l = this.ativas().filter(b => b.date >= desde && b.total > 0);
    return l.length ? Math.round(l.reduce((s, b) => s + b.total, 0) / l.length) : 0;
  },
  /* os últimos n meses, do mais antigo para o atual */
  meses(n = 6) {
    const out = [], base = new Date(isoToday() + 'T12:00:00');
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const pref = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      out.push({ pref, rot: d.toLocaleDateString(locale(), { month: 'short' }).replace('.', ''), valor: this.recebidoEm(pref) });
    }
    return out;
  },
  proximos(dias = 10) {
    const h = isoToday(), ate = addDays(h, dias);
    return this.ativas().filter(b => b.status === 'confirmed' && b.date >= h && b.date <= ate)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  },
};

/* ---------- textos ---------- */
Object.assign(STR, {
  admTarefas:   { pt: 'Tarefas', en: 'Tasks' },
  pnRecebido:   { pt: 'Recebido em {mes}', en: 'Received in {mes}' },
  pnAReceber:   { pt: 'A receber', en: 'To receive' },
  pnEnsaiosMes: { pt: 'Ensaios em {mes}', en: 'Sessions in {mes}' },
  pnTicket:     { pt: 'Ticket médio', en: 'Average ticket' },
  pnSeisMeses:  { pt: 'Entradas dos últimos seis meses', en: 'Income, last six months' },
  pnProximos:   { pt: 'Próximos ensaios', en: 'Next sessions' },
  pnNenhumProx: { pt: 'Nenhum ensaio nos próximos dez dias.', en: 'No sessions in the next ten days.' },
  pnPago:       { pt: 'pago', en: 'paid' },
  pnFalta:      { pt: 'falta {v}', en: '{v} due' },
  pnHoje:       { pt: 'hoje', en: 'today' },
  pnAmanha:     { pt: 'amanhã', en: 'tomorrow' },
  pnTarefasDia: { pt: 'Para fazer', en: 'To do' },
  pnVerTodas:   { pt: 'Ver todas', en: 'See all' },
  pnSemTarefa:  { pt: 'Nada pendente. Aproveite.', en: 'Nothing pending. Enjoy.' },
  pnBomDia:     { pt: 'Bom dia', en: 'Good morning' },
  pnBoaTarde:   { pt: 'Boa tarde', en: 'Good afternoon' },
  pnBoaNoite:   { pt: 'Boa noite', en: 'Good evening' },
  pnResumo:     { pt: 'Você tem {n} ensaio(s) nos próximos dez dias e {v} para receber.', en: 'You have {n} session(s) in the next ten days and {v} to receive.' },
  tfNova:       { pt: 'Anotar', en: 'Add' },
  tfTexto:      { pt: 'O que é?', en: 'What is it?' },
  tfTextoPh:    { pt: 'ex.: editar as fotos da Camila', en: 'e.g. edit Camila’s photos' },
  tfDia:        { pt: 'Para quando (opcional)', en: 'When (optional)' },
  tfNota:       { pt: 'Detalhes (opcional)', en: 'Details (optional)' },
  tfTipoTarefa: { pt: 'Tarefa', en: 'Task' },
  tfTipoNota:   { pt: 'Anotação', en: 'Note' },
  tfFazer:      { pt: 'Para fazer', en: 'To do' },
  tfNotas:      { pt: 'Anotações e ideias', en: 'Notes & ideas' },
  tfFeitas:     { pt: 'Feitas', en: 'Done' },
  tfVazioFazer: { pt: 'Nada para fazer. Anote a primeira acima — ou peça ao assistente.', en: 'Nothing to do. Add the first one above — or ask the assistant.' },
  tfVazioNotas: { pt: 'Local novo, ideia de pacote, parceria: guarde aqui.', en: 'New spot, package idea, partnership: keep it here.' },
  tfAtrasada:   { pt: 'atrasada', en: 'overdue' },
  tfApagar:     { pt: 'Apagar', en: 'Delete' },
  tfApagarConf: { pt: 'Apagar esta anotação?', en: 'Delete this note?' },
  tfDica:       { pt: 'Dica: fale com o assistente — “anota pra eu cobrar o saldo da Luiza amanhã” — e ele põe aqui.',
                  en: 'Tip: tell the assistant — “remind me to collect Luiza’s balance tomorrow” — and it lands here.' },
});

/* ---------- estilo ---------- */
document.head.insertAdjacentHTML('beforeend', `<style id="painelCss">
.pn-top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px}
.pn-top p{color:var(--ink-2);font-size:var(--fs-3);margin-top:4px}
.pn-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0}
.pn-k{background:var(--surface);border-radius:var(--r-lg);box-shadow:var(--sh-1);padding:16px 16px 14px;position:relative;overflow:hidden}
.pn-k small{display:block;font-size:var(--fs-1);color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.pn-k b{display:block;font-family:var(--f-display);font-size:var(--fs-7);line-height:1.1;margin-top:8px;color:var(--ink)}
.pn-k i{font-style:normal;font-size:var(--fs-2);color:var(--ink-3)}
.pn-k.dest{background:var(--accent);color:var(--accent-ink)}
.pn-k.dest small,.pn-k.dest i,.pn-k.dest b{color:var(--accent-ink)}
.pn-k .ico{position:absolute;right:12px;top:12px;opacity:.55}
.pn-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:14px}
.pn-bars{display:flex;align-items:flex-end;gap:10px;height:150px;padding-top:10px}
.pn-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:6px}
.pn-bar span{display:block;width:100%;max-width:46px;border-radius:8px 8px 3px 3px;background:var(--accent-wash);border:1px solid var(--accent-line);min-height:4px}
.pn-bar.atual span{background:var(--accent);border-color:var(--accent)}
.pn-bar em{font-style:normal;font-size:var(--fs-1);color:var(--ink-3);text-transform:capitalize}
.pn-bar strong{font-size:var(--fs-1);color:var(--ink-2);font-weight:600;white-space:nowrap}
.pn-prox{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line)}
.pn-prox:first-of-type{border-top:0}
.pn-dia{width:48px;flex:none;text-align:center;border-radius:12px;background:var(--surface-2);padding:6px 0}
.pn-dia b{display:block;font-size:var(--fs-5);line-height:1}
.pn-dia small{font-size:var(--fs-1);color:var(--ink-3);text-transform:uppercase}
.pn-prox .q{flex:1;min-width:0}
.pn-prox .q b{display:block;font-size:var(--fs-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pn-prox .q small{color:var(--ink-3);font-size:var(--fs-2)}
.pn-tag{font-size:var(--fs-1);font-weight:700;border-radius:var(--r-pill);padding:4px 10px;white-space:nowrap}
.pn-tag.ok{background:var(--ok-wash);color:var(--ok)}
.pn-tag.falta{background:var(--warn-wash);color:var(--warn)}
.tf-item{display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-top:1px solid var(--line)}
.tf-item:first-child{border-top:0}
.tf-check{width:24px;height:24px;flex:none;border-radius:8px;border:2px solid var(--line-2);background:transparent;cursor:pointer;
  display:grid;place-items:center;color:var(--accent-ink);font-size:14px;margin-top:1px}
.tf-check.on{background:var(--accent);border-color:var(--accent)}
.tf-item .q{flex:1;min-width:0}
.tf-item .q b{display:block;font-size:var(--fs-3);font-weight:600}
.tf-item.feita .q b{text-decoration:line-through;color:var(--ink-3)}
.tf-item .q p{font-size:var(--fs-2);color:var(--ink-2);margin-top:3px;line-height:1.45;white-space:pre-wrap}
.tf-item .tf-quando{font-size:var(--fs-1);color:var(--ink-3);font-weight:600;white-space:nowrap}
.tf-item .tf-quando.atraso{color:var(--danger)}
.tf-del{background:none;border:0;color:var(--ink-3);cursor:pointer;font-size:18px;padding:0 4px}
.tf-nota{background:var(--surface-2);border-radius:var(--r);padding:12px 14px;margin-top:10px}
.tf-nota b{display:block;font-size:var(--fs-3)}
.tf-nota p{font-size:var(--fs-2);color:var(--ink-2);margin-top:4px;line-height:1.5;white-space:pre-wrap}
.tf-form{display:grid;grid-template-columns:1fr 170px;gap:10px;align-items:end}
.tf-tipos{display:flex;gap:6px;margin-bottom:10px}
.tf-tipos button{border:1px solid var(--line-2);background:transparent;color:var(--ink-2);border-radius:var(--r-pill);
  padding:7px 14px;font:inherit;font-size:var(--fs-2);cursor:pointer}
.tf-tipos button.on{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:600}
.tf-dica{font-size:var(--fs-2);color:var(--ink-3);margin-top:10px}
@media (max-width:760px){
  .pn-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .pn-grid{grid-template-columns:1fr}
  .tf-form{grid-template-columns:1fr}
}
</style>`);

const PN_ICO = {
  entrada: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v14"/><path d="m6 11 6 6 6-6"/><path d="M5 21h14"/></svg>',
  relogio: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  camera:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  ticket:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M13 7v10" stroke-dasharray="2 2"/></svg>',
};

function pnMes(pref) {
  const d = new Date(pref + '-15T12:00:00');
  return d.toLocaleDateString(locale(), { month: 'long' });
}
function pnSaudacao() {
  const h = new Date().getHours();
  return t(h < 12 ? 'pnBomDia' : h < 18 ? 'pnBoaTarde' : 'pnBoaNoite');
}
function pnDiaRel(iso) {
  const h = isoToday();
  if (iso === h) return t('pnHoje');
  if (iso === addDays(h, 1)) return t('pnAmanha');
  return fmtDate(iso);
}
function pnTarefaHtml(x, curta) {
  const atraso = x.dia && !x.feita && x.dia < isoToday();
  return `<div class="tf-item ${x.feita ? 'feita' : ''}">
    <button class="tf-check ${x.feita ? 'on' : ''}" data-tf="${x.id}" aria-label="ok">${x.feita ? '✓' : ''}</button>
    <div class="q"><b>${esc(x.texto)}</b>${!curta && x.nota ? `<p>${esc(x.nota)}</p>` : ''}</div>
    ${x.dia ? `<span class="tf-quando ${atraso ? 'atraso' : ''}">${atraso ? t('tfAtrasada') + ' · ' : ''}${esc(pnDiaRel(x.dia))}</span>` : ''}
    ${curta ? '' : `<button class="tf-del" data-tfdel="${x.id}" title="${t('tfApagar')}">×</button>`}
  </div>`;
}

/* ---------- 3. a aba HOJE vira o painel ---------- */
admToday = function admTodayPainel() {
  const h = isoToday(), mes = h.slice(0, 7);
  const late = Bookings.all().filter(b => b.status === 'confirmed' && Bookings.due(b) > 0 && Bookings.dueDate(b) < h);
  const meses = Contas.meses(6), maior = Math.max(1, ...meses.map(m => m.valor));
  const prox = Contas.proximos(10), aReceber = Contas.aReceber();
  const tarefas = Tarefas.pendentes().slice(0, 5);

  admShell('today', `
    <div class="pn-top">
      <div><h1 class="pageh" style="margin:0">${pnSaudacao()}, ${esc(guiaNome())}</h1>
        <p>${t('pnResumo', { n: prox.length, v: eur(aReceber) })}</p></div>
    </div>
    ${late.length ? `<div class="alert bad">⚠ ${late.length} ${t('xAtrasados')} · ${eur(late.reduce((s, b) => s + Bookings.due(b), 0))} <button class="mini" id="goLate">${t('admBookings')} →</button></div>` : ''}

    <div class="pn-kpis">
      <div class="pn-k dest"><span class="ico">${PN_ICO.entrada}</span><small>${t('pnRecebido', { mes: pnMes(mes) })}</small><b>${eur(Contas.recebidoEm(mes))}</b></div>
      <div class="pn-k"><span class="ico">${PN_ICO.relogio}</span><small>${t('pnAReceber')}</small><b>${eur(aReceber)}</b></div>
      <div class="pn-k"><span class="ico">${PN_ICO.camera}</span><small>${t('pnEnsaiosMes', { mes: pnMes(mes) })}</small><b>${Contas.ensaiosNoMes(mes)}</b></div>
      <div class="pn-k"><span class="ico">${PN_ICO.ticket}</span><small>${t('pnTicket')}</small><b>${eur(Contas.ticketMedio())}</b></div>
    </div>

    <div class="pn-grid">
      <section class="card">
        <h3>${t('pnSeisMeses')}</h3>
        <div class="pn-bars">${meses.map((m, i) => `
          <div class="pn-bar ${i === meses.length - 1 ? 'atual' : ''}">
            <strong>${m.valor ? eur(m.valor) : '—'}</strong>
            <span style="height:${Math.max(4, Math.round(m.valor / maior * 100))}%"></span>
            <em>${esc(m.rot)}</em>
          </div>`).join('')}
        </div>
      </section>
      <section class="card">
        <h3 style="display:flex;justify-content:space-between;align-items:center">${t('pnTarefasDia')}
          <button class="mini" id="pnVerTarefas">${t('pnVerTodas')} →</button></h3>
        ${tarefas.length ? tarefas.map(x => pnTarefaHtml(x, true)).join('') : `<p class="empty">${t('pnSemTarefa')}</p>`}
      </section>
    </div>

    <section class="card">
      <h3>${t('pnProximos')}</h3>
      ${prox.length ? prox.map(b => {
        const x = Tours.get(b.tourId), falta = Bookings.due(b), d = new Date(b.date + 'T12:00:00');
        return `<div class="pn-prox">
          <div class="pn-dia"><b>${d.getDate()}</b><small>${d.toLocaleDateString(locale(), { month: 'short' }).replace('.', '')}</small></div>
          <div class="q"><b>${esc(b.name)}</b><small>${esc(pnDiaRel(b.date))} · ${esc(b.time)} · ${esc(x ? tl(x.name) : '')}</small></div>
          <span class="pn-tag ${falta > 0 ? 'falta' : 'ok'}">${falta > 0 ? t('pnFalta', { v: eur(falta) }) : t('pnPago')}</span>
        </div>`;
      }).join('') : `<p class="empty">${t('pnNenhumProx')}</p>`}
    </section>`);

  const gl = $('#goLate'); if (gl) gl.onclick = () => go('/adm/bookings');
  $('#pnVerTarefas').onclick = () => go('/adm/tarefas');
  $$('[data-tf]').forEach(b => b.onclick = () => { Tarefas.alterna(b.dataset.tf); admToday(); });
};

/* ---------- 4. a aba TAREFAS ---------- */
function admTarefas() {
  const tipo = admTarefas._tipo || 'tarefa';
  const fazer = Tarefas.pendentes(), notas = Tarefas.notas(), feitas = Tarefas.feitas();
  admShell('tarefas', `
    <h1 class="pageh">${t('admTarefas')}</h1>
    <section class="card">
      <div class="tf-tipos">
        <button data-tipo="tarefa" class="${tipo === 'tarefa' ? 'on' : ''}">${t('tfTipoTarefa')}</button>
        <button data-tipo="nota" class="${tipo === 'nota' ? 'on' : ''}">${t('tfTipoNota')}</button>
      </div>
      <div class="tf-form">
        <label class="fld">${t('tfTexto')}<input id="tfTexto" placeholder="${t('tfTextoPh')}"></label>
        ${tipo === 'tarefa' ? `<label class="fld">${t('tfDia')}<input id="tfDia" type="date"></label>` : '<span></span>'}
      </div>
      <label class="fld" style="margin-top:10px">${t('tfNota')}<textarea id="tfNota" rows="2"></textarea></label>
      <button class="cta" id="tfAdd" style="margin-top:12px">${t('tfNova')}</button>
      <p class="tf-dica">${t('tfDica')}</p>
    </section>

    <section class="card">
      <h3>${t('tfFazer')} <span class="pill n">${fazer.length}</span></h3>
      ${fazer.length ? fazer.map(x => pnTarefaHtml(x)).join('') : `<p class="empty">${t('tfVazioFazer')}</p>`}
    </section>

    <section class="card">
      <h3>${t('tfNotas')} <span class="pill n">${notas.length}</span></h3>
      ${notas.length ? notas.map(x => `<div class="tf-nota">
        <div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(x.texto)}</b>
        <button class="tf-del" data-tfdel="${x.id}" title="${t('tfApagar')}">×</button></div>
        ${x.nota ? `<p>${esc(x.nota)}</p>` : ''}</div>`).join('') : `<p class="empty">${t('tfVazioNotas')}</p>`}
    </section>

    ${feitas.length ? `<section class="card">
      <h3>${t('tfFeitas')} <span class="pill n">${feitas.length}</span></h3>
      ${feitas.slice(0, 20).map(x => pnTarefaHtml(x)).join('')}
    </section>` : ''}`);

  $$('[data-tipo]').forEach(b => b.onclick = () => { admTarefas._tipo = b.dataset.tipo; admTarefas(); });
  $('#tfAdd').onclick = () => {
    const texto = $('#tfTexto').value.trim(); if (!texto) { $('#tfTexto').focus(); return; }
    Tarefas.add({ texto, nota: $('#tfNota').value.trim(), dia: ($('#tfDia') || {}).value || '', tipo });
    admTarefas();
  };
  $$('[data-tf]').forEach(b => b.onclick = () => { Tarefas.alterna(b.dataset.tf); admTarefas(); });
  $$('[data-tfdel]').forEach(b => b.onclick = () => {
    if (confirm(t('tfApagarConf'))) { Tarefas.remove(b.dataset.tfdel); admTarefas(); }
  });
}

/* a aba entra logo depois de "Hoje" */
if (!ADM_TABS.some(([id]) => id === 'tarefas')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'today');
  ADM_TABS.splice(i + 1, 0, ['tarefas', 'admTarefas']);
}
const _viewAdmAntesDoPainel = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'tarefas') { admTarefas(); if (typeof marcaExtras === 'function') marcaExtras(); }
  else _viewAdmAntesDoPainel(tab, arg);
};

/* ---------- 5. o assistente alcança tudo isto ---------- */
if (typeof IA_FERRAMENTAS !== 'undefined') {
  IA_FERRAMENTAS.push(
    { name: 'ver_tarefas', description: 'Tarefas (para fazer, com dia opcional), anotações/ideias e as feitas recentes, com id.', input_schema: obj() },
    { name: 'ver_contas', description: 'Painel financeiro: recebido no mês, a receber, ensaios do mês, ticket médio, entradas dos últimos seis meses e os próximos ensaios.', input_schema: obj() },
    { name: 'anotar_tarefa', description: 'Anota uma TAREFA (coisa para fazer, com dia opcional AAAA-MM-DD) ou uma NOTA (ideia, local novo, parceria — sem dia). Título curto em texto; o detalhe em nota.',
      input_schema: obj({ texto: S_(), nota: S_(), dia: S_(), tipo: { type: 'string', enum: ['tarefa', 'nota'] } }, ['texto']) },
    { name: 'riscar_tarefa', description: 'Marca uma tarefa como feita (ou desmarca). Use o id de ver_tarefas.', input_schema: obj({ tarefa_id: S_() }, ['tarefa_id']) },
    { name: 'apagar_tarefa', description: 'Apaga uma tarefa ou anotação. Use o id de ver_tarefas.', input_schema: obj({ tarefa_id: S_() }, ['tarefa_id']) },
  );
  IA_LEITURA.add('ver_tarefas'); IA_LEITURA.add('ver_contas');

  Object.assign(IA_TXT, {
    cAnotar:  { pt: 'Anotar', en: 'Add note' },
    cRiscar:  { pt: 'Marcar como feita', en: 'Mark as done' },
    cDesriscar: { pt: 'Voltar para fazer', en: 'Mark as not done' },
    cApagarT: { pt: 'Apagar anotação', en: 'Delete note' },
    cTipo:    { pt: 'Tipo', en: 'Type' },
    cTexto:   { pt: 'O quê', en: 'What' },
    cDia:     { pt: 'Para quando', en: 'When' },
    cDetalhe: { pt: 'Detalhe', en: 'Details' },
  });

  const _leituraAntes = iaLeitura;
  iaLeitura = function (nome, i) {
    if (nome === 'ver_tarefas') {
      const fz = Tarefas.pendentes(), nt = Tarefas.notas(), ft = Tarefas.feitas().slice(0, 10);
      return { para_fazer: fz.map(x => ({ id: x.id, texto: x.texto, dia: x.dia || null, atrasada: !!(x.dia && x.dia < isoToday()), nota: x.nota || '' })),
        anotacoes: nt.map(x => ({ id: x.id, texto: x.texto, nota: x.nota || '' })),
        feitas_recentes: ft.map(x => ({ id: x.id, texto: x.texto })) };
    }
    if (nome === 'ver_contas') {
      const mes = isoToday().slice(0, 7);
      return { recebido_no_mes: Contas.recebidoEm(mes), a_receber: Contas.aReceber(), ensaios_no_mes: Contas.ensaiosNoMes(mes),
        ticket_medio: Contas.ticketMedio(), ultimos_seis_meses: Contas.meses(6).map(m => ({ mes: m.pref, recebido: m.valor })),
        proximos_ensaios: Contas.proximos(10).map(b => ({ cliente: b.name, data: b.date, hora: b.time,
          ensaio: (Tours.get(b.tourId) ? tl(Tours.get(b.tourId).name) : ''), falta_receber: Bookings.due(b) })) };
    }
    return _leituraAntes(nome, i);
  };

  const _planoAntes = iaPlano;
  iaPlano = function (nome, i) {
    const E = (m) => ({ erro: m });
    if (nome === 'anotar_tarefa') {
      const texto = String(i.texto || '').trim(); if (!texto) return E('diga o que anotar');
      const tipo = i.tipo === 'nota' ? 'nota' : 'tarefa';
      const dia = tipo === 'tarefa' && /^\d{4}-\d{2}-\d{2}$/.test(i.dia || '') ? i.dia : '';
      const linhas = [[ia('cTipo'), tipo === 'nota' ? t('tfTipoNota') : t('tfTipoTarefa')], [ia('cTexto'), texto]];
      if (dia) linhas.push([ia('cDia'), pnDiaRel(dia)]);
      if (i.nota) linhas.push([ia('cDetalhe'), String(i.nota).slice(0, 120)]);
      return { titulo: ia('cAnotar'), assumiu: [], linhas,
        fazer: () => { const x = Tarefas.add({ texto, nota: i.nota || '', dia, tipo }); return { ok: true, id: x.id }; } };
    }
    if (nome === 'riscar_tarefa' || nome === 'apagar_tarefa') {
      const x = Tarefas.get(i.tarefa_id);
      if (!x) return E('não achei essa tarefa — chame ver_tarefas para pegar o id');
      if (nome === 'apagar_tarefa') return { titulo: ia('cApagarT'), assumiu: [], linhas: [[ia('cTexto'), x.texto]],
        fazer: () => { Tarefas.remove(x.id); return { ok: true }; } };
      return { titulo: x.feita ? ia('cDesriscar') : ia('cRiscar'), assumiu: [], linhas: [[ia('cTexto'), x.texto]],
        fazer: () => { Tarefas.alterna(x.id); return { ok: true }; } };
    }
    return _planoAntes(nome, i);
  };

  /* o mapa "aba → ferramenta" precisa estar escrito no prompt,
     senão o modelo responde "faça na aba Tarefas" em vez de fazer */
  const _sistemaAntes = iaSistema;
  iaSistema = function () {
    return _sistemaAntes() + `

## Tarefas, anotações e contas (abas Hoje e Tarefas)
Você também lê o painel de contas (ver_contas: recebido no mês, a receber, ticket médio, os seis meses, os próximos ensaios) e as tarefas (ver_tarefas).
Coisa para FAZER (cobrar, editar, entregar, confirmar, renovar) → anotar_tarefa com tipo "tarefa" e o dia, se ela disser. Coisa para PENSAR depois (ideia de pacote, local novo, parceria) → anotar_tarefa com tipo "nota": título curto no texto, a ideia inteira na nota.
"Já fiz", "pode riscar" → riscar_tarefa. Sempre com o cartão de confirmação.`;
  };

  /* a demonstração ganha um pedido que mostra isto funcionando */
  if (typeof iaCenarios === 'function') {
    const _cenariosAntes = iaCenarios;
    iaCenarios = function () {
      const lista = _cenariosAntes();
      const amanha = addDays(isoToday(), 1);
      lista.unshift({ id: 'tarefa', pede: LANG === 'en' ? 'Remind me to send Camila’s photos tomorrow' : 'Anota: entregar as fotos da Camila amanhã',
        passos: [['anotar_tarefa', { texto: LANG === 'en' ? 'Send Camila’s photos' : 'Entregar as fotos da Camila', dia: amanha, tipo: 'tarefa' }]],
        resposta: () => LANG === 'en' ? 'Done — it is on your list for tomorrow, in Tasks.' : 'Anotado — está na sua lista para amanhã, na aba Tarefas.' });
      lista.unshift({ id: 'contas', pede: LANG === 'en' ? 'How much did I make this month?' : 'Quanto eu recebi este mês?',
        passos: [['ver_contas', {}]],
        resposta: () => {
          const mes = isoToday().slice(0, 7);
          return LANG === 'en'
            ? `This month you received ${eur(Contas.recebidoEm(mes))}, and there is ${eur(Contas.aReceber())} still to come in.`
            : `Neste mês entraram ${eur(Contas.recebidoEm(mes))}, e ainda tem ${eur(Contas.aReceber())} para receber.`;
        } });
      return lista;
    };
  }
}


/* ---------- 6. o Atendimento com cara de fotógrafo ----------
   As conversas de exemplo vinham do demo do guia: turistas estrangeiros
   perguntando de passeio de dia inteiro. Aqui são brasileiros perguntando
   de ensaio — e a resposta continua sendo montada na hora a partir da
   agenda real do app (mude um horário e a resposta muda junto). */
if (typeof CLIENTES !== 'undefined') CLIENTES.splice(0, CLIENTES.length,
  { id: 'c1', nome: 'Camila',   lang: 'pt', canal: 'insta', tipo: 'disp',   pessoas: 2, msg: 'Oi! Tem horário no sábado pra um ensaio de casal? Somos 2 😊' },
  { id: 'c2', nome: 'Rafael',   lang: 'pt', canal: 'whats', tipo: 'preco',  msg: 'Oi, tudo bem? Quanto custa o ensaio na Torre Eiffel? E quando você tem horário?' },
  { id: 'c3', nome: 'Fernanda', lang: 'pt', canal: 'insta', tipo: 'semana', pessoas: 3, msg: 'Vamos estar em Paris semana que vem, somos 3. Ainda dá pra encaixar um ensaio?' },
  { id: 'c4', nome: 'Thiago',   lang: 'pt', canal: 'whats', tipo: 'pagar',  msg: 'Posso pagar com cartão? E o sinal é quanto?' },
  { id: 'c5', nome: 'Sarah',    lang: 'en', canal: 'insta', tipo: 'disp',   pessoas: 2, msg: 'Hi! Do you have a slot on Saturday for a couple session?' },
  { id: 'c6', nome: 'Luiza',    lang: 'pt', canal: 'whats', tipo: 'preco',  msg: 'Oi! Queria fazer o ensaio de 15 anos da minha filha. Quanto fica?' },
);

/* No pacote do fotógrafo o assistente e o atendimento (Instagram e
   WhatsApp) VÊM JUNTO — é o que a arte de venda promete. Então aqui eles
   perdem o selo "extra". O Marketing continua como módulo à parte. */
/* o aviso "módulo extra" aparece em três lugares; só o do Marketing
   (.mkRodape) continua valendo. Os do Atendimento e do assistente somem. */
document.head.insertAdjacentHTML('beforeend',
  '<style>.mkExtra,.iaDemoExtra,#iaFab .iaExtra,#nb-inbox .iaExtra{display:none!important}</style>');
function tiraSeloExtra() {
  for (const sel of ['#nb-inbox .iaExtra', '.iaFab .iaExtra', '#iaFab .iaExtra']) {
    document.querySelectorAll(sel).forEach(e => e.remove());
  }
  const fab = document.getElementById('iaFab');
  if (fab) fab.querySelectorAll('.iaExtra').forEach(e => e.remove());
}
if (typeof marcaExtras === 'function') {
  const _marcaAntes = marcaExtras;
  marcaExtras = function () { _marcaAntes(); tiraSeloExtra(); };
}

/* se a pessoa abriu direto numa aba do painel, redesenha com as peças novas */
if (location.hash.startsWith('#/adm')) route();
