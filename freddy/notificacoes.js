/* =====================================================
   NOTIFICAÇÕES — os avisos automáticos (proativos) do Roberto (15/10/2026)

   Pedido: "uma aba Notificações — gerar dentro as notificações, coisas
   proativas e fácil de mexer".
   - Cada aviso automático é um cartão: liga/desliga num toque, o texto
     edita ali mesmo (com {nome}, {servico}, {data}, {hora}, {busca},
     {carro}, {motorista}, {voucher}, {falta}), quando sai e por onde.
   - "Próximos 7 dias": a fila do que o app vai mandar, com a mensagem já
     pronta para cada cliente. Dá para mandar agora ou pular.
   - O que venceu sai sozinho (no app vira notificação no celular do
     cliente e entra na conversa da aba Comunicação). Por WhatsApp, o app
     deixa pronto e o Roberto manda num toque.
   - Ele cria aviso novo: "X dias antes/depois do serviço, às HH:MM".
   - Aviso único para todos fica na Comunicação → Aviso para vários.
   ===================================================== */
'use strict';

Object.assign(STR, { admNotif: { pt: 'Notificações', en: 'Notifications' } });
(function abaNotif() {
  if (!ADM_TABS.some(([x]) => x === 'notificacoes')) {
    const i = ADM_TABS.findIndex(([x]) => x === 'comunicacao');
    ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['notificacoes', 'admNotif']);
  }
  if (typeof NAV_GRUPOS !== 'undefined') {
    const g = NAV_GRUPOS.find(([t2]) => t2 === 'Clientes');
    if (g && !g[1].includes('notificacoes')) g[1].splice(g[1].indexOf('comunicacao') + 1, 0, 'notificacoes');
  }
})();
const _viewAdmNt = viewAdm;
viewAdm = function (tab, arg) { if (tab === 'notificacoes') return admNotificacoes(arg); return _viewAdmNt(tab, arg); };

const ntGrava = () => { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) { } };
/* quando: dias em relação ao serviço (−1 = véspera) e a hora; ou 'na hora' de um evento */
const NT_PADRAO = [
  { id: 'confirma', nome: 'Reserva confirmada', ic: '✅', quando: { ev: 'reserva' }, canal: 'app', ativo: true,
    texto: 'Olá, {nome}! Sua reserva está confirmada ✅\n{servico} · {data} às {hora}\nBusca: {busca}\nSeu voucher: {voucher}\nQualquer coisa, é só me chamar aqui. Roberto · Freddy Turismo' },
  { id: 'saldo', nome: 'Lembrete do saldo', ic: '💷', quando: { dias: -3, hora: '10:00' }, so: 'saldo', canal: 'app', ativo: true,
    texto: 'Olá, {nome}! Faltam 3 dias para o seu {servico} 😊 O restante, {falta}, pode ser pago no dia, em cartão ou dinheiro. Se preferir adiantar, me avise.' },
  { id: 'ingresso', nome: 'Compre os ingressos antes', ic: '🎟️', quando: { dias: -7, hora: '10:00' }, so: 'ingresso', canal: 'app', ativo: true,
    texto: 'Olá, {nome}! Uma dica para o {servico}: os ingressos esgotam. Se ainda não comprou, compre agora no site oficial e me mande o horário que eu ajusto a saída.' },
  { id: 'vespera', nome: 'Véspera: horário e motorista', ic: '🌙', quando: { dias: -1, hora: '18:00' }, canal: 'app', ativo: true,
    texto: 'Boa noite, {nome}! Amanhã é o seu {servico} 🚘\n🕗 Busca às {hora}\n📍 {busca}\n🚘 {carro} · motorista {motorista}\nSe algo mudar (voo, horário), me avise por aqui.' },
  { id: 'acaminho', nome: 'Saindo para te buscar', ic: '🚘', quando: { dias: 0, antesMin: 45 }, canal: 'app', ativo: true,
    texto: '{nome}, já estou a caminho! Chego aí em uns 40 minutos. {carro}, motorista {motorista}.' },
  { id: 'obrigado', nome: 'Obrigado + avaliação', ic: '⭐', quando: { dias: 1, hora: '11:00' }, canal: 'app', ativo: true,
    texto: 'Olá, {nome}! Obrigado por viajar com a Freddy Turismo ❤️ Se puder, deixe sua avaliação, ajuda muito: {avaliar}' },
  { id: 'volta', nome: 'Saudade de Londres (6 meses depois)', ic: '💌', quando: { dias: 180, hora: '11:00' }, canal: 'app', ativo: false,
    texto: 'Olá, {nome}! Faz seis meses do seu passeio com a gente. Pensando em voltar? Para quem já viajou comigo, o transfer do aeroporto sai com desconto. É só responder aqui.' },
];
function ntLista() {
  if (!DB.automacoes) { DB.automacoes = NT_PADRAO.map(a => ({ ...a })); ntGrava(); }
  return DB.automacoes;
}
const ntEnviadas = () => (DB.notifEnviadas = DB.notifEnviadas || {});

