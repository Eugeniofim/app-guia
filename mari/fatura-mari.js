/* =====================================================
   FATURA / INVOICE NO MODELO DA MARI (06/10/2026)

   O modelo é a fatura que ela fez para a Sub4 (#109): folha branca com
   borda fina, o selo grande à esquerda, "FATURA" em vermelho e o número
   grande em verde à direita, as caixas creme "DE" e "PARA", a tabela com
   cabeçalho verde-escuro e linhas creme alternadas, a faixa dourada do
   TOTAL, a nota da conversão do euro, a caixa do pagamento com a borda
   dourada e os "Termos & Condições". Cabe numa folha A4 (até ~13 linhas).

   - DB.faturas (privado, nuvem-itens.js). Número sequencial; o primeiro é
     DB.privado.faturaInicio (ou 101). Vencimento = emissão + prazo
     (o prazo da agência, ou 7 dias).
   - Os valores são escritos em EURO. Na fatura em real, cada valor
     unitário sai convertido (2 casas) pela cotação que ela confirma
     (o app sugere a do dia): 100 EUR × 5,89 = R$ 589,00.
   - Os dados dela (quadro "DE": nome, CPF, endereço…) ficam em
     DB.privado.emissor — NUNCA nos Ajustes, que são públicos.
   - Nasce do orçamento ("Gerar fatura" no editor do orçamento), de uma
     reserva (Fatura.daReserva) ou em branco.
   - ESTE arquivo tem o ÚNICO envoltório de admOrcEditar dos módulos
     agências / fatura / contrato: ele chama o original e depois injeta a
     tabela da agência (agencias-mari.js), o "Gerar fatura" (daqui) e o
     "Gerar contrato" (contrato-mari.js).
   ===================================================== */
'use strict';

const FAT_ST = { emitida: ['n', 'emitida'], enviada: ['warn', 'enviada'], paga: ['ok', 'paga'] };
const FAT_FORMAS = ['PIX', 'Wise', 'Transferência'];
const FAT_TERMOS = 'Pagamento até a data de vencimento. Após a confirmação do pagamento, será emitido o recibo correspondente. Em caso de dúvidas, entre em contato pelo e-mail {email}.';
const fatHoje = () => (typeof agHoje === 'function' ? agHoje() : isoToday());
const fatIsoOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const fatDataBr = (iso) => fatIsoOk(iso) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
const fatDias = (a, b) => (fatIsoOk(a) && fatIsoOk(b)) ? Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000) : null;
const fatNum = (v, padrao = 0) => { if (v === null || v === undefined || v === '') return padrao; const n = +String(v).replace(/\s/g, '').replace(',', '.'); return isFinite(n) ? n : padrao; };
const fatNorm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const fatDin = (v, moeda) => (moeda === 'BRL' ? 'R$ ' : '€ ') + (+v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fatTaxaFmt = (t) => (+t || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const fatQtdFmt = (q) => (+q || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const fatId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fatTaxaDoDia = () => { const t = typeof fxTaxa === 'function' ? fxTaxa() : null; return t > 0 ? Math.round(t * 100) / 100 : null; };
/* "CNPJ: …", "CPF: …", "CVR: …" — se ela escreveu só os números */
function fatDocRotulo(d) {
  const s = String(d || '').trim(); if (!s) return '';
  if (/[a-z]/i.test(s.replace(/\d/g, ''))) return s;               /* já tem "CNPJ", "VAT"… */
  const n = s.replace(/\D/g, '');
  if (n.length === 14) return 'CNPJ: ' + s;
  if (n.length === 11) return 'CPF: ' + s;
  if (n.length === 8) return 'CVR: ' + s;
  return s;
}
/* o tipo da chave Pix, como no modelo: "CHAVE PIX (CPF)" */
function fatTipoPix(k) {
  const s = String(k || '').trim(), n = s.replace(/\D/g, '');
  if (!s) return '';
  if (/@/.test(s)) return 'E-MAIL';
  if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(s)) return 'CPF';
  if (n.length === 14 && /^[\d./-]+$/.test(s)) return 'CNPJ';
  if (/^\+/.test(s) || (/^[\d\s()+-]+$/.test(s) && n.length >= 10 && n.length <= 13)) return 'TELEFONE';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)) return 'ALEATÓRIA';
  return '';
}
function fatItem(x) {
  x = x || {};
  const i = { id: x.id || fatId('fi'), descricao: String(x.descricao != null ? x.descricao : (x.titulo || '')).trim(),
    qtd: fatNum(x.qtd, 1), unitEur: fatNum(x.unitEur != null ? x.unitEur : x.valor, 0) };
  return i;
}
/* quem é o "PARA": agência (com documento, endereço e prazo dela) ou cliente (pela ficha cadastral) */
function fatParaDe(nome, chave) {
  nome = String(nome || '').trim(); chave = String(chave || '');
  const A = typeof Agencias !== 'undefined' ? Agencias : null;
  const ag = A ? ((chave.startsWith('agencia:') && A.get(chave.slice(8))) || A.acha(nome)) : null;
  if (ag) return { tipo: 'agencia', chave: 'agencia:' + ag.id, nome: ag.nome || nome, documento: ag.documento || '', endereco: A.endereco(ag), email: ag.email || '', prazoDias: ag.prazoDias };
  let F = null;
  if (typeof fichaDe === 'function') {
    if (chave) F = fichaDe(chave.toLowerCase());
    if (!F && nome && typeof Clients !== 'undefined') {
      const c = Clients.all().find(c => fatNorm(c.name) === fatNorm(nome));
      if (c) F = fichaDe(c.chave || String(c.email || c.whats || c.name).toLowerCase());
    }
  }
  const cad = (F && F.cad) || {};
  return { tipo: 'cliente', chave: F ? F.key : chave, nome: cad.nomeCompleto || nome || (F ? F.nome : ''), documento: cad.documento || '',
    endereco: [cad.endereco, cad.cidade].filter(Boolean).join('\n'), email: (F && F.email) || '', prazoDias: null };
}

