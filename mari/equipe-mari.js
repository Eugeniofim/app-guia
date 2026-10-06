/* =====================================================
   EQUIPE E ESCALA (06/10/2026)

   Pedido: "guia freelancer vê só a própria escala". Ainda não há login para
   a equipe, então cada pessoa recebe um LINK PRIVADO, só de leitura, com os
   passeios DELA (o conteúdo vai dentro do link, depois do # — publico-mari.js).
   O link é uma fotografia: se mudar algo, a Mari manda um link novo.

   - DB.equipe (PRIVADO, sobe linha a linha pelo nuvem-itens.js):
     [{id, nome, whats, email, tipo:'guia'|'motorista', idiomas, obs, ativo}]
     Nasce com o César e a Marina (guias), contatos vazios — a aba pede para
     completar. Ids da semente fixos: dois aparelhos não duplicam.
   - Na reserva: b.guiaId (e b.motoristaId). Gravar = save() + cloudUpdateBooking(b).
   - Aba "Equipe e escala" (depois de Tarefas): pessoas, passeios sem guia
     nos próximos 60 dias (escolher quem faz), a escala de cada um e o botão
     que manda o link no WhatsApp da pessoa.
   - Agenda: no dia escolhido, cada passeio reservado ganha "Guia: [quem]".
   - Página pública #/es/… : "Escala de <nome>", por dia, só leitura.

   window.Equipe = { all, get, add(c), update(id, c), remove(id),
     escalar(code, pessoaId, papel='guia'), deQuem(code, papel='guia') → pessoa|null,
     escalaDe(pessoaId, dias=60) → [reservas], semGuia(dias=60) → [reservas],
     servicos(pessoaId, { comValores, dias }) → [itens do link],
     linkEscala(pessoaId, { comValores }) → Promise<url>, mensagemEscala(pessoaId, opts) → Promise<string> }
   ===================================================== */
'use strict';

const EQ_SEMENTE = [
  { id: 'eq-cesar', nome: 'César', tipo: 'guia' },
  { id: 'eq-marina', nome: 'Marina', tipo: 'guia' },
];
const EQ_TIPOS = { guia: 'Guia', motorista: 'Motorista' };
const eqHoje = () => (typeof agHoje === 'function' ? agHoje() : isoToday());
const eqDig = (w) => String(w || '').replace(/\D/g, '');
const eqPrimeiro = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const eqChaveCliente = (b) => String(b.email || b.whats || b.name || '').toLowerCase();
const eqDataLonga = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
const eqDataCurta = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '') : '';
const eqTour = (b) => (typeof Tours !== 'undefined' && Tours.get(b.tourId)) || null;
const eqTourNome = (b) => { const x = eqTour(b); return x ? (x.name && x.name.pt) || tl(x.name) : (b.tourName || 'Passeio'); };

function eqNormaliza(c) {
  const o = Object.assign({ id: '', nome: '', whats: '', email: '', tipo: 'guia', idiomas: 'português', obs: '', ativo: true }, c || {});
  if (!o.id) o.id = 'eq' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  for (const k of ['nome', 'whats', 'email', 'idiomas', 'obs']) o[k] = String(o[k] == null ? '' : o[k]).trim();
  if (!EQ_TIPOS[o.tipo]) o.tipo = 'guia';
  o.ativo = o.ativo !== false;
  return o;
}
/* pelo id PRIMEIRO: o código pode repetir entre aparelhos (revisão 06/10) — o id não */
function eqReserva(code) { if (!code) return null; return Bookings.get(code) || Bookings.byCode(code) || null; }
function eqGravaReserva(b) { save(); if (typeof cloudUpdateBooking === 'function') try { cloudUpdateBooking(b); } catch (e) {} }

