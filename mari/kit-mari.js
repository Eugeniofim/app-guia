/* =====================================================
   O KIT DA VIAGEM (27/10/2026)

   Pedido da Mari (pelo Eugênio): "quando o cliente compra um tour, que ele
   receba — ou fique fácil pra ela no app — o PDF ou link do passeio com tudo
   o que precisa ter, voucher… tudo bem completo".

   UM link por CLIENTE (não um por passeio): quem comprou transfer, walking
   tour e LEGOLAND recebe uma página só, "Sua viagem com a Mari", com tudo em
   ordem de data. O PDF sai da mesma página (pdf-mari.js).
   Cada serviço traz: o voucher (código), data/hora/duração, ponto de encontro
   com "abrir no mapa", o guia escalado, o programa (paradas), incluso e não
   incluso, o que levar, o pagamento (pago, falta, botão de pagar o sinal) e
   "pôr na minha agenda". Depois: dicas da Dinamarca (ela edita), descontos dos
   parceiros, brindes, o roteiro personalizado se houver, cancelamento e contato.

   O LINK CURTO E SEMPRE ATUALIZADO (#/k/<código>): o kit fica numa tabela só
   dele no banco (mari.kits — LIGAR-KIT-MARI.sql). O cliente lê UM kit pelo
   código (função mari.kit), nunca a tabela; só a dona grava. Mudou a hora, o
   guia ou um pagamento → o app republica sozinho e o cliente vê no mesmo link.
   Sem a tabela (ou sem login), cai no link COMPRIDO (#/kt/…, o kit viaja dentro
   do link, como o voucher): funciona, mas não se atualiza.

   Kit.dados(chave) · Kit.link(chave) → url · Kit.mensagem(chave) → texto
   Kit.abrir(chave) · Kit.urlConhecida(chave) (o curto, se já existe — para o lembrete)
   ===================================================== */
'use strict';

const KIT_DICAS_PADRAO = [
  'Do aeroporto ao centro: o metrô (linha M2) leva uns 15 minutos. O bilhete se compra no app DOT Billetter ou na máquina da estação.',
  'Cartão é aceito em quase todo lugar. A moeda é a coroa dinamarquesa (DKK).',
  'Tomada: a europeia de dois pinos redondos serve.',
  'Gorjeta não é obrigatória: o serviço já vem incluído.',
  'A água da torneira é ótima para beber.',
  'Bicicleta tem preferência na ciclovia: olhe para os dois lados antes de atravessar.',
  'Emergência: 112.',
];
const KIT_LEVAR = {
  transfer: ['Passaporte e documentos à mão', 'Número do voo (para a Mari acompanhar atrasos)', 'Celular carregado e este kit'],
  boat: ['Casaco corta-vento: na água venta mais', 'Óculos de sol', 'Chegar 10 minutos antes do embarque'],
  bike: ['Roupa confortável para pedalar', 'Capa de chuva fininha', 'Luvas, se estiver frio'],
  carro: ['Água e um lanche para a estrada', 'Documento com foto', 'Carregador do celular'],
};
const kitDicas = () => (Array.isArray(DB.settings.kitDicas) ? DB.settings.kitDicas : KIT_DICAS_PADRAO).map(x => String(x || '').trim()).filter(Boolean);
const kitChaveDe = (b) => String((b && (b.email || b.whats || b.name)) || '').toLowerCase();
const kitPrim = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const kitDig = (w) => String(w || '').replace(/\D/g, '');
/* o endereço oficial dela (o link vai para o cliente — nunca o endereço antigo nem o de teste) */
const kitBase = () => /guia\.eugeniofim\.com\/mari\/|tournadinamarca\.com/.test(location.href) ? 'https://tournadinamarca.com/' : Publico.base();
function kitData(iso, opts) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', Object.assign({ weekday: 'long', day: 'numeric', month: 'long' }, opts || {}));
}
const kitCap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
function kitPeriodo(sv) {
  if (!sv.length) return '';
  const a = sv[0].data, b = sv[sv.length - 1].data;
  const f = (iso, ano) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', Object.assign({ day: 'numeric', month: 'long' }, ano ? { year: 'numeric' } : {}));
  return a === b ? f(a, true) : f(a, false) + ' a ' + f(b, true);
}

