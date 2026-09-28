/* =====================================================
   APP-GUIA — camada de dados
   Persistência: localStorage. A troca para Supabase é
   trocar as funções deste arquivo — as telas não mudam.
   ===================================================== */
'use strict';

const DB_KEY = 'foto_db_v1';

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

  db.tours = [
    { id: 't1', type: 'photo', region: 'paris',
      name: { pt: 'Ensaio na Torre Eiffel · 1 hora', en: 'Eiffel Tower session · 1 hour' },
      desc: { pt: 'Uma hora nos três ângulos que fazem a foto de Paris: o Trocadéro vazio no começo da manhã, a ponte e o gramado do Champ de Mars. Você recebe 30 fotos tratadas.',
              en: 'One hour at the three angles that make the Paris photo: an empty Trocadéro early in the morning, the bridge and the Champ de Mars lawn. You get 30 edited photos.' },
      meeting: { pt: 'Encontro no Trocadéro, saída do metrô', en: 'We meet at Trocadéro, metro exit' },
      duration: '1h', distance: '', effort: 'easy',
      includes: { pt: ['30 fotos tratadas', 'Entrega em 7 dias por link', 'Ajuda com as poses'],
                  en: ['30 edited photos', 'Delivered in 7 days by link', 'Posing guidance'] },
      notIncludes: { pt: ['Transporte', 'Maquiagem'], en: ['Transport', 'Make-up'] },
      stops: [
        { t: '07h30', ph: 'fotos/casal-torre.jpg', lat: 48.8620, lng: 2.2885,
          n: { pt: 'Trocadéro, antes do sol', en: 'Trocadéro, before the sun' },
          d: { pt: 'A vista mais conhecida da cidade, e a única hora em que ela fica vazia. Começamos aqui.',
               en: 'The most famous view in the city, and the only hour it is empty. We start here.' } },
        { t: '08h00', ph: 'fotos/maos-dadas.jpg', lat: 48.8600, lng: 2.2930,
          n: { pt: 'Pont d\'Iéna', en: 'Pont d\'Iéna' },
          d: { pt: 'A ponte que liga o Trocadéro à torre. É onde saem as fotos caminhando.',
               en: 'The bridge linking Trocadéro to the tower. This is where the walking shots come from.' } },
        { t: '08h20', ph: 'fotos/torre-por-sol.jpg', lat: 48.8556, lng: 2.2986,
          n: { pt: 'Champ de Mars', en: 'Champ de Mars' },
          d: { pt: 'O gramado, com a torre inteira atrás. Terminamos deitados na grama, que é a foto que todo mundo guarda.',
               en: 'The lawn, with the whole tower behind. We finish lying on the grass — the shot everyone keeps.' } },
      ],
      photo: 'fotos/casal-torre.jpg', price: 290, priceMode: 'session', min: 1, max: 6,
      payPolicy: 'split', status: 'live', order: 1 },

    { id: 't2', type: 'photo', region: 'paris',
      name: { pt: 'Pedido de casamento surpresa', en: 'Surprise proposal' },
      desc: { pt: 'Eu fico escondida, combino o ponto e o sinal com você antes, e fotografo o pedido sem ela perceber. Depois fazemos meia hora de ensaio comemorando.',
              en: 'I stay hidden, we agree the spot and the signal beforehand, and I photograph the proposal without her noticing. Then we do half an hour celebrating.' },
      meeting: { pt: 'Combinamos o ponto exato por mensagem, no dia anterior', en: 'We agree the exact spot by message, the day before' },
      duration: '1h30', distance: '', effort: 'easy',
      includes: { pt: ['40 fotos tratadas', 'Ensaio de comemoração depois do sim', 'Plano combinado por mensagem antes'],
                  en: ['40 edited photos', 'Celebration session after the yes', 'Plan agreed by message beforehand'] },
      notIncludes: { pt: ['Flores', 'Músico'], en: ['Flowers', 'Musician'] },
      stops: [
        { t: 'combinado', ph: 'fotos/pedido.jpg', lat: 48.8584, lng: 2.2945,
          n: { pt: 'O pedido', en: 'The proposal' },
          d: { pt: 'Você dá o sinal combinado e eu já estou fotografando. Ela só descobre quando você mostra as fotos.',
               en: 'You give the agreed signal and I am already shooting. She only finds out when you show her the photos.' } },
        { t: '+30 min', ph: 'fotos/maos-dadas.jpg', lat: 48.8600, lng: 2.2930,
          n: { pt: 'A comemoração', en: 'The celebration' },
          d: { pt: 'Meia hora de ensaio com os dois ainda tremendo. São as melhores fotos do dia.',
               en: 'Half an hour with the two of them still shaking. These are the best photos of the day.' } },
      ],
      photo: 'fotos/pedido.jpg', price: 390, priceMode: 'session', min: 2, max: 2,
      payPolicy: 'split', status: 'live', order: 2 },

    { id: 't3', type: 'photo', region: 'paris',
      name: { pt: 'Família em Paris · 1h30', en: 'Family in Paris · 1h30' },
      desc: { pt: 'Ensaio de família sem pose forçada: a gente caminha, as crianças correm e eu fotografo. Feito num parque e numa rua tranquila, longe da multidão.',
              en: 'A family session with no forced poses: we walk, the kids run and I shoot. Done in a park and a quiet street, away from the crowds.' },
      meeting: { pt: 'Busco vocês no hotel, se for no centro', en: 'I pick you up at the hotel, if it is central' },
      duration: '1h30', distance: '', effort: 'easy',
      includes: { pt: ['45 fotos tratadas', 'Duas locações', 'Entrega em 7 dias por link'],
                  en: ['45 edited photos', 'Two locations', 'Delivered in 7 days by link'] },
      notIncludes: { pt: ['Transporte fora do centro'], en: ['Transport outside the centre'] },
      stops: [
        { t: '10h00', ph: 'fotos/banco-parque.jpg', lat: 48.8462, lng: 2.3372,
          n: { pt: 'Jardim do Luxemburgo', en: 'Luxembourg Gardens' },
          d: { pt: 'As cadeiras verdes, o laguinho dos barquinhos e sombra de sobra para as crianças.',
               en: 'The green chairs, the little boat pond and plenty of shade for the children.' } },
        { t: '11h00', ph: 'fotos/rua-paris.jpg', lat: 48.8656, lng: 2.3212,
          n: { pt: 'Uma rua do bairro', en: 'A neighbourhood street' },
          d: { pt: 'Padaria, bicicleta encostada, janelas azuis. É a Paris que vocês vão querer na parede.',
               en: 'Bakery, a bike against the wall, blue windows. The Paris you will want on your wall.' } },
      ],
      photo: 'fotos/banco-parque.jpg', price: 350, priceMode: 'session', min: 2, max: 8,
      payPolicy: 'split', status: 'live', order: 3 },

    { id: 't4', type: 'session', region: 'paris',
      name: { pt: '15 anos em Paris · 2 horas', en: 'Sweet fifteen in Paris · 2 hours' },
      desc: { pt: 'Duas horas, três locações e troca de roupa no meio. Pensado para o álbum de 15 anos: vestido longo na frente da torre, look de dia no bairro e o fim de tarde na ponte.',
              en: 'Two hours, three locations and an outfit change in the middle. Built for the fifteenth-birthday album: long dress at the tower, day look in the neighbourhood and late afternoon on the bridge.' },
      meeting: { pt: 'Começamos no hotel, com você já pronta', en: 'We start at the hotel, with you already ready' },
      duration: '2h', distance: '', effort: 'easy',
      includes: { pt: ['70 fotos tratadas', 'Três locações', 'Tempo para trocar de roupa', 'Entrega em 10 dias'],
                  en: ['70 edited photos', 'Three locations', 'Time to change outfits', 'Delivered in 10 days'] },
      notIncludes: { pt: ['Cabelo e maquiagem', 'Aluguel do vestido'], en: ['Hair and make-up', 'Dress rental'] },
      stops: [
        { t: '15h00', ph: 'fotos/vestido.jpg', lat: 48.8620, lng: 2.2885,
          n: { pt: 'Vestido longo no Trocadéro', en: 'Long dress at Trocadéro' },
          d: { pt: 'A foto do convite. Levo refletor para o contraluz do fim da tarde.',
               en: 'The invitation shot. I bring a reflector for the late afternoon backlight.' } },
        { t: '16h15', ph: 'fotos/rua-paris.jpg', lat: 48.8656, lng: 2.3212,
          n: { pt: 'Look de dia no bairro', en: 'Day look in the neighbourhood' },
          d: { pt: 'Troca de roupa e fotos mais soltas, com café e vitrine.',
               en: 'Outfit change and looser photos, with a café and a shop window.' } },
        { t: '17h30', ph: 'fotos/ponte-por-do-sol.jpg', lat: 48.8600, lng: 2.2930,
          n: { pt: 'Pôr do sol na ponte', en: 'Sunset on the bridge' },
          d: { pt: 'Fechamos com a luz dourada. É a foto que vira quadro.',
               en: 'We close with the golden light. This is the one that becomes a frame.' } },
      ],
      photo: 'fotos/vestido.jpg', price: 490, priceMode: 'session', min: 1, max: 5,
      payPolicy: 'split', status: 'live', order: 4 },

    { id: 't5', type: 'photo', region: 'paris',
      name: { pt: 'Gestante em Paris · 1 hora', en: 'Maternity in Paris · 1 hour' },
      desc: { pt: 'Uma hora tranquila, com ritmo de quem está grávida: pouca caminhada, banco por perto e uma locação só. Levo um xale e um véu, se você quiser usar.',
              en: 'A calm hour, at the pace of someone who is pregnant: little walking, a bench nearby and a single location. I bring a shawl and a veil if you want to use them.' },
      meeting: { pt: 'Locação única, escolhida com você', en: 'A single location, chosen with you' },
      duration: '1h', distance: '', effort: 'easy',
      includes: { pt: ['30 fotos tratadas', 'Xale e véu emprestados', 'Ritmo sem pressa'],
                  en: ['30 edited photos', 'Shawl and veil to borrow', 'An unhurried pace'] },
      notIncludes: { pt: ['Transporte'], en: ['Transport'] },
      stops: [
        { t: '09h00', ph: 'fotos/gestante.jpg', lat: 48.8606, lng: 2.3376,
          n: { pt: 'Jardim das Tulherias', en: 'Tuileries Garden' },
          d: { pt: 'Sombra, banco e areia clara que devolve luz no rosto. É o lugar mais confortável para gestante em Paris.',
               en: 'Shade, a bench and pale gravel that bounces light onto the face. The most comfortable spot in Paris for a maternity session.' } },
      ],
      photo: 'fotos/gestante.jpg', price: 320, priceMode: 'session', min: 1, max: 4,
      payPolicy: 'split', status: 'live', order: 5 },

    { id: 't6', type: 'session', region: 'paris',
      name: { pt: 'Hora dourada · Paris no fim do dia', en: 'Golden hour · Paris at day\'s end' },
      desc: { pt: 'O ensaio na hora em que Paris fica cor de mel: começamos numa ponte do Sena e terminamos com as luzes acendendo. Uma hora e meia, duas locações.',
              en: 'The session at the hour Paris turns honey-coloured: we start on a Seine bridge and finish as the lights come on. An hour and a half, two locations.' },
      meeting: { pt: 'Combinamos pelo horário do pôr do sol do dia', en: 'We set the time by that day\'s sunset' },
      duration: '1h30', distance: '', effort: 'easy',
      includes: { pt: ['40 fotos tratadas', 'Duas locações', 'Fotos com as luzes da cidade acesas'],
                  en: ['40 edited photos', 'Two locations', 'Photos with the city lights on'] },
      notIncludes: { pt: ['Transporte'], en: ['Transport'] },
      stops: [
        { t: '19h30', ph: 'fotos/ponte-por-do-sol.jpg', lat: 48.8600, lng: 2.3266,
          n: { pt: 'Ponte sobre o Sena', en: 'Bridge over the Seine' },
          d: { pt: 'O sol baixo bate na água e volta no rosto de vocês. É a melhor luz do dia, e dura vinte minutos.',
               en: 'The low sun hits the water and bounces back onto your faces. The best light of the day, and it lasts twenty minutes.' } },
        { t: '20h30', ph: 'fotos/torre-por-sol.jpg', lat: 48.8584, lng: 2.2945,
          n: { pt: 'A torre acendendo', en: 'The tower lighting up' },
          d: { pt: 'Ficamos até as luzes acenderem. Ninguém volta para casa sem essa foto.',
               en: 'We stay until the lights come on. Nobody goes home without this photo.' } },
      ],
      photo: 'fotos/ponte-por-do-sol.jpg', price: 420, priceMode: 'session', min: 1, max: 6,
      payPolicy: 'split', status: 'live', order: 6 },
  ];

  db.rules = [
    { id: 'r1', tourId: 't1', weekdays: [1, 3, 5], time: '10:00', capacity: 12, from: isoToday(), until: addDays(isoToday(), 120) },
    { id: 'r2', tourId: 't2', weekdays: [6],       time: '09:00', capacity: 8,  from: isoToday(), until: addDays(isoToday(), 120) },
    { id: 'r3', tourId: 't3', weekdays: [0, 6],    time: '18:00', capacity: 4,  from: isoToday(), until: addDays(isoToday(), 120) },
  ];

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
    [0, 't1', 42, 2, true],  [1, 't1', 35, 2, true],  [2, 't2', 28, 4, true],
    [3, 't3', 21, 2, true],  [4, 't1', 18, 3, true],  [0, 't2', 14, 2, true],
    [5, 't1', 10, 2, true],  [6, 't3',  7, 2, true],  [7, 't1',  4, 4, true],
    [1, 't2', -3, 2, false], [3, 't1', -6, 2, false], [4, 't3', -9, 1, true],
    [7, 't2', -12, 3, false],
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
