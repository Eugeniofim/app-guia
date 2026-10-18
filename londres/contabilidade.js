/* =====================================================
   CONTABILIDADE — por país (18/10/2026)

   Pedido do Eugênio: "aplica a mesma qualidade de contabilidade para o app
   DEMO". A base é a Contabilidade do Ailton (Viena, 16/10), que era toda
   austríaca. Aqui ela virou um motor com PERFIL DE PAÍS: o demo (Bia, em
   Londres) usa o Reino Unido; o perfil da Áustria fica pronto para o Ailton
   e para quem guiar lá. País novo = um perfil novo em CT_PAISES.
   Qual perfil: APP_CONFIG.contab.pais ('UK' | 'AT'). Prefixo do recibo:
   APP_CONFIG.contab.prefixo.

   Seis partes (iguais nos dois países, com os termos de cada um):
   Resumo · Extrato com recibo numerado · Despesas · Imposto sobre vendas
   (VAT / USt) · Para o contador · Ajustes.

   NÃO é cálculo de imposto: os números orientam, quem fecha é o contador.
   Isso está escrito na tela.
   ===================================================== */
'use strict';

Object.assign(STR, { admContab: { pt: 'Contabilidade', en: 'Accounting', fr: 'Comptabilité', it: 'Contabilità', de: 'Buchhaltung', es: 'Contabilidad' } });

