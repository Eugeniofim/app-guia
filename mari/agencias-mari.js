/* =====================================================
   AGÊNCIAS E EMPRESAS (06/10/2026)

   Quem manda grupo para a Mari (agência) ou contrata como empresa: cada uma
   com a TABELA DE PREÇOS dela, o desconto combinado (% sobre o preço da
   Mari), o prazo para pagar a fatura e os dados que vão na fatura
   (documento — CNPJ, CVR ou VAT —, endereço, e-mail).

   - DB.agencias (privado, nuvem-itens.js): uma linha por agência.
   - Aba "Agências e empresas", logo depois de Clientes: lista + ficha.
   - No editor do orçamento (admOrcEditar, envolvido UMA vez em
     fatura-mari.js): se o cliente do orçamento for uma agência, aparece em
     cima "Tabela da <agência>" — um toque no preço vira serviço do
     orçamento — e o botão do desconto dela.
   - window.Agencias: a API que o assistente usa.
   ===================================================== */
'use strict';

const AGC_TIPOS = { agencia: 'Agência', empresa: 'Empresa' };
/* sem acento, sem pontuação, minúsculas: "Sub4 Turismo Esportivo LTDA." = "sub4 turismo esportivo ltda" */
const agcNorm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const agcNumero = (v, padrao) => { if (v === '' || v === null || v === undefined) return padrao; const n = +String(v).replace(',', '.'); return isFinite(n) ? n : padrao; };
const agcDin = (v, u) => (v === null || v === undefined || v === '' ? 'sob consulta' : (+v).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' ' + (u || 'EUR'));
const agcId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const Agencias = {
  all() { if (!Array.isArray(DB.agencias)) DB.agencias = []; return DB.agencias; },
  /* por id; aceita também o nome (o assistente fala o nome) */
  get(id) { return this.all().find(a => a.id === id) || null; },
  preco(x) {
    const p = Object.assign({ servico: '', valor: null, unidade: 'EUR' }, x || {});
    if (!p.id) p.id = agcId('pr');
    p.servico = String(p.servico || '').trim();
    p.valor = agcNumero(p.valor, null);
    p.unidade = String(p.unidade || 'EUR').trim() || 'EUR';
    return p;
  },
  normaliza(a) {
    const x = Object.assign({ nome: '', tipo: 'agencia', contato: '', email: '', whats: '', documento: '', endereco: '', cidade: '', pais: '', desconto: 0, precos: [], prazoDias: 7, obs: '' }, a || {});
    x.tipo = x.tipo === 'empresa' ? 'empresa' : 'agencia';
    x.desconto = Math.min(100, Math.max(0, agcNumero(x.desconto, 0)));
    x.prazoDias = Math.max(0, Math.round(agcNumero(x.prazoDias, 7)));
    x.precos = (Array.isArray(x.precos) ? x.precos : []).map(p => this.preco(p));
    for (const k of ['nome', 'contato', 'email', 'whats', 'documento', 'endereco', 'cidade', 'pais', 'obs']) x[k] = String(x[k] || '').trim();
    return x;
  },
  add(c) {
    const a = this.normaliza(Object.assign({}, c || {}, { id: agcId('agc'), criado: new Date().toISOString() }));
    this.all().push(a); save(); return a;
  },
  update(id, c) {
    const a = this.get(id); if (!a) return null;
    const novo = this.normaliza(Object.assign({}, a, c || {}, { id: a.id, criado: a.criado }));
    Object.assign(a, novo, { mudado: new Date().toISOString() });
    save(); return a;
  },
  remove(id) { const tinha = !!this.get(id); DB.agencias = this.all().filter(a => a.id !== id); save(); return tinha; },
  /* acha pelo nome — sem diferença de maiúscula e acento; igual primeiro, depois
     um nome contido no outro (palavra inteira, 4+ letras) — o mais comprido vence */
  acha(nome) {
    const n = agcNorm(nome); if (!n) return null;
    const l = this.all().filter(a => a.nome);
    const igual = l.find(a => agcNorm(a.nome) === n); if (igual) return igual;
    const cand = l.filter(a => { const an = agcNorm(a.nome); if (!an) return false;
      const curto = an.length < n.length ? an : n; if (curto.length < 4) return false;
      return (' ' + n + ' ').includes(' ' + an + ' ') || (' ' + an + ' ').includes(' ' + n + ' '); });
    cand.sort((a, b) => agcNorm(b.nome).length - agcNorm(a.nome).length);
    return cand[0] || null;
  },
  /* a tabela de preços (por id ou nome) */
  precos(agId) { const a = this.get(agId) || this.acha(agId); return a ? a.precos.map(p => Object.assign({}, p)) : []; },
  /* o que vai no "PARA" da fatura */
  endereco(a) { return a ? [a.endereco, [a.cidade, a.pais].filter(Boolean).join(', ')].filter(Boolean).join('\n') : ''; },
};
window.Agencias = Agencias;

