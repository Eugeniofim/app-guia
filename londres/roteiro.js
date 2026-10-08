/* =====================================================
   MONTE SEU ROTEIRO — roteiro pago, dia a dia (demo)

   "Isso é para uma pessoa que não tem o roteiro, não tem ideia do que
   fazer… a partir desse questionário isso vai vir para mim e a maquininha
   vai gerar a programação. Eu só vou validar… e isso volta para ela na
   forma de um arquivinho." (17:57–19:51)
   "Antes teria que ter uma forma da pessoa saber o preço por dia de roteiro
   e ela pagar para daí gerar." (29:34)
   "Vai ter a opção só o arquivo ou o arquivo com áudio guiado." (32:30)

   Fluxo: questionário → preço por dia no nível escolhido → paga → o app gera
   o RASCUNHO a partir do banco de pontos dela (pontos.js) → aparece no painel
   (Roteiros) → ela valida/edita → publica → o cliente recebe um LINK PRIVADO
   (#/r/<código>) com os dias, as fotos e o mapa — o
   audioguia. Nada disso aparece na vitrine: é um "passeio oculto".
   ===================================================== */
'use strict';

/* ---------- o que as pessoas pedem (os lugares são sempre os mesmos) ---------- */
const DESTAQUES = [
  { id: 'big-ben', n: 'Big Ben e Parlamento', zona: 'westminster', pts: ['parlamento', 'big-ben'] },
  { id: 'abadia', n: 'Abadia de Westminster', zona: 'westminster', pts: ['abadia'] },
  { id: 'troca-guarda', n: 'Troca da Guarda', zona: 'westminster', pts: ['buckingham', 'troca-guarda'], manha: true },
  { id: 'national-gallery', n: 'National Gallery e Trafalgar', zona: 'westminster', pts: ['trafalgar', 'national-gallery'] },
  { id: 'london-eye', n: 'London Eye e Southbank', zona: 'westminster', pts: ['london-eye'] },
  { id: 'tower-of-london', n: 'Torre de Londres', zona: 'city', pts: ['tower-of-london', 'joias-coroa'] },
  { id: 'tower-bridge', n: 'Tower Bridge', zona: 'city', pts: ['tower-bridge'] },
  { id: 'st-pauls', n: "St. Paul's e Millennium Bridge", zona: 'city', pts: ['st-pauls', 'millennium-bridge'] },
  { id: 'city', n: 'City of London', zona: 'city', pts: ['bank-of-england', 'royal-exchange', 'leadenhall'] },
  { id: 'mirantes', n: 'Mirantes grátis', zona: 'city', pts: ['horizon-22', 'sky-garden'] },
  { id: 'borough-market', n: 'Borough Market', zona: 'city', pts: ['borough-market', 'southwark-cathedral'] },
  { id: 'british-museum', n: 'Museu Britânico', zona: 'bloomsbury', pts: ['british-museum', 'rosetta'] },
  { id: 'plataforma', n: 'Plataforma 9¾', zona: 'bloomsbury', pts: ['plataforma-934', 'st-pancras'] },
  { id: 'covent-garden', n: 'Covent Garden', zona: 'bloomsbury', pts: ['covent-garden', 'neals-yard'] },
  { id: 'compras', n: 'Compras em Mayfair', zona: 'mayfair', pts: ['selfridges', 'bond-street', 'burlington', 'fortnum'] },
  { id: 'harrods', n: 'Harrods e Knightsbridge', zona: 'kensington', pts: ['harrods'] },
  { id: 'hyde-park', n: 'Hyde Park e Kensington', zona: 'kensington', pts: ['hyde-park', 'kensington-palace'] },
  { id: 'nhm', n: 'Museu de História Natural', zona: 'kensington', pts: ['nhm'] },
  { id: 'notting-hill', n: 'Notting Hill e Portobello', zona: 'kensington', pts: ['notting-hill'] },
  { id: 'camden', n: 'Camden e Little Venice', zona: 'camden', pts: ['camden', 'little-venice', 'primrose'] },
  { id: 'greenwich', n: 'Greenwich', zona: 'greenwich', pts: ['cutty-sark', 'naval-college', 'observatorio'], meioDia: true },
  { id: 'harry-potter', n: 'Estúdio Harry Potter', zona: 'harry-potter', pts: ['harry-potter'], meioDia: true },
  { id: 'windsor', n: 'Windsor (bate-volta)', zona: 'windsor', pts: ['windsor-castle', 'long-walk', 'eton'], diaInteiro: true },
  { id: 'oxford-bath', n: 'Oxford, Bath ou Stonehenge', zona: 'fora', pts: ['oxford', 'bath', 'stonehenge'], diaInteiro: true },
];
const INTERESSES = [
  ['historia', 'História'], ['realeza', 'Realeza'], ['arte', 'Arte e museus'], ['moda', 'Moda e compras'], ['comida', 'Gastronomia e pubs'],
  ['harrypotter', 'Harry Potter e cinema'], ['parques', 'Parques'], ['arquitetura', 'Arquitetura'], ['criancas', 'Programa com crianças'], ['musicais', 'Musicais e noite'],
];
const NIVEIS = [
  { id: 'arquivo', n: 'Roteiro dia a dia', sub: 'Link privado + PDF: manhã, tarde e noite de cada dia, com fotos e dicas da guia.' },
  { id: 'mapa', n: 'Roteiro + mapa', sub: 'Tudo do anterior + o mapa de cada dia com as paradas numeradas.' },
];
const ZONA_TITULO = {
  westminster: 'Westminster: o coração político', city: 'City of London e a Torre', bloomsbury: 'Bloomsbury e Covent Garden',
  mayfair: 'Mayfair: compras e tradição', kensington: 'Kensington e Hyde Park', camden: 'Camden e os canais', greenwich: 'Greenwich',
  'harry-potter': 'Estúdio Harry Potter', windsor: 'Windsor', fora: 'Bate-volta fora de Londres',
};
const precoDia = (nivel) => +((DB.settings.precosRoteiro || {})[nivel]) || 0;
const diasEntre = (a, b) => { if (!a || !b || b < a) return 0; return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5) + 1; };

