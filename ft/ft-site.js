/* =====================================================
   FT TRAVEL & EXPERIENCES — o site (16/11/2026)

   Pedido do Roberto (pelo Eugênio): "um site tipo o da Yalla", com o mesmo
   painel dentro, a marca FT, foco em Inglaterra e Escócia (e Europa), com
   as informações organizadas como o German Routes (rotas, dia a dia, para
   quem é, como funciona) — e um scroll 3D "maneiro".

   - viewHub(): a capa nova (substitui a da Yalla, que continua no app.js)
   - A ESTRADA: mapa 3D da Grã-Bretanha que a rolagem percorre, de Westminster
     até a Ilha de Skye, com o carro andando pela rota e a parada em destaque
   - JOURNEYS: as viagens de vários dias (#/journey/<id>), no modelo do German
     Routes, só que com o dia a dia, a duração, a época, o mapa e o pedido
   - Inglês é a base; português e italiano nas bandeiras. L4(en, pt, it).
   ===================================================== */
'use strict';

/* o painel (e o login dele) sempre em português; o site volta para a língua escolhida */
function ftLinguaDaTela() {
  const adm = /^#\/(adm|login|novasenha)/.test(location.hash);
  if (adm && LANG !== 'pt') { ftLinguaDaTela._site = LANG; LANG = 'pt'; }
  else if (!adm && ftLinguaDaTela._site) { LANG = ftLinguaDaTela._site; ftLinguaDaTela._site = ''; }
}

/* ---------- bandeiras (vetor: emoji de bandeira não aparece no Windows) ---------- */
ftLinguaDaTela._site = window.__ftSiteLang || '';

const FT_FLAG = {
  en: '<svg viewBox="0 0 60 30" aria-hidden="true"><clipPath id="ftuk"><path d="M0 0v30h60V0z"/></clipPath><g clip-path="url(#ftuk)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" stroke-width="2.4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
  pt: '<svg viewBox="0 0 60 42" aria-hidden="true"><path fill="#009C3B" d="M0 0h60v42H0z"/><path fill="#FFDF00" d="M30 4 56 21 30 38 4 21z"/><circle cx="30" cy="21" r="8.6" fill="#002776"/><path d="M21.6 19.6a17 17 0 0 1 16.9 3.3" stroke="#fff" stroke-width="1.4" fill="none"/></svg>',
  it: '<svg viewBox="0 0 3 2" aria-hidden="true"><path fill="#009246" d="M0 0h1v2H0z"/><path fill="#fff" d="M1 0h1v2H1z"/><path fill="#CE2B37" d="M2 0h1v2H2z"/></svg>',
};
const FT_LANG_NOME = { en: 'English', pt: 'Português', it: 'Italiano' };
const FT_IC = {
  carro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 16v-3.5L5 8h14l2 4.5V16"/><path d="M3 16h18"/><circle cx="7" cy="16.5" r="1.8"/><circle cx="17" cy="16.5" r="1.8"/><path d="M6 12h12"/></svg>',
  aviao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 13.5 3 11l1.5-1.5 8 1L17 6a2 2 0 0 1 3 3l-4.5 4.5 1 8L15 23l-2.5-7.5L9 19v2.5L7.5 23 6 19l-4-1.5L3.5 16H6z"/></svg>',
  mapa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  sino: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 17h16"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M12 9V7M10 7h4"/><path d="M3 20h18"/></svg>',
  rota: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/></svg>',
  pasta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18"/></svg>',
  seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  fecha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  estrela: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  cadeado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};

