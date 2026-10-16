/* =====================================================
   AILTON GUIA VIENA — a vitrine, o "Quem sou eu", as Avaliações e o menu
   do painel (16/10/2026)

   Pedidos do Eugênio para o Aílton (ele não enxerga bem):
   - tudo com letra MAIOR e a marca bem visível; no laptop a vitrine ocupa
     a tela (duas colunas), no celular empilha;
   - vitrine: fica Passeios e reservas, Quem sou eu, Avaliações e WhatsApp.
     Saem consultoria de roteiro, Monte seu roteiro, ingressos, os guias
     (eBooks) e o vale-presente. Transfer também não aparece: o site dele
     não oferece;
   - os passeios são os do site dele, com as fotos dele (catalogo.js);
   - painel: saem Pontos turísticos, Atendimento, Marketing, Cupons e
     brindes e Roteiros. O Extrato vira Contabilidade (contabilidade.js).
   As telas que saíram continuam no código (o app base usa); só não
   aparecem.
   ===================================================== */
'use strict';

const AV_GALERIA = ['fotos/g-1.jpg', 'fotos/g-2.jpg', 'fotos/g-3.jpg', 'fotos/g-4.jpg', 'fotos/g-5.jpg', 'fotos/g-6.jpg', 'fotos/g-7.jpg', 'fotos/g-9.jpg', 'fotos/g-10.jpg', 'fotos/g-11.jpg', 'fotos/g-8.jpg', 'fotos/g-12.jpg'];
const AV_DIPLOMAS = ['fotos/diploma-1.jpg', 'fotos/diploma-2.jpg', 'fotos/diploma-3.jpg', 'fotos/diploma-4.jpg'];
const avIg = () => String(DB.settings.insta || '').replace(/^@/, '');

/* ícones de linha (no lugar de emoji): traço 1.8, herdam a cor */
const AV_IC = {
  diploma: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/></svg>',
  mundo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/></svg>',
  idiomas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 7 8"/><path d="M11 5c-.5 3-3 6-7 8"/><path d="m13 21 4-9 4 9M14.5 18h5"/></svg>',
  casa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  relogio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  grupo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.6c2.3.3 4 2 4.5 4.9"/></svg>',
};

/* fotos do Aílton com os clientes: retrato INTEIRO (9:16, sem recorte) —
   nenhuma cabeça cortada. Tocar abre a foto grande. */
function avFotosRetrato(lista, cls = '') {
  return `<div class="avRetratos ${cls}">${lista.map((f, i) => `<a href="${esc(f)}" target="_blank" rel="noopener" aria-label="Abrir foto ${i + 1}"><img src="${esc(f)}" alt="O Aílton com clientes em Viena" loading="lazy" width="900" height="1600"></a>`).join('')}</div>`;
}

/* cartão grande de passeio (vitrine) */
function avCardPasseio(x) {
  const pk = (x.pacotes || [])[0];
  const extra = pk && pk.faixas[1] ? pk.faixas[1].v - pk.faixas[0].v : 0;
  return `<a class="avPas" href="#/tour/${esc(x.id)}">
    <span class="avPasFoto"><img src="${esc(x.photo)}" alt="" loading="lazy">${x.selo ? `<i class="avSelo">${esc(x.selo)}</i>` : ''}</span>
    <span class="avPasCorpo">
      <span class="avPasDur">${AV_IC.relogio}${esc(x.duration || '')}</span>
      <b class="avPasNome">${esc(tl(x.name))}</b>
      <span class="avPasTxt">${esc(tl(x.tagline))}</span>
      <span class="avPasRodape">
        <span class="avPasPreco"><b>${eur(x.price)}</b><small>por grupo até 5 pessoas${extra ? ` · + ${eur(extra)} por pessoa a mais` : ''}</small></span>
        <span class="avPasBtn">Ver e reservar <span aria-hidden="true">→</span></span>
      </span>
    </span></a>`;
}

