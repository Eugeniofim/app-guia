/* =====================================================
   O APP DA LEDA — 01/10/2026

   Protótipo pedido pela Leda Guedes (@fotografaemparis.br) depois da DM.
   O motor é o do app de fotógrafo (app-foto); este arquivo só veste o app
   com a cara dela: a assinatura na abertura e no início, as ocasiões e os
   extras que ela oferece no site, e a faixa que diz que é proposta.

   Carregado DEPOIS do assistente.js e ANTES do painel.js — o painel.js
   termina com route(), que redesenha a tela já com isto valendo.
   ===================================================== */
'use strict';

/* ---------- 1. a faixa de proposta ----------
   Obrigatória: o link é público e tem o nome e as fotos dela. Quem cair
   aqui sem contexto precisa saber que não é o site oficial. Fica fora do
   #app para sobreviver à troca de tela; o app.js já sabe subir a faixa
   acima da barra de abas do painel. */
(function faixaDeProposta() {
  if (document.querySelector('.protobar')) return;
  const f = document.createElement('div');
  f.className = 'protobar';
  f.innerHTML = '<b>Protótipo feito para Leda Guedes</b> por Studio Ti Artes · ' +
    'não é o site oficial e nenhuma reserva aqui é real';
  document.body.appendChild(f);
})();

/* ---------- 2. a assinatura dela no início ----------
   No lugar do anel com a inicial, o logotipo que ela já usa. */
if (typeof viewHub === 'function') {
  const _hubAntes = viewHub;
  viewHub = function () {
    _hubAntes();
    const b = document.querySelector('.hub-brand');
    if (b) b.innerHTML = `<img class="lg-sig" src="fotos/assinatura.png" alt="Leda Guedes — Fotógrafa em Paris">
      <span class="lg-prova">4,9★ · 116 avaliações · PT · FR · EN · ES</span>`;
  };
}

/* ---------- 3. "Crie o seu ensaio" com o cardápio dela ----------
   As listas moram no app.js como const; troca-se o conteúdo, não a lista. */
if (typeof ENS_OCASIAO !== 'undefined') ENS_OCASIAO.splice(0, ENS_OCASIAO.length,
  ['casal',      'Casal ou lua de mel',        'Couple or honeymoon'],
  ['pedido',     'Pedido de casamento',        'Marriage proposal'],
  ['flydress',   'Fly Dress (vestido voando)', 'Fly Dress'],
  ['ruffle',     'Ruffle Dress',               'Ruffle Dress'],
  ['quinze',     '15 anos',                    'Quinceañera'],
  ['familia',    'Família',                    'Family'],
  ['votos',      'Renovação de votos',         'Vow renewal'],
  ['aniversario','Aniversário',                'Birthday'],
  ['individual', 'Ensaio individual',          'Solo session'],
);
if (typeof ENS_PRECISA !== 'undefined') ENS_PRECISA.splice(0, ENS_PRECISA.length,
  ['vestido',    'Aluguel de vestido',               'Dress rental'],
  ['troca',      'Troca de roupa (cabine móvel)',    'Outfit change (mobile booth)'],
  ['reels',      'Vídeo curto ou Reels',             'Short video or Reels'],
  ['transporte', 'Transporte privado',               'Private transport'],
  ['beleza',     'Cabelo e maquiagem',               'Hair & make-up'],
  ['nahora',     'Algumas fotos no mesmo dia',       'A few photos the same day'],
);

/* ---------- 4. a política dela ----------
   O selo padrão dizia "cancelamento grátis até 48h" — regra que ela nunca
   publicou. A que ela publica é a da chuva. */
if (typeof STR === 'object' && STR) {
  STR.freeCancel = Object.assign({}, STR.freeCancel, { pt: 'Choveu? Remarcação grátis', en: 'Rain? Free rebooking' });
}

/* ---------- 5. a cor dela ----------
   O site dela é preto quente, marfim e champanhe, com Cormorant Garamond
   nos títulos. Os tokens já vêm trocados no tokens.css; aqui ficam só as
   peças que tinham o verde do app-guia escrito à mão. */
document.head.insertAdjacentHTML('beforeend', `<style>
body{padding-bottom:44px}
.hub-bg::after{background:linear-gradient(175deg,rgba(16,15,13,.30),rgba(16,15,13,.55) 45%,rgba(16,15,13,.85))}
.hub-brand{display:flex;flex-direction:column;align-items:center;gap:6px}
.lg-sig{display:block;width:min(260px,68vw);height:auto;filter:drop-shadow(0 6px 18px rgba(0,0,0,.35))}
.lg-prova{font-size:var(--fs-2);letter-spacing:.08em;color:#E9E1D2}
.splash{background:#100F0D;background-image:radial-gradient(120% 80% at 50% 40%,#2A2620 0%,#1A1814 48%,#100F0D 100%)}
.sp-sig{display:block;width:min(300px,74vw);height:auto;margin:0 auto;
  animation:spUp 1100ms var(--ease) both;animation-delay:300ms}
.lookprev.light i:nth-child(1),.lookprev.auto i:nth-child(1){background:#1A1814}
</style>`);
