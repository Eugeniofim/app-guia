/* =====================================================
   CONTRATO (06/10/2026)

   Já estava no pacote dela (orçamento e contrato). O contrato nasce do
   orçamento ("Gerar contrato" no editor do orçamento) com o cliente, os
   serviços, as datas, as pessoas e os valores (total, sinal de 50% e
   saldo) — a partir de um MODELO de texto que ela troca pelo dela.

   - DB.privado.contratoModelo: o texto do modelo, com os campos
     {cliente} {documento} {emissor} {emissor_documento} {servicos} {datas}
     {pessoas} {total} {sinal} {saldo} {forma_saldo} {cidade_data}.
     Enquanto ela não salvar o dela (DB.privado.contratoModeloProprio),
     aparece o aviso "Modelo inicial — troque pelo texto do seu contrato".
   - DB.contratos (privado, nuvem-itens.js): o texto já preenchido, que ela
     ainda pode editar, e a situação (rascunho, enviado, assinado).
   - O documento repete a ARTE do orçamento (.orcDoc: faixa verde-escura com
     o selo, Playfair, folha creme) e termina com as linhas de assinatura das
     duas partes. Sai em PDF pelo "Imprimir → Salvar como PDF".
   - Nada de percentual de multa inventado: o cancelamento remete à política
     informada no orçamento.
   ===================================================== */
'use strict';

const CTR_ST = { rascunho: ['n', 'rascunho'], enviado: ['warn', 'enviado'], assinado: ['ok', 'assinado'] };
const CTR_CAMPOS = [
  ['{cliente}', 'nome do cliente ou da agência'], ['{documento}', 'documento do cliente'], ['{emissor}', 'o seu nome'], ['{emissor_documento}', 'o seu CPF'],
  ['{servicos}', 'a lista numerada dos serviços'], ['{datas}', 'o período'], ['{pessoas}', 'quantas pessoas'], ['{total}', 'o valor total'],
  ['{sinal}', 'o sinal (50%)'], ['{saldo}', 'o saldo'], ['{forma_saldo}', 'quando o saldo é pago'], ['{cidade_data}', 'cidade e data de hoje'],
];
const CTR_MODELO = `1. AS PARTES
CONTRATADA: {emissor}, {emissor_documento}, guia de turismo e prestadora de serviços de receptivo em Copenhague, Dinamarca.
CONTRATANTE: {cliente}, {documento}.

2. O QUE ESTÁ SENDO CONTRATADO
A CONTRATADA prestará ao CONTRATANTE os serviços de guia e receptivo listados abaixo, para {pessoas}, no período de {datas}:
{servicos}
Hospedagem, passagens aéreas, refeições e ingressos de atrações não estão incluídos, salvo quando indicado na lista acima.

3. VALOR E PAGAMENTO
O valor total dos serviços é de {total}.
Na reserva, o CONTRATANTE paga o sinal de {sinal} (50% do total), que garante a data e a agenda da guia. Os serviços ficam reservados depois que o sinal é recebido.
O saldo de {saldo} é pago {forma_saldo}.

4. CANCELAMENTO
Em caso de cancelamento ou desistência pelo CONTRATANTE, a devolução de valores será feita conforme a política de cancelamento informada no orçamento.
Se a CONTRATADA precisar cancelar um serviço por motivo de força maior (doença, greve, condições climáticas que tornem o passeio inseguro ou decisão das autoridades), oferecerá uma nova data ou devolverá o valor pago pelo serviço não prestado.

5. RESPONSABILIDADES DA CONTRATADA
- Prestar os serviços com cuidado e em português, nas datas e nos horários combinados.
- Adaptar o ritmo dos passeios ao grupo, com atenção especial a quem tem mobilidade reduzida.
- Avisar com antecedência qualquer mudança necessária no roteiro.

6. RESPONSABILIDADES DO CONTRATANTE
- Estar no ponto de encontro no horário combinado. O atraso reduz o tempo do passeio e não gera desconto.
- Informar, antes da viagem, as condições de saúde e de mobilidade, as alergias e as restrições alimentares de cada participante que possam afetar os passeios.
- Cuidar dos próprios documentos e pertences e respeitar as regras dos lugares visitados.
- Ingressos, refeições e transportes que não estejam na lista de serviços correm por conta do CONTRATANTE, salvo indicação em contrário.

7. ALTERAÇÕES
Mudanças de data, horário, roteiro ou número de pessoas devem ser pedidas por escrito (WhatsApp ou e-mail) e só valem depois de confirmadas pela CONTRATADA, que pode ajustar o valor de acordo com a mudança.

8. LEGISLAÇÃO E FORO
As partes procurarão resolver qualquer divergência de forma amigável. Não havendo acordo, a questão será resolvida conforme a legislação aplicável, no foro de ____________________.

9. ASSINATURAS
Por estarem de acordo, as partes assinam este contrato.
{cidade_data}`;