function viewHub() {
  const st = DB.settings;
  const ig = avIg();
  const redes = [
    st.whats ? { u: waLink('Olá, Aílton! Vim pelo app.'), ic: ICONE_WA, n: 'WhatsApp', c: 'wa' } : null,
    ig ? { u: 'https://instagram.com/' + ig, ic: ICONE_IG, n: 'Instagram', c: 'ig' } : null,
    linkExterno(st.facebook) ? { u: linkExterno(st.facebook), ic: ICONE_FB, n: 'Facebook', c: 'fb' } : null,
    linkExterno(st.site) ? { u: linkExterno(st.site), ic: ICONE_SITE, n: 'Site', c: 'site' } : null,
  ].filter(Boolean);
  const passeios = Tours.all().filter(x => !x.oculto && x.region === 'viena' && x.status !== 'draft').sort((a, b) => (a.order || 99) - (b.order || 99));
  const fora = Tours.all().filter(x => !x.oculto && x.region === 'austria' && x.status !== 'draft');
  const deps = typeof depoimentos === 'function' ? depoimentos() : [];
  const dep = deps[0];
  const bt = (id, ic, tit, sub, cls = '') => `<button class="avBt ${cls}" id="${id}"><span class="avBtIc">${ic}</span><span class="avBtTx"><b>${tit}</b><small>${sub}</small></span><span class="avBtGo" aria-hidden="true">→</span></button>`;
  app.innerHTML = `
  <div class="avHub">
    <header class="avTopo">
      <img class="avTopoFoto" src="${esc(st.homePhoto || 'fotos/home-belvedere.jpg')}" alt="" fetchpriority="high">
      <div class="avTopoBarra">
        <nav class="avRedes" aria-label="Redes do Aílton">${redes.map(r =>
          `<a class="avRede ${r.c}" href="${esc(r.u)}" target="_blank" rel="noopener" aria-label="${r.n}" title="${r.n}">${r.ic}</a>`).join('')}</nav>
        ${langBar('right avLangs')}
      </div>
      <div class="avMarca">
        <h1 class="avLogo">${logoImg(150, 'escuro')}</h1>
        <p class="avLema">${esc(noIdioma(st.homeText) || t('tagline'))}</p>
        <ul class="avSelos" aria-label="Credenciais">
          <li>${AV_IC.diploma}Guia credenciado desde 2016</li>
          <li>${AV_IC.casa}Em Viena desde 1987</li>
          <li>${AV_IC.idiomas}5 idiomas</li>
        </ul>
      </div>
    </header>

    <div class="avCorpo">
      <nav class="avMenu" aria-label="Menu">
        ${bt('goTours', ICONE_MENU.passeios, 'Passeios e reservas', 'Escolha o passeio, a data e reserve', 'main')}
        <button class="avBt" id="goAbout"><span class="avBtIc avFace"><img id="hubFace" src="${esc(st.photo || 'fotos/ailton.jpg')}" alt=""></span><span class="avBtTx"><b>Quem sou eu</b><small>Brasileiro, guia credenciado em Viena e em toda a Áustria</small></span><span class="avBtGo" aria-hidden="true">→</span></button>
        ${bt('goAval', IC.estrela, 'Avaliações', deps.length ? `${deps.length} depoimentos de viajantes` : 'O que dizem os viajantes')}
        <a class="avBt wa" href="${waLink('Olá, Aílton! Vim pelo app e queria saber mais sobre os passeios em Viena.')}" target="_blank" rel="noopener"><span class="avBtIc">${ICONE_WA}</span><span class="avBtTx"><b>WhatsApp</b><small>+43 664 2108916</small></span><span class="avBtGo" aria-hidden="true">→</span></a>
      </nav>

      <section class="avSecao" aria-labelledby="avPasTit">
        <p class="avKicker">Passeios em Viena</p>
        <h2 id="avPasTit" class="avH2">Escolha seu passeio</h2>
        <p class="avSub">Todos em grupo fechado de até 5 pessoas, conduzidos em português.</p>
        <div class="avPasGrade">${passeios.map(avCardPasseio).join('')}</div>
      </section>

      ${fora.length ? `<section class="avSecao" aria-labelledby="avForaTit">
        <p class="avKicker">Sob consulta</p>
        <h2 id="avForaTit" class="avH2">Além de Viena</h2>
        <p class="avSub">O Aílton também guia em outras cidades da Áustria. Toque e peça o roteiro.</p>
        <div class="avFora">${fora.map(x => `<a class="avForaItem" href="#/tour/${esc(x.id)}"><img src="${esc(x.photo)}" alt="" loading="lazy"><span><b>${esc(tl(x.name))}</b><small>${esc(tl(x.tagline))}</small><em>Sob consulta</em></span></a>`).join('')}</div>
      </section>` : ''}

      ${dep ? `<section class="avDestaque" aria-label="Depoimento">
        <span class="avDestAspas" aria-hidden="true">“</span>
        <blockquote>${esc(dep.texto)}</blockquote>
        <p class="avDestNome"><b>${esc(dep.nome)}</b>${dep.quando ? ` · ${esc(dep.quando)}` : ''} · recomendação no Facebook</p>
        <button class="avDestBtn" id="goAval2">Ler as ${deps.length} avaliações <span aria-hidden="true">→</span></button>
      </section>` : ''}

      <section class="avSecao" aria-labelledby="avMomTit">
        <p class="avKicker">Fotos reais</p>
        <h2 id="avMomTit" class="avH2">Momentos com o Aílton</h2>
        ${avFotosRetrato(AV_GALERIA.slice(0, 4), 'quatro')}
        <button class="avLinkBtn" id="goAbout2">Conheça o Aílton <span aria-hidden="true">→</span></button>
      </section>

      ${typeof temNuvem === 'function' && !temNuvem()
        ? `<button class="adm-demo avPainel" id="admEntry"><span class="ic" aria-hidden="true">✦</span><span><b>Aílton, abra o seu painel</b><small>Reservas, agenda, clientes, contabilidade e o assistente</small></span><span class="go" aria-hidden="true">→</span></button>`
        : `<button class="adm-entry" id="admEntry">🔒 ${t('admEntry')}</button>`}
      <p class="avRodape">Ailton Guia Viena · Guia credenciado em português para Viena e toda a Áustria<br><small>Foto de abertura: Minsu B · Pexels</small></p>
    </div>
  </div>`;
  bindLang(app);
  $('#goTours').onclick = () => go('/tours');
  $('#goAbout').onclick = () => go('/about');
  $('#goAbout2').onclick = () => go('/about');
  $('#goAval').onclick = () => go('/avaliacoes');
  if ($('#goAval2')) $('#goAval2').onclick = () => go('/avaliacoes');
  $('#admEntry').onclick = () => go('/adm/today');
  fallbackPhoto($('#hubFace'), '☺');
}

