/* =====================================================
   COMUNICAÇÃO — a rede de mensagens da Freddy Turismo (14/10/2026)

   Pedido do Roberto: um "WhatsApp/Telegram" só dele dentro do app.
   - Painel → aba Comunicação: os clientes cadastrados viram contatos; cada
     um tem a sua conversa com histórico. A mensagem que ele manda "no app"
     chega no celular do cliente como NOTIFICAÇÃO (push) e fica guardada
     dos dois lados.
   - Aviso para vários: todos com o app, quem viaja esta semana, quem tem
     transfer/tour amanhã, ou quem ele marcar.
   - A mesma mensagem também pode sair pelo WhatsApp (abre com o texto
     pronto) e pelo Instagram (abre a conversa; o texto vai copiado).
   - ✨ IA escreve: ele diz o assunto, a IA monta a mensagem, ele revisa.
   - 📝 Resumo da conversa → WhatsApp: o que foi combinado, num toque.
   - Vitrine → Mensagens: o lado do cliente, com o histórico e o botão para
     ligar as notificações.

   PROTÓTIPO (sem nuvem): tudo mora em DB.conversas, no aparelho. A
   notificação é mostrada de verdade neste aparelho (se a pessoa permitir),
   para dar a sensação de como chega no cliente.
   NA ENTREGA (com nuvem): tabela `mensagens` no Supabase (RLS: o cliente lê
   só a conversa dele; o Roberto lê todas), Realtime para a conversa abrir
   ao vivo, e o push sai pela mesma rota do cofre que já avisa reserva nova
   (/api/avisar + push_subs), com url './#/mensagens'.
   Instagram pela API da Meta: só responde quem escreveu para a conta dele
   nas últimas 24h (regra da Meta) — mensagem "fria" não existe.
   ===================================================== */
'use strict';

/* ---------- aba no painel ---------- */
Object.assign(STR, { admComunicacao: { pt: 'Comunicação', en: 'Messages' } });
(function abaComunicacao() {
  if (!ADM_TABS.some(([x]) => x === 'comunicacao')) {
    const i = ADM_TABS.findIndex(([x]) => x === 'clients');
    ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['comunicacao', 'admComunicacao']);
  }
  /* no menu agrupado (carol-adm.js), logo depois de Clientes */
  if (typeof NAV_GRUPOS !== 'undefined') {
    const g = NAV_GRUPOS.find(([t2]) => t2 === 'Clientes');
    if (g && !g[1].includes('comunicacao')) g[1].splice(g[1].indexOf('clients') + 1, 0, 'comunicacao');
  }
})();
const _viewAdmCom = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'comunicacao') return admComunicacao(arg ? decodeURIComponent(arg) : '');
  return _viewAdmCom(tab, arg);
};
const _rotaExtraCom = rotaExtra;
rotaExtra = function (p) {
  if (p[0] === 'mensagens') { viewMensagensCliente(); return true; }
  return _rotaExtraCom(p);
};

