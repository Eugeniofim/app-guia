/* =====================================================
   TESTE DE 20 MINUTOS (16/10/2026)

   Quem cria o acesso em /rotta/experimentar/ chega aqui com o prazo guardado
   no aparelho (rotta_teste.fim, decidido pelo servidor). Esta faixa mostra a
   contagem e, no fim, cobre o app com o convite para os planos.
   Sem rotta_teste no aparelho, nada muda: o demo segue aberto como sempre.
   ===================================================== */
'use strict';
(function testeDe20Minutos() {
  let t = null;
  /* vindo do rottaguide.com (outro endereço), o prazo chega na URL (?rt=…): guarda e limpa a barra */
  try {
    const q = new URLSearchParams(location.search), rt = q.get('rt');
    if (rt) {
      const d = JSON.parse(decodeURIComponent(escape(atob(rt))));
      if (d && d.fim && !isNaN(Date.parse(d.fim))) localStorage.setItem('rotta_teste', JSON.stringify({ nome: String(d.nome || '').slice(0, 80), fim: d.fim }));
      q.delete('rt'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    }
  } catch (_) {}
  try { t = JSON.parse(localStorage.getItem('rotta_teste') || 'null'); } catch (_) { t = null; }
  const fim = t && Date.parse(t.fim);
  if (!fim) return;

  const css = document.createElement('style');
  css.textContent = `
  .rt-faixa{position:fixed;top:0;left:0;right:0;z-index:2000;display:flex;align-items:center;justify-content:center;gap:10px;
    background:#13201E;color:#fff;font:700 13px/1.2 "Avenir Next","Nunito Sans",system-ui,sans-serif;padding:7px 12px;padding-top:max(7px,env(safe-area-inset-top))}
  .rt-faixa b{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:14px;color:#7FD1C1;min-width:46px;text-align:center}
  .rt-faixa a{color:#fff;opacity:.85}
  body.rt-com-faixa{padding-top:34px}
  .rt-fim{position:fixed;inset:0;z-index:2001;background:rgba(19,32,30,.92);display:grid;place-items:center;padding:20px;
    font-family:"Avenir Next","Nunito Sans",system-ui,sans-serif}
  .rt-caixa{background:#fff;color:#13201E;border-radius:22px;max-width:380px;width:100%;padding:24px 20px;text-align:center}
  .rt-caixa h2{font-size:24px;line-height:1.1;letter-spacing:-.02em}
  .rt-caixa p{color:#55635F;margin-top:10px;font-size:15px;line-height:1.45}
  .rt-caixa a{display:flex;align-items:center;justify-content:center;min-height:50px;border-radius:14px;font-weight:800;text-decoration:none;margin-top:12px}
  .rt-caixa .pri{background:#2F7A6F;color:#fff}.rt-caixa .sec{border:1.5px solid #D3DED9;color:#13201E}`;
  document.head.appendChild(css);

  const faixa = document.createElement('div');
  faixa.className = 'rt-faixa'; faixa.setAttribute('role', 'status');
  faixa.innerHTML = `<span>Seu teste grátis</span><b id="rt-tempo">20:00</b><a href="https://guia.eugeniofim.com/rotta/planos/">ver planos</a>`;
  document.body.appendChild(faixa); document.body.classList.add('rt-com-faixa');

  function acabou() {
    clearInterval(rel);
    faixa.remove(); document.body.classList.remove('rt-com-faixa');
    if (document.querySelector('.rt-fim')) return;
    const nome = String(t.nome || '').split(' ')[0].replace(/[<>&"]/g, '');
    const fimEl = document.createElement('div'); fimEl.className = 'rt-fim';
    fimEl.innerHTML = `<div class="rt-caixa" role="dialog" aria-modal="true" aria-labelledby="rt-tit">
      <h2 id="rt-tit">${nome ? nome + ', o' : 'O'} seu teste de 20 minutos acabou.</h2>
      <p>Gostou? A gente monta o seu app com os seus passeios, as suas cores e o seu nome.</p>
      <a class="pri" href="https://guia.eugeniofim.com/rotta/planos/">Ver os planos</a>
      <a class="sec" href="https://ig.me/m/estudio_ti_artes" target="_blank" rel="noopener">Falar com a Ti Artes</a></div>`;
    document.body.appendChild(fimEl);
    fimEl.querySelector('a').focus();
  }
  function tique() {
    const s = Math.max(0, Math.round((fim - Date.now()) / 1000));
    const el = document.getElementById('rt-tempo');
    if (el) el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    if (s <= 0) acabou();
  }
  const rel = setInterval(tique, 1000);
  tique();
})();
