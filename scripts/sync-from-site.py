#!/usr/bin/env python3
"""Rebuild index.html from the live-site page (tools/geo-judge.html of aimarketinglift).

The site version is the source of truth. This strips what only makes sense on
aimarketinglift.com (Google Analytics, site navigation, JSON-LD, legal links) and
turns site-relative links into absolute ones, so the page runs as a standalone file.

Usage: python3 scripts/sync-from-site.py <path/to/site/tools/geo-judge.html>
Every replacement asserts its match count, so a changed site layout fails loudly
instead of producing a half-converted page.
"""
import pathlib
import re
import sys

SITE = "https://aimarketinglift.com"
REPO = "https://github.com/jiguang9/geo-judge"
OUT = pathlib.Path(__file__).resolve().parent.parent / "index.html"

NAV = f"""<nav class="nav" id="nav">
  <a class="nav-logo" href="{SITE}/tools/geo-judge">
    <img src="{SITE}/assets/images/favicon.svg" width="26" height="26" alt="" style="border-radius:2px">
    <span class="nav-name">GEO 可见度判定助手</span>
  </a>
  <div class="nav-r">
    <a class="nav-login" href="{REPO}">GitHub</a>
    <a class="nav-try" href="{SITE}/tools/geo-judge">在线版</a>
  </div>
</nav>"""

FOOTER = (f'<div class="footer-strip">\n  开源工具 · MIT 许可 · <a href="{REPO}">GitHub</a> · '
          f'作者 <a href="{SITE}">硅基光哥 · AI Marketing Lift</a>\n</div>')


def sub(pattern, repl, text, count, flags=re.S):
    new, n = re.subn(pattern, repl, text, flags=flags)
    if n != count:
        sys.exit(f"expected {count} match(es) for {pattern!r}, found {n}; the site page changed, update this script")
    return new


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    html = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")

    html = sub(r"<!-- Google tag \(gtag\.js\) -->\s*<script async src=\"https://www\.googletagmanager\.com[^\n]*\n<script>.*?</script>\n", "", html, 1)
    html = sub(r"\s*<script type=\"application/ld\+json\">.*?</script>", "", html, 2)
    html = sub(r"<nav class=\"nav\" id=\"nav\">.*?</nav>\s*<div class=\"nav-drawer\" id=\"navDrawer\">.*?</div>\s*</div>\n", NAV + "\n", html, 1)
    html = sub(r"<div class=\"footer-strip\">.*?</div>", FOOTER, html, 1)
    html = sub(r"<script src=\"/assets/js/nav\.js\"></script>\n", "", html, 1)
    # the companion skill is open source too, so point at its repo rather than the site page
    html = sub(r'href="/skills/geo-audit"', 'href="https://github.com/jiguang9/geo-audit"', html, 1)
    # remaining site-relative links and assets (favicon, engine logos, consulting) become absolute
    html = re.sub(r'(href|src)="/(?!/)', rf'\1="{SITE}/', html)
    html = re.sub(r'"/assets/', f'"{SITE}/assets/', html)

    leftovers = re.findall(r'(?:href|src)="/[^/"]|googletagmanager|gtag\(', html)
    if leftovers:
        sys.exit(f"site-specific leftovers remain: {sorted(set(leftovers))}")

    html = html.replace("<!DOCTYPE html>", f"<!DOCTYPE html>\n<!-- GEO 可见度判定助手 · MIT · {REPO} · 在线版 {SITE}/tools/geo-judge -->", 1)
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT.name} ({len(html.encode('utf-8')) // 1024} KB)")


if __name__ == "__main__":
    main()
