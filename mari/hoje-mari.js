/* =====================================================
   HOJE — o painel do dia da Mari (22/10/2026)

   Pedido do Eugênio: "HOJE precisa ser como é no protótipo da BIA, bem completo
   ao máximo, inclusive colocar também uma agenda parecida com a minha do TI ARTES".
   - Topo: saudação, o resumo do dia e 4 números (atrasados, hoje, próximos 7 dias,
     o que ela recebe hoje em dinheiro).
   - Esquerda: a AGENDA do jeito do TI ARTES OS — a faixa dos próximos 14 dias com
     marcas por tipo (bolinha amarela = tour, carrinho = transfer, quadradinho azul =
     tarefa), os atrasados num bloco à parte, Hoje com a linha "agora", Amanhã e os
     próximos 30 dias. Entram passeios, tarefas e compromissos, o Google Agenda dela,
     aniversários, faturas que vencem e a chegada de quem tem roteiro.
   - Direita: os cartões da Bia — o que precisa dela agora: lembretes de véspera com a
     mensagem pronta, quem pagou, pedidos esperando resposta, sinais pendentes,
     orçamentos, faturas, roteiros, a equipe, brindes, aniversários, "para ligar tudo".
   - Boas-vindas uma vez só (fecha e não volta; a marca fica no privado dela).
   Substitui o admTodayMari (agenda-mari.js). O voucher (voucher-mari.js) se pendura
   depois; aqui o botão do voucher já vem em cada passeio.
   ===================================================== */
'use strict';

const HJ_TIPO = {
  passeio:     { nome: 'Tour',        cor: '#F2C230' },
  transfer:    { nome: 'Transfer',    cor: '#F2C230' },
  compromisso: { nome: 'Compromisso', cor: '#2EC4B6' },
  tarefa:      { nome: 'Tarefa',      cor: '#5B8DEF' },
  anotacao:    { nome: 'Anotação',    cor: '#9AA3B5' },
  google:      { nome: 'Google',      cor: '#4285F4' },
  aniver:      { nome: 'Aniversário', cor: '#E879A6' },
  fatura:      { nome: 'Fatura',      cor: '#E5484D' },
  roteiro:     { nome: 'Roteiro',     cor: '#F28C4B' },
};
const HJ_DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HJ_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const hjPrim = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const hjChave = (b) => String(b.email || b.whats || b.name || '').toLowerCase();
const hjFone = (s) => String(s || '').replace(/\D/g, '');
const hjDt = (iso) => /^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
const hjNomeDia = (iso) => { const d = new Date(iso + 'T12:00:00'); return `${HJ_DIA[d.getDay()]}, ${d.getDate()} de ${HJ_MES[d.getMonth()]}`; };
const hjAgora = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
function hjTourNome(b) { const x = Tours.get(b.tourId); return x ? tl(x.name) : (b.tourName || 'passeio'); }

/* a mensagem de véspera (ou de qualquer dia), pronta para o WhatsApp do cliente */
function hjLembrete(b) {
  const x = Tours.get(b.tourId) || {};
  const amanha = b.date === addDays(agHoje(), 1);
  const encontro = x.meeting ? noIdioma(x.meeting) : '';
  const falta = Bookings.due(b);
  const linhas = [
    `Oi, ${hjPrim(b.name)}! Aqui é a ${(typeof guiaNome === 'function' && guiaNome()) || 'Mari'}, do Tour na Dinamarca 😊 Passando para lembrar do nosso ${x.type === 'transfer' ? 'transfer' : 'passeio'} ${amanha ? 'de amanhã' : 'no dia ' + hjDt(b.date)}:`,
    '',
    `📍 ${hjTourNome(b)}`,
    `🗓 ${hjNomeDia(b.date)}${b.time ? ' às ' + b.time : ''}`,
    encontro ? `🚩 Encontro: ${encontro}` : '',
    `👥 ${b.pax} pessoa${+b.pax > 1 ? 's' : ''}`,
    falta > 0 ? `💶 No dia: ${eur(falta)}, em euro, em dinheiro` : '',
    /* 27/10: o kit da viagem (vouchers, encontro, tudo) — o link curto, se ela já mandou o kit */
    (typeof Kit !== 'undefined' && Kit.urlConhecida(String(b.email || b.whats || b.name || '').toLowerCase())) ? '🎟 O kit da sua viagem (vouchers e tudo): ' + Kit.urlConhecida(String(b.email || b.whats || b.name || '').toLowerCase()) : '',
    '',
    'Qualquer imprevisto, me chama aqui. Até lá!',
  ];
  return linhas.filter((l, i) => l !== '' || (linhas[i - 1] !== '' && i > 0)).join('\n');
}

