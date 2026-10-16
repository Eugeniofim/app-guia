/* =====================================================
   CONTABILIDADE — padrão europeu (Áustria) · Ailton Guia Viena (16/10/2026)

   Pedido: "extrato / contabilidade pode se chamar [Contabilidade] e deixa
   padrão da Europa… bem completo". O antigo Extrato virou a parte
   "Extrato" desta aba (o link #/adm/money cai aqui).

   Seis partes, com o nome em português e o termo austríaco entre
   parênteses — é o que o Steuerberater (contador) vai falar com ele:
   - Resumo: entrou, saiu, resultado, a receber, quanto guardar para SVS e
     imposto; 12 meses; como pagaram; o limite do pequeno empresário
     (Kleinunternehmer, € 55.000 por ano) e o da caixa registradora
     (Registrierkasse: € 15.000 no ano e € 7.500 em dinheiro/cartão na hora).
   - Extrato (Einnahmen): cada pagamento recebido, com RECIBO numerado em
     sequência (Rechnung/Beleg) para imprimir ou mandar pelo WhatsApp.
     Na Áustria todo pagamento em dinheiro exige recibo (Belegerteilungspflicht).
   - Despesas (Ausgaben): lança em 10 segundos, com o IVA da nota
     (Vorsteuer) e se tem comprovante.
   - IVA (Umsatzsteuer / UVA): pequeno empresário = isento, sem UVA;
     regime normal = 20% sobre o passeio, menos o IVA das despesas, por mês
     ou trimestre, com o prazo (dia 15 do segundo mês seguinte).
   - Para o contador: a Einnahmen-Ausgaben-Rechnung do ano, o livro-caixa
     (Kassabuch) e a planilha CSV no formato austríaco (ponto e vírgula,
     vírgula decimal), prontas para mandar.
   - Ajustes: regime de IVA, UID-Nummer, Steuernummer, endereço do recibo,
     % para guardar, e-mail do contador.

   NÃO é cálculo de imposto: os números orientam, quem fecha é o
   Steuerberater. Isso está escrito na tela.
   Ano fiscal na Áustria = ano civil (1/jan a 31/dez).
   ===================================================== */
'use strict';

Object.assign(STR, { admContab: { pt: 'Contabilidade', en: 'Accounting' } });

/* limites da Áustria (2025+). Mudou a lei, muda aqui. */
const AT = {
  kleinLimite: 55000,       /* Kleinunternehmerregelung: faturamento bruto no ano */
  kassaAno: 15000,          /* Registrierkassenpflicht: faturamento no ano… */
  kassaBar: 7500,           /* …e pagamentos "na hora" (dinheiro, cartão, vale) acima disto */
  ivaPasseio: 20,           /* alíquota normal do IVA na Áustria */
  guardaAnos: 7,            /* Aufbewahrungspflicht (§ 132 BAO) */
};

const CT_CATS = [
  ['svs', '🛡️ Seguro social (SVS)', 0], ['wko', '🏛️ Câmara de Comércio (WKO)', 0],
  ['ingressos', '🎟️ Ingressos de clientes (Eintritte)', 13], ['transporte', '🚋 Transporte (Wiener Linien, ÖBB, táxi)', 10],
  ['refeicao', '🍽️ Refeições com clientes (Bewirtung, 50%)', 10], ['telefone', '📱 Telefone e internet', 20],
  ['equip', '🎧 Equipamento (fones, rádio de guia)', 20], ['material', '📚 Material, livros, crachá', 20],
  ['formacao', '🎓 Cursos e formação (Weiterbildung)', 20], ['seguro', '☂️ Seguro de responsabilidade (Haftpflicht)', 0],
  ['contador', '🧾 Contador (Steuerberater)', 20], ['software', '💻 App, site e sistemas', 20],
  ['marketing', '📣 Anúncios e divulgação', 20], ['escritorio', '🏠 Escritório e despesas de casa', 20], ['outro', '• Outros', 20],
];
const ctCat = (id) => CT_CATS.find(c => c[0] === id) || CT_CATS[CT_CATS.length - 1];
const ctNomeCat = (id) => ctCat(id)[1];
const ctGrava = () => { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) { } };
const ctSet = () => DB.settings;
const ctKlein = () => (ctSet().regimeIva || 'klein') === 'klein';
const ctNum = (v) => (Math.round((+v || 0) * 100) / 100);
const ctEur = (v) => '€ ' + ctNum(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ctAt = (v) => ctNum(v).toFixed(2).replace('.', ',');          /* número no CSV austríaco */
const ctDt = (iso) => iso ? String(iso).slice(0, 10).split('-').reverse().join('.') : '';   /* 16.10.2026 */
const ctIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const somaV = (L, k = 'valor') => L.reduce((s, x) => s + (+x[k] || 0), 0);

/* ---------- a aba no menu: Contabilidade no lugar do Extrato ---------- */
(function abaContab() {
  const i = ADM_TABS.findIndex(([x]) => x === 'money');
  if (!ADM_TABS.some(([x]) => x === 'contab')) ADM_TABS.splice(i < 0 ? ADM_TABS.length : i, i < 0 ? 0 : 1, ['contab', 'admContab']);
  else if (i >= 0) ADM_TABS.splice(i, 1);
  if (typeof NAV_GRUPOS !== 'undefined') {
    const g = NAV_GRUPOS.find(([t2]) => t2 === 'Dinheiro');
    if (g) g[1] = ['financeiro', 'contab', 'reports'];
  }
})();
const _viewAdmCt = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'contab') return admContab(arg);
  if (tab === 'money') return admContab('extrato');     /* links antigos do Extrato */
  return _viewAdmCt(tab, arg);
};
const _rotaExtraCt = rotaExtra;
rotaExtra = function (p) {
  if (p[0] === 'recibo') { viewRecibo(decodeURIComponent(p[1] || '')); return true; }
  return _rotaExtraCt(p);
};

