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

  const passa = (txt, regras) => regras.reduce((s, [de, para]) => s.replace(de, para), txt);

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
  for (const [k, v] of Object.entries(ETIQUETAS)) {
    if (STR[k]) Object.assign(STR[k], v);
  }
})();
