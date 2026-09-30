/* =====================================================
   PALAVRAS DO FOTÓGRAFO — 28/09/2026

   Este app é o mesmo do guia. A máquina não muda: uma data, uma hora, um
   lugar combinado e um sinal que trava a agenda. O que muda é o vocabulário.

   Em vez de reescrever as 500 e tantas frases do i18n.js à mão (e ter que
   refazer isso a cada versão nova do app do guia), este arquivo passa uma
   régua no STR depois que ele carrega: passeio vira ensaio, guia vira
   fotógrafa, tour vira session. Assim o app do guia continua sendo a fonte,
   e o do fotógrafo acompanha de graça.

   Carregado no index.html LOGO DEPOIS do i18n.js e antes do app.js.
   ===================================================== */
'use strict';

(function palavrasDoFotografo() {
  if (typeof STR !== 'object' || !STR) return;

  /* ordem importa: o que é mais específico vem antes */
  const TROCAS_PT = [
    [/\bPasseios\b/g, 'Ensaios'],
    [/\bpasseios\b/g, 'ensaios'],
    [/\bPasseio\b/g, 'Ensaio'],
    [/\bpasseio\b/g, 'ensaio'],
    [/\bdo guia\b/g, 'da fotógrafa'],
    [/\bao guia\b/g, 'à fotógrafa'],
    [/\bO guia\b/g, 'A fotógrafa'],
    [/\bo guia\b/g, 'a fotógrafa'],
    [/\bum guia\b/g, 'uma fotógrafa'],
    [/\bGuia\b/g, 'Fotógrafa'],
    [/\bguia\b/g, 'fotógrafa'],
    [/\bguias\b/g, 'fotógrafas'],
    [/\bsaída\b/g, 'sessão'],
    [/\bsaídas\b/g, 'sessões'],
  ];
  const TROCAS_EN = [
    [/\bTours\b/g, 'Sessions'],
    [/\btours\b/g, 'sessions'],
    [/\bTour\b/g, 'Session'],
    [/\btour\b/g, 'session'],
    [/\bGuide\b/g, 'Photographer'],
    [/\bguide\b/g, 'photographer'],
    [/\bguides\b/g, 'photographers'],
    [/\bdeparture\b/g, 'session'],
    [/\bdepartures\b/g, 'sessions'],
  ];

  /* ARMADILHA (29/09/2026): o app tem variáveis como {guia}, {tour}, {nome}.
     Trocar "guia" por "fotógrafa" dentro delas quebra a frase — o painel
     chegou a dizer "Bom dia, {fotógrafa}" porque a variável deixou de existir.
     Por isso a régua pula o que está entre chaves. */
  const passa = (txt, regras) => txt
    .split(/(\{[a-zA-Z_]+\})/)
    .map((p, i) => (i % 2 ? p : regras.reduce((s, [de, para]) => s.replace(de, para), p)))
    .join('');

  for (const chave of Object.keys(STR)) {
    const e = STR[chave];
    if (!e || typeof e !== 'object') continue;
    for (const lang of Object.keys(e)) {
      if (typeof e[lang] !== 'string') continue;
      e[lang] = passa(e[lang], lang === 'pt' ? TROCAS_PT : TROCAS_EN);
    }
  }

  /* as etiquetas de tipo não têm tradução automática possível:
     no app do guia elas são "A pé / Dia inteiro / Bike"; aqui viram as
     categorias que um fotógrafo realmente usa. */
  const ETIQUETAS = {
    secProgram: { pt: 'Como é o ensaio', en: 'How the session works' },
    chooseTour: { pt: 'Escolha o seu ensaio', en: 'Choose your session' },
    fPhoto:   { pt: 'Ensaio',  en: 'Session' },
    tSession: { pt: 'Pacote',  en: 'Package' },
    fWalk:    { pt: 'Curto',   en: 'Short' },
    fDay:     { pt: 'Dia inteiro', en: 'Full day' },
  };

  /* frases da tela "Crie o seu ensaio" (29/09/2026) — ficam aqui e nao no
     i18n.js para o app do guia continuar sendo a fonte, sem saber disso. */
  const NOVAS = {
    tagline:     { pt: 'Ensaios em português, no seu ritmo — e você volta com as fotos de Paris que queria.',
                   en: 'Photo sessions in Portuguese, at your pace — and you go home with the Paris photos you wanted.' },
    seeTours:    { pt: 'Ver ensaios e reservar', en: 'See sessions and book' },
    seeToursSub: { pt: 'Datas livres e reserva na hora', en: 'Free dates, book on the spot' },
    crieLink:    { pt: 'Crie o seu ensaio', en: 'Design your session' },
    crieLinkSub: { pt: 'Você monta, eu faço o orçamento', en: 'You build it, I quote it' },
    crieTit:     { pt: 'Crie o seu ensaio', en: 'Design your session' },
    crieIntro:   { pt: 'Escolha a ocasião, os lugares e a hora da luz. No fim eu recebo tudo pelo WhatsApp e te mando o valor — sem compromisso.',
                   en: 'Pick the occasion, the places and the light. At the end it all reaches me on WhatsApp and I send you a price — no commitment.' },
    crieQuem:    { pt: 'Quem é e quando', en: 'Who and when' },
    crieNome:    { pt: 'Seu nome', en: 'Your name' },
    crieNomePh:  { pt: 'como prefere ser chamado', en: 'what you like to be called' },
    crieData:    { pt: 'Dia do ensaio', en: 'Session date' },
    criePessoas: { pt: 'Quantas pessoas', en: 'How many people' },
    crieOcasiao: { pt: 'Qual é a ocasião', en: 'What is the occasion' },
    crieOnde:    { pt: 'Onde você quer fotografar', en: 'Where you want to shoot' },
    crieOndeWhy: { pt: 'Pode marcar mais de um. Em uma hora dá para fazer dois lugares perto.',
                   en: 'You can pick more than one. In one hour we can do two nearby places.' },
    crieQuando:  { pt: 'A hora da luz', en: 'The light' },
    crieQuandoWhy:{ pt: 'O nascer do sol é a única hora em que os pontos famosos ficam vazios.',
                    en: 'Sunrise is the only hour when the famous spots are empty.' },
    criePrecisa: { pt: 'O que mais você quer junto', en: 'What else you want' },
    crieObs:     { pt: 'Quer me contar mais alguma coisa?', en: 'Anything else you want to tell me?' },
    crieObsPh:   { pt: 'uma surpresa, alguém com dificuldade de andar, uma roupa especial…',
                   en: 'a surprise, someone with limited mobility, a special outfit…' },
    crieEnviar:  { pt: 'Mandar para a fotógrafa', en: 'Send to the photographer' },
    crieRodape:  { pt: 'Isso não reserva a data. A data trava quando o sinal entra.',
                   en: 'This does not hold the date. The date is locked when the deposit is paid.' },
    crieMsgOi:   { pt: 'Oi! Montei o meu ensaio no seu app 🙂 {nome}', en: 'Hi! I designed my session in your app 🙂 {nome}' },
    crieMsgPessoas: { pt: '{n} pessoa(s)', en: '{n} person/people' },
    crieEnviado: { pt: 'Pronto — é só enviar no WhatsApp', en: 'Done — just hit send on WhatsApp' },
  };
  for (const [k, v] of Object.entries(NOVAS)) STR[k] = Object.assign({}, STR[k], v);

  for (const [k, v] of Object.entries(ETIQUETAS)) {
    if (STR[k]) Object.assign(STR[k], v);
  }

  /* SEGUNDA PASSADA (29/09/2026): o assistente tem a tabela dele (IA_TXT, no
     assistente.js), que é carregada DEPOIS deste arquivo. Sem isto o cartão
     de confirmação dizia "Passeio" e o painel falava em "saída". O setTimeout
     espera todos os <script> terminarem. */
  setTimeout(function reguaNoAssistente() {
    if (typeof IA_TXT !== 'object' || !IA_TXT) return;
    for (const chave of Object.keys(IA_TXT)) {
      const e = IA_TXT[chave];
      if (!e || typeof e !== 'object') continue;
      for (const lang of Object.keys(e)) {
        if (typeof e[lang] !== 'string') continue;
        e[lang] = passa(e[lang], lang === 'pt' ? TROCAS_PT : TROCAS_EN);
      }
    }
  }, 0);
})();
