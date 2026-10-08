/* =====================================================
   ASSISTENTE DA GUIA — alcança TODAS as abas

   Regra do Eugênio (skill agente-assistente): o assistente mexe em todos os
   recursos do app. O assistente veio do app-guia (passeios, agenda,
   reservas, cupons, marketing); aqui ele ganha as abas que nasceram para a
   Painel: agências e invoices, e-mails, roteiros pagos, transfer, motoristas,
   vale-presente, avaliações, tarefas, recados e pontos do mapa.

   Três ferramentas, um chat só:
   - ver_dados {o_que, busca}  — LER qualquer coleção nova (livre);
   - mexer {onde, acao, quem, campos} — CRIAR / MUDAR / APAGAR, sempre com
     o cartão "vou fazer isso — confirma?" (mesmo caminho das outras);
   - anotar_tarefa — o atalho do "anota aí" (título curto + nota inteira);
   - abrir_aba — quando nenhuma ferramenta faz, leva até a tela.
   Nome que serve para dois registros → devolve as opções e o assistente
   pergunta qual. Nunca chuta em ferramenta que escreve.
   ===================================================== */
'use strict';

/* ---------- conversores de campo (o que o modelo manda → o que o app grava) ---------- */
const MX = {
  txt: (v) => { const s = String(v == null ? '' : v).trim(); if (!s) throw new Error('texto vazio'); return s.slice(0, 2000); },
  txtOuNada: (v) => String(v == null ? '' : v).trim().slice(0, 2000),
  num: (v) => { const n = +String(v).replace(',', '.').replace(/[£€\s]/g, ''); if (!isFinite(n) || n < 0) throw new Error('número inválido: ' + v); return n; },
  bool: (v) => { if (typeof v === 'boolean') return v; const s = String(v).toLowerCase(); if (/^(sim|s|true|1|yes)$/.test(s)) return true; if (/^(n[aã]o|n|false|0|no)$/.test(s)) return false; throw new Error('sim ou não?'); },
  data: (v) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new Error('data AAAA-MM-DD'); return String(v); },
  dataOuNada: (v) => { const s = String(v == null ? '' : v).trim(); if (!s || /^sem/i.test(s)) return ''; return MX.data(s); },
  horaOuNada: (v) => { const s = String(v == null ? '' : v).trim(); if (!s || /^sem/i.test(s)) return ''; if (!/^\d{1,2}:\d{2}$/.test(s)) throw new Error('hora HH:MM'); return s.padStart(5, '0'); },
  um: (lista) => (v) => { const s = String(v).toLowerCase().trim(); if (!lista.includes(s)) throw new Error('use um de: ' + lista.join(', ')); return s; },
  agencia: (v) => {
    const s = String(v).toLowerCase().trim(), l = DB.agencias || [];
    const a = l.find(x => x.id === v) || l.filter(x => x.nome.toLowerCase().includes(s));
    if (a && !Array.isArray(a)) return a.id;
    if (a.length === 1) return a[0].id;
    throw new Error(a.length ? 'qual agência? ' + a.map(x => x.nome).join(' / ') : 'agência não encontrada — cadastre antes');
  },
};
const dtIa = (iso) => /^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
const nomeAg = (id) => ((DB.agencias || []).find(a => a.id === id) || { nome: '?' }).nome;

