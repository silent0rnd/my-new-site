const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const sharp = require("sharp");

const {
  RESPONSIVE_SIZES,
  TARGET_WIDTHS,
  WEBP_QUALITY,
  candidateWidths,
  optimizeArticle,
} = require("../scripts/optimize-blog-images");

test("responsive image settings remain stable", () => {
  assert.deepEqual(TARGET_WIDTHS, [640, 1080, 1720]);
  assert.equal(WEBP_QUALITY, 92);
  assert.equal(RESPONSIVE_SIZES, "(max-width: 720px) calc(100vw - 36px), 860px");
  assert.deepEqual(candidateWidths(2896), [640, 1080, 1720]);
  assert.deepEqual(candidateWidths(1200), [640, 1080, 1200]);
  assert.deepEqual(candidateWidths(600), [600]);
});

test("optimizer creates WebP variants and idempotent picture markup", async (context) => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "naklikay-blog-images-"));
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));

  const articleDirectory = path.join(temporaryRoot, "blog", "sample-article");
  const sourcePath = path.join(temporaryRoot, "blog", "sample.jpg");
  const articlePath = path.join(articleDirectory, "index.html");
  fs.mkdirSync(articleDirectory, { recursive: true });
  await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "#f5a623" },
  }).jpeg({ quality: 95 }).toFile(sourcePath);
  fs.writeFileSync(
    articlePath,
    '<article><figure class="article-figure"><img src="../sample.jpg" alt="Тестовая иллюстрация" /></figure></article>',
    "utf8",
  );

  const optimizerOptions = { blogRoot: path.join(temporaryRoot, "blog") };
  const firstRun = await optimizeArticle(articlePath, optimizerOptions);
  assert.equal(firstRun.images.length, 1);
  assert.equal(firstRun.images[0].variants.length, 3);
  for (const width of [640, 1080, 1200]) {
    assert.equal(fs.existsSync(path.join(temporaryRoot, "blog", `sample-${width}.webp`)), true);
  }

  const firstHtml = fs.readFileSync(articlePath, "utf8");
  assert.match(firstHtml, /<picture data-blog-responsive="true">/);
  assert.match(firstHtml, /sample-640\.webp 640w, \.\.\/sample-1080\.webp 1080w, \.\.\/sample-1200\.webp 1200w/);
  assert.match(firstHtml, /sizes="\(max-width: 720px\) calc\(100vw - 36px\), 860px"/);
  assert.match(firstHtml, /width="1200" height="900" loading="lazy" decoding="async"/);

  await optimizeArticle(articlePath, optimizerOptions);
  const secondHtml = fs.readFileSync(articlePath, "utf8");
  assert.equal(secondHtml, firstHtml);
  assert.equal((secondHtml.match(/<picture data-blog-responsive="true">/g) || []).length, 1);
});
