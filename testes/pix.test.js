/* O codigo Pix vai para o banco de uma cliente de verdade.
   Se estiver errado, ela paga o valor errado ou nada acontece. */
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const SERVE=[__dirname+'/..', __dirname+'/../serve'].find(d=>fs.existsSync(d+'/pix.js'));
const ctx={console,String,Number,Math}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(SERVE+'/pix.js','utf8'),ctx);
const chama=(fn,arg)=>vm.runInContext(`${fn}(${JSON.stringify(arg)})`,ctx);
let falhas=0; const t=(n,f)=>{try{f();console.log('  ok  '+n)}catch(e){falhas++;console.log('  FALHA '+n+'\n       '+e.message)}};

console.log('Pix copia e cola');

t('CRC bate com o vetor oficial da norma (123456789 -> 29B1)', ()=>{
  assert.strictEqual(chama('pixCrc','123456789'),'29B1');
});

t('sem chave, nao gera codigo nenhum', ()=>{
  const c=vm.runInContext("pixCopiaECola({chave:'',nome:'X',cidade:'Y',valor:10,txid:'A'})",ctx);
  assert.strictEqual(c,null,'sem chave nao pode gerar cobranca');
});

t('acento e cortado: o padrao so aceita ASCII', ()=>{
  assert.strictEqual(chama('pixLimpa','São Paulo').slice(0,9),'SAO PAULO');
  assert.strictEqual(chama('pixLimpa','Maria Souza'),'MARIA SOUZA');
});

t('nome longo demais e cortado em 25 (limite do padrao)', ()=>{
  const r=vm.runInContext("pixLimpa('MARIA SOUZA GUIA DE TURISMO E FOTOGRAFIA',25)",ctx);
  assert.strictEqual(r.length,25);
});

t('o valor entra com 2 casas, no campo 54', ()=>{
  const c=vm.runInContext("pixCopiaECola({chave:'a@b.com',nome:'MARIA',cidade:'LISBOA',valor:1220,txid:'VI4040'})",ctx);
  assert.ok(c.includes('54071220.00'), 'campo do valor errado em: '+c);
});

t('o codigo da reserva viaja junto — e como ela sabe quem pagou', ()=>{
  const c=vm.runInContext("pixCopiaECola({chave:'a@b.com',nome:'M',cidade:'C',valor:10,txid:'VI-4040'})",ctx);
  assert.ok(c.includes('VI4040'), 'identificador da reserva sumiu');
});

t('o codigo termina com o CRC do proprio conteudo', ()=>{
  const c=vm.runInContext("pixCopiaECola({chave:'a@b.com',nome:'M',cidade:'C',valor:10,txid:'X'})",ctx);
  const semCrc=c.slice(0,-4), crc=c.slice(-4);
  assert.strictEqual(chama('pixCrc',semCrc),crc,'CRC nao confere com o conteudo');
});

t('comeca com a versao do padrao e declara moeda real (986)', ()=>{
  const c=vm.runInContext("pixCopiaECola({chave:'a@b.com',nome:'M',cidade:'C',valor:10,txid:'X'})",ctx);
  assert.ok(c.startsWith('000201'), 'nao comeca com a versao');
  assert.ok(c.includes('5303986'), 'moeda nao e real');
});

t('cada campo declara o proprio tamanho corretamente', ()=>{
  const c=vm.runInContext("pixCopiaECola({chave:'guia@exemplo.com',nome:'GUIA EXEMPLO',cidade:'LISBOA',valor:1220,txid:'VI4040'})",ctx);
  /* percorre a estrutura inteira: se algum tamanho estiver errado, quebra */
  /* o bloco final ocupa 8: '63' + '04' + os 4 digitos do CRC */
  const fim = c.length - 8;
  let i=0, campos=0;
  while (i < fim) {
    const id=c.substr(i,2), n=parseInt(c.substr(i+2,2),10);
    assert.ok(!isNaN(n), 'tamanho invalido na posicao '+i);
    i += 4+n; campos++;
    assert.ok(campos<40,'estrutura em loop');
  }
  assert.strictEqual(i, fim, 'a soma dos campos nao fecha com o tamanho do codigo');
  assert.strictEqual(c.substr(fim,4), '6304', 'o bloco do CRC nao esta no lugar');
});

t('CNPJ com pontuacao vira so digitos (e o que o banco espera)', ()=>{
  assert.strictEqual(chama('pixChaveLimpa','58.728.880/0001-05'),'58728880000105');
});
t('CPF com pontuacao tambem', ()=>{
  assert.strictEqual(chama('pixChaveLimpa','123.456.789-00'),'12345678900');
});
t('e-mail como chave fica intacto', ()=>{
  assert.strictEqual(chama('pixChaveLimpa','guia@exemplo.com'),'guia@exemplo.com');
});
t('chave aleatoria fica intacta', ()=>{
  const k='a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  assert.strictEqual(chama('pixChaveLimpa',k),k);
});
t('o CNPJ dela gera um codigo com CRC valido', ()=>{
  const c=vm.runInContext("pixCopiaECola({chave:'58.728.880/0001-05',nome:'MARIA SOUZA',cidade:'SAO PAULO',valor:1315,txid:'VI4732'})",ctx);
  assert.ok(c.includes('5872888000010'), 'CNPJ nao entrou limpo: '+c);
  assert.strictEqual(chama('pixCrc',c.slice(0,-4)), c.slice(-4));
});

t('basta a chave: nome e cidade sao opcionais', ()=>{
  vm.runInContext("DB={settings:{pixKey:'58.728.880/0001-05'}}",ctx);
  assert.strictEqual(vm.runInContext('pixDisponivel()',ctx), true, 'so a chave devia bastar');
  const c=vm.runInContext("pixCopiaECola({chave:DB.settings.pixKey,nome:pixNome(),cidade:pixCidade(),valor:1220,txid:'VI1'})",ctx);
  assert.ok(c && c.length>100, 'nao gerou o codigo');
  assert.strictEqual(chama('pixCrc',c.slice(0,-4)), c.slice(-4), 'CRC invalido');
});
t('sem chave nenhuma, continua desligado', ()=>{
  vm.runInContext("DB={settings:{}}",ctx);
  assert.strictEqual(vm.runInContext('pixDisponivel()',ctx), false);
});

console.log(falhas?`\n${falhas} FALHA(S)`:'\ntudo passou');
process.exit(falhas?1:0);
