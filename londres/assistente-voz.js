/* =====================================================
   ASSISTENTE — a cara do TI ARTES OS, com o cérebro do app

   Pedido do Eugênio (28/09/2026): "usar o mesmo algoritmo do meu app TI
   ARTES, mas com as infos dela… achei esse feio… o assistente já fala,
   grava áudio, manda imagens… tudo".

   O que muda é só a tela e o jeito de conversar. O cérebro continua o do
   app dela (assistente.js + carol-ia.js): as mesmas ferramentas, os mesmos
   dados, o mesmo cartão "confirma?" antes de gravar.

   Trazido do TI ARTES OS:
   - FALAR: aperta o microfone, fala, e quando ela para de falar o pedido
     vai sozinho (ditado do próprio navegador: sem chave, sem custo).
     Barra "Estou ouvindo" com o tempo, e "descartar" / "enviar".
   - OUVIR: as respostas lidas em voz alta (🔊). Voz do aparelho, a melhor
     em português do Brasil que houver; com a chave da ElevenLabs, a voz
     de estúdio — inclusive a voz clonada do guia, quando ele autorizar.
   - ANEXAR: fotos e PDF (voucher de agência, roteiro, invoice).
   - O ORBE: a bolha viva no topo (skill orbe-de-voz) — ouvindo, pensando,
     falando. Nas cores do manual de marca dela.
   - Tela vazia com sugestões do dia dela, não um parágrafo de instrução.
   - Tudo o que era rodapé (perguntar antes de gravar, nova conversa,
     chave) foi para a engrenagem ⚙.
   ===================================================== */
'use strict';

const IAV_VOZ = IA_NS + 'ia_voz';            /* ler as respostas em voz alta */
const IAV_ENVIA = IA_NS + 'ia_voz_envia';    /* mandar sozinho quando parar de falar */
const IAV_EL = IA_NS + 'ia_el';              /* {chave, voz, nomeVoz} da ElevenLabs — só neste aparelho */
const FALA_REC = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const LER = ('speechSynthesis' in window) ? window.speechSynthesis : null;
/* microfone só em endereço seguro (https ou localhost) */
const iavTemMic = () => !!FALA_REC && (location.protocol === 'https:' || location.hostname === 'localhost');
const iavVozOn = () => iaLe(IAV_VOZ, false) === true;
const IAV = { rec: null, juntado: '', antes: '', naMao: false, cancelou: false, t0: 0, relogio: null, anexos: [], menu: false };

