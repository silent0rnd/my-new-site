const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("@playwright/test");
const { readArgument, resolveArticlePath, PROJECT_ROOT } = require("../scripts/blog-refresh-lib");

const articlePath = resolveArticlePath(readArgument(process.argv.slice(2), "--article"));
const relativeUrl = `/${path.relative(PROJECT_ROOT, articlePath).replace(/\\/g, "/")}`;
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
let stage = "запуск";
const watchdog = setTimeout(() => {
  console.error(`Визуальная проверка превысила 20 секунд: ${stage}.`);
  process.exit(1);
}, 20000);

(async () => {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const requested = path.resolve(PROJECT_ROOT, `.${pathname}`);
    if (!requested.startsWith(`${PROJECT_ROOT}${path.sep}`) || !fs.existsSync(requested) || !fs.statSync(requested).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": mime[path.extname(requested).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(requested).pipe(response);
  });
  stage = "локальный сервер";
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  const results = [];
  try {
    stage = "запуск Chromium";
    browser = await chromium.launch({ headless: true });
    for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
      stage = `страница ${viewport.name}`;
      const page = await browser.newPage({ viewport });
      const errors = [];
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === "127.0.0.1") route.continue();
        else route.abort();
      });
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}${relativeUrl}`, { waitUntil: "domcontentloaded" });
      const figures = page.locator("figure.article-figure img");
      await page.evaluate(() => {
        document.querySelectorAll("figure.article-figure img").forEach((image) => { image.loading = "eager"; });
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await page.waitForTimeout(1000);
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        brokenImages: [...document.querySelectorAll("figure.article-figure img")].filter((image) => !image.complete || image.naturalWidth === 0).length,
        wideFigures: [...document.querySelectorAll("figure.article-figure")].filter((figure) => figure.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length,
        badTables: [...document.querySelectorAll("article table")].filter((table) => !table.closest(".article-table-wrap")).length,
      }));
      assert.strictEqual(state.overflow, false, `${viewport.name}: горизонтальная прокрутка страницы.`);
      assert.strictEqual(state.brokenImages, 0, `${viewport.name}: есть незагруженные иллюстрации.`);
      assert.strictEqual(state.wideFigures, 0, `${viewport.name}: иллюстрация выходит за экран.`);
      assert.strictEqual(state.badTables, 0, `${viewport.name}: таблица без адаптивной оболочки.`);
      assert.deepStrictEqual(errors, [], `${viewport.name}: ошибки страницы: ${errors.join(" | ")}`);
      results.push({ viewport: viewport.name, figures: await figures.count(), status: "ok" });
      await page.close();
    }
    clearTimeout(watchdog);
    console.log(JSON.stringify({ article: path.basename(path.dirname(articlePath)), results }));
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { clearTimeout(watchdog); console.error(error.stack || error.message); process.exitCode = 1; });
