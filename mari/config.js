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
  /* A Mari NAO quer robo de atendimento: o contato com ela e humano.
     Cofre vazio = assistente e atendimento desligados. */
  cofre: '',
  /* conta de Instagram onde o agente do demo responde de verdade (pelo cofre) */
  agenteInstagram: '',
  /* número do WhatsApp do agente do demo (só dígitos; o de teste da Meta não entrega para o Brasil) */
  agenteWhatsapp: '', // vazio = botão escondido; o de teste era 15551558996. Pôr o número real quando o chip chegar

  /* Quem e o guia. Vira o valor inicial dos Ajustes (que o guia edita no
     painel) e o que a abertura e o cabecalho mostram. */
  guia: {
    nome: 'Mari',
    negocio: 'Tour na Dinamarca',
    cidade: 'Copenhague, Dinamarca',
    whats: '+4552765827',
    insta: 'tournadinamarca',
    badge: 'Experiências autênticas na terra do hygge',
    logo:       'arte/selo-mari.png',
    logoEscuro: 'arte/selo-mari.png',
    prefixo: 'TD',
    regioes: [
      ['copenhague', 'Copenhague',        'Copenhagen'],
      ['arredores',  'Arredores',         'Around Copenhagen'],
      ['suecia',     'Suécia',            'Sweden'],
      ['servicos',   'Serviços',          'Services'],
    ],
  },
};
