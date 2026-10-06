"""Legacy helper: wrap bare px/rem with --ui-scale / --font-scale.

Prefer the label_print-style token layer in design.css:
  - base: --font-size-* / --layout-* / --radius-*
  - scaled: --scaled-font-* / --scaled-*
  - components reference --scaled-* (do not scale html rem)
"""
from __future__ import annotations

import re
from pathlib import Path

CSS_DIR = Path(__file__).resolve().parents[1] / "app" / "web" / "css"
TARGETS = [
    "est_calc.css",
    "search.css",
    "quotes_search.css",
    "cost_quotes_search.css",
    "quotes.css",
    "master_edit.css",
    "rate_master.css",
    "freight_master.css",
    "tray_master.css",
    "dbox_master.css",
    "results_summary.css",
    "top.css",
    "design.css",
    "quote_calc.css",
    "app-theme.css",
]

FONT_PROPS = {"font-size", "line-height"}

PROP_VAL = re.compile(
    r"(?P<prop>font-size|line-height|width|height|min-width|max-width|min-height|max-height|"
    r"padding|padding-top|padding-right|padding-bottom|padding-left|"
    r"margin|margin-top|margin-right|margin-bottom|margin-left|"
    r"gap|row-gap|column-gap|border-radius|top|left|right|bottom|"
    r"letter-spacing|text-indent|flex-basis|"
    r"grid-template-columns|grid-template-rows|grid-auto-rows|grid-auto-columns|"
    r"column-width|inset)\s*:\s*(?P<val>[^;{]+);"
)

NUM_UNIT = re.compile(r"(?<![\w.-])(-?(?:\d+\.?\d*|\.\d+))(px|rem)\b")


def transform_value(prop: str, val: str) -> str:
    if "ui-scale" in val or "font-scale" in val or "scaled-" in val:
        return val
    scale = "var(--font-scale, 1)" if prop in FONT_PROPS else "var(--ui-scale, 1)"

    def repl(m: re.Match[str]) -> str:
        num, unit = m.group(1), m.group(2)
        try:
            f = float(num)
        except ValueError:
            return m.group(0)
        if f == 0:
            return m.group(0)
        if prop not in FONT_PROPS and unit == "px" and abs(f - 1.0) < 1e-9:
            if val.strip() in {"1px", "-1px"}:
                return m.group(0)
        return f"calc({num}{unit} * {scale})"

    new_val, n = NUM_UNIT.subn(repl, val)
    return new_val if n else val


def process_line(line: str) -> str:
    s = line.strip()
    if "ui-scale" in s or "font-scale" in s or "scaled-" in s:
        return line
    if s.startswith("@media") or s.startswith("@keyframes"):
        return line

    def prop_repl(m: re.Match[str]) -> str:
        prop = m.group("prop")
        val = m.group("val")
        new_val = transform_value(prop, val)
        return f"{prop}: {new_val.strip()};"

    return PROP_VAL.sub(prop_repl, line)


def main() -> None:
    changed: list[str] = []
    for name in TARGETS:
        path = CSS_DIR / name
        if not path.exists():
            continue
        original = path.read_text(encoding="utf-8")
        text = "".join(process_line(line) for line in original.splitlines(keepends=True))
        if text != original:
            path.write_text(text, encoding="utf-8")
            changed.append(name)
    print("updated:", ", ".join(changed) if changed else "(none)")


if __name__ == "__main__":
    main()
