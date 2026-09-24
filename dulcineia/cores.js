/* =====================================================
   CORES DA MARCA — Ajustes → Cores da marca
   Ela escolhe a cor PRINCIPAL e a de DESTAQUE, sempre dentro das 25 cores
   do manual (Studio Nama, v2.0) — por combinação pronta ou cor a cor. De fábrica: Moos + Cidra — pedido dela em
   24/09/2026: nada de verde com amarelo (bandeira do Brasil).

   Para cada escolha o app DERIVA os tons (texto, fundos, tema escuro) e
   garante contraste de leitura (testes/cores.test.js confere todas as
   253 combinações possíveis). A escolha mora em DB.settings.cores e vai para a nuvem:
   clientes e e-mails passam a usar as mesmas cores.
   ===================================================== */
'use strict';

const CORES_PADRAO = { principal: 'moos', destaque: 'cidra' };

/* ---------- cor: conta pura (também roda no teste, em Node) ---------- */
const corRgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const corHex = (rgb) => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const corMix = (a, b, t) => { const x = corRgb(a), y = corRgb(b); return corHex(x.map((v, i) => v + (y[i] - v) * t)); };
function corLum(h) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [r, g, b] = corRgb(h); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function corContraste(a, b) { const x = corLum(a), y = corLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
/* A PALETA COMPLETA do manual (p. 21), na mesma ordem da página: 5 colunas.
   primaria = as cores marcadas com o selo no manual (cores primárias). */
const PALETA = [
  { id: 'charcoal', nome: 'Charcoal', hex: '#171717' }, { id: 'navy', nome: 'Navy', hex: '#122E30' },
  { id: 'moos', nome: 'Moos', hex: '#293629', primaria: 1 }, { id: 'deep-purple', nome: 'Deep Purple', hex: '#362430', primaria: 1 },
  { id: 'bordeaux', nome: 'Bordeaux', hex: '#471F12' },
  { id: 'beige', nome: 'Beige', hex: '#ABA38F' }, { id: 'marine', nome: 'Marine', hex: '#264042' },
  { id: 'amazon', nome: 'Amazon', hex: '#47400F' }, { id: 'purple', nome: 'Purple', hex: '#5E3854' },
  { id: 'cacau', nome: 'Cacau', hex: '#7D3D21', primaria: 1 },
  { id: 'sand', nome: 'Sand', hex: '#E0D6C7', primaria: 1 }, { id: 'cold-blue', nome: 'Cold Blue', hex: '#668287' },
  { id: 'oliv', nome: 'Oliv', hex: '#82823D' }, { id: 'rioja', nome: 'Rioja', hex: '#874240' },
  { id: 'iron', nome: 'Iron', hex: '#A3452B' },
  { id: 'offwhite', nome: 'Offwhite', hex: '#E8E3DE' }, { id: 'sky', nome: 'Sky', hex: '#788C9E', primaria: 1 },
  { id: 'thymian', nome: 'Thymian', hex: '#808263' }, { id: 'dulce', nome: 'Dulce de Leche', hex: '#A17345', primaria: 1 },
  { id: 'orange', nome: 'Orange', hex: '#B25C38' },
  { id: 'branco', nome: 'Branco', hex: '#FFFFFF' }, { id: 'pale-blue', nome: 'Pale Blue', hex: '#BFCCCC' },
  { id: 'cidra', nome: 'Cidra', hex: '#B0B094', primaria: 1 }, { id: 'gold', nome: 'Gold', hex: '#8F7029', primaria: 1 },
  { id: 'oro', nome: 'Oro', hex: '#BA9430' },
];
/* principal = fundo de botões e barras: tem que aceitar texto claro por cima (11 das 25).
   destaque = selo e detalhes: qualquer uma, menos as duas cores de FUNDO do app (sumiriam). */
const podePrincipal = (c) => corContraste('#F6F3EF', c.hex) >= 4.5;
const podeDestaque = (c) => c.id !== 'branco' && c.id !== 'offwhite';
const PALETA_PRINCIPAL = PALETA.filter(podePrincipal);
const PALETA_DESTAQUE = PALETA.filter(podeDestaque);
/* combinações prontas: as duplas do manual (p. 23) — sem verde com amarelo, pedido dela */
const COMBINACOES = [
  { p: 'moos', d: 'cidra' }, { p: 'navy', d: 'dulce' }, { p: 'deep-purple', d: 'orange' }, { p: 'navy', d: 'sky' },
  { p: 'cacau', d: 'sand' }, { p: 'amazon', d: 'beige' }, { p: 'moos', d: 'sand' }, { p: 'charcoal', d: 'cidra' },
];
/* escurece (rumo ao preto) ou clareia (rumo ao branco) até ler bem sobre TODOS os fundos */
function corLegivel(h, fundos, alvo, rumo) {
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const c = corMix(h, rumo, t);
    if (fundos.every(f => corContraste(c, f) >= alvo)) return c;
  }
  return rumo;
}
/* leva a cor à luminância pedida, mantendo o tom (fundos do tema escuro) */
function corTom(h, alvo) {
  const rumo = corLum(h) > alvo ? '#000000' : '#FFFFFF';
  for (let t = 0; t <= 1.0001; t += 0.01) { const c = corMix(h, rumo, t); if (rumo === '#000000' ? corLum(c) <= alvo : corLum(c) >= alvo) return c; }
  return rumo;
}

