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
  DB.tarefas = DB.tarefas || [];
  DB.lembretesVistos = DB.lembretesVistos || {};
  const demo = DB.demo && !(typeof temNuvem === 'function' && temNuvem());
  if (demo && (+DB.opSeed || 0) < OP_SEED) {
    opSemeiaDemo();
    DB.opSeed = OP_SEED;
  }
  /* tarefas de exemplo so uma vez, e so na demonstracao */
  if (demo && !DB.tarefasSeed && typeof opSemeiaTarefas === 'function') {
    opSemeiaTarefas();
    DB.tarefasSeed = 1;
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

/* ---------- TAREFAS E ANOTACOES ----------
   Tarefa: tem prazo (ou nao), pode estar ligada a um cliente, a um servico,
   a um orcamento ou a uma guia. Anotacao: texto com data — e onde cai o
   resumo que o robo do WhatsApp vai deixar para ela conferir de manha.
   As duas aparecem na Agenda do app e viram evento na agenda do celular.

   Os LEMBRETES nao sao guardados: o app calcula na hora o que precisa ser
   feito (cliente que deve, orcamento sem resposta, voucher para mandar,
   servico sem guia). Ela marca "feito" e o lembrete some. */
const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
/* "amanha 9h", "sexta", "12/10 14:30" — o prazo sai do proprio texto */
function lerPrazo(txt, hoje) {
  hoje = hoje || isoToday();
  const low = String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let data = '', hora = '';
  if (/\bdepois de amanha\b/.test(low)) data = addDays(hoje, 2);
  else if (/\bamanha\b/.test(low)) data = addDays(hoje, 1);
  else if (/\bhoje\b/.test(low)) data = hoje;
  else {
    const d = low.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (d) data = _isoDe(d[1], d[2], d[3]);
    else {
      const w = DIAS_SEMANA.findIndex(n => new RegExp('\\b' + n + '(-feira)?\\b').test(low));
      if (w >= 0) {
        const hj = new Date(hoje + 'T12:00:00').getDay();
        data = addDays(hoje, ((w - hj + 7) % 7) || 7);
      }
    }
  }
  const h = low.match(/\b(\d{1,2})(?::(\d{2})|h(\d{2})?)\b/);
  if (h && +h[1] < 24) hora = String(+h[1]).padStart(2, '0') + ':' + String(h[2] || h[3] || '00').padStart(2, '0');
  return { data, hora };
}
const Tarefas = {
  all() { return DB.tarefas || []; },
  get(id) { return (DB.tarefas || []).find(t => t.id === id) || null; },
  cria(d) {
    DB.tarefas = DB.tarefas || [];
    const texto = String(d.texto || '').trim(); if (!texto) return null;
    const t = {
      id: uid(), tipo: d.tipo === 'nota' ? 'nota' : 'tarefa', texto, detalhe: String(d.detalhe || '').trim(),
      prazo: d.prazo || '', hora: d.hora || '', feita: false, feitaEm: '', criada: new Date().toISOString(),
      clienteKey: d.clienteKey || '', clienteNome: String(d.clienteNome || '').trim(), whats: String(d.whats || '').trim(),
      bookingId: d.bookingId || '', orcId: d.orcId || '', pessoaId: d.pessoaId || '',
      fixa: !!d.fixa, origem: d.origem || 'manual',
      /* a tarefa inteligente: que tipo de passo e, quando se fecha sozinha,
         a que esta ligada, e de qual tarefa ela nasceu */
      etapa: d.etapa || (d.tipo === 'nota' ? '' : etapaDoTexto(texto)),
      fechaQuando: d.fechaQuando || '', liga: d.liga || {}, chave: d.chave || '',
      tentativa: +d.tentativa || 1, anterior: d.anterior || '', obsFim: '',
    };
    DB.tarefas.push(t); _opSave(); return t;
  },
  /* "aguardar" nao se duplica: se ja existe uma aberta com a mesma chave,
     so empurra o prazo */
  garante(d) {
    const ja = d.chave && Tarefas.all().find(t => !t.feita && t.chave === d.chave);
    if (ja) { if (d.prazo) ja.prazo = d.prazo; if (d.hora !== undefined) ja.hora = d.hora; _opSave(); return ja; }
    return Tarefas.cria(d);
  },
  /* CONCLUIR — e aqui que a tarefa vira a proxima. resultado vem dos botoes
     da tarefa de espera: 'respondeu', 'cutucar' (nao respondeu), ou vazio. */
  conclui(id, resultado) {
    const t = Tarefas.get(id); if (!t || t.feita) return null;
    t.feita = true; t.feitaEm = new Date().toISOString();
    t.obsFim = resultado === 'respondeu' ? 'respondeu' : resultado === 'cutucar' ? 'não respondeu' : '';
    const prox = proximoPasso(t, resultado);
    const nova = prox ? Tarefas.garante({ ...prox, anterior: t.id, clienteKey: prox.clienteKey ?? t.clienteKey,
      clienteNome: prox.clienteNome ?? t.clienteNome, whats: prox.whats ?? t.whats, bookingId: prox.bookingId ?? t.bookingId,
      orcId: prox.orcId ?? t.orcId, pessoaId: prox.pessoaId ?? t.pessoaId }) : null;
    _opSave();
    return nova;
  },
  adia(id, dias) {
    const t = Tarefas.get(id); if (!t) return;
    t.prazo = addDays(isoToday(), dias || 2); _opSave();
  },
  /* FECHAR SOZINHA: o cliente pagou, o orcamento foi decidido, a guia
     respondeu. Roda antes de desenhar a tela. Devolve o que fechou. */
  sincroniza(hoje) {
    hoje = hoje || isoToday();
    const fechadas = [];
    for (const t of Tarefas.all()) {
      if (t.feita || !t.fechaQuando) continue;
      let motivo = '', resultado = 'respondeu';
      if (t.fechaQuando === 'pago') {
        const bs = t.bookingId ? [Bookings.get(t.bookingId)].filter(Boolean)
          : DB.bookings.filter(b => t.clienteKey && chaveCliente(b) === t.clienteKey && b.status !== 'cancelled' && Op.restoPara(b) === 'ingrid');
        if (bs.length && bs.every(b => b.status === 'cancelled' || Bookings.due(b) <= 0 || Op.restoPara(b) !== 'ingrid')) motivo = 'pagou';
      } else if (t.fechaQuando === 'orc-decidido') {
        const o = Orc.get(t.orcId);
        if (o && o.status === 'fechado') motivo = 'o orçamento fechou';
        else if (o && o.status === 'perdido') { motivo = 'o orçamento não fechou'; resultado = 'perdido'; }
      } else if (t.fechaQuando === 'guia-respondeu' && t.liga && t.liga.data) {
        const tu = t.liga.turno === 'dia' ? 'manha' : t.liga.turno;
        const e = Disp.estado(t.pessoaId, t.liga.data, tu);
        if (e.estado) { motivo = e.estado === 'livre' ? 'a guia respondeu: livre' : 'a guia respondeu: ocupada'; resultado = e.estado; }
      }
      if (!motivo) continue;
      Tarefas.conclui(t.id, resultado);
      t.obsFim = motivo + ' — concluída sozinha';
      fechadas.push(t);
    }
    if (fechadas.length) _opSave();
    return fechadas;
  },
  salva(id, d) {
    const t = Tarefas.get(id); if (!t) return null;
    for (const k of ['texto', 'detalhe', 'prazo', 'hora', 'clienteKey', 'clienteNome', 'fixa']) if (d[k] !== undefined) t[k] = typeof d[k] === 'string' ? d[k].trim() : d[k];
    _opSave(); return t;
  },
  marca(id, feita) {
    const t = Tarefas.get(id); if (!t) return;
    t.feita = !!feita; t.feitaEm = feita ? new Date().toISOString() : '';
    _opSave();
  },
  remove(id) { DB.tarefas = (DB.tarefas || []).filter(t => t.id !== id); _opSave(); },
  /* as tarefas abertas, na ordem em que ela resolve o dia */
  grupos(hoje) {
    hoje = hoje || isoToday();
    const abertas = Tarefas.all().filter(t => t.tipo === 'tarefa' && !t.feita)
      .sort((a, b) => ((a.prazo || '9999') + (a.hora || '99')).localeCompare((b.prazo || '9999') + (b.hora || '99')));
    const sem7 = addDays(hoje, 7);
    return {
      atrasadas: abertas.filter(t => t.prazo && t.prazo < hoje),
      hoje: abertas.filter(t => t.prazo === hoje),
      semana: abertas.filter(t => t.prazo > hoje && t.prazo <= sem7),
      depois: abertas.filter(t => t.prazo > sem7),
      semData: abertas.filter(t => !t.prazo),
      feitas: Tarefas.all().filter(t => t.tipo === 'tarefa' && t.feita).sort((a, b) => (b.feitaEm || '').localeCompare(a.feitaEm || '')).slice(0, 30),
    };
  },
  notas(busca) {
    const n = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = n(busca).trim();
    return Tarefas.all().filter(t => t.tipo === 'nota')
      .filter(t => !q || [t.texto, t.detalhe, t.clienteNome].some(v => n(v).includes(q)))
      .sort((a, b) => (b.fixa - a.fixa) || (b.criada || '').localeCompare(a.criada || ''));
  },
  doDia(data) { return Tarefas.all().filter(t => t.prazo === data).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99')); },
  /* do mesmo cliente: pela chave da ficha ou pelo WhatsApp */
  doCliente(k, whats) {
    const w = String(whats || '').replace(/\D/g, '');
    return Tarefas.all().filter(t => (k && t.clienteKey === k)
      || (w.length >= 6 && String(t.whats || '').replace(/\D/g, '').endsWith(w.slice(-8))));
  },
};

/* ---------- o fluxo das tarefas inteligentes ----------
   mensagem  -> aguardar resposta (2 dias)
   cobrar    -> aguardar pagamento (fecha sozinha quando o cliente paga)
   orcamento -> aguardar resposta do orcamento (fecha sozinha quando fecha)
   guia      -> aguardar a guia (fecha sozinha quando voce marca livre/ocupada)
   aguardar  -> respondeu: o passo seguinte (fechar, escalar) | nao respondeu:
                mandar um lembrete, que volta a aguardar (ate 3 tentativas) */
const ETAPAS = {
  mensagem:  { nome: 'mensagem', depois: 'aguardar resposta' },
  cobrar:    { nome: 'cobrança', depois: 'aguardar o pagamento' },
  orcamento: { nome: 'orçamento', depois: 'aguardar a resposta do orçamento' },
  guia:      { nome: 'pedir disponibilidade', depois: 'aguardar a guia' },
  aguardar:  { nome: 'aguardando', depois: '' },
  fechar:    { nome: 'fechar', depois: '' },
  escalar:   { nome: 'escalar', depois: 'aguardar a confirmação da guia' },
};
function etapaDoTexto(txt) {
  const low = String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/^(cobrar|pedir o pagamento|lembrar .* pagamento)/.test(low)) return 'cobrar';
  if (/orcamento/.test(low) && /^(mandar|enviar|montar)/.test(low)) return 'orcamento';
  if (/^(perguntar|confirmar) (a|o|com a|com o) (guia|motorista)/.test(low)) return 'guia';
  if (/^(aguardar|esperar)/.test(low)) return 'aguardar';
  if (/^(mandar|enviar|responder|perguntar|falar|ligar|escrever|chamar|confirmar|avisar|lembrar)/.test(low)) return 'mensagem';
  return '';
}
function _alvo(t) {
  const p = t.pessoaId && Equipe.get(t.pessoaId);
  return (p && p.nome.split(' ')[0]) || (t.clienteNome && t.clienteNome.split(' ')[0]) || 'o cliente';
}
function proximoPasso(t, resultado) {
  const hoje = isoToday(), alvo = _alvo(t);
  if (t.etapa === 'mensagem')
    return { etapa: 'aguardar', texto: `Aguardar resposta de ${alvo}`, detalhe: 'Depois de: ' + t.texto, prazo: addDays(hoje, 2), chave: 'resp:' + (t.clienteKey || t.whats || t.pessoaId || t.id), tentativa: t.tentativa };
  if (t.etapa === 'cobrar')
    return { etapa: 'aguardar', texto: `Aguardar o pagamento de ${alvo}`, prazo: addDays(hoje, 2), fechaQuando: 'pago', chave: 'pago:' + (t.bookingId || t.clienteKey), tentativa: t.tentativa };
  if (t.etapa === 'orcamento')
    return { etapa: 'aguardar', texto: `Aguardar a resposta de ${alvo} sobre o orçamento`, prazo: addDays(hoje, 2), fechaQuando: 'orc-decidido', chave: 'orc:' + t.orcId, tentativa: t.tentativa };
  if (t.etapa === 'guia')
    return { etapa: 'aguardar', texto: `Aguardar a resposta de ${alvo}`, prazo: hoje, fechaQuando: t.liga && t.liga.data ? 'guia-respondeu' : '', liga: t.liga, chave: 'guia:' + t.pessoaId + ':' + ((t.liga && t.liga.data) || ''), tentativa: t.tentativa };
  if (t.etapa === 'escalar')
    return { etapa: 'aguardar', texto: `Aguardar a confirmação de ${alvo}`, prazo: hoje, chave: 'conf:' + t.pessoaId + ':' + t.bookingId };
  if (t.etapa !== 'aguardar') return null;
  /* a espera acabou */
  if (resultado === 'cutucar') {
    const n = (+t.tentativa || 1) + 1;
    if (n > 3) return { etapa: t.orcId ? 'fechar' : '', texto: t.orcId ? `${alvo} não respondeu 3 vezes: marcar o orçamento como "não fechou"?` : `${alvo} não respondeu 3 vezes — decidir o que fazer`, prazo: hoje, chave: 'desiste:' + t.id };
    const cobranca = t.fechaQuando === 'pago';
    return { etapa: cobranca ? 'cobrar' : t.fechaQuando === 'orc-decidido' ? 'orcamento' : t.fechaQuando === 'guia-respondeu' ? 'guia' : 'mensagem',
             texto: cobranca ? `Lembrar ${alvo} do pagamento (${n}ª vez)` : `Mandar um lembrete para ${alvo} (${n}ª vez)`,
             prazo: hoje, tentativa: n, liga: t.liga, chave: 'lembra:' + t.id };
  }
  if (resultado === 'perdido' || resultado === 'ocupada') {
    if (resultado === 'ocupada' && t.liga && t.liga.bookingId && !(Bookings.get(t.liga.bookingId) || {}).prestadorId)
      return { etapa: 'guia', texto: `${alvo} está ocupada: perguntar à próxima da lista`, prazo: hoje, liga: t.liga, pessoaId: '', chave: 'proxima:' + t.liga.bookingId };
    return null;
  }
  if (t.orcId) { const o = Orc.get(t.orcId); if (o && o.status !== 'fechado' && o.status !== 'perdido') return { etapa: 'fechar', texto: `Fechar o orçamento de ${alvo}: registrar o sinal e criar as reservas`, prazo: hoje, chave: 'fechar:' + t.orcId }; }
  if (t.pessoaId && t.liga && t.liga.bookingId) {
    const b = Bookings.get(t.liga.bookingId);
    if (b && !b.prestadorId && resultado !== 'ocupada') return { etapa: 'escalar', texto: `Escalar ${alvo} e mandar o serviço de ${b.name}`, prazo: hoje, bookingId: b.id, chave: 'escalar:' + b.id };
  }
  return null;
}
/* as esperas que as outras telas criam sozinhas */
const Espera = {
  orcamento(o) {
    return Tarefas.garante({ etapa: 'aguardar', texto: `Aguardar a resposta de ${(o.cliente.nome || 'o cliente').split(' ')[0]} sobre o orçamento ${o.num}`,
      prazo: addDays(isoToday(), 2), fechaQuando: 'orc-decidido', orcId: o.id, clienteNome: o.cliente.nome, whats: o.cliente.whats,
      clienteKey: o.clienteKey || '', chave: 'orc:' + o.id, origem: 'app' });
  },
  guia(p, data, turno, b) {
    return Tarefas.garante({ etapa: 'aguardar', texto: `Aguardar a resposta de ${p.nome.split(' ')[0]} (${data.slice(8, 10)}/${data.slice(5, 7)} ${turno === 'manha' ? 'manhã' : turno === 'dia' ? 'dia inteiro' : turno})`,
      prazo: isoToday(), fechaQuando: 'guia-respondeu', pessoaId: p.id, liga: { data, turno, bookingId: b ? b.id : '' },
      clienteNome: b ? b.name : '', chave: 'guia:' + p.id + ':' + data + ':' + turno, origem: 'app' });
  },
  pagamento(dev) {
    return Tarefas.garante({ etapa: 'aguardar', texto: `Aguardar o pagamento de ${dev.nome.split(' ')[0]} (${dev.total} €)`,
      prazo: addDays(isoToday(), 2), fechaQuando: 'pago', clienteKey: dev.chave, clienteNome: dev.nome, whats: dev.whats,
      chave: 'pago:' + dev.chave, origem: 'app' });
  },
};

/* o que o app sabe que precisa ser feito — calculado, nunca digitado */
const Lembretes = {
  visto(chave) { return !!((DB.lembretesVistos || {})[chave]); },
  marca(chave) { DB.lembretesVistos = DB.lembretesVistos || {}; DB.lembretesVistos[chave] = isoToday(); _opSave(); },
  /* CLIENTES QUE DEVEM: o que falta pagar a ELA (o resto no dia com a guia
     nao entra — esse a guia recebe). Um por cliente, com o total. */
  devedores(hoje) {
    hoje = hoje || isoToday();
    const map = new Map();
    for (const b of DB.bookings) {
      if (b.status === 'cancelled') continue;
      const falta = Bookings.due(b); if (falta <= 0 || Op.restoPara(b) !== 'ingrid') continue;
      const k = chaveCliente(b);
      const r = map.get(k) || { chave: k, nome: b.name, whats: b.whats, total: 0, prazo: '', servicos: [] };
      r.total += falta; r.servicos.push(b);
      const pz = Bookings.dueDate(b); if (!r.prazo || pz < r.prazo) r.prazo = pz;
      map.set(k, r);
    }
    return [...map.values()].map(r => ({ ...r, atrasado: r.prazo < hoje })).sort((a, b) => a.prazo.localeCompare(b.prazo));
  },
  lista(hoje) {
    hoje = hoje || isoToday();
    const out = [];
    const add = (l) => { if (!Lembretes.visto(l.chave)) out.push(l); };
    for (const o of DB.orcamentos || []) {
      if (o.status === 'novo' || o.status === 'rascunho')
        add({ chave: 'orc-montar:' + o.id, grupo: 'orcamentos', nivel: 'warn', data: String(o.criado).slice(0, 10), txt: `Montar e mandar o orçamento de ${o.cliente.nome || 'um cliente'}`, sub: o.resumo || o.num, href: '#/adm/consulta/' + o.id });
      if (o.status === 'enviado' && o.validade && o.validade <= addDays(hoje, 1))
        add({ chave: 'orc-validade:' + o.id + ':' + o.validade, grupo: 'orcamentos', nivel: o.validade < hoje ? 'bad' : 'warn', data: o.validade, txt: `Orçamento ${o.num} de ${o.cliente.nome} ${o.validade < hoje ? 'venceu' : 'vence'} em ${o.validade.slice(8, 10)}/${o.validade.slice(5, 7)} — perguntar se fecha`, href: '#/adm/consulta/' + o.id, whats: o.cliente.whats });
    }
    for (const p of DB.pedidos || []) {
      if (!p.respondido && !(DB.orcamentos || []).some(o => o.pedidoId === p.id))
        add({ chave: 'roteiro:' + p.id, grupo: 'orcamentos', nivel: 'warn', data: String(p.criado).slice(0, 10), txt: `Responder o pedido de roteiro de ${p.nome}`, href: '#/adm/consulta', whats: p.whats });
    }
    for (const b of DB.bookings) {
      if (b.status === 'cancelled') continue;
      if (b.date >= hoje && b.date <= addDays(hoje, 3) && !b.prestadorId)
        add({ chave: 'escalar:' + b.id, grupo: 'servicos', nivel: b.date <= addDays(hoje, 1) ? 'bad' : 'warn', data: b.date, bookingId: b.id,
              txt: `Escalar ${(Tours.get(b.tourId) || {}).priceMode === 'transfer' ? 'motorista' : 'guia'} para ${b.name} (${b.date.slice(8, 10)}/${b.date.slice(5, 7)} ${b.time})`, href: '#/adm/guias/servico:' + b.id });
      if (b.date >= hoje && b.date <= addDays(hoje, 2) && !b.voucherEm)
        add({ chave: 'voucher:' + b.id, grupo: 'servicos', nivel: 'n', data: b.date, bookingId: b.id,
              txt: `Mandar o voucher para ${b.name} (${b.date.slice(8, 10)}/${b.date.slice(5, 7)})`, href: '#/adm/voucher/' + b.id });
      if (+b.custo > 0 && !b.acertado && b.date < hoje && b.prestadorId) {
        const a = acertos(b.date, b.date).find(x => x.b.id === b.id);
        if (a && a.saldo) add({ chave: 'acerto:' + b.id, grupo: 'servicos', nivel: 'n', data: b.date, bookingId: b.id,
          txt: a.saldo > 0 ? `Pagar ${a.saldo} € a ${(a.pessoa || {}).nome || 'quem fez'} (${b.name})` : `Receber ${-a.saldo} € de ${(a.pessoa || {}).nome || 'quem fez'} (${b.name})`, href: '#/adm/money' });
      }
    }
    return out.sort((a, b) => ({ bad: 0, warn: 1, n: 2 }[a.nivel] - { bad: 0, warn: 1, n: 2 }[b.nivel]) || String(a.data).localeCompare(String(b.data)));
  },
};
/* evento para a agenda do celular (Google Agenda, iPhone): com aviso 30 min antes */
function icsTarefa(t) {
  const esc = (v) => String(v || '').replace(/[\\,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
  const dia = (t.prazo || isoToday()).replace(/-/g, '');
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EmRoma//Tarefas//PT', 'BEGIN:VEVENT',
    'UID:' + t.id + '@emroma-tarefas', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'];
  if (t.hora) {
    const [h, m] = t.hora.split(':').map(Number);
    const fim = String(Math.min(23, h + 1)).padStart(2, '0') + String(m).padStart(2, '0');
    linhas.push('DTSTART:' + dia + 'T' + t.hora.replace(':', '') + '00', 'DTEND:' + dia + 'T' + fim + '00');
  } else {
    linhas.push('DTSTART;VALUE=DATE:' + dia, 'DTEND;VALUE=DATE:' + addDays(t.prazo || isoToday(), 1).replace(/-/g, ''));
  }
  linhas.push('SUMMARY:' + esc(t.texto), 'DESCRIPTION:' + esc([t.detalhe, t.clienteNome && 'Cliente: ' + t.clienteNome].filter(Boolean).join('\n')),
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(t.texto), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR');
  return linhas.join('\r\n');
}
function opSemeiaTarefas() {
  const hoje = isoToday();
  const jul = DB.bookings.find(b => b.name === 'Juliana Andrade');
  const cam = DB.bookings.find(b => b.name === 'Camila Teixeira');
  const ag = DB.bookings.find(b => /Viagens Sol/.test(b.name));
  const cria = (d) => Tarefas.cria(d);
  cria({ texto: 'Confirmar com o Luca o transfer da Juliana (voo AZ 673)', prazo: hoje, hora: '10:00', clienteKey: jul ? chaveCliente(jul) : '', clienteNome: 'Juliana Andrade', bookingId: jul ? jul.id : '', pessoaId: 'op-m1' });
  cria({ texto: 'Comprar os ingressos do Coliseu com arena para a Camila (4 pessoas)', prazo: hoje, clienteKey: cam ? chaveCliente(cam) : '', clienteNome: 'Camila Teixeira', bookingId: cam ? cam.id : '' });
  cria({ texto: 'Responder a Patrícia sobre o Natal em Roma', prazo: addDays(hoje, -1), clienteNome: 'Patrícia Menezes', clienteKey: 'patricia.menezes@email.com' });
  cria({ texto: 'Pagar a guia do bate e volta de Pompeia (agência Viagens Sol)', prazo: addDays(hoje, 4), hora: '18:00', clienteNome: ag ? ag.name : '', clienteKey: ag ? chaveCliente(ag) : '', bookingId: ag ? ag.id : '' });
  cria({ texto: 'Montar a tabela de preços de Florença com a Sofia', detalhe: 'Mesmo formato da de Roma: 1 a 20 pessoas.' });
  const feita = cria({ texto: 'Renovar o seguro do carro do Paolo', prazo: addDays(hoje, -2) }); if (feita) Tarefas.marca(feita.id, true);
  cria({ tipo: 'nota', texto: 'O Luca prefere receber a lista de transfers até as 18h do dia anterior.', fixa: true });
  cria({ tipo: 'nota', texto: 'Ideia: pacote "Roma em 3 dias" para famílias com criança — Coliseu, Vaticano curto e gelato tour.' });
  const o = (DB.orcamentos || []).find(x => x.origem === 'whats');
  if (o) cria({ tipo: 'nota', origem: 'whats', texto: `Resumo do WhatsApp — ${o.cliente.nome}`, detalhe: o.resumo, orcId: o.id, clienteNome: o.cliente.nome, whats: o.cliente.whats });
}

/* ---------- BACKUP ----------
   Um arquivo so, com TUDO o que ela tem (e o que o assistente aprendeu).
   Serve para guardar (pasta do computador, que pode ser a do Google Drive)
   e para VOLTAR: backup que nao restaura nao e backup. */
const BKP_VERSAO = 'emroma-backup-2';
const BKP_KEY = 'ingrid_bkp_v1';
function pacoteBackup() {
  let memoria = [];
  try { if (typeof Mkt !== 'undefined') memoria = Mkt.get().memoria || []; } catch (e) {}
  return {
    app: 'EmRoma', versao: BKP_VERSAO, salvoEm: new Date().toISOString(),
    passeios: DB.tours, regras: DB.rules, datas: DB.departures, bloqueios: DB.blocks, cupons: DB.coupons,
    configuracoes: DB.settings, reservas: DB.bookings, vagasVendidas: DB.seatCounts || [],
    pedidos: DB.pedidos || [], equipe: DB.equipe || [], disponibilidade: DB.disp || [],
    contas: DB.contas || [], orcamentos: DB.orcamentos || [], fichas: DB.fichas || {},
    tarefas: DB.tarefas || [], lembretesVistos: DB.lembretesVistos || {}, memoriaAssistente: memoria,
  };
}
function resumoBackup(p) {
  const n = (a) => Array.isArray(a) ? a.length : 0;
  return { salvoEm: p.salvoEm || '', reservas: n(p.reservas), passeios: n(p.passeios), guias: n(p.equipe),
           orcamentos: n(p.orcamentos), tarefas: n(p.tarefas), clientes: new Set((p.reservas || []).map(chaveCliente)).size };
}
/* aceita o arquivo antigo (vi-backup-1, so reservas e passeios) e o novo */
function lerBackup(txt) {
  let p; try { p = typeof txt === 'string' ? JSON.parse(txt.replace(/^﻿/, '')) : txt; } catch (e) { return { erro: 'o arquivo não é um backup do app (não abriu)' }; }
  if (!p || !/^(vi-backup|emroma-backup)/.test(String(p.versao || ''))) return { erro: 'este arquivo não é um backup do EmRoma' };
  if (!Array.isArray(p.reservas) || !Array.isArray(p.passeios)) return { erro: 'o backup está incompleto (faltam reservas ou passeios)' };
  return { p, resumo: resumoBackup(p) };
}
function restauraBackup(txt) {
  const r = lerBackup(txt); if (r.erro) return r;
  const p = r.p, novo = _blank();
  Object.assign(novo, {
    tours: p.passeios, rules: p.regras || [], departures: p.datas || [], blocks: p.bloqueios || [], coupons: p.cupons || [],
    bookings: p.reservas, seatCounts: p.vagasVendidas || [], pedidos: p.pedidos || [],
    equipe: p.equipe || [], disp: p.disponibilidade || [], contas: p.contas || [], orcamentos: p.orcamentos || [],
    fichas: p.fichas || {}, tarefas: p.tarefas || [], lembretesVistos: p.lembretesVistos || {},
  });
  novo.settings = fillSettings(p.configuracoes || {});
  /* voltou dado de verdade: nao e mais demonstracao, e as sementes nao voltam */
  novo.demo = false; novo.opSeed = OP_SEED; novo.tarefasSeed = 1; novo.seedVer = typeof SEED_VER !== 'undefined' ? SEED_VER : 1;
  DB = novo;
  try { if (typeof Mkt !== 'undefined' && Array.isArray(p.memoriaAssistente)) { const m = Mkt.get(); m.memoria = p.memoriaAssistente; Mkt.salva(); } } catch (e) {}
  opGarante();
  if (typeof save === 'function') save();
  return { ok: true, resumo: r.resumo };
}
const Backup = {
  ultimo() { try { return JSON.parse(localStorage.getItem(BKP_KEY)) || {}; } catch (e) { return {}; } },
  marca(onde, arquivo) {
    const u = { em: new Date().toISOString(), onde, arquivo: arquivo || '' };
    try { localStorage.setItem(BKP_KEY, JSON.stringify(u)); localStorage.setItem('vi_bkp_em', String(Date.now())); } catch (e) {}
    return u;
  },
  feitoHoje(hoje) { const u = Backup.ultimo(); return !!u.em && u.em.slice(0, 10) === (hoje || isoToday()); },
  nome(dia) { return `EmRoma-backup-${dia || isoToday()}.json`; },
};

/* ---------- PAINEL DE NUMEROS (a aba Relatorios) ----------
   Cada marcador compara com o periodo ANTERIOR de mesmo tamanho: "este mes
   ate hoje" contra "o mes passado ate o mesmo dia". Sem isto, o dia 3 do mes
   sempre pareceria uma queda contra o mes inteiro anterior.

   Dinheiro que a guia ou o motorista recebeu na mao NAO e receita dela: fica
   fora do "recebido" e aparece separado. */
function _dias(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }
function _fimDoMes(iso) { const d = new Date(iso.slice(0, 7) + '-15T12:00:00'); d.setMonth(d.getMonth() + 1); d.setDate(0); return d.toISOString().slice(0, 10); }
const Painel = {
  periodo(preset, hoje) {
    hoje = hoje || isoToday();
    if (preset === 'semana') return { de: addDays(hoje, -6), ate: hoje, antDe: addDays(hoje, -13), antAte: addDays(hoje, -7), nome: 'últimos 7 dias', ant: 'os 7 dias antes', antCurto: 'semana anterior' };
    if (preset === '90') return { de: addDays(hoje, -89), ate: hoje, antDe: addDays(hoje, -179), antAte: addDays(hoje, -90), nome: 'últimos 90 dias', ant: 'os 90 dias antes', antCurto: '90 dias antes' };
    if (preset === 'ano') {
      const y = +hoje.slice(0, 4);
      return { de: y + '-01-01', ate: hoje, antDe: (y - 1) + '-01-01', antAte: (y - 1) + hoje.slice(4), nome: 'este ano', ant: 'o mesmo período de ' + (y - 1), antCurto: String(y - 1) };
    }
    /* mes: do dia 1 ate hoje, contra o mes passado ate o mesmo dia */
    const de = hoje.slice(0, 8) + '01';
    const antDe = addDays(de, -1).slice(0, 8) + '01';
    const fimAnt = _fimDoMes(antDe);
    const mesmoDia = antDe.slice(0, 8) + hoje.slice(8, 10);
    return { de, ate: hoje, antDe, antAte: mesmoDia > fimAnt ? fimAnt : mesmoDia, nome: 'este mês', ant: 'o mês passado até o mesmo dia', antCurto: 'mês passado' };
  },
  delta(cur, ant) { return ant ? (cur - ant) / ant : (cur ? null : 0); },
  _ativos() { return DB.bookings.filter(b => b.status !== 'cancelled'); },
  recebido(de, ate) {
    let voce = 0, prest = 0, n = 0;
    for (const b of DB.bookings) for (const p of b.payments || []) {
      if (!p.date || p.date < de || p.date > ate) continue;
      if (ladoDoPagamento(p) === 'prestador') prest += p.amount; else { voce += p.amount; n++; }
    }
    return { voce, prest, n };
  },
  /* o que ela VENDEU no periodo: reservas feitas nele, seja qual for a data do servico */
  vendido(de, ate) {
    const bs = Painel._ativos().filter(b => { const c = String(b.createdAt || '').slice(0, 10); return c >= de && c <= ate; });
    return { valor: bs.reduce((s, b) => s + (+b.total || 0), 0), n: bs.length, pax: bs.reduce((s, b) => s + (+b.pax || 0), 0) };
  },
  /* servicos que acontecem no periodo */
  servicos(de, ate) {
    const bs = Painel._ativos().filter(b => b.date >= de && b.date <= ate);
    return { n: bs.length, pax: bs.reduce((s, b) => s + (+b.pax || 0), 0), lista: bs };
  },
  /* a margem so existe onde ela preencheu o custo (Detalhes do servico) */
  margem(de, ate) {
    const bs = Painel.servicos(de, ate).lista;
    const com = bs.filter(b => +b.custo > 0);
    const receita = com.reduce((s, b) => s + (+b.total || 0), 0), custo = com.reduce((s, b) => s + (+b.custo || 0), 0);
    return { receita, custo, margem: receita - custo, pct: receita ? (receita - custo) / receita : null, n: com.length, semCusto: bs.length - com.length };
  },
  aReceber(hoje) {
    hoje = hoje || isoToday();
    let comVoce = 0, noDia = 0, atrasado = 0;
    for (const b of Painel._ativos()) {
      const falta = Bookings.due(b); if (falta <= 0) continue;
      if (Op.restoPara(b) === 'prestador') { if (b.date >= hoje) noDia += falta; continue; }
      comVoce += falta;
      if (Bookings.dueDate(b) < hoje) atrasado += falta;
    }
    return { comVoce, noDia, atrasado };
  },
  orcamentos(de, ate) {
    const os = (DB.orcamentos || []).filter(o => { const c = String(o.criado || '').slice(0, 10); return c >= de && c <= ate; });
    const conta = (st) => os.filter(o => o.status === st).length;
    const fechados = conta('fechado'), perdidos = conta('perdido'), enviados = conta('enviado');
    const decididos = fechados + perdidos;
    return { n: os.length, novos: conta('novo') + conta('rascunho'), enviados, fechados, perdidos,
             valorFechado: os.filter(o => o.status === 'fechado').reduce((s, o) => s + Orc.total(o), 0),
             taxa: decididos ? fechados / decididos : null };
  },
  /* quem veio: novo ou de volta, e quem veio JUNTO (as indicacoes dela) */
  clientes(de, ate) {
    const bs = Painel.servicos(de, ate).lista;
    const chaves = new Set(bs.map(chaveCliente));
    let voltaram = 0;
    for (const k of chaves) {
      const antes = Painel._ativos().some(b => chaveCliente(b) === k && b.date < de);
      if (antes) voltaram++;
    }
    const junto = bs.reduce((s, b) => s + (b.group || []).filter(g => g && g.nome).length, 0);
    return { n: chaves.size, voltaram, novos: chaves.size - voltaram, junto };
  },
  /* series para os mini-graficos e o grafico de entrada de dinheiro */
  semanas(n, ate, fn) {
    ate = ate || isoToday();
    const out = [];
    let fim = ate;
    for (let i = 0; i < n; i++) {
      const ini = addDays(fim, -6);
      out.unshift({ de: ini, ate: fim, rot: ini.slice(8, 10) + '/' + ini.slice(5, 7), v: fn(ini, fim) });
      fim = addDays(ini, -1);
    }
    return out;
  },
  meses(ano, fn) {
    const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return MES.map((m, i) => { const de = `${ano}-${String(i + 1).padStart(2, '0')}-01`; return { de, ate: _fimDoMes(de), rot: m, v: fn(de, _fimDoMes(de)) }; });
  },
  /* O QUE JA ESTA VENDIDO para as proximas semanas: quanto ja entrou e quanto falta */
  futuro(semanas, hoje) {
    hoje = hoje || isoToday();
    const out = [];
    for (let i = 0; i < (semanas || 8); i++) {
      const de = addDays(hoje, i * 7), ate = addDays(de, 6);
      const bs = Painel._ativos().filter(b => b.date >= de && b.date <= ate);
      const total = bs.reduce((s, b) => s + (+b.total || 0), 0);
      const pago = bs.reduce((s, b) => s + Bookings.paid(b), 0);
      out.push({ de, ate, rot: de.slice(8, 10) + '/' + de.slice(5, 7), total, pago, falta: Math.max(0, total - pago), n: bs.length, pax: bs.reduce((s, b) => s + (+b.pax || 0), 0) });
    }
    return out;
  },
  /* dia da semana x turno: onde a semana dela aperta (e onde faltam guias) */
  calor(de, ate) {
    const m = Array.from({ length: 7 }, () => ({ manha: 0, tarde: 0, noite: 0 }));
    for (const b of Painel.servicos(de, ate).lista) {
      const wd = (new Date(b.date + 'T12:00:00').getDay() + 6) % 7; /* segunda = 0 */
      for (const tu of turnosDoServico(b)) m[wd][tu] += 1;
    }
    return m;
  },
  porServico(de, ate) {
    const map = new Map();
    for (const b of Painel.servicos(de, ate).lista) {
      const r = map.get(b.tourId) || { tourId: b.tourId, valor: 0, n: 0, pax: 0 };
      r.valor += +b.total || 0; r.n++; r.pax += +b.pax || 0;
      map.set(b.tourId, r);
    }
    return [...map.values()].sort((a, b) => b.valor - a.valor || b.n - a.n);
  },
  origens(de, ate) {
    const bs = Painel.servicos(de, ate).lista;
    const map = {};
    for (const b of bs) { const o = b.origin || 'site'; map[o] = (map[o] || 0) + 1; }
    return Object.entries(map).map(([origem, n]) => ({ origem, n, pct: bs.length ? n / bs.length : 0 })).sort((a, b) => b.n - a.n);
  },
  equipe(de, ate) {
    const map = new Map();
    let sem = 0;
    for (const b of Painel.servicos(de, ate).lista) {
      if (!b.prestadorId) { sem++; continue; }
      const r = map.get(b.prestadorId) || { pessoa: Equipe.get(b.prestadorId), n: 0, pax: 0, noDia: 0 };
      r.n++; r.pax += +b.pax || 0;
      r.noDia += (b.payments || []).filter(p => p.conta === CONTA_PRESTADOR).reduce((s, p) => s + p.amount, 0)
               + (Op.restoPara(b) === 'prestador' ? Bookings.due(b) : 0);
      map.set(b.prestadorId, r);
    }
    return { lista: [...map.values()].filter(r => r.pessoa).sort((a, b) => b.n - a.n), sem };
  },
  /* com quanta antecedencia reservam: quando comecar a divulgar cada temporada */
  antecedencia(de, ate) {
    const faixas = [['até 7 dias', 0, 7, 'até 7'], ['8 a 30 dias', 8, 30, '8–30'], ['31 a 90 dias', 31, 90, '31–90'], ['mais de 90 dias', 91, 1e9, '+90']];
    const dias = Painel.servicos(de, ate).lista.filter(b => b.createdAt).map(b => Math.max(0, _dias(String(b.createdAt).slice(0, 10), b.date)));
    const ord = [...dias].sort((a, b) => a - b);
    const mediana = ord.length ? (ord.length % 2 ? ord[(ord.length - 1) / 2] : Math.round((ord[ord.length / 2 - 1] + ord[ord.length / 2]) / 2)) : null;
    return { faixas: faixas.map(([rot, a, z, curto]) => ({ rot, curto, n: dias.filter(d => d >= a && d <= z).length })), mediana, n: dias.length };
  },
};

/* ---------- textos das abas novas ---------- */
if (typeof STR !== 'undefined') {
  Object.assign(STR, {
    admGuias:    { pt: 'Guias', en: 'Guides' },
    admConsulta: { pt: 'Sob consulta', en: 'Quotes' },
    admTarefas:  { pt: 'Tarefas', en: 'Tasks' },
    admMoney:    { pt: 'Contabilidade', en: 'Accounting' },
  });
}

opGarante();
