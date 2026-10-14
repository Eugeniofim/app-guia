/* =====================================================
   FREDDY TURISMO — a vitrine (primeira tela) e o "Quem é o Roberto"
   (14/10/2026)

   Pedido do Roberto: vitrine mais parecida com a da Dulcineia (Conexão
   Berlim), com MENOS coisas — foto grande, redes no topo, poucos botões e
   diretos. Por isso esta tela substitui a do demo de Londres (carol.js),
   que tinha consultoria, ingressos, eBooks e vale-presente na frente.
   Essas telas continuam existindo (o painel as usa), só saíram da vitrine.

   15/10/2026: a conversa (Mensagens) NÃO fica na vitrine — é coisa de
   dentro do app: o cliente baixa, se cadastra e entra na rede de mensagens
   (ícone no topo, comunicacao.js). No lugar: cotação de transfer na hora e
   Dicas de Londres. Avaliações saiu da vitrine (fica no painel).
   ===================================================== */
'use strict';

const ICONE_MSG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>';
const ICONE_LIBRA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 6.5A3.8 3.8 0 0 0 9 8.5V19"/><path d="M6 12.5h7M6 19h11"/></svg>';
const ICONE_CARRO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 16v-3.5L5 8h14l2 4.5V16"/><path d="M3 16h18"/><circle cx="7" cy="16.5" r="1.8"/><circle cx="17" cy="16.5" r="1.8"/><path d="M6 12h12"/></svg>';

function viewHub() {
  const st = DB.settings;
  const ig = String(st.insta || '').replace(/^@/, '');
  /* redes NO TOPO, sobre a foto (pedido dele) */
  const redes = [
    ig ? { u: 'https://instagram.com/' + ig, ic: ICONE_IG, n: 'Instagram', c: 'ig' } : null,
    st.whats ? { u: waLink('Olá, Roberto! Vim pelo app da Freddy Turismo.'), ic: ICONE_WA, n: 'WhatsApp', c: 'wa' } : null,
    linkExterno(st.facebook) ? { u: linkExterno(st.facebook), ic: ICONE_FB, n: 'Facebook', c: 'fb' } : null,
    linkExterno(st.site) ? { u: linkExterno(st.site), ic: ICONE_SITE, n: 'Site', c: 'site' } : null,
    st.email ? { u: 'mailto:' + st.email, ic: IC.email, n: 'E-mail', c: 'mail' } : null,
  ].filter(Boolean);
  const bt = (id, ic, tit, sub, cls = '') => `<button class="lk ${cls}" id="${id}"><span class="ic">${ic}</span><span><b>${tit}</b><small>${sub}</small></span><span class="go" aria-hidden="true">→</span></button>`;
  app.innerHTML = `
  <div class="fdHub">
    <header class="fdTopo" style="background-image:url(${esc(st.homePhoto || 'fotos/p-tower-bridge.jpg')})">
      <nav class="fdRedes" aria-label="Redes da Freddy Turismo">${redes.map(r =>
        `<a class="fdRede ${r.c}" href="${esc(r.u)}" target="_blank" rel="noopener" aria-label="${r.n}" title="${r.n}">${r.ic}</a>`).join('')}</nav>
      <div class="fdTopoDir">${langBar('right fdLangs')}${typeof comBotaoTopo === 'function' ? comBotaoTopo() : ''}</div>
      ${st.homePhotoCr ? `<small class="fdCr">${esc(st.homePhotoCr)}</small>` : ''}
    </header>
    <div class="fdIn">
      <div class="fdCard">
        <div class="fdLogo">${logoImg(58, 'claro')}</div>
        <p class="fdLema">Londres de Mercedes, com quem conhece.</p>
        <p class="fdTag">${esc(noIdioma(st.homeText) || t('tagline'))}</p>
        <p class="fdSelos"><span>Desde 2008</span><span>PT · EN · IT · ES</span><span>★ 5,0 TripAdvisor</span></p>
      </div>

      ${bt('goTours', ICONE_MENU.passeios, 'Passeios', 'City tour, Windsor, Stonehenge, Oxford, Cotswolds…', 'main')}
      ${bt('goTransfer', ICONE_MENU.transfer, 'Transfer', 'Aeroporto, hotel, porto ou entre cidades')}
      ${bt('goCotacao', ICONE_LIBRA, 'Quanto custa o meu transfer?', 'Escolha o aeroporto e veja o valor na hora')}
      ${bt('goRoteiro', ICONE_MENU.roteiro, 'Monte seu roteiro', 'Me diga os dias, eu organizo tudo')}
      <button class="lk" id="goAbout"><span class="ic">${ICONE_CARRO}</span><span><b>Quem é o Roberto e a frota</b><small>Brasileiro em Londres desde 2008 · Mercedes executivos</small></span><span class="go" aria-hidden="true">→</span></button>
      ${bt('goDicas', IC.livro, 'Dicas de Londres', 'O básico para o brasileiro: ETA, tomada, cartão, clima')}

      ${typeof secaoDepoimentos === 'function' ? secaoDepoimentos('noHub') : ''}
      ${typeof secaoViagem === 'function' ? secaoViagem() : ''}

      ${typeof temNuvem === 'function' && !temNuvem()
        ? `<button class="adm-demo" id="admEntry"><span class="ic" aria-hidden="true">✦</span><span><b>Roberto, abra o seu painel</b><small>Reservas, transfers, agenda, ficha dos clientes, Comunicação e o assistente de IA</small></span><span class="go" aria-hidden="true">→</span></button>`
        : `<button class="adm-entry" id="admEntry">🔒 ${t('admEntry')}</button>`}
      <p class="fdRodape">Freddy Turismo London · TfL licensed · ${esc(st.whats || '')}</p>
    </div>
  </div>`;
  bindLang(app);
  $('#goTours').onclick = () => go('/tours');
  $('#goTransfer').onclick = () => go('/transfer');
  $('#goCotacao').onclick = () => go('/cotacao');
  $('#goRoteiro').onclick = () => go('/roteiro');
  $('#goAbout').onclick = () => go('/about');
  $('#goDicas').onclick = () => go('/dicas');
  if (typeof comLigaBotaoTopo === 'function') comLigaBotaoTopo();
  $('#admEntry').onclick = () => go('/adm/today');
}

