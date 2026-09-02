/* Quanto o cartão cobra. É a conta que, errada, tira dinheiro dela ou cobra
   o cliente duas vezes.

   O valor é calculado NO SERVIDOR, a partir da reserva que está no banco.
   O navegador manda só o id. Se o valor viesse do cliente, bastava trocar
   390 por 1 no formulário para fazer o passeio por um euro — e por isso
   este teste também confere que a função não aceita valor de fora. */
const fs = require('fs'), assert = require('assert');
const F = __dirname + '/../supabase/functions/pagar/index.ts';
assert.ok(fs.existsSync(F), 'nao achei a funcao de cobranca');
const src = fs.readFileSync(F, 'utf8');

const i = src.indexOf('function centavosDevidos'), f = src.indexOf('Deno.serve');
assert.ok(i > 0 && f > i, 'nao achei centavosDevidos');
eval(src.slice(i, f).replace(/:\s*any/g, '').replace(/:\s*number/g, ''));

let falhas = 0;
const t = (nome, deu, esperado) => {
  if (deu === esperado) console.log(`  ok   ${nome} -> ${deu}`);
  else { falhas++; console.log(`  FALHA ${nome}: deu ${deu}, esperava ${esperado}`); }
};

console.log('quanto o cartao cobra (em centavos)');

/* pagamento integral */
t('390 sem nada pago', centavosDevidos({ total: 390, policy: 'full', payments: [] }), 39000);

/* sinal de 50% */
t('390 com sinal de 50%', centavosDevidos({ total: 390, policy: 'split', payments: [] }), 19500);
t('395 com sinal de 50% arredonda', centavosDevidos({ total: 395, policy: 'split', payments: [] }), 19800);

/* ja pagou parte: cobra so o resto, nao cobra de novo */
t('390, ja pagou 195', centavosDevidos({ total: 390, policy: 'full', payments: [{ amount: 195 }] }), 19500);
t('390 dividido, ja pagou o sinal',
  centavosDevidos({ total: 390, policy: 'split', payments: [{ amount: 195 }] }), 0);
t('390, ja pagou tudo', centavosDevidos({ total: 390, policy: 'full', payments: [{ amount: 390 }] }), 0);
t('pagou em duas parcelas',
  centavosDevidos({ total: 390, policy: 'full', payments: [{ amount: 100 }, { amount: 90 }] }), 20000);

/* nunca devolver valor negativo: pagou a mais nao vira credito na cobranca */
t('pagou mais que o total', centavosDevidos({ total: 390, policy: 'full', payments: [{ amount: 500 }] }), 0);

/* lixo nao pode virar cobranca torta */
t('reserva sem total', centavosDevidos({ policy: 'full', payments: [] }), 0);
t('total como texto', centavosDevidos({ total: '390', policy: 'full', payments: [] }), 39000);
t('pagamento com valor invalido',
  centavosDevidos({ total: 390, policy: 'full', payments: [{ amount: 'abc' }] }), 39000);
t('sem lista de pagamentos', centavosDevidos({ total: 390, policy: 'full' }), 39000);
t('reserva vazia', centavosDevidos({}), 0);
t('nulo', centavosDevidos(null), 0);

/* centavos: o Stripe cobra inteiro em centavos, nada de fracao */
const v = centavosDevidos({ total: 199.99, policy: 'full', payments: [] });
if (Number.isInteger(v)) console.log('  ok   valor sempre inteiro em centavos -> ' + v);
else { falhas++; console.log('  FALHA valor fracionado: ' + v); }

/* --- a função não pode aceitar valor vindo do navegador --- */
const corpoDaFuncao = src.slice(f);
const usaValorDeFora = /corpo\.(valor|amount|centavos|total)/.test(corpoDaFuncao);
if (!usaValorDeFora) console.log('  ok   o valor NAO vem do navegador');
else { falhas++; console.log('  FALHA a funcao le valor do corpo da requisicao — cliente escolheria quanto pagar'); }

/* --- e o pagamento não pode ser gravado duas vezes --- */
if (/jaTem|already|idempot/i.test(corpoDaFuncao)) console.log('  ok   grava o mesmo pagamento uma vez so');
else { falhas++; console.log('  FALHA sem protecao contra gravar o pagamento repetido'); }

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
