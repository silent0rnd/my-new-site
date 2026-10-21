const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { assertSourceImageCaptions } = require("./blog-figure-captions");
const {
  BLOG_ROOT,
  articleSlug,
  escapeAttribute,
  extractSource,
  filesReferencingAsset,
  imageDimensionsFromSharpMetadata,
  inlineMarkdown,
  parseMarkdown,
  readArgument,
  readArgumentValues,
  renderBlock,
  resolveSeoMetadata,
  resolveArticlePath,
  sha256,
} = require("./blog-refresh-lib");

function replaceSingle(html, pattern, replacement, label) {
  const matches = [...html.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))];
  if (matches.length !== 1) throw new Error(`${label}: ожидалось одно совпадение, найдено ${matches.length}.`);
  return html.replace(pattern, replacement);
}

function collectSchema(html) {
  const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (!matches.length) throw new Error("JSON-LD не найден.");
  const items = [];
  for (const match of matches) {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed["@graph"])) {
      for (const item of parsed["@graph"]) items.push({ context: parsed["@context"] || "https://schema.org", item });
    } else {
      items.push({ context: parsed["@context"] || "https://schema.org", item: parsed });
    }
  }
  return { matches, items };
}

function replaceSchema(html, mutate) {
  const { items } = collectSchema(html);
  mutate(items.map((entry) => entry.item));
  const markup = items.map(({ context, item }) => {
    const normalized = { "@context": context, ...item };
    return `<script type="application/ld+json">${JSON.stringify(normalized)}</script>`;
  }).join("");
  let first = true;
  return html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, () => {
    if (!first) return "";
    first = false;
    return markup;
  });
}