const Equipe = {
  all() {
    if (DB.equipe === undefined) { DB.equipe = EQ_SEMENTE.map(eqNormaliza); save(); }
    if (!Array.isArray(DB.equipe)) DB.equipe = [];
    return DB.equipe;
  },
  get(id) { return this.all().find(p => p.id === id) || null; },
  ativos(tipo) { return this.all().filter(p => p.ativo && (!tipo || p.tipo === tipo)); },
  add(c) { const p = eqNormaliza(Object.assign({}, c || {}, { id: '' })); this.all().push(p); save(); return p; },
  update(id, c) {
    const p = this.get(id); if (!p) return null;
    Object.assign(p, eqNormaliza(Object.assign({}, p, c || {}, { id: p.id }))); p.mudado = new Date().toISOString();
    save(); return p;
  },
  /* tira a pessoa e a solta das reservas (o passeio volta para "sem guia") */
  remove(id) {
    if (!this.get(id)) return false;
    DB.equipe = this.all().filter(p => p.id !== id);
    for (const b of DB.bookings) {
      let mudou = false;
      if (b.guiaId === id) { delete b.guiaId; mudou = true; }
      if (b.motoristaId === id) { delete b.motoristaId; mudou = true; }
      if (mudou && typeof cloudUpdateBooking === 'function') try { cloudUpdateBooking(b); } catch (e) {}
    }
    save(); return true;
  },
  /* quem faz o passeio. pessoaId vazio = tira. Devolve a reserva (ou null). */
  escalar(code, pessoaId, papel = 'guia') {
    const b = eqReserva(code); if (!b) return null;
    const campo = papel === 'motorista' ? 'motoristaId' : 'guiaId';
    if (pessoaId) { if (!this.get(pessoaId)) return null; b[campo] = pessoaId; }
    else delete b[campo];
    eqGravaReserva(b);
    return b;
  },
  deQuem(code, papel = 'guia') {
    const b = eqReserva(code); if (!b) return null;
    return this.get(papel === 'motorista' ? b.motoristaId : b.guiaId);
  },
  /* os passeios confirmados da pessoa, de hoje até daqui a "dias" */
  escalaDe(pessoaId, dias = 60) {
    const de = eqHoje(), ate = addDays(de, dias);
    return DB.bookings.filter(b => b.status === 'confirmed' && b.date >= de && b.date <= ate && (b.guiaId === pessoaId || b.motoristaId === pessoaId))
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  },
  semGuia(dias = 60) {
    const de = eqHoje(), ate = addDays(de, dias);
    return DB.bookings.filter(b => b.status === 'confirmed' && b.date >= de && b.date <= ate && !this.get(b.guiaId))
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  },
  /* o que vai no link: só o necessário para trabalhar (primeiro nome do cliente, nada de contato) */
  servicos(pessoaId, opts) {
    opts = opts || {};
    return this.escalaDe(pessoaId, opts.dias || 60).map(b => {
      const x = eqTour(b), F = typeof fichaDe === 'function' ? fichaDe(eqChaveCliente(b)) : null, cad = (F && F.cad) || {};
      const s = { data: b.date, hora: b.time || '', passeio: eqTourNome(b), encontro: x ? noIdioma(x.meeting) : '', pessoas: +b.pax || 1, cliente: eqPrimeiro(b.name) };
      if (cad.hotel) s.hotel = cad.hotel;
      const obs = [b.obs, cad.mobilidade ? 'Mobilidade: ' + cad.mobilidade : ''].filter(Boolean).join(' · ');
      if (obs) s.obs = obs;
      if (b.motoristaId === pessoaId && b.guiaId !== pessoaId) { s.papel = 'motorista'; const g = this.get(b.guiaId); if (g) s.guia = g.nome; }
      if (opts.comValores) { const due = Bookings.due(b); if (due > 0) s.receber = due; }
      return s;
    });
  },
  async linkEscala(pessoaId, opts) {
    const p = this.get(pessoaId); if (!p) throw new Error('pessoa não encontrada');
    opts = opts || {};
    return Publico.link('es', { nome: p.nome, gerado: eqHoje(), whats: eqDig(DB.settings.whats), servicos: this.servicos(pessoaId, opts) });
  },
  async mensagemEscala(pessoaId, opts) {
    const p = this.get(pessoaId); if (!p) throw new Error('pessoa não encontrada');
    const n = this.escalaDe(pessoaId).length, url = await this.linkEscala(pessoaId, opts);
    return `Oi ${eqPrimeiro(p.nome)}! Aqui está a sua escala dos próximos dias (${n === 1 ? '1 passeio' : n + ' passeios'}):\n${url}\n\nSe mudar alguma coisa, eu te mando um link novo. Obrigada!`;
  },
};
window.Equipe = Equipe;