/* ---------- estilo ---------- */
function agcCss() {
  if (document.getElementById('agcCss')) return;
  const s = document.createElement('style'); s.id = 'agcCss';
  s.textContent = `
  .agcEd{display:grid;gap:4px}
  .agcEd .frow{display:flex;gap:10px;flex-wrap:wrap}
  .agcEd .frow .fld{flex:1;min-width:170px}
  .agcEd textarea{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical}
  .agcPrs{display:grid;gap:8px;margin-top:6px}
  .agcPr{display:grid;grid-template-columns:minmax(0,1fr) 120px 120px auto;gap:8px;align-items:end;padding:8px 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}
  .agcPr .fld{margin-top:0}
  .agcLista .linha{display:flex;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .agcLista .linha:last-child{border-bottom:0}
  .agcLista .linha .tx{flex:1;min-width:200px}
  .agcLista .linha small{display:block;color:var(--ink-3);margin-top:2px}
  .agcOrc{border-left:4px solid var(--brand-assinatura,#F2C230)}
  .agcOrc h3{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:6px}
  .agcOrc h3 small{font-weight:400;color:var(--ink-3);font-size:var(--fs-2)}
  .agcChips{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 4px}
  .agcChip{display:inline-flex;gap:6px;align-items:baseline;padding:8px 14px;border-radius:var(--r-pill,999px);background:var(--accent-wash,var(--surface-2));color:var(--ink);font-weight:600;font-size:var(--fs-3);border:1px solid var(--line);cursor:pointer}
  .agcChip:hover{filter:brightness(.97)}
  .agcChip span{font-weight:400;color:var(--ink-2)}
  .agcChip::before{content:"+";font-weight:700;color:var(--accent)}
  .agcLig{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
  @media(max-width:560px){.agcPr{grid-template-columns:1fr 1fr}.agcPr .fld:first-child{grid-column:1 / -1}}`;
  document.head.appendChild(s);
}

/* ---------- a aba ---------- */
function admAgencias(arg) {
  agcCss();
  if (arg) return admAgenciaEditar(arg);
  /* "+ Nova" que ficou sem nada (ela abriu e saiu): não vira uma linha "sem nome" na lista */
  const vazias = Agencias.all().filter(a => !a.nome && !a.precos.length && !a.email && !a.whats && !a.documento && !a.contato);
  if (vazias.length) { DB.agencias = Agencias.all().filter(a => !vazias.includes(a)); save(); }
  const l = Agencias.all().slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt'));
  admShell('agencias', `
    <div class="pagehead"><h1 class="pageh">Agências e empresas</h1><div class="chips"><button class="cta sm" id="agcNovo">+ Nova</button></div></div>
    <p class="why">Quem manda grupo para você ou contrata como empresa. Cada uma com a tabela de preços dela, o desconto combinado e o prazo para pagar. No orçamento, quando o cliente for uma delas, a tabela aparece em cima: é só tocar no preço.</p>
    <section class="card agcLista">${l.length ? l.map(a => `<div class="linha">
        <div class="tx"><b>${esc(a.nome || 'sem nome')}</b> <span class="pill n">${AGC_TIPOS[a.tipo] || 'Agência'}</span>
          <small>${esc([a.contato, a.email || a.whats, a.cidade].filter(Boolean).join(' · ') || 'sem contato')} · ${a.precos.length} preço(s)${a.desconto ? ` · desconto ${String(a.desconto).replace('.', ',')}%` : ''} · paga em ${a.prazoDias} dia(s)</small></div>
        <a class="mini" href="#/adm/agencias/${encodeURIComponent(a.id)}">Abrir</a>
        <button class="mini ghost" data-agcdel="${esc(a.id)}" aria-label="Apagar">×</button></div>`).join('')
      : '<p class="empty">Nenhuma agência ou empresa ainda. Toque em "+ Nova".</p>'}</section>`);
  $('#agcNovo').onclick = () => { const a = Agencias.add({ nome: '' }); go('/adm/agencias/' + encodeURIComponent(a.id)); };
  $$('[data-agcdel]').forEach(b => b.onclick = () => {
    const a = Agencias.get(b.dataset.agcdel);
    if (a && confirm(`Apagar "${a.nome || 'sem nome'}"? Os orçamentos e faturas dela continuam.`)) { Agencias.remove(a.id); toast('Apagada'); admAgencias(); }
  });
}

