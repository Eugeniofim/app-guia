/* O login que dizia "bem-vindo" e ficava na tela.

   go() so trocava o location.hash e confiava no evento hashchange para
   redesenhar. Mas se a pessoa JA estava naquele hash — o app instalado no
   celular reabre no ultimo endereco, #/adm/today, e mostra o login ali sem
   mudar nada — trocar o hash pelo mesmo valor nao dispara evento nenhum.
   Ela entrava, via o "bem-vindo", e o login continuava na frente.

   Reproduzido no navegador em 01/09/2026: go('/adm/today') com o hash ja
   em #/adm/today nao chamou route() nenhuma vez. */
const fs = require('fs'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/app.js'));
const src = fs.readFileSync(SERVE + '/app.js', 'utf8');
const i = src.indexOf('function go('), f = src.indexOf('function route(');
assert.ok(i > 0 && f > i, 'nao achei go() no app.js');

let falhas = 0;
const ok = (n, c, d) => { if (c) console.log('  ok   ' + n); else { falhas++; console.log('  FALHA ' + n + (d ? ' — ' + d : '')); } };

/* mundo minimo: um location falso e um route() que conta chamadas */
let rotas = 0;
global.route = () => { rotas++; };
global.location = { hash: '' };
eval(src.slice(i, f));

console.log('go(): navegar para onde ja se esta');

location.hash = '#/adm/today'; rotas = 0;
go('/adm/today');
ok('mesmo destino redesenha na hora', rotas === 1,
   'o login ficaria na tela com o "bem-vindo" em cima');
ok('mesmo destino nao mexe no hash', location.hash === '#/adm/today');

location.hash = '#/login'; rotas = 0;
go('/adm/today');
ok('destino diferente troca o hash', location.hash === '/adm/today' || location.hash === '#/adm/today');
ok('destino diferente NAO chama route na mao (o evento faz isso)', rotas === 0,
   'chamaria duas vezes: uma na mao, outra pelo hashchange');

location.hash = ''; rotas = 0;
go('/');
ok('da tela inicial para a inicial redesenha', location.hash === '/' || location.hash === '#/' || rotas === 1);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