/* fundo de etiqueta + a cor do texto por cima, com leitura garantida */
function preenchimento(D) {
  const tinta = (c) => corContraste('#171717', c) >= corContraste('#FFFFFF', c) ? '#171717' : '#FFFFFF';
  for (let t = 0; t <= 1.0001; t += 0.02)
    for (const rumo of ['#FFFFFF', '#000000']) {
      const c = corMix(D, rumo, t), ink = tinta(c);
      if (corContraste(ink, c) >= 4.5) return { fill: c, ink };
    }
  return { fill: D, ink: tinta(D) };
}

/* todas as variáveis de cor, claro e escuro, a partir das duas escolhas */
function derivaCores(P, D) {
  const PAPER = '#E8E3DE', SURF = '#F6F3EF', INK = '#171717', OFF = '#F6F3EF';
  /* o destaque como FUNDO de etiqueta: se nem texto preto nem branco leem
     bem nele (Dulce de Leche dá 4,3:1), mexe no tom o mínimo necessário.
     O selo continua na cor exata da marca (--brand-cidra). */
  const { fill: hl, ink: hlInk } = preenchimento(D);
  const hlWash = corMix(D, '#FFFFFF', 0.72);
  const claro = {
    '--brand-primaria': P, '--brand-assinatura': P, '--brand-cidra': D,
    '--accent': P, '--accent-ink': corContraste(OFF, P) >= 4.5 ? OFF : '#FFFFFF',
    '--accent-wash': corMix(P, '#FFFFFF', 0.84), '--accent-line': corMix(P, '#FFFFFF', 0.62),
    '--highlight': hl, '--highlight-ink': hlInk, '--highlight-wash': hlWash,
    '--highlight-text': corLegivel(D, [PAPER, SURF, hlWash], 4.5, '#000000'),
  };
  const dPaper = corTom(P, 0.016), dSurf = corTom(P, 0.028), dSurf2 = corTom(P, 0.038), dSurf3 = corTom(P, 0.056);
  const dWash = corMix(D, dPaper, 0.82);
  const escuro = {
    '--paper': dPaper, '--surface': dSurf, '--surface-2': dSurf2, '--surface-3': dSurf3,
    '--line': corTom(P, 0.034), '--line-2': corTom(P, 0.07),
    '--brand-primaria': P, '--brand-assinatura': corLegivel(D, [dPaper, dSurf], 4.5, '#FFFFFF'), '--brand-cidra': D,
    '--accent': '#E0D6C7', '--accent-ink': corLegivel(P, ['#E0D6C7'], 4.5, '#000000'),
    '--accent-wash': dSurf2, '--accent-line': corTom(P, 0.09),
    '--highlight': hl, '--highlight-ink': hlInk, '--highlight-wash': dWash,
    '--highlight-text': corLegivel(D, [dPaper, dSurf, dSurf2, dWash], 4.5, '#FFFFFF'),
    '--neutral-wash': dSurf2,
  };
  return { claro, escuro };
}

function coresEscolhidas() {
  const c = (typeof DB !== 'undefined' && DB && DB.settings && DB.settings.cores) || {};
  const p = PALETA_PRINCIPAL.find(x => x.id === c.principal) || PALETA.find(x => x.id === CORES_PADRAO.principal);
  const d = PALETA_DESTAQUE.find(x => x.id === c.destaque) || PALETA.find(x => x.id === CORES_PADRAO.destaque);
  return { p, d, padrao: p.id === CORES_PADRAO.principal && d.id === CORES_PADRAO.destaque };
}

