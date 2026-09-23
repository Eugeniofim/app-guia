/* =====================================================
   CRÉDITOS DE IA — o Assistente e o Atendimento (robô do Instagram) usam o
   Claude, da Anthropic. Ela paga direto a eles, pelo uso, sem mensalidade.

   O número que importa, sempre à vista:
     SALDO ≈ (quanto ela colocou) − (gasto medido em cada resposta)
   A Anthropic não informa saldo a apps de fora; o gasto de cada resposta,
   sim (tokens), e é ele que somamos. Se o crédito acabar de verdade, a
   Anthropic recusa e o alarme acende na hora ("Crédito acabou").

   Onde mora:
   - com a nuvem dela ligada: no servidor (função cofre, /api/chave e
     /api/credito). A chave vale para o Assistente, para o Instagram e para
     todos os aparelhos dela; o gasto dos dois soma no mesmo saldo.
   - sem nuvem (hoje, na demonstração): neste aparelho. Só o Assistente. */
'use strict';

const CR_LINK = {
  conta: 'https://platform.claude.com/',
  pagar: 'https://platform.claude.com/settings/billing',
  chaves: 'https://platform.claude.com/settings/keys',
  limite: 'https://platform.claude.com/settings/limits',
};
const crNS = (typeof IA_NS !== 'undefined' ? IA_NS : 'guia_');
const CR_COLOCADO = crNS + 'ia_colocado', CR_MES = crNS + 'ia_mes', CR_SEM = crNS + 'ia_semcredito';
const crLe = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const crGrava = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const usd = (v) => 'US$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: v > 0 && v < 0.1 ? 3 : 2 });
const crMesAtual = () => new Date().toISOString().slice(0, 7);

/* servidor = nuvem + cofre configurados e ela logada */
function crNoServidor() {
  return !!(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.cofre && typeof temNuvem === 'function' && temNuvem()
    && typeof authToken === 'function' && authToken());
}
function crCab() { return typeof cofreCab === 'function' ? cofreCab() : { 'content-type': 'application/json' }; }

/* ---- o gasto medido neste aparelho (modo sem nuvem) ---- */
function crRegistraLocal(valor) {
  if (!(valor > 0)) return;
  const m = crLe(CR_MES, {});
  const mes = m.mes === crMesAtual() ? m : { mes: crMesAtual(), usd: 0, n: 0 };
  mes.usd += valor; mes.n += 1;
  crGrava(CR_MES, mes);
  crGrava(CR_SEM, '');
}
function crMarcaSemCreditoLocal() { crGrava(CR_SEM, new Date().toISOString()); }

let crCache = null;
async function crResumo(forca) {
  if (!forca && crCache && Date.now() - crCache.em < 20000) return crCache.r;
  let r;
  if (crNoServidor()) {
    try {
      const j = await fetch(APP_CONFIG.cofre + '/api/credito', { headers: crCab(), cache: 'no-store' }).then(x => x.json());
      r = { ...j.credito, onde: 'servidor' };
    } catch (e) { r = { conectada: false, erro: 'rede', onde: 'servidor' }; }
  } else {
    const chave = typeof iaChave === 'function' ? iaChave() : '';
    const col = +crLe(CR_COLOCADO, 0) || 0, gasto = +crLe(typeof IA_GASTO !== 'undefined' ? IA_GASTO : '', 0) || 0;
    const m = crLe(CR_MES, {});
    r = { conectada: !!chave, final: chave ? '…' + chave.slice(-4) : '', colocado: col, gasto,
      saldo: col ? Math.max(0, col - gasto) : null, mes: m.mes === crMesAtual() ? m : { usd: 0, n: 0 },
      semCredito: crLe(CR_SEM, ''), onde: 'aparelho' };
  }
  crCache = { em: Date.now(), r };
  return r;
}

