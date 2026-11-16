# FT Travel & Experiences — o site do Roberto (Freddy Turismo, Londres)

16/11/2026. Base: o app da Yalla (`yalla-site`, v1.10.8) — site e painel
idênticos ao dela —, com a marca FT, Inglaterra/Escócia/Europa e o site novo.

## O que é da FT
- `ft-site.js` / `ft-site.css` — a capa nova (substitui a da Yalla):
  serviços, **A estrada** (mapa 3D da Grã-Bretanha que a rolagem percorre, de
  Westminster a Skye, com o carro andando), destinos, viagens assinadas, "é para
  você?" + como funciona, frota, sobre, avaliações (5.0 TripAdvisor), final.
  Também as páginas `#/journey/<id>` (viagens de vários dias, no modelo do German
  Routes: dia a dia, época, distância, mapa, 3 jeitos de fazer, pedido) e `#/about`.
- `ft-mapa.js` — contorno de GB/Irlanda/França/Bélgica/Holanda (world-atlas 50m,
  Natural Earth, domínio público) e as cidades da rota.
- Línguas: **inglês é a base**; português e italiano nas bandeiras (`L4(en, pt, it)`).
  Telas internas da base sem italiano caem no inglês. O **painel é sempre em português**
  (`ftLinguaDaTela()` em ft-site.js, chamada no começo do `route()` do app.js).
- Marca: `arte/ft-*.png` (monograma FT, deitado, empilhado), ícones, `og.jpg`,
  `arte/fundo.svg` (art déco) e `arte/skyline.svg` (Londres). Ideias de logo:
  `arte/logos/ideias-de-logo.jpg`.
- Fotos em `arte/f/`: Unsplash (licença Unsplash) e Wikimedia Commons (CC BY / CC BY-SA,
  crédito no rodapé). Trocar pelas do Roberto quando chegarem.
- Dados: `config.js` (Roberto, GBP, en/pt/it, sem banco = protótipo), `store.js` (_seed:
  passeios e viagens da FT, preços de exemplo), `conteudo.js` (Londres: base, cidades,
  categorias, equipe e pedidos de exemplo).

## Na entrega
1. Domínio da FT (ver sugestões na conversa) e o repositório próprio, como o da Yalla.
2. Sala `ft` no Supabase da Ti Artes; `supabaseUrl`, `supabaseKey`, `sala` no config.
3. Tirar `noindex` do index.html; preços reais; fotos do Roberto e dos carros.
4. Trazer do app antigo (`/freddy`) o que só ele tem: Comunicação (mensagens + push),
   Notificações automáticas e Contabilidade por carro — o painel da Yalla já tem
   Contabilidade, Dashboard, Pipeline, Orçamentos e Kit da viagem.
