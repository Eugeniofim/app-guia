/* =====================================================
   PEDIDOS — Transfer e Monte seu roteiro (24/09/2026)

   Duas portas novas no menu inicial, pedidas pela Dulcineia:
   - TRANSFER: aeroporto, estação, hotel ou de uma cidade a outra. O cliente
     preenche e o pedido vai para ela — que responde com o valor.
   - MONTE SEU ROTEIRO: o cliente escolhe com as opções DE LÁ (os passeios
     dela, os temas de Berlim, as cidades que ela atende, manhã/tarde) e
     ela devolve a proposta.

   O app não inventa preço de nada disso: ele faz a parte chata — perguntar
   data, voo, malas, quem vem, do que gosta — e entrega tudo de uma vez,
   organizado. Ela começa a conversa sabendo o que propor.

   Como chega nela:
   - com a nuvem ligada: tabela `pedidos` → o banco avisa (push + e-mail)
     e aparece no painel, em Reservas → Pedidos;
   - sempre: a mesma ficha pronta para o WhatsApp dela (sem nuvem, é o
     caminho; com nuvem, é um atalho para quem quer falar na hora).
   A ficha é montada AQUI e gravada no pedido (p.ficha): o e-mail, o push
   e o painel mostram exatamente o que o cliente viu antes de enviar.
   ===================================================== */
'use strict';

/* ---------- opções de lá ---------- */
const TRF_TIPOS = [
  ['chegada', 'Chegada', 'aeroporto ou estação → hotel'],
  ['saida', 'Saída', 'hotel → aeroporto ou estação'],
  ['cidades', 'Entre cidades', 'de uma cidade a outra'],
  ['outro', 'Outro trajeto', 'restaurante, evento, passeio…'],
];
const TRF_AEROPORTO = 'Aeroporto BER (Berlim-Brandemburgo)';
const TRF_HOTEL = 'Hotel em Berlim';
/* atalhos de um toque; o campo continua livre */
const TRF_ATALHOS = [TRF_AEROPORTO, 'Estação Central (Berlin Hbf)', TRF_HOTEL];
function trfCidades() {
  const rg = (typeof regioes === 'function' ? regioes() : []).filter(r => r[0] !== 'berlim');
  const nome = { bauhaus: 'Dessau (Bauhaus)', oranienburg: 'Oranienburg (Sachsenhausen)' };
  return ['Berlim'].concat(rg.map(r => nome[r[0]] || r[1]));
}

const RT_TEMAS = [
  ['guerra', 'Segunda Guerra e Holocausto'], ['muro', 'Muro e Guerra Fria'],
  ['ddr', 'Berlim Oriental (DDR)'], ['reconstrucao', 'Reconstrução e arquitetura'],
  ['judaica', 'História judaica'], ['prussia', 'Palácios e reis da Prússia'],
  ['museus', 'Museus e arte'], ['comida', 'Comida e cerveja alemã'], ['criancas', 'Programa com crianças'],
];
const RT_RITMO = [['calmo', 'Tranquilo'], ['medio', 'Equilibrado'], ['intenso', 'Ver tudo que der']];
const RT_PRECISA = [['transfer', 'Transfer'], ['ingressos', 'Ingressos'], ['hotel', 'Dica de hotel'], ['restaurante', 'Dica de restaurante']];
/* quanto tempo por dia com ela — sai dos turnos (Manhã 09:30–13:30, Tarde 14:00–18:00) */
function rtPeriodos() {
  const tu = typeof turnos === 'function' ? turnos() : [];
  if (tu.length < 2) return [['manha', 'Manhã'], ['tarde', 'Tarde'], ['dia', 'Dia inteiro']];
  return tu.map((x, i) => [i ? 'tarde' : 'manha', `Só ${x.nome.toLowerCase()} (${x.hora}–${x.fim})`]).concat([['dia', 'Dia inteiro (manhã + tarde)']]);
}
const rtNome = (lista, v) => (lista.find(o => o[0] === v) || [v, v])[1];

