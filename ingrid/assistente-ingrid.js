/* =====================================================
   ASSISTENTE DA INGRID

   O motor e o do app-guia (assistente.js, arquivo fechado, igual ao da
   raiz e da Yalla): gaveta, loop com o Claude, cartao "confirma?", gasto,
   modo demonstracao e modo ao vivo pelo cofre. Aqui fica so o que e DELA:

   1. So o assistente. Marketing fica para dezembro (ela pediu) e o
      Atendimento que RESPONDE cliente nao entra: a regra dela e que a IA
      nunca responde sozinha.
   2. Uma ferramenta para cada aba nova (regra do Eugenio: o assistente mexe
      em todo o app): Hoje, Guias, Sob consulta, Tarefas e anotacoes,
      Contabilidade, Ficha do cliente, Termos e plantao, tabela de precos.
   3. O prompt com o jeito dela de trabalhar e o mapa "aba -> ferramenta".

   Carrega depois do assistente.js e so reescreve pelas beiradas: se este
   arquivo sair do index.html, o motor volta a ser o do molde.
   ===================================================== */
'use strict';

/* o motor usa isto do molde novo, que este app nao tem */
function locale() { return LANG === 'en' ? 'en-GB' : 'pt-BR'; }
const LANGS = [['pt', 'PT', 'Português'], ['en', 'EN', 'English']];

/* ---------- 1. so o assistente ---------- */
for (const id of ['marketing', 'inbox']) {
  const k = ADM_TABS.findIndex(([x]) => x === id);
  if (k >= 0) ADM_TABS.splice(k, 1);
}
const ING_FORA = new Set(['ver_marketing', 'salvar_posts', 'mudar_post', 'apagar_post', 'salvar_anuncio', 'apagar_anuncio',
  'criar_criativo', 'mudar_criativo', 'apagar_criativo', 'gerar_imagem', 'ver_ensino', 'ensinar_agente',
  /* estas duas voltam abaixo no modelo dela (relatorio pelo Painel, pagamento com a conta) */
  'ver_relatorio', 'registrar_pagamento']);
for (let k = IA_FERRAMENTAS.length - 1; k >= 0; k--) if (ING_FORA.has(IA_FERRAMENTAS[k].name)) IA_FERRAMENTAS.splice(k, 1);

/* ---------- achar as coisas pelo nome — e perguntar quando der dois ---------- */
const ingN = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const ingData = (iso) => iso ? dataCurta(iso) : 'sem data';
function ingAchaGuia(q) {
  if (!q) return { erro: 'diga qual guia ou motorista' };
  const g = Equipe.get(q); if (g) return { g };
  const n = ingN(q);
  const l = Equipe.all().filter(p => ingN(p.nome).includes(n) || ingN(p.nome).split(' ')[0] === n.split(' ')[0]);
  if (l.length === 1) return { g: l[0] };
  if (!l.length) return { erro: `não achei "${q}" entre as guias e motoristas — use ver_guias` };
  return { erro: 'mais de uma pessoa com esse nome — pergunte qual', opcoes: l.map(p => ({ guia_id: p.id, nome: p.nome, tipo: p.tipo })) };
}
function ingAchaCliente(q) {
  if (!q) return { erro: 'diga qual cliente' };
  const n = ingN(q), dig = String(q).replace(/\D/g, '');
  const todos = Clients.all();
  const exato = todos.filter(c => ingN(c.name) === n);
  const l = exato.length ? exato : todos.filter(c => (n && ingN(c.name).includes(n)) || (c.email && ingN(c.email) === n)
    || (dig.length >= 6 && String(c.whats || '').replace(/\D/g, '').endsWith(dig.slice(-8))));
  if (l.length === 1) return { c: l[0] };
  if (!l.length) return { erro: `não achei o cliente "${q}"` };
  return { erro: 'mais de um cliente com esse nome — pergunte qual', opcoes: l.slice(0, 6).map(c => ({ nome: c.name, contato: c.email || c.whats || '', veio_com: c.veioCom || '' })) };
}
function ingAchaReserva(codigo) {
  const b = Bookings.byCode(String(codigo || '').toUpperCase().trim());
  return b ? { b } : { erro: 'reserva não encontrada — use ver_hoje, buscar ou ver_reservas para achar o código' };
}
function ingAchaOrc(q) {
  const s = String(q || '').trim();
  const num = s.replace(/\D/g, '');
  const o = Orc.all().find(x => x.id === s || (num && +x.num.replace(/\D/g, '') === +num));
  if (o) return { o };
  const l = Orc.all().filter(x => ingN(x.cliente.nome).includes(ingN(s)) && x.status !== 'perdido');
  if (l.length === 1) return { o: l[0] };
  if (!l.length) return { erro: 'orçamento não encontrado — use ver_orcamentos' };
  return { erro: 'mais de um orçamento — pergunte qual', opcoes: l.map(x => ({ numero: x.num, cliente: x.cliente.nome, situacao: x.status })) };
}
function ingAchaTarefa(q) {
  const t0 = Tarefas.get(q); if (t0) return { t: t0 };
  const n = ingN(q);
  const l = Tarefas.all().filter(t => !t.feita && t.tipo === 'tarefa' && ingN(t.texto).includes(n));
  if (l.length === 1) return { t: l[0] };
  if (!l.length) return { erro: 'tarefa não encontrada — use ver_tarefas' };
  return { erro: 'mais de uma tarefa parecida — pergunte qual', opcoes: l.map(t => ({ tarefa_id: t.id, texto: t.texto, dia: t.prazo })) };
}
function ingServ(b) {
  const x = Tours.get(b.tourId), nd = Op.noDia(b), p = b.prestadorId && Equipe.get(b.prestadorId);
  return { codigo: b.code, dia: b.date, hora: b.time, servico: x ? x.name.pt : '?', cliente: b.name, whats: b.whats || '',
    pessoas: b.pax, grupo: (b.group || []).map(g => g.nome), voo: b.voo || '', buscar_em: b.origem || '', levar_para: b.destino || '',
    quem_faz: p ? p.nome : 'ninguém escalado', total: b.total, pago: Bookings.paid(b),
    paga_no_dia: nd.valor ? `${nd.valor} € ${nd.para === 'prestador' ? 'para quem faz o serviço' : 'para a Ingrid'}` : 'nada',
    obs: b.obsOp || '', situacao: b.status === 'cancelled' ? 'cancelada' : 'confirmada' };
}
const ING_ABAS = ['today', 'consulta', 'tarefas', 'guias', 'agenda', 'bookings', 'clients', 'money', 'tours', 'reports', 'coupons', 'look', 'settings'];
const ING_TURNOS = ['manha', 'tarde', 'noite', 'dia'];

