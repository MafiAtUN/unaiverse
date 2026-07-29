#!/usr/bin/env python3
"""
Contrast audit for the palettes in DESIGN.md.

Every text/surface pairing the site actually uses, checked against WCAG 2.x
at the 4.5:1 small-text threshold — including the alpha-blended --dim and
--faint variants, which is where the failures always hide. Run before
adopting a palette, and again after.

    python3 scripts/palette-audit.py
"""


def _lin(c: float) -> float:
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_colour: str) -> float:
    h = hex_colour.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def over(fg: str, alpha: float, bg: str) -> str:
    """Flatten an rgb(... / alpha) foreground onto an opaque background."""
    f, b = fg.lstrip("#"), bg.lstrip("#")
    return "#%02x%02x%02x" % tuple(
        round(int(f[i : i + 2], 16) * alpha + int(b[i : i + 2], 16) * (1 - alpha))
        for i in (0, 2, 4)
    )


def ratio(a: str, b: str) -> float:
    x, y = luminance(a), luminance(b)
    if x < y:
        x, y = y, x
    return round((x + 0.05) / (y + 0.05), 2)


def audit(name: str, p: dict) -> int:
    print(f"\n{'=' * 64}\n{name}\n{'=' * 64}")
    rows = [
        ("text on ground", p["text"], p["ground"]),
        ("text-dim on ground", over(p["text"], p["dim"], p["ground"]), p["ground"]),
        ("text-faint on ground", over(p["text"], p["faint"], p["ground"]), p["ground"]),
        ("text-dim on raised", over(p["text"], p["dim"], p["raised"]), p["raised"]),
        ("text-faint on raised", over(p["text"], p["faint"], p["raised"]), p["raised"]),
    ]
    for label, colour in p["onDark"].items():
        for surface in ("ground", "raised", "panel"):
            rows.append((f"{label} on {surface}", colour, p[surface]))

    rows += [
        ("ink on paper", p["ink"], p["paper"]),
        ("ink on sunk", p["ink"], p["sunk"]),
        ("ink-dim on paper", over(p["ink"], p["inkDim"], p["paper"]), p["paper"]),
        ("ink-faint on paper", over(p["ink"], p["inkFaint"], p["paper"]), p["paper"]),
        ("ink-faint on sunk", over(p["ink"], p["inkFaint"], p["sunk"]), p["sunk"]),
    ]
    for label, colour in p["onPaper"].items():
        rows.append((f"{label} on paper", colour, p["paper"]))
        rows.append((f"{label} on sunk", colour, p["sunk"]))

    fails = 0
    for label, fg, bg in rows:
        r = ratio(fg, bg)
        ok = r >= 4.5
        fails += 0 if ok else 1
        print(f"  {'PASS' if ok else 'FAIL'} {r:5.2f}  {label}")
    print(f"  → {len(rows)} pairings, {fails} below 4.5:1")
    return fails


PALETTES = {
    "A — Foxed Paper": dict(
        ground="#0C110D", raised="#141C16", panel="#1C271D",
        paper="#E9E3D2", sunk="#DED7C3", ink="#171C17", text="#EFEADB",
        dim=0.74, faint=0.56, inkDim=0.76, inkFaint=0.67,
        onDark={"brass": "#D9A62A", "moss": "#8FB37A", "sage": "#8B9C82", "plum": "#C58FD8"},
        onPaper={"brass-dk": "#6E5310", "moss-dk": "#3F5A32", "sage-dk": "#4A5544", "plum-dk": "#6B3480"},
    ),
    "B — Riso": dict(
        ground="#101011", raised="#1A1A1C", panel="#232326",
        paper="#F1EEE4", sunk="#E5E1D4", ink="#141416", text="#F1EEE4",
        dim=0.74, faint=0.56, inkDim=0.76, inkFaint=0.62,
        onDark={"yellow": "#F5D020", "pink": "#FF5FA8", "green": "#2FBF74"},
        onPaper={"yellow-dk": "#6B5A05", "pink-dk": "#B01A63", "green-dk": "#146B3F"},
    ),
    "C — Monotype": dict(
        ground="#0E0E0F", raised="#18181A", panel="#212124",
        paper="#EDEBE6", sunk="#E1DED7", ink="#131315", text="#EDEBE6",
        dim=0.74, faint=0.56, inkDim=0.76, inkFaint=0.62,
        onDark={"vermilion": "#F1533A", "grey-hi": "#B9B7B1", "grey-mid": "#8A8883"},
        onPaper={"vermilion-dk": "#B3301A", "grey-dk": "#5A5854"},
    ),
    "CURRENT (for comparison)": dict(
        ground="#070B1A", raised="#0D1428", panel="#111A33",
        paper="#F5F1E6", sunk="#EBE5D6", ink="#131829", text="#F5F1E6",
        dim=0.72, faint=0.50, inkDim=0.76, inkFaint=0.62,
        onDark={"gold": "#C9A227", "un-blue": "#009EDB", "olive": "#7A8B5C", "signal": "#FF6B4A"},
        onPaper={"gold-dk": "#7D6414", "blue-dk": "#0A6488", "olive-dk": "#4C5A33", "signal-dk": "#B83C1D"},
    ),
}

if __name__ == "__main__":
    total = sum(audit(name, p) for name, p in PALETTES.items())
    print(f"\n{'=' * 64}\n{total} failing pairing(s) across all palettes\n")
    raise SystemExit(1 if total else 0)
