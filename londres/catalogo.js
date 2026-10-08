/* =====================================================
   CATÁLOGO — os tours do DEMO "Londres com a Bia" (07/10/2026)

   Sete passeios de EXEMPLO, escritos para esta demonstração. As PARADAS
   saem do banco de pontos (pontos.js): foto do Wikimedia Commons com
   crédito, coordenada para o mapa.

   PREÇO: por PACOTE DE HORAS × TAMANHO DO GRUPO. Os valores são EXEMPLO
   (APP_TABELA_EXEMPLO = true): o app mostra a etiqueta "valores de exemplo"
   e o guia troca tudo no painel.
   Grupo: até 6 pessoas. 7 ou mais = sob consulta.
   ===================================================== */
'use strict';

const APP_TABELA_EXEMPLO = true;

/* valor por GRUPO (não por pessoa), por duração: [até 4 pessoas, 5 a 6 pessoas] */
const TABELA_EXEMPLO = {
  2:   [240, 280],
  2.5: [260, 300],
  3:   [300, 350],
  4:   [360, 420],
  6:   [480, 550],
  8:   [600, 680],
};
function pacotesExemplo(horas) {
  return horas.map(h => ({ h, faixas: [{ ate: 4, v: TABELA_EXEMPLO[h][0] }, { ate: 6, v: TABELA_EXEMPLO[h][1] }] }));
}

/* parada a partir do banco de pontos, com uma frase própria quando quiser */
function paradaDe(id, frase) {
  const p = (typeof ponto === 'function' && ponto(id)) || null;
  if (!p) return null;
  const d = frase || p.d || '';
  return { pid: id, t: '', ph: p.ph, cr: p.cr, lat: p.lat, lng: p.lng,
    n: { pt: p.n, en: p.n }, d: { pt: d.length > 360 ? d.slice(0, d.lastIndexOf(' ', 350)) + '…' : d, en: '' } };
}
const paradas = (lista) => lista.map(x => Array.isArray(x) ? paradaDe(x[0], x[1]) : paradaDe(x)).filter(Boolean);

/* política genérica do demo */
const POLITICA_CAROL = {
  pt: 'Sinal de 30% para travar a data · saldo no dia · remarcação grátis até 48h antes',
  en: '30% deposit to lock the date · balance on the day · free rescheduling up to 48h before',
};
const INCLUI_GUIA = { pt: ['Guia brasileira em português', 'Grupo privativo', 'Histórias e curiosidades', 'Mapa da rota'], en: ['Brazilian guide in Portuguese', 'Private group', 'Stories and curiosities', 'Route map'] };