/* ---------- despesas de exemplo (só no protótipo) ---------- */
function ctSemeia() {
  if (DB.despesas || !DB.demo) return;
  const hoje = isoToday(), d = (n) => addDays(hoje, n), L = [];
  const poe = (data, cat, desc, valor, iva, comprovante = true) => L.push({ id: 'dp' + L.length, data, cat, desc, valor, iva, comprovante, exemplo: true });
  for (let m = 0; m < 4; m++) {
    const b = -30 * m;
    poe(d(b - 3), 'telefone', 'Celular + internet', 45, 20);
    poe(d(b - 6), 'transporte', 'Wiener Linien — passe mensal', 51, 10);
    poe(d(b - 15), 'ingressos', 'Ingressos Hofburg para cliente', 64, 13);
  }
  poe(d(-40), 'svs', 'SVS — contribuição do trimestre', 1180, 0);
  poe(d(-55), 'contador', 'Steuerberater — honorário', 240, 20);
  poe(d(-20), 'equip', 'Fones de guia (whisper system)', 310, 20);
  poe(d(-12), 'refeicao', 'Almoço Top Tour (parte do guia)', 38, 10);
  poe(d(-70), 'wko', 'WKO — Grundumlage', 120, 0);
  poe(d(-9), 'marketing', 'Anúncio no Instagram', 60, 20, false);
  DB.despesas = L; ctGrava();
}

/* ---------- período: mês, trimestre ou ano (ano fiscal = ano civil) ---------- */
function ctPeriodo(S) {
  const hoje = isoToday(), y0 = +hoje.slice(0, 4), m0 = +hoje.slice(5, 7) - 1;
  const fim = (y, m) => new Date(y, m + 1, 0).getDate();
  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (S.tipo === 'ano') { const y = y0 + S.desloc; return { de: `${y}-01-01`, ate: `${y}-12-31`, nome: 'Ano ' + y, ano: y }; }
  if (S.tipo === 'tri') {
    let q = Math.floor(m0 / 3) + S.desloc, y = y0 + Math.floor(q / 4); q = ((q % 4) + 4) % 4;
    return { de: iso(y, q * 3, 1), ate: iso(y, q * 3 + 2, fim(y, q * 3 + 2)), nome: `${q + 1}º trimestre de ${y}`, ano: y, tri: q };
  }
  const dt = new Date(y0, m0 + S.desloc, 15), y = dt.getFullYear(), m = dt.getMonth();
  return { de: iso(y, m, 1), ate: iso(y, m, fim(y, m)), nome: (s => s[0].toUpperCase() + s.slice(1))(dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })), ano: y, mes: m };
}
const noPer = (iso, P) => !!iso && iso.slice(0, 10) >= P.de && iso.slice(0, 10) <= P.ate;

/* ---------- entradas (Einnahmen): pagamentos das reservas + invoices de agência pagas ---------- */
function ctReceitas(P) {
  const L = [];
  for (const b of DB.bookings || []) {
    const x = Tours.get(b.tourId) || { name: { pt: b.tourId } };
    (b.payments || []).forEach((p, i) => {
      if (!noPer(p.date, P)) return;
      L.push({ ref: b.id + '~' + i, data: p.date, tipo: p.kind === 'deposit' ? 'Sinal' : p.kind === 'balance' ? 'Saldo' : 'Pagamento',
        desc: tl(x.name), cliente: b.name, codigo: b.code, valor: +p.amount, metodo: p.method, naHora: p.method === 'cash' || (p.method === 'card' && p.kind === 'balance'),
        beleg: p.beleg || '', b, p });
    });
  }
  for (const j of DB.trabalhosAgencia || []) {
    const pg = j.invoice && j.invoice.paga;
    if (pg && noPer(pg, P)) {
      const ag = (DB.agencias || []).find(a => a.id === j.agencia) || { nome: 'Agência' };
      L.push({ ref: 'ag~' + j.id, data: pg, tipo: 'Invoice', desc: j.servico, cliente: ag.nome, codigo: j.invoice.numero || '', valor: +j.valor, metodo: 'transfer', naHora: false, beleg: j.invoice.numero || '', agencia: true });
    }
  }
  return L.sort((a, b) => a.data.localeCompare(b.data));
}
const ctDespesas = (P) => (DB.despesas || []).filter(d => noPer(d.data, P)).sort((a, b) => a.data.localeCompare(b.data));

/* IVA das despesas (Vorsteuer): o valor lançado é BRUTO, como está na nota */
const ivaDe = (bruto, pct) => ctNum(+bruto - (+bruto / (1 + (+pct || 0) / 100)));
/* IVA da receita: no regime normal o preço do passeio já tem 20% dentro */
const ivaReceita = (bruto) => ctKlein() ? 0 : ivaDe(bruto, AT.ivaPasseio);

const NOME_MET = { pix: 'Pix (Brasil)', wise: 'Wise', card: 'Cartão', cash: 'Dinheiro', transfer: 'Transferência', other: 'Outro' };
const nomeMet = (m) => NOME_MET[m] || m || '—';

/* =====================================================
   TELA
   ===================================================== */