function agcPrecoHtml(p) {
  return `<div class="agcPr" data-pr="${esc(p.id)}">
    <label class="fld">Serviço<input data-p="servico" value="${esc(p.servico)}" placeholder="Transfer privativo"></label>
    <label class="fld">Valor<input type="number" min="0" step="0.01" data-p="valor" value="${p.valor === null ? '' : esc(p.valor)}" placeholder="sob consulta"></label>
    <label class="fld">Unidade<input data-p="unidade" value="${esc(p.unidade || 'EUR')}" placeholder="EUR, EUR/h"></label>
    <button type="button" class="mini ghost" data-prtira aria-label="Tirar este preço">×</button></div>`;
}

function admAgenciaEditar(id) {
  agcCss();
  const a = Agencias.get(decodeURIComponent(id || ''));
  if (!a) { admShell('agencias', '<a class="mini" href="#/adm/agencias">← agências e empresas</a><h1 class="pageh">Não encontrada</h1>'); return; }
  const orcs = (typeof Orc !== 'undefined' ? Orc.all() : []).filter(o => o.cliente && Agencias.acha(o.cliente.nome) === a);
  const fats = (Array.isArray(DB.faturas) ? DB.faturas : []).filter(f => f.para && (f.para.chave === 'agencia:' + a.id || Agencias.acha(f.para.nome) === a));
  admShell('agencias', `
    <a class="mini" href="#/adm/agencias">← agências e empresas</a>
    <div class="pagehead"><h1 class="pageh">${esc(a.nome || 'Nova agência ou empresa')}</h1>
      <div class="chips"><button class="mini" id="agcOrcNovo">+ Orçamento para ela</button><button class="mini ghost" id="agcApaga">Apagar</button></div></div>
    <section class="card agcEd" id="agcEd">
      <div class="frow"><label class="fld" style="flex:2">Nome<input id="agcNome" value="${esc(a.nome)}" placeholder="Sub4 Turismo Esportivo Ltda"></label>
        <label class="fld">Tipo<select id="agcTipo">${Object.entries(AGC_TIPOS).map(([k, n]) => `<option value="${k}" ${a.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <div class="frow"><label class="fld">Pessoa de contato<input id="agcContato" value="${esc(a.contato)}" placeholder="nome de quem fala com você"></label>
        <label class="fld">E-mail<input id="agcEmail" type="email" value="${esc(a.email)}"></label>
        <label class="fld">WhatsApp<input id="agcWhats" type="tel" value="${esc(a.whats)}" placeholder="+55 11 9…"></label></div>
      <div class="frow"><label class="fld">Documento<input id="agcDoc" value="${esc(a.documento)}" placeholder="CNPJ, CVR ou VAT"></label>
        <label class="fld" style="flex:2">Endereço<input id="agcEnd" value="${esc(a.endereco)}" placeholder="rua, número, sala"></label></div>
      <div class="frow"><label class="fld">Cidade<input id="agcCid" value="${esc(a.cidade)}"></label><label class="fld">País<input id="agcPais" value="${esc(a.pais)}" placeholder="Brasil"></label></div>
      <div class="frow"><label class="fld">Desconto combinado (% sobre o seu preço)<input id="agcDesc" type="number" min="0" max="100" step="0.5" value="${esc(a.desconto)}"></label>
        <label class="fld">Prazo para pagar a fatura (dias)<input id="agcPrazo" type="number" min="0" step="1" value="${esc(a.prazoDias)}"></label></div>
      <label class="fld">Anotações<textarea id="agcObs" rows="2" placeholder="como gostam de ser atendidos, quem aprova, forma de pagamento…">${esc(a.obs)}</textarea></label>
      <p class="tfGrupo" style="margin:14px 0 0">Tabela de preços dela</p>
      <p class="why" style="margin:0">O preço que vale para esta agência. No orçamento dela, cada linha vira um botão.</p>
      <div class="agcPrs" id="agcPrs">${a.precos.map(agcPrecoHtml).join('') || '<p class="empty" style="padding:6px 0">Nenhum preço ainda.</p>'}</div>
      <div class="frow" style="margin-top:8px"><button type="button" class="mini" id="agcPrAdd">+ Linha de preço</button></div>
      <div class="frow" style="margin-top:12px"><button class="cta sm" id="agcSalva">Salvar</button></div>
    </section>
    ${orcs.length || fats.length ? `<section class="card"><h3>Com esta agência</h3><div class="agcLig">
      ${orcs.map(o => `<a class="mini" href="#/adm/orcamentos/${encodeURIComponent(o.id)}">${esc(o.num)}</a>`).join('')}
      ${fats.map(f => `<a class="mini" href="#/adm/faturas/${encodeURIComponent(f.id)}">Fatura #${esc(f.num)}</a>`).join('')}</div></section>` : ''}`);

  const le = () => ({
    nome: $('#agcNome').value, tipo: $('#agcTipo').value, contato: $('#agcContato').value, email: $('#agcEmail').value, whats: $('#agcWhats').value,
    documento: $('#agcDoc').value, endereco: $('#agcEnd').value, cidade: $('#agcCid').value, pais: $('#agcPais').value,
    desconto: $('#agcDesc').value, prazoDias: $('#agcPrazo').value, obs: $('#agcObs').value,
    precos: [...document.querySelectorAll('#agcPrs [data-pr]')].map(el => ({ id: el.dataset.pr,
      servico: el.querySelector('[data-p="servico"]').value, valor: el.querySelector('[data-p="valor"]').value, unidade: el.querySelector('[data-p="unidade"]').value }))
      .filter(p => p.servico.trim() || String(p.valor).trim()),
  });
  $('#agcSalva').onclick = () => { if (!$('#agcNome').value.trim()) { toast('Falta o nome'); $('#agcNome').focus(); return; } Agencias.update(a.id, le()); toast('Salvo'); admAgenciaEditar(a.id); };
  $('#agcPrAdd').onclick = () => {
    Agencias.update(a.id, le());
    /* a linha nova, vazia, entra direto (o le() deixa de fora as linhas vazias) */
    Agencias.get(a.id).precos.push(Agencias.preco({})); save(); admAgenciaEditar(a.id);
    const ult = [...document.querySelectorAll('#agcPrs [data-p="servico"]')].pop(); if (ult) ult.focus(); };
  $$('#agcPrs [data-pr]').forEach(el => el.querySelector('[data-prtira]').onclick = () => {
    const c = le(); c.precos = c.precos.filter(p => p.id !== el.dataset.pr); Agencias.update(a.id, c); admAgenciaEditar(a.id); });
  $('#agcApaga').onclick = () => { if (confirm(`Apagar "${a.nome || 'sem nome'}"? Os orçamentos e faturas dela continuam.`)) { Agencias.remove(a.id); toast('Apagada'); go('/adm/agencias'); } };
  $('#agcOrcNovo').onclick = () => {
    if (typeof Orc === 'undefined') return;
    Agencias.update(a.id, le());
    const ag = Agencias.get(a.id);
    if (!ag.nome) { toast('Escreva o nome primeiro'); return; }
    const o = Orc.novo({ cliente: { nome: ag.nome, chave: 'agencia:' + ag.id }, titulo: ag.nome });
    go('/adm/orcamentos/' + encodeURIComponent(o.id));
  };
}

/* ---------- no editor do orçamento: a tabela da agência ----------
   Chamado pelo ÚNICO envoltório de admOrcEditar (fatura-mari.js), depois
   que o editor original desenhou. */
function agcSalvaOrcAberto() {
  /* salva o que ela digitou e não salvou (o botão do próprio editor redesenha a tela) */
  const b = document.getElementById('orSalva'); if (b) b.click();
}
function agcInjetaOrc(id) {
  const ed = document.getElementById('orEd'); if (!ed || typeof Orc === 'undefined') return;
  const o = Orc.get(id); if (!o) return;
  /* os nomes das agências também aparecem na lista de clientes do orçamento */
  const dl = document.getElementById('orCliL');
  if (dl) { const tem = new Set([...dl.querySelectorAll('option')].map(op => op.value));
    for (const a of Agencias.all()) if (a.nome && !tem.has(a.nome)) { const op = document.createElement('option'); op.value = a.nome; dl.appendChild(op); } }
  const ag = Agencias.acha(o.cliente && o.cliente.nome); if (!ag) return;
  agcCss();
  const comValor = o.itens.filter(i => i.valor !== null && i.valor !== '' && !isNaN(+i.valor));
  const card = document.createElement('section');
  card.className = 'card agcOrc'; card.id = 'agcOrc';
  card.innerHTML = `<h3>Tabela da ${esc(ag.nome)} <small>${AGC_TIPOS[ag.tipo] || 'Agência'} · paga em ${ag.prazoDias} dia(s)${ag.desconto ? ` · desconto de ${String(ag.desconto).replace('.', ',')}%` : ''}</small></h3>
    ${ag.precos.length ? `<p class="why" style="margin:0">Toque num preço para pôr no orçamento.</p>
      <div class="agcChips">${ag.precos.map(p => `<button type="button" class="agcChip" data-agcpr="${esc(p.id)}">${esc(p.servico || 'serviço')} <span>${esc(agcDin(p.valor, p.unidade))}</span></button>`).join('')}</div>`
      : `<p class="why" style="margin:0">Esta agência ainda não tem tabela de preços.</p>`}
    <div class="agcLig">${ag.desconto > 0 ? `<button type="button" class="mini" id="agcDescOrc" ${comValor.length ? '' : 'disabled'}>${o.descontoAplicado ? `Desconto de ${String(o.descontoAplicado).replace('.', ',')}% já aplicado · aplicar de novo` : `Aplicar desconto de ${String(ag.desconto).replace('.', ',')}% nos valores`}</button>` : ''}
      <a class="mini ghost" href="#/adm/agencias/${encodeURIComponent(ag.id)}">Abrir a ficha da agência</a></div>`;
  ed.parentNode.insertBefore(card, ed);
  card.querySelectorAll('[data-agcpr]').forEach(b => b.onclick = () => {
    const p = ag.precos.find(x => x.id === b.dataset.agcpr); if (!p) return;
    agcSalvaOrcAberto();
    const atual = Orc.get(id); if (!atual) return;
    Orc.atualiza(id, { itens: atual.itens.concat([Orc.item({ titulo: p.servico, valor: p.valor, unidade: p.unidade || 'EUR', data: atual.ini || '' })]) });
    admOrcEditar(id);
    toast('Adicionado: ' + (p.servico || 'serviço'));
  });
  const bd = card.querySelector('#agcDescOrc');
  if (bd) bd.onclick = () => {
    agcSalvaOrcAberto();
    const atual = Orc.get(id); if (!atual) return;
    const n = atual.itens.filter(i => i.valor !== null && i.valor !== '' && !isNaN(+i.valor)).length;
    if (!n) { toast('Nenhum valor para descontar'); return; }
    const pct = ag.desconto;
    const aviso = atual.descontoAplicado ? `\n\nAtenção: este orçamento JÁ teve ${String(atual.descontoAplicado).replace('.', ',')}% de desconto. Aplicar de novo desconta em cima do valor com desconto.` : '';
    if (!confirm(`Aplicar ${String(pct).replace('.', ',')}% de desconto da ${ag.nome} em ${n} valor(es) deste orçamento?${aviso}`)) return;
    const itens = atual.itens.map(i => (i.valor === null || i.valor === '' || isNaN(+i.valor)) ? i : Object.assign({}, i, { valor: Math.round(+i.valor * (100 - pct)) / 100 }));
    Orc.atualiza(id, { itens, descontoAplicado: pct });
    admOrcEditar(id);
    toast(`Desconto de ${String(pct).replace('.', ',')}% aplicado`);
  };
}

/* ---------- ligar no app ---------- */
STR.admAgencias = { pt: 'Agências e empresas', en: 'Agencies & companies' };
if (!ADM_TABS.some(([id]) => id === 'agencias')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'clients');
  ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['agencias', 'admAgencias']);
}
const _viewAdmAgc = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'agencias') return admAgencias(arg ? decodeURIComponent(arg) : arg);
  return _viewAdmAgc(tab, arg);
};