/* ícones (traço fino, 24px) */
const IAV_IC = {
  clip: '<path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/>',
  som: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  mudo: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/>',
  env: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  eng: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  copia: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
};
const iavSvg = (k, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IAV_IC[k]}</svg>`;

/* =====================================================
   O ORBE (skill orbe-de-voz): o desenho só recebe números; quem mede o
   som (microfone, fala) vive fora dele. Nas cores do manual: Skyline
   brilhando sobre o fundo Blackfriars/bordô da gaveta.
   ===================================================== */
const Orbe = window.Orbe = (function () {
  const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uT, uNivel, uGraves, uAgudos, uVisc, uBrilho; uniform vec3 uCor, uCor2, uFundo;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.02;a*=.5;}return v;}
float sunir(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float campo(vec2 p,float t){
 float ag=mix(.35,1.25,uVisc);
 vec2 w=vec2(fbm(p*1.55+vec2(0.,t*.17*ag)),fbm(p*1.55+vec2(5.2,-t*.13*ag)));
 float amp=.085+.20*uNivel+.05*uAgudos; vec2 q=p+(w-.5)*amp*2.6;
 float R=.56+.055*sin(t*.55)+.11*uGraves+.05*uNivel; float d=length(q)-R;
 for(int i=0;i<3;i++){ float fi=float(i); float a=t*(.21+fi*.085)+fi*2.2;
  float rr=.30+.085*sin(t*.42+fi*1.7)+.10*uNivel; vec2 c=vec2(cos(a),sin(a*1.21))*rr;
  float rl=.20+.055*cos(t*.63+fi)+.075*uNivel; d=sunir(d,length(q-c)-rl,.34); }
 d+=(fbm(q*5.4+t*.5)-.5)*(.018+.055*uAgudos); return d;}
void main(){
 vec2 fc=gl_FragCoord.xy; vec2 p=(fc-.5*uRes)/min(uRes.x,uRes.y)*2.;
 float t=uT, d=campo(p,t); float e=2.2/min(uRes.x,uRes.y);
 float dx=campo(p+vec2(e,0.),t)-campo(p-vec2(e,0.),t); float dy=campo(p+vec2(0.,e),t)-campo(p-vec2(0.,e),t);
 vec3 n=normalize(vec3(dx,dy,e*1.55)); float dentro=smoothstep(.012,-.030,d);
 float fres=pow(1.-clamp(n.z,0.,1.),2.6); vec3 luz=normalize(vec3(-.45,.62,.65));
 float dif=clamp(dot(n,luz)*.5+.5,0.,1.); float esp=pow(clamp(dot(reflect(-luz,n),vec3(0.,0.,1.)),0.,1.),22.);
 float fil=smoothstep(.42,.86,fbm(p*3.1-vec2(t*.22,t*.16)));
 vec3 o=uCor*(.14+.34*dif); o=mix(o,uCor2,fil*(.55+.35*uNivel)); o+=uCor*fil*.18*uNivel;
 o+=mix(uCor,vec3(1.),.50)*fres*(.85+1.00*uNivel); o+=vec3(1.)*esp*.34;
 float sep=fres*.09; o.r+=sep; o.b-=sep*.6; o*=.62+.9*uBrilho;
 o=o/(o+vec3(.85)); o=pow(o,vec3(1./2.2));
 float halo=exp(-max(d,0.)*mix(7.5,3.4,uBrilho))*(.16+.55*uNivel)*(.4+uBrilho);
 vec3 h=pow(uCor/(uCor+vec3(.85)),vec3(1./2.2));
 vec3 col=mix(uFundo,h,clamp(halo*1.3,0.,.85)); col=mix(col,o,dentro);
 col+=(hash(fc+fract(t))-.5)/255.; gl_FragColor=vec4(col,1.);}`;
  const ESTADOS = { repouso: [.45, .50, .35], ouvindo: [.30, .72, .55], pensando: [.92, .62, .45], falando: [.62, .78, 1.0] };
  const lin = (hex) => hex.replace('#', '').match(/../g).map(x => { const c = parseInt(x, 16) / 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); });
  const srgb = (hex) => hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255);
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const O = { nivel: 0, graves: 0, agudos: 0, _alvo: 0, _gl: null, _cv: null, _u: {}, _t: 0, _ult: 0, _visc: .45, _bri: .5, _estado: 'repouso',
    _cor: lin('#FFD23F'), _cor2: lin('#0a6957'), _fundo: srgb('#0F1A17'), _fala: 0, _mic: null };
  O.montar = function (cv) {
    if (O._cv === cv && O._gl) return true;
    const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false }); if (!gl) return false;
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const k of ['uRes', 'uT', 'uNivel', 'uGraves', 'uAgudos', 'uVisc', 'uBrilho', 'uCor', 'uCor2', 'uFundo']) O._u[k] = gl.getUniformLocation(pr, k);
    O._gl = gl; O._cv = cv;
    if (!O._rodando) { O._rodando = true; requestAnimationFrame(O._quadro); }
    return true;
  };
  O.cor = (hex) => { O._cor = lin(hex); };
  O.fundo = (hex) => { O._fundo = srgb(hex); };
  O.estado = (e) => { O._estado = ESTADOS[e] ? e : 'repouso'; };
  /* fala sintética: sílabas por seno com piso cortado (skill orbe-de-voz) */
  O.falar = (ms) => { O._fala = performance.now() + (ms || 3000); O.estado('falando'); };
  O.calar = () => { O._fala = 0; O.estado('repouso'); };
  O.pulso = (v) => { O._alvo = Math.max(O._alvo, v); };
  O._quadro = (agora) => {
    requestAnimationFrame(O._quadro);
    const gl = O._gl, cv = O._cv;
    if (!gl || !cv || document.hidden || !cv.isConnected || !cv.offsetWidth) { O._ult = agora; return; }
    let dt = Math.min(1 / 20, (agora - (O._ult || agora)) / 1000); O._ult = agora;
    const dpr = Math.min(1.75, devicePixelRatio || 1), W = Math.round(cv.offsetWidth * dpr), H = Math.round(cv.offsetHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); }
    O._t += dt * (reduz ? .18 : 1);
    /* o alvo do nível: microfone de verdade, ou o envelope de fala, ou nada */
    let alvo = O._alvo; O._alvo *= .86;
    if (O._mic) {
      const { an, buf } = O._mic; an.getFloatTimeDomainData(buf);
      let s = 0; for (const v of buf) s += v * v; alvo = Math.min(1, Math.sqrt(s / buf.length) * 7);
    } else if (O._fala > agora) {
      const x = O._t * 9.5, sil = Math.pow(Math.max(0, Math.sin(x) * .5 + .5 - .12) / .88, 1.4);
      alvo = Math.max(alvo, sil * (.55 + .35 * Math.sin(O._t * 2.3)) + Math.random() * .08);
    } else if (O._fala && O._estado === 'falando') O.calar();
    if (reduz) alvo *= .35;
    const lento = 1 - Math.pow(0.0016, dt), rapido = 1 - Math.pow(0.055, dt);
    O.nivel += (alvo - O.nivel) * (alvo > O.nivel ? rapido : lento);
    O.graves += (alvo * .8 - O.graves) * lento; O.agudos += (alvo * .6 - O.agudos) * (alvo > O.agudos ? rapido : lento);
    const [v, b] = ESTADOS[O._estado]; O._visc += (v - O._visc) * lento; O._bri += (b - O._bri) * lento;
    const u = O._u;
    gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uT, O._t); gl.uniform1f(u.uNivel, O.nivel); gl.uniform1f(u.uGraves, O.graves);
    gl.uniform1f(u.uAgudos, O.agudos); gl.uniform1f(u.uVisc, O._visc); gl.uniform1f(u.uBrilho, O._bri);
    gl.uniform3fv(u.uCor, O._cor); gl.uniform3fv(u.uCor2, O._cor2); gl.uniform3fv(u.uFundo, O._fundo);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  /* microfone medindo o nível enquanto ela fala — nunca ligado ao alto-falante (microfonia) */
  O.ouvirMicrofone = async () => {
    if (O._mic || !navigator.mediaDevices) return;
    const fluxo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = .72;
    ctx.createMediaStreamSource(fluxo).connect(an);
    O._mic = { ctx, an, fluxo, buf: new Float32Array(an.fftSize) }; O.estado('ouvindo');
  };
  O.fecharMicrofone = () => {
    if (!O._mic) return; try { O._mic.fluxo.getTracks().forEach(t => t.stop()); O._mic.ctx.close(); } catch (e) {}
    O._mic = null; if (O._estado === 'ouvindo') O.estado('repouso');
  };
  return O;
})();

/* =====================================================
   OUVIR (ditado) — o mesmo fluxo do TI ARTES
   ===================================================== */