/* ---------- PERFIS DE PAÍS. Mudou a lei, muda aqui. ---------- */
const CT_PAISES = {
  /* Reino Unido, ano fiscal 2026/27. Fontes: gov.uk (VAT registration threshold,
     Making Tax Digital for Income Tax, Self Assessment, Class 4 NI). */
  UK: {
    nome: 'Reino Unido', cidade: 'London', fisco: 'HMRC', contador: 'contador (accountant)', contadorCurto: 'accountant',
    anoIni: [4, 6],                                   /* ano fiscal: 6 de abril a 5 de abril */
    t: { entrou: 'Income', saiu: 'Expenses', resultado: 'Profit', imposto: 'VAT' },
    ivaTaxa: 20, ivaOpcoes: [0, 5, 20],
    isento: { nome: 'Sem registro no VAT', curto: 'não registrada no VAT', limite: 90000,
      desc: (L) => `Até ${L} de faturamento em 12 meses você não precisa se registrar no VAT: não cobra VAT dos clientes e não faz VAT Return.`,
      fraseRecibo: '' },
    normal: { nome: 'Registrada no VAT', desc: (tx) => `${tx}% de VAT no passeio guiado (standard rate), VAT Return a cada trimestre.` },
    declIva: 'VAT Return', prazoIva: (fim) => { const d = new Date(fim.getFullYear(), fim.getMonth() + 1, fim.getDate() + 7); return d; },
    prazoIvaTxt: 'Prazo: 1 mês e 7 dias depois do fim do trimestre, pelo software (Making Tax Digital).',
    numFiscal: ['VAT number', 'GB123456789'], numFiscal2: ['UTR (Unique Taxpayer Reference)', '12345 67890'],
    guardarTxt: 'Guarde as notas por 5 anos depois do prazo de 31 de janeiro.',
    reservaRot: 'Guardar para Income Tax e National Insurance', reservaPadrao: 25,
    medidores: (recAno, naHora, fmt) => [
      ctMedidor('Limite de registro no VAT', `Passou de ${fmt(90000)} em 12 meses, o registro no VAT é obrigatório (30 dias para avisar o HMRC).`, recAno, 90000, 'Perto do limite: fale com o accountant antes de passar.', fmt),
      ctMedidor('Making Tax Digital (Income Tax)', `Desde abril de 2026, quem fatura mais de ${fmt(50000)} por ano manda o resumo a cada trimestre pelo software (a partir de 2027, ${fmt(30000)}).`, recAno, 50000, 'Você entra no MTD: o accountant prepara as atualizações trimestrais.', fmt),
    ],
    notaResumo: 'Almoço com cliente (client entertainment) não é dedutível no Reino Unido. Ingressos comprados para clientes entram como custo.',
    cats: [
      ['ingressos', '🎟️ Ingressos de clientes (cost of sales)', 20], ['transporte', '🚇 Transporte (TfL, Oyster, trem)', 0],
      ['refeicao', '🍽️ Refeição com cliente (não dedutível)', 20], ['telefone', '📱 Telefone e internet', 20],
      ['equip', '🎧 Equipamento (fones, rádio de guia)', 20], ['material', '📚 Livros, mapas, crachá', 0],
      ['formacao', '🎓 Cursos (Blue Badge, CPD)', 0], ['associacao', '🏛️ Associação de guias (ITG, BGA)', 0],
      ['seguro', '☂️ Seguro de responsabilidade (public liability)', 0], ['contador', '🧾 Contador (accountant)', 20],
      ['software', '💻 App, site e sistemas', 20], ['marketing', '📣 Anúncios e divulgação', 20],
      ['escritorio', '🏠 Uso da casa como escritório (use of home)', 0], ['outro', '• Outros', 20],
    ],
    semente: [   /* despesas de exemplo do demo: [dias atrás, cat, desc, valor, vat%, comprovante] */
      [3, 'telefone', 'Celular + internet', 38, 20], [6, 'transporte', 'Oyster — viagens do mês', 96, 0], [15, 'ingressos', 'Ingressos Tower of London para cliente', 67.6, 0],
      [33, 'telefone', 'Celular + internet', 38, 20], [36, 'transporte', 'Oyster — viagens do mês', 104, 0], [45, 'ingressos', 'Ingressos Westminster Abbey para cliente', 58, 0],
      [63, 'telefone', 'Celular + internet', 38, 20], [66, 'transporte', 'Oyster — viagens do mês', 91, 0],
      [40, 'seguro', 'Public liability — renovação anual', 145, 0], [55, 'contador', 'Accountant — Self Assessment', 300, 20],
      [20, 'equip', 'Fones de guia (whisper system)', 260, 20], [12, 'refeicao', 'Almoço com grupo (parte da guia)', 32, 20],
      [70, 'associacao', 'Institute of Tourist Guiding — anuidade', 120, 0], [9, 'marketing', 'Anúncio no Instagram', 50, 20, false],
      [25, 'formacao', 'Curso CPD — Blue Badge', 85, 0],
    ],
    calendario: (anoFiscal) => [
      `<b>Self Assessment de ${anoFiscal - 1}/${String(anoFiscal).slice(2)}</b> — online até 31 de janeiro de ${anoFiscal + 1}, com o imposto (e a 1ª parcela adiantada, payment on account).`,
      `<b>2ª parcela adiantada</b> — 31 de julho.`,
      `<b>Making Tax Digital</b> (acima de £ 50.000) — resumos trimestrais até 7 de agosto, 7 de novembro, 7 de fevereiro e 7 de maio.`,
      `<b>National Insurance</b> — Class 4 vem junto no Self Assessment (6% do lucro entre £ 12.570 e £ 50.270).`,
      `<b>Guardar comprovantes</b> — 5 anos depois do prazo de 31 de janeiro.`,
    ],
    pix: 'Recebido no Brasil, em real. Mostre ao accountant: quem mora no Reino Unido declara a renda do mundo todo.',
    recibo: { titulo: 'RECEIPT · RECIBO', prestador: 'Provider (prestadora)', cliente: 'Customer (cliente)', servico: 'Service (serviço)', data: 'Date',
      total: 'Total', liquido: 'Net', ivaRot: 'VAT', pago: 'Paid on', servicoTxt: (n) => `Guided tour in London, ${n} ${n === 1 ? 'person' : 'people'}`,
      sinal: 'Deposit (sinal)', saldo: 'Balance (saldo)', pagamento: 'Payment (pagamento)', obrigado: 'Obrigada por conhecer Londres comigo!' },
    csv: { sep: ',', dec: '.', data: (iso) => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '',
      cab: ['Date', 'Receipt no.', 'Type', 'Description', 'Customer/Supplier', 'Category', 'Payment method', 'Net', 'VAT %', 'VAT', 'Gross'],
      entrada: 'Income', saida: 'Expense', semNota: 'NO RECEIPT', servico: 'Tour guiding', caixa: 'Cash book',
      caixaCab: ['Date', 'Receipt no.', 'Description', 'In', 'Out', 'Balance'] },
    livro: 'Conta de receitas e despesas (Self Assessment — self-employment)',
    livroTxt: 'É o que vai para a página de autônomo (self-employment) do Self Assessment. Para o ano fiscal inteiro (6/4 a 5/4), escolha "Ano" lá em cima.',
    notaLivro: 'Refeição com cliente não é dedutível; o accountant tira da conta.',
    caixaTxt: 'Pagamento em dinheiro: registre todos. Recibo não é obrigatório no Reino Unido, mas ajuda o accountant.',
    endPh: 'Rua, número, cidade, postcode', emailPh: 'accounts@exemplo.co.uk',
  },

  /* Áustria (o perfil do Ailton, 16/10/2026) */
  AT: {
    nome: 'Áustria', cidade: 'Wien', fisco: 'Finanzamt', contador: 'contador (Steuerberater)', contadorCurto: 'Steuerberater',
    anoIni: [1, 1],
    t: { entrou: 'Einnahmen', saiu: 'Ausgaben', resultado: 'Gewinn', imposto: 'USt' },
    ivaTaxa: 20, ivaOpcoes: [0, 10, 13, 20],
    isento: { nome: 'Pequeno empresário (Kleinunternehmer)', curto: 'Kleinunternehmer', limite: 55000,
      desc: (L) => `Até ${L} de faturamento bruto no ano você não cobra nem declara IVA.`,
      fraseRecibo: 'Umsatzsteuerfrei aufgrund der Kleinunternehmerregelung (§ 6 Abs. 1 Z 27 UStG).' },
    normal: { nome: 'Regime normal', desc: (tx) => `${tx}% de IVA no passeio, UVA com o contador.` },
    declIva: 'UVA', prazoIva: (fim) => new Date(fim.getFullYear(), fim.getMonth() + 2, 15),
    prazoIvaTxt: 'Prazo: dia 15 do segundo mês depois do período.',
    numFiscal: ['UID-Nummer', 'ATU12345678'], numFiscal2: ['Steuernummer', '12 345/6789'],
    guardarTxt: 'Guarde a nota por 7 anos (Aufbewahrungspflicht).',
    reservaRot: 'Guardar para SVS e imposto', reservaPadrao: 30,
    medidores: (recAno, naHora, fmt) => [
      ctMedidor('Pequeno empresário (Kleinunternehmer)', `Até ${fmt(55000)} de faturamento bruto no ano você não cobra nem declara IVA.`, recAno, 55000, 'Está chegando no limite: fale com o Steuerberater antes de passar.', fmt),
      ctMedidor('Caixa registradora (Registrierkasse) · pagamentos na hora', `Dinheiro e cartão no dia do passeio. A caixa é obrigatória quando passam de ${fmt(7500)} e o ano passa de ${fmt(15000)} (este ano: ${fmt(recAno)}).`, naHora, 7500, recAno > 15000 ? 'Os dois limites passaram: fale com o Steuerberater sobre a caixa registradora.' : 'Chegando perto: fique de olho.', fmt),
    ],
    notaResumo: 'Pagamento em dinheiro sempre leva recibo (Belegerteilungspflicht): em Extrato, toque em "Recibo".',
    cats: [
      ['svs', '🛡️ Seguro social (SVS)', 0], ['wko', '🏛️ Câmara de Comércio (WKO)', 0],
      ['ingressos', '🎟️ Ingressos de clientes (Eintritte)', 13], ['transporte', '🚋 Transporte (Wiener Linien, ÖBB, táxi)', 10],
      ['refeicao', '🍽️ Refeições com clientes (Bewirtung, 50%)', 10], ['telefone', '📱 Telefone e internet', 20],
      ['equip', '🎧 Equipamento (fones, rádio de guia)', 20], ['material', '📚 Material, livros, crachá', 20],
      ['formacao', '🎓 Cursos e formação (Weiterbildung)', 20], ['seguro', '☂️ Seguro de responsabilidade (Haftpflicht)', 0],
      ['contador', '🧾 Contador (Steuerberater)', 20], ['software', '💻 App, site e sistemas', 20],
      ['marketing', '📣 Anúncios e divulgação', 20], ['escritorio', '🏠 Escritório e despesas de casa', 20], ['outro', '• Outros', 20],
    ],
    semente: [
      [3, 'telefone', 'Celular + internet', 45, 20], [6, 'transporte', 'Wiener Linien — passe mensal', 51, 10], [15, 'ingressos', 'Ingressos Hofburg para cliente', 64, 13],
      [33, 'telefone', 'Celular + internet', 45, 20], [36, 'transporte', 'Wiener Linien — passe mensal', 51, 10],
      [40, 'svs', 'SVS — contribuição do trimestre', 1180, 0], [55, 'contador', 'Steuerberater — honorário', 240, 20],
      [20, 'equip', 'Fones de guia (whisper system)', 310, 20], [12, 'refeicao', 'Almoço Top Tour (parte do guia)', 38, 10],
      [70, 'wko', 'WKO — Grundumlage', 120, 0], [9, 'marketing', 'Anúncio no Instagram', 60, 20, false],
    ],
    calendario: (ano) => [
      '<b>SVS (seguro social)</b> — por trimestre: fim de fevereiro, maio, agosto e novembro.',
      `<b>Declaração de imposto de renda (Einkommensteuererklärung) de ${ano - 1}</b> — 30 de abril em papel, 30 de junho pelo FinanzOnline (com contador, mais tarde).`,
      '<b>Guardar comprovantes</b> — 7 anos (Aufbewahrungspflicht).',
    ],
    pix: 'Recebido no Brasil, em real. Mostre ao contador também: renda de fora entra na declaração austríaca.',
    recibo: { titulo: 'RECHNUNG · RECIBO', prestador: 'Leistender (prestador)', cliente: 'Empfänger (cliente)', servico: 'Leistung (serviço)', data: 'Datum',
      total: 'Gesamt (total)', liquido: 'Netto', ivaRot: 'USt', pago: 'Bezahlt am', servicoTxt: (n) => `Fremdenführung in Wien, ${n} Pers.`,
      sinal: 'Anzahlung (sinal)', saldo: 'Restzahlung (saldo)', pagamento: 'Zahlung (pagamento)', obrigado: 'Obrigado por conhecer Viena comigo!' },
    csv: { sep: ';', dec: ',', data: (iso) => iso ? String(iso).slice(0, 10).split('-').reverse().join('.') : '',
      cab: ['Datum', 'Beleg-Nr.', 'Art', 'Beschreibung', 'Kunde/Lieferant', 'Kategorie', 'Zahlungsart', 'Netto', 'USt %', 'USt', 'Brutto'],
      entrada: 'Einnahme', saida: 'Ausgabe', semNota: 'OHNE BELEG', servico: 'Fremdenführung', caixa: 'Kassabuch',
      caixaCab: ['Datum', 'Beleg-Nr.', 'Text', 'Einnahme', 'Ausgabe', 'Kassastand'] },
    livro: 'Livro de entradas e saídas (Einnahmen-Ausgaben-Rechnung)',
    livroTxt: 'É o fechamento que o pequeno empresário na Áustria entrega. Para o ano inteiro, escolha "Ano" lá em cima.',
    notaLivro: 'Refeições com clientes (Bewirtung) contam só pela metade; o contador ajusta.',
    caixaTxt: 'Cada pagamento em dinheiro precisa de recibo.',
    endPh: 'Rua, número, CEP, Wien', emailPh: 'kanzlei@exemplo.at',
  },
};
const ctCfg = () => (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.contab) || {};
const CTP = () => CT_PAISES[ctCfg().pais] || CT_PAISES.UK;

