/* =====================================================
   DEMONSTRAÇÃO — o painel "vivo" do protótipo do Aílton (16/10/2026)

   Tudo aqui é FICTÍCIO (marcado "exemplo") e só existe no aparelho de quem
   olha (sem nuvem). Serve para o Aílton ver o painel funcionando com casos
   parecidos com os dele: clientes nos 3 passeios do site, agência com
   invoice, e-mail de agência detectado, pedido de Salzburgo sob consulta.
   Ele apaga tudo em Ajustes quando começar de verdade.

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
      id: 'demo' + (++n), code: 'AV-' + (3100 + n * 47 % 6800), tourId: o.tourId, date: o.date, time: o.time || '09:30',
      name: o.name, email: o.email, whats: o.whats, insta: o.insta || '', pax: o.pax, total,
      coupon: null, discount: 0, policy: o.policy || 'split', horas: pr.horas || o.horas || null,
      depositPct: (o.policy || 'split') === 'split' ? 30 : null, payments: [],
      consent: { ok: true, at: d(-20) + 'T10:00:00.000Z', src: 'checkout' },
      status: 'confirmed', createdAt: (o.criado || d(-10)) + 'T10:00:00.000Z', origin: o.origin || 'site', lang: 'pt', exemplo: true,
      hotel: o.hotel || '', obs: o.obs || '',
    };
    if (o.sinal) b.payments.push({ amount: Math.round(total * 0.3), date: o.criado || d(-10), method: o.metodo || 'card', kind: 'deposit' });
    if (o.quitado) b.payments.push({ amount: total - (o.sinal ? Math.round(total * 0.3) : 0), date: o.date, method: o.saldo || 'card', kind: o.sinal ? 'balance' : 'full' });
    db.bookings.push(b);
    return b;
  };
  /* ---- clientes diretos (app / WhatsApp / Instagram) nos passeios do site ---- */
  bk({ tourId: 'city-tour-classico', date: d(1), time: '09:30', horas: 2, pax: 4, name: 'Mariana Souza', email: 'mariana.souza@exemplo.com', whats: '+55 11 98888 1001', insta: 'mari.souza', sinal: true, criado: d(-8), origin: 'instagram', hotel: 'Hotel Sacher (centro)' });
  bk({ tourId: 'top-tour-viena', date: d(4), time: '09:30', horas: 6.5, pax: 2, name: 'Ricardo Lima', email: 'ricardo.lima@exemplo.com', whats: '+55 21 97777 2002', sinal: true, metodo: 'pix', criado: d(-5), origin: 'site', hotel: 'Hotel perto do Stephansdom', obs: 'Lua de mel. Querem almoçar num café tradicional.' });
  bk({ tourId: 'city-tour-classico-plus', date: d(9), time: '14:30', horas: 3, pax: 6, name: 'Fernanda Tavares', email: 'fe.tavares@exemplo.com', whats: '+55 31 96666 3003', sinal: true, metodo: 'wise', criado: d(-2), origin: 'whatsapp', obs: 'Família com 2 crianças (8 e 11 anos).' });
  bk({ tourId: 'city-tour-classico', date: d(-3), time: '14:30', horas: 2, pax: 3, name: 'Juliana Prado', email: 'ju.prado@exemplo.com', whats: '+55 41 95555 4004', sinal: true, quitado: true, saldo: 'cash', criado: d(-30), origin: 'site' });
  bk({ tourId: 'city-tour-classico-plus', date: d(-12), time: '09:30', horas: 3, pax: 2, name: 'Fernando Alves', email: 'f.alves@exemplo.com', whats: '+55 11 94444 5005', sinal: true, quitado: true, criado: d(-40), origin: 'google' });
  bk({ tourId: 'top-tour-viena', date: d(-20), time: '09:30', horas: 6.5, pax: 5, name: 'Camila Rocha', email: 'camila.rocha@exemplo.com', whats: '+55 51 93333 6006', sinal: true, quitado: true, criado: d(-60), origin: 'friend' });
  bk({ tourId: 'city-tour-classico', date: d(-34), time: '09:30', horas: 2, pax: 2, name: 'Paulo Mendes', email: 'paulo.m@exemplo.com', whats: '+55 19 98989 1212', sinal: true, quitado: true, saldo: 'cash', criado: d(-70), origin: 'instagram' });
  bk({ tourId: 'city-tour-classico-plus', date: d(-48), time: '14:30', horas: 3, pax: 4, name: 'Beatriz Nogueira', email: 'bia.n@exemplo.com', whats: '+55 85 98123 4567', sinal: true, quitado: true, criado: d(-90), origin: 'site' });
  bk({ tourId: 'city-tour-classico', date: d(15), time: '09:30', horas: 2, pax: 5, name: 'Paula Castro', email: 'castro@exemplo.com', whats: '+55 19 98989 3434', sinal: true, criado: d(-1), origin: 'site', hotel: 'Hotel no Ring' });

  /* ---- AGÊNCIAS (empresas que contratam o guia por e-mail) ---- */
  db.agencias = [
    { id: 'ag1', nome: 'Viagens Aurora', cidade: 'São Paulo', contato: 'Renata (operações)', email: 'operacoes@viagensaurora.exemplo', whats: '+55 11 3000 1111',
      pagamento: 'Paga todo dia 10 do mês seguinte, se a invoice chegar até o dia 25', diaCorte: 25, diaPagamento: 10, moeda: 'EUR', prioridade: true, exemplo: true },
    { id: 'ag2', nome: 'Mundo Afora Turismo', cidade: 'Curitiba', contato: 'Eduardo', email: 'reservas@mundoafora.exemplo', whats: '+55 41 3000 2222',
      pagamento: '30 dias depois da invoice', prazoDias: 30, moeda: 'EUR', prioridade: true, exemplo: true },
  ];
  db.trabalhosAgencia = [
    { id: 'tj1', agencia: 'ag1', data: d(-8), servico: 'Top Tour Viena (6h30)', pax: 4, cliente: 'Grupo Sr. Almeida', valor: 840, status: 'feito',
      invoice: { numero: '', emitida: '', enviada: '', vence: '', paga: '' }, exemplo: true },
    { id: 'tj2', agencia: 'ag2', data: d(-22), servico: 'City Tour Clássico Plus (3h)', pax: 5, cliente: 'Família Moraes', valor: 470, status: 'feito',
      invoice: { numero: 'AV-INV-2026-014', emitida: d(-20), enviada: d(-20), vence: d(10), paga: '' }, exemplo: true },
    { id: 'tj3', agencia: 'ag2', data: d(6), servico: 'City Tour Clássico (2h)', pax: 4, cliente: 'Grupo Bianchi', valor: 330, status: 'marcado',
      invoice: { numero: '', emitida: '', enviada: '', vence: '', paga: '' }, exemplo: true },
  ];
  /* e-mails que o assistente "varreu" (a caixa do guia) */
  db.emails = [
    { id: 'em1', de: 'reservas@mundoafora.exemplo', nome: 'Mundo Afora Turismo', assunto: 'Solicitação de guia PT — 4 pax — city tour 2h', chegou: agoraIso,
      resumo: 'Pedem guia em português para 4 pessoas no dia ' + d(3).split('-').reverse().join('/') + ', City Tour Clássico de 2h. Pedem confirmação até amanhã.',
      tipo: 'agencia', agencia: 'ag2', data: d(3), pax: 4, tratado: false, exemplo: true },
    { id: 'em2', de: 'rodrigo.mendes@exemplo.com', nome: 'Rodrigo Mendes (formulário do site)', assunto: 'Salzburgo — 3 pessoas', chegou: d(-1) + 'T18:40:00.000Z',
      resumo: 'Rodrigo Mendes quer um dia em Salzburgo com guia para 3 pessoas em ' + d(14).split('-').reverse().join('/') + '. Deixou WhatsApp +55 11 91111 8008.',
      tipo: 'cliente', data: d(14), pax: 3, whats: '+55 11 91111 8008', tratado: false, exemplo: true },
  ];
  db.pedidos = [];
  db.motoristas = [];
  db.roteiros = [];      /* "Monte seu roteiro" saiu do app do Aílton */
  db.giftcards = [];     /* vale-presente saiu da vitrine */
  /* AVALIAÇÕES que chegaram pelo QR do fim do passeio: exemplos esperando ele
     aprovar (não aparecem para o cliente — os depoimentos reais do site estão
     em config.js) */
  db.avaliacoes = [
    { id: 'av1', nome: 'Juliana', estrelas: 5, texto: 'Duas horas que passaram voando. O Aílton conta a história de Viena como ninguém.', tourId: 'city-tour-classico', data: d(-2), publicar: false, autorizou: true, exemplo: true },
    { id: 'av2', nome: 'Fernando', estrelas: 5, texto: 'O Belvedere com o Aílton foi o ponto alto da viagem.', tourId: 'city-tour-classico-plus', data: d(-11), publicar: false, autorizou: true, exemplo: true },
  ];
  /* FICHAS: o que o guia anotou (o resto a ficha monta sozinha dos pagamentos) */
  db.fichas = [
    { id: 'wa5511988881001', idades: '2 adultos e 2 adolescentes (14 e 16)', mobilidade: 'A mãe operou o joelho: ritmo tranquilo',
      alimentacao: '', ocasiao: 'Primeira vez em Viena', pais: 'São Paulo', tags: ['Ocasião especial'], notas: 'Querem foto no Hofburg. Acharam o Aílton pelo Instagram.', vistaEm: d(-7) + 'T12:00:00.000Z', exemplo: true },
  ];
  /* TAREFAS e RECADOS */
  db.tarefas = [
    { id: 'tf1', texto: 'Mandar a invoice da Viagens Aurora (o corte deles é dia 25)', data: hoje, hora: '', area: 'pro', prioridade: 'alta', feita: false, nota: 'Serviço de ' + d(-8).split('-').reverse().join('/') + ' — €840' },
    { id: 'tf2', texto: 'Reservar o almoço do Top Tour do Ricardo', data: d(1), hora: '', area: 'pro', prioridade: 'media', feita: false, nota: 'Top Tour dia ' + d(4).split('-').reverse().join('/') },
    { id: 'tf3', texto: 'Separar recibos do trimestre para o Steuerberater', data: d(2), hora: '', area: 'pro', prioridade: 'media', feita: false, nota: 'Contabilidade → Para o contador' },
  ];
  db.recados = [
    { id: 'rc1', canal: 'whats', nome: 'Letícia (cliente)', texto: 'Quer saber se o Clássico Plus tem data no sábado para 3 pessoas.', chegou: agoraIso, atendido: false, exemplo: true },
  ];
  return db;
}

if (typeof module !== 'undefined') module.exports = { demoCarol };
