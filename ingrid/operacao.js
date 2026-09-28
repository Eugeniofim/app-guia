/* =====================================================
   OPERACAO — os dados do dia a dia da Ingrid

   Nasceu do pedido de 28/09/2026 (brainstorm "EM roma" + a reuniao do Meet).
   Ela nao e mais a guia: ela AGENCIA. Tem guias e motoristas na Italia
   toda, recebe um sinal e o resto e pago no dia, em dinheiro, para quem
   faz o servico. E recebe em varias contas, no Brasil e na Europa, com um
   contador em cada lado.

   Este arquivo e so a camada de dados — nada de tela. Da para testar sem
   navegador (testes/operacao.test.js). As telas estao em operacao-telas.js.

   Colecoes novas no DB (so no aparelho enquanto nao houver banco; quando
   houver, vao para tabelas PRIVADAS, nunca para o "appstate", que e
   publico):
     DB.equipe     [{id, nome, tipo:'guia'|'motorista', whats, cidades[], idiomas, obs, pref}]
     DB.disp       [{pessoaId, data, turno, estado:'livre'|'ocupada', nota, em}]
     DB.contas     [{id, nome, pais:'brasil'|'europa', metodo}]
     DB.orcamentos [{id, num, criado, status, origem, pedidoId, cliente{}, itens[], ...}]
     DB.fichas     {chaveDoCliente: {notas, tags}}
   E na reserva (Booking), os campos da operacao:
     voo, origem, destino, obsOp, prestadorId, restoPara:'prestador'|'ingrid',
     custo, acertado
   ===================================================== */
'use strict';

/* ---------- turnos ----------
   Ela pensa em MANHA e TARDE ("bloquear a parte da manha ou a parte da
   tarde quando ela ja me fala: nao posso, ja to ocupada"). A noite existe
   porque ha passeio noturno as 19h30. "Dia inteiro" e so um atalho que
   marca os tres. */
const TURNOS = [['manha', 'Manhã', 'Morning'], ['tarde', 'Tarde', 'Afternoon'], ['noite', 'Noite', 'Evening']];
function turnoNome(tu) {
  if (tu === 'dia') return (typeof LANG !== 'undefined' && LANG === 'en') ? 'All day' : 'Dia inteiro';
  const r = TURNOS.find(x => x[0] === tu);
  return r ? ((typeof LANG !== 'undefined' && LANG === 'en') ? r[2] : r[1]) : tu;
}
function turnoDaHora(h) {
  const m = String(h || '').match(/(\d{1,2})/);
  const n = m ? +m[1] : 9;
  return n < 13 ? 'manha' : n < 18 ? 'tarde' : 'noite';
}
/* Um bate e volta ocupa o dia; um passeio de 3h ocupa o turno em que comeca.
   Um de 4h que comeca as 11h entra pela tarde — conta os dois. */
function turnosDoServico(b) {
  const x = typeof Tours !== 'undefined' ? Tours.get(b.tourId) : null;
  if (x && (x.type === 'day' || x.type === 'conexao')) return ['manha', 'tarde'];
  const t0 = turnoDaHora(b.time);
  const hIni = parseInt(String(b.time || '').match(/(\d{1,2})/)?.[1] || '9', 10);
  const dur = parseInt(String((x && x.duration) || '').match(/(\d+)\s*h/)?.[1] || '0', 10);
  if (t0 === 'manha' && dur && hIni + dur > 13) return ['manha', 'tarde'];
  return [t0];
}

/* ---------- guias e motoristas ---------- */
function _opSave() {
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
}
function _opSaveBooking(b) {
  _opSave();
  if (b && typeof cloudUpdateBooking === 'function') cloudUpdateBooking(b);
}
const Equipe = {
  /* na ordem de preferencia dela: "eu pego sempre as melhores primeiro" */
  all(tipo) {
    return [...(DB.equipe || [])]
      .filter(p => !tipo || p.tipo === tipo)
      .sort((a, b) => (a.pref || 0) - (b.pref || 0));
  },
  get(id) { return (DB.equipe || []).find(p => p.id === id) || null; },
  salva(p) {
    DB.equipe = DB.equipe || [];
    const limpa = (v) => String(v || '').trim();
    const dados = {
      nome: limpa(p.nome), tipo: p.tipo === 'motorista' ? 'motorista' : 'guia',
      whats: limpa(p.whats), idiomas: limpa(p.idiomas), obs: limpa(p.obs),
      cidades: (Array.isArray(p.cidades) ? p.cidades : String(p.cidades || '').split(','))
        .map(limpa).filter(Boolean),
    };
    if (!dados.nome) return null;
    let x = p.id && Equipe.get(p.id);
    if (x) Object.assign(x, dados);
    else {
      const ult = Math.max(0, ...DB.equipe.map(q => q.pref || 0));
      x = { id: uid(), pref: ult + 1, ...dados };
      DB.equipe.push(x);
    }
    _opSave();
    return x;
  },
  remove(id) {
    DB.equipe = (DB.equipe || []).filter(p => p.id !== id);
    DB.disp = (DB.disp || []).filter(d => d.pessoaId !== id);
    for (const b of DB.bookings) if (b.prestadorId === id) { b.prestadorId = ''; }
    _opSave();
  },
  /* sobe ou desce na ordem de preferencia, dentro do mesmo tipo */
  move(id, dir) {
    const p = Equipe.get(id); if (!p) return;
    const lista = Equipe.all(p.tipo);
    const i = lista.findIndex(q => q.id === id), j = i + (dir < 0 ? -1 : 1);
    if (j < 0 || j >= lista.length) return;
    const tmp = lista[i].pref; lista[i].pref = lista[j].pref; lista[j].pref = tmp;
    if (lista[i].pref === lista[j].pref) lista[j].pref += dir < 0 ? 1 : -1;
    _opSave();
  },
  cidades() {
    const s = new Set();
    for (const p of DB.equipe || []) for (const c of p.cidades || []) s.add(c);
    return [...s].sort((a, b) => a.localeCompare(b));
  },
  atende(p, cidade) {
    if (!cidade) return true;
    const n = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return (p.cidades || []).some(c => n(c) === n(cidade));
  },
};

