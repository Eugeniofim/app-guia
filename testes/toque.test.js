/* Dedo não é seta. No celular os alvos estavam entre 18 e 38 pixels e ela
   tocava sem o app responder. 44px é a regra da Apple e do Google.
   Este teste quebra o build se o bloco de toque sumir ou perder alvos. */
const fs = require('fs');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/index.html'));
const html = fs.readFileSync(SERVE + '/index.html', 'utf8');
let falhas = 0;
const ok = (n, c, d) => { if (c) console.log('  ok   ' + n); else { falhas++; console.log('  FALHA ' + n + (d ? ' — ' + d : '')); } };
console.log('alvos de toque no celular');
const i = html.indexOf('@media (pointer: coarse)');
ok('existe o bloco para quem usa o dedo', i > 0);
const bloco = html.slice(i, html.indexOf('}\n}', i) + 3);
ok('minimo de 44px', /min-height:\s*44px/.test(bloco));
for (const cls of ['.langs button', '.chip', '.cta', '.mini', '.coach-next', '.coach-skip', '.linkmap', '.novax', '.adm-entry'])
  ok('cobre ' + cls, bloco.includes(cls), 'esse alvo volta a ficar pequeno');
ok('campos com 16px (senao o iOS da zoom sozinho)', /font-size:\s*16px/.test(bloco));
ok('espaco entre alvos vizinhos', /gap:\s*\d+px/.test(bloco));
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
