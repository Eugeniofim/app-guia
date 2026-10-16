# App do Ailton Guia Viena (Aílton Fonseca)

Protótipo de 16/10/2026. Endereço depois de publicado: `guia.eugeniofim.com/ailton/`
(painel direto: `guia.eugeniofim.com/ailton/painel/`).

Base: cópia do demo "Londres com a Bia" (`app-guia/londres`, v0.2.0), com a
Contabilidade feita para a Freddy reescrita no padrão da Áustria.

## De onde vem cada coisa (nada inventado)

Tudo do site dele, `ailtonguiaviena.at`:

- **Passeios e preços** (`catalogo.js`): City Tour Clássico (2h, €330), City
  Tour Clássico Plus (3h, €470) e Top Tour Viena (6h30, €840), por grupo
  fechado de até 5 pessoas, com o adicional por pessoa do site (+€55, +€75,
  +€130). O que cada um inclui é a lista do site.
- **Além de Viena**: Salzburgo, Hallstatt, Innsbruck, Linz e Graz, com a
  frase e a foto do site. Ficam **sob consulta** (o site não dá preço): o
  cliente pede orçamento pelo WhatsApp, sem agenda.
- **Bio, "Por que escolher o Aílton", diplomas e galeria**: textos e fotos
  do site (`fotos/`).
- **Avaliações**: 10 recomendações reais do Facebook que estão no site dele
  (prints), transcritas em `config.js → depoimentos`. Ele edita em Ajustes.
- **Marca** (`arte/`): a mão com a bandeira da Áustria é o logo do site; o
  "Aílton / GUIA VIENA" foi composto com as fontes e o dourado do site
  (Playfair Display + Inter, #B8973A sobre grafite).

## Pedidos do Eugênio (16/10/2026)

- Letras maiores em todo o app (ele não enxerga bem): escala nova em
  `tokens.css`, tamanhos fixos de `index.html`, `carol.css` e
  `assistente.js` aumentados, cinzas mais escuros, botões maiores
  (`ailton.css`).
- Vitrine maior no laptop: duas colunas de botões e os 3 passeios lado a
  lado; no celular empilha (`ailton.js → viewHub`).
- Vitrine: ficam **Passeios e reservas, Quem sou eu, Avaliações e
  WhatsApp**. Saíram consultoria de roteiro, Monte seu roteiro, ingressos,
  guias de Londres (eBooks) e vale-presente. Transfer também saiu (o site
  dele não oferece).
- Painel: saíram **Pontos turísticos, Atendimento, Marketing, Cupons e
  brindes e Roteiros** (`ailton.js → menuAilton`).
- **Extrato virou Contabilidade**, padrão europeu (`contabilidade.js`):
  - Resumo: entrou/saiu/resultado, a receber, quanto guardar para SVS e
    imposto, 12 meses, e os limites da lei na Áustria:
    pequeno empresário (Kleinunternehmer, €55.000/ano) e caixa registradora
    (Registrierkasse: €15.000/ano e €7.500 em pagamentos na hora).
  - Extrato (Einnahmen): conta europeia × Pix (Brasil), com **recibo
    numerado em sequência** (Rechnung, AV-2026-0001…) para imprimir ou
    mandar pelo WhatsApp, com a frase da Kleinunternehmerregelung.
  - Despesas (Ausgaben): categorias de guia (SVS, WKO, ingressos de
    clientes, Wiener Linien/ÖBB, Bewirtung…), IVA da nota e "tem
    comprovante".
  - IVA: no regime de pequeno empresário explica que está isento; no regime
    normal calcula a UVA (20% − Vorsteuer) por mês ou trimestre, com prazo.
  - Para o contador: Einnahmen-Ausgaben-Rechnung, CSV no formato austríaco
    (`;` e vírgula decimal), livro-caixa (Kassabuch), calendário (SVS, UVA,
    declaração) e e-mail para o Steuerberater.
  - Ajustes: regime de IVA, endereço, UID-Nummer, Steuernummer, % a guardar.
  - Na tela: "Quem fecha o imposto é o seu contador (Steuerberater)".

## Para o Aílton confirmar

- Sinal de 30% e remarcação grátis até 48h (regra do app; o site não fala).
- Tolerância de 20 min e horários dos turnos (Manhã 9h30, Tarde 14h30).
- Máximo de 10 pessoas por grupo (o site não diz máximo).
- Regime de IVA (o app nasce como Kleinunternehmer), endereço, UID e
  Steuernummer para o recibo.
- E-mail de contato (o site só tem WhatsApp).

## Para a entrega (com nuvem)

1. Projeto Supabase dele (ou sala `ailton` no banco da Ti Artes) +
   `SEGURANCA.sql`; preencher `supabaseUrl`, `supabaseKey`, `sala` no `config.js`.
2. Tabela `despesas` na nuvem (hoje a contabilidade guarda no aparelho).
3. Domínio, se quiser (ex.: app.ailtonguiaviena.at).
4. Tirar `meta robots noindex` do `index.html` quando estiver no ar.
