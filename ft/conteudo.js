/* =====================================================
   CONTEÚDO DO CLIENTE — o que é da FT (Roberto), não do app (base: app da Yalla)

   A camada de operação (operacao.js / operacao-telas.js) nasceu no app da
   EmRoma, com Roma, o Vaticano e o fornecedor de transfer dela escritos no
   código. Tudo o que é de UM cliente mora aqui: as contas, os lugares que
   o leitor de conversa reconhece, as sugestões do "Monte a sua
   experiência", os textos-base de termos e voucher e a demonstração.
   Para outro cliente, troca-se este arquivo (e o config.js) — o resto fica.

   REGRA: nada de política inventada. Onde a regra é DELA (cancelamento,
   espera, multa), o texto é neutro e diz para ela revisar em Ajustes.

   Carrega ANTES de operacao.js.
   ===================================================== */
'use strict';

const CONTEUDO = {
  /* as bandeiras dos dois lados do caixa (os nomes vêm de APP_CONFIG.lados) */
  bandeiras: { brasil: '🇧🇷', europa: '🇬🇧' },

  /* a cidade-base: transfer "daqui" e o resto (outro fornecedor) */
  base: {
    nome: 'Londres',
    re: /\b(LHR|LCY)\b|london|londres|heathrow|westminster|mayfair|kensington|chelsea|soho|covent garden|st pancras/i,
    reFora: /\b(LGW|STN|LTN)\b|gatwick|stansted|luton|southampton|dover|edinburgh|edimburgo|scotland|esc[oó]cia|paris|amsterdam/i,
  },

  /* Onde ela recebe (reunião de 24/09/2026): uma plataforma no Brasil com
     Pix e cartão em até 12x, que repassa para a conta dela em Dubai.
     "brasil"/"europa" são as chaves internas dos dois lados do caixa;
     o nome que aparece vem de APP_CONFIG.lados. Ela edita em Ajustes. */
  /* pagamento sem conta escolhida: estes métodos caem no lado Brasil (a plataforma) */
  metodosBrasil: ['pix', 'card'],
  contas: [
    { id: 'plat-pix',    nome: 'Plataforma — Pix',              pais: 'brasil', metodo: 'pix' },
    { id: 'plat-cartao', nome: 'Plataforma — cartão (até 12x)', pais: 'brasil', metodo: 'card' },
    { id: 'conta-uk', nome: 'Conta no Reino Unido (transferência)', pais: 'europa', metodo: 'transfer' },
    { id: 'dinheiro',    nome: 'Dinheiro (em mãos)',             pais: 'europa', metodo: 'cash' },
  ],

  /* o resto do valor (depois do sinal) é dela, pela plataforma ou pela conta —
     não do guia/motorista em dinheiro no dia (o modelo da EmRoma) */
  restoNoDiaPadrao: false,

  /* o fornecedor de transfer (aba Transfer). Ela põe o nome e o link da
     área de cliente dele em Ajustes; vazio = só a lista pronta para mandar. */
  transfer: {
    fornecedor: { nome: 'Parceiro de transfer', url: '' },
    idioma: 'en',                 /* o pedido pronto para colar vai em inglês */
    servicoPadrao: 'transfer-aeroporto',
  },

  /* ---------- o leitor de conversa colada do WhatsApp ---------- */
  conversa: {
    cidades: [
      ['Londres', /\blondon\b|\blondres\b/], ['Windsor', /windsor/], ['Oxford', /oxford/], ['Bath', /\bbath\b/],
      ['Stonehenge', /stonehenge/], ['Cotswolds', /cotswold/], ['Cambridge', /cambridge/], ['Canterbury', /canterbury/],
      ['Edimburgo', /edinburgh|edimburgo/], ['Escócia', /scotland|esc[oó]cia|highlands|skye|loch ness/],
      ['Paris', /\bparis\b/], ['Amsterdã', /amsterd/],
    ],
    servicos: [
      ['transfer', /transfer|traslado|translado|aeroporto|airport|heathrow|gatwick|\blhr\b|\blgw\b|buscar no/],
      ['london-city-tour', /city ?tour|westminster|big ben|buckingham|tower bridge|troca da guarda/],
      ['stonehenge-bath', /stonehenge|\bbath\b/],
      ['windsor-oxford', /windsor|oxford/],
      ['cotswolds', /cotswold|stratford/],
    ],
  },

  /* ---------- "Monte a sua experiência" (o questionário do cliente) ---------- */
  roteiro: {
    onde: [
      ['londres', 'Londres', 'London', 'Londres', 'Londra'], ['inglaterra', 'Interior da Inglaterra', 'English countryside', 'Campiña inglesa', 'Campagna inglese'],
      ['escocia', 'Escócia', 'Scotland', 'Escocia', 'Scozia'], ['gales', 'País de Gales', 'Wales', 'Gales', 'Galles'],
      ['irlanda', 'Irlanda', 'Ireland', 'Irlanda', 'Irlanda'], ['paris', 'Paris', 'Paris', 'París', 'Parigi'],
      ['europa', 'Outros países da Europa', 'Elsewhere in Europe', 'Otros países de Europa', 'Altri paesi europei'],
    ],
    /* interesses = as 7 categorias do documento dela (18/10/2026) + 3 do jeito de viajar */
    gosto: [
      ['london',    'Londres clássica',            'Classic London',            'Londres clásico',         'Londra classica'],
      ['england',   'Castelos e interior inglês',  'Castles & countryside',     'Castillos y campiña',     'Castelli e campagna'],
      ['scotland',  'Escócia e Highlands',         'Scotland & the Highlands',  'Escocia y Highlands',     'Scozia e Highlands'],
      ['europe',    'Europa (Paris, Amsterdã…)',   'Europe (Paris, Amsterdam…)', 'Europa (París, Ámsterdam…)', 'Europa (Parigi, Amsterdam…)'],
      ['special',   'Futebol e Harry Potter',      'Football & Harry Potter',   'Fútbol y Harry Potter',   'Calcio e Harry Potter'],
      ['compras',   'Compras e outlets',           'Shopping & outlets',        'Compras y outlets',       'Shopping e outlet'],
      ['gastronomia','Restaurantes e teatro',      'Dining & West End shows',   'Restaurantes y teatro',   'Ristoranti e teatro'],
      ['negocios',  'Negócios e eventos',          'Business & events',         'Negocios y eventos',      'Affari ed eventi'],
      ['criancas',  'Programas com crianças',      'Kid-friendly',              'Con niños',               'Con bambini'],
    ],
    precisa: [
      ['transfer',  'Transfer (aeroporto e hotel)',        'Transfers (airport & hotel)',   'Traslados (aeropuerto y hotel)'],
      ['motorista', 'Carro com motorista',                 'Car with driver',               'Auto con chofer'],
      ['ingressos', 'Ajuda com ingressos e restaurantes',  'Help with tickets & dining',    'Ayuda con entradas y restaurantes'],
      ['hotel',     'Indicação de hotel',                  'Hotel recommendation',          'Recomendación de hotel'],
      ['visto',     'Orientação de ETA e chegada',         'ETA & arrival guidance',        'ETA y llegada'],
      ['evento',    'Evento ou reunião de negócios',       'Event or business meeting',     'Evento o reunión de negocios'],
    ],
    /* faixa de investimento do pedido de proposta (opcional para o cliente).
       Sugestão de 20/10/2026 — a Yalla confirma as faixas e a moeda. */
    faixas: [
      /* 28/10/2026: tudo em dólar (as chaves ficam, para os pedidos antigos) */
      ['ate2',   'Até £ 500',              'Up to £500',            'Hasta £500'],
      ['2a5',    'De £ 500 a 1.500',       '£500 to £1,500',         'De £500 a 1.500'],
      ['5a10',   'De £ 1.500 a 4.000',     '£1,500 to £4,000',       'De £1.500 a 4.000'],
      ['mais10', 'Acima de £ 4.000',       'Over £4,000',           'Más de £4.000'],
    ],
    modo: [
      ['guia',        'Com guia particular',                                 'With a private guide',                              'Con guía privado'],
      ['consultoria', 'Sozinho, com roteiro de especialista (consultoria)',  'On my own, with a specialist route (consulting)',   'Por mi cuenta, con ruta de especialista (consultoría)'],
      ['nao-sei',     'Ainda não sei',                                       'Not sure yet',                                      'Aún no lo sé'],
    ],
    /* o que ela ofereceria para quem gosta de cada coisa (passeio fixo) */
    sugestao: { london: 'london-city-tour', england: 'stonehenge-bath', compras: 'chauffeur', gastronomia: 'chauffeur' },
    /* lugar escolhido → passeio fixo; sem passeio → item livre para ela pôr o valor */
    ondeServico: { londres: 'london-city-tour', inglaterra: 'stonehenge-bath', escocia: 'edinburgh-highlands', paris: 'paris' },
    ondeSemTabela: { gales: 'País de Gales', irlanda: 'Irlanda', europa: 'Europa' },
    padrao: 'london-city-tour',
    /* gostos que pedem item livre (ela monta) */
    gostoLivre: { negocios: 'Agenda de negócios / eventos', europe: 'Europa (Paris, Amsterdã…)', scotland: 'Escócia sob medida' },
  },

  /* ---------- AS CATEGORIAS DA VITRINE (documento dela, 18/10/2026) ----------
     "Como você quer viver os Emirados?" — o id é o mesmo do interesse do
     "Planejar minha viagem". Com produto no ar naquela categoria, o cartão
     abre a lista dela; sem produto, abre o pedido de proposta já marcado
     (categoria vazia NUNCA vira página vazia). Fotos do material dela —
     as de 220px pedem a foto real e autorizada. */
  categorias: [
    { id: 'london', foto: 'arte/f/westminster-night.jpg',
      nome: { en: 'London, your way', pt: 'Londres do seu jeito', it: 'Londra a modo tuo' },
      desc: { en: 'Chauffeur by the hour and the city tour by Mercedes.', pt: 'Chauffeur por hora e o city tour de Mercedes.', it: 'Autista a ore e city tour in Mercedes.' } },
    { id: 'england', foto: 'arte/f/stonehenge.jpg',
      nome: { en: 'England beyond London', pt: 'A Inglaterra além de Londres', it: 'L’Inghilterra oltre Londra' },
      desc: { en: 'Windsor, Oxford, Stonehenge, Bath, the Cotswolds.', pt: 'Windsor, Oxford, Stonehenge, Bath, os Cotswolds.', it: 'Windsor, Oxford, Stonehenge, Bath, Cotswolds.' } },
    { id: 'scotland', foto: 'arte/f/glencoe.jpg',
      nome: { en: 'Scotland & the Highlands', pt: 'Escócia e Highlands', it: 'Scozia e Highlands' },
      desc: { en: 'Edinburgh, Glencoe, Loch Ness, the Isle of Skye.', pt: 'Edimburgo, Glencoe, Loch Ness, a Ilha de Skye.', it: 'Edimburgo, Glencoe, Loch Ness, l’Isola di Skye.' } },
    { id: 'europe', foto: 'arte/f/paris.jpg',
      nome: { en: 'Europe from London', pt: 'Europa a partir de Londres', it: 'Europa da Londra' },
      desc: { en: 'Paris by Eurostar, Amsterdam and beyond.', pt: 'Paris pelo Eurostar, Amsterdã e mais.', it: 'Parigi in Eurostar, Amsterdam e oltre.' } },
    { id: 'special', foto: 'arte/f/harry-potter.jpg',
      nome: { en: 'Football & Harry Potter', pt: 'Futebol e Harry Potter', it: 'Calcio e Harry Potter' },
      desc: { en: 'Stadium tours and the Warner Bros. studios.', pt: 'Tours de estádio e os estúdios da Warner.', it: 'Tour degli stadi e studi Warner Bros.' } },
    { id: 'transfers', foto: 'arte/f/mercedes-detail.jpg',
      nome: { en: 'Airport transfers', pt: 'Transfers de aeroporto', it: 'Transfer aeroportuali' },
      desc: { en: 'Heathrow, Gatwick, St Pancras — met with your name.', pt: 'Heathrow, Gatwick, St Pancras — com plaquinha com o seu nome.', it: 'Heathrow, Gatwick, St Pancras — con cartello col vostro nome.' } },
  ],
  /* modalidade e transfer de cada produto (campos do cadastro, documento dela) */
  /* a página "Conheça a Milla" (22/10/2026): a foto do Museu do Futuro que ela
     mandou e as fotos dela pelos Emirados (das pastas dos tours, são dela) */
  sobre: {
    foto: 'arte/f/mercedes.jpg',
    momentos: ['arte/f/westminster-arch.jpg', 'arte/f/edinburgh-close.jpg', 'arte/f/eilean-donan-reflex.jpg', 'arte/f/bath.jpg', 'arte/f/paris-sunset.jpg'],
  },
  /* as perguntas frequentes do documento dela (20/10/2026). As RESPOSTAS são
     dela (Ajustes → Aparência): pergunta sem resposta não aparece no site. */
  faq: [
    ['Como faço para reservar?', 'How do I book?', '¿Cómo reservo?'],
    ['Qual a diferença entre privativo e compartilhado?', 'What is the difference between private and shared?', '¿Cuál es la diferencia entre privado y compartido?'],
    ['Em que idioma é o passeio?', 'What language is the tour in?', '¿En qué idioma es el paseo?'],
    ['O transfer está incluído?', 'Is the transfer included?', '¿El traslado está incluido?'],
    ['Quais são as regras para crianças?', 'What are the rules for children?', '¿Cuáles son las reglas para niños?'],
    ['Como funcionam o pagamento e o parcelamento?', 'How do payment and instalments work?', '¿Cómo funcionan el pago y las cuotas?'],
    ['E se eu precisar cancelar?', 'What if I need to cancel?', '¿Y si necesito cancelar?'],
    ['Quando recebo a confirmação e o voucher?', 'When do I get the confirmation and the voucher?', '¿Cuándo recibo la confirmación y el voucher?'],
  ],
  modalidades: [['privativo', 'Privativo', 'Private', 'Privado'], ['compartilhado', 'Compartilhado', 'Shared', 'Compartido'], ['ingresso', 'Ingresso', 'Ticket', 'Entrada']],
  transfers: [['incluido', 'Transfer incluído', 'Transfer included', 'Traslado incluido'], ['opcional', 'Transfer opcional', 'Optional transfer', 'Traslado opcional'], ['nao', 'Sem transfer', 'No transfer', 'Sin traslado']],

  /* ---------- o Pipeline: o passo a passo de cada cliente ----------
     Pedido dela (01/10/2026): "pipeline com status do andamento com cliente…
     monitora o passo a passo do estágio". As etapas andam SOZINHAS pelo que
     acontece no app (sinal pago, ingressos/transfer/parceiros, guia, o dia). */
  pipeline: [
    ['contato',   'Contato',            'pedido chegou'],
    ['orcamento', 'Orçamento enviado',  'esperando o sinal'],
    ['confirmado','Confirmado',         'sinal pago — falta comprar ou pedir'],
    ['compras',   'Ingressos e transfer', 'tudo comprado — falta o guia'],
    ['guia',      'Guia escalado',      'pronto para o dia'],
    ['viagem',    'Viagem',             'acontecendo'],
    ['posvenda',  'Pós-venda',          'avaliação e indicação'],
    ['perdido',   'Não fechou',         ''],
  ],

  /* ---------- textos-base (ela revisa em Ajustes) ---------- */
  termos: `MODELO — revise e troque pelos seus termos em Ajustes → Termos e condições.

Todos os valores deste orçamento podem mudar sem aviso até a confirmação da reserva.

CONFIRMAÇÃO DA RESERVA
A reserva é confirmada com o pagamento do sinal indicado no orçamento. O sinal bloqueia a agenda e é abatido do total.

PAGAMENTO
Pix ou cartão pela nossa plataforma, ou transferência para a conta no Reino Unido. O restante segue as datas combinadas no orçamento.

CANCELAMENTO E ALTERAÇÕES
As regras de cancelamento e de mudança de data de cada serviço são as informadas no orçamento.

INGRESSOS, HOTÉIS E TRANSFERS
São comprados com parceiros locais conforme a disponibilidade do momento e, depois de emitidos, seguem a política de cada fornecedor.`,

  voucher: {
    pagamento: `PAGAMENTO
Os valores e as datas de pagamento estão no seu orçamento. Qualquer dúvida, fale com a gente pelo WhatsApp.`,
    suporte: `SUPORTE
Durante a sua viagem, fale com a FT pelo WhatsApp. Salve o nosso número antes de embarcar.

INFORMAÇÕES GERAIS
Leve um documento com foto em todos os passeios.`,
    trocado: `DINHEIRO
No Reino Unido quase tudo aceita cartão por aproximação, até o metrô. A tomada é de 3 pinos (tipo G): leve um adaptador. Brasileiro precisa da ETA antes de embarcar.`,
    transferAeroporto: `TRANSFER DE CHEGADA — AEROPORTO
Ao pousar, ligue o celular e confira o WhatsApp. As instruções de encontro com o motorista estão abaixo.`,
    transferPartida: `TRANSFER DA PARTIDA
Confira o horário de saída do hotel indicado abaixo e esteja pronto na recepção alguns minutos antes.`,
    transferPorto: `TRANSFER DE CHEGADA — PORTO
Ao desembarcar do navio, ligue o celular e confira o WhatsApp. As instruções de encontro estão abaixo.`,
    transferTrem: '',
    passeios: `PASSEIOS
Chegue alguns minutos antes no ponto de encontro. Leve um casaco leve e guarda-chuva: o tempo em Londres muda rápido.`,
    fechamento: `Boa viagem!
Que a sua viagem seja inesquecível. Estamos à disposição para o que precisar.

Roberto
FT · CONCIERGE & EXPERIENCES
@freddyturismolondon`,
  },
  /* para escolher o bloco de transfer do voucher */
  voucherRe: {
    aero: /\b(lhr|lgw|stn|ltn|lcy)\b|heathrow|gatwick|stansted|luton|aeroport|airport/i,
    porto: /\bporto\b|port rashid|cruise|navio|cruzeiro/i,
    trem: /eurostar|st pancras|king'?s cross|paddington|euston|\btrem\b|\btrain\b/i,
  },
  dicas: {
    transfer: 'Ao pousar, ligue o celular e confira o WhatsApp: as instruções de encontro com o motorista chegam por lá.',
    walk: 'Use sapato confortável e leve água. Chegue 10 minutos antes no ponto de encontro.',
    day: 'Esteja pronto na recepção do hotel no horário combinado. Leve documento, água e protetor solar.',
  },
  /* passeio que pede cuidado especial (a regra é de quem recebe, não dela) */
  dicasEspeciais: [
    [/mesquita|mosque|sheikh zayed/i, 'Mesquita: roupa que cubra braços e pernas; para mulheres, também o cabelo. '],
  ],

  /* ---------- a aba "Tabela de preços" (as planilhas dela) ----------
     Exemplos marcados: ela troca pelos valores reais (ou apaga a linha).
     cartao: acréscimo do cartão (0,10 = 10%; 0 = sem coluna de cartão).
     noturnoVeic: adicional noturno por veículo (0 = sem coluna noturna). */
  precos: {
    regras: { cartao: 0, noturnoVeic: 0 },
    tabelas: [
      { id: 'transfer', nome: 'Transfer', tipo: 'transfer' },
      { id: 'guia', nome: 'Guias', tipo: 'guia' },
      { id: 'motorista', nome: 'Passeios com motorista', tipo: 'bv' },
    ],
    seed: {
      transfer: [{ titulo: 'Aeroporto de Heathrow ↔ hotel em Londres (exemplo)', linhas: [
        { pax: '1 a 3 pessoas', paxN: 3, veic: '3 malas grandes e 3 de mão (Classe E)', veicN: 1, preco: 85, custo: 55 },
        
        { pax: '4 a 7 pessoas', paxN: 7, veic: '7 malas grandes e 7 de mão (V-Class)', veicN: 1, preco: 110, custo: 70 },
      ] }],
      guia: [{ titulo: 'City tour de Londres (exemplo)', linhas: [
        { pax: '1 ou 2 pessoas', paxN: 2, dur: '5 horas', preco: 600, custo: 400, ingressos: 0 },
        { pax: '3 ou 4 pessoas', paxN: 4, dur: '5 horas', preco: 800, custo: 500, ingressos: 0 },
      ] }],
      bv: [{ titulo: 'Stonehenge e Bath com motorista — 10 horas (exemplo)', linhas: [
        { pax: 'Até 3 pessoas', paxN: 3, preco: 650, custo: 380 },
        { pax: 'Até 7 pessoas', paxN: 7, preco: 780, custo: 470 },
      ] }],
    },
  },

  /* ---------- a demonstração (só sem nuvem e com exemplos ligados) ---------- */
  demo: {
    /* pela presença destes nomes o app sabe que os dados ainda são de exemplo */
    marcadores: { equipe: 'op-m1', clientes: ['Mariana Costa', 'Família Rocha'] },
    equipe: [
      ['g1', 'James Whitmore', 'guia', '+44 7700 900111', ['Londres', 'Inglaterra'], 'inglês'],
      ['g2', 'Carolina Reis', 'guia', '+44 7700 900222', ['Londres'], 'português, inglês, espanhol'],
      ['g3', 'Rafael Antunes', 'guia', '+44 7700 900333', ['Londres', 'Escócia'], 'português, inglês'],
      ['g4', 'Beatriz Lopes', 'guia', '+971 50 777 8899', ['Abu Dhabi'], 'português'],
      ['m1', 'João (motorista)', 'motorista', '+44 7700 900444', ['Londres'], 'português, inglês'],
      ['m2', 'Marco (motorista)', 'motorista', '+44 7700 900555', ['Londres', 'Inglaterra'], 'italiano, inglês'],
    ],
    /* o dia de hoje e os próximos, como numa semana normal dela */
    reservas: [
      { quem: ['Mariana Costa', 'mari.costa@email.com', '+55 11 99876 5501'], tourId: 'transfer-aeroporto', d: 0, time: '14:40', pax: 3,
        voo: 'BA 246 (GRU→LHR)', origem: 'Heathrow Terminal 5, desembarque', destino: 'Hotel em Mayfair', pres: 'op-m1', sinalPago: 'plat-pix',
        group: [{ nome: 'Pedro Costa', nasc: '1980-04-12' }, { nome: 'Lia Costa', nasc: '2014-09-03' }] },
      { quem: ['Ricardo Farias', 'ricardo.farias@email.com', '+55 21 98765 4402'], tourId: 'london-city-tour', d: 0, time: '09:00', pax: 2,
        pres: 'op-g2', sinalPago: 'plat-cartao', obsOp: 'Casal, primeira vez em Londres. Ela é vegetariana.',
        group: [{ nome: 'Helena Farias', nasc: '' }] },
      { quem: ['Família Rocha', 'familia.rocha@email.com', '+55 31 99654 3303'], tourId: 'stonehenge-bath', d: 1, time: '15:00', pax: 4,
        sinalPago: 'plat-pix', obsOp: 'Duas crianças (8 e 11 anos).' },
      { quem: ['Mariana Costa', 'mari.costa@email.com', '+55 11 99876 5501'], tourId: 'windsor-oxford', d: 2, time: '08:00', pax: 3,
        sinalPago: 'plat-pix', pres: 'op-g3' },
      { quem: ['Grupo Inova (empresa)', 'viagens@inova.example.com', '+55 11 3333 4405'], tourId: 'cotswolds', d: 3, time: '17:00', pax: 8,
        pagoTudo: 'conta-uk', restoPara: 'ingrid', obsOp: 'Empresa: já pagou tudo. A FT acerta com o parceiro.' },
    ],
    /* respostas das guias para amanhã de manhã */
    disp: [['op-g1', 'ocupada', 'já tem grupo'], ['op-g3', 'livre', 'até 13h'], ['op-g4', 'livre', '']],
    /* um pedido que chegou de madrugada pelo WhatsApp, esperando por ela */
    conversa: (hoje, addDays) => {
      const d = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
      const c = `${hoje.slice(8, 10)}/${hoje.slice(5, 7)}/${hoje.slice(2, 4)}`;
      return `[${c} 03:12] Fernanda Lima: Oi Roberto! Tudo bem? Vi seu perfil no Instagram 😊
[${c} 03:13] Fernanda Lima: Somos 4 pessoas (2 adultos e 2 crianças), chegamos em Londres dia ${d(addDays(hoje, 20))} e ficamos até ${d(addDays(hoje, 26))}
[${c} 03:14] Fernanda Lima: Queremos transfer de chegada, ir a Stonehenge e Bath e conhecer Windsor
[${c} 03:15] Fernanda Lima: Meu WhatsApp é +55 48 99612 7788`;
    },
    pontos: [
      ['hotel', 'No seu hotel', '', 'O motorista busca na recepção do hotel no horário combinado.'],
      ['dxb', 'Heathrow — Terminal 5, desembarque', 'Heathrow Airport, Terminal 5', 'Depois de pegar as malas, na saída do desembarque, com a plaquinha.'],
      ['marina', 'St Pancras International — saída do Eurostar', 'St Pancras International', 'O ponto exato vai junto do voucher.'],
    ],
    ligacoes: [
      ['transfer-aeroporto', ['dxb', 'hotel'], 'dxb'],
      ['stonehenge-bath', ['hotel'], 'hotel'], ['london-city-tour', ['hotel'], 'hotel'], ['windsor-oxford', ['hotel'], 'hotel'],
      ['cotswolds', ['marina'], 'marina'],
    ],
    interesse: { ids: ['stonehenge-bath', 'london-city-tour', 'windsor-oxford', 'cotswolds', 'transfer-aeroporto', 'privativas', 'imersoes'],
                 peso: [4, 3, 3, 2, 3, 2, 1] },
    parceiros: [
      { nome: 'Agência Horizonte (exemplo)', tipo: 'agencia', contato: '@agenciahorizonte', cupom: 'HORIZONTE', desconto: 0, comissao: 10, obs: 'Agência parceira no Brasil',
        cliente: 'Grupo Inova (empresa)', veioPor: 'agencia' },
      { nome: 'Carol pelo Mundo (exemplo)', tipo: 'influencer', contato: '@carolpelomundo', cupom: 'CAROL10', desconto: 10, comissao: 8,
        cliente: 'Família Rocha', veioPor: 'influencer' },
    ],
    /* os parceiros-fornecedores (aba Parceiros) — exemplos */
    fornecedores: [
      { chave: 'transfer', nome: 'Executive Cars London (exemplo)', tipo: 'transfer', whats: '+44 7700 900666', comissao: 0, obs: 'Sedan, minivan e van. Pedir até 18h do dia anterior.' },
      { chave: 'ingressos', nome: 'Ingressos Londres (exemplo)', tipo: 'ingressos', whats: '+44 7700 900777', comissao: 5, obs: 'Castelos, estúdios Harry Potter, estádios, West End.' },
      { chave: 'hotel', nome: 'Hotel parceiro Downtown (exemplo)', tipo: 'hotel', email: 'reservas@hotel.example.com', comissao: 10 },
      { chave: 'barco', nome: 'Marina Yachts (exemplo)', tipo: 'passeio', whats: '+971 52 300 2000', comissao: 0 },
    ],
    pedidosFor: [
      { cliente: 'Mariana Costa', tourId: 'windsor-oxford', fornecedor: 'ingressos', tipo: 'ingressos', desc: 'Louvre Abu Dhabi tickets — 3 guests', custo: 189, status: 'apedir' },
      { cliente: 'Grupo Inova (empresa)', tourId: 'cotswolds', fornecedor: 'barco', tipo: 'passeio', desc: 'Yacht 2h — 8 guests', custo: 900, status: 'confirmado' },
      { cliente: 'Família Rocha', tourId: 'stonehenge-bath', fornecedor: 'hotel', tipo: 'hotel', desc: '2 nights, family room', custo: 0, status: 'pedido' },
    ],
    indicacoes: { quem: 'Patrícia Menezes', indicou: ['Ricardo Farias', 'Mariana Costa'], pais: 'Brasil (São Paulo)' },
    tarefas: (hoje, ctx) => [
      { texto: 'Confirmar com o João o transfer da Mariana (voo BA 246)', prazo: hoje, hora: '10:00', cliente: 'Mariana Costa', pessoaId: 'op-m1' },
      { texto: 'Comprar os ingressos de Abu Dhabi para a Mariana (3 pessoas)', prazo: hoje, cliente: 'Mariana Costa' },
      { texto: 'Responder a Patrícia sobre o Réveillon em Londres', prazo: ctx.addDays(hoje, -1), cliente: 'Patrícia Menezes', clienteKey: 'patricia.menezes@email.com' },
      { texto: 'Pagar o parceiro do barco (Grupo Inova)', prazo: ctx.addDays(hoje, 4), hora: '18:00', cliente: 'Grupo Inova (empresa)' },
      { texto: 'Montar a tabela de preços do safári com o parceiro', detalhe: 'Por número de pessoas, como os outros passeios fixos.' },
      { texto: 'Mandar o extrato do mês para o contador', repete: 'mensal', prazoTexto: 'todo dia 01' },
      { texto: 'Renovar a licença de guia', prazo: ctx.addDays(hoje, -2), feita: true },
      { tipo: 'nota', texto: 'O João prefere receber a lista de transfers até as 18h do dia anterior.', fixa: true },
      { tipo: 'nota', texto: 'Ideia: pacote "Escócia em 5 dias" para famílias — Edimburgo, Highlands e Loch Ness.' },
    ],
  },
};
