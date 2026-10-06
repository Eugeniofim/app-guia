/* =====================================================
   PARCEIROS COM DESCONTO (06/10/2026)

   Pedido da Mari: "aba de parceiros com desconto: 10% souvenir, 15% roupa
   local, 5% roupa térmica no Brasil".

   - DB.settings.parceiros — PÚBLICO de propósito: o cliente vê no site
     (#/parceiros), no cartão da primeira tela e no voucher de cada passeio.
     [{id, nome, categoria, desconto (número, %), como (texto: "mostre o
     voucher" ou o código), endereco, cidade, link, ativo}]
   - Nasce com as três categorias que ela pediu, SEM nome e desligadas: o
     site nunca mostra parceiro desligado ou sem nome. Ela só escreve o nome
     da loja e liga "Mostrar no site". Os ids da semente são fixos, para dois
     aparelhos não criarem cópias.
   - Aba do painel "Parceiros" (logo depois de Cupons): lista, editor de todos
     os campos, liga/desliga e apagar.
   - window.Parceiros = { all, ativos(), get(id), add(c), update(id, c), remove(id) }
   ===================================================== */
'use strict';

const PARC_SEMENTE = [
  { id: 'pc-souvenir', categoria: 'Lembranças e souvenir', desconto: 10, como: 'Mostre o seu voucher do passeio no caixa', cidade: 'Copenhague' },
  { id: 'pc-roupa-local', categoria: 'Roupa local', desconto: 15, como: 'Mostre o seu voucher do passeio no caixa', cidade: 'Copenhague' },
  { id: 'pc-roupa-termica', categoria: 'Roupa térmica (no Brasil)', desconto: 5, como: '', cidade: 'Brasil' },
];
const PARC_CATEGORIAS = ['Lembranças e souvenir', 'Roupa local', 'Roupa térmica (no Brasil)', 'Restaurante e café', 'Doces e chocolate', 'Design e decoração', 'Passeio e ingresso'];
/* ícone de traço (etiqueta com %), no mesmo desenho do ICONE_MENU */
const ICONE_PARCEIROS = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7" cy="7" r="1.1"/><path d="M10.5 16.5l6-6"/><circle cx="11.6" cy="11.4" r=".9"/><circle cx="15.4" cy="15.6" r=".9"/></svg>';

