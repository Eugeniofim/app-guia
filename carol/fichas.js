/* =====================================================
   FICHA DO CLIENTE — Clientes → cada pessoa que pagou alguma coisa

   Pedido do Eugênio (28/09/2026): "cada cliente que paga reserva ou tudo
   deve ter uma ficha técnica com todas as infos da pessoa, passeios,
   contatos… e pensar em como isso chega".

   - A ficha NASCE SOZINHA do pagamento: reserva de tour, consultoria,
     Monte seu roteiro, vale-presente. Ninguém digita nada.
   - É UMA pessoa só, venha de onde vier: junta pelo WhatsApp (e, se não
     tiver, pelo e-mail). Quem comprou o roteiro e depois reservou um tour
     com a Carol vira uma ficha, não duas.
   - Pedido de transfer e avaliação entram na ficha de quem já tem uma.
   - A Carol completa o que o pagamento não sabe: idades, mobilidade,
     alimentação, ocasião especial, etiquetas e notas (DB.fichas).
   Como chega nela: "Quem pagou" no topo do Hoje, botão Ficha nos lembretes
   e nas reservas, o assistente ("me passa a ficha da Mariana"), e o botão
   "Mandar para o meu WhatsApp" — no dia do tour ela tem tudo no celular,
   mesmo sem internet. No app no ar, o aviso de pagamento (push + e-mail)
   já traz o link da ficha.
   A ficha é só dela: nunca aparece para cliente nenhum.
   ===================================================== */
'use strict';

const soDig = (s) => String(s || '').replace(/\D/g, '');
const minusc = (s) => String(s || '').trim().toLowerCase();
const hash36 = (s) => { let h = 5381; for (const c of String(s)) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };
/* a chave da pessoa: WhatsApp primeiro (é o que ela usa), depois e-mail, depois nome */
function chaveFicha({ whats, email, name }) {
  const d = soDig(whats); if (d.length >= 8) return 'wa' + d;
  const e = minusc(email); if (e.includes('@')) return 'em' + hash36(e);
  return 'nm' + hash36(minusc(name));
}
const ORIGEM_FICHA = { site: 'App / site', instagram: 'Instagram', whatsapp: 'WhatsApp', google: 'Google', friend: 'Indicação',
  manual: 'Lançada por você', guidelondon: 'Guide London', roteiro: 'Monte seu roteiro', presente: 'Vale-presente' };
const TAGS_FICHA = ['VIP', 'Crianças', 'Idosos', 'Mobilidade', 'Ocasião especial', 'Indicação'];

