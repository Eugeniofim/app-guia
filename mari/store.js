/* =====================================================
   APP-GUIA — camada de dados
   Persistência: localStorage. A troca para Supabase é
   trocar as funções deste arquivo — as telas não mudam.
   ===================================================== */
'use strict';

const DB_KEY = 'mari_db_v1';

/* ---------- modelo ----------
Tour       {id, type, region, name:{pt,en}, desc:{pt,en}, meeting, photo,
            price, priceMode:'pp'|'session', min, max, payPolicy:'full'|'split',
            status:'live'|'draft'|'seasonal', order}
Rule       {id, tourId, weekdays:[0-6], time:'16:30', capacity, from:'2026-11-20', until:'2026-12-23'}
Departure  {id, tourId, date:'2026-12-21', time, capacity}  // avulsas; recorrentes são geradas das Rules
Block      {id, from, until, reason}                        // bloqueio global (férias)
Booking    {id, code, tourId, date, time, name, email, whats, insta, pax, total,
            coupon, discount, policy:'full'|'split',
            payments:[{amount, date, method, kind:'full'|'deposit'|'balance'}],
            status:'confirmed'|'cancelled', createdAt, origin}
Coupon     {code, pct, until, oncePerPerson, uses:[email]}
------------------------------------------------------ */

/* ---------- quem e o guia ----------
   O config.js da o valor inicial; o guia edita nos Ajustes e o que vale e
   o que esta em DB.settings. Nada disto vem gravado no codigo. */
const GUIA_CFG = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.guia) || {};
/* Sem banco no config.js o app e uma DEMONSTRACAO: tudo vive no aparelho de
   quem esta olhando e nada sai dali. Meia duzia de telas mudam por causa
   disto, entao a pergunta mora num lugar so. */