/* ---------- a ficha (o texto que chega nela) ---------- */
const pdData = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
const pdPlural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
function pdGrupo(p) {
  return pdPlural(p.adultos, 'adulto', 'adultos') + (p.criancas ? ', ' + pdPlural(p.criancas, 'criança', 'crianças') + (p.idades ? ' (' + p.idades + ')' : '') : '');
}
function pdAssinatura(p) { return '— ' + p.nome + (p.whats ? ' · ' + p.whats : '') + (p.email ? ' · ' + p.email : ''); }

function fichaTransfer(p) {
  const L = ['Olá, ' + guiaNome() + '! Quero um transfer:', ''];
  L.push('🚘 ' + rtNome(TRF_TIPOS, p.tipoTrf) + ': ' + (p.de || '?') + ' → ' + (p.para || '?'));
  L.push('🗓 ' + [pdData(p.data), p.hora].filter(Boolean).join(' às ') + (p.voo ? ' · voo/trem ' + p.voo : ''));
  if (p.volta) L.push('↩️ Volta: ' + [pdData(p.voltaData), p.voltaHora].filter(Boolean).join(' às ') + (p.voltaVoo ? ' · voo/trem ' + p.voltaVoo : ''));
  L.push('👥 ' + pdGrupo(p));
  L.push('🧳 ' + pdPlural(p.malas, 'mala grande', 'malas grandes') + ', ' + pdPlural(p.malasMao, 'de mão', 'de mão'));
  if (p.obs) L.push('', p.obs);
  L.push('', pdAssinatura(p));
  return L.join('\n');
}
function fichaRoteiro(p) {
  const L = ['Olá, ' + guiaNome() + '! Quero montar um roteiro:', ''];
  if (p.ini || p.fim) L.push('🗓 ' + [pdData(p.ini), pdData(p.fim)].filter(Boolean).join(' → '));
  L.push('👥 ' + pdGrupo(p));
  if (p.passeios.length) L.push('📍 Passeios: ' + p.passeios.join(', '));
  if (p.temas.length) L.push('❤️ Interesses: ' + p.temas.map(v => rtNome(RT_TEMAS, v)).join(', '));
  if (p.cidades.length) L.push('🚆 Além de Berlim: ' + p.cidades.join(', '));
  if (p.periodo) L.push('⏱ Com a guia: ' + rtNome(rtPeriodos(), p.periodo).toLowerCase() + (p.ritmo ? ' · ritmo ' + rtNome(RT_RITMO, p.ritmo).toLowerCase() : ''));
  if (p.precisa.length) L.push('🧳 Precisa também: ' + p.precisa.map(v => rtNome(RT_PRECISA, v).toLowerCase()).join(', '));
  if (p.obs) L.push('', p.obs);
  L.push('', pdAssinatura(p));
  return L.join('\n');
}
/* uma linha: o push no celular dela e a lista do painel */
function resumoPedido(p) {
  if (p.tipo === 'transfer') return [p.nome, [pdData(p.data), p.hora].filter(Boolean).join(' '), (p.de || '?') + ' → ' + (p.para || '?'), pdPlural(p.adultos + p.criancas, 'pessoa', 'pessoas')].filter(Boolean).join(' · ');
  return [p.nome, [pdData(p.ini), pdData(p.fim)].filter(Boolean).join(' → '), pdPlural(p.adultos + p.criancas, 'pessoa', 'pessoas')].filter(Boolean).join(' · ');
}

