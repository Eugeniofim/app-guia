/* O que é privado (tarefas, agencias…) aparece em todos os aparelhos da dona — e um aparelho vazio ou
   um "Sincronizar de novo" NUNCA apaga o que está na nuvem (trava dentro do DB). 21/10/2026.
   Três "aparelhos" de mentira falam com o mesmo banco de mentira. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SERVE = __dirname + '/../carol';
let falhas = 0; const casos = [];
const t = (nome, fn) => casos.push([nome, fn]);
async function rodar() {
  for (const [nome, fn] of casos) {
    try { await fn(); console.log('  ok  ' + nome); }
    catch (e) { falhas++; console.log('  FALHA ' + nome + '\n       ' + e.message); }
  }
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
  process.exit(falhas ? 1 : 0);
}
const espera = (ms) => new Promise(r => setTimeout(r, ms));
function banco() {
  const b = { itens: new Map(), n: 0, fora: false };
  b.carimbo = () => new Date(Date.UTC(2026, 9, 21) + (++b.n) * 1000).toISOString();
  b.fetch = async (u, o = {}) => {
    const url = String(u), met = o.method || 'GET';
    const resp = (ok, corpo, status = ok ? 200 : 500) => ({ ok, status, json: async () => corpo, text: async () => JSON.stringify(corpo) });
    if (url.includes('/rest/v1/itens')) {
      if (b.fora) throw new Error('sem rede');
      if (met === 'GET') { const m = url.match(/atualizado_em=gt\.([^&]+)/), desde = m ? decodeURIComponent(m[1]) : '';
        return resp(true, [...b.itens.values()].filter(l => l.atualizado_em > desde).sort((x, y) => x.atualizado_em.localeCompare(y.atualizado_em))); }
      if (met === 'POST') { for (const l of [].concat(JSON.parse(o.body))) b.itens.set(l.colecao + '|' + l.id, { ...l, atualizado_em: b.carimbo() }); return resp(true, null, 201); }
    }
    if (url.includes('appstate') && met === 'PATCH') return resp(true, [{ id: 1 }]);
    if (url.includes('appstate')) return resp(true, [{ data: { tours: [], rules: [], departures: [], blocks: [], coupons: [], settings: {} }, updated_at: '2026-10-21T00:00:00Z' }]);
    return resp(true, []);
  };
  b.vivos = (col) => JSON.stringify([...b.itens.values()].filter(l => l.colecao === col && !l.apagado).map(l => l.id).sort());
  return b;
}
function aparelho(b, { disco = {}, logada = true } = {}) {
  const ctx = { console, AbortController, fetch: b.fetch, GUIA_CFG: {},
    localStorage: { _d: disco, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
    setTimeout, clearTimeout, setInterval: () => 0, Date, JSON, Math, Set, Map, Array, Object, String, Number, Promise, navigator: { language: 'pt-BR', onLine: true },
    addEventListener: () => {}, document: { addEventListener: () => {}, readyState: 'loading' }, location: { search: '', hash: '', href: 'http://x/' } };
  ctx.window = ctx; vm.createContext(ctx);
  if (fs.existsSync(SERVE + '/config.js')) vm.runInContext(fs.readFileSync(SERVE + '/config.js', 'utf8'), ctx);
  vm.runInContext("if (typeof APP_CONFIG === 'undefined') var APP_CONFIG = {}; APP_CONFIG.supabaseUrl = 'https://teste.supabase.local'; APP_CONFIG.supabaseKey = 'chave-de-teste';", ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/store.js', 'utf8'), ctx);
  vm.runInContext('load();', ctx);
  ctx.isLoggedIn = () => logada; ctx.authEnsure = async () => {}; ctx.authToken = () => 'tok';
  vm.runInContext(fs.readFileSync(SERVE + '/cloud.js', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/nuvem-itens.js', 'utf8'), ctx);
  ctx.rodar = (js) => vm.runInContext(js, ctx);
  ctx.ids = (col) => ctx.rodar(`JSON.stringify((DB['${col}'] || []).map(x => x.id).sort())`);   /* string: array de outro realm não passa no deepStrictEqual */
  ctx.disco = disco;
  return ctx;
}
const cria = (A, col, id) => A.rodar(`DB['${col}'] = DB['${col}'] || []; DB['${col}'].push({ id: '${id}', texto: 'item ${id}' }); save();`);
console.log('sincronia do que é privado (itens) — carol');
t('tarefas criado no celular aparece no computador', async () => {
  const b = banco(), cel = aparelho(b), pc = aparelho(b);
  assert.ok((await cel.itSincronizarAoAbrir()).ok, 'celular nao leu o banco'); assert.ok((await pc.itSincronizarAoAbrir()).ok, 'computador nao leu o banco');
  cria(cel, 'tarefas', 'a1'); await espera(1000);
  assert.strictEqual(b.vivos('tarefas'), JSON.stringify(['a1']), 'nao subiu');
  await pc.itPuxar(); assert.strictEqual(pc.ids('tarefas'), JSON.stringify(['a1']), 'nao chegou no computador');
});
t('agencias tambem atravessa, e apagado num aparelho some no outro', async () => {
  const b = banco(), cel = aparelho(b), pc = aparelho(b);
  await cel.itSincronizarAoAbrir(); await pc.itSincronizarAoAbrir();
  cria(cel, 'agencias', 'x1'); cria(cel, 'agencias', 'x2'); await espera(1000); await pc.itPuxar();
  assert.strictEqual(pc.ids('agencias'), JSON.stringify(['x1', 'x2']));
  pc.rodar(`DB['agencias'] = DB['agencias'].filter(x => x.id !== 'x2'); save();`); await espera(1000); await cel.itPuxar();
  assert.strictEqual(cel.ids('agencias'), JSON.stringify(['x1']), 'o apagado voltou');
});
t('aparelho NOVO e vazio recebe tudo e NAO apaga nada da nuvem', async () => {
  const b = banco(), cel = aparelho(b); await cel.itSincronizarAoAbrir();
  cria(cel, 'tarefas', 'a1'); cria(cel, 'tarefas', 'a2'); await espera(1000);
  const novo = aparelho(b); assert.strictEqual(novo.ids('tarefas'), JSON.stringify([]), 'aparelho novo devia nascer vazio');
  novo.rodar('save();'); await espera(1000);
  assert.strictEqual(b.vivos('tarefas'), JSON.stringify(['a1', 'a2']), 'o aparelho vazio mexeu na nuvem antes de ler');
  await novo.itSincronizarAoAbrir(); assert.strictEqual(novo.ids('tarefas'), JSON.stringify(['a1', 'a2']), 'nao recebeu');
});
t('o que so existia no aparelho SOBE na primeira sincronia (junta, nao troca)', async () => {
  const b = banco(), cel = aparelho(b); await cel.itSincronizarAoAbrir(); cria(cel, 'tarefas', 'nuvem1'); await espera(1000);
  const pc = aparelho(b); pc.rodar(`DB['tarefas'] = [{ id: 'local1', texto: 'so aqui' }]; localStorage.setItem(DB_KEY, JSON.stringify(DB));`);
  await pc.itSincronizarAoAbrir(); await espera(1000);
  assert.strictEqual(pc.ids('tarefas'), JSON.stringify(['local1', 'nuvem1']), 'nao juntou'); assert.strictEqual(b.vivos('tarefas'), JSON.stringify(['local1', 'nuvem1']), 'o local nao subiu');
});
t('"Sincronizar de novo" (DB apagado, sombra cheia) NAO apaga a nuvem — a trava', async () => {
  const b = banco(), cel = aparelho(b); await cel.itSincronizarAoAbrir(); cria(cel, 'tarefas', 'a1'); cria(cel, 'tarefas', 'a2'); await espera(1000);
  cel.rodar(`localStorage.removeItem(DB_KEY); load();`);   /* o DB foi embora; a sombra ficou */
  cel.rodar('save();'); await espera(1000);
  assert.strictEqual(b.vivos('tarefas'), JSON.stringify(['a1', 'a2']), 'APAGOU a nuvem depois de limpar o DB');
  await cel.itSincronizarAoAbrir(); assert.strictEqual(cel.ids('tarefas'), JSON.stringify(['a1', 'a2']), 'nao releu o banco');
});
rodar();
