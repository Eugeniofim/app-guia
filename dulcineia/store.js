/* =====================================================
   APP-GUIA — camada de dados
   Persistência: localStorage. A troca para Supabase é
   trocar as funções deste arquivo — as telas não mudam.
   ===================================================== */
'use strict';

const DB_KEY = 'berlim_db_v1';

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
           pixKey: '', pixName: '', pixCity: '', iban: '', ibanName: '', payNote: '',
           /* para onde vai o aviso de reserva nova. Vazio = ela ainda nao
              preencheu; quem manda o e-mail e o robo, fora do navegador. */
           admEmail: '',
           /* e-mail PARA O CLIENTE. Nasce desligado de proposito: e-mail
              indo para cliente de verdade so depois que ela ler os textos e
              decidir ligar. */
           avisarClientes: true,    /* Conexao Berlim: recibo, confirmacao e vespera saem pela funcao cofre */
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

  db.tours = [
    { id: "berlim-historico", type: "walk", region: "berlim",
      name: {"pt": "Berlim Histórico", "en": "Historic Berlin", "fr": "Berlin historique", "it": "Berlino storica", "de": "Historisches Berlin", "es": "Berlín histórico"},
      tagline: { pt: "Do Reichstag ao Checkpoint Charlie: o século XX a pé", en: "From the Reichstag to Checkpoint Charlie: the 20th century on foot" },
      desc: { pt: "Uma caminhada pelo centro de Berlim para entender como a cidade foi dividida, destruída e reconstruída. Do Parlamento ao Portão de Brandemburgo, do Memorial aos Judeus Mortos da Europa ao antigo posto de fronteira dos Aliados — cada parada é um capítulo do século XX, contado no lugar onde aconteceu.",
              en: "A walk through central Berlin to understand how the city was divided, destroyed and rebuilt. From the Parliament to the Brandenburg Gate, from the Memorial to the Murdered Jews of Europe to the old Allied border crossing — each stop is a chapter of the 20th century, told where it happened." },
      meeting: {"pt": "No seu hotel em Berlim", "en": "At your hotel in Berlin", "fr": "À votre hôtel à Berlin", "it": "Al vostro hotel a Berlino", "de": "In Ihrem Hotel in Berlin", "es": "En su hotel en Berlín"}, pickup: true, privativo: true,
      duration: '', distance: '', effort: 'easy',
      includes: { pt: ["Guia em português", "Grupo privativo", "Saída do seu hotel"], en: ["Guide in Portuguese", "Private group", "Departure from your hotel"] },
      notIncludes: { pt: [], en: [] },
      stops: [
        { t: '', ph: "fotos/reichstag.jpg", lat: 0, lng: 0, cr: "Foto: JoachimKohler-HB · CC BY-SA 4.0 · Wikimedia Commons",
          n: { pt: "O Reichstag e a cúpula", en: "The Reichstag and its dome" },
          d: { pt: "Incendiado em 1933, bombardeado em 1945 e reaberto em 1999 com a cúpula de vidro de Norman Foster: o Parlamento que virou símbolo de transparência.", en: "Set on fire in 1933, bombed in 1945 and reopened in 1999 with Norman Foster’s glass dome: the Parliament that became a symbol of transparency." } },
        { t: '', ph: "fotos/portao.jpg", lat: 0, lng: 0, cr: "Foto: Thomas Wolf, www.foto-tw.de · CC BY-SA 3.0 · Wikimedia Commons",
          n: { pt: "Portão de Brandemburgo", en: "Brandenburg Gate" },
          d: { pt: "O símbolo de Berlim há mais de dois séculos. Ficou preso na faixa da fronteira durante o Muro e virou o palco da reunificação.", en: "Berlin’s symbol for over two centuries. It was trapped in the border strip while the Wall stood, and became the stage of reunification." } },
        { t: '', ph: "fotos/memorial-holocausto.jpg", lat: 0, lng: 0, cr: "Foto: Ad Meskens · CC BY-SA 4.0 · Wikimedia Commons",
          n: { pt: "Memorial aos Judeus Mortos da Europa", en: "Memorial to the Murdered Jews of Europe" },
          d: { pt: "2.711 blocos de concreto num terreno ondulado, a poucos passos do Portão. Um memorial que se entende caminhando por dentro dele.", en: "2,711 concrete slabs on undulating ground, a few steps from the Gate. A memorial you understand by walking through it." } },
        { t: '', ph: "fotos/gendarmenmarkt.jpg", lat: 0, lng: 0, cr: "Foto: Ansgar Koreng · CC BY 3.0 de · Wikimedia Commons",
          n: { pt: "Gendarmenmarkt", en: "Gendarmenmarkt" },
          d: { pt: "A praça mais bonita de Berlim, com as catedrais Francesa e Alemã e o Konzerthaus — reconstruídos depois da guerra, pedra por pedra.", en: "Berlin’s most beautiful square, with the French and German cathedrals and the Konzerthaus — rebuilt after the war, stone by stone." } },
        { t: '', ph: "fotos/checkpoint.jpg", lat: 0, lng: 0, cr: "Foto: Gzen92 · CC BY-SA 4.0 · Wikimedia Commons",
          n: { pt: "Checkpoint Charlie", en: "Checkpoint Charlie" },
          d: { pt: "O posto de fronteira entre os setores americano e soviético, onde tanques se encararam em outubro de 1961.", en: "The crossing point between the American and Soviet sectors, where tanks faced each other in October 1961." } },
      ],
      photo: "fotos/portao.jpg", photoCr: "Foto: Thomas Wolf, www.foto-tw.de · CC BY-SA 3.0 · Wikimedia Commons",
      price: 0, priceMode: 'session', min: 1, max: 20,
      payPolicy: 'split', status: 'live', order: 1 },
    { id: "bairro-judeu", type: "walk", region: "berlim",
      name: {"pt": "Bairro Judeu", "en": "Jewish Quarter", "fr": "Quartier juif", "it": "Quartiere ebraico", "de": "Jüdisches Viertel", "es": "Barrio judío"},
      tagline: { pt: "Scheunenviertel: memória, perda e renascimento", en: "Scheunenviertel: memory, loss and rebirth" },
      desc: { pt: "O Scheunenviertel, em Mitte, foi o coração da vida judaica de Berlim. Entre pátios, a sinagoga e memoriais discretos no chão, a visita conta quem viveu aqui, o que se perdeu no Holocausto e como o bairro voltou a ter vida.",
              en: "The Scheunenviertel, in Mitte, was the heart of Jewish life in Berlin. Among courtyards, the synagogue and quiet memorials set into the pavement, the tour tells who lived here, what was lost in the Holocaust and how the quarter came back to life." },
      meeting: {"pt": "No seu hotel em Berlim", "en": "At your hotel in Berlin", "fr": "À votre hôtel à Berlin", "it": "Al vostro hotel a Berlino", "de": "In Ihrem Hotel in Berlin", "es": "En su hotel en Berlín"}, pickup: true, privativo: true,
      duration: '', distance: '', effort: 'easy',
      includes: { pt: ["Guia em português", "Grupo privativo", "Saída do seu hotel"], en: ["Guide in Portuguese", "Private group", "Departure from your hotel"] },
      notIncludes: { pt: [], en: [] },
      stops: [
        { t: '', ph: "fotos/sinagoga-cupulas.jpg", lat: 0, lng: 0, cr: "Foto: Carola Opitz · CC BY-SA 4.0 · Wikimedia Commons",
          n: { pt: "A Nova Sinagoga", en: "The New Synagogue" },
          d: { pt: "Inaugurada em 1866, com a cúpula dourada que se vê de longe na Oranienburger Straße. Escapou do incêndio na Noite dos Cristais, foi destruída na guerra e hoje abriga o Centrum Judaicum.", en: "Opened in 1866, with the golden dome you see from afar on Oranienburger Straße. It escaped the fire on Kristallnacht, was destroyed in the war and now houses the Centrum Judaicum." } },
        { t: '', ph: "fotos/grosse-hamburger.jpg", lat: 0, lng: 0, cr: "Foto: Z thomas · CC BY 3.0 · Wikimedia Commons",
          n: { pt: "O cemitério da Große Hamburger Straße", en: "The Große Hamburger Straße cemetery" },
          d: { pt: "O cemitério judaico mais antigo de Berlim, usado de 1672 a 1827 e destruído pela Gestapo em 1943. Moses Mendelssohn foi enterrado aqui.", en: "Berlin’s oldest Jewish cemetery, used from 1672 to 1827 and destroyed by the Gestapo in 1943. Moses Mendelssohn was buried here." } },
        { t: '', ph: "fotos/hackesche.jpg", lat: 0, lng: 0, cr: "Foto: Dietmar Rabich · CC BY-SA 4.0 · Wikimedia Commons",
          n: { pt: "Os pátios Hackesche Höfe", en: "The Hackesche Höfe courtyards" },
          d: { pt: "Oito pátios interligados, de 1906. Ao lado, na Rosenthaler Straße 39, fica a oficina de Otto Weidt, que escondeu funcionários judeus cegos e surdos.", en: "Eight linked courtyards from 1906. Next door, at Rosenthaler Straße 39, is the workshop of Otto Weidt, who hid his blind and deaf Jewish workers." } },
        { t: '', ph: "fotos/stolpersteine.jpg", lat: 0, lng: 0, cr: "Foto: Dietmar Rabich · CC BY-SA 4.0 · Wikimedia Commons",
          n: { pt: "As pedras de tropeço", en: "The stumbling stones" },
          d: { pt: "Placas de latão na calçada, em frente à casa de quem foi deportado. Berlim tem milhares delas; no bairro, estão em quase toda rua.", en: "Brass plaques in the pavement, in front of the homes of those who were deported. Berlin has thousands; in this quarter they are on almost every street." } },
      ],
      photo: "fotos/sinagoga-rua.jpg", photoCr: "Foto: Ansgar Koreng · CC BY-SA 3.0 de · Wikimedia Commons",
      price: 0, priceMode: 'session', min: 1, max: 20,
      payPolicy: 'split', status: 'live', order: 2 },
    { id: "potsdam-sanssouci", type: "day", region: "potsdam",
      name: {"pt": "Potsdam e Sanssouci", "en": "Potsdam and Sanssouci", "fr": "Potsdam et Sanssouci", "it": "Potsdam e Sanssouci", "de": "Potsdam und Sanssouci", "es": "Potsdam y Sanssouci"},
      tagline: { pt: "Os palácios da Prússia e a conferência que redesenhou a Europa", en: "Prussia’s palaces and the conference that redrew Europe" },
      desc: { pt: "Bate-volta a Potsdam, a cidade dos reis da Prússia. Os terraços de Sanssouci, o palácio de verão de Frederico, o Grande; o Bairro Holandês; o Cecilienhof, onde os Aliados decidiram o destino da Alemanha em 1945; e a Ponte Glienicke, a ponte dos espiões da Guerra Fria.",
              en: "A day trip to Potsdam, the city of the kings of Prussia. The terraces of Sanssouci, the summer palace of Frederick the Great; the Dutch Quarter; Cecilienhof, where the Allies decided Germany’s fate in 1945; and the Glienicke Bridge, the Cold War’s bridge of spies." },
      meeting: {"pt": "No seu hotel em Berlim", "en": "At your hotel in Berlin", "fr": "À votre hôtel à Berlin", "it": "Al vostro hotel a Berlino", "de": "In Ihrem Hotel in Berlin", "es": "En su hotel en Berlín"}, pickup: true, privativo: true,
      duration: '', distance: '', effort: 'easy',
      includes: { pt: ["Guia em português", "Grupo privativo", "Saída do seu hotel"], en: ["Guide in Portuguese", "Private group", "Departure from your hotel"] },
      notIncludes: { pt: [], en: [] },
      stops: [
        { t: '', ph: "fotos/sanssouci.jpg", lat: 0, lng: 0, cr: "Foto: H. Zell · CC BY-SA 3.0 · Wikimedia Commons",
          n: { pt: "Palácio Sanssouci", en: "Sanssouci Palace" },
          d: { pt: "O palácio de verão de Frederico, o Grande, no alto dos terraços de vinhas. “Sem preocupação”, em francês — e ele está enterrado ali, no jardim.", en: "Frederick the Great’s summer palace, above its terraced vineyard. “Without a care”, in French — and he is buried right there, in the garden." } },
        { t: '', ph: "fotos/bairro-holandes.jpg", lat: 0, lng: 0, cr: "Foto: Angel Miklashevsky · CC BY-SA 4.0 · Wikimedia Commons",
          n: { pt: "O Bairro Holandês", en: "The Dutch Quarter" },
          d: { pt: "134 casas de tijolo vermelho construídas no século XVIII para artesãos holandeses. Hoje, cafés e lojas no centro de Potsdam.", en: "134 red-brick houses built in the 18th century for Dutch craftsmen. Today, cafés and shops in the heart of Potsdam." } },
        { t: '', ph: "fotos/cecilienhof.jpg", lat: 0, lng: 0, cr: "Foto: Ben Bender · CC BY-SA 3.0 · Wikimedia Commons",
          n: { pt: "Palácio Cecilienhof", en: "Cecilienhof Palace" },
          d: { pt: "O último palácio dos Hohenzollern, em estilo de casa de campo inglesa. Em julho de 1945, recebeu a Conferência de Potsdam.", en: "The last Hohenzollern palace, built like an English country house. In July 1945 it hosted the Potsdam Conference." } },
        { t: '', ph: "fotos/glienicke.jpg", lat: 0, lng: 0, cr: "Foto: Torsten Henning · Public domain · Wikimedia Commons",
          n: { pt: "Ponte Glienicke", en: "Glienicke Bridge" },
          d: { pt: "Na fronteira entre Berlim Ocidental e a Alemanha Oriental, foi o lugar das trocas de espiões da Guerra Fria.", en: "On the border between West Berlin and East Germany, it was where Cold War spies were exchanged." } },
      ],
      photo: "fotos/sanssouci.jpg", photoCr: "Foto: H. Zell · CC BY-SA 3.0 · Wikimedia Commons",
      price: 0, priceMode: 'session', min: 1, max: 20,
      payPolicy: 'split', status: 'live', order: 3 },
    { id: "sachsenhausen", type: "day", region: "oranienburg",
      name: {"pt": "Memorial de Sachsenhausen", "en": "Sachsenhausen Memorial", "fr": "Mémorial de Sachsenhausen", "it": "Memoriale di Sachsenhausen", "de": "Gedenkstätte Sachsenhausen", "es": "Memorial de Sachsenhausen"},
      tagline: { pt: "O campo de concentração ao lado da capital", en: "The concentration camp next to the capital" },
      desc: { pt: "Em Oranienburg, a 35 km de Berlim, Sachsenhausen foi campo de concentração nazista de 1936 a 1945 e, depois, campo especial soviético até 1950. Uma visita densa e respeitosa, para entender como o terror funcionava a poucos quilômetros da capital.",
              en: "In Oranienburg, 35 km from Berlin, Sachsenhausen was a Nazi concentration camp from 1936 to 1945 and then a Soviet special camp until 1950. A dense, respectful visit to understand how terror worked a few kilometres from the capital." },
      meeting: {"pt": "No seu hotel em Berlim", "en": "At your hotel in Berlin", "fr": "À votre hôtel à Berlin", "it": "Al vostro hotel a Berlino", "de": "In Ihrem Hotel in Berlin", "es": "En su hotel en Berlín"}, pickup: true, privativo: true,
      duration: '', distance: '', effort: 'easy',
      includes: { pt: ["Guia em português", "Grupo privativo", "Saída do seu hotel"], en: ["Guide in Portuguese", "Private group", "Departure from your hotel"] },
      notIncludes: { pt: [], en: [] },
      stops: [
        { t: '', ph: "fotos/sachsenhausen-entrada.jpg", lat: 0, lng: 0, cr: "Foto: Christian Michelides · CC BY-SA 4.0 · Wikimedia Commons",
          n: { pt: "A chegada ao memorial", en: "Arriving at the memorial" },
          d: { pt: "O caminho que os prisioneiros faziam desde a estação de Oranienburg termina aqui, na entrada da Gedenkstätte.", en: "The route prisoners were marched along from Oranienburg station ends here, at the entrance to the Gedenkstätte." } },
        { t: '', ph: "fotos/sachsenhausen-torre.jpg", lat: 0, lng: 0, cr: "Foto: Mendeztrives · CC BY-SA 4.0 · Wikimedia Commons",
          n: { pt: "A Torre A", en: "Tower A" },
          d: { pt: "A entrada do campo e o posto de comando da SS. O campo foi desenhado em triângulo para que dali se vigiasse tudo.", en: "The camp entrance and SS command post. The camp was laid out as a triangle so that everything could be watched from here." } },
        { t: '', ph: "fotos/sachsenhausen-campo.jpg", lat: 0, lng: 0, cr: "Foto: János Balázs from Berlin, Deutschland · CC BY-SA 2.0 · Wikimedia Commons",
          n: { pt: "A praça da chamada e o obelisco", en: "The roll-call square and the obelisk" },
          d: { pt: "Onde os prisioneiros eram contados todos os dias. O obelisco de 1961 é o memorial da época da RDA.", en: "Where prisoners were counted every day. The 1961 obelisk is the East German memorial." } },
        { t: '', ph: "fotos/sachsenhausen-barracao.jpg", lat: 0, lng: 0, cr: "Foto: János Balázs from Berlin, Deutschland · CC BY-SA 2.0 · Wikimedia Commons",
          n: { pt: "Os lugares de memória", en: "Places of remembrance" },
          d: { pt: "Lanternas e flores deixadas por visitantes. Os barracões 38 e 39, do setor judeu, hoje são museu sobre a vida e a morte no campo.", en: "Lanterns and flowers left by visitors. Barracks 38 and 39, in the Jewish section, are now a museum about life and death in the camp." } },
      ],
      photo: "fotos/sachsenhausen-campo.jpg", photoCr: "Foto: János Balázs from Berlin, Deutschland · CC BY-SA 2.0 · Wikimedia Commons",
      price: 0, priceMode: 'session', min: 1, max: 20,
      payPolicy: 'split', status: 'live', order: 4 },
  ];

  /* A apresentacao dela, com as palavras do prototipo dela (conexao-berlim-v3).
     Ela reescreve em Ajustes -> Sobre voce. */
  db.settings.homeText = {
    pt: 'Visitas guiadas em português com quem estuda esta cidade desde 2008. Você não vai ouvir a história de Berlim: vai caminhar por dentro dela.',
    en: 'Guided tours in Portuguese with someone who has studied this city since 2008. You will not just hear Berlin’s history: you will walk right through it.',
  };
  db.settings.photo = 'fotos/dulcineia.jpg';   /* retrato que ela mandou (23/09/2026) */
  db.settings.homePhoto = 'fotos/home-portao-noite.jpg';
  db.settings.homePhotoCr = "Foto: Thomas Wolf, www.foto-tw.de · CC BY-SA 3.0 · Wikimedia Commons";
  db.settings.bio = {
    pt: 'Sou a Dulcineia, paulistana, fascinada por História e Desenvolvimento Urbano. Em 2001 fui para a Espanha para um intercâmbio acadêmico, e minha vida fora do Brasil completa 25 anos.\n\n'
      + 'Em 2004, depois de uma viagem de férias, decidi me mudar para Berlim, palco de eventos decisivos do século XX. Desde 2005 moro na capital alemã, onde me formei em Arquitetura e atuei por anos com Patrimônio e Restauração.\n\n'
      + 'Amo explorar o passado, fotografar, viajar e conhecer diferentes culturas — pilares que orientam minha vida e fazem das minhas visitas guiadas uma experiência inesquecível. Nos últimos dez anos me dedico exclusivamente a explorar a História, a Arquitetura, a Cultura e a Arte para transformar a forma como você vê e verá Berlim.\n\n'
      + 'Se você deseja mais que apenas visitar uma cidade, te convido a decifrar Berlim através do passado, do presente e do seu próprio olhar pela história.',
    en: 'I am Dulcineia, from São Paulo, fascinated by history and urban development. In 2001 I moved to Spain for an academic exchange, and I have now lived outside Brazil for 25 years.\n\n'
      + 'In 2004, after a holiday, I decided to move to Berlin, the stage of decisive events of the 20th century. I have lived in the German capital since 2005, where I studied Architecture and worked for years in Heritage and Restoration.\n\n'
      + 'I love exploring the past, photographing, travelling and getting to know other cultures — the pillars of my life, and what makes my guided tours unforgettable. For the last ten years I have devoted myself entirely to History, Architecture, Culture and Art, to change the way you see Berlin.\n\n'
      + 'If you want more than just to visit a city, I invite you to decipher Berlin through its past, its present and your own view of history.',
  };

  db.rules = [
    { id: "r-berlim-historico-09", tourId: "berlim-historico", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "09:30", capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: "r-berlim-historico-14", tourId: "berlim-historico", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "14:00", capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: "r-bairro-judeu-09", tourId: "bairro-judeu", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "09:30", capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: "r-bairro-judeu-14", tourId: "bairro-judeu", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "14:00", capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: "r-potsdam-sanssouci-09", tourId: "potsdam-sanssouci", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "09:30", capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: "r-potsdam-sanssouci-14", tourId: "potsdam-sanssouci", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "14:00", capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: "r-sachsenhausen-09", tourId: "sachsenhausen", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "09:30", capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: "r-sachsenhausen-14", tourId: "sachsenhausen", weekdays: [0, 1, 2, 3, 4, 5, 6], time: "14:00", capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
  ];   /* turnos: Manhã 09:30–13:30 e Tarde 14:00–18:00 (config.js guia.turnos) */

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
  const plan = [];   /* reservas de exemplo: so com preco — nunca 'EUR 0' no painel */
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
  /* os turnos do config.js vão para os ajustes: assim sobem para a nuvem e o
     atendente do Instagram (servidor) oferece os mesmos turnos */
  if (GUIA_CFG.turnos && !DB.settings.turnos) {
    DB.settings.turnos = GUIA_CFG.turnos;
    DB.settings.turnoExclusivo = !!GUIA_CFG.turnoExclusivo;
  }
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

/* turnos do dia (config.js guia.turnos → DB.settings.turnos) */
function turnos() { return (DB && DB.settings && DB.settings.turnos) || GUIA_CFG.turnos || []; }
function turnoDaHora(h) { return turnos().find(x => x.hora === h) || null; }
/* agora em Berlim (AAAA-MM-DD e HH:MM) — turno que já começou não se reserva */
function agoraBerlim() {
  const p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}
function jaComecou(date, time) { const a = agoraBerlim(); return date < a.data || (date === a.data && time <= a.hora); }
function turnoExclusivo() { return !!((DB && DB.settings && DB.settings.turnoExclusivo) ?? GUIA_CFG.turnoExclusivo); }

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
    /* TURNO EXCLUSIVO (visita privativa): um grupo por turno e uma guia só —
       qualquer reserva naquele dia e horário, em QUALQUER passeio, ocupa o
       turno inteiro. Livre = cabe o grupo todo (capacity); ocupado = 0. */
    if (turnoExclusivo()) {
      const temLocal = DB.bookings.some(b => b.date === date && b.time === time && b.status === 'confirmed');
      const temNuvem = Array.isArray(DB.seatCounts) && DB.seatCounts.some(c => c.date === date && c.time === time && +c.pax > 0);
      return temLocal || temNuvem ? 0 : capacity;
    }
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
    /* O valor em reais do Pix que a tela vai mostrar vai junto na reserva: o
       recibo por e-mail (servidor) cobra ESTE numero, nao uma cotacao de
       horas depois. Mesma conta do comoPagar (metade ou total). */
    const agoraEur = policy === 'split' ? Math.round(total / 2) : total;
    const pixBrl = typeof pixValorEmReais === 'function' ? pixValorEmReais(agoraEur) : null;
    if (pixBrl) b.pixBrl = pixBrl;
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