/* ---------- AS VIAGENS (o "Rotas" do German Routes, com o dia a dia) ---------- */
const FT_JOURNEYS = [
  { id: 'scotland-skye', foto: 'arte/f/eilean-donan.jpg', foto2: 'arte/f/glencoe-mist.jpg', reg: 'scotland', tour: 'scotland-skye', dias: 7, km: 950,
    rota: ['Edinburgh', 'Stirling', 'Glencoe', 'FortWilliam', 'EileanDonan', 'Skye', 'LochNess', 'Inverness'],
    nome: { en: 'Grand Scotland & the Isle of Skye', pt: 'Grande Escócia e a Ilha de Skye', it: 'Grande Scozia e l’Isola di Skye' },
    epoca: { en: 'May to September', pt: 'De maio a setembro', it: 'Da maggio a settembre' },
    lead: { en: 'Castles on lochs, valleys that look painted, single-track roads to the edge of the Atlantic. The Scotland people dream of — driven, guided and without a single train timetable to worry about.',
            pt: 'Castelos à beira de lagos, vales que parecem pintados, estradas estreitas até a beira do Atlântico. A Escócia dos sonhos — com motorista, com guia e sem nenhum horário de trem para se preocupar.',
            it: 'Castelli sui laghi, valli che sembrano dipinte, strade a una corsia fino all’Atlantico. La Scozia dei sogni — con autista, con guida e senza orari di treni.' },
    dia: [
      { en: ['Edinburgh', 'Arrival, the Royal Mile and the Castle at sunset.'], pt: ['Edimburgo', 'Chegada, a Royal Mile e o castelo ao pôr do sol.'], it: ['Edimburgo', 'Arrivo, il Royal Mile e il castello al tramonto.'] },
      { en: ['Stirling & the Trossachs', 'William Wallace country, lochs and the first glimpse of the Highlands.'], pt: ['Stirling e Trossachs', 'A terra de William Wallace, lagos e a primeira visão das Highlands.'], it: ['Stirling e Trossachs', 'La terra di William Wallace e i primi laghi.'] },
      { en: ['Glencoe', 'The most dramatic valley in Scotland, then Fort William under Ben Nevis.'], pt: ['Glencoe', 'O vale mais dramático da Escócia e depois Fort William, aos pés do Ben Nevis.'], it: ['Glencoe', 'La valle più spettacolare di Scozia, poi Fort William.'] },
      { en: ['Eilean Donan', 'The castle on the loch, and over the bridge to Skye.'], pt: ['Eilean Donan', 'O castelo no lago e a ponte para Skye.'], it: ['Eilean Donan', 'Il castello sul lago e il ponte per Skye.'] },
      { en: ['Isle of Skye', 'The Old Man of Storr, Quiraing and the Fairy Pools.'], pt: ['Ilha de Skye', 'Old Man of Storr, Quiraing e as Fairy Pools.'], it: ['Isola di Skye', 'Old Man of Storr, Quiraing e le Fairy Pools.'] },
      { en: ['Loch Ness', 'Urquhart Castle on the shore of the loch.'], pt: ['Loch Ness', 'O castelo de Urquhart às margens do lago.'], it: ['Loch Ness', 'Il castello di Urquhart sulla riva del lago.'] },
      { en: ['Inverness', 'The capital of the Highlands — fly or take the train home.'], pt: ['Inverness', 'A capital das Highlands — volta de avião ou trem.'], it: ['Inverness', 'La capitale delle Highlands — rientro in aereo o treno.'] },
    ] },
  { id: 'edinburgh-highlands', foto: 'arte/f/edinburgh.jpg', foto2: 'arte/f/highlands-loch.jpg', reg: 'scotland', tour: 'edinburgh-highlands', dias: 5, km: 620,
    rota: ['Edinburgh', 'Stirling', 'Glencoe', 'LochNess', 'Inverness'],
    nome: { en: 'Edinburgh & the Highlands', pt: 'Edimburgo e as Highlands', it: 'Edimburgo e le Highlands' },
    epoca: { en: 'All year (best April to October)', pt: 'O ano todo (melhor de abril a outubro)', it: 'Tutto l’anno (meglio da aprile a ottobre)' },
    lead: { en: 'Scotland’s greatest hits in five days: a capital with a castle on a volcano, the wild valleys of Glencoe and the legend of Loch Ness.',
            pt: 'O melhor da Escócia em cinco dias: uma capital com castelo sobre um vulcão, os vales selvagens de Glencoe e a lenda do Loch Ness.',
            it: 'Il meglio della Scozia in cinque giorni: una capitale con il castello su un vulcano, Glencoe e la leggenda di Loch Ness.' },
    dia: [
      { en: ['Edinburgh', 'Old Town, the Castle and the Royal Mile.'], pt: ['Edimburgo', 'Cidade Velha, o castelo e a Royal Mile.'], it: ['Edimburgo', 'Città vecchia, castello e Royal Mile.'] },
      { en: ['Edinburgh', 'Holyrood, Calton Hill and a whisky tasting.'], pt: ['Edimburgo', 'Holyrood, Calton Hill e degustação de whisky.'], it: ['Edimburgo', 'Holyrood, Calton Hill e degustazione di whisky.'] },
      { en: ['Stirling & Glencoe', 'Castles and the most famous valley in the Highlands.'], pt: ['Stirling e Glencoe', 'Castelos e o vale mais famoso das Highlands.'], it: ['Stirling e Glencoe', 'Castelli e la valle più famosa.'] },
      { en: ['Loch Ness', 'Urquhart Castle and a boat on the loch.'], pt: ['Loch Ness', 'O castelo de Urquhart e um barco no lago.'], it: ['Loch Ness', 'Il castello di Urquhart e un giro in barca.'] },
      { en: ['Inverness', 'Culloden battlefield and the way home.'], pt: ['Inverness', 'O campo de Culloden e a volta.'], it: ['Inverness', 'Culloden e il rientro.'] },
    ] },
  { id: 'classic-england', foto: 'arte/f/cotswolds.jpg', foto2: 'arte/f/bath.jpg', reg: 'england', tour: 'stonehenge-bath', dias: 5, km: 520,
    rota: ['London', 'Windsor', 'Oxford', 'Cotswolds', 'Bath', 'Stonehenge', 'London'],
    nome: { en: 'Classic England', pt: 'Inglaterra Clássica', it: 'Inghilterra Classica' },
    epoca: { en: 'All year', pt: 'O ano todo', it: 'Tutto l’anno' },
    lead: { en: 'Castles, colleges, golden villages and Roman baths — the English countryside in one loop from London, sleeping in charming inns along the way.',
            pt: 'Castelos, colégios, vilarejos dourados e termas romanas — o interior inglês numa volta a partir de Londres, dormindo em pousadas charmosas pelo caminho.',
            it: 'Castelli, college, villaggi dorati e terme romane — la campagna inglese in un giro da Londra.' },
    dia: [
      { en: ['Windsor', 'The King’s castle and St George’s Chapel.'], pt: ['Windsor', 'O castelo do rei e a Capela de São Jorge.'], it: ['Windsor', 'Il castello del Re e la cappella di San Giorgio.'] },
      { en: ['Oxford', 'Colleges, the Bodleian and the corners that became Hogwarts.'], pt: ['Oxford', 'Colégios, a Bodleian e os cantos que viraram Hogwarts.'], it: ['Oxford', 'College, Bodleian e gli angoli di Hogwarts.'] },
      { en: ['The Cotswolds', 'Bibury, Bourton-on-the-Water and Castle Combe.'], pt: ['Cotswolds', 'Bibury, Bourton-on-the-Water e Castle Combe.'], it: ['Cotswolds', 'Bibury, Bourton-on-the-Water e Castle Combe.'] },
      { en: ['Bath', 'The Roman Baths, the Royal Crescent and afternoon tea.'], pt: ['Bath', 'As termas romanas, o Royal Crescent e o chá da tarde.'], it: ['Bath', 'Terme romane, Royal Crescent e tè del pomeriggio.'] },
      { en: ['Stonehenge', 'The stones at first light, then back to London.'], pt: ['Stonehenge', 'As pedras de manhã cedo e a volta a Londres.'], it: ['Stonehenge', 'Le pietre all’alba, poi rientro a Londra.'] },
    ] },
  { id: 'paris', foto: 'arte/f/paris.jpg', foto2: 'arte/f/paris-sunset.jpg', reg: 'europe', tour: 'paris', dias: 3, km: 0,
    rota: ['London', 'Paris'],
    nome: { en: 'Paris via Eurostar', pt: 'Paris pelo Eurostar', it: 'Parigi in Eurostar' },
    epoca: { en: 'All year', pt: 'O ano todo', it: 'Tutto l’anno' },
    lead: { en: 'Two hours and sixteen minutes from St Pancras to the Gare du Nord. We drive you to the train; in Paris our partners take over — chauffeur, guide and the bookings that matter.',
            pt: 'Duas horas e dezesseis minutos de St Pancras à Gare du Nord. Levamos você até o trem; em Paris, nossos parceiros assumem — motorista, guia e as reservas que importam.',
            it: 'Due ore e sedici minuti da St Pancras alla Gare du Nord. Vi portiamo al treno; a Parigi i nostri partner pensano al resto.' },
    dia: [
      { en: ['London → Paris', 'Eurostar, a chauffeur at Gare du Nord and the Seine at sunset.'], pt: ['Londres → Paris', 'Eurostar, motorista na Gare du Nord e o Sena ao pôr do sol.'], it: ['Londra → Parigi', 'Eurostar, autista alla Gare du Nord e la Senna al tramonto.'] },
      { en: ['Paris', 'The Louvre without queues, Montmartre and the Eiffel Tower.'], pt: ['Paris', 'O Louvre sem fila, Montmartre e a Torre Eiffel.'], it: ['Parigi', 'Il Louvre senza code, Montmartre e la Tour Eiffel.'] },
      { en: ['Versailles → London', 'The palace in the morning, the train home in the evening.'], pt: ['Versalhes → Londres', 'O palácio de manhã e o trem de volta à noite.'], it: ['Versailles → Londra', 'La reggia al mattino, il treno la sera.'] },
    ] },
  { id: 'amsterdam', foto: 'arte/f/amsterdam.jpg', foto2: 'arte/f/amsterdam-houses.jpg', reg: 'europe', tour: 'amsterdam', dias: 3, km: 0,
    rota: ['London', 'Amsterdam'],
    nome: { en: 'Amsterdam & the Dutch countryside', pt: 'Amsterdã e o interior da Holanda', it: 'Amsterdam e la campagna olandese' },
    epoca: { en: 'April (tulips) to October', pt: 'De abril (tulipas) a outubro', it: 'Da aprile (tulipani) a ottobre' },
    lead: { en: 'Canals, the Rijksmuseum and the windmills of Zaanse Schans — a short European escape organised door to door.',
            pt: 'Canais, o Rijksmuseum e os moinhos de Zaanse Schans — uma escapada pela Europa organizada de porta a porta.',
            it: 'Canali, il Rijksmuseum e i mulini di Zaanse Schans — una fuga europea organizzata porta a porta.' },
    dia: [
      { en: ['London → Amsterdam', 'Eurostar or a short flight; a canal cruise at dusk.'], pt: ['Londres → Amsterdã', 'Eurostar ou voo curto; passeio de barco nos canais ao entardecer.'], it: ['Londra → Amsterdam', 'Eurostar o volo breve; crociera sui canali al tramonto.'] },
      { en: ['Amsterdam', 'Rijksmuseum, Van Gogh and the Jordaan.'], pt: ['Amsterdã', 'Rijksmuseum, Van Gogh e o Jordaan.'], it: ['Amsterdam', 'Rijksmuseum, Van Gogh e il Jordaan.'] },
      { en: ['Zaanse Schans → London', 'Windmills and cheese, then home.'], pt: ['Zaanse Schans → Londres', 'Moinhos e queijos, e a volta.'], it: ['Zaanse Schans → Londra', 'Mulini e formaggi, poi rientro.'] },
    ] },
];
const ftJ = (id) => FT_JOURNEYS.find(j => j.id === id);
const ftTxt = (o) => (o && (o[LANG] || o.en || o.pt)) || '';

/* ---------- a estrada (scroll 3D): as paradas com foto ---------- */
const FT_ROAD = [
  { c: 'London', foto: 'arte/f/big-ben-sunset-m.jpg', t: { en: 'London', pt: 'Londres', it: 'Londra' },
    d: { en: 'We start where you land: Heathrow, St Pancras or your hotel door in Mayfair.', pt: 'Começamos onde você chega: Heathrow, St Pancras ou a porta do seu hotel.', it: 'Partiamo da dove arrivi: Heathrow, St Pancras o la porta del tuo hotel.' } },
  { c: 'Windsor', foto: 'arte/f/windsor.jpg', t: { en: 'Windsor', pt: 'Windsor', it: 'Windsor' },
    d: { en: 'The oldest inhabited castle in the world, forty minutes away.', pt: 'O castelo habitado mais antigo do mundo, a quarenta minutos.', it: 'Il castello abitato più antico del mondo, a quaranta minuti.' } },
  { c: 'Stonehenge', foto: 'arte/f/stonehenge.jpg', t: { en: 'Stonehenge', pt: 'Stonehenge', it: 'Stonehenge' },
    d: { en: 'Five thousand years of mystery on Salisbury Plain.', pt: 'Cinco mil anos de mistério na planície de Salisbury.', it: 'Cinquemila anni di mistero nella piana di Salisbury.' } },
  { c: 'Bath', foto: 'arte/f/bath.jpg', t: { en: 'Bath', pt: 'Bath', it: 'Bath' },
    d: { en: 'Roman baths and honey-coloured Georgian crescents.', pt: 'Termas romanas e casas georgianas cor de mel.', it: 'Terme romane e case georgiane color miele.' } },
  { c: 'Cotswolds', foto: 'arte/f/cotswolds.jpg', t: { en: 'The Cotswolds', pt: 'Cotswolds', it: 'Cotswolds' },
    d: { en: 'Golden-stone villages, exactly as you imagine England.', pt: 'Vilarejos de pedra dourada, a Inglaterra que você imagina.', it: 'Villaggi di pietra dorata, l’Inghilterra che immagini.' } },
  { c: 'Oxford', foto: 'arte/f/oxford.jpg', t: { en: 'Oxford', pt: 'Oxford', it: 'Oxford' },
    d: { en: 'Nine centuries of colleges — and the halls of Hogwarts.', pt: 'Nove séculos de colégios — e os salões de Hogwarts.', it: 'Nove secoli di college — e le sale di Hogwarts.' } },
  { c: 'York', mudo: true }, { c: 'LakeDistrict', mudo: true },
  { c: 'Edinburgh', foto: 'arte/f/edinburgh.jpg', t: { en: 'Edinburgh', pt: 'Edimburgo', it: 'Edimburgo' },
    d: { en: 'North to Scotland: a castle on a volcano above the Royal Mile.', pt: 'Rumo à Escócia: um castelo sobre um vulcão, acima da Royal Mile.', it: 'Verso la Scozia: un castello su un vulcano sopra il Royal Mile.' } },
  { c: 'Stirling', mudo: true },
  { c: 'Glencoe', foto: 'arte/f/glencoe.jpg', t: { en: 'Glencoe', pt: 'Glencoe', it: 'Glencoe' },
    d: { en: 'The Highlands at their most dramatic. We stop wherever the light is right.', pt: 'As Highlands no auge. Paramos onde a luz estiver perfeita.', it: 'Le Highlands nella loro forma più drammatica.' } },
  { c: 'EileanDonan', foto: 'arte/f/eilean-donan.jpg', t: { en: 'Eilean Donan & Skye', pt: 'Eilean Donan e Skye', it: 'Eilean Donan e Skye' },
    d: { en: 'The castle on the loch, and over the bridge to the Isle of Skye.', pt: 'O castelo no lago e a ponte para a Ilha de Skye.', it: 'Il castello sul lago e il ponte per l’Isola di Skye.' } },
  { c: 'Skye', mudo: true },
];

