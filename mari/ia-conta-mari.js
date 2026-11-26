/* =====================================================
   IA DO ASSISTENTE NA CONTA DA MARI (26/11/2026)
   O Eugênio: "R$ 250 suporte e hospedagem; crédito de IA é direto com a Claude: um botão direciona direto,
   ela pega a chave e põe ali no assistente facilmente" — e "mantém tudo pra ela funcionando ainda com a minha
   chave, mas já constrói tudo".

   Por isso este cartão fica ESCONDIDO até APP_CONFIG.iaPropria = true (config.js). Enquanto isso o assistente
   segue na conta da Ti Artes, como hoje. Ligado, ele aparece em Ajustes, logo abaixo do "Para ligar tudo":
     - sem chave: os 4 passos (conta, crédito, chave, colar aqui) com os botões que abrem a Claude na página
       certa, e o campo; o cofre TESTA a chave antes de guardar;
     - com chave: quanto o assistente usou no mês, "Pôr crédito ↗", testar a conta, trocar a chave.
   A chave fica no cofre (guia-cofre: atendimento-caixa, ação 'ia' → ia-propria.js iaDaDona), nunca no aparelho:
   vale no celular e no computador e nunca volta ao navegador. O cofre confere que é a dona logada (ehDona).
   Mesmo desenho do cartão da Yalla (app-yalla-novo/assistente-yalla.js, seção 12).
   ===================================================== */
'use strict';

const IAC_LINK = { conta: 'https://platform.claude.com/', pagar: 'https://platform.claude.com/settings/billing', chaves: 'https://platform.claude.com/settings/keys' };
const iacLigado = () => !!(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.iaPropria === true && COFRE && CLIENTE_COFRE === 'mari');
let iac = null, iacEm = 0, iacErro = '', iacCarregando = false, iacOcupado = false, iacTrocando = false, iacMsg = '', iacRascunho = '';
const iacUsd = (v) => 'US$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: v > 0 && v < 0.1 ? 3 : 2 });

/* quando o crédito de quem paga acaba, a mensagem certa para cada caso */
(function () {
  if (typeof IA_TXT === 'undefined' || !IA_TXT.eCredito) return;
  IA_TXT.eCredito = iacLigado()
    ? { pt: 'Acabou o crédito da sua conta na Claude. Ponha crédito (em Ajustes → IA do assistente → "Pôr crédito") e o assistente volta na hora.', en: 'Your Claude account ran out of credit. Add credit in Settings → Assistant AI.' }
    : { pt: 'A IA do assistente está sem crédito agora (é a conta da Ti Artes). Avise o Eugênio, que ele resolve.', en: 'The assistant AI is out of credit right now (Ti Artes account). Let Eugênio know.' };
})();

