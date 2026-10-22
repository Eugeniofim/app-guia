/* =====================================================
   VITRINE — a primeira tela no clima da vitrine da Bia (22/10/2026)

   Pedido do Eugênio: "o vitrine da Mari deixa bonito como está o protótipo da
   Bia (rottaguide.com/demo/), mantendo os menus que ela já tem e sugerindo outros".
   - Não desenha de novo: o app.js (e os módulos de parceiros e mudança) montam
     a primeira tela como sempre, com o botão e o toque de cada um. Aqui eu só
     REORGANIZO por cima: os mesmos botões em grupos com título, o cartão do topo
     em vidro azul-noite, a frase dela em itálico e as sugestões novas.
   - A assinatura dela: o título de cada grupo com uma linha tracejada que termina
     numa bicicletinha amarela (Copenhague é a cidade da bicicleta; a da Bia tem
     um aviãozinho).
   - Sugestões novas: "Copenhague de barco" (o tour de barco) e o cartão
     "Indicações da Mari — Para a sua viagem" (onde ficar, chip, seguro, ingressos):
     cada linha abre o WhatsApp dela com a pergunta pronta.
   ===================================================== */
'use strict';

const VT_IC = {
  barco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 16.5l1.6 2.3c.4.5 1 .7 1.6.7h11.6c.6 0 1.2-.2 1.6-.7L21 16.5H3z"/><path d="M6 16.5V12h12v4.5M9 12V8.5h5L15.5 12"/><path d="M2 21.5c1.5 0 1.5-.8 3-.8s1.5.8 3 .8 1.5-.8 3-.8 1.5.8 3 .8 1.5-.8 3-.8 1.5.8 3 .8"/></svg>',
  cama: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18V7M3 14h18v4M21 14v-2.5a3 3 0 0 0-3-3h-7v5.5"/><circle cx="7" cy="11" r="2"/></svg>',
  chip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><rect x="8.5" y="11" width="7" height="6" rx="1"/><path d="M12 11v6M8.5 14h7"/></svg>',
  escudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>',
  ingresso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 0 0-4V5H3z"/><path d="M14 5v12" stroke-dasharray="2 2"/></svg>',
  pino: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 19.5l1.2-3.6A7.5 7.5 0 1 1 8.6 18.6z"/><path d="M9.2 9.3c.3 1.8 1.6 3.6 3.6 4.6l1.2-1 1.6.8c-.2 1-.9 1.6-1.9 1.6-2.9-.3-5.5-2.9-5.8-5.8 0-1 .6-1.7 1.6-1.9l.8 1.6z"/></svg>',
};
/* a linha tracejada com a bicicletinha no fim */
const VT_ROTA = '<svg class="vtRota" viewBox="0 0 150 18" preserveAspectRatio="xMinYMid meet" aria-hidden="true"><path d="M2 11 C 28 4, 52 15, 80 8 S 112 6, 122 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3.5 4" stroke-linecap="round"/><g transform="translate(124 2)" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="10" r="3.4"/><circle cx="19" cy="10" r="3.4"/><path d="M4 10l4.5-6.5h6.5L19 10M8.5 3.5L12 10h3.5M13.5 3.5h3"/></g></svg>';

/* o e-mail que o cliente vê: o dos Ajustes, se um dia ela gravar; senão o do config (tournadinamarca@gmail.com) */
const vtEmail = () => String((DB.settings && DB.settings.emailContato) || (typeof GUIA_CFG !== 'undefined' && GUIA_CFG.email) || '').trim();
function vtMailto(en) { const e = vtEmail(); return e ? 'mailto:' + e + '?subject=' + encodeURIComponent(en ? 'Contact from the app — Tour na Dinamarca' : 'Contato pelo app — Tour na Dinamarca') : ''; }
const vtEN = () => typeof LANG !== 'undefined' && LANG === 'en';
function vtRotulo(pt, en) { const p = document.createElement('p'); p.className = 'vtRot'; p.innerHTML = `<span>${esc(vtEN() ? en : pt)}</span>${VT_ROTA}`; return p; }
function vtElem(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }

