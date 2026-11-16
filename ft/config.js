/* Identidade deste app: o UNICO lugar que sabe qual banco usar e de quem
   e o app. cloud.js, auth.js, store.js e app.js leem daqui.

   FT CONCIERGE & EXPERIENCES — Roberto Rivelino (Freddy Turismo, Londres).
   16/11/2026: o site novo dele, na base do app da Yalla (site + painel
   identicos), com a marca FT. Ingles como lingua principal, depois
   portugues e italiano. Inglaterra, Escocia e Europa.

   Vazio em supabaseUrl = prototipo (tudo so no aparelho). Na entrega: a
   sala "ft" no banco da Ti Artes e a chave publicavel aqui. */
var APP_CONFIG = {
  /* 06/10/2026: o app mora no banco da Ti Artes, numa sala so dele (schema "yalla").
     A chave e a publicavel: quem protege os dados e a regra de acesso (RLS) da sala. */
  supabaseUrl: '',
  supabaseKey: '',
  sala: '',        /* na entrega: 'ft' */

  /* false = demonstração cheia (clientes, reservas, guias e parceiros de
     exemplo) para a Milla ver cada aba funcionando. Na entrega vira true:
     o app começa limpo e só os passeios dela continuam. */
  semExemplos: false,

  /* a moeda do negócio: tudo que é valor aparece nela.
     28/10/2026, pedido dele: "deixar tudo em dólares, somente dólares" (era
     AED; os passeios no ar já estavam todos em USD e ainda não há reserva). */
  moeda: 'GBP',

  /* os dois lados do caixa dela: a plataforma no Brasil (Pix e cartão em
     12x) e a conta em Dubai. As chaves internas ficam as mesmas do app-base. */
  lados: { brasil: 'Brasil', europa: 'Reino Unido' },

  /* Cofre (repositorio guia-cofre, no Supabase do Eugenio): o assistente
     "ao vivo" usa o Claude de verdade por ali, com limite por dia, sem a
     Milla colar chave nenhuma. Na entrega, troca pela chave dela. */
  cofre: 'https://uopfqlogjzuqpabptxkb.supabase.co/functions/v1/cofre',
  clienteCofre: 'demo',
  /* o assistente vem no pacote dela (orçamento de 01/10/2026): sem selo de "extra" */
  assistenteIncluido: true,
  /* ela contratou o atendimento automático: a aba Atendimento aparece no menu */
  atendimento: false,
  /* enquanto o Instagram DELA não é ligado, o cartão mostra o robô de
     demonstração da Ti Artes, para ela ver funcionando de verdade */
  agenteInstagram: 'estudio_ti_artes',
  agenteWhatsapp: '', /* vazio = botão escondido. Pôr o número quando o chip chegar */

  /* as línguas do lado do cliente (pedido dela: português, inglês, espanhol) */
  linguas: ['en', 'pt', 'it'],

  guia: {
    nome: 'Roberto',
    negocio: 'FT Travel & Experiences',
    cidade: 'London, United Kingdom',
    whats: '+447413581875',
    whatsNome: 'UK',
    insta: 'freddyturismolondon',
    email: 'contato@freddyturismo.com',
    /* a marca FT (desenhada pela Ti Artes, 16/11/2026): monograma dourado
       para fundo escuro e verde-escuro para fundo claro */
    logo:       'arte/ft-mark.png',
    logoEscuro: 'arte/ft-mark-escura.png',
    logoCompleto: 'arte/ft-logo.png',
    logoCompletoEscuro: 'arte/ft-logo-escura.png',
    logoHorizontal:       'arte/ft-horizontal.png',
    logoHorizontalEscuro: 'arte/ft-horizontal-escura.png',
    badge: 'Chauffeur · Concierge · Private Tours',
    prefixo: 'FT',                 /* codigo da reserva: FT-4821 */
    tipos: {
      walk: { pt: 'Experiência', en: 'Experience', it: 'Esperienza' },
      day:  { pt: 'Roteiro', en: 'Journey', it: 'Itinerario' },
    },
    regioes: [
      ['londres',   'Londres',        'London'],
      ['inglaterra','Inglaterra',     'England'],
      ['escocia',   'Escócia',        'Scotland'],
      ['europa',    'Europa',         'Europe'],
    ],
  },
};
