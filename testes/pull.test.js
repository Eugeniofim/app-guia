/* Passeios sao publicos, reservas sao privadas.
   Se a sessao expira, o painel NAO pode ficar sem passeios. */
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const SERVE=[__dirname+'/..', __dirname+'/../serve'].find(d=>fs.existsSync(d+'/cloud.js'));
let falhas=0; const casos=[]; const t=(n,f)=>casos.push([n,f]);

function amb({reservasFalham=false, logada=true}={}){
  const ctx={APP_CONFIG:{supabaseUrl:'https://teste.supabase.local',supabaseKey:'chave-de-teste'}, /* banco de mentira: o app nao tem nenhum */ console,JSON,AbortController,Date,Math,Number,Object,Array,String,Set,setTimeout,clearTimeout,
    localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}},
    fetch: async(u)=>{
      const s=String(u);
      if(s.includes('appstate')) return {ok:true,json:async()=>[{data:{
        tours:[{id:'natal-fn'},{id:'natal-vinhos'}],rules:[],departures:[{tourId:'natal-fn',date:'2026-12-05'}],
        blocks:[],coupons:[],settings:{}},updated_at:'2026-08-30T00:00:00Z'}]};
      if(s.includes('bookings')) return reservasFalham ? {ok:false,status:401} : {ok:true,json:async()=>[]};
      return {ok:true,json:async()=>[]};
    }};
  ctx.window=ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE+'/store.js','utf8'),ctx);
  vm.runInContext('load(); DB.tours=[]; DB.bookings=[{id:"local1",name:"Ja no aparelho",naNuvem:false,createdAt:new Date().toISOString()}];',ctx);
  ctx.isLoggedIn=()=>logada; ctx.authEnsure=async()=>{}; ctx.authToken=()=>'tok';
  ctx.onCloudRejected=()=>{ctx.__avisou=true};
  vm.runInContext(fs.readFileSync(SERVE+'/cloud.js','utf8'),ctx);
  return ctx;
}
const passeios=(c)=>vm.runInContext('DB.tours.map(t=>t.id)',c);
const reservas=(c)=>vm.runInContext('DB.bookings.length',c);

console.log('carga da nuvem');

t('tudo ok: passeios e datas chegam', async()=>{
  const c=amb(); await vm.runInContext('cloudPull()',c);
  assert.strictEqual(JSON.stringify(passeios(c)),'["natal-fn","natal-vinhos"]');
});

t('sessao expirada: os passeios AINDA chegam', async()=>{
  const c=amb({reservasFalham:true}); await vm.runInContext('cloudPull()',c);
  assert.strictEqual(JSON.stringify(passeios(c)),'["natal-fn","natal-vinhos"]',
    'painel nao pode ficar sem passeios so porque as reservas falharam');
});

t('sessao expirada: as reservas do aparelho nao sao apagadas', async()=>{
  const c=amb({reservasFalham:true}); await vm.runInContext('cloudPull()',c);
  assert.strictEqual(reservas(c),1,'apagar por erro de rede seria pior');
});

t('sessao expirada: ela e avisada', async()=>{
  const c=amb({reservasFalham:true}); await vm.runInContext('cloudPull()',c);
  assert.strictEqual(c.__avisou,true,'o aviso vermelho tem que aparecer');
});

(async()=>{for(const [n,f] of casos){try{await f();console.log('  ok  '+n)}catch(e){falhas++;console.log('  FALHA '+n+'\n       '+e.message)}}
console.log(falhas?`\n${falhas} FALHA(S)`:'\ntudo passou');process.exit(falhas?1:0)})();
