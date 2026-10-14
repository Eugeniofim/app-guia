/* =====================================================
   CATÁLOGO — os tours da Freddy Turismo (14/10/2026)

   Os tours que estão no site dele (freddyturismo.com) e no Instagram
   @freddyturismolondon, reescritos para o app. As PARADAS saem do banco de
   pontos (pontos.js) ou, fora de Londres, de paradaLivre().

   PREÇO: por CARRO (Classe E até 3 pessoas, V-Class até 7) × horas. Os
   valores são EXEMPLO (APP_TABELA_EXEMPLO = true): o app mostra a etiqueta
   "valores de exemplo" e o Roberto troca tudo no painel.
   ===================================================== */
'use strict';

const APP_TABELA_EXEMPLO = true;

/* valor por CARRO (não por pessoa), por duração:
   [Mercedes Classe E — até 3 pessoas, Mercedes V-Class — até 7 pessoas] */
const TABELA_EXEMPLO = {
  6:  [380, 460],
  7:  [420, 520],
  8:  [480, 600],
  9:  [560, 680],
  10: [650, 780],
  13: [950, 1100],
};
function pacotesExemplo(horas) {
  return horas.map(h => ({ h, faixas: [{ ate: 3, v: TABELA_EXEMPLO[h][0] }, { ate: 7, v: TABELA_EXEMPLO[h][1] }] }));
}

/* parada a partir do banco de pontos, com uma frase própria quando quiser */
function paradaDe(id, frase) {
  const p = (typeof ponto === 'function' && ponto(id)) || null;
  if (!p) return null;
  const d = frase || p.d || '';
  return { pid: id, t: '', ph: p.ph, cr: p.cr, lat: p.lat, lng: p.lng,
    n: { pt: p.n, en: p.n }, d: { pt: d.length > 360 ? d.slice(0, d.lastIndexOf(' ', 350)) + '…' : d, en: '' } };
}
/* parada que não está no banco de pontos (cidades fora de Londres) */
const paradaLivre = (nome, lat, lng, d, ph) => ({ pid: '', t: '', ph: ph || '', cr: '', lat, lng, n: { pt: nome, en: nome }, d: { pt: d || '', en: '' } });
const paradas = (lista) => lista.map(x => (x && typeof x === 'object' && !Array.isArray(x)) ? x : Array.isArray(x) ? paradaDe(x[0], x[1]) : paradaDe(x)).filter(Boolean);

/* política do Roberto (exemplo — ele confirma) */
const POLITICA_CAROL = {
  pt: 'Sinal de 30% para travar a data · saldo no dia · remarcação grátis até 48h antes',
  en: '30% deposit to lock the date · balance on the day · free rescheduling up to 48h before',
};
const INCLUI_CARRO = { pt: ['Mercedes executivo com motorista-guia', 'Busca e volta no seu hotel', 'Wi-Fi, água e guarda-chuva no carro', 'Fotos de vocês em cada parada'], en: ['Executive Mercedes with driver-guide', 'Hotel pick-up and drop-off', 'Wi-Fi, water and umbrella in the car', 'Photos of you at every stop'] };
const NAO_INCLUI = { pt: ['Ingressos das atrações', 'Refeições'], en: ['Attraction tickets', 'Meals'] };