/* ---------- disponibilidade ----------
   Ela nao tem a agenda das guias ("elas fazem tudo a mao no papel"). O que
   existe e o que cada uma RESPONDEU: livre ou ocupada, por dia e turno.
   E o servico que ela mesma ja passou para a guia tambem ocupa — esse o
   app sabe sozinho, sem ela marcar nada. */
const Disp = {
  _linha(pessoaId, data, turno) {
    return (DB.disp || []).find(d => d.pessoaId === pessoaId && d.data === data && d.turno === turno);
  },
  /* {estado:'ocupada'|'livre'|'', servico?, nota?} */
  estado(pessoaId, data, turno) {
    const b = DB.bookings.find(x => x.prestadorId === pessoaId && x.date === data
      && x.status !== 'cancelled' && turnosDoServico(x).includes(turno));
    if (b) return { estado: 'ocupada', servico: b };
    const l = Disp._linha(pessoaId, data, turno);
    return l ? { estado: l.estado, nota: l.nota || '' } : { estado: '' };
  },
  /* estado '' apaga a resposta (volta a "nao perguntei") */
  marca(pessoaId, data, turno, estado, nota) {
    DB.disp = DB.disp || [];
    const turnos = turno === 'dia' ? TURNOS.map(x => x[0]) : [turno];
    for (const tu of turnos) {
      DB.disp = DB.disp.filter(d => !(d.pessoaId === pessoaId && d.data === data && d.turno === tu));
      if (estado) DB.disp.push({ pessoaId, data, turno: tu, estado, nota: String(nota || '').trim(), em: new Date().toISOString() });
    }
    _opSave();
  },
  /* "dia 25/10 de manha, que guia de Roma esta livre?" — por preferencia.
     Volta todo mundo, separado em livres, sem resposta e ocupadas: a que
     nao respondeu ainda pode ser a melhor opcao, e ela decide. */
  quem({ data, turno, cidade, tipo }) {
    const turnos = turno === 'dia' ? ['manha', 'tarde'] : [turno];
    const gente = Equipe.all(tipo || 'guia').filter(p => Equipe.atende(p, cidade));
    const livres = [], semResposta = [], ocupadas = [];
    for (const p of gente) {
      const es = turnos.map(tu => Disp.estado(p.id, data, tu));
      const ocup = es.find(e => e.estado === 'ocupada');
      if (ocup) ocupadas.push({ p, ...ocup });
      else if (es.every(e => e.estado === 'livre')) livres.push({ p, estado: 'livre', nota: es.map(e => e.nota).filter(Boolean).join(' · ') });
      else semResposta.push({ p, estado: '' });
    }
    return { livres, semResposta, ocupadas };
  },
};

/* ---------- a reserva vista pela operacao ---------- */
const Op = {
  /* Quem recebe o resto. O caso mais comum dela: sinal na reserva e o resto
     NO DIA, em dinheiro, para a guia ou o motorista. Transfer ja nasce
     assim (politica 'sinal'). Quando ela recebe tudo (agencia, cliente que
     "nao quer tocar em dinheiro"), o resto e com ela. */
  restoPara(b) {
    if (b.restoPara === 'prestador' || b.restoPara === 'ingrid') return b.restoPara;
    return b.policy === 'sinal' ? 'prestador' : 'ingrid';
  },
  /* O caso da semana da reuniao: "Ingrid, o cliente quer pagar 35". Eram 70.
     Esta e a linha que responde isso sem abrir planilha. */
  noDia(b) {
    const falta = Bookings.due(b);
    if (b.status === 'cancelled' || falta <= 0) return { valor: 0, para: '', pessoa: null };
    const para = Op.restoPara(b);
    return { valor: falta, para, pessoa: b.prestadorId ? Equipe.get(b.prestadorId) : null };
  },
  escala(bookingId, pessoaId) {
    const b = Bookings.get(bookingId); if (!b) return null;
    b.prestadorId = pessoaId || '';
    _opSaveBooking(b);
    return b;
  },
  /* voo, onde buscar, para onde, observacao, quem faz, custo, quem recebe */
  detalhes(bookingId, d) {
    const b = Bookings.get(bookingId); if (!b) return null;
    const campos = ['voo', 'origem', 'destino', 'obsOp'];
    for (const k of campos) if (d[k] !== undefined) b[k] = String(d[k] || '').trim();
    if (d.prestadorId !== undefined) b.prestadorId = d.prestadorId || '';
    if (d.custo !== undefined) b.custo = Math.max(0, +d.custo || 0);
    if (d.restoPara !== undefined) b.restoPara = d.restoPara === 'prestador' ? 'prestador' : d.restoPara === 'ingrid' ? 'ingrid' : '';
    _opSaveBooking(b);
    return b;
  },
  /* servicos sem guia/motorista nos proximos N dias */
  semPrestador(dias) {
    const hoje = isoToday(), ate = addDays(hoje, dias || 7);
    return DB.bookings.filter(b => b.status !== 'cancelled' && !b.prestadorId && b.date >= hoje && b.date <= ate)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  },
  doDia(data) {
    return DB.bookings.filter(b => b.status !== 'cancelled' && b.date === data)
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  },
  /* Emergencia: "o cliente chegou e nao acha o motorista". Ela digita um
     pedaco do nome, o voo ou o codigo e acha em segundos. */
  busca(q) {
    const n = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const s = n(q).trim(); if (s.length < 2) return [];
    const dig = s.replace(/\D/g, '');
    return DB.bookings.filter(b => {
      if ([b.name, b.code, b.voo, b.origem, b.destino, b.email].some(v => n(v).includes(s))) return true;
      if (dig.length >= 4 && String(b.whats || '').replace(/\D/g, '').includes(dig)) return true;
      return (b.group || []).some(g => n(g.nome).includes(s));
    }).sort((a, b) => Math.abs(new Date(a.date) - new Date(isoToday())) - Math.abs(new Date(b.date) - new Date(isoToday())));
  },
};

