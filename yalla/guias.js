/* =====================================================
   YALLA EXPERIENCES — GUIAS PARCEIROS

   O problema dela (reunião de 24/09/2026): os guias são freelancers, o
   pedido em Dubai vem de última hora e hoje ela pergunta "quem tá livre?"
   num grupo de WhatsApp. Aqui isso vira:

   1. ela cadastra o guia uma vez (nome, WhatsApp, idiomas, o que ele guia);
   2. cada guia ganha um link só dele, sem senha e sem app novo, onde marca
      os dias livres e vê os passeios que caíram para ele;
   3. na hora de fechar, ela escolhe a data e o app mostra QUEM ESTÁ LIVRE;
   4. um toque manda a mensagem pronta no WhatsApp do guia;
   5. o passeio fica marcado como dele, e o relatório soma por guia.

   Este arquivo só ACRESCENTA: apagando a linha do index.html, o app volta
   a ser o que era. Nada aqui fala com a rede.
   ===================================================== */
'use strict';

const GUIA_TXT = {
  admGuias:    { pt: 'Guias', en: 'Guides' },
  gSub:        { pt: 'Quem guia com você. Cada um marca as datas livres pelo link, e você vê tudo aqui.',
                 en: 'Who guides with you. Each one marks their free dates through the link, and you see it all here.' },
  gNovo:       { pt: '+ Cadastrar guia', en: '+ Add guide' },
  gNome:       { pt: 'Nome', en: 'Name' },
  gWhats:      { pt: 'WhatsApp', en: 'WhatsApp' },
  gIdiomas:    { pt: 'Idiomas', en: 'Languages' },
  gIdiomasPh:  { pt: 'Português, inglês, árabe…', en: 'Portuguese, English, Arabic…' },
  gEspec:      { pt: 'O que ele guia', en: 'What they guide' },
  gEspecPh:    { pt: 'Deserto, city tour, corporativo…', en: 'Desert, city tour, corporate…' },
  gCache:      { pt: 'Cachê por dia (opcional)', en: 'Day rate (optional)' },
  gObs:        { pt: 'Observações', en: 'Notes' },
  gSalvar:     { pt: 'Salvar guia', en: 'Save guide' },
  gCancelar:   { pt: 'Cancelar', en: 'Cancel' },
  gVazio:      { pt: 'Nenhum guia cadastrado ainda. Comece pelo primeiro parceiro de confiança.',
                 en: 'No guides yet. Start with your most trusted partner.' },
  gLivresEm:   { pt: 'Quem está livre em', en: 'Who is free on' },
  gVerLivres:  { pt: 'Ver quem está livre', en: 'See who is free' },
  gNinguem:    { pt: 'Ninguém marcou esse dia ainda. Pergunte a todos com um toque.',
                 en: 'Nobody has marked that day yet. Ask everyone in one tap.' },
  gPerguntar:  { pt: 'Perguntar no WhatsApp', en: 'Ask on WhatsApp' },
  gPergTodos:  { pt: 'Perguntar a todos', en: 'Ask everyone' },
  gDatas:      { pt: 'Datas livres', en: 'Free dates' },
  gDatasNenhuma:{ pt: 'nenhuma data marcada', en: 'no dates marked' },
  gLink:       { pt: 'Link do guia', en: 'Guide link' },
  gCopiar:     { pt: 'Copiar link', en: 'Copy link' },
  gCopiado:    { pt: 'Link copiado — mande para ele no WhatsApp', en: 'Link copied — send it to them on WhatsApp' },
  gApagar:     { pt: 'Apagar', en: 'Delete' },
  gApagarOk:   { pt: 'Apagar este guia?', en: 'Delete this guide?' },
  gPasseios:   { pt: 'passeios com você', en: 'tours with you' },
  gMsgPerg:    { pt: 'Oi, {nome}! Tudo bem? Tenho um pedido para {data}. Você está livre? Me confirma por aqui, por favor.',
                 en: 'Hi {nome}! I have a request for {data}. Are you free? Please confirm here.' },
  gMsgLink:    { pt: 'Oi, {nome}! Este é o seu link da Yalla Experiences. Abra no celular e marque os dias em que você está livre — eu vejo aqui na hora: {link}',
                 en: 'Hi {nome}! This is your Yalla Experiences link. Open it on your phone and mark the days you are free — I see it here right away: {link}' },
  /* a página do guia */
  gpTit:       { pt: 'Sua agenda com a Yalla', en: 'Your schedule with Yalla' },
  gpOla:       { pt: 'Oi, {nome}!', en: 'Hi {nome}!' },
  gpTxt:       { pt: 'Toque nos dias em que você está livre. A Milla vê na hora e te chama quando aparecer um pedido.',
                 en: 'Tap the days you are free. Milla sees it right away and calls you when a request comes in.' },
  gpMes:       { pt: 'Mês', en: 'Month' },
  gpSalvo:     { pt: 'Salvo ✓', en: 'Saved ✓' },
  gpSeus:      { pt: 'Seus passeios confirmados', en: 'Your confirmed tours' },
  gpNenhum:    { pt: 'Nada confirmado ainda.', en: 'Nothing confirmed yet.' },
  gpDemo:      { pt: 'Demonstração: neste protótipo o link funciona neste aparelho. No app publicado, cada guia abre o dele de qualquer celular.',
                 en: 'Demo: in this prototype the link works on this device. In the published app each guide opens theirs from any phone.' },
};
const gt = (k, v) => {
  const e = GUIA_TXT[k]; let s = e ? (e[LANG] || e.pt) : k;
  if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]);
  return s;
};

