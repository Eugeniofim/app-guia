/* =====================================================
   CORES DA MARCA — Ajustes → Cores da marca
   O guia escolhe a cor PRINCIPAL e a de DESTAQUE, dentro da paleta neutra
   do produto — por combinação pronta ou cor a cor.
   De fábrica (08/10/2026): Roxo + Laranja — pedido do Eugênio para sair do verde e amarelo.

   Para cada escolha o app DERIVA os tons (texto, fundos, tema escuro) e
   garante contraste de leitura (testes/cores.test.js confere todas as
   combinações possíveis). A escolha mora em DB.settings.cores e vai para a nuvem:
   clientes e e-mails passam a usar as mesmas cores.
   ===================================================== */
'use strict';

const CORES_PADRAO = { principal: 'roxo', destaque: 'laranja' };

/* ---------- cor: conta pura (também roda no teste, em Node) ---------- */
const corRgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const corHex = (rgb) => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const corMix = (a, b, t) => { const x = corRgb(a), y = corRgb(b); return corHex(x.map((v, i) => v + (y[i] - v) * t)); };
function corLum(h) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [r, g, b] = corRgb(h); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function corContraste(a, b) { const x = corLum(a), y = corLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
/* A PALETA do demo: as cores neutras do produto. O guia troca pela dele. */
const PALETA = [
  { id: 'verde', nome: 'Verde', hex: '#064c3f', primaria: 1 }, { id: 'petroleo', nome: 'Petróleo', hex: '#123B4F', primaria: 1 },
  { id: 'vinho', nome: 'Vinho', hex: '#6B1F3A', primaria: 1 }, { id: 'carvao', nome: 'Carvão', hex: '#1F2421', primaria: 1 },
  { id: 'amarelo', nome: 'Amarelo', hex: '#FFD23F', primaria: 1 }, { id: 'coral', nome: 'Coral', hex: '#F27059', primaria: 1 },
  { id: 'areia', nome: 'Areia', hex: '#E7C9A0', primaria: 1 }, { id: 'marfim', nome: 'Marfim', hex: '#FBF8F3', primaria: 1 },
  { id: 'roxo', nome: 'Roxo', hex: '#4A1D6E', primaria: 1 }, { id: 'laranja', nome: 'Laranja', hex: '#FF7A2F', primaria: 1 },
  { id: 'turquesa', nome: 'Turquesa', hex: '#0A7C85', primaria: 1 }, { id: 'agua', nome: 'Água', hex: '#7FE3E0', primaria: 1 },
];
/* principal = fundo de botões e barras: tem que aceitar texto claro por cima.
   destaque = selo e detalhes: qualquer uma, menos a cor de FUNDO do app (sumiria). */
const podePrincipal = (c) => corContraste('#FFFFFF', c.hex) >= 4.5;
const podeDestaque = (c) => c.id !== 'marfim';
const PALETA_PRINCIPAL = PALETA.filter(podePrincipal);
const PALETA_DESTAQUE = PALETA.filter(podeDestaque);
/* combinações prontas: pares com contraste garantido (cores.test.js confere) */
const COMBINACOES = [
  { p: 'roxo', d: 'laranja' }, { p: 'turquesa', d: 'agua' }, { p: 'verde', d: 'amarelo' }, { p: 'petroleo', d: 'areia' }, { p: 'vinho', d: 'areia' },
  { p: 'carvao', d: 'amarelo' }, { p: 'verde', d: 'coral' },
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
  const PAPER = '#FBF8F3', SURF = '#FFFFFF', INK = '#111111', OFF = '#FFFFFF';
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
  /* tema escuro: o tom da principal, apagado (cor pura no fundo cansa e
     derruba a leitura das legendas) — mesmas luminâncias do tokens.css */
  const B = corMix(P, '#1A1A1A', 0.6);
  const dPaper = corTom(B, 0.0066), dSurf = corTom(B, 0.010), dSurf2 = corTom(B, 0.013), dSurf3 = corTom(B, 0.02);
  const dWash = corMix(D, dPaper, 0.82);
  const escuro = {
    '--paper': dPaper, '--surface': dSurf, '--surface-2': dSurf2, '--surface-3': dSurf3,
    '--line': corTom(B, 0.018), '--line-2': corTom(B, 0.04),
    '--brand-primaria': P, '--brand-assinatura': corLegivel(D, [dPaper, dSurf], 4.5, '#FFFFFF'), '--brand-cidra': D,
    '--accent': D, '--accent-ink': corContraste('#0F1715', D) >= 4.5 ? '#0F1715' : '#FFFFFF',
    '--accent-wash': dSurf2, '--accent-line': corTom(B, 0.05),
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
   (2) "Montar a minha" — a grade com as cores do produto: escolhe se
   está trocando a principal ou o destaque e toca na cor. A prévia muda na hora. */
let corModo = 'principal';
const corTextoSobre = (hex) => corContraste('#111111', hex) >= corContraste('#FFFFFF', hex) ? '#111111' : '#FFFFFF';
function corMini(p, d) {
  return `<span class="cpTopo" style="background:${p}"><span class="lg-mask" style="width:18px;height:20px;background:${d};-webkit-mask-image:url(arte/monograma.png);mask-image:url(arte/monograma.png)"></span><i style="background:${d}"></i></span>`;
}
/* o MOCKUP: um celular com a tela que o cliente vê, já nas cores escolhidas.
   As cores saem da mesma conta do app (derivaCores), não de um desenho à parte. */
function corMockup(p, d) {
  const v = derivaCores(p.hex, d.hex).claro;
  const foto = (typeof Tours !== 'undefined' && Tours.live()[0] && Tours.live()[0].photo) || 'fotos/home-westminster.jpg';
  const selo = (w, cor) => `<span class="lg-mask" style="width:${w}px;height:${Math.round(w * 1.1)}px;background:${cor};-webkit-mask-image:url(arte/monograma.png);mask-image:url(arte/monograma.png)"></span>`;
  return `<div class="corMock" aria-hidden="true" style="--mp:${p.hex};--mpi:${v['--accent-ink']};--mhl:${v['--highlight']};--mhli:${v['--highlight-ink']};--mhlt:${v['--highlight-text']};--mdd:${d.hex}">
    <div class="cmTela">
      <div class="cmTopo">${selo(20, d.hex)}<b>LONDRES <i>COM A BIA</i></b></div>
      <div class="cmCorpo">
        <b class="cmTit">Escolha o seu passeio</b>
        <div class="cmChips"><i class="on">Londres</i><i>📍 Fora de Londres</i></div>
        <div class="cmTour">
          <span class="cmFoto" style="background-image:url(${foto})"><em>A pé</em></span>
          <span class="cmTxt"><b>Londres Clássica</b><small>a partir de £360 pelo grupo</small></span>
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
      <span class="ctNome">${c.nome}</span>${c.primaria ? `<span class="ctSelo lg-mask" style="background:${tx};-webkit-mask-image:url(arte/monograma.png);mask-image:url(arte/monograma.png)"></span>` : ''}
      <span class="ctHex">${c.hex}</span>${on ? `<span class="ctOk" aria-hidden="true" style="background:${tx};color:${c.hex}">✓</span>` : ''}</button>`;
  };
  return `<section class="card" id="coresCard">
    <h3>Cores da marca</h3>
    <p class="why">As cores da sua marca. A <b>principal</b> vai nos fundos e botões; o <b>destaque</b>, no selo e nos detalhes. Muda o app inteiro na hora — para você, para os seus clientes e nos e-mails.</p>
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
      <p class="why">${corModo === 'principal' ? 'Toque na cor principal. As claras ficam apagadas: o texto dos botões não leria em cima delas.' : 'Toque na cor de destaque. O marfim fica de fora: sumiria no fundo do app.'}</p>
      <div class="corPaleta">${PALETA.map(tile).join('')}</div>
    </details>
    <button type="button" class="mkLink" id="corPadrao">Voltar ao padrão (Verde + Amarelo)</button>
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