function catalogoCarol() {
  const base = { pickup: false, privativo: true, min: 1, max: 6, priceMode: 'pacote', payPolicy: 'split',
    cancel: POLITICA_CAROL, effort: 'easy', distance: '', notIncludes: { pt: ['Ingressos das atrações', 'Transporte'], en: ['Attraction tickets', 'Transport'] } };
  const T = (o) => {
    const x = { ...base, ...o };
    x.pacotes = o.pacotes || pacotesExemplo(o.horas || [4]);
    delete x.horas;
    x.price = o.price !== undefined ? o.price : Math.min(...x.pacotes.map(p => p.faixas[0].v));   /* "a partir de" */
    x.duration = x.duration || x.pacotes.map(p => rotuloHoras(p.h)).join(' ou ');
    return x;
  };
  return [
    /* ---------------- A PÉ ---------------- */
    T({ id: 'londres-classica', type: 'walk', region: 'westminster', order: 1, destaque: true, horas: [4, 6],
      name: { pt: 'Londres Clássica', en: 'Classic London' },
      tagline: { pt: 'Primeira vez em Londres? Big Ben, Abadia, Buckingham e Trafalgar numa caminhada só, em português.', en: 'First time in London? Big Ben, the Abbey, Buckingham and Trafalgar in one walk.' },
      desc: { pt: 'A caminhada começa na estação de Westminster: você sobe a escada e dá de cara com o Big Ben. Dali seguimos pela Parliament Square, passamos pela Abadia de Westminster (vista por fora) e descemos a Whitehall até a Downing Street.\n\nAtravessamos o St James\'s Park, o parque mais bonito do centro, e chegamos ao Palácio de Buckingham. Nos dias de Troca da Guarda, a gente ajusta o horário para assistir. O passeio termina na Trafalgar Square, de onde você já sai sabendo pegar o metrô sozinho.\n\nDica prática: use tênis confortável e leve uma garrafinha de água. São uns 5 km no total, com muitas paradas para foto e história.', en: '' },
      meeting: { pt: 'Saída da estação Westminster (o ponto exato vai na confirmação)', en: 'Westminster station exit (exact spot sent on confirmation)' },
      includes: INCLUI_GUIA, photo: 'fotos/p-big-ben.jpg',
      priceNote: { pt: 'Tour externo: os marcos são vistos por fora. A Troca da Guarda costuma ser às segundas, quartas, sextas e domingos; confira o calendário oficial.', en: '' },
      stops: paradas(['big-ben', 'parlamento', 'abadia', 'downing', 'horse-guards', 'st-james-park', 'buckingham', 'trafalgar']) }),

    T({ id: 'city-tower-bridge', type: 'walk', region: 'city', order: 2, destaque: true, horas: [4, 6],
      name: { pt: 'City e Tower Bridge', en: 'The City and Tower Bridge' },
      tagline: { pt: 'Onde Londres nasceu: St Paul\'s, a Millennium Bridge, o Bank e um mirante grátis antes da Tower Bridge.', en: 'Where London began: St Paul\'s, the Millennium Bridge, Bank and a free viewpoint before Tower Bridge.' },
      desc: { pt: 'A City of London tem só uma milha quadrada, mas é ali que os romanos fundaram a cidade há quase dois mil anos. Começamos na Catedral de St Paul\'s, atravessamos a Millennium Bridge para a vista do rio e voltamos pelo coração financeiro: Bank, Royal Exchange e o Leadenhall Market, cenário do Beco Diagonal.\n\nSubimos ao Sky Garden para ver Londres de cima sem pagar nada, passamos pelo Monumento ao Grande Incêndio e terminamos na Tower Bridge, com a Torre de Londres ao lado.\n\nDica prática: o Sky Garden é grátis, mas pede reserva online com alguns dias de antecedência. Eu mando o link junto com a confirmação.', en: '' },
      meeting: { pt: 'Escadaria da Catedral de St Paul\'s', en: "St Paul's Cathedral steps" },
      includes: INCLUI_GUIA, photo: 'fotos/p-tower-bridge.jpg',
      priceNote: { pt: 'Tour externo: a catedral e a Torre são vistas por fora. Quem quiser entrar depois recebe as dicas de ingresso.', en: '' },
      stops: paradas(['st-pauls', 'millennium-bridge', 'bank-of-england', 'royal-exchange', 'leadenhall', 'sky-garden', 'monument', 'tower-bridge']) }),

    /* ---------------- POR DENTRO ---------------- */
    T({ id: 'museu-britanico', type: 'museum', region: 'londres', order: 3, horas: [3],
      name: { pt: 'Museu Britânico por dentro', en: 'Inside the British Museum' },
      tagline: { pt: 'Um roteiro de 3 horas pelos destaques: Pedra de Roseta, múmias e o Partenon, sem se perder nas 90 salas.', en: 'A 3-hour route through the highlights: the Rosetta Stone, the mummies and the Parthenon.' },
      desc: { pt: 'O Museu Britânico é gratuito e gigante: quem entra sem roteiro cansa antes de ver o que importa. Nesta visita a gente vai direto aos destaques, com calma para entender cada peça: a Pedra de Roseta, as múmias do Egito, as esculturas do Partenon e os relevos assírios.\n\nEntre uma sala e outra, eu conto por que aquelas peças estão em Londres e as discussões que existem hoje sobre devolvê-las.\n\nDica prática: chegue 10 minutos antes da abertura (10h) para passar rápido pela revista de bolsas. Mochila grande não entra.', en: '' },
      meeting: { pt: 'Portão principal do Museu Britânico (Great Russell Street)', en: 'British Museum main gate (Great Russell Street)' },
      includes: { pt: ['Guia brasileira em português', 'Roteiro pelos destaques', 'Entrada gratuita no museu', 'Mapa das salas'], en: [] },
      notIncludes: { pt: ['Exposições temporárias pagas'], en: [] },
      photo: 'fotos/p-great-court.jpg',
      stops: paradas(['british-museum', 'great-court', 'rosetta', 'egito-bm', 'parthenon', 'assirios']) }),

    /* ---------------- BAIRROS ---------------- */
    T({ id: 'notting-hill-camden', type: 'walk', region: 'bairros', order: 4, horas: [4],
      name: { pt: 'Notting Hill, Portobello e Camden', en: 'Notting Hill, Portobello and Camden' },
      tagline: { pt: 'Os dois bairros mais fotografados de Londres num passeio só: casinhas coloridas de manhã, mercado alternativo à tarde.', en: 'London\'s two most photographed neighbourhoods in one walk.' },
      desc: { pt: 'Começamos em Notting Hill pelas ruas de casas coloridas e pelo mercado de Portobello Road, de antiguidades e comida de rua. Dali pegamos o metrô juntos (eu explico como funciona o cartão) até Camden, o bairro da música e das lojas alternativas.\n\nEm Camden passamos pelo mercado, pelo canal de Regent\'s e, se o tempo ajudar, subimos a Primrose Hill para ver a cidade inteira de cima.\n\nDica prática: Portobello é mais animado aos sábados, mas também mais cheio. Sexta é o meio-termo perfeito.', en: '' },
      meeting: { pt: 'Saída da estação Notting Hill Gate', en: 'Notting Hill Gate station exit' },
      includes: INCLUI_GUIA, photo: 'fotos/p-notting-hill.jpg',
      notIncludes: { pt: ['Bilhete de metrô entre os bairros', 'Comidinhas do mercado'], en: [] },
      stops: paradas(['notting-hill', 'camden', 'little-venice', 'primrose']) }),

    T({ id: 'londres-criancas', type: 'walk', region: 'londres', order: 5, horas: [3],
      name: { pt: 'Londres com crianças', en: 'London with kids' },
      tagline: { pt: 'Plataforma 9¾, ônibus antigos para subir, dinossauros e parque: um passeio no ritmo da família.', en: 'Platform 9¾, old buses to climb, dinosaurs and a park: a walk at the family\'s pace.' },
      desc: { pt: 'Um passeio pensado para quem viaja com crianças de 5 a 12 anos. Começa na Plataforma 9¾, em King\'s Cross, com a foto do carrinho atravessando a parede, e passa pelo hotel St Pancras, que parece um castelo.\n\nDepois seguimos para Covent Garden, com artistas de rua e o Museu do Transporte, onde as crianças sobem em ônibus e trens antigos. Terminamos num parque, para correr. Se a família for fã de Harry Potter ou quiser a Casa de Bonecas da Rainha Mary, em Windsor, eu monto um dia extra sob medida.\n\nDica prática: 3 horas é o limite para criança pequena. Leve lanche; eu aviso onde tem banheiro.', en: '' },
      meeting: { pt: "Plataforma 9¾, estação King's Cross", en: "Platform 9¾, King's Cross station" },
      includes: INCLUI_GUIA, photo: 'fotos/p-plataforma-934.jpg',
      notIncludes: { pt: ['Ingresso do Museu do Transporte (crianças até 17 anos não pagam)', 'Transporte'], en: [] },
      stops: paradas(['plataforma-934', 'st-pancras', 'covent-garden', 'neals-yard', 'transport-museum', 'st-james-park']) }),

    /* ---------------- BATE-VOLTA ---------------- */
    T({ id: 'windsor-oxford', type: 'day', region: 'fora', order: 6, horas: [8],
      name: { pt: 'Windsor e Oxford', en: 'Windsor and Oxford' },
      tagline: { pt: 'Um dia fora de Londres com carro privado: o castelo onde o rei mora e a cidade universitária mais famosa do mundo.', en: 'A day out of London by private car: the King\'s castle and the world\'s most famous university town.' },
      desc: { pt: 'Saímos cedo do seu hotel com motorista. A primeira parada é Windsor: o castelo habitado mais antigo do mundo, a Capela de São Jorge e a Casa de Bonecas da Rainha Mary. Depois do almoço seguimos para Oxford, onde caminhamos pelos colégios, pela Radcliffe Camera e pelos cantos que viraram cenário de filme.\n\nA volta a Londres é no fim da tarde, com tempo de descansar antes do jantar.\n\nDica prática: o castelo fecha às terças e quartas em parte do ano, e o ingresso vale mais barato comprado antes. Eu confiro as datas e mando o link oficial na confirmação.', en: '' },
      meeting: { pt: 'No seu hotel em Londres', en: 'At your hotel in London' }, pickup: true,
      includes: { pt: ['Guia brasileira em português', 'Carro privado com motorista', 'Roteiro sob medida'], en: [] },
      notIncludes: { pt: ['Ingressos (castelo e colégios)', 'Refeições'], en: [] },
      photo: 'fotos/p-windsor-castle.jpg', duration: '8 horas',
      stops: paradas(['windsor-castle', 'st-georges', 'dolls-house', 'long-walk', 'oxford']) }),

    /* ---------------- CONSULTORIA ----------------
       Não é tour: a pessoa JÁ planejou e quer que a Bia revise numa conversa
       de 1 hora por vídeo. Não ocupa o dia (turno próprio, à noite de Londres). */
    { id: 'consultoria', type: 'consult', region: 'online', order: 90, oculto: true,
      name: { pt: 'Consultoria online de roteiro', en: 'Online itinerary consulting' },
      tagline: { pt: 'Você já planejou. A Bia revisa com você, numa conversa de 1 hora por vídeo.', en: '' },
      desc: { pt: 'Você já montou o seu planejamento: dias, bairros, atrações, ingressos. Numa conversa de 1 hora por vídeo, a Bia revisa tudo com você: o que faz sentido, o que está apertado, o que reservar com antecedência e o que pode sair sem perda. Você termina a conversa com as anotações dela por escrito.', en: '' },
      meeting: { pt: 'Online (Google Meet ou WhatsApp vídeo)', en: 'Online' },
      includes: { pt: ['1 hora de conversa por vídeo', 'Revisão do seu roteiro', 'Anotações da Bia por escrito'], en: [] },
      notIncludes: { pt: [], en: [] },
      photo: 'fotos/bia.jpg', price: 50, priceMode: 'session', min: 1, max: 20, payPolicy: 'full', privativo: true,
      duration: '1 hora', cancel: { pt: 'Pagamento na reserva · remarcação gratuita até 24h antes', en: '' },
      stops: [], naoOcupaDia: true },
  ];
}

/* 2.5 -> "2h30"; 4 -> "4h" */
function rotuloHoras(h) { const i = Math.floor(h), m = Math.round((h - i) * 60); return i + 'h' + (m ? String(m).padStart(2, '0') : ''); }

if (typeof module !== 'undefined') module.exports = { catalogoCarol, TABELA_EXEMPLO, rotuloHoras, POLITICA_CAROL };