/* ---------- o mapa das coleções novas: rótulo, aba, como achar, como nomear, campos aceitos ---------- */
const IA_COLECOES = {
  agencias: { rotulo: 'agência', aba: 'agencias', achar: ['nome', 'contato', 'email', 'cidade'], nomear: (a) => a.nome,
    campos: { nome: MX.txt, cidade: MX.txtOuNada, contato: MX.txtOuNada, email: MX.txtOuNada, whats: MX.txtOuNada, pagamento: MX.txtOuNada,
      diaCorte: MX.num, diaPagamento: MX.num, prazoDias: MX.num, prioridade: MX.bool },
    obrigatorios: ['nome'], novo: () => ({ moeda: typeof MOEDA !== 'undefined' ? MOEDA : 'GBP', prioridade: true }),
    ver: (a) => ({ id: a.id, nome: a.nome, cidade: a.cidade, contato: a.contato, email: a.email, whats: a.whats, pagamento: a.pagamento,
      corte_dia: a.diaCorte || null, paga_dia: a.diaPagamento || null, prazo_dias: a.prazoDias || null, prioridade: !!a.prioridade }) },
  trabalhosAgencia: { rotulo: 'trabalho de agência', aba: 'agencias', achar: ['cliente', 'servico', 'data'], nomear: (j) => `${dtIa(j.data)} · ${nomeAg(j.agencia)} · ${j.servico}`,
    campos: { agencia: MX.agencia, data: MX.data, servico: MX.txt, pax: MX.num, cliente: MX.txtOuNada, valor: MX.num, status: MX.um(['marcado', 'feito', 'cancelado']), obs: MX.txtOuNada },
    obrigatorios: ['agencia', 'data', 'servico'], novo: () => ({ status: 'marcado', invoice: { numero: '', emitida: '', enviada: '', vence: '', paga: '' } }),
    ver: (j) => ({ id: j.id, agencia: nomeAg(j.agencia), data: j.data, servico: j.servico, pessoas: j.pax, cliente: j.cliente, valor: j.valor, situacao: j.status,
      invoice: j.invoice && j.invoice.numero ? { numero: j.invoice.numero, enviada: j.invoice.enviada, vence: j.invoice.vence, paga: j.invoice.paga || 'não' } : 'ainda não emitida',
      prazo: typeof prazoInvoice === 'function' ? (prazoInvoice(j) || {}).txt : undefined }) },
  emails: { rotulo: 'e-mail', aba: 'emails', achar: ['nome', 'assunto', 'de'], nomear: (e) => `${e.nome} — ${e.assunto}`,
    campos: { tratado: MX.bool, tipo: MX.um(['agencia', 'cliente', 'ignorado']) }, semCriar: true,
    ver: (e) => ({ id: e.id, de: e.nome + ' <' + e.de + '>', assunto: e.assunto, chegou: e.chegou, resumo: e.resumo, tipo: e.tipo, data_pedida: e.data || null, pessoas: e.pax || null,
      conflito: e.data && typeof conflitoDoDia === 'function' ? conflitoDoDia(e.data) || 'dia livre' : undefined, tratado: !!e.tratado }) },
  roteiros: { rotulo: 'roteiro', aba: 'roteiros', achar: ['nome', 'codigo'], nomear: (r) => `${r.nome} (${r.codigo})`,
    campos: { nome: MX.txt, hotel: MX.txtOuNada, obs: MX.txtOuNada, status: MX.um(['rascunho', 'publicado']) }, semCriar: true,
    ver: (r) => ({ id: r.id, codigo: r.codigo, cliente: r.nome, whats: r.whats, de: r.ini, ate: r.fim, adultos: r.adultos, criancas: r.criancas, hotel: r.hotel, nivel: r.nivel,
      querem: r.querem, interesses: r.interesses, ritmo: r.ritmo, obs: r.obs, pago: r.pago, situacao: r.status, dias_montados: (r.dias || []).length }) },
  pedidos: { rotulo: 'pedido de transfer', aba: 'transfer', achar: ['nome', 'whats'], nomear: (p) => `${p.nome} · ${p.tipo}`,
    campos: { respondido: MX.bool }, semCriar: true,
    ver: (p) => ({ id: p.id, tipo: p.tipo, cliente: p.nome, whats: p.whats, criado: p.criado, respondido: !!p.respondido, ficha: p.ficha || undefined }) },
  motoristas: { rotulo: 'motorista', aba: 'transfer', achar: ['nome', 'carro'], nomear: (m) => m.nome,
    campos: { nome: MX.txt, whats: MX.txtOuNada, carro: MX.txtOuNada, lugares: MX.num, malas: MX.num, obs: MX.txtOuNada }, obrigatorios: ['nome'],
    ver: (m) => ({ id: m.id, nome: m.nome, whats: m.whats, carro: m.carro, lugares: m.lugares, malas: m.malas, obs: m.obs }) },
  giftcards: { rotulo: 'vale-presente', aba: 'bookings', achar: ['codigo', 'de', 'para'], nomear: (g) => `${g.codigo} (${g.de} → ${g.para})`,
    campos: { para: MX.txt, de: MX.txt, mensagem: MX.txtOuNada, validade: MX.data, usado: MX.bool, pago: MX.bool }, semCriar: true,
    ver: (g) => ({ id: g.id, codigo: g.codigo, de: g.de, para: g.para, passeio: g.tourId, horas: g.horas, pessoas: g.pax, valor: g.valor, validade: g.validade, usado: !!g.usado, pago: !!g.pago }) },
  avaliacoes: { rotulo: 'avaliação', aba: 'avaliacoes', achar: ['nome', 'texto'], nomear: (a) => `${a.nome} (${a.estrelas}★)`,
    campos: { publicar: MX.bool }, semCriar: true,
    ver: (a) => ({ id: a.id, nome: a.nome, estrelas: a.estrelas, texto: a.texto, passeio: a.tourId, data: a.data, cliente_autorizou: a.autorizou !== false, publicada: !!a.publicar, exemplo: !!a.exemplo }) },
  tarefas: { rotulo: 'tarefa', aba: 'tarefas', achar: ['texto', 'nota'], nomear: (t) => t.texto + (t.data ? ' · ' + dtIa(t.data) : ''),
    campos: { texto: MX.txt, nota: MX.txtOuNada, data: MX.dataOuNada, hora: MX.horaOuNada, area: MX.um(['pro', 'pessoal']), prioridade: MX.um(['alta', 'media', 'baixa']), feita: MX.bool },
    obrigatorios: ['texto'], novo: () => ({ area: 'pro', prioridade: 'media', feita: false, data: '', hora: '', nota: '' }),
    ver: (t) => ({ id: t.id, texto: t.texto, nota: t.nota || '', dia: t.data || 'sem dia', hora: t.hora || '', area: t.area, prioridade: t.prioridade, feita: !!t.feita }) },
  recados: { rotulo: 'recado', aba: 'tarefas', achar: ['nome', 'texto'], nomear: (r) => `${r.nome}: ${String(r.texto).slice(0, 40)}`,
    campos: { atendido: MX.bool }, semCriar: true,
    ver: (r) => ({ id: r.id, canal: r.canal, nome: r.nome, texto: r.texto, chegou: r.chegou, atendido: !!r.atendido }) },
  fichas: { rotulo: 'ficha de cliente', aba: 'clients', achar: ['nome', 'whats', 'email', 'hotel'], nomear: (f) => f.nome,
    campos: { idades: MX.txtOuNada, pais: MX.txtOuNada, mobilidade: MX.txtOuNada, alimentacao: MX.txtOuNada, ocasiao: MX.txtOuNada, notas: MX.txtOuNada,
      tags: (v) => { const l = (Array.isArray(v) ? v : String(v).split(',')).map(x => String(x).trim()).filter(Boolean);
        const ok = typeof TAGS_FICHA !== 'undefined' ? TAGS_FICHA : l; const fora = l.filter(x => !ok.includes(x));
        if (fora.length) throw new Error('etiquetas aceitas: ' + ok.join(', ')); return l; } },
    semCriar: true,
    ver: (f) => ({ id: f.id, nome: f.nome, whats: f.whats, email: f.email, instagram: f.insta || undefined, hotel: f.hotel, grupo: typeof grupoTexto === 'function' ? grupoTexto(f) : '',
      proximo: f.proximo ? { data: f.proximo.data, passeio: tl((Tours.get(f.proximo.ref.tourId) || { name: { pt: '' } }).name), horario: janelaDoTour({ time: f.proximo.ref.time, horas: f.proximo.ref.horas }),
        pago: Bookings.paid(f.proximo.ref), falta: Bookings.due(f.proximo.ref) } : null,
      compras: f.itens.map(i => (typeof rotuloItem === 'function' ? rotuloItem(i) : i.tipo)), total: f.total, pago: f.pago, a_receber: f.aReceber,
      idades: f.notas.idades, de_onde: f.notas.pais, mobilidade: f.notas.mobilidade, alimentacao: f.notas.alimentacao, ocasiao: f.notas.ocasiao, notas: f.notas.notas, etiquetas: f.notas.tags }) },
  pontos: { rotulo: 'ponto do mapa', aba: 'pontos', achar: ['n', 'area'], nomear: (p) => p.n,
    campos: { n: MX.txt, d: MX.txt, dica: MX.txtOuNada, area: MX.txtOuNada }, semCriar: true,
    ver: (p) => ({ id: p.id, nome: p.n, area: p.area, texto: p.d, dica: p.dica || '', fonte: p.fonte === 'carol' ? 'texto da guia' : p.fonte === 'demo' ? 'texto de exemplo' : 'texto de base (revisar)' }) },
};
/* nomes que o modelo entende, na descrição da ferramenta */
const IA_CAMPOS_TXT = Object.entries(IA_COLECOES).map(([k, c]) => `${k} (${c.rotulo}): ${Object.keys(c.campos).join(', ')}${c.semCriar ? ' — só mudar/apagar' : ''}`).join('; ');

