/* Identidade deste app: o UNICO lugar que sabe qual banco usar e de quem
   e o app. cloud.js, auth.js, store.js e app.js leem daqui e nao trazem
   nenhum endereco, nome ou marca fixos.

   PROTOTIPO DO CLIENTE (16/10/2026) — Ailton Guia Viena (Aílton Fonseca).
   Base: o demo "Ailton Guia Viena" (app-guia/londres, v0.2.0).
   Dados publicos do site dele (ailtonguiaviena.at): os 3 passeios com o
   preco do site, os destinos fora de Viena (sob consulta), a bio, as
   fotos e os contatos. Nada inventado: o que nao esta no site fica "sob
   consulta" ou para ele confirmar (ver LEIA-ME.md).

   Pedidos do Eugenio (16/10/2026): letras maiores (ele nao enxerga bem),
   vitrine maior no laptop, marca bem visivel; fora do painel Pontos
   turisticos, Atendimento, Marketing, Cupons e brindes e Roteiros; o
   Extrato vira Contabilidade no padrao europeu (Austria).

   Vazio em supabaseUrl = o app roda so no aparelho, sem nuvem: e o modo
   prototipo. */
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
  /* fora do painel a pedido (16/10/2026): Atendimento e Marketing (ailton.js tira as abas) */
  modulos: { assistente: true, atendimento: false, marketing: false, whatsapp: false },

  /* conversas de exemplo do Atendimento (a aba saiu do painel; fica para o assistente) */
  conversasDemo: [
    { id: 'c1', nome: 'Mariana', lang: 'pt', canal: 'whats', tipo: 'preco', tour: 'city-tour-classico', pessoas: 4, msg: 'Olá Aílton! Quanto fica o City Tour Clássico para 4 pessoas?' },
    { id: 'c2', nome: 'Rafael', lang: 'pt', canal: 'insta', tipo: 'semana', tour: 'top-tour-viena', pessoas: 2, msg: 'Olá! Vocês têm data para o Top Tour Viena na semana que vem? Somos um casal.' },
    { id: 'c3', nome: 'Letícia', lang: 'pt', canal: 'whats', tipo: 'disp', tour: 'city-tour-classico-plus', pessoas: 3, msg: 'Oi Aílton! Tem data no sábado pro Clássico Plus? Somos 3.' },
  ],

  emailClientes: false,
  vapidPublica: '',

  guia: {
    nome: 'Aílton',
    nomeCompleto: 'Aílton Fonseca',
    negocio: 'Ailton Guia Viena',
    cidade: 'Viena, Áustria',
    whats: '+436642108916',
    email: '',
    insta: 'ailton_cesar_fonseca',
    /* MOEDA: tudo em euro. O Pix converte euro -> real pela cotacao do dia. */
    moeda: 'EUR',
    fuso: 'Europe/Vienna',
    /* reserva: 30% de sinal para travar a data, o resto no dia */
    sinalPct: 30,
    saldoNoDia: true,
    tolerancia: 20,          /* minutos de espera no ponto de encontro (ele confirma) */
    horaExtra: 0,            /* 0 = hora adicional sob consulta (nao aparece) */
    /* passeio de 2h ou 3h nao fecha o dia: um grupo por turno (manha / tarde).
       O Top Tour (6h30) ocupa o dia. Ele muda em Ajustes. */
    diaExclusivo: false,
    site: 'https://ailtonguiaviena.at',
    blog: 'https://ailtonguiaviena.at/blog',
    blueBadge: '',
    youtube: '',
    tiktok: '',
    facebook: 'https://www.facebook.com/ailton.guia.viena',
    spotify: '',
    /* PARA A SUA VIAGEM: no demo, sem link de parceira. O cartao abre o
       WhatsApp da guia com o pedido. Ela cola os links dela em Ajustes. */
    parceiros: [],
    /* DEPOIMENTOS REAIS: recomendações deixadas no Facebook, publicadas no
       site dele (seção "O que dizem nossos clientes", prints). Transcritas
       como estão; nome com a inicial do sobrenome. Ele edita em Ajustes. */
    depoimentos: [
      { nome: 'Luis Fernando P.', quando: 'jul/2023', texto: 'Gostaria de elogiar o Guia Ailton pelo excelente tour guiado em Viena. Sua paixão, conhecimento e habilidade de comunicação fizeram toda a diferença. Senti-me totalmente envolvido e encantado com a experiência.' },
      { nome: 'Raquel', quando: 'jul/2023', texto: 'O Ailton é um guia maravilhoso, conhece muito a história de Viena. A experiência de viagem é outra com a conciergeria dele. Sem falar que além de gentil, educado e excelente guia, ele tira as melhores fotos.' },
      { nome: 'Tânia U.', quando: 'jul/2023', texto: 'O melhor guia que podes ter em Viena. Educado, prestativo e muito competente.' },
      { nome: 'Dagoberto B.', quando: 'mai/2022', texto: 'Utilizei os serviços valorosos do Ailton para uma família de 5 pessoas que estiveram em Viena por alguns dias agora em Maio 2022. Recebi os maiores elogios pelo trabalho dele, profundo conhecedor da Áustria, sua história e seus tesouros. Parabéns! Recomendo!' },
      { nome: 'Adecira', quando: 'ago/2022', texto: 'O Ailton é um guia MARAVILHOSO!!! RECOMENDAMOS!!! Super educado, atencioso, explica detalhadamente a história e a arquitetura dos locais e ainda tem um super astral!!' },
      { nome: 'Claudia B.', quando: 'jun/2019', texto: 'Fizemos o tour de 8 horas com o Ailton. Muito completo e instrutivo. O guia possui grande conhecimento da história da Áustria, muita disposição e bom humor. Recomendo muito!' },
      { nome: 'Jaqueline', quando: 'fev/2019', texto: 'O Ailton foi nosso guia em um City Tour por Viena e adoramos. Uma pessoa muito agradável e que possui um excelente conhecimento sobre Viena.' },
      { nome: 'Pedro A.', quando: 'jan/2019', texto: 'O Ailton é super profissional e muito carismático, faz um trabalho excepcional. Ganhamos um conhecimento muito maior de Viena e outras cidades com os tours dele! Recomendadíssimo!' },
      { nome: 'Luiz Carlos G.', quando: 'fev/2019', texto: 'É um excelente Guia turístico, conhece muito bem a cidade, dedicado, engraçado, carismático, atencioso e trabalha com boa vontade, dá ótimas dicas para curtir a cidade.' },
      { nome: 'Tania', quando: 'fev/2019', texto: 'Indo a Viena não deixe de fazer um passeio completo com Ailton, pessoa gentil e super competente. Vai de mostrar de uma forma incrível os monumentos, lojas, restaurantes, museus e tudo mais que a cidade oferece.' },
    ],
    depoimentosVideo: '',
    depoimentosVideoTxt: '',
    badge: 'Guia credenciado em Viena desde 2016 · mora em Viena desde 1987',
    prefixo: 'AV',                 /* codigo da reserva: AV-4821 */
    idiomas: 'Português · Deutsch · Español · English · Italiano',
    /* Dois turnos. O Top Tour (6h30) so sai de manha (ocupa o dia).
       Horarios de exemplo: ele confirma. */
    turnos: [
      { hora: '09:30', fim: '13:30', nome: 'Manhã' },
      { hora: '14:30', fim: '18:00', nome: 'Tarde' },
    ],
    turnoExclusivo: true,
    linguas: ['pt'],
    /* marca do Ailton: a mao com a bandeira da Austria (o logo do site dele)
       + "Aílton / GUIA VIENA" em letra grande — ele nao enxerga bem. arte/ */
    marca: {
      logoClaro: 'arte/logo-claro.png',   logoClaroRazao: 2.70,    /* grafite + dourado — fundo claro */
      logoEscuro: 'arte/logo-escuro.png', logoEscuroRazao: 2.70,   /* branco + dourado — fundo escuro */
      monograma: 'arte/monograma.png',    monogramaRazao: 0.65,    /* a mao com a bandeira; vira mascara */
    },
    regioes: [
      ['viena',   'Viena',            'Vienna'],
      ['austria', 'Além de Viena',    'Beyond Vienna'],
    ],
    tipos: {
      walk:    { pt: 'City tour',      en: 'City tour' },
      day:     { pt: 'Sob consulta',   en: 'On request' },
    },
  },
};
