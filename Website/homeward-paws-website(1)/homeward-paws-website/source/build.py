"""Assemble Homeward Paws legal/help pages: shared head, header and footer.

Each src/*.html starts with a front-matter block:
<!--
title: Privacy policy
description: ...
-->
followed by the <main> content.
"""
import pathlib, re

SRC = pathlib.Path(__file__).parent / "src"
OUT = pathlib.Path(__file__).parent.parent / "site"
DOMAIN = "https://homewardpaws.co.za/"

HEAD = """<!doctype html>
<html lang="en-ZA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title} · Homeward Paws</title>
<meta name="description" content="{description}">
<meta name="theme-color" content="#FBF7F2">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Homeward Paws">
<meta property="og:title" content="{title} · Homeward Paws">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{domain}assets/img/og-image.jpg">
<link rel="icon" type="image/png" sizes="48x48" href="assets/img/favicon-48.png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
"""

NAV_ITEMS = [
    ("nearby.html", "Animals near you"),
    ("index.html#how-it-works", "How it works"),
    ("safety.html", "Help and safety"),
    ("privacy-policy.html", "Privacy"),
    ("delete-account.html", "Delete account"),
]

def header(current):
    links = "\n".join(
        f'      <a href="{href}"{" aria-current=\"page\"" if href == current else ""}>{label}</a>'
        for href, label in NAV_ITEMS
    )
    return f"""<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="Homeward Paws home"><img src="assets/img/logo-horizontal.svg" alt="Homeward Paws" width="211" height="46"></a>
    <nav class="nav" aria-label="Main">
{links}
    </nav>
  </div>
</header>
"""

FOOTER = (OUT / "index.html").read_text().split('<footer class="site-footer">', 1)[1]
FOOTER = '<footer class="site-footer">' + FOOTER

for src in sorted(SRC.glob("*.html")):
    text = src.read_text()
    m = re.match(r"\s*<!--(.*?)-->\s*", text, re.S)
    meta = dict(
        (k.strip(), v.strip())
        for k, v in (line.split(":", 1) for line in m.group(1).strip().splitlines())
    )
    body = text[m.end():]
    canonical = DOMAIN + ("" if src.name == "index.html" else src.name)
    page = (
        HEAD.format(title=meta["title"], description=meta["description"], canonical=canonical, domain=DOMAIN)
        + header(src.name)
        + body.strip() + "\n\n"
        + FOOTER
    )
    (OUT / src.name).write_text(page)
    print("built", src.name)