const Fatura = {
  all() { if (!Array.isArray(DB.faturas)) DB.faturas = []; return DB.faturas; },
  /* por id; aceita também o número (109 ou "#109") */
  get(id) {
    const l = this.all(); const f = l.find(x => x.id === id); if (f) return f;
    const n = String(id == null ? '' : id).replace(/^#/, '').trim();
    return /^\d+$/.test(n) ? (l.find(x => +x.num === +n) || null) : null;
  },
  emissor() { DB.privado = DB.privado || {}; return Object.assign({ nome: '', cpf: '', endereco1: '', endereco2: '', cidade: '', pais: '', email: '', telefone: '' }, DB.privado.emissor || {}); },
  gravaEmissor(c) { DB.privado = DB.privado || {}; const e = Object.assign(this.emissor(), c || {}); for (const k of Object.keys(e)) e[k] = String(e[k] || '').trim(); DB.privado.emissor = e; save(); return e; },
  inicio() { return Math.max(1, Math.round(+((DB.privado || {}).faturaInicio) || 101)); },
  proxNum() { const max = this.all().reduce((m, f) => Math.max(m, +f.num || 0), 0); return Math.max(this.inicio(), max + 1); },
  pagamentoPadrao(forma) {
    const st = DB.settings || {}, em = this.emissor();
    if (forma === 'Wise') return { forma: 'Wise', chave: st.wiseLink || '', favorecida: st.wiseNome || em.nome || '' };
    if (forma === 'Transferência') return { forma: 'Transferência', chave: st.iban || '', favorecida: st.ibanName || em.nome || '' };
    return { forma: 'PIX', chave: st.pixKey || '', favorecida: em.nome || st.pixName || '' };
  },
  nova(c) {
    c = Object.assign({}, c || {});
    const em = this.emissor(), st = DB.settings || {};
    const pc = c.para || {};
    const base = (pc.nome || pc.chave) ? fatParaDe(pc.nome, pc.chave) : { tipo: 'cliente', chave: '', nome: '', documento: '', endereco: '', email: '', prazoDias: null };
    const para = Object.assign({}, base);
    for (const k of ['tipo', 'chave', 'nome', 'documento', 'endereco', 'email']) if (pc[k] !== undefined && pc[k] !== null && String(pc[k]).trim() !== '') para[k] = String(pc[k]).trim();
    const prazo = c.prazoDias != null ? Math.max(0, Math.round(fatNum(c.prazoDias, 7))) : (base.prazoDias != null ? base.prazoDias : 7);
    delete para.prazoDias;
    const emissao = fatIsoOk(c.emissao) ? c.emissao : fatHoje();
    const moeda = c.moeda === 'EUR' ? 'EUR' : 'BRL';
    const forma = (c.pagamento && FAT_FORMAS.includes(c.pagamento.forma)) ? c.pagamento.forma : (moeda === 'EUR' && st.wiseLink ? 'Wise' : 'PIX');
    const f = {
      id: fatId('fat'), num: c.num != null && +c.num > 0 ? Math.round(+c.num) : this.proxNum(),
      emissao, vencimento: fatIsoOk(c.vencimento) ? c.vencimento : addDays(emissao, prazo),
      para, moeda,
      cotacao: Object.assign({ taxa: fatTaxaDoDia(), data: fatHoje() }, c.cotacao || {}),
      itens: (Array.isArray(c.itens) ? c.itens : []).map(fatItem),
      pagamento: Object.assign(this.pagamentoPadrao(forma), c.pagamento || {}, { forma }),
      termos: c.termos != null ? String(c.termos) : (em.email ? FAT_TERMOS.replace('{email}', em.email) : FAT_TERMOS),
      status: FAT_ST[c.status] ? c.status : 'emitida', orcamentoId: c.orcamentoId || '', bookingCode: c.bookingCode || '', bookingId: c.bookingId || '', criado: new Date().toISOString(),
    };
    f.cotacao.taxa = fatNum(f.cotacao.taxa, null);
    this.all().push(f); save();
    if (!(f.cotacao.taxa > 0)) fatBuscaCotacao(f.id);
    return f;
  },
  atualiza(id, c) {
    const f = this.get(id); if (!f) return null;
    c = Object.assign({}, c || {});
    delete c.id;
    if (c.para) c.para = Object.assign({}, f.para, c.para);
    if (c.cotacao) { c.cotacao = Object.assign({}, f.cotacao, c.cotacao); c.cotacao.taxa = fatNum(c.cotacao.taxa, null); }
    if (c.pagamento) { c.pagamento = Object.assign({}, f.pagamento, c.pagamento); if (!FAT_FORMAS.includes(c.pagamento.forma)) c.pagamento.forma = 'PIX'; }
    if (c.itens) c.itens = c.itens.map(fatItem);
    if (c.num !== undefined) c.num = Math.round(fatNum(c.num, f.num)) || f.num;
    if (c.moeda !== undefined) c.moeda = c.moeda === 'EUR' ? 'EUR' : 'BRL';
    if (c.status !== undefined && !FAT_ST[c.status]) delete c.status;
    if (c.status === 'paga' && f.status !== 'paga') c.pagaEm = c.pagaEm || fatHoje();
    if (c.status === 'enviada' && !f.enviadaEm) c.enviadaEm = fatHoje();
    if (c.status && c.status !== 'paga') c.pagaEm = '';
    Object.assign(f, c, { mudado: new Date().toISOString() });
    save(); return f;
  },
  remove(id) { const f = this.get(id); if (!f) return false; DB.faturas = this.all().filter(x => x !== f); save(); return true; },
  duplica(id) {
    const f = this.get(id); if (!f) return null;
    const prazo = fatDias(f.emissao, f.vencimento);
    const c = JSON.parse(JSON.stringify(f));
    ['id', 'num', 'criado', 'mudado', 'pagaEm', 'enviadaEm', 'orcamentoId', 'bookingCode', 'emissao', 'vencimento'].forEach(k => delete c[k]);
    c.status = 'emitida'; c.itens = c.itens.map(({ id, ...r }) => r);
    if (prazo != null && prazo >= 0) c.prazoDias = prazo;
    const t = fatTaxaDoDia(); if (t) c.cotacao = { taxa: t, data: fatHoje() };
    return this.nova(c);
  },
  /* do orçamento: os serviços com valor (sem os opcionais), qtd 1, valor unitário = o do orçamento */
  doOrcamento(orcId) {
    const o = typeof Orc !== 'undefined' ? Orc.get(orcId) : null; if (!o) return null;
    const desc = (i) => {
      const r = String(i.rotulo || '').trim(), rot = r ? r.charAt(0).toUpperCase() + r.slice(1).toLowerCase() : '';
      const d = fatIsoOk(i.data) ? ' · ' + i.data.slice(8, 10) + '/' + i.data.slice(5, 7) : '';
      return ([rot, i.titulo].filter(Boolean).join(' — ') || 'Serviço') + d;
    };
    const itens = o.itens.filter(i => !i.opcional && i.valor !== null && i.valor !== '' && !isNaN(+i.valor))
      .map(i => ({ descricao: desc(i), qtd: 1, unitEur: +i.valor }));
    const para = fatParaDe(o.cliente && o.cliente.nome, o.cliente && o.cliente.chave);
    return this.nova({ para, prazoDias: para.prazoDias != null ? para.prazoDias : 7, itens, orcamentoId: o.id });
  },
  /* da reserva: uma linha (passeio + data), qtd 1, valor = o total da reserva */
  daReserva(code) {
    const b = (DB.bookings || []).find(x => x.id === code) || (typeof Bookings !== 'undefined' && Bookings.byCode(code)); if (!b) return null;   /* id primeiro: o código pode repetir */
    const tour = typeof Tours !== 'undefined' ? Tours.get(b.tourId) : null;
    const nomeT = tour ? (typeof tl === 'function' ? tl(tour.name) : (tour.name && tour.name.pt) || '') : (b.tourName || 'Passeio');
    const chave = String(b.email || b.whats || b.name || '').toLowerCase();
    const para = fatParaDe(b.name, chave);
    /* cobra o que FALTA (revisão 06/10: cobrava o total mesmo com o sinal pago); o total e o já pago vão escritos na linha */
    const total = +b.total || 0, pago = typeof Bookings !== 'undefined' && Bookings.paid ? Math.min(total, +Bookings.paid(b) || 0) : 0, falta = Math.round((total - pago) * 100) / 100;
    const eu = (v) => '€ ' + (+v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const base = `${nomeT} · ${fatDataBr(b.date)}`;
    if (pago > 0 && falta > 0) return this.nova({ para, itens: [{ descricao: `${base} — saldo (total ${eu(total)}; sinal de ${eu(pago)} já pago)`, qtd: 1, unitEur: falta }], bookingCode: b.code, bookingId: b.id });
    if (pago > 0 && falta <= 0) return this.nova({ para, itens: [{ descricao: `${base} — pago`, qtd: 1, unitEur: total }], bookingCode: b.code, bookingId: b.id, status: 'paga' });
    return this.nova({ para, itens: [{ descricao: base, qtd: 1, unitEur: total }], bookingCode: b.code, bookingId: b.id });
  },
  /* as contas — SEMPRE daqui (o assistente repete, nunca soma).
     Em real: o valor unitário convertido com 2 casas, vezes a quantidade. */
  totais(f) {
    const brl = f.moeda === 'BRL', taxa = brl ? fatNum(f.cotacao && f.cotacao.taxa, 0) : 1;
    let eurC = 0, totC = 0; const linhas = [];
    for (const i of f.itens || []) {
      const q = fatNum(i.qtd, 0), u = fatNum(i.unitEur, 0);
      const unitC = Math.round(u * taxa * 100), linC = Math.round(unitC * q);
      eurC += Math.round(u * q * 100); totC += linC;
      linhas.push({ id: i.id, descricao: i.descricao, qtd: q, unitEur: u, unit: unitC / 100, total: linC / 100 });
    }
    return { totalEur: eurC / 100, totalMoeda: totC / 100, moeda: f.moeda, taxa: brl ? taxa : null, semCotacao: brl && !(taxa > 0), linhas };
  },
  vencida(f) { return f.status !== 'paga' && fatIsoOk(f.vencimento) && f.vencimento < fatHoje(); },
  abrir(id) { const f = this.get(id); if (f) go('/adm/fatdoc/' + encodeURIComponent(f.id)); return f; },
};
window.Fatura = Fatura;

/* a cotação do dia, quando ainda não tinha chegado (o app busca no arranque) */
function fatBuscaCotacao(id) {
  if (typeof fxAtualiza !== 'function') return;
  fxAtualiza().then(() => {
    const t = fatTaxaDoDia(), f = Fatura.get(id); if (!t || !f || f.cotacao.taxa > 0) return;
    Fatura.atualiza(id, { cotacao: { taxa: t, data: fatHoje() } });
    const el = document.getElementById('fatTaxa');
    if (el && document.getElementById('fatEd') && document.getElementById('fatEd').dataset.id === id && !el.value) { el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); }
  }).catch(() => {});
}

/* ---------- estilo: telas + o DOCUMENTO (a arte do modelo dela) ---------- */
function fatCss() {
  if (document.getElementById('fatCss')) return;
  const s = document.createElement('style'); s.id = 'fatCss';
  s.textContent = `
  .fatDoc{--fd-verde:#1B3329;--fd-verm:#B13536;--fd-creme:#F4ECDE;--fd-cborda:#E0D7C7;--fd-ouro:#C49D52;--fd-ouro2:#947238;--fd-cinza:#60605B;--fd-ink:#2B2B29;--fd-linha:#E3DBCE;
    --fd-serif:"Times New Roman",Tinos,"Liberation Serif",Times,serif;
    font-family:Arial,"Helvetica Neue",Helvetica,sans-serif;color:var(--fd-ink);background:#fff;width:100%;max-width:794px;margin:0 auto;padding:19px;box-sizing:border-box;
    box-shadow:0 20px 60px -30px rgba(0,0,0,.45);-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .fatDoc *{box-sizing:border-box}
  .fd-folha{border:2px solid #EDE8E0;padding:40px 50px 20px;min-height:1081px}
  .fd-topo{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:38px}
  .fd-selo{width:150px;height:150px;border-radius:50%;margin-top:12px;flex:none;object-fit:cover}
  .fd-num{text-align:right;margin-top:8px}
  .fd-num small{display:block;font-size:11.5px;font-weight:700;letter-spacing:.34em;margin-right:-.34em;color:var(--fd-verm)}
  .fd-num b{display:block;font-family:var(--fd-serif);font-weight:700;font-size:52px;line-height:1;color:var(--fd-verde);margin:5px 0 8px}
  .fd-num span{display:block;font-size:13px;line-height:1.32;color:var(--fd-cinza)}
  .fd-num i{display:inline-block;margin-top:8px;font-style:normal;font-size:10px;font-weight:700;letter-spacing:.24em;color:#2F6B47;border:1.5px solid #2F6B47;border-radius:4px;padding:3px 8px}
  .fd-partes{display:grid;grid-template-columns:1fr 1fr;gap:23px;margin-bottom:36px}
  .fd-caixa{background:var(--fd-creme);border:1px solid var(--fd-cborda);border-radius:6px;padding:24px 27px 20px;min-height:210px}
  .fd-caixa small{display:block;font-size:9.5px;font-weight:700;letter-spacing:.3em;color:#6C6B66;margin-bottom:12px}
  .fd-caixa b{display:block;font-family:var(--fd-serif);font-weight:700;font-size:17.5px;line-height:1.25;color:var(--fd-verde);margin-bottom:10px}
  .fd-caixa p{margin:0;font-size:12.5px;line-height:1.5;color:var(--fd-ink);overflow-wrap:anywhere}
  .fd-tab{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px;line-height:1.25}
  .fd-tab col.c1{width:40%}.fd-tab col.c2{width:12.7%}.fd-tab col.c3{width:22%}.fd-tab col.c4{width:25.3%}
  .fd-tab th{background:var(--fd-verde);color:#fff;font-size:11px;font-weight:700;letter-spacing:.14em;text-align:right;padding:14px 18px;border-left:1px solid rgba(255,255,255,.14)}
  .fd-tab th:first-child{text-align:left;border-left:0}.fd-tab th:nth-child(2){text-align:center}
  .fd-tab td{padding:14px 18px;text-align:right;color:var(--fd-ink);border-bottom:1px solid #ECE3D4;border-left:1px solid #F1EADF;overflow-wrap:anywhere}
  .fd-tab td:first-child{text-align:left;border-left:0}.fd-tab td:nth-child(2){text-align:center}
  .fd-tab tbody tr:nth-child(even) td{background:var(--fd-creme)}
  .fd-tab tr{break-inside:avoid}
  .fd-tot td{background:var(--fd-ouro);border:0;font-family:var(--fd-serif);font-weight:700;font-size:18.5px;color:var(--fd-verde);padding:18px 18px}
  .fd-tot td:last-child{border-left:1px solid rgba(255,255,255,.25);text-align:right}
  .fd-tot td:first-child{text-align:left}
  .fd-conv{text-align:right;font-size:10px;color:#4A4A47;margin:12px 0 0}
  .fd-pag{display:grid;grid-template-columns:1fr 1fr;gap:14px 23px;background:var(--fd-creme);border-left:3px solid var(--fd-ouro2);border-radius:6px;padding:17px 27px;margin-top:34px;break-inside:avoid}
  .fd-pag small{display:block;font-size:9.5px;font-weight:700;letter-spacing:.22em;color:#6C6B66;margin-bottom:4px}
  .fd-pag b{display:block;font-size:14px;color:var(--fd-verde);overflow-wrap:anywhere}
  .fd-termos{border-top:1px solid var(--fd-linha);margin-top:30px;padding-top:19px;break-inside:avoid}
  .fd-termos b{font-family:var(--fd-serif);font-weight:700;font-size:14px;color:var(--fd-verde)}
  .fd-termos p{font-size:11px;line-height:1.5;color:#3E3E3B;margin:8px 0 0}
  /* mais linhas, a folha aperta para caber num A4 */
  .fatDoc.d1 .fd-folha{padding:40px 46px 24px}.fatDoc.d1 .fd-topo{margin-bottom:32px}.fatDoc.d1 .fd-selo{width:130px;height:130px;margin-top:4px}
  .fatDoc.d1 .fd-partes{margin-bottom:30px}.fatDoc.d1 .fd-caixa{min-height:0;padding:22px 24px 20px}
  .fatDoc.d1 .fd-tab{font-size:12.5px}.fatDoc.d1 .fd-tab th{padding:12px 16px}.fatDoc.d1 .fd-tab td{padding:11.5px 16px}.fatDoc.d1 .fd-tot td{padding:16px}
  .fatDoc.d1 .fd-pag{margin-top:24px;padding:18px 24px}.fatDoc.d1 .fd-termos{margin-top:24px;padding-top:18px}
  .fatDoc.d2 .fd-folha{padding:34px 42px 20px}.fatDoc.d2 .fd-topo{margin-bottom:22px}.fatDoc.d2 .fd-selo{width:112px;height:112px;margin-top:0}.fatDoc.d2 .fd-num b{font-size:44px}
  .fatDoc.d2 .fd-partes{margin-bottom:22px;gap:20px}.fatDoc.d2 .fd-caixa{min-height:0;padding:16px 20px 14px}
  .fatDoc.d2 .fd-caixa small{margin-bottom:8px}.fatDoc.d2 .fd-caixa b{font-size:16px;margin-bottom:6px}.fatDoc.d2 .fd-caixa p{font-size:11.5px;line-height:1.48}
  .fatDoc.d2 .fd-tab{font-size:12px}.fatDoc.d2 .fd-tab th{padding:10px 14px}.fatDoc.d2 .fd-tab td{padding:9px 14px}
  .fatDoc.d2 .fd-tot td{padding:13px 14px;font-size:17px}.fatDoc.d2 .fd-conv{margin-top:8px}
  .fatDoc.d2 .fd-pag{margin-top:18px;padding:14px 20px;gap:12px 20px}.fatDoc.d2 .fd-termos{margin-top:18px;padding-top:14px}
  /* d3 e d4: muitas linhas — ainda o mesmo desenho, só mais justo */
  .fatDoc.d3 .fd-folha,.fatDoc.d4 .fd-folha{padding:28px 38px 16px}.fatDoc.d3 .fd-topo,.fatDoc.d4 .fd-topo{margin-bottom:16px}
  .fatDoc.d3 .fd-selo{width:96px;height:96px;margin-top:0}.fatDoc.d4 .fd-selo{width:80px;height:80px;margin-top:0}
  .fatDoc.d3 .fd-num b{font-size:40px}.fatDoc.d4 .fd-num b{font-size:36px;margin:3px 0 5px}.fatDoc.d4 .fd-num span{font-size:12px}
  .fatDoc.d3 .fd-partes,.fatDoc.d4 .fd-partes{margin-bottom:16px;gap:18px}.fatDoc.d3 .fd-caixa,.fatDoc.d4 .fd-caixa{min-height:0;padding:13px 18px 11px}
  .fatDoc.d3 .fd-caixa small,.fatDoc.d4 .fd-caixa small{margin-bottom:6px}.fatDoc.d3 .fd-caixa b,.fatDoc.d4 .fd-caixa b{font-size:15px;margin-bottom:4px}
  .fatDoc.d3 .fd-caixa p,.fatDoc.d4 .fd-caixa p{font-size:11px;line-height:1.42}
  .fatDoc.d3 .fd-tab{font-size:11.5px}.fatDoc.d3 .fd-tab th{padding:9px 12px}.fatDoc.d3 .fd-tab td{padding:7px 12px}
  .fatDoc.d4 .fd-tab{font-size:11px;line-height:1.2}.fatDoc.d4 .fd-tab th{padding:7px 10px;font-size:10px}.fatDoc.d4 .fd-tab td{padding:4.5px 10px}
  .fatDoc.d3 .fd-tot td,.fatDoc.d4 .fd-tot td{padding:10px 12px;font-size:16px}.fatDoc.d3 .fd-conv,.fatDoc.d4 .fd-conv{margin-top:6px}
  .fatDoc.d3 .fd-pag,.fatDoc.d4 .fd-pag{margin-top:12px;padding:10px 18px;gap:8px 20px}.fatDoc.d3 .fd-pag b,.fatDoc.d4 .fd-pag b{font-size:13px}
  .fatDoc.d3 .fd-termos,.fatDoc.d4 .fd-termos{margin-top:12px;padding-top:10px}.fatDoc.d3 .fd-termos p,.fatDoc.d4 .fd-termos p{font-size:10.5px;line-height:1.4;margin-top:5px}
  /* o medidor (fora da tela, sempre na largura do A4) */
  .fatMede .fd-folha{min-height:0!important}
  @media(max-width:620px){
    .fatTela .fatDoc{padding:8px}.fatTela .fatDoc .fd-folha{padding:22px 16px 18px;min-height:0}
    .fatTela .fatDoc .fd-topo{margin-bottom:22px}.fatTela .fatDoc .fd-selo{width:84px;height:84px;margin-top:0}.fatTela .fatDoc .fd-num b{font-size:34px}.fatTela .fatDoc .fd-num span{font-size:11.5px}
    .fatTela .fatDoc .fd-partes{grid-template-columns:1fr;gap:12px;margin-bottom:20px}.fatTela .fatDoc .fd-caixa{min-height:0;padding:16px 18px}
    .fatTela .fatDoc .fd-tab{font-size:10.5px}.fatTela .fatDoc .fd-tab th{font-size:8.5px;letter-spacing:.04em;padding:9px 5px}.fatTela .fatDoc .fd-tab td{padding:9px 5px}
    .fatTela .fatDoc .fd-tab col.c1{width:33%}.fatTela .fatDoc .fd-tab col.c2{width:10%}.fatTela .fatDoc .fd-tab col.c3{width:28%}.fatTela .fatDoc .fd-tab col.c4{width:29%}
    .fatTela .fatDoc .fd-tab td:nth-child(n+3),.fatTela .fatDoc .fd-tab th{white-space:nowrap;overflow-wrap:normal}
    .fatTela .fatDoc .fd-tot{table-layout:auto}.fatTela .fatDoc .fd-tot td{font-size:15px;padding:12px 8px}.fatTela .fatDoc .fd-tot td:last-child{white-space:nowrap}.fatTela .fatDoc .fd-pag{padding:14px 16px;gap:12px}.fatTela .fatDoc .fd-pag b{font-size:12.5px}}
  /* telas */
  .fatEd{display:grid;gap:4px}
  .fatEd .frow{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
  .fatEd .frow .fld{flex:1;min-width:150px}
  .fatEd textarea{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical}
  .fatIts{display:grid;gap:8px;margin-top:6px}
  .fatIt{display:grid;grid-template-columns:minmax(0,1fr) 78px 120px 130px auto;gap:8px;align-items:end;padding:8px 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}
  .fatIt .fld{margin-top:0}
  .fatIt .tot{font-weight:700;text-align:right;padding-bottom:10px;white-space:nowrap}
  .fatIt .tot small{display:block;font-weight:400;color:var(--ink-3);font-size:var(--fs-1,11px)}
  .fatIt .bts{display:flex;gap:4px;padding-bottom:4px}
  .fatTotal{display:flex;justify-content:flex-end;gap:16px;align-items:baseline;flex-wrap:wrap;padding:10px 4px 2px;font-size:var(--fs-4)}
  .fatTotal b{font-size:var(--fs-6,22px);font-family:var(--f-display)}
  .fatAviso{background:var(--highlight-wash,#FFF6D6);border-radius:10px;padding:8px 12px;font-size:var(--fs-3);margin-top:6px}
  .fatLista .linha{display:flex;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .fatLista .linha:last-child{border-bottom:0}
  .fatLista .linha .tx{flex:1;min-width:200px}.fatLista .linha small{display:block;color:var(--ink-3);margin-top:2px}
  .fatEmi summary{cursor:pointer;font-weight:700;font-size:var(--fs-5)}
  .fatEmi .frow{display:flex;gap:10px;flex-wrap:wrap}.fatEmi .frow .fld{flex:1;min-width:170px}
  .fatTela{padding:16px;background:var(--paper);min-height:100vh}
  .fatBarra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;max-width:794px;margin:0 auto 14px}
  .fatBarra > span{display:flex;gap:8px;flex-wrap:wrap}
  .fatDica{text-align:center;max-width:794px;margin:12px auto}
  @media(max-width:640px){.fatIt{grid-template-columns:1fr 1fr}.fatIt .fld:first-child{grid-column:1 / -1}.fatIt .tot{text-align:left;padding-bottom:0}}
  @media print{
    @page fatura{size:A4;margin:0}
    body:has(#fatPrint) > *:not(#app){display:none!important}
    body:has(#fatPrint) #fatPrint,body:has(#fatPrint) #fatPrint *{visibility:visible!important}
    body:has(#fatPrint) .fatBarra,body:has(#fatPrint) .fatDica{display:none!important}
    body:has(#fatPrint){background:#fff!important}
    body:has(#fatPrint) .fatTela{padding:0!important;min-height:0!important;background:#fff!important}
    #fatPrint{position:static!important}
    .fatDoc{page:fatura;box-shadow:none;max-width:none;width:100%;margin:0}
    .fatDoc .fd-folha{min-height:0}
    @supports (page: fatura){ .fatDoc{padding:5mm} .fatDoc .fd-folha{min-height:286mm} }
    /* fatura comprida: cada folha ganha a sua borda e a sua margem */
    .fatDoc,.fatDoc .fd-folha{-webkit-box-decoration-break:clone;box-decoration-break:clone}
    @supports not (page: fatura){ .fatDoc{padding:0} }
  }`;
  document.head.appendChild(s);
}

const FAT_DENS = ['d0', 'd1', 'd2', 'd3', 'd4'];
const fatDensPorQtd = (n) => n <= 3 ? 'd0' : n <= 6 ? 'd1' : n <= 9 ? 'd2' : n <= 13 ? 'd3' : 'd4';
/* A FOLHA CABE NUM A4: mede de verdade (fora da tela, na largura do A4, com as
   fontes de verdade e as descrições que quebram linha) e fica com o desenho
   mais folgado que cabe — o do modelo dela, quando der. Muitas linhas: o mais
   justo, e a tabela continua na folha seguinte (o cabeçalho se repete). */
function fatDensidade(f) {
  if (typeof document === 'undefined' || !document.body) return fatDensPorQtd((f.itens || []).length);
  fatCss();
  const m = document.createElement('div'); m.className = 'fatMede'; m.setAttribute('aria-hidden', 'true');
  m.style.cssText = 'position:absolute;left:-10000px;top:0;width:794px;visibility:hidden;pointer-events:none';
  document.body.appendChild(m);
  try {
    for (const d of FAT_DENS) {
      m.innerHTML = fatDocHtml(f, d);
      const fo = m.querySelector('.fd-folha');
      if (fo && fo.offsetHeight <= 1068) return d;     /* a folha tem 286 mm = 1081 px; um pouco de folga */
    }
    return 'd4';
  } catch (e) { return fatDensPorQtd((f.itens || []).length); } finally { m.remove(); }
}
function fatDocHtml(f, densidade) {
  const T = Fatura.totais(f), em = Fatura.emissor(), m = f.moeda;
  const dens = FAT_DENS.includes(densidade) ? densidade : fatDensPorQtd((f.itens || []).length);
  const linhasDe = [em.cpf ? 'CPF: ' + em.cpf : '', em.endereco1, em.endereco2, [em.cidade, em.pais].filter(Boolean).join(', '), em.email, em.telefone].filter(Boolean);
  const p = f.para || {};
  const linhasPara = [fatDocRotulo(p.documento), ...String(p.endereco || '').split('\n').map(x => x.trim()), p.email].filter(Boolean);
  const pg = f.pagamento || {};
  const rotChave = pg.forma === 'Wise' ? 'LINK WISE' : pg.forma === 'Transferência' ? 'CONTA (IBAN)' : 'CHAVE PIX' + (fatTipoPix(pg.chave) ? ` (${fatTipoPix(pg.chave)})` : '');
  const termos = String(f.termos || '').replace(/\{email\}/g, em.email || 'informado acima');
  const nomeDe = em.nome || (typeof guiaNome === 'function' ? guiaNome() : '');
  return `<div class="fatDoc ${dens}"><div class="fd-folha">
    <div class="fd-topo"><img class="fd-selo" src="arte/selo-mari-circ.png" alt="">
      <div class="fd-num"><small>FATURA</small><b>#${esc(f.num)}</b><span>Emissão: ${esc(fatDataBr(f.emissao))}</span><span>Vencimento: ${esc(fatDataBr(f.vencimento))}</span>${f.status === 'paga' ? `<i>PAGA${f.pagaEm ? ' EM ' + esc(fatDataBr(f.pagaEm)) : ''}</i>` : ''}</div></div>
    <div class="fd-partes">
      <div class="fd-caixa"><small>DE</small><b>${esc(nomeDe)}</b><p>${linhasDe.map(esc).join('<br>')}</p></div>
      <div class="fd-caixa"><small>PARA</small><b>${esc(p.nome || '')}</b><p>${linhasPara.map(esc).join('<br>')}</p></div>
    </div>
    <table class="fd-tab"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"></colgroup>
      <thead><tr><th>DESCRIÇÃO</th><th>QTD.</th><th>VALOR UNIT.</th><th>TOTAL</th></tr></thead>
      <tbody>${T.linhas.length ? T.linhas.map(l => `<tr><td>${esc(l.descricao)}</td><td>${fatQtdFmt(l.qtd)}</td><td>${fatDin(l.unit, m)}</td><td>${fatDin(l.total, m)}</td></tr>`).join('')
        : '<tr><td>—</td><td></td><td></td><td></td></tr>'}</tbody></table>
    <table class="fd-tab fd-tot"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"></colgroup>
      <tbody><tr><td colspan="3">TOTAL</td><td>${fatDin(T.totalMoeda, m)}</td></tr></tbody></table>
    ${m === 'BRL' && !T.semCotacao ? `<p class="fd-conv">Valores convertidos de ${fatDin(T.totalEur, 'EUR')} à cotação comercial de ${esc(fatDataBr(f.cotacao.data) || fatDataBr(f.emissao))} (€ 1 = R$ ${fatTaxaFmt(T.taxa)}).</p>` : ''}
    <div class="fd-pag">
      <div><small>FORMA DE PAGAMENTO</small><b>${esc(pg.forma || 'PIX')}</b></div>
      <div><small>${esc(rotChave)}</small><b>${esc(pg.chave || '—')}</b></div>
      <div><small>FAVORECIDA</small><b>${esc(pg.favorecida || nomeDe || '—')}</b></div>
      <div><small>VALOR A PAGAR</small><b>${fatDin(T.totalMoeda, m)}</b></div>
    </div>
    ${termos.trim() ? `<div class="fd-termos"><b>Termos &amp; Condições</b><p>${esc(termos).replace(/\n/g, '<br>')}</p></div>` : ''}
  </div></div>`;
}

/* ---------- a aba Faturas ---------- */
function fatStatusPill(f) {
  if (Fatura.vencida(f)) return '<span class="pill bad">vencida</span>';
  const [c, nm] = FAT_ST[f.status] || FAT_ST.emitida; return `<span class="pill ${c}">${nm}</span>`;
}
function admFaturas(arg) {
  fatCss();
  if (arg) return admFaturaEditar(arg);
  const l = Fatura.all().slice().sort((a, b) => (+b.num || 0) - (+a.num || 0));
  const em = Fatura.emissor(), st = DB.settings || {};
  const emVazio = !em.nome;
  /* sugestão para a primeira vez: o que já está nos Ajustes (ela confere) */
  const sug = emVazio ? Object.assign({}, em, { nome: st.wiseNome || '', email: st.admEmail || '', telefone: st.whats || '' }) : em;
  const abertas = l.filter(f => f.status !== 'paga');
  const aberto = { BRL: 0, EUR: 0 }; abertas.forEach(f => { aberto[f.moeda === 'EUR' ? 'EUR' : 'BRL'] += Fatura.totais(f).totalMoeda; });
  /* as reservas mais recentes primeiro (a que ela acabou de fechar é a que vai faturar) */
  const reservas = (DB.bookings || []).filter(b => b.status !== 'cancelled').slice().sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date))).slice(0, 120);
  const tourNome = (b) => { const x = typeof Tours !== 'undefined' ? Tours.get(b.tourId) : null; return x ? (typeof tl === 'function' ? tl(x.name) : '') : (b.tourName || 'Passeio'); };
  const cardEmissor = `<section class="card fatEmi"><details id="fatEmiD" ${emVazio ? 'open' : ''}><summary>Seus dados para a fatura</summary>
      <p class="why">Vão no quadro "DE" de toda fatura. Só você vê (não aparecem no site).</p>
      <div class="frow"><label class="fld">Seu nome completo<input id="feNome" value="${esc(sug.nome)}" placeholder="como no documento"></label><label class="fld">CPF<input id="feCpf" value="${esc(sug.cpf)}" placeholder="000.000.000-00"></label></div>
      <div class="frow"><label class="fld">Endereço (linha 1)<input id="feEnd1" value="${esc(sug.endereco1)}" placeholder="rua e número"></label><label class="fld">Endereço (linha 2)<input id="feEnd2" value="${esc(sug.endereco2)}" placeholder="Postal Code"></label></div>
      <div class="frow"><label class="fld">Cidade<input id="feCid" value="${esc(sug.cidade)}" placeholder="København"></label><label class="fld">País<input id="fePais" value="${esc(sug.pais)}" placeholder="Danmark"></label></div>
      <div class="frow"><label class="fld">E-mail<input id="feEmail" type="email" value="${esc(sug.email)}"></label><label class="fld">Telefone<input id="feTel" type="tel" value="${esc(sug.telefone)}" placeholder="+45 …"></label>
        <label class="fld">Número da próxima fatura<input id="feIni" type="number" min="1" step="1" value="${Fatura.proxNum()}"></label></div>
      <div class="frow" style="margin-top:10px"><button class="cta sm" id="feSalva">Salvar meus dados</button></div></details></section>`;
  admShell('faturas', `
    <div class="pagehead"><h1 class="pageh">Faturas</h1><div class="chips"><button class="cta sm" id="fatNova">+ Nova fatura</button></div></div>
    <p class="why">No modelo da sua fatura. Você escreve os valores em euro; ela sai em real (convertida pela cotação do dia, que você confere) ou em euro. Também nasce pronta do orçamento ("Gerar fatura") ou de uma reserva.</p>
    ${emVazio ? cardEmissor : ''}
    ${reservas.length ? `<section class="card"><div class="frow" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end"><label class="fld" style="flex:1;min-width:220px;margin-top:0">Fatura de uma reserva<select id="fatRes">${reservas.map(b => `<option value="${esc(b.id)}">${esc(b.code)} · ${esc(b.name)} · ${esc(tourNome(b))} · ${esc(fatDataBr(b.date))}</option>`).join('')}</select></label>
      <button class="mini" id="fatResGo">Gerar</button></div></section>` : ''}
    <section class="card fatLista">${abertas.length ? `<p class="why" style="margin:0 0 6px">Em aberto: <b>${abertas.length}</b> fatura(s)${aberto.BRL ? ' · <b>' + fatDin(aberto.BRL, 'BRL') + '</b>' : ''}${aberto.EUR ? ' · <b>' + fatDin(aberto.EUR, 'EUR') + '</b>' : ''}</p>` : ''}
      ${l.length ? l.map(f => { const T = Fatura.totais(f);
        return `<div class="linha"><div class="tx"><b>#${esc(f.num)} · ${esc((f.para && f.para.nome) || 'sem cliente')}</b>
          <small>emissão ${esc(fatDataBr(f.emissao))} · vence ${esc(fatDataBr(f.vencimento))} · ${T.linhas.length} linha(s) · <b>${fatDin(T.totalMoeda, f.moeda)}</b></small></div>
          ${fatStatusPill(f)}<a class="mini" href="#/adm/faturas/${encodeURIComponent(f.id)}">Abrir</a><a class="mini" href="#/adm/fatdoc/${encodeURIComponent(f.id)}">PDF</a>
          <button class="mini" data-fatdup="${esc(f.id)}">Duplicar</button><button class="mini ghost" data-fatdel="${esc(f.id)}" aria-label="Apagar">×</button></div>`; }).join('')
      : '<p class="empty">Nenhuma fatura ainda.</p>'}</section>
    ${emVazio ? '' : cardEmissor}`);
  $('#fatNova').onclick = () => { const f = Fatura.nova({}); go('/adm/faturas/' + encodeURIComponent(f.id)); };
  const rg = $('#fatResGo');
  if (rg) rg.onclick = () => {
    const bid = $('#fatRes').value, br = (DB.bookings || []).find(x => x.id === bid), code = br ? br.code : bid, ja = Fatura.all().filter(f => f.bookingId ? f.bookingId === bid : f.bookingCode === code);
    if (ja.length && !confirm(`A reserva ${code} já tem a fatura #${ja.map(f => f.num).join(', #')}. Gerar outra?`)) return;
    const f = Fatura.daReserva(bid); if (!f) { toast('Reserva não encontrada'); return; }
    toast('Fatura #' + f.num + ' criada'); go('/adm/faturas/' + encodeURIComponent(f.id));
  };
  $$('[data-fatdup]').forEach(b => b.onclick = () => { const f = Fatura.duplica(b.dataset.fatdup); if (f) { toast('Nova fatura #' + f.num); go('/adm/faturas/' + encodeURIComponent(f.id)); } });
  $$('[data-fatdel]').forEach(b => b.onclick = () => { const f = Fatura.get(b.dataset.fatdel); if (f && confirm(`Apagar a fatura #${f.num}?`)) { Fatura.remove(f.id); toast('Fatura apagada'); admFaturas(); } });
  $('#feSalva').onclick = () => {
    Fatura.gravaEmissor({ nome: $('#feNome').value, cpf: $('#feCpf').value, endereco1: $('#feEnd1').value, endereco2: $('#feEnd2').value, cidade: $('#feCid').value, pais: $('#fePais').value, email: $('#feEmail').value, telefone: $('#feTel').value });
    const ini = Math.round(+$('#feIni').value);
    if (ini > 0 && ini !== Fatura.proxNum()) { DB.privado.faturaInicio = ini; save(); }
    toast('Seus dados foram salvos'); admFaturas();
  };
}

