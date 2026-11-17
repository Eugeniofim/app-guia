#!/bin/sh
# Copia o site da FT (esta pasta) para o repositório do domínio próprio
# travelexperiences.london e ajusta os endereços. Uso: sh publicar-dominio.sh
set -e
ORIG=$(cd "$(dirname "$0")" && pwd); DEST=${1:-/home/user/travelexperiences-london}
tar -C "$ORIG" --exclude='LEIA-ME.md' --exclude='publicar-dominio.sh' --exclude='robots.txt' --exclude='sitemap.xml' -cf - . | tar -C "$DEST" -xf -
sed -i 's#https://guia.eugeniofim.com/ft/#https://travelexperiences.london/#g' "$DEST/index.html"
echo "copiado para $DEST — agora: cd $DEST && git add -A && git commit && git push origin main && git push origin main:gh-pages"
# 17/11/2026: o GitHub Pages do domínio publica o ramo gh-pages (não o main) — mande os dois.
