/* =====================================================
   LOVELY LONDON BY CAROL — telas do cliente (28/09/2026)

   Tudo o que a reunião pediu e o app-guia não tinha:
   - primeira tela com os 3 produtos (Passeios e Reserve · Consultoria ·
     Monte seu roteiro) + Transfer, Ingressos, Vale-presente, Avaliações,
     Quem sou eu, Blog e Site, com o selo Blue Badge em destaque;
   - tabela de pacote (horas × grupo) e os Termos DELA junto do preço;
   - voucher automático no modelo que ela usa hoje;
   - ingressos antecipados com o código de afiliada dela (GetYourGuide);
   - vale-presente e a página de quem recebe;
   - avaliação em 1 toque pelo QR do fim do tour (+ Google).
   ===================================================== */
'use strict';

const G = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.guia) || {};
const exemploTag = () => (typeof APP_TABELA_EXEMPLO !== 'undefined' && APP_TABELA_EXEMPLO) ? '<em class="exTag">valores de exemplo</em>' : '';

/* ---------- ícones de linha (mesmo traço dos do app) ---------- */
const IC = {
  consulta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="13" height="11" rx="2"/><path d="m16 9 5-3v10l-5-3"/><path d="M7 20h6"/></svg>',
  imersivo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
  ingresso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/></svg>',
  presente: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12"/><path d="M12 9S10.5 4 8 4.5 7.5 9 12 9Zm0 0s1.5-5 4-4.5S16.5 9 12 9Z"/></svg>',
  estrela: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h8M8 18h5"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  selo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="m9 14.5-1.5 6.5 4.5-2.5 4.5 2.5-1.5-6.5"/><path d="m9.5 9 1.8 1.8L15 7.2"/></svg>',
  yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>',
};

/* ---------- janela do tour: "Manhã · 09:30–13:30" (fim pelo pacote) ---------- */
function janelaDoTour(S) {
  if (!S || !S.time) return '';
  const tu = turnoDaHora(S.time);
  let fim = '';
  if (S.horas) {
    const [hh, mm] = S.time.split(':').map(Number);
    const f = hh * 60 + mm + Math.round(+S.horas * 60);
    fim = String(Math.floor(f / 60)).padStart(2, '0') + ':' + String(f % 60).padStart(2, '0');
  } else if (tu) fim = tu.fim;
  return (tu ? tu.nome + ' · ' : '') + S.time + (fim ? '–' + fim : '');
}

/* ---------- tabela do pacote (horas × grupo), com a regra dela ---------- */
function tabelaPacotes(x) {
  const faixas = x.pacotes[0].faixas;
  const rotFx = (f, i) => i === 0 ? `até ${f.ate} pessoas` : `${faixas[i - 1].ate + 1} a ${f.ate} pessoas`;
  return `<div class="pacTab">
    <div class="pacTopo"><b>Valor do grupo (não é por pessoa)</b>${exemploTag()}</div>
    <table><thead><tr><th>Duração</th>${faixas.map((f, i) => `<th>${rotFx(f, i)}</th>`).join('')}</tr></thead>
    <tbody>${x.pacotes.map(pk => `<tr><th>${rotuloHoras(pk.h)}</th>${pk.faixas.map(f => `<td>${eur(f.v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <ul class="pacNotas">
      <li>Tour <b>privativo</b>: só o seu grupo — e um grupo por dia.</li>
      <li>Sinal de <b>${sinalPct()}%</b> para reservar; o restante no dia.</li>
      ${+DB.settings.horaExtra ? `<li>Hora extra, se houver disponibilidade: <b>${eur(DB.settings.horaExtra)}</b>.</li>` : ''}
      <li>Mais de ${faixas[faixas.length - 1].ate} pessoas? <a target="_blank" rel="noopener" href="${waLink('Olá, Carol! Somos um grupo maior e queremos o tour ' + tl(x.name) + '.')}">peça um orçamento</a>.</li>
    </ul>
  </div>`;
}

/* ---------- termos: junto do preço, no checkout e no voucher ---------- */
function termosLista() { return ((DB.settings.termos && (DB.settings.termos.pt || [])) || []).filter(Boolean); }
function termosHtml(aberto) {
  return `<details class="termos" ${aberto ? 'open' : ''}><summary><b>Termos e condições da reserva</b><small>sinal, cancelamento, tolerância</small></summary>
    <ul>${termosLista().map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>`;
}
function termosCheckbox() {
  return `<label class="optin termosOk"><input type="checkbox" id="fTermos">
    <span><b>Li e aceito os termos da reserva</b><small>Sinal de ${sinalPct()}% não reembolsável · cancelamento: +10 dias sinal retido, 4–10 dias 50%, menos de 96h 100% · tolerância de ${DB.settings.tolerancia || 30} min.
    <a href="#" id="verTermos">Ler tudo</a></small></span></label>
    <div id="termosInline" hidden>${termosHtml(true)}</div>`;
}
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'verTermos') { e.preventDefault(); const el = document.getElementById('termosInline'); if (el) el.hidden = !el.hidden; }
});