function existingImageDimensions(articleHtml, assetName) {
  const escaped = assetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = articleHtml.match(new RegExp(`<img\\b[^>]*src=["'][^"']*${escaped}["'][^>]*>`, "i"));
  if (!match) return null;
  const width = Number((match[0].match(/\bwidth=["'](\d+)["']/i) || [])[1]);
  const height = Number((match[0].match(/\bheight=["'](\d+)["']/i) || [])[1]);
  return width && height ? { width, height } : null;
}

async function prepareAssets({ articleHtml, articlePath, blocks, imageInputs, slug }) {
  const inputs = new Map();
  for (const input of imageInputs) {
    const absolute = path.resolve(input);
    if (!fs.existsSync(absolute)) throw new Error(`Изображение не найдено: ${absolute}`);
    const name = path.basename(absolute);
    if (inputs.has(name)) throw new Error(`Повторяется имя входного изображения: ${name}`);
    inputs.set(name, absolute);
  }
  const imageBlocks = blocks.filter((block) => block.type === "image");
  const sourceNames = [...new Set(imageBlocks.map((block) => path.posix.basename(block.src.replace(/\\/g, "/"))))];
  if (sourceNames.length !== imageBlocks.length) throw new Error("Каждая иллюстрация в ARTICLE-BODY должна иметь уникальное имя.");
  const names = new Map();
  const plan = [];
  for (const sourceName of sourceNames) {
    const inputPath = inputs.get(sourceName);
    const directPath = path.join(BLOG_ROOT, sourceName);
    let publishedName = sourceName;
    let destination = directPath;
    let copy = false;
    if (inputPath) {
      if (fs.existsSync(directPath) && sha256(directPath) !== sha256(inputPath)) {
        const foreignReferences = filesReferencingAsset(sourceName, articlePath);
        const targetUses = articleHtml.includes(sourceName);
        if (foreignReferences.length || !targetUses) {
          publishedName = sourceName.startsWith(`${slug}-`) ? sourceName : `${slug}-${sourceName}`;
          destination = path.join(BLOG_ROOT, publishedName);
        }
      }
      if (fs.existsSync(destination) && sha256(destination) !== sha256(inputPath)) {
        const foreignReferences = filesReferencingAsset(publishedName, articlePath);
        if (foreignReferences.length || !articleHtml.includes(publishedName)) {
          throw new Error(`Нельзя безопасно заменить ${publishedName}: файл используется не только целевой статьёй.`);
        }
      }
      copy = !fs.existsSync(destination) || sha256(destination) !== sha256(inputPath);
    } else if (!fs.existsSync(directPath)) {
      const prefixed = path.join(BLOG_ROOT, `${slug}-${sourceName}`);
      if (!fs.existsSync(prefixed)) throw new Error(`Для ${sourceName} передайте --image <путь>.`);
      publishedName = path.basename(prefixed);
      destination = prefixed;
    }
    const metadata = inputPath ? await sharp(inputPath).metadata() : await sharp(destination).metadata();
    const dimensions = imageDimensionsFromSharpMetadata(metadata);
    if (!dimensions.width || !dimensions.height) throw new Error(`Не удалось определить размер ${sourceName}.`);
    names.set(sourceName, publishedName);
    plan.push({ sourceName, publishedName, inputPath, destination, copy, ...dimensions });
  }
  const unusedInputs = [...inputs.keys()].filter((name) => !sourceNames.includes(name));
  if (unusedInputs.length) throw new Error(`Переданы изображения, которых нет в ARTICLE-BODY: ${unusedInputs.join(", ")}`);
  return { names, plan };
}

function applyImageDimensions(markup, plan) {
  let html = markup;
  for (const image of plan) {
    const src = `../${image.publishedName}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const imagePattern = new RegExp(`<img\\b[^>]*src="${src}"[^>]*>`, "i");
    html = html.replace(imagePattern, (tag) => `${tag.replace(/\s+(?:width|height)="\d+"/gi, "").replace(/\s*\/>$/, "")} width="${image.width}" height="${image.height}" />`);
  }
  return html;
}

async function main(argv = process.argv.slice(2)) {
  const articlePath = resolveArticlePath(readArgument(argv, "--article"));
  const slug = articleSlug(articlePath);
  const sourceInput = readArgument(argv, "--source");
  if (!sourceInput) throw new Error("Укажите существующий --source <txt>.");
  const sourcePath = path.resolve(sourceInput);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) throw new Error("Укажите существующий --source <txt>.");
  const write = argv.includes("--write");
  const articleHtml = fs.readFileSync(articlePath, "utf8");
  const source = fs.readFileSync(sourcePath, "utf8");
  const { seo: sourceSeo, body } = extractSource(source);
  const seo = resolveSeoMetadata(sourceSeo, articleHtml);
  if (seo.slug !== slug) throw new Error(`Slug исходника ${seo.slug} не совпадает с ${slug}.`);
  const blocks = parseMarkdown(body);
  assertSourceImageCaptions(blocks, slug);
  const h1 = blocks[0].text;
  const { names, plan } = await prepareAssets({ articleHtml, articlePath, blocks, imageInputs: readArgumentValues(argv, "--image"), slug });
  const metaMatch = articleHtml.match(/<p class="article-meta">[\s\S]*?<\/p>/i);
  const tocMatch = articleHtml.match(/<!-- article-toc:start -->[\s\S]*?<!-- article-toc:end -->/i);
  const h1Match = articleHtml.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);
  const authorIndex = articleHtml.indexOf('<aside class="article-author"');
  if (!tocMatch || !h1Match || authorIndex < 0) throw new Error("Не найдены H1, TOC или article-author.");
  const intro = [];
  const content = blocks.slice(1);
  while (content[0] && content[0].type === "p") intro.push(content.shift());
  if (!intro.length) throw new Error("После H1 нужен вступительный абзац.");
  const prefix = articleHtml.slice(0, h1Match.index);
  const suffix = articleHtml.slice(authorIndex);
  const introHtml = intro.map((block, index) => `<p${index === 0 ? ' class="article-lead"' : ""}>${inlineMarkdown(block.text)}</p>`).join("\n");
  let bodyHtml = content.map((block) => renderBlock(block, names)).join("\n");
  bodyHtml = applyImageDimensions(bodyHtml, plan);
  let nextHtml = `${prefix}<h1>${inlineMarkdown(h1)}</h1>${metaMatch ? metaMatch[0] : ""}\n${introHtml}\n\n${tocMatch[0]}\n${bodyHtml}\n${suffix}`;
  nextHtml = replaceSingle(nextHtml, /<title>[\s\S]*?<\/title>/i, `<title>${escapeAttribute(seo.seo_title)}</title>`, "title");
  nextHtml = replaceSingle(nextHtml, /<meta name="description" content="[^"]*"\s*\/>/i, `<meta name="description" content="${escapeAttribute(seo.meta_description)}" />`, "description");
  nextHtml = replaceSingle(nextHtml, /<meta property="og:title" content="[^"]*"\s*\/>/i, `<meta property="og:title" content="${escapeAttribute(seo.seo_title)}" />`, "og:title");
  nextHtml = replaceSingle(nextHtml, /<meta property="og:description" content="[^"]*"\s*\/>/i, `<meta property="og:description" content="${escapeAttribute(seo.meta_description)}" />`, "og:description");
  nextHtml = nextHtml.replace(/<meta name="twitter:[^"]+" content="[^"]*"\s*\/>/gi, "");
  nextHtml = replaceSingle(nextHtml, /<link rel="canonical" href="[^"]*"\s*\/>/i, `<link rel="canonical" href="${escapeAttribute(seo.canonical)}" />`, "canonical");
  nextHtml = replaceSingle(nextHtml, /<meta property="og:url" content="[^"]*"\s*\/>/i, `<meta property="og:url" content="${escapeAttribute(seo.canonical)}" />`, "og:url");
  nextHtml = replaceSingle(nextHtml, /<meta property="article:published_time" content="[^"]*"\s*\/>/i, `<meta property="article:published_time" content="${seo.date_published}" />`, "article:published_time");
  if (/<meta property="article:modified_time"/i.test(nextHtml)) {
    nextHtml = replaceSingle(nextHtml, /<meta property="article:modified_time" content="[^"]*"\s*\/>/i, `<meta property="article:modified_time" content="${seo.date_modified}" />`, "article:modified_time");
  } else {
    nextHtml = replaceSingle(nextHtml, /(<meta property="article:published_time" content="[^"]*"\s*\/>)/i, `$1<meta property="article:modified_time" content="${seo.date_modified}" />`, "article:published_time");
  }
  const ogImage = (nextHtml.match(/<meta property="og:image" content="([^"]+)"/i) || [])[1];
  nextHtml = replaceSchema(nextHtml, (items) => {
    const post = items.find((item) => item["@type"] === "BlogPosting" || item["@type"] === "Article");
    const breadcrumbs = items.find((item) => item["@type"] === "BreadcrumbList");
    if (!post || !breadcrumbs) throw new Error("В JSON-LD нужны BlogPosting и BreadcrumbList.");
    post.headline = h1;
    post.description = seo.meta_description;
    post.url = seo.canonical;
    if (post.mainEntityOfPage && typeof post.mainEntityOfPage === "object") post.mainEntityOfPage["@id"] = seo.canonical;
    post.datePublished = seo.date_published;
    post.dateModified = seo.date_modified;
    post.image = [ogImage, ...plan.map((image) => `https://naklikay.ru/blog/${image.publishedName}`)].filter(Boolean);
  });
  const figureCount = (nextHtml.match(/<figure class="article-figure">/g) || []).length;
  const renderedContent = nextHtml.slice(nextHtml.indexOf("<!-- article-toc:end -->") + "<!-- article-toc:end -->".length, nextHtml.indexOf('<aside class="article-author"'));
  const headingCount = (renderedContent.match(/<h[23](?:\s|>)/g) || []).length;
  const expectedHeadings = blocks.filter((block) => block.type === "h2" || block.type === "h3").length;
  if ((nextHtml.match(/<h1(?:\s|>)/g) || []).length !== 1) throw new Error("После преобразования H1 не равен 1.");
  if (figureCount !== plan.length) throw new Error(`После преобразования figure=${figureCount}, ожидалось ${plan.length}.`);
  if (headingCount !== expectedHeadings) throw new Error(`После преобразования заголовков=${headingCount}, ожидалось ${expectedHeadings}.`);
  if (/�|undefined|\?\?\?\?|TODO|PLACEHOLDER|<SEO-META>|<ARTICLE-BODY>/i.test(nextHtml)) throw new Error("Найдены служебные или повреждённые маркеры.");
  if (write) {
    for (const image of plan.filter((item) => item.copy)) fs.copyFileSync(image.inputPath, image.destination);
    fs.writeFileSync(articlePath, nextHtml, "utf8");
  }
  return { article: slug, mode: write ? "write" : "check", h1: 1, headings: expectedHeadings, figures: figureCount, tables: blocks.filter((block) => block.type === "table").length, assets: plan.map(({ sourceName, publishedName, copy, width, height }) => ({ sourceName, publishedName, copy, width, height })) };
}

module.exports = { main };
if (require.main === module) main().then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
