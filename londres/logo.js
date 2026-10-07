/* =====================================================
   APP-GUIA — marca (demo "Londres com a Bia")
   O logo tem DUAS cores (verde, e no escuro marfim + "Bia" amarelo), então
   ele entra como imagem, não como máscara pintada: logo-claro.png sobre
   fundo claro, logo-escuro.png sobre o verde e no tema escuro.
   O monograma (o "B" no anel) vira máscara: pega a cor do token.
   Sem marca no config.js, cai no anel com a inicial do negócio.
   ===================================================== */
'use strict';

function _lgEsc(x) { return String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function marcaInicial() {
  const n = ((typeof guiaNegocio === 'function' && guiaNegocio()) || 'G').trim();
  return (n[0] || 'G').toUpperCase();
}
function marcaCfg() {
  return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.guia && APP_CONFIG.guia.marca) || {};
}
/* arquivo da marca pintado com `color`. w/h em px; a proporcao vem do arquivo */
function marcaMascara(src, w, h, color, extra = '') {
  const nome = _lgEsc((typeof guiaNegocio === 'function' && guiaNegocio()) || '');
  return `<span class="lg-mask ${extra}" role="img" aria-label="${nome}"
    style="width:${w}px;height:${h}px;background:${color};-webkit-mask-image:url(${src});mask-image:url(${src})"></span>`;
}

/* simbolo (monograma) — icones, selos e cabecalhos */
function logoMark(height = 40, color = 'var(--brand-amarelo)', opts = {}) {
  const m = marcaCfg();
  if (m.monograma) return marcaMascara(m.monograma, Math.round(height * (m.monogramaRazao || 0.6)), height, color, opts.cls || '');
  if (m.selo) return marcaMascara(m.selo, Math.round(height * (m.seloRazao || 1)), height, color, opts.cls || '');
  const cls = opts.cls ? ` class="${opts.cls}"` : '';
  return `<svg${cls} viewBox="0 0 100 100" width="${height}" height="${height}" aria-hidden="true">
    <circle cx="50" cy="50" r="44" fill="none" stroke="${color}" stroke-width="7"/>
    <text x="50" y="50" dy=".36em" font-size="46" text-anchor="middle" fill="${color}"
      font-family="var(--f-display)" font-weight="700">${marcaInicial()}</text>
  </svg>`;
}

/* o logo inteiro em imagem. fundo: 'auto' (segue o tema), 'claro' ou 'escuro' */
function logoImg(altura, fundo = 'auto') {
  const m = marcaCfg();
  const nome = _lgEsc((typeof guiaNegocio === 'function' && guiaNegocio()) || '');
  const claro = `<img class="lg-img lg-claro" src="${m.logoClaro}" alt="${nome}" style="height:${altura}px;width:auto" draggable="false">`;
  const escuro = `<img class="lg-img lg-escuro" src="${m.logoEscuro || m.logoClaro}" alt="${nome}" style="height:${Math.round(altura * 0.78)}px;width:auto" draggable="false">`;
  if (fundo === 'claro') return claro.replace('lg-claro', 'lg-fixo');
  if (fundo === 'escuro') return escuro.replace('lg-escuro', 'lg-fixo');
  return `<span class="lg-par">${claro}${escuro}</span>`;
}

/* simbolo + nome do negocio — cabecalhos e o hub */
function logoFull(opts = {}) {
  const { mark = 30, color = 'var(--brand-amarelo)', sub = '', fundo = 'auto' } = opts;
  const m = marcaCfg();
  if (m.logoClaro) return `<span class="vi-logo com-arte">${logoImg(Math.round(mark * 1.9), fundo)}${sub ? `<small>${sub}</small>` : ''}</span>`;
  /* logotipo desenhado: a palavra ja esta no arquivo, nao se repete em texto */
  if (m.logo) return `<span class="vi-logo com-arte">
    ${marcaMascara(m.logo, Math.round(mark * (m.logoRazao || 6.4)), mark, color)}
    ${sub ? `<small>${sub}</small>` : ''}
  </span>`;
  const nome = (typeof guiaNegocio === 'function' && guiaNegocio()) || '';
  return `<span class="vi-logo">
    <span class="vi-mark">${logoMark(mark, color)}</span>
    <span class="vi-word">
      <b>${_lgEsc(nome)}</b>
      ${sub ? `<small>${sub}</small>` : ''}
    </span>
  </span>`;
}

/* logotipo completo, empilhado */
function logoLockup(markHeight = 150) {
  const nome = (typeof guiaNegocio === 'function' && guiaNegocio()) || '';
  const base = (typeof guiaBase === 'function' && guiaBase()) || '';
  const m = marcaCfg();
  if (m.logoClaro) return `<div class="lockup">
    <div class="lk-word">${logoImg(Math.round(markHeight * 0.9), 'escuro')}</div>
    ${base ? `<div class="lk-region">${_lgEsc(base)}</div>` : ''}
  </div>`;
  return `<div class="lockup">
    <div class="lk-mark">${logoMark(markHeight, 'var(--brand-amarelo)', { cls: 'lg-draw' })}</div>
    <div class="lk-word">${m.palavra
      ? marcaMascara(m.palavra, Math.round(markHeight * 0.6 * (m.palavraRazao || 2.5)), Math.round(markHeight * 0.6), 'currentColor')
      : _lgEsc(nome)}</div>
    ${base ? `<div class="lk-region">${_lgEsc(base)}</div>` : ''}
    ${typeof soUmaLingua === 'function' && soUmaLingua() ? '' : '<div class="lk-lang">PT <span>|</span> EN</div>'}
  </div>`;
}
