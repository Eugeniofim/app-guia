/* =====================================================
   eBOOKS / GUIAS DE LONDRES — demo "Londres com a Bia" (07/10/2026)

   Produto de "low ticket" do guia: guias curtos, bonitos e com fotos. Dois
   guias de EXEMPLO, escritos para esta demonstração. Cada um abre num leitor
   na marca do app, com capa, capítulos e fotos, e um botão "Salvar em PDF /
   imprimir" (o mesmo caminho do voucher — sem servidor, sem biblioteca).

   Como entra no negócio: são o brinde de quem fecha um tour E podem ser
   vendidos avulsos. A venda avulsa pluga depois no checkout.

   As fotos são as que já existem no app (Wikimedia Commons), com crédito.
   ===================================================== */
'use strict';

const EBOOKS = [
  {
    id: 'londres-em-3-dias',
    titulo: 'Londres em 3 dias',
    sub: 'O roteiro que eu faria com um amigo que chega pela primeira vez',
    capa: 'fotos/p-big-ben.jpg',
    cor: '#064c3f',
    resumo: 'Três dias bem divididos, sem correria: chegada e transporte, Westminster, City e South Bank, bairros e museus — e as dicas de dinheiro, chip e clima que ninguém conta antes.',
    caps: [
      { h: 'Chegada e transporte', ph: 'fotos/p-transport-museum.jpg', t: 'Londres tem seis aeroportos; os brasileiros chegam quase sempre por **Heathrow**. De lá, o metrô (linha Piccadilly) leva ao centro em cerca de uma hora e é o caminho mais barato.\n\nNão compre bilhete avulso: encoste o **cartão de crédito por aproximação** na catraca ao entrar e ao sair. O sistema calcula o melhor preço do dia sozinho. Baixe o **Citymapper** antes de embarcar — ele resolve qualquer trajeto, inclusive de ônibus.\n\nDica da Bia: o segundo andar do ônibus vermelho é o passeio mais barato da cidade. Sente na frente.' },
      { h: 'Dia 1 · Westminster', ph: 'fotos/p-buckingham.jpg', t: 'Comece cedo na estação **Westminster**: a saída dá de frente para o Big Ben. Siga pela Parliament Square, veja a **Abadia** por fora e desça a Whitehall até a **Downing Street**.\n\nAtravesse o **St James\'s Park** até o **Palácio de Buckingham** — nos dias de Troca da Guarda, chegue 45 minutos antes das 11h. Termine na **Trafalgar Square** e entre na National Gallery, que é gratuita.\n\nÀ noite, o **London Eye** iluminado visto da ponte de Westminster é a foto clássica, sem pagar nada.' },
      { h: 'Dia 2 · City e South Bank', ph: 'fotos/p-tower-bridge.jpg', t: 'Comece na **Catedral de St Paul\'s** e atravesse a **Millennium Bridge** para a margem sul. Dali, caminhe pelo rio: Tate Modern (grátis), Shakespeare\'s Globe e o **Borough Market** para almoçar.\n\nDepois do almoço, cruze a London Bridge de volta para a City e suba ao **Sky Garden** (grátis, com reserva) ou ao Horizon 22. Termine na **Tower Bridge** ao pôr do sol, com a Torre de Londres ao lado.\n\nDica da Bia: a Torre de Londres merece meio dia por dentro; se não der, veja por fora e volte em outra viagem.' },
      { h: 'Dia 3 · Bairros e museus', ph: 'fotos/p-notting-hill.jpg', t: 'De manhã, **Notting Hill** e a Portobello Road (sábado é dia de feira, mas lota). Depois, escolha um museu — todos gratuitos: o **Museu Britânico**, o de História Natural ou o V&A.\n\nÀ tarde, **Camden** para o mercado e o canal; ou **Covent Garden** para artistas de rua e compras. Jantar num pub com Sunday Roast se for domingo.\n\nSe sobrar energia, a vista da **Primrose Hill** ao entardecer fecha a viagem.' },
      { h: 'Dinheiro, chip e clima', ph: 'fotos/p-royal-exchange.jpg', t: '**Dinheiro:** libra esterlina (£). Quase tudo é no cartão por aproximação; dá para passar a viagem inteira sem dinheiro vivo. Gorjeta de 10 a 12,5% em restaurante, muitas vezes já incluída no "service charge".\n\n**Chip:** um eSIM comprado antes de embarcar já funciona ao pousar. Wi-Fi é farto em cafés e museus.\n\n**Clima:** pode fazer sol e chover no mesmo dia. Casaco leve impermeável o ano todo, camadas no inverno e **sapato confortável** sempre — você vai andar mais do que imagina.\n\n**Tomada:** padrão britânico de três pinos (tipo G). Leve adaptador.' },
    ],
  },
  {
    id: 'londres-de-graca',
    titulo: 'Londres de graça',
    sub: 'As melhores experiências da cidade que não custam nada',
    capa: 'fotos/p-hyde-park.jpg',
    cor: '#7e6308',
    resumo: 'Museus de classe mundial, vistas do alto, parques reais e mercados — tudo gratuito. Londres cara? Nem sempre.',
    caps: [
      { h: 'Museus gratuitos', ph: 'fotos/p-british-museum.jpg', t: 'Os grandes museus de Londres têm **entrada gratuita** (a doação é bem-vinda):\n\n• **Museu Britânico** — a Pedra de Roseta, as múmias, as esculturas do Partenon.\n• **National Gallery** — Van Gogh, Monet, Leonardo.\n• **Tate Modern** — arte moderna numa antiga usina, à beira do rio.\n• **Museu de História Natural** — o esqueleto da baleia azul e os dinossauros.\n• **V&A** — moda, design e artes decorativas.\n\nChegue na abertura ou no fim da tarde e escolha duas ou três salas em vez de tentar ver tudo.' },
      { h: 'Parques', ph: 'fotos/p-st-james-park.jpg', t: 'Londres é uma das capitais mais verdes do mundo, e os parques reais são todos gratuitos:\n\n• **St James\'s Park** — o mais bonito do centro, entre Buckingham e a Horse Guards; tem pelicanos desde 1664.\n• **Hyde Park** e **Kensington Gardens** — imensos, com o lago Serpentine e o palácio.\n• **Primrose Hill** — a vista mais fotografada da cidade, de graça, ao entardecer.\n• **Greenwich Park** — o meridiano e o Tâmisa lá embaixo.\n\nLeve um café, sente na grama e observe os esquilos. É o descanso perfeito entre um ponto e outro.' },
      { h: 'Mercados', ph: 'fotos/p-camden.jpg', t: 'Entrar não custa nada, e é um programa e tanto:\n\n• **Borough Market** — o mais famoso: queijos, pães, ostras e comida do mundo inteiro. Vá com fome.\n• **Camden Market** — alternativo, dezenas de barraquinhas e o canal do lado.\n• **Portobello Road** (Notting Hill) — antiguidades e as casinhas coloridas, melhor aos sábados.\n• **Leadenhall Market** — coberto, vitoriano, e cenário do Beco Diagonal.\n\nDica da Bia: almoçar num mercado é o melhor custo-benefício de Londres.' },
      { h: 'Mirantes', ph: 'fotos/p-sky-garden.jpg', t: 'Esqueça as vistas pagas por um momento:\n\n• **Sky Garden** — o jardim no topo do "Walkie-Talkie". Grátis, mas **reserve online** com antecedência.\n• **Horizon 22** — o mirante mais alto da Europa, também gratuito com reserva.\n• **Tate Modern** — o terraço com vista para a St Paul\'s e o rio.\n• **Primrose Hill** e **Greenwich Park** — a cidade inteira aos seus pés.\n\nLeve a câmera no fim da tarde: a luz dourada sobre o Tâmisa é inesquecível.' },
    ],
  },
];

