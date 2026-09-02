/* Reserva lancada na mao pelo guia: nao pode inventar dinheiro nem vaga. */
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const SERVE=[__dirname+'/..', __dirname+'/../serve'].find(d=>fs.existsSync(d+'/store.js'));
let falhas=0; const casos=[]; const t=(n,f)=>casos.push([n,f]);

function amb(){
  const ctx={console,JSON,AbortController,Date,Math,Number,Object,Array,String,Set,
    localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}}};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(SERVE+'/store.js','utf8'),ctx);
  vm.runInContext(`load();
    DB.tours=[{id:'fn',priceMode:'person',price:195,priceLate:225,earlySeats:3,max:7,min:3,name:{pt:'FN'}}];
    DB.bookings=[];`,ctx);
  return ctx;
}
const cria=(c,o)=>vm.runInContext(`__b = Bookings.criarManual(${JSON.stringify(o)}); JSON.stringify({total:__b.total,pago:Bookings.paid(__b),due:Bookings.due(__b),origem:__b.origin,metodo:(__b.payments[0]||{}).method,tipo:(__b.payments[0]||{}).kind})`,c);
const base={tourId:'fn',date:'2026-12-05',time:'09:00',name:'Maria',pax:2};

console.log('lancamento manual');
t('pagou tudo: fica quitada', ()=>{
  const c=amb(); const r=JSON.parse(cria(c,{...base,total:390,recebido:390,metodo:'pix'}));
  assert.strictEqual(r.total,390); assert.strictEqual(r.pago,390);
  assert.strictEqual(r.due,0); assert.strictEqual(r.metodo,'pix'); assert.strictEqual(r.tipo,'full');
});
t('pagou metade: fica com saldo', ()=>{
  const c=amb(); const r=JSON.parse(cria(c,{...base,total:390,recebido:195,metodo:'transfer'}));
  assert.strictEqual(r.pago,195); assert.strictEqual(r.due,195); assert.strictEqual(r.tipo,'deposit');
});
t('nao recebeu nada: nenhum pagamento inventado', ()=>{
  const c=amb(); const r=JSON.parse(cria(c,{...base,total:390,recebido:0}));
  assert.strictEqual(r.pago,0); assert.strictEqual(r.due,390);
});
t('recebido MAIOR que o total: trava no total, nao cria dinheiro', ()=>{
  const c=amb(); const r=JSON.parse(cria(c,{...base,total:390,recebido:99999,metodo:'cash'}));
  assert.strictEqual(r.pago,390,'nao pode registrar mais do que o total');
});
t('recebido negativo: vira zero', ()=>{
  const c=amb(); const r=JSON.parse(cria(c,{...base,total:390,recebido:-500}));
  assert.strictEqual(r.pago,0);
});
t('a reserva conta na lotacao da saida', ()=>{
  const c=amb();
  cria(c,{...base,pax:5,total:975,recebido:0});
  const livres=vm.runInContext("Cal.seatsLeft('fn','2026-12-05','09:00',7)",c);
  assert.strictEqual(livres,2,'7 lugares menos 5 = 2, veio '+livres);
});
t('marcada como manual, para diferenciar de reserva do site', ()=>{
  const c=amb(); const r=JSON.parse(cria(c,{...base,total:390,recebido:0}));
  assert.strictEqual(r.origem,'manual');
});

(async()=>{for(const [n,f] of casos){try{await f();console.log('  ok  '+n)}catch(e){falhas++;console.log('  FALHA '+n+'\n       '+e.message)}}
console.log(falhas?`\n${falhas} FALHA(S)`:'\ntudo passou');process.exit(falhas?1:0)})();