function fatItemEdHtml(i, k, n, moeda, linha) {
  return `<div class="fatIt" data-fi="${esc(i.id)}">
    <label class="fld">Descrição<input data-f="descricao" value="${esc(i.descricao)}" placeholder="Transfer privativo"></label>
    <label class="fld">Qtd.<input type="number" min="0" step="1" data-f="qtd" value="${esc(i.qtd)}"></label>
    <label class="fld">Valor unit. (€)<input type="number" min="0" step="0.01" data-f="unitEur" value="${esc(i.unitEur)}"></label>
    <div class="tot" data-tot>${moeda === 'BRL' ? `<small>${fatDin(linha.unit, 'BRL')} cada</small>` : '<small>&nbsp;</small>'}${fatDin(linha.total, moeda)}</div>
    <div class="bts"><button type="button" class="mini" data-mv="-1" ${k === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button type="button" class="mini" data-mv="1" ${k === n - 1 ? 'disabled' : ''} aria-label="Descer">↓</button><button type="button" class="mini ghost" data-tira aria-label="Tirar">×</button></div>
  </div>`;
}
function admFaturaEditar(id) {
  fatCss();
  const f = Fatura.get(id);
  if (!f) { admShell('faturas', '<a class="mini" href="#/adm/faturas">← faturas</a><h1 class="pageh">Fatura não encontrada</h1>'); return; }
  const T = Fatura.totais(f), em = Fatura.emissor();
  const nomes = [...new Set([...(typeof Agencias !== 'undefined' ? Agencias.all().map(a => a.nome) : []), ...(typeof Clients !== 'undefined' ? Clients.all().map(c => c.name) : [])].filter(Boolean))];
  const orc = f.orcamentoId && typeof Orc !== 'undefined' ? Orc.get(f.orcamentoId) : null;
  const repetida = Fatura.all().some(x => x !== f && +x.num === +f.num);
  admShell('faturas', `
    <a class="mini" href="#/adm/faturas">← faturas</a>
    <div class="pagehead"><h1 class="pageh">Fatura #${esc(f.num)}</h1>
      <div class="chips">${fatStatusPill(f)}<button class="cta sm" id="fatVer">Ver / PDF</button></div></div>
    ${orc || f.bookingCode ? `<p class="why">${orc ? `Do orçamento <a href="#/adm/orcamentos/${encodeURIComponent(orc.id)}">${esc(orc.num)}</a>` : ''}${orc && f.bookingCode ? ' · ' : ''}${f.bookingCode ? 'Da reserva ' + esc(f.bookingCode) : ''}</p>` : ''}
    ${em.nome ? '' : '<p class="fatAviso">Faltam os seus dados (o quadro "DE"): preencha em <a href="#/adm/faturas">Faturas → Seus dados para a fatura</a>.</p>'}
    <section class="card fatEd" id="fatEd" data-id="${esc(f.id)}">
      <div class="frow"><label class="fld">Número<input id="fatNum" type="number" min="1" step="1" value="${esc(f.num)}"></label>
        <label class="fld">Emissão<input id="fatEmi" type="date" value="${esc(f.emissao)}"></label>
        <label class="fld">Vencimento<input id="fatVenc" type="date" value="${esc(f.vencimento)}"></label></div>
      ${repetida ? `<p class="fatAviso">Já existe outra fatura com o número #${esc(f.num)}.</p>` : ''}
      <p class="tfGrupo" style="margin:14px 0 0">Para</p>
      <div class="frow"><label class="fld" style="flex:2">Nome (cliente, agência ou empresa)<input id="fatPNome" list="fatParaL" value="${esc(f.para.nome)}"><datalist id="fatParaL">${nomes.map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>
        <label class="fld">É<select id="fatPTipo"><option value="cliente" ${f.para.tipo !== 'agencia' ? 'selected' : ''}>cliente</option><option value="agencia" ${f.para.tipo === 'agencia' ? 'selected' : ''}>agência ou empresa</option></select></label></div>
      <div class="frow"><label class="fld">Documento<input id="fatPDoc" value="${esc(f.para.documento)}" placeholder="CNPJ, CPF, passaporte…"></label><label class="fld">E-mail<input id="fatPEmail" type="email" value="${esc(f.para.email)}"></label></div>
      <label class="fld">Endereço<textarea id="fatPEnd" rows="2" placeholder="rua, número · cidade, país">${esc(f.para.endereco)}</textarea></label>
      <p class="tfGrupo" style="margin:14px 0 0">Valores</p>
      <div class="frow"><label class="fld">A fatura sai em<select id="fatMoeda"><option value="BRL" ${f.moeda === 'BRL' ? 'selected' : ''}>real (R$), convertido do euro</option><option value="EUR" ${f.moeda === 'EUR' ? 'selected' : ''}>euro (€)</option></select></label>
        <label class="fld" data-brl>Cotação: € 1 = R$<input id="fatTaxa" type="number" min="0" step="0.01" value="${f.cotacao.taxa > 0 ? esc(f.cotacao.taxa) : ''}" placeholder="5,89"></label>
        <label class="fld" data-brl>Data da cotação<input id="fatTaxaD" type="date" value="${esc(f.cotacao.data || '')}"></label>
        <button type="button" class="mini" id="fatTaxaHoje" data-brl style="margin-bottom:6px">Cotação de hoje</button></div>
      <p class="why" data-brl>Você escreve os valores em euro; na fatura cada valor sai em real com esta cotação.</p>
      <div class="fatIts" id="fatIts">${f.itens.map((i, k) => fatItemEdHtml(i, k, f.itens.length, f.moeda, T.linhas[k])).join('') || '<p class="empty" style="padding:6px 0">Nenhuma linha ainda.</p>'}</div>
      <div class="frow" style="margin-top:8px"><button type="button" class="mini" id="fatAdd">+ Linha</button></div>
      <div class="fatTotal" id="fatTotal"></div>
      <p class="tfGrupo" style="margin:14px 0 0">Pagamento</p>
      <div class="frow"><label class="fld">Forma<select id="fatForma">${FAT_FORMAS.map(x => `<option ${f.pagamento.forma === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="fld" style="flex:2"><span id="fatChaveRot">Chave</span><input id="fatChave" value="${esc(f.pagamento.chave)}"></label>
        <label class="fld">Favorecida<input id="fatFav" value="${esc(f.pagamento.favorecida)}"></label></div>
      <p class="fatAviso" id="fatAvPix" hidden>O Pix só recebe em real: escolha "real (R$)" acima, ou troque a forma para Wise.</p>
      <label class="fld">Termos &amp; Condições<textarea id="fatTermos" rows="3">${esc(f.termos)}</textarea></label>
      <p class="why" style="margin:0">{email} vira o seu e-mail.</p>
      <div class="frow" style="margin-top:14px"><button class="cta sm" id="fatSalva">Salvar</button>
        ${f.status === 'emitida' ? '<button class="mini" id="fatEnv">Marcar enviada</button>' : ''}
        ${f.status !== 'paga' ? '<button class="mini" id="fatPaga">Marcar paga</button>' : '<button class="mini" id="fatDespaga">Desmarcar paga</button>'}
        <button class="mini" id="fatDup">Duplicar</button><button class="mini ghost" id="fatApaga">Apagar</button></div>
    </section>`);

  /* a chave (agência:id ou a ficha do cliente) acompanha o nome; trocou o nome, troca a chave */
  let chaveAtual = f.para.chave || '', nomeDaChave = f.para.nome || '';
  const le = () => ({
    num: $('#fatNum').value, emissao: $('#fatEmi').value, vencimento: $('#fatVenc').value,
    para: { nome: $('#fatPNome').value.trim(), tipo: $('#fatPTipo').value, documento: $('#fatPDoc').value.trim(), email: $('#fatPEmail').value.trim(), endereco: $('#fatPEnd').value.trim(),
      chave: fatNorm($('#fatPNome').value) === fatNorm(nomeDaChave) ? chaveAtual : '' },
    moeda: $('#fatMoeda').value, cotacao: { taxa: $('#fatTaxa').value, data: $('#fatTaxaD').value },
    itens: [...document.querySelectorAll('#fatIts [data-fi]')].map(el => ({ id: el.dataset.fi, descricao: el.querySelector('[data-f="descricao"]').value,
      qtd: el.querySelector('[data-f="qtd"]').value, unitEur: el.querySelector('[data-f="unitEur"]').value })),
    pagamento: { forma: $('#fatForma').value, chave: $('#fatChave').value.trim(), favorecida: $('#fatFav').value.trim() },
    termos: $('#fatTermos').value,
  });
  /* as contas na hora, sem redesenhar a tela (ela está digitando) */
  const recalcula = () => {
    const c = le(), x = Object.assign({}, f, c, { cotacao: { taxa: fatNum(c.cotacao.taxa, 0) }, itens: c.itens.map(fatItem) });
    const R = Fatura.totais(x), brl = c.moeda === 'BRL';
    document.querySelectorAll('#fatIts [data-fi]').forEach((el, k) => { const l = R.linhas[k]; if (l) el.querySelector('[data-tot]').innerHTML = (brl ? `<small>${fatDin(l.unit, 'BRL')} cada</small>` : '<small>&nbsp;</small>') + fatDin(l.total, c.moeda); });
    $('#fatTotal').innerHTML = brl
      ? (R.semCotacao ? '<span class="fatAviso" style="margin:0">Falta a cotação do euro</span>' : `<span>${fatDin(R.totalEur, 'EUR')} × ${fatTaxaFmt(R.taxa)} =</span><b>${fatDin(R.totalMoeda, 'BRL')}</b>`)
      : `<span>Total</span><b>${fatDin(R.totalMoeda, 'EUR')}</b>`;
    document.querySelectorAll('#fatEd [data-brl]').forEach(el => { el.hidden = !brl; el.style.display = brl ? '' : 'none'; });
    $('#fatAvPix').hidden = !(c.pagamento.forma === 'PIX' && c.moeda === 'EUR');
    $('#fatChaveRot').textContent = c.pagamento.forma === 'Wise' ? 'Link Wise' : c.pagamento.forma === 'Transferência' ? 'Conta (IBAN)' : 'Chave Pix';
  };
  recalcula();
  $('#fatEd').addEventListener('input', recalcula);
  $('#fatEd').addEventListener('change', recalcula);
  const guarda = (extra) => Fatura.atualiza(f.id, Object.assign(le(), extra || {}));
  /* trocou a emissão: o vencimento anda junto (mesmo prazo) */
  let emiAntes = f.emissao;
  $('#fatEmi').onchange = (e) => { const d = fatDias(emiAntes, $('#fatVenc').value), nv = e.target.value; if (fatIsoOk(nv) && d != null) $('#fatVenc').value = addDays(nv, d); emiAntes = nv; recalcula(); };
  /* escolheu uma agência ou um cliente conhecido: completa o que estiver vazio */
  $('#fatPNome').onchange = () => {
    const p = fatParaDe($('#fatPNome').value, '');
    if (p.tipo === 'agencia' || p.documento || p.endereco || p.email) {
      $('#fatPTipo').value = p.tipo;
      if (!$('#fatPDoc').value.trim()) $('#fatPDoc').value = p.documento || '';
      if (!$('#fatPEnd').value.trim()) $('#fatPEnd').value = p.endereco || '';
      if (!$('#fatPEmail').value.trim()) $('#fatPEmail').value = p.email || '';
      if (p.tipo === 'agencia' && p.nome) $('#fatPNome').value = p.nome;
      if (p.prazoDias != null && fatIsoOk($('#fatEmi').value)) { $('#fatVenc').value = addDays($('#fatEmi').value, p.prazoDias); toast(`Vencimento em ${p.prazoDias} dia(s), o prazo da ${p.nome}`); }
      chaveAtual = p.chave || ''; nomeDaChave = $('#fatPNome').value;
    }
  };
  let formaAntes = f.pagamento.forma;
  $('#fatForma').onchange = (e) => {
    const velho = Fatura.pagamentoPadrao(formaAntes), novo = Fatura.pagamentoPadrao(e.target.value);
    if (!$('#fatChave').value.trim() || $('#fatChave').value.trim() === velho.chave) $('#fatChave').value = novo.chave;
    if (!$('#fatFav').value.trim() || $('#fatFav').value.trim() === velho.favorecida) $('#fatFav').value = novo.favorecida;
    formaAntes = e.target.value; recalcula();
  };
  $('#fatTaxaHoje').onclick = async () => {
    const b = $('#fatTaxaHoje'); b.disabled = true; b.textContent = 'Buscando…';
    try { if (typeof fxAtualiza === 'function') await fxAtualiza(); } catch (e) {}
    const t = fatTaxaDoDia(); b.disabled = false; b.textContent = 'Cotação de hoje';
    if (!t) { toast('Sem internet para a cotação: escreva o valor'); return; }
    $('#fatTaxa').value = t; $('#fatTaxaD').value = fatHoje(); recalcula(); toast('Cotação de hoje: € 1 = R$ ' + fatTaxaFmt(t));
  };
  $('#fatSalva').onclick = () => { guarda(); toast('Fatura salva'); admFaturaEditar(f.id); };
  $('#fatVer').onclick = () => { guarda(); Fatura.abrir(f.id); };
  $('#fatAdd').onclick = () => { const c = le(); c.itens.push({ descricao: '', qtd: 1, unitEur: 0 }); Fatura.atualiza(f.id, c); admFaturaEditar(f.id); const u = [...document.querySelectorAll('#fatIts [data-f="descricao"]')].pop(); if (u) u.focus(); };
  $$('#fatIts [data-fi]').forEach(el => {
    el.querySelector('[data-tira]').onclick = () => { const c = le(); c.itens = c.itens.filter(i => i.id !== el.dataset.fi); Fatura.atualiza(f.id, c); admFaturaEditar(f.id); };
    el.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const c = le(); const k = c.itens.findIndex(i => i.id === el.dataset.fi), j = k + +b.dataset.mv; if (k < 0 || j < 0 || j >= c.itens.length) return; [c.itens[k], c.itens[j]] = [c.itens[j], c.itens[k]]; Fatura.atualiza(f.id, c); admFaturaEditar(f.id); });
  });
  const e1 = $('#fatEnv'); if (e1) e1.onclick = () => { guarda({ status: 'enviada' }); toast('Fatura marcada como enviada'); admFaturaEditar(f.id); };
  const e2 = $('#fatPaga'); if (e2) e2.onclick = () => { guarda({ status: 'paga' }); toast('Fatura paga'); admFaturaEditar(f.id); };
  const e3 = $('#fatDespaga'); if (e3) e3.onclick = () => { guarda({ status: f.enviadaEm ? 'enviada' : 'emitida' }); toast('Voltou para em aberto'); admFaturaEditar(f.id); };
  $('#fatDup').onclick = () => { guarda(); const n = Fatura.duplica(f.id); if (n) { toast('Nova fatura #' + n.num); go('/adm/faturas/' + encodeURIComponent(n.id)); } };
  $('#fatApaga').onclick = () => { if (confirm(`Apagar a fatura #${f.num}?`)) { Fatura.remove(f.id); toast('Fatura apagada'); go('/adm/faturas'); } };
}

/* o documento em tela cheia, pronto para "Salvar como PDF" */
function admFaturaDoc(id) {
  fatCss();
  const f = Fatura.get(decodeURIComponent(id || ''));
  if (!f) { go('/adm/faturas'); return; }
  const T = Fatura.totais(f), em = Fatura.emissor();
  document.title = `Fatura #${f.num} - ${(f.para && f.para.nome) || 'cliente'}`;
  const avisos = [!em.nome ? 'faltam os seus dados (quadro "DE") — em Faturas → Seus dados' : '', T.semCotacao ? 'falta a cotação do euro' : '', f.pagamento.forma === 'PIX' && f.moeda === 'EUR' ? 'o Pix só recebe em real' : ''].filter(Boolean);
  app.innerHTML = `<div class="fatTela">
    <div class="fatBarra"><a class="mini" href="#/adm/faturas/${encodeURIComponent(f.id)}">← editar</a>
      <span><button class="mini" id="fdCopia">Copiar mensagem para o WhatsApp</button><button class="cta sm" id="fdPdf">Imprimir / Salvar em PDF</button></span></div>
    ${avisos.length ? `<p class="fatAviso fatDica" style="text-align:left">Antes de mandar: ${esc(avisos.join(' · '))}.</p>` : ''}
    <div id="fatPrint">${fatDocHtml(f, fatDensidade(f))}</div>
    <p class="why fatDica">No "Imprimir", escolha <b>Salvar como PDF</b>. O arquivo sai com o número e o nome do cliente; mande no WhatsApp ou no e-mail.</p></div>`;
  $('#fdPdf').onclick = () => window.print();
  $('#fdCopia').onclick = async () => {
    const pg = f.pagamento || {};
    let quem = '';
    if (f.para.tipo === 'agencia' && typeof Agencias !== 'undefined') { const a = Agencias.get(String(f.para.chave || '').replace(/^agencia:/, '')) || Agencias.acha(f.para.nome); quem = a && a.contato ? a.contato.split(/\s+/)[0] : ''; }
    else quem = String(f.para.nome || '').trim().split(/\s+/)[0] || '';
    const txt = `Olá${quem ? ', ' + quem : ''}! Segue a fatura #${f.num}, no valor de ${fatDin(T.totalMoeda, f.moeda)}, com vencimento em ${fatDataBr(f.vencimento)}. Pagamento por ${pg.forma || 'PIX'}${pg.chave ? (pg.forma === 'PIX' ? ', chave ' : ': ') + pg.chave : ''}${pg.favorecida ? ' (em nome de ' + pg.favorecida + ')' : ''}. Te mando o PDF em seguida. Obrigada!`;
    try { await navigator.clipboard.writeText(txt); toast('Mensagem copiada — cole no WhatsApp e mande o PDF junto'); } catch (e) { prompt('Copie:', txt); }
  };
  addEventListener('afterprint', () => { document.title = 'Tour na Dinamarca — ' + ((typeof guiaNome === 'function' && guiaNome()) || 'Mari'); }, { once: true });
}

/* ---------- no editor do orçamento: "Gerar fatura" ---------- */
function fatInjetaOrc(id) {
  const ver = document.getElementById('orVer'); if (!ver || typeof Orc === 'undefined') return;
  const o = Orc.get(id); if (!o) return;
  fatCss();
  const ja = Fatura.all().filter(f => f.orcamentoId === id);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'mini'; b.id = 'fatGerar'; b.textContent = 'Gerar fatura';
  ver.insertAdjacentElement('afterend', b);
  let depois = b;
  for (const f of ja) { const a = document.createElement('a'); a.className = 'mini ghost'; a.href = '#/adm/faturas/' + encodeURIComponent(f.id); a.textContent = 'Fatura #' + f.num; depois.insertAdjacentElement('afterend', a); depois = a; }
  b.onclick = () => {
    if (ja.length && !confirm(`Este orçamento já tem a fatura #${ja.map(f => f.num).join(', #')}. Gerar outra?`)) return;
    const s = document.getElementById('orSalva'); if (s) s.click();     /* salva o que ela digitou */
    const f = Fatura.doOrcamento(id); if (!f) { toast('Orçamento não encontrado'); return; }
    toast(f.itens.length ? `Fatura #${f.num} criada` : `Fatura #${f.num} criada — o orçamento não tem valores: escreva as linhas`);
    go('/adm/faturas/' + encodeURIComponent(f.id));
  };
}

/* O ÚNICO envoltório de admOrcEditar (agências + fatura + contrato).
   Sempre chama o anterior primeiro; um módulo com erro não derruba os outros. */
const _admOrcEditarAntesFat = admOrcEditar;
admOrcEditar = function (id) {
  const r = _admOrcEditarAntesFat.apply(this, arguments);
  const injetores = [typeof agcInjetaOrc === 'function' ? agcInjetaOrc : null, fatInjetaOrc, typeof ctrInjetaOrc === 'function' ? ctrInjetaOrc : null];
  for (const fn of injetores) if (fn) { try { fn(id); } catch (e) { setTimeout(() => { throw e; }); } }
  return r;
};

/* ---------- ligar no app ---------- */
STR.admFaturas = { pt: 'Faturas', en: 'Invoices' };
if (!ADM_TABS.some(([id]) => id === 'faturas')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'orcamentos');
  ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['faturas', 'admFaturas']);
}
const _viewAdmFat = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'faturas') return admFaturas(arg ? decodeURIComponent(arg) : arg);
  if (tab === 'fatdoc') return admFaturaDoc(arg);
  return _viewAdmFat(tab, arg);
};