function viewAbout() {
  const st = DB.settings;
  const paras = ((st.bio && tl(st.bio)) || '').split(/\n\s*\n/).filter(Boolean);
  const carros = [
    ['Mercedes Classe S', 'Para quem quer o máximo de conforto', 'até 3 pessoas'],
    ['Mercedes Classe E', 'Casais, executivos e transfers', 'até 3 pessoas'],
    ['Mercedes V-Class AMG', 'Famílias e grupos, com espaço para malas', 'até 7 pessoas'],
  ];
  app.innerHTML = `${topoCarol()}
  <main class="wrap about carolAbout">
    <div class="abFoto"><img src="${esc(st.photo || 'fotos/home-westminster.jpg')}" alt=""></div>
    <p class="lema escuro">Londres de Mercedes, com quem conhece.</p>
    <h1 class="pageh">Quem é o ${esc(guiaNome())}</h1>
    <p class="abSub">${esc(st.badge || '')}</p>
    <div class="ab-body">${paras.map(p => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="ab-facts">
      <div><small>Em Londres desde</small><b>2008</b></div>
      <div><small>Idiomas</small><b>${esc(G.idiomas || 'Português')}</b></div>
      <div><small>Carros</small><b>Mercedes · TfL</b></div>
    </div>
    <h2 class="h3 fdFrotaTit">A frota</h2>
    <div class="fdFrota">${carros.map(([n, s, q]) => `<div class="fdCarro"><span class="ic">${ICONE_CARRO}</span><b>${n}</b><small>${s}</small><em>${q}</em></div>`).join('')}</div>
    <p class="why">Todos licenciados pela TfL, com Wi-Fi, água, guarda-chuva e limpeza completa depois de cada serviço.</p>
    ${typeof secaoDepoimentos === 'function' ? secaoDepoimentos('noSobre') : ''}
    <div class="ab-cta">
      <h3>Vamos planejar a sua Londres?</h3>
      <div class="ab-btns">
        <button class="cta" id="abTours">${t('seeTours')}</button>
        <a class="mini" href="#/mensagens">Mensagens</a>
        <a class="mini" href="${waLink('Olá, Roberto!')}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="mini" href="https://instagram.com/${esc(String(st.insta || '').replace(/^@/, ''))}" target="_blank" rel="noopener">@${esc(String(st.insta || '').replace(/^@/, ''))}</a>
      </div>
    </div>
  </main>`;
  ligaVoltar('/');
  $('#abTours').onclick = () => go('/tours');
}

/* =====================================================
   QUANTO CUSTA O MEU TRANSFER? — cotação na hora (15/10/2026)
   O cliente escolhe de onde, para onde, pessoas e malas e vê o valor dos
   dois carros. VALORES DE EXEMPLO: o Roberto passa a tabela dele.
   "Reservar" abre o pedido de transfer já preenchido.
   ===================================================== */
