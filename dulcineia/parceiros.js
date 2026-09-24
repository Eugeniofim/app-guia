/* =====================================================
   PARA A SUA VIAGEM — hotel, chip e seguro (24/09/2026)

   Os links de indicação da primeira tela, como no Beacons de quem é guia:
   Booking (reserve seu hotel), chip de viagem com desconto e seguro viagem.
   Ela edita em Ajustes → Para a sua viagem: título, texto, link e etiqueta.

   Link de parceira é DELA (o código no endereço é o que paga a comissão):
   nunca usar o de outra guia. Enquanto ela não mandar o link, o cartão
   abre o WhatsApp dela já pedindo — o cliente não fica sem resposta e
   nenhum desconto é prometido por um link que não existe.

   Visual: um cartão só, agrupado, com os ícones em BORDÔ (ela gosta —
   só nestes detalhes; o resto do app segue as cores de Ajustes).
   ===================================================== */
'use strict';

const PARC_ICONE = {
  hotel: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19V7M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11.5" r="2"/></svg>',
  chip: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h6.5L19 7.5V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><rect x="9.5" y="11" width="7" height="6.5" rx="1.2"/><path d="M13 11v6.5M9.5 14.2h7"/></svg>',
  seguro: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5.2c0 4.4-2.9 8.1-7 9.8-4.1-1.7-7-5.4-7-9.8V6l7-3Z"/><path d="M9 12.2l2.1 2.1L15.2 10"/></svg>',
  outro: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.5Z"/></svg>',
};
/* sem link de parceira: o que o cliente manda no WhatsApp dela */
const PARC_PEDIDO = {
  hotel: 'Olá, {g}! Pode me indicar um hotel em Berlim?',
  chip: 'Olá, {g}! Quero o chip de viagem com desconto.',
  seguro: 'Olá, {g}! Quero uma indicação de seguro viagem.',
  outro: 'Olá, {g}! Vi a indicação "{t}" no app e quero saber mais.',
};

function parceiros() {
  return (DB.settings.parceiros || []).filter(p => p && String(p.titulo || '').trim() && !p.oculto);
}
function parcDestino(p) {
  const u = typeof linkExterno === 'function' ? linkExterno(p.url) : '';
  if (u) return { href: u, rel: 'noopener sponsored', wa: false };
  const txt = (PARC_PEDIDO[p.tipo] || PARC_PEDIDO.outro).replace('{g}', guiaNome()).replace('{t}', p.titulo);
  return { href: waLink(txt), rel: 'noopener', wa: true };
}

/* a seção da primeira tela */
function secaoViagem() {
  const ps = parceiros();
  if (!ps.length) return '';
  return `<section class="viagem" aria-labelledby="vgTit">
    <header class="vgTopo"><small>Indicações de ${esc(guiaNome())}</small><h2 id="vgTit">Para a sua viagem</h2></header>
    ${ps.map(p => {
      const d = parcDestino(p);
      return `<a class="vg" href="${esc(d.href)}" target="_blank" rel="${d.rel}">
        <span class="vgIc">${PARC_ICONE[p.tipo] || PARC_ICONE.outro}</span>
        <span class="vgTx"><b>${esc(p.titulo)}${p.selo ? ` <em class="vgSelo">${esc(p.selo)}</em>` : ''}</b>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}</span>
        <span class="vgVai" aria-hidden="true">${d.wa ? ICONE_WA : '↗'}</span>
        ${d.wa ? '<span class="sr-only">(abre o WhatsApp)</span>' : '<span class="sr-only">(abre em outra aba)</span>'}
      </a>`; }).join('')}
  </section>`;
}

/* ---------- Ajustes → Para a sua viagem ---------- */
function parcLinha(p, i) {
  const tipos = [['hotel', 'Hotel'], ['chip', 'Chip'], ['seguro', 'Seguro'], ['outro', 'Outro']];
  return `<div class="parcEd" data-i="${i}">
    <div class="parcEdTopo">
      <span class="vgIc">${PARC_ICONE[p.tipo] || PARC_ICONE.outro}</span>
      <select class="pTipo" aria-label="Tipo">${tipos.map(([v, n]) => `<option value="${v}" ${p.tipo === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <label class="parcMostra"><input type="checkbox" class="pMostra" ${p.oculto ? '' : 'checked'}> Mostrar</label>
      <button type="button" class="mini pDel" aria-label="Tirar esta indicação">✕</button>
    </div>
    <label class="fld">Título<input class="pTit" value="${esc(p.titulo || '')}" maxlength="60"></label>
    <label class="fld">Texto pequeno<input class="pSub" value="${esc(p.sub || '')}" maxlength="80"></label>
    <label class="fld">Link de parceira<input class="pUrl" type="url" inputmode="url" value="${esc(p.url || '')}" placeholder="vazio = abre o seu WhatsApp"></label>
    <label class="fld parcEtq">Etiqueta <small class="why">opcional</small><input class="pSelo" value="${esc(p.selo || '')}" maxlength="16" placeholder="ex.: 10% off"></label>
  </div>`;
}
function cartaoParceiros() {
  return `<section class="card" id="parcCard">
    <h3>Para a sua viagem</h3>
    <p class="why">Os cartões da primeira tela: hotel, chip e seguro. Cole o <b>seu</b> link de parceira — é o código nele que paga a sua comissão. Sem link, o cartão abre o seu WhatsApp com o pedido do cliente.</p>
    <div id="parcLinhas">${(DB.settings.parceiros || []).map(parcLinha).join('')}</div>
    <div class="parcAcoes">
      <button type="button" class="mini" id="parcMais">+ Adicionar indicação</button>
      <button type="button" class="cta sm" id="parcSalva">${t('saveBtn')}</button>
    </div>
  </section>`;
}
function ligaCartaoParceiros() {
  const card = document.getElementById('parcCard'); if (!card) return;
  const le = () => $$('#parcLinhas .parcEd').map(r => {
    const q = (c) => r.querySelector('.' + c);
    return { id: 'p' + r.dataset.i, tipo: q('pTipo').value, titulo: q('pTit').value.trim(), sub: q('pSub').value.trim(),
             url: q('pUrl').value.trim(), selo: q('pSelo').value.trim(), oculto: !q('pMostra').checked };
  });
  const redesenha = (lista) => { $('#parcLinhas').innerHTML = lista.map(parcLinha).join(''); liga(); };
  const liga = () => {
    $$('#parcLinhas .pDel').forEach(b => b.onclick = () => { const l = le(); l.splice(+b.closest('.parcEd').dataset.i, 1); redesenha(l); });
    $$('#parcLinhas .pTipo').forEach(s => s.onchange = () => redesenha(le()));
  };
  liga();
  $('#parcMais').onclick = () => redesenha(le().concat([{ tipo: 'outro', titulo: '', sub: '', url: '', selo: '' }]));
  $('#parcSalva').onclick = () => {
    const lista = le();
    for (const p of lista) {
      if (p.url && !/^https?:\/\//i.test(p.url)) p.url = 'https://' + p.url;
      if (p.url && !linkExterno(p.url)) return toast('Link inválido: ' + p.url);
    }
    DB.settings.parceiros = lista.filter(p => p.titulo).map((p, i) => ({ ...p, id: p.tipo + '-' + i }));
    save(); toast('Indicações salvas ✓'); admSettings();
  };
}

if (typeof module !== 'undefined') module.exports = { PARC_PEDIDO };