/* ---------- dados ---------- */
const Guias = {
  todos() { return (DB.guias = DB.guias || []); },
  get(id) { return this.todos().find(g => g.id === id); },
  salva(g) {
    const l = this.todos(), i = l.findIndex(x => x.id === g.id);
    i < 0 ? l.push(g) : (l[i] = g);
    save();
  },
  apaga(id) { DB.guias = this.todos().filter(g => g.id !== id); save(); },
  livresEm(iso) { return this.todos().filter(g => (g.livres || []).includes(iso)); },
  /* passeios do guia: reservas futuras com guiaId */
  passeios(id) {
    return DB.bookings.filter(b => b.guiaId === id && b.status !== 'cancelled')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  },
  link(g) { return location.origin + location.pathname + '#/guia/' + g.id; },
};

/* ---------- painel dela ---------- */
let gEditando = null, gDataBusca = '';
function admGuias() {
  const l = Guias.todos();
  const dia = gDataBusca || addDays(isoToday(), 1);
  const livres = gDataBusca ? Guias.livresEm(gDataBusca) : null;
  const inicial = (g) => (g.nome[0] || 'G').toUpperCase();

  const form = gEditando ? `
    <section class="card gForm">
      <div class="frow"><label class="fld">${gt('gNome')}<input id="gfNome" value="${esc(gEditando.nome || '')}"></label>
        <label class="fld">${gt('gWhats')}<input id="gfWhats" value="${esc(gEditando.whats || '')}" placeholder="+971…"></label></div>
      <div class="frow"><label class="fld">${gt('gIdiomas')}<input id="gfIdiomas" value="${esc(gEditando.idiomas || '')}" placeholder="${gt('gIdiomasPh')}"></label>
        <label class="fld">${gt('gEspec')}<input id="gfEspec" value="${esc(gEditando.espec || '')}" placeholder="${gt('gEspecPh')}"></label></div>
      <div class="frow"><label class="fld">${gt('gCache')}<input id="gfCache" type="number" min="0" value="${gEditando.cache || ''}"></label>
        <label class="fld">${gt('gObs')}<input id="gfObs" value="${esc(gEditando.obs || '')}"></label></div>
      <div class="gBts"><button class="cta sm" id="gfSalvar">${gt('gSalvar')}</button>
        <button class="mini" id="gfCancelar">${gt('gCancelar')}</button></div>
    </section>` : '';

  const cartao = (g) => {
    const ps = Guias.passeios(g.id), datas = (g.livres || []).filter(d => d >= isoToday()).sort();
    return `<article class="gCard">
      <div class="gTopo"><span class="gAv">${esc(inicial(g))}</span>
        <div class="gQuem"><b>${esc(g.nome)}</b><small>${esc([g.idiomas, g.espec].filter(Boolean).join(' · ')) || '—'}</small></div>
        <button class="gX" data-gapaga="${g.id}" aria-label="${gt('gApagar')}">×</button></div>
      <div class="gLinha"><span class="gRot">${gt('gDatas')}</span>
        <span class="gVals">${datas.length ? datas.slice(0, 8).map(d => `<i>${dataCurta(d)}</i>`).join('') + (datas.length > 8 ? ` +${datas.length - 8}` : '') : `<em>${gt('gDatasNenhuma')}</em>`}</span></div>
      <div class="gLinha"><span class="gRot">${gt('gPasseios')}</span><span class="gVals"><b>${ps.length}</b></span></div>
      <div class="gBts">
        ${g.whats ? `<a class="mini" href="${waLinkPara(g.whats, gt('gMsgLink', { nome: g.nome, link: Guias.link(g) }))}" target="_blank" rel="noopener">${gt('gPerguntar')}</a>` : ''}
        <button class="mini" data-glink="${g.id}">${gt('gCopiar')}</button>
        <button class="mini" data-gabre="${g.id}">${gt('gDatas')} →</button>
      </div>
    </article>`;
  };

  admShell('guias', `
    <div class="pagehead"><h1 class="pageh">${gt('admGuias')}</h1>
      <button class="cta sm" id="gNovo">${gt('gNovo')}</button></div>
    <p class="why">${gt('gSub')}</p>
    ${form}

    <section class="card gBusca">
      <label class="fld">${gt('gLivresEm')}<input id="gData" type="date" value="${gDataBusca || dia}"></label>
      <button class="cta sm" id="gBuscar">${gt('gVerLivres')}</button>
      ${livres ? (livres.length
        ? `<div class="gLivres">${livres.map(g => `<span class="gPill">${esc(g.nome)}${g.whats ? ` <a href="${waLinkPara(g.whats, gt('gMsgPerg', { nome: g.nome, data: dataCurta(gDataBusca) }))}" target="_blank" rel="noopener">${gt('gPerguntar')}</a>` : ''}</span>`).join('')}</div>`
        : `<p class="why">${gt('gNinguem')}</p>
           <div class="gBts">${l.filter(g => g.whats).map(g => `<a class="mini" href="${waLinkPara(g.whats, gt('gMsgPerg', { nome: g.nome, data: dataCurta(gDataBusca) }))}" target="_blank" rel="noopener">${esc(g.nome)}</a>`).join('')}</div>`) : ''}
    </section>

    ${l.length ? `<div class="gGrade">${l.map(cartao).join('')}</div>`
      : `<div class="emptybox"><p>${gt('gVazio')}</p></div>`}`);

  const re = () => admGuias();
  $('#gNovo').onclick = () => { gEditando = { id: 'g' + Date.now(), nome: '', whats: '', idiomas: '', espec: '', livres: [] }; re(); };
  const fc = $('#gfCancelar'); if (fc) fc.onclick = () => { gEditando = null; re(); };
  const fs = $('#gfSalvar');
  if (fs) fs.onclick = () => {
    const nome = $('#gfNome').value.trim();
    if (!nome) return toast(gt('gNome'));
    Guias.salva({ ...gEditando, nome, whats: $('#gfWhats').value.trim(), idiomas: $('#gfIdiomas').value.trim(),
      espec: $('#gfEspec').value.trim(), cache: +$('#gfCache').value || 0, obs: $('#gfObs').value.trim() });
    gEditando = null; re();
  };
  $('#gBuscar').onclick = () => { gDataBusca = $('#gData').value; re(); };
  $$('[data-gapaga]').forEach(b => b.onclick = () => { if (confirm(gt('gApagarOk'))) { Guias.apaga(b.dataset.gapaga); re(); } });
  $$('[data-gabre]').forEach(b => b.onclick = () => go('/guia/' + b.dataset.gabre));
  $$('[data-glink]').forEach(b => b.onclick = () => {
    const g = Guias.get(b.dataset.glink);
    navigator.clipboard && navigator.clipboard.writeText(Guias.link(g)).then(() => toast(gt('gCopiado')));
  });
}

