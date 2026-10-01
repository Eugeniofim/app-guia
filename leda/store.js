/* =====================================================
   APP-GUIA — camada de dados
   Persistência: localStorage. A troca para Supabase é
   trocar as funções deste arquivo — as telas não mudam.
   ===================================================== */
'use strict';

const DB_KEY = 'leda_db_v1';

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
           /* OS LUGARES DO ENSAIO (29/09/2026) — os cartoes-postais da cidade
              DELE. Cada app de fotografo tem os seus; a tela "Crie o seu
              ensaio" le daqui, e nao de uma lista fixa de Paris. Formato:
              [codigo, nome em portugues, nome em ingles] */
           locaisEnsaio: GUIA_CFG.locaisEnsaio || [],
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
  /* quem é ela — só o que ela mesma publica (site e Instagram) */
  db.settings.homeText = {
    pt: 'Ensaios em Paris com direção do começo ao fim. Escolha o seu, a data — e garanta o horário na hora.',
    en: 'Photo sessions in Paris, directed from start to finish. Pick yours and the date — and lock the slot right away.' };
  db.settings.bio = {
    pt: 'Sou a Leda, fotógrafa brasileira em Paris há mais de 10 anos — e fotografando há 20.\n\nFaço casal, pedido de casamento, 15 anos, família e o Fly Dress, sempre com direção de pose do começo ao fim: você não precisa saber posar. Eu escolho o ângulo, a luz e o lugar.\n\nFalo português, francês, inglês e espanhol. Fotografo com Canon, trato em HD e entrego a galeria privada em até 48 horas. Choveu? Remarco sem custo.\n\nNota 4,9 em 116 avaliações.',
    en: 'I am Leda, a Brazilian photographer living in Paris for over 10 years — and shooting for 20.\n\nCouples, proposals, quinceañeras, families and Fly Dress, always with posing direction from start to finish: you do not need to know how to pose.\n\nI speak Portuguese, French, English and Spanish. I shoot Canon, retouch in HD and deliver your private gallery within 48 hours. Rain? Free rebooking.\n\nRated 4.9 across 116 reviews.' };

  /* OS PACOTES DA LEDA (01/10/2026) — copiados do site dela
     (fotografa-em-paris.com/pricing): Express, Signature e Grand Format,
     com os mesmos preços, fotos e regras. Pedido e 15 anos não têm preço
     próprio lá: usam o pacote que ela indica para cada um. */
  const EXTRA = { pt: 'Pessoa a mais (acima de 4): € 70', en: 'Extra person (above 4): €70' };
  db.tours = [
    { id: 't1', type: 'photo', region: 'paris',
      name: { pt: 'Express Eiffel · 30 min', en: 'Express Eiffel · 30 min' },
      desc: { pt: 'Meia hora na Torre Eiffel, um lugar só, e você sai com as 10 fotos no celular — entregues ali mesmo. Para quem está com o roteiro apertado e não quer voltar de Paris sem a foto.',
              en: 'Half an hour at the Eiffel Tower, one spot, and you leave with 10 photos on your phone — delivered right there. For tight itineraries.' },
      meeting: { pt: 'Encontro no Trocadéro, na hora combinada', en: 'We meet at Trocadéro at the agreed time' },
      duration: '30 min', distance: '', effort: 'easy',
      includes: { pt: ['10 fotos', 'Entrega na hora, no seu celular', 'Direção de pose', 'Até 4 pessoas incluídas'],
                  en: ['10 photos', 'Delivered on the spot, to your phone', 'Posing direction', 'Up to 4 people included'] },
      notIncludes: { pt: [EXTRA.pt, 'Transporte'], en: [EXTRA.en, 'Transport'] },
      stops: [
        { t: '07h00', ph: 'fotos/p-trocadero.jpg', lat: 48.8620, lng: 2.2885,
          n: { pt: 'Trocadéro, com a torre inteira', en: 'Trocadéro, the whole tower' },
          d: { pt: 'Cedo, antes da multidão. Eu dirijo cada pose — você não precisa saber posar.',
               en: 'Early, before the crowds. I direct every pose — you don\'t need to know how.' } },
        { t: '+30 min', ph: 'fotos/p-nahora.jpg', lat: 48.8616, lng: 2.2893,
          n: { pt: 'As fotos no seu celular', en: 'Photos on your phone' },
          d: { pt: 'Terminou, recebeu. Dá para postar no mesmo dia.', en: 'Done, delivered. Post them the same day.' } },
      ],
      photo: 'fotos/express.jpg', price: 140, priceMode: 'session', min: 1, max: 6,
      payPolicy: 'split', status: 'live', order: 1 },

    { id: 't2', type: 'photo', region: 'paris',
      name: { pt: 'Séance Signature · 1 hora', en: 'Séance Signature · 1 hour' },
      desc: { pt: 'O ensaio mais pedido: uma hora, 25 fotos tratadas em HD e direção de arte do começo ao fim. Também existe em 30 min (€ 170, 15 fotos) e em 1h30 (€ 300, 35 fotos, 2 lugares e cabine para trocar de roupa).',
              en: 'The most requested session: one hour, 25 HD-retouched photos and art direction throughout. Also available as 30 min (€170, 15 photos) and 1h30 (€300, 35 photos, 2 locations and a changing booth).' },
      meeting: { pt: 'Combinamos o lugar por mensagem', en: 'We agree the spot by message' },
      duration: '1h', distance: '', effort: 'easy',
      includes: { pt: ['25 fotos tratadas em HD', 'Galeria privada em até 48h', 'Vídeo curto de 15 a 30 s grátis', 'Direção de arte e de pose', 'Até 4 pessoas incluídas'],
                  en: ['25 HD-retouched photos', 'Private gallery within 48h', 'Free 15–30 s video', 'Art and posing direction', 'Up to 4 people included'] },
      notIncludes: { pt: [EXTRA.pt, 'Transporte'], en: [EXTRA.en, 'Transport'] },
      stops: [
        { t: '08h00', ph: 'fotos/p-tulherias.jpg', lat: 48.8635, lng: 2.3275,
          n: { pt: 'Tulherias', en: 'Tuileries' },
          d: { pt: 'A fonte, as estátuas e o jardim — Paris clássica sem esforço.', en: 'The fountain, the statues and the garden — effortless classic Paris.' } },
        { t: '08h30', ph: 'fotos/p-danca.jpg', lat: 48.8611, lng: 2.3358,
          n: { pt: 'As arcadas do Louvre', en: 'The Louvre arcades' },
          d: { pt: 'Luz dourada entre as colunas. É aqui que sai a foto girando.', en: 'Golden light between the columns. This is where the twirling shot happens.' } },
      ],
      photo: 'fotos/signature.jpg', price: 250, priceMode: 'session', min: 1, max: 6,
      payPolicy: 'split', status: 'live', order: 2 },

    { id: 't3', type: 'session', region: 'paris',
      name: { pt: 'Grand Format · 2 horas', en: 'Grand Format · 2 hours' },
      desc: { pt: 'Duas horas, dois lugares e várias trocas de roupa, com 45 fotos tratadas e 2 Reels de presente. Também em 3h (€ 690, 60 fotos, 3 lugares) e 4h (€ 890, 80 fotos, 3 a 4 lugares). Transporte privado sob consulta.',
              en: 'Two hours, two locations and several outfit changes, with 45 retouched photos and 2 free Reels. Also as 3h (€690, 60 photos, 3 locations) and 4h (€890, 80 photos, 3–4 locations). Private transport on request.' },
      meeting: { pt: 'Montamos a rota juntas antes', en: 'We plan the route together beforehand' },
      duration: '2h', distance: '', effort: 'easy',
      includes: { pt: ['45 fotos tratadas em HD', '2 lugares na rota', 'Várias trocas de roupa', 'Cabine móvel para trocar de roupa', '2 Reels grátis', 'Galeria privada em até 48h'],
                  en: ['45 HD-retouched photos', '2 locations on the route', 'Several outfit changes', 'Mobile changing booth', '2 free Reels', 'Private gallery within 48h'] },
      notIncludes: { pt: [EXTRA.pt, 'Transporte privado (sob consulta)'], en: [EXTRA.en, 'Private transport (on request)'] },
      stops: [
        { t: '16h00', ph: 'fotos/p-opera.jpg', lat: 48.8720, lng: 2.3316,
          n: { pt: 'Ópera Garnier', en: 'Opéra Garnier' },
          d: { pt: 'O primeiro look, com a fachada dourada atrás.', en: 'The first look, with the golden façade behind.' } },
        { t: '16h40', ph: 'fotos/p-cafe.jpg', lat: 48.8700, lng: 2.3320,
          n: { pt: 'Um café parisiense', en: 'A Parisian café' },
          d: { pt: 'Troca de roupa na cabine e fotos de mesa de café, bem Paris.', en: 'Outfit change in the booth and café-table shots, very Paris.' } },
        { t: '17h20', ph: 'fotos/p-torre.jpg', lat: 48.8584, lng: 2.2945,
          n: { pt: 'Torre Eiffel', en: 'Eiffel Tower' },
          d: { pt: 'Fechamos na torre, com a luz do fim de tarde.', en: 'We finish at the tower in the late-afternoon light.' } },
      ],
      photo: 'fotos/grand.jpg', price: 390, priceMode: 'session', min: 1, max: 6,
      payPolicy: 'split', status: 'live', order: 3 },

    { id: 't4', type: 'session', region: 'paris',
      name: { pt: 'Fly Dress em Paris', en: 'Fly Dress in Paris' },
      desc: { pt: 'O vestido longo voando com a Torre Eiffel atrás. O aluguel do vestido já vem incluído — você escolhe a cor e eu cuido do resto.',
              en: 'The long dress flying with the Eiffel Tower behind. Dress rental is included — you pick the colour, I take care of the rest.' },
      meeting: { pt: 'Encontro no Trocadéro, já com o vestido', en: 'We meet at Trocadéro, dress ready' },
      duration: '', distance: '', effort: 'easy',
      includes: { pt: ['Aluguel do vestido incluído', 'Direção de pose para o tecido voar', 'Galeria privada em até 48h'],
                  en: ['Dress rental included', 'Posing direction to make the fabric fly', 'Private gallery within 48h'] },
      notIncludes: { pt: ['Cabelo e maquiagem', 'Transporte'], en: ['Hair and make-up', 'Transport'] },
      stops: [
        { t: '07h00', ph: 'fotos/p-vestido.jpg', lat: 48.8620, lng: 2.2885,
          n: { pt: 'Trocadéro, sem gente', en: 'Trocadéro, empty' },
          d: { pt: 'Cedo a esplanada fica vazia e o vestido aparece inteiro.', en: 'Early on the esplanade is empty and the whole dress shows.' } },
        { t: '07h40', ph: 'fotos/p-veu.jpg', lat: 48.8570, lng: 2.2950,
          n: { pt: 'O tecido no vento', en: 'Fabric in the wind' },
          d: { pt: 'A foto que todo mundo pergunta "onde você fez?".', en: 'The shot everyone asks "where did you take that?".' } },
      ],
      photo: 'fotos/flydress.jpg', price: 400, priceMode: 'session', min: 1, max: 2,
      payPolicy: 'split', status: 'live', order: 4 },

    { id: 't5', type: 'photo', region: 'paris',
      name: { pt: 'Pedido de casamento surpresa', en: 'Surprise proposal' },
      desc: { pt: 'Combinamos tudo antes por mensagem — o lugar, a hora e o sinal. Eu fotografo o momento do pedido e seguimos com o ensaio do casal. Feito no formato Signature de 1 hora.',
              en: 'We plan everything by message — the spot, the time and the signal. I photograph the moment and we carry on with the couple session. Done in the 1-hour Signature format.' },
      meeting: { pt: 'Ponto exato combinado na véspera', en: 'Exact spot agreed the day before' },
      duration: '1h', distance: '', effort: 'easy',
      includes: { pt: ['25 fotos tratadas em HD', 'Plano do pedido combinado antes', 'Ensaio do casal depois do sim', 'Galeria privada em até 48h'],
                  en: ['25 HD-retouched photos', 'Proposal plan agreed beforehand', 'Couple session after the yes', 'Private gallery within 48h'] },
      notIncludes: { pt: ['Flores', 'Transporte'], en: ['Flowers', 'Transport'] },
      stops: [
        { t: 'combinado', ph: 'fotos/p-pedido.jpg', lat: 48.8556, lng: 2.2986,
          n: { pt: 'O pedido', en: 'The proposal' },
          d: { pt: 'Você dá o sinal e eu já estou fotografando.', en: 'You give the signal and I am already shooting.' } },
        { t: '+15 min', ph: 'fotos/p-beijo.jpg', lat: 48.8639, lng: 2.3135,
          n: { pt: 'Depois do sim', en: 'After the yes' },
          d: { pt: 'O ensaio do casal com a emoção ainda no rosto.', en: 'The couple session with the emotion still on their faces.' } },
      ],
      photo: 'fotos/pedido.jpg', price: 250, priceMode: 'session', min: 2, max: 2,
      payPolicy: 'split', status: 'live', order: 5 },

    { id: 't6', type: 'session', region: 'paris',
      name: { pt: '15 anos em Paris · 2 horas', en: 'Quinceañera in Paris · 2 hours' },
      desc: { pt: 'O ensaio de 15 anos no formato Grand Format: duas horas, troca de vestido, a roda-gigante das Tulherias e as arcadas do Louvre. 45 fotos e 2 Reels de presente.',
              en: 'The quinceañera session in Grand Format: two hours, a dress change, the Tuileries big wheel and the Louvre arcades. 45 photos and 2 free Reels.' },
      meeting: { pt: 'Começamos com você já pronta', en: 'We start with you ready' },
      duration: '2h', distance: '', effort: 'easy',
      includes: { pt: ['45 fotos tratadas em HD', 'Troca de vestido na cabine móvel', '2 Reels grátis', 'Galeria privada em até 48h'],
                  en: ['45 HD-retouched photos', 'Dress change in the mobile booth', '2 free Reels', 'Private gallery within 48h'] },
      notIncludes: { pt: ['Aluguel do vestido', 'Cabelo e maquiagem'], en: ['Dress rental', 'Hair and make-up'] },
      stops: [
        { t: '15h00', ph: 'fotos/p-roda.jpg', lat: 48.8641, lng: 2.3258,
          n: { pt: 'Tulherias e a roda-gigante', en: 'Tuileries & the big wheel' },
          d: { pt: 'Vestido de princesa com o céu azul atrás.', en: 'Princess dress against the blue sky.' } },
        { t: '16h00', ph: 'fotos/p-arcadas2.jpg', lat: 48.8611, lng: 2.3358,
          n: { pt: 'Arcadas do Louvre', en: 'Louvre arcades' },
          d: { pt: 'Segundo look, com a luz dourada das colunas.', en: 'Second look, with the golden light of the columns.' } },
      ],
      photo: 'fotos/quinze.jpg', price: 390, priceMode: 'session', min: 1, max: 5,
      payPolicy: 'split', status: 'live', order: 6 },
  ];

  db.rules = [
    /* horários de exemplo — ela troca no painel em dois toques */
    { id: 'r1', tourId: 't1', weekdays: [0, 1, 2, 3, 4, 5, 6], time: '07:00', capacity: 6, from: isoToday(), until: addDays(isoToday(), 120) },
    { id: 'r2', tourId: 't2', weekdays: [1, 3, 5, 6], time: '08:00', capacity: 6, from: isoToday(), until: addDays(isoToday(), 120) },
    { id: 'r3', tourId: 't3', weekdays: [0, 6],       time: '16:00', capacity: 6, from: isoToday(), until: addDays(isoToday(), 120) },
    { id: 'r4', tourId: 't4', weekdays: [2, 4],       time: '07:30', capacity: 2, from: isoToday(), until: addDays(isoToday(), 120) },
    { id: 'r5', tourId: 't5', weekdays: [5],          time: '18:30', capacity: 2, from: isoToday(), until: addDays(isoToday(), 120) },
    { id: 'r6', tourId: 't6', weekdays: [6],          time: '15:00', capacity: 5, from: isoToday(), until: addDays(isoToday(), 120) },
  ];

  db.coupons = [
    { code: 'VOLTA10', pct: 10, until: '2026-12-31', oncePerPerson: true, uses: [] },
    { code: 'AMIGO15', pct: 15, until: '2026-12-31', oncePerPerson: true, uses: [] },
  ];

  /* ---- clientes e reservas de exemplo (histórico crível) ---- */
  const people = [
    /* clientes de exemplo — nomes fictícios, é demonstração */
    ['Camila Andrade',    'camila.andrade@email.com',  '+55 11 98123 4410', 'camila.andrade', 'instagram'],
    ['Rafael Teixeira',   'rafa.teixeira@email.com',   '+55 21 99654 1022', 'rafateixeira',   'site'],
    ['Beatriz Nogueira',  'bia.nog@email.com',         '+55 21 99123 4567', 'bia.nog',        'friend'],
    ['Marcos Duarte',     'marcos.duarte@email.com',   '+55 11 98877 6655', 'marcos.duarte',  'whatsapp'],
    ['Fernanda Lopes',    'fe.lopes@email.com',        '+55 31 99712 3380', 'fe.lopes',       'instagram'],
    ['Paula Mendes',      'paula.mendes@email.com',    '+55 41 99801 2277', '',               'site'],
    ['Gustavo Ribeiro',   'gu.ribeiro@email.com',      '+55 51 99230 4461', 'gustavoribeiro', 'instagram'],
    ['Luiza Carvalho',    'luiza.carvalho@email.com',  '+55 19 99144 8802', 'luizacarvalho',  'friend'],
    ['Renata Siqueira',   'renata.siq@email.com',      '+55 11 97655 3019', 'renatasiq',      'whatsapp'],
    ['Thiago Martins',    'thiago.m@email.com',        '+55 61 99488 1275', '',               'site'],
    ['Ana Clara Souza',   'anaclara.souza@email.com',  '+55 81 99377 5640', 'anaclara.s',     'instagram'],
    ['Sarah Whitfield',   'sarah.w@email.co.uk',       '+44 7700 900431',   '',               'site'],
  ];
  const plan = [
    /* [pessoa, ensaio, dias atrás, pessoas, quitado?] — cinco meses para trás e três semanas para frente.
       Express e Signature são os que mais saem; Grand Format, Fly Dress e 15 anos puxam o ticket. */
    [0, 't2', 148, 2, true],  [5, 't3', 140, 4, true],  [3, 't1', 131, 2, true],  [10, 't4', 122, 1, true],
    [1, 't5', 115, 2, true],  [4, 't2', 104, 2, true],  [8, 't1',  96, 1, true],  [7, 't6',  88, 3, true],
    [2, 't3',  79, 5, true],  [11, 't1', 71, 2, true],  [9, 't2',  63, 2, true],  [6, 't5',  55, 2, true],
    [0, 't4',  47, 1, true],  [5, 't1',  39, 2, true],  [3, 't2',  30, 4, true],  [10, 't6', 24, 2, true],
    [1, 't1',  17, 2, true],  [4, 't3',  11, 2, true],  [8, 't2',   6, 1, true],  [2, 't1',   2, 2, true],
    [7, 't2',   0, 2, false], [9, 't4',  -4, 1, false], [11, 't1', -6, 2, false], [3, 't6',  -9, 3, false],
    [6, 't5', -13, 2, true],  [0, 't3', -17, 2, false], [5, 't2', -20, 2, false],
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
      /* brasileiro paga o sinal no Pix, em real — é o argumento de venda */
      const doBrasil = whats.startsWith('+55');
      payments.push({ amount: Math.round(total / 2), date: created, method: doBrasil && n % 4 !== 1 ? 'pix' : 'card', kind: 'deposit' });
      if (settled) payments.push({ amount: total - Math.round(total / 2), date: addDays(date, -1), method: doBrasil && n % 3 === 0 ? 'pix' : 'card', kind: 'balance' });
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
