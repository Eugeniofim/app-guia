/* =====================================================
   eBOOKS / GUIAS DE LONDRES (05/10/2026)

   Produto de "low ticket" da Carol: guias de Londres bonitos, detalhados e
   com fotos. Três guias prontos. Cada um abre num leitor na marca dela, com
   capa, capítulos e fotos, e um botão "Salvar em PDF / imprimir" (o mesmo
   caminho do voucher — sem servidor, sem biblioteca).

   Como entra no negócio (item 6 da reunião): são o brinde de quem fecha um
   tour E podem ser vendidos avulsos. Por ora ficam legíveis como cortesia;
   a venda avulsa pluga depois no checkout (quando o Stripe estiver ligado).

   As fotos são as que já existem no app (123 POIs + capas), com crédito.
   ===================================================== */
'use strict';

const EBOOKS = [
  {
    id: 'londres-do-zero',
    titulo: 'Londres do Zero',
    sub: 'Da chegada à partida: tudo que você precisa saber antes de embarcar',
    capa: 'fotos/p-big-ben.jpg',
    cor: '#700420',
    resumo: 'O guia completo da primeira viagem: aeroportos, transporte, clima, dinheiro, etiqueta e os perrengues que dá para evitar.',
    caps: [
      { h: 'Do aeroporto ao centro', ph: 'fotos/p-london-eye.jpg', t: 'Londres tem seis aeroportos. Os mais comuns:\n\n• **Heathrow (LHR)** — o maior. Do centro, o jeito mais barato é o metrô (linha Piccadilly, ~1h, £5–6). Rápido: Heathrow Express até Paddington (15 min, caro). Táxi/Uber: 45–70 min.\n• **Gatwick (LGW)** — ao sul. Gatwick Express ou trens Thameslink até Victoria/London Bridge (30–45 min).\n• **Stansted / Luton** — low-cost. Ônibus (National Express) ou trem; conte 1h–1h30.\n\nDica da Carol: baixe o mapa do metrô offline e já saia do aeroporto com o cartão de transporte resolvido (próximo capítulo).' },
      { h: 'Transporte: Oyster, contactless e o tube', ph: 'fotos/p-transport-museum.jpg', t: 'Em Londres você **não precisa comprar bilhete avulso** (sai caro). Use:\n\n• **Cartão de crédito/débito por aproximação (contactless)** — encosta na catraca na entrada E na saída. O sistema calcula o melhor preço do dia sozinho (daily cap).\n• **Oyster card** — se preferir um cartão recarregável.\n\nO **tube** (metrô) é a espinha dorsal. Ônibus vermelhos são ótimos e baratos (e o 2º andar é passeio de graça). Apps: **Citymapper** e **Google Maps** resolvem qualquer trajeto. Evite o rush (8–9h30 e 17h30–19h).' },
      { h: 'Clima e o que levar', ph: 'fotos/p-st-james-park.jpg', t: 'Londres é mais amena do que parece, mas **imprevisível**: pode fazer sol e chover no mesmo dia.\n\n• **Guarda-chuva pequeno** e um casaco impermeável leve o ano todo.\n• **Sapato confortável** — você vai andar MUITO.\n• **Primavera/Verão (abr–ago):** 12–25°C, dias longos (claro até 21h).\n• **Outono/Inverno (set–mar):** 2–12°C, escurece cedo (16h no inverno). Casaco quente, gorro, camadas.\n\nEm qualquer época: vista-se em camadas. A regra é tirar e pôr roupa ao longo do dia.' },
      { h: 'Dinheiro, gorjeta e internet', ph: 'fotos/p-royal-exchange.jpg', t: '• **Moeda:** libra esterlina (£). Quase tudo é no cartão por aproximação — dá para passar a viagem sem dinheiro vivo.\n• **Gorjeta:** 10–12,5% em restaurantes (muitas vezes já vem no "service charge" — confira antes de pagar de novo). Em pub, bar e táxi não é obrigatório.\n• **Tomada:** padrão britânico de 3 pinos (Type G). Leve um adaptador.\n• **Internet:** um **eSIM** (chip virtual) resolve antes de embarcar; ou Wi-Fi em cafés, museus e no metrô.' },
      { h: 'Etiqueta britânica (e o que NÃO fazer)', ph: 'fotos/p-covent-garden.jpg', t: 'Pequenos hábitos que fazem diferença:\n\n• Na **escada rolante**, fique à **direita** — a esquerda é para quem está com pressa.\n• **Fila** (queue) é sagrada: nunca "fure".\n• "Sorry", "please" e "thank you" o tempo todo — é cultural.\n• No metrô, **deixe sair antes de entrar** e tire a mochila das costas.\n• Fale baixo no transporte.\n\nNada disso é frescura: respeitar essas regrinhas te faz passar despercebido como um local.' },
      { h: 'Bairros para conhecer', ph: 'fotos/p-notting-hill.jpg', t: 'Londres é uma colcha de bairros com personalidade:\n\n• **Westminster / South Bank** — o cartão-postal: Big Ben, Abadia, London Eye.\n• **The City** — o coração financeiro e histórico, com a St. Paul\'s.\n• **Notting Hill** — casinhas coloridas e o mercado de Portobello.\n• **Camden** — alternativo, música e street food.\n• **Soho / Covent Garden** — teatros, restaurantes e vida noturna.\n• **Greenwich** — o meridiano, o parque e a vista do Tâmisa.\n\nReserve um tempo para só caminhar e se perder — é assim que Londres encanta.' },
      { h: 'Segurança e saúde', ph: 'fotos/p-tower-bridge.jpg', t: 'Londres é segura, com bom senso de cidade grande:\n\n• Cuidado com o **celular** em lugares cheios e no transporte (pickpockets).\n• Emergência: **999** (polícia, ambulância, bombeiros) ou **112**.\n• Farmácia: procure **Boots** ou **Superdrug**.\n• **Seguro viagem** é altamente recomendado — a saúde pública (NHS) pode cobrar turistas.\n\nGuarde uma cópia do passaporte no celular e o endereço do hotel por escrito.' },
    ],
  },
  {
    id: 'londres-de-graca',
    titulo: 'Londres de Graça',
    sub: 'As melhores experiências da cidade que não custam nada',
    capa: 'fotos/p-hyde-park.jpg',
    cor: '#955425',
    resumo: 'Museus de classe mundial, vistas de tirar o fôlego, parques reais e mercados — tudo de graça. Londres cara? Nem sempre.',
    caps: [
      { h: 'Museus de graça (sim, os grandes)', ph: 'fotos/p-british-museum.jpg', t: 'Os principais museus de Londres têm **entrada gratuita** (doação é bem-vinda):\n\n• **British Museum** — a Pedra de Roseta, as múmias, os mármores do Partenon.\n• **National Gallery** — Van Gogh, Monet, Da Vinci.\n• **Tate Modern** — arte moderna numa antiga usina, à beira do Tâmisa.\n• **Natural History Museum** — o esqueleto da baleia e os dinossauros.\n• **V&A (Victoria & Albert)** — moda, design e artes decorativas.\n\nChegue cedo ou no fim da tarde para fugir das filas, e escolha 2–3 salas em vez de tentar ver tudo.' },
      { h: 'Vistas incríveis sem pagar', ph: 'fotos/p-millennium-bridge.jpg', t: 'Esqueça as vistas pagas por um momento:\n\n• **Sky Garden** — o "jardim no céu" no topo do Walkie-Talkie. Grátis, mas **reserve online** com antecedência.\n• **Tate Modern, 6º andar** — terraço com vista para a St. Paul\'s e o rio (dica da Carol no tour!).\n• **One New Change** — rooftop de frente para a cúpula da St. Paul\'s.\n• **Primrose Hill** e **Greenwich Park** — a cidade inteira aos seus pés, de graça.\n\nLeve a câmera no fim da tarde: a luz dourada sobre o Tâmisa é inesquecível.' },
      { h: 'Parques reais', ph: 'fotos/p-st-james-park.jpg', t: 'Londres é uma das capitais mais verdes do mundo:\n\n• **Hyde Park** e **Kensington Gardens** — imensos, com lago e o palácio.\n• **St. James\'s Park** — o mais bonito, entre o Palácio de Buckingham e a cavalaria; tem pelicanos!\n• **Regent\'s Park** — jardins de rosas e o zoológico ao lado.\n• **Greenwich Park** — o meridiano e a vista clássica.\n\nLeve um café, sente na grama e observe os esquilos. É o descanso perfeito entre um ponto e outro.' },
      { h: 'A Troca da Guarda', ph: 'fotos/p-buckingham.jpg', t: 'O espetáculo mais famoso de Londres é **gratuito**. A **Troca da Guarda (Changing of the Guard)** acontece em frente ao Palácio de Buckingham.\n\n• Dura cerca de 45 minutos, com banda e os soldados de casaco vermelho e barretina de pele de urso.\n• Em geral às **11h**, mas o calendário muda — confira no site oficial no dia.\n• Chegue **com 45 min a 1h de antecedência** para pegar lugar na grade, ou assista de pontos alternativos (o Mall, o monumento à Rainha Vitória).\n\nDica: dá para ver a guarda também em Horse Guards, com menos gente.' },
      { h: 'Mercados para passear', ph: 'fotos/p-camden.jpg', t: 'Entrar não custa nada — e é um programa e tanto:\n\n• **Borough Market** — o templo gastronômico (prove os quitutes de graça nas degustações).\n• **Camden Market** — alternativo, com comida do mundo inteiro.\n• **Portobello Road** (Notting Hill) — antiguidades e as casinhas coloridas, melhor aos sábados.\n• **Greenwich Market** — artesanato e street food, mais tranquilo.\n\nVá com fome e disposição para caminhar; são labirintos cheios de descobertas.' },
      { h: 'Caminhadas que valem ouro', ph: 'fotos/p-london-bridge.jpg', t: 'A melhor forma (e a mais barata) de sentir Londres é a pé:\n\n• **South Bank** — do London Eye à Tower Bridge, margeando o rio, com artistas de rua.\n• **A travessia da Millennium Bridge** até a St. Paul\'s — a cena de Harry Potter.\n• **Do Soho a Covent Garden** — teatros, becos e cafés.\n\nLondres se revela nas esquinas. Reserve pelo menos uma tarde só para andar sem pressa — de preferência, com alguém que conhece as histórias. 😉' },
    ],
  },
  {
    id: 'sabores-de-londres',
    titulo: 'Sabores de Londres',
    sub: 'Pubs, mercados, o chá da tarde e os pratos que você precisa provar',
    capa: 'fotos/p-borough-market.jpg',
    cor: '#5A0318',
    resumo: 'Londres virou uma das capitais gastronômicas do mundo. Um guia afetivo do que comer, onde, e como se portar no pub.',
    caps: [
      { h: 'O chá da tarde (afternoon tea)', ph: 'fotos/p-hatchards.jpg', t: 'O ritual mais britânico de todos: por volta das **15h–17h**, chá servido com um andar de **sanduíches**, outro de **scones** (com clotted cream e geleia) e um de **doces**.\n\n• Dos clássicos (hotéis históricos) aos descolados — há para todos os bolsos.\n• A eterna discussão: **creme ou geleia primeiro** no scone? Em Devon, creme; na Cornualha, geleia. Escolha um lado. 😄\n• Reserve com antecedência nos lugares famosos.\n\nÉ experiência, não só refeição — vista-se um pouco melhor e aproveite sem pressa.' },
      { h: 'O pub: coração da vida social', ph: 'fotos/p-notting-hill.jpg', t: 'O **pub** (public house) é a sala de estar dos britânicos. Como funciona:\n\n• **Peça e pague no balcão** (não espere o garçom), e leve você mesmo à mesa.\n• Para a comida, muitas vezes anote o número da mesa ao pedir.\n• Peça uma **pint** (568 ml) ou **half** de cerveja; a **ale** é a tradicional, servida menos gelada.\n• Gorjeta não é esperada no balcão.\n\nNo almoço de domingo, não deixe de provar o **Sunday Roast** — carne assada, batata, Yorkshire pudding e molho. Uma instituição.' },
      { h: 'Pratos típicos para provar', ph: 'fotos/p-tower-of-london.jpg', t: 'Além da fama injusta, a comida britânica tem joias:\n\n• **Fish & chips** — peixe empanado com fritas; esprema limão e ouse o molho tártaro.\n• **Pie** — tortas salgadas (steak & ale, chicken & mushroom), reconfortantes.\n• **Full English breakfast** — ovos, bacon, salsicha, feijão, cogumelo, torrada. Segura o dia.\n• **Bangers and mash** — salsicha com purê.\n• **Sticky toffee pudding** — a sobremesa que conquista todo mundo.' },
      { h: 'Mercados gastronômicos', ph: 'fotos/p-borough-market.jpg', t: 'Para comer bem, barato e com alma, vá aos mercados:\n\n• **Borough Market** — o mais famoso: queijos, pães, ostras, street food do mundo todo. Vá com fome.\n• **Camden Market** — dezenas de barraquinhas; perfeito para experimentar vários pratos.\n• **Maltby Street** e **Mercato Mayfair** — alternativas charmosas e menos lotadas.\n\nDica da Carol: almoçar num mercado é o melhor custo-benefício de Londres — e rende as melhores fotos.' },
      { h: 'Cafés, docerias e o "coffee culture"', ph: 'fotos/p-covent-garden.jpg', t: 'Londres vive um ótimo momento de cafés:\n\n• **Flat white** é quase uma religião local — peça um e sente para ver a cidade passar.\n• Docerias de bairro, padarias artesanais (cuidado com os **cruffins** e **cinnamon buns**).\n• A rede **Pret a Manger** salva um almoço rápido e honesto.\n\nReserve uma pausa de café no meio do passeio: faz parte do ritmo da cidade e recarrega as energias para a próxima caminhada.' },
      { h: 'Comer bem gastando pouco', ph: 'fotos/p-greenwich-market.jpg', t: 'Londres pode ser acessível à mesa:\n\n• **Meal deal** (supermercados como Tesco, Sainsbury\'s): sanduíche + snack + bebida por poucas libras — perfeito para um piquenique no parque.\n• **Mercados** no almoço (capítulo anterior).\n• **Pubs** no almoço costumam ter pratos mais em conta.\n• Muitos restaurantes têm **pre-theatre menu** (mais barato antes das 19h).\n\nComer é parte da viagem — e em Londres dá para fazer isso muito bem sem estourar o orçamento.' },
    ],
  },
];

