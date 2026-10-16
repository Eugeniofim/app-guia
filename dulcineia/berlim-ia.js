/* =====================================================
   ASSISTENTE DA DULCINEIA — alcança TODAS as abas (16/10/2026)

   Pedido do Eugênio: "o assistente precisa ser o mesmo da Bia". O da Bia
   (guia.eugeniofim.com/londres/) = assistente.js (a mesma base daqui) +
   carol-ia.js (ferramentas que alcançam as abas novas) + assistente-voz.js
   (orbe, voz, ditado, PDF). Este arquivo é o carol-ia.js REESCRITO para o
   que existe no app dela — sem agências, invoices, e-mails, roteiros pagos,
   motoristas, vale-presente, avaliações, tarefas nem pontos do mapa:

   - ver_dados {o_que, busca} — pedidos (transfer e roteiro) e clientes
     (a ficha de cada pessoa que reservou, com as anotações dela);
   - mexer {onde, acao:'mudar', quem, campos} — marcar pedido respondido,
     escrever a anotação da ficha. Sempre com o cartão "confirma?";
   - abrir_aba — leva até a tela quando a coisa se faz tocando.
   Grava com save() (sobe para a nuvem) e pedido pelo Pedidos.marca (que
   sincroniza a tabela pedidos). Marketing trancado = ferramentas de
   marketing nem são oferecidas ao modelo.
   ===================================================== */
'use strict';

const BX = {
  txtOuNada: (v) => String(v == null ? '' : v).trim().slice(0, 2000),
  bool: (v) => { if (typeof v === 'boolean') return v; const s = String(v).toLowerCase(); if (/^(sim|s|true|1|yes)$/.test(s)) return true; if (/^(n[aã]o|n|false|0|no)$/.test(s)) return false; throw new Error('sim ou não?'); },
};
const bxData = (iso) => /^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
const bxChave = (c) => String(c.email || c.whats || c.name || '').toLowerCase();

const BX_COLECOES = {
  pedidos: { rotulo: 'pedido de transfer ou roteiro', aba: 'bookings', achar: ['nome', 'whats', 'resumo'], nomear: (p) => `${p.nome} · ${p.tipo}`,
    lista: () => (typeof Pedidos !== 'undefined' ? Pedidos.all() : (DB.pedidos || [])),
    campos: { respondido: BX.bool },
    ver: (p) => ({ id: p.id, tipo: p.tipo, cliente: p.nome, whats: p.whats, email: p.email || undefined, chegou: bxData(p.criado), resumo: p.resumo, respondido: !!p.respondido, ficha: p.ficha || undefined }),
    muda: (p, out) => { if ('respondido' in out) { if (typeof Pedidos !== 'undefined') Pedidos.marca(p.id, out.respondido); else { p.respondido = out.respondido; save(); } } } },
  clientes: { rotulo: 'ficha de cliente', aba: 'clients', achar: ['name', 'whats', 'email'], nomear: (c) => c.name,
    lista: () => (typeof Clients !== 'undefined' ? Clients.all() : []).map(c => ({ ...c, id: bxChave(c) })),
    campos: { anotacao: BX.txtOuNada },
    ver: (c) => { const n = (DB.fichas && DB.fichas[c.id]) || {};
      return { id: c.id, nome: c.name, whats: c.whats, email: c.email, passeios: c.tours, gasto: c.spent, ultimo: c.last, anotacao: n.texto || '' }; },
    antes: (c) => ({ anotacao: ((DB.fichas && DB.fichas[c.id]) || {}).texto || '' }),
    muda: (c, out) => { if ('anotacao' in out) { DB.fichas = DB.fichas || {}; DB.fichas[c.id] = { texto: out.anotacao, em: new Date().toISOString() }; save(); } } },
};
const BX_CAMPOS_TXT = Object.entries(BX_COLECOES).map(([k, c]) => `${k} (${c.rotulo}): ${Object.keys(c.campos).join(', ')}`).join('; ');

