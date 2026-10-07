/* Identidade deste app: o UNICO lugar que sabe qual banco usar e de quem
   e o app. cloud.js, auth.js, store.js e app.js leem daqui e nao trazem
   nenhum endereco, nome ou marca fixos.

   Vazio em supabaseUrl = o app roda so no aparelho, sem nuvem: e o
   PROTOTIPO que a Carol ve antes de fechar (28/09/2026).

   Lovely London by Carol — Carolina Carvalho, guia Blue Badge em Londres.
   Dados tirados do site dela (lovelylondon.uk), do perfil oficial
   (guidelondon.org.uk/guides/carolinacarvalho) e da reuniao de 28/09/2026. */
var APP_CONFIG = {
  /* 06/10/2026: o app mora no banco da Ti Artes, numa sala so dele (schema "carol").
     A chave e a publicavel: quem protege os dados e a regra de acesso (RLS) da sala. */
  supabaseUrl: 'https://uopfqlogjzuqpabptxkb.supabase.co',
  supabaseKey: 'sb_publishable_VKIdd2RNpMf3e4IEDprxJw_TOKPIHT2',
  sala: 'carol',     /* schema do banco; vazio = public (projeto proprio) */

  /* Cofre (chave da IA no servidor): vazio ate existir o Supabase DELA */
  /* 06/10/2026: a IA dos clientes roda na conta da Ti Artes (decisao do
     Eugenio): o assistente usa o cofre do estudio, com a chave dele. O cliente
     nao cria conta na Anthropic nem ve tela de credito — ve "IA incluida". */
  cofre: 'https://uopfqlogjzuqpabptxkb.supabase.co/functions/v1/cofre',
  clienteCofre: 'carol',
  iaIncluida: true,
  agenteInstagram: 'lovelylondon_bycarol',
  /* Reuniao 28/09: assistente do painel = PRESENTE; atendimento no WhatsApp e
     no Instagram = camada extra (entra na proposta). Marketing: DESCARTADO por
     agora — ela tem contrato de 3 meses com uma agencia. */
  modulos: { assistente: true, atendimento: true, marketing: false, whatsapp: true },

  /* conversas de exemplo do Atendimento (demonstracao): clientes brasileiros,
     pelo WhatsApp e pelo Instagram, sobre os tours DELA */
  conversasDemo: [
    { id: 'c1', nome: 'Mariana', lang: 'pt', canal: 'whats', tipo: 'preco', tour: 'londres-classica', pessoas: 4, msg: 'Oi Carol! Quanto fica o tour Londres Clássica para 4 pessoas?' },
    { id: 'c2', nome: 'Rafael', lang: 'pt', canal: 'insta', tipo: 'semana', tour: 'alem-de-londres', pessoas: 2, msg: 'Olá! Vocês fazem bate-volta para Windsor na semana que vem? Somos um casal.' },
    { id: 'c3', nome: 'Camila', lang: 'pt', canal: 'whats', tipo: 'crianca', tour: 'magical-london-kids', msg: 'Oi! O tour para crianças serve para uma de 6 e outro de 10 anos?' },
    { id: 'c4', nome: 'Paulo', lang: 'pt', canal: 'whats', tipo: 'pagar', msg: 'Dá pra pagar por Pix? Não tenho cartão internacional.' },
    { id: 'c5', nome: 'Beatriz', lang: 'pt', canal: 'insta', tipo: 'disp', tour: 'torre-de-londres', pessoas: 3, msg: 'Oi Carol! Tem data no sábado pra Torre de Londres? Somos 3.' },
  ],

  emailClientes: true,
  vapidPublica: '',
  agenteWhatsapp: '',

  guia: {
    nome: 'Carol',
    nomeCompleto: 'Carolina Carvalho',
    negocio: 'Lovely London by Carol',
    cidade: 'Londres, Reino Unido',
    whats: '+447950400919',
    email: 'hello@lovelylondon.uk',
    insta: 'lovelylondon_bycarol',
    /* MOEDA: tudo em libra. O Pix converte libra -> real pela cotacao do dia. */
    moeda: 'GBP',
    fuso: 'Europe/London',
    /* reserva: 30% de sinal NAO reembolsavel, o resto no dia (reuniao 28/09) */
    sinalPct: 30,
    saldoNoDia: true,
    tolerancia: 30,          /* minutos de espera (Termos §9) */
    horaExtra: 70,           /* £ por hora adicional (Termos §6) */
    /* um cliente por dia (reuniao 28/09: "geralmente eu so atendo um cliente
       por dia"). Reserva em QUALQUER tour fecha o dia inteiro. No alto verao
       ela abre um segundo grupo desligando isto em Ajustes. */
    diaExclusivo: true,
    site: 'https://lovelylondon.uk',
    blog: 'https://lovelylondon.uk/pages/blog.php',
    blueBadge: 'https://www.guidelondon.org.uk/guides/carolinacarvalho/',
    youtube: 'https://www.youtube.com/@LovelyLondonbyCarol',
    tiktok: 'https://www.tiktok.com/@lovelylondon_bycarol',
    facebook: '',
    spotify: '',
    /* PARA A SUA VIAGEM: link de parceira e DELA. O GetYourGuide ja tem o
       codigo dela no site (partner_id MJKDHZZ). Sem link, o cartao abre o
       WhatsApp dela com o pedido. Ela edita em Ajustes. */
    parceiros: [
      { tipo: 'hotel', titulo: 'Reserve seu hotel', sub: 'Onde ficar em Londres, por bairro', url: '', selo: '' },
      { tipo: 'chip', titulo: 'Chip de viagem (eSIM)', sub: 'Chegue em Londres já conectado', url: '', selo: '' },
      { tipo: 'seguro', titulo: 'Seguro viagem', sub: 'Recomendado nos Termos da Carol', url: '', selo: '' },
    ],
    /* Depoimentos: os 3 do site sao de modelo (falam de "tour gastronomico" que
       nao existe). Ficam VAZIOS ate ela mandar os reais — o app coleta os novos
       pelo QR de avaliacao no fim do tour. */
    depoimentos: [],
    depoimentosVideo: '',
    depoimentosVideoTxt: '',
    badge: 'Guia oficial Blue Badge · Londres',
    prefixo: 'LL',                 /* codigo da reserva: LL-4821 */
    idiomas: 'Português · English',
    /* Dois turnos: 4h de manha ou de tarde. Pacote de 6h ou 8h so de manha
       (ocupa o dia). Reuniao 28/09: "pacote de 4 horas e o de 8 horas… eu
       preciso fazer o pacote de 6 horas tambem". */
    turnos: [
      { hora: '09:30', fim: '13:30', nome: 'Manhã' },
      { hora: '14:00', fim: '18:00', nome: 'Tarde' },
    ],
    turnoExclusivo: true,
    linguas: ['pt'],
    /* a marca: arquivos do site dela (lovelylondon.uk/assets/images/art) */
    marca: {
      logoClaro: 'arte/logo-claro.png',   logoClaroRazao: 1.386,   /* bordô + "by Carol" dourado — fundo claro */
      logoEscuro: 'arte/logo-escuro.png', logoEscuroRazao: 2.25,   /* off-white + dourado — fundo bordô/escuro */
      monograma: 'arte/monograma.png',    monogramaRazao: 0.571,   /* LL do favicon, vira mascara (pinta com o token) */
    },
    regioes: [
      ['londres',   'Londres',          'London'],
      ['city',      'City of London',   'City of London'],
      ['westminster','Westminster',     'Westminster'],
      ['fora',      'Além de Londres',  'Beyond London'],
      ['online',    'Online',           'Online'],
    ],
    tipos: {
      walk:    { pt: 'A pé',         en: 'Walking tour' },
      museum:  { pt: 'Por dentro',   en: 'Inside visit' },
      day:     { pt: 'Bate-volta',   en: 'Day trip' },
      exclusivo: { pt: 'Exclusivo',  en: 'Signature' },
      consult: { pt: 'Consultoria',  en: 'Consulting' },
    },
  },
};