/* todas as fichas, montadas na hora a partir do que já está gravado */
function fichasTodas() {
  const lista = [], porWa = new Map(), porEm = new Map();
  const acha = (whats, email) => {
    const d = soDig(whats), e = minusc(email);
    return (d.length >= 8 && porWa.get(d)) || (e.includes('@') && porEm.get(e)) || null;
  };
  const indexa = (f, whats, email) => {
    const d = soDig(whats), e = minusc(email);
    if (d.length >= 8 && !porWa.has(d)) porWa.set(d, f);
    if (e.includes('@') && !porEm.has(e)) porEm.set(e, f);
  };
  const pessoa = (p) => {
    let f = acha(p.whats, p.email);
    if (!f) { f = { id: chaveFicha(p), nome: p.name, whats: '', email: '', insta: '', hotel: '', origem: p.origem || '', itens: [] }; lista.push(f); }
    if (!f.whats && p.whats) f.whats = p.whats;
    if (!f.email && p.email) f.email = p.email;
    if (!f.insta && p.insta) f.insta = p.insta;
    if (p.hotel) f.hotel = p.hotel;
    if (!f.origem && p.origem) f.origem = p.origem;
    indexa(f, p.whats, p.email);
    return f;
  };
  for (const b of DB.bookings || []) {
    if (b.status === 'cancelled') continue;
    const x = Tours.get(b.tourId) || {};
    const f = pessoa({ name: b.name, whats: b.whats, email: b.email, insta: b.insta, hotel: b.hotel, origem: b.origin });
    f.itens.push({ tipo: x.type === 'consult' ? 'consultoria' : 'reserva', data: b.date, quando: b.createdAt || b.date, ref: b, total: +b.total || 0, pago: Bookings.paid(b) });
  }
  for (const r of DB.roteiros || []) {
    if (!(r.pago && +r.pago.valor > 0)) continue;
    const f = pessoa({ name: r.nome, whats: r.whats, email: r.email, hotel: r.hotel, origem: 'roteiro' });
    f.itens.push({ tipo: 'roteiro', data: r.ini, quando: r.criado || r.ini, ref: r, total: +r.pago.valor, pago: +r.pago.valor });
    f.grupo = { adultos: r.adultos, criancas: r.criancas, idades: r.idades };
  }
  for (const g of DB.giftcards || []) {
    if (!g.pago) continue;
    const f = pessoa({ name: g.de, whats: g.whats, email: g.email, origem: 'presente' });
    f.itens.push({ tipo: 'presente', data: g.criado, quando: g.criado, ref: g, total: +g.valor || 0, pago: +g.valor || 0 });
  }
  /* só se somam a quem já é cliente */
  for (const p of DB.pedidos || []) { const f = acha(p.whats, p.email); if (f) f.itens.push({ tipo: 'transfer', data: p.criado, quando: p.criado, ref: p }); }
  for (const a of DB.avaliacoes || []) {
    const f = lista.find(z => z.itens.some(i => i.tipo === 'reserva' && i.ref.tourId === a.tourId && minusc(primeiroNome(i.ref.name)) === minusc(a.nome)));
    if (f) f.itens.push({ tipo: 'avaliacao', data: a.data, quando: a.data, ref: a });
  }
  const hoje = isoToday(), recente = addDays(hoje, -7);
  for (const f of lista) {
    f.notas = (DB.fichas || []).find(n => n.id === f.id) || {};
    f.itens.sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
    const pagos = f.itens.filter(i => 'total' in i);
    f.total = pagos.reduce((s, i) => s + i.total, 0);
    f.pago = pagos.reduce((s, i) => s + i.pago, 0);
    f.aReceber = Math.max(0, f.total - f.pago);
    f.desde = pagos.map(i => String(i.quando).slice(0, 10)).sort()[0] || '';
    f.ultima = String((f.itens[0] || {}).quando || '');
    const futuras = f.itens.filter(i => (i.tipo === 'reserva' || i.tipo === 'consultoria') && i.data >= hoje).sort((a, b) => (a.data + a.ref.time).localeCompare(b.data + b.ref.time));
    f.proximo = futuras[0] || null;
    f.vezes = f.itens.filter(i => i.tipo === 'reserva').length;
    f.consent = f.itens.some(i => i.ref && i.ref.consent && i.ref.consent.ok);
    f.exemplo = f.itens.some(i => i.ref && i.ref.exemplo);
    /* nova = pagou nos últimos 7 dias e ela ainda não abriu a ficha depois disso */
    f.nova = pagos.some(i => String(i.quando) >= recente && String(i.quando) > String(f.notas.vistaEm || ''));
  }
  return lista.sort((a, b) => (b.nova - a.nova) || (a.proximo ? 0 : 1) - (b.proximo ? 0 : 1) || (a.proximo && b.proximo ? a.proximo.data.localeCompare(b.proximo.data) : 0) || b.ultima.localeCompare(a.ultima));
}
const fichaPorId = (id) => fichasTodas().find(f => f.id === id) || null;
/* a ficha de uma reserva (para os botões "Ficha" do painel) */
function fichaDe(b) { const f = fichasTodas().find(z => z.itens.some(i => i.ref === b || (i.ref && b && i.ref.id === b.id))); return f ? f.id : chaveFicha(b || {}); }

