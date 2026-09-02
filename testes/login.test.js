/* O login que não entra.

   Ela apertava ENTRAR no celular e a tela ficava girando. Não era senha
   errada nem servidor fora: o auth.js tinha SETE chamadas de rede e
   NENHUMA com prazo. Num celular com sinal fraco, um `fetch` sem prazo
   fica pendurado para sempre — e é por essas chamadas que ela passa para
   entrar no próprio app.

   Este teste existe para que uma chamada nova sem prazo quebre o build. */
const fs = require('fs'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/auth.js'));
const auth = fs.readFileSync(SERVE + '/auth.js', 'utf8');
const app = fs.readFileSync(SERVE + '/app.js', 'utf8');
const cloud = fs.readFileSync(SERVE + '/cloud.js', 'utf8');

let falhas = 0;
const ok = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

console.log('login: nenhuma chamada de rede sem prazo');

/* o auxiliar existe e realmente corta */
ok('auth.js tem o auxiliar com prazo', /function comPrazo/.test(auth));
ok('o auxiliar usa AbortController', /new AbortController\(\)/.test(auth));
ok('o auxiliar limpa o relogio no finally', /finally\s*\{\s*clearTimeout/.test(auth));

/* NENHUM fetch cru sobrou — este e o coracao do teste */
/* pula o auxiliar inteiro: ele usa fetch de proposito, e o `}` que fecha a
   funcao nao e o primeiro que aparece. Ancora no fim conhecido dele. */
const fimDoAuxiliar = auth.indexOf('} finally { clearTimeout(corta); }');
assert.ok(fimDoAuxiliar > 0, 'nao achei o fim do auxiliar');
const depoisDoAuxiliar = auth.slice(fimDoAuxiliar + 40);
const crus = (depoisDoAuxiliar.match(/[^a-zA-Z]fetch\(/g) || []).length;
ok('nenhum fetch cru no resto do auth.js', crus === 0,
   `sobraram ${crus} — cada um pode pendurar o login para sempre`);

/* as portas por onde ela passa para entrar */
for (const fn of ['authSignIn', 'authSignUp', 'claimOwnership', 'authRefresh'])
  ok(fn + ' passa pelo prazo',
     new RegExp(fn + '[^]*?comPrazo').test(auth) || new RegExp(fn + '[^]*?authFetch').test(auth));

/* rede fora do ar NAO pode derrubar a sessao dela */
const refresh = auth.slice(auth.indexOf('async function authRefresh'),
                           auth.indexOf('async function authEnsure'));
ok('authRefresh nao apaga a sessao quando a rede falha',
   /catch[^]*?return false/.test(refresh) &&
   refresh.indexOf('catch') < refresh.indexOf('authSave(null)'),
   'ela seria deslogada so porque o metro entrou no tunel');

/* a tela precisa avisar enquanto espera */
/* claimOwnership e chamado em DOIS lugares: ao entrar e ao criar a senha
   pelo link do e-mail. Os dois sao rede e os dois precisam avisar na tela. */
const chamadas = [];
let i = app.indexOf('await claimOwnership()');
while (i > 0) { chamadas.push(app.slice(Math.max(0, i - 400), i + 60)); i = app.indexOf('await claimOwnership()', i + 1); }
ok('claimOwnership e chamado em 2 lugares', chamadas.length === 2, `achei ${chamadas.length}`);
chamadas.forEach((c, n) => ok(
  `chamada ${n + 1} avisa na tela enquanto espera`,
  /busy\(true\)|disabled\s*=\s*true|textContent\s*=\s*t\('npWait'\)|go2\.disabled/.test(c),
  'a tela ficaria parada durante uma chamada de rede'));

/* a espera pela nuvem tem que ter teto */
ok('a busca da nuvem no login tem teto de tempo',
   /Promise\.race\(\[[^]*?cloudPull\(\)[^]*?setTimeout/.test(app),
   'era o login de um minuto');

/* e o cloud.js nao pode regredir */
ok('cloud.js continua com prazo', /AbortController/.test(cloud));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