/* ---------- contas e pagamentos ----------
   Ela recebe em Nubank (Brasil), Wise Brasil, Wise Europa, Revolut, link de
   cartao (Europa), em dinheiro, e numa conta separada quando ela mesma
   acompanha. Na hora de registrar ela escolhe a conta; a conta sabe de que
   lado do oceano esta, e cada contador recebe so o dele. */
const CONTA_PRESTADOR = 'prestador';
function contasPadrao() {
  return [
    { id: 'nubank',   nome: 'Nubank (Pix)',            pais: 'brasil', metodo: 'pix' },
    { id: 'wise-br',  nome: 'Wise Brasil',             pais: 'brasil', metodo: 'transfer' },
    { id: 'wise-eu',  nome: 'Wise Europa',             pais: 'europa', metodo: 'transfer' },
    { id: 'revolut',  nome: 'Revolut',                 pais: 'europa', metodo: 'transfer' },
    { id: 'cartao',   nome: 'Link de cartão',          pais: 'europa', metodo: 'card' },
    { id: 'dinheiro', nome: 'Dinheiro (em mãos)',      pais: 'europa', metodo: 'cash' },
    { id: 'acomp',    nome: 'Conta de acompanhamento', pais: 'europa', metodo: 'transfer' },
  ];
}
const Contas = {
  all() { return DB.contas || []; },
  get(id) { return (DB.contas || []).find(c => c.id === id) || null; },
  salva(c) {
    DB.contas = DB.contas || [];
    const nome = String(c.nome || '').trim(); if (!nome) return null;
    const dados = { nome, pais: c.pais === 'brasil' ? 'brasil' : 'europa', metodo: c.metodo || 'transfer' };
    let x = c.id && Contas.get(c.id);
    if (x) Object.assign(x, dados); else { x = { id: uid(), ...dados }; DB.contas.push(x); }
    _opSave(); return x;
  },
  remove(id) { DB.contas = (DB.contas || []).filter(c => c.id !== id); _opSave(); },
  nome(id) {
    if (id === CONTA_PRESTADOR) return (typeof LANG !== 'undefined' && LANG === 'en') ? 'Paid on the day to the guide/driver' : 'Pago no dia ao guia/motorista';
    const c = Contas.get(id); return c ? c.nome : '';
  },
};
/* De que lado cai o pagamento. Pagamento antigo, sem conta, segue a regra
   de antes (Pix = Brasil, o resto = Europa). 'prestador' nao e dela: e o
   dinheiro que a guia recebeu na mao — nao entra em contabilidade nenhuma. */
function ladoDoPagamento(p) {
  if (p.conta === CONTA_PRESTADOR) return 'prestador';
  const c = p.conta && Contas.get(p.conta);
  if (c) return c.pais;
  return String(p.method || '').toLowerCase() === 'pix' ? 'brasil' : 'europa';
}
/* Registrar um pagamento de qualquer valor — o sinal, uma parte, o resto.
   O antigo "recebi o saldo" so sabia dar baixa no total. */
function registraPagamento(bookingId, { valor, conta, data }) {
  const b = Bookings.get(bookingId); if (!b) return null;
  const falta = Bookings.due(b);
  const v = Math.round(Math.min(Math.max(0, +valor || 0), falta) * 100) / 100;
  if (v <= 0) return null;
  const pago = Bookings.paid(b);
  const kind = (pago === 0 && v >= b.total) ? 'full' : (v >= falta ? 'balance' : 'deposit');
  const c = Contas.get(conta);
  const method = conta === CONTA_PRESTADOR ? 'cash' : (c ? c.metodo : 'other');
  const p = { amount: v, date: data || isoToday(), method, kind, conta: conta || '' };
  b.payments.push(p);
  if (conta === CONTA_PRESTADOR) b.restoPara = 'prestador';
  _opSaveBooking(b);
  return p;
}
/* Extrato por conta: o que caiu em cada uma no periodo */
function extratoContas(de, ate) {
  const linhas = [];
  for (const b of DB.bookings) {
    for (const p of b.payments || []) {
      if (p.date < de || p.date > ate) continue;
      linhas.push({ date: p.date, client: b.name, tourId: b.tourId, code: b.code, bookingId: b.id,
                    amount: p.amount, kind: p.kind, method: p.method, conta: p.conta || '',
                    lado: ladoDoPagamento(p) });
    }
  }
  return linhas.sort((a, b) => a.date.localeCompare(b.date));
}
/* O acerto com cada guia/motorista. custo = o que ela paga a pessoa pelo
   servico. Se a pessoa recebeu o resto do cliente no dia, isso ja conta como
   pagamento a ela; a diferenca e o acerto (positivo: Ingrid paga; negativo:
   a guia devolve a Ingrid). */
function acertos(de, ate) {
  const out = [];
  for (const b of DB.bookings) {
    if (b.status === 'cancelled' || !b.prestadorId || b.date < de || b.date > ate) continue;
    const custo = +b.custo || 0;
    const noDiaRecebido = (b.payments || []).filter(p => p.conta === CONTA_PRESTADOR).reduce((s, p) => s + p.amount, 0);
    const aReceberNoDia = Op.restoPara(b) === 'prestador' ? Bookings.due(b) : 0;
    const comPrestador = noDiaRecebido + aReceberNoDia;
    if (!custo && !comPrestador) continue;
    out.push({ b, pessoa: Equipe.get(b.prestadorId), custo, comPrestador, saldo: custo - comPrestador, acertado: !!b.acertado });
  }
  return out.sort((a, b) => a.b.date.localeCompare(b.b.date));
}
function marcaAcertado(bookingId, sim) {
  const b = Bookings.get(bookingId); if (!b) return;
  b.acertado = sim ? isoToday() : '';
  _opSaveBooking(b);
}

