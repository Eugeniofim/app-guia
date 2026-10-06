/* =====================================================
   ORÇAMENTOS NO MODELO DA MARI (06/10/2026)

   "aba orçamento — Mari pede pro assistente GERAR um orçamento para o
   cliente que pedir… Mari edita isso e envia pro cliente — seguir esse
   molde editável pra Mari preencher e exportar como PDF" (o modelo é o
   orçamento que ela fez para uma agência: "Proposta de serviços").
   Já estava no pacote dela (orçamento e contrato, dos R$ 500).

   - DB.orcamentos (privado, nuvem-itens.js): cliente, título, cidade em
     destaque, período, pessoas, hotel, serviços por dia (rótulo, título,
     texto, valor ou "sob consulta", nota), opcionais, sugestões (os cartões
     de restaurante), condições de pagamento e rodapé.
   - O documento repete a ARTE do modelo dela: faixa verde-escura com o
     selo, "dia da viagem" em número grande, rótulo vermelho em versalete,
     títulos com serifa, preço à direita, opcional em caixa tracejada,
     sugestões em cartões, total duplo e condições. Sai em PDF pelo
     "Imprimir → Salvar como PDF" do navegador (sem servidor).
   - O ASSISTENTE monta o rascunho (criar_orcamento / editar_orcamento) e
     ela edita aqui. Valor é sempre o que ela disser: os passeios dela são
     "sob consulta", o app não inventa preço.
   ===================================================== */
'use strict';

const ORC_CONDICOES = '**50% no ato da reserva**, para garantir a agenda do guia e os veículos privativos.\nSaldo restante (50%) pago durante a viagem.';
const ORC_RODAPE = 'Valores em EUR por grupo · hospedagem, refeições e ingressos não incluídos';
const Orc = {
  all() { if (!Array.isArray(DB.orcamentos)) DB.orcamentos = []; return DB.orcamentos; },
  get(id) { return this.all().find(o => o.id === id) || null; },
  proxNum() { const n = this.all().reduce((m, o) => Math.max(m, +(String(o.num || '').match(/(\d+)$/) || [0, 0])[1]), 0) + 1; return 'ORC-' + String(n).padStart(4, '0'); },
  novo(c) {
    const o = Object.assign({ id: 'orc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), num: this.proxNum(), criado: new Date().toISOString(), status: 'rascunho',
      cliente: { nome: '', chave: '' }, titulo: '', destaque: 'Copenhagen', ini: '', fim: '', pessoas: '', hotel: '', notaValores: 'Valores por grupo · guia privado em português',
      itens: [], sugestoes: { titulo: '', nota: '', cartoes: [] }, resumo: '', resumoOpc: '', condicoes: ORC_CONDICOES, rodape: ORC_RODAPE }, c || {});
    o.itens = (o.itens || []).map(Orc.item);
    this.all().push(o); save(); return o;
  },
  /* id vazio/undefined (vindo de duplicar) ganha um novo: com id repetido, tirar um serviço tirava todos */
  item(x) { const o = Object.assign({ data: '', rotulo: '', titulo: '', texto: '', valor: null, unidade: 'EUR', nota: '', opcional: false }, x || {}); if (!o.id) o.id = 'it' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); return o; },
  atualiza(id, c) { const o = this.get(id); if (!o) return null; Object.assign(o, c); o.mudado = new Date().toISOString(); save(); return o; },
  remove(id) { DB.orcamentos = this.all().filter(o => o.id !== id); save(); },
  duplica(id) { const o = this.get(id); if (!o) return null; const c = JSON.parse(JSON.stringify(o)); delete c.id; delete c.num; delete c.criado; c.status = 'rascunho'; c.itens = c.itens.map(({ id, ...r }) => r); return this.novo(c); },
  /* as contas — SEMPRE daqui (o assistente repete, nunca soma) */
  totais(o) {
    const num = (i) => i.valor === null || i.valor === '' || i.valor === undefined || isNaN(+i.valor) ? null : +i.valor;
    const base = o.itens.filter(i => !i.opcional), opc = o.itens.filter(i => i.opcional);
    const soma = (l) => l.reduce((s, i) => s + (num(i) || 0), 0);
    return { servicos: soma(base), opcionais: soma(opc), total: soma(base), totalComOpcionais: soma(base) + soma(opc),
      sobConsulta: o.itens.filter(i => num(i) === null).map(i => i.titulo), qtd: base.length, qtdOpc: opc.length };
  },
};
window.Orc = Orc;

