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

  /* Cofre do demo (repositório guia-cofre): guarda as chaves do Claude e do
     Gemini no servidor e deixa o demo público usar a IA de verdade, com
     limite por pessoa e por dia. Vazio = só a demonstração pronta. Num app
     de cliente fica vazio: lá o guia usa a chave dele.
     Mudou de casa em 24/09/2026: era a Netlify (guia-cofre.netlify.app),
     que travava por falta de créditos de publicação. */
  cofre: '',   /* demonstracao de fotografo: assistente em modo demonstracao */
  /* Quem é este app dentro do cofre. Cada cliente tem o seu (uma linha na
     tabela cofre_clientes) com os passeios, o treino e as chaves DELE.
     É isto que faz a tela "Ensinar o agente" treinar o robô certo. */
  clienteCofre: '',
  /* conta de Instagram onde o agente do demo responde de verdade (pelo cofre) */
  agenteInstagram: '',
  /* número do WhatsApp do agente do demo (só dígitos; o de teste da Meta não entrega para o Brasil) */
  agenteWhatsapp: '', // vazio = botão escondido; o de teste era 15551558996. Pôr o número real quando o chip chegar

  /* Quem e o guia. Vira o valor inicial dos Ajustes (que o guia edita no
     painel) e o que a abertura e o cabecalho mostram. */
  guia: {
    nome: 'Estúdio Aurora',        /* NOME DE EXEMPLO — nao existe, e so demonstracao */
    negocio: 'Ensaios em Paris',   /* nome do negocio / marca */
    cidade: 'Paris, França',       /* onde a fotografa esta baseada */
    whats: '+33600000000',         /* numero de exemplo, nao chama ninguem */
    insta: 'estudioaurora.paris',
    badge: 'Fotógrafa brasileira em Paris',
    prefixo: 'EA',                 /* prefixo do codigo de reserva: EA-4821 */
    /* regioes dos passeios: [codigo, nome em PT, nome em EN] */
    regioes: [['paris', 'Paris', 'Paris'], ['arredores', 'Arredores', 'Around Paris']],
  },
};
