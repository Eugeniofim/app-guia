/* =====================================================
   DEMONSTRAÇÃO — o painel "vivo" do demo "Londres com a Bia" (07/10/2026)

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
      id: 'demo' + (++n), code: 'LB-' + (3100 + n * 47 % 6800), tourId: o.tourId, date: o.date, time: o.time || '09:30',
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
  bk({ tourId: 'londres-classica', date: d(3), time: '09:30', horas: 4, pax: 4, name: 'Mariana Souza', email: 'mariana.souza@exemplo.com', whats: '+55 11 98888 1001', insta: 'mari.souza', sinal: true, criado: d(-8), origin: 'instagram', hotel: 'Park Plaza Westminster Bridge' });
  bk({ tourId: 'city-tower-bridge', date: d(9), time: '09:30', horas: 6, pax: 2, name: 'Ricardo Lima', email: 'ricardo.lima@exemplo.com', whats: '+55 21 97777 2002', sinal: true, metodo: 'pix', criado: d(-5), origin: 'site', hotel: 'The Tower Hotel' });
  bk({ tourId: 'londres-criancas', date: d(16), time: '09:30', horas: 3, pax: 5, name: 'Fernanda Tavares', email: 'fe.tavares@exemplo.com', whats: '+55 31 96666 3003', sinal: true, criado: d(-2), origin: 'whatsapp', obs: 'Crianças de 5, 8 e 11 anos. Fãs de Harry Potter.' });
  bk({ tourId: 'notting-hill-camden', date: d(-5), time: '09:30', horas: 4, pax: 3, name: 'Juliana Prado', email: 'ju.prado@exemplo.com', whats: '+55 41 95555 4004', sinal: true, quitado: true, criado: d(-30), origin: 'site' });
  bk({ tourId: 'museu-britanico', date: d(-12), time: '14:00', horas: 3, pax: 2, name: 'Fernando Alves', email: 'f.alves@exemplo.com', whats: '+55 11 94444 5005', sinal: true, quitado: true, criado: d(-40), origin: 'google' });
  bk({ tourId: 'londres-classica', date: d(-20), time: '09:30', horas: 6, pax: 6, name: 'Camila Rocha', email: 'camila.rocha@exemplo.com', whats: '+55 51 93333 6006', sinal: true, quitado: true, criado: d(-60), origin: 'friend' });
  bk({ tourId: 'consultoria', date: d(2), time: '20:00', pax: 1, name: 'Patrícia Nunes', email: 'pati.nunes@exemplo.com', whats: '+55 61 92222 7007', policy: 'full', quitado: false, criado: d(-1), origin: 'site' });
  db.bookings[db.bookings.length - 1].payments.push({ amount: 50, date: d(-1), method: 'card', kind: 'full' });
  /* a mesma família que comprou o roteiro (rt1) reservou um dia com a Bia: vira UMA ficha (junta pelo WhatsApp) */
  bk({ tourId: 'city-tower-bridge', date: d(15), time: '09:30', horas: 4, pax: 4, name: 'Paula Castro', email: 'castro@exemplo.com', whats: '+55 19 98989 1212', sinal: true, criado: d(-1), origin: 'site', hotel: 'Hotel perto de Covent Garden' });

  /* ---- AGÊNCIAS (empresas que contratam o guia por e-mail) ---- */
  db.agencias = [
    { id: 'ag1', nome: 'Viagens Aurora', cidade: 'São Paulo', contato: 'Renata (operações)', email: 'operacoes@viagensaurora.exemplo', whats: '+55 11 3000 1111',
      pagamento: 'Paga todo dia 10 do mês seguinte, se a invoice chegar até o dia 25', diaCorte: 25, diaPagamento: 10, moeda: 'GBP', prioridade: true, exemplo: true },
    { id: 'ag2', nome: 'Mundo Afora Turismo', cidade: 'Curitiba', contato: 'Eduardo', email: 'reservas@mundoafora.exemplo', whats: '+55 41 3000 2222',
      pagamento: '30 dias depois da invoice', prazoDias: 30, moeda: 'GBP', prioridade: true, exemplo: true },
    { id: 'ag3', nome: 'Rota Europa DMC', cidade: 'Lisboa', contato: 'Inês', email: 'ops@rotaeuropa.exemplo', whats: '+351 21 000 3333',
      pagamento: '15 dias depois da invoice', prazoDias: 15, moeda: 'GBP', prioridade: true, exemplo: true },
  ];
  /* trabalhos feitos (ou marcados) para as agências. Ocupam o dia como qualquer tour. */
  db.trabalhosAgencia = [
    { id: 'tj1', agencia: 'ag1', data: d(-8), servico: 'City tour privativo 8h (transfer + guia)', pax: 4, cliente: 'Grupo Sr. Almeida', valor: 820, status: 'feito',
      invoice: { numero: '', emitida: '', enviada: '', vence: '', paga: '' }, exemplo: true },
    { id: 'tj2', agencia: 'ag2', data: d(-22), servico: 'City e Tower Bridge (4h)', pax: 6, cliente: 'Família Moraes', valor: 420, status: 'feito',
      invoice: { numero: 'LB-INV-2026-014', emitida: d(-20), enviada: d(-20), vence: d(10), paga: '' }, exemplo: true },
    { id: 'tj3', agencia: 'ag3', data: d(-35), servico: 'Windsor e Oxford (8h)', pax: 3, cliente: 'Casal Ferreira', valor: 680, status: 'feito',
      invoice: { numero: 'LB-INV-2026-011', emitida: d(-33), enviada: d(-33), vence: d(-18), paga: d(-17) }, exemplo: true },
    { id: 'tj4', agencia: 'ag2', data: d(6), servico: 'Londres Clássica (4h)', pax: 4, cliente: 'Grupo Bianchi', valor: 360, status: 'marcado',
      invoice: { numero: '', emitida: '', enviada: '', vence: '', paga: '' }, exemplo: true },
  ];
  /* e-mails que o assistente "varreu" (a caixa da guia) */
  db.emails = [
    { id: 'em1', de: 'reservas@mundoafora.exemplo', nome: 'Mundo Afora Turismo', assunto: 'Solicitação de guia PT — 4 pax — city tour 4h', chegou: agoraIso,
      resumo: 'Pedem guia em português para 4 pessoas no dia ' + d(3).split('-').reverse().join('/') + ', city tour de 4h saindo do The Savoy. Pedem confirmação até amanhã.',
      tipo: 'agencia', agencia: 'ag2', data: d(3), pax: 4, tratado: false, exemplo: true },
    { id: 'em2', de: 'rodrigo.mendes@exemplo.com', nome: 'Rodrigo Mendes (formulário do site)', assunto: 'Tour City e Tower Bridge — 3 pessoas', chegou: d(-1) + 'T18:40:00.000Z',
      resumo: 'Rodrigo Mendes quer o tour da City para 3 pessoas em ' + d(14).split('-').reverse().join('/') + '. Deixou WhatsApp +55 11 91111 8008.',
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
    { id: 'mt1', nome: 'João (motorista parceiro)', whats: '+44 7700 900111', carro: 'Mercedes V-Class', lugares: 7, malas: 7, obs: 'Aeroportos e bate-voltas', exemplo: true },
    { id: 'mt2', nome: 'Priya (motorista parceira)', whats: '+44 7700 900222', carro: 'Toyota Prius', lugares: 3, malas: 3, obs: 'Casais e trajetos curtos', exemplo: true },
  ];
  /* MONTE SEU ROTEIRO pago, esperando a Bia validar o rascunho */
  db.roteiros = [
    { id: 'rt1', codigo: 'castro-out', nome: 'Família Castro', whats: '+55 19 98989 1212', email: 'castro@exemplo.com', criado: d(-1) + 'T15:00:00.000Z',
      ini: d(14), fim: d(18), adultos: 2, criancas: 2, idades: '9 e 12 anos', hotel: 'Hotel perto de Covent Garden', nivel: 'imersivo',
      querem: ['big-ben', 'troca-guarda', 'tower-of-london', 'tower-bridge', 'british-museum', 'harry-potter', 'camden', 'greenwich', 'borough-market', 'nhm'],
      interesses: ['historia', 'criancas', 'harrypotter'], ritmo: 'medio', obs: 'Primeira vez em Londres. As crianças amam Harry Potter.',
      pago: { valor: 275, metodo: 'card', em: d(-1) }, status: 'rascunho', dias: [], exemplo: true },
  ];
  /* VALE-PRESENTE vendido */
  db.giftcards = [
    { id: 'gc1', codigo: 'BIA-7Q2K', de: 'Marcos', para: 'Luciana', email: 'marcos@exemplo.com', whats: '+55 11 97000 1313', mensagem: 'Feliz aniversário, amor! Londres do jeito que você sonhou.',
      tourId: 'londres-classica', horas: 4, pax: 2, valor: 360, criado: d(-6), validade: addDays(d(-6), 365), usado: false, pago: true, exemplo: true },
  ];
  /* AVALIAÇÕES que chegaram pelo QR do fim do tour. Duas já aprovadas
     (publicar: true) para a seção de depoimentos aparecer no demo;
     duas esperando a guia aprovar. */
  db.avaliacoes = [
    { id: 'av1', nome: 'Juliana', estrelas: 5, texto: 'A Bia transformou Notting Hill e Camden numa manhã que a gente não queria que acabasse. Voltaríamos amanhã!', tourId: 'notting-hill-camden', data: d(-4), publicar: true, autorizou: true, exemplo: true },
    { id: 'av2', nome: 'Fernando', estrelas: 4, texto: 'Roteiro no Museu Britânico perfeito para quem tem pouco tempo. Pontual, simpática e muito preparada. Só faltou mais tempo!', tourId: 'museu-britanico', data: d(-11), publicar: true, autorizou: true, exemplo: true },
    { id: 'av3', nome: 'Camila', estrelas: 5, texto: 'Fizemos a Londres Clássica em 6 horas com a família toda. A Bia tem paciência com criança e sabe cada história.', tourId: 'londres-classica', data: d(-19), publicar: false, autorizou: true, exemplo: true },
    { id: 'av4', nome: 'Rodrigo', estrelas: 5, texto: 'Windsor e Oxford num dia só, sem correria, com motorista. Valeu cada libra.', tourId: 'windsor-oxford', data: d(-26), publicar: false, autorizou: true, exemplo: true },
  ];
  /* FICHAS: o que a guia anotou (o resto a ficha monta sozinha dos pagamentos) */
  db.fichas = [
    { id: 'wa5511988881001', idades: '2 adultos e 2 adolescentes (14 e 16)', mobilidade: 'A mãe operou o joelho: ritmo tranquilo, evitar escadas do metrô',
      alimentacao: '', ocasiao: 'Primeira vez em Londres', pais: 'São Paulo', tags: ['Ocasião especial'], notas: 'Querem foto na Tower Bridge no fim. Achou a Bia pelo Instagram.', vistaEm: d(-7) + 'T12:00:00.000Z', exemplo: true },
  ];
  /* TAREFAS e RECADOS (a parte de "gestão pessoal") */
  db.tarefas = [
    { id: 'tf1', texto: 'Mandar a invoice da Viagens Aurora (o corte deles é dia 25)', data: hoje, hora: '', area: 'pro', prioridade: 'alta', feita: false, nota: 'Serviço de ' + d(-8).split('-').reverse().join('/') + ' — £820' },
    { id: 'tf2', texto: 'Reservar o Sky Garden para o grupo do Ricardo', data: d(1), hora: '', area: 'pro', prioridade: 'media', feita: false, nota: 'Tour da City dia ' + d(9).split('-').reverse().join('/') },
    { id: 'tf3', texto: 'Gravar o áudio das paradas de Westminster', data: d(2), hora: '', area: 'pro', prioridade: 'media', feita: false, nota: 'Roteiro imersivo' },
    { id: 'tf4', texto: 'Conferir o calendário da Troca da Guarda da semana que vem', data: hoje, hora: '', area: 'pro', prioridade: 'alta', feita: false, nota: '' },
  ];
  db.recados = [
    { id: 'rc1', canal: 'whats', nome: 'Letícia (cliente)', texto: 'Quer saber se o tour da City tem data no sábado para 3 pessoas.', chegou: agoraIso, atendido: false, exemplo: true },
  ];
  return db;
}

if (typeof module !== 'undefined') module.exports = { demoCarol };