const ctrMes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ctrHoje = () => (typeof agHoje === 'function' ? agHoje() : isoToday());
const ctrIsoOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const ctrDataBr = (iso) => ctrIsoOk(iso) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
const ctrDataLonga = (iso) => ctrIsoOk(iso) ? `${+iso.slice(8, 10)} de ${ctrMes[+iso.slice(5, 7) - 1]} de ${iso.slice(0, 4)}` : '';
const ctrEur = (v) => '€ ' + (+v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CTR_BRANCO = '____________________';

const Contrato = {
  all() { if (!Array.isArray(DB.contratos)) DB.contratos = []; return DB.contratos; },
  /* por id; aceita também o número ("CT-0001") */
  get(id) { const l = this.all(); return l.find(c => c.id === id) || l.find(c => String(c.num).toLowerCase() === String(id || '').toLowerCase()) || null; },
  proxNum() { const n = this.all().reduce((m, c) => Math.max(m, +(String(c.num || '').match(/(\d+)$/) || [0, 0])[1]), 0) + 1; return 'CT-' + String(n).padStart(4, '0'); },
  modeloInicial() { return CTR_MODELO; },
  /* o modelo em uso; com texto, grava como o modelo DELA */
  modelo(texto) {
    DB.privado = DB.privado || {};
    if (typeof texto === 'string' && texto.trim()) { DB.privado.contratoModelo = texto; DB.privado.contratoModeloProprio = true; save(); }
    return (typeof DB.privado.contratoModelo === 'string' && DB.privado.contratoModelo.trim()) ? DB.privado.contratoModelo : CTR_MODELO;
  },
  modeloProprio() { return !!(DB.privado && DB.privado.contratoModeloProprio); },
  voltaModeloInicial() { DB.privado = DB.privado || {}; delete DB.privado.contratoModelo; DB.privado.contratoModeloProprio = false; save(); return CTR_MODELO; },
  /* os valores dos campos, a partir do orçamento (as contas vêm do Orc.totais) */
  dados(o, cliente) {
    const em = typeof Fatura !== 'undefined' ? Fatura.emissor() : {};
    const st = DB.settings || {};
    const cli = Object.assign({ nome: '', documento: '' }, cliente || {});
    const d = { cliente: cli.nome || CTR_BRANCO, documento: cli.documento ? cli.documento : 'documento nº ' + CTR_BRANCO,
      emissor: em.nome || (typeof guiaNome === 'function' ? guiaNome() : '') || CTR_BRANCO, emissor_documento: em.cpf ? 'CPF ' + em.cpf : 'documento nº ' + CTR_BRANCO,
      servicos: '1) ' + CTR_BRANCO, datas: 'a combinar', pessoas: 'o grupo informado pelo CONTRATANTE', total: ctrEur(0), sinal: ctrEur(0), saldo: ctrEur(0),
      forma_saldo: st.saldoNoDia ? 'no dia do passeio, em euro, em dinheiro' : 'até a data combinada',
      cidade_data: `${em.cidade || String((typeof guiaBase === 'function' && guiaBase()) || 'Copenhague').split(',')[0].trim()}, ${ctrDataLonga(ctrHoje())}` };
    if (o) {
      const T = Orc.totais(o);
      const base = o.itens.filter(i => !i.opcional);
      const lin = (i, k) => {
        const r = String(i.rotulo || '').trim(), rot = r ? r.charAt(0).toUpperCase() + r.slice(1).toLowerCase() : '';
        const v = i.valor === null || i.valor === '' || isNaN(+i.valor) ? 'sob consulta' : (+i.valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' ' + (i.unidade || 'EUR');
        return `${k + 1}) ${ctrIsoOk(i.data) ? ctrDataBr(i.data) + ' — ' : ''}${[rot, i.titulo].filter(Boolean).join(': ') || 'Serviço'} (${v})`;
      };
      if (base.length) d.servicos = base.map(lin).join('\n') + (T.sobConsulta.length ? '\nOs itens "sob consulta" não entram no valor total.' : '');
      const a = ctrDataBr(o.ini), b = ctrDataBr(o.fim);
      if (a) d.datas = b && b !== a ? `${a} a ${b}` : a;
      if (o.pessoas) d.pessoas = o.pessoas;
      const sinalC = Math.round(T.total * 100 / 2);
      d.total = ctrEur(T.total); d.sinal = ctrEur(sinalC / 100); d.saldo = ctrEur((Math.round(T.total * 100) - sinalC) / 100);
    }
    return d;
  },
  preenche(texto, d) { return String(texto || '').replace(/\{([a-z_]+)\}/g, (m, k) => Object.prototype.hasOwnProperty.call(d, k) ? d[k] : m); },
  clienteDoOrc(o) {
    const nome = (o && o.cliente && o.cliente.nome) || '', chave = (o && o.cliente && o.cliente.chave) || '';
    if (typeof fatParaDe === 'function') { const p = fatParaDe(nome, chave); return { nome: p.nome || nome, chave: p.chave || chave, documento: p.documento || '' }; }
    return { nome, chave, documento: '' };
  },
  novo(c) {
    c = Object.assign({}, c || {});
    const o = c.orcamentoId && typeof Orc !== 'undefined' ? Orc.get(c.orcamentoId) : null;
    const cliente = Object.assign({ nome: '', chave: '', documento: '' }, o ? this.clienteDoOrc(o) : {}, c.cliente || {});
    const x = { id: 'ct' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), num: this.proxNum(), orcamentoId: c.orcamentoId || '', bookingCode: c.bookingCode || '',
      cliente, texto: c.texto != null ? String(c.texto) : this.preenche(this.modelo(), this.dados(o, cliente)),
      status: CTR_ST[c.status] ? c.status : 'rascunho', criado: new Date().toISOString() };
    this.all().push(x); save(); return x;
  },
  doOrcamento(orcId) { const o = typeof Orc !== 'undefined' ? Orc.get(orcId) : null; if (!o) return null; return this.novo({ orcamentoId: o.id }); },
  /* refaz o texto a partir do modelo atual (perde o que ela editou no texto) */
  refaz(id) { const x = this.get(id); if (!x) return null; const o = x.orcamentoId && typeof Orc !== 'undefined' ? Orc.get(x.orcamentoId) : null;
    return this.atualiza(x.id, { texto: this.preenche(this.modelo(), this.dados(o, x.cliente)) }); },
  atualiza(id, c) {
    const x = this.get(id); if (!x) return null;
    c = Object.assign({}, c || {}); delete c.id;
    if (c.cliente) c.cliente = Object.assign({}, x.cliente, c.cliente);
    if (c.status !== undefined && !CTR_ST[c.status]) delete c.status;
    if (c.texto !== undefined) c.texto = String(c.texto);
    Object.assign(x, c, { mudado: new Date().toISOString() }); save(); return x;
  },
  remove(id) { const x = this.get(id); if (!x) return false; DB.contratos = this.all().filter(c => c !== x); save(); return true; },
  abrir(id) { const x = this.get(id); if (x) go('/adm/contratodoc/' + encodeURIComponent(x.id)); return x; },
};
window.Contrato = Contrato;

/* ---------- o texto → HTML: "1. TÍTULO" vira cabeçalho, "- " vira item, **negrito** ---------- */
function ctrTextoHtml(t) {
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const out = []; let ul = null;
  const fechaUl = () => { if (ul) { out.push('<ul class="ct-ul">' + ul.join('') + '</ul>'); ul = null; } };
  for (const raw of String(t || '').split('\n')) {
    const l = raw.trim();
    if (!l) { fechaUl(); continue; }
    const h = l.match(/^(\d{1,2})\.\s+([^a-zà-ÿ]{3,})$/);
    if (h) { fechaUl(); out.push(`<div class="ct-h"><b>${esc(h[1])}</b><span>${esc(h[2])}</span></div>`); continue; }
    if (/^[-•]\s+/.test(l)) { (ul = ul || []).push('<li>' + md(l.replace(/^[-•]\s+/, '')) + '</li>'); continue; }
    fechaUl();
    out.push(/^\d{1,2}\)\s/.test(l) ? `<p class="ct-it">${md(l)}</p>` : `<p>${md(l)}</p>`);
  }
  fechaUl();
  return out.join('');
}

