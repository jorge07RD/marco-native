#!/usr/bin/env python3
"""Genera los lockups de branding/ (diana + "Marco" en trazos). Uso: uvx --from fonttools python scripts/lockup.py branding"""
# Lockup de Marco: la diana de la app + "Marco" en trazos (Adwaita Sans 600).
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

font = TTFont('/usr/share/fonts/Adwaita/AdwaitaSans-Regular.ttf')
if 'fvar' in font:
    font = instantiateVariableFont(font, {'wght': 600})
gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font['head'].unitsPerEm
size = 300; scale = size / upm
# Altura de mayúscula para centrar el texto con la diana.
cap = font['OS/2'].sCapHeight * scale
H = 512; mark = 512
x0 = mark + 72; base = H / 2 + cap / 2
def texto(color):
    pen = SVGPathPen(gs); x = 0
    for ch in "Marco":
        g = cmap[ord(ch)]
        tp = TransformPen(pen, (scale, 0, 0, -scale, x0 + x * scale, base))
        gs[g].draw(tp); x += font['hmtx'][g][0]
    return pen.getCommands(), x0 + x * scale
for nombre, tinta in (('marco-lockup.svg', '#ece8f2'), ('marco-lockup-on-light.svg', '#15131a')):
    d, ancho = texto(tinta)
    W = round(ancho + 16)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Marco"><title>Marco</title>'
           f'<circle cx="256" cy="256" r="214" fill="none" stroke="#e94560" stroke-width="40"/>'
           f'<circle cx="256" cy="256" r="130" fill="none" stroke="#7b2cbf" stroke-width="40"/>'
           f'<circle cx="256" cy="256" r="49" fill="#7b2cbf"/>'
           f'<path fill="{tinta}" d="{d}"/></svg>')
    open(f'{sys.argv[1]}/{nombre}', 'w').write(svg)
print('ok')
