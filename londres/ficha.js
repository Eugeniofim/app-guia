/* =====================================================
   FICHA DO CLIENTE — toca no cliente e abre o painel dele
   (pedido do Eugênio, 01/10/2026: "quando clica no cliente temos o dashboard
   completo de status e todas as infos do cliente; um mini dashboard do
   histórico do cliente em cima; em todos os apps de guias")

   Tudo sai das reservas que o app já tem (DB.bookings). A ficha não cria
   coleção nova — só as anotações, em DB.fichas[chave] (vão na nuvem com o resto).
   Chave do cliente = a mesma da lista (e-mail, senão WhatsApp, senão nome).
===================================================== */
(function () {
  const chaveDe = (b) => String(b.email || b.whats || b.name || '').toLowerCase();
  const tourDe = (b) => (Tours.all ? Tours.all() : []).find(x => x.id === b.tourId) || null;
  const nomeTour = (b) => { const x = tourDe(b); return x ? (typeof tl === 'function' ? tl(x.name) : x.name) : (b.tourName || 'Passeio'); };
  const dinheiro = (v) => (typeof eur === 'function' ? eur(v) : String(v));
  const dataF = (d) => d ? (typeof fmtDate === 'function' ? fmtDate(d) : d) : '—';
  const primeiro = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  const METODO = { card: 'cartão', applepay: 'Apple Pay', pix: 'Pix', cash: 'dinheiro', transfer: 'transferência', other: 'outro' };

  function fichaDe(key) {
    const hoje = isoToday();
    const bs = DB.bookings.filter(b => chaveDe(b) === key).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    if (!bs.length) return null;
    const vivas = bs.filter(b => b.status !== 'cancelled');
    const canc = bs.filter(b => b.status === 'cancelled');
    const pago = vivas.reduce((s, b) => s + Bookings.paid(b), 0);
    const total = vivas.reduce((s, b) => s + (+b.total || 0), 0);
    const emAberto = vivas.filter(b => b.status === 'confirmed' && Bookings.due(b) > 0);
    const saldo = emAberto.reduce((s, b) => s + Bookings.due(b), 0);
    const atrasado = emAberto.filter(b => Bookings.dueDate(b) < hoje);
    const futuras = vivas.filter(b => b.date >= hoje).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    const passadas = vivas.filter(b => b.date < hoje);
    const ultima = passadas[0] || null, proxima = futuras[0] || null;
    const desde = bs.map(b => (b.createdAt || b.date || '').slice(0, 10)).filter(Boolean).sort()[0] || '';
    const ref = bs.find(b => b.email) || bs.find(b => b.whats) || bs[0];
    const consent = bs.find(b => b.consent && b.consent.ok);
    const origens = [...new Set(bs.map(b => b.origin).filter(Boolean))];
    const pax = vivas.reduce((s, b) => s + (+b.pax || 0), 0);
    const nivel = vivas.length >= 4 ? 'VIP' : vivas.length >= 2 ? 'Recorrente' : 'Novo';
    return { key, nome: ref.name, email: ref.email || '', whats: ref.whats || '', insta: ref.insta || bs.map(b => b.insta).find(Boolean) || '',
             bs, vivas, canc, pago, total, saldo, emAberto, atrasado, futuras, passadas, ultima, proxima, desde, consent, origens, pax, nivel, hoje };
  }

  function situacao(F) {
    const partes = [];
    if (F.atrasado.length) partes.push(`<span class="pill bad">⚠ saldo atrasado: ${dinheiro(F.atrasado.reduce((s, b) => s + Bookings.due(b), 0))}</span>`);
    else if (F.saldo > 0) partes.push(`<span class="pill warn">saldo em aberto: ${dinheiro(F.saldo)}</span>`);
    else partes.push('<span class="pill ok">✓ tudo pago</span>');
    if (F.proxima) partes.push(`<span class="pill n">próximo: ${dataF(F.proxima.date)} · ${esc(nomeTour(F.proxima))}</span>`);
    else partes.push(`<span class="pill">sem reserva futura${F.ultima ? ' · última em ' + dataF(F.ultima.date) : ''}</span>`);
    partes.push(`<span class="pill ${F.consent ? 'ok' : ''}">${F.consent ? '✓ aceita e-mails' : 'sem autorização de e-mail'}</span>`);
    return partes.join(' ');
  }

  function linhaReserva(b, F) {
    const pago = Bookings.paid(b), due = b.status === 'cancelled' ? 0 : Bookings.due(b);
    const st = b.status === 'cancelled' ? ['bad', 'cancelada'] : b.date < F.hoje ? ['', 'feita'] : due > 0 ? ['warn', 'confirmada · falta pagar'] : ['ok', 'confirmada'];
    const pags = (b.payments || []).map(p => `<small class="mono">${dataF(p.date)} · ${esc(METODO[p.method] || p.method || '')} · ${dinheiro(p.amount)}</small>`).join('<br>');
    return `<tr class="${b.status === 'cancelled' ? 'fc-cancel' : ''}">
      <td class="mono">${dataF(b.date)}${b.time ? '<br><small>' + esc(b.time) + '</small>' : ''}</td>
      <td><b>${esc(nomeTour(b))}</b><br><small class="mono">${esc(b.code || '')} · ${b.pax || 1} pessoa${(+b.pax || 1) > 1 ? 's' : ''}</small>${pags ? '<br>' + pags : ''}</td>
      <td class="mono right">${dinheiro(b.total || 0)}</td>
      <td class="mono right">${dinheiro(pago)}</td>
      <td class="mono right">${due > 0 ? dinheiro(due) : '—'}</td>
      <td><span class="pill ${st[0]}">${st[1]}</span></td></tr>`;
  }

  function css() {
    if (document.getElementById('fichaCss')) return;
    const s = document.createElement('style'); s.id = 'fichaCss';
    s.textContent = `.cli{cursor:pointer}.cli:hover td{background:rgba(0,0,0,.035)}
      .fc-cab{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px}
      .fc-cab .pageh{margin:0}.fc-nivel{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:var(--accent,#4A1D6E);color:#fff}
      .fc-sit{display:flex;gap:7px;flex-wrap:wrap;margin:6px 0 14px}
      .fc-contato{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .fc-cancel td{opacity:.55;text-decoration:line-through}
      .fc-nota{width:100%;min-height:90px;font:inherit;padding:10px;border:1px solid var(--line,#ddd);border-radius:10px;resize:vertical}
      .fc-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .pill.bad{background:#fde8e8;color:#9b1c1c}
      @media(max-width:700px){.fc-tbl th:nth-child(3),.fc-tbl td:nth-child(3){display:none}}`;
    document.head.appendChild(s);
  }

  window.admFichaCliente = function (key) {
    css();
    const F = fichaDe(String(key || '').toLowerCase());
    if (!F) { admShell('clients', `<a class="mini" href="#/adm/clients">← clientes</a><h1 class="pageh">Cliente não encontrado</h1>`); return; }
    const nota = (DB.fichas && DB.fichas[F.key]) || {};
    const zap = F.whats ? waLink(`Oi ${primeiro(F.nome)}, tudo bem?`, F.whats.replace(/\D/g, '')) : '';
    const cobrar = F.whats && F.saldo > 0 ? waLink(`Oi ${primeiro(F.nome)}, tudo bem? Passando pra lembrar do saldo de ${dinheiro(F.saldo)}${F.proxima ? ' do passeio de ' + dataF(F.proxima.date) : ''}. Qualquer dúvida, é só me chamar!`, F.whats.replace(/\D/g, '')) : '';
    admShell('clients', `
      <a class="mini" href="#/adm/clients">← todos os clientes</a>
      <div class="fc-cab"><h1 class="pageh">${esc(F.nome)}</h1><span class="fc-nivel">${F.nivel}</span></div>
      <div class="fc-sit">${situacao(F)}</div>
      <div class="kpis" id="fcKpis">
        <div class="kpi"><small>Gasto com você</small><b>${dinheiro(F.pago)}</b></div>
        <div class="kpi"><small>Passeios</small><b>${F.vivas.length}${F.canc.length ? ` <span style="font-size:13px;opacity:.6">· ${F.canc.length} cancel.</span>` : ''}</b></div>
        <div class="kpi ${F.atrasado.length ? 'warn' : ''}"><small>Em aberto</small><b>${F.saldo > 0 ? dinheiro(F.saldo) : '—'}</b></div>
        <div class="kpi"><small>Pessoas trazidas</small><b>${F.pax}</b></div>
        <div class="kpi"><small>Última visita</small><b style="font-size:17px">${F.ultima ? dataF(F.ultima.date) : '—'}</b></div>
        <div class="kpi"><small>Próxima</small><b style="font-size:17px">${F.proxima ? dataF(F.proxima.date) : '—'}</b></div>
        <div class="kpi"><small>Cliente desde</small><b style="font-size:17px">${F.desde ? dataF(F.desde) : '—'}</b></div>
      </div>
      <section class="card">
        <h3>Contato</h3>
        <div class="fc-contato">
          ${F.whats ? `<a class="ico-btn wa" target="_blank" rel="noopener" href="${zap}" title="WhatsApp">${ICO.whats}<span>${esc(F.whats)}</span></a>` : ''}
          ${F.email ? `<a class="ico-btn ml" href="mailto:${esc(F.email)}">${ICO.mail}<span>${esc(F.email)}</span></a>` : ''}
          ${F.insta ? `<a class="ico-btn ig" target="_blank" rel="noopener" href="https://instagram.com/${esc(F.insta.replace(/^@/, ''))}">${ICO.insta || ''}<span>@${esc(F.insta.replace(/^@/, ''))}</span></a>` : ''}
          ${F.origens.length ? `<span class="pill">veio por: ${esc(F.origens.join(', '))}</span>` : ''}
        </div>
        <div class="fc-acoes">
          ${cobrar ? `<a class="cta sm" target="_blank" rel="noopener" href="${cobrar}">Cobrar o saldo pelo WhatsApp</a>` : ''}
          <a class="mini" href="#/adm/bookings">Reservas</a>
        </div>
      </section>
      <section class="card">
        <h3>Histórico (${F.bs.length})</h3>
        <table class="tbl fc-tbl"><thead><tr><th>Quando</th><th>Passeio</th><th class="right">Valor</th><th class="right">Pago</th><th class="right">Falta</th><th>Situação</th></tr></thead>
        <tbody>${F.bs.map(b => linhaReserva(b, F)).join('')}</tbody></table>
      </section>
      <section class="card">
        <h3>Anotações</h3>
        <textarea class="fc-nota" id="fcNota" placeholder="Preferências, restrições, o que ele comentou, o que combinar da próxima vez…">${esc(nota.texto || '')}</textarea>
        <div class="fc-acoes"><button class="cta sm" id="fcSalvar">Salvar</button><small id="fcQuando" style="align-self:center;opacity:.7">${nota.em ? 'salvo em ' + dataF(String(nota.em).slice(0, 10)) : ''}</small></div>
      </section>`);
    const ta = document.getElementById('fcNota');
    document.getElementById('fcSalvar').onclick = () => {
      DB.fichas = DB.fichas || {};
      DB.fichas[F.key] = { texto: ta.value.trim(), em: new Date().toISOString() };
      save(); document.getElementById('fcQuando').textContent = 'salvo agora';
      if (typeof toast === 'function') toast('Anotação guardada');
    };
  };
  /* a lista de clientes: cada linha abre a ficha */
  window.ligarFichas = function () {
    css();
    document.querySelectorAll('tr.cli').forEach(r => { r.onclick = (e) => { if (e.target.closest('a,button')) return; go('/adm/clients/' + encodeURIComponent(r.dataset.cli)); }; });
  };
})();
