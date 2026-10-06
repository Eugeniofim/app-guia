/* =====================================================
   VOUCHER DO PASSEIO (06/10/2026)

   Um voucher por reserva confirmada, na marca dela (azul-marinho #1D2A44,
   amarelo #F2C230, creme #FBF7EC, títulos em Montserrat, o selo). O modelo
   dela ainda vai chegar; este é o voucher limpo enquanto isso.

   - Painel: tela escondida #/adm/voucherdoc/<código> com a barra (voltar,
     mandar no WhatsApp, copiar link, imprimir / salvar PDF) e o cartão
     "O que levar" (DB.settings.voucherDicas — público, vai em todo voucher).
   - Cliente: link público #/vo/… (o voucher viaja dentro do link,
     publico-mari.js). O QR do voucher abre esse link no celular.
   - Botões "Voucher": em cada reserva confirmada (Reservas), no histórico
     da ficha do cliente e nas linhas de passeio do Hoje.
   - Cabe numa folha A4 (página com nome próprio, "voucher", para não mexer
     nas margens do orçamento e do extrato) e fica bom no celular.

   window.Voucher = { dados(code), link(code) → Promise<url>, linkQr(code),
                      abrir(code), mensagem(code) → Promise<string> }
   ===================================================== */
'use strict';

const VO_DICAS_PADRAO = [
  'Sapato confortável: vamos caminhar',
  'Roupa em camadas e um casaco corta-vento',
  'Guarda-chuva pequeno ou capa de chuva',
  'Garrafinha de água',
  'Celular carregado e este voucher',
];
const voDig = (w) => String(w || '').replace(/\D/g, '');
const voPrimeiro = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const voChave = (b) => String(b.email || b.whats || b.name || '').toLowerCase();
const voDicas = () => (Array.isArray(DB.settings.voucherDicas) ? DB.settings.voucherDicas : VO_DICAS_PADRAO).map(x => String(x || '').trim()).filter(Boolean);
const voParceiros = () => (typeof Parceiros !== 'undefined' ? Parceiros.ativos() : []).map(p => { const o = { nome: p.nome, desconto: +p.desconto || 0 }; if (p.como) o.como = p.como; if (p.categoria) o.cat = p.categoria; return o; });
function voDataLonga(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const s = new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function voZapBonito(d) {
  d = voDig(d); if (!d) return '';
  if (/^45\d{8}$/.test(d)) return '+45 ' + d.slice(2).replace(/(\d{2})(?=\d)/g, '$1 ');
  if (/^55\d{10,11}$/.test(d)) return '+55 ' + d.slice(2, 4) + ' ' + d.slice(4, -4) + '-' + d.slice(-4);
  return '+' + d;
}
const voPct = (v) => (+v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
function voReserva(code) { if (!code) return null; return Bookings.get(code) || Bookings.byCode(code) || null; }

/* o conteúdo do voucher — o mesmo objeto vai dentro do link (curto: sem e-mail nem telefone do cliente) */
function voDadosDe(b) {
  if (!b || b.status !== 'confirmed') return null;
  const x = Tours.get(b.tourId);
  const F = typeof fichaDe === 'function' ? fichaDe(voChave(b)) : null, cad = (F && F.cad) || {};
  const g = typeof Equipe !== 'undefined' ? Equipe.deQuem(b.id) : null;
  const pago = Bookings.paid(b), restante = Bookings.due(b);
  const d = { code: b.code, cliente: b.name, passeio: x ? ((x.name && x.name.pt) || tl(x.name)) : (b.tourName || 'Passeio'), data: b.date, hora: b.time || '',
    encontro: x ? noIdioma(x.meeting) : '', hotel: cad.hotel || '', pessoas: +b.pax || 1, guia: g ? g.nome : '', pago, restante,
    dicas: voDicas(), parceiros: voParceiros(), whats: voDig(DB.settings.whats) };
  if (restante > 0) { if (DB.settings.saldoNoDia) d.noDia = true; else d.vence = Bookings.dueDate(b); }
  for (const k of Object.keys(d)) if (d[k] === '' || d[k] === undefined) delete d[k];
  return d;
}
/* o do QR: sem as dicas e os parceiros (a página pega dos Ajustes, que são públicos) — link mais curto, QR mais fácil de ler */
function voEnxuto(d) { const o = Object.assign({}, d); delete o.dicas; delete o.parceiros; return o; }

const Voucher = {
  dados(code) { return voDadosDe(voReserva(code)); },
  async link(code) { const d = this.dados(code); if (!d) throw new Error('reserva não encontrada ou não confirmada'); return Publico.link('vo', d); },
  async linkQr(code) { const d = this.dados(code); if (!d) throw new Error('reserva não encontrada ou não confirmada'); return Publico.link('vo', voEnxuto(d)); },
  abrir(code) {
    const b = voReserva(code); if (!b) return false;
    const h = location.hash.slice(1);
    if (h && !/^\/adm\/voucherdoc/.test(h)) Voucher._volta = h;
    /* o código é sorteado (4 dígitos): se por azar repetir, a tela abre pelo id */
    const repetido = DB.bookings.filter(z => z.code === b.code).length > 1;
    go('/adm/voucherdoc/' + encodeURIComponent(b.id)); return true;
  },
  async mensagem(code) {
    const d = this.dados(code); if (!d) throw new Error('reserva não encontrada ou não confirmada');
    const url = await this.link(code);
    const resto = d.restante > 0 ? (d.noDia ? ` O restante, ${eur(d.restante)}, você paga no dia do passeio, em euro, em dinheiro.` : ` Falta pagar ${eur(d.restante)}${d.vence ? ' até ' + voDataLonga(d.vence).toLowerCase() : ''}.`) : '';
    return `Oi ${voPrimeiro(d.cliente)}! Aqui está o voucher do seu passeio: ${d.passeio}, ${voDataLonga(d.data).toLowerCase()}${d.hora ? ' às ' + d.hora : ''}.\n${url}\n\nNo dia, é só mostrar no celular (ou impresso).${resto} Qualquer dúvida, me chama!`;
  },
};
window.Voucher = Voucher;

/* ---------- estilo ---------- */
function voCss() {
  if (document.getElementById('voCss')) return;
  const s = document.createElement('style'); s.id = 'voCss';
  s.textContent = `
  .voDoc{--vn:#1D2A44;--vy:#F2C230;--vc:#FBF7EC;--vi:#18202F;--vi2:#4A5266;--vi3:#6E7588;--vl:#E5DCC6;
    page:voucher;font-family:var(--f-ui);color:var(--vi);background:var(--vc);width:100%;max-width:760px;margin:0 auto;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px -30px rgba(29,42,68,.55);text-align:left}
  .voDoc *{box-sizing:border-box}
  .voDoc .vo-lab{display:block;font:700 10px/1.2 var(--f-ui);letter-spacing:.2em;text-transform:uppercase;color:var(--vi3);margin:0 0 5px}
  .vo-top{background:var(--vn);color:var(--vc);display:flex;align-items:center;gap:16px;padding:22px 28px}
  .vo-top img{width:66px;height:66px;border-radius:50%;flex:none;background:var(--vc);box-shadow:0 0 0 3px rgba(242,194,48,.55)}
  .vo-marca{min-width:0}
  .vo-marca small{display:block;font:600 11px/1.2 var(--f-ui);letter-spacing:.22em;text-transform:uppercase;color:rgba(251,247,236,.78)}
  .vo-marca b{display:block;font:700 30px/1 var(--f-display);letter-spacing:.2em;color:var(--vy);margin-top:7px}
  .vo-cod{margin-left:auto;text-align:right;flex:none}
  .vo-cod small{display:block;font:600 10px/1.2 var(--f-ui);letter-spacing:.22em;text-transform:uppercase;color:rgba(251,247,236,.7)}
  .vo-cod b{display:block;font:700 31px/1 var(--f-display);color:#fff;letter-spacing:.03em;margin-top:6px;white-space:nowrap}
  .vo-faixa{height:6px;background:var(--vy)}
  .vo-corpo{padding:22px 28px 4px}
  .vo-cli h1{font:700 27px/1.12 var(--f-display);margin:0;color:var(--vn);letter-spacing:-.01em;overflow-wrap:anywhere}
  .vo-passeio{font:600 17px/1.3 var(--f-display);color:var(--vi2);margin:6px 0 0}
  .vo-grade{display:grid;grid-template-columns:1.45fr 1fr;gap:1px;background:var(--vl);border:1px solid var(--vl);border-radius:16px;overflow:hidden;margin:16px 0 14px}
  .vo-c{background:#fff;padding:12px 16px;min-width:0}
  .vo-c.wide{grid-column:1/-1}
  .vo-c b{display:block;font:700 16px/1.3 var(--f-display);color:var(--vi);overflow-wrap:anywhere}
  .vo-c span{display:block;font-size:14px;line-height:1.45;color:var(--vi2);margin-top:2px;overflow-wrap:anywhere}
  .vo-c .hora{display:inline-block;margin-top:6px;background:var(--vn);color:#fff;border-radius:999px;padding:3px 11px;font:700 13.5px/1.3 var(--f-display)}
  .vo-pg{display:grid;grid-template-columns:1fr 1.7fr;gap:10px;margin:0 0 14px}
  .vo-pg.um{grid-template-columns:1fr}
  .vo-pgb{border-radius:14px;padding:12px 16px;background:#fff;border:1px solid var(--vl)}
  .vo-pgb b{display:block;font:700 22px/1.15 var(--f-display);color:var(--vn)}
  .vo-pgb span{display:block;font-size:13.5px;color:var(--vi2);margin-top:3px}
  .vo-pgb.resta{background:var(--vy);border-color:var(--vy)}
  .vo-pgb.resta .vo-lab{color:rgba(29,42,68,.75)}
  .vo-pgb.resta span{color:var(--vn);font-weight:600}
  .vo-duas{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .vo-duas.um{grid-template-columns:1fr}
  .vo-box{background:#fff;border:1px solid var(--vl);border-radius:14px;padding:13px 16px;min-width:0}
  .vo-box h3{font:700 13px/1.2 var(--f-display);letter-spacing:.06em;text-transform:uppercase;color:var(--vn);margin:0 0 8px}
  .vo-box ul{list-style:none;margin:0;padding:0}
  .vo-box li{position:relative;padding:3px 0 3px 20px;font-size:13.5px;line-height:1.4;color:var(--vi)}
  .vo-box li::before{content:"";position:absolute;left:2px;top:9px;width:9px;height:9px;border-radius:50%;background:var(--vy);box-shadow:0 0 0 2px rgba(242,194,48,.3)}
  .vo-par{display:flex;gap:10px;align-items:flex-start;padding:5px 0}
  .vo-par + .vo-par{border-top:1px solid var(--vl)}
  .vo-par i{font:700 13px/1 var(--f-display);font-style:normal;background:var(--vn);color:var(--vy);border-radius:999px;padding:5px 8px;flex:none;min-width:46px;text-align:center}
  .vo-par b{display:block;font-size:13.5px;line-height:1.3}
  .vo-par small{display:block;font-size:12px;line-height:1.35;color:var(--vi2)}
  .vo-pe{display:flex;gap:18px;align-items:center;padding:16px 28px 22px;margin-top:14px;border-top:1.5px dashed var(--vl)}
  .vo-qr{flex:none;width:136px;height:136px;background:#fff;border-radius:14px;padding:8px;border:1px solid var(--vl);display:grid;place-items:center}
  .vo-qr svg{display:block;width:120px;height:120px}
  .vo-qr .vo-qrw{font-size:11px;color:var(--vi3);text-align:center}
  .vo-petx{min-width:0}
  .vo-petx b{display:block;font:700 16px/1.3 var(--f-display);color:var(--vn)}
  .vo-petx span{display:block;font-size:13.5px;line-height:1.45;color:var(--vi2);margin-top:4px}
  .vo-petx .zap{display:inline-flex;gap:7px;align-items:center;margin-top:9px;font:700 14px/1.2 var(--f-ui);color:var(--vn);text-decoration:none;background:#fff;border:1px solid var(--vl);border-radius:999px;padding:6px 12px}
  .vo-petx .zap svg{width:16px;height:16px;color:#1FAF57}
  @media(max-width:560px){
    .voDoc{border-radius:18px}
    .vo-top{flex-wrap:wrap;padding:18px 18px 16px;gap:12px}
    .vo-top img{width:52px;height:52px}
    .vo-marca b{font-size:24px}
    .vo-cod{margin-left:0;text-align:left;width:100%;border-top:1px solid rgba(251,247,236,.18);padding-top:12px;display:flex;align-items:baseline;justify-content:space-between;gap:10px}
    .vo-cod b{font-size:26px;margin-top:0}
    .vo-corpo{padding:18px 16px 2px}
    .vo-cli h1{font-size:23px}
    .vo-grade{grid-template-columns:1fr}
    .vo-pg,.vo-duas{grid-template-columns:1fr}
    .vo-pe{flex-direction:column;text-align:center;padding:16px 16px 20px}
    .vo-petx .zap{justify-content:center}
  }
  /* a tela do painel */
  .voTela{padding:16px;background:var(--paper);min-height:100vh}
  .voBarra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;max-width:760px;margin:0 auto 14px}
  .voBarra .bts{display:flex;gap:8px;flex-wrap:wrap}
  .voEdit{max-width:760px;margin:16px auto 0}
  .voEdit textarea{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical}
  @page voucher{size:A4;margin:10mm}
  @media print{
    .voTela{padding:0!important;background:#fff!important;min-height:0!important}
    .voBarra,.voEdit,#iaFab,#iaGaveta,.protobar,.toast,.coach{display:none!important}
    #voPrint,#voPrint *,.voDoc,.voDoc *{visibility:visible!important}
    .voDoc{box-shadow:none!important;max-width:none;border-radius:14px;break-inside:avoid}
    .voDoc,.voDoc *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  }`;
  document.head.appendChild(s);
}
/* A MARGEM DO PAPEL. O Chrome usa a ÚLTIMA regra @page que encontra (a página com nome "voucher" não
   vence a do orçamento, que tem margem zero e é posta depois). Então, enquanto o voucher está na
   tela, uma regra própria fica por último no <head>; saiu do voucher, ela sai (e o orçamento, o
   extrato e os outros documentos imprimem com as margens deles). */
const VO_TELA = /^#\/(vo\/|adm\/voucherdoc)/;
function voPagina(liga) {
  let s = document.getElementById('voPagina');
  if (!liga) { if (s) s.remove(); return; }
  if (!s) { s = document.createElement('style'); s.id = 'voPagina'; s.textContent = '@page{size:A4;margin:10mm}'; }
  document.head.appendChild(s);
}
addEventListener('hashchange', () => { if (!VO_TELA.test(location.hash)) voPagina(false); });
addEventListener('beforeprint', () => { if (VO_TELA.test(location.hash) && document.querySelector('.voDoc')) voPagina(true); });
/* o desenho do voucher (painel e link). qr = o SVG pronto, ou vazio (aparece depois) */
function voDocHtml(d, qr) {
  const dicas = Array.isArray(d.dicas) ? d.dicas : voDicas();
  const pars = Array.isArray(d.parceiros) ? d.parceiros : voParceiros();
  const zap = voDig(d.whats) || voDig(DB.settings.whats);
  const negocio = (typeof guiaNegocio === 'function' && guiaNegocio()) || 'Tour na Dinamarca';
  const temPg = (+d.pago || 0) > 0 || (+d.restante || 0) > 0;
  const restaHtml = d.restante > 0
    ? `<div class="vo-pgb resta"><small class="vo-lab">${d.noDia ? 'Restante no dia' : 'Falta pagar'}</small><b>${esc(eur(d.restante))}</b><span>${d.noDia ? 'em euro, em dinheiro, no dia do passeio' : d.vence ? 'até ' + esc(voDataLonga(d.vence).toLowerCase()) : ''}</span></div>` : '';
  return `<article class="voDoc">
    <header class="vo-top"><img src="arte/selo-mari-circ.png" alt="">
      <div class="vo-marca"><small>${esc(negocio)}</small><b>VOUCHER</b></div>
      <div class="vo-cod"><small>Reserva</small><b>${esc(d.code || '')}</b></div></header>
    <div class="vo-faixa"></div>
    <section class="vo-corpo">
      <div class="vo-cli"><small class="vo-lab">Cliente</small><h1>${esc(d.cliente || '')}</h1><p class="vo-passeio">${esc(d.passeio || '')}</p></div>
      <div class="vo-grade">
        <div class="vo-c"><small class="vo-lab">Data</small><b>${esc(voDataLonga(d.data))}</b>${d.hora ? `<span class="hora">às ${esc(d.hora)}</span>` : ''}</div>
        <div class="vo-c"><small class="vo-lab">Pessoas</small><b>${esc(d.pessoas || 1)} ${+d.pessoas > 1 ? 'pessoas' : 'pessoa'}</b>${d.guia ? `<span>Guia: <b style="display:inline;font-size:inherit">${esc(d.guia)}</b></span>` : ''}</div>
        <div class="vo-c wide"><small class="vo-lab">Ponto de encontro</small><b>${esc(d.encontro || 'A Mari confirma pelo WhatsApp')}</b>${d.hotel ? `<span>Hospedagem: ${esc(d.hotel)}</span>` : ''}</div>
      </div>
      ${temPg ? `<div class="vo-pg ${restaHtml ? '' : 'um'}">
        <div class="vo-pgb"><small class="vo-lab">Pago</small><b>${esc(eur(+d.pago || 0))}</b><span>${d.restante > 0 ? 'recebido, obrigada!' : 'tudo pago, obrigada!'}</span></div>${restaHtml}</div>` : ''}
      ${dicas.length || pars.length ? `<div class="vo-duas ${dicas.length && pars.length ? '' : 'um'}">
        ${dicas.length ? `<div class="vo-box"><h3>O que levar</h3><ul>${dicas.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${pars.length ? `<div class="vo-box"><h3>Descontos dos meus parceiros</h3>${pars.map(p => `<div class="vo-par"><i>${esc(voPct(p.desconto))}</i><div><b>${esc(p.nome)}</b>${p.cat || p.como ? `<small>${esc([p.cat, p.como].filter(Boolean).join(' · '))}</small>` : ''}</div></div>`).join('')}</div>` : ''}
      </div>` : ''}
    </section>
    <footer class="vo-pe">
      <div class="vo-qr">${qr || '<span class="vo-qrw">QR…</span>'}</div>
      <div class="vo-petx"><b>No dia, é só mostrar este voucher</b>
        <span>No celular ou impresso. Aponte a câmera para o código: o voucher abre no celular.</span>
        ${zap ? `<a class="zap" href="${esc(waLink('Oi, Mari! Sobre o meu voucher ' + (d.code || '') + '…', zap))}" target="_blank" rel="noopener">${typeof ICONE_WA !== 'undefined' ? ICONE_WA : ''}WhatsApp da Mari: ${esc(voZapBonito(zap))}</a>` : ''}</div>
    </footer>
  </article>`;
}
function voPoeQr(sel, url) { const el = document.querySelector(sel); if (el && url) el.innerHTML = qrSvg(url, { tamanho: 120, alt: 'QR code do voucher' }) || '<span class="vo-qrw">link grande demais para o QR</span>'; }

/* ---------- a página do cliente: #/vo/… ---------- */
window.ROTAS_EXTRA = window.ROTAS_EXTRA || {};
ROTAS_EXTRA['vo'] = (partes) => abrePublico(partes, async (o) => {
  voCss(); voPagina(true);
  paginaPublica('Voucher ' + (o.code || ''), voDocHtml(o, ''), { rodape: 'Guarde este voucher no celular. Qualquer dúvida, fale com a Mari no WhatsApp.', waTexto: 'Oi, Mari! Sobre o meu voucher ' + (o.code || '') + '…' });
  voPoeQr('#pubPrint .vo-qr', await Publico.link('vo', voEnxuto(o)));
});

/* ---------- a tela do painel: #/adm/voucherdoc/<código> ---------- */
function admVoucherDoc(code) {
  voCss();
  const b = voReserva(code);
  if (!b) { go('/adm/bookings'); return; }
  const d = voDadosDe(b);
  const volta = Voucher._volta || '/adm/bookings';
  if (!d) {
    app.innerHTML = `<div class="voTela"><div class="voBarra"><a class="mini" href="#${esc(volta)}">← voltar</a></div>
      <section class="card" style="max-width:760px;margin:0 auto"><h1 class="pageh">Sem voucher</h1><p class="why">O voucher sai só para reserva confirmada. Esta (${esc(b.code)}) está ${b.status === 'cancelled' ? 'cancelada' : 'pendente'}.</p></section></div>`;
    return;
  }
  document.title = `Voucher ${b.code} - ${b.name}`;
  voPagina(true);
  const temZap = voDig(b.whats).length >= 8;
  app.innerHTML = `<div class="voTela">
    <div class="voBarra"><a class="mini" href="#${esc(volta)}" id="voVolta">← voltar</a>
      <span class="bts"><button class="mini" id="voWa">${temZap ? 'Mandar no WhatsApp' : 'Copiar a mensagem'}</button><button class="mini" id="voCopia">Copiar link</button><button class="cta sm" id="voPdf">Imprimir / Salvar PDF</button></span></div>
    <div id="voPrint">${voDocHtml(d, '')}</div>
    <section class="card voEdit"><h3>O que levar <small class="why" style="font-weight:500">vale para todos os vouchers</small></h3>
      <p class="why">Uma linha por item. Os descontos vêm da aba <a href="#/adm/parceiros">Parceiros</a> (só os ligados e com nome).</p>
      <textarea id="voDicasTx" rows="6">${esc(voDicas().join('\n'))}</textarea>
      <div class="chips" style="margin-top:10px"><button class="cta sm" id="voDicasSalva">Salvar</button><button class="mini ghost" id="voDicasPadrao">Voltar à lista padrão</button></div>
      <p class="why" style="margin-top:10px">No "Imprimir", escolha <b>Salvar como PDF</b>. O arquivo sai com o código e o nome do cliente.</p>
    </section></div>`;
  Voucher.linkQr(b.id).then(u => voPoeQr('#voPrint .vo-qr', u)).catch(() => {});
  $('#voPdf').onclick = () => window.print();
  $('#voCopia').onclick = async () => { const u = await Voucher.link(b.id); try { await navigator.clipboard.writeText(u); toast('Link do voucher copiado'); } catch (e) { prompt('Copie:', u); } };
  $('#voWa').onclick = async () => {
    const txt = await Voucher.mensagem(b.id);
    if (temZap) window.open(waLink(txt, voDig(b.whats)), '_blank', 'noopener');
    else { try { await navigator.clipboard.writeText(txt); toast('Mensagem copiada (a reserva não tem WhatsApp) — cole na conversa'); } catch (e) { prompt('Copie:', txt); } }
  };
  $('#voDicasSalva').onclick = () => {
    DB.settings.voucherDicas = $('#voDicasTx').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 10);
    save(); toast('"O que levar" salvo'); admVoucherDoc(b.id);
  };
  $('#voDicasPadrao').onclick = () => { delete DB.settings.voucherDicas; save(); toast('Lista padrão de volta'); admVoucherDoc(b.id); };
  addEventListener('afterprint', () => { document.title = 'Tour na Dinamarca — ' + ((typeof guiaNome === 'function' && guiaNome()) || 'Mari'); }, { once: true });
}

/* ---------- os botões "Voucher" nas telas que já existem ---------- */
const voBotao = (code, rot) => `<button type="button" class="mini" data-voucher="${esc(code)}">${rot || 'Voucher'}</button>`;
function voLigaBotoes(raiz) { (raiz || document).querySelectorAll('[data-voucher]').forEach(bt => { if (!bt._vo) { bt._vo = true; bt.onclick = (e) => { e.stopPropagation(); Voucher.abrir(bt.dataset.voucher); }; } }); }
/* Reservas: cada linha confirmada tem a caixa de ações #ta-<id> */
function voNasReservas() {
  for (const b of DB.bookings) {
    if (b.status !== 'confirmed') continue;
    const cx = document.getElementById('ta-' + b.id);
    if (cx && !cx.querySelector('[data-voucher]')) cx.insertAdjacentHTML('beforeend', voBotao(b.id));
  }
  voLigaBotoes(document.getElementById('stage'));
}
/* Ficha do cliente: no histórico, o código está no small.mono de cada linha */
function voNaFicha() {
  document.querySelectorAll('.fc-tbl tbody tr').forEach(tr => {
    if (tr.querySelector('[data-voucher]')) return;
    const sm = tr.querySelector('small.mono'); if (!sm) return;
    const b = Bookings.byCode(sm.textContent.split('·')[0].trim());
    if (!b || b.status !== 'confirmed') return;
    const td = tr.lastElementChild; if (td) td.insertAdjacentHTML('beforeend', '<br>' + voBotao(b.id, 'voucher').replace('class="mini"', 'class="mini" style="margin-top:4px"'));
  });
  voLigaBotoes(document.getElementById('stage'));
}
/* Hoje: as linhas de passeio de hoje e de amanhã (nome · pessoas + hora) */
function voNoHoje() {
  const hoje = typeof agHoje === 'function' ? agHoje() : isoToday();
  document.querySelectorAll('.hj-sec').forEach(sec => {
    const tit = ((sec.querySelector('h3') || {}).firstChild || {}).textContent || '';
    const dia = /^\s*Hoje/.test(tit) ? hoje : /^\s*Amanhã/.test(tit) ? addDays(hoje, 1) : ''; if (!dia) return;
    const usadas = new Set();
    sec.querySelectorAll('.hj-item').forEach(it => {
      if (it.querySelector('[data-voucher]')) return;
      const hr = (it.querySelector('.hr') || {}).textContent || '', nome = (((it.querySelector('.tx b') || {}).textContent) || '').split(' · ')[0];
      const b = DB.bookings.find(x => x.status === 'confirmed' && x.date === dia && (x.time || '') === hr.trim() && x.name === nome && !usadas.has(x.id));
      if (!b) return; usadas.add(b.id);
      it.insertAdjacentHTML('beforeend', voBotao(b.id));
    });
  });
  voLigaBotoes(document.getElementById('stage'));
}
function voInjeta() {
  const h = location.hash;
  try {
    if (/^#\/adm\/bookings/.test(h)) voNasReservas();
    else if (/^#\/adm\/clients\/./.test(h)) voNaFicha();
    else if (/^#\/adm\/?(today)?\/?$/.test(h) || h === '#/adm') voNoHoje();
  } catch (e) { console.warn('voucher', e); }
}
const _admBookingsVo = admBookings;
admBookings = function () { const r = _admBookingsVo.apply(this, arguments); voInjeta(); return r; };
if (typeof window.admFichaCliente === 'function') {
  const _fichaVo = window.admFichaCliente;
  window.admFichaCliente = function () { const r = _fichaVo.apply(this, arguments); voInjeta(); return r; };
}
const _admTodayVo = admToday;
admToday = function () { const r = _admTodayVo.apply(this, arguments); voInjeta(); return r; };
/* o Hoje e a ficha também se redesenham por dentro (marcar tarefa, salvar a ficha): o vigia repõe os botões */
if (typeof MutationObserver === 'function' && typeof app !== 'undefined' && app) new MutationObserver(voInjeta).observe(app, { childList: true });

/* ---------- ligar no app (aba escondida: não entra no menu) ---------- */
const _viewAdmVo = viewAdm;
viewAdm = function (tab, arg) {
  if (tab === 'voucherdoc') return admVoucherDoc(arg ? decodeURIComponent(arg) : '');
  return _viewAdmVo(tab, arg);
};
