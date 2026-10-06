/* =====================================================
   BRINDES EM PDF (06/10/2026)

   Pedido do Eugênio: "quando cliente compra tour, Mari presenteia PDF de
   second hand + PDF, deixar esses PDF dentro da aba brindes pra ela escolher
   pra quem mandar de brinde" — e depois: "aqui precisa ter o UPLOAD do PDF
   pra ela ter dentro do app e poder mandar pra quem quiser".

   - O PDF SOBE PARA DENTRO DO APP: fica guardado no aparelho (IndexedDB,
     cabe arquivo grande) e, com o banco dela ligado, também na nuvem dela
     (Supabase Storage, pasta "brindes") — aí vira um link que vale em todo
     aparelho. Link do Google Drive continua aceito.
   - MANDAR: com link na nuvem, o WhatsApp do cliente abre com a mensagem e o
     link. Só com o arquivo no aparelho: no celular abre o "compartilhar" do
     sistema já com o PDF anexado (ela escolhe o WhatsApp e a pessoa); no
     computador o PDF baixa e o WhatsApp abre com a mensagem, para arrastar.
     "Compartilhar" manda para QUALQUER pessoa, sem ser cliente.
   - DB.brindes: título, frase, link e os dados do arquivo (nome, tamanho).
     DB.brindesEnvios: a quem foi, quando e por onde — aparece na ficha.
   Nada sai sozinho: quem envia é ela. Tudo privado (nuvem-itens.js).
   ===================================================== */
'use strict';

const Brindes = {
  all() { if (!Array.isArray(DB.brindes)) DB.brindes = []; return DB.brindes; },
  envios() { if (!Array.isArray(DB.brindesEnvios)) DB.brindesEnvios = []; return DB.brindesEnvios; },
  get(id) { return this.all().find(x => x.id === id) || null; },
  add(c) { const x = Object.assign({ id: 'br' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), titulo: '', texto: '', url: '', arquivo: null, sempre: true, criado: new Date().toISOString() }, c); this.all().push(x); save(); return x; },
  update(id, c) { const x = this.get(id); if (x) { Object.assign(x, c); save(); } return x; },
  remove(id) { DB.brindes = this.all().filter(x => x.id !== id); save(); BrArq.del(id).catch(() => {}); },
  enviadosPara(chave) { return this.envios().filter(e => e.chave === chave); },
  jaRecebeu(chave, brindeId) { return this.envios().some(e => e.chave === chave && e.brindeId === brindeId); },
  registra(brinde, chave, nome, canal) { const e = { id: 'be' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), brindeId: brinde.id, titulo: brinde.titulo, chave, nome, canal, quando: new Date().toISOString() }; this.envios().push(e); save(); return e; },
};
window.Brindes = Brindes;
const BR_MAX = 25e6;   /* 25 MB por PDF */
const brLinkOk = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(String(u || '').trim()) || /^brindes\/[\w.\- ]+\.pdf$/i.test(String(u || '').trim());
const brUrlAbs = (u) => /^brindes\//.test(u) ? new URL(u, location.href.split('#')[0]).href : u;
/* o brinde tem o que mandar? (um link, ou o PDF que ela subiu) */
const brTem = (b) => !!(b && (brLinkOk(b.url) || b.arquivo));
window.brTem = brTem;
const brTam = (n) => n > 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';