function iavRelogio(liga) {
  clearInterval(IAV.relogio); IAV.relogio = null;
  const r = document.getElementById('iavRel'); if (!r) return;
  if (!liga) return;
  IAV.t0 = Date.now();
  const pinta = () => { const s = Math.floor((Date.now() - IAV.t0) / 1000); r.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  pinta(); IAV.relogio = setInterval(pinta, 500);
}
function iavPintaMic() {
  const g = iaEl && iaEl.g; if (!g) return;
  const m = g.querySelector('#iavMic'), bar = g.querySelector('#iavOuvindo'), on = !!IAV.rec;
  if (m) { m.classList.toggle('ouvindo', on); m.setAttribute('aria-pressed', on); m.querySelector('.t').textContent = on ? 'Parar' : 'Falar';
    m.title = on ? 'Ouvindo — quando você parar de falar, eu mando' : 'Falar — aperta, fala, e vai sozinho quando você parar'; }
  if (bar) bar.classList.toggle('on', on);
}
function iavParaOuvir(mandar) {
  IAV.naMao = !mandar;
  try { IAV.rec && IAV.rec.stop(); } catch (e) {}
}
async function iavOuvir() {
  if (IAV.rec) { iavParaOuvir(false); return; }
  if (!iavTemMic()) { toast('Este navegador não ouve — no iPhone use o Safari; no computador, Chrome ou Safari'); return; }
  /* o microfone já foi negado neste navegador? Avisar ANTES, com o caminho:
     o ditado sozinho falha em silêncio e ela acha que o app está quebrado */
  try { const p = await navigator.permissions.query({ name: 'microphone' });
    if (p.state === 'denied') { toast('O microfone está bloqueado neste navegador. Toque no cadeado ao lado do endereço e permita o microfone — ou abra o app no Chrome ou no Safari.', 6000); return; } } catch (e) {}
  iavPararFala();                                  /* não ouvir a si mesmo falando */
  const ta = iaEl.g.querySelector('#iaTxt'); if (!ta) return;
  const r = new FALA_REC();
  r.lang = 'pt-BR'; r.interimResults = true; r.maxAlternatives = 1;   /* continuous no padrão: o silêncio encerra e manda */
  IAV.antes = ta.value.trim(); IAV.juntado = ''; IAV.naMao = false; IAV.cancelou = false;
  const mostra = (meio) => {
    const tudo = [IAV.antes, IAV.juntado, meio].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    ta.value = tudo; ta.dispatchEvent(new Event('input'));
    Orbe.pulso(.55 + Math.min(.4, (meio || '').length / 45));
    const t = iaEl.g.querySelector('#iavOuvTxt'); if (t) t.textContent = tudo ? '“' + tudo.slice(-80) + '”' : 'Estou ouvindo — fale normal.';
  };
  r.onresult = (e) => {
    let fim = '', meio = '';
    for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fim += t; else meio += t; }
    if (fim) IAV.juntado = (IAV.juntado + ' ' + fim).trim();
    mostra(meio);
  };
  r.onerror = (e) => {
    const q = e && e.error;
    if (q === 'not-allowed' || q === 'service-not-allowed') toast('Falta liberar o microfone: toque no cadeado ao lado do endereço');
    else if (q === 'no-speech') toast('Não ouvi nada — aperte de novo e fale mais perto');
    else if (q === 'network') toast('Sem internet para transcrever a voz');
    else if (q !== 'aborted') toast('Deu problema no microfone (' + (q || '?') + ')');
  };
  r.onend = () => {
    IAV.rec = null; iavPintaMic(); iavRelogio(false); Orbe.fecharMicrofone();
    if (IAV.cancelou) { ta.value = IAV.antes || ''; ta.dispatchEvent(new Event('input')); return; }
    const txt = ta.value.trim();
    if (!txt || IAV.naMao) return;
    if (iaLe(IAV_ENVIA, true) !== false) iaEl.g.querySelector('#iaForm').requestSubmit(); else ta.focus();
  };
  try { r.start(); IAV.rec = r; mostra(''); iavPintaMic(); iavRelogio(true); Orbe.ouvirMicrofone().catch(() => Orbe.estado('ouvindo')); }
  catch (e) { toast('Não consegui abrir o microfone'); }
}

/* =====================================================
   FALAR (as respostas em voz alta)
   ===================================================== */
