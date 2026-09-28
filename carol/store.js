/* =====================================================
   APP-GUIA — camada de dados
   Persistência: localStorage. A troca para Supabase é
   trocar as funções deste arquivo — as telas não mudam.
   ===================================================== */
'use strict';

const DB_KEY = 'lovely_db_v1';

/* ---------- modelo ----------
Tour       {id, type, region, name:{pt,en}, desc:{pt,en}, meeting, photo,
            price, priceMode:'pp'|'session'|'pacote', min, max, payPolicy:'full'|'split',
            pacotes:[{h:4, faixas:[{ate:4, v:360},{ate:6, v:420}]}]   // Lovely London: valor do GRUPO por duração
            status:'live'|'draft'|'seasonal', order}
Rule       {id, tourId, weekdays:[0-6], time:'16:30', capacity, from:'2026-11-20', until:'2026-12-23'}
Departure  {id, tourId, date:'2026-12-21', time, capacity}  // avulsas; recorrentes são geradas das Rules
Block      {id, from, until, reason}                        // bloqueio global (férias)
Booking    {id, code, tourId, date, time, name, email, whats, insta, pax, total,
            coupon, discount, policy:'full'|'split', horas, depositPct,   // split = SINAL (30% na Carol)
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
  return { tours: [], rules: [], departures: [], blocks: [], bookings: [], coupons: [], seatCounts: [], pedidos: [],
           /* Lovely London (28/09/2026): agências B2B e invoices, e-mails varridos,
              motoristas parceiros, roteiros ("Monte seu roteiro" e passeios ocultos),
              vale-presente, avaliações, tarefas e recados, pontos editados por ela */
           agencias: [], trabalhosAgencia: [], emails: [], motoristas: [], roteiros: [], giftcards: [],
           avaliacoes: [], tarefas: [], recados: [], pontos: [], cliquesIngressos: {},
           settings: { lang: 'pt', tutorialClient: true, tutorialAdm: true,
           /* quem e o guia — nasce do config.js e o guia edita no painel */
           admName: GUIA_CFG.nome || 'Guia', negocio: GUIA_CFG.negocio || '',
           whats: GUIA_CFG.whats || '', insta: GUIA_CFG.insta || '', placeholderContact: false,
           /* ícones da primeira tela; vazio = some (ela troca em Ajustes → Seu contato) */
           site: GUIA_CFG.site || '', spotify: '', facebook: '', blog: GUIA_CFG.blog || '', blueBadge: GUIA_CFG.blueBadge || '',
           youtube: GUIA_CFG.youtube || '', tiktok: GUIA_CFG.tiktok || '', email: GUIA_CFG.email || '',
           /* regras do negócio dela (reunião 28/09 + Termos do site) */
           sinalPct: GUIA_CFG.sinalPct || 50, diaExclusivo: GUIA_CFG.diaExclusivo !== false,
           tolerancia: GUIA_CFG.tolerancia || 30, horaExtra: GUIA_CFG.horaExtra || 0,
           /* "Monte seu roteiro": preço POR DIA de cada nível (EXEMPLO até ela definir) */
           precosRoteiro: { arquivo: 30, mapa: 40, imersivo: 55 },
           reviewGoogle: 'https://www.google.com/maps/search/Lovely+London+by+Carol',
           parceiros: [],
           depoimentos: [], depoimentosVideo: '', depoimentosVideoTxt: '',
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
           avisarClientes: true,    /* recibo, confirmação e véspera saem pela função cofre */
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

/* versão da semente do PROTÓTIPO: subir quando o catálogo de exemplo mudar,
   senão quem já abriu o link continua vendo o velho (lição da Dulcineia). */
const SEED_VER = 3;

function _seed() {
  const db = _blank();
  db.demo = true;
  db.seedVer = SEED_VER;

  /* os 12 tours DO SITE DELA + a consultoria (catalogo.js) */
  db.tours = typeof catalogoCarol === 'function' ? catalogoCarol() : [];

  db.settings.homeText = {
    pt: 'Experiências guiadas com Carol, pensadas no seu ritmo, com história, significado e o olhar de quem vive Londres.',
    en: 'Guided experiences with Carol, shaped to your pace, with history, meaning and the perspective of someone who lives in London.',
  };
  db.settings.photo = 'fotos/carol.jpg';
  db.settings.photo2 = 'fotos/carol-westminster.jpg';
  db.settings.homePhoto = 'fotos/home-westminster.jpg';
  db.settings.homePhotoCr = '';
  /* bio: as palavras DELA (site /pages/sobre.php e perfil Guide London) */
  db.settings.bio = {
    pt: 'Sou Carol. Moro em Londres, conheço a cidade como quem vive nela, e guio tours em português com a certificação mais alta do setor.\n\n'
      + 'O Blue Badge é a certificação mais alta para guias turísticos no Reino Unido. Não é um curso rápido: são dois anos de formação intensiva pelo Institute of Tourist Guiding, com exames escritos, práticos e orais. Sou guia Blue Badge e membro da Association of Professional Tourist Guides (APTG).\n\n'
      + 'Sou natural de São Paulo, formada em Comunicação e Artes. Depois de quase 20 anos no setor de moda como estilista e empresária, mudei-me para Londres, onde estudei na Central Saint Martins.\n\n'
      + 'O meu trabalho começa antes de chegar ao ponto de encontro. Entendo quem você é, o que quer viver, quanto tempo tem e o que já visitou. Os grupos são pequenos por escolha: até 6 pessoas, e um grupo por dia.\n\n'
      + 'Se você quer entender Londres, não só fotografá-la, começa aqui.',
    en: 'I am Carol. I live in London and guide private tours in Portuguese and English with the highest qualification in the field: the Blue Badge.\n\n'
      + 'Born in São Paulo, I spent almost 20 years in fashion before moving to London, where I studied at Central Saint Martins.\n\n'
      + 'Groups are small by choice: up to 6 people, one group per day.',
  };

  /* datas: tours em Manhã/Tarde todos os dias (6 meses); 6h e 8h só de manhã;
     Natal só na temporada, às 17h30; consultoria à noite, dias de semana */
  db.rules = [];
  for (const t of db.tours) {
    if (t.naoOcupaDia) {
      for (const hora of ['18:30', '20:00']) db.rules.push({ id: uid(), tourId: t.id, weekdays: [1, 2, 3, 4, 5], time: hora, capacity: 1, from: isoToday(), until: addDays(isoToday(), 180), auto: true });
    } else if (t.temporada) {
      const ano = +isoToday().slice(0, 4);
      for (const y of [ano, ano + 1]) {
        const de = y + '-' + t.temporada.de, ate = y + '-' + t.temporada.ate;
        if (ate < isoToday()) continue;
        db.rules.push({ id: uid(), tourId: t.id, weekdays: [0, 1, 2, 3, 4, 5, 6], time: t.temporada.hora, capacity: t.max, from: de < isoToday() ? isoToday() : de, until: ate, auto: true });
      }
    } else {
      const soManha = (t.pacotes || []).every(p => +p.h > 4);
      db.rules.push(...regrasDeTurno(t).filter(r => !soManha || r.time === turnos()[0].hora));
    }
  }

  db.coupons = [
    { code: 'VOLTA10', pct: 10, until: addDays(isoToday(), 365), oncePerPerson: true, uses: [] },
    { code: 'LOVELY10', pct: 10, until: addDays(isoToday(), 365), oncePerPerson: true, uses: [] },   /* o que a newsletter do site promete */
  ];

  /* o painel "vivo" do protótipo: exemplos marcados (demo-carol.js) */
  if (typeof demoCarol === 'function') demoCarol(db);
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

/* TERMOS E CONDIÇÕES — os do site dela (lovelylondon.uk/pages/termos.php),
   com o sinal de 30% da reunião. Vão junto do preço, no checkout e no voucher
   ("reforçar esses termos e condições nesse voucher" — reunião 40:16). */
const TERMOS_PADRAO = {
  pt: [
    'Reserva: sinal de 30% do valor para confirmar; o restante no dia do tour. O sinal não é reembolsável.',
    'Cancelamento pelo cliente: com mais de 10 dias de antecedência, o sinal fica retido; entre 4 e 10 dias, cobrança de 50% do total; com menos de 96 horas, cobrança de 100%.',
    'Tolerância: a guia aguarda no ponto de encontro por até 30 minutos. Atrasos devem ser avisados com pelo menos 2 horas de antecedência e não estendem a duração do tour.',
    'Hora adicional, se houver disponibilidade: £70 por hora.',
    'Ingressos, transporte, alimentação e despesas pessoais não estão incluídos, salvo quando indicado. Quando a atração exigir, o ingresso da guia é pago pelo cliente.',
    'Fora da Grande Londres, o deslocamento da guia é acrescido ao valor. Início antes das 7h ou término depois das 23h: táxi por conta do cliente.',
    'Menores de 18 anos sempre acompanhados de um adulto responsável. Recomendamos seguro viagem.',
  ],
  en: [
    '30% deposit to confirm; balance on the day. The deposit is non-refundable.',
    'Cancellation: more than 10 days before, deposit retained; 4 to 10 days, 50% of the total; less than 96 hours, 100%.',
    'The guide waits up to 30 minutes at the meeting point. Delays do not extend the tour.',
    'Extra hour, subject to availability: £70.',
    'Tickets, transport, meals and personal expenses are not included unless stated.',
  ],
};

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
  /* PROTÓTIPO: semente nova = demonstração nova (só sem nuvem, só se ainda é demo) */
  if (!temNuvem() && DB.demo && DB.seedVer !== SEED_VER) { DB = _seed(); localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  DB.settings = fillSettings(DB.settings);
  if (!Array.isArray(DB.pedidos)) DB.pedidos = [];
  for (const k of ['agencias', 'trabalhosAgencia', 'emails', 'motoristas', 'roteiros', 'giftcards', 'avaliacoes', 'tarefas', 'recados', 'pontos'])
    if (!Array.isArray(DB[k])) DB[k] = [];
  if (!DB.cliquesIngressos || typeof DB.cliquesIngressos !== 'object') DB.cliquesIngressos = {};
  if (!DB.settings.termos || !DB.settings.termos.pt) DB.settings.termos = TERMOS_PADRAO;
  /* REDES DA PRIMEIRA TELA (24/09/2026): uma vez só, o que veio no config.js.
     Depois é dela: se apagar um endereço em Ajustes, o ícone não volta. */
  if (!DB.settings.redesSemeadas) {
    for (const k of ['site', 'spotify', 'facebook']) if (!DB.settings[k] && GUIA_CFG[k]) DB.settings[k] = GUIA_CFG[k];
    DB.settings.redesSemeadas = true;
  }
  /* PARA A SUA VIAGEM: uma vez só, os do config.js; depois é dela */
  if (!DB.settings.parceirosSemeados) {
    if (!Array.isArray(DB.settings.parceiros) || !DB.settings.parceiros.length)
      DB.settings.parceiros = (GUIA_CFG.parceiros || []).map((p, i) => ({ id: p.tipo + '-' + i, ...p }));
    DB.settings.parceirosSemeados = true;
  }
  /* DEPOIMENTOS: uma vez só, os do config.js; depois é dela */
  if (!DB.settings.depoimentosSemeados) {
    if (!Array.isArray(DB.settings.depoimentos) || !DB.settings.depoimentos.length)
      DB.settings.depoimentos = (GUIA_CFG.depoimentos || []).map(d => ({ ...d }));
    if (!DB.settings.depoimentosVideo) DB.settings.depoimentosVideo = GUIA_CFG.depoimentosVideo || '';
    if (!DB.settings.depoimentosVideoTxt) DB.settings.depoimentosVideoTxt = GUIA_CFG.depoimentosVideoTxt || '';
    DB.settings.depoimentosSemeados = true;
  }
  /* os turnos do config.js vão para os ajustes: assim sobem para a nuvem e o
     atendente do Instagram (servidor) oferece os mesmos turnos */
  if (GUIA_CFG.turnos && !DB.settings.turnos) {
    DB.settings.turnos = GUIA_CFG.turnos;
    DB.settings.turnoExclusivo = !!GUIA_CFG.turnoExclusivo;
  }
  /* TURNOS NOS PASSEIOS QUE JÁ EXISTIAM (24/09/2026). Quem abriu o app antes
     guardou os passeios SEM datas — e ali o cliente nunca via Manhã/Tarde, ia
     direto para o WhatsApp. Uma vez só: passeio sem NENHUMA regra ganha os
     turnos. Passeio que ela já ajustou fica como está, e se ela apagar depois,
     não volta (turnosSemeados). Sem passeio ainda (nuvem por carregar) espera. */
  if (turnos().length && !DB.settings.turnosSemeados && DB.tours.length) {
    for (const t of DB.tours) if (!DB.rules.some(r => r.tourId === t.id)) DB.rules.push(...regrasDeTurno(t));
    DB.settings.turnosSemeados = true;
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
  }
  /* TEMPORADA (24/09/2026): os turnos semeados antes iam "todos os dias por 6
     meses" — entrando em novembro a fevereiro. Uma vez só, as regras de turno
     todos-os-dias viram as janelas da temporada (março a outubro). */
  const tpChave = GUIA_CFG.temporada ? GUIA_CFG.temporada.de + '/' + GUIA_CFG.temporada.ate : '';
  if (tpChave && turnos().length && DB.settings.temporadaAplicada !== tpChave && DB.tours.length) {
    const eTurnoTodoDia = r => r.weekdays && r.weekdays.length === 7 && turnoDaHora(r.time);
    for (const t of DB.tours) {
      if (!DB.rules.some(r => r.tourId === t.id && eTurnoTodoDia(r))) continue;
      DB.rules = DB.rules.filter(r => !(r.tourId === t.id && eTurnoTodoDia(r)));
      DB.rules.push(...regrasDeTurno(t));
    }
    DB.settings.temporadaAplicada = tpChave;
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
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
  create(t)  {
    t.id = uid(); t.order = DB.tours.length + 1; DB.tours.push(t);
    DB.rules.push(...regrasDeTurno(t));   /* passeio novo já nasce com Manhã e Tarde */
    save(); return t;
  },
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
/* Data de CALENDÁRIO sempre por componentes locais (skill app-um-so, peça 10):
   toISOString() devolve UTC e, perto da meia-noite em Londres no horário de
   verão, virava o dia errado. */
function _isoLocal(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function isoToday() { return _isoLocal(new Date()); }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return _isoLocal(d); }

/* turnos do dia (config.js guia.turnos → DB.settings.turnos) */
function turnos() { return (DB && DB.settings && DB.settings.turnos) || GUIA_CFG.turnos || []; }
function turnoDaHora(h) { return turnos().find(x => x.hora === h) || null; }
/* agora na cidade da guia (AAAA-MM-DD e HH:MM) — turno que já começou não se reserva.
   O nome ficou agoraBerlim porque o resto do app chama assim; o fuso vem do config.js. */
function agoraBerlim() {
  const p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: GUIA_CFG.fuso || 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}
function jaComecou(date, time) { const a = agoraBerlim(); return date < a.data || (date === a.data && time <= a.hora); }
/* TEMPORADA (config.js guia.temporada, ex.: março a outubro): as janelas de
   datas a partir de hoje — o resto desta temporada e a próxima inteira. */
function janelasTemporada() {
  const tp = GUIA_CFG.temporada, hoje = isoToday();
  if (!tp) return [{ from: hoje, until: addDays(hoje, 180) }];
  const ano = +hoje.slice(0, 4), out = [];
  for (const y of [ano, ano + 1]) {
    const de = `${y}-${tp.de}`, ate = `${y}-${tp.ate}`;
    if (ate < hoje) continue;
    out.push({ from: de < hoje ? hoje : de, until: ate });
  }
  return out;
}
/* as regras de um passeio em turnos: todos os dias da temporada (ela ajusta na Agenda) */
function regrasDeTurno(t) {
  return janelasTemporada().flatMap(j => turnos().map(tu => ({ id: uid(), tourId: t.id, weekdays: [0, 1, 2, 3, 4, 5, 6], time: tu.hora,
    capacity: +t.max || 20, from: j.from, until: j.until, auto: true })));
}
/* painel em turnos: há turnos e cada um é de um grupo só (um grupo por dia na Carol) */
function modoTurnos() { return turnos().length > 0 && turnoExclusivo(); }
function rotuloHora(h) { const tu = turnoDaHora(h); return tu ? tu.nome : h; }
function rotuloTurno(tu) { return `${tu.nome} · ${tu.hora}–${tu.fim}`; }
/* o dia em turnos: para cada turno, se está aberto (algum passeio sai), fechado, e quem reservou */
function diaEmTurnos(date) {
  return turnos().map(tu => {
    const reservas = DB.bookings.filter(b => b.date === date && b.time === tu.hora && b.status !== 'cancelled');
    const fechado = Cal.turnoFechado(date, tu.hora) || Cal.blocked(date, tu.hora);
    const oferecido = !fechado && DB.tours.some(x => x.status !== 'draft' && Cal.departures(x.id, date, date).some(d => d.time === tu.hora));
    return { tu, reservas, fechado, oferecido };
  });
}
function turnoExclusivo() { return !!((DB && DB.settings && DB.settings.turnoExclusivo) ?? GUIA_CFG.turnoExclusivo); }
/* um grupo por DIA (Carol). Ajustes → Agenda desliga no alto verão. */
function diaExclusivo() { const v = DB && DB.settings && DB.settings.diaExclusivo; return v === undefined || v === null ? !!GUIA_CFG.diaExclusivo : !!v; }
/* SINAL: % do total pago na reserva (Carol: 30%, não reembolsável). O
   percentual vai GRAVADO na reserva (depositPct): se ela mudar amanhã, a
   reserva de hoje continua com o que o cliente leu. */
function sinalPct() { const v = +(DB && DB.settings && DB.settings.sinalPct); return v > 0 && v < 100 ? v : (+GUIA_CFG.sinalPct || 50); }
function valorSinal(total, pct) { return Math.round((+total || 0) * (pct || sinalPct()) / 100); }

const Cal = {
  rulesFor(tourId) { return DB.rules.filter(r => r.tourId === tourId); },
  addRule(r) { r.id = uid(); DB.rules.push(r); save(); return r; },
  removeRule(id) { DB.rules = DB.rules.filter(r => r.id !== id); save(); },
  addDeparture(d) { d.id = uid(); DB.departures.push(d); save(); return d; },
  removeDeparture(id) { DB.departures = DB.departures.filter(d => d.id !== id); save(); },
  addBlock(b) { b.id = uid(); DB.blocks.push(b); save(); return b; },
  removeBlock(id) { DB.blocks = DB.blocks.filter(x => x.id !== id); save(); },
  /* bloqueio do dia inteiro (férias) ou de UM turno (b.time): ela fecha a
     manhã do dia 12 porque tem outro compromisso, e a tarde segue aberta */
  blocked(date, time) { return DB.blocks.some(b => date >= b.from && date <= b.until && (!b.time || b.time === time)); },
  turnoFechado(date, time) { return DB.blocks.some(b => b.from === date && b.until === date && b.time === time); },
  fechaTurno(date, time) { if (!Cal.turnoFechado(date, time)) Cal.addBlock({ from: date, until: date, time, reason: 'turno' }); },
  abreTurno(date, time) { DB.blocks = DB.blocks.filter(b => !(b.from === date && b.until === date && b.time === time)); save(); },

  /* todas as saídas de um passeio num intervalo: regras expandidas + avulsas − bloqueios */
  departures(tourId, fromIso, toIso) {
    const out = [];
    for (const r of Cal.rulesFor(tourId)) {
      let d = fromIso < r.from ? r.from : fromIso;
      const end = toIso < r.until ? toIso : r.until;
      while (d <= end) {
        const wd = new Date(d + 'T12:00:00').getDay();
        if (r.weekdays.includes(wd) && !Cal.blocked(d, r.time)) {
          out.push({ tourId, date: d, time: r.time, capacity: r.capacity, ruleId: r.id });
        }
        d = addDays(d, 1);
      }
    }
    for (const dep of DB.departures.filter(x => x.tourId === tourId)) {
      if (dep.date >= fromIso && dep.date <= toIso && !Cal.blocked(dep.date, dep.time)) out.push(dep);
    }
    out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return out;
  },

  seatsLeft(tourId, date, time, capacity) {
    /* LOVELY LONDON: "geralmente eu só atendo um cliente por dia" (reunião
       28/09). Qualquer reserva de TOUR naquele dia fecha o dia inteiro, em
       todos os tours. A consultoria (online, à noite) não ocupa o dia e é
       uma por horário. Ela desliga isto em Ajustes no alto verão. */
    const tour = DB.tours.find(x => x.id === tourId);
    const ocupaDia = (b) => { const x = DB.tours.find(z => z.id === b.tourId); return !(x && x.naoOcupaDia); };
    if (tour && tour.naoOcupaDia) {
      const tem = DB.bookings.some(b => b.tourId === tourId && b.date === date && b.time === time && b.status === 'confirmed');
      return tem ? 0 : capacity;
    }
    if (diaExclusivo()) {
      const temLocal = DB.bookings.some(b => b.date === date && b.status === 'confirmed' && ocupaDia(b));
      const temNuvem = Array.isArray(DB.seatCounts) && DB.seatCounts.some(c => c.date === date && +c.pax > 0 && !(DB.tours.find(z => z.id === c.tourId) || {}).naoOcupaDia);
      const agencia = (DB.agencias || []).length && (DB.trabalhosAgencia || []).some(j => j.data === date && j.status !== 'cancelado');
      return temLocal || temNuvem || agencia ? 0 : capacity;
    }
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

  create({ tourId, date, time, name, email, whats, insta, pax, coupon, policy, origin, consent, horas, obs }) {
    const tour = Tours.get(tourId);
    /* Tem que ser o MESMO calculo que a tela mostrou. tour.price * pax ignora
       o preco escalonado (195 para as 3 primeiras, 225 depois) e gravava a
       reserva abaixo do que a pessoa acabou de ler. */
    const base = Bookings.precoDe(tour, tourId, date, time, pax, horas).total;
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
      horas: horas ? +horas : null,
      depositPct: policy === 'split' ? sinalPct() : null,
      obs: obs ? String(obs).slice(0, 800) : '',
    };
    /* O valor em reais do Pix que a tela vai mostrar vai junto na reserva: o
       recibo por e-mail (servidor) cobra ESTE numero, nao uma cotacao de
       horas depois. Mesma conta do comoPagar (metade ou total). */
    const agoraEur = policy === 'split' ? valorSinal(total, sinalPct()) : total;
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
  precoDe(x, tourId, date, time, pax, horas) {
    /* PACOTE (Carol): valor do GRUPO pela duração e pelo tamanho do grupo.
       Grupo maior que a última faixa = sob consulta (total 0 + grupoGrande). */
    if (x.priceMode === 'pacote' && Array.isArray(x.pacotes) && x.pacotes.length) {
      const pk = x.pacotes.find(p => +p.h === +horas) || x.pacotes[0];
      const fx = (pk.faixas || []).find(f => pax <= +f.ate);
      if (!fx) return { total: 0, linhas: [], grupoGrande: true, horas: +pk.h };
      return { total: +fx.v, horas: +pk.h, faixa: fx, linhas: [{ qtd: 1, valor: +fx.v, rot: rotuloHoras(pk.h) + ' · até ' + fx.ate + ' pessoas' }] };
    }
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
    /* Carol: "30% de entrada, depois o restante no dia" */
    if (GUIA_CFG.saldoNoDia && !(x && +x.balanceDays)) return b.date;
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
