/* =====================================================
   CONSULTORIA DE MUDANÇA (06/10/2026)

   Um dos cinco módulos que a Mari pediu (reunião de 23/09): ajudar quem
   quer MORAR na Dinamarca — 13 anos lá, ela conhece o caminho. É um
   serviço à parte, "sob consulta": a página explica o que ela faz e uma
   conversa curta (como o Personalize) termina no WhatsApp dela já escrita.
   O pedido fica no painel (DB.pedidos, tipo 'mudanca') e, com a nuvem dela
   ligada, chega no celular dela (itPedidoPublico).

   Sem promessa jurídica: é orientação prática de quem mora lá — visto e
   permissão de residência são da imigração dinamarquesa (SIRI / Nyidanmark).
   ===================================================== */
'use strict';

const MUD_MOTIVOS = [['trabalho', 'Trabalho'], ['estudo', 'Estudo'], ['familia', 'Família / casamento'], ['aposentadoria', 'Aposentadoria'], ['outro', 'Ainda decidindo']];
const MUD_TEMAS = [
  ['documentos', 'Documentos e permissão de residência'], ['cpr', 'Número pessoal (CPR) e MitID'], ['moradia', 'Onde morar e aluguel'],
  ['banco', 'Conta no banco'], ['escola', 'Escola ou creche para os filhos'], ['saude', 'Sistema de saúde'],
  ['trabalho', 'Trabalho e currículo'], ['idioma', 'Aulas de dinamarquês'], ['transporte', 'Transporte e bicicleta'], ['clima', 'Inverno, roupas e adaptação'],
];
const MUD_INCLUI = [
  'Uma conversa para entender o seu caso: quem vem, quando, por quê',
  'O passo a passo dos primeiros 90 dias, na ordem certa',
  'Bairros, aluguel e como não cair em golpe de anúncio',
  'CPR, MitID, banco, médico de família — o que pedir e onde',
  'Escola e creche, quando há crianças',
  'Acompanhamento presencial em Copenhague, se você quiser',
];

