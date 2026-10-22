/* =====================================================
   CLIENTES — a lista arrumada (22/10/2026)

   Pedido do Eugênio: "deixar isso melhor de ver e organizar". No print: cinco
   controles de jeitos diferentes no topo (um deles, "1 pessoas · € 0 no total",
   parecia botão e não era), a coluna Contato vazia e desalinhada, "ficha →" e
   "ficha 2/9" lado a lado, e "Só reserva" (a autorização de e-mail) dentro da
   coluna de passeios.
   - Topo: o título e UM botão (+ Novo cliente). O total vira uma frase.
   - Uma barra: buscar (filtra na hora, sem redesenhar a tela), Todos |
     Aceitam novidades, e Baixar lista.
   - Cada cliente é uma linha-cartão (cabe no celular, sem tabela): iniciais,
     nome, a situação (primeira vez / voltou / sem reserva), o próximo ou o
     último passeio, quanto pagou e quanto falta; à direita, WhatsApp, e-mail e
     Instagram. Tocar na linha abre a ficha; a ficha incompleta mostra "ficha 2 de 9".
   Carrega depois do ficha.js (usa fichaCompleta e fichaNovoCliente).
   ===================================================== */
'use strict';

const CL_IC = {
  busca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/></svg>',
};
function clChave(c) { return c.chave || String(c.email || c.whats || c.name || '').toLowerCase(); }
function clIniciais(n) {
  const p = String(n || '?').trim().split(/\s+/).filter(w => !/^(e|de|da|do|dos|das|and|&)$/i.test(w));
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
/* o que ainda falta receber das reservas de pé (mesma chave da lista: e-mail, WhatsApp ou nome) */
function clFalta(c) {
  const k = String(c.email || c.whats || c.name || '').toLowerCase();
  return DB.bookings.filter(b => b.status !== 'cancelled' && String(b.email || b.whats || b.name || '').toLowerCase() === k)
    .reduce((s, b) => s + (Bookings.due(b) || 0), 0);
}
function clLinha(c, hoje) {
  const k = clChave(c), falta = c.semReserva ? 0 : clFalta(c);
  const fc = typeof window.fichaCompleta === 'function' ? window.fichaCompleta(k) : null;
  const sit = c.semReserva ? ([...(c.origins || [])][0] === 'personalize' ? 'veio pelo Personalize' : 'sem reserva ainda')
    : c.tours > 1 ? t('clRepeat', { n: c.tours }) : t('clNew');
  const quando = c.last ? (c.last >= hoje ? 'próximo ' : 'último ') + fmtDate(c.last) : '';
  const fone = String(c.whats || '').replace(/\D/g, ''), ig = String(c.insta || '').replace(/^@/, '');
  const busca = [c.name, c.email, c.whats, fone, ig].filter(Boolean).join(' ').toLowerCase();
  const href = '#/adm/clients/' + encodeURIComponent(k);
  return `<div class="clRow" data-cli="${esc(k)}" data-busca="${esc(busca)}">
    <a class="clMain" href="${href}" aria-label="Abrir a ficha de ${esc(c.name)}">
      <span class="clAv" aria-hidden="true">${esc(clIniciais(c.name))}</span>
      <span class="clTx"><b>${esc(c.name)}</b>
        <span class="clMeta"><span class="clSit ${c.tours > 1 ? 'volta' : c.semReserva ? 'sem' : ''}">${esc(sit)}</span>${quando ? `<span>${esc(quando)}</span>` : ''}${c.semReserva ? '' : `<span>${eur(c.spent || 0)} pago</span>`}${falta > 0 ? `<span class="clFalta">falta ${eur(falta)}</span>` : ''}${c.consent ? '<span class="clOk">✓ aceita novidades</span>' : ''}</span>
        ${fc ? (fc.ok >= fc.de ? '<span class="clFicha ok">✓ ficha completa</span>' : `<span class="clFicha"><i style="--p:${Math.round(fc.ok / fc.de * 100)}%"></i>ficha ${fc.ok} de ${fc.de}</span>`) : ''}
      </span></a>
    <span class="clCont">
      ${c.whats ? `<a class="clBt wa" target="_blank" rel="noopener" href="${waLink(t('waHi', { name: String(c.name).split(' ')[0], tour: '', when: '' }), fone)}" aria-label="WhatsApp — ${esc(c.name)}" title="WhatsApp">${ICONE_WA}</a>` : ''}
      ${c.email ? `<a class="clBt" href="mailto:${esc(c.email)}" aria-label="E-mail — ${esc(c.name)}" title="${esc(c.email)}">${CL_IC.mail}</a>` : ''}
      ${ig ? `<a class="clBt ig" target="_blank" rel="noopener" href="https://instagram.com/${esc(ig)}" aria-label="Instagram — ${esc(c.name)}" title="@${esc(ig)}">${ICONE_IG}</a>` : ''}
      ${!c.whats && !c.email && !ig ? `<a class="clSemC" href="${href}">+ contato</a>` : ''}
    </span></div>`;
}

admClients = function () {
  clCss();
  const all = Clients.all(), hoje = isoToday();
  const optin = admClients._f === 'optin';
  const canMail = all.filter(c => c.consent).length;
  const total = all.reduce((s, c) => s + (c.spent || 0), 0);
  /* quem tem passeio pela frente primeiro (o mais perto em cima), depois os que já foram (o mais recente em cima), depois quem ainda não reservou */
  const grupo = (c) => !c.last ? 3 : c.last >= hoje ? 1 : 2;
  const list = (optin ? all.filter(c => c.consent) : all).slice().sort((a, b) => grupo(a) - grupo(b)
    || (grupo(a) === 1 ? a.last.localeCompare(b.last) : grupo(a) === 2 ? b.last.localeCompare(a.last) : String(a.name).localeCompare(String(b.name), 'pt')));
  const n = all.length;
  admShell('clients', `
    <div class="pagehead clHead"><h1 class="pageh">${t('clTitle')}</h1><button type="button" class="cta sm" id="clNovo">+ Novo cliente</button></div>
    <p class="clResumo">${n} cliente${n === 1 ? '' : 's'} · ${eur(total)} recebidos · ${canMail} aceita${canMail === 1 ? '' : 'm'} receber novidades</p>
    ${n ? `<div class="clBarra">
      <label class="clBusca">${CL_IC.busca}<input type="search" id="clQ" autocomplete="off" placeholder="Buscar por nome, WhatsApp ou e-mail" aria-label="Buscar cliente" value="${esc(admClients._q || '')}"></label>
      <div class="clSeg" role="group" aria-label="Mostrar">
        <button type="button" id="clAll" class="${optin ? '' : 'on'}" aria-pressed="${!optin}">${t('clAll')} · ${n}</button>
        <button type="button" id="clOpt" class="${optin ? 'on' : ''}" aria-pressed="${optin}">Aceitam novidades · ${canMail}</button>
      </div>
      <button type="button" class="mini" id="clCsv">${t('clDlCsv')}</button>
    </div>` : ''}
    <section class="card clLista" id="clLista">
      ${list.length ? list.map(c => clLinha(c, hoje)).join('') : `<p class="empty">${optin ? 'Ninguém autorizou receber novidades ainda. A autorização é pedida na hora da reserva.' : t('clEmpty')}</p>`}
      <p class="empty clNada" hidden>Ninguém com esse nome. Confira a grafia ou busque pelo WhatsApp.</p>
    </section>`);
  const filtra = () => {
    const q = String(($('#clQ') || {}).value || '').trim().toLowerCase(); admClients._q = q;
    let vis = 0;
    $$('#clLista .clRow').forEach(r => { const ok = !q || r.dataset.busca.includes(q) || r.dataset.busca.includes(q.replace(/\D/g, '') || '\u0000'); r.hidden = !ok; if (ok) vis++; });
    const nada = $('#clLista .clNada'); if (nada) nada.hidden = !(q && !vis && list.length);
  };
  if ($('#clQ')) { $('#clQ').oninput = filtra; if (admClients._q) filtra(); }
  $('#clNovo').onclick = () => {
    const nome = prompt('Nome do cliente:'); if (!nome || !nome.trim()) return;
    const whats = prompt('WhatsApp (opcional):') || '';
    const chave = typeof window.fichaNovoCliente === 'function' ? window.fichaNovoCliente({ nome: nome.trim(), whats: whats.trim(), origem: 'manual' }) : null;
    if (chave) go('/adm/clients/' + encodeURIComponent(chave));
  };
  if ($('#clAll')) $('#clAll').onclick = () => { admClients._f = 'all'; admClients(); };
  if ($('#clOpt')) $('#clOpt').onclick = () => { admClients._f = 'optin'; admClients(); };
  if ($('#clCsv')) $('#clCsv').onclick = () => {
    const cols = t('clCols');
    const csv = [cols.join(';')].concat(list.map(c =>
      [c.name, c.email, c.whats, c.insta || '', c.tours, c.spent, c.last,
       c.consent ? 'sim ' + (c.consentAt || '').slice(0, 10) : 'nao'].join(';'))).join('\n');
    const a2 = document.createElement('a');
    a2.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a2.download = 'clientes.csv'; a2.click();
  };
};

function clCss() {
  if (document.getElementById('clCss')) return;
  const s = document.createElement('style'); s.id = 'clCss';
  s.textContent = `
  .clHead .pageh{flex:1}
  .clResumo{margin:-6px 0 14px;color:var(--ink-3);font-size:14px}
  .clBarra{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
  .clBusca{flex:1 1 260px;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:999px;background:var(--surface);box-shadow:var(--sh-1);color:var(--ink-3)}
  .clBusca svg{width:18px;height:18px;flex:none}
  .clBusca input{flex:1;min-width:0;border:0;background:transparent;min-height:42px;color:var(--ink);font:500 15px/1.2 var(--f-ui)}
  .clBusca input:focus{outline:none}
  .clBusca:focus-within{box-shadow:0 0 0 2px var(--accent)}
  .clSeg{display:inline-flex;gap:3px;padding:4px;border-radius:999px;background:var(--surface-2)}
  .clSeg button{min-height:36px;padding:0 14px;border:0;border-radius:999px;background:transparent;color:var(--ink-2);font:600 13px/1 var(--f-ui);cursor:pointer}
  .clSeg button.on{background:var(--surface);color:var(--ink);box-shadow:var(--sh-1)}
  .clLista{padding-top:6px;padding-bottom:6px}
  .clRow{display:flex;align-items:center;gap:10px;border-top:1px solid var(--line)}
  .clRow:first-child{border-top:0}
  .clRow[hidden]{display:none}
  .clMain{flex:1;min-width:0;display:flex;align-items:center;gap:12px;padding:12px 4px;color:inherit;text-decoration:none;border-radius:12px}
  .clMain:hover .clTx b{text-decoration:underline;text-underline-offset:3px}
  .clMain:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .clAv{width:42px;height:42px;flex:none;border-radius:50%;display:grid;place-items:center;background:var(--accent-wash);color:var(--accent);font:700 14px/1 var(--f-ui);letter-spacing:.02em}
  .clTx{flex:1;min-width:0}
  .clTx b{display:block;font-size:15.5px;line-height:1.3;overflow-wrap:anywhere}
  .clMeta{display:flex;flex-wrap:wrap;gap:3px 12px;margin-top:3px;color:var(--ink-3);font-size:13px}
  .clSit{font-weight:700;color:var(--ink-2)}
  .clSit.volta{color:var(--ok,#1f7a4d)}
  .clSit.sem{color:var(--ink-3);font-weight:600}
  .clFalta{color:var(--warn,#9a5b00);font-weight:700}
  .clOk{color:var(--ok,#1f7a4d)}
  .clFicha{display:inline-flex;align-items:center;gap:7px;margin-top:6px;color:var(--ink-3);font-size:12px}
  .clFicha i{width:54px;height:5px;border-radius:99px;background:linear-gradient(90deg,var(--accent) var(--p),var(--surface-3,var(--line)) var(--p))}
  .clFicha.ok{color:var(--ok,#1f7a4d);font-weight:600}
  .clCont{display:flex;gap:6px;flex:none;padding-right:4px}
  .clBt{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2);color:var(--ink-2);text-decoration:none}
  .clBt svg{width:18px;height:18px}
  .clBt.wa{background:#25D366;color:#fff}
  .clBt.ig{color:var(--brand-vinho,var(--ink-2))}
  .clBt:hover{filter:brightness(.95)}
  .clBt:focus-visible,.clSemC:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .clSemC{font:600 12.5px/1 var(--f-ui);color:var(--ink-3);text-decoration:underline;text-underline-offset:3px;padding:10px 4px}
  @media(max-width:620px){.clSeg{width:100%}.clSeg button{flex:1}.clBarra .mini{margin-left:auto}.clAv{width:36px;height:36px;font-size:12.5px}.clMain{gap:10px}}
  `;
  document.head.appendChild(s);
}