function vtIndicacoes() {
  const en = vtEN();
  const it = [
    [VT_IC.cama, en ? 'Where to stay' : 'Onde ficar', en ? 'The best neighbourhoods in Copenhagen for you' : 'Os melhores bairros de Copenhague para você', en ? 'Hi Mari! Could you recommend where to stay in Copenhagen?' : 'Oi, Mari! Pode me indicar onde ficar em Copenhague?'],
    [VT_IC.chip, en ? 'Travel SIM (eSIM)' : 'Chip de viagem (eSIM)', en ? 'Land in Denmark already connected' : 'Chegue na Dinamarca já conectado', en ? 'Hi Mari! Which eSIM do you recommend for Denmark?' : 'Oi, Mari! Qual chip de celular (eSIM) você indica para a Dinamarca?'],
    [VT_IC.escudo, en ? 'Travel insurance' : 'Seguro viagem', en ? 'A must in every traveller’s bag' : 'Indispensável na mala de quem viaja', en ? 'Hi Mari! Could you recommend travel insurance for Europe?' : 'Oi, Mari! Pode me indicar um seguro viagem para a Europa?'],
    [VT_IC.ingresso, en ? 'Tickets in advance' : 'Ingressos antecipados', en ? 'Tivoli, castles and museums — no queues' : 'Tivoli, castelos e museus — sem fila', en ? 'Hi Mari! I’d like to buy the Tivoli and castle tickets in advance. Can you help?' : 'Oi, Mari! Queria comprar antes os ingressos do Tivoli e dos castelos. Você me ajuda?'],
  ];
  return vtElem(`<section class="vtIndic" aria-label="${en ? 'Travel tips' : 'Indicações'}">
    <small>${en ? 'Mari’s tips' : 'Indicações da Mari'}</small><h2>${en ? 'For your trip' : 'Para a sua viagem'}</h2>
    ${it.map(([ic, tt, sub, msg]) => `<a class="vtI" href="${esc(waLink(msg))}" target="_blank" rel="noopener"><span class="vtIic">${ic}</span><span class="vtItx"><b>${esc(tt)}</b><small>${esc(sub)}</small></span><span class="vtIwa" aria-label="WhatsApp">${VT_IC.wa}</span></a>`).join('')}
  </section>`);
}

function vtArruma() {
  const hub = app.querySelector('.hub'); if (!hub || hub.classList.contains('vt')) return;
  vtCss(); hub.classList.add('vt');
  const inn = hub.querySelector('.hub-in'), vcard = inn && inn.querySelector('.vcard'); if (!vcard) return;
  const en = vtEN();
  /* o cartão do topo: a etiqueta de quem ela é */
  const par = vcard.querySelector('.parceira');
  if (par && !vcard.querySelector('.vtChip')) par.insertAdjacentHTML('afterend', `<p class="vtChip">${VT_IC.pino}${en ? 'Brazilian guide · 13 years in Copenhagen' : 'Guia brasileira · 13 anos em Copenhague'}</p>`);
  /* os botões que ela já tem */
  const q = (s) => inn.querySelector(s);
  const wa = [...inn.querySelectorAll('a.lk')].find(a => /wa\.me|whatsapp|api\.whatsapp/i.test(a.href));
  if (wa) { const b = wa.querySelector('b'); if (b) b.textContent = en ? 'Message me on WhatsApp' : 'Fale comigo no WhatsApp';
    const fone = (DB.settings && DB.settings.whats) || ''; if (fone && !wa.querySelector('small')) b.insertAdjacentHTML('afterend', `<small>${esc(fone)}</small>`); }
  /* "Fale comigo por e-mail" (pedido de 22/10): um botão no grupo Conheça e o envelope junto do Instagram e do WhatsApp */
  let mail = null; const mt = vtMailto(en);
  if (mt && !q('#goMail')) {
    mail = vtElem(`<a class="lk" id="goMail" href="${esc(mt)}"><span class="ic">${VT_IC.mail}</span><span><b>${en ? 'Email me' : 'Fale comigo por e-mail'}</b><small>${esc(vtEmail())}</small></span><span class="go" aria-hidden="true">→</span></a>`);
    const redes = vcard.querySelector('.redes');
    if (redes && !redes.querySelector('.rede.ml')) redes.insertAdjacentHTML('beforeend', `<a class="rede ml" href="${esc(mt)}" aria-label="E-mail" title="${esc(vtEmail())}">${VT_IC.mail}</a>`);
  }
  /* sugestão nova: o tour de barco */
  let barco = null; const xb = Tours.live().find(x => x.type === 'boat');
  if (xb && !q('#goBarco')) {
    barco = vtElem(`<button class="lk" id="goBarco"><span class="ic">${VT_IC.barco}</span><span><b>${en ? 'Copenhagen by boat' : 'Copenhague de barco'}</b><small>${en ? 'The canals seen from the water, with me' : 'Os canais vistos da água, comigo'}</small></span><span class="go" aria-hidden="true">→</span></button>`);
    barco.onclick = () => go('/tour/' + xb.id);
  }
  const grupos = [
    ['Com a Mari', 'With Mari', [q('#goTours'), q('#goPers')]],
    ['Planeje a sua viagem', 'Plan your trip', [q('#goTrf'), q('#goBike'), barco]],
    ['Conheça', 'Get to know me', [q('#goAbout'), q('#goApre'), wa, mail]],
    ['Morar e economizar', 'Living & savings', [q('#goMud'), q('#goParc')]],
  ];
  const postos = new Set(), frag = document.createDocumentFragment();
  for (const [pt, enT, els] of grupos) {
    const l = els.filter(Boolean); if (!l.length) continue;
    frag.appendChild(vtRotulo(pt, enT)); l.forEach(e => { frag.appendChild(e); postos.add(e); });
  }
  const sobras = [...inn.querySelectorAll('.lk')].filter(e => !postos.has(e));
  if (sobras.length) { frag.appendChild(vtRotulo('Mais', 'More')); sobras.forEach(e => frag.appendChild(e)); }
  frag.appendChild(vtIndicacoes());
  [...inn.querySelectorAll('.adm-dica, #admEntry')].forEach(e => frag.appendChild(e));
  vcard.after(frag);
}

