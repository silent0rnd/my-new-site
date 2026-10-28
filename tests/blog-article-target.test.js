const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { assertArticleFigureCaptions } = require("../scripts/blog-figure-captions");

const root = path.resolve(__dirname, "..");
const blogDir = path.join(root, "blog");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function occurrences(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function plainText(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function localPathFromUrl(articleDirectory, url) {
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  if (!clean || /^(?:https?:|mailto:|tel:|javascript:)/i.test(clean)) return "";
  const target = path.resolve(articleDirectory, clean);
  return clean.endsWith("/") ? path.join(target, "index.html") : target;
}

const slug = argumentValue("--article");
if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("Use --article <slug>.");

const articlePath = path.join(blogDir, slug, "index.html");
assert.ok(fs.existsSync(articlePath), `Article page is missing: ${slug}`);
const articleDirectory = path.dirname(articlePath);
const html = read(articlePath);
const canonical = `https://naklikay.ru/blog/${slug}/`;

assert.equal(occurrences(html, /<h1(?:\s|>)/g), 1, "article needs one H1");
const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
const h1 = plainText(h1Match ? h1Match[1] : "");
assert.ok(h1, "article H1 is empty");

const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/i);
assert.ok(titleMatch && plainText(titleMatch[1]), "SEO title is missing");
assert.ok(descriptionMatch && descriptionMatch[1].trim(), "meta description is missing");
assert.match(html, /<meta name="robots" content="[^"]*index[^"]*follow[^"]*"/i, "robots index,follow is missing");
assert.equal(occurrences(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g")), 1, "self-canonical is missing or duplicated");
assert.match(html, /<link rel="icon" href="\/assets\/avatar-donut\.svg\?v=2"/i, "favicon is missing");
assert.match(html, /<meta property="og:title" content="[^"]+"/i, "Open Graph title is missing");
assert.match(html, /<meta property="og:description" content="[^"]+"/i, "Open Graph description is missing");
assert.match(html, /<meta property="og:image" content="[^"]+"/i, "Open Graph image is missing");

const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
  .map((match) => JSON.parse(match[1]))
  .flatMap((item) => (Array.isArray(item["@graph"]) ? item["@graph"] : [item]));
const posting = jsonLd.find((item) => item["@type"] === "BlogPosting" || item["@type"] === "Article");
const breadcrumbs = jsonLd.find((item) => item["@type"] === "BreadcrumbList");
assert.ok(posting, "BlogPosting or Article JSON-LD is missing");
assert.equal(posting.headline, h1, "JSON-LD headline differs from H1");
assert.equal(posting.url, canonical, "JSON-LD URL differs from canonical");
assert.ok(posting.datePublished && posting.dateModified, "JSON-LD dates are missing");
assert.equal(posting.author && posting.author.name, "Максим Мирошников", "JSON-LD author is invalid");
assert.ok(breadcrumbs && Array.isArray(breadcrumbs.itemListElement), "BreadcrumbList JSON-LD is missing");

assert.equal(occurrences(html, /<aside class="article-author"/g), 1, "article needs one author block");
assert.match(html, /class="article-author__name">Максим Мирошников</, "visible author is invalid");
assert.match(html, /href="\.\.\/\.\.\/#about"/, "author link is missing");

assert.equal(occurrences(html, /<!-- article-toc:start -->/g), 1, "TOC start marker is missing or duplicated");
assert.equal(occurrences(html, /<!-- article-toc:end -->/g), 1, "TOC end marker is missing or duplicated");
const withoutToc = html.replace(/<!-- article-toc:start -->[\s\S]*?<!-- article-toc:end -->/g, "");
const authorIndex = withoutToc.indexOf('<aside class="article-author"');
const articleContent = authorIndex >= 0 ? withoutToc.slice(0, authorIndex) : withoutToc;
const headingIds = [...articleContent.matchAll(/<h[23][^>]*\sid="([^"]+)"[^>]*>/gi)].map((match) => match[1]);
const tocIds = [...html.matchAll(/data-article-anchor[^>]*href="#([^"]+)"|href="#([^"]+)"[^>]*data-article-anchor/gi)].map((match) => match[1] || match[2]);
assert.ok(headingIds.length > 0, "article headings are missing");
assert.deepEqual(tocIds, headingIds, "TOC links differ from H2/H3 headings");

const figures = [...html.matchAll(/<figure class="article-figure">([\s\S]*?)<\/figure>/gi)];
assertArticleFigureCaptions(articleContent, slug);
for (const [, figure] of figures) {
  assert.match(figure, /<picture data-blog-responsive="true">/i, "article figure is not responsive");
  const img = figure.match(/<img\s+[^>]*src="([^"]+)"[^>]*>/i);
  assert.ok(img, "article figure image is missing");
  assert.match(img[0], /\swidth="\d+"/, "article image width is missing");
  assert.match(img[0], /\sheight="\d+"/, "article image height is missing");
  assert.ok(fs.existsSync(localPathFromUrl(articleDirectory, img[1])), `image is missing: ${img[1]}`);
  const srcsetUrls = [...figure.matchAll(/\ssrcset="([^"]+)"/gi)]
    .flatMap((match) => match[1].split(","))
    .map((item) => item.trim().split(/\s+/)[0]);
  assert.ok(srcsetUrls.length > 0, `responsive variants are missing for ${img[1]}`);
  for (const url of srcsetUrls) assert.ok(fs.existsSync(localPathFromUrl(articleDirectory, url)), `responsive image is missing: ${url}`);
}

const tables = [...html.matchAll(/<table class="article-table"[^>]*>([\s\S]*?)<\/table>/gi)];
assert.equal(tables.length, occurrences(html, /<table(?:\s|>)/gi), "every table must use article-table");
assert.equal(tables.length, occurrences(html, /<div class="article-table-wrap">/g), "every table needs article-table-wrap");
for (const [, table] of tables) {
  const cells = [...table.matchAll(/<td([^>]*)>/gi)];
  assert.ok(cells.every((cell) => /\sdata-label="[^"]+"/i.test(cell[1])), "every table cell needs data-label");
}

const articleBlock = html.match(/<article class="legal-document"[^>]*>([\s\S]*?)<\/article>/i);
assert.ok(articleBlock, "article document is missing");
assert.doesNotMatch(plainText(articleBlock[1]), new RegExp(String.fromCharCode(96), "u"), "article contains forbidden U+0060 quote");
for (const match of articleBlock[1].matchAll(/<a\s+[^>]*href="([^"]+)"/gi)) {
  const target = localPathFromUrl(articleDirectory, match[1]);
  if (target) assert.ok(fs.existsSync(target), `internal link target is missing: ${match[1]}`);
}

const archiveFiles = [path.join(blogDir, "index.html")];
const pageRoot = path.join(blogDir, "page");
if (fs.existsSync(pageRoot)) {
  for (const item of fs.readdirSync(pageRoot, { withFileTypes: true })) {
    if (item.isDirectory() && /^\d+$/.test(item.name)) archiveFiles.push(path.join(pageRoot, item.name, "index.html"));
  }
}
const archiveCards = archiveFiles.flatMap((file) => [...read(file).matchAll(/<article class="blog-card">[\s\S]*?<\/article>/g)].map((match) => match[0]));
const targetCards = archiveCards.filter((card) => new RegExp(`href="(?:\\.\\.\/\\.\\.\/)?${slug}/"`).test(card));
assert.equal(targetCards.length, 1, "archive needs exactly one article card");

const sitemap = read(path.join(root, "sitemap.xml"));
assert.equal(occurrences(sitemap, new RegExp(`<loc>${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/loc>`, "g")), 1, "sitemap needs exactly one canonical URL");
const sitemapEntry = sitemap.match(new RegExp(`<url>\\s*<loc>${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/loc>[\\s\\S]*?<\\/url>`));
assert.ok(sitemapEntry, "sitemap article entry is missing");
assert.match(sitemapEntry[0], new RegExp(`<lastmod>${posting.dateModified}<\\/lastmod>`), "sitemap lastmod differs from article dateModified");

const topicIndex = JSON.parse(read(path.join(root, "scripts", "blog-related-topics.json")));
const topicRecords = topicIndex.articles.filter((article) => article.slug === slug);
assert.equal(topicRecords.length, 1, "topic index needs exactly one article record");
assert.ok(topicRecords[0].topic && topicRecords[0].topicLabel && topicRecords[0].intent, "target topic data is incomplete");

const relatedMarkerIndex = html.indexOf("<!-- related-articles:start -->");
const visibleAuthorIndex = html.indexOf('<aside class="article-author"');
assert.ok(relatedMarkerIndex > visibleAuthorIndex, "related articles must appear after the author");
const relatedSlugs = [...html.matchAll(/class="related-article-card" href="\.\.\/([^/]+)\//g)].map((match) => match[1]);
assert.equal(relatedSlugs.length, 3, "article needs three related cards");
assert.equal(new Set(relatedSlugs).size, 3, "related cards must be unique");
assert.ok(!relatedSlugs.includes(slug), "article links to itself in related cards");
for (const relatedSlug of relatedSlugs) assert.ok(fs.existsSync(path.join(blogDir, relatedSlug, "index.html")), `related article is missing: ${relatedSlug}`);

assert.doesNotMatch(html, /�|undefined|\?\?\?\?|TODO|PLACEHOLDER|\{\{[A-Z0-9_]+\}\}|<SEO-META>|<ARTICLE-BODY>/i, "article contains service artifacts");

console.log(JSON.stringify({
  article: slug,
  h1: 1,
  headings: headingIds.length,
  tocLinks: tocIds.length,
  figures: figures.length,
  tables: tables.length,
  related: relatedSlugs,
  status: "ok",
}));
