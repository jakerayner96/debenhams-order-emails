#!/usr/bin/env python3
"""Render the brand wordmarks to 2x PNGs for the email (black for the page header, white for the card).
Source SVGs are copies of debenhamsgroup.design/assets/brands. Output: assets/logos/<brand>.png + <brand>-white.png.
Usage: python3 tools/logos.py            (needs Google Chrome + Pillow)"""
import json, os, re, subprocess, tempfile, pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
brands = json.loads((ROOT / "brands.json").read_text())["brands"]
def dims(b):
    svg = (ROOT / "assets/logos/svg" / f"{b['id']}.svg").read_text()
    vb = re.search(r'viewBox="([\d.\s-]+)"', svg).group(1).split()
    aspect = float(vb[2]) / float(vb[3])
    if aspect >= 5: h = max(14, round(136 / aspect)); w = round(h * aspect)
    else: h = 28; w = round(28 * aspect)
    return svg, w, h
out = {}
for b in brands:
    if b.get('disabled'):
        out[b['id']] = 'disabled'; continue
    if not (ROOT / 'assets/logos/svg' / f"{b['id']}.svg").exists():
        out[b['id']] = 'no svg on the DS site — text wordmark'; continue
    svg, w, h = dims(b)
    svg2 = re.sub(r'<svg([^>]*?)\swidth="[^"]+"\sheight="[^"]+"', r'<svg\1 width="%d" height="%d"' % (w * 2, h * 2), svg, count=1)
    html = f'<!doctype html><html><body style="margin:0;background:transparent">{svg2}</body></html>'
    with tempfile.TemporaryDirectory() as td:
        src = pathlib.Path(td) / "l.html"; src.write_text(html)
        png = ROOT / "assets/logos" / f"{b['id']}.png"
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
                        f"--window-size={w*2},{h*2}", f"--screenshot={png}", f"file://{src}"], check=True, capture_output=True)
    im = Image.open(png).convert("RGBA")
    im.save(png, optimize=True)
    a = im.split()[3]; white = Image.new("RGBA", im.size, (255, 255, 255, 255)); white.putalpha(a)
    white.save(ROOT / "assets/logos" / f"{b['id']}-white.png", optimize=True)
    out[b["id"]] = {"w": w, "h": h, "px": im.size, "alpha": a.getextrema()}
print(json.dumps(out, indent=1))
