/* =====================================================
   PARA LIGAR TUDO (06/10/2026) — a finalização do app da Mari

   "vamos pra finalização: ligar o Google dela e tudo que precisa ligar".
   Em Ajustes, no topo:
   1. A lista do que falta para o app ficar 100% dela, com o estado de cada
      item (feito / falta) e o botão que leva até a tela certa.
   2. "Começar de verdade": tira SÓ os exemplos da demonstração (reservas
      fictícias, os números de visitas inventados, as fichas desses clientes)
      e mantém o que é dela: os passeios, a apresentação, os ajustes, os
      brindes, os parceiros, a equipe, as tarefas, os orçamentos.
      (O botão antigo "limpar tudo" apagava também os 19 passeios reais.)
   ===================================================== */
'use strict';

function ligarItens() {
  const st = DB.settings || {}, pv = DB.privado || {};
  const temGcal = typeof GCal !== 'undefined' && GCal.ligada();
  const parceirosOk = (st.parceiros || []).some(p => p.ativo && p.nome);
  const equipe = Array.isArray(DB.equipe) ? DB.equipe : [];
  return [
    { k: 'banco', feito: typeof temNuvem === 'function' && temNuvem(), tit: 'Banco próprio (nuvem) e senha do painel', txt: 'Para usar no celular e no computador com os mesmos dados, proteger o painel com senha e ligar o assistente mais inteligente. É feito com o Eugênio (uns 15 minutos).', ir: '' },
    { k: 'pix', feito: !!(st.pixKey && st.pixName && st.pixCity), tit: 'Chave Pix', txt: 'Para o cliente pagar o sinal com o valor em reais já calculado.', ir: '/adm/settings', ancora: 'pgPix' },
    { k: 'wise', feito: !!st.wiseLink, tit: 'Link do Wise', txt: 'Para receber em euro.', ir: '/adm/settings', ancora: 'pgWise' },
    { k: 'gcal', feito: temGcal, tit: 'Google Agenda', txt: 'Tarefas e passeios reservados aparecem sozinhos no seu Google Agenda, com lembrete no celular. Uns 5 minutos, no computador.', ir: '/adm/settings', ancora: 'gcCard' },
    { k: 'emissor', feito: !!(pv.emissor && pv.emissor.nome && pv.emissor.cpf), tit: 'Seus dados para a fatura', txt: 'Nome, CPF e endereço que saem no "DE" da fatura.', ir: '/adm/faturas' },
    { k: 'contrato', feito: !!pv.contratoModeloProprio, tit: 'O texto do seu contrato', txt: 'Cole a sua base em Contratos → Modelo. Até lá vale um modelo inicial.', ir: '/adm/contratos' },
    { k: 'brindes', feito: (DB.brindes || []).some(b => typeof brTem === 'function' ? brTem(b) : (b.url || b.arquivo)), tit: 'Os PDFs de brinde', txt: 'Suba o guia de second hand e o outro PDF.', ir: '/adm/coupons', ancora: 'brSec' },
    { k: 'parceiros', feito: parceirosOk, tit: 'Os nomes dos parceiros', txt: 'Souvenir (10%), roupa local (15%), roupa térmica no Brasil (5%).', ir: '/adm/parceiros' },
    { k: 'equipe', feito: equipe.length > 0 && equipe.every(p => !p.ativo || p.whats), tit: 'Contatos da equipe', txt: 'O WhatsApp do César e da Marina, para mandar a escala.', ir: '/adm/equipe' },
    { k: 'youtube', feito: !!(st.youtube || ''), tit: 'Seu YouTube (e outras redes)', txt: 'Aparecem em ícone na primeira tela.', ir: '/adm/settings', ancora: 'setYoutube' },
    { k: 'demo', feito: (!DB.demo || !!st.semExemplos) && !(DB.bookings || []).some(b => String(b.id).startsWith('demo')), tit: 'Tirar os exemplos', txt: 'As reservas e clientes de demonstração saem; seus passeios ficam.', ir: '', acao: 'demo' },
  ];
}
function ligarCartaoHtml() {
  const l = ligarItens(), feitos = l.filter(x => x.feito).length;
  return `<section class="card" id="ligarCard"><h3>✅ Para ligar tudo <small class="why" style="font-weight:500">· ${feitos} de ${l.length} prontos</small></h3>
    <div style="height:8px;border-radius:99px;background:var(--surface-2);overflow:hidden;margin:4px 0 12px"><i style="display:block;height:100%;width:${Math.round(feitos / l.length * 100)}%;background:var(--brand-assinatura)"></i></div>
    ${l.map(x => `<div class="hj-item" data-lig="${x.k}"><span class="pill ${x.feito ? 'ok' : 'warn'}" style="min-width:58px;text-align:center">${x.feito ? 'pronto' : 'falta'}</span>
      <div class="tx"><b>${esc(x.tit)}</b><small>${esc(x.txt)}</small></div>
      ${x.feito ? '' : x.acao === 'demo' ? '<button class="mini" data-ligdemo>Começar de verdade</button>' : x.ir ? `<button class="mini" data-ligir="${esc(x.ir)}" data-ancora="${esc(x.ancora || '')}">Abrir</button>` : ''}</div>`).join('')}
  </section>`;
}
/* tira SÓ os exemplos da demonstração */
function comecarDeVerdade() {
  const exemplo = (DB.bookings || []).filter(b => String(b.id).startsWith('demo'));
  const chaves = new Set(exemplo.map(b => String(b.email || b.whats || b.name || '').toLowerCase()));
  DB.bookings = (DB.bookings || []).filter(b => !String(b.id).startsWith('demo'));
  DB.seatCounts = [];
  DB.interesse = {};                                /* as visitas de exemplo eram inventadas */
  if (DB.fichas) for (const k of Object.keys(DB.fichas)) if (chaves.has(k)) delete DB.fichas[k];
  if (Array.isArray(DB.brindesEnvios)) DB.brindesEnvios = DB.brindesEnvios.filter(e => !chaves.has(e.chave));
  DB.demo = false;
  DB.settings.semExemplos = true;        /* vai com o estado para a nuvem: os outros aparelhos também deixam os exemplos */
  save();
  if (typeof cloudPushState === 'function') cloudPushState();
  /* se algum exemplo já tinha subido (ela ligou a nuvem antes), apaga lá também (a dona pode: SEGURANCA.sql bk_delete_owner) */
  if (typeof temNuvem === 'function' && temNuvem() && typeof supaFetch === 'function') supaFetch('bookings?id=like.demo*', { method: 'DELETE' }).catch(() => {});
  return exemplo.length;
}
window.comecarDeVerdade = comecarDeVerdade;
const _admSettingsLigar = admSettings;
admSettings = function () {
  _admSettingsLigar.apply(this, arguments);
  const stage = document.getElementById('stage'); if (!stage || document.getElementById('ligarCard')) return;
  if (typeof agCss === 'function') agCss();
  const titulo = stage.querySelector('.pageh');
  if (titulo) titulo.insertAdjacentHTML('afterend', ligarCartaoHtml()); else stage.insertAdjacentHTML('afterbegin', ligarCartaoHtml());
  const card = document.getElementById('ligarCard');
  card.querySelectorAll('[data-ligir]').forEach(b => b.onclick = () => {
    const destino = b.dataset.ligir, ancora = b.dataset.ancora;
    if (location.hash === '#' + destino && ancora) { const el = document.getElementById(ancora); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus(); } return; }
    go(destino);
    if (ancora) setTimeout(() => { const el = document.getElementById(ancora); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus(); } }, 400);
  });
  const d = card.querySelector('[data-ligdemo]');
  if (d) d.onclick = () => {
    const n = (DB.bookings || []).filter(b => String(b.id).startsWith('demo')).length;
    if (!confirm(`Tirar os exemplos da demonstração?\n\nSaem ${n} reservas fictícias e os clientes delas. Seus passeios, a apresentação, os ajustes, os brindes, os parceiros, a equipe, as tarefas e os orçamentos ficam.`)) return;
    const k = comecarDeVerdade(); toast(`Pronto: ${k} reservas de exemplo saíram. O app agora é só seu.`); admSettings();
  };
  /* o botão antigo apagava os passeios reais: troca o texto e pede confirmação dupla */
  const dc = document.getElementById('demoClear');
  if (dc) { dc.textContent = 'Apagar TUDO (inclusive os passeios)'; dc.classList.remove('cta'); dc.classList.add('mini', 'ghost');
    const velho = dc.onclick; dc.onclick = (e) => { if (!confirm('Isto apaga também os seus 19 passeios. Para tirar só os exemplos, use "Começar de verdade" no topo. Apagar TUDO mesmo?')) return; if (velho) velho.call(dc, e); }; }
};