/* ---------- textos ---------- */
const diaCurto = (iso) => { try { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); } catch (e) { return dtBR(iso); } };
function rotuloItem(i) {
  const r = i.ref;
  if (i.tipo === 'reserva' || i.tipo === 'consultoria') { const x = Tours.get(r.tourId) || { name: { pt: 'Tour' } }; return `${tl(x.name)}${r.horas && i.tipo === 'reserva' ? ` (${rotuloHoras(r.horas)})` : ''} · ${dtBR(r.date)} · ${r.pax} ${r.pax === 1 ? 'pessoa' : 'pessoas'}`; }
  if (i.tipo === 'roteiro') return `Monte seu roteiro (${r.nivel || 'arquivo'}) · ${dtBR(r.ini)} a ${dtBR(r.fim)}`;
  if (i.tipo === 'presente') return `Vale-presente ${r.codigo} para ${r.para}${r.usado ? ' · já usado' : ''}`;
  if (i.tipo === 'transfer') return `Pedido de transfer${r.respondido ? ' · respondido' : ' · esperando cotação'}`;
  if (i.tipo === 'avaliacao') return `Avaliou ${'★'.repeat(r.estrelas || 0)} — "${String(r.texto || '').slice(0, 80)}${String(r.texto || '').length > 80 ? '…' : ''}"`;
  return i.tipo;
}
const ICONE_ITEM = { reserva: '🗓', consultoria: '💬', roteiro: '🗺️', presente: '🎁', transfer: '🚘', avaliacao: '⭐' };
function grupoTexto(f) {
  const n = f.notas || {}, g = f.grupo || {};
  const pax = f.proximo ? f.proximo.ref.pax : Math.max(0, ...f.itens.filter(i => i.ref && i.ref.pax).map(i => +i.ref.pax));
  const partes = [];
  if (g.adultos) partes.push(`${g.adultos} adulto${g.adultos > 1 ? 's' : ''}${g.criancas ? ` e ${g.criancas} criança${g.criancas > 1 ? 's' : ''}` : ''}`);
  else if (pax) partes.push(`${pax} pessoa${pax > 1 ? 's' : ''}`);
  const idades = n.idades || g.idades;
  if (idades) partes.push(idades);
  return partes.join(' · ');
}
/* o texto que vai para o WhatsApp dela (ou, sem valores, para um colega/motorista) */
function textoFicha(f, colega) {
  const n = f.notas || {}, L = [];
  L.push((colega ? '👤 ' : '📋 Ficha — ') + f.nome);
  const ct = [f.whats && '📱 ' + f.whats, !colega && f.email && '✉️ ' + f.email, !colega && f.insta && 'IG @' + String(f.insta).replace(/^@/, '')].filter(Boolean);
  if (ct.length) L.push(ct.join(' · '));
  const p = f.proximo;
  if (p) {
    const x = Tours.get(p.ref.tourId) || { name: { pt: 'Tour' }, meeting: '' };
    L.push(`🗓 ${diaCurto(p.ref.date)} · ${tl(x.name)} · ${janelaDoTour({ time: p.ref.time, horas: p.ref.horas })}`);
    if (noIdioma(x.meeting)) L.push('📍 ' + noIdioma(x.meeting));
  }
  if (f.hotel) L.push('🏨 ' + f.hotel);
  const gr = grupoTexto(f); if (gr) L.push('👥 ' + gr);
  if (n.mobilidade) L.push('♿ ' + n.mobilidade);
  if (n.alimentacao) L.push('🍽 ' + n.alimentacao);
  if (n.ocasiao) L.push('🎉 ' + n.ocasiao);
  const obs = f.itens.map(i => i.ref && i.ref.obs).filter(Boolean)[0];
  if (obs) L.push('💬 ' + obs);
  if (!colega) {
    if (p) { const falta = Bookings.due(p.ref); L.push(`💷 Pago ${eur(Bookings.paid(p.ref))}${falta > 0 ? ` · falta ${eur(falta)} no dia` : ' · quitado'}`); }
    if (n.notas) L.push('📝 ' + n.notas);
    if (p) L.push('Voucher: ' + linkApp('voucher/' + p.ref.code));
  }
  return L.join('\n');
}

