/* ABA TAREFAS & ANOTAÇÕES — o bloco de notas da Milla dentro do app.

   Duas coisas no mesmo lugar:
   - TAREFA: algo pra fazer. Com data, vira compromisso (aparece em Hoje).
   - NOTA: uma anotação livre (ideia, recado, contato de cliente). Pode
     ganhar data depois e virar tarefa.

   Fica dentro do DB, então sobe pra nuvem junto com o resto e aparece igual
   no celular e no laptop — quando o app tiver nuvem (hoje o protótipo roda
   só no aparelho). O assistente mexe aqui pelas ferramentas em assistente.js. */
'use strict';

const TAR_TXT = {
  tit:       { pt: 'Tarefas e notas', en: 'Tasks & notes' },
  sub:       { pt: 'Anote o que tem que fazer — e o que não pode esquecer.', en: 'Jot down what to do — and what not to forget.' },
  ph:        { pt: 'O que você tem que fazer ou lembrar?', en: 'What do you need to do or remember?' },
  add:       { pt: 'Anotar', en: 'Add' },
  todo:      { pt: 'Pra fazer', en: 'To do' },
  todoSub:   { pt: 'Sem dia marcado. Decida o que vai pra agenda.', en: 'No date yet. Decide what goes on the agenda.' },
  sched:     { pt: 'Na agenda', en: 'Scheduled' },
  schedSub:  { pt: 'Com dia marcado — aparece também em Hoje.', en: 'With a date — also shows under Today.' },
  notes:     { pt: 'Notas', en: 'Notes' },
  notesSub:  { pt: 'Ideias, recados e contatos que você guardou.', en: 'Ideas, messages and contacts you saved.' },
  done:      { pt: 'Feitas', en: 'Done' },
  doneSub:   { pt: 'As últimas que você concluiu.', en: 'The latest you completed.' },
  emptyTodo: { pt: 'Nada pra fazer agora. 🌙', en: 'Nothing to do right now. 🌙' },
  emptyNotes:{ pt: 'Nenhuma nota ainda.', en: 'No notes yet.' },
  emptyDone: { pt: 'Quando concluir algo, aparece aqui.', en: 'When you complete something, it shows here.' },
  toAgenda:  { pt: 'Pôr na agenda', en: 'Schedule' },
  toTask:    { pt: 'Virar tarefa', en: 'Make a task' },
  late:      { pt: 'atrasada', en: 'overdue' },
  prioAlta:  { pt: 'alta', en: 'high' },
  prioMedia: { pt: 'média', en: 'medium' },
  prioBaixa: { pt: 'baixa', en: 'low' },
  isNote:    { pt: 'nota', en: 'note' },
  cliente:   { pt: 'Contato', en: 'Contact' },
};
const tt = (k) => { const e = TAR_TXT[k]; return e ? (e[LANG] || e.pt) : k; };

const PRIO_PESO = { alta: 0, media: 1, baixa: 2 };

const Tarefas = {
  todas() { return (DB.tarefas = DB.tarefas || []); },
  get(id) { return this.todas().find(x => x.id === id); },
  cria(t) {
    const nova = { id: uid(), tipo: 'tarefa', titulo: '', nota: '', prio: 'media',
                   data: '', hora: '', feito: false, feitoEm: '', cliente: '',
                   criado: new Date().toISOString(), ...t };
    this.todas().push(nova); save(); return nova;
  },
  muda(id, patch) { const x = this.get(id); if (x) { Object.assign(x, patch); save(); } return x; },
  apaga(id) { DB.tarefas = this.todas().filter(x => x.id !== id); save(); },
  conclui(id) {
    const x = this.get(id); if (!x) return false;
    x.feito = true; x.feitoEm = isoToday(); save(); return true;
  },
  /* as de hoje e as atrasadas — pra aba Hoje mostrar */
  deHoje() {
    const h = isoToday();
    return this.todas().filter(x => !x.feito && x.tipo === 'tarefa' && x.data && x.data <= h);
  },
};

const tarAtrasada = (x) => x.data && !x.feito && x.data < isoToday();