function ctrCss() {
  if (typeof orcCss === 'function') orcCss();       /* a mesma arte do orçamento */
  if (document.getElementById('ctrCss')) return;
  const s = document.createElement('style'); s.id = 'ctrCss';
  s.textContent = `
  .ctrDoc .ct-corpo{padding:24px 44px 18px;font-size:13px;line-height:1.6;color:var(--od-ink)}
  .ctrDoc .ct-corpo p{margin:0 0 6px}
  .ctrDoc .ct-corpo p.ct-it{padding-left:22px;text-indent:-22px;margin:0 0 3px}
  .ctrDoc .ct-h{display:flex;gap:10px;align-items:baseline;border-bottom:1.5px solid var(--od-verde);padding-bottom:5px;margin:18px 0 9px;break-after:avoid}
  .ctrDoc .ct-h:first-child{margin-top:4px}
  .ctrDoc .ct-h b{font-family:"Playfair Display",Georgia,serif;font-size:19px;font-weight:700;color:var(--od-verde);line-height:1}
  .ctrDoc .ct-h span{font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;font-weight:600}
  .ctrDoc .ct-ul{margin:2px 0 8px;padding-left:20px}
  .ctrDoc .ct-ul li{margin:0 0 3px}
  .ctrDoc .ct-ass{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin:46px 0 8px;break-inside:avoid}
  .ctrDoc .ct-ass > div{text-align:center}
  .ctrDoc .ct-ass .ln{display:block;border-top:1.2px solid var(--od-ink);margin-bottom:8px}
  .ctrDoc .ct-ass b{display:block;font-family:"Playfair Display",Georgia,serif;font-size:14.5px}
  .ctrDoc .ct-ass small{display:block;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--od-ink2);margin-top:3px}
  .ctrDoc .ct-ass em{display:block;font-style:normal;font-size:11px;color:var(--od-ink3);margin-top:2px}
  .ctrEd{display:grid;gap:4px}
  .ctrEd .frow{display:flex;gap:10px;flex-wrap:wrap}.ctrEd .frow .fld{flex:1;min-width:170px}
  .ctrEd textarea,.ctrModelo textarea{width:100%;font:inherit;font-size:14px;line-height:1.5;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical}
  .ctrAviso{background:var(--highlight-wash,#FFF6D6);border-left:4px solid var(--brand-assinatura,#F2C230);border-radius:10px;padding:10px 14px;margin:0 0 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .ctrAviso b{flex:1;min-width:200px}
  .ctrLista .linha{display:flex;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .ctrLista .linha:last-child{border-bottom:0}
  .ctrLista .linha .tx{flex:1;min-width:200px}.ctrLista .linha small{display:block;color:var(--ink-3);margin-top:2px}
  .ctrModelo summary{cursor:pointer;font-weight:700;font-size:var(--fs-5)}
  .ctrCampos{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
  .ctrCampos code{font-size:12px;background:var(--surface-2);border-radius:6px;padding:3px 7px}
  .ctrTela{padding:16px;background:var(--paper);min-height:100vh}
  .ctrDica{text-align:center;max-width:794px;margin:12px auto}
  @media(max-width:620px){.ctrDoc .ct-corpo{padding:18px 18px 12px}.ctrDoc .ct-ass{grid-template-columns:1fr;gap:34px}}
  @media print{
    @page contrato{size:A4;margin:0}
    body:has(#ctrPrint) > *:not(#app){display:none!important}
    body:has(#ctrPrint) #ctrPrint,body:has(#ctrPrint) #ctrPrint *{visibility:visible!important}
    body:has(#ctrPrint) .orcBarra,body:has(#ctrPrint) .ctrDica{display:none!important}
    body:has(#ctrPrint) .ctrTela{padding:0!important;min-height:0!important}
    #ctrPrint{position:static!important}
    .ctrDoc{page:contrato;box-shadow:none!important;max-width:none!important;width:100%}
    /* cada folha ganha a sua margem de cima e de baixo (o papel não tem margem: a faixa verde vai até a borda) */
    .ctrDoc .ct-corpo{padding:9mm 15mm 11mm;font-size:11.5px;line-height:1.5;-webkit-box-decoration-break:clone;box-decoration-break:clone}
    .ctrDoc .ct-corpo p{orphans:3;widows:3}
    .ctrDoc .ct-ass{margin-top:34px}
  }`;
  document.head.appendChild(s);
}