const COTACAO = {
  origens: [
    ['LHR', 'Aeroporto de Heathrow', 'Heathrow (LHR)', 85, 110],
    ['LGW', 'Aeroporto de Gatwick', 'Gatwick (LGW)', 120, 150],
    ['STN', 'Aeroporto de Stansted', 'Stansted (STN)', 130, 160],
    ['LTN', 'Aeroporto de Luton', 'Luton (LTN)', 120, 150],
    ['LCY', 'London City Airport', 'London City (LCY)', 70, 90],
    ['STP', 'Estação St Pancras (Eurostar)', 'St Pancras International', 60, 80],
    ['SOU', 'Porto de Southampton (cruzeiros)', 'Porto de Southampton', 220, 270],
    ['DOV', 'Porto de Dover (cruzeiros)', 'Porto de Dover', 240, 290],
  ],
  /* multiplicador sobre o valor "até o centro de Londres"; null = sob consulta */
  destinos: [
    ['centro', 'Centro de Londres (hotel)', 1],
    ['bairros', 'Outros bairros de Londres', 1.15],
    ['windsor', 'Windsor ou arredores', 1.1],
    ['outra', 'Outra cidade', null],
  ],
};
function viewCotacao() {
  const S = viewCotacao._s = viewCotacao._s || { o: 'LHR', d: 'centro', pax: 2, malas: 2, volta: false };
  const o = COTACAO.origens.find(x => x[0] === S.o), d = COTACAO.destinos.find(x => x[0] === S.d);
  const precisaV = S.pax > 3 || S.malas > 3;
  const preco = (v) => d[2] == null ? null : Math.round(v * d[2] / 5) * 5 * (S.volta ? 2 : 1);
  const pE = preco(o[3]), pV = preco(o[4]);
  const opt = (lista, sel) => lista.map(x => `<option value="${x[0]}" ${x[0] === sel ? 'selected' : ''}>${esc(x[1])}</option>`).join('');
  const num = (id, v, min, max) => `<div class="fdNum"><button type="button" data-n="${id}" data-d="-1" aria-label="menos">−</button><b>${v}</b><button type="button" data-n="${id}" data-d="1" aria-label="mais">+</button></div>`;
  const carro = (nome, sub, p, ok) => `<div class="fdCot ${ok ? '' : 'off'}"><b>${nome}</b><small>${sub}</small>
    <span class="fdCotV">${p == null ? 'sob consulta' : ok ? eur(p) : 'não cabe'}</span></div>`;
  app.innerHTML = `${topoCarol()}
  <main class="wrap narrow fdCotacao">
    <h1 class="pageh">Quanto custa o meu transfer?</h1>
    <p class="why">Escolha o trajeto e veja o valor do carro na hora, para o grupo todo, não por pessoa. O motorista acompanha o seu voo e espera com uma plaquinha com o seu nome.</p>
    <div class="card fdCotForm">
      <label class="fld">De onde<select id="ctO">${opt(COTACAO.origens, S.o)}</select></label>
      <label class="fld">Para onde<select id="ctD">${opt(COTACAO.destinos, S.d)}</select></label>
      <div class="fdCotLinha"><span>Pessoas</span>${num('pax', S.pax)}</div>
      <div class="fdCotLinha"><span>Malas grandes</span>${num('malas', S.malas)}</div>
      <label class="optin"><input type="checkbox" id="ctVolta" ${S.volta ? 'checked' : ''}><span><b>Quero a volta também</b><small>Hotel → aeroporto no fim da viagem</small></span></label>
    </div>
    <div class="fdCots">
      ${carro('Mercedes Classe E', 'até 3 pessoas e 3 malas', pE, !precisaV)}
      ${carro('Mercedes V-Class', 'até 7 pessoas e 7 malas', pV, S.pax <= 7)}
    </div>
    <p class="fine">${exemploTag()} Valores ${S.volta ? 'de ida e volta' : 'só de ida'}. Espera no aeroporto e acompanhamento do voo incluídos. Grupos maiores ou outra cidade: sob consulta.</p>
    <button class="cta" id="ctReservar">Reservar este transfer</button>
    <a class="linkbtn" target="_blank" rel="noopener" href="${esc(waLink(`Olá, Roberto! Quero um transfer: ${o[1]} → ${d[1]}, ${S.pax} pessoas, ${S.malas} malas${S.volta ? ', com volta' : ''}.`))}">ou pergunte no WhatsApp</a>
  </main>`;
  ligaVoltar('/');
  const re = () => viewCotacao();
  $('#ctO').onchange = (e) => { S.o = e.target.value; re(); };
  $('#ctD').onchange = (e) => { S.d = e.target.value; re(); };
  $('#ctVolta').onchange = (e) => { S.volta = e.target.checked; re(); };
  $$('[data-n]').forEach(b => b.onclick = () => { const k = b.dataset.n; S[k] = Math.max(k === 'pax' ? 1 : 0, Math.min(k === 'pax' ? 16 : 16, S[k] + +b.dataset.d)); re(); });
  $('#ctReservar').onclick = () => {
    viewTransfer._s = { tipoTrf: 'chegada', de: o[2], para: d[0] === 'outra' ? '' : d[1], adultos: S.pax, criancas: 0, malas: S.malas, malasMao: S.pax, volta: S.volta };
    go('/transfer');
  };
}

