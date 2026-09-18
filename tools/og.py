"""Render the survey's share image with the Oxagen brand kit's ad composer.

    python3 tools/og.py            # writes public/og.svg and public/og.png (1200x630)

Needs the brand kit checked out beside this repo (../oxagen-brand, or BRAND_KIT=/path) and
`rsvg-convert` (`brew install librsvg`). The copy lives here; the layout, the mark and the
metal are the kit's, so the card matches every other Oxagen surface.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
KIT = Path(os.environ.get("BRAND_KIT") or HERE.parent.parent.parent.parent / "oxagen-brand")
if not (KIT / "build" / "surfaces.py").exists():
    KIT = Path.home() / "Projects" / "oxagen-brand"
sys.path.insert(0, str(KIT / "build"))
import surfaces as SF  # noqa: E402

W, H = 1200, 630
svg = SF.ad(
    W, H, "oxagen", "dark",
    kicker="A two-minute survey",
    headline=["How do you run", "your agents?"],
    subline="Nine questions. One entry to win $100 in OpenRouter API credits.",
    cta="oxagen-survey.vercel.app",
    picture="orbit",
)
out_svg = HERE / "public" / "og.svg"
out_png = HERE / "public" / "og.png"
out_svg.write_text(svg)
subprocess.run(["rsvg-convert", str(out_svg), "-w", str(W), "-h", str(H), "-o", str(out_png)], check=True)
print(f"wrote {out_png.relative_to(HERE)} ({out_png.stat().st_size // 1024} KB) from the kit at {KIT}")