/* ---------- ficha do cliente ----------
   A mesma chave que Clients.all() usa, para a ficha achar tudo dele. */
function chaveCliente(b) { return String(b.email || b.whats || b.name || '').toLowerCase(); }
const Fichas = {
  get(k) { DB.fichas = DB.fichas || {}; return DB.fichas[k] || { notas: '', tags: '' }; },
  salva(k, d) {
    DB.fichas = DB.fichas || {};
    DB.fichas[k] = { notas: String(d.notas || ''), tags: String(d.tags || ''), em: new Date().toISOString() };
    _opSave();
  },
  reservas(k) {
    return DB.bookings.filter(b => chaveCliente(b) === k)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  },
  /* pedidos e orcamentos do mesmo cliente: pelo WhatsApp ou pelo e-mail */
  doCliente(k, whats, email) {
    const w = String(whats || '').replace(/\D/g, '');
    const bate = (x) => {
      const xw = String(x.whats || '').replace(/\D/g, '');
      return (w.length >= 6 && xw && xw.endsWith(w.slice(-8))) || (email && x.email && x.email.toLowerCase() === email.toLowerCase());
    };
    return {
      pedidos: (DB.pedidos || []).filter(bate),
      orcamentos: (DB.orcamentos || []).filter(o => o.clienteKey === k || bate(o.cliente || {})),
    };
  },
};

/* ---------- sob consulta: orcamentos ----------
   O cliente pede varias coisas (transfer, passeio em Roma, passeio em
   Florenca, transfer de saida em Milao). Vira UM orcamento. O app deixa o
   rascunho pronto; ELA confere e manda — nada sai sozinho para o cliente
   ("eu supervisiono tudo que ela ta fazendo antes de mandar"). */
const ORC_STATUS = [
  ['novo', 'Novo', 'New'], ['rascunho', 'Em montagem', 'Drafting'], ['enviado', 'Enviado', 'Sent'],
  ['fechado', 'Fechou', 'Won'], ['perdido', 'Não fechou', 'Lost'],
];
const Orc = {
  all() { return [...(DB.orcamentos || [])].sort((a, b) => (b.criado || '').localeCompare(a.criado || '')); },
  get(id) { return (DB.orcamentos || []).find(o => o.id === id) || null; },
  cria(d) {
    DB.orcamentos = DB.orcamentos || [];
    const n = DB.orcamentos.reduce((m, o) => Math.max(m, +String(o.num || '').replace(/\D/g, '') || 0), 0) + 1;
    const o = {
      id: uid(), num: 'ORC-' + String(n).padStart(4, '0'), criado: new Date().toISOString(),
      status: d.status || 'novo', origem: d.origem || 'manual', pedidoId: d.pedidoId || '',
      cliente: { nome: String((d.cliente && d.cliente.nome) || '').trim(), whats: String((d.cliente && d.cliente.whats) || '').trim(),
                 email: String((d.cliente && d.cliente.email) || '').trim() },
      clienteKey: d.clienteKey || '',
      itens: (d.itens || []).map(Orc._item),
      sinalPct: d.sinalPct != null ? +d.sinalPct : 30,
      validade: d.validade || addDays(isoToday(), 7),
      obs: String(d.obs || ''), resumo: String(d.resumo || ''), conversa: String(d.conversa || ''),
      pax: +d.pax || 0, datas: d.datas || [],
      termos: d.termos !== false, bookingIds: [],
    };
    DB.orcamentos.push(o); _opSave(); return o;
  },
  _item(i) {
    return { id: i.id || uid(), tourId: i.tourId || '', desc: String(i.desc || '').trim(),
             data: i.data || '', hora: i.hora || '', pax: Math.max(1, +i.pax || 1), opcao: +i.opcao || 0,
             valor: Math.max(0, +i.valor || 0), sinal: i.sinal != null && i.sinal !== '' ? Math.max(0, +i.sinal) : null,
             obs: String(i.obs || '').trim(), sugestao: !!i.sugestao, voo: String(i.voo || '').trim() };
  },
  /* um servico do catalogo, ja com o preco da tabela dela para aquele grupo */
  itemDoCatalogo(tourId, { pax, data, hora, opcao } = {}) {
    const x = Tours.get(tourId); if (!x) return null;
    const h = hora || (DB.rules.find(r => r.tourId === tourId) || {}).time || '09:00';
    const pr = Bookings.precoDe(x, tourId, data || isoToday(), h, Math.max(1, +pax || 1), { opcao: +opcao || 0 });
    return Orc._item({ tourId, desc: x.name.pt, data: data || '', hora: h, pax, opcao,
                       valor: pr.total || 0, sinal: x.priceMode === 'transfer' ? (pr.sinal || null) : null,
                       obs: pr.consultar ? 'Sem preço na tabela — defina o valor' : '' });
  },
  total(o) { return (o.itens || []).reduce((s, i) => s + (+i.valor || 0), 0); },
  sinalDoItem(o, i) {
    return i.sinal != null ? +i.sinal : Math.round((+i.valor || 0) * (+o.sinalPct || 0) / 100);
  },
  sinal(o) { return (o.itens || []).reduce((s, i) => s + Orc.sinalDoItem(o, i), 0); },
  salva(o) {
    const x = Orc.get(o.id); if (!x) return null;
    Object.assign(x, o, { itens: (o.itens || x.itens).map(Orc._item) });
    _opSave(); return x;
  },
  status(id, st) { const o = Orc.get(id); if (!o) return; o.status = st; _opSave(); },
  remove(id) { DB.orcamentos = (DB.orcamentos || []).filter(o => o.id !== id); _opSave(); },
  /* Fechou: cada servico do catalogo vira uma reserva de verdade, com o
     cliente e o sinal. Item avulso (sem servico do catalogo) fica so no
     orcamento — ela lanca a parte, se quiser. */
  fecha(id, { sinalRecebido, conta } = {}) {
    const o = Orc.get(id); if (!o || o.status === 'fechado') return [];
    const criadas = [];
    for (const i of o.itens) {
      if (!i.tourId || !Tours.get(i.tourId)) continue;
      const b = Bookings.criarManual({
        tourId: i.tourId, date: i.data || isoToday(), time: i.hora || '09:00',
        name: o.cliente.nome || 'Cliente', whats: o.cliente.whats, email: o.cliente.email,
        pax: i.pax, total: i.valor, recebido: 0,
      });
      b.origin = 'orcamento'; b.orcamentoId = o.id;
      /* o resto e pago no dia a quem faz o servico — o caso mais comum dela */
      b.policy = 'sinal'; b.sinal = Orc.sinalDoItem(o, i);
      if (i.obs && !i.sugestao) b.obsOp = i.obs;
      if (i.voo) b.voo = i.voo;
      _opSaveBooking(b);
      if (sinalRecebido && b.sinal > 0) registraPagamento(b.id, { valor: b.sinal, conta });
      criadas.push(b);
    }
    o.status = 'fechado'; o.bookingIds = criadas.map(b => b.id); o.fechadoEm = isoToday();
    _opSave();
    return criadas;
  },
};