/* ---------- dados ---------- */
const comGrava = () => { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) { } };
const comHora = (iso) => {
  const d = new Date(iso), hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const comId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const CANAL = { app: '🔔 no app', whats: 'WhatsApp', insta: 'Instagram', aviso: '📣 aviso' };

function comConversas() { if (!DB.conversas) DB.conversas = {}; return DB.conversas; }
function conversaDe(id) {
  const c = comConversas();
  if (!c[id]) c[id] = { app: false, push: false, msgs: [] };
  return c[id];
}
/* contatos = as fichas de cliente (fichas.js), com a conversa de cada um */
function contatosCom() {
  const fs = typeof fichasTodas === 'function' ? fichasTodas() : [];
  /* quem se cadastrou no app e ainda não reservou também é contato */
  for (const k of DB.clientesApp || []) {
    if (fs.some(f => f.id === k.id || (soDig(k.whats).length >= 8 && soDig(f.whats) === soDig(k.whats)))) continue;
    fs.push({ id: k.id, nome: k.nome, whats: k.whats, email: k.email, insta: '', itens: [], notas: {}, proximo: null, vezes: 0, total: 0, pago: 0, aReceber: 0, origem: 'app' });
  }
  return fs.map(f => {
    const c = (DB.conversas || {})[f.id] || { app: false, push: false, msgs: [] };
    const ult = c.msgs[c.msgs.length - 1] || null;
    const naoLidas = c.msgs.filter(m => m.de === 'cliente' && !m.lida).length;
    return { f, c, ult, naoLidas };
  }).sort((a, b) => (b.naoLidas - a.naoLidas) || String((b.ult || {}).em || '').localeCompare(String((a.ult || {}).em || '')) || (b.c.app - a.c.app));
}
function comNaoLidas() { return Object.values(DB.conversas || {}).reduce((s, c) => s + c.msgs.filter(m => m.de === 'cliente' && !m.lida).length, 0); }

/* exemplo do protótipo: conversas parecidas com as do dia a dia dele */
function comSemeia() {
  if (DB.conversas || !DB.demo) return;
  const fs = typeof fichasTodas === 'function' ? fichasTodas() : [];
  const acha = (nome) => fs.find(f => String(f.nome).startsWith(nome));
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  const c = comConversas();
  const poe = (nome, app, push, msgs) => { const f = acha(nome); if (!f) return; c[f.id] = { app, push, msgs: msgs.map(m => ({ id: comId(), lida: true, vista: true, ...m })) }; };
  poe('Mariana', true, true, [
    { de: 'roberto', canal: 'app', em: ago(60 * 26), txt: 'Olá, Mariana! Aqui é o Roberto, da Freddy Turismo 😊 Seu City Tour está confirmado. Vou buscar vocês no Park Plaza Westminster Bridge às 8h.' },
    { de: 'cliente', canal: 'app', em: ago(60 * 25), txt: 'Perfeito, Roberto! Somos 4, com uma mala de mão só. Dá pra ver a Troca da Guarda?' },
    { de: 'roberto', canal: 'app', em: ago(60 * 25 - 5), txt: 'Dá sim! Nesse dia tem Troca da Guarda às 11h. Já deixo o roteiro montado para chegar com tempo de pegar um bom lugar.' },
    { de: 'cliente', canal: 'app', em: ago(14), txt: 'Roberto, a minha mãe tem dificuldade com escada. Tem problema?', lida: false },
  ]);
  poe('Ricardo', true, false, [
    { de: 'roberto', canal: 'app', em: ago(60 * 50), txt: 'Olá, Ricardo! Seu bate-volta Windsor, Stonehenge e Salisbury está confirmado. Saída às 8h do The Tower Hotel.' },
    { de: 'cliente', canal: 'whats', em: ago(60 * 49), txt: 'Obrigado! Os ingressos do castelo a gente compra antes?' },
    { de: 'roberto', canal: 'whats', em: ago(60 * 48), txt: 'Isso, compre antes no site oficial, é mais barato. Mando o link aqui.' },
  ]);
  poe('Fernanda', true, true, [
    { de: 'roberto', canal: 'aviso', em: ago(60 * 70), txt: '📣 Lembrete da Freddy Turismo: os ingressos dos estúdios Harry Potter esgotam rápido em outubro. Se ainda não comprou, compre agora e me mande o horário 😉' },
    { de: 'cliente', canal: 'app', em: ago(60 * 69), txt: 'Comprei! 10h30 do dia combinado. As crianças estão eufóricas 🧙' },
  ]);
  poe('Paula', true, true, []);
  poe('Juliana', false, false, []);
  comGrava();
}

/* ---------- IA: escrever e resumir ---------- */
function comContexto(f) {
  const p = f && f.proximo, x = p ? (Tours.get(p.ref.tourId) || { name: { pt: '' } }) : null;
  const n = (f && f.notas) || {};
  return [
    f ? 'Cliente: ' + f.nome : '',
    p ? `Próximo serviço: ${tl(x.name)} em ${dtBR(p.ref.date)} às ${p.ref.time}, ${p.ref.pax} pessoas${p.ref.hotel ? ', busca em ' + p.ref.hotel : ''}.` : '',
    p ? `Pago: ${eur(Bookings.paid(p.ref))} de ${eur(p.ref.total)}.` : '',
    n.mobilidade ? 'Mobilidade: ' + n.mobilidade : '', n.idades ? 'Grupo: ' + n.idades : '', n.notas ? 'Notas: ' + n.notas : '',
  ].filter(Boolean).join('\n');
}
async function comPedeIA(system, pedido) {
  const modo = typeof iaModo === 'function' ? iaModo() : 'demo';
  if (modo === 'demo') return null;
  try {
    const corpo = { max_tokens: 700, system, messages: [{ role: 'user', content: pedido }] };
    const r = modo === 'vivo'
      ? await fetch(COFRE + '/api/claude', { method: 'POST', headers: cofreCab(), body: JSON.stringify({ ...corpo, ...((APP_CONFIG || {}).clienteCofre ? { cliente: APP_CONFIG.clienteCofre } : {}) }) })
      : await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': iaChave(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: IA_MODELO, ...corpo }) });
    if (!r.ok) return null;
    const j = await r.json();
    return ((j.content || []).find(b => b.type === 'text') || {}).text || null;
  } catch (e) { return null; }
}
const COM_VOZ = 'Você escreve mensagens do Roberto, dono da Freddy Turismo (transfers e passeios privativos de Mercedes em Londres, motorista-guia brasileiro), para clientes brasileiros. Tom: caloroso, educado, direto, frases curtas, 1 ou 2 emojis no máximo. Português do Brasil. Nunca invente preço, horário ou endereço que não esteja no contexto. Responda só com o texto da mensagem, sem aspas.';
/* sem IA disponível (protótipo offline): um rascunho honesto a partir do assunto e da ficha */
function comRascunhoLocal(assunto, f) {
  const nome = f ? primeiroNome(f.nome) : '';
  const p = f && f.proximo, x = p ? (Tours.get(p.ref.tourId) || { name: { pt: '' } }) : null;
  let txt = `Olá${nome ? ', ' + nome : ''}! Aqui é o Roberto, da Freddy Turismo 😊\n\n`;
  txt += assunto.trim().replace(/^./, c => c.toUpperCase()).replace(/\.?$/, '.') + '\n';
  if (p) txt += `\n🚘 ${tl(x.name)} · ${diaCurto(p.ref.date)} às ${p.ref.time}${p.ref.hotel ? '\n📍 Busca: ' + p.ref.hotel : ''}\n`;
  txt += '\nQualquer dúvida, é só responder aqui. Até breve!';
  return txt;
}
async function comEscreve(assunto, f) {
  const ctx = comContexto(f);
  const ia = await comPedeIA(COM_VOZ, `Escreva uma mensagem curta para mandar ao cliente pelo app.\nAssunto: ${assunto}\n\nContexto:\n${ctx || '(mensagem para vários clientes; não cite nomes)'}`);
  return ia || comRascunhoLocal(assunto, f);
}
function comResumoLocal(f, msgs) {
  const ult = msgs.slice(-8);
  const linhas = ult.map(m => `• ${m.de === 'roberto' ? 'Roberto' : primeiroNome(f.nome)}: ${m.txt.replace(/\s+/g, ' ').slice(0, 140)}${m.txt.length > 140 ? '…' : ''}`);
  const p = f.proximo, x = p ? (Tours.get(p.ref.tourId) || { name: { pt: '' } }) : null;
  return `Olá, ${primeiroNome(f.nome)}! Segue o resumo do que combinamos:\n\n${linhas.join('\n')}`
    + (p ? `\n\n🚘 ${tl(x.name)} · ${dtBR(p.ref.date)} às ${p.ref.time}${p.ref.hotel ? ' · busca: ' + p.ref.hotel : ''}` : '')
    + '\n\nRoberto · Freddy Turismo';
}
async function comResumo(f, msgs) {
  const conversa = msgs.map(m => `${m.de === 'roberto' ? 'Roberto' : f.nome} (${comHora(m.em)}): ${m.txt}`).join('\n');
  const ia = await comPedeIA(COM_VOZ, `Faça um RESUMO do que foi combinado nesta conversa, para mandar ao cliente pelo WhatsApp. Comece com "Olá, ${primeiroNome(f.nome)}! Segue o resumo do que combinamos:" e use tópicos curtos (data, hora, local, o que levar, pendências). Assine "Roberto · Freddy Turismo".\n\nContexto:\n${comContexto(f)}\n\nConversa:\n${conversa}`);
  return ia || comResumoLocal(f, msgs);
}

/* ---------- enviar ---------- */
/* notificação de verdade NESTE aparelho (protótipo): é assim que chega no cliente */
async function comNotifica(titulo, corpo, url) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    const op = { body: corpo, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'msg', renotify: true, data: { url: url || './#/mensagens' } };
    if (reg) await reg.showNotification(titulo, op); else new Notification(titulo, op);
    return true;
  } catch (e) { return false; }
}
function comEnviaApp(id, txt, canal = 'app', quieto = false) {
  const c = conversaDe(id);
  c.msgs.push({ id: comId(), de: 'roberto', canal, em: new Date().toISOString(), txt, lida: true });
  comGrava();
  if (c.app && !quieto) comNotifica('Freddy Turismo · Roberto', txt.length > 140 ? txt.slice(0, 137) + '…' : txt, './#/mensagens');
  return c;
}
function comLinkInsta(f) { const u = String(f.insta || '').replace(/^@/, ''); return u ? 'https://ig.me/m/' + encodeURIComponent(u) : 'https://www.instagram.com/direct/inbox/'; }
async function comCopia(txt) { try { await navigator.clipboard.writeText(txt); return true; } catch (e) { return false; } }