const ebook = (id) => EBOOKS.find(e => e.id === id);

/* ---------- liberação (prévia × completo) ----------
   Na vitrine o cliente vê ~20% de cada guia. O resto é liberado quando ele
   fecha um tour com a guia: ela entrega o código do voucher, e com ele o
   cliente desbloqueia TODOS os guias neste aparelho. */
const EB_OK = (typeof DB_KEY !== 'undefined' ? String(DB_KEY).replace(/_db_v\d+$/, '') : 'londres') + '_ebooks_ok';
function ebLiberado() { try { return localStorage.getItem(EB_OK) === '1'; } catch (e) { return false; } }
function ebLibera() { try { localStorage.setItem(EB_OK, '1'); } catch (e) {} }
/* quantos capítulos entram na prévia (~20%, no mínimo 1) */
const ebPreviaN = (e) => Math.max(1, Math.round(e.caps.length * 0.2));
/* o código do voucher/reserva vale como chave de desbloqueio */
function ebCodigoVale(codigo) {
  const c = String(codigo || '').trim().toUpperCase();
  if (!c) return false;
  const naReserva = (DB.bookings || []).some(b => String(b.code || '').toUpperCase() === c && b.status !== 'cancelled');
  const noVale = (DB.giftcards || []).some(g => String(g.codigo || '').toUpperCase() === c && g.pago);
  return naReserva || noVale;
}