/* tudo que acontece num dia, no formato da linha do tempo */
function hjItensDoDia(d, C) {
  const out = [];
  for (const b of C.res) if (b.date === d) {
    const x = Tours.get(b.tourId) || {};
    const g = typeof Equipe !== 'undefined' && Equipe.deQuem ? Equipe.deQuem(b.id) : null;
    const due = Bookings.due(b);
    out.push({ k: x.type === 'transfer' ? 'transfer' : 'passeio', hora: b.time || '', fim: b.time && x.id ? agSomaHora(b.time, agDuracaoMin(x)) : '',
      titulo: `${hjTourNome(b)} · ${hjPrim(b.name)}`, b,
      sub: [`${b.pax} pessoa${+b.pax > 1 ? 's' : ''}`, x.meeting ? noIdioma(x.meeting) : '', due > 0 ? `recebe no dia ${eur(due)}` : 'pago', g ? 'guia: ' + g.nome : ''] });
  }
  for (const o of Tarefas.doDia(d)) {
    const m = agMarcaTarefa(o.x);
    const k = m === 'transfer' ? 'transfer' : m === 'tour' ? 'passeio' : (o.x.tipo === 'compromisso' ? 'compromisso' : o.x.tipo === 'anotacao' ? 'anotacao' : 'tarefa');
    out.push({ k, hora: o.x.hora || '', fim: o.x.horaFim || '', titulo: o.x.texto, tarefa: o,
      sub: [o.x.nota ? String(o.x.nota).replace(/\s+/g, ' ').slice(0, 90) : '', o.x.area === 'pessoal' ? 'pessoal' : '', o.x.prioridade === 'alta' ? 'importante' : ''] });
  }
  if (typeof GCal !== 'undefined' && GCal.ligada && GCal.ligada()) for (const e of GCal.eventosDoDia(d))
    out.push({ k: 'google', hora: e.hora || '', fim: e.horaFim || '', titulo: e.titulo, sub: [e.local || ''] });
  for (const a of C.aniv) if (a.dia === d) out.push({ k: 'aniver', hora: '', titulo: 'Aniversário de ' + hjPrim(a.nome), sub: [a.nome], chave: a.chave });
  for (const f of C.fat) if (f.vencimento === d && f.status !== 'paga') {
    const T = Fatura.totais(f);
    out.push({ k: 'fatura', hora: '', titulo: `Fatura #${f.num} vence · ${f.para.nome || ''}`, sub: [typeof fatDin === 'function' ? fatDin(T.totalMoeda, f.moeda) : ''], fatura: f });
  }
  for (const r of C.rot) if (r.ini === d) out.push({ k: 'roteiro', hora: '', titulo: `Chega: ${r.cliente.nome || 'cliente'}`, sub: [`roteiro ${r.num}`, r.dias.length > 1 ? r.dias.length + ' dias' : ''], roteiro: r });
  return out.sort((a, b) => (a.hora ? 1 : 0) - (b.hora ? 1 : 0) || String(a.hora).localeCompare(String(b.hora)));
}

function hjAcoes(it) {
  const a = [];
  if (it.b) {
    const b = it.b;
    if (b.whats) a.push(`<a class="tfB" target="_blank" rel="noopener" href="${esc(waLink(hjLembrete(b), hjFone(b.whats)))}">${HJ_IC.whats}Lembrete</a>`);
    if (typeof voBotao === 'function') a.push(voBotao(b.id).replace('class="mini"', 'class="tfB"'));
    a.push(`<a class="tfB" href="#/adm/clients/${encodeURIComponent(hjChave(b))}">${HJ_IC.ficha}Ficha</a>`);
  }
  if (it.tarefa) {
    const o = it.tarefa;
    if (o.x.tipo !== 'anotacao') a.push(`<button type="button" class="tfB" data-hjfeita="${esc(o.x.id)}" data-dia="${esc(o.dia || '')}">${HJ_IC.check}${o.feita ? 'Desfazer' : 'Feita'}</button>`);
    a.push(`<button type="button" class="tfB" data-hjedita="${esc(o.x.id)}">${AG_IC.lapis}Editar</button>`);
  }
  if (it.fatura) a.push(`<a class="tfB" href="#/adm/fatdoc/${encodeURIComponent(it.fatura.id)}">${HJ_IC.ficha}Abrir</a>`);
  if (it.roteiro) a.push(`<a class="tfB" href="#/adm/roteiros/${encodeURIComponent(it.roteiro.id)}">${HJ_IC.ficha}Roteiro</a>`);
  if (it.chave) a.push(`<a class="tfB" href="#/adm/clients/${encodeURIComponent(it.chave)}">${HJ_IC.ficha}Ficha</a>`);
  return a.length ? `<div class="hjr-a">${a.join('')}</div>` : '';
}
function hjLinha(it, passou, rotulo) {
  const T = HJ_TIPO[it.k] || HJ_TIPO.tarefa;
  const ic = it.k === 'transfer' ? AG_IC.carro : it.k === 'passeio' ? '<i class="hjPt"></i>' : '';
  const feita = it.tarefa && it.tarefa.feita;
  return `<div class="hjr ${passou ? 'passou' : ''} ${feita ? 'feita' : ''}" style="--tc:${T.cor}">
    <div class="hjr-h">${rotulo ? esc(rotulo) : it.hora ? esc(it.hora) + (it.fim ? `<small>${esc(it.fim)}</small>` : '') : '<small>o dia</small>'}</div><div class="hjr-bar"></div>
    <div class="hjr-tx"><div class="hjr-t">${ic}<span>${esc(it.titulo)}</span></div>
      <div class="hjr-s"><span class="hjTag">${esc(T.nome)}</span>${it.sub.filter(Boolean).map(v => `<span>${esc(v)}</span>`).join('')}</div>${hjAcoes(it)}</div></div>`;
}
function hjBlocoDia(d, rotulo, C, destaque) {
  const it = hjItensDoDia(d, C), eHoje = d === C.hoje, agora = hjAgora();
  let html = '', posto = false;
  for (const x of it) {
    const passou = eHoje && !!x.hora && x.hora < agora;
    if (eHoje && !posto && x.hora && x.hora >= agora) { html += `<div class="hjAgora">agora · ${agora}</div>`; posto = true; }
    html += hjLinha(x, passou, '');
  }
  if (eHoje && !posto && it.some(x => x.hora)) html += `<div class="hjAgora">agora · ${agora}</div>`;
  const n = (k) => it.filter(x => x.k === k).length;
  const resumo = [n('passeio') ? n('passeio') + ' tour' + (n('passeio') > 1 ? 's' : '') : '', n('transfer') ? n('transfer') + ' transfer' : '',
    (n('tarefa') + n('compromisso')) ? (n('tarefa') + n('compromisso')) + ' tarefa' + (n('tarefa') + n('compromisso') > 1 ? 's' : '') : '', n('google') ? n('google') + ' no Google' : ''].filter(Boolean).join(' · ');
  return `<section class="hjDia ${destaque ? 'hoje' : ''}" id="hjd-${d}"><div class="hjDia-h"><b>${esc((rotulo ? rotulo + ' · ' : '') + hjNomeDia(d))}</b><small>${esc(resumo || 'nada marcado')}</small></div>
    ${it.length ? html : `<p class="hjVazio">${eHoje ? 'Dia livre. Bom para adiantar o que está atrasado ou o de amanhã.' : 'Nada marcado.'}</p>`}</section>`;
}
/* a faixa dos próximos 14 dias: toque e vai para o dia */
function hjFaixa(C) {
  return `<div class="hjFaixa" role="list" aria-label="Próximos 14 dias">${Array.from({ length: 14 }, (_, i) => {
    const d = addDays(C.hoje, i), dt = new Date(d + 'T12:00:00'), it = hjItensDoDia(d, C);
    const nT = it.filter(x => x.k === 'passeio').length, nC = it.filter(x => x.k === 'transfer').length, nF = it.filter(x => ['tarefa', 'compromisso'].includes(x.k)).length, nG = it.filter(x => x.k === 'google').length, nO = it.filter(x => ['aniver', 'fatura', 'roteiro'].includes(x.k)).length;
    const mk = `${'<i class="mk-t"></i>'.repeat(Math.min(nT, 3))}${nC ? AG_IC.carro : ''}${nF ? '<i class="mk-f"></i>' : ''}${nG ? '<i class="mk-g"></i>' : ''}${nO ? '<i class="mk-o"></i>' : ''}`;
    return `<button type="button" role="listitem" class="hjD ${i === 0 ? 'hoje' : ''} ${dt.getDay() === 0 || dt.getDay() === 6 ? 'fim' : ''}" data-hjdia="${d}" aria-label="${esc(hjNomeDia(d))}${it.length ? ', ' + it.length + ' marcado' + (it.length > 1 ? 's' : '') : ', livre'}">
      <small>${i === 0 ? 'hoje' : i === 1 ? 'amanhã' : HJ_DIA[dt.getDay()].slice(0, 3).toLowerCase()}</small><b>${dt.getDate()}</b><span class="agmk">${mk}</span></button>`;
  }).join('')}</div>`;
}

