/* =====================================================
   CONTABILIDADE E ESTATÍSTICAS — Freddy Turismo (15/10/2026)

   Pedido: "aprofunda pra contabilidade e ele ter mais estatísticas".
   Uma aba só, com quatro partes:
   - Resumo: entrou, saiu, lucro, margem, a receber, guardar para imposto;
     receita × despesa mês a mês; lucro por carro.
   - Despesas: o que um negócio de carro executivo gasta (combustível,
     manutenção, seguro, licença TfL, ULEZ/congestion, estacionamento de
     aeroporto, motoristas da frota…). Lança em 10 segundos.
   - Estatísticas: ticket médio, serviços mais vendidos, de onde vêm os
     clientes, quem volta, dia da semana mais cheio, antecedência da reserva.
   - Contador: o período em CSV (receitas + despesas), pronto para mandar.
   Período: mês, ano fiscal do Reino Unido (6/abr a 5/abr) ou ano.
   Receita = pagamentos das reservas (sinal + saldo) + roteiros + vales.
   O "guardar para imposto" é só uma reserva que ELE define (%), não é
   cálculo de imposto — isso é com o contador.
   ===================================================== */
'use strict';

Object.assign(STR, { admContab: { pt: 'Contabilidade', en: 'Accounts' } });
(function abaContab() {
  if (!ADM_TABS.some(([x]) => x === 'contab')) {
    const i = ADM_TABS.findIndex(([x]) => x === 'financeiro');
    ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['contab', 'admContab']);
  }
  if (typeof NAV_GRUPOS !== 'undefined') {
    const g = NAV_GRUPOS.find(([t2]) => t2 === 'Dinheiro');
    if (g && !g[1].includes('contab')) g[1].splice(g[1].indexOf('financeiro') + 1, 0, 'contab');
  }
})();
const _viewAdmCt = viewAdm;
viewAdm = function (tab, arg) { if (tab === 'contab') return admContab(arg); return _viewAdmCt(tab, arg); };

const CT_CATS = [
  ['combustivel', '⛽ Combustível'], ['manutencao', '🔧 Manutenção e pneus'], ['seguro', '🛡️ Seguro'],
  ['licenca', '📄 Licença TfL / PCO'], ['pedagio', '🚦 ULEZ, congestion e pedágio'], ['estacion', '🅿️ Estacionamento (aeroporto)'],
  ['lavagem', '🧽 Lavagem e limpeza'], ['motorista', '👤 Motoristas da frota'], ['financ', '🚗 Prestação / aluguel do carro'],
  ['telefone', '📱 Telefone e internet'], ['software', '💻 App e sistemas'], ['contador', '🧾 Contador'], ['marketing', '📣 Anúncios'], ['outro', '• Outros'],
];
const CT_CARROS = [['', 'Geral (não é de um carro)'], ['S', 'Mercedes Classe S'], ['E', 'Mercedes Classe E'], ['V', 'Mercedes V-Class']];
const ctCat = (id) => (CT_CATS.find(c => c[0] === id) || CT_CATS[CT_CATS.length - 1])[1];
const ctCarroDe = (b) => b.carro || (+b.pax > 3 ? 'V' : 'E');
const ctGrava = () => { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) { } };

