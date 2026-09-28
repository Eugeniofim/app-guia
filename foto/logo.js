/* =====================================================
   APP-GUIA — marca
   Marca neutra do produto: um anel com a inicial do negocio. O guia troca
   pelo logotipo proprio depois; o codigo nao carrega a marca de ninguem.
   ===================================================== */
'use strict';

function _lgEsc(x) { return String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function marcaInicial() {
  const n = ((typeof guiaNegocio === 'function' && guiaNegocio()) || 'G').trim();
  return (n[0] || 'G').toUpperCase();
}

/* simbolo — para icones, selos e cabecalhos */
function logoMark(height = 40, color = '#FFD23F', opts = {}) {
  const cls = opts.cls ? ` class="${opts.cls}"` : '';
  return `<svg${cls} viewBox="0 0 100 100" width="${height}" height="${height}" aria-hidden="true">
    <circle cx="50" cy="50" r="44" fill="none" stroke="${color}" stroke-width="7"/>
    <text x="50" y="50" dy=".36em" font-size="46" text-anchor="middle" fill="${color}"
      font-family="Montserrat, sans-serif" font-weight="700">${marcaInicial()}</text>
  </svg>`;
}

/* simbolo + nome do negocio — cabecalhos e o hub */
function logoFull(opts = {}) {
  const { mark = 30, color = 'var(--brand-amarelo)', sub = '' } = opts;
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
  return `<div class="lockup">
    <div class="lk-mark">${logoMark(markHeight, 'var(--brand-amarelo)', { cls: 'lg-draw' })}</div>
    <div class="lk-word">${_lgEsc(nome)}</div>
    ${base ? `<div class="lk-region">${_lgEsc(base)}</div>` : ''}
    <div class="lk-lang">PT <span>|</span> EN</div>
  </div>`;
}