function vtCss() {
  if (document.getElementById('vtCss')) return;
  const s = document.createElement('style'); s.id = 'vtCss';
  /* paleta: noite do porto #121A2C · azul-marinho #1D2A44 · creme #FBF7EC · amarelo #F2C230 */
  s.textContent = `
  .hub.vt{place-items:start center;padding:20px 16px 48px;background-color:#0E1320}
  /* Nyhavn (22/10): no computador a foto mostra as fachadas coloridas e os barcos, não só o céu */
  .hub.vt .hub-bg{background-position:center 62%}
  .hub.vt .hub-bg::after{background:linear-gradient(180deg,rgba(14,19,32,.30) 0%,rgba(14,19,32,.52) 34%,rgba(14,19,32,.86) 78%,rgba(14,19,32,.94) 100%)}
  .hub.vt .hub-in{gap:8px}
  .hub.vt .vcard{background:rgba(20,27,46,.74);-webkit-backdrop-filter:blur(16px) saturate(1.15);backdrop-filter:blur(16px) saturate(1.15);border:1px solid rgba(251,247,236,.14);color:#FBF7EC;box-shadow:0 26px 60px -30px rgba(0,0,0,.7)}
  .hub.vt .vcard .vi-mark img{box-shadow:0 0 0 3px rgba(251,247,236,.92),0 0 0 5px rgba(242,194,48,.55),0 18px 34px -16px rgba(0,0,0,.65)}
  .hub.vt .vcard .vi-word small{color:#F2C230;letter-spacing:.24em}
  .hub.vt .vcard .tagline{color:rgba(251,247,236,.88);font-size:15px;line-height:1.55;max-width:34ch;margin-left:auto;margin-right:auto}
  .hub.vt .vcard .parceira{font-family:"Playfair Display",Georgia,serif;font-style:italic;font-weight:500;font-size:16.5px;line-height:1.45;color:#F2C230;max-width:31ch}
  .hub.vt .vcard .parceira::before{background:#F2C230;opacity:.9}
  .hub.vt .vtChip{display:inline-flex;align-items:center;gap:6px;margin:14px auto 2px;padding:6px 12px 6px 10px;border-radius:999px;border:1px solid rgba(242,194,48,.5);color:#FBF7EC;font:600 12px/1 var(--f-ui);letter-spacing:.01em}
  .hub.vt .vtChip svg{width:14px;height:14px;color:#F2C230}
  .hub.vt .vcard hr,.hub.vt .vcard [class*="lang"]{border-color:rgba(251,247,236,.14)}
  .hub.vt .vcard [data-lang]{color:rgba(251,247,236,.72)}
  .hub.vt .vcard [data-lang].on,.hub.vt .vcard [data-lang][aria-pressed="true"]{color:#141B2E}
  .hub.vt .vtRot{display:flex;align-items:center;gap:10px;margin:18px 4px 2px;color:rgba(251,247,236,.82);font:700 10.5px/1 var(--f-ui);letter-spacing:.17em;text-transform:uppercase}
  .hub.vt .vtRot span{white-space:nowrap}
  .hub.vt .vtRota{flex:1;max-width:170px;height:18px;color:#F2C230;opacity:.85}
  .hub.vt .lk{background:rgba(20,27,46,.74);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(251,247,236,.12);color:#FBF7EC;box-shadow:none}
  .hub.vt .lk:hover{background:rgba(29,42,68,.86);transform:translateY(-1px);box-shadow:0 10px 26px -18px rgba(0,0,0,.8)}
  .hub.vt .lk small{color:rgba(251,247,236,.68)}
  .hub.vt .lk .ic{background:rgba(242,194,48,.14);color:#F2C230}
  .hub.vt .lk .ic.wa{background:#25D366;color:#fff}
  .hub.vt .rede.ml{background:rgba(251,247,236,.14);color:#FBF7EC;border:1px solid rgba(251,247,236,.22)}
  .hub.vt .lk .go{color:rgba(251,247,236,.5)}
  .hub.vt .lk.main{background:#F2C230;border-color:#F2C230;color:#141B2E}
  .hub.vt .lk.main small{color:rgba(20,27,46,.72)}
  .hub.vt .lk.main .ic{background:rgba(20,27,46,.12);color:#141B2E}
  .hub.vt .lk.main .go{color:#141B2E}
  .hub.vt .lk.destaque{border-color:rgba(242,194,48,.55);box-shadow:none}
  .hub.vt .lk.destaque .ic{background:#F2C230;color:#141B2E}
  .hub.vt .lk:focus-visible{outline:2px solid #F2C230;outline-offset:3px}
  .hub.vt .vtIndic{margin-top:18px;background:rgba(20,27,46,.76);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(251,247,236,.12);border-radius:22px;overflow:hidden;color:#FBF7EC}
  .hub.vt .vtIndic > small{display:block;padding:16px 18px 0;font:700 10.5px/1 var(--f-ui);letter-spacing:.17em;text-transform:uppercase;color:#F2C230}
  .hub.vt .vtIndic > h2{margin:6px 18px 12px;font:700 21px/1.2 var(--f-display);color:#FBF7EC}
  .hub.vt .vtI{display:flex;align-items:center;gap:12px;padding:13px 18px;border-top:1px solid rgba(251,247,236,.1);color:#FBF7EC;text-decoration:none}
  .hub.vt .vtI:hover{background:rgba(251,247,236,.05)}
  .hub.vt .vtI:focus-visible{outline:2px solid #F2C230;outline-offset:-2px}
  .hub.vt .vtIic{width:36px;height:36px;flex:none;border-radius:12px;display:grid;place-items:center;background:rgba(242,194,48,.14);color:#F2C230}
  .hub.vt .vtIic svg,.hub.vt .vtIwa svg{width:19px;height:19px}
  .hub.vt .vtItx{flex:1;min-width:0}
  .hub.vt .vtItx b{display:block;font-size:15px}
  .hub.vt .vtItx small{display:block;color:rgba(251,247,236,.66);font-size:12.5px;margin-top:2px}
  .hub.vt .vtIwa{width:32px;height:32px;flex:none;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(251,247,236,.22);color:#FBF7EC}
  .hub.vt .adm-entry{margin-top:18px}
  @media (prefers-reduced-motion: reduce){.hub.vt .lk:hover{transform:none}}`;
  document.head.appendChild(s);
}

const _viewHubVt = viewHub;
viewHub = function () { const r = _viewHubVt.apply(this, arguments); try { vtArruma(); } catch (e) { console.warn('vitrine', e); } return r; };