/* aplica: de fábrica valem os tokens.css (afinados à mão); escolha nova vira um <style> por cima */
let coresChave = '';
function aplicaCores() {
  if (typeof document === 'undefined') return;
  const { p, d, padrao } = coresEscolhidas();
  const chave = p.id + '/' + d.id;
  if (chave === coresChave) return;
  coresChave = chave;
  let el = document.getElementById('coresMarca');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = p.hex;
  if (padrao) { if (el) el.remove(); return; }
  const { claro, escuro } = derivaCores(p.hex, d.hex);
  const css = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(';');
  if (!el) { el = document.createElement('style'); el.id = 'coresMarca'; document.head.appendChild(el); }
  el.textContent = `:root{${css(claro)}}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]):not([data-theme="dark"]){${css(escuro)}}}
:root[data-theme="dark"]{${css(escuro)}}`;
}

/* ---------- o cartão de Ajustes ----------
   Fácil em dois níveis: (1) combinações prontas — um toque e pronto;
   (2) "Montar a minha" — a grade de 25 cores igual à do manual: escolhe se
   está trocando a principal ou o destaque e toca na cor. A prévia muda na hora. */
let corModo = 'principal';
const corTextoSobre = (hex) => corContraste('#171717', hex) >= corContraste('#FFFFFF', hex) ? '#171717' : '#FFFFFF';
function corMini(p, d) {
  return `<span class="cpTopo" style="background:${p}"><span class="lg-mask" style="width:18px;height:20px;background:${d};-webkit-mask-image:url(arte/selo-capsula.svg);mask-image:url(arte/selo-capsula.svg)"></span><i style="background:${d}"></i></span>`;
}
/* o MOCKUP: um celular com a tela que o cliente vê, já nas cores escolhidas.
   As cores saem da mesma conta do app (derivaCores), não de um desenho à parte. */
