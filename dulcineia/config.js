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
    /* ícones no topo da primeira tela (pedido de 24/09/2026). O SITE fica vazio
       de propósito: conexaoberlim.com.br está "em construção" e com spam de
       cassino injetado (conferido em 24/09) — mandar cliente para lá queima a
       marca. Quando estiver limpo, ela cola o endereço em Ajustes. Spotify:
       falta o link dela. */
    /* PARA A SUA VIAGEM (primeira tela). Link de parceira é DELA — nunca o de
       outra guia (a comissão vai para quem está no código do link). Sem link,
       o cartão abre o WhatsApp dela com o pedido. Ela edita em Ajustes. */
    parceiros: [
      { tipo: 'hotel', titulo: 'Reserve seu hotel', sub: 'Hotéis em Berlim no Booking', url: 'https://www.booking.com/city/de/berlin.pt-br.html', selo: '' },
      { tipo: 'chip', titulo: 'Chip de viagem', sub: 'Chegue em Berlim já conectado', url: '', selo: 'desconto' },
      { tipo: 'seguro', titulo: 'Seguro viagem', sub: 'Viaje protegido pela Europa', url: '', selo: '' },
    ],
    /* DEPOIMENTOS — do destaque "Depoimentos" do Instagram dela (conferido
       24/09/2026). Os 4 ESCRITOS, com o primeiro nome e o mês; texto levemente
       enxugado (confirmar com ela). O resto (~39 clientes) é vídeo: não se
       republica o rosto de ninguém — o último cartão leva ao destaque. */
    depoimentos: [
      { texto: 'Nem um ano inteirinho na escola proporcionaria o conhecimento da manhã de hoje. Que sensação poder escutar a história aqui, onde tudo aconteceu!', nome: 'E. F.', quando: 'jun. 2022' },
      { texto: 'A história é um grande quebra-cabeça que vai sendo montado… Obrigada por enriquecer nossa viagem, Dulcinéia!', nome: 'Adriana', quando: 'jul. 2022' },
      { texto: 'Nossas visitas aqui foram guiadas pela Dulce, inclusive ao campo de concentração. Aconselho vocês a buscarem o perfil dela!', nome: 'Maisa', quando: 'set. 2021' },
      { texto: 'Fim da viagem com essa guia sensacional!', nome: 'Vic', quando: 'mai. 2022' },
    ],
    depoimentosVideo: 'https://www.instagram.com/stories/highlights/17964166591764249/',
    depoimentosVideoTxt: 'Mais de 30 clientes contam em vídeo',
    facebook: 'https://www.facebook.com/conexaoberlim',
    site: '',
    spotify: '',
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
    /* temporada dos passeios: de 1º de março a 31 de outubro (Dulcineia, 24/09/2026).
       Fora dela o app não oferece data nenhuma. */
    temporada: { de: '03-01', ate: '10-31' },
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
