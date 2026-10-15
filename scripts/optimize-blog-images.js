const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BLOG_ROOT = path.join(PROJECT_ROOT, "blog");
const TARGET_WIDTHS = [640, 1080, 1720];
const WEBP_QUALITY = 92;
const RESPONSIVE_SIZES = "(max-width: 720px) calc(100vw - 36px), 860px";

function normalizeUrlPath(value) {
  return value.split(path.sep).join("/");
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
  return match ? match[1] : null;
}

function setAttribute(tag, name, value) {
  const encodedValue = escapeAttribute(value);
  const attributePattern = new RegExp(`\\s${name}=["'][^"']*["']`, "i");
  if (attributePattern.test(tag)) {
    return tag.replace(attributePattern, ` ${name}="${encodedValue}"`);
  }

  return tag.replace(/\s*\/?\s*>$/, (ending) => ` ${name}="${encodedValue}"${ending}`);
}

function displayedDimensions(metadata) {
  const shouldSwap = [5, 6, 7, 8].includes(metadata.orientation);
  return {
    width: shouldSwap ? metadata.height : metadata.width,
    height: shouldSwap ? metadata.width : metadata.height,
  };
}

function candidateWidths(sourceWidth) {
  const maximumWebWidth = Math.min(sourceWidth, TARGET_WIDTHS[TARGET_WIDTHS.length - 1]);
  return [...new Set([...TARGET_WIDTHS.filter((width) => width < maximumWebWidth), maximumWebWidth])]
    .filter((width) => width > 0)
    .sort((first, second) => first - second);
}

function resolveArticlePath(articleInput, blogRoot = BLOG_ROOT) {
  if (!articleInput) {
    throw new Error("Укажите статью: --article <slug или путь к index.html>.");
  }

  const inputPath = path.isAbsolute(articleInput)
    ? articleInput
    : articleInput.includes("/") || articleInput.includes("\\")
      ? path.resolve(PROJECT_ROOT, articleInput)
      : path.join(blogRoot, articleInput, "index.html");
  const articlePath = path.extname(inputPath) ? inputPath : path.join(inputPath, "index.html");
  const relativeToBlog = path.relative(blogRoot, articlePath);

  if (relativeToBlog.startsWith("..") || path.isAbsolute(relativeToBlog)) {
    throw new Error("Статья должна находиться внутри каталога blog.");
  }
  if (!fs.existsSync(articlePath)) {
    throw new Error(`Файл статьи не найден: ${articlePath}`);
  }

  return articlePath;
}

async function createWebpVariants(sourcePath, widths) {
  const extension = path.extname(sourcePath);
  const basePath = sourcePath.slice(0, -extension.length);
  const outputs = [];

  for (const width of widths) {
    const outputPath = `${basePath}-${width}.webp`;
    await sharp(sourcePath)
      .rotate()
      .resize({ width, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
      .toFile(outputPath);
    outputs.push({ width, outputPath });
  }

  return outputs;
}

function buildPictureMarkup(imgTag, variants, articleDirectory, dimensions) {
  let normalizedImg = imgTag;
  normalizedImg = setAttribute(normalizedImg, "width", dimensions.width);
  normalizedImg = setAttribute(normalizedImg, "height", dimensions.height);
  normalizedImg = setAttribute(normalizedImg, "loading", "lazy");
  normalizedImg = setAttribute(normalizedImg, "decoding", "async");

  const srcset = variants
    .map(({ width, outputPath }) => {
      const relativePath = normalizeUrlPath(path.relative(articleDirectory, outputPath));
      return `${relativePath} ${width}w`;
    })
    .join(", ");

  return `<picture data-blog-responsive="true"><source type="image/webp" srcset="${escapeAttribute(srcset)}" sizes="${RESPONSIVE_SIZES}" />${normalizedImg}</picture>`;
}

async function optimizeArticle(articleInput, options = {}) {
  const articlePath = resolveArticlePath(articleInput, options.blogRoot || BLOG_ROOT);
  const articleDirectory = path.dirname(articlePath);
  const initialHtml = fs.readFileSync(articlePath, "utf8");
  const figurePattern = /<figure\b[^>]*class=["'][^"']*\barticle-figure\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/gi;
  const figures = [...initialHtml.matchAll(figurePattern)];

  if (figures.length === 0) {
    return { articlePath, figures: 0, images: [], changed: false };
  }

  let html = initialHtml;
  const images = [];

  for (const figureMatch of figures.reverse()) {
    const figure = figureMatch[0];
    const imgMatch = figure.match(/<img\b[^>]*>/i);
    if (!imgMatch) continue;

    const imgTag = imgMatch[0];
    const src = getAttribute(imgTag, "src");
    if (!src || /^(?:https?:|data:)/i.test(src)) {
      throw new Error(`Не удалось обработать локальное изображение в ${articlePath}: ${src || "src отсутствует"}`);
    }

    const sourcePath = path.resolve(articleDirectory, src.split(/[?#]/, 1)[0]);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Исходное изображение не найдено: ${sourcePath}`);
    }

    const metadata = await sharp(sourcePath).metadata();
    const dimensions = displayedDimensions(metadata);
    if (!dimensions.width || !dimensions.height) {
      throw new Error(`Не удалось определить размеры изображения: ${sourcePath}`);
    }

    const widths = candidateWidths(dimensions.width);
    const variants = await createWebpVariants(sourcePath, widths);
    const picture = buildPictureMarkup(imgTag, variants, articleDirectory, dimensions);
    const updatedFigure = /<picture\b[^>]*data-blog-responsive=["']true["'][^>]*>[\s\S]*?<\/picture>/i.test(figure)
      ? figure.replace(/<picture\b[^>]*data-blog-responsive=["']true["'][^>]*>[\s\S]*?<\/picture>/i, picture)
      : figure.replace(imgTag, picture);

    html = `${html.slice(0, figureMatch.index)}${updatedFigure}${html.slice(figureMatch.index + figure.length)}`;
    images.push({ sourcePath, variants });
  }

  if (html !== initialHtml) {
    fs.writeFileSync(articlePath, html, "utf8");
  }

  return {
    articlePath,
    figures: figures.length,
    images: images.reverse(),
    changed: html !== initialHtml,
  };
}

function readArticleArgument(argv) {
  const articleIndex = argv.indexOf("--article");
  return articleIndex === -1 ? null : argv[articleIndex + 1];
}

async function main() {
  const result = await optimizeArticle(readArticleArgument(process.argv.slice(2)));
  const variants = result.images.reduce((total, image) => total + image.variants.length, 0);
  console.log(`Статья: ${path.relative(PROJECT_ROOT, result.articlePath)}`);
  console.log(`Иллюстраций: ${result.images.length}`);
  console.log(`Создано WebP-версий: ${variants}`);
  console.log(`HTML обновлён: ${result.changed ? "да" : "нет"}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  RESPONSIVE_SIZES,
  TARGET_WIDTHS,
  WEBP_QUALITY,
  candidateWidths,
  optimizeArticle,
};