function viewMudanca() {
  const P = viewMudanca._p = viewMudanca._p || { nome: '', whats: '', email: '', adultos: 1, criancas: 0, quando: '', motivo: '', cidade: 'Copenhague', temas: [], obs: '' };
  const chip = (lista, sel, grupo) => lista.map(([c, n]) => `<button type="button" class="pchip ${sel.includes(c) ? 'on' : ''}" data-g="${grupo}" data-v="${c}">${esc(n)}</button>`).join('');
  app.innerHTML = `
  <header class="topbar">
    <button class="backbtn" id="bk" aria-label="${t('back')}">←</button>
    <span class="tbrand">${logoMark(24, 'var(--brand-amarelo)')}<b>${esc(guiaNome())}</b></span>
    ${langBar('right')}
  </header>
  <main class="wrap pers mud">
    <h1 class="pageh">Consultoria de mudança para a Dinamarca</h1>
    <p class="desc lead">Moro em Copenhague há 13 anos. Se você está pensando em vir morar aqui, eu te ajudo a fazer do jeito certo — sem perder tempo nem dinheiro com o que ninguém conta.</p>
    <section class="card pbloco">
      <span class="seclabel">O que entra na consultoria</span>
      <ul class="trLista" style="margin:10px 0 0">${MUD_INCLUI.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="why" style="margin-top:10px">É orientação prática de quem mora aqui. Visto e permissão de residência são decididos pela imigração dinamarquesa; eu te mostro o caminho e o que preparar.</p>
    </section>
    <section class="card pbloco">
      <span class="seclabel">Quem vem</span>
      <label class="fld">Seu nome<input id="mNome" value="${esc(P.nome)}" placeholder="Nome e sobrenome"></label>
      <div class="frow">
        <label class="fld">Seu WhatsApp<input id="mWhats" type="tel" inputmode="tel" value="${esc(P.whats)}" placeholder="+55 11 9…"></label>
        <label class="fld">E-mail (opcional)<input id="mEmail" type="email" value="${esc(P.email)}"></label>
      </div>
      <div class="frow">
        <label class="fld">Adultos<input id="mAd" type="number" min="1" max="20" value="${esc(P.adultos)}"></label>
        <label class="fld">Crianças<input id="mCri" type="number" min="0" max="20" value="${esc(P.criancas)}"></label>
        <label class="fld">Quando pretende vir<input id="mQuando" value="${esc(P.quando)}" placeholder="ex.: agosto de 2027"></label>
      </div>
      <label class="fld">Cidade<input id="mCidade" value="${esc(P.cidade)}" placeholder="Copenhague, Aarhus, Odense…"></label>
    </section>
    <section class="card pbloco"><span class="seclabel">Por que a mudança</span><div class="pchips">${chip(MUD_MOTIVOS, [P.motivo], 'motivo')}</div></section>
    <section class="card pbloco"><span class="seclabel">O que mais te preocupa</span><p class="why">Toque em quantos quiser.</p><div class="pchips">${chip(MUD_TEMAS, P.temas, 'temas')}</div></section>
    <section class="card pbloco"><span class="seclabel">Conte um pouco mais</span><textarea id="mObs" rows="3" placeholder="Profissão, se já tem proposta de trabalho ou escola, dúvidas…">${esc(P.obs)}</textarea></section>
    <button class="cta" id="mEnviar">Mandar para a Mari no WhatsApp</button>
    <p class="why center">A consultoria é sob consulta: eu te respondo com o formato e o valor para o seu caso.</p>
  </main>`;
  bindLang(app);
  $('#bk').onclick = () => go('/');
  const guarda = () => {
    P.nome = $('#mNome').value.trim(); P.whats = $('#mWhats').value.trim(); P.email = $('#mEmail').value.trim();
    P.adultos = Math.max(1, +$('#mAd').value || 1); P.criancas = Math.max(0, +$('#mCri').value || 0);
    P.quando = $('#mQuando').value.trim(); P.cidade = $('#mCidade').value.trim(); P.obs = $('#mObs').value.trim();
  };
  $$('.pchip').forEach(b => b.onclick = () => {
    guarda();
    if (b.dataset.g === 'motivo') P.motivo = P.motivo === b.dataset.v ? '' : b.dataset.v;
    else { const i = P.temas.indexOf(b.dataset.v); i < 0 ? P.temas.push(b.dataset.v) : P.temas.splice(i, 1); }
    viewMudanca();
  });
  $('#mEnviar').onclick = () => {
    guarda();
    if (!P.nome) { toast('Escreva o seu nome'); $('#mNome').focus(); return; }
    const motivo = (MUD_MOTIVOS.find(m => m[0] === P.motivo) || [])[1] || '';
    const temas = P.temas.map(c => (MUD_TEMAS.find(m => m[0] === c) || [])[1]).filter(Boolean);
    const L = [`Oi, Mari! Sou ${P.nome} e quero conversar sobre a consultoria de mudança para a Dinamarca.`,
      `👥 ${P.adultos} adulto(s)${P.criancas ? ' e ' + P.criancas + ' criança(s)' : ''}`,
      P.quando ? '🗓 Pretendo vir: ' + P.quando : '', P.cidade ? '📍 ' + P.cidade : '', motivo ? '🧭 Motivo: ' + motivo : '',
      temas.length ? '❓ ' + temas.join(', ') : '', P.obs ? '📝 ' + P.obs : ''].filter(Boolean);
    try {
      const pedido = { id: 'pm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tipo: 'mudanca', criadoEm: new Date().toISOString(),
        nome: P.nome, whats: P.whats, email: P.email, adultos: P.adultos, criancas: P.criancas, quando: P.quando, cidade: P.cidade, motivo, gostos: temas, obs: P.obs,
        pessoas: P.adultos + P.criancas };
      DB.pedidos = DB.pedidos || []; DB.pedidos.unshift(pedido); save();
      if (typeof itPedidoPublico === 'function') itPedidoPublico('pedidos', pedido);
    } catch (e) {}
    window.open(waLink(L.join('\n')), '_blank', 'noopener');
    toast('Pronto! A conversa abriu no WhatsApp.');
  };
}
ROTAS_EXTRA['mudanca'] = () => viewMudanca();

/* o cartão na primeira tela, logo antes de "Quem sou eu" */
const ICONE_MUDANCA = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/></svg>';
const _viewHubMud = viewHub;
viewHub = function () {
  _viewHubMud.apply(this, arguments);
  const sobre = document.getElementById('goAbout');
  if (!sobre || document.getElementById('goMud')) return;
  sobre.insertAdjacentHTML('beforebegin', `<button class="lk" id="goMud">
    <span class="ic">${ICONE_MUDANCA}</span><span><b>Consultoria de mudança</b><small>Quer morar na Dinamarca? Eu te mostro o caminho</small></span><span class="go" aria-hidden="true">→</span></button>`);
  document.getElementById('goMud').onclick = () => go('/mudanca');
};
