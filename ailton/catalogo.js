/* =====================================================
   CATÁLOGO — os passeios do Aílton (Ailton Guia Viena, 16/10/2026)

   Tudo do site dele (ailtonguiaviena.at), sem inventar:
   - City Tour Clássico ......... 2h ... € 330 por grupo (+€55 por pessoa acima de 5)
   - City Tour Clássico Plus .... 3h ... € 470 por grupo (+€75 por pessoa acima de 5)
   - Top Tour Viena ............. 6h30 . € 840 por grupo (+€130 por pessoa acima de 5)
   "Todos os passeios são em grupo fechado de até 5 pessoas, conduzidos em
   Português." O que cada um inclui é a lista do site, palavra por palavra.

   "Além de Viena" (Salzburgo, Hallstatt, Innsbruck, Linz, Graz) aparece no
   site como "o Aílton pode ser seu guia": aqui fica SOB CONSULTA (preço 0
   = o app pede orçamento pelo WhatsApp), com a frase e a foto do site.

   PREÇO: valor do GRUPO. Até 5 pessoas o valor fechado; cada pessoa a mais
   soma o adicional do site. O site não diz um máximo: o app vai até 10
   pessoas e, acima disso, manda falar com o Aílton.
   ===================================================== */
'use strict';

/* preços reais (do site): sem a etiqueta "valores de exemplo" */
const APP_TABELA_EXEMPLO = false;
const GRUPO_BASE = 5, GRUPO_MAX = 10;

/* faixas: até 5 = valor base; 6, 7… = base + adicional por pessoa */
function faixasAilton(base, adicional) {
  const f = [{ ate: GRUPO_BASE, v: base }];
  for (let n = GRUPO_BASE + 1; n <= GRUPO_MAX; n++) f.push({ ate: n, v: base + adicional * (n - GRUPO_BASE) });
  return f;
}

/* parada a partir do banco de pontos (pontos.js) */
function paradaDe(id, frase) {
  const p = (typeof ponto === 'function' && ponto(id)) || null;
  if (!p) return null;
  const d = frase || p.d || '';
  return { pid: id, t: '', ph: p.ph, cr: p.cr, lat: p.lat, lng: p.lng, n: { pt: p.n, en: p.n }, d: { pt: d, en: '' } };
}
const paradas = (lista) => lista.map(x => Array.isArray(x) ? paradaDe(x[0], x[1]) : paradaDe(x)).filter(Boolean);

/* política: o sinal e a remarcação são do APP (o site não fala de sinal).
   O Aílton confirma ou troca em Ajustes. */
const POLITICA_CAROL = {
  pt: 'Sinal de 30% para travar a data · saldo no dia · remarcação grátis até 48h antes',
  en: '30% deposit to lock the date · balance on the day · free rescheduling up to 48h before',
};

