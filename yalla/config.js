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
  cofre: 'https://guia-cofre.netlify.app',
  /* conta de Instagram onde o agente do demo responde de verdade (pelo cofre) */
  agenteInstagram: '',   /* o agente ainda não está ligado no Instagram dela */
  /* número do WhatsApp do agente do demo (só dígitos; o de teste da Meta não entrega para o Brasil) */
  agenteWhatsapp: '', // vazio = botão escondido; o de teste era 15551558996. Pôr o número real quando o chip chegar

  /* Quem e o guia. Vira o valor inicial dos Ajustes (que o guia edita no
     painel) e o que a abertura e o cabecalho mostram. */
  guia: {
    nome: 'Milla',
    negocio: 'Yalla Experiences',
    cidade: 'Dubai, Emirados Árabes Unidos',
    whats: '+971556826677',
    insta: 'yalla_experiences',
    /* as palavras dela, do material da marca */
    badge: 'Guia brasileira licenciada nos Emirados · Travel. Connect. Ascend.',
    prefixo: 'YE',                 /* codigo da reserva: YE-4821 */
    idiomas: 'Português, inglês',
    linguas: ['pt', 'en'],
    regioes: [
      ['dubai',     'Dubai',      'Dubai'],
      ['abudhabi',  'Abu Dhabi',  'Abu Dhabi'],
      ['sharjah',   'Sharjah',    'Sharjah'],
      ['deserto',   'Deserto',    'Desert'],
      ['oriente',   'Oriente Médio', 'Middle East'],
    ],
    tipos: {
      walk: { pt: 'Experiência', en: 'Experience' },
      day:  { pt: 'Corporativo', en: 'Corporate' },
    },
  },
};
