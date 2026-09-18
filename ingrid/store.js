/* =====================================================
   APP-GUIA — camada de dados
   Persistência: localStorage. A troca para Supabase é
   trocar as funções deste arquivo — as telas não mudam.
   ===================================================== */
'use strict';

/* Chave propria, e nao a 'vi_db_v1' do molde: este app mora no mesmo
   endereco da demonstracao (guia.eugeniofim.com/ingrid/), e o navegador
   guarda os dados por endereco. Com a mesma chave, quem abrisse os dois
   veria os passeios de um dentro do outro. */
const DB_KEY = 'ingrid_db_v1';

/* ---------- modelo ----------
Tour       {id, type, region, name:{pt,en}, desc:{pt,en}, meeting, photo,
            price, priceMode:'pp'|'session'|'tabela', tabela:[20 valores], min, max,
            payPolicy:'full'|'split',
            status:'live'|'draft'|'seasonal', order}
Rule       {id, tourId, weekdays:[0-6], time:'16:30', capacity, from:'2026-11-20', until:'2026-12-23'}
Departure  {id, tourId, date:'2026-12-21', time, capacity}  // avulsas; recorrentes são geradas das Rules
Block      {id, from, until, reason}                        // bloqueio global (férias)
Booking    {id, code, tourId, date, time, name, email, whats, insta, pax, total,
            veiculo:'carro'|'van'|'',        // so nos transfers
            group:[{nome, nasc}],            // quem mais veio, alem de quem reservou
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

/* ---------- transfer: veiculo e horario ----------

   O transfer nao se cobra por pessoa. A tabela dela (pagina 4 do portfolio)
   cobra POR TRECHO, e o valor depende de duas coisas: o veiculo — que quem
   decide sao as MALAS, nao as pessoas — e a hora, porque das 21h as 6h o
   valor e outro.

   Foi o que ela disse que mais ajudaria: "transfer ia ajudar muito". Sem
   este modelo o app teria que fingir que transfer e um passeio por pessoa,
   e ela continuaria fazendo a conta a mao. */
const NOITE_DE = 21, NOITE_ATE = 6;   /* 21:00 as 05:59 = noturno */

function transferNoturno(hora) {
  const h = parseInt(String(hora || '').slice(0, 2), 10);
  if (isNaN(h)) return false;
  return h >= NOITE_DE || h < NOITE_ATE;
}

function transferPreco(x, veiculo, hora) {
  const tr = x.transfer || {};
  const v = tr[veiculo === 'van' ? 'van' : 'carro'];
  if (!v) return 0;
  return +(transferNoturno(hora) ? v.noite : v.dia) || 0;
}

/* ---------- preco por numero de pessoas ----------

   A Ingrid nao cobra por pessoa nem um valor unico: ela tem uma tabela com
   o valor FECHADO do grupo para cada quantidade, de 1 ate 20. Ela montou
   essa tabela justamente para parar de fazer conta a mao no meio de um dia
   cheio — entao o app so serve para alguma coisa se souber ler a tabela.

   tabela[i] = valor total do grupo com (i+1) pessoas. 0 = "consultar":
   grupo grande, caso raro, ela responde a mao e tudo bem. */
const TABELA_MAX = 20;

function tabelaPreco(x, pax) {
  const tb = Array.isArray(x.tabela) ? x.tabela : [];
  const n = Math.max(1, Math.min(TABELA_MAX, +pax || 1));
  return +tb[n - 1] || 0;
}

/* O menor valor da tabela — e o "a partir de" do cartao da vitrine. */
function tabelaMenor(x) {
  const tb = (Array.isArray(x.tabela) ? x.tabela : []).map(v => +v || 0).filter(v => v > 0);
  return tb.length ? Math.min(...tb) : 0;
}

/* Ate quantas pessoas a tabela responde sozinha. Acima disso o app nao
   inventa preco: manda falar com ela. */