function catalogoCarol() {
  const base = { status: 'live', pickup: false, privativo: true, min: 1, max: GRUPO_MAX, priceMode: 'pacote', payPolicy: 'split',
    cancel: POLITICA_CAROL, effort: 'easy', distance: '', notIncludes: { pt: [], en: [] } };
  const T = (o) => {
    const x = { ...base, ...o };
    x.pacotes = [{ h: o.horas, faixas: faixasAilton(o.valor, o.adicional) }];
    x.price = o.valor;                      /* "a partir de" = o valor do grupo até 5 */
    x.duration = o.duracao;
    delete x.horas; delete x.valor; delete x.duracao;
    return x;
  };
  /* Além de Viena: sob consulta, com a frase do site */
  const D = (id, pid, nome, frase, order) => ({ id, status: 'live', type: 'day', region: 'austria', order, price: 0, priceMode: 'session',
    privativo: true, min: 1, max: 20, payPolicy: 'full', cancel: POLITICA_CAROL, effort: 'easy', distance: '', pickup: false,
    name: { pt: nome, en: nome }, tagline: { pt: frase, en: '' },
    desc: { pt: 'Além da capital, o Aílton pode ser seu guia em outras cidades fascinantes da Áustria.\n\n' + frase + '\n\nRoteiro, duração e valor sob consulta: fale com o Aílton pelo WhatsApp.', en: '' },
    meeting: { pt: 'Combinado com o Aílton', en: 'Arranged with Aílton' },
    includes: { pt: ['Guia credenciado em português', 'Roteiro combinado com você'], en: [] }, notIncludes: { pt: [], en: [] },
    photo: (ponto(pid) || {}).ph || '', duration: 'sob consulta', stops: paradas([pid]) });

  return [
    T({ id: 'city-tour-classico', type: 'walk', region: 'viena', order: 1, destaque: true, selo: 'Mais popular',
      horas: 2, duracao: 'Passeio de 2 horas', valor: 330, adicional: 55,
      name: { pt: 'City Tour Clássico', en: 'Classic City Tour' },
      tagline: { pt: 'Passeio de 2 horas pelo centro histórico de Viena e o Palácio Hofburg.', en: 'A 2-hour walk through Vienna’s historic centre and the Hofburg Palace.' },
      desc: { pt: 'Passeio pelo centro histórico de Viena, com o Palácio Hofburg e informações históricas e culturais.\n\nGrupo fechado de até 5 pessoas, conduzido em português pelo Aílton, guia credenciado que mora em Viena desde 1987.\n\nAdicional de €55 por pessoa para grupos acima de 5 pessoas.', en: '' },
      meeting: { pt: 'Centro de Viena (o ponto exato vai na confirmação)', en: 'Vienna city centre (exact spot sent on confirmation)' },
      includes: { pt: ['Passeio pelo centro histórico de Viena', 'Palácio Hofburg', 'Informações históricas e culturais', 'Grupo fechado de até 5 pessoas'], en: [] },
      photo: 'fotos/p-hofburg-grupo.jpg',
      priceNote: { pt: 'Adicional de €55 por pessoa para grupos acima de 5 pessoas.', en: '' },
      stops: paradas(['centro', 'hofburg']) }),

    T({ id: 'city-tour-classico-plus', type: 'walk', region: 'viena', order: 2, destaque: true, selo: 'Recomendado',
      horas: 3, duracao: 'Passeio de 3 horas', valor: 470, adicional: 75,
      name: { pt: 'City Tour Clássico Plus', en: 'Classic City Tour Plus' },
      tagline: { pt: 'Passeio de 3 horas: centro histórico, Palácio Hofburg e Palácio Belvedere.', en: 'A 3-hour tour: historic centre, Hofburg Palace and Belvedere Palace.' },
      desc: { pt: 'Passeio pelo centro histórico de Viena, com o Palácio Hofburg, o Palácio Belvedere e informações históricas e culturais.\n\nGrupo fechado de até 5 pessoas, conduzido em português pelo Aílton.\n\nAdicional de €75 por pessoa para grupos acima de 5 pessoas.', en: '' },
      meeting: { pt: 'Centro de Viena (o ponto exato vai na confirmação)', en: 'Vienna city centre (exact spot sent on confirmation)' },
      includes: { pt: ['Passeio pelo centro histórico de Viena', 'Palácio Hofburg', 'Palácio Belvedere', 'Informações históricas e culturais', 'Grupo fechado de até 5 pessoas'], en: [] },
      photo: 'fotos/p-belvedere-ailton.jpg',
      priceNote: { pt: 'Adicional de €75 por pessoa para grupos acima de 5 pessoas.', en: '' },
      stops: paradas(['centro', 'hofburg', 'belvedere']) }),

    T({ id: 'top-tour-viena', type: 'walk', region: 'viena', order: 3, destaque: true, selo: 'Experiência completa',
      horas: 6.5, duracao: 'Passeio de 6h30', valor: 840, adicional: 130,
      name: { pt: 'Top Tour Viena', en: 'Top Tour Vienna' },
      tagline: { pt: 'Passeio de 6h30: centro, Ring, Hofburg, Belvedere e Schönbrunn, com almoço e coffee break.', en: 'A 6h30 tour: centre, Ring, Hofburg, Belvedere and Schönbrunn, with lunch and coffee break.' },
      desc: { pt: 'City tour completo pelo centro histórico, o Anel da cidade (Ring Boulevard) com todos os monumentos, o Palácio de inverno Hofburg, o Palácio Belvedere e o Palácio de verão Schönbrunn.\n\nItinerário 100% personalizável, com horário de almoço e coffee break inclusos e total flexibilidade de tempo.\n\nGrupo fechado de até 5 pessoas. Adicional de €130 por pessoa para grupos acima de 5 pessoas.', en: '' },
      meeting: { pt: 'Combinado na confirmação', en: 'Arranged on confirmation' },
      includes: { pt: ['City tour completo pelo centro histórico', 'Anel da cidade (Ring Boulevard) com todos os monumentos', 'Palácio de inverno Hofburg', 'Palácio Belvedere', 'Palácio de verão Schönbrunn', 'Itinerário 100% personalizável', 'Horário de almoço e coffee break inclusos', 'Total flexibilidade de tempo', 'Grupo fechado de até 5 pessoas'], en: [] },
      photo: 'fotos/p-schonbrunn-grupo.jpg',
      priceNote: { pt: 'Adicional de €130 por pessoa para grupos acima de 5 pessoas.', en: '' },
      stops: paradas(['centro', 'ring', 'hofburg', 'belvedere', 'schonbrunn']) }),

    /* ---------------- ALÉM DE VIENA (sob consulta) ---------------- */
    D('salzburgo', 'salzburg', 'Salzburgo', 'Cidade natal de Mozart, nos pés dos Alpes.', 10),
    D('hallstatt', 'hallstatt', 'Hallstatt', 'Um dos cenários mais belos da Áustria.', 11),
    D('innsbruck', 'innsbruck', 'Innsbruck', 'Capital do Tirol, rodeada pelos Alpes.', 12),
    D('linz', 'linz', 'Linz', 'Capital Europeia da Cultura em 2009, onde Kepler descobriu as leis do movimento planetário.', 13),
    D('graz', 'graz', 'Graz', 'A segunda maior cidade da Áustria, cidade natal de Arnold Schwarzenegger, com o icônico Kunsthaus.', 14),
  ];
}

/* 2.5 -> "2h30"; 4 -> "4h" */
function rotuloHoras(h) { const i = Math.floor(h), m = Math.round((h - i) * 60); return i + 'h' + (m ? String(m).padStart(2, '0') : ''); }

if (typeof module !== 'undefined') module.exports = { catalogoCarol, rotuloHoras, POLITICA_CAROL, faixasAilton };
