/* Identidade deste app: o UNICO lugar que sabe qual banco usar e de quem
   e o app. cloud.js, auth.js, store.js e app.js leem daqui e nao trazem
   nenhum endereco, nome ou marca fixos.

   PROTOTIPO DO CLIENTE (14/10/2026) — Freddy Turismo London, do Roberto
   Rivelino. Fechado em 14/10: pacote Premium (tudo do protótipo) MENOS
   Atendimento automatico e Marketing (aparecem com cadeado), MAIS a aba nova
   Comunicacao (comunicacao.js). Dados publicos do site e do Instagram dele
   (@freddyturismolondon). Precos dos tours: EXEMPLO — ele confirma.

   Vazio em supabaseUrl = o app roda so no aparelho, sem nuvem: e o modo
   prototipo. Na entrega: projeto Supabase dele (ou sala "freddy" no banco da
   Ti Artes), SEGURANCA.sql, chave publicavel aqui. */
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
  /* o que ele contratou (14/10/2026): tudo menos Atendimento e Marketing.
     false = a aba aparece com cadeado e explica o que faria. */
  modulos: { assistente: true, atendimento: false, marketing: false, whatsapp: false, comunicacao: true },

  /* conversas de exemplo do Atendimento (com cadeado: nao contratado) */
  conversasDemo: [
    { id: 'c1', nome: 'Mariana', lang: 'pt', canal: 'whats', tipo: 'preco', tour: 'city-tour', pessoas: 4, msg: 'Oi Roberto! Quanto fica o City Tour para 4 pessoas?' },
    { id: 'c2', nome: 'Rafael', lang: 'pt', canal: 'insta', tipo: 'semana', tour: 'windsor-stonehenge', pessoas: 2, msg: 'Olá! Vocês fazem Windsor e Stonehenge na semana que vem? Somos um casal.' },
    { id: 'c3', nome: 'Camila', lang: 'pt', canal: 'whats', tipo: 'crianca', tour: 'harry-potter', msg: 'Oi! Dá pra levar cadeirinha de criança no carro para os estúdios Harry Potter?' },
    { id: 'c4', nome: 'Paulo', lang: 'pt', canal: 'whats', tipo: 'pagar', msg: 'Dá pra pagar por Pix? Não tenho cartão internacional.' },
    { id: 'c5', nome: 'Letícia', lang: 'pt', canal: 'insta', tipo: 'disp', tour: 'oxford', pessoas: 3, msg: 'Oi Roberto! Tem data no sábado pra Oxford? Somos 3.' },
  ],


  emailClientes: false,
  vapidPublica: '',

  guia: {
    nome: 'Roberto',
    nomeCompleto: 'Roberto Rivelino',
    negocio: 'Freddy Turismo',
    cidade: 'Londres, Reino Unido',
    whats: '+447413581875',
    email: 'contato@freddyturismo.com',
    insta: 'freddyturismolondon',
    /* MOEDA: tudo em libra. O Pix converte libra -> real pela cotacao do dia. */
    moeda: 'GBP',
    fuso: 'Europe/London',
    /* reserva: 30% de sinal para travar a data, o resto no dia */
    sinalPct: 30,
    saldoNoDia: true,
    tolerancia: 30,          /* minutos de espera no ponto de encontro / desembarque */
    horaExtra: 0,            /* 0 = hora adicional sob consulta (nao aparece) */
    /* um carro e um motorista-guia por servico: a reserva fecha o dia.
       Ele desliga em Ajustes quando tiver mais carros/motoristas. */
    diaExclusivo: false,
    site: 'https://freddyturismo.com',
    blog: '',
    blueBadge: '',
    youtube: '',
    tiktok: '',
    facebook: 'https://www.facebook.com/FreddyTransportes',
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
    badge: 'Brasileiro em Londres desde 2008 · Mercedes executivos',
    prefixo: 'FT',                 /* codigo da reserva: FT-4821 */
    idiomas: 'Português · English · Italiano · Español',
    /* Dois turnos: 4h de manha ou de tarde. Pacote de 6h ou 8h so de manha
       (ocupa o dia). */
    turnos: [
      { hora: '08:00', fim: '16:00', nome: 'Dia inteiro' },
      { hora: '09:00', fim: '13:00', nome: 'Manhã' },
      { hora: '14:00', fim: '18:00', nome: 'Tarde' },
    ],
    turnoExclusivo: false,
    linguas: ['pt', 'en'],
    /* marca da Freddy Turismo (verde-turquesa), desenhada pela Ti Artes em arte/ (14/10/2026) */
    marca: {
      logoClaro: 'arte/logo-claro.png',   logoClaroRazao: 4.03,    /* verde-turquesa — fundo claro */
      logoEscuro: 'arte/logo-escuro.png', logoEscuroRazao: 4.03,   /* branco + agua — fundo escuro */
      monograma: 'arte/monograma.png',    monogramaRazao: 1,       /* "F" no anel; vira mascara (pinta com o token) */
    },
    regioes: [
      ['londres',   'Londres',              'London'],
      ['fora',      'Bate-volta',           'Day trips'],
      ['longe',     'Viagens mais longas',  'Longer trips'],
      ['especial',  'Especiais',            'Specials'],
    ],
    tipos: {
      city:    { pt: 'De carro pela cidade', en: 'City by car' },
      day:     { pt: 'Bate-volta',   en: 'Day trip' },
      exclusivo: { pt: 'Especial',   en: 'Special' },
      consult: { pt: 'Consultoria',  en: 'Consulting' },
    },
  },
};