/* ---------- extras da página do tour ---------- */
function extrasDoTour(x) {
  let h = '';
  if (x.blueBadge) h += `<div class="bbNota">${IC.selo}<p><b>Por dentro, com guia Blue Badge.</b> Em vários lugares históricos — como a Abadia de Westminster e a Torre de Londres — só guias Blue Badge podem guiar grupos lá dentro.</p></div>`;
  if (x.imersivo) h += `<a class="imTeaser" href="#/imersivo/${esc(x.imersivo)}">
      <span class="imIc">${IC.imersivo}</span><span><b>Prefere fazer sozinho, no seu tempo?</b><small>A versão autoguiada deste roteiro: mapa, GPS e a voz da Carol em cada parada.</small></span><span class="go" aria-hidden="true">→</span></a>`;
  if (x.ingresso) h += `<a class="imTeaser ing" href="#/ingressos">
      <span class="imIc">${IC.ingresso}</span><span><b>Ingresso não incluído — compre antes</b><small>A Carol indica onde comprar, sem fila e sem pagar a mais.</small></span><span class="go" aria-hidden="true">→</span></a>`;
  return h;
}

/* =====================================================
   PRIMEIRA TELA
   ===================================================== */
function viewHub() {
  const st = DB.settings;
  const aval = (DB.avaliacoes || []).filter(a => a.publicar);
  const redes = [
    st.insta ? { u: 'https://instagram.com/' + String(st.insta).replace(/^@/, ''), ic: ICONE_IG, n: 'Instagram', c: 'ig' } : null,
    linkExterno(st.site) ? { u: linkExterno(st.site), ic: ICONE_SITE, n: 'Site', c: 'site' } : null,
    linkExterno(st.youtube) ? { u: linkExterno(st.youtube), ic: IC.yt, n: 'YouTube', c: 'yt' } : null,
    st.email ? { u: 'mailto:' + st.email, ic: IC.email, n: 'E-mail', c: 'mail' } : null,
  ].filter(Boolean);
  const bt = (id, ic, tit, sub, cls = '') => `<button class="lk ${cls}" id="${id}"><span class="ic">${ic}</span><span><b>${tit}</b><small>${sub}</small></span><span class="go" aria-hidden="true">→</span></button>`;
  app.innerHTML = `
  <div class="hub carol">
    <div class="hub-bg" style="background-image:url(${esc(st.homePhoto || 'fotos/home-westminster.jpg')})"></div>
    <div class="hub-in">
      <div class="vcard">
        <div class="hub-brand">${logoImg(96, 'escuro')}</div>
        <p class="lema">Come with me! London is lovely.</p>
        <p class="tagline">${esc(noIdioma(st.homeText) || t('tagline'))}</p>
        <a class="bbFaixa" href="${esc(st.blueBadge || G.blueBadge || '#')}" target="_blank" rel="noopener">
          ${IC.selo}<span><b>Guia oficial Blue Badge</b><small>Institute of Tourist Guiding · APTG · ver credencial ↗</small></span></a>
        ${redes.length ? `<nav class="redes" aria-label="Redes da Carol">${redes.map(r =>
          `<a class="rede ${r.c}" href="${esc(r.u)}" target="_blank" rel="noopener" aria-label="${r.n}" title="${r.n}">${r.ic}</a>`).join('')}</nav>` : ''}
      </div>

      <p class="hubRot">Com a Carol</p>
      ${bt('goTours', ICONE_MENU.passeios, t('seeTours'), t('seeToursSub'), 'main')}
      ${bt('goConsult', IC.consulta, 'Consultoria de roteiro', 'Você já planejou? Eu valido em 1 hora, por vídeo')}

      <p class="hubRot">Planeje a sua viagem</p>
      ${bt('goRoteiro', ICONE_MENU.roteiro, 'Monte seu roteiro', 'Dia a dia, com mapa — e audioguia na minha voz')}
      ${bt('goImersivo', IC.imersivo, 'Roteiro imersivo · prévia', 'City of London com GPS e a voz da Carol')}
      ${bt('goTransfer', ICONE_MENU.transfer, 'Transfer', 'Aeroporto, hotel e bate-volta com motorista')}

      <p class="hubRot">Conheça</p>
      <button class="lk" id="goAbout"><span class="ic"><img id="hubFace" src="${esc(st.photo || 'fotos/carol.jpg')}" alt=""
          style="width:36px;height:36px;border-radius:50%;object-fit:cover;object-position:center 22%"></span><span><b>${t('aboutLink')}</b><small>Blue Badge · Central Saint Martins · 20 anos de moda</small></span><span class="go" aria-hidden="true">→</span></button>
      ${bt('goAval', IC.estrela, 'Avaliações', aval.length ? `${aval.length} ${aval.length === 1 ? 'avaliação' : 'avaliações'} · deixe a sua` : 'Fez um tour comigo? Deixe a sua')}
      ${linkExterno(st.blog) ? `<a class="lk" href="${esc(st.blog)}" target="_blank" rel="noopener"><span class="ic">${IC.blog}</span><span><b>Blog Lovely London</b><small>Dicas, histórias e segredos de Londres</small></span><span class="go" aria-hidden="true">↗</span></a>` : ''}
      <a class="lk" href="${waLink('Olá, Carol! Vim pelo app e queria saber mais sobre os tours em Londres.')}" target="_blank" rel="noopener"><span class="ic wa">${ICONE_WA}</span><span><b>Fale comigo no WhatsApp</b><small>+44 7950 400919</small></span><span class="go" aria-hidden="true">→</span></a>

      ${typeof secaoDepoimentos === 'function' ? secaoDepoimentos('noHub') : ''}

      <p class="hubRot">Ingressos e presentes</p>
      ${bt('goIngressos', IC.ingresso, 'Ingressos antecipados', 'Abadia, Torre, Windsor… compre antes, sem fila')}
      ${bt('goPresente', IC.presente, 'Vale-presente', 'Dê um tour com a Carol de presente')}
      ${typeof secaoViagem === 'function' ? secaoViagem() : ''}
      <button class="adm-entry" id="admEntry">🔒 ${t('admEntry')}</button>
    </div>
  </div>`;
  $('#goTours').onclick = () => go('/tours');
  $('#goConsult').onclick = () => go('/consultoria');
  $('#goRoteiro').onclick = () => go('/roteiro');
  $('#goImersivo').onclick = () => go('/imersivo/city');
  $('#goTransfer').onclick = () => go('/transfer');
  $('#goIngressos').onclick = () => go('/ingressos');
  $('#goPresente').onclick = () => go('/presente');
  $('#goAbout').onclick = () => go('/about');
  $('#goAval').onclick = () => go('/avaliacoes');
  $('#admEntry').onclick = () => go('/adm/today');
  fallbackPhoto($('#hubFace'), '☺');
}

