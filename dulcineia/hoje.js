/* =====================================================
   HOJE — o painel do dia, como no protótipo da Bia (16/10/2026)

   Pedido do Eugênio: "deixa como temos no protótipo BIA" (guia.eugeniofim.com
   /londres/ → carol-adm.js + boas-vindas.js). Lá a aba Hoje deixou de ser
   uma lista de saídas e virou "o que precisa de você agora", em blocos.

   Adaptado ao que a Dulcineia tem (sem agências, invoices nem avaliações):
   1. Boas-vindas na primeira vez (3 passos) — ela ainda não entrou no app.
   2. Hoje em TURNOS: Manhã e Tarde, livre / reservado (quem) / fechado.
      Substitui a lista "09:30 Berlim Histórico 0/20" × 8, que não fazia
      sentido para visita privativa (um grupo por turno, em qualquer passeio).
   3. Reservas novas (7 dias), com o que falta pagar.
   4. Pedidos de transfer e roteiro esperando resposta.
   5. Amanhã — lembrete de véspera com a mensagem pronta no WhatsApp,
      e os próximos passeios (14 dias).
   Os avisos de pagamento atrasado/vencendo hoje continuam (vêm da base).
   ===================================================== */
'use strict';

const hjData = (iso) => /^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
const hjPrimeiro = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const hjFicha = (b) => String(b.email || b.whats || b.name || '').toLowerCase();
function hjJanela(b) { const tu = typeof turnoDaHora === 'function' ? turnoDaHora(b.time) : null; return tu ? `${tu.nome} · ${tu.hora}–${tu.fim}` : (b.time || ''); }
function hjPasseio(b) { const x = Tours.get(b.tourId); return x ? tl(x.name) : 'passeio'; }

/* a mensagem de véspera, pronta para o WhatsApp do cliente */
function hjLembrete(b) {
  const x = Tours.get(b.tourId) || {};
  const saida = x.meeting ? (typeof noIdioma === 'function' ? noIdioma(x.meeting) : tl(x.meeting)) : '';
  const falta = Bookings.due(b);
  /* "No seu hotel em Berlim" + "eu busco no hotel" repetia: só acrescenta se o texto não falar de hotel */
  const busca = x.pickup && !/hotel/i.test(saida) ? ' — eu busco você no hotel' : '';
  const dados = [
    `📍 ${hjPasseio(b)}`,
    `🗓 ${hjData(b.date)} · ${hjJanela(b)}`,
    saida ? `🚩 Saída: ${saida}${busca}` : (x.pickup ? '🚩 Eu busco você no hotel' : ''),
    falta > 0 ? `💶 Saldo a acertar: ${eur(falta)}` : '',
  ].filter(Boolean);
  return [`Olá, ${hjPrimeiro(b.name)}! Aqui é ${guiaNome()}, da ${guiaNegocio()}. Passando para lembrar do nosso passeio:`, '', ...dados, '', 'Qualquer imprevisto, me chame aqui. Até lá!'].join('\n');
}
function hjWa(b, txt) {
  const num = String(b.whats || '').replace(/\D/g, '');
  return num.length >= 8 ? waLink(txt, num) : '';
}

