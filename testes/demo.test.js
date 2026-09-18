/* O painel na DEMONSTRACAO — a tela que decide a venda.

   O prospect abre o link, entra no painel e se ve dono do negocio. Se ali
   aparecer um aviso vermelho dizendo que "qualquer pessoa entra no seu
   painel", ou um convite para criar senha que leva a uma tela de login sem
   banco atras, ele fecha e acha que o app esta quebrado.

   Aconteceu de verdade em 02/09/2026, testando o link no ar. Este teste
   existe para que isso quebre o build em vez de quebrar a prospeccao. */
const fs = require('fs'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/index.html'));
const app = fs.readFileSync(SERVE + '/app.js', 'utf8');
const store = fs.readFileSync(SERVE + '/store.js', 'utf8');
const i18n = fs.readFileSync(SERVE + '/i18n.js', 'utf8');
const html = fs.readFileSync(SERVE + '/index.html', 'utf8');

let falhas = 0;
const ok = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

console.log('o painel na demonstracao');

/* --- quem responde se existe nuvem --- */
ok('temNuvem() existe e le o config.js',
  /function temNuvem\(\)[^\n]*APP_CONFIG\.supabaseUrl/.test(store),
  'sem essa pergunta num lugar so, cada tela adivinha por conta propria');

/* --- 1. o convite para criar senha NAO pode aparecer na demonstracao --- */
const iAsk = app.indexOf('admToday._asked');
assert.ok(iAsk > 0, 'nao achei o convite de criar senha');
const guarda = app.slice(app.lastIndexOf('if (', iAsk), iAsk);
ok('o convite de criar senha so aparece se houver nuvem',
  /temNuvem\(\)/.test(guarda),
  'na demonstracao ele leva a um login sem banco: o prospect acha que quebrou');

/* --- 2. a faixa do painel fala com o prospect, nao o assusta --- */
const iBan = app.indexOf('function noAuthBanner()');
assert.ok(iBan > 0, 'nao achei noAuthBanner');
const banner = app.slice(iBan, iBan + 900);
ok('na demonstracao a faixa e a de boas-vindas', /!temNuvem\(\)/.test(banner));
ok('a faixa da demonstracao vem ANTES do aviso vermelho',
  banner.indexOf('!temNuvem()') < banner.indexOf("t('nlTitle')"),
  'se o vermelho vier primeiro, o prospect ve o alarme');
const demoBloco = banner.slice(banner.indexOf('!temNuvem()'), banner.indexOf('if (typeof isLoggedIn'));
ok('a faixa da demonstracao NAO usa o vermelho de alarme',
  !/alert[^"'`]*\bbad\b/.test(demoBloco),
  'vermelho diz "algo esta errado" para quem nunca viu o app');
ok('a faixa da demonstracao nao oferece criar senha',
  !/goProtect/.test(demoBloco),
  'o botao levaria a uma tela de login sem banco');
ok('o verde da faixa existe no CSS', /\.alert\.demo\{/.test(html));

/* --- 3. os textos existem nos dois idiomas e dizem a verdade --- */
for (const k of ['demoTit', 'demoTxt', 'demoTxt2']) {
  const m = i18n.match(new RegExp(k + ':\\s*\\{([^}]*)\\}'));
  ok('texto ' + k + ' existe em PT e EN', !!m && /pt:/.test(m[1]) && /en:/.test(m[1]));
}
ok('o texto promete que nada sai do aparelho',
  /nada sai deste aparelho/.test(i18n) && /nothing leaves this device/.test(i18n),
  'e a unica coisa que faz o prospect mexer sem medo');

/* --- 4. e o app tem mesmo que abrir com passeios para o prospect ver --- */
ok('sem nuvem o aparelho novo nasce com os passeios de exemplo',
  /temNuvem\(\) \? _blank\(\) : _seed\(\)/.test(store),
  'um prospect abriria um painel vazio, sem nada para mexer');

/* --- 5. nenhuma traducao em ingles pode ter sobrado em portugues.
       Ao tirar a identidade da dona original, a troca varreu o arquivo inteiro
       e acertou tambem dentro de frases em ingles. Uma passou, e so vi por
       acaso. Agora e o teste que ve. --- */
/* As chaves terminadas em Pad/PadEn sao o texto-exemplo dos campos do painel:
   o campo em portugues mostra o exemplo em portugues mesmo com o painel em
   ingles, entao pt e en sao iguais DE PROPOSITO. Nao sao traducao. */
const semPad = i18n.replace(/\w+Pad(?:En)?:\s*\{[^}]*\}/g, '');
const ingles = semPad.match(/en:\s*'[^']*'/g) || [];
const suspeitas = ingles.filter(s =>
  /\b(o guia|a guia|voce|você|passeio|reserva|obrigad|quando o|para o cliente|está garantida)\b/i.test(s)
  /* a assinatura e so marcadores ({guia} · {negocio} · {base}): igual nos dois idiomas de proposito */
  && s.replace(/\{\w+\}/g, '').replace(/[^A-Za-zÀ-ÿ]/g, '').length > 0);
ok('nenhuma frase em ingles ficou com palavra em portugues (' + ingles.length + ' conferidas)',
  suspeitas.length === 0, suspeitas.slice(0, 3).join(' | '));


/* --- a faixa do rodape nao pode tapar as abas do painel no celular ---
   Aconteceu em 18/09/2026: no celular o painel so mostrava "Hoje", porque a
   faixa (proposta / demonstracao) ficava por cima da barra de abas. */
{
  const appTxt = fs.readFileSync(SERVE + '/app.js', 'utf8');
  ok('o roteador marca quando esta no painel', /classList\.toggle\('em-adm', p\[0\] === 'adm'\)/.test(appTxt));
  ok('no painel a faixa sobe para cima da barra de abas',
    /function faixaAcimaDaBarra/.test(appTxt) && /rail\.offsetHeight \+ 'px'/.test(appTxt));
}

/* --- o primeiro desenho da tela vem DEPOIS de tudo que ele usa ---
   Estava no meio do arquivo: abrir direto na aba Clientes dava tela branca
   ("Cannot access 'ICO' before initialization"). 18/09/2026. */
{
  const appTxt = fs.readFileSync(SERVE + '/app.js', 'utf8');
  const fim = appTxt.trimEnd().endsWith('route();');
  const declaracoes = [...appTxt.matchAll(/^(const|let) [A-Za-z_$]+/gm)].map(m => m.index);
  const ultimaDecl = Math.max(...declaracoes);
  const ultimoRoute = appTxt.lastIndexOf('\nroute();');
  ok('o app termina desenhando a tela (route() no fim do arquivo)', fim);
  ok('nenhum const/let de nivel de arquivo vem depois do primeiro desenho', ultimaDecl < ultimoRoute);
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