function bxAcha(onde, quem) {
  const C = BX_COLECOES[onde], l = C.lista();
  const q = String(quem || '').toLowerCase().trim();
  if (!q) return { erro: 'diga qual ' + C.rotulo };
  const exato = l.find(x => x.id === quem || String(x.id).toLowerCase() === q);
  if (exato) return { item: exato };
  const achou = l.filter(x => C.achar.some(k => String(x[k] || '').toLowerCase().includes(q)));
  if (achou.length === 1) return { item: achou[0] };
  if (achou.length > 1) return { erro: 'mais de um registro serve — pergunte qual', opcoes: achou.slice(0, 8).map(x => ({ id: x.id, nome: C.nomear(x) })) };
  return { erro: C.rotulo + ' não encontrado(a)', dica: 'use ver_dados para ver os ids' };
}

/* marketing trancado no plano dela: o modelo nem recebe essas ferramentas */
if (typeof modulo === 'function' && modulo('marketing') !== true) {
  const MKT = ['ver_marketing', 'salvar_posts', 'mudar_post', 'apagar_post', 'salvar_anuncio', 'apagar_anuncio', 'criar_criativo', 'mudar_criativo', 'apagar_criativo', 'gerar_imagem'];
  for (let i = IA_FERRAMENTAS.length - 1; i >= 0; i--) if (MKT.includes(IA_FERRAMENTAS[i].name)) IA_FERRAMENTAS.splice(i, 1);
}

IA_FERRAMENTAS.push(
  { name: 'ver_dados', description: 'Lê o que não tem ferramenta própria: pedidos (Transfer e Monte seu roteiro que os clientes mandaram pelo app — traz a ficha completa) e clientes (a ficha de cada pessoa que reservou: contato, quantos passeios, quanto gastou e a anotação dela). Use busca com nome ou WhatsApp. Devolve os ids.',
    input_schema: obj({ o_que: { type: 'string', enum: Object.keys(BX_COLECOES) }, busca: S_('texto para filtrar (opcional)') }, ['o_que']) },
  { name: 'mexer', description: 'Muda um registro dessas abas (sempre com o cartão de confirmação). quem = id (de ver_dados) ou nome; se servir para dois, a ferramenta devolve as opções — pergunte qual. Campos: ' + BX_CAMPOS_TXT + '. Para anotar algo sobre um cliente, leia a anotação atual e mande o texto INTEIRO novo (ela substitui).',
    input_schema: obj({ onde: { type: 'string', enum: Object.keys(BX_COLECOES) }, acao: { type: 'string', enum: ['mudar'] }, quem: S_('id ou nome'),
      campos: { type: 'object', description: 'campo: valor', additionalProperties: true } }, ['onde', 'acao', 'quem']) },
  { name: 'abrir_aba', description: 'Leva até uma tela do painel quando a coisa se faz tocando (ex.: responder um pedido, ver a ficha, mudar as cores).',
    input_schema: obj({ aba: { type: 'string', enum: ADM_TABS.map(([id]) => id) } }, ['aba']) },
);
IA_LEITURA.add('ver_dados'); IA_LEITURA.add('abrir_aba');

const _bxLeituraBase = iaLeitura;
iaLeitura = function (nome, i) {
  if (nome === 'abrir_aba') {
    if (!ADM_TABS.some(([id]) => id === i.aba)) return E_('aba não existe');
    setTimeout(() => go('/adm/' + i.aba), 0); return { ok: true, aberta: i.aba };
  }
  if (nome !== 'ver_dados') return _bxLeituraBase(nome, i);
  const C = BX_COLECOES[i.o_que]; if (!C) return E_('não conheço essa aba');
  const q = String(i.busca || '').toLowerCase().trim();
  let l = C.lista();
  if (q) l = l.filter(x => JSON.stringify(C.ver(x)).toLowerCase().includes(q));
  return l.length ? { total: l.length, itens: l.slice(0, 60).map(C.ver) } : 'nada' + (q ? ' com "' + i.busca + '"' : '') + ' em ' + i.o_que;
};