/* as reservas do cliente que entram no kit: as que estão por vir (e as de ontem); se a viagem já passou, as últimas */
function kitReservas(chave) {
  const todas = DB.bookings.filter(b => b.status === 'confirmed' && kitChaveDe(b) === chave)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const desde = addDays(isoToday(), -1), vivas = todas.filter(b => b.date >= desde);
  return vivas.length ? vivas : todas.slice(-3);
}
function kitServico(b) {
  const x = Tours.get(b.tourId) || {};
  const g = typeof Equipe !== 'undefined' ? Equipe.deQuem(b.id) : null;
  const pago = Bookings.paid(b), restante = Bookings.due(b);
  const sinalFalta = typeof mariSinalFalta === 'function' ? mariSinalFalta(b) : 0;
  const v = typeof window.valorDoLink === 'function' ? window.valorDoLink(b) : restante;
  const pagarUrl = restante > 0 && v > 0 && (sinalFalta > 0 || !DB.settings.saldoNoDia) && typeof linkPagamento === 'function' ? linkPagamento(b, v) : '';
  const lista = (a) => (a && (a.pt || a.en) ? (a.pt || a.en) : Array.isArray(a) ? a : []).map(s => String(s || '').trim()).filter(Boolean);
  const F = typeof fichaDe === 'function' ? fichaDe(kitChaveDe(b)) : null, cad = (F && F.cad) || {};
  const s = {
    code: b.code, nome: (x.name && x.name.pt) || (x.name ? tl(x.name) : '') || b.tourName || 'Passeio', tipo: x.type || '',
    data: b.date, hora: b.time || '', pessoas: +b.pax || 1, duracao: x.duration || '', durMin: typeof agDuracaoMin === 'function' ? agDuracaoMin(x) : 120,
    encontro: x.meeting ? noIdioma(x.meeting) : '', hotel: cad.hotel || '', guia: g ? g.nome : '', foto: x.photo || '',
    resumo: x.tagline ? noIdioma(x.tagline) : '',
    paradas: (x.stops || []).map(p => ({ n: p.n ? noIdioma(p.n) : '', d: p.d ? noIdioma(p.d) : '' })).filter(p => p.n).slice(0, 12),
    inclui: lista(x.includes), naoInclui: lista(x.notIncludes),
    levar: x.type === 'transfer' ? KIT_LEVAR.transfer : voDicas().concat(KIT_LEVAR[x.type] || []).slice(0, 8),
    pago, restante, cancel: typeof cancelaTxt === 'function' ? cancelaTxt(x) : '',
  };
  if (restante > 0) { if (DB.settings.saldoNoDia && !(sinalFalta > 0)) s.noDia = true; else if (Bookings.dueDate) s.vence = Bookings.dueDate(b); }
  if (pagarUrl) { s.pagarUrl = pagarUrl; s.pagarValor = v; }
  return s;
}
/* o kit inteiro (é ISTO que vai para o cliente: sem e-mail nem telefone dele) */
async function kitDados(chave, opts) {
  const bs = kitReservas(chave); if (!bs.length) return null;
  const sv = bs.map(kitServico);
  const nome = (typeof fichaDe === 'function' && (fichaDe(chave) || {}).nome) || bs[0].name || '';
  const st = DB.settings;
  const brindes = (typeof Brindes !== 'undefined' ? Brindes.all() : []).filter(b => b.sempre && typeof brLinkOk === 'function' && brLinkOk(b.url))
    .map(b => ({ titulo: b.titulo, url: typeof brUrlAbs === 'function' ? brUrlAbs(b.url) : b.url }));
  let roteiro = '';
  try {
    const r = typeof Roteiro !== 'undefined' && Roteiro.all().filter(z => (z.cliente && (z.cliente.chave === chave || (nome && z.cliente.nome && z.cliente.nome.toLowerCase() === nome.toLowerCase()))) && z.dias.some(d => d.paradas.length)).pop();
    if (r && !(opts && opts.semRoteiro)) roteiro = await Roteiro.linkCliente(r.id);
  } catch (e) {}
  const d = { v: 1, nome, periodo: kitPeriodo(sv), servicos: sv, dicas: kitDicas(), parceiros: typeof voParceiros === 'function' ? voParceiros() : [],
    brindes, roteiro, whats: kitDig(st.whats), email: (typeof GUIA_CFG !== 'undefined' && GUIA_CFG.email) || '', insta: String(st.insta || '').replace(/^@/, ''),
    negocio: (typeof guiaNegocio === 'function' && guiaNegocio()) || 'Tour na Dinamarca', gerado: new Date().toISOString() };
  return d;
}
/* o do link comprido: sem as descrições das paradas nem o roteiro (link menor) */
function kitEnxuto(d) {
  const o = JSON.parse(JSON.stringify(d));
  o.servicos.forEach(s => { s.paradas = s.paradas.map(p => ({ n: p.n })); });
  delete o.roteiro; return o;
}