/* =====================================================
   PAINEL → COMUNICAÇÃO
   ===================================================== */
let comBusca = '';
function admComunicacao(arg) {
  comSemeia();
  if (arg === 'aviso') return comAviso();
  const lista = contatosCom();
  const comApp = lista.filter(x => x.c.app).length, comPush = lista.filter(x => x.c.push).length;
  const aberto = arg ? lista.find(x => x.f.id === arg) : null;
  const filtrados = lista.filter(x => !comBusca || minusc(x.f.nome).includes(minusc(comBusca)));
  admShell('comunicacao', `
    <div class="pagehead"><h1 class="pageh">Comunicação</h1>
      <button class="cta sm" id="comAvisoBtn">📣 Aviso para vários</button></div>
    <p class="why">A sua rede de mensagens com os clientes. O que você manda <b>no app</b> chega no celular do cliente como notificação e fica guardado aqui, com o histórico — como no WhatsApp. ${comApp} ${comApp === 1 ? 'cliente tem' : 'clientes têm'} o app · ${comPush} com notificação ligada.</p>
    <div class="comGrade ${aberto ? 'comAberto' : ''}">
      <aside class="comLista" aria-label="Contatos">
        <input class="comBusca" id="comBusca" type="search" placeholder="Buscar cliente…" value="${esc(comBusca)}">
        ${filtrados.length ? filtrados.map(x => `
          <button class="comItem ${aberto && aberto.f.id === x.f.id ? 'on' : ''}" data-com="${esc(x.f.id)}">
            <span class="comAv" aria-hidden="true">${esc(String(x.f.nome || '?').trim()[0] || '?')}</span>
            <span class="comTx"><b>${esc(x.f.nome)}</b>
              <small>${x.ult ? (x.ult.de === 'roberto' ? 'Você: ' : '') + esc(x.ult.txt.slice(0, 60)) : (x.c.app ? 'Tem o app — comece a conversa' : 'Ainda não baixou o app')}</small></span>
            <span class="comMeta">${x.ult ? `<small>${comHora(x.ult.em)}</small>` : ''}
              ${x.naoLidas ? `<i class="comBadge">${x.naoLidas}</i>` : x.c.push ? '<i class="comSino" title="Notificação ligada">🔔</i>' : x.c.app ? '<i class="comSino off" title="Tem o app, notificação desligada">📱</i>' : ''}</span>
          </button>`).join('') : '<p class="empty">Nenhum cliente com esse nome.</p>'}
      </aside>
      <section class="comChat" aria-label="Conversa">${aberto ? comChatHtml(aberto) : `<div class="comVazio"><b>Escolha um cliente</b><small>Toda reserva, roteiro ou vale-presente vira um contato aqui. Quem baixou o app recebe as suas mensagens como notificação.</small></div>`}</section>
    </div>`);
  $('#comAvisoBtn').onclick = () => go('/adm/comunicacao/aviso');
  const busca = $('#comBusca');
  busca.oninput = () => { comBusca = busca.value; admComunicacao(arg); const b = $('#comBusca'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); };
  $$('[data-com]').forEach(b => b.onclick = () => go('/adm/comunicacao/' + encodeURIComponent(b.dataset.com)));
  if (aberto) comLigaChat(aberto);
}

