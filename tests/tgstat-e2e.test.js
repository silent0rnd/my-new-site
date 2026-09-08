const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");
const XLSX = require("xlsx");

const root = path.resolve(__dirname, "..");
const toolPath = path.join(root, "tools", "vygruzka-kanalov-iz-tgstat");

function generatedBookmarklet() {
  const source = fs.readFileSync(path.join(toolPath, "bookmarklet.generated.js"), "utf8");
  const match = source.match(/^window\.TGSTAT_BOOKMARKLET_CODE=(.*);\s*$/s);
  if (!match) throw new Error("Не найден собранный bookmarklet.");
  return JSON.parse(match[1]);
}

function contentType(filename) {
  if (filename.endsWith(".html")) return "text/html; charset=utf-8";
  if (filename.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filename.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

function channelEnvelope(count, version = 2) {
  const channels = Array.from({ length: count }, (_, index) => ({
    name: `Канал ${index + 1}`,
    username: `@channel_${index + 1}`,
    telegramUrl: `https://t.me/channel_${index + 1}`,
    tgstatUrl: `https://tgstat.ru/channel/@channel_${index + 1}/stat`,
    subscribers: 1000 + index,
    postReach: 500 + index,
    err: 12.5,
    citationIndex: 20 + index,
    category: "Маркетинг",
    extraMetrics: {}
  }));
  const recognized = { name: count, username: count, telegramUrl: count, tgstatUrl: count, subscribers: count, postReach: count, err: count, citationIndex: count, category: count };
  return { type: "naklikay:tgstat-import", version, payload: { channels, diagnostics: { rawCount: count, deduplicatedCount: count, duplicatesRemoved: 0, recognized } } };
}

test("TGStat bookmarklet uses the installation URL and shows a fallback when navigation is blocked", async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  try {
    const githubBase = "https://example.github.io/demo";
    await context.route("https://example.github.io/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const files = {
        "/demo/tools/vygruzka-kanalov-iz-tgstat/": path.join(toolPath, "index.html"),
        "/demo/tools/vygruzka-kanalov-iz-tgstat/tgstat-parser.js": path.join(toolPath, "tgstat-parser.js"),
        "/demo/tools/vygruzka-kanalov-iz-tgstat/bookmarklet.generated.js": path.join(toolPath, "bookmarklet.generated.js"),
        "/demo/tools/vygruzka-kanalov-iz-tgstat/tgstat-tool.js": path.join(toolPath, "tgstat-tool.js"),
        "/demo/tools/mediaplan/vendor/xlsx.full.min.js": path.join(root, "tools", "mediaplan", "vendor", "xlsx.full.min.js"),
        "/demo/script.js": path.join(root, "script.js"),
        "/demo/styles.css": path.join(root, "styles.css")
      };
      const filename = files[pathname];
      if (!filename) return route.fulfill({ status: 404, body: "" });
      return route.fulfill({ status: 200, contentType: contentType(filename), body: fs.readFileSync(filename) });
    });
    await context.route("https://tgstat.ru/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fs.readFileSync(path.join(__dirname, "fixtures", "tgstat", "channel-list.html"), "utf8") });
    });
    await context.route("http://127.0.0.1:4173/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const files = {
        "/tools/vygruzka-kanalov-iz-tgstat/": path.join(toolPath, "index.html"),
        "/tools/vygruzka-kanalov-iz-tgstat/tgstat-parser.js": path.join(toolPath, "tgstat-parser.js"),
        "/tools/vygruzka-kanalov-iz-tgstat/bookmarklet.generated.js": path.join(toolPath, "bookmarklet.generated.js"),
        "/tools/vygruzka-kanalov-iz-tgstat/tgstat-tool.js": path.join(toolPath, "tgstat-tool.js"),
        "/tools/mediaplan/vendor/xlsx.full.min.js": path.join(root, "tools", "mediaplan", "vendor", "xlsx.full.min.js"),
        "/script.js": path.join(root, "script.js"),
        "/styles.css": path.join(root, "styles.css")
      };
      const filename = files[pathname];
      if (!filename) return route.fulfill({ status: 404, body: "" });
      return route.fulfill({ status: 200, contentType: contentType(filename), body: fs.readFileSync(filename) });
    });

    const installer = await context.newPage();
    await installer.goto(`${githubBase}/tools/vygruzka-kanalov-iz-tgstat/`);
    const bookmarklet = await installer.locator("[data-tgstat-bookmarklet]").getAttribute("href");
    assert.ok(bookmarklet && bookmarklet.startsWith("javascript:"));
    assert.ok(bookmarklet.includes(`${githubBase}/tools/vygruzka-kanalov-iz-tgstat/`));
    assert.equal(await installer.locator("[data-tgstat-bookmarklet]").innerText(), "Выгрузить TGStat v2");
    await installer.goto("http://127.0.0.1:4173/tools/vygruzka-kanalov-iz-tgstat/");
    const localBookmarklet = await installer.locator("[data-tgstat-bookmarklet]").getAttribute("href");
    assert.ok(localBookmarklet.includes("http://127.0.0.1:4173/tools/vygruzka-kanalov-iz-tgstat/"));
    await installer.close();

    const localTgstat = await context.newPage();
    await localTgstat.goto("https://tgstat.ru/channels/search");
    await localTgstat.evaluate((code) => {
      window.open = () => null;
      const link = document.createElement("a");
      link.id = "test-local-bookmarklet";
      link.href = code;
      link.textContent = "Export locally";
      document.body.appendChild(link);
    }, localBookmarklet);
    await localTgstat.locator("#test-local-bookmarklet").click();
    await localTgstat.waitForURL("http://127.0.0.1:4173/tools/vygruzka-kanalov-iz-tgstat/", { timeout: 2000 });
    await localTgstat.locator("[data-tgstat-results]").waitFor({ state: "visible" });
    assert.equal(await localTgstat.locator("[data-tgstat-tbody] tr").count(), 2);
    await localTgstat.close();

    const tgstat = await context.newPage();
    await tgstat.goto("https://tgstat.ru/channels/search");
    await tgstat.evaluate((code) => {
      window.open = () => null;
      const link = document.createElement("a");
      link.id = "test-blocked-popup-bookmarklet";
      link.href = code;
      link.textContent = "Export";
      document.body.appendChild(link);
    }, bookmarklet);
    await tgstat.locator("#test-blocked-popup-bookmarklet").click();
    await tgstat.waitForURL(`${githubBase}/tools/vygruzka-kanalov-iz-tgstat/`, { timeout: 2000 });
    await tgstat.locator("[data-tgstat-results]").waitFor({ state: "visible" });
    assert.equal(await tgstat.locator("[data-tgstat-tbody] tr").count(), 2);

    const blocked = await context.newPage();
    await blocked.goto("https://tgstat.ru/channels/search");
    await blocked.evaluate((code) => {
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.dataset.naklikayTgstatNavigation) return;
        return originalClick.call(this);
      };
      Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: async () => { throw new Error("denied"); } });
      document.execCommand = (command) => command === "copy";
      const link = document.createElement("a");
      link.id = "test-blocked-navigation-bookmarklet";
      link.href = code;
      link.textContent = "Export";
      document.body.appendChild(link);
    }, bookmarklet);
    await blocked.locator("#test-blocked-navigation-bookmarklet").click();
    const fallbackPanel = blocked.locator("#naklikay-tgstat-fallback");
    await fallbackPanel.waitFor({ state: "visible", timeout: 3000 });
    const fallbackData = JSON.parse(await fallbackPanel.locator("textarea").inputValue());
    assert.equal(fallbackData.version, 2);
    assert.equal(fallbackData.payload.channels.length, 2);
    assert.equal(JSON.stringify(fallbackData).includes("<!doctype html>"), false);
    await fallbackPanel.getByRole("button", { name: "Скопировать данные" }).click();
    await fallbackPanel.getByText(/Данные каналов скопированы/).waitFor();
  } finally {
    await context.close();
    await browser.close();
  }
});