/* =====================================================
   O RASCUNHO AUTOMÁTICO ("a maquininha")
   Agrupa o que a pessoa quer por região (o que fica perto vai junto),
   respeita o ritmo, põe o dia de chegada leve e o de volta curto.
   ===================================================== */
function gerarRascunho(r) {
  const n = Math.max(1, Math.min(14, diasEntre(r.ini, r.fim) || 1));
  const porBloco = r.ritmo === 'calmo' ? 2 : r.ritmo === 'intenso' ? 4 : 3;
  const escolhidos = DESTAQUES.filter(d => (r.querem || []).includes(d.id));
  const inteiros = escolhidos.filter(d => d.diaInteiro);
  const meios = escolhidos.filter(d => d.meioDia);
  const zonas = {};
  escolhidos.filter(d => !d.diaInteiro && !d.meioDia).forEach(d => (zonas[d.zona] = zonas[d.zona] || []).push(d));
  const blocos = [];
  for (const [z, ds] of Object.entries(zonas)) {
    ds.sort((a, b) => (b.manha ? 1 : 0) - (a.manha ? 1 : 0));   /* a Troca da Guarda é de manhã */
    for (let i = 0; i < ds.length; i += porBloco) blocos.push({ zona: z, itens: ds.slice(i, i + porBloco), manha: ds.slice(i, i + porBloco).some(d => d.manha) });
  }
  meios.forEach(d => blocos.push({ zona: d.zona, itens: [d], longe: true }));   /* Greenwich, estúdio HP: fora do centro */
  const dias = [];
  for (let i = 0; i < n; i++) dias.push({ data: addDays(r.ini || isoToday(), i), chegada: i === 0 && n > 1, volta: i === n - 1 && n > 1, periodos: [] });
  /* 1) os de dia inteiro vão nos dias do meio, do fim para o começo */
  const meio = dias.filter(d => !d.chegada && !d.volta);
  inteiros.forEach((d, k) => {
    const dia = meio[meio.length - 1 - k] || null;
    if (dia && !dia.inteiro) { dia.inteiro = true; dia.periodos.push({ p: 'dia', titulo: d.n, itens: d.pts.slice(), zona: d.zona }); }
  });
  /* 2) os blocos nos meios períodos livres */
  const slots = [];
  dias.forEach(d => { if (d.inteiro) return; if (!d.chegada) slots.push({ d, p: 'manha' }); if (!d.volta) slots.push({ d, p: 'tarde' }); });
  const sobra = [];
  blocos.sort((a, b) => (b.manha ? 1 : 0) - (a.manha ? 1 : 0));
  for (const b of blocos) {
    /* dois "fora do centro" no mesmo dia (Greenwich e o estúdio de Harry Potter
       ficam em lados opostos de Londres) só se não houver outro jeito */
    let i = slots.findIndex(s => (!b.manha || s.p === 'manha') && !(b.longe && s.d.temLonge));
    if (i < 0) i = slots.findIndex(s => !b.manha || s.p === 'manha');
    if (i < 0) { sobra.push(b); continue; }
    const s = slots.splice(i, 1)[0];
    if (b.longe) s.d.temLonge = true;
    s.d.periodos.push({ p: s.p, titulo: ZONA_TITULO[b.zona] || b.itens.map(x => x.n).join(' e '), itens: b.itens.flatMap(x => x.pts), zona: b.zona });
  }
  /* 3) o que ficou livre vira sugestão (sempre um lugar do banco) */
  const livres = { comida: ['borough-market', 'southwark-cathedral'], parques: ['st-james-park', 'primrose'], arte: ['tate-modern', 'national-gallery'], moda: ['selfridges', 'burlington'], criancas: ['nhm', 'transport-museum'], musicais: ['covent-garden', 'neals-yard'], historia: ['monument', 'churchill'], realeza: ['kensington-palace', 'horse-guards'], harrypotter: ['leadenhall', 'millennium-bridge'], arquitetura: ['sky-garden', 'gherkin'] };
  const pool = [...new Set((r.interesses || []).flatMap(k => livres[k] || []).concat(['st-james-park', 'borough-market']))];
  slots.forEach((s, k) => {
    s.d.periodos.push({ p: s.p, titulo: s.d.chegada ? 'Chegada: descanse e dê uma volta leve' : s.d.volta ? 'Última manhã: sem correria' : 'Tempo livre — sugestão da Bia', itens: [pool[k % pool.length]], livre: true });
  });
  const ints = r.interesses || [];
  if (ints.includes('musicais') || ints.includes('comida'))
    dias.forEach((d, i) => { if (i % 2 === 1 && !d.volta) d.periodos.push({ p: 'noite', titulo: ints.includes('musicais') ? 'Noite: um musical no West End' : 'Noite: um pub histórico', itens: [ints.includes('musicais') ? 'covent-garden' : 'borough-market'], livre: true }); });
  const ordem = { manha: 0, dia: 0, tarde: 1, noite: 2 };
  dias.forEach(d => d.periodos.sort((a, b) => ordem[a.p] - ordem[b.p]));
  r.dias = dias;
  r.sobra = sobra.map(b => b.itens.map(x => x.n).join(', '));
  r.status = 'rascunho';
  r.geradoEm = new Date().toISOString();
  return r;
}