/* ---------- o arquivo dentro do app: IndexedDB (localStorage não cabe PDF) ---------- */
const BrArq = (function () {
  const NOME = (typeof DB_KEY !== 'undefined' ? String(DB_KEY).replace(/_db_v\d+$/, '') : 'guia') + '_arquivos';
  let abre = null;
  const db = () => abre || (abre = new Promise((ok, ko) => {
    try { const r = indexedDB.open(NOME, 1); r.onupgradeneeded = () => r.result.createObjectStore('pdf'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }
    catch (e) { ko(e); }
  }));
  const tx = async (modo, fn) => { const d = await db(); return new Promise((ok, ko) => { const t = d.transaction('pdf', modo); const req = fn(t.objectStore('pdf')); t.oncomplete = () => ok(req && req.result); t.onerror = () => ko(t.error); }); };
  return {
    put: (id, blob) => tx('readwrite', s => s.put(blob, id)),
    get: (id) => tx('readonly', s => s.get(id)).then(x => x || null).catch(() => null),
    del: (id) => tx('readwrite', s => s.delete(id)),
  };
})();
window.BrArq = BrArq;

/* ---------- com o banco dela: o PDF também sobe para a nuvem (link que vale em todo aparelho) ---------- */
async function brSobeNuvem(b, file) {
  if (!(typeof temNuvem === 'function' && temNuvem() && typeof isLoggedIn === 'function' && isLoggedIn() && typeof SUPA_URL !== 'undefined' && SUPA_URL)) return '';
  const slug = String(file.name || b.titulo || 'brinde').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'brinde.pdf';
  const caminho = b.id + '-' + Math.random().toString(36).slice(2, 10) + '-' + (slug.endsWith('.pdf') ? slug : slug + '.pdf');
  try {
    const r = await fetch(SUPA_URL + '/storage/v1/object/brindes/' + caminho, { method: 'POST',
      headers: { apikey: SUPA_KEY, authorization: 'Bearer ' + authToken(), 'content-type': file.type || 'application/pdf', 'x-upsert': 'true' }, body: file });
    if (!r.ok) return '';
    return SUPA_URL + '/storage/v1/object/public/brindes/' + caminho;
  } catch (e) { return ''; }
}

/* ---------- a mensagem ---------- */
function brMensagem(b, nome, comLink) {
  const pn = String(nome || '').trim().split(/\s+/)[0];
  return `Oi${pn ? ', ' + pn : ''}! 😊 Como presente pela sua reserva, preparei um material para a sua viagem: *${b.titulo}*${b.texto ? '\n' + b.texto : ''}${comLink && b.url ? '\n\n' + brUrlAbs(b.url) : ''}\n\nEspero que goste! Qualquer dúvida, é só me chamar.`;
}
/* quem reservou (reserva confirmada, de hoje para frente ou dos últimos 30 dias) e ainda não recebeu os brindes "sempre" */
function brindesPendentes() {
  const sempre = Brindes.all().filter(b => b.sempre && brTem(b));
  if (!sempre.length) return [];
  const hoje = isoToday(), desde = addDays(hoje, -30), vistos = new Set(), out = [];
  for (const b of (DB.bookings || []).filter(b => b.status === 'confirmed' && b.date >= desde).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))) {
    const chave = String(b.email || b.whats || b.name || '').toLowerCase();
    if (vistos.has(chave)) continue; vistos.add(chave);
    const falta = sempre.filter(br => !Brindes.jaRecebeu(chave, br.id));
    if (falta.length) out.push({ chave, nome: b.name, whats: b.whats || '', email: b.email || '', faltam: falta, motivo: `reservou ${(Tours.get(b.tourId) && tl(Tours.get(b.tourId).name)) || 'um passeio'} · falta: ${falta.map(x => x.titulo).join(', ')}` });
  }
  return out;
}
window.brindesPendentes = brindesPendentes;

/* o PDF deste aparelho, como arquivo pronto para anexar */
async function brArquivo(b) {
  if (!b.arquivo) return null;
  const blob = await BrArq.get(b.id); if (!blob) return null;
  try { return new File([blob], b.arquivo.nome || (b.titulo + '.pdf'), { type: blob.type || 'application/pdf' }); } catch (e) { return blob; }
}
function brBaixa(file, nome) {
  const u = URL.createObjectURL(file), a = document.createElement('a');
  a.href = u; a.download = nome || file.name || 'brinde.pdf'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
/* abrir o "compartilhar" do aparelho com o PDF anexado (celular e Safari); false = este navegador não sabe */
async function brCompartilha(file, texto, titulo) {
  try {
    if (!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }))) return false;
    await navigator.share({ files: [file], title: titulo, text: texto });
    return true;
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelou'; return false; }
}