/* ---------- guardar ---------- */
const Pedidos = {
  all() { return [...(DB.pedidos || [])].sort((a, b) => (b.criado || '').localeCompare(a.criado || '')); },
  novos() { return (DB.pedidos || []).filter(p => !p.respondido).length; },
  cria(tipo, r) {
    const s = (v) => String(v || '').trim().slice(0, 600);
    const n = (v, min) => Math.max(min, Math.min(60, Math.round(+v) || 0));
    const p = { id: uid() + uid(), tipo, criado: new Date().toISOString(), respondido: false,
      nome: s(r.nome), whats: s(r.whats), email: s(r.email), obs: String(r.obs || '').trim().slice(0, 1500),
      adultos: n(r.adultos, 1), criancas: n(r.criancas, 0), idades: r.criancas ? s(r.idades) : '' };
    if (tipo === 'transfer') Object.assign(p, {
      tipoTrf: r.tipoTrf, de: s(r.de), para: s(r.para), data: s(r.data), hora: s(r.hora), voo: s(r.voo),
      volta: !!r.volta, voltaData: r.volta ? s(r.voltaData) : '', voltaHora: r.volta ? s(r.voltaHora) : '', voltaVoo: r.volta ? s(r.voltaVoo) : '',
      malas: n(r.malas, 0), malasMao: n(r.malasMao, 0) });
    else Object.assign(p, {
      ini: s(r.ini), fim: s(r.fim), passeios: [...(r.passeios || [])].map(s), temas: [...(r.temas || [])],
      cidades: [...(r.cidades || [])].map(s), periodo: r.periodo || '', ritmo: r.ritmo || '', precisa: [...(r.precisa || [])] });
    p.ficha = tipo === 'transfer' ? fichaTransfer(p) : fichaRoteiro(p);
    p.resumo = resumoPedido(p);
    DB.pedidos = DB.pedidos || [];
    DB.pedidos.push(p);
    /* só neste aparelho: pedido NUNCA vai no appstate (que é público) */
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    return p;
  },
  marca(id, respondido) {
    const p = (DB.pedidos || []).find(x => x.id === id);
    if (!p) return;
    p.respondido = !!respondido;
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudUpdatePedido === 'function') cloudUpdatePedido(p);
  },
};

/* ---------- telas do cliente ---------- */
function pdTopo(titulo) {
  return `<header class="topbar">
    <button class="backbtn" id="bk" aria-label="${t('back')}">←</button>
    <span class="tbrand">${logoMark(24, 'var(--brand-assinatura)')}<b>${esc(guiaNome())}</b></span>
  </header>`;
}
const pdContador = (k, v, rot, sub) => `<div class="paxrow"><span><b>${rot}</b>${sub ? `<small>${sub}</small>` : ''}</span>
  <div class="pm"><button type="button" data-rc="${k}" data-d="-1" aria-label="menos ${rot}">−</button><span>${v}</span><button type="button" data-rc="${k}" data-d="1" aria-label="mais ${rot}">+</button></div></div>`;
const pdVoce = (R) => `<section class="rtbloco"><h3>Seus dados</h3>
  <label class="fld">Nome completo<input id="pdNome" autocomplete="name" value="${esc(R.nome || '')}"></label>
  <label class="fld">WhatsApp (com DDI)<input id="pdWhats" type="tel" autocomplete="tel" placeholder="+55 11 …" value="${esc(R.whats || '')}"></label>
  <label class="fld">E-mail<input id="pdEmail" type="email" autocomplete="email" value="${esc(R.email || '')}"></label>
</section>`;
function pdLeVoce(R) { R.nome = $('#pdNome').value; R.whats = $('#pdWhats').value; R.email = $('#pdEmail').value; }

/* a tela de "enviado": com nuvem, ela já recebeu; sem nuvem, o WhatsApp é o envio */
function pdEnviado(p, chegou) {
  const wa = waLink(p.ficha);
  app.innerHTML = `${pdTopo()}
  <main class="wrap roteiro fim">
    <div class="okc">✓</div>
    <h2 class="okh">${chegou ? 'Pedido enviado' : 'Quase lá'}</h2>
    <p class="hint center">${chegou
      ? `${esc(guiaNome())} já recebeu e responde com ${p.tipo === 'transfer' ? 'o valor do transfer' : 'uma proposta de roteiro'} pelo WhatsApp ou e-mail.`
      : `O WhatsApp de ${esc(guiaNome())} abriu com o pedido pronto — é só apertar enviar. Não abriu? Toque abaixo.`}</p>
    <a class="cta" id="pdWa" target="_blank" rel="noopener" href="${esc(wa)}">${ICONE_WA_BTN} ${chegou ? 'Falar no WhatsApp agora' : 'Mandar no WhatsApp'}</a>
    <button class="cta soft" id="pdPasseios">${t('seeTours')}</button>
  </main>`;
  $('#bk').onclick = () => go('/');
  $('#pdPasseios').onclick = () => go('/tours');
}
async function pdEnvia(tipo, R) {
  const p = Pedidos.cria(tipo, R);
  const nuvem = typeof temNuvem === 'function' && temNuvem() && typeof cloudPushPedido === 'function';
  /* sem nuvem o WhatsApp é o único caminho: abre JÁ, no mesmo toque
     (depois de um await o iPhone bloqueia a janela nova) */
  if (!nuvem) { window.open(waLink(p.ficha), '_blank'); return pdEnviado(p, false); }
  const b = $('#pdEnviar'); if (b) { b.disabled = true; b.textContent = 'Enviando…'; }
  const r = await cloudPushPedido(p);
  pdEnviado(p, !!(r && r.ok));
}