function corMockup(p, d) {
  const v = derivaCores(p.hex, d.hex).claro;
  const foto = (typeof Tours !== 'undefined' && Tours.live()[0] && Tours.live()[0].photo) || 'home.jpg';
  const selo = (w, cor) => `<span class="lg-mask" style="width:${w}px;height:${Math.round(w * 1.1)}px;background:${cor};-webkit-mask-image:url(arte/selo-capsula.svg);mask-image:url(arte/selo-capsula.svg)"></span>`;
  return `<div class="corMock" aria-hidden="true" style="--mp:${p.hex};--mpi:${v['--accent-ink']};--mhl:${v['--highlight']};--mhli:${v['--highlight-ink']};--mhlt:${v['--highlight-text']};--mdd:${d.hex}">
    <div class="cmTela">
      <div class="cmTopo">${selo(20, d.hex)}<b>CONEXÃO <i>BERLIM</i></b></div>
      <div class="cmCorpo">
        <b class="cmTit">Escolha o seu passeio</b>
        <div class="cmChips"><i class="on">Berlim e arredores</i><i>📍 Potsdam</i></div>
        <div class="cmTour">
          <span class="cmFoto" style="background-image:url(${foto})"><em>Na cidade</em></span>
          <span class="cmTxt"><b>Berlim Histórico</b><small>Sob consulta</small></span>
        </div>
        <span class="cmBotao">Reservar</span>
      </div>
    </div>
  </div>`;
}
function cartaoCores() {
  const { p, d } = coresEscolhidas();
  const combo = (c) => {
    const P = PALETA.find(x => x.id === c.p), D = PALETA.find(x => x.id === c.d), on = c.p === p.id && c.d === d.id;
    return `<button type="button" class="corCombo ${on ? 'on' : ''}" data-combo="${c.p}:${c.d}" aria-pressed="${on}">
      ${corMini(P.hex, D.hex)}<span class="ccNome">${P.nome} + ${D.nome}${c.p === CORES_PADRAO.principal && c.d === CORES_PADRAO.destaque ? ' <small>padrão</small>' : ''}</span></button>`;
  };
  const ehCombo = COMBINACOES.some(c => c.p === p.id && c.d === d.id);
  const tile = (c) => {
    const pode = corModo === 'principal' ? podePrincipal(c) : podeDestaque(c);
    const on = (corModo === 'principal' ? p.id : d.id) === c.id;
    const tx = corTextoSobre(c.hex);
    return `<button type="button" class="corTile ${on ? 'on' : ''}" data-tile="${c.id}" ${pode ? '' : 'disabled'}
      aria-pressed="${on}" aria-label="${c.nome}${pode ? '' : ' — não serve de ' + (corModo === 'principal' ? 'cor principal' : 'destaque')}"
      style="background:${c.hex};color:${tx}">
      <span class="ctNome">${c.nome}</span>${c.primaria ? `<span class="ctSelo lg-mask" style="background:${tx};-webkit-mask-image:url(arte/selo-capsula.svg);mask-image:url(arte/selo-capsula.svg)"></span>` : ''}
      <span class="ctHex">${c.hex}</span>${on ? `<span class="ctOk" aria-hidden="true" style="background:${tx};color:${c.hex}">✓</span>` : ''}</button>`;
  };
  return `<section class="card" id="coresCard">
    <h3>Cores da marca</h3>
    <p class="why">Só cores do seu manual. A <b>principal</b> vai nos fundos e botões; o <b>destaque</b>, no selo e nos detalhes. Muda o app inteiro na hora — para você, para os seus clientes e nos e-mails.</p>
    <div class="corVista">
      ${corMockup(p, d)}
      <p class="corLegenda">Assim seus clientes veem<b>${p.nome} + ${d.nome}</b><small>Toque numa combinação abaixo: o celular muda na hora.</small></p>
    </div>
    <p class="corRot">Combinações prontas · um toque</p>
    <div class="corCombos">${COMBINACOES.map(combo).join('')}</div>
    <details class="corMontar" ${ehCombo ? '' : 'open'}>
      <summary><b>Montar a minha</b> <small>${p.nome} + ${d.nome}</small></summary>
      <div class="corModo" role="radiogroup" aria-label="O que você está trocando">
        <button type="button" role="radio" aria-checked="${corModo === 'principal'}" class="${corModo === 'principal' ? 'on' : ''}" data-modo="principal"><i style="background:${p.hex}"></i><span><b>Principal</b><small>${p.nome}</small></span></button>
        <button type="button" role="radio" aria-checked="${corModo === 'destaque'}" class="${corModo === 'destaque' ? 'on' : ''}" data-modo="destaque"><i style="background:${d.hex}"></i><span><b>Destaque</b><small>${d.nome}</small></span></button>
      </div>
      <p class="why">${corModo === 'principal' ? 'Toque na cor principal. As claras ficam apagadas: o texto dos botões não leria em cima delas.' : 'Toque na cor de destaque. Branco e Offwhite ficam de fora: sumiriam no fundo do app.'}</p>
      <div class="corPaleta">${PALETA.map(tile).join('')}</div>
    </details>
    <button type="button" class="mkLink" id="corPadrao">Voltar ao padrão (Moos + Cidra)</button>
  </section>`;
}
function ligaCartaoCores() {
  const card = document.getElementById('coresCard');
  if (!card) return;
  const redesenha = () => { const aberto = card.querySelector('.corMontar')?.open; card.outerHTML = cartaoCores(); const n = document.getElementById('coresCard'); if (aberto && n.querySelector('.corMontar')) n.querySelector('.corMontar').open = true; ligaCartaoCores(); };
  const grava = (novo) => {
    DB.settings.cores = { ...CORES_PADRAO, ...(DB.settings.cores || {}), ...novo };
    const { p, d } = coresEscolhidas();
    DB.settings.cores.p = p.hex; DB.settings.cores.d = d.hex;   /* o servidor (e-mails) usa o hex */
    if (typeof save === 'function') save();
    if (typeof cloudPushState === 'function') cloudPushState();
    aplicaCores(); redesenha();
    if (typeof toast === 'function') toast(`Cores: ${p.nome} + ${d.nome} ✓`);
  };
  card.querySelectorAll('[data-combo]').forEach(b => b.onclick = () => { const [pp, dd] = b.dataset.combo.split(':'); grava({ principal: pp, destaque: dd }); });
  card.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => { corModo = b.dataset.modo; redesenha(); });
  card.querySelectorAll('[data-tile]:not([disabled])').forEach(b => b.onclick = () => grava({ [corModo]: b.dataset.tile }));
  card.querySelector('#corPadrao').onclick = () => { corModo = 'principal'; grava({ ...CORES_PADRAO }); };
}

if (typeof module !== 'undefined') module.exports = { PALETA, PALETA_PRINCIPAL, PALETA_DESTAQUE, COMBINACOES, CORES_PADRAO, derivaCores, corContraste, corLum };