/* ---------- 2. as ferramentas das abas dela ---------- */
const contasIds = () => [...Contas.all().map(c => c.id), CONTA_PRESTADOR];
const ING_FERRAMENTAS = [
  /* ler */
  { name: 'ver_hoje', description: 'Os serviços de um dia (padrão: hoje) como na aba Hoje: cliente, voo, de onde para onde, quem faz, quanto o cliente paga no dia e para quem, observação.', input_schema: obj({ data: S_('AAAA-MM-DD') }) },
  { name: 'buscar', description: 'Emergência: acha serviço por pedaço do nome do cliente, do grupo, voo, código ou telefone.', input_schema: obj({ texto: S_() }, ['texto']) },
  { name: 'ver_guias', description: 'Guias e motoristas na ordem de preferência dela: id, nome, tipo, cidades, idiomas, WhatsApp, observação.', input_schema: obj({ tipo: { type: 'string', enum: ['guia', 'motorista'] }, cidade: S_() }) },
  { name: 'quem_esta_livre', description: 'Quem está livre num dia e turno, por preferência: livres (confirmaram), sem resposta, ocupadas (com o quê).', input_schema: obj({ data: S_('AAAA-MM-DD'), turno: { type: 'string', enum: ING_TURNOS }, cidade: S_(), tipo: { type: 'string', enum: ['guia', 'motorista'] } }, ['data', 'turno']) },
  { name: 'ver_orcamentos', description: 'Orçamentos sob consulta: número, cliente, situação, itens, total, sinal.', input_schema: obj({ situacao: { type: 'string', enum: ['abertos', 'novo', 'rascunho', 'enviado', 'fechado', 'perdido', 'todos'] } }) },
  { name: 'ver_tarefas', description: 'Tarefas abertas (atrasadas, hoje, semana, depois, sem data), os lembretes do app e os clientes que devem.', input_schema: obj() },
  { name: 'ver_anotacoes', description: 'Anotações (inclui os resumos do WhatsApp). Com busca opcional.', input_schema: obj({ busca: S_() }) },
  { name: 'ver_contabilidade', description: 'Recebimentos do período por conta, separados em Brasil e Europa, o que as guias receberam direto, e o acerto com cada guia/motorista.', input_schema: obj({ de: S_(), ate: S_() }) },
  { name: 'ver_ficha', description: 'Ficha completa de um cliente: contato, serviços, pagamentos, quem veio junto, anotações, tarefas e orçamentos.', input_schema: obj({ cliente: S_('nome, e-mail ou WhatsApp') }, ['cliente']) },
  { name: 'ver_relatorio', description: 'Os números do período (semana, mês, 90 dias, ano): o que entrou, vendido, serviços, ticket, margem, a receber, orçamentos, o que já está vendido para as próximas semanas, serviço que mais rende, turno mais cheio, antecedência.', input_schema: obj({ periodo: { type: 'string', enum: ['semana', 'mes', '90', 'ano'] } }) },
  { name: 'ver_contas', description: 'As contas onde ela recebe (id, nome, Brasil ou Europa).', input_schema: obj() },
  { name: 'abrir_aba', description: 'Leva ela até uma tela do app (e, se quiser, a um item).', input_schema: obj({ aba: { type: 'string', enum: ING_ABAS }, item: S_('id do orçamento, código da reserva ou chave do cliente (opcional)') }, ['aba']) },
  /* gravar */
  { name: 'anotar_tarefa', description: 'Cria tarefa (com dia e hora se houver; entende "amanhã 9h" no texto). Mandar mensagem/cobrar/orçamento já vêm com o passo seguinte ("aguardar resposta").', input_schema: obj({ texto: S_(), dia: S_('AAAA-MM-DD'), hora: S_('HH:MM'), cliente: S_(), detalhe: S_() }, ['texto']) },
  { name: 'concluir_tarefa', description: 'Marca tarefa como feita. Em tarefa de espera diga o resultado: respondeu ou nao_respondeu (vira lembrete). Devolve o próximo passo que o app criou.', input_schema: obj({ tarefa: S_('id ou pedaço do texto'), resultado: { type: 'string', enum: ['feito', 'respondeu', 'nao_respondeu'] } }, ['tarefa']) },
  { name: 'anotar', description: 'Guarda uma anotação (ideia, fornecedor, detalhe), ligada a um cliente se houver.', input_schema: obj({ texto: S_(), cliente: S_(), fixar: { type: 'boolean' } }, ['texto']) },
  { name: 'anotar_cliente', description: 'Acrescenta um fato à ficha do cliente (o que vale para sempre: vegana, VIP, alergia, indicação de quem).', input_schema: obj({ cliente: S_(), texto: S_(), etiqueta: S_() }, ['cliente', 'texto']) },
  { name: 'cadastrar_guia', description: 'Cadastra guia ou motorista no fim da lista de preferência.', input_schema: obj({ nome: S_(), tipo: { type: 'string', enum: ['guia', 'motorista'] }, whats: S_(), cidades: S_('separadas por vírgula'), idiomas: S_(), obs: S_() }, ['nome', 'tipo']) },
  { name: 'mudar_guia', description: 'Muda dados de uma guia/motorista ou a posição na preferência.', input_schema: obj({ guia: S_('id ou nome'), nome: S_(), whats: S_(), cidades: S_(), idiomas: S_(), obs: S_(), preferencia: { type: 'string', enum: ['subir', 'descer', 'primeira'] } }, ['guia']) },
  { name: 'remover_guia', description: 'Tira uma guia/motorista do cadastro.', input_schema: obj({ guia: S_() }, ['guia']) },
  { name: 'marcar_disponibilidade', description: 'Registra o que a guia respondeu: livre, ocupada ou limpar, num dia e turno (dia = o dia inteiro).', input_schema: obj({ guia: S_(), data: S_('AAAA-MM-DD'), turno: { type: 'string', enum: ING_TURNOS }, estado: { type: 'string', enum: ['livre', 'ocupada', 'limpar'] }, nota: S_('ex.: até 13h') }, ['guia', 'data', 'turno', 'estado']) },
  { name: 'escalar', description: 'Passa um serviço para uma guia/motorista (ou tira, com guia "ninguém").', input_schema: obj({ codigo: S_(), guia: S_() }, ['codigo', 'guia']) },
  { name: 'detalhes_servico', description: 'Voo/trem, onde buscar, para onde levar, observação, quanto ela paga a quem faz (custo) e quem recebe o resto (no_dia = a guia/motorista recebe do cliente; ingrid = ela recebe e acerta).', input_schema: obj({ codigo: S_(), voo: S_(), buscar_em: S_(), levar_para: S_(), obs: S_(), custo: N_(), resto: { type: 'string', enum: ['no_dia', 'ingrid'] } }, ['codigo']) },
  { name: 'registrar_pagamento', description: 'Registra dinheiro recebido numa reserva, na conta certa (define Brasil ou Europa na contabilidade). "prestador" = o cliente pagou na mão da guia/motorista. Sem valor = o que falta. Se ela não disse a conta, PERGUNTE.', input_schema: obj({ codigo: S_(), valor: N_(), conta: S_('id de ver_contas ou "prestador"') }, ['codigo', 'conta']) },
  { name: 'criar_orcamento', description: 'Cria orçamento sob consulta com vários serviços; preço da tabela dela quando for serviço do catálogo (passeio_id de ver_passeios).', input_schema: obj({ cliente: S_(), whats: S_(), email: S_(), itens: { type: 'array', items: obj({ passeio_id: S_(), descricao: S_(), data: S_('AAAA-MM-DD'), hora: S_(), pessoas: { type: 'integer' }, valor: N_() }) }, sinal_pct: N_(), obs: S_() }, ['cliente']) },
  { name: 'ler_conversa', description: 'Lê uma conversa colada do WhatsApp/Instagram/e-mail e monta o rascunho do orçamento + a anotação com o resumo. Nunca responde o cliente.', input_schema: obj({ texto: S_() }, ['texto']) },
  { name: 'mudar_orcamento', description: 'Muda situação, validade ou % de sinal de um orçamento.', input_schema: obj({ numero: S_(), situacao: { type: 'string', enum: ['rascunho', 'enviado', 'perdido'] }, validade: S_(), sinal_pct: N_() }, ['numero']) },
  { name: 'fechar_orcamento', description: 'O cliente fechou: cada serviço do catálogo vira reserva com o sinal; registra o sinal na conta se já caiu.', input_schema: obj({ numero: S_(), sinal_recebido: { type: 'boolean' }, conta: S_() }, ['numero', 'sinal_recebido']) },
  { name: 'ajustar_termos', description: 'Termos e condições do orçamento e o número de plantão do voucher.', input_schema: obj({ termos: S_(), plantao: S_() }) },
  { name: 'orcamento_do_roteiro', description: 'Monta o rascunho de orçamento a partir de um pedido do "Monte seu roteiro" (veja pedidos_de_roteiro em ver_orcamentos).', input_schema: obj({ pedido: S_('id ou nome de quem pediu') }, ['pedido']) },
  { name: 'cadastrar_conta', description: 'Acrescenta ou muda uma conta onde ela recebe (define se vai para o contador do Brasil ou da Europa).', input_schema: obj({ conta: S_('id de ver_contas para mudar; vazio = nova'), nome: S_(), lado: { type: 'string', enum: ['brasil', 'europa'] }, tipo: { type: 'string', enum: ['pix', 'transfer', 'card', 'cash', 'other'] } }, ['nome', 'lado']) },
  { name: 'lembrete_feito', description: 'Marca um lembrete do app (ver_tarefas → lembretes_do_app) como feito, para sumir da lista.', input_schema: obj({ lembrete: S_('pedaço do texto do lembrete') }, ['lembrete']) },
  { name: 'mudar_tabela', description: 'Muda a tabela de preço por número de pessoas de um passeio (preço do grupo).', input_schema: obj({ passeio_id: S_(), de_pessoas: { type: 'integer' }, ate_pessoas: { type: 'integer' }, valor: N_() }, ['passeio_id', 'de_pessoas', 'valor']) },
];
IA_FERRAMENTAS.push(...ING_FERRAMENTAS);