/* pontos: a lista é a base (pontos.js) + o que ela editou (DB.pontos) */
function iaLista(onde) {
  if (onde === 'pontos') return typeof todosPontos === 'function' ? todosPontos() : (typeof PONTOS !== 'undefined' ? PONTOS : []);
  if (onde === 'fichas') return typeof fichasTodas === 'function' ? fichasTodas() : [];
  if (!Array.isArray(DB[onde])) DB[onde] = [];
  return DB[onde];
}
/* achar UM registro — por id exato, senão por nome; dois candidatos = pergunta */
function iaAcha(onde, quem) {
  const C = IA_COLECOES[onde], l = iaLista(onde);
  const q = String(quem || '').toLowerCase().trim();
  if (!q) return { erro: 'diga qual ' + C.rotulo };
  const exato = l.find(x => x.id === quem || (x.codigo && String(x.codigo).toLowerCase() === q));
  if (exato) return { item: exato };
  const achou = l.filter(x => C.achar.some(k => String(x[k] || '').toLowerCase().includes(q)));
  if (achou.length === 1) return { item: achou[0] };
  if (achou.length > 1) return { erro: 'mais de um registro serve — pergunte qual', opcoes: achou.slice(0, 8).map(x => ({ id: x.id, nome: C.nomear(x) })) };
  return { erro: C.rotulo + ' não encontrado(a)', dica: 'use ver_dados para ver os ids' };
}
function iaConverte(C, campos, parcial) {
  const out = {}, linhas = [];
  for (const [k, v] of Object.entries(campos || {})) {
    if (!C.campos[k]) throw new Error(`campo "${k}" não existe aqui — aceitos: ${Object.keys(C.campos).join(', ')}`);
    out[k] = C.campos[k](v);
  }
  if (!parcial) for (const k of C.obrigatorios || []) if (out[k] === undefined || out[k] === '') throw new Error('faltou ' + k);
  return { out, linhas };
}
const iaMostra = (k, v) => Array.isArray(v) ? (v.join(', ') || '—') : k === 'agencia' ? nomeAg(v) : typeof v === 'boolean' ? (v ? 'sim' : 'não') : (/^(data|validade)$/.test(k) && v ? dtIa(v) : k === 'valor' ? eur(v) : String(v === '' ? '—' : v));

