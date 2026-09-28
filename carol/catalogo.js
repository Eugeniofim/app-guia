/* =====================================================
   CATÁLOGO — os tours DA CAROL (site lovelylondon.uk, lido em 28/09/2026)

   Os 12 tours são os do site dela, com o texto dela (verbatim, só sem os
   "\r\n" quebrados do site). As PARADAS saem do banco de pontos (pontos.js):
   foto do Wikimedia Commons com crédito, coordenada para o mapa. Onde o site
   dela lista a parada com uma frase, a frase é dela.

   PREÇO: no site tudo está "Sob consulta". Na reunião ela disse que cobra
   por PACOTE DE HORAS × TAMANHO DO GRUPO e que vai mandar a tabela. Até lá,
   os valores abaixo são EXEMPLO (APP_TABELA_EXEMPLO = true): o app mostra a
   etiqueta "valores de exemplo" e ela troca tudo no painel.
   Referência usada para o exemplo: piso oficial Blue Badge para guia em
   outro idioma 2026-27 (£258 meio dia / £411 dia inteiro, Guide London) e o
   que o concorrente cobra (£360–400 o meio dia).
   Grupo: "no máximo 6 pessoas" (FAQ dela). 7 ou mais = sob consulta.
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

/* parada a partir do banco de pontos, com a frase dela quando o site tem */
function paradaDe(id, frase) {
  const p = (typeof ponto === 'function' && ponto(id)) || null;
  if (!p) return null;
  const d = frase || p.d || '';
  return { pid: id, t: '', ph: p.ph, cr: p.cr, lat: p.lat, lng: p.lng,
    n: { pt: p.n, en: p.n }, d: { pt: d.length > 360 ? d.slice(0, d.lastIndexOf(' ', 350)) + '…' : d, en: '' } };
}
const paradas = (lista) => lista.map(x => Array.isArray(x) ? paradaDe(x[0], x[1]) : paradaDe(x)).filter(Boolean);

