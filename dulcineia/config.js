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