/* topo das telas internas */
function topoCarol(voltar = '/') {
  return `<header class="topbar"><button class="backbtn" id="bk" aria-label="${t('back')}">←</button>
    <span class="tbrand">${logoImg(30)}</span></header>`;
}
function ligaVoltar(destino = '/') { const b = $('#bk'); if (b) b.onclick = () => go(destino); }

/* =====================================================
   ROTAS NOVAS
   ===================================================== */
function rotaExtra(p) {
  const r = p[0];
  if (r === 'consultoria') { viewTour('consultoria'); ligaVoltar('/'); return true; }
  if (r === 'presente') { viewPresente(); return true; }
  if (r === 'vale') { viewVale(decodeURIComponent(p[1] || '')); return true; }
  if (r === 'avaliar') { viewAvaliar(p[1]); return true; }
  if (r === 'avaliacoes') { viewAvaliacoes(); return true; }
  if (r === 'ingressos') { viewIngressos(); return true; }
  if (r === 'voucher') { viewVoucher(decodeURIComponent(p[1] || '')); return true; }
  if (r === 'r' && typeof viewRoteiroPrivado === 'function') { viewRoteiroPrivado(decodeURIComponent(p[1] || '')); return true; }
  if (r === 'imersivo' && typeof viewImersivo === 'function') { viewImersivo(p[1] || 'city'); return true; }
  return false;
}

/* =====================================================
   QUEM SOU EU — a credencial dela, sem esconder o olhar de artista
   ===================================================== */
function viewAbout() {
  const st = DB.settings;
  const paras = ((st.bio && tl(st.bio)) || '').split(/\n\s*\n/).filter(Boolean);
  app.innerHTML = `${topoCarol()}
  <main class="wrap about carolAbout">
    <div class="abFoto"><img src="${esc(st.photo || 'fotos/carol.jpg')}" alt="Carol Carvalho"></div>
    <p class="lema escuro">Come with me! London is lovely.</p>
    <h1 class="pageh">Quem é Carol, sua guia em Londres</h1>
    <p class="abSub">Blue Badge, brasileira e apaixonada por Londres.</p>
    <div class="abSelos">
      <a href="${esc(st.blueBadge || G.blueBadge)}" target="_blank" rel="noopener"><img src="arte/selo-itg.png" alt="Institute of Tourist Guiding — Blue Badge"></a>
      <a href="https://www.aptg.org.uk" target="_blank" rel="noopener"><img src="arte/selo-aptg.png" alt="APTG"></a>
    </div>
    <div class="ab-body">${paras.map(p => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="ab-facts">
      <div><small>Credencial</small><b>Blue Badge · ITG</b></div>
      <div><small>Idiomas</small><b>${esc(G.idiomas || 'Português')}</b></div>
      <div><small>Grupos</small><b>até 6 · 1 por dia</b></div>
    </div>
    <img class="abFoto2" src="${esc(st.photo2 || 'fotos/carol-westminster.jpg')}" alt="">
    ${typeof secaoDepoimentos === 'function' ? secaoDepoimentos('noSobre') : ''}
    <div class="ab-cta">
      <h3>Vamos planejar a sua Londres?</h3>
      <div class="ab-btns">
        <button class="cta" id="abTours">${t('seeTours')}</button>
        <a class="mini" href="${waLink('Olá, Carol!')}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="mini" href="https://instagram.com/${esc(st.insta)}" target="_blank" rel="noopener">@${esc(st.insta)}</a>
      </div>
    </div>
  </main>`;
  ligaVoltar('/');
  $('#abTours').onclick = () => go('/tours');
}

