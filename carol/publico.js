/* =====================================================
   LINKS PARA O CLIENTE (27/10/2026) — o kit da viagem

   As reservas moram no aparelho da guia (e, com banco, numa tabela que só
   ela lê): o cliente não enxerga nada disso. Então o que vai para o cliente
   viaja DENTRO do próprio link: o conteúdo é comprimido e posto depois do #
   (#/kt/…). Nada fica público em lugar nenhum: só quem recebeu o link vê, e
   o link não passa pelo servidor (o # não é enviado).
   Mesmo formato dos outros apps da Ti Artes (o servidor monta links assim):
   JSON → deflate-raw → base64url, com o prefixo 'z' ('u' = sem compressão).

   Publico.codifica(objeto) → Promise<texto> · Publico.le(texto) → Promise<objeto>
   paginaPublica(título, html, opts) — a carcaça da página do cliente
   abrePublico(partes, desenha) — decodifica e entrega o objeto
   ===================================================== */
'use strict';

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

const pubGuia = () => (typeof guiaNome === 'function' && guiaNome()) || 'sua guia';
const pubArtigo = () => ((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.kit && APP_CONFIG.kit.artigo) || 'a');

/* a página que o cliente abre: a marca no topo, "Salvar em PDF" e o WhatsApp da guia no pé */
function paginaPublica(titulo, html, opts) {
  opts = opts || {};
  const quem = pubArtigo() + ' ' + pubGuia();
  app.innerHTML = `<div class="pubPg">
    <header class="topbar"><span class="tbrand">${typeof logoImg === 'function' ? logoImg(30) : `<b>${esc((typeof guiaNegocio === 'function' && guiaNegocio()) || '')}</b>`}</span>
      ${opts.semImprimir ? '' : `<button class="mini pubPdfBt" id="pubPdf">Salvar em PDF</button>`}</header>
    <main class="wrap pubWrap" id="pubPrint">${html}</main>
    <p class="why center pubRodape">${esc(opts.rodape || `Qualquer dúvida, fale com ${quem} no WhatsApp.`)} <a href="${esc(waLink(opts.waTexto || 'Olá, ' + pubGuia() + '!'))}" target="_blank" rel="noopener">WhatsApp</a></p>
  </div>`;
  document.title = titulo;
  /* PDF de verdade (pdf.js): desenha a página e monta o arquivo, sem "Imprimir" */
  const b = document.getElementById('pubPdf');
  if (b) { if (typeof pdfLiga === 'function') pdfLiga(b, () => document.getElementById('pubPrint'), () => document.title); else b.onclick = () => window.print(); }
}
function paginaPublicaErro(msg) {
  paginaPublica((typeof guiaNegocio === 'function' && guiaNegocio()) || 'Viagem',
    `<section class="card pubErro"><h1 class="pageh">Não consegui abrir este link</h1><p class="why">${esc(msg || `O link pode ter sido cortado ao copiar. Peça para ${pubArtigo()} ${pubGuia()} mandar de novo.`)}</p></section>`, { semImprimir: true });
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
  s.textContent = `.pubWrap{max-width:860px;padding-top:18px}
  .pubPg .topbar .pubPdfBt{margin-left:auto}
  .pubRodape{margin:10px 16px 30px}
  .pubErro{margin-top:24px;padding:22px}
  @media print{ .pubPg > header, .pubPg > p, #iaFab, #iaGaveta, .protobar, .toast{display:none!important} body{background:#fff} .pubWrap{max-width:none;padding:0} @page{size:A4;margin:10mm} }`;
  document.head.appendChild(s);
})();
