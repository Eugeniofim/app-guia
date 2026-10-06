/* =====================================================
   LINKS PARA O CLIENTE (06/10/2026) — voucher, roteiro, escala do guia

   O app da Mari ainda não tem banco próprio, e mesmo com banco os dados dela
   são PRIVADOS (o cliente não lê a nuvem). Então o que vai para o cliente
   viaja DENTRO do próprio link: o conteúdo é comprimido e posto depois do #
   (#/vo/…, #/ro/…, #/es/…). Nada fica público em lugar nenhum: só quem
   recebeu o link vê, e o link não passa pelo servidor (o # não é enviado).

   Publico.link('ro', objeto) → Promise<url>
   Publico.le(texto) → Promise<objeto>
   ROTAS_EXTRA['ro'] = (partes) => { … }  — o app.js chama antes das rotas dele
   ===================================================== */
'use strict';

window.ROTAS_EXTRA = window.ROTAS_EXTRA || {};
const Publico = (function () {
  const b64url = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const deB64url = (t) => { const s = atob(String(t).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(t).length + 3) % 4)); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  async function comprime(txt) {
    const bytes = new TextEncoder().encode(txt);
    if (typeof CompressionStream === 'undefined') return 'u' + b64url(bytes);
    const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return 'z' + b64url(new Uint8Array(await new Response(cs).arrayBuffer()));
  }
  async function descomprime(t) {
    const tipo = String(t || '').charAt(0), corpo = String(t || '').slice(1);
    const bytes = deB64url(corpo);
    if (tipo === 'u') return new TextDecoder().decode(bytes);
    if (tipo !== 'z' || typeof DecompressionStream === 'undefined') throw new Error('link num formato que este navegador não abre');
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new TextDecoder().decode(await new Response(ds).arrayBuffer());
  }
  return {
    async codifica(obj) { return comprime(JSON.stringify(obj)); },
    async le(t) { return JSON.parse(await descomprime(t)); },
    base() { return location.href.split('#')[0].replace(/\?.*$/, ''); },
    async link(rota, obj) { return this.base() + '#/' + rota + '/' + await this.codifica(obj); },
  };
})();
window.Publico = Publico;

/* a página que o cliente abre: carcaça comum (marca, botão imprimir/salvar PDF, erro amigável) */
function paginaPublica(titulo, html, opts) {
  opts = opts || {};
  app.innerHTML = `<div class="pubPg">
    <header class="topbar"><span class="tbrand">${logoMark(24, 'var(--brand-amarelo)')}<b>${esc((typeof guiaNegocio === 'function' && guiaNegocio()) || 'Tour na Dinamarca')}</b></span>
      ${opts.semImprimir ? '' : `<button class="mini" id="pubPdf">Salvar em PDF</button>`}</header>
    <main class="wrap pubWrap" id="pubPrint">${html}</main>
    <p class="why center" style="margin:10px 0 30px">${esc(opts.rodape || 'Qualquer dúvida, fale com a Mari no WhatsApp.')} <a href="${esc(waLink(opts.waTexto || 'Oi, Mari!'))}" target="_blank" rel="noopener">WhatsApp</a></p>
  </div>`;
  document.title = titulo;
  const b = document.getElementById('pubPdf'); if (b) b.onclick = () => window.print();
}
function paginaPublicaErro(msg) {
  paginaPublica('Tour na Dinamarca', `<section class="card"><h1 class="pageh">Não consegui abrir este link</h1><p class="why">${esc(msg || 'O link pode ter sido cortado ao copiar. Peça à Mari para mandar de novo.')}</p></section>`, { semImprimir: true });
}
/* abre um link público: decodifica e entrega o objeto para quem desenha */
function abrePublico(partes, desenha) {
  const dado = (partes || []).join('/');
  if (!dado) return paginaPublicaErro();
  app.innerHTML = '<main class="wrap"><p class="why center" style="margin-top:40px">Abrindo…</p></main>';
  Publico.le(dado).then(desenha).catch(e => paginaPublicaErro(e && e.message));
}
(function () {
  if (document.getElementById('pubCss')) return;
  const s = document.createElement('style'); s.id = 'pubCss';
  s.textContent = `.pubWrap{max-width:860px}
  @media print{ .pubPg > header, .pubPg > p, #iaFab, #iaGaveta, .protobar, .toast{display:none!important} body{background:#fff} .pubWrap{max-width:none;padding:0} @page{size:A4;margin:10mm} }`;
  document.head.appendChild(s);
})();