/* cartões (o jeito da Bia): só aparece o que tem alguma coisa — menos o "Amanhã", que sempre aparece */
function hjCartao(ic, tit, n, corpo, extra) { return `<section class="hjc"><h3><span class="hjcIc">${ic}</span>${esc(tit)}${n ? ` <span class="pill warn">${n}</span>` : ''}</h3>${corpo}${extra || ''}</section>`; }
function hjItem(ic, tit, sub, acoes) { return `<div class="hjci"><span class="hjciIc">${ic}</span><div class="hjciTx"><b>${tit}</b>${sub ? `<small>${sub}</small>` : ''}${acoes ? `<div class="hjr-a">${acoes}</div>` : ''}</div></div>`; }

function hjBoasVindas() {
  const pv = DB.privado || {};
  if (pv.hojeBoasVindas) return '';
  const passo = (n, t1, t2, id) => `<button type="button" class="hjBvP" id="${id}"><span>${n}</span><b>${t1}</b><small>${t2}</small></button>`;
  return `<section class="hjBv" id="hjBv"><button type="button" class="hjBvX" id="hjBvX" aria-label="Fechar">×</button>
    <h2>Bem-vinda ao seu painel, ${esc((typeof guiaNome === 'function' && guiaNome()) || 'Mari')}!</h2>
    <p>Aqui é o seu lado — o painel onde você comanda tudo. Só você entra: os seus clientes, as suas reservas e os seus números moram aqui.</p>
    <div class="hjBvG">${passo(1, 'Veja os seus tours', 'Toque para ajustar texto, fotos e datas.', 'hjBv1')}${passo(2, 'Fale com o assistente', 'O botão no canto. Peça em voz ou por escrito — ele mostra antes de gravar.', 'hjBv2')}${passo(3, 'Veja o que o cliente vê', 'Abre a primeira tela do app, do jeito do cliente.', 'hjBv3')}</div>
    <button type="button" class="cta" id="hjBvOk">Vamos começar ✨</button></section>`;
}