/* WhatsApp de um número qualquer (o waLink do app é o da guia) */
function waLinkPara(num, texto) {
  return 'https://wa.me/' + String(num).replace(/\D/g, '') + '?text=' + encodeURIComponent(texto);
}

/* ---------- a página do guia (o link dele) ---------- */
let gpMes = null;
function viewGuia(id) {
  const g = Guias.get(id);
  if (!g) return go('/');
  const mes = gpMes || isoToday().slice(0, 7);
  const [ano, m] = mes.split('-').map(Number);
  const primeiro = new Date(ano, m - 1, 1), dias = new Date(ano, m, 0).getDate();
  const vazios = (primeiro.getDay() + 6) % 7;   /* semana começa na segunda */
  const livres = new Set(g.livres || []);
  const nomeMes = primeiro.toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
  const ant = m === 1 ? `${ano - 1}-12` : `${ano}-${String(m - 1).padStart(2, '0')}`;
  const prox = m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, '0')}`;
  const ps = Guias.passeios(g.id);

  app.innerHTML = `
  <header class="topbar">
    <span class="tbrand">${logoMark(24, 'var(--brand-amarelo)')}<b>${esc(guiaNegocio())}</b></span>
    ${langBar('right')}
  </header>
  <main class="wrap gp">
    <h1 class="pageh">${gt('gpOla', { nome: esc(g.nome) })}</h1>
    <p class="desc lead">${gt('gpTxt')}</p>

    <section class="card">
      <div class="gpNav"><button class="mini" data-gpmes="${ant}">‹</button>
        <b>${esc(nomeMes[0].toUpperCase() + nomeMes.slice(1))}</b>
        <button class="mini" data-gpmes="${prox}">›</button></div>
      <div class="gpGrade">
        ${['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(d => `<span class="gpDia">${d}</span>`).join('')}
        ${Array.from({ length: vazios }, () => '<span></span>').join('')}
        ${Array.from({ length: dias }, (_, i) => {
          const iso = `${mes}-${String(i + 1).padStart(2, '0')}`;
          const passou = iso < isoToday();
          return `<button class="gpCel ${livres.has(iso) ? 'on' : ''} ${passou ? 'off' : ''}" ${passou ? 'disabled' : ''} data-gpdia="${iso}">${i + 1}</button>`;
        }).join('')}
      </div>
      <p class="why" id="gpMsg"></p>
    </section>

    <section class="card">
      <span class="seclabel">${gt('gpSeus')}</span>
      ${ps.length ? ps.map(b => `<div class="gpPass"><b>${esc(nomeTour(Tours.get(b.tourId)))}</b>
        <small>${dataCurta(b.date)} · ${esc(b.time)} · ${b.pax} ${t('people')} · ${esc(b.name)}</small></div>`).join('')
        : `<p class="why">${gt('gpNenhum')}</p>`}
    </section>
    <p class="why center">${gt('gpDemo')}</p>
  </main>`;
  bindLang(app);
  if (typeof Coach !== 'undefined') Coach.hide();   /* o tutorial do cliente não é para o guia */
  $$('[data-gpmes]').forEach(b => b.onclick = () => { gpMes = b.dataset.gpmes; viewGuia(id); });
  $$('[data-gpdia]').forEach(b => b.onclick = () => {
    const iso = b.dataset.gpdia, l = new Set(g.livres || []);
    l.has(iso) ? l.delete(iso) : l.add(iso);
    g.livres = [...l].sort(); Guias.salva(g);
    b.classList.toggle('on');
    const msg = $('#gpMsg'); if (msg) { msg.textContent = gt('gpSalvo'); setTimeout(() => { msg.textContent = ''; }, 1200); }
  });
}

/* ---------- liga no app: aba nova e rota nova ---------- */
if (!ADM_TABS.some(([id]) => id === 'guias')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'clients');
  ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['guias', 'admGuias']);
  /* o rail usa t(); o texto da aba mora aqui */
  if (typeof STR !== 'undefined') STR.admGuias = GUIA_TXT.admGuias;
}
const _viewAdmSemGuias = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'guias') return admGuias();
  return _viewAdmSemGuias(tab, arg);
};
const _routeSemGuias = route;
route = function () {
  const p = (location.hash.replace(/^#\/?/, '') || '').split('/');
  if (p[0] === 'guia' && p[1]) return viewGuia(p[1]);
  return _routeSemGuias();
};
/* o app.js já registrou o route antigo no hashchange e já desenhou a tela:
   assumimos os dois aqui, senão a aba e o link do guia só funcionariam no
   segundo clique. */
addEventListener('hashchange', () => route());
if (/^#\/(adm\/guias|guia\/)/.test(location.hash)) route();

/* =====================================================
   O ASSISTENTE ENXERGA OS GUIAS

   Ela pergunta "quem está livre sábado?" ou "escala o Ahmed no passeio do
   dia 10" e o assistente resolve — com o mesmo cartão de confirmação.
   ===================================================== */
if (typeof IA_FERRAMENTAS !== 'undefined') {
  const S = (d) => ({ type: 'string', ...(d ? { description: d } : {}) });
  IA_FERRAMENTAS.push(
    { name: 'ver_guias', description: 'Guias parceiros: nome, WhatsApp, idiomas, o que guiam, cachê, datas livres daqui para a frente e quantos passeios já têm.',
      input_schema: { type: 'object', properties: {} } },
    { name: 'guias_livres', description: 'Quem está livre numa data (AAAA-MM-DD).',
      input_schema: { type: 'object', properties: { data: S('AAAA-MM-DD') }, required: ['data'] } },
    { name: 'cadastrar_guia', description: 'Cadastra um guia parceiro novo.',
      input_schema: { type: 'object', properties: { nome: S(), whats: S(), idiomas: S(), especialidade: S(), cache: { type: 'number' } }, required: ['nome'] } },
    { name: 'marcar_datas_guia', description: 'Marca (ou desmarca) datas livres de um guia. datas em AAAA-MM-DD.',
      input_schema: { type: 'object', properties: { guia: S('nome ou id'), datas: { type: 'array', items: S() }, tirar: { type: 'boolean' } }, required: ['guia', 'datas'] } },
    { name: 'escalar_guia', description: 'Põe um guia numa reserva (código de ver_reservas). O guia vê o passeio no link dele.',
      input_schema: { type: 'object', properties: { codigo: S(), guia: S('nome ou id') }, required: ['codigo', 'guia'] } },
  );
  if (typeof IA_LEITURA !== 'undefined') { IA_LEITURA.add('ver_guias'); IA_LEITURA.add('guias_livres'); }

  const achaGuia = (q) => {
    const s = String(q || '').toLowerCase().trim();
    return Guias.get(q) || Guias.todos().find(g => g.nome.toLowerCase() === s)
      || Guias.todos().find(g => g.nome.toLowerCase().includes(s));
  };
  const _leituraSemGuias = iaLeitura;
  iaLeitura = function (nome, i) {
    i = i || {};
    if (nome === 'ver_guias') {
      const l = Guias.todos().map(g => ({ id: g.id, nome: g.nome, whats: g.whats || null, idiomas: g.idiomas || null,
        guia: g.espec || null, cache: g.cache || 0, passeios: Guias.passeios(g.id).length,
        datas_livres: (g.livres || []).filter(d => d >= isoToday()).sort().slice(0, 30) }));
      return l.length ? l : 'nenhum guia cadastrado ainda';
    }
    if (nome === 'guias_livres') {
      const l = Guias.livresEm(i.data).map(g => ({ id: g.id, nome: g.nome, whats: g.whats || null, guia: g.espec || null }));
      return l.length ? l : `ninguém marcou ${i.data} como livre`;
    }
    return _leituraSemGuias(nome, i);
  };

  const _planoSemGuias = iaPlano;
  iaPlano = function (nome, i) {
    i = i || {};
    const E = (m) => ({ erro: m });
    if (nome === 'cadastrar_guia') {
      const n = String(i.nome || '').trim();
      if (!n) return E('falta o nome');
      if (Guias.todos().some(g => g.nome.toLowerCase() === n.toLowerCase())) return E('já existe um guia com esse nome');
      return { titulo: gt('gNovo').replace('+ ', ''), assumiu: [],
        linhas: [[gt('gNome'), n], ...(i.whats ? [[gt('gWhats'), i.whats]] : []), ...(i.idiomas ? [[gt('gIdiomas'), i.idiomas]] : []),
          ...(i.especialidade ? [[gt('gEspec'), i.especialidade]] : [])],
        fazer: () => { const g = { id: 'g' + Date.now(), nome: n, whats: i.whats || '', idiomas: i.idiomas || '',
          espec: i.especialidade || '', cache: +i.cache || 0, livres: [] }; Guias.salva(g); return { ok: true, guia_id: g.id }; } };
    }
    if (nome === 'marcar_datas_guia') {
      const g = achaGuia(i.guia); if (!g) return E('guia não encontrado — use ver_guias');
      const datas = (Array.isArray(i.datas) ? i.datas : []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (!datas.length) return E('datas em AAAA-MM-DD');
      const tirar = i.tirar === true;
      return { titulo: gt('gDatas') + ' · ' + g.nome, assumiu: [],
        linhas: [[gt('gNome'), g.nome], [tirar ? '−' : '+', datas.map(d => dataCurta(d)).join(', ')]],
        fazer: () => { const s = new Set(g.livres || []);
          datas.forEach(d => tirar ? s.delete(d) : s.add(d));
          g.livres = [...s].sort(); Guias.salva(g); return { ok: true, datas_livres: g.livres.filter(d => d >= isoToday()) }; } };
    }
    if (nome === 'escalar_guia') {
      const b = Bookings.byCode(String(i.codigo || '').toUpperCase()); if (!b) return E('reserva não encontrada');
      const g = achaGuia(i.guia); if (!g) return E('guia não encontrado — use ver_guias');
      const livre = (g.livres || []).includes(b.date);
      return { titulo: 'Escalar guia', assumiu: livre ? [] : ['esse guia não marcou esse dia como livre'],
        linhas: [[gt('gNome'), g.nome], [ia('cCliente'), b.name], [ia('xPasseio'), nomeTour(Tours.get(b.tourId))],
          [ia('cQuando'), `${dataCurta(b.date)} ${b.time}`]],
        fazer: () => { b.guiaId = g.id; save();
          return { ok: true, avise: g.whats ? `mande no WhatsApp dele: ${waLinkPara(g.whats, `Oi, ${g.nome}! Você está escalado para ${nomeTour(Tours.get(b.tourId))} em ${dataCurta(b.date)} às ${b.time}. Confere no seu link.`)}` : 'esse guia não tem WhatsApp cadastrado' }; } };
    }
    return _planoSemGuias(nome, i);
  };

  /* o assistente precisa saber que isso existe */
  const _sistemaSemGuias = iaSistema;
  iaSistema = function () {
    const s = _sistemaSemGuias();
    const extra = `

## Guias parceiros (Yalla Experiences)
Ela trabalha com guias freelancers. Cada guia marca as datas livres no link dele e você lê isso em ver_guias / guias_livres. Antes de prometer data, confira se há guia livre; se não houver, diga quem costuma atender aquele tipo de passeio e ofereça perguntar. Pode cadastrar guia, marcar ou tirar datas e escalar um guia numa reserva — sempre com confirmação. Nunca fale com o guia: você prepara a mensagem, quem manda é ela.`;
    if (Array.isArray(s) && s[0] && typeof s[0].text === 'string') { s[0] = { ...s[0], text: s[0].text + extra }; return s; }
    return typeof s === 'string' ? s + extra : s;
  };
}