function temNuvem() { return !!(typeof APP_CONFIG !== 'undefined' && APP_CONFIG && APP_CONFIG.supabaseUrl); }
const PREFIXO = (GUIA_CFG.prefixo || 'RS').toUpperCase();
function _cfgSettings() { return (typeof DB !== 'undefined' && DB && DB.settings) || {}; }
function guiaNome() { return _cfgSettings().admName || GUIA_CFG.nome || 'Guia'; }
function guiaNegocio() { return _cfgSettings().negocio || GUIA_CFG.negocio || guiaNome(); }
function guiaBase() { return _cfgSettings().base || GUIA_CFG.cidade || ''; }
function regioes() {
  const r = GUIA_CFG.regioes;
  return (r && r.length) ? r : [['cidade', 'Cidade', 'City'], ['arredores', 'Arredores', 'Surroundings']];
}
function regiaoLabel(code) {
  const r = regioes().find(x => x[0] === code);
  if (!r) return code || '';
  return (typeof LANG !== 'undefined' && LANG === 'en') ? r[2] : r[1];
}
function regiaoOpts(cur) {
  const en = typeof LANG !== 'undefined' && LANG === 'en';
  return regioes().map(([v, pt, e]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${en ? e : pt}</option>`).join('');
}

function _blank() {
  return { tours: [], rules: [], departures: [], blocks: [], bookings: [], coupons: [], seatCounts: [],
           /* interesse: quantas vezes abriram cada passeio e quantas chegaram a
              escolher data ("quase reservou"). Só contagem por dia, sem nada
              de quem é a pessoa. */
           interesse: {},
           settings: { lang: 'pt', tutorialClient: true, tutorialAdm: true,
           /* quem e o guia — nasce do config.js e o guia edita no painel */
           admName: GUIA_CFG.nome || 'Guia', negocio: GUIA_CFG.negocio || '',
           whats: GUIA_CFG.whats || '', insta: GUIA_CFG.insta || '', placeholderContact: false,
           /* o cliente ve antes de reservar */
           photo: '', badge: GUIA_CFG.badge || '',
           base: GUIA_CFG.cidade || '',
           /* como o cliente paga. Vazio ate ela preencher no ADM — e enquanto
              estiver vazio a tela diz a verdade: ela passa os dados no WhatsApp. */
           /* pixName e pixCity sao exigidos pelo padrao do BR Code:
              sem eles o banco recusa o codigo. */
           apresentacao: [],
           pixKey: '', pixName: '', pixCity: '', iban: '', ibanName: '', payNote: '',
           /* para onde vai o aviso de reserva nova. Vazio = ela ainda nao
              preencheu; quem manda o e-mail e o robo, fora do navegador. */
           admEmail: '',
           /* e-mail PARA O CLIENTE. Nasce desligado de proposito: e-mail
              indo para cliente de verdade so depois que ela ler os textos e
              decidir ligar. */
           avisarClientes: false,
           /* cartao pelo Stripe. Desligado ate a gente provar a cobranca
              de ponta a ponta com dinheiro de verdade. */
           stripeAtivo: false,
           /* A voz dela dentro do e-mail. Vazio = usa o texto padrao.
              Ela NAO edita o e-mail inteiro de proposito: o miolo tem os
              dados da reserva, o Pix e o aviso de que o recibo nao e
              comprovante de pagamento. Apagar esse aviso sem perceber faria
              cliente que nao pagou achar que esta tudo certo. */
           emailReciboIntro: { pt: '', en: '' },
           emailReciboPS:    { pt: '', en: '' },
           emailConfIntro:   { pt: '', en: '' },
           emailConfPS:      { pt: '', en: '' },
           /* margem sobre a cotacao do BCE: cobre o spread de conversao e a
              taxa de quem processa. Sem ela, o euro que chega e menor. */
           /* O guia pediu para tirar a cotacao da tela. A chave antiga
              (mostrarReais) ficou 'true' na nuvem; usar um nome novo desliga
              na hora para todo mundo, sem depender de ela abrir o app. */
           fxMargem: 4, exibirCotacao: false,
           /* a primeira tela: foto de fundo e a frase. Vazio = usa o padrao. */
           homePhoto: '', homeText: { pt: '', en: '' },
           bio: {
             pt: 'Aqui vai a sua apresentação: quem você é, há quanto tempo guia, o que faz o seu passeio ser diferente.\n\nO cliente lê isto antes do preço — quem confia na pessoa aceita melhor o valor.\n\nEdite este texto em Ajustes → Sobre você.',
             en: 'This is where you introduce yourself: who you are, how long you have been guiding, what makes your tour different.\n\nGuests read this before the price — people who trust the person accept the value more easily.\n\nEdit this text in Settings → About you.'
           } } };
}

function _seed() {
  const db = _blank();
  db.demo = true;
  db.interesse = {};

  /* A apresentacao dela. Tudo daqui e do PDF "Apresentação atualizada" e da
     reuniao de 23/09/2026. Ela reescreve em Ajustes -> Sobre voce. */
  db.settings.homeText = {
    pt: 'Experiências autênticas na terra do hygge. Tours privados em português por Copenhague, arredores e Malmö.',
    en: 'Authentic experiences in the land of hygge. Private tours in Portuguese in Copenhagen, around it and Malmö.',
  };
  db.settings.photo = 'arte/mari.jpg';
  db.settings.bio = {
    pt: 'Oi, eu sou a Mari!\n\n'
      + 'Sou gaúcha, sagitariana e apaixonada por história, cultura e, claro, pela Dinamarca. Sou casada com o Cesar, '
      + 'ex-jogador profissional de futebol que atuou por mais de cinco anos no time de Copenhague, e mãe de dois guris.\n\n'
      + 'Minha história com a Dinamarca começou em 2008, quando vim para um programa de intercâmbio. Hoje moro com a '
      + 'minha família em Copenhague, onde sou guia turística e fundadora do Tour na Dinamarca.\n\n'
      + 'Trago comigo a hospitalidade gaúcha combinada com experiências autênticas na terra do hygge — esse jeitinho '
      + 'dinamarquês de valorizar o conforto, o bem-estar e os pequenos grandes momentos da vida.\n\n'
      + 'Cada passeio é planejado com cuidado e atenção aos detalhes, sempre com o desejo de criar conexões verdadeiras '
      + 'com a cidade e com quem viaja comigo.\n\n'
      + 'E eu não sou só a guia de um dia: sou a parceira do seu grupo do começo ao fim. Busco vocês no aeroporto, '
      + 'ajudo com o transporte, reservo restaurante e ingresso, fico junto nos dias de passeio, respondo no WhatsApp '
      + 'se algo der errado — e só me despeço no embarque de volta. Venha dinamarcar a sua viagem!',
    en: 'Hi, I am Mari!\n\n'
      + 'I am from southern Brazil and in love with history, culture and, of course, Denmark. I am married to Cesar, a '
      + 'former professional footballer who played over five years for the Copenhagen club, and mother of two boys.\n\n'
      + 'My story with Denmark began in 2008, when I came here on an exchange programme. Today I live with my family in '
      + 'Copenhagen, where I am a tourist guide and the founder of Tour na Dinamarca.\n\n'
      + 'I bring Brazilian hospitality together with authentic experiences in the land of hygge — the Danish way of '
      + 'valuing comfort, wellbeing and the small great moments of life.\n\n'
      + 'Every tour is planned with care and attention to detail, always aiming to create real connections with the city '
      + 'and with whoever travels with me.\n\n'
      + 'And I am not just a guide for a day: I am your group’s partner from start to finish. I pick you up at the '
      + 'airport, help with transport, book restaurants and tickets, stay with you on tour days, answer on WhatsApp if '
      + 'anything goes wrong — and only say goodbye at your flight home.',
  };
  /* A apresentacao dela em PDF, pagina por pagina: os clientes dela amam esse
     material, entao ele fica logo na entrada do app. */
  db.settings.apresentacao = ['apresentacao/p1.jpg', 'apresentacao/p2.jpg', 'apresentacao/p3.jpg',
    'apresentacao/p4.jpg', 'apresentacao/p5.jpg', 'apresentacao/p6.jpg', 'apresentacao/p7.jpg'];
  db.settings.links = [];

  db.tours = [
    { id: "walking-tour", type: "walk", region: "copenhague",
      name: { pt: "Walking tour pelo centro histórico", en: "Walking tour of the old town" },
      desc: { pt: "Descubra o centro histórico, a cultura local e o estilo hygge. Em 3 horas (essencial) ou 5 horas (completo), privado ou em grupo.",
              en: "Discover the old town, local culture and the hygge way of life. In 3 hours (essential) or 5 hours (complete), private or in a small group." },
      meeting: "Saímos da sua hospedagem",
      duration: "3h ou 5h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/nyhavn.jpg", lat: 0, lng: 0,
          n: { pt: "Nyhavn", en: "Nyhavn" },
          d: { pt: "O porto colorido do século XVII, o cartão-postal da cidade.", en: "The colourful 17th-century harbour, the city’s postcard." } },
        { t: '', ph: "fotos/sereia.jpg", lat: 0, lng: 0,
          n: { pt: "A Pequena Sereia", en: "The Little Mermaid" },
          d: { pt: "Menor do que se espera e cheia de história — eu conto todas.", en: "Smaller than expected and full of stories — I tell them all." } },
        { t: '', ph: "fotos/amalienborg.jpg", lat: 0, lng: 0,
          n: { pt: "Amalienborg", en: "Amalienborg" },
          d: { pt: "O palácio onde a família real mora, com a troca da guarda ao meio-dia.", en: "The palace where the royal family lives, with the changing of the guard at noon." } },
        { t: '', ph: "fotos/nyhavn3.jpg", lat: 0, lng: 0,
          n: { pt: "Praças e vida local", en: "Squares and local life" },
          d: { pt: "As praças públicas onde o dinamarquês realmente passa o dia.", en: "The public squares where Danes actually spend the day." } },
      ],
      photo: "fotos/nyhavn.jpg",
      tagline: { pt: "O essencial de Copenhague, a pé", en: "The essentials of Copenhagen, on foot" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 1,
    },
    { id: "tour-panoramico", type: "carro", region: "copenhague",
      name: { pt: "Tour panorâmico de carro", en: "Panoramic tour by car" },
      desc: { pt: "Viva um passeio exclusivo por Copenhague com o conforto de um carro. Privado ou em grupo, com a duração que você preferir.",
              en: "An exclusive tour of Copenhagen with the comfort of a car. Private or in a group, for as long as you like." },
      meeting: "Saímos da sua hospedagem",
      duration: "Variável", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/christiansborg.jpg", lat: 0, lng: 0,
          n: { pt: "O centro e os palácios", en: "The centre and the palaces" },
          d: { pt: "Christiansborg, Amalienborg e o coração da cidade sem cansar as pernas.", en: "Christiansborg, Amalienborg and the heart of the city without tiring your legs." } },
        { t: '', ph: "fotos/arquitetura.jpg", lat: 0, lng: 0,
          n: { pt: "A orla e os bairros novos", en: "The waterfront and the new districts" },
          d: { pt: "Nordhavn, Ørestad e a arquitetura que mudou a cara da cidade.", en: "Nordhavn, Ørestad and the architecture that changed the city’s face." } },
        { t: '', ph: "fotos/sereia.jpg", lat: 0, lng: 0,
          n: { pt: "Os cartões-postais", en: "The postcards" },
          d: { pt: "Paradas para foto nos pontos que todo mundo quer levar de lembrança.", en: "Photo stops at the spots everyone wants to take home." } },
      ],
      photo: "fotos/mapa.jpg",
      tagline: { pt: "Copenhague inteira, no conforto do carro", en: "All of Copenhagen, in the comfort of a car" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 2,
    },
    { id: "bike-tour", type: "bike", region: "copenhague",
      name: { pt: "Copenhague de bicicleta", en: "Copenhagen by bike" },
      desc: { pt: "Copenhague é a capital mundial da bicicleta, e ver a cidade sobre duas rodas muda tudo. Passeio tranquilo, por ciclovias, no ritmo de quem mora aqui.",
              en: "Copenhagen is the world capital of cycling, and seeing it on two wheels changes everything. An easy ride on cycle lanes, at a local’s pace." },
      meeting: "Saímos da sua hospedagem",
      duration: "3h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/bike.jpg", lat: 0, lng: 0,
          n: { pt: "Ciclovias do centro", en: "City centre cycle lanes" },
          d: { pt: "A gente pega a bicicleta e entra no fluxo — é mais fácil do que parece.", en: "We pick up the bikes and join the flow — it is easier than it looks." } },
        { t: '', ph: "fotos/salvador.jpg", lat: 0, lng: 0,
          n: { pt: "Christianshavn e os canais", en: "Christianshavn and the canals" },
          d: { pt: "Os canais, as casas-barco e a Igreja do Salvador com a torre em espiral.", en: "The canals, the houseboats and the Church of Our Saviour with its spiral tower." } },
        { t: '', ph: "fotos/nyhavn2.jpg", lat: 0, lng: 0,
          n: { pt: "Parques e orla", en: "Parks and waterfront" },
          d: { pt: "Terminamos à beira d’água, onde a cidade toma sol no primeiro raio.", en: "We finish by the water, where the city sunbathes at the first ray." } },
      ],
      photo: "fotos/bike.jpg",
      tagline: { pt: "A cidade como o dinamarquês vive", en: "The city the way Danes live it" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 3,
    },
    { id: "rosenborg", type: "walk", region: "copenhague",
      name: { pt: "Castelo de Rosenborg", en: "Rosenborg Castle" },
      desc: { pt: "As joias da coroa da família real dinamarquesa e o belíssimo Jardim do Rei (Kongens Have).",
              en: "The Danish royal family’s crown jewels and the beautiful King’s Garden (Kongens Have)." },
      meeting: "Saímos da sua hospedagem",
      duration: "3h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/rosenborg-int.jpg", lat: 0, lng: 0,
          n: { pt: "Os salões do castelo", en: "The castle halls" },
          d: { pt: "Quatro séculos de história dos reis dinamarqueses, sala por sala.", en: "Four centuries of Danish royal history, room by room." } },
        { t: '', ph: "fotos/museu.jpg", lat: 0, lng: 0,
          n: { pt: "As joias da coroa", en: "The crown jewels" },
          d: { pt: "No subsolo, a coroa e as joias que ainda são usadas pela rainha.", en: "In the basement, the crown and the jewels still used by the queen." } },
        { t: '', ph: "fotos/nyhavn2.jpg", lat: 0, lng: 0,
          n: { pt: "Kongens Have", en: "The King’s Garden" },
          d: { pt: "O jardim mais antigo do país, onde a cidade inteira senta na grama.", en: "The oldest garden in the country, where the whole city sits on the grass." } },
      ],
      photo: "fotos/rosenborg-int.jpg",
      tagline: { pt: "As joias da coroa e o Jardim do Rei", en: "The crown jewels and the King’s Garden" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 4,
    },
    { id: "christiansborg", type: "walk", region: "copenhague",
      name: { pt: "Palácio de Christiansborg", en: "Christiansborg Palace" },
      desc: { pt: "Sede do Parlamento e joia histórica no coração de Copenhague, com as ruínas do primeiro castelo embaixo.",
              en: "Seat of Parliament and a historic jewel in the heart of Copenhagen, with the ruins of the first castle underneath." },
      meeting: "Saímos da sua hospedagem",
      duration: "3h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/rosenborg-int.jpg", lat: 0, lng: 0,
          n: { pt: "Salões reais", en: "The royal reception rooms" },
          d: { pt: "Onde a rainha ainda recebe chefes de Estado, com as tapeçarias que contam a história do país.", en: "Where the queen still receives heads of state, with tapestries telling the country’s history." } },
        { t: '', ph: "fotos/christiansborg.jpg", lat: 0, lng: 0,
          n: { pt: "O Parlamento", en: "Parliament" },
          d: { pt: "O Folketing em funcionamento: a democracia dinamarquesa por dentro.", en: "The Folketing at work: Danish democracy from the inside." } },
        { t: '', ph: "fotos/museu.jpg", lat: 0, lng: 0,
          n: { pt: "As ruínas", en: "The ruins" },
          d: { pt: "Embaixo do palácio, as pedras do castelo do bispo Absalon, de 1167.", en: "Under the palace, the stones of Bishop Absalon’s castle, from 1167." } },
      ],
      photo: "fotos/christiansborg.jpg",
      tagline: { pt: "O Parlamento e mil anos de história", en: "Parliament and a thousand years of history" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 5,
    },
    { id: "christiania", type: "walk", region: "copenhague",
      name: { pt: "Christiania e Christianshavn", en: "Christiania and Christianshavn" },
      desc: { pt: "O charme do antigo porto combina com a modernidade, a Igreja do Salvador e a cidade livre de Christiania.",
              en: "The charm of the old harbour meets the modern city, the Church of Our Saviour and the free town of Christiania." },
      meeting: "Saímos da sua hospedagem",
      duration: "3h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/nyhavn3.jpg", lat: 0, lng: 0,
          n: { pt: "Canais de Christianshavn", en: "Christianshavn canals" },
          d: { pt: "O bairro holandês de Copenhague, com casas-barco e cafés à beira d’água.", en: "Copenhagen’s Dutch quarter, with houseboats and canal-side cafés." } },
        { t: '', ph: "fotos/salvador.jpg", lat: 0, lng: 0,
          n: { pt: "Igreja do Salvador", en: "Church of Our Saviour" },
          d: { pt: "A torre com a escada em espiral por fora — e a vista que paga a subida.", en: "The tower with the spiral staircase on the outside — and the view that pays for the climb." } },
        { t: '', ph: "fotos/arquitetura2.jpg", lat: 0, lng: 0,
          n: { pt: "Christiania", en: "Christiania" },
          d: { pt: "A cidade livre desde 1971: arte, autogestão e regras próprias.", en: "The free town since 1971: art, self-management and its own rules." } },
      ],
      photo: "fotos/salvador.jpg",
      tagline: { pt: "O porto antigo e a cidade livre", en: "The old harbour and the free town" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 6,
    },
    { id: "carlsberg", type: "walk", region: "copenhague",
      name: { pt: "Home of Carlsberg", en: "Home of Carlsberg" },
      desc: { pt: "Conheça a história e o sabor de uma das cervejarias mais icônicas do mundo, e descubra os segredos da sua tradição.",
              en: "Discover the history and the taste of one of the world’s most iconic breweries, and the secrets of its tradition." },
      meeting: "Saímos da sua hospedagem",
      duration: "3h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/carlsberg.jpg", lat: 0, lng: 0,
          n: { pt: "O portão dos elefantes", en: "The Elephant Gate" },
          d: { pt: "A entrada histórica da cervejaria, de 1901, com quatro elefantes de granito.", en: "The brewery’s historic 1901 entrance, with four granite elephants." } },
        { t: '', ph: "fotos/carlsberg2.jpg", lat: 0, lng: 0,
          n: { pt: "A fábrica e a história", en: "The brewery and its history" },
          d: { pt: "De 1847 até hoje, e a decisão de doar a fórmula da levedura ao mundo.", en: "From 1847 to today, and the decision to give the yeast formula to the world." } },
        { t: '', ph: "fotos/carlsberg2.jpg", lat: 0, lng: 0,
          n: { pt: "A degustação", en: "The tasting" },
          d: { pt: "Terminamos provando — inclusive as cervejas que não saem da Dinamarca.", en: "We finish with a tasting — including the beers that never leave Denmark." } },
      ],
      photo: "fotos/carlsberg.jpg",
      tagline: { pt: "A cervejaria que virou museu", en: "The brewery that became a museum" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 7,
    },
    { id: "arquitetura", type: "walk", region: "copenhague",
      name: { pt: "Arquitetura moderna", en: "Modern architecture" },
      desc: { pt: "Os bairros Nordhavn e Ørestad, os projetos arquitetônicos mais emblemáticos e o jeito dinamarquês de construir cidade.",
              en: "The Nordhavn and Ørestad districts, the most emblematic architectural projects and the Danish way of building a city." },
      meeting: "Saímos da sua hospedagem",
      duration: "3h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/arquitetura.jpg", lat: 0, lng: 0,
          n: { pt: "Nordhavn", en: "Nordhavn" },
          d: { pt: "O porto industrial que virou bairro modelo, com silos transformados em prédios.", en: "The industrial harbour turned model district, with silos turned into buildings." } },
        { t: '', ph: "fotos/arquitetura2.jpg", lat: 0, lng: 0,
          n: { pt: "Ørestad", en: "Ørestad" },
          d: { pt: "A Montanha, o 8 Tallet e os prédios que ganharam prêmio no mundo inteiro.", en: "The Mountain, 8 Tallet and the buildings that won prizes worldwide." } },
        { t: '', ph: "fotos/museu.jpg", lat: 0, lng: 0,
          n: { pt: "O centro contemporâneo", en: "The contemporary centre" },
          d: { pt: "A Ópera, a Biblioteca Real e o diálogo entre o velho e o novo.", en: "The Opera House, the Royal Library and the dialogue between old and new." } },
      ],
      photo: "fotos/arquitetura.jpg",
      tagline: { pt: "Nordhavn, Ørestad e o que vem depois", en: "Nordhavn, Ørestad and what comes next" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 8,
    },
    { id: "futebol", type: "walk", region: "copenhague",
      name: { pt: "Futebol em Copenhague", en: "Football in Copenhagen" },
      desc: { pt: "Explore os bastidores do estádio de Copenhague e sinta a emoção de estar no coração do futebol dinamarquês. Um passeio com quem vive esse mundo de perto.",
              en: "Explore behind the scenes at the Copenhagen stadium and feel the heart of Danish football. A tour with someone who knows that world from the inside." },
      meeting: "Saímos da sua hospedagem",
      duration: "3h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/futebol.jpg", lat: 0, lng: 0,
          n: { pt: "O estádio", en: "The stadium" },
          d: { pt: "Vestiário, túnel e o gramado — o caminho que o jogador faz.", en: "Dressing room, tunnel and the pitch — the path the players take." } },
        { t: '', ph: "fotos/museu.jpg", lat: 0, lng: 0,
          n: { pt: "A história do clube", en: "The club’s history" },
          d: { pt: "Os títulos, os ídolos e o que o futebol significa por aqui.", en: "The titles, the idols and what football means here." } },
        { t: '', ph: "fotos/nyhavn3.jpg", lat: 0, lng: 0,
          n: { pt: "O dia de jogo", en: "Match day" },
          d: { pt: "Se sua viagem coincidir com jogo, a gente organiza o ingresso.", en: "If your trip matches a fixture, we arrange the ticket." } },
      ],
      photo: "fotos/futebol.jpg",
      tagline: { pt: "Os bastidores do estádio", en: "Behind the scenes at the stadium" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 9,
    },
    { id: "gigantes", type: "day", region: "copenhague",
      name: { pt: "Os 6 Gigantes Esquecidos", en: "The 6 Forgotten Giants" },
      desc: { pt: "Trilha das esculturas gigantes de madeira criadas pelo artista dinamarquês Thomas Dambo, escondidas na natureza ao redor de Copenhague.",
              en: "A trail of giant wooden sculptures by Danish artist Thomas Dambo, hidden in the nature around Copenhagen." },
      meeting: "Saímos da sua hospedagem",
      duration: "3h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/gigante.jpg", lat: 0, lng: 0,
          n: { pt: "O primeiro gigante", en: "The first giant" },
          d: { pt: "Feito só de madeira reaproveitada, escondido onde poucos turistas chegam.", en: "Made only of reclaimed wood, hidden where few tourists go." } },
        { t: '', ph: "fotos/foresttower.jpg", lat: 0, lng: 0,
          n: { pt: "A trilha pela floresta", en: "The forest trail" },
          d: { pt: "Caminhada leve entre os gigantes, com a natureza dinamarquesa em volta.", en: "An easy walk between the giants, with Danish nature all around." } },
        { t: '', ph: "fotos/gigante.jpg", lat: 0, lng: 0,
          n: { pt: "A história do artista", en: "The artist’s story" },
          d: { pt: "Como Thomas Dambo espalhou esses gigantes pelo mundo — e por que eles ficam escondidos.", en: "How Thomas Dambo spread these giants around the world — and why they stay hidden." } },
      ],
      photo: "fotos/gigante.jpg",
      tagline: { pt: "Trilha das esculturas de Thomas Dambo", en: "The Thomas Dambo sculpture trail" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 10,
    },
    { id: "kronborg", type: "day", region: "arredores",
      name: { pt: "Castelo de Kronborg", en: "Kronborg Castle" },
      desc: { pt: "É o famoso Castelo de Hamlet, de Shakespeare, Patrimônio da UNESCO, à beira do mar, com a Suécia do outro lado.",
              en: "Shakespeare’s famous Hamlet castle, a UNESCO site by the sea, with Sweden on the other side." },
      meeting: "Saímos da sua hospedagem",
      duration: "5h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/kronborg.jpg", lat: 0, lng: 0,
          n: { pt: "O castelo", en: "The castle" },
          d: { pt: "Salões, casamatas e a estátua de Holger, o dinamarquês que acordaria para salvar o país.", en: "Halls, casemates and the statue of Holger, the Dane who would wake to save the country." } },
        { t: '', ph: "fotos/malmo.jpg", lat: 0, lng: 0,
          n: { pt: "A vista do Øresund", en: "The Øresund view" },
          d: { pt: "Do pátio se vê a Suécia, a quatro quilômetros.", en: "From the courtyard you can see Sweden, four kilometres away." } },
        { t: '', ph: "fotos/nyhavn3.jpg", lat: 0, lng: 0,
          n: { pt: "Helsingør", en: "Elsinore" },
          d: { pt: "A cidadezinha portuária, com ruas de paralelepípedo e cafés.", en: "The little harbour town, with cobbled streets and cafés." } },
      ],
      photo: "fotos/kronborg.jpg",
      tagline: { pt: "O castelo de Hamlet, em Helsingør", en: "Hamlet’s castle, in Elsinore" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 11,
    },
    { id: "frederiksborg", type: "day", region: "arredores",
      name: { pt: "Castelo de Frederiksborg", en: "Frederiksborg Castle" },
      desc: { pt: "O maior e mais belo castelo renascentista da Escandinávia, em Hillerød, construído sobre três ilhas num lago.",
              en: "The largest and most beautiful Renaissance castle in Scandinavia, in Hillerød, built across three islands in a lake." },
      meeting: "Saímos da sua hospedagem",
      duration: "5h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/frederiksborg.jpg", lat: 0, lng: 0,
          n: { pt: "O castelo sobre o lago", en: "The castle on the lake" },
          d: { pt: "A fachada que se reflete na água — e a melhor foto da viagem.", en: "The façade reflected in the water — and the best photo of the trip." } },
        { t: '', ph: "fotos/rosenborg-int.jpg", lat: 0, lng: 0,
          n: { pt: "Museu de História Nacional", en: "Museum of National History" },
          d: { pt: "Quinhentos anos de Dinamarca contados em retratos e salões.", en: "Five hundred years of Denmark told in portraits and halls." } },
        { t: '', ph: "fotos/castelo.jpg", lat: 0, lng: 0,
          n: { pt: "Os jardins barrocos", en: "The baroque gardens" },
          d: { pt: "Terraços simétricos, fontes e a vista do castelo lá de cima.", en: "Symmetrical terraces, fountains and the castle seen from above." } },
      ],
      photo: "fotos/frederiksborg.jpg",
      tagline: { pt: "O maior castelo renascentista da Escandinávia", en: "Scandinavia’s largest Renaissance castle" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 12,
    },
    { id: "viking-roskilde", type: "day", region: "arredores",
      name: { pt: "Museu Viking e Catedral de Roskilde", en: "Viking Museum and Roskilde Cathedral" },
      desc: { pt: "Barcos vikings originais do século X, resgatados do fundo do fiorde, e a catedral gótica onde estão enterrados os reis dinamarqueses. Patrimônio da UNESCO.",
              en: "Original 10th-century Viking ships raised from the fjord, and the Gothic cathedral where Danish kings are buried. A UNESCO site." },
      meeting: "Saímos da sua hospedagem",
      duration: "4h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/viking.jpg", lat: 0, lng: 0,
          n: { pt: "Museu dos Navios Vikings", en: "Viking Ship Museum" },
          d: { pt: "Cinco navios afundados de propósito há mil anos para bloquear o fiorde.", en: "Five ships deliberately sunk a thousand years ago to block the fjord." } },
        { t: '', ph: "fotos/museu.jpg", lat: 0, lng: 0,
          n: { pt: "Catedral de Roskilde", en: "Roskilde Cathedral" },
          d: { pt: "Quarenta reis e rainhas enterrados na mesma igreja, do século XII até hoje.", en: "Forty kings and queens buried in the same church, from the 12th century to today." } },
        { t: '', ph: "fotos/malmo.jpg", lat: 0, lng: 0,
          n: { pt: "O fiorde", en: "The fjord" },
          d: { pt: "A água por onde os vikings saíam — e onde hoje se navega em réplicas.", en: "The water the Vikings sailed from — and where replicas sail today." } },
      ],
      photo: "fotos/viking.jpg",
      tagline: { pt: "Navios do século X e o túmulo dos reis", en: "10th-century ships and the kings’ burial place" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 13,
    },
    { id: "forest-tower", type: "day", region: "arredores",
      name: { pt: "Forest Tower", en: "The Forest Tower" },
      desc: { pt: "Impressionante mirante em espiral acima das copas das árvores, em Gisselfeld Klosters Skove. Suba à torre e veja a natureza de cima. Ideal para quem gosta de aventura.",
              en: "An impressive spiral tower above the treetops at Gisselfeld Klosters Skove. Climb it and see nature from above. Ideal for those who like adventure." },
      meeting: "Saímos da sua hospedagem",
      duration: "3h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/gigante.jpg", lat: 0, lng: 0,
          n: { pt: "A passarela na floresta", en: "The forest walkway" },
          d: { pt: "O caminho suspenso que leva até a torre, no meio da mata.", en: "The raised walkway through the woods that leads to the tower." } },
        { t: '', ph: "fotos/foresttower.jpg", lat: 0, lng: 0,
          n: { pt: "A torre em espiral", en: "The spiral tower" },
          d: { pt: "Quarenta e cinco metros de rampa em espiral, sem degrau — dá para subir com carrinho de bebê.", en: "Forty-five metres of spiral ramp, no steps — you can even go up with a pushchair." } },
        { t: '', ph: "fotos/castelo.jpg", lat: 0, lng: 0,
          n: { pt: "A vista lá de cima", en: "The view from the top" },
          d: { pt: "A Zelândia inteira verde, até o mar, num dia claro.", en: "The whole of Zealand in green, all the way to the sea on a clear day." } },
      ],
      photo: "fotos/foresttower.jpg",
      tagline: { pt: "Um mirante em espiral acima das árvores", en: "A spiral lookout above the treetops" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 14,
    },
    { id: "malmo", type: "day", region: "suecia",
      name: { pt: "Malmö, na Suécia", en: "Malmö, in Sweden" },
      desc: { pt: "Cidade costeira moderna e histórica, famosa pela arquitetura, pelos canais e pelas praças. Ligada a Copenhague pela ponte do Øresund — a da série.",
              en: "A modern and historic coastal city, famous for its architecture, canals and squares. Linked to Copenhagen by the Øresund bridge — the one from the TV series." },
      meeting: "Saímos da sua hospedagem",
      duration: "4h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/malmo.jpg", lat: 0, lng: 0,
          n: { pt: "A travessia da ponte", en: "Crossing the bridge" },
          d: { pt: "Oito quilômetros de ponte e quatro de túnel: a engenharia que uniu dois países.", en: "Eight kilometres of bridge and four of tunnel: the engineering that joined two countries." } },
        { t: '', ph: "fotos/nyhavn3.jpg", lat: 0, lng: 0,
          n: { pt: "Centro histórico", en: "The old town" },
          d: { pt: "Stortorget, Lilla Torg e as casas de enxaimel suecas.", en: "Stortorget, Lilla Torg and the Swedish half-timbered houses." } },
        { t: '', ph: "fotos/arquitetura2.jpg", lat: 0, lng: 0,
          n: { pt: "Turning Torso", en: "Turning Torso" },
          d: { pt: "O arranha-céu torcido de Calatrava, símbolo da cidade nova.", en: "Calatrava’s twisting skyscraper, the symbol of the new city." } },
      ],
      photo: "fotos/malmo.jpg",
      tagline: { pt: "Outro país, pela ponte do Øresund", en: "Another country, over the Øresund bridge" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 15,
    },
    { id: "acompanhamento", type: "session", region: "servicos",
      name: { pt: "Acompanhamento integral", en: "Full-day companion" },
      desc: { pt: "Acompanhamento de guia brasileira em tempo integral, cerca de 8 horas. Você relaxa enquanto exploramos a cidade no seu ritmo. Ideal para compras, personalização total e conforto.",
              en: "A Brazilian guide with you full time, around 8 hours. You relax while we explore the city at your pace. Ideal for shopping, full personalisation and comfort." },
      meeting: "Saímos da sua hospedagem",
      duration: "8h", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/nyhavn.jpg", lat: 0, lng: 0,
          n: { pt: "Começamos na sua hospedagem", en: "We start at your accommodation" },
          d: { pt: "Sem correria e sem ponto de encontro: eu chego até você.", en: "No rush and no meeting point: I come to you." } },
        { t: '', ph: "fotos/mapa.jpg", lat: 0, lng: 0,
          n: { pt: "O dia do seu jeito", en: "The day your way" },
          d: { pt: "Compras, museus, café, um canto tranquilo — a gente decide junto no caminho.", en: "Shopping, museums, coffee, a quiet corner — we decide together along the way." } },
        { t: '', ph: "fotos/nyhavn2.jpg", lat: 0, lng: 0,
          n: { pt: "Até o fim da tarde", en: "Until late afternoon" },
          d: { pt: "Cerca de oito horas, com a tranquilidade de ter alguém com você o tempo todo.", en: "Around eight hours, with the comfort of having someone with you the whole time." } },
      ],
      photo: "fotos/mari.jpg",
      tagline: { pt: "Um dia inteiro comigo, no seu ritmo", en: "A whole day with me, at your pace" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 16,
    },
    { id: "transfer", type: "transfer", region: "servicos",
      name: { pt: "Transfer e receptivo", en: "Transfers and airport pick-up" },
      desc: { pt: "Receptivo no aeroporto, hotéis e atrações com guia brasileira: aeroporto → hotel na chegada, hotel → aeroporto na volta, traslados entre atrações e carro à disposição por algumas horas. Preços tabelados e veículos modernos e confortáveis. Carro, van ou transporte público — você escolhe.",
              en: "Airport, hotel and attraction transfers with a Brazilian guide. Fixed prices and modern, comfortable vehicles. Car, van or public transport — you choose." },
      meeting: "Saímos da sua hospedagem",
      duration: "Conforme o trecho", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/van.jpg", lat: 0, lng: 0,
          n: { pt: "Recepção no aeroporto", en: "Airport welcome" },
          d: { pt: "Espero você no desembarque com o nome na plaquinha, e já explico como a cidade funciona.", en: "I wait at arrivals with your name on a sign and explain how the city works." } },
        { t: '', ph: "fotos/mapa.jpg", lat: 0, lng: 0,
          n: { pt: "Do seu jeito", en: "Your way" },
          d: { pt: "Carro, van ou transporte público, com cadeirinha para criança se precisar.", en: "Car, van or public transport, with a child seat if you need one." } },
        { t: '', ph: "fotos/nyhavn3.jpg", lat: 0, lng: 0,
          n: { pt: "Chegada tranquila", en: "An easy arrival" },
          d: { pt: "Você chega ao hotel sabendo onde comer, como pagar e o que fazer no primeiro dia.", en: "You get to the hotel knowing where to eat, how to pay and what to do on day one." } },
      ],
      photo: "fotos/van.jpg",
      tagline: { pt: "Do aeroporto ao hotel, com guia brasileira", en: "From the airport to your hotel, with a Brazilian guide" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 17,
    },
    { id: "assessoria", type: "session", region: "servicos",
      name: { pt: "Roteiro personalizado e assessoria", en: "Custom itinerary and travel support" },
      desc: { pt: "Ajudamos você a planejar a viagem na Dinamarca do seu jeitinho, conforme seus interesses, preferências e orçamento: reservas e ingressos, restaurantes e suporte 24/7 da equipe local antes e durante a viagem.",
              en: "We help you plan your trip to Denmark your way, based on your interests, preferences and budget: bookings and tickets, restaurants and 24/7 support from the local team before and during your trip." },
      meeting: "Saímos da sua hospedagem",
      duration: "Flexível", distance: '', effort: 'easy',
      includes: { pt: ["Guia brasileira em português"], en: ["Brazilian guide, in Portuguese"] },
      notIncludes: { pt: ["Ingressos das atrações", "Refeições"], en: ["Attraction tickets", "Meals"] },
      stops: [
        { t: '', ph: "fotos/mari.jpg", lat: 0, lng: 0,
          n: { pt: "A conversa inicial", en: "The first conversation" },
          d: { pt: "Quero saber quanto tempo você tem, o que te interessa e com quem você viaja.", en: "I want to know how long you have, what interests you and who travels with you." } },
        { t: '', ph: "fotos/mapa.jpg", lat: 0, lng: 0,
          n: { pt: "O roteiro no papel", en: "The itinerary" },
          d: { pt: "Dia a dia, com horários realistas, e as reservas feitas por nós.", en: "Day by day, with realistic timings, and the bookings made by us." } },
        { t: '', ph: "fotos/nyhavn.jpg", lat: 0, lng: 0,
          n: { pt: "Suporte 24/7", en: "Support 24/7" },
          d: { pt: "Durante a viagem, qualquer coisa que aconteça, você fala com a gente.", en: "During the trip, whatever happens, you talk to us." } },
      ],
      photo: "fotos/mapa.jpg",
      tagline: { pt: "Sua viagem planejada do seu jeitinho", en: "Your trip planned your way" },
      price: 0, priceMode: 'pp',
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 18,
    },
  ];


  /* Datas: por enquanto todo dia, para ela navegar. Ela ajusta no editor,
     clicando nos dias de cada passeio. */
  const HORA = { walk: '10:00', carro: '10:00', bike: '10:00', day: '09:00', transfer: '08:00', session: '09:00' };
  db.rules = db.tours.map((x, i) => ({
    id: 'r' + (i + 1), tourId: x.id, weekdays: [0, 1, 2, 3, 4, 5, 6],
    time: HORA[x.type] || '10:00', capacity: 12, from: isoToday(), until: addDays(isoToday(), 180),
  }));

  db.coupons = [
    { code: 'VOLTA10', pct: 10, until: '2026-12-31', oncePerPerson: true, uses: [] },
    { code: 'AMIGO15', pct: 15, until: '2026-12-31', oncePerPerson: true, uses: [] },
  ];

  /* ---- clientes e reservas de exemplo (histórico crível) ---- */
  const people = [
    ['Camille Bernard',  'camille.bernard@email.fr', '+33 6 21 44 55 10', 'camille.bern',  'site'],
    ['Sarah Whitfield',  'sarah.w@email.co.uk',      '+44 7700 900431',   '',              'instagram'],
    ['Markus Klein',     'm.klein@email.de',         '+49 176 5544 221',  'markus.k',      'site'],
    ['Marcos Duarte',    'marcos.duarte@email.com',  '+55 11 98877 6655', 'marcos.duarte', 'friend'],
    ['Élodie Rousseau',  'elodie.r@email.fr',        '+33 6 88 12 34 56', '',              'instagram'],
    ['Hiroshi Mori',     'h.mori@email.jp',          '+81 90 1234 5678',  '',              'agency'],
    ['Ana Sofía Rivas',  'anasofia@email.es',        '+34 611 223 344',   'anasofia.r',    'whatsapp'],
    ['Beatriz Nogueira', 'bia.nog@email.com',        '+55 21 99123 4567', 'bia.nog',       'friend'],
  ];
  const plan = [
    /* [pessoa, passeio, dias atrás, pax, quitado?] */
    [0, 'walking-tour', 42, 2, true],  [1, 'kronborg', 35, 2, true],  [2, 'frederiksborg', 28, 4, true],
    [3, 'christiania', 21, 2, true],   [4, 'walking-tour', 18, 3, true], [0, 'malmo', 14, 2, true],
    [5, 'carlsberg', 10, 2, true],     [6, 'bike-tour', 7, 2, true],  [7, 'walking-tour', 4, 4, true],
    [1, 'viking-roskilde', -3, 2, false], [3, 'acompanhamento', -6, 2, false], [4, 'gigantes', -9, 1, true],
    [7, 'tour-panoramico', -12, 3, false],
  ];
  let n = 0;
  for (const [pi, tourId, back, pax, settled] of plan) {
    const [name, email, whats, insta, origin] = people[pi];
    const x = db.tours.find(z => z.id === tourId);
    const date = addDays(isoToday(), -back);
    const rule = db.rules.find(r => r.tourId === tourId);
    const time = rule ? rule.time : '10:00';
    const total = x.priceMode === 'session' ? x.price : x.price * pax;
    const created = addDays(date, -(7 + (n % 9)));
    const payments = [];
    if (x.payPolicy === 'split') {
      payments.push({ amount: Math.round(total / 2), date: created, method: 'card', kind: 'deposit' });
      if (settled) payments.push({ amount: total - Math.round(total / 2), date: addDays(date, -1), method: 'card', kind: 'balance' });
    } else {
      payments.push({ amount: total, date: created, method: n % 3 === 0 ? 'applepay' : 'card', kind: 'full' });
    }
    db.bookings.push({
      id: 'demo' + (++n), code: PREFIXO + '-' + (2100 + n * 37 % 7800),
      tourId, date, time, name, email, whats, insta, pax, total,
      coupon: null, discount: 0, policy: x.payPolicy, payments,
      consent: (n % 3 !== 0)
        ? { ok: true, at: created + 'T10:00:00.000Z', src: 'checkout' }
        : { ok: false },
      status: 'confirmed', createdAt: created + 'T10:00:00.000Z', origin,
    });
  }
  /* interesse de exemplo: para cada reserva, algumas visitas e alguns "quase"
     no mesmo dia. É demonstração — no app de verdade isto vem do uso real. */
  const porPasseio = {};
  for (const b of db.bookings) (porPasseio[b.tourId] = porPasseio[b.tourId] || []).push(b.createdAt.slice(0, 10));
  let k = 0;
  for (const x of db.tours) {
    const datas = porPasseio[x.id] || [];
    const v = {}, q = {};
    for (const d of datas) {
      const vistas = 9 + (++k * 7) % 14;          /* 9 a 22 visitas por reserva */
      v[d] = (v[d] || 0) + vistas;
      q[d] = (q[d] || 0) + 2 + (k % 4);
    }
    /* passeio sem reserva nenhuma também é visto — é o caso mais útil do relatório */
    if (!datas.length) {
      const d = addDays(isoToday(), -(3 + (++k % 9)));
      v[d] = 12 + (k * 5) % 20; q[d] = 1 + (k % 3);
    }
    db.interesse[x.id] = { visitas: v, quase: q };
  }
  /* francês, italiano, alemão e espanhol dos passeios de exemplo (idiomas.js) */
  return typeof traduzSemente === 'function' ? traduzSemente(db) : db;
}

/* apaga tudo — o guia começa do zero */
function clearAll() {
  DB = _blank();
  DB.demo = false;
  save();
}
function restoreDemo() { DB = _seed(); save(); }

/* ---------- migração de ajustes ----------
   Quem já usa o app tem um DB salvo — e a nuvem também. Sem isto,
   todo campo novo que a gente criar nasce vazio para eles e a tela
   quebra em silêncio. Preenche só o que falta; nunca sobrescreve. */
function fillSettings(s) {
  const d = _blank().settings;
  s = s || {};
  for (const k of Object.keys(d)) {
    if (s[k] === undefined || s[k] === null || s[k] === '') s[k] = d[k];
  }
  /* bio é objeto: garante os dois idiomas */
  if (typeof s.bio !== 'object' || !s.bio) s.bio = d.bio;
  else { if (!s.bio.pt) s.bio.pt = d.bio.pt; if (!s.bio.en) s.bio.en = d.bio.en; }
  return s;
}

let DB = null;
function load() {
  try { DB = JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch (e) { DB = null; }
  /* O app esta em producao. Aparelho novo (ou navegador limpo) tem que
     comecar VAZIO e receber o que esta na nuvem — nunca publicar um catalogo
     inventado por cima do dela. Antes isto semeava a demonstracao e o save()
     empurrava para a nuvem: bastava ela instalar no celular para os passeios
     reais virarem os ficticios. A demonstracao so volta pelo botao no ADM. */
  if (!DB || !DB.tours) {
    /* Sem nuvem configurada (config.js vazio) o app e um prototipo: nasce com
       os passeios de exemplo, e nao existe nuvem para onde empurra-los.
       Com nuvem, aparelho novo comeca VAZIO e recebe o que esta la. */
    DB = temNuvem() ? _blank() : _seed();
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
  }
  DB.settings = fillSettings(DB.settings);
  return DB;
}
function save() {
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
  if (typeof cloudPushState === 'function') cloudPushState();
}
function resetDemo() { DB = _seed(); save(); }

const uid = () => Math.random().toString(36).slice(2, 9);
const bookCode = () => PREFIXO + '-' + Math.floor(1000 + Math.random() * 9000);

/* ---------- passeios ---------- */
const Tours = {
  all()      { return [...DB.tours].sort((a, b) => a.order - b.order); },
  live()     { return Tours.all().filter(t => t.status !== 'draft'); },
  get(id)    { return DB.tours.find(t => t.id === id); },
  create(t)  { t.id = uid(); t.order = DB.tours.length + 1; DB.tours.push(t); save(); return t; },
  update(id, patch) { Object.assign(Tours.get(id), patch); save(); },
  duplicate(id) {
    const src = Tours.get(id); if (!src) return null;
    const cp = JSON.parse(JSON.stringify(src));
    cp.id = uid(); cp.order = DB.tours.length + 1; cp.status = 'draft';
    cp.name = { pt: src.name.pt + ' (cópia)', en: src.name.en + ' (copy)' };
    DB.tours.push(cp); save(); return cp;
  },
  remove(id) {
    DB.tours = DB.tours.filter(t => t.id !== id);
    DB.rules = DB.rules.filter(r => r.tourId !== id);
    DB.departures = DB.departures.filter(d => d.tourId !== id);
    save();
  },
  futureBookings(id) {
    const today = isoToday();
    return DB.bookings.filter(b => b.tourId === id && b.status === 'confirmed' && b.date >= today);
  },
};

/* ---------- calendário ---------- */
function isoToday() { return new Date().toISOString().slice(0, 10); }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

const Cal = {
  rulesFor(tourId) { return DB.rules.filter(r => r.tourId === tourId); },
  addRule(r) { r.id = uid(); DB.rules.push(r); save(); return r; },
  removeRule(id) { DB.rules = DB.rules.filter(r => r.id !== id); save(); },
  addDeparture(d) { d.id = uid(); DB.departures.push(d); save(); return d; },
  removeDeparture(id) { DB.departures = DB.departures.filter(d => d.id !== id); save(); },
  addBlock(b) { b.id = uid(); DB.blocks.push(b); save(); return b; },
  removeBlock(id) { DB.blocks = DB.blocks.filter(x => x.id !== id); save(); },
  blocked(date) { return DB.blocks.some(b => date >= b.from && date <= b.until); },

  /* todas as saídas de um passeio num intervalo: regras expandidas + avulsas − bloqueios */
  departures(tourId, fromIso, toIso) {
    const out = [];
    for (const r of Cal.rulesFor(tourId)) {
      let d = fromIso < r.from ? r.from : fromIso;
      const end = toIso < r.until ? toIso : r.until;
      while (d <= end) {
        const wd = new Date(d + 'T12:00:00').getDay();
        if (r.weekdays.includes(wd) && !Cal.blocked(d)) {
          out.push({ tourId, date: d, time: r.time, capacity: r.capacity, ruleId: r.id });
        }
        d = addDays(d, 1);
      }
    }
    for (const dep of DB.departures.filter(x => x.tourId === tourId)) {
      if (dep.date >= fromIso && dep.date <= toIso && !Cal.blocked(dep.date)) out.push(dep);
    }
    out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return out;
  },

  seatsLeft(tourId, date, time, capacity) {
    /* logada: conta pelas reservas. Visitante: usa a contagem pública,
       que não expõe nome nem telefone de ninguém. */
    const local = DB.bookings
      .filter(b => b.tourId === tourId && b.date === date && b.time === time && b.status === 'confirmed')
      .reduce((s, b) => s + b.pax, 0);
    let taken = local;
    if (Array.isArray(DB.seatCounts) && DB.seatCounts.length) {
      const row = DB.seatCounts.find(c => c.tourId === tourId && c.date === date && c.time === time);
      taken = Math.max(local, row ? row.pax : 0);
    }
    return Math.max(0, capacity - taken);
  },
};

/* ---------- cupons ---------- */
const Coupons = {
  all() { return DB.coupons; },
  create(c) { DB.coupons.push(c); save(); },
  remove(code) { DB.coupons = DB.coupons.filter(c => c.code !== code); save(); },
  validate(code, email) {
    const c = DB.coupons.find(x => x.code.toUpperCase() === String(code).toUpperCase());
    if (!c) return { ok: false, reason: 'notfound' };
    if (c.until && isoToday() > c.until) return { ok: false, reason: 'expired' };
    if (c.oncePerPerson && email && c.uses.includes(email)) return { ok: false, reason: 'used' };
    return { ok: true, coupon: c };
  },
  consume(code, email) {
    const c = DB.coupons.find(x => x.code === code);
    if (c && email && !c.uses.includes(email)) { c.uses.push(email); save(); }
  },
};

/* ---------- reservas e pagamentos ---------- */
const Bookings = {
  all() { return [...DB.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  get(id) { return DB.bookings.find(b => b.id === id); },
  byCode(code) { return DB.bookings.find(b => b.code === code); },

  create({ tourId, date, time, name, email, whats, insta, pax, coupon, policy, origin, consent }) {
    const tour = Tours.get(tourId);
    /* Tem que ser o MESMO calculo que a tela mostrou. tour.price * pax ignora
       o preco escalonado (195 para as 3 primeiras, 225 depois) e gravava a
       reserva abaixo do que a pessoa acabou de ler. */
    const base = Bookings.precoDe(tour, tourId, date, time, pax).total;
    let discount = 0, couponCode = null;
    if (coupon) {
      const v = Coupons.validate(coupon, email);
      if (v.ok) { discount = Math.round(base * v.coupon.pct) / 100 * 1; discount = Math.round(base * v.coupon.pct / 100); couponCode = v.coupon.code; }
    }
    const total = base - discount;
    const b = {
      id: uid(), code: bookCode(), tourId, date, time,
      name, email, whats, insta: insta || '', pax, total,
      coupon: couponCode, discount, policy,
      consent: consent ? { ok: true, at: new Date().toISOString(), src: 'checkout' } : { ok: false },
      payments: [], status: 'confirmed',
      createdAt: new Date().toISOString(), origin: origin || 'site',
      /* Em que idioma ele reservou. Sem isto o e-mail de recibo sai em
         portugues para um frances que leu a tela inteira em ingles. */
      lang: (typeof LANG !== 'undefined' && LANG) || 'pt',
    };
    /* Aqui havia um pagamento inventado: toda reserva nascia marcada como paga
       no cartao. O painel, o caixa e os relatorios contavam dinheiro que nunca
       entrou. A reserva nasce sem pagamento nenhum — quem registra e o guia,
       quando o dinheiro cai de verdade. E aqui que o Stripe entra um dia. */
    DB.bookings.push(b);
    if (couponCode) Coupons.consume(couponCode, email);
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudPushBooking === 'function') cloudPushBooking(b);
    if (couponCode && typeof cloudPushState === 'function') cloudPushState();
    return b;
  },

  /* Reserva fechada fora do app (WhatsApp, Instagram, na rua). O guia
     informa o que combinou e quanto ja recebeu — nada e inventado aqui. */
  /* Ela aperta "avisar cliente" quando o dinheiro caiu de verdade. Isto so
     MARCA a reserva; quem manda o e-mail e o robo, de meia em meia hora.
     O e-mail nao pode sair daqui: mandar exige a chave do Resend, e chave
     dentro do navegador fica publica para qualquer um.

     Nao ha "desmarcar": uma vez que o e-mail saiu, ele saiu. Deixar
     desmarcar so criaria um botao que promete desfazer o que nao volta. */
  confirmarCliente(id) {
    const b = Bookings.get(id);
    if (!b || b.clienteConfirmado) return null;
    b.clienteConfirmado = { em: new Date().toISOString() };
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudUpdateBooking === 'function') cloudUpdateBooking(b);
    return b;
  },

  criarManual({ tourId, date, time, name, whats, email, pax, total, recebido, metodo }) {
    const b = {
      id: uid(), code: bookCode(), tourId, date, time,
      name, email: email || '', whats: whats || '', insta: '',
      pax: +pax || 1, total: Math.max(0, +total || 0),
      coupon: null, discount: 0, policy: 'full',
      consent: { ok: false },
      payments: [], status: 'confirmed',
      createdAt: new Date().toISOString(), origin: 'manual',
    };
    const val = Math.max(0, Math.min(+recebido || 0, b.total));
    if (val > 0) {
      b.payments.push({ amount: val, date: isoToday(), method: metodo || 'other',
                        kind: val >= b.total ? 'full' : 'deposit' });
    }
    DB.bookings.push(b);
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudPushBooking === 'function') cloudPushBooking(b);
    return b;
  },

  paid(b)   { return b.payments.reduce((s, p) => s + p.amount, 0); },
  /* ---------- preco escalonado ----------
     O guia vende as primeiras vagas de cada data mais barato: 195 para
     os 3 primeiros, 225 depois. O calculo e por DATA, nao por reserva —
     quem chega quando ja ha 2 vendidos leva 1 barato e o resto caro. */
  precoDe(x, tourId, date, time, pax) {
    const cheio = +x.price || 0;
    const tarde = +x.priceLate || 0;
    const vagasBaratas = +x.earlySeats || 0;
    if (x.priceMode === 'session') return { total: cheio, linhas: [{ qtd: 1, valor: cheio }] };
    if (!tarde || !vagasBaratas) return { total: cheio * pax, linhas: [{ qtd: pax, valor: cheio }] };

    const jaVendidos = Bookings.vendidosEm(tourId, date, time);
    const baratas = Math.max(0, Math.min(pax, vagasBaratas - jaVendidos));
    const caras = pax - baratas;
    const linhas = [];
    if (baratas) linhas.push({ qtd: baratas, valor: cheio });
    if (caras)   linhas.push({ qtd: caras,   valor: tarde });
    return { total: baratas * cheio + caras * tarde, linhas, baratasRestantes: Math.max(0, vagasBaratas - jaVendidos) };
  },

  /* lugares ja vendidos numa saida — base do preco escalonado e das vagas */
  vendidosEm(tourId, date, time) {
    const local = DB.bookings
      .filter(b => b.tourId === tourId && b.date === date && b.time === time && b.status !== 'cancelled')
      .reduce((s, b) => s + b.pax, 0);
    let n = local;
    if (Array.isArray(DB.seatCounts) && DB.seatCounts.length) {
      const row = DB.seatCounts.find(c => c.tourId === tourId && c.date === date && c.time === time);
      if (row) n = Math.max(local, +row.pax);
    }
    return n;
  },
  due(b)    { return Math.max(0, b.total - Bookings.paid(b)); },
  /* Cada passeio tem seu prazo. O de Natal cobra o saldo 30 dias antes,
     nao na vespera — usar um numero fixo aqui cobraria tarde demais. */
  dueDate(b){
    const x = Tours.get(b.tourId);
    const dias = (x && +x.balanceDays) || 1;
    return addDays(b.date, -dias);
  },
  payBalance(id, method) {
    const b = Bookings.get(id); if (!b) return;
    const due = Bookings.due(b); if (due <= 0) return;
    b.payments.push({ amount: due, date: isoToday(), method: method || 'card', kind: 'balance' });
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudUpdateBooking === 'function') cloudUpdateBooking(b);
  },
  cancel(id) { const b = Bookings.get(id); if (b) { b.status = 'cancelled';
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    if (typeof cloudUpdateBooking === 'function') cloudUpdateBooking(b); } },

  /* extrato: uma linha por PAGAMENTO (é o que o contador quer) */
  statement(fromIso, toIso) {
    const rows = [];
    for (const b of DB.bookings) {
      for (const p of b.payments) {
        if (p.date >= fromIso && p.date <= toIso) {
          rows.push({ date: p.date, client: b.name, tourId: b.tourId,
                      kind: p.kind, method: p.method, amount: p.amount, code: b.code });
        }
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  },
};

load();

/* ---------- clientes (derivados das reservas) ---------- */
const Clients = {
  all() {
    const map = new Map();
    for (const b of DB.bookings) {
      if (b.status === 'cancelled') continue;
      const key = (b.email || b.whats || b.name).toLowerCase();
      const c = map.get(key) || { name: b.name, email: b.email, whats: b.whats, insta: b.insta,
                                  tours: 0, spent: 0, last: '', origins: new Set(), consent: false, consentAt: '' };
      c.tours += 1;
      c.spent += Bookings.paid(b);
      if (b.date > c.last) c.last = b.date;
      if (b.origin) c.origins.add(b.origin);
      if (b.consent && b.consent.ok) { c.consent = true; c.consentAt = b.consent.at; }
      if (!c.insta && b.insta) c.insta = b.insta;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.spent - a.spent);
  },
};

/* ---------- relatórios ---------- */
/* conta uma visita ou um "quase reservou" — só no aparelho de quem olha;
   no app de verdade isto sobe junto com o resto dos dados */
const Interesse = {
  conta(tourId, tipo) {
    if (!tourId || (tipo !== 'visitas' && tipo !== 'quase')) return;
    if (!DB.interesse) DB.interesse = {};
    const i = DB.interesse[tourId] = DB.interesse[tourId] || {};
    const c = i[tipo] = i[tipo] || {};
    const hoje = isoToday();
    c[hoje] = (+c[hoje] || 0) + 1;
    /* guarda no máximo 120 dias por passeio, para não crescer sem fim */
    const dias = Object.keys(c).sort();
    if (dias.length > 120) for (const d of dias.slice(0, dias.length - 120)) delete c[d];
    save();
  },
};

const Reports = {
  /* receita por mês do ano corrente */
  byMonth(year) {
    /* "Recebido" tem que ser dinheiro que ja entrou. Sem este corte, um saldo
       agendado para amanha entrava no grafico como recebido hoje — e o total
       do topo (que so conta ate hoje) discordava do grafico na mesma tela. */
    const hoje = isoToday();
    const out = Array(12).fill(0);
    for (const b of DB.bookings) {
      for (const p of b.payments) {
        if (!p.date || p.date > hoje) continue;
        if (p.date.slice(0, 4) === String(year)) out[+p.date.slice(5, 7) - 1] += p.amount;
      }
    }
    return out;
  },
  /* receita das últimas 8 semanas */
  byWeek(weeks = 8) {
    const out = [];
    let end = isoToday();
    for (let i = 0; i < weeks; i++) {
      const start = addDays(end, -6);
      let sum = 0;
      for (const b of DB.bookings) {
        for (const p of b.payments) if (p.date >= start && p.date <= end) sum += p.amount;
      }
      out.unshift({ label: start.slice(8) + '/' + start.slice(5, 7), value: sum });
      end = addDays(start, -1);
    }
    return out;
  },
  /* interesse por passeio: visitas, quem chegou a escolher data, reservas e conversão */
  interesse(fromIso, toIso) {
    const soma = (o) => Object.entries(o || {}).reduce((n, [d, v]) => n + (d >= fromIso && d <= toIso ? (+v || 0) : 0), 0);
    const linhas = Tours.all().map(x => {
      const i = (DB.interesse || {})[x.id] || {};
      const bs = DB.bookings.filter(b => b.tourId === x.id && b.status !== 'cancelled' && b.date >= fromIso && b.date <= toIso);
      const visitas = soma(i.visitas), quase = soma(i.quase), reservas = bs.length;
      return { tour: x, visitas, quase, reservas,
               pax: bs.reduce((n, b) => n + b.pax, 0),
               receita: bs.reduce((n, b) => n + Bookings.paid(b), 0),
               conv: visitas ? Math.round(reservas / visitas * 100) : 0 };
    }).filter(r => r.visitas > 0 || r.reservas > 0);
    return linhas.sort((a, b) => b.visitas - a.visitas || b.reservas - a.reservas);
  },
  /* desempenho por passeio no intervalo */
  byTour(fromIso, toIso) {
    return Tours.all().map(x => {
      const bs = DB.bookings.filter(b => b.tourId === x.id && b.status !== 'cancelled'
                                    && b.date >= fromIso && b.date <= toIso);
      const deps = new Set(bs.map(b => b.date + b.time));
      const pax = bs.reduce((s, b) => s + b.pax, 0);
      const revenue = bs.reduce((s, b) => s + Bookings.paid(b), 0);
      const seats = deps.size * (x.max || 1);
      return { tour: x, departures: deps.size, pax, revenue,
               occupancy: seats ? Math.round(pax / seats * 100) : 0 };
    }).filter(r => r.departures > 0 || r.revenue > 0);
  },
  /* de onde vieram as reservas */
  byOrigin(fromIso, toIso) {
    const map = {};
    let total = 0;
    for (const b of DB.bookings) {
      if (b.status === 'cancelled' || b.date < fromIso || b.date > toIso) continue;
      const o = b.origin || 'site';
      map[o] = (map[o] || 0) + 1; total++;
    }
    return Object.entries(map)
      .map(([k, n]) => ({ origin: k, n, pct: total ? Math.round(n / total * 100) : 0 }))
      .sort((a, b) => b.n - a.n);
  },
  totals(fromIso, toIso) {
    const bs = DB.bookings.filter(b => b.status !== 'cancelled' && b.date >= fromIso && b.date <= toIso);
    const revenue = DB.bookings.reduce((s, b) =>
      s + b.payments.filter(p => p.date >= fromIso && p.date <= toIso).reduce((t, p) => t + p.amount, 0), 0);
    const pax = bs.reduce((s, b) => s + b.pax, 0);
    const deps = new Set(bs.map(b => b.tourId + b.date + b.time)).size;
    const due = bs.reduce((s, b) => s + Bookings.due(b), 0);
    return { revenue, pax, deps, bookings: bs.length, due,
             ticket: bs.length ? Math.round(revenue / pax || 0) : 0 };
  },
};