const ctCat = (id) => CTP().cats.find(c => c[0] === id) || CTP().cats[CTP().cats.length - 1];
const ctNomeCat = (id) => ctCat(id)[1];
const ctGrava = () => { try { if (typeof save === 'function') save(); else localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) { } };
const ctSet = () => DB.settings;
const ctIsento = () => (ctSet().regimeIva || 'isento') !== 'normal';
const ctNum = (v) => (Math.round((+v || 0) * 100) / 100);
/* dinheiro na moeda do app (£ no demo de Londres, € em Viena), sempre com centavos */
const ctMoeda = (v) => (typeof MOEDA_SIMB !== 'undefined' ? MOEDA_SIMB : '€') + ' ' + ctNum(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ctNumCsv = (v) => { const s = ctNum(v).toFixed(2); return CTP().csv.dec === ',' ? s.replace('.', ',') : s; };
const ctDt = (iso) => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '';
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
  if (tab === 'money' || tab === 'extrato') return admContab('extrato');     /* links antigos do Extrato */
  return _viewAdmCt(tab, arg);
};
const _rotaExtraCt = rotaExtra;
rotaExtra = function (p) {
  if (p[0] === 'recibo') { viewRecibo(decodeURIComponent(p[1] || '')); return true; }
  return _rotaExtraCt(p);
};

/* ---------- despesas de exemplo (só no demo) ---------- */
function ctSemeia() {
  if (DB.despesas || !DB.demo) return;
  const hoje = isoToday();
  DB.despesas = CTP().semente.map(([dias, cat, desc, valor, iva, nota], i) =>
    ({ id: 'dp' + i, data: addDays(hoje, -dias), cat, desc, valor, iva, comprovante: nota !== false, exemplo: true }));
  ctGrava();
}

/* ---------- período: mês, trimestre ou ano FISCAL do país ---------- */
function ctPeriodo(S) {
  const hoje = isoToday(), [mI, dI] = CTP().anoIni;
  /* ano fiscal que contém hoje: no Reino Unido, 6/4/2026 a 5/4/2027 é "2026/27" */
  const y0 = +hoje.slice(0, 4), comecou = hoje.slice(5) >= `${String(mI).padStart(2, '0')}-${String(dI).padStart(2, '0')}`;
  const anoBase = comecou ? y0 : y0 - 1;
  const fiscal = mI !== 1 || dI !== 1;
  const nomeAno = (y) => fiscal ? `Ano fiscal ${y}/${String(y + 1).slice(2)}` : 'Ano ' + y;
  if (S.tipo === 'ano') {
    const y = anoBase + S.desloc;
    return { de: ctIso(new Date(y, mI - 1, dI)), ate: ctIso(new Date(y + 1, mI - 1, dI - 1)), nome: nomeAno(y), ano: y };
  }
  if (S.tipo === 'tri') {
    /* trimestres contados do início do ano fiscal (UK: 6/4–5/7, 6/7–5/10, 6/10–5/1, 6/1–5/4) */
    const ini = new Date(anoBase, mI - 1, dI), hojeD = new Date(hoje + 'T12:00:00');
    let q = 0; while (q < 3 && new Date(anoBase, mI - 1 + (q + 1) * 3, dI) <= hojeD) q++;
    q += S.desloc;
    const de = new Date(ini.getFullYear(), ini.getMonth() + q * 3, dI), ate = new Date(ini.getFullYear(), ini.getMonth() + (q + 1) * 3, dI - 1);
    const yq = anoBase + Math.floor(q / 4), nq = ((q % 4) + 4) % 4 + 1;
    return { de: ctIso(de), ate: ctIso(ate), nome: `${nq}º trimestre · ${fiscal ? yq + '/' + String(yq + 1).slice(2) : yq}`, ano: yq };
  }
  const dt = new Date(y0, +hoje.slice(5, 7) - 1 + S.desloc, 15), y = dt.getFullYear(), m = dt.getMonth();
  return { de: ctIso(new Date(y, m, 1)), ate: ctIso(new Date(y, m + 1, 0)), nome: (s => s[0].toUpperCase() + s.slice(1))(dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })), ano: y, mes: m };
}
const noPer = (iso, P) => !!iso && iso.slice(0, 10) >= P.de && iso.slice(0, 10) <= P.ate;
/* o ano fiscal corrente (para os limites da lei) */
const ctAnoFiscal = () => ctPeriodo({ tipo: 'ano', desloc: 0 });