/* ---------- o menu ---------- */
function viewEbooks() {
  app.innerHTML = `${topoCarol()}
  <main class="wrap ebMenu">
    <h1 class="pageh">Guias de Londres</h1>
    <p class="rtintro">Guias feitos pela Bia para a sua viagem — curtos, bonitos e cheios de dicas de quem vive em Londres. Leia na tela ou salve em PDF para levar no bolso.</p>
    <div class="ebGrade">
      ${EBOOKS.map(e => `<a class="ebCard" href="#/ebook/${e.id}" style="--eb:${e.cor}">
        <span class="ebCapa" style="background-image:url(${esc(e.capa)})"><em>eBook</em></span>
        <span class="ebTx"><b>${esc(e.titulo)}</b><small>${esc(e.sub)}</small>
          <span class="ebMeta">${ebLiberado() ? e.caps.length + ' capítulos · liberado ✓' : 'prévia · completo com um tour'}</span></span>
      </a>`).join('')}
    </div>
    <p class="ebNota">${ebLiberado() ? '🎉 Seus guias estão liberados — leia e salve em PDF quantos quiser.' : '🔒 Dê uma espiada à vontade. Os guias <b>completos</b> são um presente da Bia para quem fecha um tour com ela.'}</p>
  </main>`;
  ligaVoltar('/');
}