function viewAbout() {
  const st = DB.settings;
  const paras = ((st.bio && tl(st.bio)) || '').split(/\n\s*\n/).filter(Boolean);
  const vant = [
    [AV_IC.diploma, 'Formação especializada', 'Graduado em Turismo e Hotelaria pela Escola Modul de Viena, com nota máxima nos exames de habilitação como guia em 2016.'],
    [AV_IC.mundo, 'Experiência internacional', 'Entre 2007 e 2012 conduziu visitas guiadas no Centro Internacional da ONU em Viena, recebendo delegações do mundo inteiro.'],
    [AV_IC.idiomas, 'Fluente em 5 idiomas', 'Atende em Português, Alemão, Espanhol, Inglês e Italiano — sua família viaja com toda a comodidade de comunicação.'],
    [AV_IC.casa, 'Residente local desde 1987', 'Mais de 35 anos morando em Viena. Conhece os atalhos, os melhores restaurantes e os segredos que nenhum roteiro impresso conta.'],
  ];
  app.innerHTML = `${topoCarol()}
  <main class="wrap about avSobre">
    <div class="avSobreTopo">
      <img class="avSobreFoto" src="${esc(st.photo || 'fotos/ailton.jpg')}" alt="${esc(guiaNome())}" width="800" height="800">
      <div>
        <p class="avKicker">Seu guia</p>
        <h1 class="avH1">Conheça o Aílton</h1>
        <p class="avSub">${esc(st.badge || '')}</p>
        <dl class="avFatos">
          <div><dt>Em Viena desde</dt><dd>1987</dd></div>
          <div><dt>Guia credenciado</dt><dd>desde 2016</dd></div>
          <div><dt>Idiomas</dt><dd>PT · DE · ES · EN · IT</dd></div>
        </dl>
      </div>
    </div>
    <div class="avTexto">${paras.map(p => `<p>${esc(p)}</p>`).join('')}</div>

    <h2 class="avH2">Por que escolher o Aílton?</h2>
    <div class="avVant">${vant.map(([ic, tit, tx]) => `<div><span class="avVantIc">${ic}</span><b>${tit}</b><p>${tx}</p></div>`).join('')}</div>

    <h2 class="avH2">Diplomas</h2>
    <div class="avDiplomas">${AV_DIPLOMAS.map((f, i) => `<a href="${f}" target="_blank" rel="noopener"><img src="${f}" alt="Diploma ${i + 1} do Aílton" loading="lazy"></a>`).join('')}</div>

    <h2 class="avH2">Momentos de quem já viajou com o Aílton</h2>
    ${avFotosRetrato(AV_GALERIA)}

    <div class="avCta">
      <h3>Vamos conhecer Viena juntos?</h3>
      <div class="avCtaBtns">
        <button class="cta" id="abTours">Ver os passeios</button>
        <a class="cta soft" href="${waLink('Olá, Aílton!')}" target="_blank" rel="noopener">Falar no WhatsApp</a>
      </div>
    </div>
  </main>`;
  ligaVoltar('/');
  $('#abTours').onclick = () => go('/tours');
}

/* página do passeio: as fotos do Aílton naquele passeio, inteiras, logo
   depois do programa (a foto de cima é do lugar, em alta resolução) */
