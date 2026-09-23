/* =====================================================
   AVISOS DE RESERVA NOVA — no aparelho da dona
   - push: o celular dela toca mesmo com o app fechado. Quem manda é o
     servidor (função cofre, rota /api/avisar), chamado pelo BANCO quando a
     reserva é gravada. Aqui só se cadastra o aparelho (tabela push_subs).
   - som: com o painel aberto, a reserva nova toca o sino e vibra.
   No iPhone o push só existe com o app instalado na tela de início (iOS 16.4+).
   ===================================================== */
'use strict';

const AV_TXT = {
  tit:      { pt: 'Avisos no celular', en: 'Phone alerts' },
  why:      { pt: 'Reserva nova chega como notificação, com som, mesmo com o app fechado. Ative em cada aparelho que você usa.',
              en: 'New bookings arrive as a notification, with sound, even with the app closed. Turn it on in each device you use.' },
  liga:     { pt: 'Ativar neste aparelho', en: 'Turn on for this device' },
  teste:    { pt: 'Mandar um aviso de teste', en: 'Send a test alert' },
  ativo:    { pt: '✓ Ativo neste aparelho.', en: '✓ On for this device.' },
  inativo:  { pt: 'Ainda não ativado neste aparelho.', en: 'Not on for this device yet.' },
  negado:   { pt: 'O aparelho bloqueou as notificações do app. Libere em Ajustes do celular → Notificações e tente de novo.',
              en: 'This device blocked notifications for the app. Allow them in the phone settings and try again.' },
  ios:      { pt: 'No iPhone: toque em Compartilhar → “Adicionar à Tela de Início”, abra o app pelo ícone e ative aqui.',
              en: 'On iPhone: tap Share → “Add to Home Screen”, open the app from the icon and turn it on here.' },
  semsup:   { pt: 'Este navegador não recebe notificações. No celular, use o app instalado na tela de início.',
              en: 'This browser cannot receive notifications. On your phone, use the app installed on the home screen.' },
  semnuvem: { pt: 'Os avisos ligam junto com a nuvem do app.', en: 'Alerts turn on together with the app cloud.' },
  login:    { pt: 'Entre no painel para ativar.', en: 'Log in to turn it on.' },
  ok:       { pt: 'Pronto! Este aparelho vai avisar cada reserva nova.', en: 'Done! This device will alert every new booking.' },
  erro:     { pt: 'Não consegui ativar agora. Confira a internet e tente de novo.', en: 'Could not turn it on now. Check the connection and try again.' },
  testeOk:  { pt: 'Aviso de teste enviado — deve chegar em segundos.', en: 'Test alert sent — it should arrive in seconds.' },
  testeNada:{ pt: 'Nenhum aparelho ativado ainda.', en: 'No device turned on yet.' },
};
const av = (k) => { const e = AV_TXT[k]; return e ? ((typeof LANG !== 'undefined' && LANG === 'en') ? e.en : e.pt) : k; };

const avVapid = () => (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.vapidPublica) || '';
const avIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const avInstalado = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const avSuportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function avChave(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function avAssinatura() {
  if (!avSuportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/* o que dizer no cartão, conforme o aparelho */
async function avEstadoTxt() {
  if (typeof temNuvem === 'function' && !temNuvem()) return av('semnuvem');
  if (avIOS() && !avInstalado()) return av('ios');
  if (!avSuportado()) return av('semsup');
  if (Notification.permission === 'denied') return av('negado');
  const s = await avAssinatura().catch(() => null);
  return s && Notification.permission === 'granted' ? av('ativo') : av('inativo');
}

async function avAtivar() {
  if (!avSuportado() || !avVapid()) return { ok: false, msg: av('semsup') };
  if (typeof authToken === 'function' && !authToken()) return { ok: false, msg: av('login') };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, msg: av('negado') };
  try {
    const reg = await navigator.serviceWorker.ready;
    let s = await reg.pushManager.getSubscription();
    if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: avChave(avVapid()) });
    const j = s.toJSON();
    const r = await supaFetch('push_subs', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ endpoint: j.endpoint, sub: j, aparelho: navigator.userAgent.slice(0, 120) }),
    });
    return r.ok ? { ok: true, msg: av('ok') } : { ok: false, msg: av('erro') };
  } catch (e) { return { ok: false, msg: av('erro') }; }
}

async function avTeste() {
  const base = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.cofre) || '';
  if (!base) return av('semnuvem');
  try {
    const r = await fetch(base + '/api/push-teste', { method: 'POST', headers: typeof cofreCab === 'function' ? cofreCab() : {} });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return av(r.status === 401 ? 'login' : 'erro');
    return j.push && j.push.aparelhos ? av('testeOk') : av('testeNada');
  } catch (e) { return av('erro'); }
}

/* o cartão de Ajustes */
function cartaoAvisos() {
  return `<section class="card" id="avCard">
      <h3>🔔 ${av('tit')}</h3>
      <p class="why">${av('why')}</p>
      <p class="why" id="avEstado">…</p>
      <div class="btnrow">
        <button class="cta sm" id="avLiga">${av('liga')}</button>
        <button class="mini" id="avTeste">${av('teste')}</button>
      </div>
    </section>`;
}
function ligaCartaoAvisos() {
  const est = document.getElementById('avEstado');
  if (!est) return;
  avEstadoTxt().then(tx => { est.textContent = tx; });
  document.getElementById('avLiga').onclick = async () => {
    est.textContent = '…';
    const r = await avAtivar();
    est.textContent = r.ok ? av('ativo') : r.msg;
    if (typeof toast === 'function') toast(r.msg);
  };
  document.getElementById('avTeste').onclick = async () => {
    const m = await avTeste();
    if (typeof toast === 'function') toast(m);
  };
}

/* dois toques de sino, curtos e claros — diferente da abertura */
function somReserva() {
  if (localStorage.getItem('vi_som') === 'off') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  let ctx; try { ctx = new AC(); } catch (e) { return; }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const t0 = ctx.currentTime + 0.03;
  [[880, 0], [1318.5, 0.18]].forEach(([hz, q]) => {
    [[hz, 0.26], [hz * 2.01, 0.06]].forEach(([f, v]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + q);
      g.gain.exponentialRampToValueAtTime(v, t0 + q + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + q + 1.1);
      o.connect(g); g.connect(ctx.destination); o.start(t0 + q); o.stop(t0 + q + 1.2);
    });
  });
  setTimeout(() => { try { ctx.close(); } catch (e) {} }, 1800);
}

/* reserva nova com o painel aberto: sino + vibração */
function avisoReservaNaTela() {
  try { somReserva(); } catch (e) {}
  try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch (e) {}
}
