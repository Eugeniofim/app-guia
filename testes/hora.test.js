/* O guia escreve o horario como quiser ("10:00 as 18h", "09h30").
   O arquivo de calendario exige HHMMSS — quem se adapta e o codigo. */
const fs=require('fs'), assert=require('assert');
const SERVE=[__dirname+'/..', __dirname+'/../serve'].find(d=>fs.existsSync(d+'/app.js'));
const src=fs.readFileSync(SERVE+'/app.js','utf8');
const i=src.indexOf('function horaInicio'), f=src.indexOf('function icsFor');
assert.ok(i>0 && f>i, 'nao achei horaInicio no app.js');
eval(src.slice(i,f));

let falhas=0;
const t=(entrada,esperado)=>{
  try{ assert.strictEqual(horaInicio(entrada),esperado);
    console.log('  ok   '+JSON.stringify(entrada)+' -> '+esperado); }
  catch(e){ falhas++; console.log('  FALHA '+JSON.stringify(entrada)+': '+e.message); }
};
console.log('horario escrito por extenso');
t('10:00 as 18h','10:00');   t('09h','09:00');      t('09h30','09:30');
t('16:30','16:30');          t('9h','09:00');        t('14h00 - 17h00','14:00');
t('','09:00');               t(null,'09:00');        t('sem hora','09:00');
t('25:99','23:59');

/* e o arquivo gerado precisa ser valido */
const dt = '2026-12-03'.replace(/-/g,'') + 'T' + horaInicio('10:00 as 18h').replace(':','') + '00';
try{ assert.ok(/^\d{8}T\d{6}$/.test(dt), 'DTSTART invalido: '+dt);
  console.log('  ok   arquivo .ics gera DTSTART valido: '+dt); }
catch(e){ falhas++; console.log('  FALHA '+e.message); }

console.log(falhas?`\n${falhas} FALHA(S)`:'\ntudo passou');
process.exit(falhas?1:0);
