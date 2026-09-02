/* Regra: o que o guia apaga tem que sumir. O que ainda nao subiu tem que ficar. */
const fs=require('fs'), vm=require('vm'), assert=require('assert');
/* os fontes ficam na raiz do repositorio; no ambiente de trabalho, em serve/ */
const SERVE=[__dirname+'/..', __dirname+'/../serve'].find(d=>fs.existsSync(d+'/store.js'));
if(!SERVE){console.error('nao achei store.js');process.exit(1);}
let falhas=0; const casos=[];
/* Antes isto imprimia "ok" antes de a promessa resolver: um caso que falhava
   aparecia como aprovado e a falha vazava como excecao solta. Agora enfileira
   e cada caso e aguardado de verdade. */
const t=(nome,fn)=>casos.push([nome,fn]);
async function rodar(){
  for (const [nome,fn] of casos){
    try { await fn(); console.log('  ok  '+nome); }
    catch(e){ falhas++; console.log('  FALHA '+nome+'\n       '+e.message); }
  }
  console.log(falhas?`\n${falhas} FALHA(S)`:'\ntudo passou');
  process.exit(falhas?1:0);
}

function ambiente(bookingsLocais, respostaNuvem){
  const ctx={APP_CONFIG:{supabaseUrl:'https://teste.supabase.local',supabaseKey:'chave-de-teste'}, /* banco de mentira: o app nao tem nenhum */ console, AbortController, fetch: async(u)=>({ok:true,status:200,json:async()=>{
    if(String(u).includes('bookings?select=data')) return respostaNuvem.map(b=>({data:b}));
    if(String(u).includes('appstate')) return [{data:{tours:[{id:'x'}],rules:[],departures:[],blocks:[],coupons:[],settings:{}},updated_at:'2026-01-01'}];
    return [];
  }}), localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}},
  setTimeout, clearTimeout, Date, JSON, Math, Set, Array, Object, String, Number};
  ctx.window=ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE+'/store.js','utf8'),ctx);
  vm.runInContext('load();',ctx);
  ctx.__locais=bookingsLocais;
  vm.runInContext('DB.bookings = __locais; DB.tours = [{id:"x"}];', ctx);
  ctx.isLoggedIn=()=>true; ctx.authEnsure=async()=>{}; ctx.authToken=()=>'tok';
  ctx.fillSettings=ctx.fillSettings||(s=>s||{});
  vm.runInContext(fs.readFileSync(SERVE+'/cloud.js','utf8'),ctx);
  ctx.idsAtuais = () => vm.runInContext('DB.bookings.map(b => b.id)', ctx);
  return ctx;
}
const antiga=(id,nome)=>({id,name:nome,createdAt:'2026-01-01T00:00:00Z',payments:[]});
const agora =(id,nome)=>({id,name:nome,createdAt:new Date().toISOString(),payments:[]});

console.log('sincronia de reservas');

t('reserva apagada na nuvem some do aparelho', ()=>{
  const c=ambiente([antiga('a','Fica'),antiga('b','Apagada')],[antiga('a','Fica')]);
  return c.cloudPull().then(()=>{
    const ids=c.idsAtuais();
    assert.deepStrictEqual(ids,['a'],'esperava so [a], veio '+JSON.stringify(ids));
  });
});

t('reserva recem-criada que ainda nao subiu NAO some', ()=>{
  const c=ambiente([antiga('a','Nuvem'),agora('novo','Offline')],[antiga('a','Nuvem')]);
  return c.cloudPull().then(()=>{
    const ids=c.idsAtuais().sort();
    assert.deepStrictEqual(ids,['a','novo'],'esperava [a,novo], veio '+JSON.stringify(ids));
  });
});

/* Aparelho novo nao pode publicar catalogo nenhum: quem manda e a nuvem. */
t('aparelho novo comeca vazio e NAO empurra estado para a nuvem', async ()=>{
  const escritas=[];
  const ctx={APP_CONFIG:{supabaseUrl:'https://teste.supabase.local',supabaseKey:'chave-de-teste'}, /* banco de mentira: o app nao tem nenhum */ console, JSON,AbortController, Date, Math, Object, Array, String, Number, Set, setTimeout, clearTimeout,
    localStorage:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}},
    fetch: async(u,o)=>{ escritas.push((o&&o.method)||'GET'); return {ok:true,status:200,json:async()=>[]}; }};
  ctx.window=ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE+'/store.js','utf8'),ctx);
  vm.runInContext(fs.readFileSync(SERVE+'/cloud.js','utf8'),ctx);
  vm.runInContext('load();',ctx);
  await new Promise(r=>setTimeout(r,900));   /* passa do debounce de 700ms */
  const n = vm.runInContext('DB.tours.length',ctx);
  assert.strictEqual(n,0,'aparelho novo devia comecar com 0 passeios, veio '+n);
  const gravou = escritas.filter(m=>m==='PATCH'||m==='POST');
  assert.deepStrictEqual(gravou,[],'nao devia escrever na nuvem, mas fez: '+JSON.stringify(gravou));
});

rodar();