const _admTodayBase = admToday;
admToday = function () {
  _admTodayBase();
  const stage = $('#stage'); if (!stage) return;
  const hoje = isoToday(), amanha = addDays(hoje, 1);
  const ativas = DB.bookings.filter(b => b.status !== 'cancelled');
  const item = (ic, tit, sub, acao, cls = '') =>
    `<div class="hjItem ${cls}"><span class="hjIc" aria-hidden="true">${ic}</span><div><b>${tit}</b>${sub ? `<small>${sub}</small>` : ''}</div>${acao ? `<span class="hjAcoes ${(acao.match(/class="mini/g) || []).length > 1 ? 'duas' : ''}">${acao}</span>` : ''}</div>`;
  /* sob consulta (valor 0) não é "pago": o valor ainda vai ser combinado */
  const situacao = (b) => !(+b.total > 0) ? 'valor a combinar' : Bookings.due(b) > 0 ? `<span class="bad">falta ${eur(Bookings.due(b))}</span>` : 'pago';
  const botWa = (b, txt, rot) => { const u = hjWa(b, txt); return u ? `<a class="mini" target="_blank" rel="noopener" href="${esc(u)}">${rot}</a>` : ''; };
  const botFicha = (b) => `<a class="mini" href="#/adm/clients/${encodeURIComponent(hjFicha(b))}">Ficha</a>`;
  const blocos = [];

  /* 2. hoje, em turnos */
  if (typeof modoTurnos === 'function' && modoTurnos()) {
    const passou = (tu) => typeof jaComecou === 'function' && jaComecou(hoje, tu.fim || tu.hora);
    const linhas = diaEmTurnos(hoje).map(({ tu, reservas, fechado, oferecido }) => {
      const rot = `${tu.nome} · ${tu.hora}–${tu.fim}`;
      if (reservas.length) return reservas.map(b => item('●', `${tu.nome} · ${esc(b.name)}`, `${tu.hora}–${tu.fim} · ${b.pax} ${+b.pax === 1 ? 'pessoa' : 'pessoas'} · ${esc(hjPasseio(b))}`,
        `${botWa(b, `Olá, ${hjPrimeiro(b.name)}! Aqui é ${guiaNome()}. `, 'WhatsApp')}${botFicha(b)}`, 'cheio')).join('');
      if (fechado) return item('–', rot, 'Fechado', '', 'off');
      if (passou(tu)) return item('○', rot, 'Livre — já passou', '', 'off');
      return item('○', rot, oferecido ? 'Livre' : 'Sem passeio neste turno', `<button class="mini" data-ir="/adm/agenda">Agenda</button>`);
    }).join('');
    blocos.push(`<section class="card hj"><h3>🗓 Hoje <span class="hjSub">${hjData(hoje)}</span></h3>${linhas}</section>`);
  }

  /* 3. reservas novas (7 dias) */
  const semana = new Date(Date.now() - 7 * 864e5).toISOString();
  const novas = ativas.filter(b => (b.createdAt || '') >= semana).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (novas.length) blocos.push(`<section class="card hj"><h3>🆕 Reservas novas <span class="pill warn">${novas.length}</span></h3>
    ${novas.slice(0, 6).map(b => {
      return item('🎟', esc(b.name), `${esc(hjPasseio(b))} · ${hjData(b.date)} · ${esc(hjJanela(b))} · ${situacao(b)}`, botFicha(b)); }).join('')}
    ${novas.length > 6 ? `<button class="mini" data-ir="/adm/bookings">Ver todas</button>` : ''}</section>`);

  /* 4. pedidos esperando resposta */
  const peds = typeof Pedidos !== 'undefined' ? Pedidos.all().filter(p => !p.respondido) : [];
  if (peds.length) blocos.push(`<section class="card hj"><h3>✉️ Pedidos esperando resposta <span class="pill warn">${peds.length}</span></h3>
    ${peds.slice(0, 6).map(p => item(p.tipo === 'transfer' ? '🚘' : '🗺️', esc(p.nome) + ' · ' + (p.tipo === 'transfer' ? 'transfer' : 'roteiro'), esc(String(p.resumo || '').replace(String(p.nome || '') + ' · ', '')),
      `${botWa(p, `Olá, ${hjPrimeiro(p.nome)}! Aqui é ${guiaNome()}, da ${guiaNegocio()}. Recebi seu pedido de ${p.tipo === 'transfer' ? 'transfer' : 'roteiro'}.`, 'Responder')}<button class="mini" data-ir="/adm/bookings">Ver</button>`)).join('')}</section>`);

  /* 5. amanhã + próximos */
  const doDia = (d) => ativas.filter(b => b.status === 'confirmed' && b.date === d).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const amanhaRes = doDia(amanha);
  const proximas = ativas.filter(b => b.status === 'confirmed' && b.date > amanha && b.date <= addDays(hoje, 14)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  blocos.push(`<section class="card hj"><h3>🔔 Amanhã — lembrete de véspera</h3>
    ${amanhaRes.length ? amanhaRes.map(b => item('🗓', esc(b.name) + ' · ' + esc(hjPasseio(b)), esc(hjJanela(b)) + ' · ' + b.pax + (+b.pax === 1 ? ' pessoa' : ' pessoas'),
      `${botWa(b, hjLembrete(b), 'Mandar lembrete')}${botFicha(b)}`)).join('') : '<p class="empty">Nenhum passeio amanhã.</p>'}
    ${proximas.length ? `<p class="rotMini">Próximos passeios</p>${proximas.slice(0, 4).map(b => item('📅', hjData(b.date) + ' · ' + esc(hjPrimeiro(b.name)), esc(hjPasseio(b)) + ' · ' + esc(hjJanela(b)),
      botWa(b, hjLembrete(b), 'Lembrete'))).join('')}` : ''}
    <p class="why">A mensagem vem pronta: passeio, dia, turno, ponto de saída e o saldo, se houver. É só tocar e enviar pelo seu WhatsApp.</p></section>`);

  /* a lista crua da base sai (virou o bloco "Hoje" em turnos); o aviso de pedidos também (virou bloco) */
  if (typeof modoTurnos === 'function' && modoTurnos())
    stage.querySelectorAll('.card:not(.hj)').forEach(c => { const h = c.querySelector('h3'); if (h && h.textContent.trim() === t('admToday')) c.remove(); });
  const avPed = stage.querySelector('#goPedidos'); if (avPed && peds.length) avPed.closest('.alert')?.remove();

  const h1 = stage.querySelector('.pageh');
  const html = `<div class="hjGrade">${blocos.join('')}</div>`;
  if (h1) h1.insertAdjacentHTML('afterend', html); else stage.insertAdjacentHTML('afterbegin', html);
  $$('[data-ir]', stage).forEach(b => b.onclick = () => go(b.dataset.ir));
  hjBoasVindas(stage);
};