/* ---------- monta a mensagem de uma reserva ---------- */
function ntCarro(b) { return +b.pax > 3 ? 'Mercedes V-Class' : 'Mercedes Classe E'; }
function ntMotorista(b) { return b.motorista || 'Roberto'; }
function ntPreenche(texto, b) {
  const x = Tours.get(b.tourId) || { name: { pt: 'serviço' } };
  const V = {
    nome: primeiroNome(b.name), servico: tl(x.name), data: dtBR(b.date), hora: b.time || '',
    busca: b.hotel || 'o endereço combinado', carro: ntCarro(b), motorista: ntMotorista(b),
    voucher: linkApp('voucher/' + b.code), falta: eur(Bookings.due(b)), avaliar: linkApp('avaliar/' + b.tourId),
  };
  return String(texto).replace(/\{(\w+)\}/g, (m, k) => V[k] != null ? V[k] : m);
}
/* quando sai (Date) — null se o gatilho é "na hora da reserva" */
function ntQuando(a, b) {
  const q = a.quando || {};
  if (q.ev === 'reserva') return new Date(b.createdAt || b.date + 'T09:00:00');
  if (q.antesMin) { const d = new Date(b.date + 'T' + (b.time || '09:00') + ':00'); d.setMinutes(d.getMinutes() - q.antesMin); return d; }
  return new Date(addDays(b.date, q.dias || 0) + 'T' + (q.hora || '10:00') + ':00');
}
function ntVale(a, b) {
  if (b.status !== 'confirmed') return false;
  if (a.so === 'saldo' && !(Bookings.due(b) > 0)) return false;
  if (a.so === 'ingresso') { const x = Tours.get(b.tourId) || {}; if (!/harry-potter|windsor|futebol|hampton|leeds/.test(b.tourId) && !x.ingresso) return false; }
  return true;
}
/* todas as notificações geradas entre duas datas */
function ntFila(de, ate) {
  const L = [];
  for (const a of ntLista()) for (const b of DB.bookings || []) {
    if (!ntVale(a, b)) continue;
    const em = ntQuando(a, b); if (!em || em < de || em > ate) continue;
    const chave = a.id + '|' + b.id;
    L.push({ a, b, em, chave, feita: ntEnviadas()[chave] || null, texto: ntPreenche(a.texto, b) });
  }
  return L.sort((x, y) => x.em - y.em);
}
function ntCliente(b) { return (typeof fichaDe === 'function') ? fichaDe(b) : ''; }
function ntManda(item, como, quieto = false) {
  const id = ntCliente(item.b);
  if (como === 'whats') window.open(waLink(item.texto, String(item.b.whats || '').replace(/\D/g, '')), '_blank', 'noopener');
  if (id && typeof comEnviaApp === 'function') comEnviaApp(id, item.texto, como === 'whats' ? 'whats' : 'app', quieto);
  ntEnviadas()[item.chave] = { em: new Date().toISOString(), como };
  ntGrava();
}
/* o que venceu e está ligado sai sozinho, pelo app (proativo) */
function ntRoda() {
  const agora = new Date(), de = new Date(agora.getTime() - 2 * 864e5);
  let n = 0;
  for (const it of ntFila(de, agora)) {
    if (it.feita || !it.a.ativo) continue;
    if (it.a.canal === 'whats') continue;            /* WhatsApp: fica pronto, ele manda num toque */
    ntManda(it, 'app', true); n++;
  }
  return n;
}

/* =====================================================
   TELA
   ===================================================== */
const ntQuandoTxt = (q) => q.ev === 'reserva' ? 'Na hora em que a reserva é confirmada'
  : q.antesMin ? `${q.antesMin} min antes da busca`
  : q.dias === 0 ? `No dia, às ${q.hora}` : q.dias < 0 ? `${-q.dias} ${q.dias === -1 ? 'dia' : 'dias'} antes, às ${q.hora}` : `${q.dias} ${q.dias === 1 ? 'dia' : 'dias'} depois, às ${q.hora}`;

