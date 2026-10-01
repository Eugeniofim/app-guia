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
    /* PROTÓTIPO PARA A LEDA GUEDES (01/10/2026) — ela pediu depois da DM.
       Os pacotes, preços, lugares e fotos são os que ELA publica em
       fotografa-em-paris.com. O WhatsApp é de exemplo de propósito: o link
       é público e quem achar não pode cair na caixa dela. */
    nome: 'Leda Guedes',
    negocio: 'Leda Guedes',
    cidade: 'Paris, França',
    whats: '+33600000000',         /* numero de exemplo, nao chama ninguem */
    insta: 'fotografaemparis.br',
    badge: 'Fotógrafa brasileira em Paris · 4,9★ em 116 avaliações',
    prefixo: 'LG',                 /* codigo de reserva: LG-4821 */
    regioes: [['paris', 'Paris', 'Paris'], ['versalhes', 'Versalhes', 'Versailles']],
    /* os lugares que ela mesma oferece no site dela */
    locaisEnsaio: [
      ['torre',     'Torre Eiffel e Trocadéro',          'Eiffel Tower & Trocadéro'],
      ['louvre',    'Louvre e as arcadas',               'The Louvre & its arcades'],
      ['alexandre', 'Pont Alexandre III',                'Pont Alexandre III'],
      ['opera',     'Ópera Garnier',                     'Opéra Garnier'],
      ['tulherias', 'Tulherias e a roda-gigante',        'Tuileries & the big wheel'],
      ['cafe',      'Um café parisiense',                'A Parisian café'],
      ['versalhes', 'Jardins de Versalhes',              'Gardens of Versailles'],
      ['noite',     'Paris à noite',                     'Paris by night'],
    ],
  },
};