/* TRANSFER */
function viewTransfer() {
  const R = viewTransfer._s = viewTransfer._s || { tipoTrf: 'chegada', de: TRF_AEROPORTO, para: '', adultos: 2, criancas: 0, malas: 2, malasMao: 2, volta: false };
  const chega = R.tipoTrf === 'chegada', sai = R.tipoTrf === 'saida', cid = R.tipoTrf === 'cidades';
  const lugares = cid ? trfCidades() : TRF_ATALHOS;
  const atalhos = (campo) => `<div class="chips pdAtalhos">${lugares.map(l =>
    `<button type="button" class="chip ${R[campo] === l ? 'on' : ''}" data-at="${campo}" data-v="${esc(l)}">${esc(l.replace(/ \(.*\)$/, ''))}</button>`).join('')}</div>`;
  const hoje = isoToday();
  app.innerHTML = `${pdTopo()}
  <main class="wrap roteiro">
    <h1 class="pageh">Transfer</h1>
    <p class="rtintro">Do aeroporto, da estação, do hotel ou de uma cidade a outra. Preencha e ${esc(guiaNome())} responde com o valor.</p>

    <section class="rtbloco"><h3>Qual trajeto?</h3>
      <div class="pdTipos" role="radiogroup" aria-label="Tipo de transfer">${TRF_TIPOS.map(([v, n, sub]) =>
        `<button type="button" role="radio" aria-checked="${R.tipoTrf === v}" class="pdTipo ${R.tipoTrf === v ? 'on' : ''}" data-tipo="${v}"><b>${n}</b><small>${sub}</small></button>`).join('')}</div>
      <label class="fld">De onde<input id="trDe" list="trLugares" value="${esc(R.de || '')}" placeholder="${sai ? 'nome e endereço do hotel' : cid ? 'cidade' : 'aeroporto, estação ou endereço'}"></label>
      ${atalhos('de')}
      <label class="fld">Para onde<input id="trPara" list="trLugares" value="${esc(R.para || '')}" placeholder="${chega ? 'nome e endereço do hotel' : cid ? 'cidade' : 'aeroporto, estação ou endereço'}"></label>
      ${atalhos('para')}
      <datalist id="trLugares">${TRF_ATALHOS.concat(trfCidades()).map(l => `<option value="${esc(l)}">`).join('')}</datalist>
    </section>

    <section class="rtbloco"><h3>Quando</h3>
      <div class="frow">
        <label class="fld">Data<input type="date" id="trData" min="${hoje}" value="${esc(R.data || '')}"></label>
        <label class="fld">${chega ? 'Hora que chega' : sai ? 'Hora do voo/trem' : 'Hora de sair'}<input type="time" id="trHora" value="${esc(R.hora || '')}"></label>
      </div>
      ${chega || sai ? `<label class="fld">Nº do voo ou trem <small class="why">opcional — ajuda a acompanhar atraso</small><input id="trVoo" value="${esc(R.voo || '')}" placeholder="ex.: LH 1234"></label>` : ''}
      ${sai ? `<small class="why pdDica">${esc(guiaNome())} calcula a hora de buscar no hotel.</small>` : ''}
      <label class="pdCheck"><input type="checkbox" id="trVolta" ${R.volta ? 'checked' : ''}> Quero a volta também</label>
      ${R.volta ? `<div class="frow">
        <label class="fld">Data da volta<input type="date" id="trVData" min="${esc(R.data || hoje)}" value="${esc(R.voltaData || '')}"></label>
        <label class="fld">Hora<input type="time" id="trVHora" value="${esc(R.voltaHora || '')}"></label>
      </div>
      ${chega || sai ? `<label class="fld">Voo ou trem da volta <small class="why">opcional</small><input id="trVVoo" value="${esc(R.voltaVoo || '')}"></label>` : ''}` : ''}
    </section>

    <section class="rtbloco"><h3>Quem vai e quanta bagagem</h3>
      ${pdContador('adultos', R.adultos, 'Adultos', '')}
      ${pdContador('criancas', R.criancas, 'Crianças', 'até 12 anos')}
      ${R.criancas ? `<label class="fld">Idade de cada criança <small class="why">para a cadeirinha, obrigatória na Alemanha</small><input id="pdIdades" value="${esc(R.idades || '')}" placeholder="ex.: 3 e 7 anos"></label>` : ''}
      ${pdContador('malas', R.malas, 'Malas grandes', 'de despachar')}
      ${pdContador('malasMao', R.malasMao, 'Malas de mão', 'e mochilas')}
    </section>

    <section class="rtbloco"><h3>Algo mais?</h3>
      <label class="fld"><textarea id="pdObs" rows="3" placeholder="Carrinho de bebê, cadeira de rodas, parada no caminho…">${esc(R.obs || '')}</textarea></label>
    </section>

    ${pdVoce(R)}
    <button class="cta" id="pdEnviar">Enviar pedido para ${esc(guiaNome())}</button>
    <p class="fine">Sem compromisso: você recebe o valor e decide.</p>
  </main>`;
  const guarda = () => {
    R.de = $('#trDe').value; R.para = $('#trPara').value; R.data = $('#trData').value; R.hora = $('#trHora').value;
    R.voo = $('#trVoo') ? $('#trVoo').value : ''; R.volta = $('#trVolta').checked;
    if ($('#trVData')) { R.voltaData = $('#trVData').value; R.voltaHora = $('#trVHora').value; R.voltaVoo = $('#trVVoo') ? $('#trVVoo').value : ''; }
    R.idades = $('#pdIdades') ? $('#pdIdades').value : (R.idades || ''); R.obs = $('#pdObs').value; pdLeVoce(R);
  };
  $('#bk').onclick = () => go('/');
  $$('[data-tipo]').forEach(b => b.onclick = () => {
    guarda();
    const v = b.dataset.tipo; if (v === R.tipoTrf) return;
    /* a origem/destino óbvios de cada tipo — sem apagar o que a pessoa já digitou de próprio */
    const auto = (x) => !x || TRF_ATALHOS.includes(x) || trfCidades().includes(x);
    R.tipoTrf = v;
    if (auto(R.de)) R.de = v === 'chegada' ? TRF_AEROPORTO : v === 'saida' ? '' : v === 'cidades' ? 'Berlim' : '';
    if (auto(R.para)) R.para = v === 'saida' ? TRF_AEROPORTO : '';
    viewTransfer();
  });
  $$('[data-at]').forEach(b => b.onclick = () => { guarda(); R[b.dataset.at] = b.dataset.v; viewTransfer(); });
  $('#trVolta').onchange = () => { guarda(); viewTransfer(); };
  $$('[data-rc]').forEach(b => b.onclick = () => {
    guarda(); const k = b.dataset.rc;
    R[k] = Math.max(k === 'adultos' ? 1 : 0, Math.min(60, R[k] + +b.dataset.d)); viewTransfer();
  });
  $('#pdEnviar').onclick = () => {
    guarda();
    if (!R.de.trim() || !R.para.trim()) return toast('Diga de onde e para onde');
    if (!R.data) return toast('Escolha a data');
    if (!R.nome.trim() || !R.whats.trim()) return toast('Falta seu nome e WhatsApp');
    viewTransfer._s = null;
    pdEnvia('transfer', R);
  };
}