function admNotificacoes(arg) {
  const saiu = ntRoda();
  const lista = ntLista();
  const agora = new Date(), fim = new Date(agora.getTime() + 7 * 864e5);
  const fila = ntFila(new Date(agora.getTime() - 864e5), fim).filter(it => it.a.ativo);
  const ex = (DB.bookings || []).find(b => b.status === 'confirmed' && b.date >= isoToday()) || (DB.bookings || [])[0];
  admShell('notificacoes', `
    <div class="pagehead"><h1 class="pageh">Notificações</h1><button class="cta sm" id="ntNova">+ Criar aviso</button></div>
    <p class="why">Os avisos que o app manda sozinho para os seus clientes, na hora certa. Ligue, desligue e mude o texto quando quiser. No app, eles chegam como notificação no celular do cliente e ficam na conversa.</p>
    ${saiu ? `<div class="alert ok">🔔 ${saiu} ${saiu === 1 ? 'aviso saiu' : 'avisos saíram'} agora, sozinhos.</div>` : ''}

    <section class="card"><h3>Próximos 7 dias <small class="ntConta">${fila.filter(i => !i.feita).length} para sair</small></h3>
      ${fila.length ? fila.map(it => `<div class="ntFila ${it.feita ? 'feita' : ''}">
        <span class="ntIc">${it.a.ic || '🔔'}</span>
        <div class="ntTx"><b>${esc(it.a.nome)} → ${esc(it.b.name)}</b>
          <small>${it.em.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às ${it.em.toTimeString().slice(0, 5)} · ${it.feita ? '✓ enviado' + (it.feita.como === 'whats' ? ' pelo WhatsApp' : it.feita.como === 'pulou' ? ' (pulado)' : ' no app') : it.a.canal === 'whats' ? 'pelo WhatsApp (você toca para mandar)' : 'sai sozinho no app'}</small>
          <details><summary>ver a mensagem</summary><p>${esc(it.texto).replace(/\n/g, '<br>')}</p></details></div>
        ${it.feita ? '' : `<div class="ntAc"><button class="mini" data-agora="${esc(it.chave)}">Mandar agora</button><button class="mini" data-wa="${esc(it.chave)}">WhatsApp</button><button class="mini" data-pula="${esc(it.chave)}">Pular</button></div>`}
      </div>`).join('') : '<p class="empty">Nada programado para os próximos 7 dias.</p>'}
    </section>

    <h2 class="h3 ntTit">Avisos automáticos</h2>
    <div class="ntGrade">${lista.map(a => `
      <article class="card ntCard ${a.ativo ? '' : 'off'}" data-id="${esc(a.id)}">
        <header><span class="ntIc">${a.ic || '🔔'}</span><div><b>${esc(a.nome)}</b><small>${ntQuandoTxt(a.quando || {})}${a.so === 'saldo' ? ' · só quem tem saldo' : a.so === 'ingresso' ? ' · só passeios com ingresso' : ''}</small></div>
          <label class="ntSw" title="Ligar / desligar"><input type="checkbox" data-liga="${esc(a.id)}" ${a.ativo ? 'checked' : ''}><i></i></label></header>
        <textarea data-txt="${esc(a.id)}" rows="5">${esc(a.texto)}</textarea>
        <div class="ntRod">
          <select data-canal="${esc(a.id)}" aria-label="Por onde"><option value="app" ${a.canal !== 'whats' ? 'selected' : ''}>🔔 No app (sozinho)</option><option value="whats" ${a.canal === 'whats' ? 'selected' : ''}>WhatsApp (eu mando)</option></select>
          ${ex ? `<button class="mini" data-prev="${esc(a.id)}">Ver exemplo</button>` : ''}
          ${a.custom ? `<button class="mini" data-del="${esc(a.id)}">Apagar</button>` : ''}
        </div>
        <p class="ntPrev" id="prev-${esc(a.id)}" hidden></p>
      </article>`).join('')}</div>
    <p class="fine">Palavras que viram o dado de cada cliente: {nome} {servico} {data} {hora} {busca} {carro} {motorista} {voucher} {falta} {avaliar}</p>

    <dialog id="ntDlg" class="ntDlg"><form method="dialog" class="ntForm">
      <h3>Novo aviso automático</h3>
      <label class="fld">Nome<input id="nnNome" placeholder="Ex.: Previsão do tempo / casaco"></label>
      <div class="ntQ"><label class="fld">Quantos dias<input id="nnDias" type="number" value="2" min="0" max="365"></label>
        <label class="fld">Antes ou depois<select id="nnSent"><option value="-1">antes do serviço</option><option value="1">depois do serviço</option></select></label>
        <label class="fld">Hora<input id="nnHora" type="time" value="10:00"></label></div>
      <label class="fld">Mensagem<textarea id="nnTxt" rows="5">Olá, {nome}! </textarea></label>
      <div class="ntRod"><button class="mini" value="cancel">Cancelar</button><button class="cta sm" id="nnOk" value="ok">Criar</button></div>
    </form></dialog>`);

  const acha = (ch) => ntFila(new Date(Date.now() - 864e5 * 2), fim).find(i => i.chave === ch);
  $$('[data-agora]').forEach(b => b.onclick = () => { const it = acha(b.dataset.agora); if (it) { ntManda(it, 'app'); toast('Enviado no app 🔔'); admNotificacoes(); } });
  $$('[data-wa]').forEach(b => b.onclick = () => { const it = acha(b.dataset.wa); if (it) { ntManda(it, 'whats'); admNotificacoes(); } });
  $$('[data-pula]').forEach(b => b.onclick = () => { ntEnviadas()[b.dataset.pula] = { em: new Date().toISOString(), como: 'pulou' }; ntGrava(); admNotificacoes(); });
  const de = (id) => lista.find(a => a.id === id);
  $$('[data-liga]').forEach(c => c.onchange = () => { de(c.dataset.liga).ativo = c.checked; ntGrava(); admNotificacoes(); });
  $$('[data-txt]').forEach(t2 => t2.onchange = () => { de(t2.dataset.txt).texto = t2.value; ntGrava(); toast('Texto salvo ✓'); });
  $$('[data-canal]').forEach(s => s.onchange = () => { de(s.dataset.canal).canal = s.value; ntGrava(); admNotificacoes(); });
  $$('[data-prev]').forEach(b => b.onclick = () => {
    const a = de(b.dataset.prev), p = document.getElementById('prev-' + a.id);
    const tx = document.querySelector(`[data-txt="${a.id}"]`).value;
    p.innerHTML = `<b>Exemplo com ${esc(ex.name)}:</b><br>${esc(ntPreenche(tx, ex)).replace(/\n/g, '<br>')}`; p.hidden = !p.hidden;
  });
  $$('[data-del]').forEach(b => b.onclick = () => { if (!confirm('Apagar este aviso?')) return; DB.automacoes = lista.filter(a => a.id !== b.dataset.del); ntGrava(); admNotificacoes(); });
  const dlg = $('#ntDlg');
  $('#ntNova').onclick = () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); };
  $('#nnOk').onclick = (e) => {
    const nome = $('#nnNome').value.trim(), texto = $('#nnTxt').value.trim();
    if (!nome || texto.length < 5) { e.preventDefault(); toast('Ponha o nome e a mensagem.'); return; }
    lista.push({ id: 'c' + Date.now().toString(36), nome, ic: '🔔', custom: true, canal: 'app', ativo: true,
      quando: { dias: (+$('#nnDias').value || 0) * +$('#nnSent').value, hora: $('#nnHora').value || '10:00' }, texto });
    ntGrava(); setTimeout(() => admNotificacoes(), 0);
  };
}

/* Hoje: o que sai hoje, num cartão */
const _admTodayNt = admToday;
admToday = function () {
  _admTodayNt();
  const stage = $('#stage'); if (!stage) return;
  const n0 = ntRoda();
  const ag = new Date(), fimDia = new Date(isoToday() + 'T23:59:59');
  const hoje = ntFila(ag, fimDia).filter(i => i.a.ativo && !i.feita);
  if (!hoje.length && !n0) return;
  const html = `<a class="comHoje ntHoje" href="#/adm/notificacoes"><span>🔔</span><span><b>${hoje.length} ${hoje.length === 1 ? 'aviso automático sai' : 'avisos automáticos saem'} hoje${n0 ? ` · ${n0} já ${n0 === 1 ? 'saiu' : 'saíram'}` : ''}</b>
    <small>${hoje.slice(0, 3).map(i => esc(i.a.nome) + ' → ' + esc(primeiroNome(i.b.name))).join(' · ') || 'Toque para ver a fila'}</small></span><span class="go">→</span></a>`;
  const ref = stage.querySelector('.comHoje') || stage.querySelector('.pageh');
  if (ref) ref.insertAdjacentHTML('afterend', html); else stage.insertAdjacentHTML('afterbegin', html);
};