function catalogoCarol() {
  const base = { pickup: true, privativo: true, min: 1, max: 7, priceMode: 'pacote', payPolicy: 'split',
    cancel: POLITICA_CAROL, effort: 'easy', distance: '', includes: INCLUI_CARRO, notIncludes: NAO_INCLUI,
    meeting: { pt: 'Buscamos você no hotel (ou no endereço que você indicar)', en: 'We pick you up at your hotel' } };
  const T = (o) => {
    const x = { ...base, ...o };
    x.pacotes = o.pacotes || (o.horas ? pacotesExemplo(o.horas) : []);
    delete x.horas;
    x.price = o.price !== undefined ? o.price : Math.min(...x.pacotes.map(p => p.faixas[0].v));   /* "a partir de" */
    x.duration = x.duration || x.pacotes.map(p => rotuloHoras(p.h)).join(' ou ');
    return x;
  };
  return [
    /* ---------------- LONDRES ---------------- */
    T({ id: 'city-tour', type: 'city', region: 'londres', order: 1, destaque: true, horas: [8],
      name: { pt: 'City Tour de Londres', en: 'London City Tour' },
      tagline: { pt: 'Londres inteira num dia, de Mercedes: paramos em cada cartão-postal para foto e história.', en: 'All of London in one day by Mercedes, stopping at every landmark.' },
      desc: { pt: 'Um dia para conhecer Londres de ponta a ponta sem cansar as pernas. Saímos do seu hotel e paramos em cada ponto turístico para foto e explicação: Big Ben e o Parlamento, a Abadia de Westminster, a Troca da Guarda no Palácio de Buckingham, Trafalgar Square, Piccadilly Circus, Hyde Park, Kensington, Notting Hill, Abbey Road, a Catedral de St Paul\'s, a Torre de Londres e a Tower Bridge.\n\nO motorista-guia conta a história de cada lugar e ainda é o fotógrafo oficial do grupo. A ordem muda conforme o trânsito, o dia da Troca da Guarda e o que vocês mais querem ver.\n\nDica prática: em dia de Troca da Guarda a gente começa cedo para pegar um bom lugar.', en: '' },
      photo: 'fotos/p-tower-bridge.jpg',
      priceNote: { pt: 'Valor pelo carro, não por pessoa. Classe E para até 3 pessoas, V-Class para até 7.', en: 'Price per car, not per person.' },
      stops: paradas(['big-ben', 'abadia', 'buckingham', 'trafalgar', 'hyde-park', 'notting-hill', 'st-pauls', 'tower-of-london', 'tower-bridge']) }),

    T({ id: 'futebol', type: 'exclusivo', region: 'especial', order: 2, horas: [8],
      name: { pt: 'Tour do Futebol', en: 'Football Tour' },
      tagline: { pt: 'Por dentro dos estádios mais famosos da Europa: escolha dois entre Chelsea, Arsenal, Wembley e Tottenham.', en: 'Inside Europe\'s most famous stadiums: pick two.' },
      desc: { pt: 'Para quem viaja pelo futebol. Você escolhe dois estádios e a gente faz a visita guiada por dentro: vestiários, túnel, beira do gramado, sala de imprensa e o museu do clube.\n\nOpções: Stamford Bridge (Chelsea), Emirates Stadium (Arsenal), Wembley e o novo estádio do Tottenham. Entre um e outro, passamos pelos pontos mais famosos de Londres.\n\nDica prática: em dia de jogo o tour do estádio fecha. Eu confiro o calendário antes de fechar a data.', en: '' },
      photo: 'fotos/home-tamisa.jpg',
      notIncludes: { pt: ['Ingressos dos tours dos estádios', 'Refeições'], en: [] },
      stops: paradas([paradaLivre('Stamford Bridge (Chelsea)', 51.4817, -0.191), paradaLivre('Emirates Stadium (Arsenal)', 51.5549, -0.1084), paradaLivre('Wembley', 51.556, -0.2796), paradaLivre('Tottenham Hotspur Stadium', 51.6043, -0.0664)]) }),

    T({ id: 'harry-potter', type: 'exclusivo', region: 'especial', order: 3, horas: [6],
      name: { pt: 'Estúdios Harry Potter', en: 'Harry Potter Studios' },
      tagline: { pt: 'Ida e volta de Mercedes aos estúdios da Warner em Leavesden, sem trem e sem baldeação.', en: 'Door-to-door ride to the Warner Bros. studios.' },
      desc: { pt: 'Os estúdios onde os filmes foram gravados ficam fora de Londres. Buscamos vocês no hotel, levamos até a entrada no horário do ingresso e esperamos até o fim da visita para a volta.\n\nNo caminho, quem quiser passa pela Plataforma 9¾, em King\'s Cross, para a foto com o carrinho.\n\nDica prática: o ingresso dos estúdios esgota com semanas de antecedência. Compre antes e me mande o horário.', en: '' },
      photo: 'fotos/p-harry-potter.jpg',
      notIncludes: { pt: ['Ingresso dos estúdios (compra antecipada)', 'Refeições'], en: [] },
      stops: paradas(['plataforma-934', 'harry-potter']) }),

    T({ id: 'outlets', type: 'exclusivo', region: 'especial', order: 4, horas: [7],
      name: { pt: 'Outlet Bicester Village', en: 'Bicester Village Outlet' },
      tagline: { pt: 'Um dia de compras com carro esperando: as sacolas vão no porta-malas, não no metrô.', en: 'A shopping day with the car waiting for you.' },
      desc: { pt: 'Bicester Village reúne mais de 150 lojas de marcas com desconto. A gente leva vocês do hotel, deixa na porta e fica à disposição até a hora de voltar. Sem carregar sacola em trem.\n\nDá para combinar com uma passada em Oxford, a 20 minutos dali.', en: '' },
      photo: 'fotos/p-bond-street.jpg',
      notIncludes: { pt: ['Compras e refeições'], en: [] },
      stops: paradas([paradaLivre('Bicester Village', 51.892, -1.1569), 'oxford']) }),

    /* ---------------- BATE-VOLTA ---------------- */
    T({ id: 'windsor-stonehenge', type: 'day', region: 'fora', order: 5, destaque: true, horas: [10],
      name: { pt: 'Windsor, Stonehenge e Salisbury', en: 'Windsor, Stonehenge and Salisbury' },
      tagline: { pt: 'O castelo do rei, o círculo de pedras mais misterioso do mundo e uma catedral medieval num dia só.', en: 'The King\'s castle, Stonehenge and a medieval cathedral in one day.' },
      desc: { pt: 'Saímos cedo para Windsor, o castelo habitado mais antigo do mundo. Depois seguimos pelo interior da Inglaterra até Stonehenge, o monumento de 5 mil anos. A última parada é Salisbury, com a catedral que guarda uma das cópias originais da Magna Carta.\n\nVolta a Londres no fim da tarde.\n\nDica prática: o castelo fecha em alguns dias do ano. Eu confiro a data e mando os links oficiais dos ingressos.', en: '' },
      photo: 'fotos/p-stonehenge.jpg',
      stops: paradas(['windsor-castle', 'long-walk', 'stonehenge', paradaLivre('Catedral de Salisbury', 51.0652, -1.7976, 'Catedral gótica do século 13, com a torre mais alta do Reino Unido e uma das cópias originais da Magna Carta.')]) }),

    T({ id: 'stonehenge-bath', type: 'day', region: 'fora', order: 6, horas: [10],
      name: { pt: 'Stonehenge e Bath', en: 'Stonehenge and Bath' },
      tagline: { pt: 'Das pedras pré-históricas às termas romanas: o dia mais bonito do interior inglês.', en: 'From prehistoric stones to Roman baths.' },
      desc: { pt: 'Primeiro Stonehenge, com tempo para o centro de visitantes e para as fotos. Depois Bath, a cidade das termas romanas e das casas georgianas cor de mel, cenário de Bridgerton.\n\nEm Bath dá tempo de almoçar, visitar os Banhos Romanos e caminhar até o Royal Crescent.', en: '' },
      photo: 'fotos/p-bath.jpg',
      stops: paradas(['stonehenge', 'bath']) }),

    T({ id: 'oxford', type: 'day', region: 'fora', order: 7, horas: [8],
      name: { pt: 'Oxford', en: 'Oxford' },
      tagline: { pt: 'A cidade universitária mais famosa do mundo, com os cantos que viraram cenário de Harry Potter.', en: 'The world\'s most famous university town.' },
      desc: { pt: 'Oxford tem mais de 900 anos de universidade. Caminhamos pelos colégios, pela Radcliffe Camera, pela Ponte dos Suspiros e pelo refeitório que inspirou Hogwarts.\n\nNa volta, dá para incluir Windsor ou o outlet Bicester Village.', en: '' },
      photo: 'fotos/p-oxford.jpg',
      stops: paradas(['oxford']) }),

    T({ id: 'cambridge', type: 'day', region: 'fora', order: 8, horas: [8],
      name: { pt: 'Cambridge', en: 'Cambridge' },
      tagline: { pt: 'Colégios de 800 anos, o rio Cam e o passeio de barco que todo mundo quer fazer.', en: 'Centuries-old colleges and punting on the Cam.' },
      desc: { pt: 'Cambridge é a rival de Oxford, mais tranquila e com o rio no meio da cidade. Visitamos o King\'s College e sua capela, a Ponte da Matemática e as ruelas do centro. Quem quiser faz o passeio de barco (punting) pelo rio Cam.', en: '' },
      photo: 'fotos/p-eton.jpg',
      notIncludes: { pt: ['Ingressos dos colégios e do barco', 'Refeições'], en: [] },
      stops: paradas([paradaLivre("King's College", 52.2043, 0.1149, 'O colégio mais fotografado de Cambridge, com a capela gótica do século 15.'), paradaLivre('Rio Cam (punting)', 52.2053, 0.1145)]) }),

    T({ id: 'cotswolds-stratford', type: 'day', region: 'fora', order: 9, horas: [10],
      name: { pt: 'Cotswolds e Stratford-upon-Avon', en: 'Cotswolds and Stratford-upon-Avon' },
      tagline: { pt: 'Vilarejos medievais de pedra dourada e a cidade natal de Shakespeare.', en: 'Golden stone villages and Shakespeare\'s birthplace.' },
      desc: { pt: 'Os Cotswolds são os vilarejos mais bonitos da Inglaterra: casas de pedra cor de mel, riachos e pontes de pedra. Passamos por dois ou três deles e seguimos para Stratford-upon-Avon, onde nasceu William Shakespeare.', en: '' },
      photo: 'fotos/p-cotswolds.jpg',
      stops: paradas([paradaLivre('Bibury', 51.7587, -1.8332, 'Vilarejo das casinhas de Arlington Row, um dos cartões-postais da Inglaterra.', 'fotos/p-cotswolds.jpg'), paradaLivre('Bourton-on-the-Water', 51.8851, -1.7578), paradaLivre('Stratford-upon-Avon', 52.1917, -1.7083, 'A cidade natal de Shakespeare, à beira do rio Avon.', 'fotos/p-stratford.jpg')]) }),

    T({ id: 'leeds-canterbury', type: 'day', region: 'fora', order: 10, horas: [9],
      name: { pt: 'Leeds Castle e Canterbury', en: 'Leeds Castle and Canterbury' },
      tagline: { pt: 'O castelo "mais bonito do mundo", num lago, e a catedral mais importante da Inglaterra.', en: 'The loveliest castle and England\'s mother cathedral.' },
      desc: { pt: 'Leeds Castle fica no meio de um lago, cercado de jardins. Depois seguimos para Canterbury, cidade medieval murada e sede da Igreja Anglicana, com a catedral onde Thomas Becket foi assassinado.', en: '' },
      photo: 'fotos/p-canterbury.jpg',
      stops: paradas([paradaLivre('Leeds Castle', 51.2489, 0.6305), paradaLivre('Catedral de Canterbury', 51.2798, 1.0828, '', 'fotos/p-canterbury.jpg')]) }),

    T({ id: 'hampton-windsor', type: 'day', region: 'fora', order: 11, horas: [8],
      name: { pt: 'Hampton Court e Windsor', en: 'Hampton Court and Windsor' },
      tagline: { pt: 'O palácio de Henrique VIII e o castelo do rei, perto de Londres e sem pressa.', en: 'Henry VIII\'s palace and the King\'s castle.' },
      desc: { pt: 'Hampton Court foi o palácio preferido de Henrique VIII: cozinhas Tudor, salões e o labirinto de cerca viva. À tarde, Windsor e o castelo habitado mais antigo do mundo.', en: '' },
      photo: 'fotos/p-hampton-court.jpg',
      stops: paradas(['hampton-court', 'windsor-castle', 'st-georges']) }),

    /* ---------------- MAIS LONGE ---------------- */
    T({ id: 'liverpool', type: 'day', region: 'longe', order: 12, horas: [13],
      name: { pt: 'Liverpool dos Beatles', en: 'Beatles\' Liverpool' },
      tagline: { pt: 'Um dia inteiro na terra dos Beatles: Cavern Club, Penny Lane, Strawberry Field e Anfield.', en: 'A full day in the Beatles\' hometown.' },
      desc: { pt: 'Saída bem cedo de Londres. Em Liverpool passamos pelo Cavern Club, pelo museu The Beatles Story, por Penny Lane e pelo portão de Strawberry Field. Para os fãs de futebol, dá para incluir Anfield.', en: '' },
      photo: 'fotos/p-london-eye.jpg',
      stops: paradas([paradaLivre('Cavern Club', 53.4064, -2.9876), paradaLivre('Penny Lane', 53.3893, -2.9178), paradaLivre('Anfield', 53.4308, -2.9608)]) }),

    T({ id: 'escocia', type: 'day', region: 'longe', order: 13, price: 0, pacotes: [], duration: 'Vários dias',
      name: { pt: 'Escócia', en: 'Scotland' },
      tagline: { pt: 'Edimburgo, as Highlands e o Lago Ness: um roteiro de vários dias, montado sob medida.', en: 'Edinburgh, the Highlands and Loch Ness, tailor-made.' },
      desc: { pt: 'Para quem quer ir além da Inglaterra. Montamos um roteiro de vários dias pela Escócia: Edimburgo, as Highlands, o Lago Ness e os castelos. Me diga as datas e quantas pessoas, e eu preparo a proposta.', en: '' },
      photo: 'fotos/p-windsor-castle.jpg', priceMode: 'consulta',
      stops: paradas([paradaLivre('Edimburgo', 55.9533, -3.1883), paradaLivre('Lago Ness', 57.3229, -4.4244)]) }),
  ];
}

/* 2.5 -> "2h30"; 4 -> "4h" */
function rotuloHoras(h) { const i = Math.floor(h), m = Math.round((h - i) * 60); return i + 'h' + (m ? String(m).padStart(2, '0') : ''); }

if (typeof module !== 'undefined') module.exports = { catalogoCarol, TABELA_EXEMPLO, rotuloHoras, POLITICA_CAROL };