/* O MENU DO PAINEL EM GRUPOS (22/10/2026 — "organizar bem o menu lateral", como no protótipo da Bia).
   No computador: a lista com o título de cada grupo, e ela ROLA até o fim (antes o "Ajustes" ficava
   cortado no pé da tela). No celular: a barra de baixo com os 4 mais usados + "Menu", que abre uma
   folha com todos os grupos (antes eram 20 botões numa tira rolando de lado).
   As abas chegam de vários arquivos (Atendimento e Marketing vêm do motor do assistente, que carrega
   depois deste), então agrupa na hora de desenhar. Aba nova sem grupo cai em "Mais". */
const NAV_GRUPOS = [
  ['Dia a dia', ['today', 'agenda']],           /* Tarefas mora DENTRO da Agenda (22/10) */
  ['Tours e reservas', ['bookings', 'tours', 'roteiros']],
  ['Clientes', ['clients', 'agencias']],
  ['Vendas e documentos', ['orcamentos', 'faturas', 'contratos']],
  ['Equipe e parceiros', ['equipe', 'parceiros']],
  ['Dinheiro', ['money', 'reports']],
  ['Crescer', ['coupons', 'inbox', 'marketing']],
  ['Configurar', ['look', 'settings']],
];
const NAV_BARRA = ['today', 'agenda', 'bookings', 'clients'];     /* a barra de baixo, no celular */
const ABAS_ORDEM = NAV_GRUPOS.flatMap(([, ids]) => ids);
function ordenaAbas() {
  const pos = (id) => { const i = ABAS_ORDEM.indexOf(id); return i < 0 ? ABAS_ORDEM.length - 2.5 : i; };   /* aba nova sem lugar: antes de Aparência */
  const orig = ADM_TABS.map(([id]) => id);
  ADM_TABS.sort((a, b) => pos(a[0]) - pos(b[0]) || orig.indexOf(a[0]) - orig.indexOf(b[0]));
}
function navCss() {
  if (document.getElementById('navCss')) return;
  const st = document.createElement('style'); st.id = 'navCss';
  st.textContent = `
  .rail{overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
  .rail nav .navRot{margin:16px 10px 4px;font:700 10.5px/1 var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
  .rail nav .navRot:first-child{margin-top:4px}
  /* o item aberto (22/10, como no painel da Bia): degradê suave da cor da marca + barrinha amarela à esquerda */
  .rail nav .nb[data-tab]{position:relative;border-radius:12px}
  .rail nav .nb[data-tab].on{background:linear-gradient(90deg,var(--accent-wash) 0%,var(--accent-wash) 55%,transparent 100%);color:var(--ink);font-weight:700;box-shadow:inset 3px 0 0 var(--brand-assinatura,#F2C230)}
  .rail nav .nb[data-tab]:hover:not(.on){background:linear-gradient(90deg,var(--surface-2),transparent)}
  .rail .railfoot{padding-top:12px}
  .rail nav .nb[data-barra]{display:none}
  .navFolha{position:fixed;inset:0;z-index:950;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(10,14,24,.45)}
  .navFolha[hidden]{display:none}
  .navFolha .nfCaixa{background:var(--surface);border-radius:22px 22px 0 0;max-height:86vh;overflow-y:auto;padding:14px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.25)}
  .navFolha .nfTopo{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
  .navFolha .nfTopo b{font:700 17px/1.2 var(--f-display)}
  .navFolha .nfRot{margin:14px 2px 6px;font:700 10.5px/1 var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
  .navFolha .nfGrade{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .navFolha .nfGrade .nb{width:100%;justify-content:flex-start;text-align:left;min-height:44px;border-radius:12px;background:var(--surface-2)}
  .navFolha .nfGrade .nb.on{background:var(--accent);color:var(--accent-ink)}
  .navFolha .nfPe{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
  @media(max-width:820px){
    .rail nav .navRot{display:none}
    .rail nav .nb[data-tab]{display:none}
    .rail nav .nb[data-barra]{display:flex}
    .rail nav{width:100%;justify-content:space-around}
    .rail nav .nb{flex:1;justify-content:center;min-width:0;padding:8px 4px;font-size:12.5px}
    .rail{overflow-x:hidden}
  }`;
  document.head.appendChild(st);
}
function navFolhaAbre(tabAtual) {
  let f = document.getElementById('navFolha');
  if (!f) { f = document.createElement('div'); f.id = 'navFolha'; f.className = 'navFolha'; document.body.appendChild(f); }
  const nome = (id) => { const k = (ADM_TABS.find(([x]) => x === id) || [])[1]; return k ? t(k) : id; };
  const tem = new Set(ADM_TABS.map(([id]) => id));
  const usados = new Set();
  const grupos = NAV_GRUPOS.map(([rot, ids]) => { const l = ids.filter(id => tem.has(id)); l.forEach(id => usados.add(id)); return [rot, l]; }).filter(([, l]) => l.length);
  const sobra = ADM_TABS.map(([id]) => id).filter(id => !usados.has(id));
  if (sobra.length) grupos.push(['Mais', sobra]);
  f.innerHTML = `<div class="nfCaixa" role="dialog" aria-label="Menu do painel">
    <div class="nfTopo"><b>Menu</b><button type="button" class="mini" id="nfFecha" aria-label="Fechar">Fechar</button></div>
    ${grupos.map(([rot, l]) => `<p class="nfRot">${esc(rot)}</p><div class="nfGrade">${l.map(id => `<button type="button" class="nb ${id === tabAtual ? 'on' : ''}" data-nfir="${id}">${esc(nome(id))}</button>`).join('')}</div>`).join('')}
    <div class="nfPe"><button type="button" class="mini" id="nfSite">👁 ${t('viewSite')}</button><button type="button" class="mini ghost" id="nfSair">← ${t('exit')}</button></div></div>`;
  f.hidden = false;
  const fecha = () => { f.hidden = true; };
  f.onclick = (e) => { if (e.target === f) fecha(); };
  f.querySelector('#nfFecha').onclick = fecha;
  f.querySelectorAll('[data-nfir]').forEach(b => b.onclick = () => { fecha(); go('/adm/' + b.dataset.nfir); });
  f.querySelector('#nfSite').onclick = () => { fecha(); go('/'); };
  f.querySelector('#nfSair').onclick = () => { fecha(); const s = document.getElementById('exitAdm'); if (s) s.click(); else go('/'); };
}
const _admShellLigar = admShell;
admShell = function (tab) {
  ordenaAbas(); navCss();
  const r = _admShellLigar.apply(this, arguments);
  const f = document.getElementById('navFolha'); if (f) f.hidden = true;
  const nav = document.querySelector('.rail nav'); if (!nav || nav.dataset.agrupado) return r;
  const botoes = {}; nav.querySelectorAll('.nb[data-tab]').forEach(b => { botoes[b.dataset.tab] = b; });
  const usados = new Set(); nav.innerHTML = '';
  const grupo = (titulo, ids) => {
    const nos = ids.map(id => botoes[id]).filter(Boolean); if (!nos.length) return;
    const h = document.createElement('p'); h.className = 'navRot'; h.textContent = titulo; nav.appendChild(h);
    nos.forEach(b => { nav.appendChild(b); usados.add(b.dataset.tab); });
  };
  NAV_GRUPOS.forEach(([t2, ids]) => grupo(t2, ids));
  const sobra = Object.values(botoes).filter(b => !usados.has(b.dataset.tab));
  if (sobra.length) grupo('Mais', sobra.map(b => b.dataset.tab));
  /* a barra do celular: cópias dos 4 mais usados + "Menu" (no computador ficam escondidas) */
  NAV_BARRA.forEach(id => { const o = botoes[id]; if (!o) return; const c = o.cloneNode(true); c.removeAttribute('id'); c.removeAttribute('data-tab'); c.dataset.barra = id; c.onclick = () => go('/adm/' + id); nav.appendChild(c); });
  const mais = document.createElement('button'); mais.type = 'button'; mais.className = 'nb navMais' + (NAV_BARRA.includes(tab) ? '' : ' on'); mais.dataset.barra = 'menu';
  mais.textContent = 'Menu'; mais.setAttribute('aria-haspopup', 'dialog'); mais.onclick = () => navFolhaAbre(tab); nav.appendChild(mais);
  nav.dataset.agrupado = '1';
  /* a aba aberta sempre à vista no menu do computador */
  const on = nav.querySelector('.nb.on[data-tab]'); if (on && on.scrollIntoView) { try { on.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
  return r;
};

/* O app.js desenha a primeira tela ANTES de os módulos da Mari carregarem: sem isto, o cartão de
   mudança e o de parceiros não apareciam na primeira abertura, e um link de voucher/roteiro/escala
   (#/vo/…, #/ro/…, #/es/…) abria na tela inicial. Este é o último módulo das telas: redesenha uma vez. */
if (typeof route === 'function' && !String(location.hash).startsWith('#/adm')) route();
