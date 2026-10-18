/* A FILA DE ENVIOS NÃO LEVA EXEMPLO PARA O BANCO — 18/10/2026.

   Achado ao ligar a sala da Yalla. A fila offline guardava toda mexida em
   reserva MESMO SEM banco: na demonstração o envio "falhava" (não havia para
   onde mandar) e ia para a fila. No dia em que o banco era ligado, o app
   mandava as reservas de exemplo para o banco de verdade — e o visitante
   pode inserir reservas (é assim que o cliente reserva).

   Pior: os apps moram todos em guia.eugeniofim.com e dividiam a mesma chave
   ('vi_queue_v1'). A demonstração da raiz enchia a fila e o primeiro app com
   banco aberto naquele aparelho a esvaziava na sala DELE.

   Este teste garante:
   - sem banco, nada entra na fila;
   - com banco, envio que falha continua esperando (offline de verdade);
   - a fila tem o nome deste app, e a da raiz não sobe por aqui;
   - quando existe a guarda da demonstração, ela leva a fila junto;
   - "Ressincronizar" apaga as chaves deste app, não as da raiz. */
const fs = require('fs'), vm = require('vm');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/cloud.js'));
const ler = (f) => fs.readFileSync(SERVE + '/' + f, 'utf8');

let falhas = 0;
const ok = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

/* um aparelho: o localStorage (mem) pode passar de um contexto para outro,
   como o mesmo celular abrindo o app antes e depois do banco ser ligado */
function aparelho(url, mem = {}) {
  const envios = [];
  const ctx = {
    APP_CONFIG: { supabaseUrl: url, supabaseKey: url ? 'chave-de-teste' : '' },
    console, JSON, AbortController, Date, Math, Number, Object, Array, String, Set, Map, RegExp, Intl, Promise,
    setTimeout, clearTimeout,
    localStorage: { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
    /* o banco de mentira recusa tudo: o que falha vai (ou não) para a fila */
    fetch: async (u, o) => {
      envios.push(((o && o.method) || 'GET') + ' ' + String(u).split('/rest/v1/').pop());
      return { ok: false, status: 500, json: async () => [] };
    },
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(ler('store.js'), ctx);
  vm.runInContext(ler('cloud.js'), ctx);
  vm.runInContext('load();', ctx);
  return { mem, envios, val: (e) => vm.runInContext(e, ctx) };
}
const fila = (a, k) => { try { return JSON.parse(a.mem[k] || '[]'); } catch (e) { return []; } };

console.log('a fila de envios');

(async () => {
  /* --- a fila tem o nome deste app --- */
  const s = aparelho('');
  const QK = s.val('QUEUE_KEY'), DBK = s.val('DB_KEY');
  const raiz = DBK === 'vi_db_v1';
  ok('a fila tem o prefixo do DB_KEY (' + QK + ')', QK === DBK.replace(/_db_v\d+$/, '') + '_queue_v1', QK);
  if (!raiz) ok('a fila NÃO é a da demonstração da raiz', QK !== 'vi_queue_v1');

  /* --- sem banco, nada entra na fila --- */
  await s.val(`cloudPushBooking({ id: 'teste-fila-1', name: 'Exemplo da demonstração', createdAt: new Date().toISOString() })`);
  await s.val(`cloudUpdateBooking({ id: 'teste-fila-1', name: 'Exemplo da demonstração', status: 'confirmed' })`);
  ok('sem banco, reserva nova e mexida em reserva não vão para a fila', fila(s, QK).length === 0, s.mem[QK]);
  ok('sem banco, nada vai para a rede', s.envios.length === 0, s.envios.join(' | '));

  /* --- com banco, o offline continua funcionando --- */
  const c = aparelho('https://teste.supabase.local');
  await c.val(`cloudPushBooking({ id: 'teste-fila-2', name: 'Cliente de verdade', createdAt: new Date().toISOString() })`);
  ok('com banco, envio que falhou espera na fila deste app', fila(c, QK).length === 1 && fila(c, QK)[0].path === 'bookings', c.mem[QK]);

  /* --- a fila da raiz não sobe por aqui --- */
  if (!raiz) {
    const memRaiz = { vi_queue_v1: JSON.stringify([{ path: 'bookings', method: 'POST', body: { id: 'demo-raiz', data: { id: 'demo-raiz', name: 'Exemplo da raiz' } } }]) };
    const r = aparelho('https://teste.supabase.local', memRaiz);
    await r.val('qFlush()');
    ok('o que a demonstração da raiz deixou na fila não vai para esta sala', !r.envios.some(e => /^POST bookings/.test(e)), r.envios.join(' | '));
  }

  /* --- a guarda da demonstração leva a fila junto --- */
  if (/DB\.demo && temNuvem\(\)/.test(ler('store.js'))) {
    const mem = {};
    const antes = aparelho('', mem);
    const tinhaDemo = antes.val('DB.demo === true');
    antes.val(`DB.settings.lang = 'en'; save();`);
    mem[QK] = JSON.stringify([{ path: 'bookings', method: 'POST', body: { id: 'demo-1', data: { id: 'demo-1' } } }]);
    const depois = aparelho('https://teste.supabase.local', mem);
    ok('banco ligado: a fila do tempo da demonstração vai embora', tinhaDemo && mem[QK] === undefined, mem[QK]);
    ok('banco ligado: a demonstração guardada vira app vazio (só o idioma fica)',
      depois.val(`!DB.demo && DB.bookings.length === 0 && DB.tours.length === 0 && DB.settings.lang === 'en'`));
  }

  /* --- Ressincronizar apaga as chaves deste app --- */
  const app = ler('app.js');
  const i = app.indexOf("$('#ressync').onclick");
  const bloco = i > 0 ? app.slice(i, i + 900) : '';
  ok('Ressincronizar apaga o DB e a fila DESTE app',
    /removeItem\(DB_KEY\)/.test(bloco) && /removeItem\(QUEUE_KEY\)/.test(bloco) && !/'vi_db_v1'|'vi_queue_v1'/.test(bloco),
    'com as chaves da raiz fixas, o botão apagava a demonstração e deixava a cópia daqui');

  /* --- o login grava a trava no DB deste app --- */
  ok('o login grava no DB_KEY deste app, não na chave fixa da raiz',
    !/setItem\(\s*['"]vi_db_v1['"]/.test(app) && /authRequired = true;\s*localStorage\.setItem\(DB_KEY,/.test(app),
    "com 'vi_db_v1' fixo a trava do painel não ficava gravada e o DB dela ia para a demonstração da raiz");

  console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
  process.exit(falhas ? 1 : 0);
})();
