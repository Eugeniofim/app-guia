/* Regra do guia: 195 para as 3 primeiras de cada data, 225 depois.
   Quando as 3 acabam, o app NAO pode mais anunciar 195. */
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const SERVE=[__dirname+'/..', __dirname+'/../serve'].find(d=>fs.existsSync(d+'/store.js'));
let falhas=0; const casos=[];
const t=(n,f)=>casos.push([n,f]);

function ambiente(vendidos){
  const ctx={console,JSON,AbortController,Date,Math,Number,Object,Array,String,Set,
    localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}}};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(SERVE+'/store.js','utf8'),ctx);
  vm.runInContext('load();',ctx);
  const tour={id:'fn',priceMode:'person',price:195,priceLate:225,earlySeats:3,max:7,min:3};
  ctx.__tour=tour; ctx.__vendidos=vendidos;
  vm.runInContext(`DB.tours=[__tour]; DB.bookings=[];
    for (let i=0;i<__vendidos;i++) DB.bookings.push({id:'b'+i,tourId:'fn',date:'2026-12-05',time:'09:00',pax:1,seatCounts:1,payments:[],name:'x'+i});`,ctx);
  return ctx;
}
const restantes=(c)=>vm.runInContext("Bookings.precoDe(__tour,'fn','2026-12-05','09:00',1).baratasRestantes",c);
const total=(c,pax)=>vm.runInContext(`Bookings.precoDe(__tour,'fn','2026-12-05','09:00',${pax}).total`,c);

console.log('preco escalonado');
t('ninguem reservou: 3 vagas baratas, 1 pessoa paga 195', ()=>{
  const c=ambiente(0);
  assert.strictEqual(restantes(c),3);
  assert.strictEqual(total(c,1),195);
});
t('2 vendidos: sobra 1 barata; 2 pessoas pagam 195+225=420', ()=>{
  const c=ambiente(2);
  assert.strictEqual(restantes(c),1);
  assert.strictEqual(total(c,2),420);
});
t('3 vendidos: acabou a promo, 1 pessoa paga 225', ()=>{
  const c=ambiente(3);
  assert.strictEqual(restantes(c),0,'nao deveria sobrar vaga barata');
  assert.strictEqual(total(c,1),225,'deveria cobrar o valor cheio');
});
t('5 vendidos: continua 225, nao fica negativo', ()=>{
  const c=ambiente(5);
  assert.strictEqual(restantes(c),0);
  assert.strictEqual(total(c,2),450);
});

(async()=>{for(const [n,f] of casos){try{await f();console.log('  ok  '+n)}catch(e){falhas++;console.log('  FALHA '+n+'\n       '+e.message)}}
console.log(falhas?`\n${falhas} FALHA(S)`:'\ntudo passou');process.exit(falhas?1:0)})();