/* despesas de exemplo dos últimos meses (protótipo) */
function ctSemeia() {
  if (DB.despesas || !DB.demo) return;
  const hoje = isoToday(), d = (n) => addDays(hoje, n), L = [];
  const poe = (data, cat, desc, valor, carro = '') => L.push({ id: 'dp' + L.length, data, cat, desc, valor, carro, exemplo: true });
  for (let m = 0; m < 4; m++) {   /* 4 meses de despesas fixas e variáveis */
    const b = -30 * m;
    poe(d(b - 2), 'combustivel', 'Diesel V-Class', 92, 'V'); poe(d(b - 9), 'combustivel', 'Diesel V-Class', 88, 'V');
    poe(d(b - 5), 'combustivel', 'Gasolina Classe E', 71, 'E'); poe(d(b - 16), 'combustivel', 'Gasolina Classe E', 66, 'E');
    poe(d(b - 11), 'estacion', 'Heathrow — short stay', 18, 'V'); poe(d(b - 20), 'estacion', 'Gatwick — short stay', 14, 'E');
    poe(d(b - 7), 'lavagem', 'Lavagem completa', 25, 'V'); poe(d(b - 3), 'telefone', 'Plano celular + roteador do carro', 38);
    poe(d(b - 12), 'financ', 'Prestação V-Class', 690, 'V'); poe(d(b - 12), 'financ', 'Prestação Classe E', 480, 'E');
    poe(d(b - 14), 'motorista', 'João — diárias do mês', 360, 'V');
  }
  poe(d(-40), 'manutencao', 'Revisão + pneus dianteiros', 410, 'E');
  poe(d(-25), 'seguro', 'Seguro hire & reward (mensal)', 310);
  poe(d(-55), 'seguro', 'Seguro hire & reward (mensal)', 310);
  poe(d(-70), 'licenca', 'Renovação licença PCO do carro', 100, 'V');
  poe(d(-6), 'pedagio', 'Congestion charge', 15, 'E');
  poe(d(-18), 'contador', 'Contador (trimestre)', 180);
  DB.despesas = L; ctGrava();
}

/* ---------- período ---------- */
function ctPeriodo(S) {
  const hoje = isoToday();
  if (S.tipo === 'fiscal') {
    const y = +hoje.slice(0, 4), md = hoje.slice(5);
    const ini = (md >= '04-06' ? y : y - 1) + S.desloc;
    return { de: `${ini}-04-06`, ate: `${ini + 1}-04-05`, nome: `Ano fiscal ${ini}/${String(ini + 1).slice(2)} (6/abr a 5/abr)` };
  }
  if (S.tipo === 'ano') { const y = +hoje.slice(0, 4) + S.desloc; return { de: `${y}-01-01`, ate: `${y}-12-31`, nome: String(y) }; }
  const dt = new Date(hoje.slice(0, 7) + '-15T12:00:00'); dt.setMonth(dt.getMonth() + S.desloc);
  const m = dt.toISOString().slice(0, 7), fim = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  return { de: m + '-01', ate: m + '-' + String(fim).padStart(2, '0'), nome: (s => s[0].toUpperCase() + s.slice(1))(dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })) };
}
const noPer = (iso, P) => iso && iso.slice(0, 10) >= P.de && iso.slice(0, 10) <= P.ate;

/* ---------- lançamentos do período ---------- */
function ctReceitas(P) {
  const L = [];
  for (const b of DB.bookings || []) {
    if (b.status === 'cancelled' && !(b.payments || []).length) continue;
    const x = Tours.get(b.tourId) || { name: { pt: b.tourId } };
    for (const p of b.payments || []) if (noPer(p.date, P)) L.push({ data: p.date, tipo: 'Reserva', desc: `${tl(x.name)} · ${b.name} (${b.code})`, valor: +p.amount, metodo: p.method, carro: ctCarroDe(b), tourId: b.tourId, b });
  }
  for (const r of DB.roteiros || []) if (r.pago && noPer(r.pago.em, P)) L.push({ data: r.pago.em, tipo: 'Roteiro', desc: `Monte seu roteiro · ${r.nome}`, valor: +r.pago.valor, metodo: r.pago.metodo || 'card', carro: '' });
  for (const g of DB.giftcards || []) if (g.pago && noPer(g.criado, P)) L.push({ data: g.criado, tipo: 'Vale-presente', desc: `Vale ${g.codigo} · ${g.de}`, valor: +g.valor, metodo: 'card', carro: '' });
  return L.sort((a, b) => a.data.localeCompare(b.data));
}
const ctDespesas = (P) => (DB.despesas || []).filter(d => noPer(d.data, P)).sort((a, b) => a.data.localeCompare(b.data));
const soma = (L) => L.reduce((s, x) => s + (+x.valor || 0), 0);

/* =====================================================
   TELA
   ===================================================== */
