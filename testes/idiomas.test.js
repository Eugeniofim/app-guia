/* Seis idiomas (21/09/2026): toda frase da tela tem PT, EN, FR, IT, DE e ES,
   com as mesmas variáveis {x}; os passeios de exemplo nascem traduzidos;
   e idioma sem a frase cai no inglês, nunca no português. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/..';
let falhas = 0; const casos = []; const t_ = (n, f) => casos.push([n, f]);

function ambiente(lang) {
  const ls = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
  const ctx = { console, JSON, Math, Date, Object, Array, String, Number, Set, Map, Intl, localStorage: ls };
  vm.createContext(ctx);
  for (const f of ['config.js', 'idiomas.js', 'store.js', 'i18n.js'])
    vm.runInContext(fs.readFileSync(R + '/' + f, 'utf8').replace(/^(const|let) /gm, 'var '), ctx);
  if (lang) ctx.LANG = lang;
  return ctx;
}
const vars = (s) => JSON.stringify(s).match(/\{[a-zA-Z]+\}/g)?.sort().join() || '';
const LINGUAS = ['pt', 'en', 'fr', 'it', 'de', 'es'];

t_('toda frase da tela existe nas seis línguas', () => {
  const c = ambiente();
  const faltam = [];
  for (const [k, e] of Object.entries(c.STR)) for (const l of LINGUAS) if (!(l in e)) faltam.push(k + '.' + l);
  assert.deepStrictEqual(faltam, []);
});

t_('as variáveis {x} são as mesmas em todas as línguas', () => {
  const c = ambiente(), ruins = [];
  for (const [k, e] of Object.entries(c.STR)) for (const l of LINGUAS) if (vars(e[l]) !== vars(e.pt)) ruins.push(k + '.' + l);
  assert.deepStrictEqual(ruins, []);
});

t_('frase em francês aparece em francês', () => {
  const c = ambiente('fr');
  assert.strictEqual(c.LANG, 'fr');
  assert.strictEqual(c.t('xNovaReserva'), 'Nouvelle réservation');
});

t_('idioma sem a frase cai no inglês, não no português', () => {
  const c = ambiente('it');
  c.STR.__teste = { pt: 'só português', en: 'english fallback' };
  assert.strictEqual(c.t('__teste'), 'english fallback');
  assert.strictEqual(c.tl({ pt: 'Olá', en: 'Hello' }), 'Hello');
  assert.strictEqual(c.tl({ pt: 'Olá', en: 'Hello', it: 'Ciao' }), 'Ciao');
});

t_('passeios de exemplo nascem com as seis línguas', () => {
  const c = ambiente('de');
  const db = vm.runInContext('_seed()', c);
  for (const x of db.tours) {
    for (const l of LINGUAS) assert.ok(x.name[l], `${x.id} sem nome em ${l}`);
    assert.strictEqual(typeof x.meeting, 'object', `${x.id}: encontro sem tradução`);
    for (const l of LINGUAS) assert.ok(x.meeting[l], `${x.id} sem encontro em ${l}`);
  }
  assert.strictEqual(c.tl(db.tours[0].name), 'Altstadt zu Fuß');
});

t_('dinheiro e data seguem o idioma', () => {
  const c = ambiente('de');
  assert.match(c.eur(1234), /1\.234/);
  const cfr = ambiente('fr');
  assert.match(cfr.fmtDate('2026-12-05'), /déc/);
});

(async () => {
  for (const [n, f] of casos) { try { await f(); console.log('  ok  ' + n); } catch (e) { falhas++; console.log('  FALHA ' + n + '\n       ' + e.message); } }
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou'); process.exit(falhas ? 1 : 0);
})();