/* =====================================================
   INGRESSOS ANTECIPADOS — afiliada (GetYourGuide, código dela)
   Reunião 34:28: "ela está entrando ali pelo meu link para facilitar a vida
   dela e eu estou ganhando uma porcentagem". A compra acontece no parceiro
   (é assim que a comissão é registrada); o app faz a vitrine, a dica dela e
   conta os cliques. Torre, Abadia, St Paul's e Windsor não têm programa
   próprio — o GetYourGuide cobre todas (~8%).
   ===================================================== */
const GYG_ID = 'MJKDHZZ';   /* partner_id que já está no site dela */
const gyg = (q) => `https://www.getyourguide.com/s/?q=${encodeURIComponent(q)}&partner_id=${GYG_ID}&locale=pt-BR`;
const INGRESSOS = [
  { id: 'abadia', ponto: 'abadia', nome: 'Abadia de Westminster', dica: 'Compre com antecedência: a fila de quem compra na hora é longa. Fechada para turistas aos domingos (só missas).', url: gyg('Westminster Abbey'), tour: 'abadia-de-westminster' },
  { id: 'torre', ponto: 'joias-coroa', nome: 'Torre de Londres e Joias da Coroa', dica: 'Chegue cedo: as Joias da Coroa têm fila depois das 11h. Dá para combinar com o meu tour por dentro.', url: gyg('Tower of London Crown Jewels'), tour: 'torre-de-londres' },
  { id: 'stpauls', ponto: 'st-pauls', nome: "Catedral de St. Paul", dica: 'Vale subir na cúpula — são 527 degraus, mas a vista é linda.', url: gyg("St Paul's Cathedral") },
  { id: 'windsor', ponto: 'windsor-castle', nome: 'Castelo de Windsor', dica: 'Atenção: ingresso comprado fora do site oficial não vira o "1-Year Pass" do castelo. O castelo fecha às terças e quartas em parte do ano.', url: gyg('Windsor Castle'), tour: 'alem-de-londres' },
  { id: 'harrypotter', ponto: 'harry-potter', nome: 'Estúdio Harry Potter (Warner Bros.)', dica: 'Esgota com meses de antecedência, principalmente nas férias brasileiras. Compre assim que tiver as datas.', url: gyg('Warner Bros Studio Tour Harry Potter') },
  { id: 'londoneye', ponto: 'london-eye', nome: 'London Eye', dica: 'O pôr do sol é o horário mais bonito — e o mais disputado.', url: gyg('London Eye') },
  { id: 'churchill', ponto: 'churchill', nome: 'Churchill War Rooms', dica: 'O bunker de onde Churchill comandou a guerra. Pequeno: compre com horário marcado.', url: gyg('Churchill War Rooms') },
  { id: 'kensington', ponto: 'kensington-palace', nome: 'Palácio de Kensington', dica: 'Onde a Princesa Diana morou. Combine com o Hyde Park.', url: gyg('Kensington Palace') },
  { id: 'hampton', ponto: 'hampton-court', nome: 'Hampton Court Palace', dica: 'O palácio de Henrique VIII, com o labirinto mais antigo da Inglaterra.', url: gyg('Hampton Court Palace') },
  { id: 'shard', ponto: 'shard', nome: 'The Shard — mirante', dica: 'Pago. Se quiser vista de graça, veja o Horizon 22 e o Sky Garden abaixo.', url: gyg('The Shard View') },
  { id: 'horizon22', ponto: 'horizon-22', nome: 'Horizon 22 — grátis', dica: 'Observatório mais alto da Europa, de graça. Só entrar, escanear o QR code do banner na entrada e subir.', url: 'https://horizon22.co.uk/', gratis: true },
  { id: 'skygarden', ponto: 'sky-garden', nome: 'Sky Garden — grátis', dica: 'Jardim no topo do "Walkie Talkie", com bar. Gratuito, mas precisa reservar no site oficial.', url: 'https://skygarden.london/', gratis: true },
];
function viewIngressos() {
  app.innerHTML = `${topoCarol()}
  <main class="wrap ingressos">
    <h1 class="pageh">Ingressos antecipados</h1>
    <p class="rtintro">As atrações que meus clientes sempre perguntam onde comprar. Com o ingresso na mão você não pega fila — e chega no horário certo do tour.</p>
    <p class="afiliada">🤝 <b>Link de parceira:</b> comprando por aqui, a Carol ganha uma pequena comissão, <b>sem custo extra</b> para você.</p>
    <div class="ingGrade">${INGRESSOS.map(i => { const p = ponto(i.ponto) || {}; return `
      <article class="ing">
        <span class="ingFoto" style="background-image:url(${esc(p.ph || '')})">${p.cr ? `<small class="sccr">${esc(p.cr)}</small>` : ''}${i.gratis ? '<em class="ingGratis">grátis</em>' : ''}</span>
        <div class="ingTx"><b>${esc(i.nome)}</b><p>${esc(i.dica)}</p>
          <div class="ingAc"><a class="cta sm" data-ing="${i.id}" href="${esc(i.url)}" target="_blank" rel="noopener sponsored">${i.gratis ? 'Reservar no site oficial ↗' : 'Comprar com o link da Carol ↗'}</a>
          ${i.tour ? `<a class="mini" href="#/tour/${i.tour}">Tour com a Carol</a>` : ''}</div></div>
      </article>`; }).join('')}</div>
  </main>`;
  ligaVoltar('/');
  $$('[data-ing]').forEach(a => a.addEventListener('click', () => {
    DB.cliquesIngressos = DB.cliquesIngressos || {};
    DB.cliquesIngressos[a.dataset.ing] = (DB.cliquesIngressos[a.dataset.ing] || 0) + 1;
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
  }));
}