function admContab(arg) {
  ctSemeia();
  const S = admContab._s = admContab._s || { tipo: 'mes', desloc: 0, aba: 'resumo' };
  if (arg && ['resumo', 'despesas', 'estat', 'contador'].includes(arg)) S.aba = arg;
  const P = ctPeriodo(S);
  const abas = [['resumo', 'Resumo'], ['despesas', 'Despesas'], ['estat', 'Estatísticas'], ['contador', 'Para o contador']];
  const corpo = { resumo: ctResumo, despesas: ctTelaDespesas, estat: ctEstat, contador: ctContador }[S.aba](P, S);
  admShell('contab', `
    <div class="pagehead"><h1 class="pageh">Contabilidade</h1>
      <button class="cta sm" id="ctNova">+ Lançar despesa</button></div>
    <div class="ctBarra">
      <div class="chips">${[['mes', 'Mês'], ['fiscal', 'Ano fiscal UK'], ['ano', 'Ano']].map(([k, n]) => `<button class="chip ${S.tipo === k ? 'on' : ''}" data-tipo="${k}">${n}</button>`).join('')}</div>
      <div class="ctPer"><button class="mini" data-mv="-1" aria-label="Anterior">←</button><b>${esc(P.nome)}</b><button class="mini" data-mv="1" aria-label="Próximo">→</button></div>
    </div>
    <nav class="ctAbas">${abas.map(([k, n]) => `<button class="${S.aba === k ? 'on' : ''}" data-aba="${k}">${n}</button>`).join('')}</nav>
    ${corpo}`);
  $$('[data-tipo]').forEach(b => b.onclick = () => { S.tipo = b.dataset.tipo; S.desloc = 0; admContab(); });
  $$('[data-mv]').forEach(b => b.onclick = () => { S.desloc += +b.dataset.mv; admContab(); });
  $$('[data-aba]').forEach(b => b.onclick = () => { S.aba = b.dataset.aba; admContab(); });
  $('#ctNova').onclick = () => { S.aba = 'despesas'; admContab(); setTimeout(() => { const f = $('#dpValor'); if (f) f.focus(); }, 50); };
  ({ despesas: ctLigaDespesas, contador: ctLigaContador }[S.aba] || (() => {}))(P, S);
}

/* ---------- barras simples (sem biblioteca) ---------- */
function ctBarras(linhas, fmt = eur) {
  const max = Math.max(1, ...linhas.map(l => l[1]));
  return `<div class="ctBars">${linhas.map(([rot, v, cls]) => `<div class="ctBar ${cls || ''}"><span class="ctBarRot">${esc(rot)}</span>
    <span class="ctBarTrilho"><i style="width:${Math.max(1, Math.round(v / max * 100))}%"></i></span><b>${fmt(v)}</b></div>`).join('')}</div>`;
}

