/* =====================================================
   FICHA DO CLIENTE — toca no cliente e abre o painel dele
   (pedido do Eugênio, 01/10/2026: "quando clica no cliente temos o dashboard
   completo de status e todas as infos do cliente; um mini dashboard do
   histórico do cliente em cima; em todos os apps de guias")

   APP DA MARI (06/10/2026): "cliente precisa todos terem uma ficha cadastral
   com todas as infos deles".
   - TODO cliente tem ficha: quem reservou (DB.bookings), quem mandou o
     "Personalize seu passeio" (DB.pedidos) e quem ela cadastrou à mão
     (DB.clientes). Mesma pessoa = uma ficha só (junta pelo WhatsApp, senão
     pelo e-mail, senão pelo nome).
   - FICHA CADASTRAL: identificação, contato, viagem, grupo, cuidados (o
     público dela é 50+/60+: mobilidade, saúde e contato de emergência
     importam) e como conheceu. Mora em DB.fichas[chave].cadastro.
   - Tudo isto é PRIVADO: vai para a nuvem linha a linha (nuvem-itens.js),
     nunca para os Ajustes, que são públicos.
   Chave do cliente = a mesma da lista (e-mail, senão WhatsApp, senão nome).
===================================================== */
(function () {
  const chaveDe = (b) => String(b.email || b.whats || b.name || '').toLowerCase();
  const digitos = (w) => String(w || '').replace(/\D/g, '');
  const tourDe = (b) => (Tours.all ? Tours.all() : []).find(x => x.id === b.tourId) || null;
  const nomeTour = (b) => { const x = tourDe(b); return x ? (typeof tl === 'function' ? tl(x.name) : x.name) : (b.tourName || 'Passeio'); };
  const dinheiro = (v) => (typeof eur === 'function' ? eur(v) : String(v));
  const dataF = (d) => d ? (typeof fmtDate === 'function' ? fmtDate(d) : d) : '—';
  const primeiro = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  const METODO = { card: 'cartão', applepay: 'Apple Pay', pix: 'Pix', wise: 'Wise', cash: 'dinheiro', transfer: 'transferência', other: 'outro' };

  /* ---------- quem é quem: reservas + clientes cadastrados + pedidos ---------- */
  function clientesExtras() { if (!Array.isArray(DB.clientes)) DB.clientes = []; return DB.clientes; }
  /* a chave de alguém que ainda não reservou: se já existe reserva com o mesmo WhatsApp
     ou e-mail, é a MESMA pessoa — usa a chave dela */
  function chavePara(c) {
    const w = digitos(c.whats), e = String(c.email || '').toLowerCase().trim();
    if (w.length >= 8 || e) {
      const b = DB.bookings.find(b => (w.length >= 8 && digitos(b.whats).endsWith(w.slice(-9))) || (e && String(b.email || '').toLowerCase() === e));
      if (b) return chaveDe(b);
      const x = clientesExtras().find(x => (w.length >= 8 && digitos(x.whats).endsWith(w.slice(-9))) || (e && String(x.email || '').toLowerCase() === e));
      if (x) return x.chave;
    }
    return String(e || c.whats || c.nome || '').toLowerCase().trim();
  }
  /* pedido do Personalize que chegou → a pessoa passa a ter ficha (uma vez) */
  function clientesDosPedidos() {
    let mudou = false;
    for (const p of DB.pedidos || []) {
      if (!p || !p.nome || p.clienteChave) continue;
      const chave = chavePara({ nome: p.nome, whats: p.whats, email: p.email });
      if (!chave) continue;
      const temReserva = DB.bookings.some(b => chaveDe(b) === chave);
      if (!temReserva && !clientesExtras().some(x => x.chave === chave))
        clientesExtras().push({ id: 'cl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), chave, nome: p.nome, whats: p.whats || '', email: p.email || '', origem: 'personalize', criado: p.criadoEm || new Date().toISOString() });
      p.clienteChave = chave; mudou = true;
    }
    if (mudou) save();
  }
  window.fichaChavePara = chavePara;
  window.fichaNovoCliente = function (c) {
    const chave = chavePara(c);
    if (!chave) return null;
    if (!DB.bookings.some(b => chaveDe(b) === chave) && !clientesExtras().some(x => x.chave === chave))
      clientesExtras().push({ id: 'cl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), chave, nome: c.nome, whats: c.whats || '', email: c.email || '', insta: c.insta || '', origem: c.origem || 'manual', criado: new Date().toISOString() });
    save(); return chave;
  };

  function fichaDe(key) {
    clientesDosPedidos();
    const hoje = isoToday();
    const bs = DB.bookings.filter(b => chaveDe(b) === key).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    const extra = clientesExtras().find(x => x.chave === key) || null;
    const f = (DB.fichas && DB.fichas[key]) || {};
    const cad = f.cadastro || {};
    if (!bs.length && !extra && !cad.nomeCompleto) return null;
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
    const desde = bs.map(b => (b.createdAt || b.date || '').slice(0, 10)).concat(extra ? [String(extra.criado || '').slice(0, 10)] : []).filter(Boolean).sort()[0] || '';
    const ref = bs.find(b => b.email) || bs.find(b => b.whats) || bs[0] || {};
    const consent = bs.find(b => b.consent && b.consent.ok);
    const origens = [...new Set(bs.map(b => b.origin).filter(Boolean).concat(extra && extra.origem ? [extra.origem === 'personalize' ? 'Personalize' : extra.origem] : []))];
    const pax = vivas.reduce((s, b) => s + (+b.pax || 0), 0);
    const nivel = vivas.length >= 4 ? 'VIP' : vivas.length >= 2 ? 'Recorrente' : vivas.length ? 'Novo' : 'Contato';
    const nome = cad.nomeCompleto || ref.name || (extra && extra.nome) || key;
    const whats = cad.whats || ref.whats || (extra && extra.whats) || '';
    const email = cad.email || ref.email || (extra && extra.email) || '';
    const insta = cad.insta || ref.insta || bs.map(b => b.insta).find(Boolean) || (extra && extra.insta) || '';
    const w = digitos(whats), e = String(email).toLowerCase();
    const pedidos = (DB.pedidos || []).filter(p => p.clienteChave === key || (w.length >= 8 && digitos(p.whats).endsWith(w.slice(-9))) || (e && String(p.email || '').toLowerCase() === e));
    return { key, nome, email, whats, insta, cad, extra, pedidos,
             bs, vivas, canc, pago, total, saldo, emAberto, atrasado, futuras, passadas, ultima, proxima, desde, consent, origens, pax, nivel, hoje };
  }
  window.fichaDe = fichaDe;

  /* ---------- a ficha cadastral: os campos ---------- */
  const CAD = [
    ['Identificação', [['nomeCompleto', 'Nome completo', 'text', 'como no documento'], ['nascimento', 'Data de nascimento', 'date'], ['nacionalidade', 'Nacionalidade', 'text', 'brasileira'], ['documento', 'Documento', 'text', 'passaporte, RG ou CPF']]],
    ['Contato', [['whats', 'WhatsApp', 'tel', '+55 11 9…'], ['email', 'E-mail', 'email'], ['insta', 'Instagram', 'text', '@'], ['cidade', 'Cidade e estado no Brasil', 'text', 'Porto Alegre / RS'], ['endereco', 'Endereço', 'text'], ['contatoEmergencia', 'Contato de emergência', 'text', 'nome e telefone']]],
    ['Viagem', [['chegada', 'Chega em', 'date'], ['partida', 'Volta em', 'date'], ['voo', 'Voos', 'text', 'ex.: TP 752 chega 10h40 · volta LH 829'], ['hotel', 'Hospedagem em Copenhague', 'text', 'hotel ou endereço']]],
    ['Grupo', [['adultos', 'Adultos', 'number'], ['criancas', 'Crianças', 'number'], ['idades', 'Idades das crianças', 'text', 'ex.: 4 e 9 anos'], ['acompanhantes', 'Quem vem junto', 'textarea', 'nomes e parentesco']]],
    ['Cuidados', [['mobilidade', 'Mobilidade', 'text', 'anda bem, bengala, cadeira de rodas, evitar escadas…'], ['saude', 'Saúde', 'text', 'alergias, medicação, algo para saber'], ['alimentacao', 'Alimentação', 'text', 'vegetariana, sem glúten, sem lactose…']]],
    ['Outros', [['ocasiao', 'Ocasião especial', 'text', 'aniversário, lua de mel, bodas…'], ['comoConheceu', 'Como conheceu', 'select', ['', 'Instagram', 'Indicação de amigo', 'Agência', 'Google', 'Já foi cliente', 'Outro']], ['idioma', 'Idioma', 'text', 'português'], ['observacoes', 'Observações', 'textarea']]],
  ];
  window.FICHA_CAMPOS = CAD.flatMap(([, l]) => l.map(c => c[0]));
  const ESSENCIAIS = ['nomeCompleto', 'nascimento', 'documento', 'whats', 'email', 'contatoEmergencia', 'chegada', 'partida', 'hotel'];
  function completa(F) {
    const v = (k) => k === 'whats' ? F.whats : k === 'email' ? F.email : F.cad[k];
    const ok = ESSENCIAIS.filter(k => String(v(k) || '').trim()).length;
    return { ok, de: ESSENCIAIS.length };
  }
  window.fichaCompleta = (key) => { const F = fichaDe(key); return F ? completa(F) : null; };

  function situacao(F) {
    const partes = [];
    if (F.vivas.length) {
      if (F.atrasado.length) partes.push(`<span class="pill bad">⚠ saldo atrasado: ${dinheiro(F.atrasado.reduce((s, b) => s + Bookings.due(b), 0))}</span>`);
      else if (F.saldo > 0) partes.push(`<span class="pill warn">a receber: ${dinheiro(F.saldo)}</span>`);
      else partes.push('<span class="pill ok">✓ tudo pago</span>');
    }
    if (F.proxima) partes.push(`<span class="pill n">próximo: ${dataF(F.proxima.date)} · ${esc(nomeTour(F.proxima))}</span>`);
    else partes.push(`<span class="pill">sem reserva futura${F.ultima ? ' · última em ' + dataF(F.ultima.date) : ''}</span>`);
    const c = completa(F);
    partes.push(`<span class="pill ${c.ok === c.de ? 'ok' : 'warn'}">ficha ${c.ok}/${c.de}</span>`);
    if (F.vivas.length) partes.push(`<span class="pill ${F.consent ? 'ok' : ''}">${F.consent ? '✓ aceita e-mails' : 'sem autorização de e-mail'}</span>`);
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
      <td><span class="pill ${st[0]}">${st[1]}</span>${b.status === 'confirmed' && due > 0 && typeof linkPagamento === 'function' ? `<br><button class="mini" data-linkpg="${esc(b.id)}" style="margin-top:4px">link para pagar</button>` : ''}</td></tr>`;
  }
  /* quanto pedir no link: sem nada pago e reserva "metade agora" = o sinal; senão, o que falta */
  window.valorDoLink = function (b) {
    const pago = Bookings.paid(b), due = Bookings.due(b);
    if (!pago && b.policy === 'split') return Math.min(due, Math.round((+b.total || 0) / 2));
    return due;
  };

  function campoHtml([k, rot, tipo, ph], F) {
    const v = k === 'whats' ? (F.cad.whats || F.whats) : k === 'email' ? (F.cad.email || F.email) : k === 'insta' ? (F.cad.insta || F.insta) : k === 'nomeCompleto' ? (F.cad.nomeCompleto || '') : (F.cad[k] ?? '');
    if (tipo === 'textarea') return `<label class="fld fc-wide">${rot}<textarea data-cad="${k}" rows="2" placeholder="${esc(ph || '')}">${esc(v)}</textarea></label>`;
    if (tipo === 'select') return `<label class="fld">${rot}<select data-cad="${k}">${ph.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(o || '—')}</option>`).join('')}</select></label>`;
    return `<label class="fld">${rot}<input data-cad="${k}" type="${tipo}" ${tipo === 'number' ? 'min="0" max="60"' : ''} value="${esc(v)}" placeholder="${esc(ph || '')}" ${tipo === 'tel' ? 'inputmode="tel"' : ''}></label>`;
  }

  function css() {
    if (document.getElementById('fichaCss')) return;
    const s = document.createElement('style'); s.id = 'fichaCss';
    s.textContent = `.cli{cursor:pointer}.cli:hover td{background:rgba(0,0,0,.035)}
      .fc-cab{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px}
      .fc-cab .pageh{margin:0}.fc-nivel{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:var(--accent,#064c3f);color:var(--accent-ink,#fff)}
      .fc-sit{display:flex;gap:7px;flex-wrap:wrap;margin:6px 0 14px}
      .fc-contato{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .fc-cancel td{opacity:.55;text-decoration:line-through}
      .fc-nota{width:100%;min-height:90px;font:inherit;padding:10px;border:1px solid var(--line,#ddd);border-radius:10px;resize:vertical}
      .fc-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .fc-cad{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px 14px}
      .fc-cad .fc-wide{grid-column:1/-1}
      .fc-cad textarea{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical}
      .fc-cad select{min-height:44px}
      .fc-grupo{margin:16px 0 6px;font:700 11px/1 var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
      .fc-grupo:first-child{margin-top:4px}
      .fc-ped{padding:10px 0;border-bottom:1px solid var(--line)}.fc-ped:last-child{border-bottom:0}
      .fc-ped small{display:block;color:var(--ink-3)}
      .pill.bad{background:#fde8e8;color:#9b1c1c}
      @media(max-width:700px){.fc-tbl th:nth-child(3),.fc-tbl td:nth-child(3){display:none}}`;
    document.head.appendChild(s);
  }

  window.admFichaCliente = function (key) {
    css();
    const F = fichaDe(String(key || '').toLowerCase());
    if (!F) { admShell('clients', `<a class="mini" href="#/adm/clients">← clientes</a><h1 class="pageh">Cliente não encontrado</h1>`); return; }
    const nota = (DB.fichas && DB.fichas[F.key]) || {};
    const zap = F.whats ? waLink(`Oi ${primeiro(F.nome)}, tudo bem?`, digitos(F.whats)) : '';
    const cobrar = F.whats && F.saldo > 0 ? waLink(`Oi ${primeiro(F.nome)}, tudo bem? Passando pra lembrar do saldo de ${dinheiro(F.saldo)}${F.proxima ? ' do passeio de ' + dataF(F.proxima.date) : ''}, que você paga em euro no dia do passeio. Qualquer dúvida, é só me chamar!`, digitos(F.whats)) : '';
    const pedeFicha = F.whats ? waLink(`Oi ${primeiro(F.nome)}! Para eu preparar tudo direitinho, me manda por favor: nome completo e data de nascimento de cada um, documento (passaporte), voos de chegada e volta, onde vão se hospedar, e um contato de emergência. Se alguém tiver alguma restrição de alimentação ou de mobilidade, me conta também. 😊`, digitos(F.whats)) : '';
    const c = completa(F);
    admShell('clients', `
      <a class="mini" href="#/adm/clients">← todos os clientes</a>
      <div class="fc-cab"><h1 class="pageh">${esc(F.nome)}</h1><span class="fc-nivel">${F.nivel}</span></div>
      <div class="fc-sit">${situacao(F)}</div>
      ${F.vivas.length ? `<div class="kpis" id="fcKpis">
        <div class="kpi"><small>Gasto com você</small><b>${dinheiro(F.pago)}</b></div>
        <div class="kpi"><small>Passeios</small><b>${F.vivas.length}${F.canc.length ? ` <span style="font-size:13px;opacity:.6">· ${F.canc.length} cancel.</span>` : ''}</b></div>
        <div class="kpi ${F.atrasado.length ? 'warn' : ''}"><small>A receber</small><b>${F.saldo > 0 ? dinheiro(F.saldo) : '—'}</b></div>
        <div class="kpi"><small>Pessoas trazidas</small><b>${F.pax}</b></div>
        <div class="kpi"><small>Última visita</small><b style="font-size:17px">${F.ultima ? dataF(F.ultima.date) : '—'}</b></div>
        <div class="kpi"><small>Próxima</small><b style="font-size:17px">${F.proxima ? dataF(F.proxima.date) : '—'}</b></div>
        <div class="kpi"><small>Cliente desde</small><b style="font-size:17px">${F.desde ? dataF(F.desde) : '—'}</b></div>
      </div>` : ''}
      <section class="card">
        <h3>Contato</h3>
        <div class="fc-contato">
          ${F.whats ? `<a class="ico-btn wa" target="_blank" rel="noopener" href="${zap}" title="WhatsApp">${ICO.whats}<span>${esc(F.whats)}</span></a>` : ''}
          ${F.email ? `<a class="ico-btn ml" href="mailto:${esc(F.email)}">${ICO.mail}<span>${esc(F.email)}</span></a>` : ''}
          ${F.insta ? `<a class="ico-btn ig" target="_blank" rel="noopener" href="https://instagram.com/${esc(F.insta.replace(/^@/, ''))}">${ICO.insta || ''}<span>@${esc(F.insta.replace(/^@/, ''))}</span></a>` : ''}
          ${F.origens.length ? `<span class="pill">veio por: ${esc(F.origens.join(', '))}</span>` : ''}
          ${!F.whats && !F.email ? '<span class="why">Sem contato ainda — preencha na ficha cadastral abaixo.</span>' : ''}
        </div>
        <div class="fc-acoes">
          ${cobrar ? `<a class="cta sm" target="_blank" rel="noopener" href="${cobrar}">Lembrar do saldo pelo WhatsApp</a>` : ''}
          ${pedeFicha && c.ok < c.de ? `<a class="mini" target="_blank" rel="noopener" href="${pedeFicha}">Pedir os dados que faltam</a>` : ''}
          ${F.vivas.length ? '<a class="mini" href="#/adm/bookings">Reservas</a>' : ''}
        </div>
      </section>
      <section class="card" id="fcCad">
        <h3>Ficha cadastral <small class="why" style="font-weight:500">· ${c.ok} de ${c.de} essenciais preenchidos</small></h3>
        ${CAD.map(([g, l]) => `<p class="fc-grupo">${g}</p><div class="fc-cad">${l.map(x => campoHtml(x, F)).join('')}</div>`).join('')}
        <div class="fc-acoes"><button class="cta sm" id="fcCadSalvar">Salvar a ficha</button><small id="fcCadQuando" style="align-self:center;opacity:.7">${nota.cadastroEm ? 'salva em ' + dataF(String(nota.cadastroEm).slice(0, 10)) : ''}</small></div>
      </section>
      ${F.pedidos.length ? `<section class="card"><h3>Pedidos do "Personalize" (${F.pedidos.length})</h3>
        ${F.pedidos.map(p => `<div class="fc-ped"><b>${esc(dataF(String(p.criadoEm || '').slice(0, 10)))}${p.quando ? ' · viagem ' + esc(p.quando) : ''}</b>
          <small>${esc([p.pessoas ? p.pessoas + ' pessoa(s)' : '', p.idades ? 'crianças: ' + p.idades : '', (p.gostos || []).join(', ')].filter(Boolean).join(' · '))}</small>
          ${(p.precisaTxt || []).length ? `<small>Precisa: ${esc(p.precisaTxt.join(', '))}</small>` : ''}
          ${(p.kidsTxt || []).length ? `<small>Para as crianças: ${esc(p.kidsTxt.join(', '))}</small>` : ''}
          ${p.obs ? `<small>“${esc(p.obs)}”</small>` : ''}</div>`).join('')}</section>` : ''}
      ${typeof brindesSecaoFicha === 'function' ? brindesSecaoFicha(F) : ''}
      ${F.bs.length ? `<section class="card">
        <h3>Histórico (${F.bs.length})</h3>
        <table class="tbl fc-tbl"><thead><tr><th>Quando</th><th>Passeio</th><th class="right">Valor</th><th class="right">Pago</th><th class="right">Falta</th><th>Situação</th></tr></thead>
        <tbody>${F.bs.map(b => linhaReserva(b, F)).join('')}</tbody></table>
      </section>` : ''}
      <section class="card">
        <h3>Anotações</h3>
        <textarea class="fc-nota" id="fcNota" placeholder="Preferências, o que ele comentou, o que combinar da próxima vez…">${esc(nota.texto || '')}</textarea>
        <div class="fc-acoes"><button class="cta sm" id="fcSalvar">Salvar</button><small id="fcQuando" style="align-self:center;opacity:.7">${nota.em ? 'salvo em ' + dataF(String(nota.em).slice(0, 10)) : ''}</small></div>
      </section>`);
    const ta = document.getElementById('fcNota');
    document.getElementById('fcSalvar').onclick = () => {
      DB.fichas = DB.fichas || {};
      DB.fichas[F.key] = Object.assign({}, DB.fichas[F.key] || {}, { texto: ta.value.trim(), em: new Date().toISOString() });
      save(); document.getElementById('fcQuando').textContent = 'salvo agora';
      if (typeof toast === 'function') toast('Anotação guardada');
    };
    document.getElementById('fcCadSalvar').onclick = () => {
      const cad = {};
      document.querySelectorAll('#fcCad [data-cad]').forEach(el => { const v = el.value.trim(); if (v !== '') cad[el.dataset.cad] = el.type === 'number' ? (+v || 0) : v; });
      if (cad.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cad.email)) { toast('Confira o e-mail'); return; }
      DB.fichas = DB.fichas || {};
      DB.fichas[F.key] = Object.assign({}, DB.fichas[F.key] || {}, { nome: cad.nomeCompleto || F.nome, cadastro: cad, cadastroEm: new Date().toISOString() });
      /* quem ainda não reservou: o contato da lista acompanha a ficha */
      const x = clientesExtras().find(z => z.chave === F.key);
      if (x) { if (cad.nomeCompleto) x.nome = cad.nomeCompleto; if (cad.whats) x.whats = cad.whats; if (cad.email) x.email = cad.email; if (cad.insta) x.insta = cad.insta; }
      save(); toast('Ficha salva'); window.admFichaCliente(F.key);
    };
    if (typeof brindesLigaFicha === 'function') brindesLigaFicha(F);
    document.querySelectorAll('[data-linkpg]').forEach(bt => bt.onclick = () => {
      const b = DB.bookings.find(z => z.id === bt.dataset.linkpg); if (!b) return;
      const v = window.valorDoLink(b), url = linkPagamento(b, v);
      const sinal = !Bookings.paid(b) && b.policy === 'split';
      const msg = `Oi ${primeiro(b.name)}! Para garantir a sua reserva (${nomeTour(b)}, ${dataF(b.date)}), ${sinal ? 'o sinal é de ' : 'falta '}${dinheiro(v)}. Por este link você paga por Pix ou Wise:\n${url}${sinal && DB.settings.saldoNoDia ? `\n\nO restante (${dinheiro(Bookings.due(b) - v)}) você paga em euro, em dinheiro, no dia do passeio.` : ''}`;
      if (digitos(b.whats).length >= 8) window.open(waLink(msg, digitos(b.whats)), '_blank', 'noopener');
      else { try { navigator.clipboard.writeText(url); } catch (e) {} toast('Link copiado (o cliente não tem WhatsApp na reserva)'); }
    });
  };

  /* a lista de clientes: quem reservou + quem só tem ficha (Personalize ou cadastrado à mão) */
  const _todos = Clients.all.bind(Clients);
  Clients.all = function () {
    clientesDosPedidos();
    const lista = _todos();
    const tem = new Set(lista.map(c => String(c.email || c.whats || c.name).toLowerCase()));
    for (const x of clientesExtras()) {
      if (tem.has(x.chave)) continue;
      lista.push({ name: (DB.fichas && DB.fichas[x.chave] && DB.fichas[x.chave].cadastro && DB.fichas[x.chave].cadastro.nomeCompleto) || x.nome, email: x.email || '', whats: x.whats || '', insta: x.insta || '',
        tours: 0, spent: 0, last: '', origins: new Set([x.origem || 'manual']), consent: false, consentAt: '', chave: x.chave, semReserva: true });
    }
    return lista;
  };
  window.ligarFichas = function () {
    css();
    document.querySelectorAll('tr.cli').forEach(r => { r.onclick = (e) => { if (e.target.closest('a,button')) return; go('/adm/clients/' + encodeURIComponent(r.dataset.cli)); }; });
    /* "+ Novo cliente" no topo da lista */
    const cab = document.querySelector('.pagehead .chips');
    if (cab && !document.getElementById('clNovo')) {
      cab.insertAdjacentHTML('afterbegin', '<button class="cta sm" id="clNovo">+ Novo cliente</button>');
      document.getElementById('clNovo').onclick = () => {
        const nome = prompt('Nome do cliente:'); if (!nome || !nome.trim()) return;
        const whats = prompt('WhatsApp (opcional):') || '';
        const chave = window.fichaNovoCliente({ nome: nome.trim(), whats: whats.trim(), origem: 'manual' });
        if (chave) go('/adm/clients/' + encodeURIComponent(chave));
      };
    }
    /* quem ainda não reservou ganha a etiqueta e o link certo */
    document.querySelectorAll('tr.cli').forEach(r => {
      const c = window.fichaCompleta(r.dataset.cli); if (!c) return;
      const td = r.querySelector('td'); if (td && !td.querySelector('.fcPct')) td.insertAdjacentHTML('beforeend', ` <span class="pill fcPct ${c.ok === c.de ? 'ok' : ''}" title="ficha cadastral">ficha ${c.ok}/${c.de}</span>`);
    });
  };
})();