/* ---------- o link: curto (tabela) ou comprido (dentro do link) ---------- */
function kitTokens() { DB.privado = DB.privado || {}; if (!DB.privado.kits || typeof DB.privado.kits !== 'object') DB.privado.kits = {}; return DB.privado.kits; }
function kitNovoToken() {
  const A = 'ACDEFGHJKMNPQRTUVWXYabcdefghjkmnpqrstuvwxyz34679', u = new Uint8Array(10);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(u) : u.forEach((_, i) => { u[i] = Math.random() * 256; });
  return [...u].map(n => A[n % A.length]).join('');
}
const kitPodeNuvem = () => typeof temNuvem === 'function' && temNuvem() && typeof isLoggedIn === 'function' && isLoggedIn() && !Kit.semTabela;
async function kitPublica(chave, dados) {
  if (!kitPodeNuvem()) return false;
  const T = kitTokens(); let t = T[chave];
  if (!t || !t.token) { t = T[chave] = { token: kitNovoToken(), criado: new Date().toISOString() }; save(); }
  try {
    const r = await supaFetch('kits', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ token: t.token, dados, atualizado_em: new Date().toISOString() }) });
    if (r.status === 404 || r.status === 400) { const j = await r.json().catch(() => ({})); if (/kits|relation|schema cache|PGRST205/i.test(JSON.stringify(j))) Kit.semTabela = true; return false; }
    if (!r.ok && r.status !== 201 && r.status !== 204) return false;
    if (!t.publicado) { t.publicado = new Date().toISOString(); save(); }
    return true;
  } catch (e) { return false; }
}
const Kit = {
  semTabela: false,
  dados: kitDados,
  async link(chave) {
    const d = await kitDados(chave); if (!d) throw new Error('esse cliente ainda não tem reserva confirmada');
    if (await kitPublica(chave, d)) return kitBase() + '#/k/' + kitTokens()[chave].token;
    return kitBase() + '#/kt/' + await Publico.codifica(kitEnxuto(d));
  },
  urlConhecida(chave) { const t = (DB.privado && DB.privado.kits && DB.privado.kits[chave]) || null; return t && t.publicado ? kitBase() + '#/k/' + t.token : ''; },
  curto(chave) { return !!this.urlConhecida(chave); },
  async mensagem(chave, url) {
    const d = await kitDados(chave, { semRoteiro: true }); if (!d) throw new Error('esse cliente ainda não tem reserva confirmada');
    url = url || await this.link(chave);
    const n = d.servicos.length;
    return `Oi, ${kitPrim(d.nome)}! Tudo bem? 😊 Aqui está o kit da sua viagem com a Mari: ${n > 1 ? 'os vouchers dos ' + n + ' serviços' : 'o voucher'}, os horários, os pontos de encontro e tudo o que vocês precisam saber.\n${url}\n\nGuarde no celular: no dia, é só mostrar o voucher. Qualquer dúvida, me chama aqui!`;
  },
  abrir(chave) { if (!chave) return; const h = location.hash.slice(1); if (h && !/^\/adm\/kit\//.test(h)) Kit._volta = h; go('/adm/kit/' + encodeURIComponent(chave)); },
  /* republica os kits já mandados quando a reserva muda (hora, guia, pagamento) */
  _fila: new Set(), _t: null,
  agendar(chave) {
    if (!chave || !(DB.privado && DB.privado.kits && DB.privado.kits[chave])) return;
    this._fila.add(chave); clearTimeout(this._t);
    this._t = setTimeout(async () => { const l = [...this._fila]; this._fila.clear(); for (const c of l) { try { const d = await kitDados(c); if (d) await kitPublica(c, d); } catch (e) {} } }, 2500);
  },
};
window.Kit = Kit;

/* ---------- a agenda do cliente (.ics e Google) ---------- */
function kitGoogle(s, d) {
  if (typeof agGoogleLink !== 'function') return '';
  return agGoogleLink({ titulo: s.nome + ' · ' + (d.negocio || 'Tour na Dinamarca'), data: s.data, hora: s.hora, duracaoMin: s.durMin, local: s.encontro || s.hotel || '',
    descricao: `Voucher ${s.code}${s.guia ? ' · guia ' + s.guia : ''}${d.whats ? ' · WhatsApp da Mari +' + d.whats : ''}` });
}
function kitIcs(d) {
  const z = (iso, hm) => iso.replace(/-/g, '') + 'T' + (hm || '09:00').replace(':', '') + '00';
  const soma = (hm, min) => { const [h, m] = (hm || '09:00').split(':').map(Number); const t = Math.min(1439, h * 60 + m + (min || 120)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
  const e = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const ev = d.servicos.map(s => ['BEGIN:VEVENT', 'UID:' + s.code + '@tournadinamarca.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
    s.hora ? 'DTSTART;TZID=Europe/Copenhagen:' + z(s.data, s.hora) : 'DTSTART;VALUE=DATE:' + s.data.replace(/-/g, ''),
    s.hora ? 'DTEND;TZID=Europe/Copenhagen:' + z(s.data, soma(s.hora, s.durMin)) : 'DTEND;VALUE=DATE:' + addDays(s.data, 1).replace(/-/g, ''),
    'SUMMARY:' + e(s.nome + ' · ' + d.negocio), 'LOCATION:' + e(s.encontro || s.hotel || ''), 'DESCRIPTION:' + e('Voucher ' + s.code + (s.guia ? ' · guia ' + s.guia : '')),
    'BEGIN:VALARM', 'TRIGGER:-PT12H', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(s.nome), 'END:VALARM', 'END:VEVENT'].join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tour na Dinamarca//Kit//PT', ...ev, 'END:VCALENDAR'].join('\r\n');
}
function kitBaixaIcs(d) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([kitIcs(d)], { type: 'text/calendar' }));
  a.download = 'viagem-' + (kitPrim(d.nome) || 'tour').toLowerCase() + '.ics'; document.body.appendChild(a); a.click(); a.remove();
}
const kitMapa = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q + ', Copenhagen');

/* ---------- o documento (o mesmo no painel, na página do cliente e no PDF) ---------- */
function kitDocHtml(d) {
  const ic = { mapa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>' };
  const sv = d.servicos || [];
  const pagoT = sv.reduce((s, x) => s + (+x.pago || 0), 0), faltaT = sv.reduce((s, x) => s + (+x.restante || 0), 0);
  const servico = (s, k) => `<section class="kt-sv kt-bl" id="kt-sv-${k}">
      <div class="kt-svTopo">${s.foto ? `<img src="${esc(s.foto)}" alt="" loading="lazy">` : ''}<div class="kt-dia"><small>${esc(kitCap(kitData(s.data, { weekday: 'short', day: undefined, month: undefined })).replace('.', ''))}</small><b>${esc(s.data.slice(8, 10))}</b><small>${esc(new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''))}</small></div></div>
      <div class="kt-svCorpo">
        <div class="kt-cab"><p class="kt-eyebrow">${s.tipo === 'transfer' ? 'Transfer' : 'Passeio'}</p><div class="kt-cod"><small>Voucher</small><b>${esc(s.code)}</b></div></div>
        <h2>${esc(s.nome)}</h2>${s.resumo ? `<p class="kt-res">${esc(s.resumo)}</p>` : ''}
        <div class="kt-grade">
          <div><small>Quando</small><b>${esc(kitCap(kitData(s.data)))}</b>${s.hora ? `<span>às ${esc(s.hora)}${s.duracao && !/conforme/i.test(s.duracao) ? ' · ' + esc(s.duracao) : ''}</span>` : ''}</div>
          <div><small>Pessoas</small><b>${esc(s.pessoas)} ${+s.pessoas > 1 ? 'pessoas' : 'pessoa'}</b>${s.guia ? `<span>Guia: ${esc(s.guia)}</span>` : ''}</div>
          <div class="kt-lg"><small>Ponto de encontro</small><b>${esc(s.encontro || 'A Mari confirma pelo WhatsApp')}</b>${s.hotel ? `<span>Hospedagem: ${esc(s.hotel)}</span>` : ''}
            ${s.encontro || s.hotel ? `<a class="kt-lk" href="${esc(kitMapa(/hospedagem/i.test(s.encontro) && s.hotel ? s.hotel : (s.encontro || s.hotel)))}" target="_blank" rel="noopener">${ic.mapa}Abrir no mapa</a>` : ''}</div>
        </div>
        ${s.paradas.length ? `<div class="kt-bl"><h3>O programa</h3><ol class="kt-par">${s.paradas.map(p => `<li><b>${esc(p.n)}</b>${p.d ? `<span>${esc(p.d)}</span>` : ''}</li>`).join('')}</ol></div>` : ''}
        ${s.inclui.length || s.naoInclui.length ? `<div class="kt-duas kt-bl">${s.inclui.length ? `<div><h3>Incluso</h3><ul class="kt-ok">${s.inclui.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}${s.naoInclui.length ? `<div><h3>Não incluso</h3><ul class="kt-no">${s.naoInclui.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</div>` : ''}
        ${s.levar.length ? `<div class="kt-bl"><h3>O que levar</h3><ul class="kt-levar">${s.levar.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${(+s.pago || 0) > 0 || (+s.restante || 0) > 0 ? `<div class="kt-pg kt-bl"><div><small>Pago</small><b>${esc(eur(+s.pago || 0))}</b></div>${s.restante > 0 ? `<div class="resta"><small>${s.noDia ? 'Restante no dia' : 'Falta pagar'}</small><b>${esc(eur(s.restante))}</b><span>${s.noDia ? 'em euro, em dinheiro, no dia' : s.vence ? 'até ' + esc(kitData(s.vence, { weekday: undefined })) : ''}</span></div>` : '<div><small>Situação</small><b>Tudo pago ✓</b></div>'}</div>
          ${s.pagarUrl ? `<a class="kt-cta kt-tela" href="${esc(s.pagarUrl)}">Pagar ${esc(eur(s.pagarValor || s.restante))} agora (Pix ou Wise)</a>` : ''}` : ''}
        <div class="kt-acs kt-tela"><a class="kt-lk" href="${esc(kitGoogle(s, d))}" target="_blank" rel="noopener">${ic.cal}Pôr no Google Agenda</a></div>
        ${s.cancel ? `<p class="kt-fino">${esc(s.cancel)}</p>` : ''}
      </div></section>`;
  return `<article class="ktDoc">
    <header class="kt-topo kt-bl"><img class="kt-selo" src="arte/selo-mari-circ.png" alt="">
      <p class="kt-eyebrow">Sua viagem com a Mari · ${esc(d.negocio)}</p>
      <h1>${esc(d.nome || 'Sua viagem')}</h1>
      <p class="kt-per">${esc(d.periodo)} · ${sv.length} ${sv.length > 1 ? 'serviços' : 'serviço'}</p>
      <div class="kt-acsTopo kt-tela">${d.whats ? `<a class="kt-cta" href="${esc(waLink('Oi, Mari! Sobre a minha viagem…', d.whats))}" target="_blank" rel="noopener">${typeof ICONE_WA !== 'undefined' ? ICONE_WA : ''}WhatsApp da Mari</a>` : ''}<button type="button" class="kt-bt" data-kt-ics>Pôr tudo na minha agenda</button></div>
    </header>
    ${sv.length > 1 ? `<nav class="kt-lista kt-bl" aria-label="Os serviços da viagem">${sv.map((s, k) => `<a href="#kt-sv-${k}" data-kt-ir="${k}"><span class="kt-ld">${esc(s.data.slice(8, 10))}/${esc(s.data.slice(5, 7))}</span><b>${esc(s.nome)}</b><span>${esc(s.hora || '')}</span></a>`).join('')}</nav>` : ''}
    ${sv.length > 1 && (pagoT || faltaT) ? `<div class="kt-pg kt-tot kt-bl"><div><small>Total pago</small><b>${esc(eur(pagoT))}</b></div><div class="${faltaT > 0 ? 'resta' : ''}"><small>Falta</small><b>${esc(eur(faltaT))}</b></div></div>` : ''}
    ${sv.map(servico).join('')}
    ${d.roteiro ? `<section class="kt-box kt-bl"><h3>O seu roteiro personalizado</h3><p>Os dias livres, com mapas, montados pela Mari para vocês.</p><a class="kt-cta" href="${esc(d.roteiro)}" target="_blank" rel="noopener">Abrir o roteiro</a></section>` : ''}
    ${(d.dicas || []).length ? `<section class="kt-box kt-bl"><h3>Dicas para Copenhague</h3><ul class="kt-levar">${d.dicas.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
    ${(d.parceiros || []).length ? `<section class="kt-box kt-bl"><h3>Descontos dos parceiros</h3><p class="kt-fino">Com esta viagem você tem desconto nestas lojas. Para usar, é só pedir à sua guia.</p>${d.parceiros.map(p => `<div class="kt-parc"><i>${esc((+p.desconto || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }))}%</i><div><b>${esc(p.nome)}</b>${p.cat || p.como ? `<small>${esc([p.cat, p.como].filter(Boolean).join(' · '))}</small>` : ''}</div></div>`).join('')}</section>` : ''}
    ${(d.brindes || []).length ? `<section class="kt-box kt-bl"><h3>Presentes da Mari</h3>${d.brindes.map(b => `<a class="kt-lk" href="${esc(b.url)}" target="_blank" rel="noopener">📎 ${esc(b.titulo)}</a>`).join('')}</section>` : ''}
    <footer class="kt-pe kt-bl"><div class="kt-qr" data-kt-qr></div>
      <div><b>No dia, é só mostrar o voucher</b><span>No celular ou impresso. O código de cada serviço está no topo dele.</span>
        <span class="kt-cont">${d.whats ? `WhatsApp da Mari: +${esc(d.whats)}` : ''}${d.email ? ` · ${esc(d.email)}` : ''}${d.insta ? ` · @${esc(d.insta)}` : ''}</span></div></footer>
  </article>`;
}
function kitLiga(raiz, d, url) {
  if (!raiz) return;
  const b = raiz.querySelector('[data-kt-ics]'); if (b) b.onclick = () => { kitBaixaIcs(d); toast('Agenda baixada: abra o arquivo para pôr tudo no celular'); };
  raiz.querySelectorAll('[data-kt-ir]').forEach(a => a.onclick = (e) => { e.preventDefault(); const el = raiz.querySelector('#kt-sv-' + a.dataset.ktIr); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  const q = raiz.querySelector('[data-kt-qr]'); if (q && url && typeof qrSvg === 'function') q.innerHTML = qrSvg(url, { tamanho: 110, alt: 'QR code do kit da viagem' }) || '';
}

/* ---------- a página do cliente ---------- */
window.ROTAS_EXTRA = window.ROTAS_EXTRA || {};
function kitPaginaCliente(d, url) {
  kitCss();
  paginaPublica('Sua viagem · ' + (d.nome || 'Tour na Dinamarca'), kitDocHtml(d), { rodape: 'Guarde este link no celular. Qualquer dúvida, fale com a Mari no WhatsApp.', waTexto: 'Oi, Mari! Sobre a minha viagem…' });
  kitLiga(document.getElementById('pubPrint'), d, url || location.href);
}
/* o curto: lê o kit no banco pelo código */
ROTAS_EXTRA['k'] = async (partes) => {
  const tok = String((partes || [])[0] || '').replace(/[^A-Za-z0-9]/g, '');
  if (!tok) return paginaPublicaErro();
  app.innerHTML = '<main class="wrap"><p class="why center" style="margin-top:40px">Abrindo a sua viagem…</p></main>';
  try {
    const r = await supaFetch('rpc/kit', { method: 'POST', body: JSON.stringify({ p_token: tok }) });
    const d = r.ok ? await r.json() : null;
    if (!d || !d.servicos) return paginaPublicaErro('Este link de viagem não existe mais. Peça à Mari um novo pelo WhatsApp.');
    kitPaginaCliente(d, location.href);
  } catch (e) { paginaPublicaErro('Sem internet para abrir a sua viagem. Tente de novo em instantes.'); }
};
/* o comprido: o kit veio dentro do link */
ROTAS_EXTRA['kt'] = (partes) => abrePublico(partes, (d) => kitPaginaCliente(d, location.href));

/* ---------- a tela do painel: #/adm/kit/<chave> ---------- */
async function admKit(chave) {
  kitCss();
  const d = await kitDados(chave);
  if (!d) { toast('Esse cliente ainda não tem reserva confirmada'); go(Kit._volta || '/adm/clients'); return; }
  const fone = kitDig((kitReservas(chave)[0] || {}).whats);
  document.title = 'Viagem - ' + (d.nome || 'cliente');
  const voltar = Kit._volta ? '#' + Kit._volta : '#/adm/clients/' + encodeURIComponent(chave);
  app.innerHTML = `<div class="ktTela">
    <div class="orcBarra"><a class="mini" href="${esc(voltar)}">← voltar</a>
      <span style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini" id="ktCopia">Copiar link</button><button class="mini" id="ktZap">${fone ? 'Mandar no WhatsApp' : 'Mandar no WhatsApp (escolher contato)'}</button><button class="cta sm" id="ktPdf">Gerar PDF</button></span></div>
    <p class="ktEstado" id="ktEstado">${Kit.curto(chave) ? '✓ Link curto e sempre atualizado: o cliente vê as mudanças no mesmo link.' : kitPodeNuvem() ? 'O link curto nasce quando você mandar ou copiar.' : Kit.semTabela ? 'Link comprido: falta ligar a tabela do kit no Supabase (LIGAR-KIT-MARI.sql). Funciona, mas não se atualiza sozinho.' : 'Link comprido (sem login ou sem nuvem): funciona, mas não se atualiza sozinho.'}</p>
    <div id="ktPrint">${kitDocHtml(d)}</div>
    <section class="card ktDicasEd"><h3>Dicas para Copenhague</h3><p class="why">Vão em todo kit. Uma por linha.</p>
      <textarea id="ktDicasTx" rows="7">${esc(kitDicas().join('\n'))}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="cta sm" id="ktDicasOk">Salvar as dicas</button><button class="mini" id="ktDicasPadrao">Voltar às dicas padrão</button></div></section>
  </div>`;
  const url0 = Kit.urlConhecida(chave);
  kitLiga(document.getElementById('ktPrint'), d, url0 || kitBase());
  if (typeof pdfLiga === 'function') pdfLiga($('#ktPdf'), () => $('#ktPrint'), () => document.title);
  const pega = async (b) => { b.disabled = true; try { const url = await Kit.link(chave); const e = $('#ktEstado'); if (e && Kit.curto(chave)) e.textContent = '✓ Link curto e sempre atualizado: o cliente vê as mudanças no mesmo link.'; kitLiga(document.getElementById('ktPrint'), d, url); return url; } finally { b.disabled = false; } };
  $('#ktCopia').onclick = async (e) => { try { const url = await pega(e.target); try { await navigator.clipboard.writeText(url); toast('Link copiado'); } catch (x) { prompt('Copie o link:', url); } } catch (x) { toast(x.message); } };
  $('#ktZap').onclick = async (e) => { try { const url = await pega(e.target); const msg = await Kit.mensagem(chave, url);
    window.open(fone.length >= 8 ? waLink(msg, fone) : 'https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener'); } catch (x) { toast(x.message); } };
  $('#ktDicasOk').onclick = () => { DB.settings.kitDicas = $('#ktDicasTx').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 14); save(); Kit.agendar(chave); toast('Dicas salvas'); admKit(chave); };
  $('#ktDicasPadrao').onclick = () => { delete DB.settings.kitDicas; save(); toast('Dicas padrão de volta'); admKit(chave); };
  /* abriu o kit: republica (se já tem o curto), para o link do cliente estar igual ao que ela vê */
  if (Kit.curto(chave)) kitPublica(chave, d);
}

/* ---------- os botões "Kit da viagem" ao lado de cada "Voucher" ---------- */
function ktInjeta() {
  try {
    document.querySelectorAll('#stage [data-voucher]').forEach(v => {
      if (v.nextElementSibling && v.nextElementSibling.hasAttribute('data-kit')) return;
      const b = DB.bookings.find(x => x.id === v.dataset.voucher || x.code === v.dataset.voucher); if (!b) return;
      v.insertAdjacentHTML('afterend', `<button type="button" class="${esc(v.className)}" data-kit="${esc(kitChaveDe(b))}" ${v.getAttribute('style') ? `style="${esc(v.getAttribute('style'))}"` : ''}>Kit da viagem</button>`);
    });
    document.querySelectorAll('#stage [data-kit]').forEach(bt => { if (bt._kt) return; bt._kt = true; bt.onclick = (e) => { e.stopPropagation(); Kit.abrir(bt.dataset.kit); }; });
  } catch (e) { console.warn('kit', e); }
}
if (typeof MutationObserver === 'function' && typeof app !== 'undefined' && app) new MutationObserver(() => setTimeout(ktInjeta, 0)).observe(app, { childList: true, subtree: true });

/* ---------- reserva mudou → o kit que o cliente já tem se atualiza ---------- */
/* toda mudança de reserva passa por cloudPushBooking/cloudUpdateBooking (painel, assistente, pagamento) */
for (const nome of ['cloudPushBooking', 'cloudUpdateBooking']) {
  if (typeof window[nome] !== 'function') continue;
  const orig = window[nome];
  window[nome] = function (b) { try { if (b) Kit.agendar(kitChaveDe(b)); } catch (e) {} return orig.apply(this, arguments); };
}
if (typeof Bookings !== 'undefined') for (const k of ['create', 'criarManual', 'cancel', 'confirmarCliente', 'payBalance']) {
  if (typeof Bookings[k] !== 'function') continue;
  const orig = Bookings[k];
  Bookings[k] = function (a) { const r = orig.apply(this, arguments);
    try { const b = (r && r.id && r) || DB.bookings.find(x => x.id === a || x.code === a) || null; if (b) Kit.agendar(kitChaveDe(b)); } catch (e) {} return r; };
}
if (typeof Equipe !== 'undefined' && typeof Equipe.escalar === 'function') {
  const _esc = Equipe.escalar.bind(Equipe);
  Equipe.escalar = function (code) { const r = _esc.apply(Equipe, arguments); try { const b = DB.bookings.find(x => x.id === code || x.code === code); if (b) Kit.agendar(kitChaveDe(b)); } catch (e) {} return r; };
}

/* "Avisar cliente" (27/10): o e-mail de confirmação (função avisos, no servidor) leva o link do kit.
   O gatilho do banco dispara quando a reserva é marcada — então o kit é publicado ANTES (no máximo 5 s). */
if (typeof Bookings !== 'undefined' && typeof Bookings.confirmarCliente === 'function') {
  const _conf = Bookings.confirmarCliente.bind(Bookings);
  Bookings.confirmarCliente = function (id) {
    const b = Bookings.get(id); if (!b || b.clienteConfirmado) return null;
    if (!kitPodeNuvem()) return _conf(id);
    b.clienteConfirmado = { em: new Date().toISOString(), publicandoKit: true };   /* a tela já mostra "avisado" */
    Promise.race([Kit.link(kitChaveDe(b)), new Promise(r => setTimeout(r, 5000))]).catch(() => {})
      .finally(() => { delete b.clienteConfirmado;
        /* o código vai NA reserva (o servidor lê primeiro aqui): a fila do privado sobe ~1 s depois e o e-mail sairia sem o link curto */
        const t = kitTokens()[kitChaveDe(b)]; if (t && t.token && t.publicado) b.kitToken = t.token;
        _conf(id); });
    return b;
  };
}

/* o servidor (e-mail de recibo e confirmação) só põe o link #/kt/ em app que sabe abrir o kit: avisa nos Ajustes (públicos) */
if (typeof DB !== 'undefined' && DB && DB.settings && +DB.settings.kitVersao !== 1) { DB.settings.kitVersao = 1; try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) {} }

/* ---------- ligar no app (aba escondida) ---------- */
const _viewAdmKit = viewAdm;
viewAdm = function (tab, arg) { if (tab === 'kit') return admKit(arg ? decodeURIComponent(arg) : ''); return _viewAdmKit(tab, arg); };

function kitCss() {
  if (document.getElementById('ktCss')) return;
  const s = document.createElement('style'); s.id = 'ktCss';
  /* a marca dela: azul-marinho #1D2A44 · amarelo #F2C230 · creme #FBF7EC */
  s.textContent = `
  .ktTela{padding:16px;background:var(--paper);min-height:100vh}
  .ktEstado{max-width:794px;margin:0 auto 12px;font-size:13.5px;color:var(--ink-2)}
  .ktDicasEd{max-width:794px;margin:16px auto}.ktDicasEd textarea{width:100%;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink)}
  .ktDoc{--kt-n:#1D2A44;--kt-a:#F2C230;--kt-c:#FBF7EC;--kt-t:#1E2433;--kt-t2:#545B6B;--kt-l:#E6E0D2;max-width:794px;margin:0 auto;background:var(--kt-c);color:var(--kt-t);border-radius:18px;overflow:hidden;box-shadow:0 18px 50px -30px rgba(0,0,0,.4);font-size:15px;line-height:1.5}
  .ktDoc h1,.ktDoc h2,.ktDoc h3{font-family:var(--f-display,Montserrat,system-ui);color:var(--kt-n);margin:0}
  .kt-topo{background:var(--kt-n);color:var(--kt-c);padding:28px 28px 24px;position:relative}
  .kt-topo h1{color:#fff;font-size:30px;line-height:1.15;margin:6px 0 4px}
  .kt-selo{width:64px;height:64px;border-radius:50%;box-shadow:0 0 0 3px rgba(251,247,236,.85);float:right;margin-left:12px}
  .kt-eyebrow{margin:0;font:700 11px/1.3 var(--f-ui,system-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--kt-a)}
  .kt-svCorpo .kt-eyebrow{color:#9A6B00}
  .kt-cab{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
  .kt-cod{flex:none;text-align:center;padding:6px 12px;border:1.5px dashed var(--kt-n);border-radius:12px;background:var(--kt-c);line-height:1.1;margin-top:-8px}
  .kt-cod small{display:block;font:700 9.5px/1.2 var(--f-ui,system-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--kt-t2)}
  .kt-cod b{display:block;font:800 17px/1.2 var(--f-mono,ui-monospace);color:var(--kt-n);letter-spacing:.04em}
  .kt-eyebrow b{letter-spacing:.06em}
  .kt-per{margin:0;opacity:.85}
  .kt-acsTopo{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;clear:both}
  .kt-cta{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;background:var(--kt-a);color:var(--kt-n);font-weight:700;text-decoration:none;border:0;cursor:pointer;font-size:14.5px}
  .kt-cta svg{width:18px;height:18px}
  .kt-bt{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid rgba(251,247,236,.35);background:transparent;color:var(--kt-c);font:600 14px/1 var(--f-ui,system-ui);cursor:pointer}
  .kt-lista{display:grid;margin:18px 22px 4px;border:1px solid var(--kt-l);border-radius:14px;overflow:hidden;background:#fff}
  .kt-lista a{display:grid;grid-template-columns:58px 1fr auto;gap:10px;align-items:center;padding:11px 14px;border-top:1px solid var(--kt-l);color:var(--kt-t);text-decoration:none}
  .kt-lista a:first-child{border-top:0}
  .kt-ld{font:700 13px/1 var(--f-mono,ui-monospace);color:var(--kt-n)}
  .kt-lista span:last-child{color:var(--kt-t2);font-size:13px}
  .kt-sv{margin:18px 22px;background:#fff;border:1px solid var(--kt-l);border-radius:16px;overflow:hidden}
  .kt-svTopo{position:relative;min-height:12px}
  .kt-svTopo img{display:block;width:100%;height:170px;object-fit:cover}
  .kt-dia{position:absolute;left:14px;bottom:-22px;width:60px;padding:6px 0;border-radius:12px;background:var(--kt-n);color:#fff;text-align:center;line-height:1.05;box-shadow:0 6px 16px -8px rgba(0,0,0,.5)}
  .kt-svTopo:not(:has(img)) .kt-dia{position:static;margin:14px 0 0 14px}
  .kt-dia b{display:block;font:700 22px/1 var(--f-display,system-ui);color:var(--kt-a)}
  .kt-dia small{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;opacity:.85}
  .kt-svCorpo{padding:30px 20px 18px}
  .kt-svCorpo h2{font-size:21px;line-height:1.25;margin:4px 0 2px}
  .kt-res{margin:0 0 6px;color:var(--kt-t2)}
  .kt-grade{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
  .kt-grade > div{background:var(--kt-c);border-radius:12px;padding:10px 12px}
  .kt-grade .kt-lg{grid-column:1/-1}
  .kt-grade small,.kt-pg small{display:block;font:700 10.5px/1.2 var(--f-ui,system-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--kt-t2)}
  .kt-grade b{display:block;color:var(--kt-n);margin-top:2px}
  .kt-grade span{display:block;color:var(--kt-t2);font-size:13.5px}
  .kt-lk{display:inline-flex;align-items:center;gap:6px;margin-top:6px;color:var(--kt-n);font-weight:700;font-size:14px;text-decoration:underline;text-underline-offset:3px}
  .kt-lk svg{width:16px;height:16px}
  .kt-sv h3,.kt-box h3{font-size:15px;margin:14px 0 6px}
  .kt-par{margin:0;padding-left:22px}.kt-par li{margin:5px 0}.kt-par li b{display:block;color:var(--kt-n)}.kt-par li span{color:var(--kt-t2);font-size:13.5px}
  .kt-duas{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .kt-ok,.kt-no,.kt-levar{margin:0;padding:0;list-style:none}
  .kt-ok li,.kt-no li,.kt-levar li{position:relative;padding:3px 0 3px 22px;font-size:14px}
  .kt-ok li::before{content:"✓";position:absolute;left:2px;color:#1F7A4D;font-weight:800}
  .kt-no li::before{content:"–";position:absolute;left:4px;color:#A3053F;font-weight:800}
  .kt-levar li::before{content:"";position:absolute;left:6px;top:11px;width:7px;height:7px;border-radius:50%;background:var(--kt-a)}
  .kt-pg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px}
  .kt-pg > div{border-radius:12px;padding:10px 12px;background:#EAF4EE}
  .kt-pg > div.resta{background:#FFF4D6}
  .kt-pg b{display:block;font:700 19px/1.2 var(--f-display,system-ui);color:var(--kt-n)}
  .kt-pg span{display:block;font-size:12.5px;color:var(--kt-t2)}
  .kt-tot{margin:14px 22px 0}
  .kt-svCorpo > .kt-cta{margin:4px 0 2px}
  .kt-acs{margin-top:8px}
  .kt-fino{margin:10px 0 0;font-size:12.5px;color:var(--kt-t2)}
  .kt-box{margin:18px 22px;padding:16px 18px;background:#fff;border:1px solid var(--kt-l);border-radius:16px}
  .kt-box > .kt-lk{display:flex}
  .kt-parc{display:flex;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--kt-l)}
  .kt-parc:first-of-type{border-top:0}
  .kt-parc i{font-style:normal;min-width:54px;text-align:center;padding:6px 8px;border-radius:10px;background:var(--kt-n);color:var(--kt-a);font-weight:800}
  .kt-parc small{display:block;color:var(--kt-t2)}
  .kt-pe{display:flex;gap:16px;align-items:center;margin:18px 0 0;padding:18px 22px;background:var(--kt-n);color:var(--kt-c)}
  .kt-pe b{display:block;color:#fff}.kt-pe span{display:block;font-size:13px;opacity:.85}
  .kt-qr{flex:none;width:110px;min-height:10px;background:#fff;border-radius:10px;padding:6px}
  .kt-qr:empty{display:none}
  .kt-qr svg{display:block;width:100%;height:auto}
  .kt-cont{margin-top:6px}
  @media(max-width:620px){.ktTela{padding:10px}.kt-topo{padding:22px 18px 18px}.kt-topo h1{font-size:25px}.kt-selo{width:52px;height:52px}
    .kt-sv,.kt-box{margin:14px 10px}.kt-lista,.kt-tot{margin-left:10px;margin-right:10px}.kt-grade,.kt-duas{grid-template-columns:1fr}.kt-svCorpo{padding:28px 14px 14px}.kt-pe{flex-direction:column;align-items:flex-start}}
  @media print{.kt-tela{display:none!important}}`;
  document.head.appendChild(s);
}