function parcNormaliza(c) {
  const o = Object.assign({ id: '', nome: '', categoria: '', desconto: 0, como: '', endereco: '', cidade: '', link: '', ativo: false }, c || {});
  if (!o.id) o.id = 'pc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const d = Math.round((+String(o.desconto).replace(',', '.').replace('%', '') || 0) * 10) / 10;
  o.desconto = Math.max(0, Math.min(100, d));
  for (const k of ['nome', 'categoria', 'como', 'endereco', 'cidade', 'link']) o[k] = String(o[k] == null ? '' : o[k]).trim();
  o.link = parcLink(o.link);
  o.ativo = !!o.ativo;
  return o;
}
/* "@loja" vira o Instagram; "loja.dk" ganha https:// — o resto é o que ela escreveu */
function parcLink(u) {
  u = String(u || '').trim(); if (!u) return '';
  if (/^@[\w.]+$/.test(u)) return 'https://instagram.com/' + u.slice(1);
  if (!/^https?:\/\//i.test(u) && /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(u)) return 'https://' + u;
  return u;
}
const parcLinkSeguro = (u) => (/^https?:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : '');

const Parceiros = {
  /* a lista completa (painel). A semente entra só se ela nunca teve parceiros. */
  all() {
    if (DB.settings.parceiros === undefined) { DB.settings.parceiros = PARC_SEMENTE.map(parcNormaliza); save(); }
    if (!Array.isArray(DB.settings.parceiros)) DB.settings.parceiros = [];
    return DB.settings.parceiros;
  },
  /* o que o cliente vê: ligado E com nome (não semeia nada — o site só lê) */
  ativos() {
    const l = Array.isArray(DB.settings.parceiros) ? DB.settings.parceiros : [];
    return l.filter(p => p && p.ativo && String(p.nome || '').trim());
  },
  get(id) { return this.all().find(p => p.id === id) || null; },
  add(c) { const p = parcNormaliza(Object.assign({}, c || {}, { id: '' })); this.all().push(p); save(); return p; },
  update(id, c) {
    const p = this.get(id); if (!p) return null;
    Object.assign(p, parcNormaliza(Object.assign({}, p, c || {}, { id: p.id })));
    save(); return p;
  },
  remove(id) {
    const antes = this.all().length;
    DB.settings.parceiros = this.all().filter(p => p.id !== id);
    if (DB.settings.parceiros.length === antes) return false;
    save(); return true;
  },
  maiorDesconto() { return this.ativos().reduce((m, p) => Math.max(m, +p.desconto || 0), 0); },
};
window.Parceiros = Parceiros;

const parcPct = (v) => (+v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

/* ---------- estilo (painel + página do cliente) ---------- */
function parcCss() {
  if (document.getElementById('parcCss')) return;
  const s = document.createElement('style'); s.id = 'parcCss';
  s.textContent = `
  .prcLista .linha{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .prcLista .linha:last-child{border-bottom:0}
  .prcLista .tx{flex:1;min-width:180px}.prcLista .tx small{display:block;color:var(--ink-3)}
  .prcPct{width:58px;height:58px;border-radius:50%;flex:none;display:grid;place-items:center;background:var(--brand-assinatura);color:#1D2A44;font:700 16px/1 var(--f-display)}
  .prcPct.off{background:var(--surface-2);color:var(--ink-3)}
  .prcTog{display:flex;gap:6px;align-items:center;font-size:var(--fs-2);font-weight:600;cursor:pointer}
  .prcTog input{width:18px;height:18px;accent-color:var(--accent)}
  .prcEd{display:grid;gap:4px}
  .prcEd .frow{display:flex;gap:10px;flex-wrap:wrap}.prcEd .frow .fld{flex:1;min-width:180px}
  .prcEd textarea{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical}
  .prcPrev{max-width:420px}
  /* o cartão do parceiro (site e prévia): as cores dela */
  .prcCard{display:flex;gap:14px;align-items:flex-start;background:var(--surface);border-radius:18px;padding:16px;box-shadow:var(--sh-1);border:1px solid var(--line)}
  .prcCard .prcPct{width:72px;height:72px;font-size:21px;box-shadow:0 0 0 4px var(--surface),0 0 0 5.5px #F2C230}
  .prcCard .prcTx{flex:1;min-width:0}
  .prcCard small.cat{display:block;font:700 10.5px/1.3 var(--f-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
  .prcCard h3{font:700 18px/1.2 var(--f-display);margin:3px 0 6px;color:var(--ink)}
  .prcCard .como{display:flex;gap:8px;align-items:flex-start;background:#FBF7EC;color:#1D2A44;border-left:3px solid #F2C230;border-radius:8px;padding:8px 10px;font-size:14px;line-height:1.4;margin:6px 0}
  .prcCard .onde{font-size:13.5px;color:var(--ink-2);line-height:1.45;margin-top:6px;overflow-wrap:anywhere}
  .prcCard .acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .prcPub .prcHero{background:#1D2A44;color:#FBF7EC;border-radius:22px;padding:22px 20px;margin:4px 0 16px;position:relative;overflow:hidden}
  .prcPub .prcHero::before{content:"";display:block;width:28px;height:3px;border-radius:2px;background:#F2C230;margin-bottom:12px}
  .prcPub .prcHero small{display:block;font:700 10.5px/1 var(--f-ui);letter-spacing:.2em;text-transform:uppercase;color:#F2C230}
  .prcPub .prcHero h1{font:700 25px/1.15 var(--f-display);margin:8px 0 8px;color:#fff;letter-spacing:-.01em}
  .prcPub .prcHero p{font-size:15px;line-height:1.5;margin:0;opacity:.9;max-width:46ch}
  .prcPub .prcGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
  .prcPub .prcVazio{text-align:center;padding:26px 16px}
  @media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .prcCard .como{background:rgba(242,194,48,.12);color:var(--ink)} :root:not([data-theme="light"]) .prcPub .prcHero{background:#26365A;box-shadow:inset 0 0 0 1px rgba(242,194,48,.35)}}
  :root[data-theme="dark"] .prcCard .como{background:rgba(242,194,48,.12);color:var(--ink)} :root[data-theme="dark"] .prcPub .prcHero{background:#26365A;box-shadow:inset 0 0 0 1px rgba(242,194,48,.35)}
  :root[data-theme="dark"] .prcCard .como{background:rgba(242,194,48,.12);color:var(--ink)}
  @media(max-width:420px){.prcPub .prcGrid{grid-template-columns:1fr}.prcCard .prcPct{width:62px;height:62px;font-size:18px}}`;
  document.head.appendChild(s);
}
const parcEN = () => typeof LANG !== 'undefined' && LANG === 'en';
function parcCardHtml(p) {
  const link = parcLinkSeguro(p.link);
  const onde = [p.endereco, p.cidade].filter(Boolean).join(' · ');
  return `<article class="prcCard">
    <div class="prcPct" aria-label="${esc(parcPct(p.desconto))} de desconto">${esc(parcPct(p.desconto))}</div>
    <div class="prcTx">
      <small class="cat">${esc(p.categoria || (parcEN() ? 'Partner' : 'Parceiro'))}</small>
      <h3>${esc(p.nome || (parcEN() ? 'Shop name' : 'Nome da loja'))}</h3>
      ${p.como ? `<div class="como"><span>${esc(p.como)}</span></div>` : ''}
      ${onde ? `<div class="onde">${esc(onde)}</div>` : ''}
      ${(p.endereco || link) ? `<div class="acoes">
        ${p.endereco ? `<a class="mini" target="_blank" rel="noopener" href="${esc(mapLink([p.nome, p.endereco, p.cidade].filter(Boolean).join(', ')))}">${parcEN() ? 'Map' : 'Ver no mapa'}</a>` : ''}
        ${link ? `<a class="mini" target="_blank" rel="noopener" href="${esc(link)}">${parcEN() ? 'Visit the shop' : 'Ver a loja'}</a>` : ''}</div>` : ''}
    </div></article>`;
}

/* ---------- a página do cliente: #/parceiros ---------- */
function viewParceiros() {
  parcCss();
  const l = Parceiros.ativos();
  app.innerHTML = `
  <header class="topbar">
    <button class="backbtn" id="bk" aria-label="${esc(t('back'))}">←</button>
    <span class="tbrand">${logoMark(24, 'var(--brand-amarelo)')}<b>${esc(guiaNome())}</b></span>
  </header>
  <main class="wrap prcPub">
    <div class="prcHero"><small>${parcEN() ? 'For those who travel with me' : 'Para quem viaja comigo'}</small>
      <h1>${parcEN() ? 'My partners’ discounts' : 'Descontos dos meus parceiros'}</h1>
      <p>${parcEN() ? 'Shops I know and recommend. Show your tour voucher (or use the code) to get the discount.' : 'Lojas que eu conheço e indico. É só mostrar o voucher do seu passeio (ou usar o código) para ganhar o desconto.'}</p></div>
    ${l.length ? `<div class="prcGrid">${l.map(parcCardHtml).join('')}</div>`
      : `<section class="card prcVazio"><p class="desc">${parcEN() ? 'Coming soon: the list of shops is being prepared.' : 'Em breve: estou preparando a lista das lojas.'}</p></section>`}
    <a class="cta" href="${esc(waLink(parcEN() ? 'Hi! A question about the partner discounts…' : 'Oi, Mari! Uma dúvida sobre os descontos dos parceiros…'))}" target="_blank" rel="noopener">${parcEN() ? 'Questions? Message me on WhatsApp' : 'Dúvidas? Fale comigo no WhatsApp'}</a>
  </main>`;
  document.title = (parcEN() ? 'Partner discounts' : 'Descontos dos parceiros') + ' — ' + ((typeof guiaNegocio === 'function' && guiaNegocio()) || '');
  $('#bk').onclick = () => go('/');
}
window.ROTAS_EXTRA = window.ROTAS_EXTRA || {};
ROTAS_EXTRA['parceiros'] = () => viewParceiros();

/* ---------- o cartão na primeira tela (só com parceiro ligado e com nome) ---------- */
function parcCartaoHub() {
  /* #goAbout só existe na primeira tela */
  const ref = document.getElementById('goAbout');
  if (!ref || document.getElementById('goParc')) return;
  const l = Parceiros.ativos(); if (!l.length) return;
  const max = Parceiros.maiorDesconto();
  const sub = parcEN() ? `up to ${parcPct(max)} off at shops I recommend` : `até ${parcPct(max)} de desconto em lojas que eu indico`;
  ref.insertAdjacentHTML('beforebegin', `<button class="lk" id="goParc">
        <span class="ic">${ICONE_PARCEIROS}</span><span><b>${parcEN() ? 'My partners’ discounts' : 'Descontos dos meus parceiros'}</b><small>${esc(sub)}</small></span><span class="go" aria-hidden="true">→</span>
      </button>`);
  document.getElementById('goParc').onclick = () => go('/parceiros');
}
const _viewHubParc = viewHub;
viewHub = function () { const r = _viewHubParc.apply(this, arguments); try { parcCartaoHub(); } catch (e) { console.warn('parceiros', e); } return r; };

/* ---------- a aba do painel ---------- */
function admParceiros(arg) {
  parcCss();
  if (arg) return admParceiroEditar(decodeURIComponent(arg));
  const l = Parceiros.all();
  const semNome = l.filter(p => !p.nome);
  const noSite = Parceiros.ativos().length;
  admShell('parceiros', `
    <div class="pagehead"><h1 class="pageh">Parceiros</h1>
      <div class="chips"><a class="mini" href="#/parceiros">Ver como o cliente vê</a><button class="cta sm" id="prcNovo">+ Novo parceiro</button></div></div>
    <p class="why">Lojas que dão desconto para os seus clientes. Os parceiros ligados aparecem no site (botão "Descontos dos meus parceiros", na primeira tela) e no voucher de cada passeio. ${noSite ? `Hoje ${noSite === 1 ? 'aparece 1 parceiro' : 'aparecem ' + noSite + ' parceiros'} no site.` : 'Hoje nenhum aparece no site.'}</p>
    ${semNome.length ? `<div class="alert warn"><span>Falta o <b>nome da loja</b> em ${semNome.length === 1 ? '1 parceiro' : semNome.length + ' parceiros'} (${esc(semNome.map(p => p.categoria || 'sem categoria').join(', '))}). Toque em <b>Editar</b>, escreva o nome e como o cliente usa o desconto, e ligue <b>Mostrar no site</b>. Sem nome, o parceiro não aparece para o cliente.</span></div>` : ''}
    <section class="card prcLista">${l.length ? l.map(p => `<div class="linha" data-pc="${esc(p.id)}">
        <div class="prcPct ${p.ativo && p.nome ? '' : 'off'}">${esc(parcPct(p.desconto))}</div>
        <div class="tx"><b>${p.nome ? esc(p.nome) : '<span class="pill warn">falta o nome da loja</span>'}</b>
          <small>${esc([p.categoria, p.cidade].filter(Boolean).join(' · ') || 'sem categoria')}</small>
          ${p.como ? `<small>Como usar: ${esc(p.como)}</small>` : '<small>Como usar: ainda não escrito</small>'}</div>
        <label class="prcTog"><input type="checkbox" data-tog="${esc(p.id)}" ${p.ativo ? 'checked' : ''}> Mostrar no site</label>
        <a class="mini" href="#/adm/parceiros/${encodeURIComponent(p.id)}">Editar</a>
        <button class="mini ghost" data-del="${esc(p.id)}" aria-label="Apagar">×</button></div>`).join('')
      : '<p class="empty">Nenhum parceiro ainda. Toque em "+ Novo parceiro".</p>'}</section>`);
  $('#prcNovo').onclick = () => { const p = Parceiros.add({ cidade: 'Copenhague', como: 'Mostre o seu voucher do passeio no caixa' }); go('/adm/parceiros/' + encodeURIComponent(p.id)); };
  $$('[data-tog]').forEach(el => el.onchange = () => {
    const p = Parceiros.update(el.dataset.tog, { ativo: el.checked });
    if (p && p.ativo && !p.nome) toast('Ligado — mas só aparece no site depois que tiver o nome da loja');
    else toast(p && p.ativo ? 'Aparece no site' : 'Escondido do site');
    admParceiros();
  });
  $$('[data-del]').forEach(b => b.onclick = () => {
    const p = Parceiros.get(b.dataset.del); if (!p) return;
    if (!confirm(`Apagar o parceiro ${p.nome || p.categoria || ''}?`)) return;
    Parceiros.remove(p.id); toast('Parceiro apagado'); admParceiros();
  });
}
function admParceiroEditar(id) {
  parcCss();
  const p = Parceiros.get(id);
  if (!p) { admShell('parceiros', '<a class="mini" href="#/adm/parceiros">← parceiros</a><h1 class="pageh">Parceiro não encontrado</h1>'); return; }
  admShell('parceiros', `
    <a class="mini" href="#/adm/parceiros">← parceiros</a>
    <div class="pagehead"><h1 class="pageh">${esc(p.nome || p.categoria || 'Parceiro')}</h1></div>
    <div class="two-col">
      <section class="card prcEd" id="prcEd">
        <label class="fld">Nome da loja<input id="prcNome" value="${esc(p.nome)}" placeholder="ex.: Hay House, Sømods Bolcher…"></label>
        <div class="frow">
          <label class="fld">Categoria<input id="prcCat" list="prcCatL" value="${esc(p.categoria)}" placeholder="Lembranças e souvenir"><datalist id="prcCatL">${PARC_CATEGORIAS.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
          <label class="fld" style="max-width:150px">Desconto (%)<input id="prcDesc" type="number" min="0" max="100" step="0.5" inputmode="decimal" value="${esc(p.desconto)}"></label>
        </div>
        <label class="fld">Como o cliente usa o desconto<textarea id="prcComo" rows="2" placeholder="Mostre o voucher do passeio no caixa · ou: use o código MARI10 no site">${esc(p.como)}</textarea></label>
        <div class="frow">
          <label class="fld" style="flex:2">Endereço<input id="prcEnd" value="${esc(p.endereco)}" placeholder="Strøget 12"></label>
          <label class="fld">Cidade<input id="prcCid" value="${esc(p.cidade)}" placeholder="Copenhague"></label>
        </div>
        <label class="fld">Site ou Instagram<input id="prcLink" value="${esc(p.link)}" placeholder="https://… ou @loja"></label>
        <label class="fld chk" style="margin-top:14px"><input type="checkbox" id="prcAtivo" ${p.ativo ? 'checked' : ''}> Mostrar no site e no voucher</label>
        <div class="frow" style="margin-top:14px;align-items:center">
          <button class="cta sm" id="prcSalva">Salvar</button>
          <button class="mini ghost" id="prcApaga">Apagar este parceiro</button>
        </div>
      </section>
      <section class="card"><h3>Assim o cliente vê</h3><div class="prcPrev" id="prcPrev">${parcCardHtml(p)}</div>
        <p class="why" id="prcAviso"></p></section>
    </div>`);
  const le = () => ({ nome: $('#prcNome').value, categoria: $('#prcCat').value, desconto: $('#prcDesc').value, como: $('#prcComo').value,
    endereco: $('#prcEnd').value, cidade: $('#prcCid').value, link: $('#prcLink').value, ativo: $('#prcAtivo').checked });
  const aviso = () => {
    const c = parcNormaliza(Object.assign({}, p, le()));
    $('#prcPrev').innerHTML = parcCardHtml(c);
    $('#prcAviso').textContent = !c.nome ? 'Sem o nome da loja, este parceiro não aparece no site.' : !c.ativo ? 'Desligado: não aparece no site nem no voucher.' : c.link && !parcLinkSeguro(c.link) ? 'O link precisa começar com https:// para aparecer.' : 'Aparece no site e no voucher.';
  };
  $('#prcEd').addEventListener('input', aviso); $('#prcEd').addEventListener('change', aviso); aviso();
  $('#prcSalva').onclick = () => { Parceiros.update(p.id, le()); toast('Parceiro salvo'); go('/adm/parceiros'); };
  $('#prcApaga').onclick = () => { if (!confirm(`Apagar o parceiro ${p.nome || p.categoria || ''}?`)) return; Parceiros.remove(p.id); toast('Parceiro apagado'); go('/adm/parceiros'); };
}

/* ---------- ligar no app ---------- */
STR.admParceiros = { pt: 'Parceiros', en: 'Partners' };
if (!ADM_TABS.some(([id]) => id === 'parceiros')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'coupons');
  ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['parceiros', 'admParceiros']);
}
const _viewAdmParc = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'parceiros') return admParceiros(arg);
  return _viewAdmParc(tab, arg);
};
