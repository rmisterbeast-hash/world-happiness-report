"""Prepare responsive WebP copies of original project SVG artwork.
This script uses original hand-authored SVGs; it does not import third-party photos.
"""
from pathlib import Path
import io
import re
import cairosvg
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
IMAGES=ROOT/"images"
for svg in sorted(IMAGES.glob("*.svg")):
    for width in (640,1200):
        buffer=io.BytesIO(cairosvg.svg2png(url=str(svg),output_width=width))
        im=Image.open(buffer).convert("RGB")
        out=IMAGES/f"{svg.stem}-{width}.webp"
        im.save(out,format="WEBP",quality=82,method=6)
        print(out.relative_to(ROOT), out.stat().st_size, "bytes")

expr=re.compile(r'<img\b[^>]*\bsrc="./images/([a-z]+)\.svg"[^>]*>')
def replacement(match):
    html=match.group(0)
    name=match.group(1)
    html=html.replace(f'src="./images/{name}.svg"',
     f'src="./images/{name}-640.webp" srcset="./images/{name}-640.webp 640w, ./images/{name}-1200.webp 1200w" sizes="(max-width: 900px) 100vw, 50vw"')
    if 'loading=' not in html:
        html=html[:-1]+' loading="eager" fetchpriority="high">' if 'hero__image' in html else html[:-1]+' loading="lazy">'
    return html
for path in sorted(ROOT.glob("*.html")):
    s=path.read_text(encoding="utf-8")
    out=expr.sub(replacement,s)
    if out!=s:
        path.write_text(out,encoding="utf-8")
        print("Updated",path.name)
