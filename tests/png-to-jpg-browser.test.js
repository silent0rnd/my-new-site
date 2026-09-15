const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const toolPath = path.join(root, "tools", "png-to-jpg");
const validPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL7uAAAAABJRU5ErkJggg==", "base64");

function cspFromHtaccess() {
  const htaccess = fs.readFileSync(path.join(root, ".htaccess"), "utf8");
  const match = htaccess.match(/Content-Security-Policy "([^"]+)"/);
  assert.ok(match, "Content-Security-Policy должен быть задан в .htaccess");
  return match[1];
}

test("PNG-конвертер загружает blob-превью и создаёт JPG при CSP сайта", async () => {
  const csp = cspFromHtaccess();
  assert.match(csp, /img-src 'self' data: https: blob:/);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const errors = [];
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await context.route("https://naklikay.ru/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const files = {
      "/tools/png-to-jpg/": [path.join(toolPath, "index.html"), "text/html; charset=utf-8"],
      "/tools/png-to-jpg/png-to-jpg.js": [path.join(toolPath, "png-to-jpg.js"), "text/javascript; charset=utf-8"],
      "/tools/png-to-jpg/vendor/jszip.min.js": [path.join(toolPath, "vendor", "jszip.min.js"), "text/javascript; charset=utf-8"],
      "/styles.css": [path.join(root, "styles.css"), "text/css; charset=utf-8"],
      "/script.js": [path.join(root, "script.js"), "text/javascript; charset=utf-8"]
    };
    const file = files[pathname];
    if (!file) return route.fulfill({ status: 204, body: "" });
    return route.fulfill({
      status: 200,
      contentType: file[1],
      headers: pathname === "/tools/png-to-jpg/" ? { "content-security-policy": csp } : {},
      body: fs.readFileSync(file[0])
    });
  });

  try {
    await page.goto("https://naklikay.ru/tools/png-to-jpg/");
    await page.locator("[data-png-file-input]").setInputFiles({ name: "valid.png", mimeType: "image/png", buffer: validPng });
    await page.locator(".png-jpg-file__preview").evaluate((image) => image.decode());
    await page.locator(".png-jpg-file__result").waitFor({ state: "visible" });

    assert.equal(await page.locator(".png-jpg-file__preview").evaluate((image) => image.naturalWidth), 1);
    assert.equal(await page.locator(".png-jpg-file__error").count(), 0);
    assert.equal(await page.locator(".png-jpg-file__result").count(), 1);
    assert.equal(errors.some((message) => message.includes("blob:") && message.includes("img-src")), false);
  } finally {
    await context.close();
    await browser.close();
  }
});