/* mandar a UM cliente (fica anotado na ficha). Devolve true quando foi. */
async function brMandar(brinde, cli, canal) {
  if (!brTem(brinde)) { toast('Este brinde ainda não tem o PDF — suba o arquivo ou cole o link'); return false; }
  const num = String(cli.whats || '').replace(/\D/g, '');
  /* 1) tem link (nuvem dela ou Drive): o WhatsApp DO CLIENTE abre com a mensagem e o link */
  if (brLinkOk(brinde.url)) {
    const msg = brMensagem(brinde, cli.nome, true);
    if (canal === 'email') {
      if (!cli.email) { toast('Este cliente não tem e-mail na ficha'); return false; }
      location.href = 'mailto:' + encodeURIComponent(cli.email) + '?subject=' + encodeURIComponent('Um presente para a sua viagem: ' + brinde.titulo) + '&body=' + encodeURIComponent(msg.replace(/\*/g, ''));
    } else {
      if (num.length < 8) { toast('Este cliente não tem WhatsApp na ficha — complete a ficha ou mande por e-mail'); return false; }
      window.open(waLink(msg, num), '_blank', 'noopener');
    }
    Brindes.registra(brinde, cli.chave, cli.nome, canal || 'whatsapp');
    toast('Registrado: ' + brinde.titulo + ' → ' + cli.nome);
    return true;
  }
  /* 2) só o arquivo neste aparelho: anexa o PDF de verdade */
  const file = await brArquivo(brinde);
  if (!file) { toast('O PDF deste brinde está em outro aparelho. Suba de novo aqui (Trocar PDF) para mandar deste.'); return false; }
  const msg = brMensagem(brinde, cli.nome, false);
  const r = await brCompartilha(file, msg, brinde.titulo);
  if (r === 'cancelou') return false;
  if (r !== true) {
    /* computador: baixa o PDF e abre a conversa com a mensagem — é só arrastar o arquivo */
    brBaixa(file);
    if (canal === 'email' && cli.email) location.href = 'mailto:' + encodeURIComponent(cli.email) + '?subject=' + encodeURIComponent('Um presente para a sua viagem: ' + brinde.titulo) + '&body=' + encodeURIComponent(msg.replace(/\*/g, '') + '\n\n(o PDF vai em anexo)');
    else window.open(waLink(msg, num.length >= 8 ? num : undefined), '_blank', 'noopener');
    toast('O PDF baixou: arraste o arquivo para a conversa que abriu');
  }
  Brindes.registra(brinde, cli.chave, cli.nome, r === true ? 'compartilhar' : (canal || 'whatsapp'));
  toast('Registrado: ' + brinde.titulo + ' → ' + cli.nome);
  return true;
}
window.brMandar = brMandar;
/* mandar para QUALQUER pessoa (não fica em ficha nenhuma) */
async function brCompartilhaLivre(brinde) {
  const file = await brArquivo(brinde);
  const msg = brMensagem(brinde, '', !file && brLinkOk(brinde.url));
  if (file) {
    const r = await brCompartilha(file, msg, brinde.titulo);
    if (r === true || r === 'cancelou') return;
    brBaixa(file); toast('O PDF baixou — mande para quem quiser'); return;
  }
  if (brLinkOk(brinde.url)) {
    try { if (navigator.share) { await navigator.share({ title: brinde.titulo, text: msg }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(msg.replace(/\*/g, '')); toast('Mensagem com o link copiada — cole para quem quiser'); } catch (e) { prompt('Copie:', msg); }
    return;
  }
  toast('O PDF deste brinde está em outro aparelho — suba de novo aqui');
}

/* subir (ou trocar) o PDF de um brinde */
async function brGuardaArquivo(b, file) {
  if (!file) return false;
  if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name || '')) { toast('Escolha um arquivo PDF'); return false; }
  if (file.size > BR_MAX) { toast('PDF grande demais (até 25 MB). Diminua no "Salvar como PDF" ou use um link do Drive.'); return false; }
  try { await BrArq.put(b.id, file); }
  catch (e) { toast('Não consegui guardar o PDF neste aparelho (' + (e && e.message || 'sem espaço') + ')'); return false; }
  const url = await brSobeNuvem(b, file);
  Brindes.update(b.id, { arquivo: { nome: file.name || 'brinde.pdf', tamanho: file.size, em: new Date().toISOString() }, ...(url ? { url } : {}) });
  toast(url ? 'PDF guardado no app e na sua nuvem' : 'PDF guardado no app');
  return true;
}
window.brGuardaArquivo = brGuardaArquivo;