/* ---------- as ferramentas ---------- */
IA_FERRAMENTAS.push(
  { name: 'ver_dados', description: 'Lê as abas do painel que não têm ferramenta própria: fichas (cliente: tudo de uma pessoa que pagou), agencias, trabalhosAgencia (trabalhos e invoices), emails (varredura), roteiros (Monte seu roteiro, pagos), pedidos (transfer), motoristas, giftcards (vale-presente), avaliacoes, tarefas, recados, pontos (mapa e Monte seu roteiro; use busca). Devolve os ids.',
    input_schema: obj({ o_que: { type: 'string', enum: Object.keys(IA_COLECOES) }, busca: S_('texto para filtrar (opcional)') }, ['o_que']) },
  { name: 'mexer', description: 'Cria, muda ou apaga um registro dessas abas. quem = id (de ver_dados) ou nome; se servir para dois, a ferramenta devolve as opções — pergunte qual. Campos aceitos por aba: ' + IA_CAMPOS_TXT + '. Datas AAAA-MM-DD; "sem" tira o dia de uma tarefa.',
    input_schema: obj({ onde: { type: 'string', enum: Object.keys(IA_COLECOES) }, acao: { type: 'string', enum: ['criar', 'mudar', 'apagar'] }, quem: S_('id ou nome (mudar/apagar)'),
      campos: { type: 'object', description: 'campo: valor', additionalProperties: true } }, ['onde', 'acao']) },
  { name: 'anotar_tarefa', description: 'Anota uma tarefa (fazer ou PENSAR depois, ideia, brainstorm). texto = título curto; nota = a ideia inteira. Com data entra na agenda de tarefas.',
    input_schema: obj({ texto: S_(), nota: S_(), data: S_('AAAA-MM-DD'), hora: S_('HH:MM'), area: { type: 'string', enum: ['pro', 'pessoal'] }, prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] } }, ['texto']) },
  { name: 'abrir_aba', description: 'Leva a guia até uma tela do painel quando a coisa se faz tocando (ex.: montar os dias de um roteiro, gerar a invoice, imprimir o QR).',
    input_schema: obj({ aba: { type: 'string', enum: ADM_TABS.map(([id]) => id) } }, ['aba']) },
);
IA_LEITURA.add('ver_dados'); IA_LEITURA.add('abrir_aba');

