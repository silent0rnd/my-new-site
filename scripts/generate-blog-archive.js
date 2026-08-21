/*
 * Статический генератор архива блога.
 * Источник карточек - существующие страницы архива. Добавьте новую карточку в
 * /blog/, затем выполните `npm run build:blog`: страницы, ссылки и sitemap
 * пересчитаются без ручного создания /blog/page/N/.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const blogDir = path.join(root, "blog");
const pageSize = 15;
const siteUrl = "https://naklikay.ru";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function archiveFiles() {
  const files = [path.join(blogDir, "index.html")];
  const pageDirectory = path.join(blogDir, "page");
  if (!fs.existsSync(pageDirectory)) return files;
  for (const item of fs.readdirSync(pageDirectory, { withFileTypes: true })) {
    if (item.isDirectory() && /^\d+$/.test(item.name)) {
      files.push(path.join(blogDir, "page", item.name, "index.html"));
    }
  }
  return files.filter(fs.existsSync);
}

function getCards(html) {
  return [...html.matchAll(/<div class="case-card-reveal">\s*<article class="blog-card">[\s\S]*?<\/article>\s*<\/div>/g)]
    .map((match) => match[0]);
}

function cardKey(card) {
  const match = card.match(/<h2 class="blog-card__title">\s*<a href="(?:\.\.\/\.\.\/)?([^/"]+)\//);
  if (!match) throw new Error("A blog card is missing its article link.");
  return match[1];
}

function cardDate(card) {
  const match = card.match(/<time datetime="(\d{4}-\d{2}-\d{2})">/);
  return match ? match[1] : "0000-00-00";
}

function normalizeCard(card, depth) {
  const prefix = depth === 0 ? "" : "../../";
  return card
    .replace(/href="(?:\.\.\/\.\.\/)?([^/"]+)\//g, `href="${prefix}$1/`)
    .replace(/(srcset|src)="(?:\.\.\/\.\.\/)?([^/"]+)"/g, `$1="${prefix}$2"`);
}

function pagination(page, total) {
  if (total < 2) return "";
  const links = Array.from({ length: total }, (_, index) => {
    const number = index + 1;
    const href = number === 1 ? "/blog/" : `/blog/page/${number}/`;
    return number === page
      ? `          <span aria-current="page">${number}</span>`
      : `          <a href="${href}">${number}</a>`;
  });
  const previous = page > 1 ? `\n          <a class="blog-pagination__previous" href="${page === 2 ? "/blog/" : `/blog/page/${page - 1}/`}">Предыдущая</a>` : "";
  const next = page < total ? `\n          <a class="blog-pagination__next" href="/blog/page/${page + 1}/">Следующая</a>` : "";
  return `\n        <nav class="blog-pagination" aria-label="Страницы блога">${previous}\n${links.join("\n")}${next}\n        </nav>`;
}

function pageHtml(cards, page, total) {
  const depth = page === 1 ? 0 : 2;
  const assetPrefix = depth === 0 ? "../" : "../../../";
  const canonicalPath = page === 1 ? "/blog/" : `/blog/page/${page}/`;
  const cardsHtml = cards.map((card) => normalizeCard(card, depth)).join("\n\n");
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/assets/avatar-donut.svg?v=2" type="image/svg+xml" />
    <title>Блог о платном трафике - Максим Мирошников</title>
    <meta name="description" content="Статьи о Яндекс Директе и платном трафике простым языком: как устроена реклама, чем отличаются Поиск и РСЯ, что смотреть в аналитике." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${siteUrl}${canonicalPath}" />
    <link rel="preload" href="${assetPrefix}assets/fonts/TTMasters-Regular.ttf" as="font" type="font/ttf" crossorigin />
    <link rel="stylesheet" href="${assetPrefix}styles.css?v=20260821-blog-pagination-1" />
    <script src="${assetPrefix}script.js?v=20260821-blog-pagination-2" defer></script>
    <noscript><style>.case-card-reveal { opacity: 1; filter: none; transform: none; }</style></noscript>
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Максим Мирошников" />
    <meta property="og:url" content="${siteUrl}${canonicalPath}" />
    <meta property="og:title" content="Блог о платном трафике - Максим Мирошников" />
    <meta property="og:description" content="Статьи о Яндекс Директе и платном трафике простым языком: как устроена реклама, чем отличаются Поиск и РСЯ, что смотреть в аналитике." />
    <meta property="og:image" content="${siteUrl}/assets/og-cover.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body class="legal-page article-page">
    <header class="legal-topbar">
      <a class="legal-home-link" href="${assetPrefix}">Максим Мирошников</a>
      <nav class="messenger-links" aria-label="Мессенджеры">
        <a href="https://t.me/miroshnikov_maxim" target="_blank" rel="noopener noreferrer">Telegram</a>
        <a href="https://max.ru/u/f9LHodD0cOIgA7Bv0YjmbdPunU2SNMxoBHXbc-v6QicEIYa6pEGXQlYaqtE" target="_blank" rel="noopener noreferrer">Макс</a>
      </nav>
    </header>
    <main class="legal-shell">
      <div class="legal-document">
        <nav class="article-breadcrumbs" aria-label="Хлебные крошки">
          <a href="${assetPrefix}">Главная</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Блог</span>
        </nav>
        <p class="legal-kicker">Блог о платном трафике</p>
        <h1>Блог</h1>
        <p class="article-lead">Разбираю рекламу простым языком: как устроен Яндекс Директ, за что уходит бюджет и что смотреть в отчетах, чтобы реклама приносила заявки.</p>
        <div class="blog-list" data-blog-archive data-blog-page="${page}">
${cardsHtml}
        </div>${pagination(page, total)}
      </div>
    </main>
  </body>
</html>
`;
}

const cardsBySlug = new Map();
for (const file of archiveFiles()) {
  for (const card of getCards(read(file))) cardsBySlug.set(cardKey(card), card);
}
const cards = [...cardsBySlug.values()].sort((a, b) => cardDate(b).localeCompare(cardDate(a)));
if (!cards.length) throw new Error("No blog cards found.");

const pages = Array.from({ length: Math.ceil(cards.length / pageSize) }, (_, index) => cards.slice(index * pageSize, (index + 1) * pageSize));
write(path.join(blogDir, "index.html"), pageHtml(pages[0], 1, pages.length));
for (let index = 1; index < pages.length; index += 1) write(path.join(blogDir, "page", String(index + 1), "index.html"), pageHtml(pages[index], index + 1, pages.length));

const pageRoot = path.join(blogDir, "page");
if (fs.existsSync(pageRoot)) {
  for (const item of fs.readdirSync(pageRoot, { withFileTypes: true })) {
    const page = Number(item.name);
    if (item.isDirectory() && Number.isInteger(page) && page > pages.length) fs.rmSync(path.join(pageRoot, item.name), { recursive: true, force: true });
  }
}

const sitemapPath = path.join(root, "sitemap.xml");
let sitemap = read(sitemapPath).replace(/\s*<url>\s*<loc>https:\/\/naklikay\.ru\/blog\/page\/\d+\/<\/loc>[\s\S]*?<\/url>/g, "");
const generatedPages = pages.slice(1).map((_, index) => `  <url>\n    <loc>${siteUrl}/blog/page/${index + 2}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`).join("\n");
if (generatedPages) sitemap = sitemap.replace("</urlset>", `${generatedPages}\n</urlset>`);
write(sitemapPath, sitemap);
console.log(`Generated ${pages.length} blog archive page(s) for ${cards.length} article(s).`);
