/* O PROTOTIPO DE PROSPECT — o link que abre com o nome da pessoa dentro.

   Tres coisas nao podem quebrar aqui, e nenhuma delas aparece na tela:

   1. A faixa de PROPOSTA. O prototipo carrega o nome e o negocio de uma
      pessoa de verdade, com precos que nos inventamos e um botao de
      reservar, num link publico. Sem a faixa, quem cai nele sem contexto
      acha que e o site oficial dela.
   2. Voltar ao link NAO pode apagar o que a pessoa mexeu. Ela abre, cria um
      passeio, fecha, volta no dia seguinte para mostrar ao marido — e o
      trabalho dela tem que estar la.
   3. O ?g= vira nome de arquivo. Sem validar, um ?g=../../algo viraria
      busca em outro caminho do site.

   Este teste RODA o codigo, nao le o texto dele. */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SERVE = [__dirname + '/..', __dirname + '/../serve'].find(d => fs.existsSync(d + '/index.html'));

let falhas = 0;
const ok = (nome, cond, det) => {
  if (cond) console.log('  ok   ' + nome);
  else { falhas++; console.log('  FALHA ' + nome + (det ? ' — ' + det : '')); }
};
const espera = () => new Promise(r => setImmediate(r));
/* store.js declara DB com "let": dentro da vm existe, mas nao vira propriedade
   do contexto. Entao a leitura tem que acontecer LA DENTRO. */
const val = (ctx, expr) => vm.runInContext(expr, ctx);

/* Monta um navegador de mentira: so o que o prospecto.js encosta. */
function monta(busca, jsonDoArquivo, guardado) {
  const apensos = [];
  const ctx = {
    console, JSON, Date, Math, Object, Array, String, Number, Set, RegExp,
    URLSearchParams, setTimeout, clearTimeout, setInterval, Promise,
    APP_CONFIG: { supabaseUrl: '', supabaseKey: '', guia: { nome: 'Seu Nome', negocio: 'Seus Passeios', cidade: 'Cidade, Pais' } },
    location: { search: busca },
    localStorage: {
      _d: Object.assign({}, guardado || {}),
      getItem(k) { return this._d[k] ?? null; },
      setItem(k, v) { this._d[k] = String(v); },
      removeItem(k) { delete this._d[k]; },
    },
    document: {
      getElementById: () => null,
      createElement: () => ({ set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; } }),
      body: { appendChild: (el) => apensos.push(el) },
    },
    esc: (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    route: () => { ctx._rotas = (ctx._rotas || 0) + 1; },
    _buscas: [],
  };
  ctx.fetch = async (u) => {
    ctx._buscas.push(u);
    if (jsonDoArquivo === null) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => jsonDoArquivo };
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/store.js', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(SERVE + '/prospecto.js', 'utf8'), ctx);
  ctx._apensos = apensos;
  return ctx;
}

const doris = JSON.parse(fs.readFileSync(SERVE + '/prospects/doris.json', 'utf8'));