/* =====================================================
   VOUCHER — o modelo que ela usa hoje (anotações, p. 4)
   Reunião 37:15: sai sozinho, por nome, no e-mail e no WhatsApp, com os
   termos reforçados. Serve para reserva do app (código LL-…) e para
   trabalho de agência (id tj…), que ela abre pelo painel.
   ===================================================== */
function dadosVoucher(codigo) {
  const b = Bookings.byCode(codigo);
  if (b) {
    const x = Tours.get(b.tourId) || { name: { pt: 'Tour' } };
    const pago = Bookings.paid(b);
    return { ref: b.code, agencia: '— (reserva direta)', nome: b.name, hotel: b.hotel || '', emissao: (b.createdAt || '').slice(0, 10),
      linhas: [{ data: b.date, desc: tl(x.name) + (b.horas ? ` — ${rotuloHoras(b.horas)}` : ''), sub: `${x.type === 'consult' ? 'Online' : 'Tour privativo'} · ${b.pax} ${b.pax === 1 ? 'pessoa' : 'pessoas'} · ${janelaDoTour({ time: b.time, horas: b.horas })}`, valor: b.total }],
      total: b.total, pago, encontro: noIdioma(x.meeting), whats: b.whats, email: b.email, tipo: 'reserva' };
  }
  const j = (DB.trabalhosAgencia || []).find(z => z.id === codigo);
  if (j) {
    const ag = (DB.agencias || []).find(a => a.id === j.agencia) || {};
    return { ref: (j.invoice && j.invoice.numero) || 'LL-' + j.id.toUpperCase(), agencia: ag.nome || '', nome: j.cliente, hotel: j.hotel || '', emissao: isoToday(),
      linhas: [{ data: j.data, desc: j.servico, sub: `${j.pax} pessoas`, valor: j.valor }], total: j.valor, pago: j.invoice && j.invoice.paga ? j.valor : 0,
      encontro: '', whats: ag.whats, email: ag.email, tipo: 'agencia' };
  }
  return null;
}
function viewVoucher(codigo) {
  const v = dadosVoucher(codigo);
  if (!v) { app.innerHTML = `${topoCarol()}<main class="wrap narrow"><p class="empty">Voucher não encontrado. Confira o código ou fale com a Carol.</p></main>`; ligaVoltar('/'); return; }
  const dt = (iso) => iso ? iso.split('-').reverse().join('/') : '';
  const pct = v.total ? Math.round(v.pago / v.total * 100) : 0;
  const estado = v.pago >= v.total && v.total > 0 ? `✓ PAGO — 100% DO VALOR RECEBIDO` : v.pago > 0 ? `✓ SINAL RECEBIDO — ${eur(v.pago)} (${pct}%) · restante ${eur(v.total - v.pago)} no dia` : 'AGUARDANDO O SINAL';
  const msg = `Olá, ${String(v.nome).split(' ')[0]}! Aqui está o seu voucher da Lovely London by Carol: ${location.origin + location.pathname}#/voucher/${encodeURIComponent(v.ref === codigo ? codigo : codigo)}`;
  app.innerHTML = `${topoCarol()}
  <main class="wrap vchWrap">
    <div class="vchAcoes noprint">
      <button class="cta sm" id="vchPdf">Salvar em PDF / imprimir</button>
      ${v.whats ? `<a class="mini" target="_blank" rel="noopener" href="${esc(waLink(msg, String(v.whats).replace(/\D/g, '')))}">Mandar no WhatsApp</a>` : ''}
      ${v.email ? `<a class="mini" href="mailto:${esc(v.email)}?subject=${encodeURIComponent('Seu voucher — Lovely London by Carol')}&body=${encodeURIComponent(msg)}">Mandar por e-mail</a>` : ''}
    </div>
    <article class="voucherCarol" id="voucherFolha">
      <header class="vchFaixa">
        <img src="arte/logo-escuro.png" alt="Lovely London by Carol">
        <div><b>PRIVATE GUIDED Tours &amp;<br>BESPOKE LONDON Experiences</b><small>Curated Itineraries · Local Expertise · Private Guiding by a Blue Badge Expert</small></div>
      </header>
      <div class="vchCorpo">
        <h1>VOUCHER DE SERVIÇOS</h1>
        <p class="vchSub">Confirmação de reserva &amp; recibo de pagamento</p>
        <dl class="vchDados">
          <div><dt>Agência</dt><dd>${esc(v.agencia || '—')}</dd></div><div><dt>Data de emissão</dt><dd>${dt(v.emissao)}</dd></div>
          <div><dt>Em nome de</dt><dd>${esc(v.nome)}</dd></div><div><dt>Nº de referência</dt><dd>${esc(v.ref)}</dd></div>
          <div class="full"><dt>Hotel</dt><dd>${esc(v.hotel || '—')}</dd></div>
        </dl>
        <h2>SERVIÇOS CONTRATADOS</h2>
        <table class="vchTab"><thead><tr><th>DATA</th><th>DESCRIÇÃO</th><th>VALOR</th></tr></thead>
          <tbody>${v.linhas.map(l => `<tr><td>${dt(l.data)}</td><td><b>${esc(l.desc)}</b><small>${esc(l.sub || '')}</small></td><td>${eur(l.valor)}</td></tr>`).join('')}</tbody></table>
        <p class="vchTotal"><span>TOTAL</span><b>${eur(v.total)}</b></p>
        <p class="vchEstado ${v.pago >= v.total && v.total > 0 ? 'ok' : v.pago > 0 ? 'sinal' : 'falta'}">${estado}</p>
        ${v.encontro ? `<p class="vchInfo"><b>Ponto de encontro:</b> ${esc(v.encontro)}. A Carol confirma o local exato pelo WhatsApp.</p>` : ''}
        <div class="vchTermos"><b>Termos da reserva</b><ul>${termosLista().map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <p class="vchAss">Com carinho,<br><span>Carol</span> — Lovely London</p>
      </div>
      <footer class="vchPe">
        <span>☎ +44 7950 400919</span><span>✉ hello@lovelylondon.uk</span><span>◎ lovelylondon_bycarol</span><span>⌂ lovelylondon.uk</span>
        <span class="bb">${IC.selo} Blue Badge · guidelondon.org.uk/guides/carolinacarvalho</span>
      </footer>
    </article>
  </main>`;
  ligaVoltar(location.hash.includes('adm') ? '/adm/bookings' : '/');
  $('#vchPdf').onclick = () => window.print();
}