/* ---------- entradas: pagamentos das reservas + invoices de agência pagas ---------- */
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

/* imposto sobre vendas das despesas: o valor lançado é BRUTO, como está na nota */
const ivaDe = (bruto, pct) => ctNum(+bruto - (+bruto / (1 + (+pct || 0) / 100)));
/* da receita: no regime normal o preço do passeio já tem o imposto dentro */
const ivaReceita = (bruto) => ctIsento() ? 0 : ivaDe(bruto, CTP().ivaTaxa);

const NOME_MET = { pix: 'Pix (Brasil)', wise: 'Wise', card: 'Cartão', cash: 'Dinheiro', transfer: 'Transferência', applepay: 'Apple Pay', other: 'Outro' };
const nomeMet = (m) => NOME_MET[m] || m || '—';

/* =====================================================
   TELA
   ===================================================== */
const ctAbas = () => [['resumo', 'Resumo'], ['extrato', 'Extrato'], ['despesas', 'Despesas'], ['iva', CTP().t.imposto], ['contador', 'Para o contador'], ['ajustes', 'Ajustes']];
function admContab(arg) {
  ctSemeia();
  const S = admContab._s = admContab._s || { tipo: 'mes', desloc: 0, aba: 'resumo' };
  if (arg && ctAbas().some(([k]) => k === arg)) S.aba = arg;
  const P = ctPeriodo(S), C = CTP();
  const corpo = { resumo: ctResumo, extrato: ctExtrato, despesas: ctTelaDespesas, iva: ctIva, contador: ctContador, ajustes: ctAjustes }[S.aba](P, S);
  admShell('contab', `
    <div class="pagehead"><h1 class="pageh">Contabilidade <small class="ctPais">${esc(C.nome)}</small></h1>
      <button class="cta sm" id="ctNova">+ Lançar despesa</button></div>
    <nav class="ctAbas" aria-label="Partes da contabilidade">${ctAbas().map(([k, n]) => `<button class="${S.aba === k ? 'on' : ''}" data-aba="${k}" aria-pressed="${S.aba === k}">${n}</button>`).join('')}</nav>
    ${S.aba === 'ajustes' ? '' : `<div class="ctBarra">
      <div class="chips">${[['mes', 'Mês'], ['tri', 'Trimestre'], ['ano', 'Ano']].map(([k, n]) => `<button class="chip ${S.tipo === k ? 'on' : ''}" data-tipo="${k}">${n}</button>`).join('')}</div>
      <div class="ctPer"><button class="mini" data-mv="-1" aria-label="Período anterior">←</button><b>${esc(P.nome)}</b><button class="mini" data-mv="1" aria-label="Próximo período">→</button></div>
    </div>`}
    ${corpo}
    <p class="ctAviso">Os números orientam o dia a dia. Quem fecha o imposto é o seu ${esc(C.contador)}.</p>`);
  $$('[data-tipo]').forEach(b => b.onclick = () => { S.tipo = b.dataset.tipo; S.desloc = 0; admContab(); });
  $$('[data-mv]').forEach(b => b.onclick = () => { S.desloc += +b.dataset.mv; admContab(); });
  $$('[data-aba]').forEach(b => b.onclick = () => { S.aba = b.dataset.aba; admContab(); });
  $('#ctNova').onclick = () => { S.aba = 'despesas'; admContab(); setTimeout(() => { const f = $('#dpValor'); if (f) f.focus(); }, 50); };
  ({ extrato: ctLigaExtrato, despesas: ctLigaDespesas, contador: ctLigaContador, ajustes: ctLigaAjustes }[S.aba] || (() => {}))(P, S);
}

/* ---------- barras simples (sem biblioteca) ---------- */
function ctBarras(linhas, fmt = ctMoeda) {
  const max = Math.max(1, ...linhas.map(l => l[1]));
  return `<div class="ctBars">${linhas.map(([rot, v, cls]) => `<div class="ctBar ${cls || ''}"><span class="ctBarRot">${esc(rot)}</span>
    <span class="ctBarTrilho"><i style="width:${Math.max(1, Math.round(v / max * 100))}%"></i></span><b>${fmt(v)}</b></div>`).join('')}</div>`;
}
/* medidor de limite: quanto já usou de um teto da lei */
function ctMedidor(tit, sub, usado, teto, aviso, fmt = ctMoeda) {
  const pct = Math.min(100, Math.round(usado / teto * 100));
  const nivel = pct >= 100 ? 'passou' : pct >= 80 ? 'perto' : 'ok';
  return `<div class="ctMed ${nivel}"><div class="ctMedTopo"><b>${tit}</b><span class="mono">${fmt(usado)} de ${fmt(teto)}</span></div>
    <div class="ctMedTrilho" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(tit)}"><i style="width:${pct}%"></i></div>
    <small>${sub}${nivel !== 'ok' ? ' <strong>' + aviso + '</strong>' : ''}</small></div>`;
}

