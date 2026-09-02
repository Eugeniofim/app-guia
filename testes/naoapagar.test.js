/* A trava que impede o app de publicar um catalogo vazio por cima do
   catalogo dela. Este e o teste mais importante do projeto. */
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const SERVE=[__dirname+'/..', __dirname+'/../serve'].find(d=>fs.existsSync(d+'/cloud.js'));
let falhas=0; const casos=[]; const t=(n,f)=>casos.push([n,f]);

function amb(){
  const escritas=[];
  const ctx={APP_CONFIG:{supabaseUrl:'https://teste.supabase.local',supabaseKey:'chave-de-teste'}, /* banco de mentira: o app nao tem nenhum */ console,JSON,AbortController,Date,Math,Number,Object,Array,String,Set,setTimeout,clearTimeout,
    localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}},
    fetch: async(u,o)=>{
      const s=String(u), m=(o&&o.method)||'GET';
      if(m!=='GET') escritas.push(m+' '+s.split('/').pop());
      if(s.includes('appstate')&&m==='GET') return {ok:true,json:async()=>[{data:{
        tours:[{id:'natal-fn'},{id:'natal-vinhos'}],rules:[],departures:[],blocks:[],coupons:[],settings:{}},
        updated_at:'2026-08-30T16:15:26Z'}]};
      return {ok:true,json:async()=>[]};
    }};
  ctx.window=ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE+'/store.js','utf8'),ctx);
  vm.runInContext('load(); DB.tours=[]; DB.bookings=[];',ctx);
  ctx.isLoggedIn=()=>true; ctx.authEnsure=async()=>{}; ctx.authToken=()=>'tok';
  vm.runInContext(fs.readFileSync(SERVE+'/cloud.js','utf8'),ctx);
  ctx.__escritas=escritas; return ctx;
}
const espera=(ms)=>new Promise(r=>setTimeout(r,ms));

console.log('trava contra apagar o catalogo dela');

t('aparelho vazio, nuvem nao lida: NAO publica nada', async()=>{
  const c=amb();
  vm.runInContext('cloudPushState();',c);
  await espera(900);
  assert.deepStrictEqual(JSON.stringify(c.__escritas),'[]',
    'um navegador recem-limpo nao pode publicar catalogo vazio: '+JSON.stringify(c.__escritas));
});

t('depois de ler a nuvem, os passeios chegam ao aparelho', async()=>{
  const c=amb();
  await vm.runInContext('cloudPull()',c);
  assert.strictEqual(vm.runInContext('DB.tours.length',c),2);
});

t('com passeios no aparelho, publicar volta a funcionar', async()=>{
  const c=amb();
  await vm.runInContext('cloudPull()',c);           /* agora conhece a nuvem */
  c.__escritas.length=0;
  vm.runInContext('cloudPushState();',c);
  await espera(900);
  assert.ok(c.__escritas.length>0, 'depois de sincronizar, ela tem que conseguir salvar');
});

t('a FILA tambem nao pode reenviar catalogo vazio', async()=>{
  const c=amb();
  /* simula uma fila que ficou com um envio de catalogo vazio */
  vm.runInContext(`localStorage.setItem('vi_queue_v1', JSON.stringify([
    {path:'appstate?id=eq.1', method:'PATCH', body:{data:{tours:[],rules:[],departures:[]}}}
  ]));`,c);
  await vm.runInContext('qFlush()',c);
  const enviou = c.__escritas.some(e=>e.includes('PATCH'));
  assert.strictEqual(enviou,false,'a fila reenviou catalogo vazio: '+JSON.stringify(c.__escritas));
});

t('a fila AINDA reenvia um catalogo com passeios', async()=>{
  const c=amb();
  vm.runInContext(`localStorage.setItem('vi_queue_v1', JSON.stringify([
    {path:'appstate?id=eq.1', method:'PATCH', body:{data:{tours:[{id:'natal-fn'}],rules:[]}}}
  ]));`,c);
  await vm.runInContext('qFlush()',c);
  assert.ok(c.__escritas.some(e=>e.includes('PATCH')), 'envio legitimo nao pode ser descartado');
});

(async()=>{for(const [n,f] of casos){try{await f();console.log('  ok  '+n)}catch(e){falhas++;console.log('  FALHA '+n+'\n       '+e.message)}}
console.log(falhas?`\n${falhas} FALHA(S)`:'\ntudo passou');process.exit(falhas?1:0)})();
