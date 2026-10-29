/* =====================================================
   O ASSISTENTE MONTA O ORÇAMENTO (29/10/2026)

   As ferramentas e as travas do orçamento premium, no motor destes apps:
   - ver_orcamentos · criar_orcamento · editar_orcamento ·
     proposta_orcamento · orcamento_do_pedido · orcamento_fechou;
   - SÓ O QUE VEIO DELA: texto, incluso, não incluso, observação, destaque
     e horário de cada serviço só entram se estão no que ela escreveu no
     chat, num orçamento que ela citou ou no catálogo dela. O que não veio
     dela sai e o cartão diz "Não entrou… — não veio de você". Imagem no
     chat = entra, mas o cartão mostra para ela conferir antes do sim.
   Carrega DEPOIS do assistente-voz.js (que reescreve o iaConversa).
   ===================================================== */
'use strict';

(function () {
  if (typeof IA_FERRAMENTAS === 'undefined' || typeof iaPlano !== 'function' || typeof Orc === 'undefined') return;

  /* o orçamento antigo (orcamento_do_pedido / _servico / _aceito e "mexer onde=orcamentos"):
     o novo entra no lugar, com o mesmo nome onde dá */
  for (let k = IA_FERRAMENTAS.length - 1; k >= 0; k--) if (['orcamento_do_pedido', 'orcamento_servico', 'orcamento_aceito'].includes(IA_FERRAMENTAS[k].name)) IA_FERRAMENTAS.splice(k, 1);

  const isoOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
  const ingN = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const dtC = (iso) => isoOk(iso) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '—';
  /* o orçamento pelo número (ORC-0007, 7) ou pelo nome do cliente; dois com o mesmo nome → pergunta */
  function achaOrc(q) {
    const s = String(q || '').trim(); if (!s) return { erro: 'qual orçamento? (número ou nome do cliente)' };
    const n = s.replace(/\D/g, '');
    let o = n && Orc.all().find(x => +String(x.num).replace(/\D/g, '') === +n && /^\s*(orc|#)?[\s-]*\d+\s*$/i.test(s));
    if (!o) o = Orc.all().find(x => ingN(x.num) === ingN(s));
    if (o) return { o };
    const l = Orc.all().filter(x => ingN(x.cliente.nome).includes(ingN(s)));
    if (l.length === 1) return { o: l[0] };
    if (l.length > 1) return { erro: 'tem mais de um: ' + l.slice(0, 6).map(x => `${x.num} (${x.cliente.nome}, ${(ORC_STATUS.find(z => z[0] === x.status) || ['', x.status])[1]})`).join(' / ') + ' — qual?' };
    return { erro: 'não achei o orçamento "' + s + '" — use ver_orcamentos' };
  }
  const resumo = (o) => ({ numero: o.num, cliente: o.cliente.nome || '', whats: o.cliente.whats || '', situacao: (ORC_STATUS.find(z => z[0] === o.status) || ['', o.status])[1],
    pessoas: oyPaxTexto(o), hotel: o.hotel || '', chegada: o.chegada && o.chegada.data || '', partida: o.partida && o.partida.data || '',
    total: Orc.total(o), moeda: OY_MOEDA, ...(oyVatPct(o) ? { imposto: OY_IMP + ' ' + oyVatPct(o) + '%' } : {}), pago: +o.pago || 0, pendente: oyPendente(o),
    servicos: oyOrdena(o.itens).map((i, k) => ({ n: k + 1, dia: i.data || '', hora: ppHoras(i), servico: i.desc, pessoas: i.pax, valor: i.aParte ? 'à parte' : +i.valor || 0,
      ...(i.sugestao ? { pedido_sem_valor: true } : {}), ...(i.obs && !OY_OBS_INTERNA.test(i.obs) ? { obs: i.obs } : {}) })) });

  const VOO = { type: 'object', properties: { data: S_('AAAA-MM-DD'), hora: S_('hora do voo, HH:MM'), voo: S_() } };
  const CAMPOS = {
    cliente: S_('nome do cliente'), whats: S_('WhatsApp do cliente'), email: S_(),
    hotel: S_(), adultos: { type: 'integer' }, criancas: { type: 'integer' },
    chegada: { ...VOO, description: 'chegada do cliente: dia, hora e voo' }, partida: { ...VOO, description: 'partida: dia, hora e voo' },
    pago: N_('quanto o cliente já pagou'), desconto: N_(), validade: S_('AAAA-MM-DD'),
    link_pagamento: S_('link de pagamento da plataforma dela (https://…): vira o botão Pagar na proposta'),
    total_informado: N_('o TOTAL que ela fechou (com centavos). Vale exatamente esse número.'),
    pagamento_por: { type: 'string', enum: ['total', 'pessoa', 'casal'], description: 'o que o link de pagamento cobra (padrão: total)' },
    com_imposto: { type: 'boolean', description: `false = sem ${OY_IMP} neste orçamento; true = com ${OY_IMP}${OY_VAT ? ' de ' + OY_VAT + '%' : ' (só se ela disse a porcentagem: imposto_pct)'}` },
    imposto_pct: N_(`porcentagem do ${OY_IMP}, SÓ se ela disse`),
    obs: S_('observação para o cliente (vai na proposta)'),
    hoteis: { type: 'array', description: 'hotéis por período, como ela escreve ("07-11/11 Hotel X *à parte")', items: { type: 'object', properties: { nome: S_(), de: S_('AAAA-MM-DD'), ate: S_('AAAA-MM-DD'), situacao: { type: 'string', enum: ['incluso', 'a parte'] } } } },
  };
  const ITEM = { type: 'object', properties: {
    passeio_id: S_('id do passeio do catálogo (do prompt ou de ver_passeios): traz preço, foto, texto e incluso'),
    descricao: S_('serviço fora do catálogo, com o nome que ELA deu'), data: S_('AAAA-MM-DD — exatamente o dia que ela disse'),
    hora: S_('HH:MM — SÓ o horário que ela disse; não disse = deixe sem'), hora_fim: S_('SÓ se ela disse o horário de término'),
    pessoas: { type: 'integer', description: 'sem este campo = o grupo todo' }, criancas: { type: 'integer' }, horas: { type: 'integer', description: 'passeio por hora: quantas horas' },
    valor: N_('o valor que ELA disse para este serviço (sem este campo: o preço da tabela)'),
    texto: S_('SOMENTE o texto que ELA escreveu, copiado. Nunca escreva um texto seu.'), incluso: S_(), nao_incluso: S_(),
    obs: S_('observação do serviço (vira um balão na proposta)'), destaque: S_('ex.: manhã livre, à noite'), voo: S_(),
    a_parte: { type: 'boolean', description: 'serviço "(à parte)": entra no roteiro, por conta do cliente, sem valor' },
    traslado: { type: 'string', enum: ['chegada', 'saida'], description: 'traslado de aeroporto pronto, com o voo e o hotel da chegada/partida' },
    acao: { type: 'string', enum: ['adicionar', 'mudar', 'tirar'], description: 'só no editar_orcamento' }, item: S_('só no editar (mudar/tirar): nº do serviço (de ver_orcamentos) ou o nome'),
  } };
  IA_FERRAMENTAS.push(
    { name: 'ver_orcamentos', description: 'Lê os ORÇAMENTOS: número, cliente, situação, pessoas, datas, total, pago e cada serviço (dia, hora, valor). busca = número, nome do cliente ou situação.',
      input_schema: obj({ busca: S_('opcional') }) },
    { name: 'criar_orcamento', description: `Cria um ORÇAMENTO (proposta de viagem): o cliente, as pessoas, o hotel, a chegada e a partida, e o roteiro dia a dia. Use EXATAMENTE o que ela mandou. Valores em ${OY_MOEDA}. Passeio do catálogo sempre com passeio_id; traslado:"chegada"/"saida" monta o traslado de aeroporto.`,
      input_schema: obj({ ...CAMPOS, itens: { type: 'array', items: ITEM } }, ['cliente']) },
    { name: 'editar_orcamento', description: 'Muda um orçamento: os dados do cliente e da viagem, os valores, e os serviços (itens com acao adicionar / mudar / tirar; mudar e tirar pelo item = nº ou nome).',
      input_schema: obj({ numero: S_('número ou cliente do orçamento'), ...CAMPOS, itens: { type: 'array', items: ITEM } }, ['numero']) },
    { name: 'proposta_orcamento', description: 'Abre a PROPOSTA do orçamento (o que o cliente recebe: capa com fotos, roteiro dia a dia, investimento, condições) para ela gerar o PDF ou mandar o link no WhatsApp. Você não manda nada: só abre a tela.',
      input_schema: obj({ numero: S_('número ou cliente do orçamento') }, ['numero']) },
    { name: 'orcamento_do_pedido', description: 'Monta o orçamento a partir de um PEDIDO do site (transfer ou "Monte seu roteiro"): já vem com cliente, datas, pessoas e o que ele pediu — sem preço o que não está na tabela dela. pedido = id ou nome do cliente.',
      input_schema: obj({ pedido: S_() }, ['pedido']) },
    { name: 'orcamento_fechou', description: 'O cliente FECHOU: cada serviço do orçamento vira reserva (aparece em Reservas, no Hoje e na ficha) e o roteiro da viagem abre pronto. sinal_recebido = o sinal já caiu?',
      input_schema: obj({ numero: S_(), sinal_recebido: { type: 'boolean' }, metodo: { type: 'string', enum: OY_METODOS.map(m => m[0]) } }, ['numero']) },
  );
  if (typeof IA_LEITURA !== 'undefined') IA_LEITURA.add('ver_orcamentos');
  /* o abrir_aba montou a lista de abas antes deste arquivo: a aba Orçamentos entra nela */
  const ab = IA_FERRAMENTAS.find(t => t.name === 'abrir_aba'), en = ab && ab.input_schema && ab.input_schema.properties && ab.input_schema.properties.aba && ab.input_schema.properties.aba.enum;
  if (Array.isArray(en) && !en.includes('orcamentos')) en.push('orcamentos');

  const _ler = iaLeitura;
  iaLeitura = function (nome, i) {
    if (nome !== 'ver_orcamentos') return _ler.apply(this, arguments);
    const q = ingN(i && i.busca);
    let l = Orc.all();
    if (q) l = l.filter(o => ingN(o.num + ' ' + o.cliente.nome + ' ' + (ORC_STATUS.find(z => z[0] === o.status) || ['', ''])[1]).includes(q));
    return l.length ? { total: l.length, orcamentos: l.slice(0, 30).map(resumo) } : 'nenhum orçamento' + (q ? ' com "' + i.busca + '"' : '');
  };

  /* ---------- SÓ O QUE VEIO DELA ---------- */
  let falaAgora = { texto: '', imagem: false };
  if (typeof iaConversa === 'function') {
    const _conv = iaConversa;
    iaConversa = function (texto, anexos) {
      falaAgora = { texto: String(texto || ''), imagem: Array.isArray(anexos) ? anexos.some(a => a && !/^text/.test(String(a.tipo || a.type || a.mime || ''))) && anexos.length > 0 : !!anexos };
      return _conv.apply(this, arguments);
    };
  }
  const oyN = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const horasDe = (t) => new Set([...String(t || '').matchAll(/(\d{1,2})\s*(?:[:h.]\s*(\d{2})|h\b|hs\b|horas?\b)/gi)].map(m => oyHm(m[1] + ':' + (m[2] || '00'))).filter(Boolean));
  function fonteDela(i) {
    let txt = falaAgora.texto, img = falaAgora.imagem;
    try {
      const us = (typeof iaLe === 'function' && typeof IA_HIST !== 'undefined' ? iaLe(IA_HIST, []) : []).filter(m => m && m.role === 'user');
      us.forEach((m, k) => {
        if (typeof m.content === 'string') { txt += '\n' + m.content; return; }
        for (const b of m.content || []) {
          if (b.type === 'text') txt += '\n' + b.text;
          else if (b.type === 'tool_result') txt += '\n' + (typeof b.content === 'string' ? b.content : JSON.stringify(b.content));
          else if ((b.type === 'image' || b.type === 'document') && k >= us.length - 3) img = true;
        }
      });
    } catch (e) {}
    const nt = ' ' + oyN(txt) + ' ';
    const alvo = i && i.numero ? achaOrc(i.numero).o : null;
    const refs = (DB.orcamentos || []).filter(o => o === alvo || (o.num && nt.includes(' ' + oyN(o.num) + ' ')) || (oyN(o.cliente && o.cliente.nome).length > 2 && nt.includes(' ' + oyN(o.cliente.nome) + ' ')));
    const deOrc = refs.flatMap(o => (o.itens || []).map(x => [x.desc, x.texto, x.incluso, x.naoIncluso, x.obs, x.rotulo, x.hora, x.horaFim].join(' \n '))).join(' \n ');
    const cat = Tours.all().map(x => [oyPt(x.name), oyPt(x.desc), oyPt(x.tagline), oyLista(x.includes).join(', '), oyLista(x.notIncludes).join(', ')].join(' \n ')).join(' \n ');
    return { n: ' ' + oyN(txt + ' \n ' + deOrc + ' \n ' + cat) + ' ', horas: horasDe(txt + ' \n ' + deOrc), imagem: img };
  }
  /* o texto está no que ela deu? (3 palavras seguidas batendo em pelo menos 60% do texto) */
  function deEla(t, f) {
    const w = oyN(t).split(' ').filter(Boolean); if (!w.length) return true;
    if (w.length < 3) return f.n.includes(' ' + w.join(' ') + ' ');
    let ok = 0; for (let k = 0; k + 2 < w.length; k++) if (f.n.includes(' ' + w.slice(k, k + 3).join(' ') + ' ')) ok++;
    return ok / (w.length - 2) >= 0.6;
  }
  const CAMPOS_TXT = [['texto', 'texto'], ['incluso', 'incluso'], ['nao_incluso', 'não incluso'], ['obs', 'observação'], ['destaque', 'destaque']];
  function soDela(i) {
    if (!Array.isArray(i.itens) || !i.itens.length) return { i, fora: [], conferir: [] };
    const f = fonteDela(i), fora = [], conferir = [];
    const itens = i.itens.map(it => {
      const n = { ...it }, x = it.passeio_id && Tours.get(it.passeio_id);
      const nome = it.descricao || (x ? oyPt(x.name) : it.traslado ? 'traslado de ' + it.traslado : it.item || 'serviço');
      for (const [k, rot] of CAMPOS_TXT) {
        if (!String(n[k] || '').trim()) continue;
        if (f.imagem) { if (k === 'texto' && !x) conferir.push([`Texto de "${nome}"`, String(n[k]).slice(0, 140) + (String(n[k]).length > 140 ? '…' : '') + ' (lido da imagem — confira)']); continue; }
        if (!deEla(n[k], f)) { fora.push(`${rot} de "${nome}"`); delete n[k]; }
      }
      for (const k of ['hora', 'hora_fim']) {
        if (!n[k] || f.imagem) continue;
        if (!f.horas.has(oyHm(n[k]))) { fora.push(`${k === 'hora' ? 'início' : 'fim'} ${n[k]} de "${nome}"`); delete n[k]; }
      }
      return n;
    });
    return { i: { ...i, itens }, fora, conferir };
  }
  const avisaFora = (p, sd) => {
    if (sd.fora.length) p.linhas.push(['Não entrou', sd.fora.join(' · ') + ' — não veio de você']);
    if (sd.conferir.length) p.linhas.push(...sd.conferir);
    if (sd.fora.length) { const f0 = p.fazer; p.fazer = () => { const r = f0(); return { ...r, nao_entrou: sd.fora, aviso: 'o app tirou o que não veio dela (' + sd.fora.join('; ') + '). Diga isso em uma linha e pergunte se ela quer passar esses dados — nunca invente.' }; }; }
    return p;
  };

  /* ---------- os campos e os serviços (o mesmo que o editor faz) ---------- */
  const campos = (o, i) => {
    const antes = oyPax(o);
    if (i.cliente != null) o.cliente.nome = String(i.cliente).trim();
    if (i.whats != null) o.cliente.whats = String(i.whats).trim();
    if (i.email != null) o.cliente.email = String(i.email).trim();
    if (i.hotel != null) o.hotel = String(i.hotel);
    if (i.adultos != null) o.adultos = Math.max(0, +i.adultos || 0);
    if (i.criancas != null) o.criancas = Math.max(0, +i.criancas || 0);
    for (const k of ['chegada', 'partida']) if (i[k]) o[k] = { data: isoOk(i[k].data) ? i[k].data : ((o[k] || {}).data || ''), hora: oyHm(i[k].hora) || ((o[k] || {}).hora || ''), voo: i[k].voo || ((o[k] || {}).voo || '') };
    if (i.pago != null) o.pago = +i.pago || 0; if (i.desconto != null) o.desconto = +i.desconto || 0;
    if (isoOk(i.validade)) o.validade = i.validade;
    if (/^https:\/\//i.test(String(i.link_pagamento || ''))) o.linkPagamento = String(i.link_pagamento).trim();
    if (i.total_informado != null) o.totalInformado = Math.max(0, +i.total_informado || 0);
    if (i.imposto_pct != null) o.vatPct = Math.max(0, +i.imposto_pct || 0);
    if (i.com_imposto != null) o.semVat = i.com_imposto === false;
    if (['total', 'pessoa', 'casal'].includes(i.pagamento_por)) o.pagModo = i.pagamento_por;
    if (i.obs != null) o.obs = String(i.obs);
    if (Array.isArray(i.hoteis)) { o.hoteis = i.hoteis.map(h => ({ nome: String(h.nome || '').trim(), de: isoOk(h.de) ? h.de : '', ate: isoOk(h.ate) ? h.ate : '', situacao: /incl/i.test(h.situacao || '') ? 'incluso' : /parte/i.test(h.situacao || '') ? 'a parte' : '' })).filter(h => h.nome); o.hotel = (o.hoteis[0] || {}).nome || o.hotel || ''; }
    if (i.adultos != null || i.criancas != null) { o.pax = oyPax(o); o.paxNota = oyPaxTexto(o); }
    o.moeda = OY_MOEDA;
    return antes;
  };
  const enriquece = (n, it) => Object.assign(n, {
    ...(it.nao_incluso ? { naoIncluso: it.nao_incluso } : {}), ...(it.obs ? { obs: it.obs } : {}), ...(it.a_parte ? { aParte: true, valor: 0, auto: false } : {}),
    ...(it.hora_fim ? { horaFim: oyHm(it.hora_fim) } : {}), ...(it.texto ? { texto: it.texto } : {}), ...(it.incluso ? { incluso: it.incluso } : {}),
    ...(it.destaque ? { rotulo: it.destaque } : {}), ...(it.voo ? { voo: it.voo } : {}) });
  const servico = (o, it) => {
    if (it.traslado) return enriquece(oyTraslado(o, it.traslado === 'chegada' ? 'chegada' : 'saida'), it);
    const pax = +it.pessoas || oyPax(o) || 1;
    const x = it.passeio_id && Tours.get(it.passeio_id);
    if (x) return enriquece(oyDoCatalogo(o, it.passeio_id, { data: isoOk(it.data) ? it.data : '', hora: oyHm(it.hora), horaFim: oyHm(it.hora_fim), pax, criancas: it.criancas, horas: it.horas, valor: it.valor, texto: it.texto, incluso: it.incluso }), it);
    if (!String(it.descricao || '').trim()) return null;
    return enriquece(Orc._item({ tipo: OY_RE_TRASLADO.test(it.descricao) ? 'traslado' : 'livre', desc: String(it.descricao).trim(), data: isoOk(it.data) ? it.data : '', hora: oyHm(it.hora), pax, criancas: +it.criancas || 0, valor: +it.valor || 0 }), it);
  };
  const linhaServ = (o, it) => [isoOk(it.data) ? dtC(it.data) : it.traslado ? dtC(((it.traslado === 'chegada' ? o.chegada : o.partida) || {}).data) : '—',
    `${it.traslado ? (it.traslado === 'chegada' ? 'Traslado de chegada' : 'Traslado de saída') : (it.descricao || (Tours.get(it.passeio_id) ? oyPt(Tours.get(it.passeio_id).name) : '?'))}${it.hora ? ' · ' + it.hora : ''} · ${it.pessoas || oyPax(o) || 1}p · ${it.a_parte ? 'à parte' : +it.valor > 0 ? oyM(+it.valor) : it.passeio_id || it.traslado ? 'preço da tabela' : 'sem valor'}`];
  const linhasCampos = (i, o) => {
    const l = [];
    if (i.cliente) l.push(['Cliente', i.cliente + (i.whats ? ' · ' + i.whats : '')]);
    if (i.adultos != null || i.criancas != null) l.push(['Pessoas', oyPaxTexto({ adultos: i.adultos ?? (o && o.adultos), criancas: i.criancas ?? (o && o.criancas) })]);
    if (i.chegada && i.chegada.data) l.push(['Viagem', `${dtC(i.chegada.data)}${i.partida && i.partida.data ? ' a ' + dtC(i.partida.data) : ''}`]);
    if (Array.isArray(i.hoteis) && i.hoteis.length) l.push(['Hotéis', i.hoteis.map(h => h.nome + (h.situacao ? ' (' + h.situacao + ')' : '')).join(' · ')]);
    else if (i.hotel) l.push(['Hotel', i.hotel]);
    if (+i.total_informado > 0) l.push(['Total', oyM(+i.total_informado) + ' (o que você fechou)']);
    if (i.pago != null) l.push(['Já pago', oyM(+i.pago)]);
    if (i.com_imposto != null) l.push([OY_IMP, i.com_imposto === false ? 'sem ' + OY_IMP : 'com ' + OY_IMP + (i.imposto_pct != null ? ' ' + i.imposto_pct + '%' : '')]);
    return l;
  };

  const _plano = iaPlano;
  iaPlano = function (nome, i) {
    i = i || {};
    if (!['criar_orcamento', 'editar_orcamento', 'proposta_orcamento', 'orcamento_do_pedido', 'orcamento_fechou'].includes(nome)) return _plano.apply(this, arguments);
    let sd = null;
    if (nome === 'criar_orcamento' || nome === 'editar_orcamento') { sd = soDela(i); i = sd.i; }
    const p = planoOrc(nome, i);
    return sd && p && p.fazer ? avisaFora(p, sd) : p;
  };
  function planoOrc(nome, i) {
    if (nome === 'proposta_orcamento') {
      const r = achaOrc(i.numero); if (!r.o) return E_(r.erro);
      return { titulo: 'Abrir a proposta', assumiu: [], linhas: [['Orçamento', `${r.o.num} · ${r.o.cliente.nome || '—'}`], ['Total', oyM(Orc.total(r.o))]],
        fazer: () => { go('/adm/proposta/' + r.o.id); return { ok: true, lembrete: 'a proposta está aberta na tela: ela toca em Gerar PDF ou WhatsApp' }; } };
    }
    if (nome === 'orcamento_do_pedido') {
      const q = ingN(i.pedido), l = (DB.pedidos || []).filter(p => p.id === i.pedido || ingN(p.nome).includes(q));
      if (!l.length) return E_('não achei esse pedido');
      if (l.length > 1 && !l.some(p => p.id === i.pedido)) return E_('tem mais de um: ' + l.slice(0, 5).map(p => `${p.nome} (${p.id})`).join(' / ') + ' — qual?');
      const p = l.find(x => x.id === i.pedido) || l[0];
      if (p.orcamentoId && Orc.get(p.orcamentoId)) return E_('este pedido já tem orçamento: ' + Orc.get(p.orcamentoId).num);
      return { titulo: 'Montar orçamento do pedido', assumiu: ['o que não está na sua tabela entra sem valor, fora da proposta até você pôr o valor'], linhas: [['Cliente', p.nome], ['Pedido', String(p.resumo || p.tipo || '').slice(0, 160)]],
        fazer: () => { const o = oyDoPedido(p); return { ok: true, numero: o.num, servicos: o.itens.length, lembrete: 'aberto em Orçamentos; os serviços sem valor ficam fora da proposta até ela pôr o valor' }; } };
    }
    if (nome === 'orcamento_fechou') {
      const r = achaOrc(i.numero); if (!r.o) return E_(r.erro);
      const o = r.o; if (o.status === 'fechado') return E_('este orçamento já fechou: ' + (o.bookingIds || []).length + ' reservas');
      if (!o.cliente.nome) return E_('falta o nome do cliente no orçamento');
      const semData = o.itens.filter(x => x.tourId && !x.data); if (semData.length) return E_('falta o dia em: ' + semData.map(x => x.desc).join(', '));
      const vira = o.itens.filter(x => !x.sugestao && ((x.tourId && Tours.get(x.tourId)) || (x.data && String(x.desc || '').trim())));
      return { titulo: 'Fechou → reservas', assumiu: [], linhas: [['Orçamento', `${o.num} · ${o.cliente.nome}`], ['Viram reserva', vira.length + ' serviço' + (vira.length === 1 ? '' : 's')], ['Total', oyM(Orc.total(o))], ...(i.sinal_recebido ? [['Sinal recebido', oyM(Orc.sinal(o))]] : [])],
        fazer: () => { const bs = Orc.fecha(o.id, { sinalRecebido: !!i.sinal_recebido, metodo: i.metodo || 'other' }); if (bs.length && typeof Kit !== 'undefined') setTimeout(() => Kit.abrir(kitChaveDe(bs[0])), 0); return { ok: true, reservas: bs.length, lembrete: 'o roteiro da viagem abriu na tela, pronto para ela mandar' }; } };
    }
    if (nome === 'criar_orcamento') {
      if (!String(i.cliente || '').trim()) return E_('falta o nome do cliente');
      const grupo = (+i.adultos || 0) + (+i.criancas || 0);
      const tmp = { itens: [], adultos: i.adultos, criancas: i.criancas, pax: grupo, chegada: i.chegada || {}, partida: i.partida || {} };
      const linhas = [...linhasCampos(i, null), ...(i.itens || []).slice(0, 14).map(it => linhaServ(tmp, it))];
      if ((i.itens || []).length > 14) linhas.push(['…', 'mais ' + ((i.itens || []).length - 14) + ' serviços']);
      return { titulo: 'Criar orçamento', assumiu: [], linhas,
        fazer: () => {
          const o = Orc.cria({ status: 'rascunho', origem: 'assistente', cliente: { nome: i.cliente, whats: i.whats || '', email: i.email || '' } });
          campos(o, i);
          for (const it of i.itens || []) { const n = servico(o, it); if (n) o.itens.push(n); }
          Orc.salva(o);
          return { ok: true, numero: o.num, total: Orc.total(o), servicos: o.itens.length, lembrete: 'Para o cliente: proposta_orcamento abre a proposta (PDF e link).' };
        } };
    }
    if (nome === 'editar_orcamento') {
      const r = achaOrc(i.numero); if (!r.o) return E_(r.erro);
      const o = r.o;
      if (o.status === 'fechado') return E_('este orçamento já fechou e virou reserva: mude nas reservas');
      const its = i.itens || [];
      const alvo = (it) => { const s = String(it.item || '').trim(); const l = oyOrdena(o.itens); return /^\d+$/.test(s) ? l[+s - 1] : l.find(z => ingN(z.desc).includes(ingN(s))); };
      for (const it of its) if ((it.acao === 'mudar' || it.acao === 'tirar') && !alvo(it)) return E_('não achei o serviço "' + (it.item || '') + '" — use ver_orcamentos para ver os números');
      const linhas = [['Orçamento', `${o.num} · ${o.cliente.nome || '—'}`], ...linhasCampos(i, o)];
      for (const it of its) {
        if (it.acao === 'tirar') linhas.push(['Tira', alvo(it).desc]);
        else if (it.acao === 'mudar') linhas.push(['Muda', alvo(it).desc + ' → ' + Object.keys(it).filter(k => !['acao', 'item'].includes(k)).join(', ')]);
        else linhas.push(['Adiciona', linhaServ(o, it).join(' · ')]);
      }
      if (linhas.length === 1) return E_('nada para mudar');
      return { titulo: `Mudar o orçamento ${o.num}`, assumiu: [], linhas,
        fazer: () => {
          const x = Orc.get(o.id); if (!x) return E_('o orçamento sumiu');
          const antes = campos(x, i);
          if (i.adultos != null || i.criancas != null) oyMudaPax(x, antes);
          for (const it of its) {
            if (it.acao === 'tirar') { const a = alvo(it); x.itens = x.itens.filter(z => z.id !== a.id); continue; }
            if (it.acao === 'mudar') {
              const a = alvo(it); if (!a) continue;
              if (isoOk(it.data)) a.data = it.data;
              if (it.hora) a.hora = oyHm(it.hora);
              if (it.descricao) a.desc = String(it.descricao).trim();
              if (it.pessoas) a.pax = Math.max(1, +it.pessoas);
              if (it.criancas != null) a.criancas = Math.max(0, +it.criancas || 0);
              if (it.valor != null) { a.valor = Math.max(0, +it.valor || 0); a.auto = false; }
              const tx = a.tourId && Tours.get(a.tourId); if (tx && a.auto && (it.pessoas || it.criancas != null)) a.valor = oyPrecoItem(tx, a).total || a.valor;
              if (+a.valor > 0 || it.a_parte) a.sugestao = false;
              enriquece(a, it); continue;
            }
            const n = servico(x, it); if (n) x.itens.push(n);
          }
          Orc.salva(x); ppRepublica(x);
          return { ok: true, numero: x.num, total: Orc.total(x) };
        } };
    }
    return _plano(nome, i);
  }

  /* as regras do orçamento e o CATÁLOGO inteiro no que o assistente lê antes de tudo */
  const catalogo = () => Tours.all().filter(x => x.status !== 'draft' && !x.avulso).map(x => {
    const v = +x.price;
    return `${x.id}: ${oyPt(x.name)} — ${v > 0 ? oyM(v) + (x.priceMode === 'session' ? ' por grupo' : oyHorasTour(x) ? ' por hora' : ' por pessoa') : 'sob consulta'}`;
  }).join('\n');
  const _sis = iaSistema;
  iaSistema = function () {
    const b = _sis.apply(this, arguments);
    if (!Array.isArray(b)) return b;
    b.push({ type: 'text', text: `## O CATÁLOGO (id: nome — preço da tabela). Use o id em passeio_id.\n${catalogo() || '(nenhum passeio publicado)'}` });
    b.push({ type: 'text', text: `## ORÇAMENTO E PROPOSTA
- Antes de criar, tenha o BÁSICO: nome do cliente, WhatsApp, quantas pessoas (adultos e crianças), hotel e os dias de chegada e partida (com hora e voo, se ela souber). Falta algum? Pergunte UMA coisa por vez — mas não trave: com nome e pessoas já dá para criar e completar depois com editar_orcamento.
- Monte o roteiro DIA A DIA: cada serviço com o dia. Passeio do catálogo SEMPRE com passeio_id: traz preço, foto, texto e incluso. Traslado de aeroporto: item com traslado:"chegada" ou "saida". Fora do catálogo: descricao com o nome que ELA deu (texto só se ela escreveu).
- NUNCA ESCREVA NADA SEU NO ORÇAMENTO (vai para o cliente como verdade): nada de descrição, incluso, não incluso, horário ou dia que ela não deu. Não sabe o horário? Deixe sem. Dia: exatamente o que ela disse. O app confere e tira o que não veio dela.
- RESPEITE O QUE ELA MANDOU: valores de cada serviço que ela disse → valor; o total dela → total_informado. Nunca recalcule pela tabela o que ela deu, nunca acrescente nem tire serviço. Serviço "(à parte)" → a_parte:true. Cola uma planilha/texto inteiro? Monte tudo num criar_orcamento só.
- Moeda: ${OY_MOEDA} (${OY_SIMB}). ${OY_VAT ? `O app soma ${OY_IMP} de ${OY_VAT}% sozinho (com_imposto:false tira).` : `Sem imposto: só ponha ${OY_IMP} se ela pedir (com_imposto:true e imposto_pct).`}
- Pedido que chegou pelo site (ver_dados pedidos): orcamento_do_pedido monta o rascunho. O cliente fechou: orcamento_fechou (vira reserva e abre o roteiro da viagem).
- Depois de criar ou mudar, ofereça em uma linha: "Quer que eu abra a proposta para gerar o PDF ou mandar o link?" → proposta_orcamento. Quem manda é ela.` });
    return b;
  };
})();
