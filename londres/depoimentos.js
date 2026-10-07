/* =====================================================
   DEPOIMENTOS

   A Bia ainda não tem avaliações públicas (os depoimentos do site dela
   são texto de modelo do template — não entram). Os cartões daqui nascem
   das avaliações que os clientes deixam pelo QR (#/avaliar) e que ela
   marca como "publicar", ou do que ela digitar em Ajustes → Depoimentos.
   Nada inventado: sem depoimento, a seção não aparece.
   ===================================================== */
'use strict';

function depoimentos() {
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  /* avaliação do QR só vira cartão se o cliente autorizou E ela marcou "publicar" */
  const doQr = (DB.avaliacoes || []).filter(a => a && a.publicar && a.autorizou !== false && !a.exemplo && String(a.texto || '').trim())
    .map(a => ({ texto: a.texto, nome: a.nome, quando: /^\d{4}-\d{2}/.test(a.data || '') ? MES[+a.data.slice(5, 7) - 1] + '/' + a.data.slice(0, 4) : '' }));
  return (DB.settings.depoimentos || []).filter(d => d && String(d.texto || '').trim()).concat(doQr);
}

/* o carrossel: na primeira tela (vidro, sobre a foto) e em "Quem sou eu" */
function secaoDepoimentos(onde) {
  const ds = depoimentos();
  const video = typeof linkExterno === 'function' ? linkExterno(DB.settings.depoimentosVideo) : '';
  if (!ds.length && !video) return '';
  return `<section class="depo ${onde || ''}" aria-labelledby="depoTit-${onde || 'x'}">
    <header class="depoTopo"><small>Quem já foi</small><h2 id="depoTit-${onde || 'x'}">O que dizem os viajantes</h2></header>
    <div class="depoTrilho" tabindex="0" aria-label="Depoimentos — deslize para o lado">
      ${ds.map(d => `<figure class="depoCard">
        <span class="depoAspas" aria-hidden="true">“</span>
        <blockquote>${esc(d.texto)}</blockquote>
        <figcaption><b>${esc(d.nome || '')}</b>${d.quando ? `<small>${esc(d.quando)}</small>` : ''}</figcaption>
      </figure>`).join('')}
      ${video ? `<a class="depoCard depoVideo" href="${esc(video)}" target="_blank" rel="noopener">
        <span class="depoPlay" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13l10.5-6.5L8 5.5Z"/></svg></span>
        <b>${esc(DB.settings.depoimentosVideoTxt || 'Mais depoimentos em vídeo')}</b>
        <small>No destaque do Instagram ↗</small>
      </a>` : ''}
    </div>
  </section>`;
}

/* ---------- Ajustes → Depoimentos ---------- */
function depoLinha(d, i) {
  return `<div class="parcEd depoEd" data-i="${i}">
    <label class="fld">Depoimento<textarea class="dTx" rows="3" maxlength="320">${esc(d.texto || '')}</textarea></label>
    <div class="frow">
      <label class="fld">Nome<input class="dNome" value="${esc(d.nome || '')}" maxlength="40" placeholder="só o primeiro nome"></label>
      <label class="fld">Quando<input class="dQuando" value="${esc(d.quando || '')}" maxlength="20" placeholder="ex.: jul. 2022"></label>
      <button type="button" class="mini dDel" aria-label="Tirar este depoimento">✕</button>
    </div>
  </div>`;
}
function cartaoDepoimentos() {
  return `<section class="card" id="depoCard">
    <h3>Depoimentos</h3>
    <p class="why">Aparecem na primeira tela e em "Quem sou eu". Use só o primeiro nome de quem escreveu. Curto funciona melhor: uma ou duas frases.</p>
    <div id="depoLinhas">${(DB.settings.depoimentos || []).map(depoLinha).join('')}</div>
    <label class="fld">Link dos depoimentos em vídeo <small class="why">o destaque do Instagram; vazio = o cartão some</small>
      <input id="depoVideo" type="url" inputmode="url" value="${esc(DB.settings.depoimentosVideo || '')}"></label>
    <div class="parcAcoes">
      <button type="button" class="mini" id="depoMais">+ Adicionar depoimento</button>
      <button type="button" class="cta sm" id="depoSalva">${t('saveBtn')}</button>
    </div>
  </section>`;
}
function ligaCartaoDepoimentos() {
  if (!document.getElementById('depoCard')) return;
  const le = () => $$('#depoLinhas .depoEd').map(r => ({
    texto: r.querySelector('.dTx').value.trim(), nome: r.querySelector('.dNome').value.trim(), quando: r.querySelector('.dQuando').value.trim() }));
  const redesenha = (l) => { $('#depoLinhas').innerHTML = l.map(depoLinha).join(''); liga(); };
  const liga = () => $$('#depoLinhas .dDel').forEach(b => b.onclick = () => { const l = le(); l.splice(+b.closest('.depoEd').dataset.i, 1); redesenha(l); });
  liga();
  $('#depoMais').onclick = () => redesenha(le().concat([{ texto: '', nome: '', quando: '' }]));
  $('#depoSalva').onclick = () => {
    let v = $('#depoVideo').value.trim();
    if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
    if (v && !linkExterno(v)) return toast('Link inválido: ' + v);
    DB.settings.depoimentos = le().filter(d => d.texto);
    DB.settings.depoimentosVideo = v;
    save(); toast('Depoimentos salvos ✓'); admSettings();
  };
}