function comBolhas(msgs, euSou) {
  if (!msgs.length) return '<p class="comInicio">Nenhuma mensagem ainda.</p>';
  let dia = '';
  return msgs.map(m => {
    const d = String(m.em).slice(0, 10);
    const sep = d !== dia ? `<p class="comDia">${diaCurto(d)}</p>` : '';
    dia = d;
    const minha = m.de === euSou;
    return `${sep}<div class="comMsg ${minha ? 'eu' : 'ele'} ${m.canal === 'aviso' ? 'aviso' : ''}">
      <p>${esc(m.txt).replace(/\n/g, '<br>')}</p>
      <small>${comHora(m.em)}${m.canal && m.canal !== 'app' ? ' · ' + CANAL[m.canal] : ''}${minha && euSou === 'roberto' ? ' ✓✓' : ''}</small></div>`;
  }).join('');
}

function comChatHtml(x) {
  const { f, c } = x;
  return `
    <header class="comCab">
      <button class="mini comVolta" id="comVolta" aria-label="Voltar aos contatos">←</button>
      <span class="comAv" aria-hidden="true">${esc(String(f.nome).trim()[0] || '?')}</span>
      <div class="comQuem"><b>${esc(f.nome)}</b><small>${c.app ? (c.push ? '🔔 Recebe notificação do app' : '📱 Tem o app · notificação desligada') : 'Ainda não baixou o app — use WhatsApp ou Instagram'}</small></div>
      <a class="mini" href="#/adm/clients/${encodeURIComponent(f.id)}">Ficha</a>
    </header>
    <div class="comMsgs" id="comMsgs">${comBolhas(c.msgs, 'roberto')}</div>
    <div class="comCompor">
      <div class="comIA" id="comIABox" hidden>
        <input id="comAssunto" placeholder="Sobre o quê? Ex.: lembrar o horário e o ponto de busca de amanhã">
        <button class="mini" id="comIAOk">Escrever</button>
      </div>
      <textarea id="comTxt" rows="3" placeholder="Escreva para ${esc(primeiroNome(f.nome))}…"></textarea>
      <div class="comBtns">
        <button class="mini" id="comIA">✨ IA escreve</button>
        <span class="comEsp"></span>
        <button class="mini" id="comInsta" title="Abre a conversa no Instagram com o texto copiado">Instagram</button>
        <button class="mini comWa" id="comWa" ${f.whats ? '' : 'disabled'}>WhatsApp</button>
        <button class="cta sm" id="comApp" ${c.app ? '' : 'disabled title="O cliente ainda não tem o app"'}>Enviar no app 🔔</button>
      </div>
      <button class="comResumo" id="comResumo" ${c.msgs.length && f.whats ? '' : 'disabled'}>📝 Mandar o resumo da conversa pelo WhatsApp</button>
      ${c.app ? '' : `<p class="why">Quando ${esc(primeiroNome(f.nome))} instalar o app, as mensagens passam a chegar como notificação. Mande o convite: <a target="_blank" rel="noopener" href="${esc(waLink('Olá, ' + primeiroNome(f.nome) + '! Aqui é o Roberto, da Freddy Turismo. Pelo nosso app você recebe os avisos da sua viagem e fala comigo direto: ' + location.origin + location.pathname + '#/mensagens', soDig(f.whats)))}">convite pelo WhatsApp</a>.</p>`}
    </div>`;
}