function ctResumo(P) {
  const R = ctReceitas(P), D = ctDespesas(P);
  const rec = soma(R), desp = soma(D), lucro = rec - desp, margem = rec ? Math.round(lucro / rec * 100) : 0;
  const hoje = isoToday();
  const aReceber = (DB.bookings || []).filter(b => b.status === 'confirmed' && b.date >= hoje).reduce((s, b) => s + Bookings.due(b), 0);
  const pct = +(DB.settings.reservaImposto ?? 20);
  /* 12 meses: receita × despesa */
  const meses = [];
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(isoToday().slice(0, 7) + '-15T12:00:00'); dt.setMonth(dt.getMonth() - i);
    const m = dt.toISOString().slice(0, 7), Pm = { de: m + '-01', ate: m + '-31' };
    meses.push({ m, r: soma(ctReceitas(Pm)), d: soma(ctDespesas(Pm)) });
  }
  const mx = Math.max(1, ...meses.map(x => Math.max(x.r, x.d)));
  /* por carro */
  const carros = CT_CARROS.filter(c => c[0]).map(([id, nome]) => {
    const r = soma(R.filter(x => x.carro === id)), d = soma(D.filter(x => x.carro === id));
    return { nome, r, d, l: r - d };
  }).filter(c => c.r || c.d);
  const geral = soma(D.filter(x => !x.carro));
  /* por forma de pagamento */
  const porMet = {}; R.forEach(x => { const k = x.metodo === 'pix' ? 'Pix' : x.metodo === 'cash' ? 'Dinheiro' : x.metodo === 'transfer' ? 'Transferência' : 'Cartão'; porMet[k] = (porMet[k] || 0) + x.valor; });
  return `
    <div class="kpis ctKpis">
      <div class="kpi"><small>Entrou</small><b>${eur(rec)}</b><i>${R.length} pagamentos</i></div>
      <div class="kpi"><small>Saiu (despesas)</small><b>${eur(desp)}</b><i>${D.length} lançamentos</i></div>
      <div class="kpi ${lucro < 0 ? 'warn' : ''}"><small>Lucro</small><b>${eur(lucro)}</b><i>margem de ${margem}%</i></div>
      <div class="kpi"><small>A receber (saldos no dia)</small><b>${eur(aReceber)}</b><i>reservas futuras</i></div>
      <div class="kpi"><small>Guardar para imposto</small><b>${eur(Math.round(Math.max(0, lucro) * pct / 100))}</b><i><label>${pct}% do lucro · <input class="ctPct" id="ctPct" type="number" min="0" max="60" value="${pct}" aria-label="Percentual para guardar"></label></i></div>
    </div>
    <section class="card"><h3>Entrou × saiu · últimos 12 meses</h3>
      <div class="ctMeses">${meses.map(x => `<div class="ctMes" title="${x.m}: entrou ${eur(x.r)}, saiu ${eur(x.d)}">
        <div class="ctMesBars"><i class="r" style="height:${Math.round(x.r / mx * 100)}%"></i><i class="d" style="height:${Math.round(x.d / mx * 100)}%"></i></div>
        <small>${new Date(x.m + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div>`).join('')}</div>
      <p class="ctLeg"><span class="r"></span> entrou <span class="d"></span> saiu</p></section>
    <div class="ctDuas">
      <section class="card"><h3>Lucro por carro</h3>
        ${carros.map(c => `<div class="ctLinha"><span>${c.nome}</span><span class="mono">${eur(c.r)} − ${eur(c.d)}</span><b class="${c.l < 0 ? 'neg' : ''}">${eur(c.l)}</b></div>`).join('')}
        <div class="ctLinha"><span>Despesas gerais</span><span></span><b class="neg">− ${eur(geral)}</b></div>
        <p class="why">Reserva até 3 pessoas conta para a Classe E, de 4 a 7 para a V-Class (dá para trocar na reserva).</p></section>
      <section class="card"><h3>Como pagaram</h3>${Object.keys(porMet).length ? ctBarras(Object.entries(porMet).sort((a, b) => b[1] - a[1])) : '<p class="empty">Nada no período.</p>'}</section>
    </div>
    <section class="card"><h3>Despesas por categoria</h3>${D.length ? ctBarras(Object.entries(D.reduce((o, x) => { o[ctCat(x.cat)] = (o[ctCat(x.cat)] || 0) + x.valor; return o; }, {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, 'd'])) : '<p class="empty">Nenhuma despesa no período.</p>'}</section>`;
}

function ctTelaDespesas(P) {
  const D = ctDespesas(P).slice().reverse();
  return `
    <section class="card ctForm" id="ctForm"><h3>Lançar despesa</h3>
      <div class="ctFormGrade">
        <label class="fld">Valor (£)<input id="dpValor" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0,00"></label>
        <label class="fld">Data<input id="dpData" type="date" value="${isoToday()}"></label>
        <label class="fld">Categoria<select id="dpCat">${CT_CATS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label class="fld">Carro<select id="dpCarro">${CT_CARROS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label class="fld ctDesc">Descrição<input id="dpDesc" placeholder="Ex.: diesel, Heathrow short stay, revisão"></label>
      </div>
      <button class="cta sm" id="dpSalva">Salvar despesa</button>
    </section>
    <section class="card"><h3>Despesas · ${esc(P.nome)} <span class="mono ctTot">${eur(soma(D))}</span></h3>
      ${D.length ? `<div class="ctTabela">${D.map(d => `<div class="ctRow"><span class="mono">${dtBR(d.data)}</span><span>${ctCat(d.cat)}<small>${esc(d.desc || '')}${d.carro ? ' · ' + esc((CT_CARROS.find(c => c[0] === d.carro) || [])[1] || '') : ''}${d.exemplo ? ' · <em class="exTag">exemplo</em>' : ''}</small></span><b class="mono">${eur(d.valor)}</b><button class="mini" data-apaga="${esc(d.id)}" aria-label="Apagar">✕</button></div>`).join('')}</div>` : '<p class="empty">Nenhuma despesa no período.</p>'}
    </section>`;
}
function ctLigaDespesas() {
  $('#dpSalva').onclick = () => {
    const valor = +String($('#dpValor').value).replace(',', '.');
    if (!(valor > 0)) { toast('Ponha o valor.'); $('#dpValor').focus(); return; }
    DB.despesas = DB.despesas || [];
    DB.despesas.push({ id: 'dp' + Date.now().toString(36), data: $('#dpData').value || isoToday(), cat: $('#dpCat').value, carro: $('#dpCarro').value, desc: $('#dpDesc').value.trim(), valor });
    ctGrava(); toast('Despesa lançada ✓'); admContab();
  };
  $$('[data-apaga]').forEach(b => b.onclick = () => {
    if (!confirm('Apagar esta despesa?')) return;
    DB.despesas = (DB.despesas || []).filter(d => d.id !== b.dataset.apaga); ctGrava(); admContab();
  });
}

function ctEstat(P) {
  const hoje = isoToday();
  const bs = (DB.bookings || []).filter(b => b.status !== 'cancelled' && noPer(b.date, P));
  const total = soma(bs.map(b => ({ valor: +b.total || 0 })));
  const ticket = bs.length ? total / bs.length : 0;
  const pax = bs.length ? bs.reduce((s, b) => s + (+b.pax || 0), 0) / bs.length : 0;
  /* serviços mais vendidos (por receita) */
  const porTour = {}; bs.forEach(b => { const n = tl((Tours.get(b.tourId) || { name: { pt: b.tourId } }).name); porTour[n] = (porTour[n] || 0) + (+b.total || 0); });
  /* de onde vêm */
  const ORI = { site: 'App / site', instagram: 'Instagram', whatsapp: 'WhatsApp', google: 'Google', friend: 'Indicação' };
  const porOri = {}; bs.forEach(b => { const k = ORI[b.origin] || 'Outros'; porOri[k] = (porOri[k] || 0) + 1; });
  /* dia da semana */
  const DS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], porDia = DS.map(d => [d, 0]);
  bs.forEach(b => { porDia[new Date(b.date + 'T12:00:00').getDay()][1]++; });
  /* antecedência média (dias entre reservar e o serviço) */
  const ant = bs.filter(b => b.createdAt).map(b => Math.max(0, Math.round((new Date(b.date + 'T12:00:00') - new Date(b.createdAt)) / 864e5)));
  const antMed = ant.length ? Math.round(ant.reduce((a, b) => a + b, 0) / ant.length) : 0;
  /* clientes que voltam */
  const fs = typeof fichasTodas === 'function' ? fichasTodas() : [];
  const voltaram = fs.filter(f => f.vezes > 1).length;
  /* carros: dias usados no período */
  const diasP = Math.max(1, Math.round((new Date(Math.min(new Date(P.ate + 'T12:00:00'), new Date(hoje + 'T12:00:00'))) - new Date(P.de + 'T12:00:00')) / 864e5) + 1);
  const usoCarro = CT_CARROS.filter(c => c[0] && c[0] !== 'S').map(([id, n]) => [n, new Set(bs.filter(b => ctCarroDe(b) === id && b.date <= hoje).map(b => b.date)).size]);
  return `
    <div class="kpis ctKpis">
      <div class="kpi"><small>Serviços</small><b>${bs.length}</b><i>no período</i></div>
      <div class="kpi"><small>Ticket médio</small><b>${eur(ticket)}</b><i>por serviço</i></div>
      <div class="kpi"><small>Pessoas por serviço</small><b>${pax.toFixed(1).replace('.', ',')}</b><i>em média</i></div>
      <div class="kpi"><small>Reservam com</small><b>${antMed} dias</b><i>de antecedência, em média</i></div>
      <div class="kpi"><small>Clientes que voltaram</small><b>${voltaram}</b><i>de ${fs.length} clientes</i></div>
    </div>
    <div class="ctDuas">
      <section class="card"><h3>O que mais vende (receita)</h3>${Object.keys(porTour).length ? ctBarras(Object.entries(porTour).sort((a, b) => b[1] - a[1]).slice(0, 8)) : '<p class="empty">Nada no período.</p>'}</section>
      <section class="card"><h3>De onde vêm os clientes</h3>${Object.keys(porOri).length ? ctBarras(Object.entries(porOri).sort((a, b) => b[1] - a[1]), v => v + (v === 1 ? ' reserva' : ' reservas')) : '<p class="empty">Nada no período.</p>'}</section>
      <section class="card"><h3>Dia da semana mais cheio</h3>${ctBarras(porDia, v => String(v))}</section>
      <section class="card"><h3>Uso dos carros</h3>${ctBarras(usoCarro, v => `${v} de ${diasP} dias`)}
        <p class="why">Dias com pelo menos um serviço. Carro parado muitos dias = espaço para promoção.</p></section>
    </div>`;
}