async function iacPede(op, extra) {
  if (typeof authVencida === 'function' && authVencida() && typeof authEnsure === 'function') { try { await authEnsure(); } catch (e) {} }
  const tok = typeof authToken === 'function' ? authToken() : '';
  try {
    const r = await fetch(COFRE + '/api/atendimento-caixa', { method: 'POST', cache: 'no-store',
      headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) },
      body: JSON.stringify({ cliente: CLIENTE_COFRE, acao: 'ia', op, ...(extra || {}) }) });
    return { r, j: await r.json().catch(() => null) };
  } catch (e) { return { r: null, j: null }; }
}
/* resposta que não é desta conversa (cofre ainda sem a Mari): não pode virar "sem chave" */
const iacValida = (j) => !!(j && typeof j.tem_chave === 'boolean');
function iacErroTxt(r, j) {
  return !r ? 'Sem conexão agora. Tente de novo em instantes.'
    : r.status === 401 ? 'Entre de novo no app com a sua conta e tente outra vez.'
    : (r.status === 404 || (j && j.erro === 'acao') || (r.ok && !iacValida(j))) ? 'A IA própria ainda não está ligada no servidor. Fale com o Eugênio.'
    : (j && j.msg) ? j.msg
    : 'Não deu certo agora. Tente de novo em instantes.';
}
async function iacCarrega() {
  if (iacCarregando) return;
  iacCarregando = true;
  const { r, j } = await iacPede('ver');
  iacCarregando = false; iacEm = Date.now();
  if (r && r.ok && iacValida(j)) { iac = j; iacErro = ''; } else iacErro = iacErroTxt(r, j);
  iacPoe();
}
function iacCartao() {
  if (!iacLigado() || !(typeof isLoggedIn === 'function' && isLoggedIn())) return '';
  const s = iac, pagar = `<a class="cta sm iacPagar" href="${IAC_LINK.pagar}" target="_blank" rel="noopener">Pôr crédito ↗</a>`;
  let tag = '', corpo;
  if (!s) {
    corpo = iacErro ? `<p class="iacErro">${esc(iacErro)}</p><button type="button" class="linkbtn" data-iac="de-novo">tentar de novo</button>` : '<p>Conferindo…</p>';
  } else if (!s.tem_chave || iacTrocando) {
    tag = s.tem_chave ? '<span class="iacTag">trocando a chave</span>' : '<span class="iacTag">usando a conta da Ti Artes</span>';
    corpo = `<p>O assistente do painel usa a IA da Claude (Anthropic). Para ele usar a <b>sua</b> conta, você põe crédito lá, com o seu cartão, e cola a chave aqui. Leva uns 5 minutos. No seu uso de hoje, são uns US$ 8 por mês.</p>
      <ol class="iacPassos">
        <li><b>Crie a conta</b> na Claude. <a href="${IAC_LINK.conta}" target="_blank" rel="noopener">Abrir ↗</a></li>
        <li><b>Ponha crédito</b>: US$ 10 é um bom começo. Ligue a <b>recarga automática</b> e ele não acaba. <a href="${IAC_LINK.pagar}" target="_blank" rel="noopener">Pagamento ↗</a></li>
        <li><b>Crie uma chave</b> ("Create key") e copie. <a href="${IAC_LINK.chaves}" target="_blank" rel="noopener">Chaves ↗</a></li>
        <li><b>Cole aqui</b>. O app testa a chave antes de guardar.</li></ol>
      <div class="iacForm"><input id="iacChave" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-api…" aria-label="Chave da Claude">
        <button type="button" class="cta sm" data-iac="salvar" ${iacOcupado ? 'disabled' : ''}>${iacOcupado ? 'Testando…' : 'Ligar'}</button>
        ${iacTrocando ? '<button type="button" class="linkbtn" data-iac="cancela">cancelar</button>' : ''}</div>`;
  } else {
    const a = s.assistente || {}, n = +a.pedidos || 0;
    tag = `<span class="iacTag ok">ligada · chave …${esc(s.final || '')}</span>`;
    corpo = `<p>O assistente usa a <b>sua</b> conta na Claude. Este mês ele fez <b>${n} ${n === 1 ? 'pedido' : 'pedidos'}</b> à IA${a.usd ? `, ≈ ${iacUsd(a.usd)}` : ''}.</p>
      <div class="iacAcoes">${pagar}<button type="button" class="mini" data-iac="testar" ${iacOcupado ? 'disabled' : ''}>${iacOcupado ? 'testando…' : 'testar a conta'}</button><button type="button" class="linkbtn" data-iac="trocar">trocar a chave</button></div>
      <small>O saldo exato fica na sua conta da Claude, em Pagamento. O número aqui é a estimativa que o app mede.</small>`;
  }
  return `<section class="card iac" id="iaConta" aria-live="polite"><div class="iacTopo"><h3>✦ IA do assistente</h3>${tag}</div>${corpo}${iacMsg ? `<p class="iacMsg">${iacMsg}</p>` : ''}</section>`;
}
function iacPoe() {
  const velho = document.getElementById('iaConta'); if (velho) velho.remove();
  const h = iacCartao(); if (!h) return;
  const ref = document.getElementById('ligarCard'), stage = document.querySelector('.stage, main, #app');
  if (ref) ref.insertAdjacentHTML('afterend', h); else if (stage) stage.insertAdjacentHTML('afterbegin', h); else return;
  document.querySelectorAll('[data-iac]').forEach(b => b.onclick = () => iacAcao(b.dataset.iac));
  const inp = document.getElementById('iacChave');
  if (inp) { inp.value = iacRascunho; inp.oninput = () => { iacRascunho = inp.value; }; inp.onkeydown = (e) => { if (e.key === 'Enter') iacAcao('salvar'); }; }
  /* lê do cofre na 1ª vez e de novo se o que tem é de mais de 2 min (ela pode ter posto crédito noutra aba) */
  if (!iacErro && !iacCarregando && !iacOcupado && (!iac || Date.now() - iacEm > 120000)) iacCarrega();
}
async function iacAcao(a) {
  if (a === 'de-novo') { iacErro = ''; iacMsg = ''; return iacPoe(); }
  if (a === 'trocar') { iacTrocando = true; iacMsg = ''; iacRascunho = ''; return iacPoe(); }
  if (a === 'cancela') { iacTrocando = false; iacMsg = ''; iacRascunho = ''; return iacPoe(); }
  if (iacOcupado) return;
  if (a === 'salvar') {
    const chave = String(iacRascunho || '').trim();
    if (!chave) { iacMsg = '<span class="iacErro">Cole a chave no campo (ela começa com sk-ant-api).</span>'; return iacPoe(); }
    iacOcupado = true; iacMsg = ''; iacPoe();
    const { r, j } = await iacPede('salvar', { chave });
    iacOcupado = false;
    if (r && r.ok && iacValida(j) && j.salvou) {
      iac = j; iacEm = Date.now(); iacTrocando = false; iacRascunho = '';
      iacMsg = '<span class="iacOk">✓ Pronto: o assistente já usa o crédito da sua conta.</span>';
      if (typeof toast === 'function') toast('IA do assistente ligada na sua conta');
    } else iacMsg = `<span class="iacErro">${esc(iacErroTxt(r, j))}</span>`;
    return iacPoe();
  }
  if (a === 'testar') {
    iacOcupado = true; iacMsg = ''; iacPoe();
    const { r, j } = await iacPede('testar');
    iacOcupado = false;
    if (r && r.ok && iacValida(j)) {
      iac = j; iacEm = Date.now();
      iacMsg = j.teste && j.teste.ok ? '<span class="iacOk">✓ A sua conta respondeu: o assistente está usando o seu crédito.</span>'
        : `<span class="iacErro">A conta não respondeu: ${esc((j.teste && j.teste.texto) || 'sem motivo')}.</span>`;
    } else iacMsg = `<span class="iacErro">${esc(iacErroTxt(r, j))}</span>`;
    return iacPoe();
  }
}
/* em Ajustes, logo abaixo do "Para ligar tudo" */
if (typeof admSettings === 'function') {
  const _admSettingsIac = admSettings;
  admSettings = function () { _admSettingsIac.apply(this, arguments); try { iacPoe(); } catch (e) {} };
}
/* o "conectar" do assistente leva ao cartão (só com a IA própria ligada; senão fica como era) */
if (iacLigado()) {
  window.irParaCreditos = function () {
    if (typeof go === 'function') go('/adm/settings'); else location.hash = '#/adm/settings';
    setTimeout(() => { const el = document.getElementById('iaConta'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 450);
  };
}
(function () {
  if (typeof document === 'undefined' || document.getElementById('iacCss')) return;
  const st = document.createElement('style'); st.id = 'iacCss';
  st.textContent = `.iac{margin:12px 0}.iac p{margin:6px 0}.iac small{display:block;color:var(--ink-3,#6b6b6b);font-size:13px;margin-top:6px}
.iacTopo{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.iacTopo h3{margin:0}
.iacTag{font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;background:var(--accent-wash,#f3ecda);color:var(--ink,#231f1b);border:1px solid var(--line,#dccb9e)}
.iacTag.ok{background:var(--ok-wash,#e3ede6);color:var(--ok,#2e6b4f);border-color:transparent}
.iacPassos{margin:6px 0 10px;padding-left:20px}.iacPassos li{margin:6px 0}
.iacPassos a{white-space:nowrap;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.iacForm{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.iacForm input{flex:1 1 220px;min-width:0;min-height:44px;padding:8px 12px;border-radius:10px;border:1px solid var(--line,#d9d2c3);background:var(--card,#fff);color:inherit;font:inherit}
.iacAcoes{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
.iacErro{color:var(--danger,#a3053f)}.iacOk{color:var(--ok,#2e6b4f);font-weight:600}`;
  document.head.appendChild(st);
})();