/* ---- ações ---- */
async function crConectar(chave, colocado) {
  chave = String(chave || '').trim();
  if (!/^sk-ant-/.test(chave)) return 'A chave da Anthropic começa com sk-ant-. Confira se copiou inteira.';
  if (crNoServidor()) {
    const r = await fetch(APP_CONFIG.cofre + '/api/chave', { method: 'POST', headers: crCab(), body: JSON.stringify({ chave, colocado: +colocado || 0 }) })
      .then(x => x.json()).catch(() => ({ erro: 'rede' }));
    if (r.ok) { crCache = null; return ''; }
    return { sem_credito: 'Essa conta está sem crédito. Ponha crédito primeiro (passo 2).', chave_recusada: 'A Anthropic não aceitou essa chave. Copie de novo, inteira.', rede: 'Sem internet agora. Tente de novo.' }[r.erro] || 'Não deu certo agora (' + (r.erro || '?') + ').';
  }
  /* sem nuvem: testa direto e guarda neste aparelho */
  let r, j;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: typeof IA_MODELO !== 'undefined' ? IA_MODELO : 'claude-haiku-4-5', max_tokens: 1, messages: [{ role: 'user', content: 'oi' }] }) });
    j = await r.json().catch(() => null);
  } catch (e) { return 'Sem internet agora. Tente de novo.'; }
  if (!r.ok) {
    if (r.status === 400 && /credit balance/i.test((j && j.error && j.error.message) || '')) return 'Essa conta está sem crédito. Ponha crédito primeiro (passo 2).';
    if (r.status === 401) return 'A Anthropic não aceitou essa chave. Copie de novo, inteira.';
    return 'Não deu certo agora (erro ' + r.status + ').';
  }
  localStorage.setItem(IA_CHAVE, chave);
  crGrava(IA_GASTO, 0); crGrava(CR_COLOCADO, Math.max(0, +colocado || 0)); crGrava(CR_MES, {}); crGrava(CR_SEM, '');
  if (typeof iaSomaGasto === 'function') iaSomaGasto(j.usage);
  crCache = null;
  if (typeof iaAtualizaFab === 'function') iaAtualizaFab();
  return '';
}
async function crRecarga(valor) {
  valor = +String(valor || '').replace(',', '.');
  if (!(valor > 0)) return 'Diga quanto você colocou, em dólar (ex.: 10).';
  if (crNoServidor()) {
    const r = await fetch(APP_CONFIG.cofre + '/api/credito', { method: 'POST', headers: crCab(), body: JSON.stringify({ recarga: valor }) }).catch(() => null);
    if (!r || !r.ok) return 'Sem internet agora. Tente de novo.';
  } else { crGrava(CR_COLOCADO, (+crLe(CR_COLOCADO, 0) || 0) + valor); crGrava(CR_SEM, ''); }
  crCache = null; return '';
}
async function crDesconectar() {
  if (crNoServidor()) await fetch(APP_CONFIG.cofre + '/api/chave', { method: 'DELETE', headers: crCab() }).catch(() => {});
  else if (typeof IA_CHAVE !== 'undefined') localStorage.removeItem(IA_CHAVE);
  crCache = null;
  if (typeof iaAtualizaFab === 'function') iaAtualizaFab();
}

/* ---- o que mostrar ---- */
function crSituacao(r) {
  if (!r || !r.conectada) return { classe: 'off', curto: 'IA desligada', titulo: 'Desligado' };
  if (r.semCredito) return { classe: 'fim', curto: 'IA sem crédito', titulo: 'Crédito acabou' };
  if (r.saldo != null && r.saldo < 1) return { classe: 'baixo', curto: 'IA · resta ' + usd(r.saldo), titulo: 'Está acabando' };
  return { classe: 'ok', curto: r.saldo != null ? 'IA · resta ' + usd(r.saldo) : 'IA ligada', titulo: 'Ligado' };
}

