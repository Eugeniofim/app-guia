/* A copia nao conhece o banco nem a identidade da dona do app original.

   Este repositorio nasceu de uma copia do app de uma guia de verdade. Se um endereco de banco,
   uma chave ou o dominio dela sobrevivesse aqui, o app de um guia novo
   leria e escreveria as RESERVAS DELA. Por isso este teste varre o
   repositorio inteiro (codigo, imagens, tudo) e falha se achar qualquer
   identificador dela — ou qualquer banco gravado no codigo, de quem for:
   o banco de cada cliente entra so por config.js.

   Os identificadores dela ficam guardados ao contrario, senao este proprio
   arquivo seria a copia conhecendo o banco dela. Nome, marca, cidade e
   regiao dela tambem sao proibidos: o produto e de cada guia, nao dela. */
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
const inv = s => s.split('').reverse().join('');

/* dela — proibidos em TODO arquivo, inclusive config.js e este teste.
   Comparados em minusculas, no texto em UTF-8. */
const DELA = [
  ['nome dela', inv('assilem')],
  ['sobrenome dela', inv('siallah')],
  ['marca dela', inv('segayov')],
  ['cidade dela', inv('ramloc')],
  ['regiao dela', inv('ecasla')],
  ['regiao dela (pt)', inv('aicásla')],
  ['regiao dela (2)', inv('tserof kcalb')],
  ['regiao dela (2, pt)', inv('argen atserolf')],
  ['cidade dela (2)', inv('gruobsarts')],
  ['cidade dela (2, pt)', inv('ogrubsartse')],
  ['telefone dela', inv('02115028633')],
  ['projeto Supabase dela', inv('nyzkizawecjtwodzhpqk')],
  ['chave publica do banco dela', inv('iRqdateC_ABV6pnt9jEul9n7jKHM2Ho_elbahsilbup_bs')],
  ['conta Stripe dela', inv('rTFTkaCcKHoZBAU1_tcca')],
  ['dominio dela', inv('siallahassilem')],
];

/* de qualquer um — proibidos no codigo; so config.js pode ter (e o
   template deixa vazio) */
const GERAIS = [
  ['URL de projeto Supabase', /[a-z]{20}\.supabase\.co/],
  ['chave publicavel do Supabase', /sb_publishable_[A-Za-z0-9_-]+/],
  ['chave secreta do Supabase', /sb_secret_[A-Za-z0-9_-]+/],
  ['JWT do Supabase', new RegExp(inv('iOicGbhJye'))],  /* ao contrario, pelo mesmo motivo */
  ['chave do Stripe', /\b[sr]k_(?:live|test)_[A-Za-z0-9]+/],
  ['id de conta Stripe', /\bacct_[A-Za-z0-9]{16}/],
  ['chave do Resend', /\bre_[A-Za-z0-9]{8,}/],
];

const PULA = new Set(['.git', 'node_modules', '.DS_Store']);
function* arquivos(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (PULA.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* arquivos(p); else yield p;
  }
}

let falhas = 0, vistos = 0;
const ok = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

console.log('a copia nao conhece o banco nem a identidade dela');
for (const arq of arquivos(RAIZ)) {
  vistos++;
  const rel = path.relative(RAIZ, arq);
  /* latin1: cada byte vira um caractere, entao imagens e zips tambem sao lidos */
  const buf = fs.readFileSync(arq);
  const txt = buf.toString('latin1'), utf = buf.toString('utf8').toLowerCase();
  for (const [nome, s] of DELA)
    if (txt.includes(s) || utf.includes(s.toLowerCase())) ok(nome + ' em ' + rel, false, 'apague: e dela');
  if (rel === 'config.js') continue;
  for (const [nome, re] of GERAIS)
    if (re.test(txt)) ok(nome + ' em ' + rel, false, 'banco gravado no codigo; vai em config.js');
}
ok('varreu o repositorio inteiro (' + vistos + ' arquivos)', vistos > 40);

/* e o caminho certo tem que existir: config.js antes de tudo, cloud.js lendo dele */
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const cloud = fs.readFileSync(path.join(RAIZ, 'cloud.js'), 'utf8');
const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
const iCfg = html.indexOf('config.js?v='), iCloud = html.indexOf('cloud.js?v=');
ok('index.html carrega config.js antes de cloud.js', iCfg > 0 && iCfg < iCloud);
ok('cloud.js le o banco de APP_CONFIG', /SUPA_URL\s*=\s*\(typeof APP_CONFIG/.test(cloud));
ok('sem nuvem configurada nada vai para a rede', /if \(!SUPA_URL\) return Promise\.reject/.test(cloud));
ok('sw.js guarda config.js no cache', /'\.\/config\.js'/.test(sw));
const store = fs.readFileSync(path.join(RAIZ, 'store.js'), 'utf8');
ok('aparelho novo: com nuvem nasce VAZIO, sem nuvem nasce com os exemplos',
  /temNuvem\(\) \? _blank\(\) : _seed\(\)/.test(store),
  'com nuvem seria o bug antigo (demo por cima dos passeios reais); sem nuvem o prospect abriria um app vazio');
ok('temNuvem() responde pelo config.js, nao por um banco escrito no codigo',
  /function temNuvem\(\)[^\n]*APP_CONFIG\.supabaseUrl/.test(store));
ok('config.js do template esta vazio',
  /supabaseUrl:\s*''/.test(fs.readFileSync(path.join(RAIZ, 'config.js'), 'utf8')));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