function comLigaChat(x) {
  const { f } = x;
  const c = conversaDe(f.id);
  let mudou = false;
  c.msgs.forEach(m => { if (m.de === 'cliente' && !m.lida) { m.lida = true; mudou = true; } });
  if (mudou) comGrava();
  const box = $('#comMsgs'); box.scrollTop = box.scrollHeight;
  const txt = $('#comTxt');
  $('#comVolta').onclick = () => go('/adm/comunicacao');
  $('#comIA').onclick = () => { const b = $('#comIABox'); b.hidden = !b.hidden; if (!b.hidden) $('#comAssunto').focus(); };
  const escrever = async () => {
    const a = $('#comAssunto').value.trim(); if (!a) { $('#comAssunto').focus(); return; }
    const bt = $('#comIAOk'); bt.disabled = true; bt.textContent = 'Escrevendo…';
    txt.value = await comEscreve(a, f);
    bt.disabled = false; bt.textContent = 'Escrever de novo';
    txt.focus();
  };
  $('#comIAOk').onclick = escrever;
  $('#comAssunto').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); escrever(); } };
  const pega = () => { const v = txt.value.trim(); if (!v) { toast('Escreva a mensagem primeiro.'); txt.focus(); } return v; };
  $('#comApp').onclick = () => { const v = pega(); if (!v) return; comEnviaApp(f.id, v); toast(c.push ? 'Enviada — chegou como notificação 🔔' : 'Enviada no app'); admComunicacao(f.id); };
  $('#comWa').onclick = () => {
    const v = pega(); if (!v) return;
    window.open(waLink(v, soDig(f.whats)), '_blank', 'noopener');
    comEnviaApp(f.id, v, 'whats'); admComunicacao(f.id);
  };
  $('#comInsta').onclick = async () => {
    const v = pega(); if (!v) return;
    await comCopia(v);
    window.open(comLinkInsta(f), '_blank', 'noopener');
    toast('Texto copiado — cole na conversa do Instagram');
    comEnviaApp(f.id, v, 'insta'); admComunicacao(f.id);
  };
  $('#comResumo').onclick = async () => {
    const b = $('#comResumo'); b.disabled = true; b.textContent = 'Montando o resumo…';
    /* a janela abre já, para o navegador não bloquear; o texto entra quando a IA responde */
    const w = window.open('', '_blank');
    const r = await comResumo(f, conversaDe(f.id).msgs);
    const link = waLink(r, soDig(f.whats));
    if (w) w.location = link; else location.href = link;
    b.disabled = false; b.textContent = '📝 Mandar o resumo da conversa pelo WhatsApp';
  };
}