/* ---------- caminho suave pelas cidades (Catmull-Rom → Bézier) ---------- */
function ftCaminho(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}
/* o mapa: terra, a rota e as cidades. opts.so = ids das cidades com nome */
function ftMapaSvg(rotaIds, opts = {}) {
  const M = FT_MAPA, C = M.cities;
  const pts = rotaIds.map(k => C[k]).filter(Boolean);
  const nomes = { London: 'London', Windsor: 'Windsor', Oxford: 'Oxford', Cotswolds: 'Cotswolds', Bath: 'Bath', Stonehenge: 'Stonehenge', York: 'York', LakeDistrict: 'Lake District',
    Edinburgh: 'Edinburgh', Stirling: 'Stirling', Glencoe: 'Glencoe', FortWilliam: 'Fort William', Skye: 'Isle of Skye', EileanDonan: 'Eilean Donan', LochNess: 'Loch Ness', Inverness: 'Inverness', Paris: 'Paris', Amsterdam: 'Amsterdam' };
  let rotulos = (opts.rotulos || rotaIds).filter((k, i, a) => a.indexOf(k) === i && C[k]);
  /* nomes muito perto um do outro se encavalam: fica o primeiro */
  if (opts.minDist) { const ok = []; rotulos.forEach(k => { if (!ok.some(o => Math.hypot(C[o][0] - C[k][0], C[o][1] - C[k][1]) < opts.minDist)) ok.push(k); }); rotulos = ok; }
  const fs = opts.fs ? ` style="font-size:${opts.fs}px"` : '';
  const vb = opts.vb || `0 0 ${M.W} ${M.H}`;
  return `<svg class="ft-mapa ${opts.cls || ''}" viewBox="${vb}" role="img" aria-label="${esc(opts.aria || 'Route map')}">
    <g class="ft-terra">${['IE', 'FR', 'BE', 'NL', 'GB'].map(k => M.paths[k] ? `<path d="${M.paths[k]}" class="t-${k}"/>` : '').join('')}</g>
    ${opts.europa ? `<g class="ft-europa"><path d="${ftCaminho([C.London, [655, 830], C.Paris])}"/><path d="${ftCaminho([C.London, [730, 640], C.Amsterdam])}"/></g>` : ''}
    <path class="ft-rota-base" d="${ftCaminho(pts)}"/>
    <path class="ft-rota" id="${opts.idRota || ''}" d="${ftCaminho(pts)}"/>
    <g class="ft-cidades">${rotulos.map(k => `<g class="ft-cid" data-c="${k}" transform="translate(${C[k][0]} ${C[k][1]})"><circle r="${opts.r || 5}"/><text x="${(opts.r || 5) * 2}" y="${(opts.r || 5) * .8}"${fs}>${nomes[k] || k}</text></g>`).join('')}</g>
    ${opts.carro ? `<g class="ft-carro" id="ftCarro"><circle r="13" class="ft-carro-halo"/><circle r="7"/></g>` : ''}
  </svg>`;
}

/* =====================================================
   A CAPA
   ===================================================== */
function ftTopo(transparente) {
  const MENU = [['ft-servicos', L4('Services', 'Serviços', 'Servizi')], ['ft-estrada', L4('The Road North', 'A estrada', 'La strada')],
    ['ft-viagens', L4('Journeys', 'Viagens', 'Viaggi')], ['ft-frota', L4('Fleet', 'Frota', 'Flotta')], ['ft-sobre', L4('About', 'Sobre', 'Chi siamo')]];
  const idiomas = `<div class="ft-langs" role="group" aria-label="Language">${['en', 'pt', 'it'].map(c =>
    `<button type="button" data-lang="${c}" class="${LANG === c ? 'on' : ''}" aria-pressed="${LANG === c}" title="${FT_LANG_NOME[c]}">${FT_FLAG[c]}<span>${c === 'pt' ? 'PT' : c.toUpperCase()}</span></button>`).join('')}</div>`;
  return `
  <a class="ft-pular" href="#ftConteudo">${L4('Skip to content', 'Pular para o conteúdo', 'Vai al contenuto')}</a>
  <header class="ft-top ${transparente ? '' : 'solido'}" id="ftTop">
    <div class="ft-wrap ft-top-in">
      <a class="ft-adm" href="#/adm" title="${L4('Team panel', 'Painel da equipe', 'Area riservata')}" aria-label="${L4('Team panel', 'Painel da equipe', 'Area riservata')}">${FT_IC.cadeado}<span>${L4('Panel', 'Painel', 'Area')}</span></a>
      <a class="ft-marca" href="#/" aria-label="FT Travel & Experiences — home"><img src="arte/ft-horizontal.png" alt="FT Travel & Experiences" width="300" height="63"></a>
      <nav class="ft-menu" aria-label="Main menu">${MENU.map(([id, n]) => `<a href="#/" data-ir="${id}">${n}</a>`).join('')}</nav>
      ${idiomas}
      <a class="ft-btn ft-btn-ouro ft-cta-top" href="#/roteiro">${L4('Plan my trip', 'Planejar a viagem', 'Pianifica il viaggio')}</a>
      <button type="button" class="ft-burger" id="ftAbre" aria-label="Menu" aria-expanded="false">${FT_IC.menu}</button>
    </div>
    <div class="ft-gaveta" id="ftGaveta" hidden>
      <button type="button" class="ft-fecha" id="ftFecha" aria-label="Close">${FT_IC.fecha}</button>
      ${MENU.map(([id, n]) => `<a href="#/" data-ir="${id}">${n}</a>`).join('')}
      ${idiomas}
      <a class="ft-btn ft-btn-ouro" href="#/roteiro">${L4('Plan my trip', 'Planejar a viagem', 'Pianifica il viaggio')}</a>
    </div>
  </header>`;
}