function admTarefas() {
  const todas = Tarefas.todas();
  const tarefas = todas.filter(x => x.tipo === 'tarefa' && !x.feito);
  const ordena = (a, b) => {
    if (tarAtrasada(a) !== tarAtrasada(b)) return tarAtrasada(a) ? -1 : 1;
    if (PRIO_PESO[a.prio] !== PRIO_PESO[b.prio]) return PRIO_PESO[a.prio] - PRIO_PESO[b.prio];
    return ((a.data || '9999') + (a.hora || '99')).localeCompare((b.data || '9999') + (b.hora || '99'));
  };
  const praFazer = tarefas.filter(x => !x.data).sort(ordena);
  const agenda   = tarefas.filter(x => x.data).sort(ordena);
  const notas    = todas.filter(x => x.tipo === 'nota' && !x.feito).sort((a, b) => b.criado.localeCompare(a.criado));
  const feitas   = todas.filter(x => x.feito).sort((a, b) => (b.feitoEm || '').localeCompare(a.feitoEm || '')).slice(0, 8);

  const linha = (x) => {
    const atr = tarAtrasada(x);
    const quando = x.data ? `<span class="tar-quando ${atr ? 'atr' : ''}">${x.data.slice(8, 10)}/${x.data.slice(5, 7)}${x.hora ? ' ' + x.hora : ''}${atr ? ' · ' + tt('late') : ''}</span>` : '';
    const prio = x.tipo === 'tarefa' ? `<span class="tar-prio p-${x.prio}">${tt('prio' + x.prio[0].toUpperCase() + x.prio.slice(1))}</span>` : '';
    const contato = x.cliente ? `<span class="tar-cli">${tt('cliente')}: ${esc(x.cliente)}</span>` : '';
    const acao = x.tipo === 'nota'
      ? `<button class="mini ghost" data-agenda="${x.id}">${tt('toAgenda')}</button>`
      : (!x.data ? `<button class="mini ghost" data-agenda="${x.id}">${tt('toAgenda')}</button>` : '');
    return `<div class="tar-row ${atr ? 'atr' : ''}">
      <button class="tar-check" data-done="${x.id}" aria-label="ok">○</button>
      <div class="tar-body">
        <div class="tar-top">${prio}${quando}</div>
        <div class="tar-tit">${esc(x.titulo)}</div>
        ${x.nota ? `<div class="tar-nota">${esc(x.nota)}</div>` : ''}
        ${contato}
      </div>
      <div class="tar-acts">${acao}<button class="mini ghost danger" data-del="${x.id}">✕</button></div>
    </div>`;
  };

  const secao = (titulo, sub, itens, vazio) => `
    <section class="card">
      <div class="tar-h"><h3>${titulo}</h3><p class="why">${sub}</p></div>
      ${itens.length ? itens.map(linha).join('') : `<p class="empty">${vazio}</p>`}
    </section>`;

  admShell('tarefas', `
    <h1 class="pageh">${tt('tit')}</h1>
    <p class="why" style="margin:-6px 0 14px">${tt('sub')}</p>
    <section class="card">
      <div class="tar-add">
        <input id="tarInput" placeholder="${tt('ph')}" autocomplete="off">
        <button class="cta sm" id="tarAdd">${tt('add')}</button>
      </div>
    </section>
    ${secao(tt('todo'), tt('todoSub'), praFazer, tt('emptyTodo'))}
    ${secao(tt('sched'), tt('schedSub'), agenda, '—')}
    ${secao(tt('notes'), tt('notesSub'), notas, tt('emptyNotes'))}
    ${secao(tt('done'), tt('doneSub'), feitas, tt('emptyDone'))}
  `);

  const add = () => {
    const el = $('#tarInput'); const v = (el.value || '').trim(); if (!v) return;
    Tarefas.cria({ titulo: v });
    admTarefas();
  };
  $('#tarAdd').onclick = add;
  const inp = $('#tarInput');
  if (inp) { inp.onkeydown = (e) => { if (e.key === 'Enter') add(); }; }
  $$('[data-done]').forEach(b => b.onclick = () => { Tarefas.conclui(b.dataset.done); admTarefas(); });
  $$('[data-del]').forEach(b => b.onclick = () => { Tarefas.apaga(b.dataset.del); admTarefas(); });
  $$('[data-agenda]').forEach(b => b.onclick = () => {
    const x = Tarefas.get(b.dataset.agenda); if (!x) return;
    const d = prompt(LANG === 'pt' ? 'Que dia? (AAAA-MM-DD)' : 'Which day? (YYYY-MM-DD)', isoToday());
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) { Tarefas.muda(x.id, { tipo: 'tarefa', data: d.trim() }); admTarefas(); }
  });
}