const CT_ABAS = [['resumo', 'Resumo'], ['extrato', 'Extrato'], ['despesas', 'Despesas'], ['iva', 'IVA'], ['contador', 'Para o contador'], ['ajustes', 'Ajustes']];
function admContab(arg) {
  ctSemeia();
  const S = admContab._s = admContab._s || { tipo: 'mes', desloc: 0, aba: 'resumo' };
  if (arg && CT_ABAS.some(([k]) => k === arg)) S.aba = arg;
  const P = ctPeriodo(S);
  const corpo = { resumo: ctResumo, extrato: ctExtrato, despesas: ctTelaDespesas, iva: ctIva, contador: ctContador, ajustes: ctAjustes }[S.aba](P, S);
  admShell('contab', `
    <div class="pagehead"><h1 class="pageh">Contabilidade</h1>
      <button class="cta sm" id="ctNova">+ Lançar despesa</button></div>
    <nav class="ctAbas" aria-label="Partes da contabilidade">${CT_ABAS.map(([k, n]) => `<button class="${S.aba === k ? 'on' : ''}" data-aba="${k}" aria-pressed="${S.aba === k}">${n}</button>`).join('')}</nav>
    ${S.aba === 'ajustes' ? '' : `<div class="ctBarra">
      <div class="chips">${[['mes', 'Mês'], ['tri', 'Trimestre'], ['ano', 'Ano']].map(([k, n]) => `<button class="chip ${S.tipo === k ? 'on' : ''}" data-tipo="${k}">${n}</button>`).join('')}</div>
      <div class="ctPer"><button class="mini" data-mv="-1" aria-label="Período anterior">←</button><b>${esc(P.nome)}</b><button class="mini" data-mv="1" aria-label="Próximo período">→</button></div>
    </div>`}
    ${corpo}
    <p class="ctAviso">Os números orientam o dia a dia. Quem fecha o imposto é o seu contador (Steuerberater).</p>`);
  $$('[data-tipo]').forEach(b => b.onclick = () => { S.tipo = b.dataset.tipo; S.desloc = 0; admContab(); });
  $$('[data-mv]').forEach(b => b.onclick = () => { S.desloc += +b.dataset.mv; admContab(); });
  $$('[data-aba]').forEach(b => b.onclick = () => { S.aba = b.dataset.aba; admContab(); });
  $('#ctNova').onclick = () => { S.aba = 'despesas'; admContab(); setTimeout(() => { const f = $('#dpValor'); if (f) f.focus(); }, 50); };
  ({ extrato: ctLigaExtrato, despesas: ctLigaDespesas, contador: ctLigaContador, ajustes: ctLigaAjustes }[S.aba] || (() => {}))(P, S);
}

/* ---------- barras simples (sem biblioteca) ---------- */
function ctBarras(linhas, fmt = ctEur) {
  const max = Math.max(1, ...linhas.map(l => l[1]));
  return `<div class="ctBars">${linhas.map(([rot, v, cls]) => `<div class="ctBar ${cls || ''}"><span class="ctBarRot">${esc(rot)}</span>
    <span class="ctBarTrilho"><i style="width:${Math.max(1, Math.round(v / max * 100))}%"></i></span><b>${fmt(v)}</b></div>`).join('')}</div>`;
}
/* medidor de limite: quanto já usou de um teto da lei */
function ctMedidor(tit, sub, usado, teto, aviso) {
  const pct = Math.min(100, Math.round(usado / teto * 100));
  const nivel = pct >= 100 ? 'passou' : pct >= 80 ? 'perto' : 'ok';
  return `<div class="ctMed ${nivel}"><div class="ctMedTopo"><b>${tit}</b><span class="mono">${ctEur(usado)} de ${ctEur(teto)}</span></div>
    <div class="ctMedTrilho" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(tit)}"><i style="width:${pct}%"></i></div>
    <small>${sub}${nivel !== 'ok' ? ' <strong>' + aviso + '</strong>' : ''}</small></div>`;
}

