/* A trava de sincronia protege o que ela acabou de digitar.
   Mas nao pode prender o aparelho numa copia velha para sempre. */
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const SERVE=[__dirname+'/..', __dirname+'/../serve'].find(d=>fs.existsSync(d+'/cloud.js'));
const src=fs.readFileSync(SERVE+'/cloud.js','utf8');
const i=src.indexOf('let alteracaoPendente'), f=src.indexOf('function temAlteracaoPendente');
assert.ok(i>0 && f>i, 'nao achei a trava');
let falhas=0; const t=(n,fn)=>{try{fn();console.log('  ok  '+n)}catch(e){falhas++;console.log('  FALHA '+n+'\n       '+e.message)}};

function ctxNovo(){
  const ctx={AbortController,Date, console}; vm.createContext(ctx);
  vm.runInContext(src.slice(i,f)+'\nfunction temAlteracaoPendente(){return alteracaoPendente}',ctx);
  return ctx;
}
console.log('trava de sincronia');

t('sem alteracao: a nuvem manda', ()=>{
  const c=ctxNovo();
  assert.strictEqual(vm.runInContext('seguraNuvem()',c), false);
});

t('alteracao agorinha: segura, para nao apagar o que ela digitou', ()=>{
  const c=ctxNovo();
  vm.runInContext('alteracaoPendente=true; pendenteDesde=Date.now();',c);
  assert.strictEqual(vm.runInContext('seguraNuvem()',c), true);
});

t('alteracao presa ha 2 minutos: LIBERA — o envio nao vai acontecer', ()=>{
  const c=ctxNovo();
  vm.runInContext('alteracaoPendente=true; pendenteDesde=Date.now()-120000;',c);
  assert.strictEqual(vm.runInContext('seguraNuvem()',c), false,
    'depois de 2 minutos travada, o aparelho tem que voltar a aceitar a nuvem');
});

t('no limite de 59s ainda segura', ()=>{
  const c=ctxNovo();
  vm.runInContext('alteracaoPendente=true; pendenteDesde=Date.now()-59000;',c);
  assert.strictEqual(vm.runInContext('seguraNuvem()',c), true);
});

console.log(falhas?`\n${falhas} FALHA(S)`:'\ntudo passou');
process.exit(falhas?1:0);