const ING_LER = {
  ver_hoje(i) {
    const d = isoOk(i.data) ? i.data : hojeIso();
    const l = Op.doDia(d).map(ingServ);
    const tf = Tarefas.doDia(d).filter(t => t.tipo === 'tarefa' && !t.feita).map(t => ({ tarefa_id: t.id, texto: t.texto, hora: t.hora }));
    return { dia: d, servicos: l.length ? l : 'nenhum serviço', tarefas: tf };
  },
  buscar(i) { const l = Op.busca(i.texto).slice(0, 10).map(ingServ); return l.length ? l : 'nada encontrado'; },
  ver_guias(i) {
    const l = Equipe.all(i.tipo).filter(p => Equipe.atende(p, i.cidade)).map((p, k) => ({ preferencia: k + 1, guia_id: p.id, nome: p.nome, tipo: p.tipo,
      cidades: p.cidades, idiomas: p.idiomas, whats: p.whats, obs: p.obs }));
    return l.length ? l : 'ninguém cadastrado';
  },
  quem_esta_livre(i) {
    if (!isoOk(i.data)) return E_('data AAAA-MM-DD');
    const r = Disp.quem({ data: i.data, turno: i.turno || 'manha', cidade: i.cidade || '', tipo: i.tipo || 'guia' });
    const um = (it) => ({ guia_id: it.p.id, nome: it.p.nome, whats: it.p.whats, nota: it.nota || '', com: it.servico ? `${it.servico.name} ${it.servico.time}` : undefined });
    return { dia: i.data, turno: i.turno, livres: r.livres.map(um), sem_resposta: r.semResposta.map(um), ocupadas: r.ocupadas.map(um) };
  },
  ver_orcamentos(i) {
    const st = i.situacao || 'abertos';
    const l = Orc.all().filter(o => st === 'todos' ? true : st === 'abertos' ? ['novo', 'rascunho', 'enviado'].includes(o.status) : o.status === st);
    const rot = (DB.pedidos || []).filter(p => !Orc.all().some(o => o.pedidoId === p.id)).map(p => ({ pedido_id: p.id, nome: p.nome, de: p.ini, ate: p.fim, pessoas: (+p.adultos || 0) + (+p.criancas || 0), onde: p.onde, modo: p.modo || '', respondido: p.respondido }));
    if (!l.length) return { orcamentos: 'nenhum', pedidos_de_roteiro: rot };
    return { pedidos_de_roteiro: rot, orcamentos: l.map(o => ({ numero: o.num, cliente: o.cliente.nome, whats: o.cliente.whats, situacao: o.status, resumo: o.resumo,
      itens: o.itens.map(it => ({ servico: it.desc, data: it.data, pessoas: it.pax, valor: it.valor })), total: Orc.total(o), sinal: Orc.sinal(o), validade: o.validade })) };
  },
  ver_tarefas() {
    const G = Tarefas.grupos(), um = (t) => ({ tarefa_id: t.id, texto: t.texto, dia: t.prazo, hora: t.hora, cliente: t.clienteNome, esperando: t.etapa === 'aguardar' });
    return { atrasadas: G.atrasadas.map(um), hoje: G.hoje.map(um), proximos_7_dias: G.semana.map(um), depois: G.depois.map(um), sem_data: G.semData.map(um),
      lembretes_do_app: Lembretes.lista().map(l => l.txt), clientes_que_devem: Lembretes.devedores().map(d => ({ cliente: d.nome, deve: d.total, ate: d.prazo, atrasado: d.atrasado })) };
  },
  ver_anotacoes(i) { const l = Tarefas.notas(i.busca).map(n => ({ texto: n.texto, detalhe: n.detalhe, cliente: n.clienteNome, dia: String(n.criada).slice(0, 10), fixa: n.fixa })); return l.length ? l : 'nenhuma anotação'; },
  ver_contabilidade(i) {
    const de = isoOk(i.de) ? i.de : hojeIso().slice(0, 8) + '01', ate = isoOk(i.ate) ? i.ate : hojeIso();
    const rs = extratoContas(de, ate), soma = (f) => rs.filter(f).reduce((s, r) => s + r.amount, 0);
    const porConta = {};
    for (const r of rs) { const k = r.conta ? Contas.nome(r.conta) : r.method + ' (sem conta)'; porConta[k] = (porConta[k] || 0) + r.amount; }
    return { periodo: { de, ate }, brasil: soma(r => r.lado === 'brasil'), europa: soma(r => r.lado === 'europa'), direto_com_guias: soma(r => r.lado === 'prestador'),
      por_conta: porConta, acertos: acertos(de, ate).map(a => ({ quem: a.pessoa ? a.pessoa.nome : '?', servico: a.b.name + ' ' + a.b.date, custo: a.custo, saldo: a.saldo, acertado: a.acertado })) };
  },
  ver_ficha(i) {
    const r = ingAchaCliente(i.cliente); if (!r.c) return r;
    const c = r.c, k = c.key, bs = Fichas.reservas(k), f = Fichas.get(k), o = Fichas.doCliente(k, c.whats, c.email);
    return { nome: c.name, email: c.email, whats: c.whats, veio_com: c.veioCom || undefined, etiquetas: f.tags, anotacoes: f.notas,
      servicos: bs.map(ingServ), tarefas: Tarefas.doCliente(k, c.whats).filter(t => !t.feita).map(t => ({ tarefa_id: t.id, texto: t.texto, dia: t.prazo })),
      orcamentos: o.orcamentos.map(x => ({ numero: x.num, situacao: x.status, total: Orc.total(x) })) };
  },
  ver_relatorio(i) {
    const P = Painel.periodo(i.periodo || 'mes');
    const rec = Painel.recebido(P.de, P.ate), recA = Painel.recebido(P.antDe, P.antAte), ven = Painel.vendido(P.de, P.ate), srv = Painel.servicos(P.de, P.ate);
    const fut = Painel.futuro(8), porS = Painel.porServico(P.de, P.ate), ant = Painel.antecedencia(P.de, P.ate);
    return { periodo: P.nome, de: P.de, ate: P.ate, comparado_com: P.ant, entrou_para_ela: rec.voce, antes: recA.voce, direto_com_guias: rec.prest,
      vendido: ven.valor, reservas_feitas: ven.n, servicos: srv.n, pessoas: srv.pax, margem: Painel.margem(P.de, P.ate), a_receber: Painel.aReceber(),
      orcamentos: Painel.orcamentos(P.de, P.ate), clientes: Painel.clientes(P.de, P.ate),
      vendido_proximas_8_semanas: { total: fut.reduce((s, f) => s + f.total, 0), ja_pago: fut.reduce((s, f) => s + f.pago, 0) },
      servico_que_mais_rende: porS[0] ? { servico: (Tours.get(porS[0].tourId) || { name: { pt: '?' } }).name.pt, valor: porS[0].valor } : null,
      antecedencia_mediana_dias: ant.mediana, origens: Painel.origens(P.de, P.ate) };
  },
  ver_contas() { return Contas.all().map(c => ({ conta: c.id, nome: c.nome, lado: c.pais })).concat([{ conta: CONTA_PRESTADOR, nome: 'pago na mão da guia/motorista', lado: 'fora do caixa dela' }]); },
  abrir_aba(i) {
    if (!ING_ABAS.includes(i.aba)) return E_('aba desconhecida');
    const arg = i.item ? '/' + (i.aba === 'clients' ? encodeURIComponent(i.item) : i.item) : '';
    go('/adm/' + i.aba + arg);
    return { ok: true, aberta: i.aba };
  },
};