/* =====================================================
   VALE-PRESENTE (reunião 12:38: "a pessoa conhece alguém que está vindo para
   Londres e vai dar um tour meu de presente")
   ===================================================== */
function codigoPresente() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 4; i++) c += a[Math.floor(Math.random() * a.length)]; return 'LOVELY-' + c; }
function viewPresente() {
  const S = viewPresente._s = viewPresente._s || { tourId: 'londres-classica', horas: 4, pax: 2, de: '', para: '', msg: '', email: '', whats: '' };
  const tours = Tours.live().filter(x => !x.oculto && x.priceMode === 'pacote' && !sobConsulta(x) && x.status !== 'seasonal');
  const x = Tours.get(S.tourId) || tours[0];
  if (!x.pacotes.some(p => +p.h === +S.horas)) S.horas = +x.pacotes[0].h;
  const pr = Bookings.precoDe(x, x.id, '', '', S.pax, S.horas);
  app.innerHTML = `${topoCarol()}
  <main class="wrap roteiro presente">
    <h1 class="pageh">Vale-presente</h1>
    <p class="rtintro">Conhece alguém que vem a Londres? Dê um tour com a Carol. A pessoa recebe um cartão bonito com o código e escolhe a data quando quiser — vale por 12 meses.</p>
    <section class="rtbloco"><h3>Qual experiência?</h3>
      <div class="pdPasseios">${tours.map(t2 => `<button type="button" class="pdPasseio ${t2.id === x.id ? 'on' : ''}" data-t="${t2.id}"><img src="${esc(t2.photo)}" alt="" loading="lazy"><span><b>${esc(tl(t2.name))}</b><small>${esc(t2.duration)}</small></span><i aria-hidden="true">${t2.id === x.id ? '✓' : '+'}</i></button>`).join('')}</div>
    </section>
    <section class="rtbloco"><h3>Duração e grupo</h3>
      <div class="chips">${x.pacotes.map(pk => `<button type="button" class="chip ${+pk.h === +S.horas ? 'on' : ''}" data-h="${pk.h}">${rotuloHoras(pk.h)}</button>`).join('')}</div>
      ${pdContador('pax', S.pax, 'Pessoas', 'de quem vai fazer o tour')}
      <p class="gcValor">${pr.grupoGrande ? 'Grupo grande: fale com a Carol' : `<b>${eur(pr.total)}</b> ${exemploTag()}`}</p>
    </section>
    <section class="rtbloco"><h3>O cartão</h3>
      <label class="fld">De (seu nome)<input id="gcDe" value="${esc(S.de)}"></label>
      <label class="fld">Para (quem recebe)<input id="gcPara" value="${esc(S.para)}"></label>
      <label class="fld">Mensagem<textarea id="gcMsg" rows="3" placeholder="Feliz aniversário! Londres com a Carol…">${esc(S.msg)}</textarea></label>
      <label class="fld">Seu e-mail<input id="gcEmail" type="email" value="${esc(S.email)}"></label>
      <label class="fld">Seu WhatsApp<input id="gcWhats" type="tel" placeholder="+55 11 …" value="${esc(S.whats)}"></label>
    </section>
    <div class="gcPrevia">${cartaoPresente({ de: S.de || 'Seu nome', para: S.para || 'Quem recebe', mensagem: S.msg, codigo: 'LOVELY-····', tourId: x.id, horas: S.horas, pax: S.pax })}</div>
    <button class="cta" id="gcPagar" ${pr.grupoGrande ? 'disabled' : ''}>Pagar ${pr.grupoGrande ? '' : eur(pr.total)} e gerar o vale</button>
    <p class="fine">Pagamento por cartão (Stripe) ou Pix. No protótipo, o pagamento é simulado.</p>
  </main>`;
  ligaVoltar('/');
  const guarda = () => { S.de = $('#gcDe').value; S.para = $('#gcPara').value; S.msg = $('#gcMsg').value; S.email = $('#gcEmail').value; S.whats = $('#gcWhats').value; };
  $$('[data-t]').forEach(b => b.onclick = () => { guarda(); S.tourId = b.dataset.t; viewPresente(); });
  $$('[data-h]').forEach(b => b.onclick = () => { guarda(); S.horas = +b.dataset.h; viewPresente(); });
  $$('[data-rc]').forEach(b => b.onclick = () => { guarda(); S.pax = Math.max(1, Math.min(6, S.pax + +b.dataset.d)); viewPresente(); });
  $('#gcPagar').onclick = () => {
    guarda();
    if (!S.de.trim() || !S.para.trim()) return toast('Escreva de quem é e para quem é');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.email)) return toast(t('badEmail'));
    const g = { id: uid(), codigo: codigoPresente(), de: S.de.trim(), para: S.para.trim(), mensagem: S.msg.trim(), email: S.email.trim(), whats: S.whats.trim(),
      tourId: x.id, horas: S.horas, pax: S.pax, valor: pr.total, criado: isoToday(), validade: addDays(isoToday(), 365), usado: false, pago: true };
    DB.giftcards.push(g); localStorage.setItem(DB_KEY, JSON.stringify(DB));
    viewPresente._s = null;
    go('/vale/' + g.codigo);
  };
}
function cartaoPresente(g) {
  const x = Tours.get(g.tourId) || { name: { pt: '' }, photo: '' };
  return `<div class="giftCard">
    <div class="gcFoto" style="background-image:url(${esc(x.photo)})"></div>
    <div class="gcTx">
      <img class="gcLogo" src="arte/logo-escuro.png" alt="Lovely London by Carol">
      <p class="gcPara">Para <b>${esc(g.para)}</b></p>
      <p class="gcExp">${esc(tl(x.name))} · ${rotuloHoras(g.horas)} · até ${g.pax} ${g.pax === 1 ? 'pessoa' : 'pessoas'}</p>
      ${g.mensagem ? `<p class="gcMsg">“${esc(g.mensagem)}”</p>` : ''}
      <p class="gcDe">com carinho, ${esc(g.de)}</p>
      <p class="gcCod"><small>código</small><b>${esc(g.codigo)}</b></p>
    </div>
  </div>`;
}
function viewVale(codigo) {
  const g = (DB.giftcards || []).find(z => z.codigo === codigo);
  if (!g) { app.innerHTML = `${topoCarol()}<main class="wrap narrow"><p class="empty">Vale não encontrado. Confira o código com quem te presenteou.</p></main>`; ligaVoltar('/'); return; }
  const link = location.origin + location.pathname + '#/vale/' + encodeURIComponent(g.codigo);
  app.innerHTML = `${topoCarol()}
  <main class="wrap roteiro vale">
    <h1 class="pageh">${g.usado ? 'Vale já usado' : 'Você ganhou um tour em Londres'}</h1>
    ${cartaoPresente(g)}
    <p class="fine center">Válido até ${g.validade.split('-').reverse().join('/')} · a data é você quem escolhe (sujeito à agenda da Carol).</p>
    ${g.usado ? '' : `<button class="cta" id="vlUsar">Escolher a data do meu tour</button>`}
    <div class="vlAcoes">
      <a class="mini" target="_blank" rel="noopener" href="${esc(waLink('🎁 ' + g.para + ', você ganhou um tour em Londres com a Carol (Lovely London)! Veja o seu vale: ' + link, ''))}">Enviar no WhatsApp</a>
      <button class="mini" id="vlPdf">Salvar em PDF</button>
    </div>
  </main>`;
  ligaVoltar('/');
  $('#vlPdf').onclick = () => window.print();
  if ($('#vlUsar')) $('#vlUsar').onclick = () => { sessionStorage.setItem('ll_vale', g.codigo); go('/tour/' + g.tourId); setTimeout(() => toast('Seu vale ' + g.codigo + ' entra no passo 2 (campo do cupom)'), 400); };
}
/* o vale funciona como cupom no checkout: cobre o valor do vale */
(function valeComoCupom() {
  if (typeof Coupons === 'undefined') return;
  const validaBase = Coupons.validate.bind(Coupons);
  Coupons.validate = function (code, email) {
    const g = (DB.giftcards || []).find(z => z.codigo.toUpperCase() === String(code || '').trim().toUpperCase());
    if (g) {
      if (g.usado) return { ok: false, reason: 'used' };
      if (g.validade < isoToday()) return { ok: false, reason: 'expired' };
      const S = typeof viewTour !== 'undefined' && viewTour._s;
      const base = S ? Bookings.precoDe(S.tour, S.tour.id, S.date, S.time, S.pax, S.horas).total : g.valor;
      return { ok: true, coupon: { code: g.codigo, pct: base ? Math.min(100, g.valor / base * 100) : 100, vale: true } };
    }
    return validaBase(code, email);
  };
})();