function viewHub() {
  const st = DB.settings;
  const cats = ((typeof CONTEUDO !== 'undefined' && CONTEUDO.categorias) || []);
  const live = Tours.live();
  const temCat = (id) => live.some(x => x.categoria === id);
  const email = st.emailPublico || GUIA_CFG.email || '';
  const insta = (st.insta || GUIA_CFG.insta || '').replace(/^@/, '');
  const faq = (Array.isArray(st.faq) ? st.faq : []).filter(f => ftTxt(f.p) && ftTxt(f.r));
  const SERV = [
    [FT_IC.carro, L4('Private chauffeur', 'Chauffeur particular', 'Autista privato'), L4('A Mercedes and your driver by the hour: shopping, meetings, dinners, the West End.', 'Um Mercedes e o seu motorista por hora: compras, reuniões, jantares, o West End.', 'Una Mercedes e il tuo autista a ore: shopping, riunioni, cene.'), 'chauffeur', 'mercedes-e'],
    [FT_IC.aviao, L4('Airport & rail transfers', 'Transfers de aeroporto e trem', 'Transfer da aeroporti e stazioni'), L4('Heathrow, Gatwick, St Pancras, Southampton — met with your name, flight tracked.', 'Heathrow, Gatwick, St Pancras, Southampton — com plaquinha e voo acompanhado.', 'Heathrow, Gatwick, St Pancras — con cartello e volo monitorato.'), 'transfer-aeroporto', 'tower-bridge'],
    [FT_IC.mapa, L4('Private day tours', 'Passeios privativos', 'Tour privati'), L4('Windsor, Oxford, Stonehenge, Bath, the Cotswolds — your driver is your guide.', 'Windsor, Oxford, Stonehenge, Bath, Cotswolds — o motorista é o seu guia.', 'Windsor, Oxford, Stonehenge, Bath — l’autista è la tua guida.'), 'tours', 'windsor'],
    [FT_IC.rota, L4('Multi-day journeys', 'Viagens de vários dias', 'Viaggi di più giorni'), L4('Scotland, England and Europe, planned day by day and driven door to door.', 'Escócia, Inglaterra e Europa, planejadas dia a dia, de porta a porta.', 'Scozia, Inghilterra ed Europa, pianificate giorno per giorno.'), 'viagens', 'eilean-donan'],
    [FT_IC.sino, L4('Concierge', 'Concierge', 'Concierge'), L4('Restaurants, West End shows, Harry Potter Studios, stadium tours, hotels.', 'Restaurantes, musicais, estúdios Harry Potter, tours de estádio, hotéis.', 'Ristoranti, spettacoli, studi Harry Potter, stadi, hotel.'), 'concierge', 'harry-potter'],
    [FT_IC.pasta, L4('Corporate & events', 'Empresas e eventos', 'Aziende ed eventi'), L4('Roadshows, delegations and VIP guests with a single point of contact.', 'Roadshows, delegações e convidados VIP com um único contato.', 'Roadshow, delegazioni e ospiti VIP con un solo referente.'), 'evento', 'hampton-court'],
  ];
  const PARA = [
    L4('You want the best of Britain without driving on the left', 'Quer o melhor da Grã-Bretanha sem dirigir do lado esquerdo', 'Vuoi il meglio della Gran Bretagna senza guidare a sinistra'),
    L4('You travel with family, parents or children and want it easy', 'Viaja com família, pais ou crianças e quer tudo fácil', 'Viaggi con la famiglia e vuoi tutto semplice'),
    L4('You have little time and want every hour to count', 'Tem pouco tempo e quer que cada hora valha', 'Hai poco tempo e vuoi che ogni ora conti'),
    L4('You want someone who speaks your language at your side', 'Quer alguém que fale a sua língua ao seu lado', 'Vuoi qualcuno che parli la tua lingua'),
    L4('You are celebrating something and want it to feel special', 'Está celebrando algo e quer que seja especial', 'Stai festeggiando e vuoi che sia speciale'),
  ];
  const PASSOS = [
    [L4('Tell us', 'Conte para a gente', 'Raccontaci'), L4('Dates, who is travelling and what you dream of seeing.', 'Datas, quem vem e o que vocês sonham ver.', 'Date, chi viaggia e cosa sogni di vedere.')],
    [L4('Your proposal', 'A sua proposta', 'La tua proposta'), L4('A day-by-day plan with the car, the route and the price.', 'Um plano dia a dia com o carro, a rota e o valor.', 'Un piano giorno per giorno con auto, percorso e prezzo.')],
    [L4('We book', 'A gente reserva', 'Prenotiamo noi'), L4('Hotels, tickets, trains and tables — handled for you.', 'Hotéis, ingressos, trens e restaurantes — resolvidos.', 'Hotel, biglietti, treni e ristoranti — pensiamo a tutto.')],
    [L4('You travel', 'Você viaja', 'Tu viaggi'), L4('A driver-guide at your side, and your trip kit on your phone.', 'Um motorista-guia ao seu lado e o kit da viagem no celular.', 'Un autista-guida al tuo fianco e il kit di viaggio sul telefono.')],
  ];
  const paradas = FT_ROAD.filter(s => !s.mudo);

  app.innerHTML = `<div class="ft">
  ${ftTopo(true)}
  <main id="ftConteudo">
  <section class="ft-hero" aria-labelledby="ftH1">
    <div class="ft-hero-img" id="ftHeroImg"><picture><source media="(max-width:700px)" srcset="arte/f/big-ben-sunset-m.jpg"><img src="arte/f/big-ben-sunset.jpg" alt="${L4('Big Ben and the Houses of Parliament at golden sunset from Westminster Bridge', 'O Big Ben e o Parlamento no pôr do sol dourado, vistos da ponte de Westminster', 'Il Big Ben e il Parlamento al tramonto dorato dal ponte di Westminster')}" fetchpriority="high"></picture></div>
    <div class="ft-hero-veu"></div>
    <div class="ft-wrap ft-hero-in">
      <p class="ft-olho">London · England · Scotland · Europe</p>
      <h1 id="ftH1" class="ft-linhas">${[L4('Britain,', 'A Grã-Bretanha,', 'La Gran Bretagna,'), `<em>${L4('beautifully driven.', 'com motorista e com história.', 'con autista e con storia.')}</em>`].map((l, i) => `<span class="ft-l"><span style="--i:${i}">${l}</span></span>`).join('')}</h1>
      <p class="ft-sub">${esc(ftTxt(st.homeText))}</p>
      <div class="ft-acoes">
        <a class="ft-btn ft-btn-ouro" href="#/roteiro">${L4('Plan my trip', 'Planejar a minha viagem', 'Pianifica il mio viaggio')}</a>
        <a class="ft-btn ft-btn-linha" href="#/" data-ir="ft-estrada">${L4('Take the road north', 'Percorra a estrada', 'Percorri la strada')} ${FT_IC.seta}</a>
      </div>
    </div>
    <a class="ft-rolar" href="#/" data-ir="ft-servicos" aria-label="${L4('Scroll down', 'Rolar para baixo', 'Scorri in basso')}"><span>${L4('Scroll', 'Role', 'Scorri')}</span><i></i></a>
    <div class="ft-hero-pe">
      <div class="ft-wrap ft-difs">
        <div><b>2008</b><small>${L4('in London since', 'em Londres desde', 'a Londra dal')}</small></div>
        <div><b>Mercedes</b><small>${L4('S, E & V-Class · TfL licensed', 'Classe S, E e V · licença TfL', 'Classe S, E e V · licenza TfL')}</small></div>
        <div><b>PT · EN · IT · ES</b><small>${L4('your language on board', 'a sua língua a bordo', 'la tua lingua a bordo')}</small></div>
        <div><b>5.0 ★</b><small>TripAdvisor</small></div>
      </div>
    </div>
  </section>

  <div class="ft-faixa" aria-hidden="true"><div>${Array(2).fill(['Westminster', 'Windsor', 'Stonehenge', 'Bath', 'The Cotswolds', 'Oxford', 'Edinburgh', 'Glencoe', 'Isle of Skye', 'Loch Ness', 'Paris', 'Amsterdam'].map(s => `<span>${s}</span><i>◆</i>`).join('')).join('')}</div></div>

  <section class="ft-sec" id="ft-servicos" aria-labelledby="ftServ">
    <div class="ft-wrap">
      <div class="ft-cab ft-rv"><span class="ft-rot">${L4('Services', 'Serviços', 'Servizi')}</span>
        <h2 id="ftServ">${L4('One number for <em>every road</em> in Britain.', 'Um contato para <em>todas as estradas</em> da Grã-Bretanha.', 'Un solo contatto per <em>ogni strada</em> della Gran Bretagna.')}</h2>
        <p>${L4('From the airport kerb to the Isle of Skye, everything is organised by the same people — and driven in the same comfort.', 'Do desembarque no aeroporto à Ilha de Skye, tudo organizado pelas mesmas pessoas — e com o mesmo conforto.', 'Dall’aeroporto all’Isola di Skye, tutto organizzato dalle stesse persone.')}</p></div>
      <div class="ft-servs">${SERV.map(([ic, b, p, k, f], i) => `<button type="button" class="ft-serv ft-rv" style="--d:${i * 70}ms" data-serv="${k}">
        <span class="ft-serv-foto"><img src="arte/f/${f}.jpg" alt="" loading="lazy"><span class="ft-ic">${ic}</span></span><b>${b}</b><span>${p}</span><span class="ft-mais">${L4('Discover', 'Conhecer', 'Scopri')} ${FT_IC.seta}</span></button>`).join('')}</div>
    </div>
  </section>

  <section class="ft-road" id="ft-estrada" aria-labelledby="ftRoad">
    <div class="ft-road-sticky">
      <div class="ft-road-stage" id="ftStage"><div class="ft-road-plano" id="ftPlano">${ftMapaSvg(FT_ROAD.map(s => s.c), { carro: true, idRota: 'ftRota', europa: true, rotulos: paradas.map(s => s.c).concat(['Paris', 'Amsterdam']), aria: 'From London to the Isle of Skye' })}</div></div>
      <div class="ft-road-cab"><span class="ft-rot">${L4('The Road North', 'A estrada para o norte', 'La strada verso nord')}</span>
        <h2 id="ftRoad">${L4('From Big Ben to <em>the Isle of Skye.</em>', 'Do Big Ben à <em>Ilha de Skye.</em>', 'Dal Big Ben <em>all’Isola di Skye.</em>')}</h2>
        <p class="ft-road-dica">${L4('Scroll — the car drives.', 'Role a página — o carro anda.', 'Scorri — l’auto guida.')}</p>
        <a class="ft-road-pular" href="#/" data-ir="ft-destinos">${L4('Skip the map', 'Pular o mapa', 'Salta la mappa')} ↓</a></div>
      <div class="ft-road-cartoes">${paradas.map((s, i) => `<article class="ft-parada" data-i="${i}">
        <img src="${s.foto}" alt="" loading="lazy"><div><span class="ft-n">${String(i + 1).padStart(2, '0')} / ${String(paradas.length).padStart(2, '0')}</span><h3>${esc(ftTxt(s.t))}</h3><p>${esc(ftTxt(s.d))}</p></div></article>`).join('')}
        <article class="ft-parada ft-parada-fim" data-i="${paradas.length}"><div><span class="ft-n">+ Europe</span><h3>${L4('And Europe, from London.', 'E a Europa, a partir de Londres.', 'E l’Europa, da Londra.')}</h3>
          <p>${L4('Paris and Amsterdam are a train ride away. We plan the whole journey.', 'Paris e Amsterdã ficam a uma viagem de trem. A gente planeja tudo.', 'Parigi e Amsterdam sono a un viaggio in treno. Pianifichiamo tutto noi.')}</p>
          <a class="ft-btn ft-btn-ouro" href="#/" data-ir="ft-viagens">${L4('See the journeys', 'Ver as viagens', 'Vedi i viaggi')}</a></div></article></div>
      <div class="ft-road-barra"><i id="ftBarra"></i></div>
    </div>
  </section>

  <section class="ft-sec" id="ft-destinos" aria-labelledby="ftDest">
    <div class="ft-wrap">
      <div class="ft-cab ft-rv"><span class="ft-rot">${L4('Destinations', 'Destinos', 'Destinazioni')}</span>
        <h2 id="ftDest">${L4('Where shall we <em>take you?</em>', 'Para onde vamos <em>levar você?</em>', 'Dove <em>ti portiamo?</em>')}</h2></div>
      <div class="ft-cats">${cats.map((c, i) => `<button type="button" class="ft-cat ft-rv ${i === 0 ? 'grande' : ''}" style="--d:${i * 60}ms" data-cat="${esc(c.id)}">
        <img src="${esc(c.foto)}" alt="" loading="lazy"><span><b>${esc(ftTxt(c.nome))}</b><small>${esc(ftTxt(c.desc))}</small>
        <span class="ft-mais">${temCat(c.id) ? L4('See experiences', 'Ver experiências', 'Vedi esperienze') : L4('Request a proposal', 'Pedir proposta', 'Richiedi proposta')} ${FT_IC.seta}</span></span></button>`).join('')}</div>
    </div>
  </section>

  <section class="ft-sec ft-areia" id="ft-viagens" aria-labelledby="ftViag">
    <div class="ft-wrap">
      <div class="ft-cab ft-cab-lado ft-rv"><div><span class="ft-rot">${L4('Signature journeys', 'Viagens assinadas', 'Viaggi firmati')}</span>
        <h2 id="ftViag">${L4('Days that become <em>the story of the trip.</em>', 'Dias que viram <em>a história da viagem.</em>', 'Giorni che diventano <em>la storia del viaggio.</em>')}</h2>
        <p>${L4('Planned day by day, driven door to door. Every journey can be shortened, stretched or mixed with another.', 'Planejadas dia a dia, de porta a porta. Toda viagem pode encurtar, crescer ou se misturar com outra.', 'Pianificati giorno per giorno, porta a porta. Ogni viaggio si può accorciare, allungare o combinare.')}</p></div>
        <div class="ft-setas"><button type="button" data-car="-1" aria-label="${L4('Previous', 'Anterior', 'Precedente')}">←</button><span id="ftCarN">01 / ${String(FT_JOURNEYS.length).padStart(2, '0')}</span><button type="button" data-car="1" aria-label="${L4('Next', 'Próxima', 'Successivo')}">→</button></div></div>
      <div class="ft-viagens" id="ftCarrossel" tabindex="0" aria-label="${L4('Journeys', 'Viagens', 'Viaggi')}">${FT_JOURNEYS.map((j, i) => `<a class="ft-viagem ft-rv" style="--d:${i * 80}ms" href="#/journey/${j.id}">
        <span class="ft-viagem-img"><img src="${j.foto}" alt="" loading="lazy"></span>
        <span class="ft-viagem-tx"><span class="ft-chips"><i>${j.dias} ${L4('days', 'dias', 'giorni')}</i><i>${j.rota.filter((k, ii, a) => a.indexOf(k) === ii).length} ${L4('stops', 'paradas', 'tappe')}</i></span>
        <b>${esc(ftTxt(j.nome))}</b><small>${esc(ftTxt(j.epoca))}</small><span class="ft-mais">${L4('View the journey', 'Ver a viagem', 'Vedi il viaggio')} ${FT_IC.seta}</span></span></a>`).join('')}</div>
    </div>
  </section>

  <section class="ft-sec" aria-labelledby="ftPara">
    <div class="ft-wrap ft-duas">
      <div class="ft-rv"><span class="ft-rot">${L4('Is this for you?', 'É para você?', 'Fa per te?')}</span>
        <h2 id="ftPara">${L4('Made for travellers who would rather <em>enjoy the view</em> than read the map.', 'Feito para quem prefere <em>curtir a paisagem</em> a ler o mapa.', 'Per chi preferisce <em>godersi il panorama</em> piuttosto che leggere la mappa.')}</h2>
        <ul class="ft-para">${PARA.map(p => `<li>${p}</li>`).join('')}</ul></div>
      <div class="ft-rv"><span class="ft-rot">${L4('How it works', 'Como funciona', 'Come funziona')}</span>
        <ol class="ft-passos">${PASSOS.map(([b, s], i) => `<li><span>${i + 1}</span><div><b>${b}</b><small>${s}</small></div></li>`).join('')}</ol>
        <a class="ft-btn ft-btn-ouro" href="#/roteiro">${L4('Start my proposal', 'Começar a minha proposta', 'Inizia la mia proposta')}</a></div>
    </div>
  </section>

  <section class="ft-sol" aria-label="FT">
    <div class="ft-sol-faixa"><div>${Array(2).fill([L4('Your driver', 'O seu motorista', 'Il tuo autista'), L4('Your language', 'A sua língua', 'La tua lingua'), L4('Your pace', 'O seu ritmo', 'Il tuo ritmo'), L4('Your Britain', 'A sua Grã-Bretanha', 'La tua Gran Bretagna')].map(s => `<span>${s}</span><img src="arte/ft-mark-escura.png" alt="">`).join('')).join('')}</div></div>
  </section>

  <section class="ft-frota" id="ft-frota" aria-labelledby="ftFrota">
    <img class="ft-frota-img" src="arte/f/mercedes.jpg" alt="${L4('A black Mercedes saloon', 'Um Mercedes sedã preto', 'Una berlina Mercedes nera')}" loading="lazy">
    <div class="ft-wrap ft-frota-in ft-rv">
      <span class="ft-rot">${L4('The fleet', 'A frota', 'La flotta')}</span>
      <h2 id="ftFrota">${L4('Quiet cabins. Spotless cars. <em>Always a Mercedes.</em>', 'Cabine silenciosa. Carro impecável. <em>Sempre um Mercedes.</em>', 'Abitacolo silenzioso. Auto impeccabili. <em>Sempre una Mercedes.</em>')}</h2>
      <div class="ft-carros">
        <div><b>S-Class</b><small>${L4('The flagship · up to 3 guests', 'O topo de linha · até 3 pessoas', 'L’ammiraglia · fino a 3 ospiti')}</small></div>
        <div><b>E-Class</b><small>${L4('Couples & executives · up to 3', 'Casais e executivos · até 3', 'Coppie e manager · fino a 3')}</small></div>
        <div><b>V-Class AMG</b><small>${L4('Families & groups · up to 7', 'Famílias e grupos · até 7', 'Famiglie e gruppi · fino a 7')}</small></div>
      </div>
      <p class="ft-frota-p">${L4('TfL licensed and fully insured. Wi-Fi, bottled water, umbrellas and child seats on request. Cleaned after every journey.', 'Licenciados pela TfL e com seguro completo. Wi-Fi, água, guarda-chuva e cadeirinha sob pedido. Limpos depois de cada serviço.', 'Licenza TfL e assicurazione completa. Wi-Fi, acqua, ombrelli e seggiolini su richiesta.')}</p>
    </div>
  </section>

  <section class="ft-sec" id="ft-sobre" aria-labelledby="ftSobre">
    <div class="ft-wrap ft-sobre">
      <div class="ft-sobre-fotos ft-rv"><img src="arte/f/westminster-arch.jpg" alt="" loading="lazy"><img src="arte/f/edinburgh-close.jpg" alt="" loading="lazy"></div>
      <div class="ft-rv"><span class="ft-rot">${L4('About FT', 'Sobre a FT', 'Chi siamo')}</span>
        <h2 id="ftSobre" class="ft-serif">${L4('Local knowledge. <em>Brazilian warmth.</em>', 'Conhecimento local. <em>Calor brasileiro.</em>', 'Conoscenza locale. <em>Calore brasiliano.</em>')}</h2>
        ${ftTxt(st.bio).split(/\n\s*\n/).filter(Boolean).slice(0, 2).map(p => `<p class="ft-lead">${esc(p)}</p>`).join('')}
        <blockquote class="ft-citacao">${L4('“Do it so well that people want to come back — and bring others with them.”', '“Faça tão bem feito que as pessoas queiram voltar — e trazer outras com elas.”', '“Fallo così bene che la gente voglia tornare — e portare altri con sé.”')}<cite>Roberto Rivelino</cite></blockquote>
      </div>
    </div>
  </section>

  <section class="ft-sec ft-claro" aria-labelledby="ftAval">
    <div class="ft-wrap ft-aval ft-rv">
      <div><span class="ft-rot">${L4('Reviews', 'Avaliações', 'Recensioni')}</span>
        <h2 id="ftAval">${L4('Five stars, <em>every road.</em>', 'Cinco estrelas <em>em todas as estradas.</em>', 'Cinque stelle <em>su ogni strada.</em>')}</h2>
        <p>${L4('Travellers rate FT 5.0 on TripAdvisor — for the drivers, the cars and the care.', 'Os viajantes dão nota 5,0 à FT no TripAdvisor — pelos motoristas, pelos carros e pelo cuidado.', 'I viaggiatori danno a FT 5,0 su TripAdvisor — per gli autisti, le auto e la cura.')}</p></div>
      <div class="ft-nota"><b>5.0</b><span class="ft-estrelas">${FT_IC.estrela.repeat(5)}</span><small>TripAdvisor</small>
        <a class="ft-btn ft-btn-linha" href="https://www.tripadvisor.com/Attraction_Review-g186338-d10024491-Reviews-Freddy_Turismo-London_England.html" target="_blank" rel="noopener">${L4('Read the reviews', 'Ler as avaliações', 'Leggi le recensioni')} ↗</a>
        <a class="ft-btn ft-btn-linha" href="#/avaliacoes">${L4('Leave a review', 'Deixar a minha', 'Lascia la tua')}</a></div>
    </div>
  </section>

  ${faq.length ? `<section class="ft-sec" aria-labelledby="ftFaq"><div class="ft-wrap"><div class="ft-cab"><span class="ft-rot">FAQ</span><h2 id="ftFaq">${L4('Good to know', 'Bom saber', 'Da sapere')}</h2></div>
    <div class="ft-faq">${faq.map(f => `<details><summary>${esc(ftTxt(f.p))}</summary><p>${esc(ftTxt(f.r)).replace(/\n/g, '<br>')}</p></details>`).join('')}</div></div></section>` : ''}

  <section class="ft-final" aria-labelledby="ftFinal">
    <img src="arte/f/highlands-sunset.jpg" alt="" loading="lazy">
    <div class="ft-wrap ft-rv">
      <img class="ft-final-mark" src="arte/ft-mark.png" alt="" width="84" height="84">
      <h2 id="ftFinal">${L4('Where does <em>your road</em> begin?', 'Onde começa <em>a sua estrada?</em>', 'Dove inizia <em>la tua strada?</em>')}</h2>
      <p>${L4('Tell us when you arrive and what you would love to see. We answer the same day.', 'Conte quando chega e o que gostaria de ver. A gente responde no mesmo dia.', 'Dicci quando arrivi e cosa ti piacerebbe vedere. Rispondiamo in giornata.')}</p>
      <div class="ft-acoes"><a class="ft-btn ft-btn-ouro" href="#/roteiro">${L4('Plan my trip', 'Planejar a viagem', 'Pianifica il viaggio')}</a>
        <a class="ft-btn ft-btn-linha" href="${esc(waLink(L4('Hello Roberto! I would like to plan a trip with FT.', 'Olá, Roberto! Quero planejar uma viagem com a FT.', 'Ciao Roberto! Vorrei organizzare un viaggio con FT.')))}" target="_blank" rel="noopener">${ICONE_WA} WhatsApp</a></div>
    </div>
  </section>
  </main>
  ${ftRodape(email, insta)}
  </div>`;

  ftLiga();
  $$('[data-cat]', app).forEach(b => b.onclick = () => {
    const id = b.dataset.cat;
    if (temCat(id)) { viewShowcase._c = id; viewShowcase._f = 'all'; go('/tours'); return; }
    const R = roteiroEstado(); if (!R.gosto.includes(id)) R.gosto.push(id); go('/roteiro');
  });
  $$('[data-serv]', app).forEach(b => b.onclick = () => {
    const k = b.dataset.serv, R = roteiroEstado();
    if (k === 'tours') { viewShowcase._c = 'england'; viewShowcase._f = 'all'; return go('/tours'); }
    if (k === 'viagens') return document.getElementById('ft-viagens').scrollIntoView({ behavior: 'smooth' });
    if (Tours.get(k) && Tours.get(k).status !== 'draft') return go('/tour/' + k);
    const precisa = { concierge: 'ingressos', evento: 'evento' }[k];
    if (precisa && !R.precisa.includes(precisa)) R.precisa.push(precisa);
    go('/roteiro');
  });
  ftEstrada();
}