const ebook = (id) => EBOOKS.find(e => e.id === id);

/* ---------- liberação (prévia × completo) ----------
   Na vitrine o cliente vê ~20% de cada guia. O resto é liberado quando ele
   fecha um tour com a Carol: ela entrega o código do voucher, e com ele o
   cliente desbloqueia TODOS os guias neste aparelho. */
const EB_OK = (typeof DB_KEY !== 'undefined' ? String(DB_KEY).replace(/_db_v\d+$/, '') : 'lovely') + '_ebooks_ok';
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
    <p class="rtintro">Guias feitos pela Carol para a sua viagem — bonitos, detalhados e cheios de dicas de quem vive em Londres. Leia na tela ou salve em PDF para levar no bolso.</p>
    <div class="ebGrade">
      ${EBOOKS.map(e => `<a class="ebCard" href="#/ebook/${e.id}" style="--eb:${e.cor}">
        <span class="ebCapa" style="background-image:url(${esc(e.capa)})"><em>eBook</em></span>
        <span class="ebTx"><b>${esc(e.titulo)}</b><small>${esc(e.sub)}</small>
          <span class="ebMeta">${ebLiberado() ? e.caps.length + ' capítulos · liberado ✓' : 'prévia · completo com um tour'}</span></span>
      </a>`).join('')}
    </div>
    <p class="ebNota">${ebLiberado() ? '🎉 Seus guias estão liberados — leia e salve em PDF quantos quiser.' : '🔒 Dê uma espiada à vontade. Os guias <b>completos</b> são um presente da Carol para quem fecha um tour com ela.'}</p>
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
        <div class="ebSelo">${typeof logoImg === 'function' ? logoImg(44, 'escuro') : 'Lovely London'}</div>
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
        <h3>Continue este guia com a Carol</h3>
        <p>Você viu uma prévia. O guia <b>completo</b> (mais ${esc(String(e.caps.length - ebPreviaN(e)))} capítulos) é um presente de quem fecha um tour com a Carol.</p>
        <a class="cta sm" href="#/tours">Ver os passeios da Carol</a>
        <details class="ebCod"><summary>Já fechei um tour — tenho o código</summary>
          <div class="ebCodIn"><input id="ebCodTxt" placeholder="código do seu voucher (ex.: LL-3147)" autocomplete="off">
          <button class="mini" id="ebCodOk">Liberar</button></div><p class="ebCodMsg" id="ebCodMsg"></p></details>
      </section>`}
      <footer class="ebFim">
        <p class="ebAss">Feito com carinho pela <b>Carol</b> — sua guia Blue Badge em Londres.</p>
        <p class="ebCta noprint">Quer conhecer Londres comigo de verdade? <a href="#/tours">Veja os passeios →</a></p>
        <p class="ebFine">Lovely London by Carol · guia oficial Blue Badge · lovelylondon.uk</p>
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
    else { msg.textContent = 'Código não encontrado. Confira no seu voucher, ou fale com a Carol.'; }
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
  return _rotaExtraEbooks(p);
};