/* ---------- estilo ---------- */
function eqCss() {
  if (document.getElementById('eqCss')) return;
  const s = document.createElement('style'); s.id = 'eqCss';
  s.textContent = `
  .eqLista .linha{display:flex;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .eqLista .linha:last-child{border-bottom:0}
  .eqLista .tx{flex:1;min-width:190px}.eqLista .tx small{display:block;color:var(--ink-3)}
  .eqAv{width:40px;height:40px;border-radius:50%;flex:none;display:grid;place-items:center;background:var(--brand-primaria);color:#F2C230;font:700 15px/1 var(--f-display)}
  .eqAv.mot{background:var(--surface-2);color:var(--brand-primaria)}
  .eqRow{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}
  .eqRow:last-child{border-bottom:0}
  .eqRow .hr{font:700 14px/1.2 var(--f-display);min-width:96px}
  .eqRow .hr small{display:block;font:500 12px/1.3 var(--f-ui);color:var(--ink-3)}
  .eqRow .tx{flex:1;min-width:170px}.eqRow .tx small{display:block;color:var(--ink-3)}
  .eqRow select{min-height:40px;max-width:200px}
  .eqPessoa{border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-top:12px;background:var(--surface)}
  .eqPessoa .cab{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .eqPessoa .cab .tx{flex:1;min-width:160px}.eqPessoa .cab small{display:block;color:var(--ink-3)}
  .eqPessoa .acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .eqEd .frow{display:flex;gap:10px;flex-wrap:wrap}.eqEd .frow .fld{flex:1;min-width:180px}
  .eqEd textarea{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical}
  .eqAgL{display:flex!important;gap:6px;align-items:center;margin-top:5px;flex-wrap:wrap}
  .eqAgL select{min-height:32px;padding:3px 8px;font-size:12.5px;max-width:170px}
  /* a página do guia (link) */
  .eqPub .eqTop{background:#1D2A44;color:#FBF7EC;border-radius:20px;padding:20px;margin:4px 0 14px}
  .eqPub .eqTop small{display:block;font:700 10.5px/1 var(--f-ui);letter-spacing:.2em;text-transform:uppercase;color:#F2C230}
  .eqPub .eqTop h1{font:700 24px/1.15 var(--f-display);margin:8px 0 6px;color:#fff}
  .eqPub .eqTop p{margin:0;font-size:14px;opacity:.88;line-height:1.45}
  .eqPub .eqDia{margin:16px 0 6px;font:700 12px/1.2 var(--f-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}
  .eqPub .eqSv{display:flex;gap:14px;align-items:flex-start;background:var(--surface);border:1px solid var(--line);border-left:4px solid #F2C230;border-radius:14px;padding:14px;margin-bottom:10px}
  .eqPub .eqSv .hr{font:700 20px/1 var(--f-display);color:var(--ink);min-width:62px}
  .eqPub .eqSv .tx{flex:1;min-width:0}
  .eqPub .eqSv b.p{display:block;font:700 16px/1.3 var(--f-display);margin-bottom:4px}
  .eqPub .eqSv .l{display:block;font-size:14px;line-height:1.45;color:var(--ink-2);overflow-wrap:anywhere}
  .eqPub .eqSv .l b{color:var(--ink);font-weight:600}
  .eqPub .eqRec{display:inline-block;margin-top:8px;background:#F2C230;color:#1D2A44;font-weight:700;border-radius:999px;padding:5px 12px;font-size:13.5px}
  @media print{.eqPub .eqSv{break-inside:avoid}}
  /* no escuro o fundo já é marinho: a caixa do topo sobe um tom e ganha um fio amarelo, o avatar idem */
  @media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .eqPub .eqTop{background:#26365A;box-shadow:inset 0 0 0 1px rgba(242,194,48,.35)} :root:not([data-theme="light"]) .eqAv{background:#2F4372}}
  :root[data-theme="dark"] .eqPub .eqTop{background:#26365A;box-shadow:inset 0 0 0 1px rgba(242,194,48,.35)} :root[data-theme="dark"] .eqAv{background:#2F4372}`;
  document.head.appendChild(s);
}

