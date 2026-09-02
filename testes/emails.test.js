/* O cartão que mostra ao guia o e-mail que o cliente recebe.

   Ela edita a abertura e o recado final. O MIOLO é travado de propósito:
   carrega os dados da reserva, o Pix, e a frase que diz que o recibo não é
   comprovante de pagamento. Se essa frase virasse campo editável, ela poderia
   apagá-la sem perceber — e quem não pagou acharia que está tudo certo.

   Este teste garante que os campos existem, que os pedaços travados aparecem
   como texto e NÃO como campo, e que o aviso continua na tela. */
const fs = require('fs'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/app.js'));
const src = fs.readFileSync(SERVE + '/app.js', 'utf8');
const i18n = fs.readFileSync(SERVE + '/i18n.js', 'utf8');

const ini = src.indexOf('function cartaoEmail'), fim = src.indexOf('function admSettings', ini);
assert.ok(ini > 0 && fim > ini, 'nao achei cartaoEmail no app.js');

/* mundo mínimo: os textos reais do i18n e um DB.settings vazio */
const mi = i18n.indexOf('const STR'), mf = i18n.indexOf('function t(', mi);
assert.ok(mi >= 0 && mf > mi, 'nao achei o dicionario no i18n.js');
/* `const` dentro de eval nao escapa para o escopo de fora — o dicionario
   ficaria invisivel e t() devolveria a propria chave, fazendo o teste
   comparar lixo com lixo e passar sem conferir nada. */
eval(i18n.slice(mi, mf).replace('const STR', 'globalThis.STR'));
assert.ok(globalThis.STR && STR.emAviso, 'o dicionario nao carregou');
global.LANG = 'pt';
global.esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
global.t = (k) => {
  const v = (typeof STR !== 'undefined' && STR[k]) || null;
  return v ? (v.pt || v.en || k) : k;
};
global.DB = { settings: {} };
eval(src.slice(ini, fim));

let falhas = 0;
const ok = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};

console.log('cartao do e-mail do cliente');

const rec = cartaoEmail('recibo');
const cnf = cartaoEmail('conf');

/* o que ela PODE editar */
for (const id of ['reciboIntroPt', 'reciboIntroEn', 'reciboPsPt', 'reciboPsEn'])
  ok('recibo tem o campo ' + id, rec.includes('id="' + id + '"'));
for (const id of ['confIntroPt', 'confIntroEn', 'confPsPt', 'confPsEn'])
  ok('confirmacao tem o campo ' + id, cnf.includes('id="' + id + '"'));

/* o que ela NAO pode editar — tem que aparecer, e como texto */
ok('recibo mostra o aviso de "nao e pagamento"', rec.includes('emtrava'),
   'sem isso ela nao sabe que a frase existe');
/* o proprio elemento do aviso, e so ele: se um dia virar textarea/input,
   ela poderia apagar a frase sem perceber */
const soOAviso = (rec.match(/<p class="emtrava">([^]*?)<\/p>/) || [])[1] || '';
ok('o aviso existe como paragrafo de texto', soOAviso.length > 20, 'nao achei o paragrafo');
ok('o aviso NAO e um campo editavel', !/<(textarea|input)/.test(soOAviso),
   'virou campo: ela poderia apagar a frase');
ok('o aviso diz o que esta em jogo', /não sai|stays/.test(soOAviso),
   'ela precisa entender por que aquilo e travado');
ok('recibo mostra que leva o Pix', rec.includes(t('emPix')));
ok('recibo mostra que leva os dados da reserva', rec.includes(t('emDados')));
ok('confirmacao NAO promete Pix', !cnf.includes(t('emPix')),
   'a confirmacao e depois do pagamento');

/* a confirmacao nao pode carregar o aviso do recibo */
ok('confirmacao NAO leva o aviso de "nao e pagamento"', !cnf.includes('emtrava'),
   'ali o pagamento ja chegou');

/* valor que ela digitou volta escapado no campo */
DB.settings = { emailReciboIntro: { pt: '<script>x</script>"aspas"' } };
const comTexto = cartaoEmail('recibo');
ok('texto dela volta escapado para a tela',
   !comTexto.includes('<script>') && comTexto.includes('&lt;script&gt;'));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
