#!/usr/bin/env python3
"""Build the gallery pages from tools/page_template.html.

  python3 tools/make_pages.py                 index.html (all renderers) + demos/<id>.html (one each)
  python3 tools/make_pages.py --only a,b      index.html with just those renderers; demos/ untouched
  python3 tools/make_pages.py --artifact OUT  also write OUT = the page body only, for a claude.ai Artifact

Renderers are renderers/*.js; files starting with "_" are skipped unless named in --only.
"""
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = (ROOT / "tools" / "page_template.html").read_text(encoding="utf-8")


def principles_html():
    """PRINCIPLES.md as HTML for the 原理 view (tables wrapped so they scroll on phones)."""
    text = (ROOT / "PRINCIPLES.md").read_text(encoding="utf-8")
    try:
        import markdown
    except ImportError:
        import html
        return "<pre>" + html.escape(text) + "</pre>"
    out = markdown.markdown(text, extensions=["tables"])
    return out.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")


def page(ids, root):
    tags = "\n".join(f'<script src="{root}renderers/{i}.js"></script>' for i in ids)
    return (TEMPLATE.replace("{{ROOT}}", root).replace("{{RENDERERS}}", tags)
            .replace("{{PRINCIPLES}}", principles_html()))


def body_only(html):
    m = re.search(r"<body>(.*)</body>", html, re.S)
    return m.group(1).strip() + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated renderer ids for index.html (skips demos/)")
    ap.add_argument("--artifact", help="also write the <body> content of index.html here")
    args = ap.parse_args()

    found = sorted(p.stem for p in (ROOT / "renderers").glob("*.js") if not p.stem.startswith("_"))
    if args.only:
        ids = [i.strip() for i in args.only.split(",") if i.strip()]
        missing = [i for i in ids if not (ROOT / "renderers" / f"{i}.js").exists()]
        if missing:
            raise SystemExit("no such renderer: " + ", ".join(missing))
    else:
        ids = found

    index = page(ids, "")
    (ROOT / "index.html").write_text(index, encoding="utf-8")
    print(f"index.html: {len(ids)} renderer(s) {', '.join(ids) or '(none)'}")

    if not args.only:
        demos = ROOT / "demos"
        demos.mkdir(exist_ok=True)
        for old in demos.glob("*.html"):
            if old.stem not in ids:
                old.unlink()
        for i in ids:
            (demos / f"{i}.html").write_text(page([i], "../"), encoding="utf-8")
        print(f"demos/: {len(ids)} page(s)")

    if args.artifact:
        out = Path(args.artifact)
        out.write_text(body_only(index), encoding="utf-8")
        print(f"artifact body: {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
