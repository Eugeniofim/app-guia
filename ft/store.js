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
const DB_KEY = 'ft_db_v1';

/* ---------- de onde a pessoa veio (R4, perguntas da Milla de 01/10/2026) ----------
   O robô do WhatsApp/Instagram e a bio mandam o link com ?de=whatsapp,
   ?de=instagram, ?de=tiktok… A primeira página da visita guarda o canal; a
   visita, o "quase reservou", a reserva e o pedido levam o canal junto, e o
   Dashboard mostra a conversão por canal. Sem ?de= = "direto". */
const CANAIS = [['instagram', 'Instagram'], ['whatsapp', 'WhatsApp'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['google', 'Google'], ['site', 'Site'], ['direto', 'Direto / outro']];
function canalAtual() {
  try {
    const q = new URLSearchParams(location.search);
    let c = String(q.get('de') || q.get('utm_source') || '').toLowerCase().trim();
    if (c) { c = c.startsWith('insta') || c === 'ig' ? 'instagram' : c.startsWith('wa') || c.startsWith('whats') ? 'whatsapp' : c.startsWith('tik') ? 'tiktok' : c.startsWith('yt') || c.startsWith('you') ? 'youtube' : c;
             if (!CANAIS.some(x => x[0] === c)) c = 'direto'; sessionStorage.setItem('ft_canal', c); return c; }
    return sessionStorage.getItem('ft_canal') || 'direto';
  } catch (e) { return 'direto'; }
}
const canalNome = (c) => (CANAIS.find(x => x[0] === c) || [c, c || 'Direto'])[1];
/* O LINK DO PARCEIRO (28/10/2026): yallaexperiences.com/?p=CUPOM. Quem chega por
   ele fica marcado por 60 dias (neste aparelho) e a marca vai na reserva, no
   pedido de roteiro, no pedido de orçamento e na mensagem do WhatsApp — a
   comissão entra sozinha em "Indicações e cupons" (o código é o cupom dele). */
const PARCEIRO_KEY = 'ft_parceiro_v1', PARCEIRO_DIAS = 60;
function parceiroDaVisita() {
  try {
    const q = new URLSearchParams(location.search);
    const c = String(q.get('p') || q.get('parceiro') || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
    if (c) { localStorage.setItem(PARCEIRO_KEY, JSON.stringify({ c, em: Date.now() })); return c; }
    const g = JSON.parse(localStorage.getItem(PARCEIRO_KEY) || 'null');
    return g && g.c && Date.now() - g.em < PARCEIRO_DIAS * 864e5 ? g.c : '';
  } catch (e) { return ''; }
}
/* grava o canal já na chegada: o ?de= some quando a pessoa reabre o app */
if (typeof location !== 'undefined' && typeof sessionStorage !== 'undefined') canalAtual();
if (typeof location !== 'undefined' && typeof localStorage !== 'undefined') parceiroDaVisita();

/* ---------- modelo ----------
Tour       {id, type, region, name:{pt,en}, desc:{pt,en}, meeting, photo,
            price, priceMode:'pp'|'session'|'tabela', tabela:[20 valores], min, max,
            payPolicy:'full'|'split',
            status:'live'|'draft'|'seasonal', order}
Rule       {id, tourId, weekdays:[0-6], time:'16:30', capacity, from:'2026-11-20', until:'2026-12-23'}
Departure  {id, tourId, date:'2026-12-21', time, capacity}  // avulsas; recorrentes são geradas das Rules
Block      {id, from, until, reason}                        // bloqueio global (férias)
Booking    {id, code, tourId, date, time, name, email, whats, insta, pax, total,
            veiculo, malas, sinal,          // so nos transfers (da tabela dela)
            group:[{nome, nasc}],            // quem mais veio, alem de quem reservou
            coupon, discount, policy:'full'|'split'|'sinal',
            adultos, criancas,
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
  /* O que ela cadastrou no painel vem primeiro. O try e porque DB e "let"
     e pode ainda nao existir quando o arquivo carrega. */
  try {
    const d = DB && DB.settings && DB.settings.regioes;
    if (Array.isArray(d) && d.length) return d;
  } catch (e) {}
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

/* ---------- transfer: pessoas, bagagem e horario ----------

   A tabela dela de 2026 (TABELA VALORES 2026 - Transfer Roma.pdf) cobra por
   TRECHO, nunca por pessoa, e o valor depende de tres coisas:

     1. QUANTAS PESSOAS, de 1 a 20 ("1 ou 2 pessoas" e uma linha so);
     2. para cada quantidade ha DUAS opcoes de veiculo, e quem decide entre
        elas e a BAGAGEM (ex.: 3 pessoas com 2 malas cabem num carro; com 6
        malas precisam de minivan);
     3. a HORA: das 21h as 5h59 vale a coluna "Noturno".

   Cada linha tem tambem o SINAL, que e o que o cliente paga antes para
   garantir. O resto e no dia.

   transfer.linhas = [{ pax, malas, veiculo, dia, noite, sinal }]
   pax 2 = "1 ou 2 pessoas". */
const NOITE_DE = 21, NOITE_ATE = 6;   /* 21:00 as 05:59 = noturno */

function transferNoturno(hora) {
  const h = parseInt(String(hora || '').slice(0, 2), 10);
  if (isNaN(h)) return false;
  return h >= NOITE_DE || h < NOITE_ATE;
}

/* "1 ou 2 pessoas" e a mesma linha na tabela dela */
function transferPax(pax) { return Math.max(2, Math.min(20, +pax || 1)); }

/* as opcoes de veiculo para aquela quantidade, na ordem da tabela */
function transferOpcoes(x, pax) {
  const ls = (x.transfer && Array.isArray(x.transfer.linhas)) ? x.transfer.linhas : [];
  const n = transferPax(pax);
  const exatas = ls.filter(l => +l.pax === n);
  if (exatas.length) return exatas;
  /* 13/11/2026: a tabela da Milla é por carro (até 2, até 4, até 6 pessoas). Sem a linha exata, vale o menor
     carro que cabe o grupo: 3 pessoas pegam a linha de 4. Antes saía "sob consulta". */
  const cabem = ls.filter(l => +l.pax >= n);
  if (!cabem.length) return [];
  const menor = Math.min(...cabem.map(l => +l.pax));
  return cabem.filter(l => +l.pax === menor);
}

function transferLinha(x, pax, opcao) {
  const ops = transferOpcoes(x, pax);
  return ops[Math.max(0, Math.min(ops.length - 1, +opcao || 0))] || null;
}

function transferPreco(x, pax, opcao, hora) {
  const l = transferLinha(x, pax, opcao);
  if (!l) return 0;
  return +(transferNoturno(hora) ? l.noite : l.dia) || 0;
}

/* o "a partir de": o menor valor diurno da tabela */
function transferMenor(x) {
  const ls = (x.transfer && x.transfer.linhas) || [];
  const v = ls.map(l => +l.dia || 0).filter(v => v > 0);
  return v.length ? Math.min(...v) : 0;
}

/* ate quantas pessoas a tabela responde */
function transferAte(x) {
  const ls = (x.transfer && x.transfer.linhas) || [];
  return ls.reduce((m, l) => Math.max(m, +l.pax || 0), 0);
}

/* ---------- ingressos por idade ----------

   Pedido da Ingrid (18/09/2026): "teria como ja somar o valor de ingressos
   por idade?". Os ingressos nao estao no valor do passeio, e o preco muda com
   a idade — no Vaticano, crianca ate 6 nao paga, jovem ate 18 paga €15 e
   adulto €25. Ela compra os ingressos com antecedencia, entao precisa saber
   o valor certo na hora da reserva.

   x.ingressos = [{ nome:{pt,en}, gratisAte, reduzido, reduzidoAte, inteiro,
                    guia, noDia }]
     gratisAte   = ate esta idade (inclusive) nao paga
     reduzido    = valor reduzido, ate reduzidoAte (inclusive)
     inteiro     = o resto, e todo adulto
     guia        = o ingresso da propria guia, cobrado uma vez (Sao Pedro)
     noDia       = pago no dia, fora do total (os fones do Vaticano)

   Adulto nao informa idade: paga o inteiro. */
function precoIngresso(g, idade) {
  const a = idade === null || idade === undefined ? 99 : +idade;
  const tem = (v) => v !== null && v !== undefined && v !== '';
  if (tem(g.gratisAte) && a <= +g.gratisAte) return 0;
  if (+g.reduzido > 0 && tem(g.reduzidoAte) && a <= +g.reduzidoAte) return +g.reduzido;
  return +g.inteiro || 0;
}

function ingressosDe(x, adultos, idades) {
  const ings = Array.isArray(x.ingressos) ? x.ingressos : [];
  const pessoas = Array(Math.max(0, +adultos || 0)).fill(null)
    .concat((idades || []).map(v => (v === '' || v === null || v === undefined) ? null : +v));
  const linhas = [], noDia = [];
  let total = 0, totalDia = 0;
  for (const g of ings) {
    const porValor = {};
    let soma = 0;
    for (const idade of pessoas) {
      const v = precoIngresso(g, idade);
      soma += v; porValor[v] = (porValor[v] || 0) + 1;
    }
    const guia = +g.guia || 0;
    soma += guia;
    const linha = { nome: g.nome, valor: soma, porValor, guia };
    if (g.noDia) { noDia.push(linha); totalDia += soma; } else { linhas.push(linha); total += soma; }
  }
  return { linhas, total, noDia, totalDia };
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
           /* pedidos de roteiro personalizado (o questionario do cliente) */
           pedidos: [],
           settings: { lang: 'en', tutorialClient: true, tutorialAdm: true,
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
           /* Wise: link de pagamento (wise.com/pay/...). Dinheiro no dia: o
              transfer dela e cobrado assim. Vazio/falso = nao aparece. */
           wiseLink: '', dinheiroNoDia: false,
           /* A primeira tela e o "link na bio" dela: redes e os links de
              parceiros que ela ja divulga (hotel, chip, seguro). Ela edita
              tudo no painel, em Aparencia. */
           youtube: '', facebook: '', blog: '',
           links: [],
           /* cidades e regioes da vitrine. Vazio = as do config.js. Ela
              acrescenta uma cidade nova pelo painel, sem nos. */
           regioes: [],
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
  db.seedVer = SEED_VER;

  /* FT (16/11/2026): a apresentação do Roberto — do "About us" do site dele
     (freddyturismo.com). Ele reescreve em Ajustes. */
  db.settings.homeText = {
    en: 'Private chauffeur, concierge and tailor-made journeys across England, Scotland and Europe — in executive Mercedes, with a driver-guide who knows every story.',
    pt: 'Chauffeur particular, concierge e viagens sob medida pela Inglaterra, Escócia e Europa — em Mercedes executivos, com um motorista-guia que conhece cada história.',
    it: 'Autista privato, concierge e viaggi su misura in Inghilterra, Scozia ed Europa — in Mercedes executive, con un autista-guida che conosce ogni storia.',
  };
  db.settings.links = [];
  db.settings.facebook = 'https://www.facebook.com/FreddyTransportes';
  db.settings.site = '';
  db.settings.feedbackIg = '';
  db.settings.photo = 'arte/f/mercedes.jpg';
  db.settings.homePhoto = '';
  db.settings.bio = {
    en: 'I am Roberto Rivelino. I am Brazilian and I have been working in London since 2008, where I saw a real need for transfers and tours with a more personal, family touch.\n\n'
      + 'That is how FT was born: transfers in and around London, and tours where your driver is also your guide — the story of every place, and your photos taken along the way. Over the years I have explored the English countryside, Wales, Ireland and Scotland so I can take you to the most beautiful places knowing exactly what I am showing you.\n\n'
      + 'Executive Mercedes (S-Class, E-Class and V-Class), TfL licensed, with Wi-Fi, water and an umbrella for you. Portuguese, English, Italian and Spanish.',
    pt: 'Sou Roberto Rivelino, brasileiro, e trabalho em Londres desde 2008. Aqui eu vi que faltava um serviço de transfer e turismo mais próximo, mais familiar.\n\n'
      + 'Foi assim que nasceu a FT: transfers em Londres e arredores, e passeios em que o motorista também é o guia — a história de cada lugar e as fotos de vocês pelo caminho. Com os anos fui conhecendo o interior da Inglaterra, o País de Gales, a Irlanda e a Escócia, para levar vocês aos lugares mais bonitos sabendo o que estou mostrando.\n\n'
      + 'Mercedes executivos (Classe S, Classe E e V-Class), licenciados pela TfL, com Wi-Fi, água e guarda-chuva. Português, inglês, italiano e espanhol.',
    it: 'Sono Roberto Rivelino, brasiliano, e lavoro a Londra dal 2008, dove ho visto il bisogno di transfer e tour più personali, quasi di famiglia.\n\n'
      + 'Così è nata FT: transfer a Londra e dintorni, e tour in cui l’autista è anche la guida — la storia di ogni luogo e le vostre foto lungo la strada.\n\n'
      + 'Mercedes executive (Classe S, Classe E e V-Class), con licenza TfL, Wi-Fi, acqua e ombrello. Portoghese, inglese, italiano e spagnolo.',
  };

  /* Sob consulta: tabela zerada = o app não inventa preço e manda o pedido para o WhatsApp dele */
  const consulta = () => Array(20).fill(0);
  const NOTA_CONSULTA = { en: 'On request: every journey is built around you.', pt: 'Sob consulta: cada viagem é montada para você.', it: 'Su richiesta: ogni viaggio è costruito per te.' };
  const NOTA_EX = { en: 'Price per car (not per person). Example prices — confirmed on booking.', pt: 'Valor por carro (não por pessoa). Valores de exemplo — confirmados na reserva.', it: 'Prezzo per auto (non a persona). Prezzi di esempio — confermati alla prenotazione.' };
  const INC = { en: ['Executive Mercedes with driver-guide', 'Pick-up and drop-off at your hotel', 'Wi-Fi, water and umbrella', 'Your photos at every stop'],
                pt: ['Mercedes executivo com motorista-guia', 'Busca e volta no seu hotel', 'Wi-Fi, água e guarda-chuva', 'Fotos de vocês em cada parada'],
                it: ['Mercedes executive con autista-guida', 'Prelievo e rientro in hotel', 'Wi-Fi, acqua e ombrello', 'Le vostre foto a ogni tappa'] };
  const NAO = { en: ['Attraction tickets', 'Meals'], pt: ['Ingressos das atrações', 'Refeições'], it: ['Biglietti delle attrazioni', 'Pasti'] };
  const T = (o) => Object.assign({ distance: '', effort: 'easy', includes: INC, notIncludes: NAO, stops: [], min: 1, max: 7, payPolicy: 'split', status: 'live',
    meeting: 'At your hotel in London' }, o);
  db.tours = [
    /* ---------- LONDON ---------- */
    T({ id: 'chauffeur', type: 'walk', region: 'londres', categoria: 'london', order: 1, photo: 'arte/f/mercedes.jpg',
      name: { en: 'Private chauffeur by the hour', pt: 'Chauffeur particular por hora', it: 'Autista privato a ore' },
      desc: { en: 'A Mercedes and your driver at your disposal: shopping, meetings, dinners, a show in the West End. You decide the plan, we take care of the rest.',
              pt: 'Um Mercedes e o seu motorista à disposição: compras, reuniões, jantares, um musical no West End. Você decide o plano, a gente cuida do resto.',
              it: 'Una Mercedes e il tuo autista a disposizione: shopping, riunioni, cene, uno spettacolo nel West End. Tu decidi il programma, al resto pensiamo noi.' },
      duration: 'From 4 hours', price: 70, priceMode: 'hora', minHoras: 4, priceNote: NOTA_EX }),
    T({ id: 'london-city-tour', type: 'walk', region: 'londres', categoria: 'london', order: 2, photo: 'arte/f/westminster-night.jpg',
      name: { en: 'London City Tour by Mercedes', pt: 'City Tour de Londres de Mercedes', it: 'City Tour di Londra in Mercedes' },
      desc: { en: 'All of London in one day without tired legs: Westminster, Buckingham and the Changing of the Guard, Trafalgar, Notting Hill, Abbey Road, St Paul’s, the Tower and Tower Bridge — a stop for photos and a story at each one.',
              pt: 'Londres inteira num dia, sem cansar as pernas: Westminster, Buckingham e a Troca da Guarda, Trafalgar, Notting Hill, Abbey Road, St Paul’s, a Torre e a Tower Bridge — parada para foto e história em cada um.',
              it: 'Tutta Londra in un giorno senza stancarsi: Westminster, Buckingham e il Cambio della Guardia, Trafalgar, Notting Hill, Abbey Road, St Paul’s, la Torre e il Tower Bridge.' },
      duration: '8 hours', price: 480, priceMode: 'session', priceNote: NOTA_EX }),
    T({ id: 'harry-potter', type: 'walk', region: 'londres', categoria: 'special', order: 3, photo: 'arte/f/harry-potter.jpg',
      name: { en: 'Harry Potter Studios', pt: 'Estúdios Harry Potter', it: 'Studi di Harry Potter' },
      desc: { en: 'Door to door to the Warner Bros. studios at Leavesden, with a stop at Platform 9¾ on request. We wait for you until the end of the visit.',
              pt: 'Porta a porta até os estúdios da Warner em Leavesden, com parada na Plataforma 9¾ se quiser. Esperamos até o fim da visita.',
              it: 'Porta a porta agli studi Warner Bros. di Leavesden, con sosta al Binario 9¾ su richiesta. Vi aspettiamo fino alla fine della visita.' },
      duration: '6 hours', price: 380, priceMode: 'session', priceNote: NOTA_EX }),
    T({ id: 'football', type: 'walk', region: 'londres', categoria: 'special', order: 4, photo: 'arte/f/tower-bridge.jpg',
      name: { en: 'London Football Tour', pt: 'Tour do Futebol em Londres', it: 'Tour del calcio a Londra' },
      desc: { en: 'Two legendary stadium tours of your choice — Chelsea, Arsenal, Tottenham or Wembley — with the landmarks of London in between.',
              pt: 'Dois tours de estádio à sua escolha — Chelsea, Arsenal, Tottenham ou Wembley — com os cartões-postais de Londres no caminho.',
              it: 'Due tour di stadi a scelta — Chelsea, Arsenal, Tottenham o Wembley — con i luoghi simbolo di Londra in mezzo.' },
      duration: '8 hours', price: 480, priceMode: 'session', priceNote: NOTA_EX }),
    /* ---------- ENGLAND ---------- */
    T({ id: 'windsor-oxford', type: 'day', region: 'inglaterra', categoria: 'england', order: 10, photo: 'arte/f/windsor.jpg',
      name: { en: 'Windsor & Oxford', pt: 'Windsor e Oxford', it: 'Windsor e Oxford' },
      desc: { en: 'The King’s castle in the morning, the dreaming spires of Oxford in the afternoon — colleges, the Radcliffe Camera and the corners that became Hogwarts.',
              pt: 'O castelo do rei de manhã e os colégios de Oxford à tarde — a Radcliffe Camera e os cantos que viraram Hogwarts.',
              it: 'Il castello del Re al mattino, i college di Oxford nel pomeriggio — la Radcliffe Camera e gli angoli diventati Hogwarts.' },
      duration: '9 hours', price: 560, priceMode: 'session', priceNote: NOTA_EX }),
    T({ id: 'stonehenge-bath', type: 'day', region: 'inglaterra', categoria: 'england', order: 11, photo: 'arte/f/stonehenge.jpg',
      name: { en: 'Stonehenge & Bath', pt: 'Stonehenge e Bath', it: 'Stonehenge e Bath' },
      desc: { en: 'From the 5,000-year-old stones to the Roman Baths and the honey-coloured Georgian crescents of Bath — the most beautiful day out of London.',
              pt: 'Das pedras de 5 mil anos às termas romanas e às casas georgianas cor de mel de Bath — o dia mais bonito fora de Londres.',
              it: 'Dalle pietre di 5.000 anni alle Terme Romane e alle case georgiane color miele di Bath.' },
      duration: '10 hours', price: 650, priceMode: 'session', priceNote: NOTA_EX }),
    T({ id: 'cotswolds', type: 'day', region: 'inglaterra', categoria: 'england', order: 12, photo: 'arte/f/cotswolds.jpg',
      name: { en: 'Cotswolds & Stratford-upon-Avon', pt: 'Cotswolds e Stratford-upon-Avon', it: 'Cotswolds e Stratford-upon-Avon' },
      desc: { en: 'Golden-stone villages, rivers and little bridges, and Shakespeare’s birthplace — England as you imagine it.',
              pt: 'Vilarejos de pedra dourada, riachos e pontezinhas, e a cidade natal de Shakespeare — a Inglaterra que você imagina.',
              it: 'Villaggi di pietra dorata, ruscelli e ponticelli, e la città natale di Shakespeare.' },
      duration: '10 hours', price: 650, priceMode: 'session', priceNote: NOTA_EX }),
    T({ id: 'canterbury', type: 'day', region: 'inglaterra', categoria: 'england', order: 13, photo: 'arte/f/canterbury.jpg',
      name: { en: 'Leeds Castle & Canterbury', pt: 'Leeds Castle e Canterbury', it: 'Leeds Castle e Canterbury' },
      desc: { en: 'The “loveliest castle in the world” on its lake, then the medieval walls and the great cathedral of Canterbury.',
              pt: 'O “castelo mais bonito do mundo”, no meio de um lago, e depois as muralhas medievais e a catedral de Canterbury.',
              it: 'Il “castello più bello del mondo” sul suo lago, poi le mura medievali e la cattedrale di Canterbury.' },
      duration: '9 hours', price: 560, priceMode: 'session', priceNote: NOTA_EX }),
    /* ---------- SCOTLAND ---------- */
    T({ id: 'edinburgh-highlands', type: 'day', region: 'escocia', categoria: 'scotland', order: 20, photo: 'arte/f/edinburgh.jpg', max: 7,
      name: { en: 'Edinburgh & the Highlands · 5 days', pt: 'Edimburgo e Highlands · 5 dias', it: 'Edimburgo e Highlands · 5 giorni' },
      desc: { en: 'Edinburgh’s castle and Royal Mile, then north through Glencoe, Loch Ness and the Highlands, with time to stop wherever the light is perfect.',
              pt: 'O castelo e a Royal Mile de Edimburgo, depois o norte por Glencoe, Loch Ness e as Highlands, parando onde a luz estiver perfeita.',
              it: 'Il castello e il Royal Mile di Edimburgo, poi a nord tra Glencoe, Loch Ness e le Highlands.' },
      meeting: 'Edinburgh (or from London)', duration: '5 days', price: 0, priceMode: 'tabela', tabela: consulta(), priceNote: NOTA_CONSULTA, payPolicy: 'full' }),
    T({ id: 'scotland-skye', type: 'day', region: 'escocia', categoria: 'scotland', order: 21, photo: 'arte/f/eilean-donan.jpg', max: 7,
      name: { en: 'Grand Scotland & Isle of Skye · 7 days', pt: 'Grande Escócia e Ilha de Skye · 7 dias', it: 'Grande Scozia e Isola di Skye · 7 giorni' },
      desc: { en: 'Edinburgh, Stirling, Glencoe, Fort William, Eilean Donan and the Isle of Skye, Loch Ness and Inverness — the full Scottish road trip, at your pace.',
              pt: 'Edimburgo, Stirling, Glencoe, Fort William, Eilean Donan e a Ilha de Skye, Loch Ness e Inverness — a Escócia completa, no seu ritmo.',
              it: 'Edimburgo, Stirling, Glencoe, Fort William, Eilean Donan e l’Isola di Skye, Loch Ness e Inverness.' },
      meeting: 'Edinburgh (or from London)', duration: '7 days', price: 0, priceMode: 'tabela', tabela: consulta(), priceNote: NOTA_CONSULTA, payPolicy: 'full' }),
    /* ---------- EUROPE ---------- */
    T({ id: 'paris', type: 'day', region: 'europa', categoria: 'europe', order: 30, photo: 'arte/f/paris.jpg',
      name: { en: 'Paris via Eurostar · 3 days', pt: 'Paris pelo Eurostar · 3 dias', it: 'Parigi in Eurostar · 3 giorni' },
      desc: { en: 'We drive you to St Pancras, our partners meet you in Paris: chauffeur, guide and the bookings that matter — Louvre, Eiffel, Seine at sunset.',
              pt: 'Levamos você até St Pancras, e nossos parceiros recebem em Paris: motorista, guia e as reservas que importam — Louvre, Torre Eiffel, o Sena ao pôr do sol.',
              it: 'Vi portiamo a St Pancras, i nostri partner vi accolgono a Parigi: autista, guida e le prenotazioni che contano.' },
      meeting: 'St Pancras International', duration: '3 days', price: 0, priceMode: 'tabela', tabela: consulta(), priceNote: NOTA_CONSULTA, payPolicy: 'full' }),
    T({ id: 'amsterdam', type: 'day', region: 'europa', categoria: 'europe', order: 31, photo: 'arte/f/amsterdam.jpg',
      name: { en: 'Amsterdam & the Dutch countryside · 3 days', pt: 'Amsterdã e o interior da Holanda · 3 dias', it: 'Amsterdam e la campagna olandese · 3 giorni' },
      desc: { en: 'Canals and museums, then windmills and the villages around — a short European escape planned door to door.',
              pt: 'Canais e museus, depois moinhos e vilarejos — uma escapada pela Europa planejada de porta a porta.',
              it: 'Canali e musei, poi mulini e villaggi — una breve fuga europea organizzata porta a porta.' },
      meeting: 'From London', duration: '3 days', price: 0, priceMode: 'tabela', tabela: consulta(), priceNote: NOTA_CONSULTA, payPolicy: 'full' }),
    /* ---------- TRANSFERS ---------- */
    T({ id: 'transfer-aeroporto', type: 'transfer', region: 'londres', categoria: 'transfers', order: 40, photo: 'arte/f/mercedes-detail.jpg', includes: { en: [], pt: [] }, notIncludes: { en: [], pt: [] },
      name: { en: 'Heathrow airport ↔ London hotel', pt: 'Aeroporto de Heathrow ↔ hotel em Londres', it: 'Aeroporto di Heathrow ↔ hotel a Londra' },
      desc: { en: 'Meet & greet in arrivals with a name sign, flight tracked, help with the luggage. Example prices per vehicle.',
              pt: 'Recepção no desembarque com plaquinha, voo acompanhado, ajuda com as malas. Valores de exemplo por veículo.',
              it: 'Accoglienza agli arrivi con cartello, volo monitorato, aiuto con i bagagli.' },
      meeting: 'Heathrow arrivals or your hotel', duration: 'Per transfer', price: 85, priceMode: 'transfer',
      transfer: { linhas: [
        { pax: 3, veiculo: 'sedan',   malas: '3 large + 3 cabin bags (E-Class)', dia: 85,  noite: 100, sinal: 30 },
        { pax: 7, veiculo: 'van',     malas: '7 large + 7 cabin bags (V-Class)', dia: 110, noite: 130, sinal: 40 },
      ] }, max: 7, payPolicy: 'sinal' }),
  ];
  /* compatibilidade com os exemplos da operação (conteudo.js usa estes ids) */
  db.tours.forEach(x => { if (!x.name.es) x.name.es = x.name.en; if (!x.desc.es) x.desc.es = x.desc.en; });


  db.rules = [];
  /* Todo passeio no ar tem datas (o pedido sai para o WhatsApp dela). */
  let nRegra = 0;
  for (const x of db.tours) {
    if (db.rules.some(r => r.tourId === x.id)) continue;
    db.rules.push({ id: 'r' + (++nRegra), tourId: x.id, weekdays: [0, 1, 2, 3, 4, 5, 6],
      time: x.type === 'transfer' ? '10:00' : x.type === 'day' ? '08:00' : '09:00',
      capacity: 20, from: isoToday(), until: addDays(isoToday(), 180) });
  }

  db.coupons = [];

  /* ---- clientes e reservas de exemplo (histórico para o Dashboard) ----
     Nomes fictícios. Some quando ela ligar a nuvem / zerar os exemplos. */
  const people = [
    ['Sarah Whitfield',   'sarah.w@example.com',        '+1 212 555 0143',  'sarahw',      'instagram'],
    ['James Carter',      'james.carter@example.com',   '+44 7700 900123',   '',            'site'],
    ['Lucía Gómez',       'lucia.gomez@example.com',    '+34 611 223 344',   'luciagomez',  'instagram'],
    ['Patrícia Menezes',  'patricia.menezes@email.com', '+55 11 98123 4455', 'pat.menezes', 'instagram'],
    ['Rodrigo Tavares',   'rodrigo.tavares@email.com',  '+55 21 99654 1122', '',            'friend'],
    ['Luciana Prado',     'luciana.prado@email.com',    '+55 31 98877 3344', 'lu.prado',    'whatsapp'],
    ['Marcelo Yamada',    'm.yamada@email.com',         '+55 11 97744 2211', '',            'agency'],
  ];
  const plan = [
    /* [pessoa, passeio, dias atrás, pax, quitado?] */
    [3, 'stonehenge-bath', 44, 2, true], [4, 'london-city-tour', 37, 4, true],
    [5, 'windsor-oxford', 30, 2, true],  [6, 'cotswolds', 24, 8, true],
    [0, 'london-city-tour', 17, 2, true], [1, 'stonehenge-bath', 11, 3, true],
    [2, 'windsor-oxford', 6, 2, true],   [3, 'cotswolds', 3, 6, true],
    [4, 'stonehenge-bath', -6, 4, false], [5, 'london-city-tour', -12, 2, false],
  ];
  let n = 0;
  for (const [pi, tourId, back, pax, settled] of plan) {
    const [name, email, whats, insta, origin] = people[pi];
    const x = db.tours.find(z => z.id === tourId);
    const date = addDays(isoToday(), -back);
    const rule = db.rules.find(r => r.tourId === tourId);
    const time = rule ? rule.time : '10:00';
    const total = x.priceMode === 'transfer' ? transferPreco(x, pax, 0, time)
                : x.priceMode === 'tabela' ? tabelaPreco(x, pax)
                : x.priceMode === 'session' ? x.price : x.priceMode === 'hora' ? x.price * Math.max(1, +x.minHoras || 1) : x.price * pax;
    const created = addDays(date, -(7 + (n % 9)));
    const payments = [];
    if (x.payPolicy === 'split') {
      payments.push({ amount: Math.round(total / 2), date: created, method: 'pix', kind: 'deposit' });
      if (settled) payments.push({ amount: total - Math.round(total / 2), date: addDays(date, -1), method: 'card', kind: 'balance' });
    } else {
      payments.push({ amount: total, date: created, method: 'card', kind: 'full' });
    }
    db.bookings.push({
      id: 'demo' + (++n), code: PREFIXO + '-' + (2100 + n * 37 % 7800),
      tourId, date, time, name, email, whats, insta, pax, total,
      coupon: null, discount: 0, policy: x.payPolicy, payments,
      consent: { ok: true, at: created + 'T10:00:00.000Z', src: 'checkout' },
      status: 'confirmed', createdAt: created + 'T10:00:00.000Z', origin,
    });
  }
  return typeof traduzSemente === 'function' ? traduzSemente(db) : db;
}

/* apaga tudo — o guia começa do zero */
function clearAll() {
  /* "apagar tudo" é de propósito: o aparelho continua "em dia" com a nuvem
     (nuvem-itens.js), então o que é privado também some de lá. Os outros
     caminhos que trocam o DB (aparelho limpo, Sincronizar de novo) perdem a
     marca e releem a nuvem — nunca apagam. */
  const emDia = DB && DB._itensEmDia;
  DB = _blank();
  DB.demo = false;
  if (emDia) DB._itensEmDia = true;
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
/* Versao dos dados de DEMONSTRACAO. Sobe quando o catalogo de exemplo muda.

   Sem isto, quem abriu o link uma vez fica para sempre com os dados daquele
   dia: o navegador guarda a demonstracao e nunca mais olha o catalogo novo.
   Aconteceu em 18/09/2026 — a v1.57 trouxe a tabela de transfer de 2026 e
   os links de parceira, e quem tinha aberto a v1.56 continuava vendo o
   transfer antigo (que nem funcionava mais) e nenhum link.

   So vale para a DEMONSTRACAO e sem nuvem: dados de verdade nunca sao
   trocados por exemplo. Os pedidos de roteiro feitos no aparelho ficam. */
const SEED_VER = 5;   /* 5: ingressos por idade (18/09/2026) */

function load() {
  try { DB = JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch (e) { DB = null; }
  /* ARMADILHA PAGA NO MARIO (14/10/2026), trazida para a Yalla ao ligar a
     sala (18/10/2026): o aparelho que abriu a DEMONSTRACAO guarda clientes,
     reservas e guias de exemplo. Com o banco ligado, a sincronia mandaria
     esse exemplo por cima dos dados de verdade no primeiro login dela.
     Com nuvem, demonstracao guardada vira app vazio (so o idioma fica) e
     recebe o que esta no banco. */
  if (DB && DB.demo && temNuvem()) {
    const lang = DB.settings && DB.settings.lang;
    /* a fila de envios do tempo da demonstração também vai embora: senão as
       reservas de exemplo subiriam para o banco de verdade (18/10/2026) */
    try { localStorage.removeItem(typeof QUEUE_KEY !== 'undefined' ? QUEUE_KEY : 'ft_queue_v1'); } catch (e) {}
    DB = _blank();
    if (lang) DB.settings = { ...(DB.settings || {}), lang };
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
  }
  if (DB && DB.demo && !temNuvem() && (+DB.seedVer || 1) < SEED_VER) {
    const pedidos = DB.pedidos || [];
    DB = _seed();
    DB.pedidos = pedidos;
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
  }
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
  if (typeof itAgendar === 'function') itAgendar();
}
function resetDemo() { DB = _seed(); save(); }

const uid = () => Math.random().toString(36).slice(2, 9);
/* 4 dígitos repetiam (com ~100 reservas, mais de 50% de chance) e o assistente abria a reserva errada
   pelo código: confere as que este aparelho conhece e tenta de novo (29/10/2026) */
const bookCode = () => {
  const usados = new Set(((typeof DB !== 'undefined' && DB.bookings) || []).map(b => b.code));
  for (let i = 0; i < 50; i++) { const c = PREFIXO + '-' + Math.floor(1000 + Math.random() * 9000); if (!usados.has(c)) return c; }
  return PREFIXO + '-' + Math.floor(10000 + Math.random() * 90000);
};

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
    /* os horários de início do próprio passeio (22/10/2026, a Milla: "colocaria
       só as opções de horário de iniciar o tour"): todo dia, a partir de amanhã,
       sem regra de saída. Sob consulta não entra; regra de saída, se houver, manda. */
    const tour = Tours.get(tourId);
    if (tour && Array.isArray(tour.horarios) && tour.horarios.length && tour.reserva !== 'consulta' && !Cal.rulesFor(tourId).length) {
      let d = addDays(isoToday(), 1); if (d < fromIso) d = fromIso;
      while (d <= toIso) {
        /* cada horário é "09:00" ou {hora, ate, dias}: a janela de busca no hotel
           (08:00–08:45) e os dias da semana em que vale (0 = domingo … 6 = sábado) */
        const wd = new Date(d + 'T12:00:00').getDay();
        if (!Cal.blocked(d)) for (const h of tour.horarios) {
          const o = typeof h === 'string' ? { hora: h } : (h || {});
          if (!o.hora || (Array.isArray(o.dias) && o.dias.length && !o.dias.includes(wd))) continue;
          out.push({ tourId, date: d, time: o.hora, ate: o.ate || '', capacity: +tour.vagasHorario || 50, livre: true });
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

  create({ tourId, date, time, name, email, whats, insta, pax, coupon, policy, origin, consent, opcao, group, adultos, criancas, idades, veioPor, indicadoPor, nasc, compradorVai, idiomaGuia, janela }) {
    const tour = Tours.get(tourId);
    /* Tem que ser o MESMO calculo que a tela mostrou. tour.price * pax ignora
       o preco escalonado (195 para as 3 primeiras, 225 depois) e gravava a
       reserva abaixo do que a pessoa acabou de ler. */
    /* O veiculo tem que vir junto: sem ele, uma reserva de minivan as 22h
       era gravada pelo valor do carro diurno. A tela mostrava 130 e o caixa
       guardava 90, e so o extrato no fim do mes acusaria. */
    const pr0 = Bookings.precoDe(tour, tourId, date, time, pax, { opcao, idades: (idades || []).slice(0, +criancas || 0) });
    const base = pr0.total;
    let discount = 0, couponCode = null;
    if (coupon) {
      const v = Coupons.validate(coupon, email);
      if (v.ok) { discount = Math.round(base * v.coupon.pct) / 100 * 1; discount = Math.round(base * v.coupon.pct / 100); couponCode = v.coupon.code; }
    }
    /* ingressos por idade: somados ao total, porque e ela quem compra */
    const nAdultos = Number.isFinite(+adultos) && adultos !== undefined ? +adultos : pax;
    const ing = ingressosDe(tour, nAdultos, idades || []);
    const total = base - discount + ing.total;
    const b = {
      id: uid(), code: bookCode(), tourId, date, time,
      name, email, whats, insta: insta || '', pax, total,
      /* a moeda do passeio (os tours da planilha dela são em dólar): o painel mostra nela */
      moeda: (tour && tour.moeda) || '',
      /* o idioma do guia que o cliente escolheu (compartilhados) e a janela de busca */
      idiomaGuia: idiomaGuia || '', janela: janela || '',
      /* a opção escolhida (nome em português, para o painel dela) */
      opcao: +opcao || 0,
      opcaoNome: tour && Array.isArray(tour.opcoes) && tour.opcoes[opcao] ? ((tour.opcoes[opcao].nome || {}).pt || '') : '',
      coupon: couponCode, discount, policy,
      /* quem vem: adultos e menores de 18. O preco e pelo total; a divisao e
         para ela saber quem e crianca (ingresso, cadeirinha, ritmo). */
      adultos: Number.isFinite(+adultos) && adultos !== undefined ? +adultos : pax,
      criancas: +criancas || 0,
      idades: (idades || []).map(v => (v === '' || v == null) ? null : +v),
      ingressos: ing.total || ing.totalDia ? { linhas: ing.linhas, total: ing.total, noDia: ing.noDia, totalDia: ing.totalDia } : null,
      veiculo: pr0.veiculo || '', malas: pr0.malas || '',
      /* Transfer: o que se paga antes e o SINAL da tabela dela, nao a metade.
         O resto e no dia. */
      sinal: tour && tour.priceMode === 'transfer' ? (pr0.sinal || 0) : 0,
      /* QUEM MAIS VEM NO GRUPO.

         A Ingrid pediu isto em audio: ate hoje ela so registra quem fez a
         reserva, mas muita gente volta depois por indicacao de alguem que
         VEIO JUNTO e nunca falou com ela. Sem os nomes do grupo, essa
         pessoa nao existe na base dela e a indicacao se perde. */
      group: Array.isArray(group) ? group.filter(g => g && g.nome).map(g => ({
        nome: String(g.nome).trim(),
        nasc: String(g.nasc || '').trim(),
        whats: String(g.whats || '').trim(),
      })) : [],
      /* como conheceu (a coluna "veio por" da planilha dela) */
      veioPor: veioPor || '', indicadoPor: String(indicadoPor || '').trim(),
      /* quem compra pode nao ir (reservou para a mae): entao a data de
         nascimento dele so vale para o ingresso se ele for */
      nasc: String(nasc || '').trim(), compradorVai: compradorVai !== false,
      consent: consent ? { ok: true, at: new Date().toISOString(), src: 'checkout' } : { ok: false },
      payments: [], status: 'confirmed',
      createdAt: new Date().toISOString(), origin: origin || 'site',
      /* de que canal a pessoa chegou (link com ?de=instagram, ?de=whatsapp…) */
      canal: (typeof canalAtual === 'function') ? canalAtual() : '',
      /* veio pelo link de um parceiro (?p=CUPOM): a comissão é dele */
      parceiroCodigo: (typeof parceiroDaVisita === 'function' && !(typeof isLoggedIn === 'function' && isLoggedIn())) ? parceiroDaVisita() : '',
      /* Em que idioma ele reservou. Sem isto o e-mail de recibo sai em
         portugues para um frances que leu a tela inteira em ingles. */
      lang: (typeof LANG !== 'undefined' && (LANG === 'en' || LANG === 'es')) ? LANG : 'pt',
    };
    /* Aqui havia um pagamento inventado: toda reserva nascia marcada como paga
       no cartao. O painel, o caixa e os relatorios contavam dinheiro que nunca
       entrou. A reserva nasce sem pagamento nenhum — quem registra e o guia,
       quando o dinheiro cai de verdade. E aqui que o Stripe entra um dia. */
    DB.bookings.push(b);
    /* o cadastro de quem reservou e de cada um do grupo (operacao.js) */
    if (typeof cadastroDaReserva === 'function') cadastroDaReserva(b);
    if (couponCode) Coupons.consume(couponCode, email);
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    /* a promessa do envio fica à mão (fora da reserva): o checkout só diz "reservado" quando o banco confirmou */
    Bookings._envio = typeof cloudPushBooking === 'function' ? cloudPushBooking(b) : null;
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

  criarManual({ tourId, date, time, name, whats, email, pax, total, recebido, metodo, veioPor, indicadoPor }) {
    const b = {
      id: uid(), code: bookCode(), tourId, date, time,
      name, email: email || '', whats: whats || '', insta: '',
      pax: +pax || 1, total: Math.max(0, +total || 0),
      coupon: null, discount: 0, policy: 'full',
      consent: { ok: false },
      payments: [], status: 'confirmed',
      createdAt: new Date().toISOString(), origin: 'manual',
      veioPor: veioPor || '', indicadoPor: String(indicadoPor || '').trim(),
    };
    const val = Math.max(0, Math.min(+recebido || 0, b.total));
    if (val > 0) {
      b.payments.push({ amount: val, date: isoToday(), method: metodo || 'other',
                        kind: val >= b.total ? 'full' : 'deposit' });
    }
    DB.bookings.push(b);
    if (typeof cadastroDaReserva === 'function') cadastroDaReserva(b);
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
    /* produto com OPÇÕES (26/10/2026, a planilha da Milla: prime/non-prime, 12/17/22/30 min,
       deck standard/VIP...): a opção escolhida traz o preço, o de criança e a idade */
    const op = Array.isArray(x.opcoes) && x.opcoes.length ? (x.opcoes[(opt && opt.opcao) || 0] || x.opcoes[0]) : null;
    if (op) x = Object.assign({}, x, { price: +op.preco || 0, precoCrianca: +op.precoCrianca || 0, idadeCrianca: +op.idadeCrianca || +x.idadeCrianca || 0, priceLate: 0, earlySeats: 0 });
    const cheio = +x.price || 0;
    const tarde = +x.priceLate || 0;
    const vagasBaratas = +x.earlySeats || 0;
    if (x.priceMode === 'transfer') {
      const opcao = (opt && opt.opcao) || 0;
      const l = transferLinha(x, pax, opcao);
      const v = transferPreco(x, pax, opcao, time);
      return { total: v, linhas: [{ qtd: 1, valor: v, fechado: true }],
               veiculo: l ? l.veiculo : '', malas: l ? l.malas : '', sinal: l ? +l.sinal || 0 : 0,
               noturno: transferNoturno(time), consultar: v === 0 };
    }
    if (x.priceMode === 'tabela') {
      const v = tabelaPreco(x, pax);
      return { total: v, linhas: [{ qtd: pax, valor: v, fechado: true }], consultar: v === 0 };
    }
    if (x.priceMode === 'session') return { total: cheio, linhas: [{ qtd: 1, valor: cheio }] };
    /* POR HORA (28/10/2026, o iate da Milla): preço da hora × horas, nunca menos que o mínimo dela */
    if (x.priceMode === 'hora') { const h = Math.max(+x.minHoras || 1, +(opt && opt.horas) || 0); return { total: cheio * h, linhas: [{ qtd: h, valor: cheio }], horas: h }; }
    /* preço de criança (o deserto da Milla: até 7 anos paga menos). Conta pelas
       idades escolhidas; criança sem idade marcada ainda paga como adulto. */
    if (+x.precoCrianca > 0 && opt && Array.isArray(opt.idades) && opt.idades.length) {
      const lim = +x.idadeCrianca || 12;
      const nCri = Math.min(pax, opt.idades.filter(v => v !== '' && v != null && +v <= lim).length);
      const nAd = pax - nCri, linhas = [];
      if (nAd) linhas.push({ qtd: nAd, valor: cheio });
      if (nCri) linhas.push({ qtd: nCri, valor: +x.precoCrianca, crianca: true });
      return { total: nAd * cheio + nCri * +x.precoCrianca, linhas };
    }
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
    /* transfer: o sinal garante, o resto e no dia */
    if (b.policy === 'sinal') return b.date;
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
                      kind: p.kind, method: p.method, amount: p.amount, code: b.code, conta: p.conta || '' });
        }
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  },
};

load();

/* ---------- pedidos de roteiro personalizado ----------
   O que o cliente respondeu em "Monte seu roteiro". A entrega de verdade e
   pelo WhatsApp dela (a mensagem sai pronta); isto aqui e a memoria, para
   ela ver no painel quem pediu, quando, e se ja respondeu.

   Com a nuvem ligada, o pedido de um cliente vive no aparelho DELE ate
   existir uma tabela propria no Supabase — anotado na entrega. */
const Roteiros = {
  all() { return [...(DB.pedidos || [])].sort((a, b) => (b.criado || '').localeCompare(a.criado || '')); },
  cria(r) {
    const limpa = (v) => String(v || '').trim();
    const ped = {
      id: uid(), criado: new Date().toISOString(), respondido: false,
      nome: limpa(r.nome), whats: limpa(r.whats), email: limpa(r.email),
      ini: limpa(r.ini), fim: limpa(r.fim), datasAbertas: !!r.datasAbertas, faixa: limpa(r.faixa),
      adultos: Math.max(1, +r.adultos || 1), criancas: Math.max(0, +r.criancas || 0), idades: limpa(r.idades),
      onde: [...(r.onde || [])], ondeOutro: limpa(r.ondeOutro),
      gosto: [...(r.gosto || [])], precisa: [...(r.precisa || [])], ritmo: r.ritmo || '',
      obs: limpa(r.obs), modo: r.modo || '',
      lang: (typeof LANG !== 'undefined' && (LANG === 'en' || LANG === 'es')) ? LANG : 'pt',
      canal: (typeof canalAtual === 'function') ? canalAtual() : '',
      parceiroCodigo: (typeof parceiroDaVisita === 'function' && !(typeof isLoggedIn === 'function' && isLoggedIn())) ? parceiroDaVisita() : '',
    };
    DB.pedidos = DB.pedidos || [];
    DB.pedidos.push(ped);
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    /* o cliente no site: o pedido vai para o banco e chega no celular dela */
    if (typeof itPedidoPublico === 'function' && !(typeof isLoggedIn === 'function' && isLoggedIn())) itPedidoPublico('pedidos', ped);
    return ped;
  },
  marca(id, respondido) {
    const p = (DB.pedidos || []).find(x => x.id === id);
    if (!p) return;
    p.respondido = !!respondido;
    save();
  },
  /* 13/11/2026, a Milla: "precisa ter a opção de apagar daqui" (pedido de teste, repetido, de quem desistiu).
     'pedidos' é coleção da sincronia privada: some da nuvem e dos outros aparelhos dela também.
     O orçamento que já saiu do pedido continua (só perde o vínculo). */
  remove(id) {
    const antes = (DB.pedidos || []).length;
    DB.pedidos = (DB.pedidos || []).filter(x => x.id !== id);
    if (DB.pedidos.length !== antes) save();
    return DB.pedidos.length !== antes;
  },
};

/* ---------- clientes (derivados das reservas) ---------- */
const Clients = {
  all() {
    const map = new Map();
    for (const b of DB.bookings) {
      if (b.status === 'cancelled') continue;
      const key = (b.email || b.whats || b.name).toLowerCase();
      const c = map.get(key) || { key, name: b.name, email: b.email, whats: b.whats, insta: b.insta,
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
        const gc = map.get(gk) || { key: gk, name: gnome, email: '', whats: '', insta: '',
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


/* DESCRIÇÃO COM "INCLUSO:" / "NÃO INCLUSO:" DENTRO (28/10/2026, a Milla, vídeo do Majesty 56: "tá tudo
   misturado, o incluso não é o incluso, tá aqui; ali 'o que inclui: está incluído', nada a ver").
   Ela cola o texto inteiro do material dela na descrição. Aqui ele é separado como nos passeios do
   catálogo: o programa fica na descrição, as listas vão para Incluso / Não incluso e o que vem depois
   ("CAPACIDADE: …", "Percurso sujeito a…") vai para Orientações. Só mexe quando acha o cabeçalho e
   pelo menos um item; o texto dela não é reescrito, só muda de lugar. */
const SEP_NINC = /^\s*(?:n[ãa]o\s+inclu(?:so|i|[ií]do)s?|not\s+included|excluded|does\s+not\s+include|no\s+incluye|no\s+incluido)\s*:\s*(.*)$/i;
const SEP_INC = /^\s*(?:o\s+que\s+(?:est[áa]\s+)?inclu(?:[ií]do|i)|inclu[ií]dos?|inclui|inclusos?|included|includes|what'?s\s+included|incluye|incluidos?)\s*:\s*(.*)$/i;
const SEP_NOTA = /^\s*(?:capacidade|capacity|capacidad)\s*:/i;
const SEP_ITEM = /^\s*[•·\-–*✓✔▪◦]\s*(.+)$/;
const sepLimpa = (t) => String(t || '').trim().replace(/\s*[.;]$/, '');
function separaDescricao(texto) {
  const r = { desc: '', inclui: [], naoInclui: [], notas: [] }, d = [];
  let modo = 'desc', branco = false, m;
  for (const linha of String(texto || '').split('\n')) {
    const l = linha.trim();
    if ((m = l.match(SEP_NINC))) { modo = 'ninc'; branco = false; if (m[1].trim()) r.naoInclui.push(...m[1].split(';').map(sepLimpa).filter(Boolean)); continue; }
    if ((m = l.match(SEP_INC))) { modo = 'inc'; branco = false; if (m[1].trim()) r.inclui.push(...m[1].split(';').map(sepLimpa).filter(Boolean)); continue; }
    if (SEP_NOTA.test(l)) { r.notas.push(l); modo = 'notas'; continue; }
    if (!l) { if (modo === 'desc') d.push(''); else branco = true; continue; }
    if (modo === 'inc' || modo === 'ninc') {
      const it = l.match(SEP_ITEM);
      if (it || !branco) { (modo === 'inc' ? r.inclui : r.naoInclui).push(sepLimpa(it ? it[1] : l)); continue; }
      r.notas.push(l); modo = 'notas'; continue;
    }
    if (modo === 'desc') d.push(linha.replace(/\s+$/, '')); else r.notas.push(l);
  }
  r.desc = d.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return r;
}
/* o passeio com os textos no lugar certo (cópia; o mesmo objeto se não há o que separar) */
function tourSeparaTextos(x) {
  if (!x || !x.desc || typeof x.desc !== 'object') return x;
  const obj = (v) => Array.isArray(v) ? { pt: v } : { ...(v || {}) };
  const out = { ...x, desc: { ...x.desc }, includes: obj(x.includes), notIncludes: obj(x.notIncludes), dicas: { ...(x.dicas || {}) } };
  let mudou = false;
  for (const k of Object.keys(x.desc)) {
    const s = separaDescricao(x.desc[k]);
    if (!s.inclui.length && !s.naoInclui.length) continue;
    /* lista já preenchida por ela e DIFERENTE do que está no texto: não mexe nesta língua (nada some) */
    const igual = (a, b) => JSON.stringify((a || []).map(v => sepLimpa(v).toLowerCase())) === JSON.stringify((b || []).map(v => sepLimpa(v).toLowerCase()));
    if ((out.includes[k] || []).length && s.inclui.length && !igual(out.includes[k], s.inclui)) continue;
    if ((out.notIncludes[k] || []).length && s.naoInclui.length && !igual(out.notIncludes[k], s.naoInclui)) continue;
    out.desc[k] = s.desc;
    if (!(out.includes[k] || []).length) out.includes[k] = s.inclui;
    if (!(out.notIncludes[k] || []).length) out.notIncludes[k] = s.naoInclui;
    /* "CAPACIDADE: até 15 pessoas" some quando o máximo do passeio já diz isso (aparece em Detalhes) */
    const notas = s.notas.filter(n => !(SEP_NOTA.test(n) && +x.max > 0 && new RegExp('\\b' + (+x.max) + '\\b').test(n)));
    const ja = String(out.dicas[k] || '').trim();
    if (notas.length) out.dicas[k] = [ja, ...notas.filter(n => !ja.includes(n))].filter(Boolean).join('\n');
    mudou = true;
  }
  /* por hora: o mínimo que ela escreveu na duração ("Mínimo 2 horas") vale, se o campo ficou no 1 */
  const mh = String(x.duration || '').match(/m[ií]n(?:imo|\.)?\s*(?:de\s*)?(\d+)\s*h/i);
  if (x.priceMode === 'hora' && mh && (+x.minHoras || 1) < +mh[1]) { out.minHoras = +mh[1]; mudou = true; }
  return mudou ? out : x;
}
