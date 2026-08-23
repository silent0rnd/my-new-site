import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\user\Desktop\статьи\yandex-direct-dlya-zastroyshchika\yandex-direct-dlya-zastroyshchika.md")
SLUG = "yandex-direct-dlya-zastroyshchika"
URL = f"https://naklikay.ru/blog/{SLUG}/"
IMAGES = [
    ("yandex-direct-dlya-zastroyshchika-1-structure", "Структура рекламных кампаний Яндекс Директа по жилым комплексам"),
    ("yandex-direct-dlya-zastroyshchika-2-funnel", "Воронка застройщика от клика до сделки"),
    ("yandex-direct-dlya-zastroyshchika-3-case", "Снижение CPL в кейсе Ватутинки Парк"),
]


def inline(text):
    safe = html.escape(text)
    safe = re.sub(r"\[([^\]]+)\]\((https://naklikay\.ru/[^)]+)\)", r'<a href="\2">\1</a>', safe)
    return re.sub(r"(?<![\"=])(https://naklikay\.ru/[^\s<]+)", r'<a href="\1">\1</a>', safe)


def figure(index):
    name, alt = IMAGES[index]
    return f'<figure class="article-figure"><img src="../{name}.jpg" alt="{alt}" width="2896" height="2172" loading="lazy" decoding="async" /></figure>'


def render(source):
    lines = source.splitlines()
    result, i = [], 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith("## "):
            heading = line[3:]
            result.append(f"<h2>{html.escape(heading)}</h2>")
            if heading == "Как разделить рекламные кампании застройщика":
                result.append(figure(0))
            if heading == "Почему нужно передавать в Директ качество лидов":
                result.append(figure(1))
            if heading == "Как оценивать эффективность Яндекс Директа для застройщика":
                result.append(figure(2))
        elif line.startswith("### "):
            result.append(f"<h3>{html.escape(line[4:])}</h3>")
        elif line.startswith("|") and i + 1 < len(lines) and lines[i + 1].strip().startswith("|---"):
            headers = [html.escape(cell.strip()) for cell in line.strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [inline(cell.strip()) for cell in lines[i].strip().strip("|").split("|")]
                rows.append("<tr>" + "".join(f"<td>{cell}</td>" for cell in cells) + "</tr>")
                i += 1
            result.append("<table><thead><tr>" + "".join(f"<th>{cell}</th>" for cell in headers) + "</tr></thead><tbody>" + "".join(rows) + "</tbody></table>")
            continue
        elif re.match(r"[-*] ", line):
            items = []
            while i < len(lines) and re.match(r"[-*] ", lines[i].strip()):
                items.append(f"<li>{inline(lines[i].strip()[2:])}</li>")
                i += 1
            result.append("<ul>" + "".join(items) + "</ul>")
            continue
        elif re.match(r"\d+\. ", line):
            items = []
            while i < len(lines) and re.match(r"\d+\. ", lines[i].strip()):
                items.append(f"<li>{inline(re.sub(r'^\d+\. ', '', lines[i].strip()))}</li>")
                i += 1
            result.append("<ol>" + "".join(items) + "</ol>")
            continue
        else:
            result.append(f"<p>{inline(line)}</p>")
        i += 1
    return "\n".join(result)


def main():
    source = SOURCE.read_text(encoding="utf-8")
    title = re.search(r"^\*\*Title:\*\* (.+)$", source, re.M).group(1)
    description = re.search(r"^\*\*Description:\*\* (.+)$", source, re.M).group(1)
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "BlogPosting", "headline": title, "description": description, "url": URL,
         "image": [f"https://naklikay.ru/blog/{SLUG}.webp"], "datePublished": "2026-08-23", "dateModified": "2026-08-23",
         "author": {"@type": "Person", "name": "Максим Мирошников"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Главная", "item": "https://naklikay.ru/"},
            {"@type": "ListItem", "position": 2, "name": "Блог", "item": "https://naklikay.ru/blog/"},
            {"@type": "ListItem", "position": 3, "name": title, "item": URL}]}
    ]}
    body = render("\n".join(source.splitlines()[6:]))
    document = f'''<!doctype html>
<html lang="ru"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="icon" href="/assets/avatar-donut.svg?v=2" type="image/svg+xml" /><title>{html.escape(title)}</title><meta name="description" content="{html.escape(description)}" />
<meta name="robots" content="index,follow,max-image-preview:large" /><link rel="canonical" href="{URL}" /><link rel="preload" href="../../assets/fonts/TTMasters-Regular.ttf" as="font" type="font/ttf" crossorigin />
<link rel="stylesheet" href="../../styles.css?v=20260821-blog-pagination-1" /><script src="../../script.js?v=20260821-blog-pagination-2" defer></script>
<meta property="og:type" content="article" /><meta property="og:site_name" content="Максим Мирошников" /><meta property="og:url" content="{URL}" /><meta property="og:title" content="{html.escape(title)}" /><meta property="og:description" content="{html.escape(description)}" /><meta property="og:image" content="https://naklikay.ru/blog/{SLUG}.webp" /><meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script></head>
<body class="legal-page article-page"><header class="legal-topbar"><a class="legal-home-link" href="../../">Максим Мирошников</a><nav class="messenger-links" aria-label="Мессенджеры"><a href="https://t.me/miroshnikov_maxim" target="_blank" rel="noopener noreferrer">Telegram</a><a href="https://max.ru/u/f9LHodD0cOIgA7Bv0YjmbdPunU2SNMxoBHXbc-v6QicEIYa6pEGXQlYaqtE" target="_blank" rel="noopener noreferrer">Макс</a></nav></header>
<main class="legal-shell"><article class="legal-document"><nav class="article-breadcrumbs" aria-label="Хлебные крошки"><a href="../../">Главная</a><span aria-hidden="true">/</span><a href="../">Блог</a><span aria-hidden="true">/</span><span aria-current="page">Яндекс Директ для застройщика</span></nav><p class="legal-kicker">Яндекс Директ</p><h1>{html.escape(title)}</h1><p class="article-meta"><time datetime="2026-08-23">23 августа 2026</time><span aria-hidden="true">·</span><span>Максим Мирошников</span></p>{body}<aside class="article-author"><img class="article-author__photo" src="../../assets/author-avatar.jpg" alt="Максим Мирошников, специалист по платному трафику" width="192" height="192" loading="lazy" decoding="async" /><div class="article-author__body"><p class="article-author__label">Автор</p><p class="article-author__name">Максим Мирошников</p><p class="article-author__role">Специалист по платному трафику и Яндекс Директу</p></div></aside></article></main></body></html>'''
    output = ROOT / "blog" / SLUG / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(document, encoding="utf-8")


if __name__ == "__main__":
    main()