function ctResumo(P) {
  const R = ctReceitas(P), D = ctDespesas(P);
  const rec = somaV(R), desp = somaV(D), lucro = rec - desp, margem = rec ? Math.round(lucro / rec * 100) : 0;
  const hoje = isoToday();
  const aReceber = (DB.bookings || []).filter(b => b.status === 'confirmed' && b.date >= hoje).reduce((s, b) => s + Bookings.due(b), 0);
  const pct = +(ctSet().reservaImposto ?? 30);
  /* 12 meses: entrou × saiu */
  const meses = [];
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1 - i, 15);
    const m = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'), Pm = { de: m + '-01', ate: m + '-31' };
    meses.push({ m, r: somaV(ctReceitas(Pm)), d: somaV(ctDespesas(Pm)) });
  }
  const mx = Math.max(1, ...meses.map(x => Math.max(x.r, x.d)));
  const porMet = {}; R.forEach(x => { const k = nomeMet(x.metodo); porMet[k] = (porMet[k] || 0) + x.valor; });
  /* limites do ANO CIVIL (independe do período escolhido) */
  const ano = { de: hoje.slice(0, 4) + '-01-01', ate: hoje.slice(0, 4) + '-12-31' };
  const Ra = ctReceitas(ano), recAno = somaV(Ra), naHoraAno = somaV(Ra.filter(x => x.naHora));
  return `
    <div class="kpis ctKpis">
      <div class="kpi"><small>Entrou (Einnahmen)</small><b>${ctEur(rec)}</b><i>${R.length} ${R.length === 1 ? 'pagamento' : 'pagamentos'}</i></div>
      <div class="kpi"><small>Saiu (Ausgaben)</small><b>${ctEur(desp)}</b><i>${D.length} despesas</i></div>
      <div class="kpi ${lucro < 0 ? 'warn' : ''}"><small>Resultado (Gewinn)</small><b>${ctEur(lucro)}</b><i>margem de ${margem}%</i></div>
      <div class="kpi"><small>A receber</small><b>${ctEur(aReceber)}</b><i>saldos de reservas futuras</i></div>
      <div class="kpi"><small>Guardar para SVS e imposto</small><b>${ctEur(Math.round(Math.max(0, lucro) * pct / 100))}</b><i>${pct}% do resultado · muda em Ajustes</i></div>
    </div>
    <section class="card"><h3>Limites da lei na Áustria · ${hoje.slice(0, 4)}</h3>
      ${ctMedidor('Pequeno empresário (Kleinunternehmer)', `Até ${ctEur(AT.kleinLimite)} de faturamento bruto no ano você não cobra nem declara IVA.`, recAno, AT.kleinLimite, 'Está chegando no limite: fale com o Steuerberater antes de passar.')}
      ${ctMedidor('Caixa registradora (Registrierkasse) · pagamentos na hora', `Dinheiro e cartão no dia do passeio. A caixa é obrigatória quando passam de ${ctEur(AT.kassaBar)} e o ano passa de ${ctEur(AT.kassaAno)} (este ano: ${ctEur(recAno)}).`, naHoraAno, AT.kassaBar, recAno > AT.kassaAno ? 'Os dois limites passaram: fale com o Steuerberater sobre a caixa registradora.' : 'Chegando perto: fique de olho.')}
      <p class="why">Pagamento em dinheiro sempre leva recibo (Belegerteilungspflicht): em Extrato, toque em "Recibo".</p>
    </section>
    <section class="card"><h3>Entrou × saiu · últimos 12 meses</h3>
      <div class="ctMeses">${meses.map(x => `<div class="ctMes" title="${x.m}: entrou ${ctEur(x.r)}, saiu ${ctEur(x.d)}">
        <div class="ctMesBars"><i class="r" style="height:${Math.round(x.r / mx * 100)}%"></i><i class="d" style="height:${Math.round(x.d / mx * 100)}%"></i></div>
        <small>${new Date(x.m + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div>`).join('')}</div>
      <p class="ctLeg"><span class="r"></span> entrou <span class="d"></span> saiu</p></section>
    <div class="ctDuas">
      <section class="card"><h3>Como pagaram</h3>${Object.keys(porMet).length ? ctBarras(Object.entries(porMet).sort((a, b) => b[1] - a[1])) : '<p class="empty">Nada no período.</p>'}</section>
      <section class="card"><h3>Para onde foi o dinheiro</h3>${D.length ? ctBarras(Object.entries(D.reduce((o, x) => { const k = ctNomeCat(x.cat); o[k] = (o[k] || 0) + x.valor; return o; }, {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, 'd'])) : '<p class="empty">Nenhuma despesa no período.</p>'}</section>
    </div>`;
}

/* ---------- EXTRATO (Einnahmen) com recibo numerado ---------- */
function ctExtrato(P) {
  const R = ctReceitas(P).slice().reverse();
  const europa = R.filter(x => x.metodo !== 'pix'), brasil = R.filter(x => x.metodo === 'pix');
  const linha = (x) => `<div class="ctRow ctRowRec"><span class="mono">${ctDt(x.data)}</span>
    <span><b>${esc(x.cliente)}</b><small>${esc(x.desc)} · ${x.tipo} · ${nomeMet(x.metodo)}${x.codigo ? ' · ' + esc(x.codigo) : ''}${x.b && x.b.exemplo ? ' · <em class="exTag">exemplo</em>' : ''}</small></span>
    <b class="mono">${ctEur(x.valor)}</b>
    ${x.agencia ? `<span class="ctBeleg">${esc(x.beleg || 'invoice')}</span>` : `<button class="mini ctRecibo" data-rec="${esc(x.ref)}">${x.beleg ? '🧾 ' + esc(x.beleg) : '🧾 Recibo'}</button>`}</div>`;
  const bloco = (tit, sub, L) => `<section class="card"><h3>${tit} <span class="mono ctTot">${ctEur(somaV(L))}</span></h3><p class="why">${sub}</p>
    ${L.length ? `<div class="ctTabela">${L.map(linha).join('')}</div>` : '<p class="empty">Nada no período.</p>'}</section>`;
  return `
    <div class="kpis ctKpis">
      <div class="kpi"><small>Recebido no período</small><b>${ctEur(somaV(R))}</b><i>${R.length} pagamentos</i></div>
      <div class="kpi"><small>Na conta europeia</small><b>${ctEur(somaV(europa))}</b><i>cartão, Wise, transferência, dinheiro</i></div>
      <div class="kpi"><small>Pix (Brasil)</small><b>${ctEur(somaV(brasil))}</b><i>convertido em real</i></div>
    </div>
    ${bloco('Conta na Europa', 'Vai para o contador austríaco.', europa)}
    ${bloco('Pix (Brasil)', 'Recebido no Brasil, em real. Mostre ao contador também: renda de fora entra na declaração austríaca.', brasil)}
    <div class="ctBtns"><button class="mini" id="exImprime">🖨 Imprimir extrato</button><button class="mini" id="exCsv">⬇ Planilha do extrato (CSV)</button></div>`;
}
function ctLigaExtrato(P) {
  $$('[data-rec]').forEach(b => b.onclick = () => go('/recibo/' + encodeURIComponent(b.dataset.rec)));
  $('#exImprime').onclick = () => print();
  $('#exCsv').onclick = () => ctBaixa(`extrato-${P.de}-a-${P.ate}.csv`, ctCsvLinhas(ctReceitas(P), []));
}

/* número do recibo: sequência do ano, gravado no pagamento na 1ª emissão
   (a lei pede número único e em sequência — nunca renumera) */
function ctNumeroRecibo(p) {
  if (p.beleg) return p.beleg;
  const ano = String(p.date || isoToday()).slice(0, 4);
  const seq = ctSet().belegSeq = ctSet().belegSeq || {};
  seq[ano] = (+seq[ano] || 0) + 1;
  p.beleg = `AV-${ano}-${String(seq[ano]).padStart(4, '0')}`;
  ctGrava();
  return p.beleg;
}

function viewRecibo(ref) {
  const [bid, i] = String(ref).split('~');
  const b = (DB.bookings || []).find(x => x.id === bid), p = b && b.payments[+i];
  if (!b || !p) { app.innerHTML = `${topoCarol('/adm/contab')}<main class="wrap narrow"><p class="empty">Recibo não encontrado.</p></main>`; ligaVoltar('/adm/contab'); return; }
  const st = ctSet(), x = Tours.get(b.tourId) || { name: { pt: b.tourId } };
  const nr = ctNumeroRecibo(p);
  const bruto = +p.amount, iva = ctKlein() ? 0 : ivaDe(bruto, AT.ivaPasseio), liq = bruto - iva;
  const tipo = p.kind === 'deposit' ? 'Anzahlung (sinal)' : p.kind === 'balance' ? 'Restzahlung (saldo)' : 'Zahlung (pagamento)';
  const nome = (APP_CONFIG.guia && APP_CONFIG.guia.nomeCompleto) || guiaNome();
  app.innerHTML = `${topoCarol('/adm/contab')}
  <main class="wrap ctReciboWrap">
    <article class="ctRecibo" id="ctReciboFolha">
      <header class="ctRecTopo"><img src="arte/logo-claro.png" alt="${esc(guiaNegocio())}">
        <div><b>RECHNUNG · RECIBO</b><span class="mono">Nr. ${esc(nr)}</span><span>Datum: ${ctDt(p.date)}</span></div></header>
      <div class="ctRecPartes">
        <div><small>Leistender (prestador)</small><b>${esc(nome)}</b><span>${esc(guiaNegocio())}</span>
          ${st.ctEndereco ? `<span>${esc(st.ctEndereco).replace(/\n/g, '<br>')}</span>` : '<span class="ctFalta">Endereço: preencher em Contabilidade → Ajustes</span>'}
          ${st.ctUid ? `<span>UID: ${esc(st.ctUid)}</span>` : ''}${st.ctStNr ? `<span>St.-Nr.: ${esc(st.ctStNr)}</span>` : ''}</div>
        <div><small>Empfänger (cliente)</small><b>${esc(b.name)}</b>${b.email ? `<span>${esc(b.email)}</span>` : ''}<span>Reserva ${esc(b.code)}</span></div>
      </div>
      <table class="ctRecTab"><thead><tr><th>Leistung (serviço)</th><th>Datum</th><th class="right">Betrag</th></tr></thead>
        <tbody><tr><td>${esc(tl(x.name))} — Fremdenführung in Wien, ${b.pax} Pers.<br><small>${tipo}</small></td><td class="mono">${ctDt(b.date)}</td><td class="mono right">${ctEur(bruto)}</td></tr></tbody>
        <tfoot>${ctKlein() ? `<tr><td colspan="2"><b>Gesamt (total)</b></td><td class="mono right"><b>${ctEur(bruto)}</b></td></tr>`
          : `<tr><td colspan="2">Netto</td><td class="mono right">${ctEur(liq)}</td></tr><tr><td colspan="2">USt ${AT.ivaPasseio}%</td><td class="mono right">${ctEur(iva)}</td></tr><tr><td colspan="2"><b>Brutto (total)</b></td><td class="mono right"><b>${ctEur(bruto)}</b></td></tr>`}</tfoot></table>
      <p class="ctRecNota">${ctKlein() ? 'Umsatzsteuerfrei aufgrund der Kleinunternehmerregelung (§ 6 Abs. 1 Z 27 UStG).' : ''}
        Bezahlt am ${ctDt(p.date)} · ${esc(nomeMet(p.method))}.</p>
      <p class="ctRecObrigado">Obrigado por conhecer Viena comigo! — ${esc(guiaNome())}</p>
    </article>
    <div class="ctBtns noPrint"><button class="cta sm" id="rcImp">🖨 Imprimir / salvar PDF</button>
      ${b.whats ? `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink(`Olá, ${String(b.name).split(' ')[0]}! Segue o recibo ${nr} do seu passeio ${tl(x.name)} (${ctEur(bruto)}). Obrigado! — ${guiaNome()}`, b.whats))}">Mandar pelo WhatsApp</a>` : ''}
      <button class="mini" id="rcVolta">← Voltar ao extrato</button></div>
  </main>`;
  ligaVoltar('/adm/contab');
  $('#rcImp').onclick = () => print();
  $('#rcVolta').onclick = () => { admContab._s = Object.assign(admContab._s || {}, { aba: 'extrato' }); go('/adm/contab'); };
}

/* ---------- DESPESAS (Ausgaben) ---------- */
function ctTelaDespesas(P) {
  const D = ctDespesas(P).slice().reverse();
  const semNota = D.filter(d => d.comprovante === false).length;
  return `
    <section class="card ctForm" id="ctForm"><h3>Lançar despesa</h3>
      <div class="ctFormGrade">
        <label class="fld">Valor da nota, com IVA (€)<input id="dpValor" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0,00"></label>
        <label class="fld">Data<input id="dpData" type="date" value="${isoToday()}"></label>
        <label class="fld">Categoria<select id="dpCat">${CT_CATS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label class="fld">IVA da nota<select id="dpIva">${[0, 10, 13, 20].map(v => `<option value="${v}">${v}%</option>`).join('')}</select></label>
        <label class="fld ctDesc">Descrição<input id="dpDesc" placeholder="Ex.: passe Wiener Linien, ingressos Schönbrunn"></label>
        <label class="optin ctNota"><input type="checkbox" id="dpNota" checked><span><b>Tenho o comprovante</b><small>Guarde a nota por ${AT.guardaAnos} anos (Aufbewahrungspflicht).</small></span></label>
      </div>
      <button class="cta sm" id="dpSalva">Salvar despesa</button>
    </section>
    <section class="card"><h3>Despesas · ${esc(P.nome)} <span class="mono ctTot">${ctEur(somaV(D))}</span></h3>
      ${semNota ? `<p class="ctAlerta">⚠ ${semNota} ${semNota === 1 ? 'despesa sem comprovante' : 'despesas sem comprovante'}: sem nota, o contador não pode lançar.</p>` : ''}
      ${D.length ? `<div class="ctTabela">${D.map(d => `<div class="ctRow"><span class="mono">${ctDt(d.data)}</span><span>${ctNomeCat(d.cat)}<small>${esc(d.desc || '')} · IVA ${+d.iva || 0}% (${ctEur(ivaDe(d.valor, d.iva))})${d.comprovante === false ? ' · <em class="ctSemNota">sem comprovante</em>' : ''}${d.exemplo ? ' · <em class="exTag">exemplo</em>' : ''}</small></span><b class="mono">${ctEur(d.valor)}</b><button class="mini" data-apaga="${esc(d.id)}" aria-label="Apagar despesa">✕</button></div>`).join('')}</div>` : '<p class="empty">Nenhuma despesa no período.</p>'}
    </section>`;
}
function ctLigaDespesas() {
  $('#dpCat').onchange = (e) => { $('#dpIva').value = String(ctCat(e.target.value)[2]); };
  $('#dpIva').value = String(ctCat($('#dpCat').value)[2]);
  $('#dpSalva').onclick = () => {
    const valor = +String($('#dpValor').value).replace(',', '.');
    if (!(valor > 0)) { toast('Ponha o valor.'); $('#dpValor').focus(); return; }
    DB.despesas = DB.despesas || [];
    DB.despesas.push({ id: 'dp' + Date.now().toString(36), data: $('#dpData').value || isoToday(), cat: $('#dpCat').value, iva: +$('#dpIva').value,
      comprovante: $('#dpNota').checked, desc: $('#dpDesc').value.trim(), valor });
    ctGrava(); toast('Despesa lançada ✓'); admContab();
  };
  $$('[data-apaga]').forEach(b => b.onclick = () => {
    if (!confirm('Apagar esta despesa?')) return;
    DB.despesas = (DB.despesas || []).filter(d => d.id !== b.dataset.apaga); ctGrava(); admContab();
  });
}

/* ---------- IVA (Umsatzsteuer / UVA) ---------- */
function ctIva(P) {
  if (ctKlein()) {
    const hoje = isoToday(), ano = { de: hoje.slice(0, 4) + '-01-01', ate: hoje.slice(0, 4) + '-12-31' };
    const recAno = somaV(ctReceitas(ano));
    return `<section class="card"><h3>Você está no regime de pequeno empresário (Kleinunternehmer)</h3>
      <ul class="ctLista">
        <li>Não cobra IVA dos clientes e não faz a declaração mensal/trimestral de IVA (UVA).</li>
        <li>Também não recupera o IVA das despesas (Vorsteuer).</li>
        <li>No recibo sai a frase obrigatória: <i>“Umsatzsteuerfrei aufgrund der Kleinunternehmerregelung”</i>.</li>
        <li>Vale enquanto o faturamento bruto do ano ficar até ${ctEur(AT.kleinLimite)}.</li>
      </ul>
      ${ctMedidor('Faturamento em ' + hoje.slice(0, 4), 'Bruto, todos os pagamentos do ano civil.', recAno, AT.kleinLimite, 'Perto do limite: combine com o Steuerberater a passagem para o regime normal.')}
      <p class="why">Mudou de regime? Contabilidade → Ajustes.</p></section>`;
  }
  /* regime normal: um bloco por mês ou trimestre (o que o contador usar) */
  const passo = ctSet().uvaPeriodo === 'mes' ? 1 : 3;
  const ini = +P.de.slice(5, 7) - 1, y = +P.de.slice(0, 4), fimM = +P.ate.slice(5, 7) - 1 + (+P.ate.slice(0, 4) - y) * 12;
  const blocos = [];
  for (let m = ini - (ini % passo); m <= fimM; m += passo) {
    const d0 = new Date(y, m, 1), d1 = new Date(y, m + passo, 0);
    const Pq = { de: ctIso(d0), ate: ctIso(d1) };
    const R = ctReceitas(Pq), D = ctDespesas(Pq).filter(d => d.comprovante !== false);
    const ust = R.reduce((s, x) => s + ivaReceita(x.valor), 0), vst = D.reduce((s, d) => s + ivaDe(d.valor, d.iva), 0);
    const prazo = new Date(d1.getFullYear(), d1.getMonth() + 2, 15);
    blocos.push({ nome: passo === 1 ? d0.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : `${Math.floor(d0.getMonth() / 3) + 1}º trimestre ${d0.getFullYear()}`,
      ust, vst, zl: ust - vst, prazo: ctIso(prazo), bruto: somaV(R) });
  }
  return `<section class="card"><h3>IVA a pagar (UVA) · ${passo === 1 ? 'mensal' : 'trimestral'}</h3>
    <p class="why">Passeio guiado na Áustria: ${AT.ivaPasseio}% de IVA, que já está dentro do preço. Você paga ao Finanzamt o IVA dos passeios menos o IVA das despesas com comprovante (Vorsteuer). Prazo: dia 15 do segundo mês depois do período.</p>
    <div class="ctTabela">${blocos.map(q => `<div class="ctRow ctRowIva"><span><b>${esc(q.nome)}</b><small>faturou ${ctEur(q.bruto)} · prazo ${ctDt(q.prazo)}</small></span>
      <span class="mono">USt ${ctEur(q.ust)}<br>− Vorsteuer ${ctEur(q.vst)}</span><b class="mono ${q.zl < 0 ? 'pos' : ''}">${q.zl < 0 ? 'crédito ' + ctEur(-q.zl) : ctEur(q.zl)}</b></div>`).join('')}</div>
    <p class="why">Agência de fora da Áustria (B2B): o tratamento do IVA pode ser outro (reverse charge) — o contador confirma.</p></section>`;
}

/* ---------- PARA O CONTADOR (Steuerberater) ---------- */
function ctContador(P) {
  const R = ctReceitas(P), D = ctDespesas(P);
  const porCat = {}; D.forEach(d => { porCat[d.cat] = (porCat[d.cat] || 0) + d.valor; });
  const caixa = R.filter(x => x.metodo === 'cash');
  const ano = +isoToday().slice(0, 4);
  return `
    <section class="card"><h3>Livro de entradas e saídas (Einnahmen-Ausgaben-Rechnung) · ${esc(P.nome)}</h3>
      <p class="why">É o fechamento que o pequeno empresário na Áustria entrega. Para o ano inteiro, escolha "Ano" lá em cima.</p>
      <div class="ctLinha"><span><b>Receitas (Betriebseinnahmen)</b></span><span>${R.length} lançamentos</span><b class="mono">${ctEur(somaV(R))}</b></div>
      ${Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="ctLinha sub"><span>${ctNomeCat(k)}</span><span></span><b class="mono neg">− ${ctEur(v)}</b></div>`).join('')}
      <div class="ctLinha"><span><b>Despesas (Betriebsausgaben)</b></span><span>${D.length} lançamentos</span><b class="mono neg">− ${ctEur(somaV(D))}</b></div>
      <div class="ctLinha total"><span><b>Resultado (Gewinn)</b></span><span></span><b class="mono">${ctEur(somaV(R) - somaV(D))}</b></div>
      <p class="why">Refeições com clientes (Bewirtung) contam só pela metade; o contador ajusta.</p>
      <div class="ctBtns"><button class="cta sm" id="ctCsv">⬇ Planilha completa (CSV)</button>
        <button class="mini" id="ctKassa">⬇ Livro-caixa do dinheiro (Kassabuch)</button>
        <a class="mini" id="ctMail" href="#">✉ Mandar para o contador</a></div>
      <label class="fld ctEmailCont">E-mail do contador<input id="ctEmailCont" type="email" value="${esc(ctSet().emailContador || '')}" placeholder="kanzlei@exemplo.at"></label>
    </section>
    <section class="card"><h3>Calendário do ano · ${ano}</h3>
      <ul class="ctLista ctDatas">
        <li><b>SVS (seguro social)</b> — por trimestre: fim de fevereiro, maio, agosto e novembro.</li>
        ${ctKlein() ? '' : `<li><b>UVA (IVA)</b> — dia 15 do segundo mês depois de cada ${ctSet().uvaPeriodo === 'mes' ? 'mês' : 'trimestre'}.</li>`}
        <li><b>Declaração de imposto de renda (Einkommensteuererklärung) de ${ano - 1}</b> — 30 de abril em papel, 30 de junho pelo FinanzOnline (com contador, mais tarde).</li>
        <li><b>Guardar comprovantes</b> — ${AT.guardaAnos} anos (Aufbewahrungspflicht).</li>
      </ul>
      <p class="why">${caixa.length ? `${caixa.length} ${caixa.length === 1 ? 'pagamento' : 'pagamentos'} em dinheiro no período (${ctEur(somaV(caixa))}): cada um precisa de recibo.` : 'Nenhum pagamento em dinheiro no período.'}</p>
    </section>`;
}
function ctCsvLinhas(R, D) {
  const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const linhas = ['Datum;Beleg-Nr.;Art;Beschreibung;Kunde/Lieferant;Kategorie;Zahlungsart;Netto;USt %;USt;Brutto'];
  R.forEach(r => {
    const iva = ivaReceita(r.valor);
    linhas.push([ctDt(r.data), r.beleg || r.codigo, 'Einnahme', `${r.desc} (${r.tipo})`, r.cliente, 'Fremdenführung', nomeMet(r.metodo), ctAt(r.valor - iva), ctKlein() ? '0' : AT.ivaPasseio, ctAt(iva), ctAt(r.valor)].map(q).join(';'));
  });
  D.forEach(d => {
    const iva = ivaDe(d.valor, d.iva);
    linhas.push([ctDt(d.data), d.comprovante === false ? 'OHNE BELEG' : '', 'Ausgabe', d.desc, '', ctNomeCat(d.cat).replace(/^\S+\s/, ''), '', ctAt(d.valor - iva), +d.iva || 0, ctAt(iva), ctAt(d.valor)].map(q).join(';'));
  });
  return linhas.join('\n');
}
function ctBaixa(nome, csv) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function ctLigaContador(P) {
  const R = ctReceitas(P), D = ctDespesas(P);
  $('#ctCsv').onclick = () => ctBaixa(`ailton-guia-viena-${P.de}-a-${P.ate}.csv`, ctCsvLinhas(R, D));
  $('#ctKassa').onclick = () => {
    let saldo = 0;
    const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const L = ['Datum;Beleg-Nr.;Text;Einnahme;Ausgabe;Kassastand'];
    R.filter(r => r.metodo === 'cash').forEach(r => { saldo += r.valor; L.push([ctDt(r.data), r.beleg || r.codigo, `${r.desc} — ${r.cliente}`, ctAt(r.valor), '', ctAt(saldo)].map(q).join(';')); });
    ctBaixa(`kassabuch-${P.de}-a-${P.ate}.csv`, L.join('\n'));
  };
  const em = $('#ctEmailCont');
  em.onchange = () => { ctSet().emailContador = em.value.trim(); ctGrava(); };
  $('#ctMail').onclick = (e) => {
    e.preventDefault();
    const corpo = `Olá!\n\nSegue o resumo da Ailton Guia Viena — ${P.nome}:\nReceitas (Einnahmen): ${ctEur(somaV(R))} (${R.length})\nDespesas (Ausgaben): ${ctEur(somaV(D))} (${D.length})\nResultado (Gewinn): ${ctEur(somaV(R) - somaV(D))}\nRegime: ${ctKlein() ? 'Kleinunternehmer' : 'regular (USt ' + AT.ivaPasseio + '%)'}\n\nA planilha (CSV) vai anexa.\n\n${(APP_CONFIG.guia && APP_CONFIG.guia.nomeCompleto) || guiaNome()}`;
    location.href = `mailto:${encodeURIComponent(em.value.trim())}?subject=${encodeURIComponent('Ailton Guia Viena — ' + P.nome)}&body=${encodeURIComponent(corpo)}`;
  };
}

/* ---------- AJUSTES da contabilidade ---------- */
function ctAjustes() {
  const st = ctSet();
  return `<section class="card"><h3>Regime de IVA</h3>
      <div class="ctOpcoes">
        <label class="optin"><input type="radio" name="ctReg" value="klein" ${ctKlein() ? 'checked' : ''}><span><b>Pequeno empresário (Kleinunternehmer)</b><small>Até ${ctEur(AT.kleinLimite)} por ano: sem IVA no recibo, sem UVA.</small></span></label>
        <label class="optin"><input type="radio" name="ctReg" value="normal" ${ctKlein() ? '' : 'checked'}><span><b>Regime normal</b><small>${AT.ivaPasseio}% de IVA no passeio, UVA com o contador.</small></span></label>
      </div>
      <label class="fld">UVA (se regime normal)<select id="ctUvaPer"><option value="tri" ${st.uvaPeriodo !== 'mes' ? 'selected' : ''}>Por trimestre</option><option value="mes" ${st.uvaPeriodo === 'mes' ? 'selected' : ''}>Por mês</option></select></label>
    </section>
    <section class="card"><h3>Dados que saem no recibo</h3>
      <label class="fld">Endereço comercial<textarea id="ctEnd" rows="2" placeholder="Rua, número, CEP, Wien">${esc(st.ctEndereco || '')}</textarea></label>
      <div class="frow"><label class="fld">UID-Nummer <small class="why">só no regime normal</small><input id="ctUid" value="${esc(st.ctUid || '')}" placeholder="ATU12345678"></label>
        <label class="fld">Steuernummer<input id="ctStNr" value="${esc(st.ctStNr || '')}" placeholder="12 345/6789"></label></div>
    </section>
    <section class="card"><h3>Quanto guardar</h3>
      <label class="fld">% do resultado para seguro social (SVS) e imposto<input id="ctPct" type="number" min="0" max="60" value="${esc(String(st.reservaImposto ?? 30))}"></label>
      <p class="why">É só uma reserva para não ser pego de surpresa. O valor certo quem calcula é o contador.</p>
    </section>
    <button class="cta" id="ctSalvaAj">Salvar</button>`;
}
function ctLigaAjustes() {
  $('#ctSalvaAj').onclick = () => {
    const st = ctSet();
    st.regimeIva = ($('[name=ctReg]:checked') || {}).value || 'klein';
    st.uvaPeriodo = $('#ctUvaPer').value;
    st.ctEndereco = $('#ctEnd').value.trim();
    st.ctUid = $('#ctUid').value.trim().toUpperCase();
    st.ctStNr = $('#ctStNr').value.trim();
    st.reservaImposto = Math.max(0, Math.min(60, +$('#ctPct').value || 0));
    ctGrava(); toast('Ajustes da contabilidade salvos ✓'); admContab('resumo');
  };
}

if (typeof module !== 'undefined') module.exports = { ctPeriodo, AT, ivaDe };