const ING_PLANO = {
  anotar_tarefa(i) {
    const txt = String(i.texto || '').trim(); if (!txt) return E_('faltou o texto');
    const p = lerPrazo(txt);
    const dia = isoOk(i.dia) ? i.dia : p.data;
    const hora = /^\d{1,2}:\d{2}$/.test(i.hora || '') ? i.hora.padStart(5, '0') : p.hora;
    let cli = { clienteKey: '', clienteNome: i.cliente || '', whats: '' };
    if (i.cliente) { const r = ingAchaCliente(i.cliente); if (r.c) cli = { clienteKey: r.c.key, clienteNome: r.c.name, whats: r.c.whats }; else if (r.opcoes) return r; }
    const et = ETAPAS[etapaDoTexto(txt)];
    return { titulo: 'Anotar tarefa', assumiu: [], linhas: [['Tarefa', txt], ['Quando', dia ? ingData(dia) + (hora ? ' ' + hora : '') : 'sem data'],
      ...(cli.clienteNome ? [['Cliente', cli.clienteNome]] : []), ...(et && et.depois ? [['Depois de feita', et.depois]] : []), ...(i.detalhe ? [['Detalhe', i.detalhe]] : [])],
      fazer: () => { const t = Tarefas.cria({ texto: txt, prazo: dia, hora, detalhe: i.detalhe || '', ...cli, origem: 'assistente' }); return { ok: true, tarefa_id: t.id }; } };
  },
  concluir_tarefa(i) {
    const r = ingAchaTarefa(i.tarefa); if (!r.t) return r;
    const res = i.resultado === 'nao_respondeu' ? 'cutucar' : i.resultado === 'respondeu' ? 'respondeu' : (r.t.etapa === 'aguardar' ? 'respondeu' : '');
    return { titulo: 'Concluir tarefa', assumiu: [], linhas: [['Tarefa', r.t.texto], ...(res ? [['Resultado', res === 'cutucar' ? 'não respondeu' : 'respondeu']] : [])],
      fazer: () => { const nova = Tarefas.conclui(r.t.id, res); return { ok: true, proximo_passo: nova ? { tarefa_id: nova.id, texto: nova.texto, dia: nova.prazo } : null }; } };
  },
  anotar(i) {
    const txt = String(i.texto || '').trim(); if (!txt) return E_('faltou o texto');
    let cli = { clienteKey: '', clienteNome: i.cliente || '', whats: '' };
    if (i.cliente) { const r = ingAchaCliente(i.cliente); if (r.c) cli = { clienteKey: r.c.key, clienteNome: r.c.name, whats: r.c.whats }; }
    const [tit, ...resto] = txt.split('\n');
    return { titulo: 'Anotar', assumiu: [], linhas: [['Anotação', txt.slice(0, 160)], ...(cli.clienteNome ? [['Cliente', cli.clienteNome]] : [])],
      fazer: () => { const n = Tarefas.cria({ tipo: 'nota', texto: tit, detalhe: resto.join('\n'), fixa: !!i.fixar, ...cli, origem: 'assistente' }); return { ok: true, anotacao_id: n.id }; } };
  },
  anotar_cliente(i) {
    const r = ingAchaCliente(i.cliente); if (!r.c) return r;
    const f = Fichas.get(r.c.key), dia = hojeIso();
    const linha = `[${dia.slice(8, 10)}/${dia.slice(5, 7)}] ${String(i.texto || '').trim()}`;
    const tags = i.etiqueta ? [f.tags, i.etiqueta].filter(Boolean).join(', ') : f.tags;
    return { titulo: 'Anotar na ficha', assumiu: [], linhas: [['Cliente', r.c.name], ['Anotação', linha], ...(i.etiqueta ? [['Etiqueta', i.etiqueta]] : [])],
      fazer: () => { Fichas.salva(r.c.key, { notas: [f.notas, linha].filter(Boolean).join('\n'), tags }); return { ok: true }; } };
  },
  cadastrar_guia(i) {
    if (!String(i.nome || '').trim()) return E_('faltou o nome');
    if (Equipe.all().some(p => ingN(p.nome) === ingN(i.nome))) return E_('já existe alguém com esse nome — use mudar_guia');
    return { titulo: 'Cadastrar ' + (i.tipo === 'motorista' ? 'motorista' : 'guia'), assumiu: i.cidades ? [] : ['cidade: Roma'],
      linhas: [['Nome', i.nome], ['Cidades', i.cidades || 'Roma'], ...(i.whats ? [['WhatsApp', i.whats]] : []), ...(i.idiomas ? [['Idiomas', i.idiomas]] : []), ['Preferência', 'última da lista']],
      fazer: () => { const p = Equipe.salva({ nome: i.nome, tipo: i.tipo, whats: i.whats, cidades: i.cidades || 'Roma', idiomas: i.idiomas, obs: i.obs }); return { ok: true, guia_id: p.id }; } };
  },
  mudar_guia(i) {
    const r = ingAchaGuia(i.guia); if (!r.g) return r;
    const g = r.g, muda = {}, linhas = [['Quem', g.nome]];
    for (const k of ['nome', 'whats', 'cidades', 'idiomas', 'obs']) if (i[k] !== undefined && String(i[k]).trim()) { muda[k] = i[k]; linhas.push([k, String(i[k])]); }
    if (i.preferencia) linhas.push(['Preferência', i.preferencia === 'primeira' ? 'primeira da lista' : i.preferencia]);
    if (linhas.length === 1) return E_('nada para mudar');
    return { titulo: 'Mudar ' + g.tipo, assumiu: [], linhas,
      fazer: () => {
        if (Object.keys(muda).length) Equipe.salva({ ...g, ...muda });
        if (i.preferencia === 'subir') Equipe.move(g.id, -1);
        else if (i.preferencia === 'descer') Equipe.move(g.id, 1);
        else if (i.preferencia === 'primeira') for (let k = 0; k < 30; k++) Equipe.move(g.id, -1);
        return { ok: true };
      } };
  },
  remover_guia(i) {
    const r = ingAchaGuia(i.guia); if (!r.g) return r;
    const n = DB.bookings.filter(b => b.prestadorId === r.g.id && b.date >= hojeIso() && b.status !== 'cancelled').length;
    return { titulo: 'Remover do cadastro', assumiu: [], linhas: [['Quem', r.g.nome], ...(n ? [['⚠', `${n} serviço(s) futuros ficam sem ${r.g.tipo}`]] : [])],
      fazer: () => { Equipe.remove(r.g.id); return { ok: true }; } };
  },
  marcar_disponibilidade(i) {
    const r = ingAchaGuia(i.guia); if (!r.g) return r;
    if (!isoOk(i.data)) return E_('data AAAA-MM-DD');
    const est = i.estado === 'limpar' ? '' : i.estado;
    return { titulo: 'Disponibilidade', assumiu: [], linhas: [['Quem', r.g.nome], ['Quando', `${ingData(i.data)} · ${turnoNome(i.turno)}`], ['Está', i.estado === 'limpar' ? '(apagar a resposta)' : i.estado], ...(i.nota ? [['Nota', i.nota]] : [])],
      fazer: () => { Disp.marca(r.g.id, i.data, i.turno, est, i.nota || ''); const fechou = Tarefas.sincroniza(); return { ok: true, tarefas_que_fecharam_sozinhas: fechou.map(t => t.texto) }; } };
  },
  escalar(i) {
    const rb = ingAchaReserva(i.codigo); if (!rb.b) return rb;
    const b = rb.b;
    if (/^(ningu[eé]m|nenhum|tirar)$/i.test(String(i.guia || '').trim()))
      return { titulo: 'Tirar quem faz', assumiu: [], linhas: [['Serviço', `${b.name} · ${ingData(b.date)} ${b.time}`]], fazer: () => { Op.escala(b.id, ''); return { ok: true }; } };
    const r = ingAchaGuia(i.guia); if (!r.g) return r;
    const ocup = turnosDoServico(b).map(tu => Disp.estado(r.g.id, b.date, tu)).find(e => e.estado === 'ocupada' && (!e.servico || e.servico.id !== b.id));
    return { titulo: 'Escalar', assumiu: ocup ? [`atenção: ${r.g.nome} está marcada como ocupada nesse turno${ocup.servico ? ' (' + ocup.servico.name + ')' : ''}`] : [],
      linhas: [['Serviço', `${(Tours.get(b.tourId) || { name: { pt: '?' } }).name.pt} · ${b.name}`], ['Quando', `${ingData(b.date)} ${b.time}`], ['Quem faz', r.g.nome]],
      fazer: () => { Op.escala(b.id, r.g.id); return { ok: true, lembrete: 'ofereça mandar o serviço para ela pelo WhatsApp (botão "mandar o serviço" no cartão, na aba Hoje)' }; } };
  },
  detalhes_servico(i) {
    const rb = ingAchaReserva(i.codigo); if (!rb.b) return rb;
    const d = {}, linhas = [['Serviço', `${rb.b.name} · ${ingData(rb.b.date)} ${rb.b.time}`]];
    const par = [['voo', 'voo', 'Voo/trem'], ['buscar_em', 'origem', 'Buscar em'], ['levar_para', 'destino', 'Levar para'], ['obs', 'obsOp', 'Observação']];
    for (const [de, para, rot] of par) if (i[de] !== undefined && String(i[de]).trim()) { d[para] = i[de]; linhas.push([rot, i[de]]); }
    if (i.custo !== undefined && i.custo !== null && i.custo !== '') { d.custo = +i.custo; linhas.push(['Ela paga a quem faz', eur(+i.custo)]); }
    if (i.resto) { d.restoPara = i.resto === 'no_dia' ? 'prestador' : 'ingrid'; linhas.push(['O resto', i.resto === 'no_dia' ? 'no dia, a quem faz' : 'com a Ingrid']); }
    if (linhas.length === 1) return E_('nada para mudar');
    return { titulo: 'Detalhes do serviço', assumiu: [], linhas, fazer: () => { Op.detalhes(rb.b.id, d); return { ok: true }; } };
  },
  registrar_pagamento(i) {
    const rb = ingAchaReserva(i.codigo); if (!rb.b) return rb;
    const b = rb.b, falta = Bookings.due(b);
    if (falta <= 0) return E_('essa reserva já está paga');
    if (!contasIds().includes(i.conta)) return E_('em que conta caiu? contas: ' + contasIds().join(', '));
    const valor = +i.valor > 0 ? Math.min(+i.valor, falta) : falta;
    return { titulo: 'Registrar pagamento', assumiu: +i.valor > 0 ? [] : [`valor: o que faltava (${eur(valor)})`],
      linhas: [['Cliente', b.name], ['Código', b.code], ['Valor', eur(valor)], ['Onde caiu', Contas.nome(i.conta)],
        ['Contabilidade', i.conta === CONTA_PRESTADOR ? 'fora do caixa dela' : (Contas.get(i.conta) || {}).pais === 'brasil' ? 'Brasil' : 'Europa'], ['Ainda falta', eur(Math.max(0, falta - valor))]],
      fazer: () => { registraPagamento(b.id, { valor, conta: i.conta }); const fechou = Tarefas.sincroniza(); return { ok: true, tarefas_que_fecharam_sozinhas: fechou.map(t => t.texto) }; } };
  },
  criar_orcamento(i) {
    if (!String(i.cliente || '').trim()) return E_('faltou o nome do cliente');
    const itens = [];
    for (const it of i.itens || []) {
      if (it.passeio_id) {
        const x = Tours.get(it.passeio_id); if (!x) return E_(`passeio ${it.passeio_id} não existe — use ver_passeios`);
        const n = Orc.itemDoCatalogo(it.passeio_id, { pax: it.pessoas || 2, data: isoOk(it.data) ? it.data : '', hora: it.hora });
        if (+it.valor > 0) n.valor = +it.valor;
        itens.push(n);
      } else if (it.descricao) itens.push(Orc._item({ desc: it.descricao, pax: it.pessoas || 2, data: isoOk(it.data) ? it.data : '', valor: +it.valor || 0 }));
    }
    const o0 = { itens, sinalPct: i.sinal_pct != null ? +i.sinal_pct : 30 };
    return { titulo: 'Criar orçamento', assumiu: itens.some(x => x.tourId && !(i.itens || []).find(y => y.passeio_id === x.tourId && +y.valor > 0)) ? ['preços da sua tabela'] : [],
      linhas: [['Cliente', i.cliente], ...itens.slice(0, 8).map(x => [x.data ? ingData(x.data) : '—', `${x.desc} · ${x.pax}p · ${x.valor ? eur(x.valor) : 'a definir'}`]), ['Total', eur(Orc.total(o0))], ['Sinal', eur(Orc.sinal(o0))]],
      fazer: () => { const o = Orc.cria({ origem: 'manual', status: 'rascunho', cliente: { nome: i.cliente, whats: i.whats, email: i.email }, itens, sinalPct: o0.sinalPct, obs: i.obs || '' });
        return { ok: true, numero: o.num, lembrete: 'ela confere e manda pelo botão da aba Sob consulta — você não manda nada para o cliente' }; } };
  },
  ler_conversa(i) {
    const c = lerConversa(i.texto); const itens = rascunhoDaConversa(c);
    return { titulo: 'Pedido do WhatsApp', assumiu: ['o rascunho usa os preços da tabela; ela confere antes de mandar'],
      linhas: [['Cliente', c.nome || '?'], ['WhatsApp', c.whats || '?'], ['Resumo', c.resumo || '—'], ['Rascunho', `${itens.length} serviço(s)`]],
      fazer: () => { const o = Orc.cria({ origem: 'whats', status: 'rascunho', cliente: { nome: c.nome, whats: c.whats }, conversa: i.texto, resumo: c.resumo, pax: c.pax, datas: c.datas, itens });
        Tarefas.cria({ tipo: 'nota', origem: 'whats', texto: `Resumo do WhatsApp — ${c.nome || 'cliente novo'}`, detalhe: c.resumo, orcId: o.id, clienteNome: c.nome, whats: c.whats });
        return { ok: true, numero: o.num }; } };
  },
  mudar_orcamento(i) {
    const r = ingAchaOrc(i.numero); if (!r.o) return r;
    const o = r.o, muda = {}, linhas = [['Orçamento', `${o.num} · ${o.cliente.nome}`]];
    if (i.situacao) { muda.status = i.situacao; linhas.push(['Situação', i.situacao]); }
    if (isoOk(i.validade)) { muda.validade = i.validade; linhas.push(['Validade', ingData(i.validade)]); }
    if (i.sinal_pct != null) { muda.sinalPct = +i.sinal_pct; linhas.push(['Sinal', i.sinal_pct + '%']); }
    if (linhas.length === 1) return E_('nada para mudar');
    return { titulo: 'Mudar orçamento', assumiu: [], linhas, fazer: () => { Orc.salva({ ...o, ...muda }); if (muda.status === 'enviado') Espera.orcamento(o); Tarefas.sincroniza(); return { ok: true }; } };
  },
  fechar_orcamento(i) {
    const r = ingAchaOrc(i.numero); if (!r.o) return r;
    const o = r.o; if (o.status === 'fechado') return E_('esse orçamento já foi fechado');
    const semDia = o.itens.filter(x => x.tourId && !x.data); if (semDia.length) return E_('falta o dia em: ' + semDia.map(x => x.desc).join(', '));
    if (i.sinal_recebido && !contasIds().includes(i.conta)) return E_('em que conta caiu o sinal? contas: ' + contasIds().join(', '));
    const n = o.itens.filter(x => x.tourId).length;
    return { titulo: 'Fechar orçamento', assumiu: [], linhas: [['Orçamento', `${o.num} · ${o.cliente.nome}`], ['Vira', `${n} reserva(s)`], ['Sinal', `${eur(Orc.sinal(o))} ${i.sinal_recebido ? '— já caiu em ' + Contas.nome(i.conta) : '— ainda não caiu'}`]],
      fazer: () => { const bs = Orc.fecha(o.id, { sinalRecebido: !!i.sinal_recebido, conta: i.conta }); Tarefas.sincroniza(); return { ok: true, reservas: bs.map(b => b.code) }; } };
  },
  ajustar_termos(i) {
    const linhas = [];
    if (i.termos) linhas.push(['Termos', String(i.termos).slice(0, 200) + (String(i.termos).length > 200 ? '…' : '')]);
    if (i.plantao) linhas.push(['Plantão', i.plantao]);
    if (!linhas.length) return E_('nada para mudar');
    return { titulo: 'Termos e plantão', assumiu: [], linhas, fazer: () => {
      if (i.termos) DB.settings.termos = { ...(DB.settings.termos || {}), pt: String(i.termos).trim() };
      if (i.plantao) DB.settings.plantao = String(i.plantao).trim();
      save(); return { ok: true }; } };
  },
  orcamento_do_roteiro(i) {
    const n = ingN(i.pedido);
    const l = (DB.pedidos || []).filter(p => p.id === i.pedido || ingN(p.nome).includes(n));
    if (!l.length) return E_('pedido de roteiro não encontrado — use ver_orcamentos');
    if (l.length > 1) return { erro: 'mais de um pedido — pergunte qual', opcoes: l.map(p => ({ pedido_id: p.id, nome: p.nome, de: p.ini })) };
    const p = l[0], itens = rascunhoDoRoteiro(p);
    return { titulo: 'Orçamento do roteiro', assumiu: ['sugestões pela tabela e pelo que o cliente gosta; ela confere'], linhas: [['Cliente', p.nome], ['Datas', [p.ini, p.fim].filter(Boolean).map(ingData).join(' a ') || '—'], ['Rascunho', `${itens.length} serviço(s)`]],
      fazer: () => { const o = Orc.cria({ origem: 'roteiro', status: 'rascunho', pedidoId: p.id, cliente: { nome: p.nome, whats: p.whats, email: p.email }, itens, pax: (+p.adultos || 0) + (+p.criancas || 0) }); return { ok: true, numero: o.num }; } };
  },
  cadastrar_conta(i) {
    const antes = i.conta ? Contas.get(i.conta) : null;
    if (i.conta && !antes) return E_('conta não encontrada — use ver_contas');
    return { titulo: antes ? 'Mudar conta' : 'Nova conta', assumiu: [], linhas: [['Conta', i.nome], ['Contador', i.lado === 'brasil' ? 'Brasil' : 'Europa'], ...(i.tipo ? [['Tipo', i.tipo]] : [])],
      fazer: () => { const c = Contas.salva({ id: antes ? antes.id : '', nome: i.nome, pais: i.lado, metodo: i.tipo || (antes ? antes.metodo : 'transfer') }); return { ok: true, conta: c.id }; } };
  },
  lembrete_feito(i) {
    const n = ingN(i.lembrete), l = Lembretes.lista().filter(x => ingN(x.txt).includes(n));
    if (!l.length) return E_('lembrete não encontrado — use ver_tarefas');
    if (l.length > 1) return { erro: 'mais de um lembrete parecido — pergunte qual', opcoes: l.map(x => x.txt) };
    return { titulo: 'Lembrete feito', assumiu: [], linhas: [['Lembrete', l[0].txt]], fazer: () => { Lembretes.marca(l[0].chave); return { ok: true }; } };
  },
  mudar_tabela(i) {
    const x = Tours.get(i.passeio_id); if (!x) return E_('passeio não encontrado — use ver_passeios');
    if (x.priceMode !== 'tabela') return E_('este passeio não tem tabela por pessoas' + (x.priceMode === 'transfer' ? ' (transfer tem tabela própria: Meus passeios)' : ' — use mudar_preco'));
    const de = Math.max(1, +i.de_pessoas || 1), ate = Math.min(20, Math.max(de, +i.ate_pessoas || de)), v = +i.valor;
    if (!(v > 0)) return E_('valor maior que zero');
    const tb = Array.isArray(x.tabela) ? x.tabela : [];
    return { titulo: 'Mudar tabela', assumiu: [], linhas: [['Passeio', x.name.pt], ['Grupo', de === ate ? `${de} pessoa(s)` : `${de} a ${ate} pessoas`], ['Antes', eur(+tb[de - 1] || 0)], ['Agora', eur(v)]],
      fazer: () => { const nt = Array.from({ length: 20 }, (_, k) => +tb[k] || 0); for (let k = de - 1; k < ate; k++) nt[k] = v; Tours.update(x.id, { tabela: nt }); return { ok: true }; } };
  },
};
for (const k of Object.keys(ING_LER)) IA_LEITURA.add(k);
const _ingLer = iaLeitura;
iaLeitura = function (nome, i) { return ING_LER[nome] ? ING_LER[nome](i || {}) : _ingLer(nome, i); };
const _ingPlano = iaPlano;
iaPlano = function (nome, i) { return ING_PLANO[nome] ? ING_PLANO[nome](i || {}) : _ingPlano(nome, i); };

