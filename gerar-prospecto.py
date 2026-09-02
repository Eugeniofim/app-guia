#!/usr/bin/env python3
"""Monta o prototipo de um prospect: um arquivo JSON e as fotos da cidade dele.

   Uso:   python3 gerar-prospecto.py prospects/fontes/doris.json
   Sai:   prospects/doris.json  +  prospects/fotos/doris-1..3.jpg
   Link:  https://guia.eugeniofim.com/?g=doris

   O arquivo de entrada e escrito a mao, com o que se ve no Instagram da
   pessoa. So o essencial: quem ela e, onde, e dois ou tres passeios com
   preco. Os ids de foto sao do Unsplash (licenca livre, uso comercial
   permitido, sem atribuicao) — a foto e da CIDADE dela, nunca a dela: o
   link e publico e republicar foto dos outros e problema.
"""
import json, pathlib, subprocess, sys

RAIZ = pathlib.Path(__file__).resolve().parent
DEST = RAIZ / 'prospects'
FOTOS = DEST / 'fotos'
CAMPOS_OBRIG = ['slug', 'nome', 'negocio', 'cidade', 'passeios']


def baixa(unsplash_id: str, destino: pathlib.Path, w=1200, h=800) -> bool:
    url = f'https://images.unsplash.com/photo-{unsplash_id}?w={w}&h={h}&fit=crop&crop=entropy&q=80'
    r = subprocess.run(['curl', '-sS', '-o', str(destino), '-w', '%{http_code}', url],
                       capture_output=True, text=True)
    ok = r.stdout.strip() == '200' and destino.exists() and destino.stat().st_size > 20000
    if not ok and destino.exists():
        destino.unlink()
    return ok


def gera(entrada: pathlib.Path) -> pathlib.Path:
    src = json.loads(entrada.read_text())
    faltando = [c for c in CAMPOS_OBRIG if not src.get(c)]
    if faltando:
        sys.exit(f'faltam campos obrigatorios em {entrada.name}: {", ".join(faltando)}')

    slug = src['slug']
    if not slug.replace('-', '').isalnum() or not slug[0].isalnum():
        sys.exit(f'slug invalido: {slug!r} (use so letras minusculas, numeros e hifen)')

    FOTOS.mkdir(parents=True, exist_ok=True)
    passeios = []
    for i, p in enumerate(src['passeios'][:3], start=1):
        foto = ''
        if p.get('unsplash'):
            alvo = FOTOS / f'{slug}-{i}.jpg'
            if baixa(p['unsplash'], alvo):
                foto = f'prospects/fotos/{slug}-{i}.jpg'
                print(f'  foto {i}: {alvo.name}  {alvo.stat().st_size // 1024} KB')
            else:
                print(f'  foto {i}: FALHOU (id {p["unsplash"]}) — o passeio fica sem foto')
        passeios.append({
            'nome':     p['nome'],
            'desc':     p['desc'],
            'preco':    p.get('preco', 45),
            'modo':     p.get('modo', 'pp'),
            'tipo':     p.get('tipo', 'walk'),
            'regiao':   p.get('regiao', 'cidade'),
            'duracao':  p.get('duracao', '2h30'),
            'encontro': p.get('encontro', ''),
            'foto':     foto,
        })

    saida = {k: src[k] for k in ('nome', 'negocio', 'cidade') }
    for k in ('whats', 'insta', 'badge', 'prefixo', 'regioes', 'bio', 'tagline'):
        if src.get(k):
            saida[k] = src[k]
    saida['passeios'] = passeios

    DEST.mkdir(parents=True, exist_ok=True)
    destino = DEST / f'{slug}.json'
    destino.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + '\n')
    print(f'\n  {destino.relative_to(RAIZ)}')
    print(f'  link: https://guia.eugeniofim.com/?g={slug}')
    return destino


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for arg in sys.argv[1:]:
        gera(pathlib.Path(arg))