/* ---------- ler uma conversa colada do WhatsApp ----------
   Enquanto a Meta nao libera o numero, ela cola a conversa e o app tira o
   que importa: nome, telefone, datas, quantas pessoas, cidades, servicos.
   E o mesmo "apanhador de informacoes" que ela pediu — so que ela cola em
   vez de o robo ler sozinho. Nunca responde nada. */
const CONV_CIDADES = [
  ['Roma', /\broma\b|\brome\b/], ['Florença', /floren[cç]a|firenze|florence/], ['Milão', /mil[aã]o|milano|milan\b/],
  ['Veneza', /veneza|venezia|venice/], ['Nápoles', /n[aá]poles|napoli|naples/], ['Costa Amalfitana', /amalfi|positano|sorrento/],
  ['Capri', /capri/], ['Pompeia', /pompei/], ['Toscana', /toscana|tuscany|siena|pisa|chianti/], ['Assis', /assis|assisi|[uú]mbria/],
];
const CONV_SERVICOS = [
  ['transfer', /transfer|traslado|translado|aeroporto|fiumicino|ciampino|\bfco\b|civitavecchia|porto|esta[cç][aã]o|termini|motorista/],
  ['vaticano-3h', /vaticano|capela sistina|museus do vaticano/],
  ['roma-antiga-3h', /coliseu|coliseo|roma antiga|f[oó]rum romano|palatino/],
  ['papal-convites', /audi[eê]ncia|papa\b/],
  ['bv-pompeia', /pompei/], ['bv-amalfi', /amalfi|positano/], ['bv-tivoli', /tivoli/], ['bv-assis', /assis/],
  ['noturno-3h', /noturno|[aà] noite/],
];
const MESES_PT = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function _isoDe(d, m, y) {
  const hoje = isoToday();
  let ano = y ? (+y < 100 ? 2000 + +y : +y) : +hoje.slice(0, 4);
  const iso = (a) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (!(+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31)) return '';
  /* data sem ano que ja passou e do ano que vem */
  if (!y && iso(ano) < hoje) ano += 1;
  return iso(ano);
}
function lerConversa(txt) {
  const bruto = String(txt || '');
  const low = bruto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  /* quem escreveu: "[05/10/26 14:32] Maria Silva: oi" ou "05/10/2026 14:32 - Maria Silva: oi" */
  let nome = '';
  const nomeDono = String((typeof guiaNome === 'function' && guiaNome()) || '').toLowerCase();
  const reAutor = /^(?:\[[^\]]+\]\s*|\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*-\s*)([^:\n]{2,40}):/gm;
  let m;
  while ((m = reAutor.exec(bruto))) {
    const quem = m[1].trim();
    if (nomeDono && quem.toLowerCase().includes(nomeDono)) continue;
    if (/emroma|em roma/i.test(quem)) continue;
    if (/^\+?[\d\s()-]+$/.test(quem)) continue;
    nome = quem; break;
  }
  if (!nome) { const mm = bruto.match(/(?:meu nome [eé]|me chamo|sou (?:a|o))\s+([A-ZÀ-Ú][\wÀ-ú]+(?:\s+[A-ZÀ-Ú][\wÀ-ú]+)?)/); if (mm) nome = mm[1]; }
  const tel = (bruto.match(/\+\d[\d\s().-]{8,}\d/) || [''])[0].replace(/[^\d+]/g, '');
  /* datas: 5/10, 05/10/2026, "5 de outubro" — tirando as marcas de hora do proprio WhatsApp */
  const semCarimbo = bruto.replace(/^\[[^\]]+\]/gm, '').replace(/^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*-/gm, '');
  const datas = new Set();
  for (const d of semCarimbo.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) { const i = _isoDe(d[1], d[2], d[3]); if (i) datas.add(i); }
  const semCarLow = semCarimbo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const d of semCarLow.matchAll(/\b(\d{1,2})\s+de\s+([a-z]+)/g)) {
    const mi = MESES_PT.indexOf(d[2]); if (mi >= 0) { const i = _isoDe(d[1], mi + 1); if (i) datas.add(i); }
  }
  const num = (re) => { const x = low.match(re); return x ? +x[1] : 0; };
  /* "somos 4 pessoas (2 adultos e 2 criancas)": o total e 4, nao 6 */
  const pessoas = num(/(\d{1,2})\s*(?:pessoas|pax|people)/);
  const adultos = num(/(\d{1,2})\s*(?:adultos?|adults?)/);
  const criancas = num(/(\d{1,2})\s*(?:criancas?|filhos?|kids?|children)/);
  const pax = pessoas || (adultos + criancas) || (/\b(casal|eu e (meu|minha))\b/.test(low) ? 2 : 0);
  const cidades = CONV_CIDADES.filter(([, re]) => re.test(low)).map(([c]) => c);
  const servicos = CONV_SERVICOS.filter(([, re]) => re.test(low)).map(([s]) => s);
  const chegada = /chegada|chego|chegamos|desembarc|pousa|aterriss/.test(low);
  /* "volta" sozinho pegava o "bate e volta" e inventava um transfer de saida */
  const partida = /partida|saida|embarque|vou embora|vamos embora|voo de volta|volta(?:mos)? (?:ao|para o) (?:brasil|aeroporto)/.test(low);
  const voo = (bruto.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/) || [])[0] || '';
  const partes = [];
  if (datas.size) partes.push([...datas].sort().map(d => d.slice(8, 10) + '/' + d.slice(5, 7)).join(', '));
  if (pax) partes.push(pax + (criancas ? ` pessoas (${criancas} criança${criancas > 1 ? 's' : ''})` : ' pessoas'));
  if (cidades.length) partes.push(cidades.join(', '));
  if (servicos.length) partes.push(servicos.map(s => s === 'transfer'
    ? 'transfer' + (chegada && partida ? ' (chegada e partida)' : chegada ? ' (chegada)' : partida ? ' (partida)' : '')
    : ((typeof Tours !== 'undefined' && Tours.get(s)) ? Tours.get(s).name.pt : s)).join(', '));
  if (voo) partes.push('voo ' + voo);
  return { nome, whats: tel, datas: [...datas].sort(), adultos, criancas, pax, cidades, servicos, chegada, partida, voo,
           resumo: partes.join(' · ') };
}
/* O rascunho: cada servico reconhecido vira um item com o preco da tabela.
   Marcado como SUGESTAO — e ela quem confere antes de mandar. */