function ctrDocHtml(x) {
  const o = x.orcamentoId && typeof Orc !== 'undefined' ? Orc.get(x.orcamentoId) : null;
  const em = typeof Fatura !== 'undefined' ? Fatura.emissor() : {};
  const linha = [x.num, o && typeof orcPeriodo === 'function' ? orcPeriodo(o) : '', o ? o.pessoas : ''].filter(Boolean);
  return `<div class="orcDoc ctrDoc">
    <div class="od-top"><img src="arte/selo-mari-circ.png" alt="">
      <div><small>Contrato de prestação de serviços</small>
        <h1>${esc(x.cliente.nome || 'Cliente')}${o && o.destaque ? ` · <i>${esc(o.destaque)}</i>` : ''}</h1>
        <div class="lin">${linha.map((t, k) => `${k ? '<span>·</span>' : ''}<span>${esc(t)}</span>`).join('')}</div></div></div>
    <div class="ct-corpo">${ctrTextoHtml(x.texto)}
      <div class="ct-ass">
        <div><span class="ln"></span><b>${esc(em.nome || (typeof guiaNome === 'function' ? guiaNome() : ''))}</b><small>Contratada</small>${em.cpf ? `<em>CPF ${esc(em.cpf)}</em>` : ''}</div>
        <div><span class="ln"></span><b>${esc(x.cliente.nome || '')}</b><small>Contratante</small>${x.cliente.documento ? `<em>${esc(typeof fatDocRotulo === 'function' ? fatDocRotulo(x.cliente.documento) : x.cliente.documento)}</em>` : ''}</div>
      </div></div>
    <div class="od-pe"><span><img src="arte/selo-mari-circ.png" alt="">${esc((typeof guiaNegocio === 'function' && guiaNegocio()) || 'Tour na Dinamarca')}</span><span>${esc(x.num)}</span></div>
  </div>`;
}