const _viewTourAilton = viewTour;
viewTour = function (id) {
  _viewTourAilton(id);
  const x = Tours.get(id);
  const prog = document.querySelector('.tourbody .sec');
  if (x && x.fotosAilton && x.fotosAilton.length && prog && !document.querySelector('.avTourFotos'))
    prog.insertAdjacentHTML('afterend', `<div class="sec avTourFotos"><span class="seclabel">Com o Aílton neste passeio</span>${avFotosRetrato(x.fotosAilton, 'quatro')}</div>`);
};

/* Avaliações: os depoimentos reais (do site dele, Ajustes → Depoimentos) +
   as que o cliente deixa pelo QR do fim do passeio e ele aprova */
function viewAvaliacoes() {
  const ds = typeof depoimentos === 'function' ? depoimentos() : [];
  const fb = linkExterno(DB.settings.facebook);
  app.innerHTML = `${topoCarol()}
  <main class="wrap avaliacoes avAval">
    <h1 class="pageh">Avaliações</h1>
    <p class="avSub">O que dizem os viajantes que conheceram Viena e a Áustria com o Aílton${fb ? ' — recomendações deixadas no Facebook' : ''}.</p>
    ${ds.length ? `<div class="avAvLista">${ds.map(d => `<figure class="avDep"><span class="avAspas" aria-hidden="true">“</span><blockquote>${esc(d.texto)}</blockquote>
      <figcaption><b>${esc(d.nome || '')}</b>${d.quando ? ` · <span>${esc(d.quando)}</span>` : ''}</figcaption></figure>`).join('')}</div>`
      : '<p class="rtintro">As avaliações aparecem aqui assim que o Aílton aprova.</p>'}
    <div class="ab-btns avAvBtns">
      <button class="cta" id="avNova">Deixar a minha avaliação</button>
      ${fb ? `<a class="cta soft" href="${esc(fb)}" target="_blank" rel="noopener">Ver no Facebook ↗</a>` : ''}
    </div>
  </main>`;
  ligaVoltar('/');
  $('#avNova').onclick = () => go('/avaliar');
}

/* tabela de preço do passeio: a regra do site, em duas linhas claras */
function tabelaPacotes(x) {
  const f = x.pacotes[0].faixas, extra = f[1] ? f[1].v - f[0].v : 0, ult = f[f.length - 1];
  return `<div class="pacTab avPreco">
    <div class="avPrecoLinha"><span>Grupo fechado de até ${f[0].ate} pessoas</span><b>${eur(f[0].v)}</b></div>
    ${extra ? `<div class="avPrecoLinha"><span>Cada pessoa a mais</span><b>+ ${eur(extra)}</b></div>` : ''}
    <ul class="pacNotas">
      <li>${esc(x.duration || '')} · valor do grupo, não é por pessoa.</li>
      <li>Sinal de <b>${sinalPct()}%</b> para reservar; o restante no dia.</li>
      <li>Mais de ${ult.ate} pessoas? <a target="_blank" rel="noopener" href="${waLink('Olá, Aílton! Somos um grupo maior e queremos o ' + tl(x.name) + '.')}">fale com o Aílton</a>.</li>
    </ul>
  </div>`;
}

/* =====================================================
   PAINEL: tira as abas que o Aílton não usa
   ===================================================== */
(function menuAilton() {
  const fora = ['pontos', 'roteiros', 'inbox', 'atendimento', 'marketing', 'coupons'];
  for (const id of fora) {
    const i = ADM_TABS.findIndex(([x]) => x === id);
    if (i >= 0) ADM_TABS.splice(i, 1);
  }
  if (typeof NAV_GRUPOS !== 'undefined') {
    NAV_GRUPOS.forEach(g => { g[1] = g[1].filter(x => !fora.includes(x)); });
    for (let i = NAV_GRUPOS.length - 1; i >= 0; i--) if (!NAV_GRUPOS[i][1].length) NAV_GRUPOS.splice(i, 1);
  }
})();
/* quem chegar por link antigo numa aba que saiu cai no Hoje */
const _viewAdmAilton = viewAdm;
viewAdm = function (tab, arg) {
  if (['pontos', 'roteiros', 'inbox', 'atendimento', 'marketing', 'coupons'].includes(tab)) return _viewAdmAilton('today');
  return _viewAdmAilton(tab, arg);
};
/* rotas da vitrine que saíram: voltam para o início */
const _rotaExtraAilton = rotaExtra;
rotaExtra = function (p) {
  if (['consultoria', 'presente', 'ingressos', 'ebooks', 'roteiro', 'transfer'].includes(p[0])) { go('/'); return true; }
  return _rotaExtraAilton(p);
};
