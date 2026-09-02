# app-guia

App de reservas para guias brasileiros na Europa. Nasceu de uma cópia do app
de uma guia de verdade (v1.48.0) e vira a base de cada cliente novo.

**O código não conhece banco nem dono.** O banco de cada cliente e a
identidade do guia (nome, negócio, cidade, WhatsApp, Instagram, regiões dos
passeios) entram só por `config.js`. Com o banco vazio o app roda só no
aparelho — é o modo protótipo para mostrar a um guia.

`testes/limpa.test.js` varre o repositório inteiro, imagens inclusive, e
falha se aparecer qualquer identificador da guia original (banco, chaves,
conta Stripe, domínio, nome, marca, cidade, região, telefone) ou qualquer
banco gravado no código.

O app nasce em modo demo: três passeios de exemplo, clientes fictícios e
fotos neutras. O guia limpa tudo em Ajustes quando começa de verdade.

## Rodar os testes

    npm test

## Cliente novo (resumo)

1. Copiar este repositório.
2. Preencher o bloco `guia` em `config.js` e trocar as fotos neutras
   (`guia.jpg`, `home.jpg`, `capa.jpg`, `og.jpg`, `exemplo-*.jpg`) pelas dele.
3. Criar o projeto no Supabase, rodar `SEGURANCA.sql` no editor SQL e
   preencher `supabaseUrl` / `supabaseKey`.
4. Para cartão: publicar `supabase/functions/pagar` com os segredos
   `STRIPE_SECRET_KEY` (chave restrita da conta Stripe **do cliente**) e
   `APP_ORIGEM` (o endereço onde o app vai ficar).
5. Publicar, e rodar `npm test` antes de cada publicação.

## Protótipo para prospect

O link `https://guia.eugeniofim.com/?g=<slug>` abre o app já com o nome, a
cidade e os passeios da pessoa. É o que transforma "eu faço apps" em "olha o
seu app pronto".

Para montar um:

1. Escrever `prospects/fontes/<slug>.json` com o que se vê no Instagram da
   pessoa: nome, negócio, cidade e dois ou três passeios com preço. Cada
   passeio leva um `unsplash` (o id da foto da **cidade** dela).
2. `python3 gerar-prospecto.py prospects/fontes/<slug>.json`
3. `git push` — o link fica no ar em cerca de um minuto.

**Todo protótipo mostra uma faixa fixa dizendo que é uma proposta, que não é
o site oficial da pessoa e que nenhuma reserva ali é real.** O link é
público e leva o nome de alguém de verdade com preços que nós inventamos.
`testes/prospecto.test.js` falha se essa faixa sumir.

Fotos: sempre da **cidade** da pessoa, de licença livre (Unsplash), nunca as
fotos dela — republicar foto dos outros numa página pública é problema.
