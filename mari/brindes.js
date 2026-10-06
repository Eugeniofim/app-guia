/* =====================================================
   BRINDES EM PDF (06/10/2026)

   Pedido do Eugênio: "quando cliente compra tour, Mari presenteia PDF de
   second hand + PDF, deixar esses PDF dentro da aba brindes pra ela escolher
   pra quem mandar de brinde".

   - DB.brindes: título, texto curto e o LINK do PDF (Google Drive, Dropbox
     ou um arquivo publicado junto do app em brindes/). "Mandar sempre que
     alguém reserva" marca o brinde que entra na lista de pendentes.
   - DB.brindesEnvios: a quem foi, quando e por onde — aparece na ficha.
   - Mandar = abre o WhatsApp (ou o e-mail) dela com a mensagem e o link
     prontos. Nada sai sozinho: quem envia é ela.
   Tudo privado (nuvem-itens.js), nunca nos Ajustes públicos.
   ===================================================== */
'use strict';

const Brindes = {
  all() { if (!Array.isArray(DB.brindes)) DB.brindes = []; return DB.brindes; },
  envios() { if (!Array.isArray(DB.brindesEnvios)) DB.brindesEnvios = []; return DB.brindesEnvios; },
  get(id) { return this.all().find(x => x.id === id) || null; },
  add(c) { const x = Object.assign({ id: 'br' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), titulo: '', texto: '', url: '', sempre: true, criado: new Date().toISOString() }, c); this.all().push(x); save(); return x; },
  update(id, c) { const x = this.get(id); if (x) { Object.assign(x, c); save(); } return x; },
  remove(id) { DB.brindes = this.all().filter(x => x.id !== id); save(); },
  enviadosPara(chave) { return this.envios().filter(e => e.chave === chave); },
  jaRecebeu(chave, brindeId) { return this.envios().some(e => e.chave === chave && e.brindeId === brindeId); },
  registra(brinde, chave, nome, canal) { const e = { id: 'be' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), brindeId: brinde.id, titulo: brinde.titulo, chave, nome, canal, quando: new Date().toISOString() }; this.envios().push(e); save(); return e; },
};
const brLinkOk = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(String(u || '').trim()) || /^brindes\/[\w.\- ]+\.pdf$/i.test(String(u || '').trim());
const brUrlAbs = (u) => /^brindes\//.test(u) ? new URL(u, location.href.split('#')[0]).href : u;
function brMensagem(b, nome) {
  const pn = String(nome || '').trim().split(/\s+/)[0];
  return `Oi${pn ? ', ' + pn : ''}! 😊 Como presente pela sua reserva, preparei um material para a sua viagem: *${b.titulo}*${b.texto ? '\n' + b.texto : ''}\n\n${brUrlAbs(b.url)}\n\nEspero que goste! Qualquer dúvida, é só me chamar.`;
}
/* quem reservou (reserva confirmada, de hoje para frente ou dos últimos 30 dias) e ainda não recebeu os brindes "sempre" */
function brindesPendentes() {
  const sempre = Brindes.all().filter(b => b.sempre && brLinkOk(b.url));
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

/* abre o WhatsApp/e-mail com tudo pronto e registra o envio */
function brMandar(brinde, cli, canal) {
  if (!brLinkOk(brinde.url)) { toast('Este brinde ainda não tem o link do PDF'); return false; }
  const msg = brMensagem(brinde, cli.nome);
  if (canal === 'email') {
    if (!cli.email) { toast('Este cliente não tem e-mail na ficha'); return false; }
    location.href = 'mailto:' + encodeURIComponent(cli.email) + '?subject=' + encodeURIComponent('Um presente para a sua viagem: ' + brinde.titulo) + '&body=' + encodeURIComponent(msg.replace(/\*/g, ''));
  } else {
    const num = String(cli.whats || '').replace(/\D/g, '');
    if (num.length < 8) { toast('Este cliente não tem WhatsApp na ficha — complete a ficha ou mande por e-mail'); return false; }
    window.open(waLink(msg, num), '_blank', 'noopener');
  }
  Brindes.registra(brinde, cli.chave, cli.nome, canal || 'whatsapp');
  toast('Registrado: ' + brinde.titulo + ' → ' + cli.nome);
  return true;
}

/* ---------- a seção na aba Cupons e brindes ---------- */
function brCss() {
  if (document.getElementById('brCss')) return;
  const s = document.createElement('style'); s.id = 'brCss';
  s.textContent = `.br{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line)}.br:last-child{border-bottom:0}
  .br .ic{width:42px;height:42px;flex:none;border-radius:10px;display:grid;place-items:center;background:var(--highlight-wash);font-size:20px}
  .br .tx{flex:1;min-width:0}.br .tx b{display:block}.br .tx small{display:block;color:var(--ink-3);margin-top:2px}
  .br .acs{display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:flex-end}
  .br select{min-height:36px;max-width:200px}
  .brForm{display:grid;grid-template-columns:1fr 1fr;gap:10px}.brForm .w{grid-column:1/-1}
  @media(max-width:640px){.brForm{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}
function brSecaoHtml() {
  const lista = Brindes.all(), clientes = (typeof Clients !== 'undefined' ? Clients.all() : []);
  const pend = brindesPendentes();
  const opcoes = clientes.map(c => { const k = c.chave || String(c.email || c.whats || c.name).toLowerCase(); return `<option value="${esc(k)}">${esc(c.name)}</option>`; }).join('');
  return `<section class="card" id="brSec"><h3>🎁 Brindes em PDF</h3>
    <p class="why">Os materiais que você dá de presente a quem reserva. Escolha para quem mandar: o WhatsApp abre com a mensagem e o link prontos, e o envio fica anotado na ficha do cliente.</p>
    ${lista.length ? lista.map(b => `<div class="br" data-br="${esc(b.id)}"><span class="ic">📄</span>
      <div class="tx"><b>${esc(b.titulo)}</b>${b.texto ? `<small>${esc(b.texto)}</small>` : ''}
        <small>${brLinkOk(b.url) ? `<a href="${esc(brUrlAbs(b.url))}" target="_blank" rel="noopener">abrir o PDF</a>` : '<b style="color:var(--warn)">falta o link do PDF</b>'} · ${b.sempre ? 'entra para todo mundo que reserva' : 'só quando você escolher'} · mandado ${Brindes.envios().filter(e => e.brindeId === b.id).length}x</small></div>
      <div class="acs">${clientes.length && brLinkOk(b.url) ? `<select data-para aria-label="Mandar para"><option value="">mandar para…</option>${opcoes}</select><button class="mini" data-manda>WhatsApp</button><button class="mini ghost" data-mail>e-mail</button>` : ''}
        <button class="mini" data-ed>Editar</button><button class="mini ghost" data-del aria-label="Apagar">×</button></div></div>`).join('')
      : '<p class="empty">Nenhum brinde ainda. Cadastre abaixo: o título, uma frase e o link do PDF.</p>'}
    ${pend.length ? `<p class="tfGrupo" style="margin-top:14px">Reservaram e ainda não receberam (${pend.length})</p>
      ${pend.slice(0, 12).map(p => `<div class="br" data-pend="${esc(p.chave)}"><span class="ic">🎁</span><div class="tx"><b>${esc(p.nome)}</b><small>${esc(p.motivo)}</small></div>
        <div class="acs">${p.faltam.map(br => `<button class="mini" data-pbr="${esc(br.id)}">${esc(br.titulo.slice(0, 22))} →</button>`).join('')}</div></div>`).join('')}` : ''}
    <details style="margin-top:12px" id="brNovoBox" ${lista.length ? '' : 'open'}><summary class="mini" style="display:inline-flex;cursor:pointer">+ Novo brinde</summary>
      <div class="brForm" style="margin-top:10px">
        <label class="fld">Título<input id="brTit" placeholder="Guia de second hand em Copenhague"></label>
        <label class="fld">Link do PDF<input id="brUrl" inputmode="url" placeholder="https://drive.google.com/…"></label>
        <label class="fld w">Uma frase sobre ele (vai na mensagem)<input id="brTxt" placeholder="Os brechós e lojas de segunda mão que eu mais gosto na cidade."></label>
        <label class="optin w"><input type="checkbox" id="brSempre" checked><span><b>Mandar para todo mundo que reserva</b><small>Quem reservar e ainda não recebeu aparece aqui e no Hoje.</small></span></label>
        <div class="w"><button class="cta sm" id="brAdd">Guardar brinde</button>
        <p class="why">Dica: no Google Drive, clique com o botão direito no PDF → Compartilhar → "Qualquer pessoa com o link" → Copiar link. Ou mande o PDF para o Eugênio, que ele coloca dentro do app.</p></div>
      </div></details>
  </section>`;
}
function brLigaSecao() {
  const sec = document.getElementById('brSec'); if (!sec) return;
  const cliDe = (chave) => { const F = typeof fichaDe === 'function' ? fichaDe(chave) : null; return F ? { chave, nome: F.nome, whats: F.whats, email: F.email } : null; };
  sec.querySelectorAll('.br[data-br]').forEach(el => {
    const b = Brindes.get(el.dataset.br); if (!b) return;
    const sel = el.querySelector('[data-para]');
    const manda = (canal) => { const k = sel && sel.value; if (!k) { toast('Escolha o cliente'); return; } const c = cliDe(k); if (!c) { toast('Cliente não encontrado'); return; } if (brMandar(b, c, canal)) admCoupons(); };
    if (el.querySelector('[data-manda]')) el.querySelector('[data-manda]').onclick = () => manda('whatsapp');
    if (el.querySelector('[data-mail]')) el.querySelector('[data-mail]').onclick = () => manda('email');
    el.querySelector('[data-del]').onclick = () => { if (confirm(`Apagar o brinde "${b.titulo}"? Os envios já anotados continuam nas fichas.`)) { Brindes.remove(b.id); admCoupons(); } };
    el.querySelector('[data-ed]').onclick = () => {
      const tit = prompt('Título:', b.titulo); if (tit === null) return;
      const url = prompt('Link do PDF:', b.url || ''); if (url === null) return;
      const txt = prompt('Uma frase sobre ele:', b.texto || ''); if (txt === null) return;
      if (url.trim() && !brLinkOk(url)) { toast('O link precisa começar com https://'); return; }
      Brindes.update(b.id, { titulo: tit.trim() || b.titulo, url: url.trim(), texto: txt.trim() }); admCoupons();
    };
  });
  sec.querySelectorAll('.br[data-pend]').forEach(el => el.querySelectorAll('[data-pbr]').forEach(bt => bt.onclick = () => {
    const b = Brindes.get(bt.dataset.pbr), c = cliDe(el.dataset.pend); if (b && c && brMandar(b, c, 'whatsapp')) admCoupons();
  }));
  const add = sec.querySelector('#brAdd');
  if (add) add.onclick = () => {
    const titulo = sec.querySelector('#brTit').value.trim(), url = sec.querySelector('#brUrl').value.trim();
    if (!titulo) { toast('Dê um título ao brinde'); return; }
    if (url && !brLinkOk(url)) { toast('O link precisa começar com https://'); return; }
    Brindes.add({ titulo, url, texto: sec.querySelector('#brTxt').value.trim(), sempre: sec.querySelector('#brSempre').checked });
    toast('Brinde guardado'); admCoupons();
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
  const env = Brindes.enviadosPara(F.key), lista = Brindes.all().filter(b => brLinkOk(b.url));
  if (!env.length && !lista.length) return '';
  return `<section class="card" id="brFicha"><h3>🎁 Brindes</h3>
    ${env.length ? env.map(e => `<div class="br"><span class="ic">✓</span><div class="tx"><b>${esc(e.titulo)}</b><small>mandado em ${esc(new Date(e.quando).toLocaleDateString('pt-BR'))} por ${esc(e.canal === 'email' ? 'e-mail' : 'WhatsApp')}</small></div></div>`).join('') : '<p class="empty">Ainda não recebeu nenhum brinde.</p>'}
    ${lista.length ? `<div class="fc-acoes">${lista.map(b => `<button class="mini" data-fbr="${esc(b.id)}">${Brindes.jaRecebeu(F.key, b.id) ? 'mandar de novo: ' : 'mandar: '}${esc(b.titulo.slice(0, 26))}</button>`).join('')}</div>` : ''}
  </section>`;
};
window.brindesLigaFicha = function (F) {
  document.querySelectorAll('#brFicha [data-fbr]').forEach(bt => bt.onclick = () => {
    const b = Brindes.get(bt.dataset.fbr); if (b && brMandar(b, { chave: F.key, nome: F.nome, whats: F.whats, email: F.email }, F.whats ? 'whatsapp' : 'email')) admFichaCliente(F.key);
  });
};
