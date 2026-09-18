/* Identidade deste app: o UNICO lugar que sabe qual banco usar e de quem
   e o app. cloud.js, auth.js, store.js e app.js leem daqui e nao trazem
   nenhum endereco, nome ou marca fixos.

   Vazio em supabaseUrl = o app roda so no aparelho, sem nuvem. E assim que
   o prototipo e mostrado ao Mario, antes de existir banco no nome dele.

   Para ligar a nuvem: criar o projeto no Supabase NA CONTA DELE, rodar
   SEGURANCA.sql no editor SQL e preencher os dois campos abaixo. */
var APP_CONFIG = {
  supabaseUrl: '',   /* ex.: 'https://SEU-PROJETO.supabase.co' */
  supabaseKey: '',   /* a chave "publishable" do projeto; nunca a secreta */

  guia: {
    nome: 'Mario',
    negocio: 'Guia Brasileiro em Munique',
    cidade: 'Munique, Alemanha',
    whats: '+491728610606',
    insta: 'guiabrasileiroemmunique',
    /* o selo dele (o desenho de chapeu bavaro do site). O mesmo nos dois
       temas: o circulo preto funciona no claro e no escuro. */
    logo:       'arte/logo-mario.png',
    logoEscuro: 'arte/logo-mario.png',
    badge: 'Guia oficial de Munique desde 1995',   /* as palavras dele, do Instagram */
    prefixo: 'MU',                 /* codigo da reserva: MU-4821 */
    regioes: [
      ['munique', 'Munique',  'Munich'],
      ['baviera', 'Baviera',  'Bavaria'],
      ['austria', 'Áustria',  'Austria'],
    ],
  },
};