const POLITICA_CAROL = {
  pt: 'Sinal de 30% para reservar (não reembolsável) · resto no dia · tolerância de 30 min',
  en: '30% non-refundable deposit to book · balance on the day · 30-min waiting time',
};
const INCLUI_GUIA = { pt: ['Guia Blue Badge em português', 'Grupo privativo: só o seu grupo', 'Histórias e curiosidades', 'Mapa da rota'], en: ['Blue Badge guide in Portuguese', 'Private group', 'Stories and curiosities', 'Route map'] };

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
    /* ---------------- CLÁSSICOS ---------------- */
    T({ id: 'londres-classica', type: 'walk', region: 'westminster', order: 1, destaque: true, horas: [4, 6],
      name: { pt: 'Londres Clássica', en: 'Classic London' },
      tagline: { pt: 'Primeira vez em Londres? Este é o roteiro essencial que reúne os destaques imperdíveis da cidade.', en: 'First time in London? The essential route through the unmissable highlights.' },
      desc: { pt: 'O roteiro começa no Palácio de Buckingham, residência oficial da monarquia britânica. Quando o calendário permite, assistimos à Troca da Guarda: uma cerimônia de 45 minutos em que os soldados do Regimento da Guarda Real, com seus uniformes vermelhos e chapéus de pelo de urso, passam a responsabilidade pela proteção do palácio de um batalhão para outro.\n\nDe Buckingham, caminhamos pelo St. James\'s Park e seguimos por Whitehall, a rua do poder britânico. No caminho, passamos pelo 10 Downing Street, residência oficial do Primeiro-Ministro desde 1735, e pelo Horse Guards Parade, onde acontece a Trooping the Colour.\n\nChegamos a Trafalgar Square, construída para celebrar a Batalha de Trafalgar de 1805. O percurso termina em Westminster, com vista para o Palácio de Westminster e a Elizabeth Tower, onde fica o Big Ben. Curiosidade: Big Ben é o nome do sino dentro da torre, não da torre em si.\n\nCarol guia todo o percurso a pé, em português, com histórias que não estão nas placas.', en: '' },
      meeting: { pt: 'Palácio de Buckingham (o ponto exato vai na confirmação)', en: 'Buckingham Palace (exact spot sent on confirmation)' },
      includes: INCLUI_GUIA, photo: 'fotos/t-classica.jpg',
      priceNote: { pt: 'Tour externo: os marcos são vistos por fora. A Troca da Guarda é às segundas, quartas e sextas (diária em maio, junho e julho).', en: '' },
      stops: paradas(['troca-guarda', 'buckingham', 'st-james-park', 'horse-guards', 'downing', 'trafalgar', 'parlamento', 'big-ben', 'abadia']) }),

    T({ id: 'city-of-london', type: 'walk', region: 'city', order: 2, destaque: true, horas: [4, 6], imersivo: 'city',
      name: { pt: 'City of London', en: 'City of London' },
      tagline: { pt: 'A história e as curiosidades da City, berço da metrópole global que Londres se tornou.', en: 'The history and curiosities of the City, where London began.' },
      desc: { pt: 'A City of London ocupa apenas 1 milha quadrada, mas é onde tudo começou. Os romanos fundaram Londinium neste exato território por volta do ano 47 d.C., ergueram uma ponte sobre o Tâmisa e transformaram o local num dos maiores portos do Império Romano. A muralha defensiva que construíram a partir do século II definiu os limites da cidade por mais de mil anos.\n\nCaminhamos por ruas que guardam camadas visíveis dessa história. No Leadenhall Market, o pavimento cobre as ruínas do Fórum Romano. O Banco da Inglaterra, fundado em 1694, é o segundo banco central mais antigo do mundo ainda em funcionamento. A Catedral de St. Paul foi projetada por Christopher Wren e construída entre 1675 e 1710, após o Grande Incêndio de Londres. A Tower Bridge foi inaugurada em 1894 e a Torre de Londres, fundada por Guilherme, o Conquistador, é Patrimônio Mundial da UNESCO desde 1988. Encerramos no Borough Market.', en: '' },
      meeting: { pt: 'Catedral de St. Paul (o ponto exato vai na confirmação)', en: "St Paul's Cathedral" },
      includes: INCLUI_GUIA, photo: 'fotos/t-city.jpg',
      priceNote: { pt: 'Tour externo: os marcos são vistos por fora. Existe também a versão AUTOGUIADA com a voz da Carol (roteiro imersivo).', en: '' },
      stops: paradas(['st-pauls', 'bank-of-england', 'royal-exchange', 'leadenhall', 'monument', 'tower-of-london', 'tower-bridge', 'borough-market']) }),

    T({ id: 'british-museum', type: 'museum', region: 'londres', order: 3, horas: [2.5, 4],
      name: { pt: 'British Museum', en: 'British Museum' },
      tagline: { pt: 'Os destaques do museu público mais antigo do mundo, num roteiro curado.', en: 'The highlights of the world’s oldest public museum, curated.' },
      desc: { pt: 'O British Museum foi fundado em 1753 e é o museu público mais antigo do mundo. Com cerca de 8 milhões de objetos, a coleção abrange civilizações de todos os continentes e seis mil anos de história humana. Em uma única visita, ninguém vê tudo. Por isso Carol guia um roteiro curado pelos destaques, com contexto real para entender o que você está vendo.\n\nA Pedra de Roseta é o objeto mais visitado do museu: foi graças a ela que o mundo aprendeu a ler hieróglifos. A seção egípcia reúne múmias, sarcófagos e artefatos com mais de três mil anos. As Esculturas do Partenon representam mais da metade do que ainda resta da decoração esculpida do templo. Os relevos assírios e as peças do Império Romano completam o percurso.', en: '' },
      meeting: { pt: 'Entrada principal do British Museum (Great Russell Street)', en: 'British Museum main entrance' },
      includes: { pt: ['Guia Blue Badge em português', 'Tour curado pelos destaques', 'Entrada gratuita no museu', 'Mapa da rota'], en: [] },
      notIncludes: { pt: ['Exposições temporárias pagas'], en: [] },
      photo: 'fotos/t-british-museum.jpg',
      stops: paradas(['great-court', 'rosetta', 'egito-bm', 'parthenon', 'assirios']) }),

    T({ id: 'national-gallery', type: 'museum', region: 'westminster', order: 4, horas: [2, 4],
      name: { pt: 'National Gallery', en: 'National Gallery' },
      tagline: { pt: 'Obras-primas de 700 anos de pintura em um roteiro curado.', en: 'Masterpieces from 700 years of painting.' },
      desc: { pt: 'A National Gallery foi fundada em 1824 e reúne mais de 2.300 obras que vão do século XIII até 1900, todas em entrada gratuita, no coração de Trafalgar Square. Carol guia um roteiro pelos destaques que fazem sentido juntos, não apenas uma lista de salas.\n\nVan Gogh pintou os Girassóis em agosto de 1888 para decorar seu quarto em Arles antes de receber Paul Gauguin — as 15 flores estão em diferentes estágios, do botão ao apodrecimento: é uma pintura sobre o tempo. A Virgem das Rochas de Leonardo da Vinci é a versão londrina de uma composição que existe em dois exemplares (o outro está no Louvre). Monet, Rafael, Botticelli, Van Eyck, Ticiano e Velázquez completam o percurso.', en: '' },
      meeting: { pt: 'Escadaria da National Gallery, Trafalgar Square', en: 'National Gallery steps' },
      includes: { pt: ['Guia Blue Badge em português', 'Tour curado pelas obras-primas', 'Entrada gratuita no museu'], en: [] },
      notIncludes: { pt: ['Exposições temporárias pagas'], en: [] },
      photo: 'fotos/t-national-gallery.jpg',
      stops: paradas(['national-gallery', 'girassois', 'virgem-rochas', 'trafalgar']) }),

    T({ id: 'abadia-de-westminster', type: 'museum', region: 'westminster', order: 5, horas: [2], blueBadge: true,
      name: { pt: 'Abadia de Westminster', en: 'Westminster Abbey' },
      tagline: { pt: 'Coroações, casamentos reais e história viva — por dentro da Abadia.', en: 'Coronations, royal weddings and living history.' },
      desc: { pt: 'Desde a coroação de Guilherme, o Conquistador, em 1066, todos os monarcas britânicos foram coroados aqui. São 39 coroações no mesmo edifício ao longo de quase mil anos. Mais de 3.000 pessoas estão enterradas ou homenageadas entre suas paredes.\n\nNo Canto dos Poetas, Geoffrey Chaucer foi o primeiro a ser enterrado, em 1400; Isaac Newton, Charles Darwin e Charles Dickens estão entre os que seguiram. Na nave central, o Túmulo do Soldado Desconhecido é um dos únicos locais da Abadia que não pode ser pisado.\n\nCarol guia o percurso interno com histórias sobre cada capela, cada personagem e cada detalhe que passaria despercebido sem contexto.', en: '' },
      meeting: { pt: 'Entrada norte da Abadia de Westminster', en: 'Westminster Abbey north door' },
      includes: { pt: ['Guia Blue Badge em português', 'Tour interno completo', 'Histórias e curiosidades'], en: [] },
      notIncludes: { pt: ['Ingressos (compre antes: veja "Ingressos antecipados")'], en: [] },
      ingresso: 'abadia', photo: 'fotos/t-abadia.jpg',
      stops: paradas(['abadia', 'poets-corner', 'soldado-desconhecido']) }),

    T({ id: 'torre-de-londres', type: 'museum', region: 'city', order: 6, horas: [2, 4], blueBadge: true,
      name: { pt: 'Torre de Londres', en: 'Tower of London' },
      tagline: { pt: 'História, lendas e poder às margens do Tâmisa — com as Joias da Coroa.', en: 'History, legends and power on the Thames.' },
      desc: { pt: 'A Torre de Londres existe neste ponto do Tâmisa desde 1078, quando Guilherme, o Conquistador, ordenou a construção da Torre Branca para intimidar a cidade recém-conquistada. Nos nove séculos seguintes, o conjunto funcionou como palácio real, prisão de Estado, casa da Moeda e arsenal.\n\nAs Joias da Coroa ficam aqui: a coleção inclui 23.578 pedras preciosas, entre elas a St. Edward\'s Crown, usada em todas as coroações desde 1661. Ana Bolena foi executada no pátio interno em 1536. Os Yeoman Warders — os Beefeaters — cuidam dos corvos: pela lenda, o reino cairia se eles partissem.\n\nCarol guia o percurso interno com o contexto que transforma cada sala em uma história concreta, não um catálogo de datas.', en: '' },
      meeting: { pt: 'Entrada da Torre de Londres (Tower Hill)', en: 'Tower of London entrance' },
      includes: { pt: ['Guia Blue Badge em português', 'Tour interno completo', 'Joias da Coroa'], en: [] },
      notIncludes: { pt: ['Ingressos (compre antes: veja "Ingressos antecipados")'], en: [] },
      ingresso: 'torre', photo: 'fotos/t-torre.jpg',
      stops: paradas(['torre-branca', 'joias-coroa', 'beefeaters', 'corvos', 'tower-bridge']) }),

    T({ id: 'alem-de-londres', type: 'day', region: 'fora', order: 7, horas: [8], price: 0,
      name: { pt: 'Além de Londres', en: 'Beyond London' },
      tagline: { pt: 'Um dia inteiro de carro privado com a Carol: Windsor, Stonehenge, Bath, Oxford, Stratford, Canterbury ou Cotswolds.', en: 'A full day by private car.' },
      desc: { pt: 'Londres é o ponto de partida para alguns dos destinos mais importantes da Europa. Em um dia de carro privado com Carol, você consegue ir e voltar com tempo de verdade para cada lugar, sem depender de ônibus turístico com horário fixo.\n\nO Castelo de Windsor é o castelo habitado mais antigo e maior do mundo. Stonehenge começou a ser erguido por volta de 3100 a.C. Bath preserva as termas romanas construídas há mais de 2.000 anos. Oxford tem uma das universidades mais antigas do mundo de língua inglesa. Em Stratford-upon-Avon, a casa onde Shakespeare nasceu ainda está de pé. Canterbury foi o terceiro destino de peregrinação cristã mais importante do mundo.\n\nCarol sugere o roteiro de acordo com os seus interesses e garante que você chega em cada lugar sabendo o que está vendo.', en: '' },
      meeting: { pt: 'No seu hotel em Londres', en: 'At your hotel in London' }, pickup: true,
      includes: { pt: ['Guia Blue Badge em português', 'Transporte privado', 'Roteiro sob medida'], en: [] },
      notIncludes: { pt: ['Ingressos pagos no destino', 'Refeições'], en: [] },
      priceNote: { pt: 'O valor depende do destino e do carro — a Carol manda o orçamento na hora.', en: '' },
      photo: 'fotos/t-alem.jpg', duration: '8 a 10 horas',
      stops: paradas(['windsor-castle', 'stonehenge', 'bath', 'oxford', 'stratford', 'canterbury', 'cotswolds']) }),

    /* ---------------- EXCLUSIVOS ---------------- */
    T({ id: 'mystic-london', type: 'exclusivo', region: 'city', order: 8, horas: [4],
      name: { pt: 'Mystic London Experience', en: 'Mystic London Experience' },
      tagline: { pt: 'O lado secreto e enigmático de Londres: templários, um templo romano subterrâneo, maçons e ruínas góticas.', en: 'The secret side of London.' },
      desc: { pt: 'A Mystic London Experience é um percurso dedicado aos mistérios, símbolos e histórias ocultas que atravessam séculos na capital inglesa: templos subterrâneos, sociedades secretas, ruínas encantadas e igrejas marcadas por lendas e rituais antigos.\n\nComeçamos na Temple Church, construída pelos Cavaleiros Templários. Descemos ao London Mithraeum, um templo romano escondido sob a cidade moderna. Seguimos para a St. Bride\'s Church, cuja torre inspirou o formato do bolo de casamento, e para o Freemasons\' Hall, sede da maçonaria inglesa. Encerramos nas ruínas góticas de St. Dunstan-in-the-East, onde a natureza tomou conta de uma igreja destruída pela guerra.', en: '' },
      meeting: { pt: 'Temple Church', en: 'Temple Church' },
      includes: INCLUI_GUIA, photo: 'fotos/t-mystic.jpg',
      stops: paradas([['temple-church', 'Templários, simbolismo medieval e lendas de sociedades sagradas.'], ['mithraeum', 'Templo romano subterrâneo e os rituais secretos do culto de Mitra.'], ['st-brides', 'Criptas, histórias curiosas e a torre que inspirou o bolo de casamento.'], ['freemasons', 'Simbologia maçônica, arquitetura ritualística e tradições reservadas.'], ['st-dunstan', 'Ruínas góticas cobertas pela natureza; encerramento contemplativo.']]) }),

    T({ id: 'natal-luzes-mercados', type: 'exclusivo', region: 'londres', order: 9, horas: [3], status: 'seasonal', noturno: true,
      temporada: { de: '11-15', ate: '12-31', hora: '17:30' },
      name: { pt: 'Christmas Lights & Markets', en: 'Christmas Lights & Markets' },
      tagline: { pt: 'A magia do Natal em Londres: as luzes mais famosas da cidade, com paradas para fotos e chocolate quente.', en: 'London’s Christmas lights.' },
      desc: { pt: 'No Natal, Londres muda. A Regent Street foi a primeira rua de compras de Londres a ter decoração de Natal, em 1954 — a ideia era mostrar que a cidade havia saído da austeridade do pós-guerra. A Oxford Street seguiu em 1959.\n\nO passeio passa por Covent Garden, Leicester Square, Regent Street, Carnaby Street e Oxford Street. Cada uma tem um estilo de decoração diferente; Carol escolhe os melhores pontos para fotos e explica o que está por trás de cada tradição. O Hyde Park Winter Wonderland é opcional no final. Tour noturno, a partir de novembro.', en: '' },
      meeting: { pt: 'Covent Garden', en: 'Covent Garden' },
      includes: INCLUI_GUIA, photo: 'fotos/t-natal.jpg',
      stops: paradas(['covent-garden', 'leicester-square', 'regent-street', 'carnaby', 'oxford-street', 'winter-wonderland']) }),

    T({ id: 'magical-london-kids', type: 'exclusivo', region: 'londres', order: 10, horas: [4],
      name: { pt: 'Magical London for Kids', en: 'Magical London for Kids' },
      tagline: { pt: 'Para famílias: Plataforma 9¾, múmias, artistas de rua e ônibus antigos para subir.', en: 'For families with children.' },
      desc: { pt: 'Uma experiência pensada para famílias que querem descobrir Londres pelo encanto, pela imaginação e pelas histórias que fazem a cidade parecer um grande cenário de fantasia.\n\nComeçamos na Plataforma 9¾, em King\'s Cross, para a foto clássica "atravessando a parede". O St. Pancras Renaissance Hotel parece um castelo de conto de fadas. No British Museum, múmias, deuses egípcios e animais mitológicos viram histórias leves e divertidas. Em Covent Garden, artistas de rua e mágicos; a colorida Neal\'s Yard para fotos; e o London Transport Museum, onde as crianças sobem em ônibus e trens antigos.', en: '' },
      meeting: { pt: "Plataforma 9¾, estação King's Cross", en: "Platform 9¾, King's Cross" },
      includes: INCLUI_GUIA, photo: 'fotos/t-kids.jpg',
      notIncludes: { pt: ['Ingresso do London Transport Museum', 'Transporte'], en: [] },
      stops: paradas([['plataforma-934', 'A foto mágica das malas "atravessando a parede".'], ['st-pancras', 'Arquitetura de castelo e histórias divertidas para crianças.'], ['egito-bm', 'Múmias, deuses e animais míticos, com histórias simples.'], ['covent-garden', 'Artistas de rua, mágicos e música.'], ['neals-yard', 'A rua mais colorida de Londres: fotos de família.'], ['transport-museum', 'Ônibus antigos, trens históricos e áreas para brincar.']]) }),

    T({ id: 'art-london', type: 'exclusivo', region: 'londres', order: 11, horas: [4],
      name: { pt: 'Art & London Experience', en: 'Art & London Experience' },
      tagline: { pt: 'Tate Modern, Southbank, Hayward, Saatchi e Serpentine: Londres pelo ângulo da arte e da arquitetura.', en: 'London through art and architecture.' },
      desc: { pt: 'Um roteiro para quem quer ver Londres pelo ângulo da arte e da arquitetura, não pelos pontos turísticos de sempre.\n\nA Tate Modern abriu em 2000 dentro da antiga usina elétrica de Bankside, projetada por Giles Gilbert Scott. O passeio segue pelo Southbank, um dos corredores culturais mais ativos de Londres. A Hayward Gallery apresenta arte contemporânea; a Saatchi Gallery ocupa um antigo quartel e é referência para arte emergente; as Serpentine Galleries ficam dentro do Hyde Park.\n\nCarol — que estudou na Central Saint Martins e trabalhou quase 20 anos com moda — conecta os lugares com as histórias por trás de cada espaço. Ideal para quem gosta de arte, arquitetura, fotografia e design.', en: '' },
      meeting: { pt: 'Tate Modern (entrada do rio)', en: 'Tate Modern' },
      includes: INCLUI_GUIA, photo: 'fotos/t-art.jpg',
      stops: paradas(['tate-modern', 'hayward', 'saatchi', 'serpentine']) }),

    T({ id: 'sacred-london', type: 'exclusivo', region: 'westminster', order: 12, horas: [4],
      name: { pt: 'Sacred London Experience', en: 'Sacred London Experience' },
      tagline: { pt: 'A herança católica e protestante de Londres: Westminster Abbey, St. Paul\'s, Westminster Cathedral e St. Etheldreda\'s.', en: 'London’s sacred heritage.' },
      desc: { pt: 'Um percurso dedicado à herança espiritual que moldou a cidade: os monumentos mais importantes do catolicismo e do protestantismo em Londres, unindo história, arquitetura e momentos que definiram a fé britânica.\n\nA Westminster Abbey, onde reis e rainhas foram coroados e sepultados; a Westminster Cathedral, centro do catolicismo romano no Reino Unido; a St. Etheldreda\'s, um dos templos católicos mais antigos da cidade; e a St. Paul\'s Cathedral, marco da reconstrução de Londres após o Grande Incêndio. Um percurso sereno e inspirador.', en: '' },
      meeting: { pt: 'Westminster Abbey', en: 'Westminster Abbey' },
      includes: INCLUI_GUIA, photo: 'fotos/t-sacred.jpg',
      stops: paradas([['abadia', 'Introdução à tradição anglicana, cerimônias reais e importância histórica.'], ['westminster-cathedral', 'O coração do catolicismo romano no Reino Unido e sua arquitetura singular.'], ['st-etheldreda', 'Um dos templos católicos mais antigos de Londres e seu passado medieval.'], ['st-pauls', 'O templo protestante mais emblemático da cidade e o Grande Incêndio.']]) }),

    /* ---------------- CONSULTORIA (produto 2, reunião 28/09) ----------------
       Não é tour: a pessoa JÁ planejou e quer que a Carol valide numa conversa
       de 1 hora por vídeo. Não ocupa o dia (turno próprio, à noite de Londres).
       Preço do site dela: "Consultoria de Viagem — a partir de £50". */
    { id: 'consultoria', type: 'consult', region: 'online', order: 90, oculto: true,
      name: { pt: 'Consultoria de roteiro', en: 'Itinerary consulting' },
      tagline: { pt: 'Você já planejou. A Carol valida, numa conversa de 1 hora por vídeo.', en: '' },
      desc: { pt: 'Você já montou o seu planejamento — dias, bairros, atrações, ingressos. Numa conversa de 1 hora por vídeo, a Carol revisa tudo com você: o que faz sentido, o que está apertado, o que reservar com antecedência, o que pode ser cortado sem perda e o que não pode faltar. Você sai da conversa com as observações dela por escrito.', en: '' },
      meeting: { pt: 'Online (Google Meet ou WhatsApp vídeo)', en: 'Online' },
      includes: { pt: ['1 hora de conversa por vídeo', 'Revisão do seu roteiro', 'Observações da Carol por escrito'], en: [] },
      notIncludes: { pt: [], en: [] },
      photo: 'fotos/carol.jpg', price: 50, priceMode: 'session', min: 1, max: 20, payPolicy: 'full', privativo: true,
      duration: '1 hora', cancel: { pt: 'Pagamento na reserva · remarcação gratuita até 24h antes', en: '' },
      stops: [], naoOcupaDia: true },
  ];
}

/* 2.5 -> "2h30"; 4 -> "4h" */
function rotuloHoras(h) { const i = Math.floor(h), m = Math.round((h - i) * 60); return i + 'h' + (m ? String(m).padStart(2, '0') : ''); }

if (typeof module !== 'undefined') module.exports = { catalogoCarol, TABELA_EXEMPLO, rotuloHoras, POLITICA_CAROL };
