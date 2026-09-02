/* O contador frances recebe so o que caiu na conta europeia.
   Pix e Brasil e nao pode vazar para esse relatorio. */
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const SERVE=[__dirname+'/..', __dirname+'/../serve'].find(d=>fs.existsSync(d+'/app.js'));
let falhas=0; const casos=[]; const t=(n,f)=>casos.push([n,f]);

/* destinoPgto e uma funcao pura no app.js; extraio so ela para testar sem DOM */
const src=fs.readFileSync(SERVE+'/app.js','utf8');
const ini=src.indexOf('const PGTO_BRASIL');
const fim=src.indexOf('function admMoney()');
assert.ok(ini>0 && fim>ini, 'nao achei destinoPgto no app.js');
const ctx={AbortController,console}; vm.createContext(ctx); vm.runInContext(src.slice(ini,fim),ctx);
const dest=(m)=>vm.runInContext(`destinoPgto(${JSON.stringify(m)})`,ctx);

console.log('extrato: para onde vai cada pagamento');
t('pix -> Brasil (nao vai pro contador)', ()=>assert.strictEqual(dest('pix'),'brasil'));
t('PIX maiusculo tambem -> Brasil', ()=>assert.strictEqual(dest('PIX'),'brasil'));
t('dinheiro -> conta europeia', ()=>assert.strictEqual(dest('cash'),'europa'));
t('transferencia -> conta europeia', ()=>assert.strictEqual(dest('transfer'),'europa'));
t('cartao -> conta europeia', ()=>assert.strictEqual(dest('card'),'europa'));
t('apple pay -> conta europeia', ()=>assert.strictEqual(dest('applepay'),'europa'));
t('outro -> conta europeia', ()=>assert.strictEqual(dest('other'),'europa'));
t('metodo vazio nao vira Brasil por acidente', ()=>{
  assert.strictEqual(dest(''),'europa');
  assert.strictEqual(dest(null),'europa');
  assert.strictEqual(dest(undefined),'europa');
});

(async()=>{for(const [n,f] of casos){try{await f();console.log('  ok  '+n)}catch(e){falhas++;console.log('  FALHA '+n+'\n       '+e.message)}}
console.log(falhas?`\n${falhas} FALHA(S)`:'\ntudo passou');process.exit(falhas?1:0)})();