/* ---------- 3. o que ela vive agora, e o jeito dela ---------- */
iaAgora = function () {
  const hoje = hojeIso(), G = Tarefas.grupos(hoje);
  const serv = (b) => { const s = ingServ(b); return `${s.hora} ${s.servico} · ${s.cliente} (${s.pessoas}p) · ${s.quem_faz} · paga no dia: ${s.paga_no_dia} · ${s.codigo}`; };
  const hj = Op.doDia(hoje), am = Op.doDia(addDays(hoje, 1));
  const dev = Lembretes.devedores(hoje), lem = Lembretes.lista(hoje).slice(0, 6);
  const novos = Orc.all().filter(o => ['novo', 'rascunho'].includes(o.status));
  return [
    `Hoje é ${hoje}.`,
    hj.length ? `Serviços de hoje: ${hj.map(serv).join(' | ')}` : 'Hoje não há serviço.',
    am.length ? `Amanhã: ${am.map(serv).join(' | ')}` : 'Amanhã não há serviço.',
    (G.atrasadas.length || G.hoje.length) ? `Tarefas atrasadas/hoje: ${[...G.atrasadas, ...G.hoje].map(t => `${t.texto}${t.hora ? ' ' + t.hora : ''} [${t.id}]`).join(' | ')}` : 'Nenhuma tarefa para hoje.',
    dev.length ? `Clientes que devem a ela: ${dev.map(d => `${d.nome} ${eur(d.total)}${d.atrasado ? ' (atrasado)' : ''}`).join(' | ')}` : '',
    novos.length ? `Pedidos esperando orçamento: ${novos.map(o => `${o.num} ${o.cliente.nome}`).join(' | ')}` : '',
    lem.length ? `O app lembra: ${lem.map(l => l.txt).join(' | ')}` : '',
    `Guias por preferência: ${Equipe.all('guia').map(p => p.nome.split(' ')[0]).join(', ') || '—'}. Motoristas: ${Equipe.all('motorista').map(p => p.nome).join(', ') || '—'}.`,
  ].filter(Boolean).join('\n');
};
iaSaudacao = function () {
  const h = new Date().getHours(), hoje = hojeIso();
  const hj = Op.doDia(hoje), G = Tarefas.grupos(hoje), dev = Lembretes.devedores(hoje);
  const semGuia = hj.filter(b => !b.prestadorId).length;
  const l = [ia(h < 12 ? 'sdBom' : h < 19 ? 'sdBoa' : 'sdNoite', { nome: guiaNome() })];
  l.push(hj.length ? `Hoje ${hj.length === 1 ? 'tem 1 serviço' : `são ${hj.length} serviços`}${semGuia ? `, ${semGuia} ainda sem guia/motorista` : ''}.` : 'Hoje não tem serviço.');
  if (G.atrasadas.length || G.hoje.length) l.push(`${G.hoje.length} tarefa(s) para hoje${G.atrasadas.length ? ` e ${G.atrasadas.length} atrasada(s)` : ''}.`);
  if (dev.length) l.push(`${dev.length} cliente(s) devem ${eur(dev.reduce((s, d) => s + d.total, 0))}.`);
  l.push('É só falar: "quem está livre amanhã de manhã?", "anota ligar para o Luca às 9h", "a Juliana pagou 60 ao motorista".');
  return l.join('\n');
};
iaSistema = function () {
  const mem = Mkt.get().memoria;
  return [
    { type: 'text', cache_control: { type: 'ephemeral' }, text: `Você é o assistente de ${guiaNome()}, dona da ${guiaNegocio()} — receptivo turístico em toda a Itália, base em Roma. Ela não é mais a guia: ela AGENCIA. Tem guias e motoristas por preferência, recebe um sinal na reserva e o resto normalmente é pago NO DIA, em dinheiro, a quem faz o serviço. Recebe em várias contas (Nubank e Wise no Brasil; Wise, Revolut e cartão na Europa) e tem um contador em cada lado. O carro-chefe é passeio PARTICULAR; grupo é exceção.

## Como você é
Uma pessoa de confiança que trabalha com ela há anos: frase curta, sem jargão, resolve. Chama pelo nome de vez em quando. No máximo um emoji. Propositivo: depois de responder, ofereça o próximo passo em uma linha, e pare. Uma pergunta por vez.
Quando ela contar algo solto ("a Juliana pagou 60 ao motorista", "a Giulia não pode dia 25 de manhã", "anota: ligar para o Luca amanhã 9h"), você transforma em ação no app e mostra o cartão de confirmação. O trabalho dela é falar; o de preencher é seu.
Emergência ("o cliente chegou e não acha o motorista"): use buscar e responda em 2 linhas com nome, voo, quem é o motorista, o WhatsApp dele e quanto o cliente paga no dia.

## REGRA ABSOLUTA DELA
Você NUNCA responde cliente, nunca manda mensagem, nunca publica, nunca paga. Você prepara (rascunho de orçamento, texto de mensagem, resumo) e ELA confere e envia pelos botões do app. Não existe ferramenta que mande nada para fora — é de propósito.

## VOCÊ ALCANÇA TODAS AS ABAS
- Hoje (serviços do dia, emergência): ver_hoje, buscar, detalhes_servico, escalar, registrar_pagamento
- Sob consulta (orçamentos): ver_orcamentos, ler_conversa (conversa colada → rascunho), criar_orcamento, mudar_orcamento, fechar_orcamento
- Tarefas e anotações: ver_tarefas (inclui lembretes do app e clientes que devem), anotar_tarefa, concluir_tarefa, ver_anotacoes, anotar
- Guias e motoristas: ver_guias, quem_esta_livre, marcar_disponibilidade, cadastrar_guia, mudar_guia (inclui preferência), remover_guia, escalar
- Agenda: ver_agenda, ver_hoje com a data; tarefas com dia aparecem na Agenda sozinhas
- Reservas: ver_reservas, criar_reserva, alterar_reserva, cancelar_reserva, registrar_pagamento
- Clientes e ficha: ver_clientes, ver_ficha, anotar_cliente
- Contabilidade: ver_contabilidade, ver_contas, registrar_pagamento (a CONTA decide Brasil ou Europa; "prestador" = pago na mão da guia, fora do caixa dela)
- Meus passeios: ver_passeios, criar_passeio, alterar_passeio, mudar_preco, mudar_tabela (preço por número de pessoas), adicionar_horario, remover_horario
- Relatórios: ver_relatorio
- Cupons: ver_cupons, criar_cupom, apagar_cupom · Bloqueios: bloquear_datas, liberar_datas
- Ajustes: ver_ajustes, alterar_ajustes, ajustar_termos (termos do orçamento e plantão do voucher)
- Qualquer tela: abrir_aba — nunca diga "faça na aba X" sem antes tentar a ferramenta; se não houver, abra a aba e diga o que tocar.

## ONDE GUARDAR CADA COISA
- Coisa para FAZER (com ou sem dia) → anotar_tarefa. "Mandar/enviar/cobrar/responder" já cria sozinha o passo "aguardar resposta" quando ela concluir.
- Ela conta que fez algo ("mandei o roteiro", "a cliente respondeu", "não respondeu") → concluir_tarefa com o resultado certo.
- Fato que vale para sempre sobre um cliente (vegana, VIP, alergia, indicou alguém) → anotar_cliente.
- Ideia, fornecedor, detalhe solto → anotar.
- A guia respondeu livre/ocupada → marcar_disponibilidade (fecha sozinha a tarefa de espera).
- Dinheiro que entrou → registrar_pagamento com a conta; se ela não disse a conta, PERGUNTE.
- Conversa de cliente colada → ler_conversa.
- Regra de trabalho dela para você lembrar sempre → guardar_memoria.

## Gravar
Chame a ferramenta direto: o app mostra o cartão "confirma?". Se ela cancelar, não grave e não insista. Na dúvida entre dois registros (duas "Juliana"), a ferramenta devolve as opções: pergunte qual — nunca chute. Datas em AAAA-MM-DD. Nunca invente preço, data, voo ou valor recebido.

## Formato
Português do Brasil, curto. Texto para ela copiar vem pronto. Negrito com parcimônia; nada de tabelas.` },
    { type: 'text', text: `## SITUAÇÃO AGORA (atualizada a cada mensagem)\n${iaAgora()}` },
    { type: 'text', text: `Hoje é ${hojeIso()}. Moeda: euro.` + (iaModo() === 'vivo' ? ' Isto é o protótipo em teste: os clientes, guias e valores são de exemplo.' : '') + (iaContexto() ? ` Tela aberta: ${iaContexto().txt}.` : '') +
      (mem.length ? '\n\n## Memória (o que ela ensinou)\n' + mem.map(x => `- [${x.id}] ${x.texto}`).join('\n') : '') },
  ];
};

