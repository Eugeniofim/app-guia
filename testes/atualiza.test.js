/* Como a versão nova chega no celular dela.

   No laptop a pessoa recarrega a página o tempo todo. No celular o app fica
   congelado na memória por dias e nunca recarrega — foi assim que uma
   correção podia levar um dia inteiro para chegar nela.

   Três linhas fazem isso funcionar, e as três parecem detalhe de quem lê
   depois. Este teste existe para que apagar qualquer uma delas quebre o
   build em vez de quebrar em silêncio no celular dela. */
const fs = require('fs'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/index.html'));
const html = fs.readFileSync(SERVE + '/index.html', 'utf8');
const sw = fs.readFileSync(SERVE + '/sw.js', 'utf8');

let falhas = 0;
const ok = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

console.log('atualizacao no celular');

/* 1 — a causa raiz */
ok("registro usa updateViaCache:'none'",
  /register\(\s*'\.\/sw\.js'\s*,\s*\{[^}]*updateViaCache\s*:\s*'none'/.test(html),
  'sem isto o navegador serve o sw.js velho por ate 24h e nada atualiza');

/* 2 — conferir ao voltar pro app, nao so de hora em hora */
ok('confere quando ela volta pro app', /visibilitychange/.test(html),
  'no celular o timer pode nao rodar em segundo plano');
ok('tem trava de rajada no visibilitychange', /ultima|throttle|60000/.test(html),
  'o iOS dispara varias vezes seguidas');

/* 3 — nao arrancar a pagina de baixo dela */
/* ancora no evento de verdade, nao na palavra dentro de um comentario */
const inicio = html.indexOf("addEventListener('controllerchange'");
assert.ok(inicio > 0, 'nao achei o listener de controllerchange');
const trecho = html.slice(inicio, inicio + 700);
ok('so recarrega sozinho se ela NAO estiver ocupada', /isBusyEditing/.test(trecho),
  'recarregaria no meio de uma reserva sendo digitada');
ok('quando ocupada, mostra a barra em vez de recarregar', /novaBar/.test(trecho));

/* 4 — primeira visita NAO e atualizacao.
   O controllerchange dispara tambem quando o SW assume pela primeira vez.
   Sem esta trava, todo cliente novo via "tem uma versao nova" de cara.
   Aconteceu de verdade em 01/09/2026, testando no navegador. */
ok('primeira visita nao dispara a barra nem recarrega',
  /jaTinhaControlador|serviceWorker\.controller/.test(html) &&
  /if\s*\(\s*!\s*jaTinhaControlador\s*\)\s*return/.test(html),
  'cliente novo veria "tem versao nova" na primeira olhada');

/* a barra tem que existir de verdade, e comecar escondida */
ok('a barra existe no HTML', /id="novaBar"/.test(html));
ok('a barra comeca escondida', /\.novabar\{[^}]*display:none/.test(html),
  'apareceria para todo mundo o tempo todo');
ok('a barra fica por cima de tudo', /\.novabar\{[^}]*position:fixed/.test(html),
  'escondida no meio da pagina ela nunca veria');
ok('a barra tem botao de atualizar', /id="btNova"/.test(html));
ok('a barra pode ser dispensada', /id="btNovaX"/.test(html));

/* o texto e para ela, nao para programador */
ok('a barra diz que os dados ficam', /dados ficam/.test(html),
  'ela precisa saber que atualizar nao perde reserva');

/* o service worker tem que continuar buscando o app pela rede */
ok("sw busca o app com cache:'reload'", /cache:\s*'reload'/.test(sw),
  'senao a hospedagem serve arquivo velho mesmo com SW novo');

/* e a versao do cache precisa mudar a cada deploy, senao o SW fica
   identico byte a byte e o navegador nao ve nada de novo */
const versaoSw = (sw.match(/VERSION\s*=\s*'([^']+)'/) || [])[1] || '';
const versaoHtml = (html.match(/app\.js\?v=([0-9.]+)/) || [])[1] || '';
ok('sw.js e index.html na mesma versao (' + versaoSw + ' / ' + versaoHtml + ')',
  versaoSw.includes(versaoHtml) && !!versaoHtml,
  'publicar um sem o outro deixa metade do app velha');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