function ctResumo(P) {
  const C = CTP(), R = ctReceitas(P), D = ctDespesas(P);
  const rec = somaV(R), desp = somaV(D), lucro = rec - desp, margem = rec ? Math.round(lucro / rec * 100) : 0;
  const hoje = isoToday();
  const aReceber = (DB.bookings || []).filter(b => b.status === 'confirmed' && b.date >= hoje).reduce((s, b) => s + Bookings.due(b), 0);
  const pct = +(ctSet().reservaImposto ?? C.reservaPadrao);
  const meses = [];
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1 - i, 15);
    const m = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'), Pm = { de: m + '-01', ate: m + '-31' };
    meses.push({ m, r: somaV(ctReceitas(Pm)), d: somaV(ctDespesas(Pm)) });
  }
  const mx = Math.max(1, ...meses.map(x => Math.max(x.r, x.d)));
  const porMet = {}; R.forEach(x => { const k = nomeMet(x.metodo); porMet[k] = (porMet[k] || 0) + x.valor; });
  /* limites do ANO FISCAL corrente (independe do período escolhido) */
  const AF = ctAnoFiscal(), Ra = ctReceitas(AF), recAno = somaV(Ra), naHoraAno = somaV(Ra.filter(x => x.naHora));
  return `
    <div class="kpis ctKpis">
      <div class="kpi"><small>Entrou (${C.t.entrou})</small><b>${ctMoeda(rec)}</b><i>${R.length} ${R.length === 1 ? 'pagamento' : 'pagamentos'}</i></div>
      <div class="kpi"><small>Saiu (${C.t.saiu})</small><b>${ctMoeda(desp)}</b><i>${D.length} despesas</i></div>
      <div class="kpi ${lucro < 0 ? 'warn' : ''}"><small>Resultado (${C.t.resultado})</small><b>${ctMoeda(lucro)}</b><i>margem de ${margem}%</i></div>
      <div class="kpi"><small>A receber</small><b>${ctMoeda(aReceber)}</b><i>saldos de reservas futuras</i></div>
      <div class="kpi"><small>${esc(C.reservaRot)}</small><b>${ctMoeda(Math.round(Math.max(0, lucro) * pct / 100))}</b><i>${pct}% do resultado · muda em Ajustes</i></div>
    </div>
    <section class="card"><h3>Limites da lei · ${esc(C.nome)} · ${esc(AF.nome)}</h3>
      ${C.medidores(recAno, naHoraAno, ctMoeda).join('')}
      <p class="why">${C.notaResumo}</p>
    </section>
    <section class="card"><h3>Entrou × saiu · últimos 12 meses</h3>
      <div class="ctMeses">${meses.map(x => `<div class="ctMes" title="${x.m}: entrou ${ctMoeda(x.r)}, saiu ${ctMoeda(x.d)}">
        <div class="ctMesBars"><i class="r" style="height:${Math.round(x.r / mx * 100)}%"></i><i class="d" style="height:${Math.round(x.d / mx * 100)}%"></i></div>
        <small>${new Date(x.m + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div>`).join('')}</div>
      <p class="ctLeg"><span class="r"></span> entrou <span class="d"></span> saiu</p></section>
    <div class="ctDuas">
      <section class="card"><h3>Como pagaram</h3>${Object.keys(porMet).length ? ctBarras(Object.entries(porMet).sort((a, b) => b[1] - a[1])) : '<p class="empty">Nada no período.</p>'}</section>
      <section class="card"><h3>Para onde foi o dinheiro</h3>${D.length ? ctBarras(Object.entries(D.reduce((o, x) => { const k = ctNomeCat(x.cat); o[k] = (o[k] || 0) + x.valor; return o; }, {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, 'd'])) : '<p class="empty">Nenhuma despesa no período.</p>'}</section>
    </div>`;
}

/* ---------- EXTRATO com recibo numerado ---------- */
function ctExtrato(P) {
  const C = CTP(), R = ctReceitas(P).slice().reverse();
  const europa = R.filter(x => x.metodo !== 'pix'), brasil = R.filter(x => x.metodo === 'pix');
  const linha = (x) => `<div class="ctRow ctRowRec"><span class="mono">${ctDt(x.data)}</span>
    <span><b>${esc(x.cliente)}</b><small>${esc(x.desc)} · ${x.tipo} · ${nomeMet(x.metodo)}${x.codigo ? ' · ' + esc(x.codigo) : ''}${x.b && x.b.exemplo ? ' · <em class="exTag">exemplo</em>' : ''}</small></span>
    <b class="mono">${ctMoeda(x.valor)}</b>
    ${x.agencia ? `<span class="ctBeleg">${esc(x.beleg || 'invoice')}</span>` : `<button class="mini ctRecibo" data-rec="${esc(x.ref)}">${x.beleg ? '🧾 ' + esc(x.beleg) : '🧾 Recibo'}</button>`}</div>`;
  const bloco = (tit, sub, L) => `<section class="card"><h3>${tit} <span class="mono ctTot">${ctMoeda(somaV(L))}</span></h3><p class="why">${sub}</p>
    ${L.length ? `<div class="ctTabela">${L.map(linha).join('')}</div>` : '<p class="empty">Nada no período.</p>'}</section>`;
  return `
    <div class="kpis ctKpis">
      <div class="kpi"><small>Recebido no período</small><b>${ctMoeda(somaV(R))}</b><i>${R.length} pagamentos</i></div>
      <div class="kpi"><small>Na conta de ${esc(C.nome)}</small><b>${ctMoeda(somaV(europa))}</b><i>cartão, Wise, transferência, dinheiro</i></div>
      <div class="kpi"><small>Pix (Brasil)</small><b>${ctMoeda(somaV(brasil))}</b><i>convertido em real</i></div>
    </div>
    ${bloco('Conta em ' + C.nome, 'Vai para o ' + C.contador + '.', europa)}
    ${bloco('Pix (Brasil)', C.pix, brasil)}
    <div class="ctBtns"><button class="mini" id="exImprime">🖨 Imprimir extrato</button><button class="mini" id="exCsv">⬇ Planilha do extrato (CSV)</button></div>`;
}
function ctLigaExtrato(P) {
  $$('[data-rec]').forEach(b => b.onclick = () => go('/recibo/' + encodeURIComponent(b.dataset.rec)));
  $('#exImprime').onclick = () => print();
  $('#exCsv').onclick = () => ctBaixa(`extrato-${P.de}-a-${P.ate}.csv`, ctCsvLinhas(ctReceitas(P), []));
}

/* número do recibo: sequência do ano, gravado no pagamento na 1ª emissão (nunca renumera) */
function ctNumeroRecibo(p) {
  if (p.beleg) return p.beleg;
  const ano = String(p.date || isoToday()).slice(0, 4);
  const seq = ctSet().belegSeq = ctSet().belegSeq || {};
  seq[ano] = (+seq[ano] || 0) + 1;
  p.beleg = `${ctCfg().prefixo || 'R'}-${ano}-${String(seq[ano]).padStart(4, '0')}`;
  ctGrava();
  return p.beleg;
}

function viewRecibo(ref) {
  const [bid, i] = String(ref).split('~');
  const b = (DB.bookings || []).find(x => x.id === bid), p = b && b.payments[+i];
  if (!b || !p) { app.innerHTML = `${topoCarol('/adm/contab')}<main class="wrap narrow"><p class="empty">Recibo não encontrado.</p></main>`; ligaVoltar('/adm/contab'); return; }
  const C = CTP(), Rt = C.recibo, st = ctSet(), x = Tours.get(b.tourId) || { name: { pt: b.tourId } };
  const nr = ctNumeroRecibo(p);
  const bruto = +p.amount, iva = ctIsento() ? 0 : ivaDe(bruto, C.ivaTaxa), liq = bruto - iva;
  const tipo = p.kind === 'deposit' ? Rt.sinal : p.kind === 'balance' ? Rt.saldo : Rt.pagamento;
  const nome = (APP_CONFIG.guia && APP_CONFIG.guia.nomeCompleto) || guiaNome();
  app.innerHTML = `${topoCarol('/adm/contab')}
  <main class="wrap ctReciboWrap">
    <article class="ctRecibo" id="ctReciboFolha">
      <header class="ctRecTopo"><img src="arte/logo-claro.png" alt="${esc(guiaNegocio())}">
        <div><b>${Rt.titulo}</b><span class="mono">No. ${esc(nr)}</span><span>${Rt.data}: ${ctDt(p.date)}</span></div></header>
      <div class="ctRecPartes">
        <div><small>${Rt.prestador}</small><b>${esc(nome)}</b><span>${esc(guiaNegocio())}</span>
          ${st.ctEndereco ? `<span>${esc(st.ctEndereco).replace(/\n/g, '<br>')}</span>` : '<span class="ctFalta">Endereço: preencher em Contabilidade → Ajustes</span>'}
          ${st.ctUid && !ctIsento() ? `<span>${C.numFiscal[0]}: ${esc(st.ctUid)}</span>` : ''}${st.ctStNr ? `<span>${C.numFiscal2[0].split(' (')[0]}: ${esc(st.ctStNr)}</span>` : ''}</div>
        <div><small>${Rt.cliente}</small><b>${esc(b.name)}</b>${b.email ? `<span>${esc(b.email)}</span>` : ''}<span>Reserva ${esc(b.code)}</span></div>
      </div>
      <table class="ctRecTab"><thead><tr><th>${Rt.servico}</th><th>${Rt.data}</th><th class="right">${Rt.total.split(' ')[0]}</th></tr></thead>
        <tbody><tr><td>${esc(tl(x.name))} — ${Rt.servicoTxt(+b.pax || 1)}<br><small>${tipo}</small></td><td class="mono">${ctDt(b.date)}</td><td class="mono right">${ctMoeda(bruto)}</td></tr></tbody>
        <tfoot>${ctIsento() ? `<tr><td colspan="2"><b>${Rt.total}</b></td><td class="mono right"><b>${ctMoeda(bruto)}</b></td></tr>`
          : `<tr><td colspan="2">${Rt.liquido}</td><td class="mono right">${ctMoeda(liq)}</td></tr><tr><td colspan="2">${Rt.ivaRot} ${C.ivaTaxa}%</td><td class="mono right">${ctMoeda(iva)}</td></tr><tr><td colspan="2"><b>${Rt.total}</b></td><td class="mono right"><b>${ctMoeda(bruto)}</b></td></tr>`}</tfoot></table>
      <p class="ctRecNota">${ctIsento() ? C.isento.fraseRecibo + ' ' : ''}${Rt.pago} ${ctDt(p.date)} · ${esc(nomeMet(p.method))}.</p>
      <p class="ctRecObrigado">${Rt.obrigado} — ${esc(guiaNome())}</p>
    </article>
    <div class="ctBtns noPrint"><button class="cta sm" id="rcImp">🖨 Imprimir / salvar PDF</button>
      ${b.whats ? `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink(`Olá, ${String(b.name).split(' ')[0]}! Segue o recibo ${nr} do seu passeio ${tl(x.name)} (${ctMoeda(bruto)}). Obrigada! — ${guiaNome()}`, b.whats))}">Mandar pelo WhatsApp</a>` : ''}
      <button class="mini" id="rcVolta">← Voltar ao extrato</button></div>
  </main>`;
  ligaVoltar('/adm/contab');
  $('#rcImp').onclick = () => print();
  $('#rcVolta').onclick = () => { admContab._s = Object.assign(admContab._s || {}, { aba: 'extrato' }); go('/adm/contab'); };
}

/* ---------- DESPESAS ---------- */
function ctTelaDespesas(P) {
  const C = CTP(), D = ctDespesas(P).slice().reverse();
  const semNota = D.filter(d => d.comprovante === false).length;
  return `
    <section class="card ctForm" id="ctForm"><h3>Lançar despesa</h3>
      <div class="ctFormGrade">
        <label class="fld">Valor da nota (${typeof MOEDA_SIMB !== 'undefined' ? MOEDA_SIMB : '€'})<input id="dpValor" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0,00"></label>
        <label class="fld">Data<input id="dpData" type="date" value="${isoToday()}"></label>
        <label class="fld">Categoria<select id="dpCat">${C.cats.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label class="fld">${C.t.imposto} da nota<select id="dpIva">${C.ivaOpcoes.map(v => `<option value="${v}">${v}%</option>`).join('')}</select></label>
        <label class="fld ctDesc">Descrição<input id="dpDesc" placeholder="Ex.: ${C === CT_PAISES.UK ? 'Oyster do mês, ingressos Tower of London' : 'passe Wiener Linien, ingressos Schönbrunn'}"></label>
        <label class="optin ctNota"><input type="checkbox" id="dpNota" checked><span><b>Tenho o comprovante</b><small>${C.guardarTxt}</small></span></label>
      </div>
      <button class="cta sm" id="dpSalva">Salvar despesa</button>
    </section>
    <section class="card"><h3>Despesas · ${esc(P.nome)} <span class="mono ctTot">${ctMoeda(somaV(D))}</span></h3>
      ${semNota ? `<p class="ctAlerta">⚠ ${semNota} ${semNota === 1 ? 'despesa sem comprovante' : 'despesas sem comprovante'}: sem nota, o contador não pode lançar.</p>` : ''}
      ${D.length ? `<div class="ctTabela">${D.map(d => `<div class="ctRow"><span class="mono">${ctDt(d.data)}</span><span>${ctNomeCat(d.cat)}<small>${esc(d.desc || '')} · ${C.t.imposto} ${+d.iva || 0}% (${ctMoeda(ivaDe(d.valor, d.iva))})${d.comprovante === false ? ' · <em class="ctSemNota">sem comprovante</em>' : ''}${d.exemplo ? ' · <em class="exTag">exemplo</em>' : ''}</small></span><b class="mono">${ctMoeda(d.valor)}</b><button class="mini" data-apaga="${esc(d.id)}" aria-label="Apagar despesa">✕</button></div>`).join('')}</div>` : '<p class="empty">Nenhuma despesa no período.</p>'}
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

/* ---------- IMPOSTO SOBRE VENDAS (VAT / USt) ---------- */
function ctIva(P) {
  const C = CTP();
  if (ctIsento()) {
    const AF = ctAnoFiscal(), recAno = somaV(ctReceitas(AF));
    return `<section class="card"><h3>Você está como: ${esc(C.isento.nome)}</h3>
      <ul class="ctLista">
        <li>${C.isento.desc(ctMoeda(C.isento.limite))}</li>
        <li>Também não recupera o ${C.t.imposto} das despesas.</li>
        ${C.isento.fraseRecibo ? `<li>No recibo sai a frase obrigatória: <i>“${C.isento.fraseRecibo}”</i>.</li>` : '<li>O recibo sai sem imposto e sem número de registro.</li>'}
      </ul>
      ${ctMedidor('Faturamento · ' + AF.nome, 'Bruto, todos os pagamentos do período.', recAno, C.isento.limite, `Perto do limite: combine com o ${C.contadorCurto} a passagem.`)}
      <p class="why">Mudou de regime? Contabilidade → Ajustes.</p></section>`;
  }
  /* regime normal: um bloco por trimestre (ou mês, se o contador usar) */
  const passo = ctSet().uvaPeriodo === 'mes' ? 1 : 3;
  const d0 = new Date(P.de + 'T12:00:00'), dFim = new Date(P.ate + 'T12:00:00');
  const blocos = [];
  for (let ini = new Date(d0); ini <= dFim; ini = new Date(ini.getFullYear(), ini.getMonth() + passo, ini.getDate())) {
    const fim = new Date(ini.getFullYear(), ini.getMonth() + passo, ini.getDate() - 1);
    const Pq = { de: ctIso(ini), ate: ctIso(fim) };
    const R = ctReceitas(Pq), D = ctDespesas(Pq).filter(d => d.comprovante !== false);
    const deb = R.reduce((s, x) => s + ivaReceita(x.valor), 0), cred = D.reduce((s, d) => s + ivaDe(d.valor, d.iva), 0);
    blocos.push({ nome: `${ctDt(Pq.de)} a ${ctDt(Pq.ate)}`, deb, cred, zl: deb - cred, prazo: ctIso(C.prazoIva(fim)), bruto: somaV(R) });
  }
  return `<section class="card"><h3>${C.t.imposto} a pagar (${C.declIva}) · ${passo === 1 ? 'mensal' : 'trimestral'}</h3>
    <p class="why">Passeio guiado: ${C.ivaTaxa}% de ${C.t.imposto}, que já está dentro do preço. Você paga ao ${C.fisco} o imposto dos passeios menos o das despesas com comprovante. ${C.prazoIvaTxt}</p>
    <div class="ctTabela">${blocos.map(q => `<div class="ctRow ctRowIva"><span><b>${esc(q.nome)}</b><small>faturou ${ctMoeda(q.bruto)} · prazo ${ctDt(q.prazo)}</small></span>
      <span class="mono">vendas ${ctMoeda(q.deb)}<br>− despesas ${ctMoeda(q.cred)}</span><b class="mono ${q.zl < 0 ? 'pos' : ''}">${q.zl < 0 ? 'crédito ' + ctMoeda(-q.zl) : ctMoeda(q.zl)}</b></div>`).join('')}</div>
    <p class="why">Agência de outro país (B2B): o tratamento do imposto pode ser outro (reverse charge) — o ${C.contadorCurto} confirma.</p></section>`;
}

/* ---------- PARA O CONTADOR ---------- */
function ctContador(P) {
  const C = CTP(), R = ctReceitas(P), D = ctDespesas(P);
  const porCat = {}; D.forEach(d => { porCat[d.cat] = (porCat[d.cat] || 0) + d.valor; });
  const caixa = R.filter(x => x.metodo === 'cash');
  return `
    <section class="card"><h3>${esc(C.livro)} · ${esc(P.nome)}</h3>
      <p class="why">${C.livroTxt}</p>
      <div class="ctLinha"><span><b>Receitas (${C.t.entrou})</b></span><span>${R.length} lançamentos</span><b class="mono">${ctMoeda(somaV(R))}</b></div>
      ${Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="ctLinha sub"><span>${ctNomeCat(k)}</span><span></span><b class="mono neg">− ${ctMoeda(v)}</b></div>`).join('')}
      <div class="ctLinha"><span><b>Despesas (${C.t.saiu})</b></span><span>${D.length} lançamentos</span><b class="mono neg">− ${ctMoeda(somaV(D))}</b></div>
      <div class="ctLinha total"><span><b>Resultado (${C.t.resultado})</b></span><span></span><b class="mono">${ctMoeda(somaV(R) - somaV(D))}</b></div>
      <p class="why">${C.notaLivro}</p>
      <div class="ctBtns"><button class="cta sm" id="ctCsv">⬇ Planilha completa (CSV)</button>
        <button class="mini" id="ctKassa">⬇ Livro-caixa do dinheiro (${C.csv.caixa})</button>
        <a class="mini" id="ctMail" href="#">✉ Mandar para o contador</a></div>
      <label class="fld ctEmailCont">E-mail do contador<input id="ctEmailCont" type="email" value="${esc(ctSet().emailContador || '')}" placeholder="${C.emailPh}"></label>
    </section>
    <section class="card"><h3>Calendário · ${esc(ctAnoFiscal().nome)}</h3>
      <ul class="ctLista ctDatas">${C.calendario(ctAnoFiscal().ano + (C.anoIni[0] === 1 ? 0 : 1)).map(l => `<li>${l}</li>`).join('')}
        ${ctIsento() ? '' : `<li><b>${C.declIva}</b> — ${C.prazoIvaTxt.replace(/^Prazo: /, '')}</li>`}</ul>
      <p class="why">${caixa.length ? `${caixa.length} ${caixa.length === 1 ? 'pagamento' : 'pagamentos'} em dinheiro no período (${ctMoeda(somaV(caixa))}). ` : 'Nenhum pagamento em dinheiro no período. '}${C.caixaTxt}</p>
    </section>`;
}
function ctCsvLinhas(R, D) {
  const C = CTP(), F = C.csv, q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const linhas = [F.cab.join(F.sep)];
  R.forEach(r => {
    const iva = ivaReceita(r.valor);
    linhas.push([F.data(r.data), r.beleg || r.codigo, F.entrada, `${r.desc} (${r.tipo})`, r.cliente, F.servico, nomeMet(r.metodo), ctNumCsv(r.valor - iva), ctIsento() ? '0' : C.ivaTaxa, ctNumCsv(iva), ctNumCsv(r.valor)].map(q).join(F.sep));
  });
  D.forEach(d => {
    const iva = ivaDe(d.valor, d.iva);
    linhas.push([F.data(d.data), d.comprovante === false ? F.semNota : '', F.saida, d.desc, '', ctNomeCat(d.cat).replace(/^\S+\s/, ''), '', ctNumCsv(d.valor - iva), +d.iva || 0, ctNumCsv(iva), ctNumCsv(d.valor)].map(q).join(F.sep));
  });
  return linhas.join('\n');
}
function ctBaixa(nome, csv) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const ctSlug = () => String(guiaNegocio()).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'contabilidade';
function ctLigaContador(P) {
  const C = CTP(), F = C.csv, R = ctReceitas(P), D = ctDespesas(P);
  $('#ctCsv').onclick = () => ctBaixa(`${ctSlug()}-${P.de}-a-${P.ate}.csv`, ctCsvLinhas(R, D));
  $('#ctKassa').onclick = () => {
    let saldo = 0;
    const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const L = [F.caixaCab.join(F.sep)];
    R.filter(r => r.metodo === 'cash').forEach(r => { saldo += r.valor; L.push([F.data(r.data), r.beleg || r.codigo, `${r.desc} — ${r.cliente}`, ctNumCsv(r.valor), '', ctNumCsv(saldo)].map(q).join(F.sep)); });
    ctBaixa(`livro-caixa-${P.de}-a-${P.ate}.csv`, L.join('\n'));
  };
  const em = $('#ctEmailCont');
  em.onchange = () => { ctSet().emailContador = em.value.trim(); ctGrava(); };
  $('#ctMail').onclick = (e) => {
    e.preventDefault();
    const corpo = `Olá!\n\nSegue o resumo de ${guiaNegocio()} — ${P.nome}:\nReceitas (${C.t.entrou}): ${ctMoeda(somaV(R))} (${R.length})\nDespesas (${C.t.saiu}): ${ctMoeda(somaV(D))} (${D.length})\nResultado (${C.t.resultado}): ${ctMoeda(somaV(R) - somaV(D))}\nRegime: ${ctIsento() ? C.isento.nome : C.normal.nome + ' (' + C.t.imposto + ' ' + C.ivaTaxa + '%)'}\n\nA planilha (CSV) vai anexa.\n\n${(APP_CONFIG.guia && APP_CONFIG.guia.nomeCompleto) || guiaNome()}`;
    location.href = `mailto:${encodeURIComponent(em.value.trim())}?subject=${encodeURIComponent(guiaNegocio() + ' — ' + P.nome)}&body=${encodeURIComponent(corpo)}`;
  };
}

/* ---------- AJUSTES da contabilidade ---------- */
function ctAjustes() {
  const C = CTP(), st = ctSet();
  return `<section class="card"><h3>Regime de ${C.t.imposto}</h3>
      <div class="ctOpcoes">
        <label class="optin"><input type="radio" name="ctReg" value="isento" ${ctIsento() ? 'checked' : ''}><span><b>${esc(C.isento.nome)}</b><small>${C.isento.desc(ctMoeda(C.isento.limite))}</small></span></label>
        <label class="optin"><input type="radio" name="ctReg" value="normal" ${ctIsento() ? '' : 'checked'}><span><b>${esc(C.normal.nome)}</b><small>${C.normal.desc(C.ivaTaxa)}</small></span></label>
      </div>
      <label class="fld">${C.declIva} (se registrada)<select id="ctUvaPer"><option value="tri" ${st.uvaPeriodo !== 'mes' ? 'selected' : ''}>Por trimestre</option><option value="mes" ${st.uvaPeriodo === 'mes' ? 'selected' : ''}>Por mês</option></select></label>
    </section>
    <section class="card"><h3>Dados que saem no recibo</h3>
      <label class="fld">Endereço comercial<textarea id="ctEnd" rows="2" placeholder="${C.endPh}">${esc(st.ctEndereco || '')}</textarea></label>
      <div class="frow"><label class="fld">${C.numFiscal[0]} <small class="why">só se registrada</small><input id="ctUid" value="${esc(st.ctUid || '')}" placeholder="${C.numFiscal[1]}"></label>
        <label class="fld">${C.numFiscal2[0]}<input id="ctStNr" value="${esc(st.ctStNr || '')}" placeholder="${C.numFiscal2[1]}"></label></div>
    </section>
    <section class="card"><h3>Quanto guardar</h3>
      <label class="fld">% do resultado — ${esc(C.reservaRot.toLowerCase())}<input id="ctPct" type="number" min="0" max="60" value="${esc(String(st.reservaImposto ?? C.reservaPadrao))}"></label>
      <p class="why">É só uma reserva para não ser pega de surpresa. O valor certo quem calcula é o ${esc(C.contador)}.</p>
    </section>
    <button class="cta" id="ctSalvaAj">Salvar</button>`;
}
function ctLigaAjustes() {
  $('#ctSalvaAj').onclick = () => {
    const st = ctSet();
    st.regimeIva = ($('[name=ctReg]:checked') || {}).value || 'isento';
    st.uvaPeriodo = $('#ctUvaPer').value;
    st.ctEndereco = $('#ctEnd').value.trim();
    st.ctUid = $('#ctUid').value.trim().toUpperCase();
    st.ctStNr = $('#ctStNr').value.trim();
    st.reservaImposto = Math.max(0, Math.min(60, +$('#ctPct').value || 0));
    ctGrava(); toast('Ajustes da contabilidade salvos ✓'); admContab('resumo');
  };
}

if (typeof module !== 'undefined') module.exports = { ctPeriodo, CT_PAISES, ivaDe };
