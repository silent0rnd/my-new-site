const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { detectColumns, normalizePhone, normalizeEmail, processRows, toCsv, sha256, hashRecords } = require("../tools/podgotovka-fayla-dlya-yandex-auditoriy/audience.js");

global.crypto = crypto.webcrypto;

function createWorkerForTest() {
  const root = path.resolve(__dirname, "..");
  const messages = [];
  const context = vm.createContext({ TextDecoder, TextEncoder, crypto: crypto.webcrypto, self: { postMessage: (message) => messages.push(message) } });
  context.importScripts = (...paths) => paths.forEach((script) => {
    if (script.startsWith("audience.js")) vm.runInContext(fs.readFileSync(path.join(root, "tools/podgotovka-fayla-dlya-yandex-auditoriy/audience.js"), "utf8"), context);
    else context.XLSX = require("xlsx");
  });
  vm.runInContext(fs.readFileSync(path.join(root, "tools/podgotovka-fayla-dlya-yandex-auditoriy/audience-worker.js"), "utf8"), context);
  return { context, messages };
}

test("распознаёт русские и английские названия колонок", () => {
  assert.deepStrictEqual(detectColumns(["Телефон", "E-mail"]), { phone: 0, email: 1, mixed: null });
  assert.deepStrictEqual(detectColumns(["client", "mail"]), { phone: null, email: 1, mixed: null });
});

test("распознаёт список email без строки заголовков", () => {
  const rows = [["savchenko-sa@mail.ru"], ["ve sti17.ie@gmail.com"], ["zao,esv@mail.ru"], ["kenstroycorp.com"]];
  assert.deepStrictEqual(detectColumns(["Колонка 1"], rows), { phone: null, email: 0, mixed: null });
  const output = processRows(rows, { phone: null, email: 0 });
  assert.deepStrictEqual(output.records, [{ phone: "", email: "savchenko-sa@mail.ru" }]);
  assert.strictEqual(output.metrics.errors, 3);
  assert.strictEqual(output.issues[0].suggestion, "email: vesti17.ie@gmail.com");
  const repaired = processRows(rows, { phone: null, email: 0 }, { rowPolicy: "repair" });
  assert.deepStrictEqual(repaired.records, [{ phone: "", email: "savchenko-sa@mail.ru" }, { phone: "", email: "vesti17.ie@gmail.com" }, { phone: "", email: "zaoesv@mail.ru" }]);
  assert.strictEqual(repaired.metrics.errors, 1);
  assert.strictEqual(repaired.metrics.emailsFixed, 2);
});

test("Worker читает выбранный CSV из переданного ArrayBuffer", async () => {
  const worker = createWorkerForTest();
  const buffer = new TextEncoder().encode("email\nuser@example.ru").buffer;
  await worker.context.self.onmessage({ data: { type: "read", file: { name: "contacts.csv" }, buffer } });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(worker.messages[0])), { type: "parsed", headers: ["email"], rows: [["user@example.ru"]], suggestedMapping: { phone: null, email: 0, mixed: null } });
});

test("разделяет смешанный список из одной колонки", () => {
  const rows = [["savchenko-sa@mail.ru"], ["8 900 235-61-58"], ["ykytenok@mail.ru"]];
  assert.deepStrictEqual(detectColumns(["Контакты"], rows), { phone: null, email: null, mixed: 0 });
  const output = processRows(rows, { phone: null, email: null, mixed: 0 });
  assert.deepStrictEqual(output.records, [
    { phone: "", email: "savchenko-sa@mail.ru" },
    { phone: "79002356158", email: "" },
    { phone: "", email: "ykytenok@mail.ru" }
  ]);
  assert.strictEqual(toCsv(output.records), "phone,email\r\n,savchenko-sa@mail.ru\r\n79002356158,\r\n,ykytenok@mail.ru");
});

test("нормализует российские телефоны и не меняет международный", () => {
  assert.deepStrictEqual(normalizePhone("+7 (999) 555-11-11"), { value: "79995551111", valid: true, changed: true });
  assert.strictEqual(normalizePhone("8 999 555 11 11").value, "79995551111");
  assert.strictEqual(normalizePhone("9995551111").value, "79995551111");
  assert.strictEqual(normalizePhone("+44 20 7946 0958").value, "442079460958");
  assert.deepStrictEqual(normalizePhone("+7*999 555-11-11"), { value: "", valid: false, changed: false, suggestion: "79995551111" });
  assert.strictEqual(normalizePhone("+7*999 555-11-11", true).value, "79995551111");
  ["79037175", "7901093846", "78803981232", "88007004745"].forEach((phone) => assert.strictEqual(normalizePhone(phone).valid, false));
});

test("нормализует email, находит недопустимые символы и не угадывает структуру", () => {
  assert.deepStrictEqual(normalizeEmail(" User@Example.RU "), { value: "user@example.ru", valid: true, changed: true });
  assert.strictEqual(normalizeEmail("not-an-email").valid, false);
  assert.deepStrictEqual(normalizeEmail("user!#@example.ru"), { value: "", valid: false, changed: false, suggestion: "user@example.ru" });
  assert.strictEqual(normalizeEmail("user@@example.ru", true).suggestion, "");
});

test("сохраняет пары, удаляет только полные дубли и исключает пустые", () => {
  const output = processRows([["8 999 555-11-11", "USER@EXAMPLE.RU"], ["79995551111", "user@example.ru"], ["", "wrong"], ["+7 900 000-00-00", ""]], { phone: 0, email: 1 });
  assert.deepStrictEqual(output.records, [{ phone: "79995551111", email: "user@example.ru" }, { phone: "79000000000", email: "" }]);
  assert.strictEqual(output.metrics.duplicates, 1);
  assert.strictEqual(output.metrics.errors, 1);
});

test("принимает таблицы только с телефоном или только с email и предупреждение возможно при менее 100 строках", () => {
  const phones = processRows([["+7 999 000-00-00"]], { phone: 0, email: null });
  const emails = processRows([["CLIENT@EXAMPLE.RU"]], { phone: null, email: 0 });
  assert.deepStrictEqual(phones.records, [{ phone: "79990000000", email: "" }]);
  assert.deepStrictEqual(emails.records, [{ phone: "", email: "client@example.ru" }]);
  assert.ok(phones.metrics.valid < 100);
});

test("CSV имеет только phone,email и экранирует значения", () => {
  assert.strictEqual(toCsv([{ phone: "7999", email: "a@b.ru" }]), "phone,email\r\n7999,a@b.ru");
  assert.strictEqual(toCsv([{ phone: "", email: "a@b.ru" }, { phone: "", email: "b@b.ru" }]), "email\r\na@b.ru\r\nb@b.ru");
});

test("SHA-256 эталонно считается средствами браузерной платформы", async () => {
  assert.strictEqual(await sha256("79995551111"), "22846ab8f79870871eb44f653419a4a5069301827d8ae75b6c2a88e4989a364e");
  assert.deepStrictEqual(await hashRecords([{ phone: "79995551111", email: "" }]), [{ phone: "22846ab8f79870871eb44f653419a4a5069301827d8ae75b6c2a88e4989a364e", email: "" }]);
});