/* ---------- aviso para vários ---------- */
function comGrupos() {
  const lista = contatosCom().filter(x => x.c.app);
  const hoje = isoToday(), amanha = addDays(hoje, 1), semana = addDays(hoje, 7);
  const prox = (x) => x.f.proximo && x.f.proximo.ref.date;
  return [
    { id: 'todos', nome: 'Todos com o app', quem: lista },
    { id: 'amanha', nome: 'Quem tem serviço amanhã', quem: lista.filter(x => prox(x) === amanha) },
    { id: 'semana', nome: 'Quem viaja nos próximos 7 dias', quem: lista.filter(x => prox(x) && prox(x) >= hoje && prox(x) <= semana) },
    { id: 'antigos', nome: 'Quem já viajou (para voltar)', quem: lista.filter(x => !x.f.proximo && x.f.vezes > 0) },
  ];
}
let comGrupoSel = 'todos';
function comAviso() {
  const gs = comGrupos(), g = gs.find(z => z.id === comGrupoSel) || gs[0];
  admShell('comunicacao', `
    <button class="mini" id="avVolta">← Conversas</button>
    <h1 class="pageh">Aviso para vários</h1>
    <p class="why">A mensagem entra na conversa de cada um e chega como notificação no celular de quem ligou os avisos. Ninguém vê quem mais recebeu.</p>
    <div class="chips">${gs.map(z => `<button class="chip ${z.id === g.id ? 'on' : ''}" data-grp="${z.id}">${esc(z.nome)} · ${z.quem.length}</button>`).join('')}</div>
    <div class="card comAvisoCard">
      <p class="comPara"><b>Para:</b> ${g.quem.length ? g.quem.map(x => esc(x.f.nome)).join(', ') : '<em>ninguém neste grupo ainda</em>'}</p>
      <div class="comIA"><input id="comAssunto" placeholder="Sobre o quê? Ex.: greve do metrô amanhã, saio 30 min mais cedo"><button class="mini" id="comIAOk">✨ IA escreve</button></div>
      <textarea id="comTxt" rows="5" placeholder="Escreva o aviso…"></textarea>
      <div class="comBtns"><span class="comEsp"></span><button class="cta sm" id="avManda" ${g.quem.length ? '' : 'disabled'}>📣 Mandar para ${g.quem.length} ${g.quem.length === 1 ? 'pessoa' : 'pessoas'}</button></div>
    </div>`);
  $('#avVolta').onclick = () => go('/adm/comunicacao');
  $$('[data-grp]').forEach(b => b.onclick = () => { comGrupoSel = b.dataset.grp; comAviso(); });
  const escrever = async () => {
    const a = $('#comAssunto').value.trim(); if (!a) { $('#comAssunto').focus(); return; }
    const bt = $('#comIAOk'); bt.disabled = true; bt.textContent = 'Escrevendo…';
    $('#comTxt').value = await comEscreve(a + ' (aviso para vários clientes de uma vez; comece com "Olá!" sem nome)', null);
    bt.disabled = false; bt.textContent = '✨ Escrever de novo';
  };
  $('#comIAOk').onclick = escrever;
  $('#comAssunto').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); escrever(); } };
  $('#avManda').onclick = () => {
    const v = $('#comTxt').value.trim(); if (!v) { toast('Escreva o aviso primeiro.'); return; }
    g.quem.forEach(x => { const c = conversaDe(x.f.id); c.msgs.push({ id: comId(), de: 'roberto', canal: 'aviso', em: new Date().toISOString(), txt: v, lida: true }); });
    comGrava();
    if (g.quem.some(x => x.c.push)) comNotifica('Freddy Turismo · aviso', v.slice(0, 140), './#/mensagens');
    toast(`Aviso enviado para ${g.quem.length} ${g.quem.length === 1 ? 'pessoa' : 'pessoas'} 📣`);
    go('/adm/comunicacao');
  };
}

