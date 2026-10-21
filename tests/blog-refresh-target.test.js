const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { assertArticleFigureCaptions, assertSourceImageCaptions } = require("../scripts/blog-figure-captions");
const { extractSource, parseMarkdown, readArgument, readArgumentValues, resolveArticlePath, resolveSeoMetadata } = require("../scripts/blog-refresh-lib");

const argv = process.argv.slice(2);
const articlePath = resolveArticlePath(readArgument(argv, "--article"));
const sourceInput = readArgument(argv, "--source");
assert(sourceInput && fs.existsSync(path.resolve(sourceInput)), "Укажите существующий --source <txt>.");
const html = fs.readFileSync(articlePath, "utf8");
const { seo: sourceSeo, body } = extractSource(fs.readFileSync(path.resolve(sourceInput), "utf8"));
const seo = resolveSeoMetadata(sourceSeo, html);
const blocks = parseMarkdown(body);
assertSourceImageCaptions(blocks, seo.slug);
const count = (pattern, value = html) => (value.match(pattern) || []).length;
const contentStart = html.indexOf("<!-- article-toc:end -->");
const contentEnd = html.indexOf('<aside class="article-author"');
assert(contentStart >= 0 && contentEnd > contentStart, "Не найдены границы текста статьи.");
const content = html.slice(contentStart, contentEnd);
assertArticleFigureCaptions(content, seo.slug);
assert.strictEqual(count(/<h1(?:\s|>)/g), 1, "H1 должен быть один.");
assert(html.includes(`<title>${seo.seo_title}</title>`), "Title не совпадает с источником.");
assert(html.includes(`name="description" content="${seo.meta_description.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`), "Description не совпадает с источником.");
assert(html.includes(`rel="canonical" href="${seo.canonical}"`), "Canonical не совпадает с источником.");
assert.strictEqual(count(/<figure class="article-figure">/g), blocks.filter((block) => block.type === "image").length, "Количество иллюстраций не совпадает.");
assert.strictEqual(count(/<figcaption>/g, content), blocks.filter((block) => block.type === "image").length, "У каждой иллюстрации должна быть подпись.");
assert(!/Иллюстрация\s*№\s*\d+/iu.test(content), "Служебный номер иллюстрации попал в статью.");
for (const match of content.matchAll(/<a\b[^>]*href="([^"]+)"/gi)) {
  if (!/^(?:https?:)?\/\//i.test(match[1])) continue;
  const url = new URL(match[1], seo.canonical);
  assert.strictEqual(url.hostname, "naklikay.ru", `В тексте осталась внешняя ссылка: ${match[1]}`);
}
assert.strictEqual(count(/<h[23](?:\s|>)/g, content), blocks.filter((block) => block.type === "h2" || block.type === "h3").length, "Количество заголовков не совпадает.");
assert.strictEqual(count(/<div class="article-table-wrap"/g, content), blocks.filter((block) => block.type === "table").length, "Количество таблиц не совпадает.");
for (const match of content.matchAll(/<img\b[^>]*src="([^"?]+)[^"]*"[^>]*>/g)) {
  assert(/\bwidth="\d+"/.test(match[0]) && /\bheight="\d+"/.test(match[0]), `Нет размеров у ${match[1]}.`);
  const asset = path.resolve(path.dirname(articlePath), match[1]);
  assert(fs.existsSync(asset), `Не найден файл ${match[1]}.`);
}
for (const oldImage of readArgumentValues(argv, "--old-image")) {
  const name = path.basename(oldImage);
  assert(!html.includes(name), `Старая картинка всё ещё подключена: ${name}.`);
}
assert(!/пїЅ|undefined|\?\?\?\?|TODO|PLACEHOLDER|<SEO-META>|<ARTICLE-BODY>/i.test(html), "Найдены повреждённые или служебные маркеры.");
const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((match) => {
  const parsed = JSON.parse(match[1]);
  return Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];
});
const post = schemas.find((item) => ["BlogPosting", "Article"].includes(item["@type"]));
assert(post && post.dateModified === seo.date_modified && post.url === seo.canonical, "JSON-LD статьи не совпадает с источником.");
console.log(JSON.stringify({ article: seo.slug, status: "ok", h1: 1, headings: count(/<h[23](?:\s|>)/g, content), figures: count(/<figure class="article-figure">/g), tables: count(/<div class="article-table-wrap"/g, content) }));
