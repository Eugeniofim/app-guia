/* Identidade deste app: o UNICO lugar que sabe qual banco usar e de quem
   e o app. cloud.js, auth.js, store.js e app.js leem daqui e nao trazem
   nenhum endereco, nome ou marca fixos. testes/limpa.test.js falha se algum
   banco ou qualquer traco da guia original aparecer gravado no codigo.

   Vazio em supabaseUrl = o app roda so no aparelho, sem nuvem. Serve para
   mostrar um prototipo a um guia antes de ele fechar.

   Para um cliente novo: criar o projeto no Supabase, rodar SEGURANCA.sql
   no editor SQL, preencher os dois campos do banco e o bloco "guia". */
var APP_CONFIG = {
  supabaseUrl: '',   /* ex.: 'https://SEU-PROJETO.supabase.co' */
  supabaseKey: '',   /* a chave "publishable" do projeto; nunca a secreta */

  /* Cofre do demo (repositório guia-cofre, no Netlify): guarda as chaves do
     Claude e do Gemini no servidor e deixa o demo público usar a IA de
     verdade, com limite por pessoa e por dia. Vazio = só a demonstração
     pronta. Num app de cliente fica vazio: lá o guia usa a chave dele. */
  /* Cofre dela (Claude): fica vazio ate existir a funcao no Supabase DELA */
  cofre: '',
  /* conta de Instagram onde o agente do demo responde de verdade (pelo cofre) */
  agenteInstagram: 'conexaoberlim',
  /* número do WhatsApp do agente do demo (só dígitos; o de teste da Meta não entrega para o Brasil) */
  /* chave PUBLICA do aviso por push (VAPID). A privada fica so nos segredos do
     Supabase dela (VAPID_PRIVADA) — nunca aqui, nunca no repositorio. */
  /* O que ela contratou (22/09): Assistente do painel + Atendimento no Instagram.
     false = a aba/canal aparece com cadeado e explica o que faria. */
  modulos: { assistente: true, atendimento: true, marketing: false, whatsapp: false },

  /* conversas de exemplo do Atendimento (demonstração): clientes dela,
     brasileiros, pelo Instagram, sobre os passeios dela */
  conversasDemo: [
    { id: 'c1', nome: 'Mariana', lang: 'pt', canal: 'insta', tipo: 'preco', tour: 'berlim-historico', msg: 'Oi! Quanto fica o passeio Berlim Histórico?' },
    { id: 'c2', nome: 'Rafael', lang: 'pt', canal: 'insta', tipo: 'semana', tour: 'potsdam-sanssouci', pessoas: 2, msg: 'Olá, Dulce! Vocês fazem o bate-volta a Potsdam na semana que vem? Somos um casal.' },
    { id: 'c3', nome: 'Camila', lang: 'pt', canal: 'insta', tipo: 'crianca', tour: 'sachsenhausen', msg: 'Oi! O passeio de Sachsenhausen é indicado para adolescente de 14 anos?' },
    { id: 'c4', nome: 'Paulo', lang: 'pt', canal: 'insta', tipo: 'pagar', msg: 'Dá pra pagar por Pix? Não tenho cartão internacional.' },
    { id: 'c5', nome: 'Beatriz', lang: 'pt', canal: 'insta', tipo: 'disp', tour: 'bairro-judeu', pessoas: 3, msg: 'Oi Dulcineia! Tem vaga no sábado pro Bairro Judeu? Somos 3.' },
  ],

  /* e-mails automaticos ao CLIENTE (recibo, confirmacao, vespera) — quem manda
     e a funcao cofre do Supabase dela. Precisa do dominio verificado no Resend. */
  emailClientes: true,

  vapidPublica: 'BHRk77E1mO8EYDec-EhfpMgp1_TcVstsZp1wSSRRfdBiTcCpVy17di1Jc8ONZuD0sg3SpvHmeetF9gcTrHoEKPQ',
  agenteWhatsapp: '', // vazio = botão escondido; o de teste era 15551558996. Pôr o número real quando o chip chegar

  /* Quem e o guia. Vira o valor inicial dos Ajustes (que o guia edita no
     painel) e o que a abertura e o cabecalho mostram. */
  guia: {
    nome: 'Dulcineia',
    negocio: 'Conexão Berlim',
    cidade: 'Berlim, Alemanha',
    whats: '+4915238240861',
    insta: 'conexaoberlim',
    /* as palavras dela, do Instagram */
    badge: 'Visitas guiadas exclusivas · História e Reconstrução de Berlim',
    prefixo: 'CB',                 /* codigo da reserva: CB-4821 */
    idiomas: 'Português',          /* em que lingua ela guia (a pagina do passeio mostra) */
    /* Visitas privativas em dois turnos por dia (Dulcineia, 24/09/2026).
       Cada turno atende UM grupo — a mesma família pode pegar os dois, ou
       vêm grupos diferentes. E ela é uma só: turno reservado em qualquer
       passeio fica ocupado em todos (turnoExclusivo). */
    turnos: [
      { hora: '09:30', fim: '13:30', nome: 'Manhã' },
      { hora: '14:00', fim: '18:00', nome: 'Tarde' },
    ],
    turnoExclusivo: true,
    linguas: ['pt'],               /* o app inteiro so em portugues: sem seletor de idioma (Eugenio, 23/09) */
    /* a marca dela, tirada em vetor do manual (Studio Nama, v2.0): o app pinta
       cada arquivo com a cor do tema. Razao = largura / altura do desenho. */
    marca: {
      selo: 'arte/selo-capsula.svg',       seloRazao: 0.911,
      logo: 'arte/logo-horizontal.svg',    logoRazao: 6.416,
      palavra: 'arte/logo-palavra.svg',    palavraRazao: 2.543,
    },
    /* os lugares que ela atende, da bio do Instagram dela */
    regioes: [
      ['berlim',     'Berlim',     'Berlin'],
      ['potsdam',    'Potsdam',    'Potsdam'],
      ['dresden',    'Dresden',    'Dresden'],
      ['wittenberg', 'Wittenberg', 'Wittenberg'],
      ['bauhaus',    'Bauhaus',    'Bauhaus'],
      ['oranienburg', 'Oranienburg', 'Oranienburg'],   /* Sachsenhausen */
    ],
    /* os nomes que ela usa para os tipos de passeio (prototipo dela) */
    tipos: {
      walk: { pt: 'Na cidade',  en: 'In the city', fr: 'En ville',      it: 'In città',      de: 'In der Stadt', es: 'En la ciudad' },
      day:  { pt: 'Bate-volta', en: 'Day trip',    fr: 'Excursion',     it: 'Gita di un giorno', de: 'Tagesausflug', es: 'Excursión' },
    },
  },
};
