/* Identidade deste app: o UNICO lugar que sabe qual banco usar e de quem
   e o app. cloud.js, auth.js, store.js e app.js leem daqui e nao trazem
   nenhum endereco, nome ou marca fixos. testes/limpa.test.js falha se algum
   banco ou qualquer traco da guia original aparecer gravado no codigo.

   Vazio em supabaseUrl = o app roda so no aparelho, sem nuvem. Serve para
   mostrar um prototipo a um guia antes de ele fechar.

   Para um cliente novo: criar o projeto no Supabase, rodar SEGURANCA.sql
   no editor SQL, preencher os dois campos do banco e o bloco "guia". */
var APP_CONFIG = {
  /* 06/10/2026: o app mora no banco da Ti Artes, numa sala so dele (schema "mari").
     A chave e a publicavel: quem protege os dados e a regra de acesso (RLS) da sala. */
  supabaseUrl: 'https://uopfqlogjzuqpabptxkb.supabase.co',
  supabaseKey: 'sb_publishable_VKIdd2RNpMf3e4IEDprxJw_TOKPIHT2',
  sala: 'mari',     /* schema do banco; vazio = public (projeto proprio) */

  /* Cofre do demo (repositório guia-cofre, no Netlify): guarda as chaves do
     Claude e do Gemini no servidor e deixa o demo público usar a IA de
     verdade, com limite por pessoa e por dia. Vazio = só a demonstração
     pronta. Num app de cliente fica vazio: lá o guia usa a chave dele. */
  /* A Mari NAO quer robo de atendimento: o contato com o cliente e humano.
     O cofre liga SO o assistente do painel (presente do pacote, 06/10/2026):
     Atendimento e Marketing seguem com cadeado (assistente-mari.js).
     Sem o banco dela, o cofre atende no modo demonstracao (modelo simples,
     limite diario); com o banco + login dela, o cofre confere que e a dona
     e usa o modelo forte (guia-cofre/_comum/pro.js, APPS_PRO.mari). */
  cofre: 'https://uopfqlogjzuqpabptxkb.supabase.co/functions/v1/cofre',
  clienteCofre: 'mari',
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
    /* o selo recortado em circulo, fundo transparente (o original vinha num
       quadrado cinza e aparecia como uma bolinha cinza na abertura) */
    logo:       'arte/selo-mari-circ.png',
    logoEscuro: 'arte/selo-mari-circ.png',
    /* redes da primeira tela: vazio = o icone nao aparece. Ela edita em Ajustes. */
    youtube:  '',
    facebook: '',
    tiktok:   '',
    site:     '',
    prefixo: 'TD',
    regioes: [
      ['copenhague', 'Copenhague',        'Copenhagen'],
      ['arredores',  'Arredores',         'Around Copenhagen'],
      ['suecia',     'Suécia',            'Sweden'],
      ['servicos',   'Serviços',          'Services'],
    ],
  },
};