let IAV_VOZES = [], IAV_AUDIO = null;
function iavMelhorVoz() {
  if (!LER) return null;
  const todas = LER.getVoices() || [];
  const br = todas.filter(v => /^pt[-_]?br/i.test(v.lang || '')), pt = todas.filter(v => /^pt/i.test(v.lang || ''));
  IAV_VOZES = br.length ? br : pt;
  const nota = (v) => { const s = (v.name || '') + ' ' + (v.voiceURI || ''); let n = 0;
    if (/premium|enhanced|melhorada|neural|natural|siri/i.test(s)) n += 6; if (/google/i.test(s)) n += 3;
    if (/pt[-_]br/i.test(v.lang || '')) n += 4; if (v.localService) n += 1; if (/compact|eloquence|novelty/i.test(s)) n -= 8; return n; };
  return IAV_VOZES.slice().sort((a, b) => nota(b) - nota(a))[0] || null;
}
if (LER) try { LER.onvoiceschanged = () => iavMelhorVoz(); } catch (e) {}
/* texto → fala: sem asterisco, sem link letra por letra, dinheiro como a gente fala */
function paraFalar(txt) {
  let t = String(txt || '').replace(/<[^>]*>/g, ' ');
  t = t.replace(/https?:\/\/\S+/g, 'link')
    .replace(/£\s?([\d.,]+)/g, '$1 libras').replace(/R\$\s?([\d.,]+)/g, '$1 reais').replace(/US\$\s?([\d.,]+)/g, '$1 dólares').replace(/€\s?([\d.,]+)/g, '$1 euros')
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (m, h, mi) => mi === '00' ? h + ' horas' : h + ' e ' + mi)
    .replace(/[*_`#>|~]/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{FE0F}]/gu, ' ')
    .replace(/\n+/g, '. ').replace(/\s*\.\s*(\.\s*)+/g, '. ').replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
  return t.slice(0, 900);
}
function iavPararFala() {
  try { LER && LER.cancel(); } catch (e) {}
  try { if (IAV_AUDIO) { IAV_AUDIO.pause(); IAV_AUDIO.currentTime = 0; } } catch (e) {}
  Orbe.calar();
}
async function iavFalaEleven(t) {
  const el = iaLe(IAV_EL, {});
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(el.voz) + '?output_format=mp3_44100_128', {
    method: 'POST', headers: { 'xi-api-key': el.chave, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text: t, model_id: 'eleven_flash_v2_5', language_code: 'pt' }) });
  if (!r.ok) throw new Error(r.status === 401 ? 'chave recusada' : r.status === 402 || r.status === 429 ? 'cota da ElevenLabs esgotada' : r.status === 403 ? 'a chave não tem permissão de Text to Speech' : 'erro ' + r.status);
  const url = URL.createObjectURL(await r.blob());
  IAV_AUDIO = IAV_AUDIO || new Audio();
  IAV_AUDIO.src = url; IAV_AUDIO.onended = () => { Orbe.calar(); URL.revokeObjectURL(url); };
  await IAV_AUDIO.play();
}
function iavFalar(texto) {
  const t = paraFalar(texto); if (!t) return;
  if (!LER && !iaLe(IAV_EL, {}).chave) { toast('Este navegador não tem voz. Cole a chave da ElevenLabs em Ajustes → Voz do assistente.'); return; }
  iavPararFala();
  Orbe.falar(Math.min(26000, 400 + t.length * 62));   /* ~62 ms por caractere em português */
  const el = iaLe(IAV_EL, {});
  const aparelho = () => {
    if (!LER) return;
    const u = new SpeechSynthesisUtterance(t); const v = iavMelhorVoz();
    if (v) u.voice = v; u.lang = (v && v.lang) || 'pt-BR'; u.rate = 1.02;
    u.onend = () => Orbe.calar();
    u.onerror = (e) => { Orbe.calar(); if (e.error !== 'interrupted' && e.error !== 'canceled') toast('A voz do aparelho falhou (' + (e.error || '?') + ')'); };
    LER.speak(u);
  };
  if (el.chave && el.voz) iavFalaEleven(t).catch((e) => { toast('ElevenLabs: ' + (e.message || 'não respondeu') + ' — usei a voz do aparelho'); aparelho(); });
  else aparelho();
}

/* =====================================================
   A GAVETA
   ===================================================== */
/* SUGESTÕES PROATIVAS (padrão Ingrid): o assistente abre já sabendo o que é
   urgente, lido dos DADOS reais dela — não frases fixas. Mostra só o que tem
   fato; completa com atalhos úteis; sem gastar IA. Degrada sozinho quando uma
   coleção não existe. */
function iavSugestoes() {
  const hoje = typeof isoToday === 'function' ? isoToday() : '';
  const amanha = typeof addDays === 'function' ? addDays(hoje, 1) : '';
  const prox = [];   /* urgências, em ordem */
  try {
    const toursAmanha = (DB.bookings || []).filter(b => b.date === amanha && b.status === 'confirmed');
    if (toursAmanha.length) prox.push(['🗓', `Me passa a ficha de quem eu guio amanhã (${toursAmanha.length})`]);
    const novas = (typeof fichasTodas === 'function' ? fichasTodas() : []).filter(f => f.nova);
    if (novas.length) prox.push(['💷', `Quem pagou agora? (${novas.length}) — abre a ficha`]);
    const emails = (DB.emails || []).filter(e => !e.tratado && e.tipo !== 'ignorado');
    if (emails.length) prox.push(['✉️', `Responder o e-mail da ${emails[0].nome || 'agência'}`]);
    if (typeof prazoInvoice === 'function') {
      const inv = (DB.trabalhosAgencia || []).map(j => ({ j, p: prazoInvoice(j) })).filter(x => ['mandar', 'atrasada', 'vencida'].includes(x.p.st));
      if (inv.length) prox.push(['🧾', `Qual invoice eu preciso mandar? (${inv.length})`]);
    }
    const rot = (DB.roteiros || []).filter(r => r.pago && r.status !== 'publicado');
    if (rot.length) prox.push(['🗺️', `Validar o roteiro da ${primeiroNome ? primeiroNome(rot[0].nome) : rot[0].nome}`]);
    const tr = (DB.pedidos || []).filter(p => p.tipo === 'transfer' && !p.respondido);
    if (tr.length) prox.push(['🚘', `Cotar o transfer de ${primeiroNome ? primeiroNome(tr[0].nome) : tr[0].nome}`]);
    const av = (DB.avaliacoes || []).filter(a => !a.publicar && !a.vista && a.autorizou !== false);
    if (av.length) prox.push(['⭐', `Aprovar ${av.length} ${av.length > 1 ? 'avaliações novas' : 'avaliação nova'}`]);
    const tf = (DB.tarefas || []).filter(t => !t.feita && t.data && t.data <= hoje);
    if (tf.length) prox.push(['✅', `Minhas tarefas de hoje (${tf.length})`]);
  } catch (e) {}
  /* atalhos sempre úteis, pra completar até 6 */
  const atalhos = [
    ['📅', 'Qual é o meu próximo tour?'],
    ['💬', 'Escreve a resposta pra quem perguntou o preço do Londres Clássica'],
    ['✅', 'Anota: ligar pro hotel sexta às 10h'],
    ['💷', 'Quanto entrou este mês?'],
  ];
  const out = prox.slice(0, 6);
  for (const a of atalhos) { if (out.length >= 6) break; if (!out.some(x => x[1] === a[1])) out.push(a); }
  return out;
}
function iavHero(demo) {
  const nome = (typeof guiaNome === 'function' && guiaNome()) || 'Bia';
  const sug = demo ? iaCenarios().map(c => ['✦', c.pede, c]) : iavSugestoes();
  return `<div class="iavHero" id="iavHero">
    <div class="iavOrbeGrande" id="iavOrbeLugar"></div>
    <h2>Oi, ${esc(nome)}.</h2>
    <p>${demo ? 'Demonstração: toque num pedido e veja o assistente mexer no app de verdade.' : 'Fale ou escreva. Eu mexo em todas as abas — e mostro antes de gravar.'}</p>
    <div class="iavSug">${sug.map(([ic, txt], i) => `<button type="button" data-sug="${i}"><span>${ic}</span>${esc(txt)}</button>`).join('')}</div>
  </div>`;
}
const _iaDesenhaBase = iaDesenha;
iaDesenha = function () {
  if (iaMostrandoChave) return _iaDesenhaBase();
  const g = iaEl.g, corpo = g.querySelector('#iaCorpo');
  g.classList.add('iav');
  /* topo: o orbe pequeno, o título e a engrenagem */
  const cab = g.querySelector('header');
  if (!cab.querySelector('#iavOrbeTopo')) {
    cab.insertAdjacentHTML('afterbegin', '<span class="iavOrbeTopo" id="iavOrbeTopo"></span>');
    cab.querySelector('#iaFecha').insertAdjacentHTML('beforebegin', `<button type="button" class="iavIco" id="iavEng" aria-label="Ajustes do assistente" title="Ajustes do assistente">${iavSvg('eng')}</button>`);
    cab.querySelector('#iavEng').onclick = () => { IAV.menu = !IAV.menu; iavMenu(); };
    cab.querySelector('#iavEng').insertAdjacentHTML('beforebegin', '<button type="button" class="iavIco" id="iavVoz"></button>');
    cab.querySelector('#iavVoz').onclick = () => { const on = !iavVozOn(); iaGrava(IAV_VOZ, on); if (!on) iavPararFala(); iavPintaVoz();
      toast(on ? 'Ligado: vou ler cada resposta em voz alta' : 'Desligado: só falo quando você tocar em "Ouvir" numa resposta');
      if (on) iavFalar('Voz ligada. Agora eu leio as respostas.'); };
  }
  iavPintaVoz();
  cab.querySelector('#iaFecha').onclick = () => iaFecha();   /* o × foi ligado antes deste arquivo: passa a calar a voz e soltar o microfone */
  const demo = iaDemo(), vivo = iaModo() === 'vivo';
  const hist = demo ? [] : iaLe(IA_HIST, []);
  const vazio = !hist.length;
  corpo.innerHTML = `<div id="iaCrFaixa"></div><div id="iavMenu" hidden></div>
    <div id="iaMsgs">${vazio ? iavHero(demo) : ''}</div>
    <div id="iavOuvindo" role="status"><span class="barras"><i></i><i></i><i></i><i></i><i></i></span><span class="rel" id="iavRel">0:00</span>
      <span class="ouvTxt" id="iavOuvTxt">Estou ouvindo — fale normal.</span>
      <button type="button" class="chip" id="iavDescarta">descartar</button><button type="button" class="chip on" id="iavManda">enviar</button></div>
    <div id="iaAnexo"></div>
    ${demo ? `<div class="iavDemoPe"><button type="button" class="cta sm" id="iaConecta">✦ Ligar a IA</button><small>Sem a IA ligada, os pedidos acima rodam de exemplo.</small></div>` : `
    <form id="iaForm">
      <input type="file" id="iaArq" accept="image/*,application/pdf" multiple hidden>
      <button type="button" class="iavIco" id="iaClip" title="Anexar foto ou PDF" aria-label="Anexar foto ou PDF">${iavSvg('clip')}</button>
      <button type="button" class="iavMic" id="iavMic" aria-pressed="false" ${iavTemMic() ? '' : 'hidden'}>${iavSvg('mic')}<span class="t">Falar</span></button>
      <textarea id="iaTxt" rows="1" placeholder="Fale ou escreva…" aria-label="Mensagem para o assistente"></textarea>
      <button id="iaEnviar" type="submit" aria-label="Enviar">${iavSvg('env')}</button>
    </form>`}
    <span id="iaGasto" hidden></span>`;
  const msgs = corpo.querySelector('#iaMsgs');
  /* o orbe mora no herói (conversa vazia) ou no topo (conversando) */
  const lugar = corpo.querySelector('#iavOrbeLugar') || g.querySelector('#iavOrbeTopo');
  g.querySelector('#iavOrbeTopo').classList.toggle('vazio', !!corpo.querySelector('#iavOrbeLugar'));
  let cv = document.getElementById('iavOrbe');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'iavOrbe'; cv.setAttribute('aria-hidden', 'true'); }
  lugar.appendChild(cv);
  if (!Orbe.montar(cv)) cv.classList.add('semGl');
  if (vivo) msgs.insertAdjacentHTML('afterbegin', `<div class="iaDemo"><b>⚡ ${ia('vivoTit')}</b>${esc(ia('vivoTxt'))}</div>`);
  if (!demo) for (const m of hist) {
    if (typeof m.content === 'string') iaBolha(m.role, m.content);
    else if (m.role === 'assistant' || ehPergunta(m)) { const t2 = m.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim(); if (t2) iaBolha(m.role, t2); }
  }
  /* sugestões */
  const sugs = demo ? iaCenarios() : iavSugestoes();
  msgs.querySelectorAll('[data-sug]').forEach(b => b.onclick = () => {
    const s = sugs[+b.dataset.sug]; const hero = msgs.querySelector('#iavHero');
    if (demo) { iavMoveOrbeTopo(); if (hero) hero.remove(); iaRodaCenario(s); }
    else iaConversa(s[1]);
  });
  const cn = corpo.querySelector('#iaConecta');
  if (cn) cn.onclick = () => { if (typeof irParaCreditos === 'function') { iaFecha(); irParaCreditos(); } else { iaMostrandoChave = true; _iaDesenhaBase(); } };
  if (!demo) {
    const f = corpo.querySelector('#iaForm'), ta = corpo.querySelector('#iaTxt'), arq = corpo.querySelector('#iaArq');
    f.onsubmit = (e) => { e.preventDefault(); const v = ta.value.trim(); if (!v && !IAV.anexos.length) return; if (IAV.rec) { IAV.naMao = true; try { IAV.rec.stop(); } catch (x) {} }
      const anx = IAV.anexos; IAV.anexos = []; iaMostraAnexo(); ta.value = ''; ta.style.height = ''; iaConversa(v, anx); };
    ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); f.requestSubmit(); } };
    ta.oninput = () => { ta.style.height = ''; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
    corpo.querySelector('#iaClip').onclick = () => arq.click();
    arq.onchange = async () => {
      for (const file of [...arq.files].slice(0, 4 - IAV.anexos.length)) {
        try {
          if (file.type === 'application/pdf') {
            if (file.size > 8e6) { toast('PDF grande demais (até 8 MB)'); continue; }
            const data = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(file); });
            IAV.anexos.push({ tipo: 'pdf', data, nome: file.name });
          } else IAV.anexos.push({ tipo: 'img', data: await iaReduzFoto(file), nome: file.name });
        } catch (e) { iaBolha('erro', e.message || 'Não consegui ler o arquivo'); }
      }
      arq.value = ''; iaMostraAnexo();
    };
    corpo.querySelector('#iavMic').onclick = iavOuvir;
    if (!('ontouchstart' in window)) ta.focus();
  }
  corpo.querySelector('#iavDescarta').onclick = () => { IAV.cancelou = true; iavParaOuvir(false); };
  corpo.querySelector('#iavManda').onclick = () => iavParaOuvir(true);
  iaMostraAnexo(); iaMostraGasto(); iavMenu();
  msgs.scrollTop = msgs.scrollHeight;
  if (typeof crFaixa === 'function' && modulo('assistente') === true) crFaixa('iaCrFaixa');
};
/* o 🔊 do topo: ler (ou não) as respostas em voz alta */
function iavPintaVoz() {
  const v = iaEl && iaEl.g.querySelector('#iavVoz'); if (!v) return;
  const on = iavVozOn(); v.hidden = !LER && !iaLe(IAV_EL, {}).chave;
  v.classList.toggle('on', on); v.setAttribute('aria-pressed', on);
  v.setAttribute('aria-label', on ? 'Lendo as respostas em voz alta — desligar' : 'Ler as respostas em voz alta');
  v.title = v.getAttribute('aria-label'); v.innerHTML = iavSvg(on ? 'som' : 'mudo');
}
function iavMoveOrbeTopo() {
  const cv = document.getElementById('iavOrbe'), topo = iaEl && iaEl.g.querySelector('#iavOrbeTopo');
  if (cv && topo && cv.parentNode !== topo) { topo.appendChild(cv); topo.classList.remove('vazio'); }
}
/* a engrenagem: o que era rodapé mora aqui */
function iavMenu() {
  const m = iaEl && iaEl.g.querySelector('#iavMenu'); if (!m) return;
  m.hidden = !IAV.menu; if (!IAV.menu) return;
  const demo = iaDemo(), vivo = iaModo() === 'vivo';
  m.innerHTML = `<label class="iavLiga"><input type="checkbox" id="iaConf" ${iaPerguntaAntes() ? 'checked' : ''}><span><b>Perguntar antes de gravar</b><small>O cartão "confirma?" antes de mexer no app.</small></span></label>
    <label class="iavLiga"><input type="checkbox" id="iavEnvia" ${iaLe(IAV_ENVIA, true) !== false ? 'checked' : ''}><span><b>Mandar sozinho quando eu parar de falar</b><small>Desligado, o texto fica na caixa para você revisar.</small></span></label>
    ${iavVozCfgHtml()}
    <div class="iavMenuPe"><span id="iaGastoMenu"></span>
      <button type="button" class="mini" id="iaLimpa">Nova conversa</button>
      ${demo || vivo ? '' : '<button type="button" class="mkLink" id="iaTiraChave">Trocar a chave da IA</button>'}</div>`;
  m.querySelector('#iaConf').onchange = (e) => iaGrava(IA_CONFIRMA, e.target.checked);
  m.querySelector('#iavEnvia').onchange = (e) => iaGrava(IAV_ENVIA, e.target.checked);
  m.querySelector('#iaLimpa').onclick = () => { iaGrava(IA_HIST, []); IAV.menu = false; iavPararFala(); iaDesenha(); };
  const tc = m.querySelector('#iaTiraChave'); if (tc) tc.onclick = () => { if (!confirm(ia('tirarChave'))) return; localStorage.removeItem(IA_CHAVE); IAV.menu = false; iaAtualizaFab(); iaDesenha(); };
  iavLigaVozCfg(m, iavMenu);
  if (typeof crResumo === 'function') crResumo(true).then(r => { const x = crSituacao(r); const s = m.querySelector('#iaGastoMenu'); if (s) s.innerHTML = `<button type="button" class="crPilula ${x.classe}" onclick="irParaCreditos()">✦ ${x.curto}</button>`; }).catch(() => {});
}

/* a voz das respostas — o MESMO bloco na engrenagem da gaveta e em
   Ajustes → "Voz do assistente" (é em Ajustes que se procura onde pôr
   chave: foi lá que o Eugênio procurou, 28/09). Classes, não ids: os dois
   podem estar abertos ao mesmo tempo. A chave fica só neste aparelho. */
function iavVozCfgHtml() {
  const el = iaLe(IAV_EL, {});
  return `<div class="iavVozCfg"><b>Voz das respostas</b>
    <small class="vzEstado">${el.chave && el.voz ? `✓ Chave salva neste aparelho · voz de estúdio: <b>${esc(el.nomeVoz || el.voz)}</b>`
      : el.chave ? '✓ Chave salva neste aparelho · <b>falta escolher a voz</b> — toque em Buscar vozes e escolha uma'
      : 'Sem chave: usa a voz do aparelho. Com a ElevenLabs, a voz fica de gente — e pode ser a voz clonada da guia, com a autorização dela.'}</small>
    <label class="vzRot">Chave da ElevenLabs <small>elevenlabs.io → seu perfil → API Keys → Create. Fica só neste aparelho.</small></label>
    <div class="iavLinha"><input type="password" class="vzKey" autocomplete="off" placeholder="cole aqui (sk_…)" value="${el.chave ? '••••••••' : ''}" aria-label="Chave da ElevenLabs">
      <button type="button" class="mini vzBusca">Buscar vozes</button></div>
    <select class="vzSel" hidden aria-label="Escolher a voz"></select>
    <div class="iavLinha vzBts"><button type="button" class="mini vzTeste">▶ Ouvir um teste</button>
      ${el.chave ? '<button type="button" class="mkLink vzTira">Voltar para a voz do aparelho</button>' : ''}</div>
  </div>`;
}
function iavLigaVozCfg(root, redesenha) {
  const q = (c) => root.querySelector(c), el = iaLe(IAV_EL, {});
  q('.vzTeste').onclick = () => iavFalar('Oi, ' + ((typeof guiaNome === 'function' && guiaNome()) || 'Bia') + '! Amanhã você guia a família Souza: Londres Clássica, das 9 e 30 à 1 e meia, com saída na estação Westminster.');
  if (q('.vzTira')) q('.vzTira').onclick = () => { iaGrava(IAV_EL, {}); toast('Voltei para a voz do aparelho'); redesenha(); };
  q('.vzBusca').onclick = async () => {
    const inp = q('.vzKey'); const chave = /^•+$/.test(inp.value) ? el.chave : inp.value.trim();
    if (!chave) { toast('Cole a chave da ElevenLabs'); inp.focus(); return; }
    const b = q('.vzBusca'); b.disabled = true; b.textContent = 'Buscando…';
    try {
      const ctrl = new AbortController(), corta = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': chave }, signal: ctrl.signal }).finally(() => clearTimeout(corta));
      if (!r.ok) throw new Error(r.status === 401 ? 'a chave foi recusada (confira se copiou inteira)' : r.status === 403 ? 'a chave não tem a permissão "Voices" (leitura)' : 'erro ' + r.status);
      const vs = ((await r.json()).voices || []).map(v => ({ id: v.voice_id, nome: v.name, clonada: v.category === 'cloned' }));
      if (!vs.length) throw new Error('nenhuma voz na sua conta — adicione uma na Voice Library');
      /* a chave já vale: fica salva AQUI, antes de escolher a voz. Antes só
         gravava ao escolher — quem fechava a tela no meio perdia a chave. */
      const mesma = chave === el.chave;
      iaGrava(IAV_EL, { chave, voz: mesma ? el.voz : '', nomeVoz: mesma ? el.nomeVoz : '' });
      const est = q('.vzEstado'); if (est) est.innerHTML = '✓ Chave salva neste aparelho · <b>agora escolha a voz</b>';
      const sel = q('.vzSel'); sel.hidden = false;
      sel.innerHTML = '<option value="">escolha a voz…</option>' + vs.map(v => `<option value="${esc(v.id)}">${esc(v.nome)}${v.clonada ? ' (clonada)' : ''}</option>`).join('');
      if (mesma && el.voz) sel.value = el.voz;
      sel.onchange = () => { const v = vs.find(x => x.id === sel.value); if (!v) return; iaGrava(IAV_EL, { chave, voz: v.id, nomeVoz: v.nome }); iavPintaVoz(); toast('Voz escolhida: ' + v.nome + ' — toque em Ouvir um teste'); redesenha(); };
      toast(vs.length + ' vozes — escolha uma');
    } catch (e) { toast('ElevenLabs: ' + (e.name === 'AbortError' ? 'não respondeu' : e.message)); }
    finally { b.disabled = false; b.textContent = 'Buscar vozes'; }
  };
}
/* Ajustes → cartão "Voz do assistente", logo abaixo de Créditos de IA */
const _admSettingsVoz = admSettings;
admSettings = function () {
  _admSettingsVoz();
  const stage = document.getElementById('stage'); if (!stage || document.getElementById('vozCard')) return;
  const depois = document.getElementById('creditos') || document.getElementById('regrasLL') || stage.querySelector('.pageh'); if (!depois) return;
  depois.insertAdjacentHTML('afterend', `<section class="card vozCard" id="vozCard"><h3>🔊 Voz do assistente</h3>
    <p class="why">Com a voz ligada (o 🔊 no topo do assistente), ele lê as respostas em voz alta. Sem chave, usa a voz do aparelho.</p>${iavVozCfgHtml()}</section>`);
  const card = document.getElementById('vozCard');
  const re = () => { const n = document.getElementById('vozCard'); if (!n) return; n.querySelector('.iavVozCfg').outerHTML = iavVozCfgHtml(); iavLigaVozCfg(n, re); };
  iavLigaVozCfg(card, re);
};

/* anexos à espera (fotos e PDF) */
iaMostraAnexo = function () {
  const el = iaEl && iaEl.g.querySelector('#iaAnexo'); if (!el) return;
  el.classList.toggle('on', !!IAV.anexos.length);
  el.innerHTML = IAV.anexos.map((a, i) => `<span class="iavAnx">${a.tipo === 'img' ? `<img src="${a.data}" alt="">` : `${iavSvg('pdf')}<small>${esc(a.nome.slice(0, 22))}</small>`}
    <button type="button" data-tira="${i}" aria-label="Tirar anexo">×</button></span>`).join('');
  el.querySelectorAll('[data-tira]').forEach(b => b.onclick = () => { IAV.anexos.splice(+b.dataset.tira, 1); iaMostraAnexo(); });
};

/* as bolhas: avatar LL, e em cada resposta "Copiar" e "Ouvir" */
iaBolha = function (tipo, texto, antesDe, semCopiar, foto) {
  const msgs = iaEl && iaEl.g.querySelector('#iaMsgs');
  if (!msgs) return document.createElement('div');
  const hero = msgs.querySelector('#iavHero'); if (hero && tipo !== 'pensa') { iavMoveOrbeTopo(); hero.remove(); }   /* o orbe muda de lugar ANTES: senão sai junto com a tela vazia */
  const d = document.createElement('div'); d.className = 'iaB ' + tipo;
  const fs = !foto ? [] : Array.isArray(foto) ? foto : [foto];
  const anx = fs.map(f => typeof f === 'string' ? { tipo: 'img', data: f } : f);
  d.innerHTML = (anx.length ? `<span class="iaFotos">${anx.map(a => a.tipo === 'img' ? `<img src="${a.data}" alt="">` : `<span class="iavPdf">${iavSvg('pdf')}${esc(a.nome || 'PDF')}</span>`).join('')}</span>` : '') + `<span class="tx">${iaHtml(texto)}</span>`;
  if (tipo === 'assistant' && !semCopiar) {
    const a = document.createElement('div'); a.className = 'iavAcoes';
    a.innerHTML = `${texto.length > 60 ? `<button type="button" class="cp">${iavSvg('copia')}Copiar</button>` : ''}${LER || iaLe(IAV_EL, {}).chave ? `<button type="button" class="ouv">${iavSvg('som')}Ouvir</button>` : ''}`;
    const cp = a.querySelector('.cp'); if (cp) cp.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(texto.replace(/\*\*/g, '')).then(() => { cp.lastChild.textContent = 'Copiado'; }); };
    const ou = a.querySelector('.ouv'); if (ou) ou.onclick = () => iavFalar(texto);
    if (a.children.length) d.appendChild(a);
  }
  if (antesDe && antesDe.parentNode === msgs) msgs.insertBefore(d, antesDe); else msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
};

/* o histórico guardado não leva foto nem PDF inteiros (enchem o aparelho) */
iaAparaHist = function (h) {
  let x = h.slice(-40);
  while (x.length && !ehPergunta(x[0])) x.shift();
  return x.map(m => Array.isArray(m.content) && m.content.some(b => b.type === 'image' || b.type === 'document')
    ? { ...m, content: m.content.map(b => b.type === 'image' ? { type: 'text', text: '[foto]' } : b.type === 'document' ? { type: 'text', text: '[PDF' + (b.title ? ': ' + b.title : '') + ']' } : b) } : m);
};

/* a conversa: a mesma do app dela, agora com PDF, orbe e voz */
iaConversa = async function (texto, anexos) {
  anexos = (!anexos ? [] : Array.isArray(anexos) ? anexos : [anexos]).map(a => typeof a === 'string' ? { tipo: 'img', data: a } : a);
  if (iaOcupado) return;
  iaOcupado = true; iaTravado(true); iavPararFala();
  const fotos = anexos.filter(a => a.tipo === 'img'), pdfs = anexos.filter(a => a.tipo === 'pdf');
  const hist = iaAparaHist(iaLe(IA_HIST, []));
  const refs = fotos.map(f => guardaFoto(f.data)).filter(Boolean).map(f => f.id);
  const nota = refs.length ? `\n\n[${refs.length > 1 ? 'fotos guardadas' : 'foto guardada'}; refs (para criativo ou capa de passeio): ${refs.join(', ')}]` : '';
  const pergunta = texto || (pdfs.length ? 'Leia este PDF e me diga o que é e o que eu preciso fazer.' : fotos.length > 1 ? 'O que dá para fazer com estas fotos?' : 'O que você vê nesta foto?');
  const blocos = [
    ...fotos.map(f => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data.split(',')[1] } })),
    ...pdfs.map(p => ({ type: 'document', title: p.nome, source: { type: 'base64', media_type: 'application/pdf', data: p.data.split(',')[1] } })),
  ];
  hist.push({ role: 'user', content: blocos.length ? [...blocos, { type: 'text', text: pergunta + nota }] : pergunta });
  iaBolha('user', pergunta, null, false, anexos);
  const pensando = iaBolha('pensa', ia('pensando'));
  Orbe.estado('pensando');
  let ultima = '';
  try {
    for (let volta = 0; volta < IA_MAX_VOLTAS; volta++) {
      const resp = await iaChamar(hist);
      hist.push({ role: 'assistant', content: resp.content });
      const txt = resp.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      if (txt) { iaBolha('assistant', txt, pensando); ultima = txt; }
      if (resp.stop_reason !== 'tool_use') break;
      const res = [];
      for (const b of resp.content.filter(b => b.type === 'tool_use')) res.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(await iaRodaFerramenta(b.name, b.input)) });
      hist.push({ role: 'user', content: res });
    }
    if (hist[hist.length - 1].role === 'user') { hist.pop(); hist.pop(); }
    iaGrava(IA_HIST, iaAparaHist(hist));
  } catch (e) {
    if (e.acabou) setTimeout(() => { iaAtualizaFab(); iaDesenha(); iaBolha('assistant', ia('vivoAcabou'), null, true); }, 50);
    else iaBolha('erro', e.message);
  }
  finally {
    pensando.remove(); iaOcupado = false; iaTravado(false); Orbe.estado('repouso');
    if (ultima && iavVozOn()) iavFalar(ultima);
  }
};

/* fechar a gaveta cala a voz e solta o microfone */
const _iaFechaVoz = iaFecha;
iaFecha = function () { iavPararFala(); if (IAV.rec) { IAV.cancelou = true; iavParaOuvir(false); } Orbe.fecharMicrofone(); return _iaFechaVoz(); };