/* ---------- a seção na aba Cupons e brindes ---------- */
function brCss() {
  if (document.getElementById('brCss')) return;
  const s = document.createElement('style'); s.id = 'brCss';
  s.textContent = `.br{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line)}.br:last-child{border-bottom:0}
  .br[data-br] .acs{flex-basis:100%;justify-content:flex-start;padding-left:54px}
  @media(max-width:640px){.br[data-br] .acs{padding-left:0}}
  .br .ic{width:42px;height:42px;flex:none;border-radius:10px;display:grid;place-items:center;background:var(--highlight-wash);font-size:20px}
  .br .tx{flex:1;min-width:0}.br .tx b{display:block}.br .tx small{display:block;color:var(--ink-3);margin-top:2px}
  .br .acs{display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:flex-end}
  .br select{min-height:36px;max-width:200px}
  .brForm{display:grid;grid-template-columns:1fr 1fr;gap:10px}.brForm .w{grid-column:1/-1}
  .brSobe{display:flex;gap:12px;align-items:center;flex-wrap:wrap;border:1.5px dashed var(--line-2);border-radius:12px;padding:14px;background:var(--surface-2)}
  .brSobe.ok{border-style:solid;border-color:var(--brand-assinatura);background:var(--highlight-wash)}
  .brSobe .nome{flex:1;min-width:160px;font-size:13px;color:var(--ink-2)}
  .brSobe input[type=file]{display:none}
  .brOu{font-size:12px;color:var(--ink-3);text-align:center;margin:-2px 0}
  @media(max-width:640px){.brForm{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}
function brSecaoHtml() {
  const lista = Brindes.all(), clientes = (typeof Clients !== 'undefined' ? Clients.all() : []);
  const pend = brindesPendentes();
  const opcoes = clientes.map(c => { const k = c.chave || String(c.email || c.whats || c.name).toLowerCase(); return `<option value="${esc(k)}">${esc(c.name)}</option>`; }).join('');
  const onde = (b) => b.arquivo ? `📎 ${esc(b.arquivo.nome)} (${brTam(+b.arquivo.tamanho || 0)})${brLinkOk(b.url) ? ' · na sua nuvem' : ' · neste aparelho'}` : brLinkOk(b.url) ? 'link do PDF' : '<b style="color:var(--warn)">falta o PDF</b>';
  return `<section class="card" id="brSec"><h3>🎁 Brindes em PDF</h3>
    <p class="why">Os materiais que você dá de presente. Suba o PDF aqui e mande para um cliente (fica anotado na ficha dele) ou para quem quiser.</p>
    ${lista.length ? lista.map(b => `<div class="br" data-br="${esc(b.id)}"><span class="ic">📄</span>
      <div class="tx"><b>${esc(b.titulo)}</b>${b.texto ? `<small>${esc(b.texto)}</small>` : ''}
        <small>${onde(b)} · ${b.sempre ? 'entra para todo mundo que reserva' : 'só quando você escolher'} · mandado ${Brindes.envios().filter(e => e.brindeId === b.id).length}x</small></div>
      <div class="acs">${brTem(b) ? `${clientes.length ? `<select data-para aria-label="Mandar para"><option value="">mandar para…</option>${opcoes}</select><button class="mini" data-manda>WhatsApp</button><button class="mini ghost" data-mail>e-mail</button>` : ''}
          <button class="mini" data-livre title="Mandar para qualquer pessoa">Compartilhar</button><button class="mini ghost" data-ver>Ver</button>` : ''}
        <label class="mini" style="cursor:pointer">${b.arquivo ? 'Trocar PDF' : 'Subir PDF'}<input type="file" accept="application/pdf,.pdf" data-arq hidden></label>
        <button class="mini" data-ed>Editar</button><button class="mini ghost" data-del aria-label="Apagar">×</button></div></div>`).join('')
      : '<p class="empty">Nenhum brinde ainda. Suba o primeiro PDF aqui embaixo.</p>'}
    ${pend.length ? `<p class="tfGrupo" style="margin-top:14px">Reservaram e ainda não receberam (${pend.length})</p>
      ${pend.slice(0, 12).map(p => `<div class="br" data-pend="${esc(p.chave)}"><span class="ic">🎁</span><div class="tx"><b>${esc(p.nome)}</b><small>${esc(p.motivo)}</small></div>
        <div class="acs">${p.faltam.map(br => `<button class="mini" data-pbr="${esc(br.id)}">${esc(br.titulo.slice(0, 22))} →</button>`).join('')}</div></div>`).join('')}` : ''}
    <details style="margin-top:12px" id="brNovoBox" ${lista.length ? '' : 'open'}><summary class="mini" style="display:inline-flex;cursor:pointer">+ Novo brinde</summary>
      <div class="brForm" style="margin-top:10px">
        <div class="w brSobe" id="brSobe"><span style="font-size:24px" aria-hidden="true">📄</span><span class="nome" id="brArqNome">Escolha o PDF do brinde (até 25 MB)</span>
          <label class="cta sm" style="cursor:pointer">Escolher o PDF<input type="file" id="brArq" accept="application/pdf,.pdf"></label></div>
        <p class="w brOu">ou cole um link do Google Drive</p>
        <label class="fld">Título<input id="brTit" placeholder="Guia de second hand em Copenhague"></label>
        <label class="fld">Link do PDF (opcional)<input id="brUrl" inputmode="url" placeholder="https://drive.google.com/…"></label>
        <label class="fld w">Uma frase sobre ele (vai na mensagem)<input id="brTxt" placeholder="Os brechós e lojas de segunda mão que eu mais gosto na cidade."></label>
        <label class="optin w"><input type="checkbox" id="brSempre" checked><span><b>Mandar para todo mundo que reserva</b><small>Quem reservar e ainda não recebeu aparece aqui e no Hoje.</small></span></label>
        <div class="w"><button class="cta sm" id="brAdd">Guardar brinde</button></div>
      </div></details>
  </section>`;
}
function brLigaSecao() {
  const sec = document.getElementById('brSec'); if (!sec) return;
  const cliDe = (chave) => { const F = typeof fichaDe === 'function' ? fichaDe(chave) : null; return F ? { chave, nome: F.nome, whats: F.whats, email: F.email } : null; };
  sec.querySelectorAll('.br[data-br]').forEach(el => {
    const b = Brindes.get(el.dataset.br); if (!b) return;
    const sel = el.querySelector('[data-para]');
    const manda = async (canal) => { const k = sel && sel.value; if (!k) { toast('Escolha o cliente'); return; } const c = cliDe(k); if (!c) { toast('Cliente não encontrado'); return; } if (await brMandar(b, c, canal)) admCoupons(); };
    if (el.querySelector('[data-manda]')) el.querySelector('[data-manda]').onclick = () => manda('whatsapp');
    if (el.querySelector('[data-mail]')) el.querySelector('[data-mail]').onclick = () => manda('email');
    if (el.querySelector('[data-livre]')) el.querySelector('[data-livre]').onclick = () => brCompartilhaLivre(b);
    if (el.querySelector('[data-ver]')) el.querySelector('[data-ver]').onclick = async () => {
      const f = await brArquivo(b);
      if (f) { const u = URL.createObjectURL(f); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 120000); }
      else if (brLinkOk(b.url)) window.open(brUrlAbs(b.url), '_blank', 'noopener');
      else toast('O PDF está em outro aparelho');
    };
    el.querySelector('[data-arq]').onchange = async (e) => { const f = e.target.files && e.target.files[0]; if (f && await brGuardaArquivo(b, f)) admCoupons(); };
    el.querySelector('[data-del]').onclick = () => { if (confirm(`Apagar o brinde "${b.titulo}"? Os envios já anotados continuam nas fichas.`)) { Brindes.remove(b.id); admCoupons(); } };
    el.querySelector('[data-ed]').onclick = () => {
      const tit = prompt('Título:', b.titulo); if (tit === null) return;
      const txt = prompt('Uma frase sobre ele:', b.texto || ''); if (txt === null) return;
      const url = b.arquivo ? (b.url || '') : prompt('Link do PDF (vazio = sem link):', b.url || ''); if (url === null) return;
      if (url.trim() && !brLinkOk(url)) { toast('O link precisa começar com https://'); return; }
      Brindes.update(b.id, { titulo: tit.trim() || b.titulo, url: url.trim(), texto: txt.trim() }); admCoupons();
    };
  });
  sec.querySelectorAll('.br[data-pend]').forEach(el => el.querySelectorAll('[data-pbr]').forEach(bt => bt.onclick = async () => {
    const b = Brindes.get(bt.dataset.pbr), c = cliDe(el.dataset.pend); if (b && c && await brMandar(b, c, 'whatsapp')) admCoupons();
  }));
  /* o formulário: o PDF escolhido fica esperando o "Guardar" */
  let escolhido = null;
  const arq = sec.querySelector('#brArq');
  if (arq) arq.onchange = () => {
    const f = arq.files && arq.files[0]; escolhido = null;
    if (!f) return;
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name || '')) { toast('Escolha um arquivo PDF'); arq.value = ''; return; }
    if (f.size > BR_MAX) { toast('PDF grande demais (até 25 MB)'); arq.value = ''; return; }
    escolhido = f;
    sec.querySelector('#brArqNome').textContent = `${f.name} · ${brTam(f.size)}`;
    sec.querySelector('#brSobe').classList.add('ok');
    const tit = sec.querySelector('#brTit');
    if (!tit.value.trim()) tit.value = f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
  };
  const add = sec.querySelector('#brAdd');
  if (add) add.onclick = async () => {
    const titulo = sec.querySelector('#brTit').value.trim(), url = sec.querySelector('#brUrl').value.trim();
    if (!titulo) { toast('Dê um título ao brinde'); return; }
    if (url && !brLinkOk(url)) { toast('O link precisa começar com https://'); return; }
    if (!escolhido && !url) { toast('Escolha o PDF ou cole o link'); return; }
    add.disabled = true; add.textContent = 'Guardando…';
    const b = Brindes.add({ titulo, url, texto: sec.querySelector('#brTxt').value.trim(), sempre: sec.querySelector('#brSempre').checked });
    if (escolhido && !(await brGuardaArquivo(b, escolhido))) { if (!url) Brindes.remove(b.id); add.disabled = false; add.textContent = 'Guardar brinde'; return; }
    if (!escolhido) toast('Brinde guardado');
    admCoupons();
  };
}
const _admCouponsBr = admCoupons;
admCoupons = function () {
  _admCouponsBr();
  brCss(); if (typeof agCss === 'function') agCss();
  const stage = document.getElementById('stage'); if (!stage || document.getElementById('brSec')) return;
  stage.insertAdjacentHTML('beforeend', brSecaoHtml());
  brLigaSecao();
};

/* ---------- na ficha do cliente ---------- */
window.brindesSecaoFicha = function (F) {
  brCss();
  const env = Brindes.enviadosPara(F.key), lista = Brindes.all().filter(brTem);
  if (!env.length && !lista.length) return '';
  const como = { email: 'e-mail', compartilhar: 'compartilhar (PDF anexado)', whatsapp: 'WhatsApp' };
  return `<section class="card" id="brFicha"><h3>🎁 Brindes</h3>
    ${env.length ? env.map(e => `<div class="br"><span class="ic">✓</span><div class="tx"><b>${esc(e.titulo)}</b><small>mandado em ${esc(new Date(e.quando).toLocaleDateString('pt-BR'))} por ${esc(como[e.canal] || 'WhatsApp')}</small></div></div>`).join('') : '<p class="empty">Ainda não recebeu nenhum brinde.</p>'}
    ${lista.length ? `<div class="fc-acoes">${lista.map(b => `<button class="mini" data-fbr="${esc(b.id)}">${Brindes.jaRecebeu(F.key, b.id) ? 'mandar de novo: ' : 'mandar: '}${esc(b.titulo.slice(0, 26))}</button>`).join('')}</div>` : ''}
  </section>`;
};
window.brindesLigaFicha = function (F) {
  document.querySelectorAll('#brFicha [data-fbr]').forEach(bt => bt.onclick = async () => {
    const b = Brindes.get(bt.dataset.fbr);
    if (b && await brMandar(b, { chave: F.key, nome: F.nome, whats: F.whats, email: F.email }, F.whats ? 'whatsapp' : 'email')) admFichaCliente(F.key);
  });
};