/* ---------- ligações com o resto do painel ---------- */
/* Hoje: mensagem nova de cliente aparece no topo */
const _admTodayCom = admToday;
admToday = function () {
  _admTodayCom();
  comSemeia();
  const n = comNaoLidas(), stage = $('#stage'); if (!n || !stage) return;
  const quem = contatosCom().filter(x => x.naoLidas);
  const h1 = stage.querySelector('.pageh');
  const html = `<a class="comHoje" href="#/adm/comunicacao/${encodeURIComponent(quem[0].f.id)}"><span>💬</span>
    <span><b>${n} ${n === 1 ? 'mensagem nova' : 'mensagens novas'} de cliente</b><small>${quem.map(x => esc(primeiroNome(x.f.nome))).join(', ')} · toque para responder</small></span><span class="go">→</span></a>`;
  if (h1) h1.insertAdjacentHTML('afterend', html); else stage.insertAdjacentHTML('afterbegin', html);
};
/* bolinha de não lidas no botão da aba */
const _admShellCom = admShell;
admShell = function (tab, inner) {
  _admShellCom(tab, inner);
  const n = comNaoLidas(), b = document.getElementById('nb-comunicacao');
  if (b && n && !b.querySelector('.comBadge')) b.insertAdjacentHTML('beforeend', ` <i class="comBadge">${n}</i>`);
};
/* Ficha do cliente → abrir a conversa */
if (typeof viewFicha === 'function') {
  const _viewFichaCom = viewFicha;
  viewFicha = function (id) {
    _viewFichaCom(id);
    const ac = document.querySelector('.fcAcoes');
    if (ac && !ac.querySelector('.fcConversa')) ac.insertAdjacentHTML('afterbegin', `<a class="cta sm fcConversa" href="#/adm/comunicacao/${encodeURIComponent(id)}">💬 Conversa</a>`);
  };
}

/* =====================================================
   VITRINE → MENSAGENS (o lado do cliente)
   No protótipo, a pessoa vê como se fosse a primeira cliente de exemplo
   que tem o app. Com a nuvem, entra pelo link do voucher / login do cliente.
   ===================================================== */
/* quem está usando o app NESTE aparelho: quem se cadastrou aqui, ou (no
   protótipo) a cliente de exemplo que a pessoa escolheu ver */
function comClienteAtual() {
  comSemeia();
  if (!DB.clienteLogado) return null;
  return contatosCom().find(x => x.f.id === DB.clienteLogado) || null;
}
function comNaoVistas() {
  const x = DB.clienteLogado && (DB.conversas || {})[DB.clienteLogado];
  return x ? x.msgs.filter(m => m.de === 'roberto' && !m.vista).length : 0;
}
/* ícone no topo do app: "Entrar" antes do cadastro; depois, as mensagens */
function comBotaoTopo() {
  const n = comNaoVistas();
  return DB.clienteLogado
    ? `<button class="fdConta" id="fdConta" aria-label="Mensagens">💬<span>Mensagens</span>${n ? `<i class="comBadge">${n}</i>` : ''}</button>`
    : `<button class="fdConta" id="fdConta">👤<span>Entrar</span></button>`;
}
function comLigaBotaoTopo() { const b = document.getElementById('fdConta'); if (b) b.onclick = () => go('/mensagens'); }

/* cadastro do cliente: libera a rede de mensagens */
function viewCadastroCliente() {
  const ex = contatosCom().filter(x => x.c.app).sort((a, b) => String(a.f.nome).localeCompare(String(b.f.nome)));
  const mari = ex.find(x => /^Mariana/.test(x.f.nome)) || ex[0];
  app.innerHTML = `${topoCarol()}
  <main class="wrap narrow comCliente">
    <h1 class="pageh">Sua área na Freddy Turismo</h1>
    <p class="why">Crie a sua conta e fale direto com o Roberto, dentro do app: horário e ponto de busca, motorista do dia, mudanças de voo. Os avisos chegam como notificação no seu celular, e a conversa fica guardada.</p>
    <div class="card comCad">
      <label class="fld">Seu nome<input id="cdNome" autocomplete="name" placeholder="Nome e sobrenome"></label>
      <label class="fld">WhatsApp (com DDI)<input id="cdWhats" type="tel" autocomplete="tel" placeholder="+55 11 …"></label>
      <label class="fld">E-mail <small class="why">opcional</small><input id="cdEmail" type="email" autocomplete="email"></label>
      <label class="optin"><input type="checkbox" id="cdOk"><span><b>Aceito receber mensagens da Freddy Turismo</b><small>Só sobre a minha viagem. Saio quando quiser.</small></span></label>
      <button class="cta" id="cdCriar">Criar minha conta</button>
    </div>
    <p class="fine">📲 Dica: instale o app na tela de início do celular para receber os avisos (no iPhone: Compartilhar → Adicionar à Tela de Início).</p>
    ${mari ? `<button class="linkbtn" id="cdExemplo">Protótipo: ver como a cliente de exemplo (${esc(primeiroNome(mari.f.nome))})</button>` : ''}
  </main>`;
  ligaVoltar('/');
  $('#cdCriar').onclick = () => {
    const nome = $('#cdNome').value.trim(), whats = $('#cdWhats').value.trim(), email = $('#cdEmail').value.trim();
    if (nome.length < 2) { toast('Escreva o seu nome.'); $('#cdNome').focus(); return; }
    if (soDig(whats).length < 8) { toast('Escreva o seu WhatsApp com DDI.'); $('#cdWhats').focus(); return; }
    if (!$('#cdOk').checked) { toast('Marque que aceita receber as mensagens.'); return; }
    const id = (typeof chaveFicha === 'function') ? chaveFicha({ whats, email, name: nome }) : 'app' + Date.now();
    DB.clientesApp = (DB.clientesApp || []).filter(k => k.id !== id);
    DB.clientesApp.push({ id, nome, whats, email, em: new Date().toISOString() });
    const c = conversaDe(id); c.app = true;
    if (!c.msgs.length) c.msgs.push({ id: comId(), de: 'roberto', canal: 'app', em: new Date().toISOString(), lida: true,
      txt: `Olá, ${primeiroNome(nome)}! Aqui é o Roberto, da Freddy Turismo 😊 Bem-vindo ao nosso app. Por aqui eu mando tudo da sua viagem e você fala comigo direto. Em que posso ajudar?` });
    DB.clienteLogado = id; comGrava();
    viewMensagensCliente();
  };
  if ($('#cdExemplo')) $('#cdExemplo').onclick = () => { DB.clienteLogado = mari.f.id; comGrava(); viewMensagensCliente(); };
}

