const fs = require("fs");
const path = require("path");
const {
  BLOG_ROOT,
  articleSlug,
  escapeAttribute,
  plainText,
  readArgument,
  resolveArticlePath,
} = require("./blog-refresh-lib");

function archiveFiles() {
  const files = [path.join(BLOG_ROOT, "index.html")];
  const pageRoot = path.join(BLOG_ROOT, "page");
  if (fs.existsSync(pageRoot)) {
    for (const entry of fs.readdirSync(pageRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && /^\d+$/.test(entry.name)) files.push(path.join(pageRoot, entry.name, "index.html"));
    }
  }
  return files.filter(fs.existsSync);
}

function cardSlug(card) {
  return (card.match(/<h2 class="blog-card__title">\s*<a href="(?:\.\.\/\.\.\/)?([^/"]+)\//) || [])[1] || "";
}

function localAssetFromUrl(url) {
  const match = String(url).match(/^https:\/\/naklikay\.ru\/blog\/(.+)$/);
  if (!match) throw new Error(`Карточка поддерживает только локальный blog asset: ${url}`);
  return path.join(BLOG_ROOT, match[1]);
}

function relativeAsset(filePath, assetPath) {
  return path.relative(path.dirname(filePath), assetPath).split(path.sep).join("/");
}

function main(argv = process.argv.slice(2)) {
  const articlePath = resolveArticlePath(readArgument(argv, "--article"));
  const slug = articleSlug(articlePath);
  const write = argv.includes("--write");
  const article = fs.readFileSync(articlePath, "utf8");
  const h1 = plainText((article.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
  const description = (article.match(/<meta name="description" content="([^"]+)"/i) || [])[1] || "";
  const imageUrl = (article.match(/<meta property="og:image" content="([^"]+)"/i) || [])[1] || "";
  const imageWidth = (article.match(/<meta property="og:image:width" content="(\d+)"/i) || [])[1] || "1200";
  const imageHeight = (article.match(/<meta property="og:image:height" content="(\d+)"/i) || [])[1] || "630";
  const imageAlt = (article.match(/<meta property="og:image:alt" content="([^"]+)"/i) || [])[1] || h1;
  if (!h1 || !description || !imageUrl) throw new Error("В статье отсутствует H1, description или og:image.");
  const imagePath = localAssetFromUrl(imageUrl);
  if (!fs.existsSync(imagePath)) throw new Error(`OG-изображение не найдено: ${imagePath}`);
  const cardPattern = /<div class="case-card-reveal">\s*<article class="blog-card">[\s\S]*?<\/article>\s*<\/div>/g;
  const matches = [];
  for (const filePath of archiveFiles()) {
    const html = fs.readFileSync(filePath, "utf8");
    for (const match of html.matchAll(cardPattern)) if (cardSlug(match[0]) === slug) matches.push({ filePath, html, match });
  }
  if (matches.length !== 1) throw new Error(`Карточка ${slug}: ожидалось одно совпадение, найдено ${matches.length}.`);
  const { filePath, html, match } = matches[0];
  const imageSrc = relativeAsset(filePath, imagePath);
  let card = match[0]
    .replace(/(<a class="blog-card__media"[^>]*>)[\s\S]*?(<\/a>)/, `$1<img src="${escapeAttribute(imageSrc)}" alt="${escapeAttribute(imageAlt)}" width="${imageWidth}" height="${imageHeight}" loading="lazy" decoding="async" />$2`)
    .replace(/(<h2 class="blog-card__title">\s*<a [^>]*>)[\s\S]*?(<\/a>)/, `$1${h1}$2`)
    .replace(/(<p class="blog-card__text">)[\s\S]*?(<\/p>)/, `$1${escapeAttribute(description)}$2`);
  const next = `${html.slice(0, match.index)}${card}${html.slice(match.index + match[0].length)}`;
  if (write && next !== html) fs.writeFileSync(filePath, next, "utf8");
  return { article: slug, mode: write ? "write" : "check", card: path.relative(process.cwd(), filePath), changed: next !== html, title: h1 };
}

module.exports = { main };
if (require.main === module) {
  try { console.log(JSON.stringify(main())); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