function rascunhoDaConversa(c) {
  const itens = [];
  const pax = c.pax || 2;
  const datas = c.datas || [];
  /* Uma data so costuma ser a CHEGADA: os passeios vao para os dias
     seguintes, um por dia. Com varias datas, segue a ordem delas. */
  let di = 0;
  const proxData = () => {
    if (datas.length > 1) return datas[Math.min(++di, datas.length - 1)];
    return datas[0] ? addDays(datas[0], ++di) : '';
  };
  for (const s of c.servicos || []) {
    if (s === 'transfer') {
      if (c.chegada || !c.partida) { const it = Orc.itemDoCatalogo('transfer-aeroporto', { pax, data: datas[0] || '' }); if (it) { it.sugestao = true; it.desc += ' — chegada'; it.voo = c.voo || ''; itens.push(it); } }
      if (c.partida) { const it = Orc.itemDoCatalogo('transfer-aeroporto', { pax, data: datas[datas.length - 1] || '' }); if (it) { it.sugestao = true; it.desc += ' — partida'; itens.push(it); } }
      continue;
    }
    const it = Orc.itemDoCatalogo(s, { pax, data: proxData() });
    if (it) { it.sugestao = true; itens.push(it); }
  }
  return itens;
}
/* Do questionario "Monte seu roteiro" para um rascunho: o que ela ofereceria
   em Roma para quem gosta de cada coisa, e o transfer se pediu. */
const ROTEIRO_SUGESTAO = {
  historia: 'roma-antiga-3h', arte: 'vaticano-3h', fe: 'basilicas-3h', noite: 'noturno-3h', fotos: 'panoramas-3h',
  comida: 'degustacao', criancas: 'criancas',
};
function rascunhoDoRoteiro(ped) {
  const itens = [];
  const pax = (+ped.adultos || 1) + (+ped.criancas || 0);
  let dia = ped.ini || '';
  const prox = () => { const d = dia; if (dia) dia = addDays(dia, 1); return d; };
  if ((ped.precisa || []).includes('transfer')) {
    const it = Orc.itemDoCatalogo('transfer-aeroporto', { pax, data: ped.ini || '' });
    if (it) { it.sugestao = true; it.desc += ' — chegada'; itens.push(it); }
  }
  if ((ped.onde || []).includes('roma') || !(ped.onde || []).length) {
    const vistos = new Set();
    for (const g of ped.gosto || []) {
      const id = ROTEIRO_SUGESTAO[g];
      if (!id || vistos.has(id) || !Tours.get(id)) continue;
      vistos.add(id);
      const it = Orc.itemDoCatalogo(id, { pax, data: prox() }); if (it) { it.sugestao = true; itens.push(it); }
    }
    if (!vistos.size && Tours.get('roma-antiga-3h')) {
      const it = Orc.itemDoCatalogo('roma-antiga-3h', { pax, data: prox() }); if (it) { it.sugestao = true; itens.push(it); }
    }
  }
  const foraDeRoma = { pompeia: 'bv-pompeia', amalfi: 'bv-amalfi', umbria: 'bv-assis', castelli: 'bv-tivoli', toscana: 'bv-toscana-sul' };
  for (const o of ped.onde || []) {
    const id = foraDeRoma[o]; if (!id || !Tours.get(id)) continue;
    const it = Orc.itemDoCatalogo(id, { pax, data: prox() }); if (it) { it.sugestao = true; itens.push(it); }
  }
  for (const o of ped.onde || []) {
    if (['florenca', 'veneza', 'milao', 'capri'].includes(o)) {
      const nome = { florenca: 'Florença', veneza: 'Veneza', milao: 'Milão', capri: 'Capri' }[o];
      itens.push(Orc._item({ desc: 'Passeio particular em ' + nome, pax, data: '', valor: 0, sugestao: true, obs: 'Defina o valor — ainda não há tabela desta cidade' }));
    }
  }
  if ((ped.precisa || []).includes('transfer') && ped.fim) {
    const it = Orc.itemDoCatalogo('transfer-aeroporto', { pax, data: ped.fim });
    if (it) { it.sugestao = true; it.desc += ' — partida'; itens.push(it); }
  }
  return itens;
}

