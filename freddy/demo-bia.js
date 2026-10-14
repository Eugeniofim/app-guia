/* =====================================================
   DEMONSTRAÇÃO — o painel "vivo" do protótipo da Freddy Turismo (14/10/2026)

   Tudo aqui é FICTÍCIO e só existe no aparelho de quem olha (sem nuvem).
   Serve para o guia que avalia o produto ver cada módulo funcionando com
   casos parecidos com os dele: cliente direto, agência (B2B) com invoice,
   e-mail de agência detectado, transfer esperando o motorista, roteiro pago
   esperando validação, consultoria marcada, vale-presente vendido e duas
   avaliações aprovadas.

   Nomes de pessoas e agências são inventados de propósito.
   ===================================================== */
'use strict';

function demoCarol(db) {
  const hoje = isoToday();
  const d = (n) => addDays(hoje, n);
  const agoraIso = new Date().toISOString();
  let n = 0;
  const bk = (o) => {
    const x = db.tours.find(t => t.id === o.tourId);
    const pr = Bookings.precoDe(x, o.tourId, o.date, o.time, o.pax, o.horas);
    const total = o.total || pr.total;
    const b = {
      id: 'demo' + (++n), code: 'FT-' + (3100 + n * 47 % 6800), tourId: o.tourId, date: o.date, time: o.time || '09:30',
      name: o.name, email: o.email, whats: o.whats, insta: o.insta || '', pax: o.pax, total,
      coupon: null, discount: 0, policy: o.policy || 'split', horas: pr.horas || o.horas || null,
      depositPct: (o.policy || 'split') === 'split' ? 30 : null, payments: [],
      consent: { ok: true, at: d(-20) + 'T10:00:00.000Z', src: 'checkout' },
      status: 'confirmed', createdAt: (o.criado || d(-10)) + 'T10:00:00.000Z', origin: o.origin || 'site', lang: 'pt', exemplo: true,
      hotel: o.hotel || '', obs: o.obs || '',
    };
    if (o.sinal) b.payments.push({ amount: Math.round(total * 0.3), date: o.criado || d(-10), method: o.metodo || 'card', kind: 'deposit' });
    if (o.quitado) b.payments.push({ amount: total - (o.sinal ? Math.round(total * 0.3) : 0), date: o.date, method: 'card', kind: o.sinal ? 'balance' : 'full' });
    db.bookings.push(b);
    return b;
  };
  /* ---- clientes diretos (app / WhatsApp / Instagram) ---- */
  bk({ tourId: 'city-tour', date: d(3), time: '08:00', horas: 8, pax: 4, name: 'Mariana Souza', email: 'mariana.souza@exemplo.com', whats: '+55 11 98888 1001', insta: 'mari.souza', sinal: true, criado: d(-8), origin: 'instagram', hotel: 'Park Plaza Westminster Bridge' });
  bk({ tourId: 'windsor-stonehenge', date: d(9), time: '08:00', horas: 10, pax: 2, name: 'Ricardo Lima', email: 'ricardo.lima@exemplo.com', whats: '+55 21 97777 2002', sinal: true, metodo: 'pix', criado: d(-5), origin: 'site', hotel: 'The Tower Hotel' });
  bk({ tourId: 'harry-potter', date: d(16), time: '08:00', horas: 6, pax: 5, name: 'Fernanda Tavares', email: 'fe.tavares@exemplo.com', whats: '+55 31 96666 3003', sinal: true, criado: d(-2), origin: 'whatsapp', obs: 'Crianças de 5, 8 e 11 anos. Fãs de Harry Potter.' });
  bk({ tourId: 'oxford', date: d(-5), time: '08:00', horas: 8, pax: 3, name: 'Juliana Prado', email: 'ju.prado@exemplo.com', whats: '+55 41 95555 4004', sinal: true, quitado: true, criado: d(-30), origin: 'site' });
  bk({ tourId: 'stonehenge-bath', date: d(-12), time: '08:00', horas: 10, pax: 2, name: 'Fernando Alves', email: 'f.alves@exemplo.com', whats: '+55 11 94444 5005', sinal: true, quitado: true, criado: d(-40), origin: 'google' });
  bk({ tourId: 'cotswolds-stratford', date: d(-20), time: '08:00', horas: 10, pax: 6, name: 'Camila Rocha', email: 'camila.rocha@exemplo.com', whats: '+55 51 93333 6006', sinal: true, quitado: true, criado: d(-60), origin: 'friend' });
  bk({ tourId: 'futebol', date: d(2), time: '08:00', horas: 8, pax: 2, name: 'Patrícia Nunes', email: 'pati.nunes@exemplo.com', whats: '+55 61 92222 7007', policy: 'full', quitado: false, criado: d(-1), origin: 'site' });
  db.bookings[db.bookings.length - 1].payments.push({ amount: 180, date: d(-1), method: 'card', kind: 'deposit' });
  /* a mesma família que comprou o roteiro (rt1) reservou um dia com o Roberto: vira UMA ficha (junta pelo WhatsApp) */
  bk({ tourId: 'city-tour', date: d(15), time: '08:00', horas: 8, pax: 4, name: 'Paula Castro', email: 'castro@exemplo.com', whats: '+55 19 98989 1212', sinal: true, criado: d(-1), origin: 'site', hotel: 'Hotel perto de Covent Garden' });

  /* ---- AGÊNCIAS (empresas que contratam o guia por e-mail) ---- */
  /* HISTÓRICO (15/10/2026): serviços já feitos nos últimos meses, para a
     Contabilidade e as Estatísticas terem o que mostrar */
  const H = [
    ['city-tour', -15, 3, 'Beatriz Moura', 'instagram'], ['windsor-stonehenge', -19, 5, 'Família Arantes', 'site'], ['harry-potter', -23, 4, 'Gustavo Lemos', 'whatsapp'],
    ['oxford', -28, 2, 'Renata e Paulo', 'instagram'], ['city-tour', -33, 6, 'Grupo Sampaio', 'friend'], ['stonehenge-bath', -38, 2, 'Lucas Prado', 'google'],
    ['futebol', -44, 3, 'Thiago Rezende', 'instagram'], ['cotswolds-stratford', -49, 4, 'Família Nogueira', 'site'], ['city-tour', -52, 2, 'Aline Castro', 'instagram'],
    ['outlets', -58, 3, 'Carla Mendes', 'whatsapp'], ['windsor-stonehenge', -63, 7, 'Grupo Fonseca', 'friend'], ['cambridge', -69, 2, 'Diego e Marina', 'google'],
    ['harry-potter', -74, 5, 'Família Duarte', 'instagram'], ['city-tour', -80, 4, 'Vanessa Lima', 'site'], ['leeds-canterbury', -86, 3, 'Roberta Alves', 'instagram'],
    ['oxford', -92, 2, 'Felipe Moraes', 'friend'], ['stonehenge-bath', -99, 6, 'Grupo Teixeira', 'whatsapp'], ['city-tour', -106, 3, 'Sabrina Rocha', 'instagram'],
  ];
  H.forEach(([tourId, dia, pax, name, origin], i) => {
    const x = db.tours.find(t => t.id === tourId); const h = (x && x.pacotes && x.pacotes[0] && x.pacotes[0].h) || 8;
    bk({ tourId, date: d(dia), time: '08:00', horas: h, pax, name, email: 'cliente' + i + '@exemplo.com', whats: '+55 11 9' + String(70000000 + i * 1371).slice(0, 8),
      sinal: true, quitado: true, criado: d(dia - 12 - (i % 5) * 6), origin, metodo: i % 4 === 0 ? 'pix' : 'card' });
  });
  /* agências: o Roberto não usa (15/10/2026) */
  db.agencias = [];
  db.trabalhosAgencia = [];
  /* e-mails que o assistente "varreu" (a caixa da guia) */
  db.emails = [
    { id: 'em2', de: 'rodrigo.mendes@exemplo.com', nome: 'Rodrigo Mendes (formulário do site)', assunto: 'Transfer + city tour — 3 pessoas', chegou: d(-1) + 'T18:40:00.000Z',
      resumo: 'Rodrigo Mendes quer transfer de Heathrow e o City Tour para 3 pessoas em ' + d(14).split('-').reverse().join('/') + '. Deixou WhatsApp +55 11 91111 8008.',
      tipo: 'cliente', data: d(14), pax: 3, whats: '+55 11 91111 8008', tratado: false, exemplo: true },
    { id: 'em3', de: 'news@agenda-cultural.exemplo', nome: 'Newsletter', assunto: 'O que fazer em Londres esta semana', chegou: d(-1) + 'T07:00:00.000Z',
      resumo: 'Newsletter — ignorado.', tipo: 'ignorado', tratado: true, exemplo: true },
  ];
  /* pedidos: transfer esperando motorista */
  db.pedidos = [
    { id: 'pd1', tipo: 'transfer', criado: d(-1) + 'T21:10:00.000Z', respondido: false, nome: 'Luiza Barros', whats: '+55 11 90000 9009', email: 'luiza.barros@exemplo.com',
      obs: 'Voo chega 7h10, vamos com carrinho de bebê.', adultos: 3, criancas: 1, idades: '2 anos', tipoTrf: 'chegada', de: 'Aeroporto de Heathrow (LHR)', para: 'Hotel The Resident Covent Garden',
      data: d(5), hora: '07:10', voo: 'BA 246', volta: false, malas: 4, malasMao: 3, exemplo: true },
  ];
  db.pedidos.forEach(p => { if (typeof fichaTransfer === 'function') { p.ficha = fichaTransfer(p); p.resumo = resumoPedido(p); } });
  db.motoristas = [
    { id: 'mt1', nome: 'João (motorista da frota)', whats: '+44 7700 900111', carro: 'Mercedes V-Class', lugares: 7, malas: 7, obs: 'Aeroportos, grupos e bate-voltas', exemplo: true },
    { id: 'mt2', nome: 'Carlos (motorista da frota)', whats: '+44 7700 900222', carro: 'Mercedes Classe E', lugares: 3, malas: 3, obs: 'Casais e executivos', exemplo: true },
  ];
  /* MONTE SEU ROTEIRO pago, esperando o Roberto validar o rascunho */
  db.roteiros = [
    { id: 'rt1', codigo: 'castro-out', nome: 'Família Castro', whats: '+55 19 98989 1212', email: 'castro@exemplo.com', criado: d(-1) + 'T15:00:00.000Z',
      ini: d(14), fim: d(18), adultos: 2, criancas: 2, idades: '9 e 12 anos', hotel: 'Hotel perto de Covent Garden', nivel: 'mapa',
      querem: ['big-ben', 'troca-guarda', 'tower-of-london', 'tower-bridge', 'british-museum', 'harry-potter', 'camden', 'greenwich', 'borough-market', 'nhm'],
      interesses: ['historia', 'criancas', 'harrypotter'], ritmo: 'medio', obs: 'Primeira vez em Londres. As crianças amam Harry Potter.',
      pago: { valor: 275, metodo: 'card', em: d(-1) }, status: 'rascunho', dias: [], exemplo: true },
  ];
  /* VALE-PRESENTE vendido */
  db.giftcards = [
    { id: 'gc1', codigo: 'BIA-7Q2K', de: 'Marcos', para: 'Luciana', email: 'marcos@exemplo.com', whats: '+55 11 97000 1313', mensagem: 'Feliz aniversário, amor! Londres do jeito que você sonhou.',
      tourId: 'city-tour', horas: 8, pax: 2, valor: 480, criado: d(-6), validade: addDays(d(-6), 365), usado: false, pago: true, exemplo: true },
  ];
  /* AVALIAÇÕES que chegaram pelo QR do fim do tour. Duas já aprovadas
     (publicar: true) para a seção de depoimentos aparecer no demo;
     duas esperando a guia aprovar. */
  db.avaliacoes = [
    { id: 'av1', nome: 'Juliana', estrelas: 5, texto: 'O Roberto fez Oxford parecer cenário de filme: contou cada história e ainda tirou as melhores fotos da viagem. Voltaríamos amanhã!', tourId: 'oxford', data: d(-4), publicar: true, autorizou: true, exemplo: true },
    { id: 'av2', nome: 'Fernando', estrelas: 4, texto: 'Stonehenge e Bath num dia só, num carro impecável. Pontual, simpático e muito preparado. Só faltou mais tempo em Bath!', tourId: 'stonehenge-bath', data: d(-11), publicar: true, autorizou: true, exemplo: true },
    { id: 'av3', nome: 'Camila', estrelas: 5, texto: 'Fizemos os Cotswolds com a família toda na V-Class. O Roberto tem paciência com criança e sabe cada história.', tourId: 'cotswolds-stratford', data: d(-19), publicar: false, autorizou: true, exemplo: true },
    { id: 'av4', nome: 'Rodrigo', estrelas: 5, texto: 'Windsor, Stonehenge e Salisbury num dia só, sem correria. Valeu cada libra.', tourId: 'windsor-stonehenge', data: d(-26), publicar: false, autorizou: true, exemplo: true },
  ];
  /* FICHAS: o que a guia anotou (o resto a ficha monta sozinha dos pagamentos) */
  db.fichas = [
    { id: 'wa5511988881001', idades: '2 adultos e 2 adolescentes (14 e 16)', mobilidade: 'A mãe operou o joelho: ritmo tranquilo, evitar escadas do metrô',
      alimentacao: '', ocasiao: 'Primeira vez em Londres', pais: 'São Paulo', tags: ['Ocasião especial'], notas: 'Querem foto na Tower Bridge no fim. Achou a Freddy Turismo pelo Instagram.', vistaEm: d(-7) + 'T12:00:00.000Z', exemplo: true },
  ];
  /* TAREFAS e RECADOS (a parte de "gestão pessoal") */
  db.tarefas = [
    { id: 'tf1', texto: 'Mandar a invoice da Viagens Aurora (o corte deles é dia 25)', data: hoje, hora: '', area: 'pro', prioridade: 'alta', feita: false, nota: 'Serviço de ' + d(-8).split('-').reverse().join('/') + ' — £820' },
    { id: 'tf2', texto: 'Reservar o Sky Garden para o grupo do Ricardo', data: d(1), hora: '', area: 'pro', prioridade: 'media', feita: false, nota: 'Tour da City dia ' + d(9).split('-').reverse().join('/') },
    { id: 'tf4', texto: 'Conferir o calendário da Troca da Guarda da semana que vem', data: hoje, hora: '', area: 'pro', prioridade: 'alta', feita: false, nota: '' },
  ];
  db.recados = [
    { id: 'rc1', canal: 'whats', nome: 'Letícia (cliente)', texto: 'Quer saber se o tour da City tem data no sábado para 3 pessoas.', chegou: agoraIso, atendido: false, exemplo: true },
  ];
  return db;
}

if (typeof module !== 'undefined') module.exports = { demoCarol };