function viewMensagensCliente() {
  const x = comClienteAtual();
  if (!x) return viewCadastroCliente();
  let viu = false; x.c.msgs.forEach(m => { if (m.de === 'roberto' && !m.vista) { m.vista = true; viu = true; } });
  if (viu) { (DB.conversas[x.f.id] || {}).msgs = x.c.msgs; comGrava(); }
  const pode = 'Notification' in window;
  const perm = pode ? Notification.permission : 'nao';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator.standalone || matchMedia('(display-mode: standalone)').matches);
  app.innerHTML = `${topoCarol()}
  <main class="wrap narrow comCliente">
    <header class="comCliCab">
      <span class="comCliLogo" aria-hidden="true">${logoMark(26, '#FFFFFF')}</span>
      <div><h1 class="pageh">Fale com o Roberto</h1><small>Freddy Turismo · responde em português, inglês, italiano e espanhol</small></div>
    </header>
    <p class="comComo">Olá, <b>${esc(primeiroNome(x.f.nome))}</b>${(DB.clientesApp || []).some(k => k.id === x.f.id) ? '' : ' <em class="exTag">cliente de exemplo do protótipo</em>'} · <button class="linkbtn comSair" id="comSair">sair</button></p>
    <div class="comAvisoNotif ${perm === 'granted' ? 'ok' : ''}" id="comNotif">
      ${perm === 'granted' ? '🔔 Notificações ligadas: os avisos do Roberto chegam no seu celular.'
        : ios ? '📲 Para receber os avisos no iPhone: toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>, abra o app pelo ícone e volte aqui.'
        : pode ? `<span>🔔 Ligue as notificações para receber horário, ponto de busca e avisos da sua viagem.</span><button class="cta sm" id="comLiga">Ligar</button>`
        : 'Este navegador não recebe notificações. No celular, instale o app na tela de início.'}
    </div>
    ${x ? `<div class="comMsgs cli" id="comMsgs">${comBolhas(x.c.msgs, 'cliente')}</div>
    <div class="comCompor cli">
      <textarea id="comTxt" rows="2" placeholder="Escreva para o Roberto…"></textarea>
      <div class="comBtns"><a class="mini" target="_blank" rel="noopener" href="${esc(waLink('Olá, Roberto!'))}">WhatsApp</a><span class="comEsp"></span><button class="cta sm" id="comManda">Enviar</button></div>
    </div>` : `<p class="empty">Assim que você reservar, a conversa com o Roberto aparece aqui.</p>`}
  </main>`;
  ligaVoltar('/');
  $('#comSair').onclick = () => { DB.clienteLogado = ''; comGrava(); go('/'); };
  const box = $('#comMsgs'); if (box) box.scrollTop = box.scrollHeight;
  const liga = $('#comLiga');
  if (liga) liga.onclick = async () => {
    const r = await Notification.requestPermission();
    if (x && r === 'granted') { conversaDe(x.f.id).push = true; comGrava(); comNotifica('Freddy Turismo', 'Pronto! Os avisos do Roberto vão chegar aqui. 🚘'); }
    viewMensagensCliente();
  };
  const manda = $('#comManda');
  if (manda) manda.onclick = () => {
    const v = $('#comTxt').value.trim(); if (!v) return;
    const c = conversaDe(x.f.id);
    c.msgs.push({ id: comId(), de: 'cliente', canal: 'app', em: new Date().toISOString(), txt: v, lida: false });
    comGrava();
    toast('Enviada — o Roberto recebe no painel dele');
    viewMensagensCliente();
  };
}