/* =====================================================
   DICAS DE LONDRES — o básico para o brasileiro (15/10/2026)
   ===================================================== */
const DICAS = [
  ['🛂', 'Antes de embarcar: ETA', 'Brasileiro precisa da ETA, a autorização eletrônica de viagem do Reino Unido, antes de embarcar. Pede pelo app oficial "UK ETA" ou no site gov.uk, com o passaporte na mão. Sai em poucos dias, mas não deixe para a última hora.'],
  ['🔌', 'Tomada', 'A tomada é a britânica, de três pinos retangulares (tipo G), 230 V. Leve um adaptador. Carregador de celular funciona normal com o adaptador.'],
  ['💳', 'Dinheiro e cartão', 'A moeda é a libra (£). Quase tudo aceita cartão por aproximação, até o metrô e o ônibus: é só encostar o cartão ou o celular na catraca. Dinheiro vivo quase não precisa.'],
  ['🚇', 'Metrô (Tube)', 'Pague por aproximação, sempre com o MESMO cartão na entrada e na saída: o sistema cobra o teto do dia e você nunca paga a mais. No metrô, a escada rolante tem regra: parado à direita, andando à esquerda.'],
  ['👀', 'Atravessar a rua', 'O trânsito vem da direita. Olhe para a direita antes de atravessar — em muitas esquinas está escrito no chão: LOOK RIGHT.'],
  ['☂️', 'Clima', 'O tempo muda várias vezes no mesmo dia. Leve sempre um casaco leve e guarda-chuva pequeno, até no verão. No carro da Freddy Turismo tem guarda-chuva para você.'],
  ['🍽️', 'Restaurante e gorjeta', 'Muitos restaurantes já incluem 12,5% de serviço na conta ("service charge"). Confira antes de dar gorjeta. Em pub, pede-se no balcão.'],
  ['🏛️', 'Museus de graça', 'Museu Britânico, National Gallery, Museu de História Natural, Tate Modern e V&A são gratuitos. Exposições temporárias são pagas.'],
  ['🛍️', 'Domingo', 'Aos domingos as lojas grandes abrem mais tarde e fecham mais cedo (em geral das 12h às 18h).'],
  ['🎒', 'Segurança', 'Londres é tranquila, mas cuidado com celular na mão na calçada (roubo de bicicleta) e com bolsa aberta no metrô e em lugares cheios.'],
  ['🚨', 'Emergência', 'O número de emergência é 999 (polícia, ambulância, bombeiros). Para algo que não é urgente, 111 (saúde) ou 101 (polícia).'],
];
function viewDicas() {
  app.innerHTML = `${topoCarol()}
  <main class="wrap narrow fdDicas">
    <h1 class="pageh">Dicas de Londres</h1>
    <p class="why">O básico que o Roberto conta para todo brasileiro que chega, depois de ${new Date().getFullYear() - 2008} anos em Londres.</p>
    <div class="fdDicasLista">${DICAS.map(([ic, tit, txt]) => `<section class="fdDica"><span class="fdDicaIc" aria-hidden="true">${ic}</span><div><h2>${esc(tit)}</h2><p>${esc(txt)}</p></div></section>`).join('')}</div>
    <div class="ab-cta"><h3>Chegou a hora de planejar?</h3>
      <div class="ab-btns"><button class="cta" id="dcTrf">Cotar meu transfer</button><button class="cta soft" id="dcTours">${t('seeTours')}</button></div></div>
  </main>`;
  ligaVoltar('/');
  $('#dcTrf').onclick = () => go('/cotacao');
  $('#dcTours').onclick = () => go('/tours');
}

const _rotaExtraFreddy = rotaExtra;
rotaExtra = function (p) {
  if (p[0] === 'cotacao') { viewCotacao(); return true; }
  if (p[0] === 'dicas') { viewDicas(); return true; }
  return _rotaExtraFreddy(p);
};

/* 15/10/2026: o Roberto não trabalha com agência por invoice — a aba sai
   do painel (o código fica, só não aparece). */
(function semAgencias() {
  const i = ADM_TABS.findIndex(([x]) => x === 'agencias');
  if (i >= 0) ADM_TABS.splice(i, 1);
  if (typeof NAV_GRUPOS !== 'undefined') {
    const g = NAV_GRUPOS.find(([t2]) => t2 === 'Agências e pedidos');
    if (g) { g[0] = 'Pedidos'; g[1] = g[1].filter(x => x !== 'agencias'); }
  }
})();
