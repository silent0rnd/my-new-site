import argparse
import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLUG = "yandex-direct-dlya-nedvizhimosti"
URL = f"https://naklikay.ru/blog/{SLUG}/"
IMAGES = [
    ("yandex-direct-nedvizhimost-1-structure", "Структура рекламных кампаний для недвижимости в Яндекс Директе"),
    ("yandex-direct-nedvizhimost-2-funnel", "Воронка аналитики рекламы недвижимости от клика до сделки"),
    ("yandex-direct-nedvizhimost-3-search-rsya", "Поиск и РСЯ для продвижения недвижимости в Яндекс Директе"),
]

def linkify(text):
    safe = html.escape(text)
    return re.sub(r"(https://naklikay\.ru/[^\s<]+)", r'<a href="\1">\1</a>', safe)

def figure(index):
    name, alt = IMAGES[index]
    return f'<figure class="article-figure"><img src="../{name}.jpg" alt="{alt}" width="1536" height="1152" loading="lazy" decoding="async" /></figure>'

def article_body(source):
    lines = source.splitlines()
    rendered, i, figure_index = [], 4, 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith("# "):
            rendered.append(f"<h1>{html.escape(line[2:])}</h1>")
        elif line.startswith("## "):
            heading = line[3:]
            rendered.append(f"<h2>{html.escape(heading)}</h2>")
            if heading == "Как разделять рекламу недвижимости":
                rendered.append(figure(0)); figure_index = 1
        elif line.startswith("### "):
            rendered.append(f"<h3>{html.escape(line[4:])}</h3>")
        elif line.startswith("|") and i + 1 < len(lines) and lines[i + 1].strip().startswith("|---"):
            headers = [html.escape(value.strip()) for value in line.strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [linkify(value.strip()) for value in lines[i].strip().strip("|").split("|")]
                rows.append("<tr>" + "".join(f"<td>{cell}</td>" for cell in cells) + "</tr>")
                i += 1
            rendered.append("<table><thead><tr>" + "".join(f"<th>{cell}</th>" for cell in headers) + "</tr></thead><tbody>" + "".join(rows) + "</tbody></table>")
            continue
        elif re.match(r"[-*] ", line):
            items = []
            while i < len(lines) and re.match(r"[-*] ", lines[i].strip()):
                items.append(f"<li>{linkify(lines[i].strip()[2:])}</li>")
                i += 1
            rendered.append("<ul>" + "".join(items) + "</ul>")
            continue
        elif re.match(r"\d+\. ", line):
            items = []
            while i < len(lines) and re.match(r"\d+\. ", lines[i].strip()):
                items.append(f"<li>{linkify(re.sub(r'^\d+\. ', '', lines[i].strip()))}</li>")
                i += 1
            rendered.append("<ol>" + "".join(items) + "</ol>")
            continue
        else:
            rendered.append(f"<p>{linkify(line)}</p>")
            if line.startswith("Клик → заявка → дозвон"):
                rendered.append(figure(1)); figure_index = 2
            elif line.startswith("Сам по себе дешевый клик"):
                rendered.append(figure(2)); figure_index = 3
        i += 1
    if figure_index != 3:
        raise RuntimeError("All three infographics were not inserted")
    return "\n".join(rendered)

def document(title, description, body):
    schema = {"@context":"https://schema.org", "@graph":[
        {"@type":"BlogPosting", "headline":title, "description":description, "url":URL,
         "datePublished":"2026-08-23", "dateModified":"2026-08-23", "image":f"https://naklikay.ru/blog/yandex-direct-nedvizhimost.webp",
         "author":{"@type":"Person","name":"Максим Мирошников"}, "publisher":{"@type":"Person","name":"Максим Мирошников"}},
        {"@type":"BreadcrumbList", "itemListElement":[
            {"@type":"ListItem", "position":1, "name":"Главная", "item":"https://naklikay.ru/"},
            {"@type":"ListItem", "position":2, "name":"Блог", "item":"https://naklikay.ru/blog/"},
            {"@type":"ListItem", "position":3, "name":"Яндекс Директ для недвижимости", "item":URL}]}
    ]}
    return f'''<!doctype html>
<html lang="ru"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><link rel="icon" href="/assets/avatar-donut.svg?v=2" type="image/svg+xml" /><title>{html.escape(title)}</title><meta name="description" content="{html.escape(description)}" /><meta name="robots" content="index,follow,max-image-preview:large" /><link rel="canonical" href="{URL}" /><link rel="preload" href="../../assets/fonts/TTMasters-Regular.ttf" as="font" type="font/ttf" crossorigin /><link rel="stylesheet" href="../../styles.css?v=20260821-blog-pagination-1" /><script src="../../script.js?v=20260821-blog-pagination-2" defer></script><meta property="og:type" content="article" /><meta property="og:site_name" content="Максим Мирошников" /><meta property="og:url" content="{URL}" /><meta property="og:title" content="{html.escape(title)}" /><meta property="og:description" content="{html.escape(description)}" /><meta property="og:image" content="https://naklikay.ru/blog/yandex-direct-nedvizhimost.webp" /><meta name="twitter:card" content="summary_large_image" /><script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script></head>
<body class="legal-page article-page"><header class="legal-topbar"><a class="legal-home-link" href="../../">Максим Мирошников</a><nav class="messenger-links" aria-label="Мессенджеры"><a href="https://t.me/miroshnikov_maxim" target="_blank" rel="noopener noreferrer">Telegram</a><a href="https://max.ru/u/f9LHodD0cOIgA7Bv0YjmbdPunU2SNMxoBHXbc-v6QicEIYa6pEGXQlYaqtE" target="_blank" rel="noopener noreferrer">Макс</a></nav></header><main class="legal-shell"><article class="legal-document"><nav class="article-breadcrumbs" aria-label="Хлебные крошки"><a href="../../">Главная</a><span aria-hidden="true">/</span><a href="../">Блог</a><span aria-hidden="true">/</span><span aria-current="page">Яндекс Директ для недвижимости</span></nav><p class="legal-kicker">Яндекс Директ</p>{body}<p class="article-author">Автор: Максим Мирошников, специалист по платному трафику и Яндекс Директу.</p></article></main></body></html>\n'''

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    source = args.source.read_text(encoding="utf-8")
    title = re.search(r"^Title: (.+)$", source, re.M).group(1)
    description = re.search(r"^Description: (.+)$", source, re.M).group(1)
    output = ROOT / "blog" / SLUG / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(document(title, description, article_body(source)), encoding="utf-8")

if __name__ == "__main__":
    main()
