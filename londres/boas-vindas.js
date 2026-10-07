/* =====================================================
   BOAS-VINDAS — a primeira vez que o guia entra no painel (01/10/2026)

   Este cartão aparece no topo do "Hoje", uma vez, com um
   oi caloroso e os três primeiros toques. Some quando ela clica em "Vamos
   começar" (fica guardado neste aparelho). Carregado por último, então o
   cartão fica acima de tudo.
   ===================================================== */
'use strict';

const BV_CHAVE = (typeof DB_KEY !== 'undefined' ? String(DB_KEY).replace(/_db_v\d+$/, '') : 'londres') + '_boasvindas';

function bvJaViu() { try { return localStorage.getItem(BV_CHAVE) === '1'; } catch (e) { return false; } }
function bvMarca() { try { localStorage.setItem(BV_CHAVE, '1'); } catch (e) {} }

const _admTodayBoasVindas = admToday;
admToday = function () {
  _admTodayBoasVindas();
  if (bvJaViu()) return;
  const stage = document.getElementById('stage'); if (!stage) return;
  if (stage.querySelector('#bvCard')) return;
  const nome = (typeof primeiroNome === 'function' ? primeiroNome((DB.settings && DB.settings.admName) || (typeof guiaNome === 'function' && guiaNome()) || 'Bia') : 'Bia');
  const html = `<section class="card bvCard" id="bvCard">
    <button class="bvX" id="bvX" aria-label="Fechar">×</button>
    <div class="bvLogo">${typeof logoImg === 'function' ? logoImg(64, 'escuro') : '<b>Londres com a Bia</b>'}</div>
    <h2 class="bvTit">Bem-vinda ao seu app, ${esc(nome)}!</h2>
    <p class="bvSub">Aqui é o seu lado — o painel onde você comanda tudo. É só seu: os seus clientes, as suas reservas e os seus números moram aqui. Dê uma volta à vontade; nada quebra.</p>
    <div class="bvPassos">
      <a class="bvP" href="#/adm/tours"><span class="bvN">1</span><span><b>Veja os seus passeios</b><small>Os seus passeios já estão aqui. Toque para ajustar preço, fotos e textos.</small></span></a>
      <button class="bvP" type="button" id="bvAssist"><span class="bvN">2</span><span><b>Fale com o assistente</b><small>O botão no canto. Peça em voz ou por escrito — ele mexe em todas as abas e mostra antes de gravar.</small></span></button>
      <a class="bvP" href="#/" target="_blank" rel="noopener"><span class="bvN">3</span><span><b>Veja o que o cliente vê</b><small>Abre a primeira tela do app, do jeito que o seu cliente abre.</small></span></a>
    </div>
    <button class="cta bvOk" id="bvOk">Vamos começar ✨</button>
  </section>`;
  const h1 = stage.querySelector('.pageh');
  if (h1) h1.insertAdjacentHTML('afterend', html); else stage.insertAdjacentHTML('afterbegin', html);
  const fechar = () => { bvMarca(); const c = document.getElementById('bvCard'); if (c) c.remove(); };
  document.getElementById('bvOk').onclick = fechar;
  document.getElementById('bvX').onclick = fechar;
  const a = document.getElementById('bvAssist');
  if (a) a.onclick = () => { fechar(); if (typeof iaAbre === 'function') { if (typeof iaMonta === 'function') iaMonta(); iaAbre(); } };
};