/* ---------- o leitor ---------- */
function viewEbook(id) {
  const e = ebook(id);
  if (!e) { app.innerHTML = `${topoCarol()}<main class="wrap narrow"><p class="empty">Guia não encontrado.</p></main>`; ligaVoltar('/ebooks'); return; }
  const cred = (ph) => { const p = (typeof PONTOS !== 'undefined') && PONTOS.find(x => x.ph === ph); return p && p.cr ? p.cr : ''; };
  app.innerHTML = `${topoCarol()}
  <main class="wrap ebRead" style="--eb:${e.cor}">
    <div class="ebAcoes noprint">${ebLiberado() ? '<button class="cta sm" id="ebPdf">🖨 Salvar em PDF / imprimir</button>' : ''}
      <a class="mini" href="#/ebooks">← Todos os guias</a></div>
    <article class="ebDoc" id="ebDoc">
      <header class="ebCab" style="background-image:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.72)),url(${esc(e.capa)})">
        <div class="ebSelo">${typeof logoImg === 'function' ? logoImg(44, 'escuro') : 'Londres com a Bia'}</div>
        <div class="ebCabTx"><small>Guia de Londres</small><h1>${esc(e.titulo)}</h1><p>${esc(e.sub)}</p></div>
      </header>
      <p class="ebIntro">${esc(e.resumo)}</p>
      ${(ebLiberado() ? e.caps : e.caps.slice(0, ebPreviaN(e))).map((c, i) => `<section class="ebCap">
        <h2><span class="ebNum">${i + 1}</span>${esc(c.h)}</h2>
        ${c.ph ? `<figure class="ebFoto"><img src="${esc(c.ph)}" alt="" loading="lazy">${cred(c.ph) ? `<figcaption>${esc(cred(c.ph))}</figcaption>` : ''}</figure>` : ''}
        <div class="ebTexto">${ebHtml(c.t)}</div>
      </section>`).join('')}
      ${ebLiberado() ? '' : `<section class="ebLock noprint">
        <span class="ebLockIc">🔒</span>
        <h3>Continue este guia com a Bia</h3>
        <p>Você viu uma prévia. O guia <b>completo</b> (mais ${esc(String(e.caps.length - ebPreviaN(e)))} capítulos) é um presente de quem fecha um tour com a Bia.</p>
        <a class="cta sm" href="#/tours">Ver os passeios da Bia</a>
        <details class="ebCod"><summary>Já fechei um tour — tenho o código</summary>
          <div class="ebCodIn"><input id="ebCodTxt" placeholder="código do seu voucher (ex.: LB-3147)" autocomplete="off">
          <button class="mini" id="ebCodOk">Liberar</button></div><p class="ebCodMsg" id="ebCodMsg"></p></details>
      </section>`}
      <footer class="ebFim">
        <p class="ebAss">Feito com carinho pela <b>Bia</b> — guia brasileira em Londres.</p>
        <p class="ebCta noprint">Quer conhecer Londres comigo de verdade? <a href="#/tours">Veja os passeios →</a></p>
        <p class="ebFine">Londres com a Bia · guia de exemplo · demonstração do Studio Ti Artes</p>
      </footer>
    </article>
  </main>`;
  ligaVoltar('/ebooks');
  const b = document.getElementById('ebPdf');
  if (b) b.onclick = () => { document.body.classList.add('imprimeEbook'); window.print(); setTimeout(() => document.body.classList.remove('imprimeEbook'), 600); };
  const ok = document.getElementById('ebCodOk');
  if (ok) ok.onclick = () => {
    const txt = document.getElementById('ebCodTxt').value, msg = document.getElementById('ebCodMsg');
    if (ebCodigoVale(txt)) { ebLibera(); if (typeof toast === 'function') toast('Guias liberados ✓'); viewEbook(id); }
    else { msg.textContent = 'Código não encontrado. Confira no seu voucher, ou fale com a Bia.'; }
  };
}
/* **negrito** e quebras de linha simples */
function ebHtml(t) {
  return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n{2,}/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
}

/* ---------- ligar: rotas + menu no hub ---------- */
const _rotaExtraEbooks = rotaExtra;
rotaExtra = function (p) {
  if (p[0] === 'ebooks') { viewEbooks(); return true; }
  if (p[0] === 'ebook') { viewEbook(decodeURIComponent(p[1] || '')); return true; }
  /* link de presente da guia: libera TODOS os guias neste aparelho e abre o escolhido */
  if (p[0] === 'g') { ebLibera(); viewEbook(decodeURIComponent(p[1] || (EBOOKS[0] && EBOOKS[0].id))); return true; }
  return _rotaExtraEbooks(p);
};
/* a lista dos guias + o link de presente (usado pelo painel) */
function ebooksLista() { return EBOOKS.map(e => ({ id: e.id, titulo: e.titulo, sub: e.sub })); }
function ebookLinkPresente(id) { return (typeof linkApp === 'function' ? linkApp('g/' + id) : location.origin + location.pathname + '#/g/' + id); }