/* MONTE SEU ROTEIRO — com as opções de lá */
function viewRoteiro() {
  const R = viewRoteiro._s = viewRoteiro._s || { adultos: 2, criancas: 0, passeios: [], temas: [], cidades: [], precisa: [], periodo: '', ritmo: 'medio' };
  const chips = (grupo, lista) => lista.map(([v, n]) =>
    `<button type="button" class="chip ${R[grupo].includes(v) ? 'on' : ''}" data-g="${grupo}" data-v="${esc(v)}" aria-pressed="${R[grupo].includes(v)}">${esc(n)}</button>`).join('');
  const passeios = Tours.live();
  const cidades = trfCidades().filter(c => c !== 'Berlim').map(c => [c, c]);
  const hoje = isoToday();
  app.innerHTML = `${pdTopo()}
  <main class="wrap roteiro">
    <h1 class="pageh">Monte seu roteiro</h1>
    <p class="rtintro">Escolha o que quer ver em Berlim e arredores. ${esc(guiaNome())} organiza os dias e manda a proposta.</p>

    <section class="rtbloco"><h3>Quando você vem?</h3>
      <div class="frow">
        <label class="fld">Chego em<input type="date" id="rtIni" min="${hoje}" value="${esc(R.ini || '')}"></label>
        <label class="fld">Vou embora em<input type="date" id="rtFim" min="${esc(R.ini || hoje)}" value="${esc(R.fim || '')}"></label>
      </div>
    </section>

    <section class="rtbloco"><h3>Quem vem</h3>
      ${pdContador('adultos', R.adultos, 'Adultos', '')}
      ${pdContador('criancas', R.criancas, 'Crianças', 'até 12 anos')}
      ${R.criancas ? `<label class="fld">Idades<input id="pdIdades" value="${esc(R.idades || '')}" placeholder="ex.: 5 e 9 anos"></label>` : ''}
    </section>

    ${passeios.length ? `<section class="rtbloco"><h3>Passeios que quer incluir</h3><small class="why">Toque em quantos quiser</small>
      <div class="pdPasseios">${passeios.map(x => { const n = tl(x.name), on = R.passeios.includes(n);
        return `<button type="button" class="pdPasseio ${on ? 'on' : ''}" data-g="passeios" data-v="${esc(n)}" aria-pressed="${on}">
          <img src="${esc(x.photo || '')}" alt="" loading="lazy"><span><b>${esc(n)}</b><small>${esc(tipoLabel(x.type))}</small></span><i aria-hidden="true">${on ? '✓' : '+'}</i></button>`; }).join('')}</div>
    </section>` : ''}

    <section class="rtbloco"><h3>O que te interessa</h3><small class="why">Toque em quantos quiser</small>
      <div class="chips">${chips('temas', RT_TEMAS)}</div>
    </section>

    ${cidades.length ? `<section class="rtbloco"><h3>Além de Berlim</h3><small class="why">Bate-volta de um dia</small>
      <div class="chips">${chips('cidades', cidades)}</div>
    </section>` : ''}

    <section class="rtbloco"><h3>Quanto tempo por dia com a guia</h3>
      <div class="chips">${rtPeriodos().map(([v, n]) => `<button type="button" class="chip ${R.periodo === v ? 'on' : ''}" data-periodo="${v}" aria-pressed="${R.periodo === v}">${esc(n)}</button>`).join('')}</div>
      <h3 class="pdSub">Ritmo</h3>
      <div class="chips">${RT_RITMO.map(([v, n]) => `<button type="button" class="chip ${R.ritmo === v ? 'on' : ''}" data-ritmo="${v}" aria-pressed="${R.ritmo === v}">${esc(n)}</button>`).join('')}</div>
    </section>

    <section class="rtbloco"><h3>Precisa também de</h3>
      <div class="chips">${chips('precisa', RT_PRECISA)}</div>
    </section>

    <section class="rtbloco"><h3>Conte mais</h3>
      <label class="fld"><textarea id="pdObs" rows="4" placeholder="Primeira vez em Berlim? Algum lugar que não pode faltar? Mobilidade reduzida?">${esc(R.obs || '')}</textarea></label>
    </section>

    ${pdVoce(R)}
    <button class="cta" id="pdEnviar">Enviar para ${esc(guiaNome())}</button>
    <p class="fine">Sem compromisso: você recebe a proposta e decide.</p>
  </main>`;
  const guarda = () => {
    R.ini = $('#rtIni').value; R.fim = $('#rtFim').value;
    R.idades = $('#pdIdades') ? $('#pdIdades').value : (R.idades || ''); R.obs = $('#pdObs').value; pdLeVoce(R);
  };
  $('#bk').onclick = () => go('/');
  $$('[data-g]').forEach(b => b.onclick = () => {
    guarda();
    const g = R[b.dataset.g], v = b.dataset.v, i = g.indexOf(v);
    if (i >= 0) g.splice(i, 1); else g.push(v);
    viewRoteiro();
  });
  $$('[data-periodo]').forEach(b => b.onclick = () => { guarda(); R.periodo = R.periodo === b.dataset.periodo ? '' : b.dataset.periodo; viewRoteiro(); });
  $$('[data-ritmo]').forEach(b => b.onclick = () => { guarda(); R.ritmo = b.dataset.ritmo; viewRoteiro(); });
  $$('[data-rc]').forEach(b => b.onclick = () => {
    guarda(); const k = b.dataset.rc;
    R[k] = Math.max(k === 'adultos' ? 1 : 0, Math.min(60, R[k] + +b.dataset.d)); viewRoteiro();
  });
  $('#pdEnviar').onclick = () => {
    guarda();
    if (!R.nome.trim() || !R.whats.trim()) return toast('Falta seu nome e WhatsApp');
    viewRoteiro._s = null;
    pdEnvia('roteiro', R);
  };
}

