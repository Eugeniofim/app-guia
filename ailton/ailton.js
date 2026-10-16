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

const AV_GALERIA = ['fotos/g-1.jpg', 'fotos/g-2.jpg', 'fotos/g-3.jpg', 'fotos/g-4.jpg', 'fotos/g-5.jpg', 'fotos/g-6.jpg', 'fotos/g-7.jpg', 'fotos/g-8.jpg'];
const AV_DIPLOMAS = ['fotos/diploma-1.jpg', 'fotos/diploma-2.jpg', 'fotos/diploma-3.jpg', 'fotos/diploma-4.jpg'];
const avIg = () => String(DB.settings.insta || '').replace(/^@/, '');

/* cartão grande de passeio (vitrine e lista) */
function avCardPasseio(x) {
  const pk = (x.pacotes || [])[0];
  const extra = pk && pk.faixas[1] ? pk.faixas[1].v - pk.faixas[0].v : 0;
  return `<a class="avPas" href="#/tour/${esc(x.id)}">
    <span class="avPasFoto" style="background-image:url(${esc(x.photo)})">${x.selo ? `<i class="avSelo">${esc(x.selo)}</i>` : ''}</span>
    <span class="avPasCorpo">
      <b class="avPasNome">${esc(tl(x.name))}</b>
      <span class="avPasDur">${esc(x.duration || '')}</span>
      <span class="avPasTxt">${esc(tl(x.tagline))}</span>
      <span class="avPasPreco"><b>${eur(x.price)}</b> por grupo até 5 pessoas${extra ? `<small>+ ${eur(extra)} por pessoa a mais</small>` : ''}</span>
      <span class="avPasBtn">Ver e reservar →</span>
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
  const nAval = (typeof depoimentos === 'function' ? depoimentos() : []).length;
  const bt = (id, ic, tit, sub, cls = '') => `<button class="avBt ${cls}" id="${id}"><span class="avBtIc">${ic}</span><span class="avBtTx"><b>${tit}</b><small>${sub}</small></span><span class="avBtGo" aria-hidden="true">→</span></button>`;
  app.innerHTML = `
  <div class="avHub">
    <header class="avTopo" style="background-image:url(${esc(st.homePhoto || 'fotos/home-belvedere.jpg')})">
      <div class="avTopoBarra">
        <nav class="avRedes" aria-label="Redes do Aílton">${redes.map(r =>
          `<a class="avRede ${r.c}" href="${esc(r.u)}" target="_blank" rel="noopener" aria-label="${r.n}" title="${r.n}">${r.ic}</a>`).join('')}</nav>
        ${langBar('right avLangs')}
      </div>
      <div class="avMarca">
        <div class="avLogo">${logoImg(150, 'escuro')}</div>
        <p class="avSelos"><span>Guia credenciado desde 2016</span><span>Em Viena desde 1987</span><span>5 idiomas</span></p>
        <p class="avLema">${esc(noIdioma(st.homeText) || t('tagline'))}</p>
      </div>
    </header>

    <div class="avCorpo">
      <nav class="avMenu" aria-label="Menu">
        ${bt('goTours', ICONE_MENU.passeios, 'Passeios e reservas', 'Escolha o passeio, a data e reserve', 'main')}
        <button class="avBt" id="goAbout"><span class="avBtIc avFace"><img id="hubFace" src="${esc(st.photo || 'fotos/ailton.jpg')}" alt=""></span><span class="avBtTx"><b>Quem sou eu</b><small>Brasileiro, guia credenciado em Viena e em toda a Áustria</small></span><span class="avBtGo" aria-hidden="true">→</span></button>
        ${bt('goAval', IC.estrela, 'Avaliações', nAval ? `${nAval} depoimentos de quem viajou com o Aílton` : 'O que dizem os viajantes')}
        <a class="avBt wa" href="${waLink('Olá, Aílton! Vim pelo app e queria saber mais sobre os passeios em Viena.')}" target="_blank" rel="noopener"><span class="avBtIc">${ICONE_WA}</span><span class="avBtTx"><b>Fale comigo no WhatsApp</b><small>+43 664 2108916</small></span><span class="avBtGo" aria-hidden="true">→</span></a>
      </nav>

      <section class="avPasseios" aria-labelledby="avPasTit">
        <h2 id="avPasTit" class="avH2">Escolha seu passeio</h2>
        <p class="avSub">Todos os passeios são em grupo fechado de até 5 pessoas, conduzidos em português.</p>
        <div class="avPasGrade">${passeios.map(avCardPasseio).join('')}</div>
        ${fora.length ? `<a class="avFora" href="#/tours"><span><b>Além de Viena</b><small>${fora.map(x => esc(tl(x.name))).join(' · ')} — sob consulta</small></span><span class="avBtGo" aria-hidden="true">→</span></a>` : ''}
      </section>

      ${typeof temNuvem === 'function' && !temNuvem()
        ? `<button class="adm-demo avPainel" id="admEntry"><span class="ic" aria-hidden="true">✦</span><span><b>Aílton, abra o seu painel</b><small>Reservas, agenda, clientes, contabilidade e o assistente</small></span><span class="go" aria-hidden="true">→</span></button>`
        : `<button class="adm-entry" id="admEntry">🔒 ${t('admEntry')}</button>`}
      <p class="avRodape">Ailton Guia Viena · Guia credenciado em português para Viena e toda a Áustria</p>
    </div>
  </div>`;
  bindLang(app);
  $('#goTours').onclick = () => go('/tours');
  $('#goAbout').onclick = () => go('/about');
  $('#goAval').onclick = () => go('/avaliacoes');
  $('#admEntry').onclick = () => go('/adm/today');
  fallbackPhoto($('#hubFace'), '☺');
}

function viewAbout() {
  const st = DB.settings;
  const paras = ((st.bio && tl(st.bio)) || '').split(/\n\s*\n/).filter(Boolean);
  app.innerHTML = `${topoCarol()}
  <main class="wrap about avSobre">
    <div class="avSobreTopo">
      <img class="avSobreFoto" src="${esc(st.photo || 'fotos/ailton.jpg')}" alt="${esc(guiaNome())}">
      <div>
        <p class="avKicker">Seu guia</p>
        <h1 class="pageh">Conheça o Aílton</h1>
        <p class="abSub">${esc(st.badge || '')}</p>
        <div class="ab-facts">
          <div><small>Em Viena desde</small><b>1987</b></div>
          <div><small>Guia credenciado</small><b>desde 2016</b></div>
          <div><small>Idiomas</small><b>PT · DE · ES · EN · IT</b></div>
        </div>
      </div>
    </div>
    <div class="ab-body">${paras.map(p => `<p>${esc(p)}</p>`).join('')}</div>

    <h2 class="avH2">Por que escolher o Aílton?</h2>
    <div class="avVant">
      <div><span aria-hidden="true">🎓</span><b>Formação especializada</b><p>Graduado em Turismo e Hotelaria pela Escola Modul de Viena, com nota máxima nos exames de habilitação como guia em 2016.</p></div>
      <div><span aria-hidden="true">🌍</span><b>Experiência internacional</b><p>Entre 2007 e 2012 conduziu visitas guiadas no Centro Internacional da ONU em Viena, recebendo delegações do mundo inteiro.</p></div>
      <div><span aria-hidden="true">🗣️</span><b>Fluente em 5 idiomas</b><p>Atende em Português, Alemão, Espanhol, Inglês e Italiano — sua família viaja com toda a comodidade de comunicação.</p></div>
      <div><span aria-hidden="true">📍</span><b>Residente local desde 1987</b><p>Mais de 35 anos morando em Viena. Conhece os atalhos, os melhores restaurantes e os segredos que nenhum roteiro impresso conta.</p></div>
    </div>

    <h2 class="avH2">Diplomas</h2>
    <div class="avDiplomas">${AV_DIPLOMAS.map((f, i) => `<a href="${f}" target="_blank" rel="noopener"><img src="${f}" alt="Diploma ${i + 1} do Aílton" loading="lazy"></a>`).join('')}</div>

    <h2 class="avH2">Momentos de quem já viajou com o Aílton</h2>
    <div class="avGaleria">${AV_GALERIA.map(f => `<img src="${f}" alt="" loading="lazy">`).join('')}</div>

    <div class="ab-cta">
      <h3>Vamos conhecer Viena juntos?</h3>
      <div class="ab-btns">
        <button class="cta" id="abTours">Ver os passeios</button>
        <a class="cta soft" href="${waLink('Olá, Aílton!')}" target="_blank" rel="noopener">WhatsApp</a>
        ${avIg() ? `<a class="mini" href="https://instagram.com/${esc(avIg())}" target="_blank" rel="noopener">@${esc(avIg())}</a>` : ''}
      </div>
    </div>
  </main>`;
  ligaVoltar('/');
  $('#abTours').onclick = () => go('/tours');
}

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
