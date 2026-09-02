#!/bin/sh
# Roda a suite inteira. Sai com erro se QUALQUER teste falhar.
# Antes eu usava um laco com "|| echo" que engolia a falha e deixava publicar.
cd "$(dirname "$0")/.."
falhou=0
for f in testes/*.test.js; do
  printf "%-26s " "$(basename "$f")"
  if node "$f" >/dev/null 2>&1; then echo "passou"; else echo "FALHOU"; falhou=1; fi
done
[ "$falhou" -eq 0 ] && echo "\ntudo passou" || echo "\nHA TESTE FALHANDO — nao publique"
exit $falhou