test("TGStat -> bookmarklet -> переход в сервис -> таблица -> clipboard -> XLSX", async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const browserErrors = [];
  context.on("page", (page) => {
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  });
  try {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://naklikay.ru" });
    await context.route("https://tgstat.ru/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: fs.readFileSync(path.join(__dirname, "fixtures", "tgstat", "channel-list.html"), "utf8") });
    });
    await context.route("https://naklikay.ru/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const files = {
        "/tools/vygruzka-kanalov-iz-tgstat/": path.join(toolPath, "index.html"),
        "/tools/vygruzka-kanalov-iz-tgstat/tgstat-parser.js": path.join(toolPath, "tgstat-parser.js"),
        "/tools/vygruzka-kanalov-iz-tgstat/bookmarklet.generated.js": path.join(toolPath, "bookmarklet.generated.js"),
        "/tools/vygruzka-kanalov-iz-tgstat/tgstat-tool.js": path.join(toolPath, "tgstat-tool.js"),
        "/tools/mediaplan/vendor/xlsx.full.min.js": path.join(root, "tools", "mediaplan", "vendor", "xlsx.full.min.js"),
        "/script.js": path.join(root, "script.js"),
        "/styles.css": path.join(root, "styles.css")
      };
      const filename = files[pathname];
      if (!filename) return route.fulfill({ status: 204, body: "" });
      return route.fulfill({ status: 200, contentType: contentType(filename), body: fs.readFileSync(filename) });
    });

    const installer = await context.newPage();
    await installer.goto("https://naklikay.ru/tools/vygruzka-kanalov-iz-tgstat/");
    const bookmarklet = await installer.locator("[data-tgstat-bookmarklet]").getAttribute("href");
    await installer.close();

    const tgstat = await context.newPage();
    await tgstat.goto("https://tgstat.ru/channels/search");
    await tgstat.evaluate((bookmarklet) => {
      const link = document.createElement("a");
      link.id = "test-tgstat-bookmarklet";
      link.href = bookmarklet;
      link.textContent = "Выгрузить TGStat";
      document.body.appendChild(link);
    }, bookmarklet);
    await Promise.all([
      tgstat.waitForURL("https://naklikay.ru/tools/vygruzka-kanalov-iz-tgstat/"),
      tgstat.locator("#test-tgstat-bookmarklet").click()
    ]);
    const service = tgstat;
    await service.waitForLoadState("domcontentloaded");
    await service.locator("[data-tgstat-results]").waitFor({ state: "visible" });
    assert.equal(await service.evaluate(() => location.hash), "");
    assert.equal(context.pages().length, 1);
    assert.equal(await service.locator("[data-tgstat-tbody] tr").count(), 2);
    assert.match(await service.locator("[data-tgstat-status]").innerText(), /после удаления дублей 2/);

    assert.equal(await service.locator("[data-filter]").count(), 0);

    const rowCheckboxes = service.locator("[data-channel-select]");
    assert.equal(await rowCheckboxes.count(), 2);
    await rowCheckboxes.nth(0).uncheck();
    await service.locator("[data-tgstat-export='links']").click();
    assert.equal((await service.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"), "https://t.me/test_channel");
    await rowCheckboxes.nth(0).check();

    const csvPromise = service.waitForEvent("download");
    await service.locator("[data-tgstat-export='csv']").click();
    const csvDownload = await csvPromise;
    const csv = fs.readFileSync(await csvDownload.path(), "utf8");
    assert.ok(csv.startsWith("\ufeffНазвание;Username;"));

    const downloadPromise = service.waitForEvent("download");
    await service.locator("[data-tgstat-export='xlsx']").click();
    const download = await downloadPromise;
    const filename = await download.path();
    const workbook = XLSX.readFile(filename);
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    assert.equal(rows.length, 3);
    assert.equal(typeof rows[1][3], "number");
    assert.equal(rows[1][3], 1200000);

    const manual = await context.newPage();
    await manual.setViewportSize({ width: 390, height: 844 });
    await manual.goto("https://naklikay.ru/tools/vygruzka-kanalov-iz-tgstat/");
    const instructionButtons = manual.locator(".tgstat-instructions .utm-button");
    assert.equal(await instructionButtons.count(), 2);
    for (let index = 0; index < 2; index += 1) {
      await instructionButtons.nth(index).hover();
      assert.equal(await instructionButtons.nth(index).evaluate((button) => getComputedStyle(button).borderBottomWidth), "0px");
    }
    await manual.locator(".tgstat-fallback summary").click();
    const fallbackText = await manual.locator(".tgstat-fallback").innerText();
    assert.doesNotMatch(fallbackText, /Ctrl\s*\+\s*A|Ctrl\s*\+\s*C/);
    assert.match(fallbackText, /только найденные каналы/i);
    assert.equal(await manual.locator("[data-tgstat-file]").count(), 0);

    const importButton = manual.locator("[data-tgstat-import]");
    const pasteTarget = manual.locator("[data-tgstat-paste-target]");
    assert.equal(await pasteTarget.isVisible(), true);
    assert.equal(await importButton.evaluate((button) => button.classList.contains("utm-button--ghost")), false);
    const referenceStyle = await instructionButtons.first().evaluate((button) => {
      const style = getComputedStyle(button);
      return { color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight };
    });
    const pasteStyle = await importButton.evaluate((button) => {
      const style = getComputedStyle(button);
      return { color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight };
    });
    assert.deepEqual(pasteStyle, referenceStyle);

    await manual.evaluate(() => {
      window.__tgstatClipboardReadCalls = 0;
      Object.defineProperty(navigator.clipboard, "read", { configurable: true, value: async () => { window.__tgstatClipboardReadCalls += 1; throw new Error("denied"); } });
    });
    for (const [count, version] of [[2, 1], [200, 2], [1000, 2]]) {
      await pasteTarget.fill(JSON.stringify(channelEnvelope(count, version)));
      await importButton.click();
      await manual.waitForFunction((expected) => document.querySelectorAll("[data-tgstat-tbody] tr").length === expected, count);
      assert.equal(await manual.locator("[data-tgstat-tbody] tr").count(), count);
    }
    assert.equal(await manual.evaluate(() => window.__tgstatClipboardReadCalls), 0);

    await pasteTarget.fill("<html><body>Посторонний текст TGStat</body></html>");
    await importButton.click();
    assert.match(await manual.locator("[data-tgstat-status]").innerText(), /повреждены|не полностью/);
    assert.equal(await manual.locator(".tgstat-table-wrap > .article-table-wrap").count(), 0);
    assert.deepEqual(browserErrors, []);
  } finally {
    await context.close();
    await browser.close();
  }
});
