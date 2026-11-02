#!/usr/bin/env python3
"""Render the DS icons the emails use to 2x PNGs (mail clients don't do SVG): black for light mode, white for dark.
Source SVGs are copies of debenhamsgroup.design/assets/ds/icons/lib/icons-<name>.svg. Output: assets/icons/<name>.png + <name>-white.png.
Usage: python3 tools/icons.py            (needs Google Chrome + Pillow)"""
import json, subprocess, tempfile, pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SIZE = 24
out = {}
for svg in sorted((ROOT / "assets/icons/svg").glob("*.svg")):
    html = f'<!doctype html><html><body style="margin:0;background:transparent"><div style="width:{SIZE}px;height:{SIZE}px">{svg.read_text()}</div></body></html>'
    with tempfile.TemporaryDirectory() as td:
        src = pathlib.Path(td) / "i.html"; src.write_text(html)
        png = ROOT / "assets/icons" / f"{svg.stem}.png"
        # 2x device pixels so the DS 1pt non-scaling strokes come out 2px in the PNG (1pt at 24 in the mail client)
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
                        "--force-device-scale-factor=2", f"--window-size={SIZE},{SIZE}", f"--screenshot={png}", f"file://{src}"],
                       check=True, capture_output=True)
    im = Image.open(png).convert("RGBA")
    black = Image.new("RGBA", im.size, (0, 0, 0, 255)); black.putalpha(im.split()[3]); black.save(png, optimize=True)
    white = Image.new("RGBA", im.size, (255, 255, 255, 255)); white.putalpha(im.split()[3])
    white.save(ROOT / "assets/icons" / f"{svg.stem}-white.png", optimize=True)
    out[svg.stem] = {"px": im.size, "alpha": im.split()[3].getextrema()}
print(json.dumps(out, indent=1))