function ctContador(P) {
  const R = ctReceitas(P), D = ctDespesas(P);
  return `
    <section class="card"><h3>Pacote do contador · ${esc(P.nome)}</h3>
      <p class="why">Todas as entradas e despesas do período numa planilha (CSV, abre no Excel e no Google Sheets). No Reino Unido o ano fiscal vai de 6 de abril a 5 de abril — escolha "Ano fiscal UK" lá em cima para o fechamento do ano.</p>
      <div class="ctLinha"><span>Entradas</span><span>${R.length} lançamentos</span><b>${eur(soma(R))}</b></div>
      <div class="ctLinha"><span>Despesas</span><span>${D.length} lançamentos</span><b>${eur(soma(D))}</b></div>
      <div class="ctLinha"><span>Resultado</span><span></span><b>${eur(soma(R) - soma(D))}</b></div>
      <div class="ctBtns"><button class="cta sm" id="ctCsv">⬇ Baixar planilha (CSV)</button>
        <a class="mini" id="ctMail" href="#">✉ Mandar para o contador</a></div>
      <label class="fld ctEmailCont">E-mail do contador<input id="ctEmailCont" type="email" value="${esc(DB.settings.emailContador || '')}" placeholder="contador@exemplo.co.uk"></label>
    </section>`;
}
function ctLigaContador(P) {
  const R = ctReceitas(P), D = ctDespesas(P);
  const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const csv = () => ['Data;Tipo;Descrição;Categoria;Carro;Forma;Entrada (GBP);Saída (GBP)',
    ...R.map(r => [dtBR(r.data), r.tipo, r.desc, 'Receita', (CT_CARROS.find(c => c[0] === r.carro) || ['', ''])[1], r.metodo === 'pix' ? 'Pix' : 'Cartão', r.valor.toFixed(2).replace('.', ','), ''].map(q).join(';')),
    ...D.map(d => [dtBR(d.data), 'Despesa', d.desc, ctCat(d.cat).replace(/^\S+\s/, ''), (CT_CARROS.find(c => c[0] === d.carro) || ['', ''])[1], '', '', (+d.valor).toFixed(2).replace('.', ',')].map(q).join(';')),
  ].join('\n');
  $('#ctCsv').onclick = () => {
    const blob = new Blob(['﻿' + csv()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `freddy-turismo-${P.de}-a-${P.ate}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const em = $('#ctEmailCont');
  em.onchange = () => { DB.settings.emailContador = em.value.trim(); ctGrava(); };
  $('#ctMail').onclick = (e) => {
    e.preventDefault();
    const corpo = `Olá!\n\nSegue o resumo da Freddy Turismo — ${P.nome}:\nEntradas: ${eur(soma(R))} (${R.length})\nDespesas: ${eur(soma(D))} (${D.length})\nResultado: ${eur(soma(R) - soma(D))}\n\nA planilha (CSV) vai anexa.\n\nRoberto Rivelino`;
    location.href = `mailto:${encodeURIComponent(em.value.trim())}?subject=${encodeURIComponent('Freddy Turismo — ' + P.nome)}&body=${encodeURIComponent(corpo)}`;
  };
}
/* % guardado para imposto: ele escolhe */
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'ctPct') { DB.settings.reservaImposto = Math.max(0, Math.min(60, +e.target.value || 0)); ctGrava(); admContab(); }
});