(async () => {
  console.log('prototipo de prospect');

  /* --- 1. o link monta o app com a pessoa dentro --- */
  const c = monta('?g=doris', doris);
  await espera(); await espera();
  ok('busca o arquivo do prospect', c._buscas[0] === 'prospects/doris.json', c._buscas.join());
  ok('o nome da pessoa entra no app', c.APP_CONFIG.guia.nome === 'Doris');
  ok('o negocio dela entra no app', c.APP_CONFIG.guia.negocio === 'Paris com Doris');
  ok('o primeiro passeio e o dela',
    /Marais/.test(val(c, 'DB.tours[0].name.pt')), val(c, 'DB.tours[0].name.pt'));
  ok('o preco e o dela', val(c, 'DB.tours[0].price') === 45);
  ok('nao sobrou passeio de exemplo', val(c, 'DB.tours.length') === doris.passeios.length);
  ok('nenhuma data aponta para passeio que nao existe',
    val(c, 'DB.rules.every(r => DB.tours.some(t => t.id === r.tourId))'));
  ok('nenhuma reserva aponta para passeio que nao existe',
    val(c, 'DB.bookings.every(b => DB.tours.some(t => t.id === b.tourId))'));
  ok('o painel abre com reservas de exemplo (nao vazio)', val(c, 'DB.bookings.length') > 0);
  ok('a tela foi redesenhada depois de montar', c._rotas > 0);

  /* --- 2. a faixa de proposta e obrigatoria --- */
  ok('a faixa de proposta foi para a tela', c._apensos.length === 1);
  const faixa = c._apensos[0] || {};
  ok('a faixa diz que e proposta', /Proposta/i.test(faixa.innerHTML || ''));
  ok('a faixa nomeia a pessoa', /Doris/.test(faixa.innerHTML || ''));
  ok('a faixa nega ser o site oficial', /não é o site oficial/i.test(faixa.innerHTML || ''));
  ok('a faixa avisa que reserva nenhuma e real', /nenhuma reserva/i.test(faixa.innerHTML || ''));
  ok('a faixa fica FORA do #app (sobrevive a troca de tela)',
    !/getElementById\('app'\)/.test(fs.readFileSync(SERVE + '/prospecto.js', 'utf8')));

  /* --- 3. voltar ao link nao apaga o trabalho da pessoa --- */
  const guardado = { vi_prospecto: 'doris', vi_db_v1: JSON.stringify({ tours: [{ id: 't9', name: { pt: 'Passeio que ELE criou' }, order: 1 }], settings: { admName: 'Doris' }, bookings: [], rules: [], departures: [], blocks: [], coupons: [], seatCounts: [] }) };
  const c2 = monta('?g=doris', doris, guardado);
  await espera(); await espera();
  ok('na volta, NAO busca o arquivo de novo', c2._buscas.length === 0);
  ok('na volta, o passeio que a pessoa criou continua la',
    val(c2, 'DB.tours.length') === 1 && /ELE criou/.test(val(c2, 'DB.tours[0].name.pt')));
  ok('na volta, a faixa de proposta continua aparecendo', c2._apensos.length === 1);

  /* --- 4. o ?g= nao pode virar caminho --- */
  for (const mau of ['../../segredo', 'a/b', '.env', 'ABC', '-x']) {
    const cm = monta('?g=' + encodeURIComponent(mau), doris);
    await espera(); await espera();
    ok('recusa ?g=' + mau, cm._buscas.length === 0, 'buscou ' + cm._buscas.join());
  }

  /* --- 5. link errado nao pode quebrar o app --- */
  const c404 = monta('?g=naoexiste', null);
  await espera(); await espera();
  ok('arquivo que nao existe: app segue na demonstracao generica',
    c404.APP_CONFIG.guia.nome === 'Seu Nome');
  ok('arquivo que nao existe: NAO mostra faixa de proposta',
    c404._apensos.length === 0, 'diria "proposta para" sem proposta nenhuma');

  /* --- 6. sem ?g= nada acontece --- */
  const cs = monta('', doris);
  await espera(); await espera();
  ok('sem ?g=, nao busca nada e nao mostra faixa',
    cs._buscas.length === 0 && cs._apensos.length === 0);

  /* --- 7. o arquivo gerado tem o que o app precisa, e as fotos existem --- */
  for (const k of ['nome', 'negocio', 'cidade', 'passeios']) {
    ok('doris.json tem "' + k + '"', doris[k] !== undefined && doris[k] !== '');
  }
  doris.passeios.forEach((p, i) => {
    ok('passeio ' + (i + 1) + ' tem nome nos dois idiomas', !!(p.nome && p.nome.pt && p.nome.en));
    ok('passeio ' + (i + 1) + ' tem foto no disco',
      !!p.foto && fs.existsSync(SERVE + '/' + p.foto), p.foto || '(sem foto)');
  });

  /* --- 8. o prototipo NAO fala com a nuvem --- */
  const cloud = fs.readFileSync(SERVE + '/cloud.js', 'utf8');
  ok('sem banco, cloudStart nem comeca',
    /function cloudStart\([^)]*\)\s*\{[\s\S]{0,400}?if \(!SUPA_URL\) return;/.test(cloud),
    'ficaria tentando reconectar a cada 15s ate o fim da sessao');
  ok('sem banco, cloudPushState nem tenta',
    /function cloudPushState\(\)\s*\{[\s\S]{0,400}?if \(!SUPA_URL\) return;/.test(cloud),
    'cada edicao empilharia um item na fila do localStorage, para sempre');

  console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo passou');
  process.exit(falhas ? 1 : 0);
})();