function ftRodape(email, insta) {
  const st = DB.settings;
  email = email || st.emailPublico || GUIA_CFG.email || '';
  insta = insta || (st.insta || GUIA_CFG.insta || '').replace(/^@/, '');
  return `<footer class="ft-rodape">
    <div class="ft-wrap ft-rodape-in">
      <div><img src="arte/ft-logo.png" alt="FT Travel & Experiences" width="220" height="160" loading="lazy">
        <p>${L4('Chauffeur, concierge and private journeys across England, Scotland and Europe.', 'Chauffeur, concierge e viagens privativas pela Inglaterra, Escócia e Europa.', 'Autista, concierge e viaggi privati in Inghilterra, Scozia ed Europa.')}</p></div>
      <div><h3>${L4('Journeys', 'Viagens', 'Viaggi')}</h3>${FT_JOURNEYS.map(j => `<a href="#/journey/${j.id}">${esc(ftTxt(j.nome))}</a>`).join('')}</div>
      <div><h3>FT</h3><a href="#/tours">${L4('All experiences', 'Todas as experiências', 'Tutte le esperienze')}</a><a href="#/roteiro">${L4('Tailor-made trip', 'Viagem sob medida', 'Viaggio su misura')}</a><a href="#/about">${L4('About Roberto', 'Sobre o Roberto', 'Chi è Roberto')}</a><a href="#/avaliacoes">${L4('Reviews', 'Avaliações', 'Recensioni')}</a></div>
      <div><h3>${L4('Contact', 'Contato', 'Contatti')}</h3>
        <a href="${esc(waLink(t('waHello')))}" target="_blank" rel="noopener">WhatsApp ${esc(foneBonito(waNum()))}</a>
        ${email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : ''}
        ${insta ? `<a href="https://instagram.com/${esc(insta)}" target="_blank" rel="noopener">@${esc(insta)}</a>` : ''}
        <span>London, United Kingdom</span></div>
      <p class="ft-gigante" aria-hidden="true">FT <em>Travel &amp; Experiences</em></p>
      <div class="ft-base"><span>© ${new Date().getFullYear()} FT Travel & Experiences · Freddy Turismo Ltd</span>
        <span><a href="privacidade.html">${L4('Privacy', 'Privacidade', 'Privacy')}</a> · <span class="ft-creditos">${L4('Photos: Unsplash and Wikimedia Commons contributors (CC BY / CC BY-SA)', 'Fotos: Unsplash e colaboradores do Wikimedia Commons (CC BY / CC BY-SA)', 'Foto: Unsplash e Wikimedia Commons (CC BY / CC BY-SA)')}</span>
        · <a class="ft-painel" href="#/adm">${FT_IC.cadeado} ${L4('Team panel', 'Painel da equipe', 'Area riservata')}</a></span></div>
    </div>
  </footer>`;
}