/* ---------- termos e voucher ---------- */
/* MODELO. Ela ja tem os termos dela e cola por cima em Ajustes. */
const TERMOS_MODELO = [
  'MODELO — troque pelos seus termos em Ajustes → Termos e condições.',
  '',
  '1. A reserva é confirmada com o pagamento do sinal. Ao pagar, você declara que leu e aceita estes termos.',
  '2. O restante é pago no dia do serviço, em dinheiro, a quem presta o serviço (guia ou motorista), salvo combinado diferente por escrito.',
  '3. Cancelamento: até 48 horas antes, o sinal pode ser usado em outra data; com menos de 48 horas o sinal não é devolvido.',
  '4. Atrasos do cliente podem reduzir a duração do passeio. No transfer, a espera incluída é a informada no orçamento.',
  '5. Ingressos são nominais e comprados com antecedência; depois de emitidos não têm reembolso.',
].join('\n');
function termosTexto() {
  const s = (DB.settings && DB.settings.termos) || {};
  const l = (typeof LANG !== 'undefined' && LANG === 'en') ? 'en' : 'pt';
  return String(s[l] || s.pt || TERMOS_MODELO);
}
/* O que o cliente precisa saber NO DIA. Dicas do servico (o editor do
   passeio tem o campo) ou, sem elas, as do tipo de servico. */
const DICAS_PADRAO = {
  transfer: 'O motorista espera no desembarque com uma plaquinha com o seu nome. Ao pegar as malas, ligue o celular e confira o WhatsApp. Se não encontrar o motorista, chame o número de plantão antes de sair do aeroporto.',
  walk: 'Use sapato confortável e leve água. Chegue 10 minutos antes no ponto de encontro.',
  papal: 'Chegue com antecedência: a fila da segurança é longa. Ombros e joelhos cobertos.',
  day: 'O motorista busca no hotel no horário combinado. Leve documento, água e protetor solar.',
};
function dicasDo(b) {
  const x = Tours.get(b.tourId);
  const l = (typeof LANG !== 'undefined' && LANG === 'en') ? 'en' : 'pt';
  const d = x && x.dicas && (x.dicas[l] || x.dicas.pt);
  if (d) return d;
  if (x && /vaticano|vatican|basilic|papal/i.test(x.id + ' ' + x.name.pt)) {
    return 'Vaticano e basílicas: ombros e joelhos cobertos (vale para homens e mulheres). Nada de regata, short ou saia curta. Mochilas grandes não entram. ' + (DICAS_PADRAO.walk);
  }
  return (x && DICAS_PADRAO[x.type]) || DICAS_PADRAO.walk;
}

/* ---------- garante as colecoes, e a demonstracao ----------
   Quem ja usa o app nao tem DB.equipe etc. — nasce vazio sem quebrar nada.
   Na DEMONSTRACAO (sem banco), semeia guias, contas e o dia de hoje com
   servicos de verdade, para ela fazer o test drive com o painel vivo. */