/* ---------- datas no jeito do modelo ---------- */
const ORC_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ORC_DS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const orcData = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? new Date(iso + 'T12:00:00') : null;
function orcPeriodo(o) {
  const a = orcData(o.ini), b = orcData(o.fim);
  if (!a) return '';
  const f = (d) => String(d.getDate()).padStart(2, '0') + ' ' + ORC_MES[d.getMonth()];
  if (!b || +a === +b) return f(a) + ' ' + a.getFullYear();
  return f(a) + (a.getFullYear() !== b.getFullYear() ? ' ' + a.getFullYear() : '') + ' – ' + f(b) + ' ' + b.getFullYear();
}
function orcDiaDaViagem(o, iso) {
  const a = orcData(o.ini), d = orcData(iso); if (!a || !d) return '';
  return String(Math.round((d - a) / 86400000) + 1).padStart(2, '0');
}
const orcEur = (v) => v === null || v === undefined || v === '' || isNaN(+v) ? '' : (+v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const orcMd = (s) => esc(s || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

/* ---------- o DOCUMENTO (a arte do modelo dela) ---------- */
function orcCss() {
  if (document.getElementById('orcCss')) return;
  const s = document.createElement('style'); s.id = 'orcCss';
  s.textContent = `
  .orcDoc{--od-verde:#1E3329;--od-verde2:#2A4639;--od-verm:#B03A2E;--od-creme:#FBF8F2;--od-linha:#E3DCD0;--od-ink:#1D2320;--od-ink2:#5C635F;--od-ink3:#8A908C;
    font-family:var(--f-ui);color:var(--od-ink);background:var(--od-creme);width:100%;max-width:794px;margin:0 auto;box-shadow:0 20px 60px -30px rgba(0,0,0,.45);overflow:hidden}
  .orcDoc .serif{font-family:"Playfair Display",Georgia,serif}
  .od-top{background:var(--od-verde);color:#F6F2E9;display:flex;gap:18px;align-items:center;padding:26px 34px}
  .od-top img{width:62px;height:62px;border-radius:50%;flex:none}
  .od-top small{display:block;font-size:10px;letter-spacing:.32em;text-transform:uppercase;opacity:.8}
  .od-top h1{font-family:"Playfair Display",Georgia,serif;font-weight:700;font-size:24px;line-height:1.15;margin:4px 0 6px;color:#fff}
  .od-top h1 i{font-weight:500;color:#E8D9A8}
  .od-top .lin{font-size:12px;opacity:.85;display:flex;gap:10px;flex-wrap:wrap}
  .od-top .lin b{font-weight:600}
  .od-corpo{padding:22px 34px 18px}
  .od-sec{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid var(--od-verde);padding-bottom:6px;margin:6px 0 2px}
  .od-sec b{font-size:10.5px;letter-spacing:.28em;text-transform:uppercase}
  .od-sec small{font-size:10.5px;color:var(--od-ink3)}
  .od-it{display:grid;grid-template-columns:64px 1fr auto;gap:4px 16px;padding:12px 0;border-bottom:1px solid var(--od-linha);align-items:start}
  .od-dia{text-align:center;line-height:1}
  .od-dia b{display:block;font-family:"Playfair Display",Georgia,serif;font-size:22px;font-weight:700;color:var(--od-verde)}
  .od-dia small{display:block;font-size:9.5px;letter-spacing:.12em;color:var(--od-ink3);margin-top:3px}
  .od-rot{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--od-verm);font-weight:600}
  .od-tit{font-family:"Playfair Display",Georgia,serif;font-weight:700;font-size:15.5px;margin:2px 0 3px}
  .od-txt{font-size:12px;color:var(--od-ink2);line-height:1.45}
  .od-pr{text-align:right;white-space:nowrap}
  .od-pr b{font-family:"Playfair Display",Georgia,serif;font-size:19px;font-weight:700}
  .od-pr span{font-size:11px;color:var(--od-ink2);margin-left:2px}
  .od-pr i{display:block;font-family:"Playfair Display",Georgia,serif;font-size:15px;color:var(--od-ink2)}
  .od-pr small{display:block;font-size:10px;color:var(--od-ink3);line-height:1.35;margin-top:2px;white-space:normal;max-width:150px;margin-left:auto}
  .od-sub{display:flex;justify-content:flex-end;gap:14px;align-items:baseline;padding:12px 0 6px}
  .od-sub small{font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--od-ink2)}
  .od-sub b{font-family:"Playfair Display",Georgia,serif;font-size:19px}
  .od-opc{border:1.5px dashed #B9B3A6;border-radius:10px;background:#F4F1EA;margin:10px 0}
  .od-opc .od-it{border-bottom:0;padding:12px 14px}
  .od-opc .od-dia b{font-size:16px}
  .od-cards{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--od-linha);border-radius:10px;overflow:hidden;margin:10px 0 14px;background:#fff}
  .od-card{padding:12px 14px;border-left:1px solid var(--od-linha)}.od-card:first-child{border-left:0}
  .od-card small{font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;font-weight:600}
  .od-card b{display:block;font-family:"Playfair Display",Georgia,serif;font-size:15px;margin:3px 0}
  .od-card p{font-size:11.5px;color:var(--od-ink2);line-height:1.45;margin:0}
  .od-total{background:var(--od-verde);color:#F6F2E9;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;padding:16px 10px;margin:12px 0}
  .od-total.um{grid-template-columns:1fr}
  .od-total > div{text-align:center;padding:4px 12px}
  .od-total > div + div{border-left:1px solid rgba(255,255,255,.18)}
  .od-total small{display:block;font-size:10px;letter-spacing:.26em;text-transform:uppercase;opacity:.8}
  .od-total em{display:block;font-style:normal;font-size:11px;opacity:.7;margin-top:3px}
  .od-total b{display:block;font-family:"Playfair Display",Georgia,serif;font-size:27px;margin:6px 0 2px;color:#fff}
  .od-total b span{font-family:var(--f-ui);font-size:14px;font-weight:400;opacity:.8;margin-left:4px}
  .od-cond{background:#EFEBE3;border-left:4px solid var(--od-verde);border-radius:8px;padding:12px 16px;font-size:12.5px;line-height:1.5}
  .od-cond small{display:block;font-size:10px;letter-spacing:.26em;text-transform:uppercase;font-weight:600;margin-bottom:4px}
  .od-rod{text-align:center;font-size:10.5px;color:var(--od-ink3);margin:12px 0 0}
  .od-pe{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--od-linha);padding:12px 34px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--od-ink2)}
  .od-pe span:first-child{display:flex;gap:8px;align-items:center;font-weight:600}
  .od-pe img{width:22px;height:22px;border-radius:50%}
  @media(max-width:620px){.od-top{padding:20px}.od-corpo{padding:16px}.od-it{grid-template-columns:48px 1fr;}.od-pr{grid-column:2;text-align:left}.od-pr small{margin-left:0}.od-cards{grid-template-columns:1fr}.od-card{border-left:0;border-top:1px solid var(--od-linha)}.od-total{grid-template-columns:1fr}.od-total > div + div{border-left:0;border-top:1px solid rgba(255,255,255,.18)}}
  /* editor */
  .orcEd{display:grid;gap:12px}
  .orcEd .frow{display:flex;gap:10px;flex-wrap:wrap}
  .orcEd .frow .fld{flex:1;min-width:180px}
  .orcIt{border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--surface);display:grid;gap:8px}
  .orcIt.opc{border-style:dashed;background:var(--surface-2)}
  .orcIt .cab{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .orcIt .cab b{flex:1}
  .orcIt textarea,.orcEd textarea{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical}
  .orcLista .linha{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .orcLista .linha .tx{flex:1;min-width:200px}.orcLista .linha small{display:block;color:var(--ink-3)}
  .orcBarra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;max-width:794px;margin:0 auto 14px}
  @media print{
    body *{visibility:hidden!important}
    #orcPrint,#orcPrint *{visibility:visible!important}
    #orcPrint{position:absolute;left:0;top:0;width:100%}
    .orcDoc{box-shadow:none;max-width:none}
    .orcBarra,#iaFab,#iaGaveta,.protobar,.toast{display:none!important}
    @page{size:A4;margin:0}
    .od-it,.od-opc,.od-cards,.od-total,.od-cond{break-inside:avoid}
    /* no papel, mais justo: o modelo dela cabe numa folha A4 */
    .od-top{padding:16px 26px}.od-top img{width:52px;height:52px}.od-top h1{font-size:21px;margin:2px 0 4px}
    .od-corpo{padding:12px 26px 8px}
    .od-it{padding:7px 0;gap:2px 14px}.od-dia b{font-size:19px}.od-tit{font-size:14px;margin:1px 0 2px}.od-txt{font-size:10.5px;line-height:1.35}
    .od-pr b{font-size:17px}.od-sub{padding:7px 0 3px}.od-sub b{font-size:17px}
    .od-opc{margin:6px 0}.od-opc .od-it{padding:8px 12px}
    .od-cards{margin:6px 0 8px}.od-card{padding:8px 12px}.od-card b{font-size:13.5px}.od-card p{font-size:10.5px;line-height:1.35}
    .od-total{padding:10px 8px;margin:8px 0}.od-total b{font-size:23px;margin:3px 0 1px}
    .od-cond{padding:8px 14px;font-size:11.5px}.od-rod{margin:7px 0 0;font-size:9.5px}
    .od-pe{padding:9px 26px}
  }`;
  document.head.appendChild(s);
}
function orcDocHtml(o) {
  const T = Orc.totais(o), st = DB.settings || {};
  const base = o.itens.filter(i => !i.opcional).sort((a, b) => String(a.data).localeCompare(String(b.data))), opc = o.itens.filter(i => i.opcional);
  const preco = (i) => i.valor === null || i.valor === '' || isNaN(+i.valor) ? '<i>sob consulta</i>' : `<b>${orcEur(i.valor)}</b><span>${esc(i.unidade || 'EUR')}</span>`;
  const dia = (i) => { const d = orcData(i.data); return d ? `<b>${orcDiaDaViagem(o, i.data) || ''}</b><small>${ORC_DS[d.getDay()]}</small><small>${String(d.getDate()).padStart(2, '0')} ${ORC_MES[d.getMonth()].toUpperCase()}</small>` : '<b>—</b>'; };
  const linha = (i) => `<div class="od-it"><div class="od-dia">${dia(i)}</div>
      <div><div class="od-rot">${esc(i.rotulo)}</div><div class="od-tit">${esc(i.titulo)}</div>${i.texto ? `<div class="od-txt">${esc(i.texto)}</div>` : ''}</div>
      <div class="od-pr">${preco(i)}${i.nota ? `<small>${esc(i.nota)}</small>` : ''}</div></div>`;
  const cartoes = (o.sugestoes && o.sugestoes.cartoes || []).filter(c => c.nome);
  const nomeOpc = o.rotuloOpc || (opc.length ? 'o opcional' : '');
  return `<div class="orcDoc">
    <div class="od-top"><img src="arte/selo-mari-circ.png" alt="">
      <div><small>Proposta de serviços</small>
        <h1>${esc(o.titulo || o.cliente.nome || 'Cliente')}${o.destaque ? ` · <i>${esc(o.destaque)}</i>` : ''}</h1>
        <div class="lin">${[orcPeriodo(o), o.pessoas, o.hotel].filter(Boolean).map((x, k) => `${k ? '<span>·</span>' : ''}<span>${esc(x)}</span>`).join('')}</div></div></div>
    <div class="od-corpo">
      <div class="od-sec"><b>Serviços incluídos</b><small>${esc(o.notaValores || '')}</small></div>
      ${base.length ? base.map(linha).join('') : '<p class="od-txt" style="padding:14px 0">Nenhum serviço ainda.</p>'}
      <div class="od-sub"><small>Subtotal serviços</small><b>${orcEur(T.servicos)} EUR</b></div>
      ${opc.map(i => `<div class="od-opc"><div class="od-it"><div class="od-dia"><b>✦</b><small>OPCIONAL</small><small>${orcData(i.data) ? String(orcData(i.data).getDate()).padStart(2, '0') + ' ' + ORC_MES[orcData(i.data).getMonth()].toUpperCase() : ''}</small></div>
        <div><div class="od-rot" style="color:var(--od-ink2)">${esc(i.rotulo || 'Opcional')}</div><div class="od-tit">${esc(i.titulo)}</div>${i.texto ? `<div class="od-txt">${esc(i.texto)}</div>` : ''}</div>
        <div class="od-pr">${preco(i)}${i.nota ? `<small>${esc(i.nota)}</small>` : ''}</div></div></div>`).join('')}
      ${cartoes.length ? `<div class="od-sec" style="margin-top:12px"><b>${esc(o.sugestoes.titulo || 'Sugestões')}</b><small>${esc(o.sugestoes.nota || '')}</small></div>
        <div class="od-cards" style="grid-template-columns:repeat(${Math.min(3, cartoes.length)},1fr)">${cartoes.slice(0, 3).map(c => `<div class="od-card"><small>${esc(c.tag || '')}</small><b>${esc(c.nome)}</b><p>${esc(c.texto || '')}</p></div>`).join('')}</div>` : ''}
      <div class="od-total ${opc.length ? '' : 'um'}">
        <div><small>Total da proposta</small>${o.resumo ? `<em>${esc(o.resumo)}</em>` : ''}<b>${orcEur(T.total)}<span>EUR</span></b>${o.pessoas ? `<em>${esc(o.pessoas)}</em>` : ''}</div>
        ${opc.length ? `<div><small>Com ${esc(nomeOpc.toLowerCase())}</small>${o.resumoOpc ? `<em>${esc(o.resumoOpc)}</em>` : ''}<b>${orcEur(T.totalComOpcionais)}<span>EUR</span></b>${opc[0].nota ? `<em>${esc(opc[0].nota)}</em>` : ''}</div>` : ''}
      </div>
      ${T.sobConsulta.length ? `<p class="od-rod" style="margin:-4px 0 10px">Itens "sob consulta" não entram no total.</p>` : ''}
      ${o.condicoes ? `<div class="od-cond"><small>Condições de pagamento</small>${orcMd(o.condicoes)}</div>` : ''}
      ${o.rodape ? `<p class="od-rod">${esc(o.rodape)}</p>` : ''}
    </div>
    <div class="od-pe"><span><img src="arte/selo-mari-circ.png" alt="">${esc((typeof guiaNegocio === 'function' && guiaNegocio()) || 'Tour na Dinamarca')}</span><span>${esc(o.num || '')}</span></div>
  </div>`;
}

/* ---------- a aba Orçamentos ---------- */
const ORC_ST = { rascunho: ['n', 'rascunho'], enviado: ['warn', 'enviado'], aceito: ['ok', 'aceito'], perdido: ['bad', 'perdido'] };
function admOrcamentos(arg) {
  orcCss();
  if (arg) return admOrcEditar(decodeURIComponent(arg));
  const l = Orc.all().slice().sort((a, b) => String(b.criado).localeCompare(String(a.criado)));
  admShell('orcamentos', `
    <div class="pagehead"><h1 class="pageh">Orçamentos</h1><div class="chips"><button class="cta sm" id="orcNovo">+ Novo orçamento</button></div></div>
    <p class="why">No modelo da sua proposta para agência: serviços por dia, opcionais, sugestões e total. Ou peça ao assistente: "monta um orçamento pra Judy & Associates, 29/1 a 5/2, 14 pessoas…" — ele faz o rascunho e você ajusta aqui.</p>
    <section class="card orcLista">${l.length ? l.map(o => { const T = Orc.totais(o), [c, n] = ORC_ST[o.status] || ORC_ST.rascunho;
      return `<div class="linha"><div class="tx"><b>${esc(o.num)} · ${esc(o.cliente.nome || o.titulo || 'sem cliente')}</b><small>${esc([orcPeriodo(o), o.pessoas].filter(Boolean).join(' · '))} · ${T.qtd} serviço(s) · total ${eur(T.total)}</small></div>
        <span class="pill ${c}">${n}</span><a class="mini" href="#/adm/orcamentos/${encodeURIComponent(o.id)}">Abrir</a><button class="mini" data-dup="${esc(o.id)}">Duplicar</button><button class="mini ghost" data-del="${esc(o.id)}" aria-label="Apagar">×</button></div>`; }).join('')
      : '<p class="empty">Nenhum orçamento ainda.</p>'}</section>`);
  $('#orcNovo').onclick = () => { const o = Orc.novo({}); go('/adm/orcamentos/' + o.id); };
  $$('[data-dup]').forEach(b => b.onclick = () => { const o = Orc.duplica(b.dataset.dup); toast('Duplicado: ' + o.num); go('/adm/orcamentos/' + o.id); });
  $$('[data-del]').forEach(b => b.onclick = () => { const o = Orc.get(b.dataset.del); if (o && confirm(`Apagar o ${o.num}?`)) { Orc.remove(o.id); admOrcamentos(); } });
}
function orcItemEdHtml(i, k, n) {
  return `<div class="orcIt ${i.opcional ? 'opc' : ''}" data-it="${esc(i.id)}">
    <div class="cab"><b>${i.opcional ? '✦ Opcional' : 'Serviço ' + (k + 1)}</b>
      <label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-f="opcional" ${i.opcional ? 'checked' : ''}> opcional</label>
      <button type="button" class="mini" data-mv="-1" ${k === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button type="button" class="mini" data-mv="1" ${k === n - 1 ? 'disabled' : ''} aria-label="Descer">↓</button><button type="button" class="mini ghost" data-tira aria-label="Tirar">×</button></div>
    <div class="frow"><label class="fld">Dia<input type="date" data-f="data" value="${esc(i.data)}"></label>
      <label class="fld" style="flex:2">Rótulo (em vermelho)<input data-f="rotulo" value="${esc(i.rotulo)}" placeholder="TRANSFER DE CHEGADA · GRUPO"></label></div>
    <label class="fld">Título<input data-f="titulo" value="${esc(i.titulo)}" placeholder="Aeroporto de Copenhagen → Hotel"></label>
    <textarea data-f="texto" rows="2" placeholder="Descrição: veículo, o que inclui, observação…">${esc(i.texto)}</textarea>
    <div class="frow"><label class="fld">Valor (vazio = sob consulta)<input type="number" min="0" step="0.01" data-f="valor" value="${i.valor === null || i.valor === undefined ? '' : esc(i.valor)}"></label>
      <label class="fld">Unidade<input data-f="unidade" value="${esc(i.unidade || 'EUR')}" placeholder="EUR, EUR/h"></label>
      <label class="fld" style="flex:2">Nota embaixo do preço<input data-f="nota" value="${esc(i.nota)}" placeholder="hora extra do guia: 100 EUR/h"></label></div>
  </div>`;
}
function admOrcEditar(id) {
  orcCss();
  const o = Orc.get(id);
  if (!o) { admShell('orcamentos', '<a class="mini" href="#/adm/orcamentos">← orçamentos</a><h1 class="pageh">Orçamento não encontrado</h1>'); return; }
  const T = Orc.totais(o), sg = o.sugestoes || { titulo: '', nota: '', cartoes: [] };
  const clientes = (typeof Clients !== 'undefined' ? Clients.all() : []).map(c => c.name);
  admShell('orcamentos', `
    <a class="mini" href="#/adm/orcamentos">← orçamentos</a>
    <div class="pagehead"><h1 class="pageh">${esc(o.num)}</h1>
      <div class="chips"><select id="orSt" aria-label="Situação">${Object.keys(ORC_ST).map(k => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${ORC_ST[k][1]}</option>`).join('')}</select>
        <button class="cta sm" id="orVer">Ver o documento / PDF</button></div></div>
    <section class="card orcEd" id="orEd">
      <div class="frow"><label class="fld">Cliente<input id="orCli" list="orCliL" value="${esc(o.cliente.nome)}" placeholder="nome do cliente ou da agência"><datalist id="orCliL">${clientes.map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>
        <label class="fld">Título no topo<input id="orTit" value="${esc(o.titulo)}" placeholder="Judy & Associates Tour Operator"></label>
        <label class="fld">Em itálico<input id="orDest" value="${esc(o.destaque)}" placeholder="Copenhagen"></label></div>
      <div class="frow"><label class="fld">Chegam em<input type="date" id="orIni" value="${esc(o.ini)}"></label><label class="fld">Voltam em<input type="date" id="orFim" value="${esc(o.fim)}"></label>
        <label class="fld">Pessoas<input id="orPax" value="${esc(o.pessoas)}" placeholder="até 14 passageiros + 1 staff"></label><label class="fld">Hospedagem<input id="orHot" value="${esc(o.hotel)}" placeholder="Hotel na região central (a definir)"></label></div>
      <label class="fld">Frase ao lado de "Serviços incluídos"<input id="orNv" value="${esc(o.notaValores)}"></label>
      <p class="tfGrupo" style="margin:6px 0 0">Serviços</p>
      <div id="orIts">${o.itens.map((i, k) => orcItemEdHtml(i, k, o.itens.length)).join('')}</div>
      <div class="frow"><button type="button" class="mini" id="orAdd">+ Serviço</button><button type="button" class="mini" id="orAddOpc">+ Opcional</button></div>
      <p class="tfGrupo" style="margin:6px 0 0">Sugestões (cartões, como os restaurantes do jantar)</p>
      <div class="frow"><label class="fld">Título da seção<input id="orSgT" value="${esc(sg.titulo)}" placeholder="Sugestões para o jantar de encerramento"></label><label class="fld">Nota à direita<input id="orSgN" value="${esc(sg.nota)}" placeholder="reserva feita por nós após a escolha do grupo"></label></div>
      ${[0, 1, 2].map(k => { const c = (sg.cartoes || [])[k] || {}; return `<div class="frow" data-card="${k}"><label class="fld">Etiqueta<input data-c="tag" value="${esc(c.tag || '')}" placeholder="PIZZA · NØRREBRO"></label><label class="fld">Nome<input data-c="nome" value="${esc(c.nome || '')}" placeholder="Bæst"></label><label class="fld" style="flex:3">Texto<input data-c="texto" value="${esc(c.texto || '')}"></label></div>`; }).join('')}
      <p class="tfGrupo" style="margin:6px 0 0">Total e condições</p>
      <div class="frow"><label class="fld">Resumo do total<input id="orRes" value="${esc(o.resumo)}" placeholder="3 transfers · city tour a pé com flea market"></label><label class="fld">Total com… (nome do opcional)<input id="orRotO" value="${esc(o.rotuloOpc || '')}" placeholder="minibus opcional"></label><label class="fld">Resumo com o opcional<input id="orResO" value="${esc(o.resumoOpc)}" placeholder="+ minibus e guia no city tour (8h)"></label></div>
      <label class="fld">Condições de pagamento (**negrito** com dois asteriscos)<textarea id="orCond" rows="3">${esc(o.condicoes)}</textarea></label>
      <label class="fld">Rodapé<input id="orRod" value="${esc(o.rodape)}"></label>
      <div class="frow" style="align-items:center"><button class="cta sm" id="orSalva">Salvar</button>
        <span class="why">Serviços: <b>${eur(T.servicos)}</b>${T.qtdOpc ? ` · com opcionais: <b>${eur(T.totalComOpcionais)}</b>` : ''}${T.sobConsulta.length ? ` · sob consulta: ${esc(T.sobConsulta.join(', '))}` : ''}</span></div>
    </section>`);
  const le = () => {
    const ed = document.getElementById('orEd'); if (!ed) return o;
    const itens = [...ed.querySelectorAll('[data-it]')].map(el => { const g = (f) => el.querySelector(`[data-f="${f}"]`); const v = g('valor').value.trim();
      return Orc.item({ id: el.dataset.it, data: g('data').value, rotulo: g('rotulo').value.trim(), titulo: g('titulo').value.trim(), texto: g('texto').value.trim(), valor: v === '' ? null : +v, unidade: g('unidade').value.trim() || 'EUR', nota: g('nota').value.trim(), opcional: g('opcional').checked }); });
    const cartoes = [...ed.querySelectorAll('[data-card]')].map(el => ({ tag: el.querySelector('[data-c="tag"]').value.trim(), nome: el.querySelector('[data-c="nome"]').value.trim(), texto: el.querySelector('[data-c="texto"]').value.trim() })).filter(c => c.nome);
    const nomeCli = $('#orCli').value.trim();
    return { cliente: { nome: nomeCli, chave: o.cliente.chave || '' }, titulo: $('#orTit').value.trim(), destaque: $('#orDest').value.trim(), ini: $('#orIni').value, fim: $('#orFim').value,
      pessoas: $('#orPax').value.trim(), hotel: $('#orHot').value.trim(), notaValores: $('#orNv').value.trim(), itens,
      sugestoes: { titulo: $('#orSgT').value.trim(), nota: $('#orSgN').value.trim(), cartoes }, resumo: $('#orRes').value.trim(), rotuloOpc: $('#orRotO').value.trim(), resumoOpc: $('#orResO').value.trim(), condicoes: $('#orCond').value, rodape: $('#orRod').value.trim() };
  };
  const guarda = (redes) => { Orc.atualiza(o.id, le()); if (redes) admOrcEditar(o.id); };
  $('#orSalva').onclick = () => { guarda(true); toast('Orçamento salvo'); };
  /* ver o PDF salva antes (era um link: a edição que não tinha sido salva sumia) */
  $('#orVer').onclick = () => { guarda(false); go('/adm/orcdoc/' + encodeURIComponent(o.id)); };
  $('#orSt').onchange = (e) => { guarda(false); Orc.atualiza(o.id, { status: e.target.value }); toast('Situação: ' + ORC_ST[e.target.value][1]); };
  $('#orAdd').onclick = () => { const c = le(); c.itens.push(Orc.item({ data: c.ini || '' })); Orc.atualiza(o.id, c); admOrcEditar(o.id); };
  $('#orAddOpc').onclick = () => { const c = le(); c.itens.push(Orc.item({ data: c.ini || '', opcional: true, rotulo: 'OPCIONAL' })); Orc.atualiza(o.id, c); admOrcEditar(o.id); };
  $$('[data-it]').forEach(el => {
    el.querySelector('[data-tira]').onclick = () => { if (!confirm('Tirar este serviço?')) return; const c = le(); c.itens = c.itens.filter(i => i.id !== el.dataset.it); Orc.atualiza(o.id, c); admOrcEditar(o.id); };
    el.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const c = le(); const k = c.itens.findIndex(i => i.id === el.dataset.it), j = k + +b.dataset.mv; if (j < 0 || j >= c.itens.length) return; [c.itens[k], c.itens[j]] = [c.itens[j], c.itens[k]]; Orc.atualiza(o.id, c); admOrcEditar(o.id); });
  });
}
/* o documento em tela cheia, pronto para "Salvar como PDF" */
function admOrcDoc(id) {
  orcCss();
  const o = Orc.get(decodeURIComponent(id || ''));
  if (!o) { go('/adm/orcamentos'); return; }
  document.title = `Proposta ${o.num} - ${o.cliente.nome || o.titulo || 'cliente'}`;
  app.innerHTML = `<div style="padding:16px;background:var(--paper);min-height:100vh">
    <div class="orcBarra"><a class="mini" href="#/adm/orcamentos/${encodeURIComponent(o.id)}">← editar</a>
      <span style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini" id="odCopia">Copiar o resumo para o WhatsApp</button><button class="cta sm" id="odPdf">Imprimir / Salvar em PDF</button></span></div>
    <div id="orcPrint">${orcDocHtml(o)}</div>
    <p class="why" style="text-align:center;max-width:794px;margin:12px auto">No "Imprimir", escolha <b>Salvar como PDF</b>. O arquivo sai com o nome do cliente; mande no WhatsApp ou no e-mail.</p></div>`;
  $('#odPdf').onclick = () => window.print();
  $('#odCopia').onclick = async () => {
    const T = Orc.totais(o);
    const txt = `Oi${o.cliente.nome ? ', ' + o.cliente.nome.split(' ')[0] : ''}! Segue a proposta (${o.num})${orcPeriodo(o) ? ' para ' + orcPeriodo(o) : ''}: ${T.qtd} serviço(s), total de ${eur(T.total)}${T.qtdOpc ? ` (com opcionais: ${eur(T.totalComOpcionais)})` : ''}. Te mando o PDF com todos os detalhes. Qualquer dúvida, me chama!`;
    try { await navigator.clipboard.writeText(txt); toast('Resumo copiado — cole no WhatsApp e mande o PDF junto'); } catch (e) { prompt('Copie:', txt); }
  };
  addEventListener('afterprint', () => { document.title = 'Tour na Dinamarca — ' + ((typeof guiaNome === 'function' && guiaNome()) || 'Mari'); }, { once: true });
}

/* ---------- ligar no app ---------- */
STR.admOrcamentos = { pt: 'Orçamentos', en: 'Quotes' };
if (!ADM_TABS.some(([id]) => id === 'orcamentos')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'clients');
  ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['orcamentos', 'admOrcamentos']);
}
const _viewAdmOrc = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'orcamentos') return admOrcamentos(arg);
  if (tab === 'orcdoc') return admOrcDoc(arg);
  return _viewAdmOrc(tab, arg);
};