/* ---------- a aba Contratos ---------- */
function ctrAvisoModelo(comBotao) {
  if (Contrato.modeloProprio()) return '';
  return `<div class="ctrAviso"><b>Modelo inicial — troque pelo texto do seu contrato</b>${comBotao ? '<a class="mini" href="#/adm/contratos/modelo">Editar o modelo</a>' : ''}</div>`;
}
function admContratos(arg) {
  ctrCss();
  if (arg && arg !== 'modelo') return admContratoEditar(arg);
  const l = Contrato.all().slice().sort((a, b) => String(b.criado).localeCompare(String(a.criado)));
  admShell('contratos', `
    <div class="pagehead"><h1 class="pageh">Contratos</h1><div class="chips"><button class="cta sm" id="ctrNovo">+ Contrato em branco</button></div></div>
    <p class="why">O contrato nasce do orçamento (botão "Gerar contrato" no orçamento), já com o cliente, os serviços, as datas e os valores. Você revisa o texto, salva em PDF e manda para assinar.</p>
    ${ctrAvisoModelo(arg !== 'modelo')}
    <section class="card ctrLista">${l.length ? l.map(x => { const [c, n] = CTR_ST[x.status] || CTR_ST.rascunho; const o = x.orcamentoId && typeof Orc !== 'undefined' ? Orc.get(x.orcamentoId) : null;
      return `<div class="linha"><div class="tx"><b>${esc(x.num)} · ${esc(x.cliente.nome || 'sem cliente')}</b><small>criado em ${esc(ctrDataBr(String(x.criado).slice(0, 10)))}${o ? ' · do orçamento ' + esc(o.num) : ''}</small></div>
        <span class="pill ${c}">${n}</span><a class="mini" href="#/adm/contratos/${encodeURIComponent(x.id)}">Abrir</a><a class="mini" href="#/adm/contratodoc/${encodeURIComponent(x.id)}">PDF</a>
        <button class="mini ghost" data-ctrdel="${esc(x.id)}" aria-label="Apagar">×</button></div>`; }).join('')
      : '<p class="empty">Nenhum contrato ainda. Abra um orçamento e toque em "Gerar contrato".</p>'}</section>
    <section class="card ctrModelo" id="ctrModeloCard"><details id="ctrModeloD" ${arg === 'modelo' ? 'open' : ''}><summary>Modelo do contrato</summary>
      ${ctrAvisoModelo(false)}
      <p class="why">Cole aqui o texto do seu contrato. Onde tiver um campo entre chaves, o app troca pelo dado do orçamento:</p>
      <div class="ctrCampos">${CTR_CAMPOS.map(([k, d]) => `<span><code>${esc(k)}</code> ${esc(d)}</span>`).join('')}</div>
      <p class="why" style="margin-top:0">Uma linha como "3. VALOR E PAGAMENTO" (número, ponto e maiúsculas) vira título; uma linha que começa com "- " vira item.</p>
      <textarea id="ctrModeloTx" rows="22">${esc(Contrato.modelo())}</textarea>
      <div class="frow" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="cta sm" id="ctrModeloSalva">Salvar como meu modelo</button>
        ${Contrato.modeloProprio() ? '<button class="mini ghost" id="ctrModeloVolta">Voltar ao modelo inicial</button>' : ''}</div></details></section>`);
  if (arg === 'modelo') { const d = $('#ctrModeloD'); if (d) { d.open = true; setTimeout(() => d.scrollIntoView({ block: 'start' }), 30); } }
  $('#ctrNovo').onclick = () => { const x = Contrato.novo({}); go('/adm/contratos/' + encodeURIComponent(x.id)); };
  $$('[data-ctrdel]').forEach(b => b.onclick = () => { const x = Contrato.get(b.dataset.ctrdel); if (x && confirm(`Apagar o contrato ${x.num}?`)) { Contrato.remove(x.id); toast('Contrato apagado'); admContratos(); } });
  $('#ctrModeloSalva').onclick = () => { const t = $('#ctrModeloTx').value; if (!t.trim()) { toast('O modelo está vazio'); return; } Contrato.modelo(t); toast('Modelo salvo — os próximos contratos usam o seu texto'); admContratos(); };
  const v = $('#ctrModeloVolta');
  if (v) v.onclick = () => { if (confirm('Voltar ao modelo inicial? O seu texto de modelo será trocado (os contratos já feitos não mudam).')) { Contrato.voltaModeloInicial(); toast('Modelo inicial de volta'); admContratos('modelo'); } };
}
function admContratoEditar(id) {
  ctrCss();
  const x = Contrato.get(decodeURIComponent(id || ''));
  if (!x) { admShell('contratos', '<a class="mini" href="#/adm/contratos">← contratos</a><h1 class="pageh">Contrato não encontrado</h1>'); return; }
  const o = x.orcamentoId && typeof Orc !== 'undefined' ? Orc.get(x.orcamentoId) : null;
  admShell('contratos', `
    <a class="mini" href="#/adm/contratos">← contratos</a>
    <div class="pagehead"><h1 class="pageh">${esc(x.num)}</h1>
      <div class="chips"><select id="ctrSt" aria-label="Situação">${Object.keys(CTR_ST).map(k => `<option value="${k}" ${x.status === k ? 'selected' : ''}>${CTR_ST[k][1]}</option>`).join('')}</select>
        <button class="cta sm" id="ctrVer">Ver / PDF</button></div></div>
    ${o ? `<p class="why">Do orçamento <a href="#/adm/orcamentos/${encodeURIComponent(o.id)}">${esc(o.num)}</a></p>` : ''}
    ${ctrAvisoModelo(true)}
    <section class="card ctrEd" id="ctrEd">
      <div class="frow"><label class="fld">Cliente (contratante)<input id="ctrCli" value="${esc(x.cliente.nome)}"></label><label class="fld">Documento do cliente<input id="ctrDoc" value="${esc(x.cliente.documento)}" placeholder="CNPJ, CPF ou passaporte"></label></div>
      <label class="fld">Texto do contrato<textarea id="ctrTx" rows="26">${esc(x.texto)}</textarea></label>
      <p class="why" style="margin:0">As linhas de assinatura (as suas e as do cliente) entram no fim do documento.</p>
      <div class="frow" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="cta sm" id="ctrSalva">Salvar</button>
        <button class="mini" id="ctrRefaz">Refazer do modelo</button><button class="mini ghost" id="ctrApaga">Apagar</button></div>
    </section>`);
  const le = () => ({ cliente: { nome: $('#ctrCli').value.trim(), documento: $('#ctrDoc').value.trim() }, texto: $('#ctrTx').value });
  $('#ctrSalva').onclick = () => { Contrato.atualiza(x.id, le()); toast('Contrato salvo'); admContratoEditar(x.id); };
  $('#ctrVer').onclick = () => { Contrato.atualiza(x.id, le()); Contrato.abrir(x.id); };
  $('#ctrSt').onchange = (e) => { Contrato.atualiza(x.id, Object.assign(le(), { status: e.target.value })); toast('Situação: ' + CTR_ST[e.target.value][1]); };
  $('#ctrRefaz').onclick = () => {
    if (!confirm('Refazer o texto a partir do modelo, com o nome e o documento de cima e os dados do orçamento? O que você mudou no texto será perdido.')) return;
    Contrato.atualiza(x.id, { cliente: le().cliente }); Contrato.refaz(x.id); toast('Texto refeito'); admContratoEditar(x.id);
  };
  $('#ctrApaga').onclick = () => { if (confirm(`Apagar o contrato ${x.num}?`)) { Contrato.remove(x.id); toast('Contrato apagado'); go('/adm/contratos'); } };
}
function admContratoDoc(id) {
  ctrCss();
  const x = Contrato.get(decodeURIComponent(id || ''));
  if (!x) { go('/adm/contratos'); return; }
  document.title = `Contrato ${x.num} - ${x.cliente.nome || 'cliente'}`;
  app.innerHTML = `<div class="ctrTela">
    <div class="orcBarra"><a class="mini" href="#/adm/contratos/${encodeURIComponent(x.id)}">← editar</a>
      <span style="display:flex;gap:8px;flex-wrap:wrap"><button class="cta sm" id="ctrPdf">Imprimir / Salvar em PDF</button></span></div>
    ${Contrato.modeloProprio() ? '' : '<p class="why ctrDica" style="color:var(--ink-2)">Este contrato usa o <b>modelo inicial</b> do app — troque pelo texto do seu contrato em Contratos → Modelo do contrato.</p>'}
    <div id="ctrPrint">${ctrDocHtml(x)}</div>
    <p class="why ctrDica">No "Imprimir", escolha <b>Salvar como PDF</b>. Depois mande para o cliente assinar (ou assinem os dois no dia).</p></div>`;
  $('#ctrPdf').onclick = () => window.print();
  addEventListener('afterprint', () => { document.title = 'Tour na Dinamarca — ' + ((typeof guiaNome === 'function' && guiaNome()) || 'Mari'); }, { once: true });
}