const _iaLeituraBase = iaLeitura;
iaLeitura = function (nome, i) {
  if (nome === 'abrir_aba') {
    if (!ADM_TABS.some(([id]) => id === i.aba)) return E_('aba não existe');
    setTimeout(() => go('/adm/' + i.aba), 0); return { ok: true, aberta: i.aba };
  }
  if (nome !== 'ver_dados') return _iaLeituraBase(nome, i);
  const C = IA_COLECOES[i.o_que]; if (!C) return E_('não conheço essa aba');
  const q = String(i.busca || '').toLowerCase().trim();
  let l = iaLista(i.o_que);
  if (q) l = l.filter(x => JSON.stringify(C.ver(x)).toLowerCase().includes(q));
  if (i.o_que === 'tarefas' && !q) l = l.filter(t => !t.feita);
  const lim = i.o_que === 'pontos' ? 25 : 60;
  return l.length ? { total: l.length, itens: l.slice(0, lim).map(C.ver) } : 'nada' + (q ? ' com "' + i.busca + '"' : '') + ' em ' + i.o_que;
};

const _iaPlanoBase = iaPlano;
iaPlano = function (nome, i) {
  if (nome === 'anotar_tarefa') return iaPlano('mexer', { onde: 'tarefas', acao: 'criar', campos: Object.fromEntries(Object.entries(i).filter(([, v]) => v !== undefined && v !== '')) });
  if (nome !== 'mexer') return _iaPlanoBase(nome, i);
  const C = IA_COLECOES[i.onde]; if (!C) return E_('não conheço essa aba');
  const tit = { criar: 'Criar', mudar: 'Mudar', apagar: 'Apagar' }[i.acao] + ' ' + C.rotulo;
  try {
    if (i.acao === 'criar') {
      if (C.semCriar) return E_(`${C.rotulo} não se cria por aqui — nasce ${i.onde === 'emails' ? 'da varredura do e-mail' : 'do cliente, pelo app'}. Use mudar, ou abrir_aba ${C.aba}.`);
      const { out } = iaConverte(C, i.campos, false);
      const linhas = Object.entries(out).map(([k, v]) => [k, iaMostra(k, v)]);
      const avisos = [];
      if (i.onde === 'trabalhosAgencia' && typeof conflitoDoDia === 'function') { const c = conflitoDoDia(out.data); if (c) avisos.push('⚠️ ' + c + ' — agência tem prioridade; passe o cliente direto para um colega'); }
      return { titulo: tit, linhas, assumiu: avisos,
        fazer: () => { const novo = { id: uid(), ...(C.novo ? C.novo() : {}), ...out, criado: new Date().toISOString() }; iaLista(i.onde).push(novo); grava(); return { ok: true, id: novo.id, aviso: avisos[0] }; } };
    }
    const r = iaAcha(i.onde, i.quem); if (r.erro) return r;
    const x = r.item;
    if (i.acao === 'apagar') {
      return { titulo: tit, linhas: [[C.rotulo, C.nomear(x)]], assumiu: [],
        fazer: () => {
          if (i.onde === 'pontos') DB.pontos = (DB.pontos || []).filter(z => z.id !== x.id);   /* ponto da base volta ao texto original */
          else if (i.onde === 'fichas') DB.fichas = (DB.fichas || []).filter(z => z.id !== x.id);   /* só as anotações: as compras continuam */
          else DB[i.onde] = DB[i.onde].filter(z => z.id !== x.id);
          grava(); return { ok: true };
        } };
    }
    if (i.acao === 'mudar') {
      const { out } = iaConverte(C, i.campos, true);
      if (!Object.keys(out).length) return E_('nada muda — diga os campos');
      if (i.onde === 'avaliacoes' && out.publicar && x.autorizou === false) return E_('o cliente NÃO autorizou publicar esta avaliação');
      const antes = i.onde === 'fichas' ? (x.notas || {}) : x;
      const linhas = [[C.rotulo, C.nomear(x)]].concat(Object.entries(out).map(([k, v]) => [k, `${iaMostra(k, antes[k] === undefined ? '' : antes[k])} → ${iaMostra(k, v)}`]));
      const avisos = [];
      if (i.onde === 'trabalhosAgencia' && out.data && out.data !== x.data && typeof conflitoDoDia === 'function') { const c = conflitoDoDia(out.data); if (c) avisos.push('⚠️ ' + c); }
      return { titulo: tit, linhas, assumiu: avisos,
        fazer: () => {
          const extra = {};
          if (i.onde === 'tarefas' && 'feita' in out) extra.feitaEm = out.feita ? new Date().toISOString() : '';
          if (i.onde === 'tarefas' && out.data === '') extra.hora = '';          /* tirou o dia: tira a hora junto */
          if (i.onde === 'pontos') { DB.pontos = (DB.pontos || []).filter(z => z.id !== x.id).concat([{ ...x, ...out, fonte: 'carol' }]); }
          else if (i.onde === 'fichas') { DB.fichas = DB.fichas || []; let r = DB.fichas.find(z => z.id === x.id); if (!r) { r = { id: x.id }; DB.fichas.push(r); } Object.assign(r, out); }
          else Object.assign(x, out, extra);
          grava(); return { ok: true };
        } };
    }
    return E_('ação: criar, mudar ou apagar');
  } catch (e) { return E_(String(e.message || e)); }
};