/* cabeçalho, gaveta, idiomas, rolagem até a seção, revelar ao rolar */
function ftLiga() {
  bindLang(app);
  const gav = document.getElementById('ftGaveta'), abre = document.getElementById('ftAbre');
  if (gav && abre) {
    const gaveta = (on) => { gav.hidden = !on; abre.setAttribute('aria-expanded', on); document.documentElement.classList.toggle('vt-trava', on); };
    abre.onclick = () => gaveta(true);
    document.getElementById('ftFecha').onclick = () => gaveta(false);
    gav.addEventListener('click', (e) => { if (e.target.closest('a')) gaveta(false); });
  }
  $$('[data-ir]', app).forEach(a => a.onclick = (e) => {
    e.preventDefault();
    const go2 = () => { const el = document.getElementById(a.dataset.ir); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
    if (!document.getElementById(a.dataset.ir)) { location.hash = '#/'; setTimeout(go2, 120); } else go2();
  });
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.ft-rv', app).forEach(el => io.observe(el));
  /* carrossel das viagens: setas + contador */
  const car = document.getElementById('ftCarrossel'), num = document.getElementById('ftCarN');
  if (car) {
    const passo = () => { const c = car.querySelector('.ft-viagem'); return c ? c.getBoundingClientRect().width + 22 : 320; };
    $$('[data-car]', app).forEach(b => b.onclick = () => car.scrollBy({ left: passo() * Number(b.dataset.car), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
    const conta = () => { if (!num) return; const n = car.querySelectorAll('.ft-viagem').length; const i = Math.min(n, Math.round(car.scrollLeft / passo()) + 1); num.textContent = String(i).padStart(2, '0') + ' / ' + String(n).padStart(2, '0'); };
    car.addEventListener('scroll', () => requestAnimationFrame(conta), { passive: true });
    car.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); car.scrollBy({ left: passo() * (e.key === 'ArrowRight' ? 1 : -1), behavior: 'smooth' }); } });
  }
  /* menu acompanha a seção visível */
  const links = $$('.ft-menu a[data-ir]', app);
  if (links.length) {
    const spy = new IntersectionObserver((es) => es.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('ativo', a.dataset.ir === e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => { const el = document.getElementById(a.dataset.ir); if (el) spy.observe(el); });
  }
}
/* o cabeçalho fica sólido quando a foto passa; a foto da capa sobe devagar */
addEventListener('scroll', () => {
  const t = document.getElementById('ftTop'); if (t && !t.dataset.fixo) t.classList.toggle('solido', scrollY > 60);
  const h = document.getElementById('ftHeroImg');
  if (h && scrollY < innerHeight * 1.2 && !matchMedia('(prefers-reduced-motion: reduce)').matches) h.style.transform = `translate3d(0, ${scrollY * 0.28}px, 0) scale(${1.06 + scrollY * 0.00012})`;
}, { passive: true });

/* =====================================================
   A ESTRADA — o mapa 3D que a rolagem percorre
   ===================================================== */
function ftEstrada() {
  const sec = document.getElementById('ft-estrada'), stage = document.getElementById('ftStage'), plano = document.getElementById('ftPlano');
  const rota = document.getElementById('ftRota'), carro = document.getElementById('ftCarro'), barra = document.getElementById('ftBarra');
  if (!sec || !rota || !plano) return;
  const L = rota.getTotalLength();
  const cartoes = [...sec.querySelectorAll('.ft-parada')];
  const paradas = FT_ROAD.filter(s => !s.mudo);
  /* em que ponto da rota fica cada parada (procura o ponto mais perto da cidade) */
  const amostra = []; for (let i = 0; i <= 400; i++) { const p = rota.getPointAtLength(L * i / 400); amostra.push([p.x, p.y]); }
  let ultimo = 0;
  const marcos = paradas.map(s => {
    const c = FT_MAPA.cities[s.c]; let best = ultimo, bd = 1e9;
    for (let i = ultimo; i <= 400; i++) { const d = Math.hypot(amostra[i][0] - c[0], amostra[i][1] - c[1]); if (d < bd) { bd = d; best = i; } }
    ultimo = best; return best / 400;
  });
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  rota.style.strokeDasharray = L; rota.style.strokeDashoffset = reduz ? 0 : L;
  const cids = [...sec.querySelectorAll('.ft-cid')];
  let alvo = 0, atual = 0, rodando = false;
  const mede = () => {
    const r = sec.getBoundingClientRect(), total = sec.offsetHeight - innerHeight;
    alvo = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
    if (!rodando) { rodando = true; requestAnimationFrame(passo); }
  };
  const ease = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  function passo() {
    atual += (alvo - atual) * (reduz ? 1 : 0.12);
    if (Math.abs(alvo - atual) < 0.0005) atual = alvo;
    desenha(atual);
    if (atual !== alvo) requestAnimationFrame(passo); else rodando = false;
  }
  function desenha(p) {
    /* 0–0.06: o mapa inteiro aparece; 0.06–0.9: a rota; 0.9–1: abre para a Europa */
    const pr = Math.min(1, Math.max(0, (p - 0.06) / 0.84));
    const fim = Math.min(1, Math.max(0, (p - 0.9) / 0.1)), ini = Math.min(1, p / 0.06);
    const pt = rota.getPointAtLength(L * pr);
    const W = stage.clientWidth, H = stage.clientHeight, mob = W < 760;
    const zoom = (mob ? 1.15 : 1.55) * (0.62 + 0.38 * ease(ini)) * (1 - (mob ? 0.5 : 0.56) * ease(fim));
    const tilt = 50 * ease(ini) * (1 - 0.35 * ease(fim)), giro = -10 * ease(ini) + 6 * ease(fim);
    const fx = pt.x + (FT_MAPA.W * 0.55 - pt.x) * ease(fim), fy = pt.y + (FT_MAPA.H * 0.52 - pt.y) * ease(fim);
    const cx = mob ? W * 0.5 : W * 0.38, cy = mob ? H * 0.42 : H * 0.55;
    plano.style.transformOrigin = `${fx}px ${fy}px`;
    plano.style.transform = `translate3d(${cx - fx}px, ${cy - fy}px, 0) rotateX(${tilt}deg) rotateZ(${giro}deg) scale(${zoom})`;
    rota.style.strokeDashoffset = reduz ? 0 : L * (1 - pr);
    if (carro) carro.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    if (barra) barra.style.transform = `scaleX(${p})`;
    sec.style.setProperty('--europa', ease(fim));
    let ativo = 0; marcos.forEach((m, i) => { if (pr >= m - 0.015) ativo = i; });
    if (fim > 0.55) ativo = paradas.length;
    cartoes.forEach((c, i) => c.classList.toggle('on', i === ativo));
    cids.forEach(g => { const i = paradas.findIndex(s => s.c === g.dataset.c); g.classList.toggle('passou', i >= 0 && i <= ativo); g.classList.toggle('aqui', i === ativo); });
  }
  addEventListener('scroll', mede, { passive: true });
  addEventListener('resize', mede);
  mede(); desenha(0);
}

/* =====================================================
   A PÁGINA DE CADA VIAGEM (#/journey/<id>)
   ===================================================== */
function viewJourney(id) {
  const j = ftJ(id);
  if (!j) { go('/'); return; }
  const unicos = j.rota.filter((k, i, a) => a.indexOf(k) === i);
  const europa = j.reg === 'europe';
  const OFERTA = [
    [L4('Fully chauffeured', 'Com motorista o tempo todo', 'Con autista per tutto il viaggio'), L4('Your driver-guide and the same Mercedes from the first day to the last.', 'O seu motorista-guia e o mesmo Mercedes do primeiro ao último dia.', 'Il tuo autista-guida e la stessa Mercedes dal primo all’ultimo giorno.')],
    [L4('Chauffeur + local guides', 'Motorista + guias locais', 'Autista + guide locali'), L4('Expert guides join you in each city for the visits that deserve them.', 'Guias especialistas em cada cidade, nas visitas que pedem.', 'Guide esperte in ogni città per le visite che lo meritano.')],
    [L4('Your own plan', 'O seu roteiro', 'Il tuo itinerario'), L4('Prefer trains or self-drive? We design the route and make every booking.', 'Prefere trem ou dirigir? A gente desenha a rota e faz todas as reservas.', 'Preferisci treni o guida autonoma? Disegniamo il percorso e prenotiamo tutto.')],
  ];
  const tour = Tours.get(j.tour);
  const C = FT_MAPA.cities, xs = unicos.map(k => C[k][0]), ys = unicos.map(k => C[k][1]);
  const pad = 70, x0 = Math.max(0, Math.min(...xs) - pad), y0 = Math.max(0, Math.min(...ys) - pad), x1 = Math.max(...xs) + pad * 2.2, y1 = Math.max(...ys) + pad;
  const w = Math.max(x1 - x0, 260), h = Math.max(y1 - y0, 220);
  app.innerHTML = `<div class="ft">
  ${ftTopo(true)}
  <main class="ft-jr">
    <section class="ft-jr-hero"><img src="${j.foto}" alt="" fetchpriority="high"><div class="ft-hero-veu"></div>
      <div class="ft-wrap"><a class="ft-volta" href="#/" data-ir="ft-viagens">← ${L4('All journeys', 'Todas as viagens', 'Tutti i viaggi')}</a>
        <p class="ft-olho">${j.dias} ${L4('days', 'dias', 'giorni')} · ${unicos.length} ${L4('stops', 'paradas', 'tappe')}</p>
        <h1>${esc(ftTxt(j.nome))}</h1><p class="ft-sub">${esc(ftTxt(j.lead))}</p>
        <a class="ft-btn ft-btn-ouro" href="#/roteiro" id="jrPedir">${L4('Request this journey', 'Quero esta viagem', 'Richiedi questo viaggio')}</a></div></section>
    <section class="ft-sec"><div class="ft-wrap ft-jr-grade">
      <div>
        <div class="ft-fatos ft-rv">
          <div><small>${L4('Duration', 'Duração', 'Durata')}</small><b>${j.dias} ${L4('days', 'dias', 'giorni')}</b></div>
          <div><small>${L4('Best season', 'Melhor época', 'Stagione migliore')}</small><b>${esc(ftTxt(j.epoca))}</b></div>
          <div><small>${europa ? L4('Getting there', 'Como vamos', 'Come arrivare') : L4('Distance', 'Distância', 'Distanza')}</small><b>${europa ? 'Eurostar' : '≈ ' + j.km + ' km'}</b></div>
          <div><small>${L4('Car', 'Carro', 'Auto')}</small><b>Mercedes E / V-Class</b></div>
        </div>
        <h2 class="ft-h2 ft-rv">${L4('Day by day', 'Dia a dia', 'Giorno per giorno')}</h2>
        <ol class="ft-dias">${j.dia.map((d, i) => { const x = d[LANG] || d.en; return `<li class="ft-rv"><span>${L4('Day', 'Dia', 'Giorno')} ${i + 1}</span><div><b>${esc(x[0])}</b><p>${esc(x[1])}</p></div></li>`; }).join('')}</ol>
        <h2 class="ft-h2 ft-rv">${L4('How we can do it', 'Como podemos fazer', 'Come possiamo farlo')}</h2>
        <div class="ft-ofertas">${OFERTA.map(([b, s]) => `<div class="ft-rv"><b>${b}</b><small>${s}</small></div>`).join('')}</div>
        <p class="ft-nota-preco">${tour && tour.priceNote ? esc(ftTxt(tour.priceNote)) : L4('On request: every journey is built around you.', 'Sob consulta: cada viagem é montada para você.', 'Su richiesta: ogni viaggio è costruito per te.')}</p>
      </div>
      <aside class="ft-jr-lado">
        <div class="ft-jr-mapa ft-rv">${ftMapaSvg(j.rota, { vb: `${x0} ${y0} ${w} ${h}`, cls: 'ft-mapa-plano', europa: europa, minDist: w / 5.5, fs: Math.max(7, w / 26), r: Math.max(2.5, w / 110) })}</div>
        <img class="ft-jr-foto2 ft-rv" src="${j.foto2}" alt="" loading="lazy">
        <div class="ft-jr-cta"><b>${L4('Shall we plan it?', 'Vamos planejar?', 'La pianifichiamo?')}</b><small>${L4('Tell us your dates — we reply the same day.', 'Conte as datas — respondemos no mesmo dia.', 'Dicci le date — rispondiamo in giornata.')}</small>
          <a class="ft-btn ft-btn-ouro" href="#/roteiro" id="jrPedir2">${L4('Request this journey', 'Quero esta viagem', 'Richiedi questo viaggio')}</a>
          <a class="ft-btn ft-btn-linha" target="_blank" rel="noopener" href="${esc(waLink(L4('Hello Roberto! I am interested in the journey: ', 'Olá, Roberto! Tenho interesse na viagem: ', 'Ciao Roberto! Mi interessa il viaggio: ') + ftTxt(j.nome)))}">${ICONE_WA} WhatsApp</a></div>
      </aside>
    </div></section>
  </main>
  ${ftRodape()}
  </div>`;
  ftLiga();
  const top = document.getElementById('ftTop'); if (top) { top.classList.add('solido'); }
  const pedir = () => { const R = roteiroEstado(); if (!R.gosto.includes(j.reg)) R.gosto.push(j.reg); R.obs = (L4('Journey: ', 'Viagem: ', 'Viaggio: ') + ftTxt(j.nome)); };
  ['jrPedir', 'jrPedir2'].forEach(k => { const b = document.getElementById(k); if (b) b.addEventListener('click', pedir); });
  document.title = ftTxt(j.nome) + ' · FT Travel & Experiences';
}
/* =====================================================
   SOBRE O ROBERTO (#/about) — a da Yalla falava dos Emirados
   ===================================================== */
function viewAbout() {
  const st = DB.settings;
  const momentos = ((typeof CONTEUDO !== 'undefined' && CONTEUDO.sobre && CONTEUDO.sobre.momentos) || []);
  app.innerHTML = `<div class="ft">
  ${ftTopo(true)}
  <main>
    <section class="ft-jr-hero ft-sobre-hero"><img src="arte/f/westminster-arch.jpg" alt=""><div class="ft-hero-veu"></div>
      <div class="ft-wrap"><p class="ft-olho">${L4('About FT', 'Sobre a FT', 'Chi siamo')}</p>
        <h1>${L4('Hello, I am Roberto.', 'Olá, eu sou o Roberto.', 'Ciao, sono Roberto.')}</h1>
        <p class="ft-sub">${L4('Brazilian, in London since 2008 — the driver, the guide and the person who answers your WhatsApp.', 'Brasileiro, em Londres desde 2008 — o motorista, o guia e quem responde o seu WhatsApp.', 'Brasiliano, a Londra dal 2008 — l’autista, la guida e chi risponde al tuo WhatsApp.')}</p></div></section>
    <section class="ft-sec"><div class="ft-wrap ft-sobre">
      <div class="ft-sobre-fotos ft-rv"><img src="arte/f/mercedes-detail.jpg" alt="" loading="lazy"><img src="arte/f/edinburgh-close.jpg" alt="" loading="lazy"></div>
      <div class="ft-rv">${ftTxt(st.bio).split(/\n\s*\n/).filter(Boolean).map(p => `<p class="ft-lead">${esc(p)}</p>`).join('')}
        <div class="ft-fatos" style="margin-top:30px"><div><small>${L4('In London since', 'Em Londres desde', 'A Londra dal')}</small><b>2008</b></div>
          <div><small>${L4('Languages', 'Idiomas', 'Lingue')}</small><b>PT · EN · IT · ES</b></div><div><small>${L4('Fleet', 'Frota', 'Flotta')}</small><b>Mercedes</b></div><div><small>TripAdvisor</small><b>5.0 ★</b></div></div>
        <blockquote class="ft-citacao">${L4('“Do it so well that people want to come back — and bring others with them.”', '“Faça tão bem feito que as pessoas queiram voltar — e trazer outras com elas.”', '“Fallo così bene che la gente voglia tornare — e portare altri con sé.”')}<cite>Roberto Rivelino</cite></blockquote>
        <div class="ft-acoes" style="animation:none"><a class="ft-btn ft-btn-ouro" href="#/roteiro">${L4('Plan my trip', 'Planejar a viagem', 'Pianifica il viaggio')}</a>
          <a class="ft-btn ft-btn-linha" href="${esc(waLink(L4('Hello Roberto!', 'Olá, Roberto!', 'Ciao Roberto!')))}" target="_blank" rel="noopener">${ICONE_WA} WhatsApp</a></div></div>
    </div></section>
    ${momentos.length ? `<section class="ft-sec ft-escuro"><div class="ft-wrap"><div class="ft-cab"><span class="ft-rot">${L4('On the road', 'Pela estrada', 'Sulla strada')}</span><h2>${L4('England, Scotland and beyond.', 'Inglaterra, Escócia e além.', 'Inghilterra, Scozia e oltre.')}</h2></div>
      <div class="ft-galeria">${momentos.map(f => `<img class="ft-rv" src="${esc(f)}" alt="" loading="lazy">`).join('')}</div></div></section>` : ''}
  </main>
  ${ftRodape()}
  </div>`;
  ftLiga();
}

window.ROTAS_EXTRA = window.ROTAS_EXTRA || {};
ROTAS_EXTRA.journey = (partes) => viewJourney(partes[0]);

/* o app.js já desenhou a tela ao carregar (com a capa antiga): redesenha com a da FT */
if (typeof route === 'function' && !/^#\/adm/.test(location.hash)) { try { route(); } catch (e) { console.error(e); } }