/* =====================================================
   AVALIAÇÕES — QR no fim do tour (reunião 14:20: "ela já aponta a câmera e
   já abre a tela para ela dar um cinco estrelas")
   ===================================================== */
function viewAvaliar(tourId) {
  const S = viewAvaliar._s = viewAvaliar._s || { estrelas: 0, tourId: tourId || '' };
  const tours = Tours.all().filter(x => !x.oculto);
  app.innerHTML = `${topoCarol()}
  <main class="wrap roteiro avaliar">
    <p class="lema escuro">Thank you for coming with me!</p>
    <h1 class="pageh">Como foi o seu tour?</h1>
    <div class="estrelas" role="radiogroup" aria-label="Nota">${[1, 2, 3, 4, 5].map(n =>
      `<button type="button" role="radio" aria-checked="${S.estrelas === n}" class="est ${n <= S.estrelas ? 'on' : ''}" data-e="${n}" aria-label="${n} estrela${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
    <label class="fld">Conte em poucas palavras<textarea id="avTx" rows="4" placeholder="O que você mais gostou?">${esc(S.texto || '')}</textarea></label>
    <label class="fld">Seu primeiro nome<input id="avNome" value="${esc(S.nome || '')}"></label>
    <label class="fld">Qual tour?<select id="avTour"><option value="">—</option>${tours.map(x => `<option value="${x.id}" ${S.tourId === x.id ? 'selected' : ''}>${esc(tl(x.name))}</option>`).join('')}</select></label>
    <label class="optin"><input type="checkbox" id="avPub" checked><span><b>A Carol pode mostrar minha avaliação no app</b><small>Só o primeiro nome aparece.</small></span></label>
    <button class="cta" id="avEnviar">Enviar avaliação</button>
  </main>`;
  ligaVoltar('/');
  const guarda = () => { S.texto = $('#avTx').value; S.nome = $('#avNome').value; S.tourId = $('#avTour').value; };
  $$('[data-e]').forEach(b => b.onclick = () => { guarda(); S.estrelas = +b.dataset.e; viewAvaliar(S.tourId); });
  $('#avEnviar').onclick = () => {
    guarda();
    if (!S.estrelas) return toast('Toque nas estrelas');
    DB.avaliacoes.push({ id: uid(), nome: (S.nome || 'Cliente').trim().split(' ')[0], estrelas: S.estrelas, texto: (S.texto || '').trim().slice(0, 600),
      tourId: S.tourId, data: isoToday(), autorizou: $('#avPub').checked, publicar: false });
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    viewAvaliar._s = null;
    app.innerHTML = `${topoCarol()}<main class="wrap roteiro fim avaliar">
      <div class="okc">✓</div><h2 class="okh">Obrigada! ❤️</h2>
      <p class="hint center">Sua avaliação chegou para a Carol. ${S.estrelas >= 4 ? 'Se puder, deixe também no Google — ajuda muito quem está escolhendo uma guia em Londres.' : ''}</p>
      ${S.estrelas >= 4 ? `<a class="cta" target="_blank" rel="noopener" href="${esc(DB.settings.reviewGoogle)}">Avaliar também no Google ↗</a>` : ''}
      <button class="cta soft" id="avVolta">Voltar ao início</button></main>`;
    ligaVoltar('/'); $('#avVolta').onclick = () => go('/');
  };
}
function viewAvaliacoes() {
  const lista = (DB.avaliacoes || []).filter(a => a.publicar);
  const media = lista.length ? (lista.reduce((s, a) => s + a.estrelas, 0) / lista.length).toFixed(1).replace('.', ',') : '';
  app.innerHTML = `${topoCarol()}
  <main class="wrap avaliacoes">
    <h1 class="pageh">Avaliações</h1>
    ${lista.length ? `<p class="avMedia"><b>${media}</b> ★ · ${lista.length} ${lista.length === 1 ? 'avaliação' : 'avaliações'}</p>
      <div class="avLista">${lista.map(a => { const x = Tours.get(a.tourId); return `<figure class="depoCard"><span class="depoAspas">“</span><blockquote>${esc(a.texto)}</blockquote>
        <figcaption><b>${esc(a.nome)}</b> <span class="avEst">${'★'.repeat(a.estrelas)}</span><small>${x ? esc(tl(x.name)) : ''}</small></figcaption></figure>`; }).join('')}</div>`
      : `<p class="rtintro">As avaliações dos tours aparecem aqui assim que a Carol aprova. Fez um tour com ela?</p>`}
    <button class="cta" id="avNova">Deixar a minha avaliação</button>
  </main>`;
  ligaVoltar('/');
  $('#avNova').onclick = () => go('/avaliar');
}

if (typeof module !== 'undefined') module.exports = { janelaDoTour, INGRESSOS };