/* ---------- painel: Reservas → Pedidos (trabalho a fazer: novo em cima) ---------- */
function pedidosHtml() {
  const ps = Pedidos.all(), novos = Pedidos.novos();
  const quando = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  return `<details class="card pedidos" id="pedidosCard" ${novos ? 'open' : ''}>
    <summary><b>Pedidos de transfer e roteiro</b>${novos ? ` <span class="pill warn">${novos} ${novos === 1 ? 'novo' : 'novos'}</span>` : ''}</summary>
    ${ps.length ? ps.map(p => {
      const num = String(p.whats || '').replace(/\D/g, '');
      const oi = `Olá, ${String(p.nome || '').split(' ')[0]}! Aqui é ${guiaNome()}, da ${DB.settings.negocio || 'Conexão Berlim'}. Recebi seu pedido de ${p.tipo === 'transfer' ? 'transfer' : 'roteiro'}.`;
      return `<div class="pedido ${p.respondido ? 'resp' : ''}">
      <div class="pdtop"><b>${p.tipo === 'transfer' ? '🚘 Transfer' : '🗺️ Roteiro'} · ${esc(p.nome)}</b>
        <span class="pill ${p.respondido ? 'ok' : 'warn'}">${p.respondido ? 'Respondido' : 'Novo'}</span></div>
      <small>${esc(p.resumo || '')} · chegou ${esc(quando(p.criado))}</small>
      <pre class="pdmsg">${esc(p.ficha || '')}</pre>
      <div class="tacts">
        ${num.length >= 8 ? `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink(oi, num))}">Responder no WhatsApp</a>` : ''}
        ${p.email ? `<a class="mini" href="mailto:${esc(p.email)}?subject=${encodeURIComponent((p.tipo === 'transfer' ? 'Seu transfer' : 'Seu roteiro') + ' em Berlim')}">E-mail</a>` : ''}
        <button class="mini" data-pdm="${esc(p.id)}" data-v="${p.respondido ? '0' : '1'}">${p.respondido ? 'Voltar para novo' : 'Marcar respondido'}</button>
      </div>
    </div>`; }).join('') : `<p class="why">Quando um cliente pedir transfer ou montar um roteiro pelo app, o pedido aparece aqui — e chega no seu celular.</p>`}
  </details>`;
}
function ligaPedidos(redesenha) {
  $$('[data-pdm]').forEach(b => b.onclick = () => { Pedidos.marca(b.dataset.pdm, b.dataset.v === '1'); redesenha(); });
}

if (typeof module !== 'undefined') module.exports = { fichaTransfer, fichaRoteiro, resumoPedido, TRF_TIPOS, RT_TEMAS };
