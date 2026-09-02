/* =====================================================
   PROTOTIPO PARA PROSPECT

   O link  guia.eugeniofim.com/?g=doris  abre o app ja com o nome da pessoa,
   a cidade dela e os passeios dela dentro. E o que transforma "eu faco apps"
   em "olha o seu app pronto" — e o motivo de a conversa comecar com ela
   olhando o proprio negocio, nao um portfolio.

   Por que da tempo: a abertura fica quase 5 segundos na tela e a busca do
   arquivo leva menos de 200ms. O prospect nunca ve a versao generica.

   Uma vez montado, NAO monta de novo: se ele mexeu em alguma coisa e voltou
   depois, o trabalho dele fica. Quem manda nisso e a chave vi_prospecto.

   Nada aqui fala com a nuvem — o prototipo nao tem banco, e por isso pode
   ser publico sem risco nenhum.
   ===================================================== */
'use strict';

const PROSPECTO_KEY = 'vi_prospecto';

/* So aceita nome de arquivo simples. Sem isto, um ?g=../../algo viraria
   busca em outro caminho do site. */
function prospectoSlug() {
  try {
    const s = new URLSearchParams(location.search).get('g') || '';
    return /^[a-z0-9][a-z0-9-]{0,39}$/.test(s) ? s : '';
  } catch (e) { return ''; }
}

/* Monta o app com o que veio do arquivo da pessoa. */
function prospectoAplica(p, slug) {
  const g = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.guia) || {};
  for (const k of ['nome', 'negocio', 'cidade', 'whats', 'insta', 'badge', 'prefixo'])
    if (p[k]) g[k] = p[k];
  if (p.regioes && p.regioes.length) g.regioes = p.regioes;

  /* Parte da demonstracao: ela traz datas abertas e um historico de reservas,
     e e isso que faz o painel parecer um negocio em movimento em vez de uma
     tela vazia. So os passeios sao trocados pelos dele. */
  const db = _seed();
  const novos = (p.passeios || []).slice(0, db.tours.length);
  if (novos.length) {
    db.tours = db.tours.slice(0, novos.length).map((base, i) => {
      const n = novos[i];
      return {
        ...base,
        name:      n.nome     || base.name,
        desc:      n.desc     || base.desc,
        meeting:   n.encontro || base.meeting,
        duration:  n.duracao  || base.duration,
        price:     typeof n.preco === 'number' ? n.preco : base.price,
        priceMode: n.modo     || base.priceMode,
        photo:     n.foto     || base.photo,
        type:      n.tipo     || base.type,
        region:    n.regiao   || base.region,
        /* As paradas do exemplo sao de outra cidade: ou vem as dele, ou nenhuma.
           Parada errada e pior que parada nenhuma — ele percebe na hora. */
        stops:     n.paradas  || [],
      };
    });
    /* datas e reservas de passeio que deixou de existir sairiam orfas */
    const ids = new Set(db.tours.map(t => t.id));
    db.rules    = db.rules.filter(r => ids.has(r.tourId));
    db.bookings = db.bookings.filter(b => ids.has(b.tourId));
  }

  db.settings = fillSettings(db.settings);
  if (p.bio)     db.settings.bio      = p.bio;
  if (p.tagline) db.settings.homeText = p.tagline;

  DB = db;
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
  localStorage.setItem(PROSPECTO_KEY, slug);
}

/* A FAIXA DE PROPOSTA — obrigatoria, e nao e detalhe juridico.

   O prototipo leva o nome e o negocio de uma pessoa de verdade, com precos
   que NOS inventamos, e um botao de reservar. O link e publico. Quem cair
   nele sem contexto pode achar que e o site oficial dela e tentar reservar
   um passeio que nao existe.

   Entao todo prototipo se anuncia como proposta, na tela do cliente, o
   tempo todo. Fica FORA do #app de proposito: assim sobrevive a cada
   troca de tela sem precisar ser redesenhada. */
function prospectoBarra(nome) {
  if (document.getElementById('protoBar')) return;
  const el = document.createElement('div');
  el.id = 'protoBar';
  el.className = 'protobar';
  const quem = nome ? (' para ' + nome) : '';
  el.innerHTML = '<b>Proposta</b> — demonstração feita' + esc(quem) +
    ' por Ti Artes. Não é o site oficial, e nenhuma reserva aqui é real.';
  document.body.appendChild(el);
}

(async function prospecto() {
  const slug = prospectoSlug();
  if (!slug) return;
  const jaMontado = localStorage.getItem(PROSPECTO_KEY) === slug;
  if (!jaMontado) {
    try {
      const r = await fetch('prospects/' + slug + '.json', { cache: 'no-store' });
      if (!r.ok) return;                   /* link errado: fica a demonstracao */
      const p = await r.json();
      if (!p || typeof p !== 'object') return;
      prospectoAplica(p, slug);
      if (typeof route === 'function') route();
    } catch (e) {
      return;  /* sem prototipo o app abre generico, e generico nao precisa da faixa */
    }
  }
  prospectoBarra(DB && DB.settings && DB.settings.admName);
})();
