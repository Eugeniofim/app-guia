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
function logoMark(height = 40, color = '#D4AF37', opts = {}) {
  const cls = opts.cls ? ` class="${opts.cls}"` : '';
  /* a coroa da Yalla Experiences: cinco pontas, losango central e a base.
     Desenho próprio, nas proporções do logotipo do brand kit dela. */
  return `<svg${cls} viewBox="0 0 100 100" width="${height}" height="${height}" aria-hidden="true">
    <g fill="none" stroke="${color}" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round">
      <path d="M14 66 L14 34 L31 47 L50 24 L69 47 L86 34 L86 66 Z"/>
      <path d="M50 44 L61 56 L50 68 L39 56 Z" fill="${color}"/>
      <path d="M20 78 H80"/>
    </g>
    <circle cx="14" cy="30" r="5" fill="${color}"/>
    <circle cx="50" cy="20" r="5" fill="${color}"/>
    <circle cx="86" cy="30" r="5" fill="${color}"/>
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