/* =====================================================
   CHECKOUT (protótipo): cartão pelo Stripe ou Pix
   No app no ar: o botão chama a função `pagar` do Supabase DELA (o valor é
   calculado no servidor, nunca aqui) e o Pix sai com o valor em reais.
   ===================================================== */
function checkoutDemo({ titulo, valor, detalhe, onPago }) {
  const brl = typeof pixValorEmReais === 'function' ? pixValorEmReais(valor) : null;
  const el = document.createElement('div');
  el.className = 'ckFundo';
  el.innerHTML = `<div class="ckFolha" role="dialog" aria-modal="true" aria-label="Pagamento">
    <button class="ckX" aria-label="Fechar">×</button>
    <small class="ckRot">Pagamento seguro</small>
    <h3>${esc(titulo)}</h3>
    ${detalhe ? `<p class="ckDet">${esc(detalhe)}</p>` : ''}
    <p class="ckValor">${eur(valor)}${brl ? `<small>≈ ${brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no Pix</small>` : ''}</p>
    <div class="ckOpcoes">
      <button class="ckOp on" data-m="card"><b>Cartão</b><small>Visa, Master, Amex · Apple Pay · processado pelo Stripe</small></button>
      <button class="ckOp" data-m="pix"><b>Pix</b><small>Em reais, na cotação do dia</small></button>
    </div>
    <button class="cta" id="ckPagar">Pagar ${eur(valor)}</button>
    <p class="fine">Demonstração: nenhum valor é cobrado. No app do guia, o cartão passa pelo Stripe dele (o dinheiro cai na conta dele) e o Pix gera o código com o valor em reais.</p>
  </div>`;
  document.body.appendChild(el);
  let metodo = 'card';
  const fecha = () => el.remove();
  el.querySelector('.ckX').onclick = fecha;
  el.addEventListener('click', e => { if (e.target === el) fecha(); });
  el.querySelectorAll('.ckOp').forEach(b => b.onclick = () => { metodo = b.dataset.m; el.querySelectorAll('.ckOp').forEach(z => z.classList.toggle('on', z === b)); });
  el.querySelector('#ckPagar').onclick = () => {
    const b = el.querySelector('#ckPagar'); b.disabled = true; b.textContent = 'Processando…';
    setTimeout(() => { fecha(); onPago(metodo); }, 900);
  };
}

/* =====================================================
   A TELA DO CLIENTE
   ===================================================== */
function viewRoteiro() {
  const R = viewRoteiro._s = viewRoteiro._s || { nivel: 'mapa', adultos: 2, criancas: 0, querem: [], interesses: [], ritmo: 'medio', comCarol: false };
  const hoje = isoToday();
  const dias = diasEntre(R.ini, R.fim);
  const total = dias * precoDia(R.nivel);
  const chip = (lista, grupo) => lista.map(([v, n]) => `<button type="button" class="chip ${R[grupo].includes(v) ? 'on' : ''}" data-g="${grupo}" data-v="${v}" aria-pressed="${R[grupo].includes(v)}">${esc(n)}</button>`).join('');
  app.innerHTML = `${topoCarol()}
  <main class="wrap roteiro monte">
    <h1 class="pageh">Monte seu roteiro</h1>
    <p class="rtintro">Para quem vem a Londres e <b>não sabe por onde começar</b>. Você responde, a Bia organiza cada dia — o que ver, em que ordem, quanto tempo — e te entrega um roteiro só seu, num link privado.</p>

    <section class="rtbloco"><h3>Escolha o formato</h3>
      <div class="nivelGrade">${NIVEIS.map(nv => `<button type="button" class="nivel ${R.nivel === nv.id ? 'on' : ''}" data-nivel="${nv.id}" aria-pressed="${R.nivel === nv.id}">
        <b>${nv.n}</b><small>${nv.sub}</small><span class="nvPreco">${eur(precoDia(nv.id))} <i>por dia</i></span></button>`).join('')}</div>
      <p class="nvEx">${exemploTag()}</p>
    </section>

    <section class="rtbloco"><h3>Quando você vem?</h3>
      <div class="frow">
        <label class="fld">Chego em<input type="date" id="rtIni" min="${hoje}" value="${esc(R.ini || '')}"></label>
        <label class="fld">Vou embora em<input type="date" id="rtFim" min="${esc(R.ini || hoje)}" value="${esc(R.fim || '')}"></label>
      </div>
      ${dias ? `<small class="why">${dias} ${dias === 1 ? 'dia' : 'dias'} em Londres</small>` : ''}
      <label class="fld">Onde vai ficar? <small class="why">hotel ou bairro — o roteiro começa dali</small><input id="rtHotel" value="${esc(R.hotel || '')}" placeholder="ex.: hotel em Covent Garden"></label>
    </section>

    <section class="rtbloco"><h3>Quem vem</h3>
      ${pdContador('adultos', R.adultos, 'Adultos', '')}
      ${pdContador('criancas', R.criancas, 'Crianças', 'até 12 anos')}
      ${R.criancas ? `<label class="fld">Idades<input id="pdIdades" value="${esc(R.idades || '')}" placeholder="ex.: 5 e 9 anos"></label>` : ''}
    </section>

    <section class="rtbloco"><h3>Onde você quer ir?</h3><small class="why">Toque em quantos quiser — os que as pessoas sempre pedem</small>
      <div class="destGrade">${DESTAQUES.map(d => { const p = ponto(d.pts[0]) || {}; const on = R.querem.includes(d.id);
        return `<button type="button" class="dest ${on ? 'on' : ''}" data-g="querem" data-v="${d.id}" aria-pressed="${on}"><span style="background-image:url(${esc(p.ph || '')})"></span><b>${esc(d.n)}</b><i aria-hidden="true">${on ? '✓' : '+'}</i></button>`; }).join('')}</div>
    </section>

    <section class="rtbloco"><h3>Do que vocês gostam?</h3>
      <div class="chips">${chip(INTERESSES, 'interesses')}</div>
      <h3 class="pdSub">Ritmo</h3>
      <div class="chips">${RT_RITMO.map(([v, n]) => `<button type="button" class="chip ${R.ritmo === v ? 'on' : ''}" data-ritmo="${v}">${esc(n)}</button>`).join('')}</div>
      <label class="pdCheck"><input type="checkbox" id="rtCarol" ${R.comCarol ? 'checked' : ''}> Quero também 1 dia de tour guiado pela Bia</label>
    </section>

    <section class="rtbloco"><h3>Conte mais</h3>
      <label class="fld"><textarea id="pdObs" rows="3" placeholder="Primeira vez? Algo que não pode faltar? Mobilidade reduzida?">${esc(R.obs || '')}</textarea></label>
    </section>

    ${pdVoce(R)}
    <div class="rtTotal">${dias ? `<span>${dias} ${dias === 1 ? 'dia' : 'dias'} × ${eur(precoDia(R.nivel))}</span><b>${eur(total)}</b>` : '<span>Escolha as datas para ver o valor</span>'}</div>
    <button class="cta" id="rtPagar" ${dias ? '' : 'disabled'}>Pagar ${dias ? eur(total) : ''} e enviar para a Bia</button>
    <p class="fine">Você paga antes; a Bia valida cada dia e te entrega o roteiro em até 3 dias úteis. Se ela não puder atender, devolve tudo.</p>
  </main>`;
  ligaVoltar('/');
  const guarda = () => {
    R.ini = $('#rtIni').value; R.fim = $('#rtFim').value; R.hotel = $('#rtHotel').value; R.comCarol = $('#rtCarol').checked;
    R.idades = $('#pdIdades') ? $('#pdIdades').value : (R.idades || ''); R.obs = $('#pdObs').value; pdLeVoce(R);
  };
  $$('[data-nivel]').forEach(b => b.onclick = () => { guarda(); R.nivel = b.dataset.nivel; viewRoteiro(); });
  $$('[data-g]').forEach(b => b.onclick = () => { guarda(); const g = R[b.dataset.g], v = b.dataset.v, i = g.indexOf(v); if (i >= 0) g.splice(i, 1); else g.push(v); viewRoteiro(); });
  $$('[data-ritmo]').forEach(b => b.onclick = () => { guarda(); R.ritmo = b.dataset.ritmo; viewRoteiro(); });
  $$('[data-rc]').forEach(b => b.onclick = () => { guarda(); const k = b.dataset.rc; R[k] = Math.max(k === 'adultos' ? 1 : 0, Math.min(20, R[k] + +b.dataset.d)); viewRoteiro(); });
  ['#rtIni', '#rtFim'].forEach(s => $(s).onchange = () => { guarda(); viewRoteiro(); });
  $('#rtPagar').onclick = () => {
    guarda();
    if (!R.querem.length) return toast('Escolha pelo menos um lugar que quer ver');
    if (!R.nome || !R.nome.trim() || !R.whats || !R.whats.trim()) return toast('Falta seu nome e WhatsApp');
    const d = diasEntre(R.ini, R.fim), valor = d * precoDia(R.nivel);
    checkoutDemo({ titulo: 'Monte seu roteiro · ' + (NIVEIS.find(x => x.id === R.nivel) || {}).n, valor, detalhe: `${d} dias · ${R.adultos + R.criancas} pessoas`,
      onPago: (metodo) => {
        const slug = (R.nome.trim().split(' ')[0] + '-' + Math.random().toString(36).slice(2, 6)).toLowerCase().normalize('NFD').replace(/[^a-z0-9-]/g, '');
        const r = { id: uid(), codigo: slug, nome: R.nome.trim(), whats: R.whats.trim(), email: (R.email || '').trim(), criado: new Date().toISOString(),
          ini: R.ini, fim: R.fim, adultos: R.adultos, criancas: R.criancas, idades: R.idades || '', hotel: R.hotel || '', nivel: R.nivel,
          querem: R.querem.slice(), interesses: R.interesses.slice(), ritmo: R.ritmo, comCarol: R.comCarol, obs: R.obs || '',
          pago: { valor, metodo, em: isoToday() } };
        gerarRascunho(r);
        DB.roteiros.push(r); localStorage.setItem(DB_KEY, JSON.stringify(DB));
        viewRoteiro._s = null;
        app.innerHTML = `${topoCarol()}<main class="wrap roteiro fim">
          <div class="okc">✓</div><h2 class="okh">Pagamento recebido</h2>
          <p class="hint center">A Bia já recebeu o seu pedido com um rascunho montado. Ela revisa cada dia e te manda o roteiro pronto em até 3 dias úteis, no WhatsApp e no e-mail.</p>
          <div class="rtLink"><small>O seu link privado (abre quando ficar pronto)</small><b>#/r/${esc(r.codigo)}</b></div>
          <a class="cta" target="_blank" rel="noopener" href="${esc(waLink('Olá, Bia! Acabei de pedir meu roteiro pelo app (' + r.codigo + ').'))}">${ICONE_WA_BTN} Avisar a Bia no WhatsApp</a>
          <button class="cta soft" id="rtVer">Ver a prévia do rascunho</button></main>`;
        ligaVoltar('/');
        $('#rtVer').onclick = () => go('/r/' + r.codigo);
      } });
  };
}

/* =====================================================
   O ROTEIRO PRIVADO DO CLIENTE (#/r/<código>) — "passeio oculto"
   ===================================================== */
const PERIODO_ROT = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', dia: 'Dia inteiro' };
function fmtDiaCurto(iso) { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); }
function viewRoteiroPrivado(codigo) {
  const r = (DB.roteiros || []).find(z => z.codigo === codigo);
  if (!r) { app.innerHTML = `${topoCarol()}<main class="wrap narrow"><p class="empty">Roteiro não encontrado. Confira o link que a Bia te mandou.</p></main>`; ligaVoltar('/'); return; }
  if (!r.dias || !r.dias.length) gerarRascunho(r);
  if (viewRoteiroPrivado._cod !== codigo) { viewRoteiroPrivado._cod = codigo; viewRoteiroPrivado._aba = 0; }
  const aba = Math.min(viewRoteiroPrivado._aba || 0, r.dias.length - 1);
  const dia = r.dias[aba];
  const comMapa = r.nivel !== 'arquivo';
  let n = 0;
  app.innerHTML = `${topoCarol()}
  <main class="wrap rtPriv">
    ${r.status !== 'publicado' ? `<div class="rtAviso">✎ Prévia do rascunho automático — a Bia ainda está revisando este roteiro.</div>` : ''}
    <article class="rtFolha">
      <header class="rtCapa"><img src="arte/logo-escuro.png" alt="Londres com a Bia">
        <div><b>Roteiro ${esc(r.nome)}, Londres</b><small>${fmtDate(r.ini)} a ${fmtDate(r.fim)} · ${r.adultos + r.criancas} pessoas${r.hotel ? ' · ' + esc(r.hotel) : ''}</small></div></header>
      <nav class="rtDias" aria-label="Dias">${r.dias.map((d, i) => `<button class="${i === aba ? 'on' : ''}" data-dia="${i}"><b>Dia ${i + 1}</b><small>${fmtDiaCurto(d.data)}</small></button>`).join('')}</nav>
      ${comMapa ? `<div class="rtMapa" id="rtMapa" aria-label="Mapa do dia"></div>` : ''}
      ${dia.periodos.map(pe => `<section class="rtPer">
        <h3><span>${PERIODO_ROT[pe.p] || ''}</span>${esc(pe.titulo)}</h3>
        ${pe.itens.map(pid => { const p = ponto(pid); if (!p) return ''; n++; return `<div class="rtItem">
          <span class="rtFoto" style="background-image:url(${esc(p.ph)})"><i>${n}</i></span>
          <div><b>${esc(p.n)}</b>${p.d ? `<p>${esc(p.d.length > 320 ? p.d.slice(0, p.d.lastIndexOf(' ', 310)) + '…' : p.d)}</p>` : `<p class="rtFalta">Texto da Bia aqui.</p>`}
            ${p.dica ? `<small class="rtDica">💡 ${esc(p.dica)}</small>` : ''}</div></div>`; }).join('')}
        ${pe.nota ? `<p class="rtNota">${esc(pe.nota)}</p>` : ''}
      </section>`).join('')}
      ${r.sobra && r.sobra.length ? `<p class="rtNota">Se sobrar tempo: ${esc(r.sobra.join(' · '))}</p>` : ''}
      <footer class="rtPe">Roteiro feito por Beatriz Moreira, guia brasileira em Londres · Londres com a Bia</footer>
    </article>
    <div class="vchAcoes noprint"><button class="cta sm" id="rtPdf">Salvar em PDF</button>
      <a class="mini" href="${esc(waLink('Olá, Bia! Estou com o meu roteiro (' + r.codigo + ') e tenho uma dúvida.'))}" target="_blank" rel="noopener">Falar com a Bia</a></div>
  </main>`;
  ligaVoltar(location.hash.includes('adm') ? '/adm/roteiros' : '/');
  $$('[data-dia]').forEach(b => b.onclick = () => { viewRoteiroPrivado._aba = +b.dataset.dia; viewRoteiroPrivado(codigo); });
  $('#rtPdf').onclick = () => window.print();
  $$('[data-ouvir]').forEach(b => b.onclick = () => { const p = ponto(b.dataset.ouvir); if (p && typeof narra === 'function') narra(p); });
  if (comMapa && typeof mapaDoDia === 'function') mapaDoDia('rtMapa', dia.periodos.flatMap(pe => pe.itens).map(ponto).filter(Boolean));
}

if (typeof module !== 'undefined') module.exports = { gerarRascunho, DESTAQUES, diasEntre };