function admHojeMari() {
  agCss(); hjCss();
  if (temNuvem() && !(typeof painelTrancado === 'function' ? painelTrancado() : DB.settings.authRequired) && !isLoggedIn() && !admHojeMari._asked) {
    admHojeMari._asked = true;
    setTimeout(() => { if (confirm(t('protectWhy') + '\n\n' + t('protectNow') + '?')) go('/login'); }, 900);
  }
  const hoje = agHoje(), amanha = addDays(hoje, 1), ate30 = addDays(hoje, 30);
  const vivas = Bookings.all().filter(b => b.status === 'confirmed');
  const C = {
    hoje, res: vivas.filter(b => b.date >= addDays(hoje, -1) && b.date <= ate30),
    aniv: typeof agAniversarios === 'function' ? agAniversarios(hoje, 30) : [],
    fat: typeof Fatura !== 'undefined' ? Fatura.all() : [],
    rot: typeof Roteiro !== 'undefined' ? Roteiro.all() : [],
  };
  const G = Tarefas.grupos(hoje);
  const late = vivas.filter(b => Bookings.due(b) > 0 && Bookings.dueDate(b) < hoje);
  const fatVencidas = C.fat.filter(f => typeof Fatura.vencida === 'function' && Fatura.vencida(f));
  const atrasados = [...G.atrasadas.map(o => ({ k: o.x.tipo === 'compromisso' ? 'compromisso' : 'tarefa', hora: '', titulo: o.x.texto, tarefa: o, sub: [o.dia ? 'era ' + hjDt(o.dia) : ''], dia: o.dia })),
    ...fatVencidas.map(f => ({ k: 'fatura', titulo: `Fatura #${f.num} vencida · ${f.para.nome || ''}`, sub: ['venceu ' + hjDt(f.vencimento)], fatura: f, dia: f.vencimento })),
    ...late.map(b => ({ k: 'passeio', titulo: `Pagamento atrasado · ${hjPrim(b.name)}`, sub: [hjTourNome(b), 'falta ' + eur(Bookings.due(b))], b, dia: Bookings.dueDate(b) }))];
  const itHoje = hjItensDoDia(hoje, C);
  const recebeHoje = vivas.filter(b => b.date === hoje).reduce((s, b) => s + Bookings.due(b), 0);
  const sete = vivas.filter(b => b.date > hoje && b.date <= addDays(hoje, 7));
  const tarefas7 = Array.from({ length: 7 }, (_, i) => Tarefas.doDia(addDays(hoje, i + 1)).filter(o => ['tour', 'transfer'].includes(agMarcaTarefa(o.x)))).flat();
  const h = new Date().getHours();
  const ola = (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + ', ' + esc((typeof guiaNome === 'function' && guiaNome()) || 'Mari') + '.';
  const nHojeTours = itHoje.filter(x => ['passeio', 'transfer'].includes(x.k)).length, nHojeTf = itHoje.filter(x => ['tarefa', 'compromisso'].includes(x.k) && !(x.tarefa && x.tarefa.feita)).length;
  const resumo = [nHojeTours ? `${nHojeTours} tour${nHojeTours > 1 ? 's' : ''} ou transfer hoje` : 'nenhum tour hoje', nHojeTf ? `${nHojeTf} tarefa${nHojeTf > 1 ? 's' : ''}` : '', recebeHoje ? `receber ${eur(recebeHoje)} no dia` : ''].filter(Boolean).join(' · ');

  /* ---------- a agenda (TI ARTES) ---------- */
  const proximos = [];
  for (let i = 2; i <= 30; i++) { const d = addDays(hoje, i); if (hjItensDoDia(d, C).length) proximos.push(d); }
  const nProx = proximos.reduce((s, d) => s + hjItensDoDia(d, C).length, 0);
  const agenda = `<div class="hjSecT"><h2>Sua agenda</h2><a class="mini" href="#/adm/agenda">Abrir o calendário →</a></div>
    ${hjFaixa(C)}
    ${atrasados.length ? `<details class="hjDia hjAtr"><summary><span class="pill bad">${atrasados.length} atrasado${atrasados.length > 1 ? 's' : ''}</span><small>toque para ver, dar baixa ou cobrar</small></summary>${atrasados.map(x => hjLinha(x, false, hjDt(x.dia))).join('')}</details>` : ''}
    ${hjBlocoDia(hoje, 'Hoje', C, true)}
    ${hjBlocoDia(amanha, 'Amanhã', C, false)}
    ${proximos.length ? `<details class="hjProx" id="hjProx"><summary class="hjProxT">Próximos 30 dias · ${nProx} marcado${nProx > 1 ? 's' : ''}</summary>${proximos.map(d => hjBlocoDia(d, '', C, false)).join('')}</details>` : ''}
    <details class="agDiaAdd" style="margin-top:4px"><summary class="cta sm" style="display:inline-flex;cursor:pointer">+ Anotar</summary><div id="hjForm" style="margin-top:10px">${agFormHtml(null, hoje)}</div></details>`;

  /* ---------- os cartões (Bia) ---------- */
  const cards = [];
  /* 1. Amanhã — lembretes de véspera (sempre) */
  const am = vivas.filter(b => b.date === amanha).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const amTf = Tarefas.doDia(amanha).filter(o => ['tour', 'transfer'].includes(agMarcaTarefa(o.x)));
  const prox14 = vivas.filter(b => b.date > amanha && b.date <= addDays(hoje, 14)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const lemb = (b) => b.whats ? `<a class="tfB" target="_blank" rel="noopener" href="${esc(waLink(hjLembrete(b), hjFone(b.whats)))}">${HJ_IC.whats}Mandar lembrete</a>` : '<span class="why">sem WhatsApp na reserva</span>';
  cards.push(hjCartao('🔔', 'Amanhã — lembretes de véspera', 0,
    (am.length || amTf.length ? '' : '<p class="empty">Nenhum tour amanhã.</p>') +
    am.map(b => hjItem((Tours.get(b.tourId) || {}).type === 'transfer' ? AG_IC.carro : '<i class="hjPt"></i>', `${esc(b.time || '')} · ${esc(hjPrim(b.name))} · ${esc(hjTourNome(b))}`, `${b.pax} pessoa${+b.pax > 1 ? 's' : ''}${Bookings.due(b) > 0 ? ' · recebe no dia ' + eur(Bookings.due(b)) : ' · pago'}`,
      lemb(b) + (typeof voBotao === 'function' ? voBotao(b.id).replace('class="mini"', 'class="tfB"') : '') + `<a class="tfB" href="#/adm/clients/${encodeURIComponent(hjChave(b))}">${HJ_IC.ficha}Ficha</a>`)).join('') +
    amTf.map(o => hjItem(agMarcaTarefa(o.x) === 'transfer' ? AG_IC.carro : '<i class="hjPt"></i>', `${esc(o.x.hora || '')}${o.x.hora ? ' · ' : ''}${esc(o.x.texto)}`, 'anotado como tarefa', '')).join('') +
    (prox14.length ? `<p class="hjMini">Próximos tours</p>${prox14.slice(0, 5).map(b => hjItem('📅', `${hjDt(b.date)} · ${esc(hjPrim(b.name))}`, `${esc(hjTourNome(b))}${b.time ? ' · ' + esc(b.time) : ''}`, b.whats ? `<a class="tfB" target="_blank" rel="noopener" href="${esc(waLink(hjLembrete(b), hjFone(b.whats)))}">${HJ_IC.whats}Lembrete</a>` : '')).join('')}` : ''),
    '<p class="why">A mensagem já vem pronta: o dia, o horário, o ponto de encontro e o que fica para pagar no dia, em euro.</p>'));
  /* 2. Quem pagou (7 dias) */
  const pagos = [];
  for (const b of Bookings.all()) for (const p of (b.payments || [])) { const d = String(p.date || '').slice(0, 10); if (d && d >= addDays(hoje, -7)) pagos.push({ b, p, d }); }
  pagos.sort((a, b) => b.d.localeCompare(a.d));
  if (pagos.length) cards.push(hjCartao('💶', 'Quem pagou', pagos.length, pagos.slice(0, 6).map(({ b, p, d }) => hjItem('✓', `${esc(b.name)} · ${eur(p.amount)}`, `${esc(hjTourNome(b))} · ${hjDt(d)}${p.method ? ' · ' + esc(p.method) : ''}`, `<a class="tfB" href="#/adm/clients/${encodeURIComponent(hjChave(b))}">${HJ_IC.ficha}Ficha</a>`)).join(''), '<p class="why">Cada pagamento já está na ficha do cliente.</p>'));
  /* 3. Pedidos esperando resposta */
  const pedidos = (DB.pedidos || []).filter(p => !p.respondido);
  if (pedidos.length) cards.push(hjCartao('✳️', 'Pedidos esperando resposta', pedidos.length, pedidos.slice(0, 6).map(p => hjItem(p.tipo === 'mudanca' ? '🏠' : '🙋', `${esc(p.nome || 'Cliente')} <span class="tag">${p.tipo === 'mudanca' ? 'Mudança' : 'Personalize'}</span>`,
    esc([p.quando || (p.ini ? hjDt(p.ini) + (p.fim ? ' a ' + hjDt(p.fim) : '') : ''), p.pessoas ? p.pessoas + ' pessoa(s)' : '', (p.gostos || []).slice(0, 3).join(', ')].filter(Boolean).join(' · ')),
    `${p.whats ? `<a class="tfB" target="_blank" rel="noopener" href="${esc(waLink('Oi, ' + hjPrim(p.nome) + '! Aqui é a Mari, do Tour na Dinamarca. Recebi o seu pedido e já estou montando a sua proposta. ', hjFone(p.whats)))}">${HJ_IC.whats}Responder</a>` : ''}${typeof Orc !== 'undefined' && p.tipo !== 'mudanca' ? `<button type="button" class="tfB" data-porc="${esc(p.id)}">Orçamento</button>` : ''}${typeof Roteiro !== 'undefined' && p.tipo !== 'mudanca' ? `<button type="button" class="tfB" data-prot="${esc(p.id)}">Roteiro</button>` : ''}<button type="button" class="tfB" data-resp="${esc(p.id)}">${HJ_IC.check}Respondido</button>`)).join('')));
  /* 4. Sinal pendente */
  const semSinal = vivas.filter(b => b.date >= hoje && +b.total > 0 && typeof mariSinalFalta === 'function' && typeof mariEhSinal === 'function' && mariEhSinal(b) && mariSinalFalta(b) > 0 && String(b.createdAt || '').slice(0, 10) < hoje);
  if (semSinal.length) cards.push(hjCartao('🔗', 'Sinal ainda não pago', semSinal.length, semSinal.slice(0, 6).map(b => {
    const v = mariSinalFalta(b), link = typeof linkPagamento === 'function' ? linkPagamento(b, v) : '';
    const msg = `Oi, ${hjPrim(b.name)}! Para garantir o seu ${hjTourNome(b)} no dia ${hjDt(b.date)}, falta o sinal de ${eur(v)}. É só pagar por aqui: ${link}`;
    return hjItem('⏳', `${esc(b.name)} · sinal de ${eur(v)}`, `${esc(hjTourNome(b))} · ${hjDt(b.date)}`, `${b.whats ? `<a class="tfB" target="_blank" rel="noopener" href="${esc(waLink(msg, hjFone(b.whats)))}">${HJ_IC.whats}Mandar o link</a>` : ''}<a class="tfB" href="#/adm/clients/${encodeURIComponent(hjChave(b))}">${HJ_IC.ficha}Ficha</a>`);
  }).join('')));
  /* 5. Orçamentos em aberto */
  const orcs = typeof Orc !== 'undefined' ? Orc.all().filter(o => o.status === 'enviado' || o.status === 'rascunho') : [];
  if (orcs.length) cards.push(hjCartao('📄', 'Orçamentos em aberto', orcs.length, orcs.slice(-6).reverse().map(o => {
    const T = Orc.totais(o);
    return hjItem(o.status === 'enviado' ? '📨' : '✏️', `${esc(o.num)} · ${esc(o.cliente.nome || '')}`, `${o.status === 'enviado' ? 'enviado — esperando resposta' : 'rascunho'}${T.total ? ' · ' + eur(T.total) : ''}`, `<a class="tfB" href="#/adm/orcamentos/${encodeURIComponent(o.id)}">${AG_IC.lapis}Abrir</a>`);
  }).join('')));
  /* 6. Faturas */
  const fatMandar = C.fat.filter(f => f.status === 'emitida' && !(typeof Fatura.vencida === 'function' && Fatura.vencida(f)));
  if (fatMandar.length || fatVencidas.length) cards.push(hjCartao('🧾', 'Faturas', fatMandar.length + fatVencidas.length, [...fatVencidas, ...fatMandar].slice(0, 6).map(f => {
    const T = Fatura.totais(f), venc = fatVencidas.includes(f);
    return hjItem(venc ? '⚠️' : '🧾', `#${esc(f.num)} · ${esc(f.para.nome || '')} · ${typeof fatDin === 'function' ? fatDin(T.totalMoeda, f.moeda) : ''}`, venc ? `vencida em ${hjDt(f.vencimento)} — cobrar` : `para mandar · vence ${hjDt(f.vencimento)}`, `<a class="tfB" href="#/adm/fatdoc/${encodeURIComponent(f.id)}">${HJ_IC.ficha}Abrir</a>`);
  }).join('')));
  /* 7. Roteiros */
  const rots = C.rot.filter(r => r.status !== 'enviado' && r.dias.some(d => d.paradas.length));
  const chegando = C.rot.filter(r => r.ini && r.ini >= hoje && r.ini <= addDays(hoje, 14));
  if (rots.length || chegando.length) cards.push(hjCartao('🗺️', 'Roteiros', rots.length, [...rots.slice(0, 4).map(r => hjItem('✏️', `${esc(r.num)} · ${esc(r.cliente.nome || '')}`, `pronto para mandar? ${r.dias.length} dia${r.dias.length > 1 ? 's' : ''}`, `<a class="tfB" href="#/adm/roteiros/${encodeURIComponent(r.id)}">${AG_IC.lapis}Abrir</a>`)),
    ...chegando.filter(r => !rots.includes(r)).slice(0, 3).map(r => hjItem('🛬', `${esc(r.cliente.nome || '')} chega ${hjDt(r.ini)}`, `roteiro ${esc(r.num)} · ${r.status}`, `<a class="tfB" href="#/adm/roteiros/${encodeURIComponent(r.id)}">${HJ_IC.ficha}Ver</a>`))].join('')));
  /* 8. Equipe: quem guia nos próximos 7 dias */
  const temEquipe = typeof Equipe !== 'undefined' && Equipe.ativos && Equipe.ativos().length;
  if (temEquipe && sete.length) {
    const linhas = sete.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 6).map(b => { const g = Equipe.deQuem(b.id); return hjItem(g ? '👤' : '•', `${hjDt(b.date)} · ${esc(hjTourNome(b))}`, g ? 'guia: ' + esc(g.nome) : 'você mesma (ninguém da equipe)', ''); }).join('');
    cards.push(hjCartao('👥', 'Equipe — próximos 7 dias', 0, linhas, `<div class="hjr-a" style="margin-top:8px"><a class="tfB" href="#/adm/equipe">Equipe e escala →</a></div>`));
  }
  /* 9. Brindes */
  const semBrinde = typeof brindesPendentes === 'function' ? brindesPendentes() : [];
  if (semBrinde.length) cards.push(hjCartao('🎁', 'Brindes para mandar', semBrinde.length, semBrinde.slice(0, 5).map(c => hjItem('🎁', esc(c.nome), esc(c.motivo || ''), `<a class="tfB" href="#/adm/coupons">Mandar</a>`)).join('')));
  /* 10. Aniversários */
  const aniv7 = C.aniv.filter(a => a.dia <= addDays(hoje, 7));
  if (aniv7.length) cards.push(hjCartao('🎂', 'Aniversários', aniv7.length, aniv7.map(a => hjItem('🎂', esc(a.nome), a.dia === hoje ? 'hoje!' : hjNomeDia(a.dia), `<a class="tfB" href="#/adm/clients/${encodeURIComponent(a.chave)}">${HJ_IC.ficha}Ficha</a>`)).join('')));
  /* 11. Para ligar tudo */
  const lig = typeof ligarItens === 'function' ? ligarItens().filter(x => !x.feito) : [];
  if (lig.length) cards.push(hjCartao('🔌', 'Para ligar tudo', lig.length, `<p class="why" style="margin:2px 0 8px">Falta${lig.length > 1 ? 'm' : ''}: ${esc(lig.slice(0, 4).map(x => x.tit).join(' · '))}${lig.length > 4 ? '…' : ''}</p>`, `<div class="hjr-a"><a class="tfB" href="#/adm/settings">Ver em Ajustes →</a></div>`));

  /* ---------- os números do topo ---------- */
  const k = (n, rot, alvo, cls) => `<button type="button" class="hjk ${cls || ''}" data-hjvai="${alvo}"><b>${n}</b><small>${rot}</small></button>`;
  const nums = `<div class="hjK">${k(atrasados.length, 'atrasado' + (atrasados.length === 1 ? '' : 's'), 'atr', atrasados.length ? 'bad' : '')}${k(itHoje.length, 'hoje', 'hoje')}${k(sete.length + tarefas7.length, 'tours e transfers · 7 dias', 'prox')}${k(recebeHoje ? eur(recebeHoje) : '—', 'receber hoje, no dia', 'hoje')}</div>`;

  admShell('today', `
    <h1 class="pageh">${ola}</h1>
    <p class="desc lead" style="margin-top:-6px">${esc(fmtDate(hoje))} · ${esc(resumo)}</p>
    ${hjBoasVindas()}
    ${nums}
    <div class="hj2"><div class="hj2-ag">${agenda}</div><div class="hj2-cards">${cards.join('')}</div></div>`);

  /* ---------- ligar os botões ---------- */
  const st = document.getElementById('stage');
  $$('[data-hjdia]', st).forEach(b => b.onclick = () => {
    const d = b.dataset.hjdia, el = document.getElementById('hjd-' + d);
    if (el) { const det = el.closest('details'); if (det) det.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    admAgendaMari._m = d.slice(0, 7); admAgendaMari._d = d; go('/adm/agenda');
  });
  $$('[data-hjvai]', st).forEach(b => b.onclick = () => {
    const alvo = b.dataset.hjvai, el = alvo === 'atr' ? st.querySelector('.hjAtr') : alvo === 'prox' ? document.getElementById('hjProx') : document.getElementById('hjd-' + hoje);
    if (!el) return; if (el.tagName === 'DETAILS') el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $$('[data-hjfeita]', st).forEach(b => b.onclick = () => { const x = Tarefas.get(b.dataset.hjfeita); if (!x) return; const d = b.dataset.dia || x.data; Tarefas.concluir(x.id, !Tarefas.feitaEm(x, d), d); admHojeMari(); });
  $$('[data-hjedita]', st).forEach(b => b.onclick = () => agEditar(b.dataset.hjedita, admHojeMari));
  agLigaForm(document.getElementById('hjForm'), admHojeMari);
  $$('[data-porc]', st).forEach(b => b.onclick = () => {
    const p = (DB.pedidos || []).find(z => z.id === b.dataset.porc); if (!p) return;
    const chave = typeof fichaChavePara === 'function' ? fichaChavePara({ nome: p.nome, whats: p.whats }) : '';
    const o = Orc.novo({ cliente: { nome: p.nome || 'Cliente', chave }, titulo: p.nome || '', ini: p.ini || '', fim: p.fim || '',
      pessoas: [p.adultos ? p.adultos + ' adulto(s)' : '', p.criancas ? p.criancas + ' criança(s)' + (p.idades ? ' (' + p.idades + ')' : '') : ''].filter(Boolean).join(' + '),
      resumo: [...(p.precisaTxt || []), ...(p.kidsTxt || [])].slice(0, 4).join(' · ') });
    go('/adm/orcamentos/' + o.id);
  });
  $$('[data-prot]', st).forEach(b => b.onclick = () => { const r = Roteiro.doPedido(b.dataset.prot); if (r) go('/adm/roteiros/' + encodeURIComponent(r.id)); });
  $$('[data-resp]', st).forEach(b => b.onclick = () => { const p = (DB.pedidos || []).find(z => z.id === b.dataset.resp); if (p) { p.respondido = new Date().toISOString(); save(); admHojeMari(); } });
  if (typeof voLigaBotoes === 'function') voLigaBotoes(st);
  const bv = document.getElementById('hjBv');
  if (bv) {
    const fecha = () => { DB.privado = DB.privado || {}; DB.privado.hojeBoasVindas = new Date().toISOString(); save(); bv.remove(); };
    document.getElementById('hjBvX').onclick = fecha; document.getElementById('hjBvOk').onclick = fecha;
    document.getElementById('hjBv1').onclick = () => { fecha(); go('/adm/tours'); };
    document.getElementById('hjBv2').onclick = () => { fecha(); if (typeof iaAbre === 'function') iaAbre(); };
    document.getElementById('hjBv3').onclick = () => { fecha(); go('/'); };
  }
  /* os compromissos do Google deste mês e do próximo (uma vez a cada 10 min) */
  if (typeof GCal !== 'undefined' && GCal.ligada() && GCal.cfg().lerEventos !== false && !admHojeMari._lendo) {
    const meses = [...new Set([hoje.slice(0, 7), ate30.slice(0, 7)])].filter(m => { const c = GCal.eventosDoCache()[m]; return !c || Date.now() - c.em > 600000; });
    if (meses.length) {
      admHojeMari._lendo = true;
      Promise.all(meses.map(m => GCal.lerMes(m))).then(() => { admHojeMari._lendo = false; if (/^#\/adm\/?(today)?\/?$/.test(location.hash) && typeof redesenhaSuave === 'function') redesenhaSuave(true); })
        .catch(() => { admHojeMari._lendo = false; });
    }
  }
  if (typeof Coach !== 'undefined') Coach.start([
    { sel: '#nb-tarefas', txt: { pt: 'Tarefas e anotações, de trabalho e pessoais. Com dia, entram na Agenda e no seu Google Agenda.', en: 'Work and personal tasks and notes. With a date, they go to your Agenda and Google Calendar.' } },
    { sel: '#nb-bookings', txt: { pt: 'Cada reserva aparece aqui: quem pagou tudo, quem pagou o sinal, quem paga no dia.', en: 'Every booking lands here: paid in full, deposit only, or paying on the day.' } },
    { sel: '#viewSite', txt: { pt: 'A qualquer momento, veja o site exatamente como o cliente vê.', en: 'At any time, see the site exactly as your guest does.' } },
  ], 'tutorialAdm');
}

const HJ_IC = {
  whats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 19.5l1.2-3.6A7.5 7.5 0 1 1 8.6 18.6z"/><path d="M9.2 9.3c.3 1.8 1.6 3.6 3.6 4.6l1.2-1 1.6.8c-.2 1-.9 1.6-1.9 1.6-2.9-.3-5.5-2.9-5.8-5.8 0-1 .6-1.7 1.6-1.9l.8 1.6z"/></svg>',
  ficha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

function hjCss() {
  if (document.getElementById('hjCss')) return;
  const s = document.createElement('style'); s.id = 'hjCss';
  s.textContent = `
  .hjK{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 18px}
  .hjk{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px 16px;cursor:pointer;color:var(--ink);font:inherit}
  .hjk b{font:800 24px/1 var(--f-display);font-variant-numeric:tabular-nums}
  .hjk small{color:var(--ink-3);font-size:12.5px;line-height:1.3}
  .hjk.bad b{color:var(--danger)}
  .hjk:hover{border-color:var(--line-2)}
  .hj2{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;align-items:start}
  .hjSecT{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}
  .hjSecT h2{font:700 19px/1.2 var(--f-display);margin:0}
  .hjFaixa{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(50px,1fr);gap:6px;overflow-x:auto;padding:2px 2px 8px;margin-bottom:10px;scrollbar-width:thin}
  .hjD{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 2px 7px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);cursor:pointer;font:inherit}
  .hjD small{font:600 10.5px/1 var(--f-ui);text-transform:lowercase;color:var(--ink-3)}
  .hjD b{font:700 16px/1 var(--f-ui);font-variant-numeric:tabular-nums}
  .hjD.fim{background:var(--surface-2)}
  .hjD.hoje{background:var(--brand-primaria,#1D2A44);border-color:var(--brand-primaria,#1D2A44);color:#fff}
  .hjD.hoje small{color:rgba(255,255,255,.75)}
  .hjD.hoje .agmk svg{color:#fff}
  .agmk .mk-o{width:6px;height:6px;border-radius:50%;background:#E879A6}
  .hjDia{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:12px 16px;margin-bottom:12px}
  .hjDia.hoje{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
  .hjDia-h{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px}
  .hjDia-h b{font:700 15px/1.3 var(--f-display)}
  .hjDia-h small{color:var(--ink-3);font-size:12.5px}
  .hjAtr > summary{display:flex;align-items:center;gap:10px;cursor:pointer;list-style:none;padding:2px 0}
  .hjAtr > summary::-webkit-details-marker{display:none}
  .hjAtr > summary small{color:var(--ink-3)}
  .hjAtr[open] > summary{margin-bottom:6px}
  .hjr{display:grid;grid-template-columns:52px 4px minmax(0,1fr);gap:10px;padding:10px 0;border-top:1px solid var(--line)}
  .hjDia-h + .hjr,.hjDia-h + .hjAgora + .hjr,summary + .hjr{border-top:0}
  .hjr-h{font:600 13px/1.2 var(--f-mono);color:var(--ink);display:flex;flex-direction:column;gap:2px;padding-top:1px}
  .hjr-h small{font:500 11px/1 var(--f-mono);color:var(--ink-3)}
  .hjr-bar{border-radius:4px;background:var(--tc)}
  .hjr-t{display:flex;gap:7px;align-items:center;font-weight:650;color:var(--ink);line-height:1.3}
  .hjr-t svg{width:16px;height:16px;flex:none;color:var(--ink)}
  .hjPt{width:9px;height:9px;border-radius:50%;background:#F2C230;flex:none;display:inline-block;box-shadow:0 0 0 1px rgba(0,0,0,.12)}
  .hjr-s{display:flex;flex-wrap:wrap;gap:3px 10px;color:var(--ink-3);font-size:12.5px;margin-top:4px;align-items:center}
  .hjTag{font:700 10px/1 var(--f-ui);letter-spacing:.07em;text-transform:uppercase;padding:4px 7px;border-radius:999px;background:var(--surface-2);color:var(--ink-2);box-shadow:inset 3px 0 0 var(--tc)}
  .hjr-a{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .hjr-a .tfB,.hjr-a .mini{min-height:32px}
  .hjr.passou{opacity:.55}
  .hjr.feita .hjr-t span{text-decoration:line-through;opacity:.6}
  .hjAgora{display:flex;align-items:center;gap:8px;margin:2px 0;color:var(--danger);font:700 11px/1 var(--f-mono);letter-spacing:.04em}
  .hjAgora::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--danger)}
  .hjAgora::after{content:"";flex:1;height:1px;background:var(--danger);opacity:.5}
  .hjVazio{color:var(--ink-3);margin:6px 0 2px;font-size:14px}
  .hjProx{margin-bottom:12px}
  .hjProx > summary{cursor:pointer;list-style:none;font:700 11px/1 var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);padding:6px 2px 10px}
  .hjProx > summary::-webkit-details-marker{display:none}
  .hjProx > summary::after{content:" ▾"}
  .hjProx[open] > summary::after{content:" ▴"}
  .hjc{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px 16px;margin-bottom:12px}
  .hjc h3{display:flex;align-items:center;gap:8px;font:700 15.5px/1.3 var(--f-display);margin:0 0 6px}
  .hjcIc{font-size:17px;line-height:1}
  .hjci{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line)}
  .hjc h3 + .hjci,.hjc h3 + p + .hjci{border-top:0}
  .hjciIc{width:30px;height:30px;flex:none;border-radius:50%;background:var(--surface-2);display:grid;place-items:center;font-size:14px;color:var(--ink)}
  .hjciIc svg{width:16px;height:16px}
  .hjciTx{min-width:0;flex:1}
  .hjciTx b{display:block;font-weight:650;line-height:1.3}
  .hjciTx small{display:block;color:var(--ink-3);font-size:12.5px;margin-top:2px;line-height:1.35}
  .hjMini{margin:12px 0 2px;font:700 10.5px/1 var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
  .hjBv{position:relative;background:var(--surface);border:2px solid var(--accent);border-radius:20px;padding:22px 22px 18px;margin:12px 0 4px;text-align:center}
  .hjBv h2{font:800 22px/1.2 var(--f-display);margin:0 0 6px;color:var(--ink);padding:0 30px}
  .hjBv > p{color:var(--ink-2);max-width:56ch;margin:0 auto 14px}
  .hjBvX{position:absolute;top:10px;right:12px;border:0;background:transparent;font-size:22px;color:var(--ink-3);cursor:pointer}
  .hjBvG{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px;text-align:left}
  .hjBvP{display:grid;grid-template-columns:28px 1fr;gap:2px 10px;align-items:start;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);cursor:pointer;font:inherit;color:var(--ink);text-align:left}
  .hjBvP span{grid-row:1 / span 2;width:26px;height:26px;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-weight:800;font-size:13px}
  .hjBvP small{color:var(--ink-3);font-size:12.5px;line-height:1.35}
  @media(max-width:1100px){.hj2{grid-template-columns:1fr}}
  @media(max-width:620px){
    .hjK{grid-template-columns:repeat(2,minmax(0,1fr))}
    .hjBvG{grid-template-columns:1fr}
    .hjr{grid-template-columns:44px 4px minmax(0,1fr);gap:8px}
    .hjDia{padding:12px 12px}
  }`;
  document.head.appendChild(s);
}

admToday = admHojeMari;
window.admHojeMari = admHojeMari;
