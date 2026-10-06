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

/* A ordem das abas: o dia a dia em cima (Hoje, Agenda, Tarefas, Reservas, Clientes), depois os
   documentos que ela manda para o cliente, depois o que ela configura de vez em quando, e por
   último os módulos trancados e os ajustes. As abas chegam de vários arquivos (Atendimento e
   Marketing vêm do motor do assistente, que carrega depois deste), então ordena na hora de desenhar. */
const ABAS_ORDEM = ['today', 'agenda', 'tarefas', 'bookings', 'clients', 'orcamentos', 'roteiros', 'faturas', 'contratos', 'agencias',
  'tours', 'equipe', 'parceiros', 'coupons', 'money', 'reports', 'inbox', 'marketing', 'look', 'settings'];
function ordenaAbas() {
  const pos = (id) => { const i = ABAS_ORDEM.indexOf(id); return i < 0 ? ABAS_ORDEM.length - 2.5 : i; };   /* aba nova sem lugar: antes de Aparência */
  const orig = ADM_TABS.map(([id]) => id);
  ADM_TABS.sort((a, b) => pos(a[0]) - pos(b[0]) || orig.indexOf(a[0]) - orig.indexOf(b[0]));
}
const _admShellLigar = admShell;
admShell = function () { ordenaAbas(); return _admShellLigar.apply(this, arguments); };

/* O app.js desenha a primeira tela ANTES de os módulos da Mari carregarem: sem isto, o cartão de
   mudança e o de parceiros não apareciam na primeira abertura, e um link de voucher/roteiro/escala
   (#/vo/…, #/ro/…, #/es/…) abria na tela inicial. Este é o último módulo das telas: redesenha uma vez. */
if (typeof route === 'function' && !String(location.hash).startsWith('#/adm')) route();
