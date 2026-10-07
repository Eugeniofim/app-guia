/* Identidade deste app: o UNICO lugar que sabe qual banco usar e de quem
   e o app. cloud.js, auth.js, store.js e app.js leem daqui e nao trazem
   nenhum endereco, nome ou marca fixos.

   DEMO PUBLICO DE VENDA (07/10/2026) — "Londres com a Bia".
   A guia e FICTICIA: Beatriz Moreira nao existe. Telefone na faixa que a
   Ofcom reserva para ficcao (+44 7700 900xxx), e-mail em exemplo.com,
   Instagram que nao existe. Tudo aqui e exemplo para o Studio Ti Artes
   mostrar o produto a guias brasileiros.

   Vazio em supabaseUrl = o app roda so no aparelho, sem nuvem: e assim que o
   demo funciona (painel aberto, nada sai do aparelho de quem olha). */
var APP_CONFIG = {
  supabaseUrl: '',   /* demo: sem banco. Num app de cliente: 'https://SEU-PROJETO.supabase.co' */
  supabaseKey: '',   /* a chave "publishable" do projeto; nunca a secreta */
  sala: '',          /* schema do banco; vazio = public / sem banco */

  /* Cofre do demo (repositorio guia-cofre): guarda as chaves da IA no
     servidor e deixa o demo publico usar a IA de verdade, com limite por
     pessoa e por dia. E o mesmo cofre da demonstracao da raiz
     (guia.eugeniofim.com). */
  cofre: 'https://uopfqlogjzuqpabptxkb.supabase.co/functions/v1/cofre',
  clienteCofre: 'demo',
  iaIncluida: true,
  /* conta de Instagram onde o agente do demo responde de verdade (pelo cofre) */
  agenteInstagram: 'estudio_ti_artes',
  /* numero do WhatsApp do agente do demo (so digitos). Vazio = botao escondido. */
  agenteWhatsapp: '',
  /* no demo, todos os modulos aparecem: e a vitrine do produto inteiro */
  modulos: { assistente: true, atendimento: true, marketing: true, whatsapp: true },

  /* conversas de exemplo do Atendimento (demonstracao): brasileiros
     perguntando pelo WhatsApp e pelo Instagram sobre os tours da Bia */
  conversasDemo: [
    { id: 'c1', nome: 'Mariana', lang: 'pt', canal: 'whats', tipo: 'preco', tour: 'londres-classica', pessoas: 4, msg: 'Oi Bia! Quanto fica o tour Londres Clássica para 4 pessoas?' },
    { id: 'c2', nome: 'Rafael', lang: 'pt', canal: 'insta', tipo: 'semana', tour: 'windsor-oxford', pessoas: 2, msg: 'Olá! Vocês fazem o bate-volta para Windsor e Oxford na semana que vem? Somos um casal.' },
    { id: 'c3', nome: 'Camila', lang: 'pt', canal: 'whats', tipo: 'crianca', tour: 'londres-criancas', msg: 'Oi! O tour para crianças serve para uma de 6 e outro de 10 anos?' },
    { id: 'c4', nome: 'Paulo', lang: 'pt', canal: 'whats', tipo: 'pagar', msg: 'Dá pra pagar por Pix? Não tenho cartão internacional.' },
    { id: 'c5', nome: 'Letícia', lang: 'pt', canal: 'insta', tipo: 'disp', tour: 'city-tower-bridge', pessoas: 3, msg: 'Oi Bia! Tem data no sábado pro tour da City e Tower Bridge? Somos 3.' },
  ],

  emailClientes: false,
  vapidPublica: '',

  guia: {
    nome: 'Bia',
    nomeCompleto: 'Beatriz Moreira',
    negocio: 'Londres com a Bia',
    cidade: 'Londres, Reino Unido',
    whats: '+447700900123',
    email: 'bia@exemplo.com',
    insta: 'londrescomabia',
    /* MOEDA: tudo em libra. O Pix converte libra -> real pela cotacao do dia. */
    moeda: 'GBP',
    fuso: 'Europe/London',
    /* reserva: 30% de sinal para travar a data, o resto no dia */
    sinalPct: 30,
    saldoNoDia: true,
    tolerancia: 20,          /* minutos de espera no ponto de encontro */
    horaExtra: 0,            /* 0 = hora adicional sob consulta (nao aparece) */
    /* um grupo por dia: reserva em QUALQUER tour fecha o dia inteiro.
       A guia desliga isto em Ajustes se quiser dois grupos. */
    diaExclusivo: true,
    site: '',
    blog: '',
    blueBadge: '',
    youtube: '',
    tiktok: '',
    facebook: '',
    spotify: '',
    /* PARA A SUA VIAGEM: no demo, sem link de parceira. O cartao abre o
       WhatsApp da guia com o pedido. Ela cola os links dela em Ajustes. */
    parceiros: [
      { tipo: 'hotel', titulo: 'Reserve seu hotel', sub: 'Onde ficar em Londres, por bairro', url: '', selo: '' },
      { tipo: 'chip', titulo: 'Chip de viagem (eSIM)', sub: 'Chegue em Londres já conectado', url: '', selo: '' },
      { tipo: 'seguro', titulo: 'Seguro viagem', sub: 'Obrigatório na mala de quem viaja', url: '', selo: '' },
    ],
    depoimentos: [],
    depoimentosVideo: '',
    depoimentosVideoTxt: '',
    badge: 'Guia brasileira em Londres',
    prefixo: 'LB',                 /* codigo da reserva: LB-4821 */
    idiomas: 'Português · English',
    /* Dois turnos: 4h de manha ou de tarde. Pacote de 6h ou 8h so de manha
       (ocupa o dia). */
    turnos: [
      { hora: '09:30', fim: '13:30', nome: 'Manhã' },
      { hora: '14:00', fim: '18:00', nome: 'Tarde' },
    ],
    turnoExclusivo: true,
    linguas: ['pt'],
    /* a marca NEUTRA do produto (verde + amarelo), gerada em arte/ */
    marca: {
      logoClaro: 'arte/logo-claro.png',   logoClaroRazao: 6.70,    /* verde — fundo claro */
      logoEscuro: 'arte/logo-escuro.png', logoEscuroRazao: 6.70,   /* marfim + amarelo — fundo verde/escuro */
      monograma: 'arte/monograma.png',    monogramaRazao: 1,       /* "B" no anel; vira mascara (pinta com o token) */
    },
    regioes: [
      ['londres',   'Londres',          'London'],
      ['city',      'City of London',   'City of London'],
      ['westminster','Westminster',     'Westminster'],
      ['bairros',   'Bairros',          'Neighbourhoods'],
      ['fora',      'Além de Londres',  'Beyond London'],
      ['online',    'Online',           'Online'],
    ],
    tipos: {
      walk:    { pt: 'A pé',         en: 'Walking tour' },
      museum:  { pt: 'Por dentro',   en: 'Inside visit' },
      day:     { pt: 'Bate-volta',   en: 'Day trip' },
      exclusivo: { pt: 'Especial',   en: 'Signature' },
      consult: { pt: 'Consultoria',  en: 'Consulting' },
    },
  },
};