/* ---------- a lista: aba Clientes ---------- */
function admFichas(arg) {
  if (arg) return viewFicha(decodeURIComponent(arg));
  const todas = fichasTodas();
  const f0 = admFichas._f || 'todas', q = minusc(admFichas._q);
  const filtros = { todas: () => true, marcados: (f) => !!f.proximo, novas: (f) => f.nova, voltaram: (f) => f.vezes > 1 };
  const lista = todas.filter(filtros[f0] || filtros.todas).filter(f => !q || minusc([f.nome, f.whats, f.email, f.hotel, (f.notas || {}).notas].join(' ')).includes(q));
  const chip = (id, rot, n) => `<button class="chip ${f0 === id ? 'on' : ''}" data-fcf="${id}">${rot} · ${n}</button>`;
  admShell('clients', `
    <div class="pagehead"><h1 class="pageh">Clientes</h1><div class="chips"><button class="mini" id="fcCsv">Baixar planilha</button></div></div>
    <p class="why">Cada pessoa que <b>paga alguma coisa</b> — tour, consultoria, roteiro ou vale-presente — ganha uma <b>ficha</b> sozinha, com tudo dela num lugar só. Quem volta continua na mesma ficha. No app no ar, quando alguém paga, o aviso que chega no seu celular já traz o link da ficha.</p>
    <div class="fcBusca"><input id="fcQ" type="search" placeholder="Buscar por nome, WhatsApp, hotel, nota…" value="${esc(admFichas._q || '')}" aria-label="Buscar cliente"></div>
    <div class="chips fcFiltros">${chip('todas', 'Todas', todas.length)}${chip('novas', 'Pagaram agora', todas.filter(filtros.novas).length)}${chip('marcados', 'Com tour marcado', todas.filter(filtros.marcados).length)}${chip('voltaram', 'Voltaram', todas.filter(filtros.voltaram).length)}</div>
    <div class="fcLista">${lista.length ? lista.map(f => `<a class="card fcCard" href="#/adm/clients/${encodeURIComponent(f.id)}">
      <div class="fcTopo"><b>${esc(f.nome)}</b>${f.exemplo ? ' <em class="exTag">exemplo</em>' : ''}
        ${f.nova ? '<span class="pill warn">pagou agora</span>' : ''}${f.vezes > 1 ? `<span class="pill ok">voltou · ${f.vezes}x</span>` : ''}</div>
      <small>${f.proximo ? `🗓 Próximo: <b>${diaCurto(f.proximo.data)}</b> · ${esc(tl((Tours.get(f.proximo.ref.tourId) || { name: { pt: '' } }).name))}` : esc(rotuloItem(f.itens[0]))}</small>
      <small>${esc([grupoTexto(f), f.hotel].filter(Boolean).join(' · '))}</small>
      <span class="fcValor">${eur(f.total)}${f.aReceber > 0 ? `<em>falta ${eur(f.aReceber)}</em>` : ''}</span>
    </a>`).join('') : '<p class="empty">Ninguém com esse filtro.</p>'}</div>`);
  $$('[data-fcf]').forEach(b => b.onclick = () => { admFichas._f = b.dataset.fcf; admFichas(); });
  const qi = $('#fcQ');
  qi.oninput = () => { admFichas._q = qi.value; const pos = qi.selectionStart; admFichas(); const n = $('#fcQ'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
  $('#fcCsv').onclick = () => {
    const cab = ['Nome', 'WhatsApp', 'E-mail', 'Instagram', 'Hotel', 'Compras', 'Total', 'Pago', 'A receber', 'Próximo tour', 'Aceita novidades'];
    const csv = [cab.join(';')].concat(todas.map(f => [f.nome, f.whats, f.email, f.insta, f.hotel, f.itens.filter(i => 'total' in i).length, f.total, f.pago, f.aReceber, f.proximo ? f.proximo.data : '', f.consent ? 'sim' : 'não']
      .map(v => String(v == null ? '' : v).replace(/;/g, ',')).join(';'))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'clientes-lovely-london.csv'; a.click();
  };
}

/* ---------- a ficha ---------- */
function viewFicha(id) {
  const f = fichaPorId(id);
  if (!f) { admShell('clients', `<p class="empty">Ficha não encontrada.</p><button class="mini" id="fcVolta">← Clientes</button>`); $('#fcVolta').onclick = () => go('/adm/clients'); return; }
  const n = f.notas || {}, p = f.proximo;
  const x = p ? (Tours.get(p.ref.tourId) || { name: { pt: '' }, meeting: '' }) : null;
  const campo = (k, rot, ph) => `<label class="fld">${rot}<input data-fc="${k}" value="${esc(n[k] || '')}" placeholder="${esc(ph)}"></label>`;
  admShell('clients', `
    <button class="mini noprint" id="fcVolta">← Clientes</button>
    <article class="fichaDoc">
      <header class="fcCab">
        <div><small class="rotMini">Ficha do cliente${f.exemplo ? ' · <em class="exTag">exemplo</em>' : ''}</small>
          <h1 class="pageh">${esc(f.nome)}</h1>
          <p class="fcSub">${f.desde ? 'Cliente desde ' + dtBR(f.desde) : ''}${f.origem ? ' · veio por ' + esc(ORIGEM_FICHA[f.origem] || f.origem) : ''}${f.vezes > 1 ? ` · <b>voltou ${f.vezes}x</b>` : ''}</p></div>
        <div class="fcContato">
          ${f.whats ? `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink('', soDig(f.whats)))}">📱 ${esc(f.whats)}</a>` : ''}
          ${f.email ? `<a class="mini" href="mailto:${esc(f.email)}">✉️ ${esc(f.email)}</a>` : ''}
          ${f.insta ? `<a class="mini" target="_blank" rel="noopener" href="https://instagram.com/${esc(String(f.insta).replace(/^@/, ''))}">IG @${esc(String(f.insta).replace(/^@/, ''))}</a>` : ''}
        </div>
      </header>

      <div class="fcAcoes noprint">
        <a class="cta sm" target="_blank" rel="noopener" href="${esc(waLink(textoFicha(f, false)))}">📲 Mandar a ficha para o meu WhatsApp</a>
        <a class="mini" target="_blank" rel="noopener" href="${esc('https://wa.me/?text=' + encodeURIComponent(textoFicha(f, true)))}">Versão para colega ou motorista</a>
        <button class="mini" id="fcPdf">🖨 PDF</button>
      </div>

      ${p ? `<section class="card fcProx"><h3>🗓 Próximo: ${diaCurto(p.ref.date)} · ${esc(tl(x.name))}</h3>
        <p><b>${janelaDoTour({ time: p.ref.time, horas: p.ref.horas })}</b>${noIdioma(x.meeting) ? ' · 📍 ' + esc(noIdioma(x.meeting)) : ''}</p>
        <p>${p.ref.pax} ${p.ref.pax === 1 ? 'pessoa' : 'pessoas'}${f.hotel ? ' · 🏨 ' + esc(f.hotel) : ''} · pago ${eur(Bookings.paid(p.ref))}${Bookings.due(p.ref) > 0 ? ` · <b>falta ${eur(Bookings.due(p.ref))} no dia</b>` : ' · quitado'}</p>
        ${p.ref.obs ? `<p class="fcObs">💬 "${esc(p.ref.obs)}"</p>` : ''}
        <div class="tacts noprint"><a class="mini" href="#/voucher/${esc(p.ref.code)}">🎟 Voucher</a>
          <a class="mini" target="_blank" rel="noopener" href="${esc(waLink(msgLembrete(p.ref), soDig(p.ref.whats)))}">Lembrete</a>
          ${typeof gcalReserva === 'function' ? `<a class="mini" target="_blank" rel="noopener" href="${esc(gcalReserva(p.ref))}">📅 Google Agenda</a>` : ''}</div>
      </section>` : ''}

      <section class="card"><h3>👥 O grupo</h3>
        <p class="why">${esc(grupoTexto(f) || 'Tamanho do grupo ainda não informado.')}${f.hotel && !p ? ' · 🏨 ' + esc(f.hotel) : ''}</p>
        <div class="frow">${campo('idades', 'Idades', 'ex.: 2 adultos, crianças de 8 e 11')}${campo('pais', 'De onde vêm', 'cidade / país')}</div>
        <div class="frow">${campo('mobilidade', 'Mobilidade', 'ex.: joelho operado, evitar escadas')}${campo('alimentacao', 'Alimentação e alergias', 'ex.: vegetariana, sem glúten')}</div>
        ${campo('ocasiao', 'Ocasião especial', 'ex.: aniversário de 15 anos, lua de mel')}
        <div class="fcTags" role="group" aria-label="Etiquetas">${TAGS_FICHA.map(t2 => `<button type="button" class="chip ${(n.tags || []).includes(t2) ? 'on' : ''}" data-tag="${esc(t2)}" aria-pressed="${(n.tags || []).includes(t2)}">${esc(t2)}</button>`).join('')}</div>
        <label class="fld">Suas notas <small class="why">só você vê</small><textarea data-fc="notas" rows="3" placeholder="O que vale lembrar da próxima vez: gostos, pedidos, histórias…">${esc(n.notas || '')}</textarea></label>
        <button class="cta sm noprint" id="fcSalva">Salvar ficha</button>
      </section>

      <section class="card"><h3>🧾 Tudo o que comprou e pediu</h3>
        <div class="fcTime">${f.itens.map(i => `<div class="fcItem"><span class="fcIc">${ICONE_ITEM[i.tipo] || '•'}</span>
          <div><b>${esc(rotuloItem(i))}</b><small>${dtBR(i.quando)}${'total' in i ? ` · ${eur(i.total)}${i.total - i.pago > 0 ? ` · pago ${eur(i.pago)}` : ' · pago'}` : ''}${i.ref && i.ref.status === 'cancelled' ? ' · cancelada' : ''}</small></div>
          <span class="tacts noprint">${i.tipo === 'reserva' || i.tipo === 'consultoria' ? `<a class="mini" href="#/voucher/${esc(i.ref.code)}">Voucher</a>` : ''}
            ${i.tipo === 'roteiro' ? `<a class="mini" href="#/adm/roteiros/${esc(i.ref.id)}">Abrir</a>` : ''}
            ${i.tipo === 'presente' ? `<a class="mini" href="#/vale/${esc(i.ref.codigo)}">Ver vale</a>` : ''}
            ${i.tipo === 'transfer' ? `<a class="mini" href="#/adm/transfer">Abrir</a>` : ''}</span></div>`).join('')}</div>
        <div class="kpis fcKpis"><div class="kpi"><small>Total</small><b>${eur(f.total)}</b></div><div class="kpi"><small>Pago</small><b>${eur(f.pago)}</b></div>
          <div class="kpi ${f.aReceber > 0 ? 'warn' : ''}"><small>A receber</small><b>${eur(f.aReceber)}</b></div></div>
        <p class="why">Novidades por e-mail: ${f.consent ? '<b>aceitou</b>' : 'não aceitou'}.</p>
      </section>

      <p class="why fcPriv">🔒 Esta ficha é só sua — nenhum cliente vê. Pela lei de dados do Reino Unido (UK GDPR), a pessoa pode pedir para ver ou apagar o que você guarda dela.</p>
    </article>`);
  /* abriu = viu: sai de "pagou agora" */
  const ficha = () => { DB.fichas = DB.fichas || []; let r = DB.fichas.find(z => z.id === f.id); if (!r) { r = { id: f.id }; DB.fichas.push(r); } return r; };
  ficha().vistaEm = new Date().toISOString(); grava();
  $('#fcVolta').onclick = () => go('/adm/clients');
  $('#fcPdf').onclick = () => { document.body.classList.add('imprimeFicha'); window.print(); setTimeout(() => document.body.classList.remove('imprimeFicha'), 600); };
  $$('[data-tag]').forEach(b => b.onclick = () => { b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); });
  $('#fcSalva').onclick = () => {
    const r = ficha();
    $$('[data-fc]').forEach(el => { r[el.dataset.fc] = el.value.trim().slice(0, 1500); });
    r.tags = $$('[data-tag].on').map(b => b.dataset.tag);
    grava(); toast('Ficha salva ✓'); viewFicha(f.id);
  };
}

/* ---------- ligar: aba Clientes, Hoje e Reservas ---------- */
const _viewAdmFichas = viewAdm;
viewAdm = function (tab, arg) { if (tab === 'clients') return admFichas(arg); return _viewAdmFichas(tab, arg); };

const _admTodayFichas = admToday;
admToday = function () {
  _admTodayFichas();
  const grade = document.querySelector('#stage .hjGrade'); if (!grade) return;
  const novas = fichasTodas().filter(f => f.nova);
  if (!novas.length) return;
  grade.insertAdjacentHTML('afterbegin', `<section class="card hj"><h3>💷 Quem pagou <span class="pill warn">${novas.length}</span></h3>
    ${novas.slice(0, 6).map(f => { const i = f.itens.find(z => 'total' in z) || f.itens[0]; return `<div class="hjItem"><span class="hjIc">${ICONE_ITEM[i.tipo] || '💷'}</span>
      <div><b>${esc(f.nome)}</b><small>${esc(rotuloItem(i))} · ${eur(i.pago || 0)}</small></div><button class="mini" data-ir="/adm/clients/${encodeURIComponent(f.id)}">Ficha</button></div>`; }).join('')}
    <p class="why">Cada pagamento já virou ficha. Abra para completar idades, mobilidade e o que mais importa no dia.</p></section>`);
  $$('[data-ir]', grade).forEach(b => b.onclick = () => go(b.dataset.ir));
};

const _admBookingsFichas = admBookings;
admBookings = function () {
  _admBookingsFichas();
  DB.bookings.forEach(b => {
    const cx = document.getElementById('ta-' + b.id);
    if (cx && !cx.querySelector('.fcLink')) cx.insertAdjacentHTML('beforeend', `<a class="mini fcLink" href="#/adm/clients/${encodeURIComponent(fichaDe(b))}">👤 Ficha</a>`);
  });
};