/* ---------- o prompt: mapa "aba → ferramenta" + as regras do negócio ---------- */
const _iaSistemaBase = iaSistema;
iaSistema = function () {
  const blocos = _iaSistemaBase();
  const st = DB.settings || {}, pct = typeof sinalPct === 'function' ? sinalPct() : 30;
  blocos.push({ type: 'text', text: `## Você alcança TODAS as abas do painel
- Hoje, Agenda, Meus passeios, Reservas, Cupons: ver_passeios, ver_agenda, ver_reservas, ver_cupons, ver_bloqueios e as ferramentas de passeio, horário, bloqueio e cupom.
- Agências e invoices: ver_dados agencias / trabalhosAgencia; mexer onde=agencias ou trabalhosAgencia. Gerar e mandar a invoice é na tela: abrir_aba agencias.
- E-mails (a varredura): ver_dados emails (traz o conflito do dia); mexer onde=emails para marcar tratado. Pedido de agência aceito vira mexer trabalhosAgencia criar.
- Roteiros pagos: ver_dados roteiros; mexer (nome, hotel, obs, status). Montar e reordenar os dias: abrir_aba roteiros.
- Transfer: ver_dados pedidos e motoristas; mexer. A cotação com o motorista sai pelo WhatsApp dela, na tela.
- Vale-presente: ver_dados giftcards; mexer (usado, validade…).
- Avaliações: ver_dados avaliacoes; mexer publicar — só se o cliente autorizou.
- Tarefas e recados: anotar_tarefa; ver_dados tarefas / recados; mexer (feita, data, atendido…).
- Clientes (a ficha de cada pessoa que pagou): ver_dados fichas com busca pelo nome ou WhatsApp — traz próximo tour, hotel, grupo, compras, quanto falta e as anotações; mexer onde=fichas para anotar idades, mobilidade, alimentação, ocasião, notas e etiquetas.
- Pontos do mapa e do Monte seu roteiro: ver_dados pontos com busca; mexer onde=pontos para trocar texto (d) e dica.
- O que nenhuma ferramenta faz: abrir_aba e diga o que tocar. Nunca responda só "não consigo".

## Onde guardar cada coisa
- Coisa para fazer ou pensar depois (ideia, brainstorm) → anotar_tarefa: título curto em texto, a ideia inteira em nota. Com dia, entra na lista do dia.
- Trabalho vindo de agência → mexer trabalhosAgencia criar (o cartão avisa se o dia já tem cliente: agência tem prioridade).
- Coisa sobre um cliente (idade, alergia, mobilidade, gosto, aniversário) → mexer fichas mudar, nunca guardar_memoria.
- Regra ou preferência que vale para sempre → guardar_memoria.
- Se você escrever "anotei", "registrei" ou "marquei", você TEM que ter chamado a ferramenta neste mesmo turno.

## Regras do negócio
Preço por GRUPO, pela duração e pelo tamanho do grupo (não por pessoa). Sinal de ${pct}% não reembolsável na reserva; o restante no dia do tour. ${st.diaExclusivo === false ? 'Hoje ela aceita mais de um grupo por dia (manhã e tarde).' : 'Um grupo por dia: dia com tour ou trabalho de agência fica ocupado.'} Tolerância de atraso: ${st.tolerancia || 20} min. ${+st.horaExtra ? 'Hora extra: ' + eur(st.horaExtra) + '.' : 'Hora extra: sob consulta.'} Antes de sugerir uma data, olhe ver_agenda e os trabalhos de agência.` });
  return blocos;
};