/* 1. boas-vindas, só na primeira vez (como na Bia) */
const BV_CHAVE = (typeof DB_KEY !== 'undefined' ? String(DB_KEY).replace(/_db_v\d+$/, '') : 'berlim') + '_boasvindas';
function bvJaViu() { try { return localStorage.getItem(BV_CHAVE) === '1'; } catch (e) { return false; } }
function bvMarca() { try { localStorage.setItem(BV_CHAVE, '1'); } catch (e) {} }
function hjBoasVindas(stage) {
  if (bvJaViu() || stage.querySelector('#bvCard')) return;
  const nome = hjPrimeiro((DB.settings && DB.settings.admName) || guiaNome());
  const html = `<section class="card bvCard" id="bvCard">
    <button class="bvX" id="bvX" aria-label="Fechar">×</button>
    <div class="bvLogo">${typeof logoFull === 'function' ? logoFull({ mark: 34 }) : ''}</div>
    <h2 class="bvTit">Bem-vinda ao seu app, ${esc(nome)}!</h2>
    <p class="bvSub">Aqui é o seu lado — o painel onde você comanda tudo. É só seu: os seus clientes, as suas reservas e os seus números moram aqui. Dê uma volta à vontade; nada quebra.</p>
    <div class="bvPassos">
      <a class="bvP" href="#/adm/tours"><span class="bvN">1</span><span><b>Veja os seus passeios</b><small>Os quatro já estão aqui. Toque para ajustar fotos, textos e os turnos.</small></span></a>
      <button class="bvP" type="button" id="bvAssist"><span class="bvN">2</span><span><b>Fale com o assistente</b><small>O botão no canto. Peça por escrito ou por voz — ele mexe em todas as abas e mostra antes de gravar.</small></span></button>
      <a class="bvP" href="#/" target="_blank" rel="noopener"><span class="bvN">3</span><span><b>Veja o que o cliente vê</b><small>Abre a primeira tela do app, do jeito que o seu cliente abre.</small></span></a>
    </div>
    <button class="cta bvOk" id="bvOk">Vamos começar</button>
  </section>`;
  const h1 = stage.querySelector('.pageh');
  if (h1) h1.insertAdjacentHTML('afterend', html); else stage.insertAdjacentHTML('afterbegin', html);
  const fechar = () => { bvMarca(); document.getElementById('bvCard')?.remove(); };
  document.getElementById('bvOk').onclick = fechar;
  document.getElementById('bvX').onclick = fechar;
  const a = document.getElementById('bvAssist');
  if (a) a.onclick = () => { fechar(); if (typeof iaAbre === 'function') { if (typeof iaMonta === 'function') iaMonta(); iaAbre(); } };
}

/* o app.js já desenhou a tela ao carregar (antes deste arquivo): se ela abriu
   direto no painel, desenha de novo com o Hoje novo */
if (/^#\/adm(\/today)?\/?$/.test(location.hash) && typeof route === 'function') route();