/* ---------- no editor do orçamento: "Gerar contrato" (chamado pelo envoltório de fatura-mari.js) ---------- */
function ctrInjetaOrc(id) {
  const ver = document.getElementById('orVer'); if (!ver || typeof Orc === 'undefined') return;
  const o = Orc.get(id); if (!o) return;
  const ja = Contrato.all().filter(c => c.orcamentoId === id);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'mini'; b.id = 'ctrGerar'; b.textContent = 'Gerar contrato';
  /* ao lado do "Gerar fatura" (e dos links das faturas dele) */
  const ancora = [...ver.parentNode.querySelectorAll('#fatGerar, a[href^="#/adm/faturas/"]')].pop() || ver;
  ancora.insertAdjacentElement('afterend', b);
  let depois = b;
  for (const c of ja) { const a = document.createElement('a'); a.className = 'mini ghost'; a.href = '#/adm/contratos/' + encodeURIComponent(c.id); a.textContent = c.num; depois.insertAdjacentElement('afterend', a); depois = a; }
  b.onclick = () => {
    if (ja.length && !confirm(`Este orçamento já tem o contrato ${ja.map(c => c.num).join(', ')}. Gerar outro?`)) return;
    const s = document.getElementById('orSalva'); if (s) s.click();     /* salva o que ela digitou */
    const x = Contrato.doOrcamento(id); if (!x) { toast('Orçamento não encontrado'); return; }
    toast(`Contrato ${x.num} criado`); go('/adm/contratos/' + encodeURIComponent(x.id));
  };
}

/* ---------- ligar no app ---------- */
STR.admContratos = { pt: 'Contratos', en: 'Contracts' };
if (!ADM_TABS.some(([id]) => id === 'contratos')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'faturas');
  ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['contratos', 'admContratos']);
}
const _viewAdmCtr = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'contratos') return admContratos(arg ? decodeURIComponent(arg) : arg);
  if (tab === 'contratodoc') return admContratoDoc(arg);
  return _viewAdmCtr(tab, arg);
};
