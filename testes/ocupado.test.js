/* O cliente escolhe a data e a tela se redesenha sozinha, apagando a escolha.

   Aconteceu de verdade em 01/09/2026, no app no ar: bastava clicar "05/12" e
   esperar um segundo. A sincronia da nuvem e a cotacao do euro chamam route()
   quando terminam — as duas chegam nos primeiros segundos da pagina, ou seja,
   exatamente enquanto a pessoa esta escolhendo. O guarda isBusyEditing()
   exigia step > 1, mas data e horario sao escolhidos no passo 1.

   Perder a escolha do cliente no meio da reserva e perder a venda. */
const fs = require('fs'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/app.js'));
const src = fs.readFileSync(SERVE + '/app.js', 'utf8');
const i = src.indexOf('function isBusyEditing'), f = src.indexOf('addEventListener(\'hashchange\'', i);
assert.ok(i > 0 && f > i, 'nao achei isBusyEditing no app.js');

let falhas = 0;
const t = (nome, condicao, detalhe) => {
  if (condicao) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (detalhe ? ' — ' + detalhe : '')); }
};

/* monta o mundo minimo que a funcao enxerga */
function monta({ hash, estado, coach = false, focado = null }) {
  global.location = { hash };
  global.viewTour = { _s: estado };
  global.document = {
    querySelector: (sel) => (sel === '.coach' && coach) ? {} : null,
    activeElement: focado ? { tagName: focado } : null,
  };
  eval(src.slice(i, f));
  return isBusyEditing();
}

console.log('isBusyEditing — nao apagar a escolha do cliente');

/* o caso que quebrou */
t('data escolhida no passo 1 conta como ocupado',
  monta({ hash: '#/tour/natal-fn', estado: { step: 1, date: '2026-12-05', time: null } }),
  'route() em segundo plano apagaria a data');

t('horario escolhido no passo 1 conta como ocupado',
  monta({ hash: '#/tour/natal-fn', estado: { step: 1, date: '2026-12-05', time: '09h' } }));

/* o que ja funcionava tem que continuar funcionando */
t('passo 2 em diante continua ocupado',
  monta({ hash: '#/tour/natal-fn', estado: { step: 3, date: null, time: null } }));

t('tutorial aberto conta como ocupado',
  monta({ hash: '#/', estado: null, coach: true }));

t('digitando num campo conta como ocupado',
  monta({ hash: '#/tours', estado: null, focado: 'INPUT' }));

t('editando passeio no ADM conta como ocupado',
  monta({ hash: '#/adm/tours/natal-fn', estado: null }));

/* e o que NAO pode travar a atualizacao */
t('passeio aberto sem escolher nada NAO trava',
  monta({ hash: '#/tour/natal-fn', estado: { step: 1, date: null, time: null } }) === false,
  'travaria a sincronia a toa');

t('lista de passeios NAO trava',
  monta({ hash: '#/tours', estado: null }) === false);

t('tela inicial NAO trava',
  monta({ hash: '#/', estado: null }) === false);

t('sem estado de reserva NAO trava',
  monta({ hash: '#/tour/natal-fn', estado: null }) === false);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
