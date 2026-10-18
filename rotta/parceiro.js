/* =====================================================
   INDICAÇÃO DE PARCEIRO (18/10/2026)

   rottaguide.com/dulcineia (e /igor) gravam de quem veio a pessoa
   (localStorage 'rotta_de', ou ?de= no endereço). Antes, isso só seguia
   para o teste de 20 min e para o Stripe — o WhatsApp, que é o botão que
   mais vende, chegava como "Oi Eugênio! Vi o Rotta…" e a indicação se
   perdia. E a página era igual para todo mundo: quem confia na Dulcineia
   não sabia que estava no lugar certo.

   Com indicação:
   1. todo botão de WhatsApp leva "Vim pela indicação da Dulcineia";
   2. a primeira tela mostra quem indicou (foto + o app dela no ar);
   3. o fim da página diz quem monta e que ela foi a indicação.
   Sem indicação, nada muda.
   ===================================================== */
(function () {
  'use strict';
  const PARCEIROS = {
    dulcineia: { nome: 'Dulcineia', da: 'da', negocio: 'Conexão Berlim', cidade: 'Berlim',
      foto: 'https://rottaguide.com/dulcineia/foto.jpg', app: 'https://guia.eugeniofim.com/dulcineia/' },
    igor: { nome: 'Igor', da: 'do' },
  };
  let de = '';
  try {
    const q = new URLSearchParams(location.search).get('de');
    if (q && /^[a-z0-9-]{2,30}$/.test(q)) localStorage.setItem('rotta_de', q);
    de = localStorage.getItem('rotta_de') || '';
  } catch (e) { de = new URLSearchParams(location.search).get('de') || ''; }
  if (!/^[a-z0-9-]{2,30}$/.test(de)) return;
  const P = PARCEIROS[de] || null;
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const quem = P ? `${P.da} ${P.nome}${P.negocio ? ' (' + P.negocio + ')' : ''}` : `de ${de}`;

  const aplica = () => {
    /* 1. WhatsApp: a indicação vai junto na mensagem */
    document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
      try {
        const u = new URL(a.href);
        const t = u.searchParams.get('text') || 'Oi! Vi o Rotta e quero saber mais sobre o app.';
        if (/indica[çc][ãa]o/i.test(t)) return;
        const linha = `Vim pela indicação ${quem}.`;
        u.searchParams.set('text', /^Oi[^!]*!/.test(t) ? t.replace(/^(Oi[^!]*!)\s*/, `$1 ${linha} `) : `${linha} ${t}`);
        a.href = u.href;
      } catch (e) {}
    });
    if (!P || !P.negocio) return;

    /* 2. a primeira tela: quem indicou, com o app dela no ar */
    const lugar = document.getElementById('parceiroFaixa');
    if (lugar && !lugar.dataset.ok) {
      lugar.dataset.ok = '1';
      lugar.hidden = false;
      lugar.innerHTML = `${P.foto ? `<img src="${esc(P.foto)}" alt="" width="48" height="48">` : ''}
        <div class="pfTx"><small>Indicação</small><b>${esc(P.nome)} · ${esc(P.negocio)}</b>${P.app ? `<a class="pfVer" href="${esc(P.app)}" target="_blank" rel="noopener">Ver o app ${esc(P.da === 'da' ? 'dela' : 'dele')} no ar${P.cidade ? ', em ' + esc(P.cidade) : ''} →</a>` : ''}</div>`;
    }

    /* 3. o fim da página: quem monta, e quem indicou */
    const fim = document.querySelector('.chegada');
    if (fim && !fim.dataset.ok) {
      fim.dataset.ok = '1';
      const h = fim.querySelector('h2'), p = fim.querySelector('p'), b = fim.querySelector('a.btn.pri[href*="wa.me/"]');
      if (h) h.textContent = `Gostou? ${P.da === 'da' ? 'A' : 'O'} ${P.nome} te indicou.`;
      if (p) p.textContent = `Quem monta é o Eugênio, do Studio Ti Artes — o mesmo que fez o app ${P.da} ${P.negocio}. Ele monta o seu, com os seus passeios, sem compromisso, para você ver como fica.`;
      if (b) b.textContent = 'Falar com o Eugênio no WhatsApp';
    }
  };

  /* estilo da faixa, junto: as páginas não precisam mudar o CSS */
  const css = document.createElement('style');
  css.textContent = `#parceiroFaixa{display:flex;align-items:center;gap:12px;margin:0 0 14px;padding:9px 12px;border:1.5px solid var(--linha,#D3DED9);border-radius:16px;background:var(--branco,#fff)}
#parceiroFaixa[hidden]{display:none}
#parceiroFaixa img{width:46px;height:46px;border-radius:50%;object-fit:cover;flex:none;box-shadow:0 0 0 2px var(--menta,#7FD1C1);background:var(--papel,#F3F6F2)}
#parceiroFaixa .pfTx{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}
#parceiroFaixa small{font-family:var(--mono,ui-monospace,monospace);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--rota-2,#25645B)}
#parceiroFaixa b{font-size:16px}
#parceiroFaixa .pfVer{align-self:flex-start;display:inline-flex;align-items:center;min-height:32px;font-weight:800;font-size:14px;color:var(--rota,#2F7A6F);text-decoration:underline;text-underline-offset:3px}`;
  document.head.appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplica); else aplica();
})();