function tabelaAte(x) {
  const tb = Array.isArray(x.tabela) ? x.tabela : [];
  let n = 0;
  for (let i = 0; i < TABELA_MAX; i++) if (+tb[i] > 0) n = i + 1;
  return n;
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

  /* A apresentacao dela. Nada aqui foi inventado: e o que esta no portfolio
     (as sete secoes) e no Instagram dela ("Receptivo em toda a Italia",
     "Acompanhante Turistica Habilitada", "Transfer e passeios personalizados
     na Italia", "Experiencias Privativas"). Ela reescreve em
     Ajustes -> Sobre voce quando quiser. */
  db.settings.homeText = {
    pt: 'Receptivo em toda a Itália. Transfer e passeios personalizados, com acompanhante habilitada em português.',
    en: 'Travel services across Italy. Transfers and tailor-made tours, with a licensed Portuguese-speaking guide.',
  };
  db.settings.bio = {
    pt: 'Sou a Ingrid, acompanhante turística habilitada, e atendo em português em toda a Itália.\n\n'
      + 'Em Roma faço passeios privativos: a Roma Antiga, o Vaticano, as basílicas papais, o centro barroco a pé, '
      + 'a Roma iluminada à noite, os mirantes da cidade e a Audiência Papal.\n\n'
      + 'Fora de Roma, organizo bate e volta com motorista particular em língua portuguesa — Toscana, Costa '
      + 'Amalfitana, Pompeia e Nápoles, Assis, Tivoli, Castelli Romani — e roteiros de vários dias pela Itália.\n\n'
      + 'Também faço os seus transfers: aeroporto, Porto de Civitavecchia, estações e trechos dentro do centro histórico.\n\n'
      + 'Todos os passeios são privativos: o grupo é só seu.',
    en: 'I am Ingrid, a licensed tourist guide, and I work in Portuguese across Italy.\n\n'
      + 'In Rome I run private tours: Ancient Rome, the Vatican, the papal basilicas, the baroque centre on foot, '
      + 'Rome by night, the city viewpoints and the Papal Audience.\n\n'
      + 'Outside Rome, I organise day trips with a private Portuguese-speaking driver — Tuscany, the Amalfi Coast, '
      + 'Pompeii and Naples, Assisi, Tivoli, Castelli Romani — and multi-day itineraries across Italy.\n\n'
      + 'I also handle your transfers: airport, Port of Civitavecchia, stations and trips within the historic centre.\n\n'
      + 'Every tour is private: the group is yours alone.',
  };

  db.tours = [
    { id: 'roma-antiga-3h', type: 'walk', region: 'roma',
      name: { pt: 'Roma Antiga · 3 horas', en: 'Ancient Rome · 3 hours' },
      desc: { pt: 'O coração da Roma imperial com guia em português. Em 3 horas visitamos o Coliseu e o Fórum Romano OU o Palatino.',
              en: 'The heart of imperial Rome with a Portuguese-speaking guide. In 3 hours we visit the Colosseum and either the Roman Forum or the Palatine.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '3h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português'],
                    en: ['Guide in Portuguese'] },
      notIncludes: { pt: ['Ingressos das atrações'],
                    en: ['Attraction tickets'] },
      stops: [
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Coliseu', en: 'Colosseum' },
          d: { pt: 'O anfiteatro que contava ao povo quem mandava em Roma.', en: 'The amphitheatre that told the people who ruled Rome.' } },
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Fórum Romano', en: 'Roman Forum' },
          d: { pt: 'A praça onde a república se decidia, hoje a céu aberto.', en: 'The square where the republic was decided, today open to the sky.' } },
      ],
      photo: 'arte/capa-roma.jpg',
      price: 420, priceMode: 'tabela',
      tabela: [420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 1,
      priceNote: { pt: 'Ingressos a partir de €18 por adulto, gratuito para menores de 18 anos. Reserva antecipada obrigatória — o valor pode chegar a €36 por pessoa conforme a disponibilidade, por isso reserve com pelo menos 2 meses de antecedência.',
                   en: 'Tickets from €18 per adult, free under 18. Advance booking required — the price can reach €36 per person depending on availability, so book at least 2 months ahead.' },
    },
    { id: 'roma-antiga-4h', type: 'walk', region: 'roma',
      name: { pt: 'Roma Antiga · 4 horas', en: 'Ancient Rome · 4 hours' },
      desc: { pt: 'O coração da Roma imperial com guia em português. Em 4 horas visitamos o Coliseu e o Palatino E o Fórum Romano.',
              en: 'The heart of imperial Rome with a Portuguese-speaking guide. In 4 hours we visit the Colosseum and both the Palatine and the Roman Forum.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '4h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português'],
                    en: ['Guide in Portuguese'] },
      notIncludes: { pt: ['Ingressos das atrações'],
                    en: ['Attraction tickets'] },
      stops: [
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Coliseu', en: 'Colosseum' },
          d: { pt: 'O anfiteatro que contava ao povo quem mandava em Roma.', en: 'The amphitheatre that told the people who ruled Rome.' } },
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Fórum Romano', en: 'Roman Forum' },
          d: { pt: 'A praça onde a república se decidia, hoje a céu aberto.', en: 'The square where the republic was decided, today open to the sky.' } },
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Palatino', en: 'Palatine Hill' },
          d: { pt: 'A colina dos imperadores, e a vista de cima de tudo.', en: 'The emperors’ hill, and the view over everything.' } },
      ],
      photo: 'arte/capa-roma.jpg',
      price: 510, priceMode: 'tabela',
      tabela: [510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 2,
      priceNote: { pt: 'Ingressos a partir de €18 por adulto, gratuito para menores de 18 anos. Reserva antecipada obrigatória — o valor pode chegar a €36 por pessoa conforme a disponibilidade, por isso reserve com pelo menos 2 meses de antecedência.',
                   en: 'Tickets from €18 per adult, free under 18. Advance booking required — the price can reach €36 per person depending on availability, so book at least 2 months ahead.' },
    },
    { id: 'vaticano-3h', type: 'walk', region: 'roma',
      name: { pt: 'Vaticano · 3 horas', en: 'Vatican · 3 hours' },
      desc: { pt: 'Museus do Vaticano e Capela Sistina. Guia em português e reserva de ingresso com antecedência.',
              en: 'Vatican Museums and the Sistine Chapel. Portuguese-speaking guide, tickets booked in advance.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '3h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português'],
                    en: ['Guide in Portuguese'] },
      notIncludes: { pt: ['Ingressos', 'Fones de ouvido (€1,50 no dia)'],
                    en: ['Tickets', 'Headsets (€1.50 on the day)'] },
      stops: [
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Museus do Vaticano', en: 'Vatican Museums' },
          d: { pt: 'Séculos de arte reunidos por quem podia reunir.', en: 'Centuries of art gathered by those who could gather it.' } },
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Capela Sistina', en: 'Sistine Chapel' },
          d: { pt: 'O teto de Michelangelo. Aqui a gente fica em silêncio e eu conto depois.', en: 'Michelangelo’s ceiling. Here we stay quiet and I explain afterwards.' } },
      ],
      photo: 'arte/capa-roma.jpg',
      price: 420, priceMode: 'tabela',
      tabela: [420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420, 420],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 3,
      priceNote: { pt: 'Ingressos dos Museus do Vaticano: €25 por adulto, €15 até 19 anos, gratuito até 7 anos (podem passar de €40 conforme a disponibilidade). Basílica di San Pietro: €7 por pessoa + €7 da guia. Fones de ouvido: €1,50 por pessoa, pagos no dia. Reserva antecipada obrigatória — reserve com pelo menos 2 meses de antecedência.',
                   en: 'Vatican Museums tickets: €25 per adult, €15 up to 19, free up to 7 (can exceed €40 depending on availability). St Peter’s Basilica: €7 per person + €7 for the guide. Headsets: €1.50 per person, paid on the day. Advance booking required — book at least 2 months ahead.' },
    },
    { id: 'vaticano-4h', type: 'walk', region: 'roma',
      name: { pt: 'Vaticano · 4 horas', en: 'Vatican · 4 hours' },
      desc: { pt: 'Museus do Vaticano e Capela Sistina, mais a Basílica de São Pedro. Guia em português e reserva de ingresso com antecedência.',
              en: 'Vatican Museums and the Sistine Chapel, plus St Peter’s Basilica. Portuguese-speaking guide, tickets booked in advance.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '4h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português'],
                    en: ['Guide in Portuguese'] },
      notIncludes: { pt: ['Ingressos', 'Fones de ouvido (€1,50 no dia)'],
                    en: ['Tickets', 'Headsets (€1.50 on the day)'] },
      stops: [
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Museus do Vaticano', en: 'Vatican Museums' },
          d: { pt: 'Séculos de arte reunidos por quem podia reunir.', en: 'Centuries of art gathered by those who could gather it.' } },
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Capela Sistina', en: 'Sistine Chapel' },
          d: { pt: 'O teto de Michelangelo. Aqui a gente fica em silêncio e eu conto depois.', en: 'Michelangelo’s ceiling. Here we stay quiet and I explain afterwards.' } },
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Basílica de São Pedro', en: 'St Peter’s Basilica' },
          d: { pt: 'A maior igreja do mundo, e a Pietà logo na entrada.', en: 'The largest church in the world, with the Pietà right by the entrance.' } },
      ],
      photo: 'arte/capa-roma.jpg',
      price: 510, priceMode: 'tabela',
      tabela: [510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 4,
      priceNote: { pt: 'Ingressos dos Museus do Vaticano: €25 por adulto, €15 até 19 anos, gratuito até 7 anos (podem passar de €40 conforme a disponibilidade). Basílica di San Pietro: €7 por pessoa + €7 da guia. Fones de ouvido: €1,50 por pessoa, pagos no dia. Reserva antecipada obrigatória — reserve com pelo menos 2 meses de antecedência.',
                   en: 'Vatican Museums tickets: €25 per adult, €15 up to 19, free up to 7 (can exceed €40 depending on availability). St Peter’s Basilica: €7 per person + €7 for the guide. Headsets: €1.50 per person, paid on the day. Advance booking required — book at least 2 months ahead.' },
    },
    { id: 'basilicas-3h', type: 'walk', region: 'roma',
      name: { pt: 'Basílicas Papais · 3 basílicas', en: 'Papal Basilicas · 3 basilicas' },
      desc: { pt: 'As basílicas papais de Roma em 3 horas, com guia em português e motorista particular para o conforto entre uma e outra. São as igrejas que abrem a Porta Santa nos anos de Jubileu.',
              en: 'Rome’s papal basilicas in 3 hours, with a Portuguese-speaking guide and a private driver for comfort in between. These are the churches that open the Holy Door in Jubilee years.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '3h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português', 'Motorista particular entre as basílicas'],
                    en: ['Guide in Portuguese', 'Private driver between the basilicas'] },
      notIncludes: { pt: ['Ingresso da Basílica di San Pietro (€7 por pessoa + €7 da guia)', 'Fones de ouvido (€1,50 no dia)'],
                    en: ['St Peter’s Basilica ticket (€7 per person + €7 for the guide)', 'Headsets (€1.50 on the day)'] },
      stops: [],
      photo: 'arte/capa-roma.jpg',
      price: 490, priceMode: 'tabela',
      tabela: [490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 5,
      priceNote: { pt: 'Ingresso da Basílica di San Pietro com reserva antecipada obrigatória: €7 por pessoa + €7 da guia. Fones de ouvido: €1,50 por pessoa, pagos no dia diretamente à guia.',
                   en: 'St Peter’s Basilica ticket, advance booking required: €7 per person + €7 for the guide. Headsets: €1.50 per person, paid on the day directly to the guide.' },
    },
    { id: 'basilicas-4h', type: 'walk', region: 'roma',
      name: { pt: 'Basílicas Papais · 4 basílicas', en: 'Papal Basilicas · 4 basilicas' },
      desc: { pt: 'As basílicas papais de Roma em 4 horas, com guia em português e motorista particular para o conforto entre uma e outra. São as igrejas que abrem a Porta Santa nos anos de Jubileu.',
              en: 'Rome’s papal basilicas in 4 hours, with a Portuguese-speaking guide and a private driver for comfort in between. These are the churches that open the Holy Door in Jubilee years.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '4h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português', 'Motorista particular entre as basílicas'],
                    en: ['Guide in Portuguese', 'Private driver between the basilicas'] },
      notIncludes: { pt: ['Ingresso da Basílica di San Pietro (€7 por pessoa + €7 da guia)', 'Fones de ouvido (€1,50 no dia)'],
                    en: ['St Peter’s Basilica ticket (€7 per person + €7 for the guide)', 'Headsets (€1.50 on the day)'] },
      stops: [],
      photo: 'arte/capa-roma.jpg',
      price: 580, priceMode: 'tabela',
      tabela: [580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 6,
      priceNote: { pt: 'Ingresso da Basílica di San Pietro com reserva antecipada obrigatória: €7 por pessoa + €7 da guia. Fones de ouvido: €1,50 por pessoa, pagos no dia diretamente à guia.',
                   en: 'St Peter’s Basilica ticket, advance booking required: €7 per person + €7 for the guide. Headsets: €1.50 per person, paid on the day directly to the guide.' },
    },
    { id: 'barroca-3h', type: 'walk', region: 'roma',
      name: { pt: 'Roma Barroca a pé · 3 horas', en: 'Baroque Rome on foot · 3 hours' },
      desc: { pt: 'Uma apresentação da cidade a pé: as principais praças e igrejas do centro histórico, a Fontana di Trevi e o Panteão (visita externa).',
              en: 'An introduction to the city on foot: the main squares and churches of the historic centre, the Trevi Fountain and the Pantheon (seen from outside).' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '3h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português'],
                    en: ['Guide in Portuguese'] },
      notIncludes: { pt: ['Ingressos das atrações'],
                    en: ['Attraction tickets'] },
      stops: [
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Piazza Navona', en: 'Piazza Navona' },
          d: { pt: 'A praça que era um estádio, e ainda tem o formato dele.', en: 'The square that was a stadium, and still has its shape.' } },
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Panteão', en: 'Pantheon' },
          d: { pt: 'Dezoito séculos de pé e um buraco no teto de propósito.', en: 'Eighteen centuries standing, with a hole in the roof on purpose.' } },
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Fontana di Trevi', en: 'Trevi Fountain' },
          d: { pt: 'A moeda vai com a mão direita por cima do ombro esquerdo.', en: 'The coin goes with your right hand over your left shoulder.' } },
      ],
      photo: 'arte/capa-roma.jpg',
      price: 360, priceMode: 'tabela',
      tabela: [360, 360, 360, 360, 360, 360, 360, 360, 360, 360, 360, 360, 360, 360, 360, 360, 360, 360, 360, 360],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 7,
      priceNote: { pt: 'Também é possível fazer este passeio com motorista + guia. Me chame para o valor.',
                   en: 'This tour can also be done with driver + guide. Message me for a quote.' },
    },
    { id: 'barroca-4h', type: 'walk', region: 'roma',
      name: { pt: 'Roma Barroca a pé · 4 horas', en: 'Baroque Rome on foot · 4 hours' },
      desc: { pt: 'Uma apresentação da cidade a pé: as principais praças e igrejas do centro histórico, a Fontana di Trevi e o Panteão (visita externa).',
              en: 'An introduction to the city on foot: the main squares and churches of the historic centre, the Trevi Fountain and the Pantheon (seen from outside).' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '4h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português'],
                    en: ['Guide in Portuguese'] },
      notIncludes: { pt: ['Ingressos das atrações'],
                    en: ['Attraction tickets'] },
      stops: [
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Piazza Navona', en: 'Piazza Navona' },
          d: { pt: 'A praça que era um estádio, e ainda tem o formato dele.', en: 'The square that was a stadium, and still has its shape.' } },
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Panteão', en: 'Pantheon' },
          d: { pt: 'Dezoito séculos de pé e um buraco no teto de propósito.', en: 'Eighteen centuries standing, with a hole in the roof on purpose.' } },
        { t: '', ph: '', lat: 0, lng: 0,
          n: { pt: 'Fontana di Trevi', en: 'Trevi Fountain' },
          d: { pt: 'A moeda vai com a mão direita por cima do ombro esquerdo.', en: 'The coin goes with your right hand over your left shoulder.' } },
      ],
      photo: 'arte/capa-roma.jpg',
      price: 400, priceMode: 'tabela',
      tabela: [400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 8,
      priceNote: { pt: 'Também é possível fazer este passeio com motorista + guia. Me chame para o valor.',
                   en: 'This tour can also be done with driver + guide. Message me for a quote.' },
    },
    { id: 'noturno-3h', type: 'walk', region: 'roma',
      name: { pt: 'Roma iluminada · 3 horas', en: 'Rome by night · 3 hours' },
      desc: { pt: 'Conhecer Roma à noite é outra cidade. As principais praças a pé, a Fontana di Trevi e o Panteão (visita externa), sem o sol e sem a multidão do dia.',
              en: 'Rome at night is another city. The main squares on foot, the Trevi Fountain and the Pantheon (from outside), without the sun and without the daytime crowds.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '3h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português'],
                    en: ['Guide in Portuguese'] },
      notIncludes: { pt: ['Ingressos das atrações'],
                    en: ['Attraction tickets'] },
      stops: [],
      photo: 'arte/capa-roma.jpg',
      price: 400, priceMode: 'tabela',
      tabela: [400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 9,
      priceNote: { pt: 'Também é possível fazer este passeio com motorista + guia. Me chame para o valor.',
                   en: 'This tour can also be done with driver + guide. Message me for a quote.' },
    },
    { id: 'noturno-4h', type: 'walk', region: 'roma',
      name: { pt: 'Roma iluminada · 4 horas', en: 'Rome by night · 4 hours' },
      desc: { pt: 'Conhecer Roma à noite é outra cidade. As principais praças a pé, a Fontana di Trevi e o Panteão (visita externa), sem o sol e sem a multidão do dia.',
              en: 'Rome at night is another city. The main squares on foot, the Trevi Fountain and the Pantheon (from outside), without the sun and without the daytime crowds.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '4h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português'],
                    en: ['Guide in Portuguese'] },
      notIncludes: { pt: ['Ingressos das atrações'],
                    en: ['Attraction tickets'] },
      stops: [],
      photo: 'arte/capa-roma.jpg',
      price: 440, priceMode: 'tabela',
      tabela: [440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 10,
      priceNote: { pt: 'Também é possível fazer este passeio com motorista + guia. Me chame para o valor.',
                   en: 'This tour can also be done with driver + guide. Message me for a quote.' },
    },
    { id: 'panoramas-3h', type: 'walk', region: 'roma',
      name: { pt: 'Panoramas de Roma · 3 horas', en: 'Rome viewpoints · 3 hours' },
      desc: { pt: 'Roma é a cidade das sete colinas. Este passeio leva você aos mirantes com as vistas mais bonitas da cidade, com guia em português e motorista particular durante todo o trajeto.',
              en: 'Rome is the city of seven hills. This tour takes you to the viewpoints with the most beautiful views in the city, with a Portuguese-speaking guide and a private driver throughout.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '3h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português', 'Motorista particular'],
                    en: ['Guide in Portuguese', 'Private driver'] },
      notIncludes: { pt: ['Refeições', 'Ingressos — as visitas são externas'],
                    en: ['Meals', 'Tickets — all visits are from outside'] },
      stops: [],
      photo: 'arte/capa-roma.jpg',
      price: 490, priceMode: 'tabela',
      tabela: [490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490, 490],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 11
    },
    { id: 'panoramas-4h', type: 'walk', region: 'roma',
      name: { pt: 'Panoramas de Roma · 4 horas', en: 'Rome viewpoints · 4 hours' },
      desc: { pt: 'Roma é a cidade das sete colinas. Este passeio leva você aos mirantes com as vistas mais bonitas da cidade, com guia em português e motorista particular durante todo o trajeto.',
              en: 'Rome is the city of seven hills. This tour takes you to the viewpoints with the most beautiful views in the city, with a Portuguese-speaking guide and a private driver throughout.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '4h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português', 'Motorista particular'],
                    en: ['Guide in Portuguese', 'Private driver'] },
      notIncludes: { pt: ['Refeições', 'Ingressos — as visitas são externas'],
                    en: ['Meals', 'Tickets — all visits are from outside'] },
      stops: [],
      photo: 'arte/capa-roma.jpg',
      price: 580, priceMode: 'tabela',
      tabela: [580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580, 580],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 12
    },
    { id: 'degustacao', type: 'walk', region: 'roma',
      name: { pt: 'Passeio com degustação · 4 horas', en: 'Tasting walk · 4 hours' },
      desc: { pt: 'A Roma Barroca ou Trastevere, o bairro boêmio, com pequenas pausas para um café, um sorvete e outras delícias típicas da cozinha romana pelo caminho.',
              en: 'Baroque Rome or Trastevere, the bohemian quarter, with short stops for a coffee, an ice cream and other Roman specialities along the way.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '4h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português'],
                    en: ['Guide in Portuguese'] },
      notIncludes: { pt: ['Ingressos das atrações'],
                    en: ['Attraction tickets'] },
      stops: [],
      photo: 'arte/capa-roma.jpg',
      price: 0, priceMode: 'tabela',
      tabela: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 13,
      priceNote: { pt: 'Valor sob consulta — me chame que eu monto com você.',
                   en: 'Price on request — message me and we will put it together.' },
    },
    { id: 'criancas', type: 'walk', region: 'roma',
      name: { pt: 'Passeio com crianças', en: 'Tour with children' },
      desc: { pt: 'Como despertar o interesse das crianças durante a viagem? Este tour une história, curiosidades e momentos lúdicos. Duas opções: a pé pelas principais praças, Fontana di Trevi e Panteão; ou Roma Antiga, com Coliseu e Fórum Romano.',
              en: 'How do you keep children interested on a trip? This tour blends history, curiosities and playful moments. Two options: on foot through the main squares, Trevi Fountain and Pantheon; or Ancient Rome, with the Colosseum and the Roman Forum.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: '3h ou 4h', distance: '', effort: 'easy',
      includes: { pt: ['Guia em português'],
                    en: ['Guide in Portuguese'] },
      notIncludes: { pt: ['Ingressos das atrações'],
                    en: ['Attraction tickets'] },
      stops: [],
      photo: 'arte/capa-roma.jpg',
      price: 0, priceMode: 'tabela',
      tabela: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 14,
      priceNote: { pt: 'Valor e disponibilidade sob consulta. Também é possível com motorista + guia.',
                   en: 'Price and availability on request. Also available with driver + guide.' },
    },
    { id: 'papal-convites', type: 'papal', region: 'roma',
      name: { pt: 'Audiência Papal · retirada de convites', en: 'Papal Audience · invitation pick-up' },
      desc: { pt: 'A Audiência Papal acontece tradicionalmente todas as quartas-feiras no Vaticano. Eu solicito, retiro e entrego os convites diretamente no seu hotel.',
              en: 'The Papal Audience traditionally takes place every Wednesday at the Vatican. I request, collect and deliver the invitations directly to your hotel.' },
      meeting: 'Entrega no seu hotel',
      duration: '—', distance: '', effort: 'easy',
      includes: { pt: ['Solicitação dos convites', 'Retirada no Vaticano', 'Entrega no seu hotel'],
                    en: ['Invitation request', 'Pick-up at the Vatican', 'Delivery to your hotel'] },
      notIncludes: { pt: ['Acompanhamento durante a audiência'],
                    en: ['Escort during the audience'] },
      stops: [],
      photo: 'arte/capa-marca.jpg',
      price: 100, priceMode: 'tabela',
      tabela: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 15,
      priceNote: { pt: 'Condição: o hotel deve ficar no centro histórico de Roma e ter portaria 24 horas.',
                   en: 'Condition: the hotel must be in the historic centre of Rome and have a 24-hour front desk.' },
    },
    { id: 'papal-acompanhamento', type: 'papal', region: 'roma',
      name: { pt: 'Audiência Papal · acompanhamento', en: 'Papal Audience · with escort' },
      desc: { pt: 'Ver o Papa de perto durante a passagem do Papamóvel, com acompanhamento durante toda a audiência. Inclui a retirada dos convites.',
              en: 'See the Pope up close as the Popemobile passes, with an escort throughout the audience. Includes the invitation pick-up.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: 'Manhã de quarta-feira', distance: '', effort: 'easy',
      includes: { pt: ['Retirada dos convites', 'Acompanhamento durante a audiência'],
                    en: ['Invitation pick-up', 'Escort during the audience'] },
      notIncludes: { pt: ['Transfer'],
                    en: ['Transfer'] },
      stops: [],
      photo: 'arte/capa-marca.jpg',
      price: 440, priceMode: 'tabela',
      tabela: [440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440, 440],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 16
    },
    { id: 'papal-acomp-transfer', type: 'papal', region: 'roma',
      name: { pt: 'Audiência Papal · acompanhamento + transfer', en: 'Papal Audience · escort + transfer' },
      desc: { pt: 'O acompanhamento completo na Audiência Papal, com transfer de ida a partir do seu hotel.',
              en: 'The full Papal Audience escort, with a transfer from your hotel.' },
      meeting: 'No seu hotel',
      duration: 'Manhã de quarta-feira', distance: '', effort: 'easy',
      includes: { pt: ['Retirada dos convites', 'Acompanhamento durante a audiência', 'Transfer de ida'],
                    en: ['Invitation pick-up', 'Escort during the audience', 'Transfer to the Vatican'] },
      notIncludes: { pt: ['Transfer de volta'],
                    en: ['Return transfer'] },
      stops: [],
      photo: 'arte/capa-marca.jpg',
      price: 510, priceMode: 'tabela',
      tabela: [510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510, 510],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 17,
      priceNote: { pt: 'Transfer válido para hotéis no centro histórico.',
                   en: 'Transfer valid for hotels in the historic centre.' },
    },
    { id: 'bv-assis', type: 'day', region: 'forade',
      name: { pt: 'Assis e Orvieto (ou Cássia)', en: 'Assisi and Orvieto (or Cascia)' },
      desc: { pt: 'A terra natal de São Francisco, com a Basílica de São Francisco e a casa onde o santo nasceu. No caminho, parada na cidade medieval de Orvieto ou em Cássia, onde viveu e morreu Santa Rita.',
              en: 'The birthplace of Saint Francis, with the Basilica of Saint Francis and the house where he was born. On the way, a stop in the medieval town of Orvieto or in Cascia, where Saint Rita lived and died.' },
      meeting: 'No seu hotel, em Roma',
      duration: '10h', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa à disposição', 'Pedágio, combustível e estacionamentos'],
                    en: ['Portuguese-speaking driver at your disposal', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Guia ou acompanhante', 'Refeições', 'Vinícolas e degustações', 'Ingressos das atrações'],
                    en: ['Guide or escort', 'Meals', 'Wineries and tastings', 'Attraction tickets'] },
      stops: [],
      photo: 'arte/foto-assis.jpg',
      price: 950, priceMode: 'tabela',
      tabela: [950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 18
    },
    { id: 'bv-tivoli', type: 'day', region: 'forade',
      name: { pt: 'Tivoli · Villa Adriana e Villa d’Este', en: 'Tivoli · Villa Adriana and Villa d’Este' },
      desc: { pt: 'A elegante Tivoli, com a Villa Adriana, residência do imperador Adriano, e a Villa d’Este, conhecida no mundo todo pelos jardins renascentistas e pelas fontes.',
              en: 'Elegant Tivoli, with Villa Adriana, the emperor Hadrian’s residence, and Villa d’Este, known worldwide for its Renaissance gardens and fountains.' },
      meeting: 'No seu hotel, em Roma',
      duration: '8h', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa à disposição', 'Pedágio, combustível e estacionamentos'],
                    en: ['Portuguese-speaking driver at your disposal', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Guia ou acompanhante', 'Refeições', 'Vinícolas e degustações', 'Ingressos das atrações'],
                    en: ['Guide or escort', 'Meals', 'Wineries and tastings', 'Attraction tickets'] },
      stops: [],
      photo: 'arte/foto-tivoli.jpg',
      price: 850, priceMode: 'tabela',
      tabela: [850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 19
    },
    { id: 'bv-castelli', type: 'day', region: 'forade',
      name: { pt: 'Castelli Romani', en: 'Castelli Romani' },
      desc: { pt: 'As colinas ao sul de Roma: Castel Gandolfo, com a residência de verão do Papa, a encantadora Nemi e, no fim, Frascati, famosa pelos vinhos. Dá para incluir vinícola com degustação e almoço típico.',
              en: 'The hills south of Rome: Castel Gandolfo, with the Pope’s summer residence, charming Nemi and, to finish, Frascati, famous for its wines. A winery with tasting and a typical lunch can be added.' },
      meeting: 'No seu hotel, em Roma',
      duration: '8h', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa à disposição', 'Pedágio, combustível e estacionamentos'],
                    en: ['Portuguese-speaking driver at your disposal', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Guia ou acompanhante', 'Refeições', 'Vinícolas e degustações', 'Ingressos das atrações'],
                    en: ['Guide or escort', 'Meals', 'Wineries and tastings', 'Attraction tickets'] },
      stops: [],
      photo: 'arte/foto-castelli.jpg',
      price: 850, priceMode: 'tabela',
      tabela: [850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 20
    },
    { id: 'bv-bracciano', type: 'day', region: 'forade',
      name: { pt: 'Bracciano e Cerveteri', en: 'Bracciano and Cerveteri' },
      desc: { pt: 'Bracciano fica a uma hora de Roma e é famosa pelo Castelo Orsini-Odescalchi, cenário de casamentos de celebridades. O passeio pode incluir a Necrópole Etrusca de Cerveteri e o museu da cidade.',
              en: 'Bracciano is an hour from Rome and famous for the Orsini-Odescalchi Castle, setting for celebrity weddings. The tour can also include the Etruscan Necropolis of Cerveteri and the town museum.' },
      meeting: 'No seu hotel, em Roma',
      duration: '8h', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa à disposição', 'Pedágio, combustível e estacionamentos'],
                    en: ['Portuguese-speaking driver at your disposal', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Guia ou acompanhante', 'Refeições', 'Vinícolas e degustações', 'Ingressos das atrações'],
                    en: ['Guide or escort', 'Meals', 'Wineries and tastings', 'Attraction tickets'] },
      stops: [],
      photo: 'arte/foto-bracciano.jpg',
      price: 850, priceMode: 'tabela',
      tabela: [850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850, 850],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 21
    },
    { id: 'bv-civita', type: 'day', region: 'forade',
      name: { pt: 'Civita di Bagnoregio e Bolsena', en: 'Civita di Bagnoregio and Bolsena' },
      desc: { pt: 'Conhecida como "a cidade que está morrendo", Civita di Bagnoregio fica isolada sobre uma rocha, e o único acesso é uma longa ponte para pedestres. O passeio inclui o Lago de Bolsena e o castelo medieval Rocca Monaldeschi, ou a cidade medieval de Orvieto.',
              en: 'Known as "the dying town", Civita di Bagnoregio sits isolated on a rock, reached only by a long footbridge. The tour also includes Lake Bolsena and the medieval Rocca Monaldeschi castle, or the medieval town of Orvieto.' },
      meeting: 'No seu hotel, em Roma',
      duration: '8h', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa à disposição', 'Pedágio, combustível e estacionamentos'],
                    en: ['Portuguese-speaking driver at your disposal', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Guia ou acompanhante', 'Refeições', 'Vinícolas e degustações', 'Ingressos das atrações'],
                    en: ['Guide or escort', 'Meals', 'Wineries and tastings', 'Attraction tickets'] },
      stops: [],
      photo: 'arte/foto-civita.jpg',
      price: 900, priceMode: 'tabela',
      tabela: [900, 900, 900, 900, 900, 900, 900, 900, 900, 900, 900, 900, 900, 900, 900, 900, 900, 900, 900, 900],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 22
    },
    { id: 'bv-amalfi', type: 'day', region: 'forade',
      name: { pt: 'Costiera Amalfitana', en: 'Amalfi Coast' },
      desc: { pt: 'Uma das estradas panorâmicas mais bonitas do mundo, com paradas estratégicas para fotos e para as paisagens da costa. Visitamos Positano e Amalfi.',
              en: 'One of the most beautiful coastal roads in the world, with well-chosen stops for photos and views. We visit Positano and Amalfi.' },
      meeting: 'No seu hotel, em Roma',
      duration: '10h', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa à disposição', 'Pedágio, combustível e estacionamentos'],
                    en: ['Portuguese-speaking driver at your disposal', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Guia ou acompanhante', 'Refeições', 'Vinícolas e degustações', 'Ingressos das atrações'],
                    en: ['Guide or escort', 'Meals', 'Wineries and tastings', 'Attraction tickets'] },
      stops: [],
      photo: 'arte/foto-amalfi.jpg',
      price: 1000, priceMode: 'tabela',
      tabela: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 23
    },
    { id: 'bv-toscana-sul', type: 'day', region: 'forade',
      name: { pt: 'Toscana Sul · Montalcino e Pienza', en: 'Southern Tuscany · Montalcino and Pienza' },
      desc: { pt: 'Montalcino, Montepulciano e Pienza, algumas das cidades mais encantadoras da Toscana. É possível visitar vinícolas tradicionais e degustar alguns dos melhores vinhos do mundo.',
              en: 'Montalcino, Montepulciano and Pienza, some of the most charming towns in Tuscany. Traditional wineries can be visited, tasting some of the best wines in the world.' },
      meeting: 'No seu hotel, em Roma',
      duration: '10h', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa à disposição', 'Pedágio, combustível e estacionamentos'],
                    en: ['Portuguese-speaking driver at your disposal', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Guia ou acompanhante', 'Refeições', 'Vinícolas e degustações', 'Ingressos das atrações'],
                    en: ['Guide or escort', 'Meals', 'Wineries and tastings', 'Attraction tickets'] },
      stops: [],
      photo: 'arte/foto-toscana-sul.jpg',
      price: 950, priceMode: 'tabela',
      tabela: [950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 24
    },
    { id: 'bv-toscana-norte', type: 'day', region: 'forade',
      name: { pt: 'Toscana Norte · Siena e San Gimignano', en: 'Northern Tuscany · Siena and San Gimignano' },
      desc: { pt: 'Siena, Monteriggioni e San Gimignano, cartões-postais da Toscana. Em San Gimignano fica um dos melhores gelatos do mundo, e vale a parada.',
              en: 'Siena, Monteriggioni and San Gimignano, the postcards of Tuscany. San Gimignano has one of the best gelatos in the world, and it is worth the stop.' },
      meeting: 'No seu hotel, em Roma',
      duration: '10h', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa à disposição', 'Pedágio, combustível e estacionamentos'],
                    en: ['Portuguese-speaking driver at your disposal', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Guia ou acompanhante', 'Refeições', 'Vinícolas e degustações', 'Ingressos das atrações'],
                    en: ['Guide or escort', 'Meals', 'Wineries and tastings', 'Attraction tickets'] },
      stops: [],
      photo: 'arte/foto-toscana-norte.jpg',
      price: 950, priceMode: 'tabela',
      tabela: [950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 25
    },
    { id: 'bv-pompeia', type: 'day', region: 'forade',
      name: { pt: 'Pompeia e Nápoles (ou Vesúvio)', en: 'Pompeii and Naples (or Vesuvius)' },
      desc: { pt: 'Nápoles tem o melhor café e a melhor pizza da Itália. Pompeia é a cidade romana soterrada pelas cinzas do Vesúvio em 79 d.C., que preservou a vida da época de um jeito impressionante.',
              en: 'Naples has the best coffee and the best pizza in Italy. Pompeii is the Roman city buried by the ashes of Vesuvius in AD 79, which preserved daily life in astonishing detail.' },
      meeting: 'No seu hotel, em Roma',
      duration: '10h', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa à disposição', 'Pedágio, combustível e estacionamentos'],
                    en: ['Portuguese-speaking driver at your disposal', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Guia ou acompanhante', 'Refeições', 'Vinícolas e degustações', 'Ingressos das atrações'],
                    en: ['Guide or escort', 'Meals', 'Wineries and tastings', 'Attraction tickets'] },
      stops: [],
      photo: 'arte/foto-pompeia.jpg',
      price: 950, priceMode: 'tabela',
      tabela: [950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 26
    },
    { id: 'bv-personalizado', type: 'day', region: 'italia',
      name: { pt: 'Roteiro com motorista, personalizado', en: 'Custom itinerary with driver' },
      desc: { pt: 'Uma viagem por diferentes cidades da Itália com motorista privativo. Você monta o seu roteiro ou eu monto com você. São 10 horas de motorista à disposição por dia e cerca de 350 km diários.',
              en: 'A journey through different Italian cities with a private driver. You build your own itinerary or I build it with you. Ten hours of driver at your disposal per day and around 350 km a day.' },
      meeting: 'Onde você estiver hospedado',
      duration: '10h por dia', distance: '', effort: 'easy',
      includes: { pt: ['10 horas de motorista à disposição por dia', 'Cerca de 350 km por dia', 'Pedágio, combustível e estacionamentos'],
                    en: ['Ten hours of driver per day', 'Around 350 km a day', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Guia ou acompanhante', 'Refeições', 'Vinícolas e degustações', 'Ingressos das atrações'],
                    en: ['Guide or escort', 'Meals', 'Wineries and tastings', 'Attraction tickets'] },
      stops: [],
      photo: 'arte/capa-marca.jpg',
      price: 950, priceMode: 'tabela',
      tabela: [950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950, 950],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 27,
      priceNote: { pt: 'Mínimo de 2 diárias consecutivas. O valor é por dia.',
                   en: 'Minimum of two consecutive days. The price is per day.' },
    },
    { id: 'conexao-roma', type: 'conexao', region: 'roma',
      name: { pt: 'Conexão em Roma', en: 'Layover in Rome' },
      desc: { pt: 'Tem uma conexão longa em Roma? A gente monta um passeio de acordo com o seu tempo e com o que você quer ver. Sugestão: transfer de chegada + 3 ou 4 horas de walking tour + transfer de partida. Também há a opção de tour com motorista saindo e voltando ao aeroporto, com paradas no Coliseu, Fórum Romano, Piazza Navona, Piazza Venezia, Fontana di Trevi, Panteão e Piazza di San Pietro.',
              en: 'Got a long layover in Rome? We put together a tour that fits your time and what you want to see. Suggestion: arrival transfer + 3 or 4 hours of walking tour + departure transfer. There is also a driver tour leaving from and returning to the airport, with stops at the Colosseum, Roman Forum, Piazza Navona, Piazza Venezia, Trevi Fountain, Pantheon and St Peter’s Square.' },
      meeting: 'No aeroporto',
      duration: '3h, 4h ou 6h', distance: '', effort: 'easy',
      includes: { pt: ['Transfer de chegada e de partida', 'Walking tour com guia em português'],
                    en: ['Arrival and departure transfers', 'Walking tour with a Portuguese-speaking guide'] },
      notIncludes: { pt: ['Ingressos das atrações'],
                    en: ['Attraction tickets'] },
      stops: [],
      photo: 'arte/capa-conexao.jpg',
      price: 0, priceMode: 'tabela',
      tabela: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 28,
      priceNote: { pt: 'Valores sob consulta, e conexões noturnas têm valor próprio. Me chame que eu monto com você.',
                   en: 'Prices on request; night layovers are priced separately. Message me and we will put it together.' },
    },
    { id: 'cruzeiro', type: 'conexao', region: 'roma',
      name: { pt: 'Parada de cruzeiro em Roma', en: 'Cruise stop in Rome' },
      desc: { pt: 'Alguns cruzeiros param no Porto de Civitavecchia para uma visita rápida à cidade. Eu monto o passeio da sua parada: transfer de chegada + 3 ou 4 horas de walking tour + transfer de partida, ou um tour de 10 horas com motorista saindo e voltando ao porto.',
              en: 'Some cruises stop at the Port of Civitavecchia for a quick visit to the city. I build the tour around your stop: arrival transfer + 3 or 4 hours of walking tour + departure transfer, or a ten-hour driver tour leaving from and returning to the port.' },
      meeting: 'No Porto de Civitavecchia',
      duration: 'Até 10h', distance: '', effort: 'easy',
      includes: { pt: ['Transfer de chegada e de partida', 'Walking tour com guia em português'],
                    en: ['Arrival and departure transfers', 'Walking tour with a Portuguese-speaking guide'] },
      notIncludes: { pt: ['Ingressos das atrações'],
                    en: ['Attraction tickets'] },
      stops: [],
      photo: 'arte/capa-cruzeiro.jpg',
      price: 0, priceMode: 'tabela',
      tabela: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 29,
      priceNote: { pt: 'Valores sob consulta. Organizamos também experiências gastronômicas.',
                   en: 'Prices on request. We also organise food experiences.' },
    },
    { id: 'trem', type: 'trem', region: 'italia',
      name: { pt: 'Bate e volta de trem', en: 'Day trip by train' },
      desc: { pt: 'O trem é seguro, confortável e rápido, e é uma ótima forma de conhecer outras cidades durante a sua estadia em Roma. Os destinos mais procurados são Capri, Florença e Pisa, Assis, Tivoli, Pompeia e Nápoles.',
              en: 'The train is safe, comfortable and fast, and a great way to see other cities during your stay in Rome. The most requested destinations are Capri, Florence and Pisa, Assisi, Tivoli, Pompeii and Naples.' },
      meeting: 'Estação Termini',
      duration: 'Dia inteiro', distance: '', effort: 'easy',
      includes: { pt: ['Acompanhamento em português'],
                    en: ['Portuguese-speaking escort'] },
      notIncludes: { pt: ['Bilhetes de trem', 'Ingressos das atrações', 'Refeições'],
                    en: ['Train tickets', 'Attraction tickets', 'Meals'] },
      stops: [],
      photo: 'arte/capa-marca.jpg',
      price: 0, priceMode: 'tabela',
      tabela: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 30,
      priceNote: { pt: 'Valores sob consulta, variam conforme o destino e a data do bilhete.',
                   en: 'Prices on request; they vary with the destination and the ticket date.' },
    },
    { id: 'transfer-aeroporto', type: 'transfer', region: 'transfer',
      name: { pt: 'Aeroporto (FCO ou CIA) ↔ Centro Histórico', en: 'Airport (FCO or CIA) ↔ Historic Centre' },
      desc: { pt: 'Transfer entre o aeroporto de Fiumicino ou Ciampino e o centro histórico de Roma, com motorista em língua portuguesa. Estão inclusos pedágio, combustível e estacionamento.',
              en: 'Transfer between Fiumicino or Ciampino airport and the historic centre of Rome, with a Portuguese-speaking driver. Tolls, fuel and parking are included.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: 'Por trecho', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa', 'Pedágio, combustível e estacionamento'],
                    en: ['Portuguese-speaking driver', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Refeições', 'Ingressos'],
                    en: ['Meals', 'Tickets'] },
      stops: [],
      photo: 'arte/capa-transfer.jpg',
      price: 90, priceMode: 'transfer',
      transfer: {
        carro: { dia: 90, noite: 120, malas: 'até 2 malas médias (65x45x28) e 2 de bordo' },
        van:   { dia: 100, noite: 130, malas: 'até 6 malas médias (65x45x28) e as de bordo' },
      },
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 31,
      priceNote: { pt: 'Inclui 1 hora de espera no aeroporto após o pouso (acompanhamos pelo número do voo). Passada 1 hora, há cobrança de €40 por veículo por hora. Pagamento em dinheiro; no cartão há acréscimo de 10%. O valor é por trecho, não por pessoa.',
                   en: 'Includes one hour of waiting at the airport after landing (we track your flight number). After that hour, €40 per vehicle per hour applies. Payment in cash; card payments carry a 10% surcharge. The price is per trip, not per person.' },
    },
    { id: 'transfer-civitavecchia', type: 'transfer', region: 'transfer',
      name: { pt: 'Porto de Civitavecchia ↔ Centro ou Aeroporto', en: 'Port of Civitavecchia ↔ Centre or Airport' },
      desc: { pt: 'Transfer entre o Porto de Civitavecchia e o centro histórico de Roma ou o aeroporto, com motorista em língua portuguesa.',
              en: 'Transfer between the Port of Civitavecchia and the historic centre of Rome or the airport, with a Portuguese-speaking driver.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: 'Por trecho', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa', 'Pedágio, combustível e estacionamento'],
                    en: ['Portuguese-speaking driver', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Refeições', 'Ingressos'],
                    en: ['Meals', 'Tickets'] },
      stops: [],
      photo: 'arte/capa-transfer.jpg',
      price: 190, priceMode: 'transfer',
      transfer: {
        carro: { dia: 190, noite: 220, malas: 'até 2 malas médias (65x45x28) e 2 de bordo' },
        van:   { dia: 210, noite: 240, malas: 'até 6 malas médias (65x45x28) e as de bordo' },
      },
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 32,
      priceNote: { pt: 'Inclui 15 minutos de espera no porto. Depois disso, há cobrança de €20 a cada 20 minutos de espera. Pagamento em dinheiro; no cartão há acréscimo de 10%. O valor é por trecho, não por pessoa.',
                   en: 'Includes 15 minutes of waiting at the port. After that, €20 for every 20 minutes of waiting. Payment in cash; card payments carry a 10% surcharge. The price is per trip, not per person.' },
    },
    { id: 'transfer-termini', type: 'transfer', region: 'transfer',
      name: { pt: 'Estação Termini ↔ Centro (ou Centro ↔ Centro)', en: 'Termini Station ↔ Centre (or Centre ↔ Centre)' },
      desc: { pt: 'Transfer entre a Estação Termini e o centro histórico, ou entre dois pontos do próprio centro histórico, com motorista em língua portuguesa.',
              en: 'Transfer between Termini Station and the historic centre, or between two points within the historic centre, with a Portuguese-speaking driver.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: 'Por trecho', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa', 'Pedágio, combustível e estacionamento'],
                    en: ['Portuguese-speaking driver', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Refeições', 'Ingressos'],
                    en: ['Meals', 'Tickets'] },
      stops: [],
      photo: 'arte/capa-transfer.jpg',
      price: 70, priceMode: 'transfer',
      transfer: {
        carro: { dia: 70, noite: 100, malas: 'até 2 malas médias (65x45x28) e 2 de bordo' },
        van:   { dia: 80, noite: 110, malas: 'até 6 malas médias (65x45x28) e as de bordo' },
      },
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 33,
      priceNote: { pt: 'Inclui 15 minutos de espera na estação. Depois disso, há cobrança de €20 a cada 20 minutos de espera. Pagamento em dinheiro; no cartão há acréscimo de 10%. O valor é por trecho, não por pessoa.',
                   en: 'Includes 15 minutes of waiting at the station. After that, €20 for every 20 minutes of waiting. Payment in cash; card payments carry a 10% surcharge. The price is per trip, not per person.' },
    },
    { id: 'transfer-outlet', type: 'transfer', region: 'transfer',
      name: { pt: 'Centro Histórico ↔ Outlet Castel Romano', en: 'Historic Centre ↔ Castel Romano Outlet' },
      desc: { pt: 'Transfer entre o centro histórico e o Outlet Castel Romano, com motorista em língua portuguesa.',
              en: 'Transfer between the historic centre and the Castel Romano Outlet, with a Portuguese-speaking driver.' },
      meeting: 'Combinado por WhatsApp após a reserva',
      duration: 'Por trecho', distance: '', effort: 'easy',
      includes: { pt: ['Motorista em língua portuguesa', 'Pedágio, combustível e estacionamento'],
                    en: ['Portuguese-speaking driver', 'Tolls, fuel and parking'] },
      notIncludes: { pt: ['Refeições', 'Ingressos'],
                    en: ['Meals', 'Tickets'] },
      stops: [],
      photo: 'arte/capa-transfer.jpg',
      price: 90, priceMode: 'transfer',
      transfer: {
        carro: { dia: 90, noite: 120, malas: 'até 2 malas médias (65x45x28) e 2 de bordo' },
        van:   { dia: 100, noite: 130, malas: 'até 6 malas médias (65x45x28) e as de bordo' },
      },
      min: 1, max: 20, payPolicy: 'split', status: 'live', order: 34,
      priceNote: { pt: 'A espera no outlet custa €60 por hora para carro e €70 para minivan. Pagamento em dinheiro; no cartão há acréscimo de 10%. O valor é por trecho, não por pessoa.',
                   en: 'Waiting at the outlet costs €60 per hour for a car and €70 for a minivan. Payment in cash; card payments carry a 10% surcharge. The price is per trip, not per person.' },
    },
  ];

  db.rules = [
    { id: 'r1', tourId: 'roma-antiga-3h', weekdays: [1, 2, 3, 4, 5, 6], time: '09:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r2', tourId: 'roma-antiga-4h', weekdays: [1, 4, 6],          time: '09:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r3', tourId: 'vaticano-3h',    weekdays: [1, 2, 4, 5, 6],    time: '09:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r4', tourId: 'vaticano-4h',    weekdays: [1, 4],             time: '09:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r5', tourId: 'barroca-3h',     weekdays: [0, 1, 2, 3, 4, 5, 6], time: '10:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r6', tourId: 'noturno-3h',     weekdays: [4, 5, 6],          time: '19:30', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r7', tourId: 'basilicas-3h',   weekdays: [2, 5],             time: '09:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r8', tourId: 'panoramas-3h',   weekdays: [3, 6],             time: '15:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    /* Audiencia Papal: quarta-feira, so. O Vaticano nao faz em outro dia —
       oferecer uma terca aqui seria vender o que nao existe. */
    { id: 'r9',  tourId: 'papal-convites',       weekdays: [3], time: '08:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r10', tourId: 'papal-acompanhamento', weekdays: [3], time: '08:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r11', tourId: 'papal-acomp-transfer', weekdays: [3], time: '07:30', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r12', tourId: 'bv-tivoli',   weekdays: [1, 3, 5], time: '08:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r13', tourId: 'bv-assis',    weekdays: [2, 6],    time: '07:30', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r14', tourId: 'bv-pompeia',  weekdays: [0, 4],    time: '07:30', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r15', tourId: 'bv-amalfi',   weekdays: [5],       time: '07:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r16', tourId: 'bv-castelli', weekdays: [2],       time: '08:30', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    /* Transfer roda todo dia. Os horarios cobrem os dois lados da virada das
       21h, que e onde a tabela dela troca de valor. */
    { id: 'r17', tourId: 'transfer-aeroporto',     weekdays: [0, 1, 2, 3, 4, 5, 6], time: '09:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r18', tourId: 'transfer-aeroporto',     weekdays: [0, 1, 2, 3, 4, 5, 6], time: '15:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r19', tourId: 'transfer-aeroporto',     weekdays: [0, 1, 2, 3, 4, 5, 6], time: '22:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r20', tourId: 'transfer-civitavecchia', weekdays: [0, 1, 2, 3, 4, 5, 6], time: '07:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r21', tourId: 'transfer-termini',       weekdays: [0, 1, 2, 3, 4, 5, 6], time: '10:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r22', tourId: 'transfer-termini',       weekdays: [0, 1, 2, 3, 4, 5, 6], time: '21:30', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
    { id: 'r23', tourId: 'transfer-outlet',        weekdays: [1, 2, 3, 4, 5, 6],    time: '10:00', capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) },
  ];

  db.coupons = [
    { code: 'VOLTA10', pct: 10, until: '2026-12-31', oncePerPerson: true, uses: [] },
    { code: 'AMIGO15', pct: 15, until: '2026-12-31', oncePerPerson: true, uses: [] },
  ];

  /* ---- clientes e reservas de exemplo (histórico crível) ---- */
  const people = [
    ['Patrícia Menezes',  'patricia.menezes@email.com', '+55 11 98123 4455', 'pat.menezes',  'instagram'],
    ['Rodrigo Tavares',   'rodrigo.tavares@email.com',  '+55 21 99654 1122', '',             'friend'],
    ['Luciana Prado',     'luciana.prado@email.com',    '+55 31 98877 3344', 'lu.prado',     'instagram'],
    ['Fernando Aguiar',   'fernando.aguiar@email.com',  '+351 912 445 778',  '',             'friend'],
    ['Cristina Bonatto',  'cris.bonatto@email.com',     '+55 51 99231 7788', 'cris.bonatto', 'whatsapp'],
    ['Marcelo Yamada',    'm.yamada@email.com',         '+55 11 97744 2211', '',             'site'],
    ['Renata Coutinho',   'renata.coutinho@email.com',  '+55 41 99812 3399', 'recoutinho',   'friend'],
    ['Paulo Sérgio Lima', 'ps.lima@email.com',          '+55 85 98122 6677', '',             'agency'],
  ];
  const plan = [
    /* [pessoa, passeio, dias atrás, pax, quitado?] */
    [0, 'roma-antiga-3h', 46, 2, true],  [1, 'vaticano-3h', 39, 4, true],
    [2, 'barroca-3h',     33, 2, true],  [3, 'bv-tivoli',   27, 5, true],
    [4, 'papal-acompanhamento', 22, 2, true], [0, 'noturno-3h', 18, 2, true],
    [5, 'bv-pompeia',     13, 4, true],  [6, 'vaticano-4h',  9, 3, true],
    [7, 'roma-antiga-3h',  5, 6, true],  [2, 'basilicas-3h', 2, 2, true],
    [1, 'bv-amalfi',      -4, 4, false], [3, 'panoramas-3h', -8, 2, false],
    [6, 'papal-convites', -11, 2, true], [4, 'bv-assis',    -16, 6, false],
  ];
  let n = 0;
  for (const [pi, tourId, back, pax, settled] of plan) {
    const [name, email, whats, insta, origin] = people[pi];
    const x = db.tours.find(z => z.id === tourId);
    const date = addDays(isoToday(), -back);
    const rule = db.rules.find(r => r.tourId === tourId);
    const time = rule ? rule.time : '10:00';
    const total = x.priceMode === 'transfer' ? transferPreco(x, pax > 4 ? 'van' : 'carro', time)
                : x.priceMode === 'tabela' ? tabelaPreco(x, pax)
                : x.priceMode === 'session' ? x.price : x.price * pax;
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
  return db;
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

  create({ tourId, date, time, name, email, whats, insta, pax, coupon, policy, origin, consent, veiculo, group }) {
    const tour = Tours.get(tourId);
    /* Tem que ser o MESMO calculo que a tela mostrou. tour.price * pax ignora
       o preco escalonado (195 para as 3 primeiras, 225 depois) e gravava a
       reserva abaixo do que a pessoa acabou de ler. */
    /* O veiculo tem que vir junto: sem ele, uma reserva de minivan as 22h
       era gravada pelo valor do carro diurno. A tela mostrava 130 e o caixa
       guardava 90, e so o extrato no fim do mes acusaria. */
    const base = Bookings.precoDe(tour, tourId, date, time, pax, { veiculo }).total;
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
      veiculo: veiculo || '',
      /* QUEM MAIS VEM NO GRUPO.

         A Ingrid pediu isto em audio: ate hoje ela so registra quem fez a
         reserva, mas muita gente volta depois por indicacao de alguem que
         VEIO JUNTO e nunca falou com ela. Sem os nomes do grupo, essa
         pessoa nao existe na base dela e a indicacao se perde. */
      group: Array.isArray(group) ? group.filter(g => g && g.nome).map(g => ({
        nome: String(g.nome).trim(),
        nasc: String(g.nasc || '').trim(),
      })) : [],
      consent: consent ? { ok: true, at: new Date().toISOString(), src: 'checkout' } : { ok: false },
      payments: [], status: 'confirmed',
      createdAt: new Date().toISOString(), origin: origin || 'site',
      /* Em que idioma ele reservou. Sem isto o e-mail de recibo sai em
         portugues para um frances que leu a tela inteira em ingles. */
      lang: (typeof LANG !== 'undefined' && LANG === 'en') ? 'en' : 'pt',
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
  precoDe(x, tourId, date, time, pax, opt) {
    const cheio = +x.price || 0;
    const tarde = +x.priceLate || 0;
    const vagasBaratas = +x.earlySeats || 0;
    if (x.priceMode === 'transfer') {
      /* pax aqui carrega o veiculo escolhido, nao um numero de pessoas */
      const veic = ((opt && opt.veiculo) || x._veiculo || 'carro');
      const v = transferPreco(x, veic, time);
      return { total: v, linhas: [{ qtd: 1, valor: v, fechado: true }], veiculo: veic,
               noturno: transferNoturno(time), consultar: v === 0 };
    }
    if (x.priceMode === 'tabela') {
      const v = tabelaPreco(x, pax);
      return { total: v, linhas: [{ qtd: pax, valor: v, fechado: true }], consultar: v === 0 };
    }
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

      /* QUEM VEIO JUNTO tambem e cliente.

         A Ingrid explicou o porque: muita gente volta anos depois por
         indicacao de alguem que estava NO GRUPO e nunca falou com ela. Se a
         base so tem quem reservou, essa pessoa chega do nada e a indicacao
         se perde. Aqui ela entra com o nome, a data de nascimento e por
         quem veio.

         Nao tem e-mail nem WhatsApp: a chave e o nome. Homonimo junta os
         dois, e tudo bem — e melhor que nao existir. */
      for (const g of (b.group || [])) {
        /* Trim aqui tambem, e nao so em create(): reserva que chega da nuvem
           nao passa por create, e um nome so com espacos viraria um cliente
           sem nome na base dela. */
        const gnome = String((g && g.nome) || '').trim();
        if (!gnome) continue;
        const gk = 'g:' + gnome.toLowerCase();
        const gc = map.get(gk) || { name: gnome, email: '', whats: '', insta: '',
                                    nasc: String((g && g.nasc) || '').trim(), veioCom: b.name, acompanhante: true,
                                    tours: 0, spent: 0, last: '', origins: new Set(),
                                    consent: false, consentAt: '' };
        gc.tours += 1;
        if (b.date > gc.last) gc.last = b.date;
        if (!gc.nasc && g.nasc) gc.nasc = String(g.nasc).trim();
        if (b.origin) gc.origins.add(b.origin);
        map.set(gk, gc);
      }
    }
    /* Acompanhante nao gastou nada por si: ordenar so por gasto jogaria todos
       para o fim da lista. Quem gastou vem primeiro; depois, os mais recentes. */
    return [...map.values()].sort((a, b) =>
      (b.spent - a.spent) || (b.last || '').localeCompare(a.last || ''));
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
