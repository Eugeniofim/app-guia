/* A regra que importa: o ingles escrito a mao nao pode ser destruido. */
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const SERVE=[__dirname+'/..', __dirname+'/../serve'].find(d=>fs.existsSync(d+'/traduz.js'));
let falhas=0; const casos=[]; const t=(n,f)=>casos.push([n,f]);
/* Objeto criado dentro do vm tem outro Object.prototype: deepStrictEqual
   compara prototipos e reprova mesmo quando o conteudo e igual. Comparo o
   conteudo serializado. */
const igual=(a,b,msg)=>assert.strictEqual(JSON.stringify(a),JSON.stringify(b),msg);

function ctxCom(resposta){
  const chamadas=[];
  const ctx={console,JSON,Math,Number,Object,String,Array,setTimeout,clearTimeout,AbortController,
    fetch: async(u)=>{chamadas.push(u); return resposta(u);}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE+'/traduz.js','utf8'),ctx);
  ctx.__chamadas=chamadas; return ctx;
}
const ok=(txt)=>async()=>({ok:true,json:async()=>({responseData:{translatedText:txt}})});

t('portugues igual ao da ultima vez: NAO traduz de novo', async()=>{
  const c=ctxCom(ok('NOVO INGLES RUIM'));
  const sig=vm.runInContext("trAssinatura('texto original')",c);
  const r=await vm.runInContext(`traduzCampos({desc:'texto original'}, {desc:'${sig}'})`,c);
  igual(r.textos,{},'nao devia traduzir nada');
  assert.strictEqual(c.__chamadas.length,0,'nao devia chamar a API');
});

t('portugues mudou: traduz', async()=>{
  const c=ctxCom(ok('In winter the old town'));
  const r=await vm.runInContext("traduzCampos({desc:'texto novo'}, {desc:'assinatura-velha'})",c);
  assert.strictEqual(r.textos.desc,'In winter the old town');
  assert.strictEqual(c.__chamadas.length,1);
});

t('API fora do ar: nao devolve texto, marca falha, nao apaga nada', async()=>{
  const c=ctxCom(async()=>({ok:false}));
  const r=await vm.runInContext("traduzCampos({desc:'texto novo'}, {})",c);
  igual(r.textos,{},'nao pode devolver texto');
  igual(r.falhas,['desc']);
});

t('API devolve aviso de limite: trata como falha, nao grava o aviso', async()=>{
  const c=ctxCom(ok('MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS'));
  const r=await vm.runInContext("traduzCampos({desc:'texto novo'}, {})",c);
  igual(r.textos,{},'nao pode gravar o aviso como se fosse traducao');
  igual(r.falhas,['desc']);
});

t('texto vazio nao chama a API', async()=>{
  const c=ctxCom(ok('x'));
  const r=await vm.runInContext("traduzCampos({desc:'   '}, {})",c);
  assert.strictEqual(c.__chamadas.length,0);
});

(async()=>{for(const [n,f] of casos){try{await f();console.log('  ok  '+n)}catch(e){falhas++;console.log('  FALHA '+n+'\n       '+e.message)}}
console.log(falhas?`\n${falhas} FALHA(S)`:'\ntudo passou');process.exit(falhas?1:0)})();