/* cartão de Ajustes — o lugar único dos créditos */
function cartaoCreditos() {
  return `<section class="card crCard" id="creditos"><div id="crCorpo"><p class="why">…</p></div></section>`;
}
async function ligaCartaoCreditos() {
  const el = document.getElementById('crCorpo');
  if (!el) return;
  const r = await crResumo(true);
  const s = crSituacao(r);
  const alcance = r.onde === 'servidor'
    ? 'Vale para o <b>Assistente</b> e para o <b>Atendimento do Instagram</b>, em todos os seus aparelhos.'
    : 'Neste aparelho, liga o <b>Assistente</b>. O Atendimento do Instagram liga quando a nuvem do app estiver ativa — e aí a mesma chave vale para os dois.';
  const cabeca = `<h3>✦ Créditos de IA <span class="crTag ${s.classe}">${s.titulo}</span></h3>
    <p class="why">O Assistente e o Atendimento usam o Claude, da Anthropic. Você paga direto a eles, só pelo que usar — não tem mensalidade. ${alcance}</p>`;
  if (!r.conectada) {
    el.innerHTML = cabeca + `
      <ol class="crPassos">
        <li><b>Crie sua conta</b> na Anthropic <a href="${CR_LINK.conta}" target="_blank" rel="noopener">abrir ↗</a></li>
        <li><b>Ponha crédito</b> com seu cartão — US$ 10 é um bom começo. Anote quanto colocou. <a href="${CR_LINK.pagar}" target="_blank" rel="noopener">Pagamento ↗</a>
          <small>Dica: em <a href="${CR_LINK.limite}" target="_blank" rel="noopener">Limites ↗</a> você define um teto de gasto por mês.</small></li>
        <li><b>Crie uma chave</b> e copie <a href="${CR_LINK.chaves}" target="_blank" rel="noopener">Chaves ↗</a></li>
        <li><b>Cole aqui</b> e diga quanto colocou:</li>
      </ol>
      <div class="crForm">
        <input id="crChave" type="password" autocomplete="off" placeholder="sk-ant-…" aria-label="Chave da Anthropic">
        <label class="crValor">US$ <input id="crColocado" type="number" min="0" step="1" inputmode="decimal" placeholder="10" aria-label="Quanto você colocou, em dólar"></label>
        <button class="cta sm" id="crLigar">Ligar a IA</button>
      </div>
      <p class="why" id="crMsg"></p>`;
    document.getElementById('crLigar').onclick = async () => {
      const m = document.getElementById('crMsg'); m.textContent = 'Testando a chave…';
      const erro = await crConectar(document.getElementById('crChave').value, document.getElementById('crColocado').value);
      if (erro) { m.textContent = erro; return; }
      if (typeof toast === 'function') toast('IA ligada ✓');
      ligaCartaoCreditos(); crAtualizaPilulas();
    };
    return;
  }
  const pct = r.colocado ? Math.max(0, Math.min(100, (r.saldo / r.colocado) * 100)) : 0;
  el.innerHTML = cabeca + `
    <div class="crPainel ${s.classe}">
      ${r.semCredito ? `<p class="crAlarme">O crédito acabou. O Assistente parou e o Instagram voltou a ser respondido só por você. Ponha mais crédito e toque em “Coloquei mais”.</p>` : ''}
      <div class="crNumeros">
        <div class="crSaldo"><small>Ainda tem</small><b>${r.saldo != null ? '≈ ' + usd(r.saldo) : '—'}</b>
          <small>${r.colocado ? 'de ' + usd(r.colocado) + ' que você colocou' : 'diga quanto colocou para ver o saldo'}</small></div>
        <div class="crGasto"><small>Já usou</small><b>${usd(r.gasto)}</b>
          <small>este mês ${usd((r.mes || {}).usd)} · ${(r.mes || {}).n || 0} ${((r.mes || {}).n || 0) === 1 ? 'resposta' : 'respostas'}</small></div>
      </div>
      ${r.colocado ? `<div class="crBarra" role="img" aria-label="${Math.round(pct)}% do crédito ainda disponível"><i style="width:${pct}%"></i></div>` : ''}
      <small class="why">Estimativa pelo uso de cada resposta. O valor exato fica em <a href="${CR_LINK.pagar}" target="_blank" rel="noopener">Pagamento ↗</a>. Chave ${r.final}${r.peloSegredo ? ' (do servidor)' : ''}.</small>
    </div>
    <div class="btnrow crAcoes">
      <a class="cta sm" href="${CR_LINK.pagar}" target="_blank" rel="noopener">Pôr mais crédito ↗</a>
      <span class="crRecarga"><label>Coloquei mais US$ <input id="crMais" type="number" min="1" step="1" inputmode="decimal" placeholder="10"></label><button class="mini" id="crMaisOk">Somar</button></span>
    </div>
    <p class="why" id="crMsg"></p>
    ${r.peloSegredo ? '' : `<button class="mkLink" id="crTrocar" type="button">Trocar a chave</button>`}`;
  document.getElementById('crMaisOk').onclick = async () => {
    const erro = await crRecarga(document.getElementById('crMais').value);
    if (erro) { document.getElementById('crMsg').textContent = erro; return; }
    if (typeof toast === 'function') toast('Crédito somado ✓');
    ligaCartaoCreditos(); crAtualizaPilulas();
  };
  const tr = document.getElementById('crTrocar');
  if (tr) tr.onclick = async () => {
    if (!confirm('Desligar esta chave? O Assistente e o Atendimento param até você colar outra.')) return;
    await crDesconectar(); ligaCartaoCreditos(); crAtualizaPilulas();
  };
}

/* a pílula com o número, em todo lugar que usa IA (painel, assistente, atendimento) */
function pilulaCreditos() {
  return `<button type="button" class="crPilula" data-cr-pilula onclick="irParaCreditos()">✦ …</button>`;
}
function irParaCreditos() {
  if (typeof go === 'function') go('/adm/settings');
  setTimeout(() => { const c = document.getElementById('creditos'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250);
}
async function crAtualizaPilulas() {
  const ps = document.querySelectorAll('[data-cr-pilula]');
  if (!ps.length) return;
  const s = crSituacao(await crResumo());
  ps.forEach(p => { p.className = 'crPilula ' + s.classe; p.textContent = '✦ ' + s.curto; });
}
/* faixa que aparece no Assistente e no Atendimento quando falta chave ou crédito */
async function crFaixa(ondeId) {
  const el = document.getElementById(ondeId);
  if (!el) return;
  const r = await crResumo();
  const s = crSituacao(r);
  if (s.classe === 'ok') { el.innerHTML = ''; return; }
  const txt = s.classe === 'off' ? 'A IA ainda não está ligada. Leva poucos minutos: crie a conta na Anthropic, ponha crédito e cole a chave.'
    : s.classe === 'fim' ? 'O crédito de IA acabou — o Assistente e o robô do Instagram pararam.'
    : 'O crédito de IA está acabando: resta ' + usd(r.saldo) + '.';
  el.innerHTML = `<div class="crAviso ${s.classe}"><span>${txt}</span><button type="button" class="mini" onclick="irParaCreditos()">${s.classe === 'off' ? 'Ligar a IA' : 'Pôr crédito'}</button></div>`;
}