const _bxPlanoBase = iaPlano;
iaPlano = function (nome, i) {
  if (nome !== 'mexer') return _bxPlanoBase(nome, i);
  const C = BX_COLECOES[i.onde]; if (!C) return E_('não conheço essa aba');
  if (i.acao !== 'mudar') return E_(`${C.rotulo} nasce do cliente, pelo app — aqui só dá para mudar. Use abrir_aba ${C.aba}.`);
  try {
    const r = bxAcha(i.onde, i.quem); if (r.erro) return r;
    const x = r.item, out = {};
    for (const [k, v] of Object.entries(i.campos || {})) {
      if (!C.campos[k]) throw new Error(`campo "${k}" não existe aqui — aceitos: ${Object.keys(C.campos).join(', ')}`);
      out[k] = C.campos[k](v);
    }
    if (!Object.keys(out).length) return E_('nada muda — diga os campos');
    const antes = C.antes ? C.antes(x) : x;
    const mostra = (v) => typeof v === 'boolean' ? (v ? 'sim' : 'não') : (String(v === '' || v == null ? '—' : v).slice(0, 160));
    const linhas = [[C.rotulo, C.nomear(x)]].concat(Object.entries(out).map(([k, v]) => [k, `${mostra(antes[k])} → ${mostra(v)}`]));
    return { titulo: 'Mudar ' + C.rotulo, linhas, assumiu: [], fazer: () => { C.muda(x, out); return { ok: true }; } };
  } catch (e) { return E_(String(e.message || e)); }
};

/* o prompt: o mapa "aba → ferramenta" e as regras do negócio DELA */
const _bxSistemaBase = iaSistema;
iaSistema = function () {
  const blocos = _bxSistemaBase();
  const tu = (typeof turnos === 'function' ? turnos() : []).map(t => `${t.nome} ${t.hora}–${t.fim}`).join(' e ');
  const tp = (typeof GUIA_CFG !== 'undefined' && GUIA_CFG.temporada) || {};
  blocos.push({ type: 'text', text: `## Você alcança TODAS as abas do painel
- Hoje, Agenda, Meus passeios, Reservas, Cupons: ver_passeios, ver_agenda, ver_reservas, ver_cupons, ver_bloqueios e as ferramentas de passeio, horário, bloqueio e cupom.
- Pedidos de Transfer e de Monte seu roteiro (os clientes mandam pelo app, sem preço): ver_dados pedidos; mexer onde=pedidos respondido=sim depois que ela responder. A resposta com o valor sai pelo WhatsApp dela.
- Clientes: ver_dados clientes com busca pelo nome ou WhatsApp; mexer onde=clientes anotacao para guardar o que importa da pessoa (idades, mobilidade, alergia, aniversário, gosto).
- Cores da marca, Para a sua viagem (hotel, chip, seguro), depoimentos, contato: abrir_aba settings e diga o que tocar.
- O que nenhuma ferramenta faz: abrir_aba e diga o que tocar. Nunca responda só "não consigo".

## Onde guardar cada coisa
- Coisa sobre um cliente → mexer clientes anotacao (nunca guardar_memoria).
- Regra ou preferência que vale para sempre → guardar_memoria.
- Se você escrever "anotei", "registrei" ou "marquei", você TEM que ter chamado a ferramenta neste mesmo turno.

## Regras do negócio (Conexão Berlim)
Visitas privativas em português, em dois turnos por dia${tu ? ': ' + tu : ''}. Um grupo por turno e uma guia só: turno reservado em QUALQUER passeio fica ocupado em todos; a mesma família pode pegar manhã e tarde. Temporada de ${tp.de ? tp.de.split('-').reverse().join('/') : 'março'} a ${tp.ate ? tp.ate.split('-').reverse().join('/') : 'outubro'}. Preço 0 = sob consulta: o valor é combinado pelo WhatsApp dela; nunca invente preço. Pagamento por Pix. Antes de sugerir uma data, olhe ver_agenda.` });
  return blocos;
};