const OP_SEED = 1;
function opGarante() {
  if (!DB) return;
  DB.equipe = DB.equipe || [];
  DB.disp = DB.disp || [];
  DB.orcamentos = DB.orcamentos || [];
  DB.fichas = DB.fichas || {};
  if (!Array.isArray(DB.contas) || !DB.contas.length) DB.contas = contasPadrao();
  if (DB.settings && !DB.settings.termos) DB.settings.termos = { pt: '', en: '' };
  if (DB.settings && DB.settings.plantao === undefined) DB.settings.plantao = '';
  if (DB.demo && !(typeof temNuvem === 'function' && temNuvem()) && (+DB.opSeed || 0) < OP_SEED) {
    opSemeiaDemo();
    DB.opSeed = OP_SEED;
  }
  _opSave();
}
function opSemeiaDemo() {
  const hoje = isoToday();
  /* nomes ficticios — as guias de verdade ela cadastra */
  const gente = [
    ['g1', 'Marta Bellini', 'guia', '+39 333 100 2001', ['Roma'], 'português, italiano'],
    ['g2', 'Carla Nunes', 'guia', '+39 333 100 2002', ['Roma', 'Tivoli'], 'português, espanhol'],
    ['g3', 'Giulia Rossi', 'guia', '+39 333 100 2003', ['Roma', 'Florença'], 'português, inglês'],
    ['g4', 'Beatriz Lopes', 'guia', '+39 333 100 2004', ['Roma'], 'português'],
    ['g5', 'Sofia Conti', 'guia', '+39 333 100 2005', ['Florença', 'Toscana'], 'português, italiano'],
    ['g6', 'Ana Ferraro', 'guia', '+39 333 100 2006', ['Nápoles', 'Pompeia', 'Costa Amalfitana'], 'português'],
    ['m1', 'Luca (Roma Transfer)', 'motorista', '+39 333 100 3001', ['Roma'], 'italiano, inglês'],
    ['m2', 'Paolo (NCC Paolo)', 'motorista', '+39 333 100 3002', ['Roma', 'Civitavecchia'], 'italiano'],
  ];
  DB.equipe = gente.map(([id, nome, tipo, whats, cidades, idiomas], i) =>
    ({ id: 'op-' + id, nome, tipo, whats, cidades, idiomas, obs: '', pref: i + 1 }));
  DB.contas = contasPadrao();

  /* o dia de hoje e os proximos, como numa semana normal dela */
  const P = [
    { quem: ['Juliana Andrade', 'ju.andrade@email.com', '+55 11 99876 5501'], tourId: 'transfer-aeroporto', d: 0, time: '14:40', pax: 3,
      voo: 'AZ 673 (GRU→FCO)', origem: 'Fiumicino, desembarque T3', destino: 'Hotel Artemide, Via Nazionale 22', pres: 'op-m1', sinalPago: 'wise-br',
      group: [{ nome: 'Marcos Andrade', nasc: '1980-04-12' }, { nome: 'Lia Andrade', nasc: '2014-09-03' }] },
    { quem: ['Roberto Farias', 'roberto.farias@email.com', '+55 21 98765 4402'], tourId: 'vaticano-3h', d: 0, time: '09:00', pax: 2,
      pres: 'op-g1', sinalPago: 'nubank', restoPara: 'prestador', obsOp: 'Casal, primeira vez em Roma. Ela é vegetariana.',
      group: [{ nome: 'Helena Farias', nasc: '' }] },
    { quem: ['Camila Teixeira', 'camila.tx@email.com', '+55 31 99654 3303'], tourId: 'roma-antiga-3h', d: 1, time: '09:00', pax: 4,
      sinalPago: 'wise-eu', restoPara: 'prestador', obsOp: 'Quer o Coliseu por dentro (arena).' },
    { quem: ['Juliana Andrade', 'ju.andrade@email.com', '+55 11 99876 5501'], tourId: 'barroca-3h', d: 1, time: '15:00', pax: 3,
      sinalPago: 'wise-br', restoPara: 'prestador', pres: 'op-g2' },
    { quem: ['Eduardo Pires', 'edu.pires@email.com', '+55 41 99123 2204'], tourId: 'transfer-civitavecchia', d: 2, time: '07:00', pax: 5,
      origem: 'Porto de Civitavecchia — navio MSC Seaview', destino: 'Hotel Quirinale', sinalPago: 'revolut' },
    { quem: ['Grupo Viagens Sol (agência)', 'reservas@viagenssol.com', '+55 11 3333 4405'], tourId: 'bv-pompeia', d: 3, time: '07:30', pax: 6,
      pagoTudo: 'wise-eu', restoPara: 'ingrid', custo: 520, obsOp: 'Agência: cliente já pagou tudo. Ingrid acerta com a guia.' },
  ];
  let k = 0;
  for (const s of P) {
    const x = Tours.get(s.tourId); if (!x) continue;
    const date = addDays(hoje, s.d);
    const pr = Bookings.precoDe(x, x.id, date, s.time, s.pax, { opcao: 0 });
    const total = pr.total || 0;
    const sinal = x.priceMode === 'transfer' ? (pr.sinal || 30) : Math.round(total * 0.3);
    const b = {
      id: 'op' + (++k), code: PREFIXO + '-' + (5100 + k * 41),
      tourId: x.id, date, time: s.time, name: s.quem[0], email: s.quem[1], whats: s.quem[2], insta: '',
      pax: s.pax, total, coupon: null, discount: 0, policy: s.pagoTudo ? 'full' : 'sinal', sinal: s.pagoTudo ? 0 : sinal,
      adultos: s.pax, criancas: 0, idades: [], veiculo: pr.veiculo || '', malas: pr.malas || '',
      group: s.group || [], consent: { ok: true, at: addDays(date, -12) + 'T10:00:00.000Z', src: 'checkout' },
      payments: [], status: 'confirmed', createdAt: addDays(date, -12) + 'T10:00:00.000Z', origin: 'whatsapp',
      voo: s.voo || '', origem: s.origem || '', destino: s.destino || '', obsOp: s.obsOp || '',
      prestadorId: s.pres || '', restoPara: s.restoPara || '', custo: s.custo || 0,
    };
    if (s.pagoTudo) b.payments.push({ amount: total, date: addDays(date, -10), method: 'transfer', kind: 'full', conta: s.pagoTudo });
    else if (s.sinalPago) {
      const c = contasPadrao().find(z => z.id === s.sinalPago);
      b.payments.push({ amount: sinal, date: addDays(date, -12), method: c ? c.metodo : 'transfer', kind: 'deposit', conta: s.sinalPago });
    }
    DB.bookings = DB.bookings.filter(z => z.id !== b.id);
    DB.bookings.push(b);
  }
  /* respostas das guias para amanha de manha — o caso da reuniao */
  const am = addDays(hoje, 1);
  DB.disp = [
    { pessoaId: 'op-g1', data: am, turno: 'manha', estado: 'ocupada', nota: 'já tem grupo', em: new Date().toISOString() },
    { pessoaId: 'op-g3', data: am, turno: 'manha', estado: 'livre', nota: 'até 13h', em: new Date().toISOString() },
    { pessoaId: 'op-g4', data: am, turno: 'manha', estado: 'livre', nota: '', em: new Date().toISOString() },
  ];
  /* um pedido que chegou de madrugada pelo WhatsApp, esperando por ela */
  const conversa = `[${hoje.slice(8, 10)}/${hoje.slice(5, 7)}/${hoje.slice(2, 4)} 03:12] Fernanda Lima: Oi Ingrid! Tudo bem? Vi seu perfil no Instagram 😊
[${hoje.slice(8, 10)}/${hoje.slice(5, 7)}/${hoje.slice(2, 4)} 03:13] Fernanda Lima: Somos 4 pessoas (2 adultos e 2 crianças), chegamos em Roma dia ${addDays(hoje, 20).slice(8, 10)}/${addDays(hoje, 20).slice(5, 7)} no voo LA 8070 em Fiumicino
[${hoje.slice(8, 10)}/${hoje.slice(5, 7)}/${hoje.slice(2, 4)} 03:14] Fernanda Lima: Queremos transfer de chegada, visitar o Vaticano e o Coliseu, e um bate e volta a Pompeia. Depois vamos para Florença de trem
[${hoje.slice(8, 10)}/${hoje.slice(5, 7)}/${hoje.slice(2, 4)} 03:15] Fernanda Lima: Meu WhatsApp é +55 48 99612 7788`;
  const c = lerConversa(conversa);
  if (!(DB.orcamentos || []).some(o => o.origem === 'whats' && o.cliente.nome === c.nome)) {
    Orc.cria({ origem: 'whats', status: 'novo', cliente: { nome: c.nome, whats: c.whats }, conversa, resumo: c.resumo,
               pax: c.pax, datas: c.datas, itens: rascunhoDaConversa(c) });
  }
}

/* ---------- textos das abas novas ---------- */
if (typeof STR !== 'undefined') {
  Object.assign(STR, {
    admGuias:    { pt: 'Guias', en: 'Guides' },
    admConsulta: { pt: 'Sob consulta', en: 'Quotes' },
    admMoney:    { pt: 'Contabilidade', en: 'Accounting' },
  });
}

opGarante();