/* ---------- pedidos prontos (modo demonstração) — rodam as ferramentas de verdade ---------- */
iaCenarios = function () {
  const hoje = hojeIso(), am = addDays(hoje, 1);
  const lista = [];
  lista.push({ id: 'hoje', pede: 'O que tenho hoje?', passos: [['ver_hoje', {}]],
    resposta: () => { const l = Op.doDia(hoje); if (!l.length) return 'Hoje não tem serviço.';
      return 'Hoje:\n' + l.map(b => { const s = ingServ(b); return `• ${s.hora} ${s.servico} — ${s.cliente} (${s.pessoas}p) · ${s.quem_faz}${s.paga_no_dia !== 'nada' ? ' · paga no dia ' + s.paga_no_dia : ''}`; }).join('\n'); } });
  lista.push({ id: 'livre', pede: 'Quem está livre amanhã de manhã em Roma?', passos: [['quem_esta_livre', { data: am, turno: 'manha', cidade: 'Roma' }]],
    resposta: () => { const r = Disp.quem({ data: am, turno: 'manha', cidade: 'Roma', tipo: 'guia' });
      return `Amanhã de manhã, por preferência:\n${r.livres.length ? r.livres.map(x => `• ${x.p.nome} — livre${x.nota ? ' (' + x.nota + ')' : ''}`).join('\n') : '• ninguém confirmou ainda'}${r.semResposta.length ? `\nSem resposta: ${r.semResposta.map(x => x.p.nome.split(' ')[0]).join(', ')}` : ''}\nQuer que eu escale a primeira livre?`; } });
  const cam = DB.bookings.find(b => b.date === am && !b.prestadorId && b.status !== 'cancelled' && (Tours.get(b.tourId) || {}).priceMode !== 'transfer');
  const livre = Disp.quem({ data: am, turno: 'manha', cidade: 'Roma', tipo: 'guia' }).livres[0];
  if (cam && livre) lista.push({ id: 'escala', pede: `Escala a ${livre.p.nome.split(' ')[0]} no serviço da ${cam.name.split(' ')[0]} amanhã`, passos: [['escalar', { codigo: cam.code, guia: livre.p.id }]],
    resposta: () => `Pronto: ${livre.p.nome} está com o serviço da ${cam.name}. No cartão do Hoje tem o botão "mandar o serviço" com tudo escrito para ela.` });
  lista.push({ id: 'tarefa', pede: 'Anota: ligar para o Luca amanhã às 9h sobre os transfers da semana', passos: [['anotar_tarefa', { texto: 'Ligar para o Luca sobre os transfers da semana', dia: am, hora: '09:00' }]],
    resposta: () => 'Anotado para amanhã às 9h — está em Tarefas e na Agenda. Se quiser no celular, toque em 📅 agenda na tarefa.' });
  const dev = Lembretes.devedores(hoje)[0];
  lista.push({ id: 'devem', pede: 'Quem está me devendo?', passos: [['ver_tarefas', {}]],
    resposta: () => { const d = Lembretes.devedores(hoje); return d.length ? `${d.length} cliente(s), ${eur(d.reduce((s, x) => s + x.total, 0))} no total:\n${d.map(x => `• ${x.nome} — ${eur(x.total)}${x.atrasado ? ' (atrasado)' : ' até ' + dataCurta(x.prazo)}`).join('\n')}\nEm Tarefas tem o botão "cobrar" de cada um.` : 'Ninguém está devendo. 👏'; } });
  const jul = DB.bookings.find(b => b.date === hoje && Op.restoPara(b) === 'prestador' && Bookings.due(b) > 0 && b.status !== 'cancelled');
  if (jul) lista.push({ id: 'pago', pede: `${jul.name.split(' ')[0]} pagou ${Bookings.due(jul)} € na mão de quem fez o serviço`, passos: [['registrar_pagamento', { codigo: jul.code, conta: CONTA_PRESTADOR }]],
    resposta: () => `Registrado: ${jul.name} está quitada. Esse valor ficou com quem fez o serviço, então não entra na sua contabilidade.` });
  if (dev) lista.push({ id: 'nota', pede: `Anota na ficha do ${dev.nome.split(' ')[0]} que ele prefere falar por áudio`, passos: [['anotar_cliente', { cliente: dev.nome, texto: 'Prefere falar por áudio no WhatsApp.' }]],
    resposta: () => `Anotado na ficha de ${dev.nome}.` });
  return lista;
};

/* o modo "ao vivo" (Claude de verdade pelo cofre) e o modo demonstracao ja
   vem do motor; a gaveta e redesenhada para pegar a saudacao dela */
if (typeof iaAtualizaFab === 'function') iaAtualizaFab();
if (location.hash.startsWith('#/adm') && typeof route === 'function') route();