/* ---------- a página do link (#/es/…) ---------- */
function eqEscalaHtml(o) {
  const l = (o.servicos || []).slice().sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const dias = []; for (const s of l) { const d = dias.find(x => x.data === s.data); if (d) d.l.push(s); else dias.push({ data: s.data, l: [s] }); }
  const gerado = /^\d{4}-\d{2}-\d{2}/.test(o.gerado || '') ? new Date(o.gerado.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '';
  const zap = waLink(`Oi, Mari! Sobre a minha escala…`, eqDig(o.whats) || undefined);
  return `<section class="eqPub">
    <div class="eqTop"><small>Escala</small><h1>Escala de ${esc(o.nome || '')}</h1>
      <p>${gerado ? `Atualizado em ${esc(gerado)}. ` : ''}Se mudar algo, a Mari manda um link novo.</p></div>
    ${dias.length ? dias.map(d => `<h2 class="eqDia">${esc(eqDataLonga(d.data))}</h2>
      ${d.l.map(s => `<div class="eqSv"><span class="hr">${esc(s.hora || '—')}</span><div class="tx">
        <b class="p">${esc(s.passeio)}</b>
        ${s.papel === 'motorista' ? `<span class="l"><b>Você vai como motorista</b>${s.guia ? ' · guia: ' + esc(s.guia) : ''}</span>` : ''}
        ${s.encontro ? `<span class="l"><b>Encontro:</b> ${esc(s.encontro)}</span>` : ''}
        <span class="l"><b>Cliente:</b> ${esc(s.cliente || '—')} · ${esc(s.pessoas)} pessoa${+s.pessoas > 1 ? 's' : ''}</span>
        ${s.hotel ? `<span class="l"><b>Hospedagem:</b> ${esc(s.hotel)}</span>` : ''}
        ${s.obs ? `<span class="l"><b>Obs.:</b> ${esc(s.obs)}</span>` : ''}
        ${s.receber > 0 ? `<span class="eqRec">Receber no dia: ${esc(eur(s.receber))} · em euro, em dinheiro</span>` : ''}
      </div></div>`).join('')}`).join('')
      : '<section class="card"><p class="desc">Nenhum passeio na sua escala por enquanto.</p></section>'}
    <a class="cta" href="${esc(zap)}" target="_blank" rel="noopener">Falar com a Mari no WhatsApp</a>
  </section>`;
}
window.ROTAS_EXTRA = window.ROTAS_EXTRA || {};
ROTAS_EXTRA['es'] = (partes) => abrePublico(partes, (o) => {
  eqCss();
  paginaPublica('Escala de ' + (o.nome || ''), eqEscalaHtml(o), { rodape: 'Se mudar algo, a Mari manda um link novo.', waTexto: 'Oi, Mari! Sobre a minha escala…' });
});

/* ---------- a aba do painel ---------- */
const eqCfg = () => { DB.privado = DB.privado || {}; return DB.privado.escala || {}; };
function eqOpcoes(tipo, atual) {
  const l = Equipe.all().filter(p => p.tipo === tipo && (p.ativo || p.id === atual));
  return `<option value="">${tipo === 'motorista' ? '— motorista —' : '— escolher guia —'}</option>` + l.map(p => `<option value="${esc(p.id)}" ${p.id === atual ? 'selected' : ''}>${esc(p.nome || 'sem nome')}</option>`).join('');
}
function eqLinhaReserva(b, comSelect) {
  const temMot = Equipe.ativos('motorista').length || b.motoristaId;
  return `<div class="eqRow" data-eqb="${esc(b.id)}"><span class="hr">${esc(eqDataCurta(b.date))}<small>${esc(b.time || '')}</small></span>
    <div class="tx"><b>${esc(eqTourNome(b))}</b><small>${esc(eqPrimeiro(b.name))} · ${esc(b.pax)} pessoa${+b.pax > 1 ? 's' : ''} · <span class="mono">${esc(b.code)}</span></small></div>
    ${comSelect ? `<select data-eqsel="guia" aria-label="Guia">${eqOpcoes('guia', b.guiaId)}</select>${temMot ? `<select data-eqsel="motorista" aria-label="Motorista">${eqOpcoes('motorista', b.motoristaId)}</select>` : ''}` : ''}
  </div>`;
}
function admEquipe(arg) {
  eqCss();
  if (arg) return admEquipeEditar(decodeURIComponent(arg));
  const gente = Equipe.all(), cfg = eqCfg();
  const semZap = gente.filter(p => p.ativo && eqDig(p.whats).length < 8);
  const sem = Equipe.semGuia(60);
  admShell('equipe', `
    <div class="pagehead"><h1 class="pageh">Equipe e escala</h1><div class="chips"><button class="cta sm" id="eqNovo">+ Pessoa</button></div></div>
    <p class="why">Os guias e motoristas que trabalham com você. Escolha quem faz cada passeio e mande para cada um o link da escala dele: a pessoa vê só os passeios dela, sem senha e sem os contatos dos clientes.</p>
    ${semZap.length ? `<div class="alert warn"><span>Complete o WhatsApp de ${esc(semZap.map(p => p.nome || 'sem nome').join(' e '))} para mandar a escala direto (toque em <b>Editar</b>).</span></div>` : ''}
    <section class="card eqLista"><h3>Quem trabalha com você</h3>
      ${gente.length ? gente.map(p => `<div class="linha"><span class="eqAv ${p.tipo === 'motorista' ? 'mot' : ''}">${esc((p.nome || '?').charAt(0).toUpperCase())}</span>
        <div class="tx"><b>${esc(p.nome || 'sem nome')}</b><small>${esc([EQ_TIPOS[p.tipo], p.idiomas].filter(Boolean).join(' · '))}</small>
          <small>${p.whats ? esc(p.whats) : '<span class="pill warn">falta o WhatsApp</span>'}${p.email ? ' · ' + esc(p.email) : ''}</small></div>
        ${p.ativo ? '' : '<span class="pill">fora da escala</span>'}
        <a class="mini" href="#/adm/equipe/${encodeURIComponent(p.id)}">Editar</a><button class="mini ghost" data-eqdel="${esc(p.id)}" aria-label="Tirar da equipe">×</button></div>`).join('')
      : '<p class="empty">Ninguém na equipe ainda. Toque em "+ Pessoa".</p>'}
    </section>
    <section class="card" id="eqSem"><h3>Sem ninguém da equipe · próximos 60 dias <small class="why" style="font-weight:500">${sem.length ? sem.length + ' passeio' + (sem.length > 1 ? 's' : '') + ' · se for você mesma que guia, deixe assim' : ''}</small></h3>
      ${sem.length ? sem.map(b => eqLinhaReserva(b, true)).join('') : '<p class="empty">Todos os passeios dos próximos 60 dias já têm guia.</p>'}
    </section>
    <section class="card" id="eqEscalas"><h3>A escala de cada um</h3>
      <label class="fld chk"><input type="checkbox" id="eqValores" ${cfg.comValores ? 'checked' : ''}> Mostrar na escala quanto o cliente paga no dia (em dinheiro)</label>
      ${Equipe.ativos().map(p => { const l = Equipe.escalaDe(p.id);
        return `<div class="eqPessoa" data-eqp="${esc(p.id)}"><div class="cab"><span class="eqAv ${p.tipo === 'motorista' ? 'mot' : ''}">${esc((p.nome || '?').charAt(0).toUpperCase())}</span>
          <div class="tx"><b>${esc(p.nome || 'sem nome')}</b><small>${esc(EQ_TIPOS[p.tipo])} · ${l.length ? l.length + ' passeio' + (l.length > 1 ? 's' : '') + ' nos próximos 60 dias' : 'nenhum passeio nos próximos 60 dias'}</small></div></div>
          ${l.map(b => `<div class="eqRow"><span class="hr">${esc(eqDataCurta(b.date))}<small>${esc(b.time || '')}</small></span>
            <div class="tx"><b>${esc(eqTourNome(b))}</b><small>${esc(eqPrimeiro(b.name))} · ${esc(b.pax)} pessoa${+b.pax > 1 ? 's' : ''}${b.motoristaId === p.id && b.guiaId !== p.id ? ' · como motorista' : ''}${Bookings.due(b) > 0 ? ' · recebe no dia ' + esc(eur(Bookings.due(b))) : ''}</small></div>
            <button class="mini ghost" data-eqtira="${esc(b.id)}" data-papel="${b.guiaId === p.id ? 'guia' : 'motorista'}" aria-label="Tirar da escala">tirar</button></div>`).join('')}
          <div class="acoes"><button class="cta sm" data-eqmanda="${esc(p.id)}">${eqDig(p.whats).length >= 8 ? 'Mandar a escala no WhatsApp' : 'Copiar a escala para mandar'}</button>
            <button class="mini" data-eqcopia="${esc(p.id)}">Copiar o link</button><button class="mini" data-eqver="${esc(p.id)}">Ver como ${esc(eqPrimeiro(p.nome) || 'a pessoa')} vê</button></div></div>`; }).join('') || '<p class="empty">Ninguém ativo na equipe.</p>'}
    </section>`);
  $('#eqNovo').onclick = () => { const p = Equipe.add({ nome: '' }); go('/adm/equipe/' + encodeURIComponent(p.id)); };
  $$('[data-eqdel]').forEach(b => b.onclick = () => {
    const p = Equipe.get(b.dataset.eqdel); if (!p) return;
    const n = Equipe.escalaDe(p.id, 3650).length;
    if (!confirm(`Tirar ${p.nome || 'esta pessoa'} da equipe?${n ? `\n\n${n} passeio(s) voltam para "sem guia".` : ''}`)) return;
    Equipe.remove(p.id); toast('Tirado da equipe'); admEquipe();
  });
  $$('#eqSem [data-eqsel]').forEach(sel => sel.onchange = () => {
    const code = sel.closest('[data-eqb]').dataset.eqb, papel = sel.dataset.eqsel;
    const b = Equipe.escalar(code, sel.value, papel); if (!b) return toast('Não consegui escalar');
    const p = Equipe.get(sel.value); toast(p ? `${p.nome} escalado(a): ${eqTourNome(b)}, ${eqDataCurta(b.date)}` : 'Tirado da escala');
    admEquipe();
  });
  $$('[data-eqtira]').forEach(bt => bt.onclick = () => { Equipe.escalar(bt.dataset.eqtira, '', bt.dataset.papel); toast('Tirado da escala'); admEquipe(); });
  $('#eqValores').onchange = (e) => { DB.privado = DB.privado || {}; DB.privado.escala = Object.assign({}, DB.privado.escala || {}, { comValores: e.target.checked }); save(); };
  const opts = () => ({ comValores: !!($('#eqValores') && $('#eqValores').checked) });
  const copia = async (txt, msg) => { try { await navigator.clipboard.writeText(txt); toast(msg); } catch (e) { prompt('Copie:', txt); } };
  $$('[data-eqmanda]').forEach(bt => bt.onclick = async () => {
    const p = Equipe.get(bt.dataset.eqmanda); if (!p) return;
    const txt = await Equipe.mensagemEscala(p.id, opts());
    if (eqDig(p.whats).length >= 8) window.open(waLink(txt, eqDig(p.whats)), '_blank', 'noopener');
    else copia(txt, `Escala copiada — ${p.nome || 'a pessoa'} ainda não tem WhatsApp aqui. Cole na conversa.`);
  });
  $$('[data-eqcopia]').forEach(bt => bt.onclick = async () => copia(await Equipe.linkEscala(bt.dataset.eqcopia, opts()), 'Link da escala copiado'));
  $$('[data-eqver]').forEach(bt => bt.onclick = async () => { const u = await Equipe.linkEscala(bt.dataset.eqver, opts()); location.hash = u.split('#')[1]; });
}
function admEquipeEditar(id) {
  eqCss();
  const p = Equipe.get(id);
  if (!p) { admShell('equipe', '<a class="mini" href="#/adm/equipe">← equipe</a><h1 class="pageh">Pessoa não encontrada</h1>'); return; }
  admShell('equipe', `
    <a class="mini" href="#/adm/equipe">← equipe e escala</a>
    <div class="pagehead"><h1 class="pageh">${esc(p.nome || 'Pessoa nova')}</h1></div>
    <section class="card eqEd" id="eqEd">
      <div class="frow"><label class="fld">Nome<input id="eqNome" value="${esc(p.nome)}" placeholder="César"></label>
        <label class="fld">Faz o quê<select id="eqTipo">${Object.entries(EQ_TIPOS).map(([k, n]) => `<option value="${k}" ${p.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <div class="frow"><label class="fld">WhatsApp<input id="eqWhats" type="tel" inputmode="tel" value="${esc(p.whats)}" placeholder="+45 …"></label>
        <label class="fld">E-mail<input id="eqEmail" type="email" value="${esc(p.email)}"></label></div>
      <label class="fld">Idiomas<input id="eqIdiomas" value="${esc(p.idiomas)}" placeholder="português, inglês, espanhol"></label>
      <label class="fld">Observações (só você vê)<textarea id="eqObs" rows="2" placeholder="valor da diária, carro, dias que não pode…">${esc(p.obs)}</textarea></label>
      <label class="fld chk" style="margin-top:12px"><input type="checkbox" id="eqAtivo" ${p.ativo ? 'checked' : ''}> Está na escala (pode ser escolhido para os passeios)</label>
      <div class="frow" style="margin-top:14px;align-items:center"><button class="cta sm" id="eqSalva">Salvar</button><button class="mini ghost" id="eqApaga">Tirar da equipe</button></div>
    </section>`);
  $('#eqSalva').onclick = () => {
    const c = { nome: $('#eqNome').value, tipo: $('#eqTipo').value, whats: $('#eqWhats').value, email: $('#eqEmail').value, idiomas: $('#eqIdiomas').value, obs: $('#eqObs').value, ativo: $('#eqAtivo').checked };
    if (!c.nome.trim()) { $('#eqNome').focus(); return toast('Escreva o nome'); }
    if (c.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) { $('#eqEmail').focus(); return toast('Confira o e-mail'); }
    Equipe.update(p.id, c); toast('Salvo'); go('/adm/equipe');
  };
  $('#eqApaga').onclick = () => { if (!confirm(`Tirar ${p.nome || 'esta pessoa'} da equipe?`)) return; Equipe.remove(p.id); toast('Tirado da equipe'); go('/adm/equipe'); };
}

/* ---------- na Agenda: "Guia: [quem]" em cada passeio reservado do dia ---------- */
function eqNaAgenda() {
  if (!/^#\/adm\/agenda/.test(location.hash)) return;
  const dia = (document.querySelector('#agGrid .agc.on') || {}).dataset; const sel = dia && dia.d; if (!sel) return;
  const guias = Equipe.ativos('guia'); if (!guias.length && !DB.bookings.some(b => b.guiaId)) return;
  document.querySelectorAll('.deprow').forEach(row => {
    const tinfo = row.querySelector('.tinfo'), b0 = tinfo && tinfo.querySelector('b'); if (!b0 || tinfo.querySelector('.eqAgL')) return;
    const m = b0.textContent.match(/^(\d{1,2}:\d{2}) · (.+)$/); if (!m) return;
    const bs = DB.bookings.filter(b => b.status === 'confirmed' && b.date === sel && b.time === m[1] && (() => { const x = eqTour(b); return x && tl(x.name) === m[2]; })());
    if (!bs.length) return;
    const ids = [...new Set(bs.map(b => b.guiaId || ''))], atual = ids.length === 1 ? ids[0] : '';
    tinfo.insertAdjacentHTML('beforeend', `<small class="eqAgL">Guia: <select data-eqag="${esc(bs.map(b => b.id).join(','))}" aria-label="Guia deste passeio">${ids.length > 1 ? '<option value="" disabled selected>vários guias</option>' : ''}${eqOpcoes('guia', atual)}</select></small>`);
  });
  document.querySelectorAll('[data-eqag]').forEach(s => s.onchange = () => {
    s.dataset.eqag.split(',').forEach(c => Equipe.escalar(c, s.value, 'guia'));
    const p = Equipe.get(s.value); toast(p ? `${p.nome} faz este passeio` : 'Passeio sem guia');
  });
}

/* ---------- ligar no app ---------- */
STR.admEquipe = { pt: 'Equipe e escala', en: 'Team & roster' };
if (!ADM_TABS.some(([id]) => id === 'equipe')) {
  const i = ADM_TABS.findIndex(([id]) => id === 'tarefas');
  ADM_TABS.splice(i < 0 ? ADM_TABS.length : i + 1, 0, ['equipe', 'admEquipe']);
}
const _viewAdmEquipe = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'equipe') return admEquipe(arg);
  return _viewAdmEquipe(tab, arg);
};
const _admAgendaEquipe = admAgenda;
admAgenda = function () { const r = _admAgendaEquipe.apply(this, arguments); try { eqNaAgenda(); } catch (e) { console.warn('equipe/agenda', e); } return r; };
/* a Agenda se redesenha sozinha (troca de dia/mês chama admAgendaMari direto): o vigia repõe o "Guia:" */
if (typeof MutationObserver === 'function' && typeof app !== 'undefined' && app) new MutationObserver(() => { try { eqNaAgenda(); } catch (e) {} }).observe(app, { childList: true });
