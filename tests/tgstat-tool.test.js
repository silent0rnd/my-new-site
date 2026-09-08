const test = require("node:test");
const assert = require("node:assert/strict");
const XLSX = require("xlsx");
const core = require("../tools/vygruzka-kanalov-iz-tgstat/tgstat-tool.js");

const channels = [
  { name: "Альфа", username: "@alpha", telegramUrl: "https://t.me/alpha", subscribers: 1200, postReach: 450, err: 12.5, citationIndex: 7 },
  { name: "Бета; медиа", username: "@beta", telegramUrl: "https://t.me/beta", subscribers: 5000, postReach: 900, err: null, citationIndex: 20 }
];

test("сортирует числа как числа и названия по-русски", () => {
  assert.deepEqual(core.sortChannels(channels, "subscribers", "desc"), [channels[1], channels[0]]);
  assert.deepEqual(core.sortChannels(channels, "name", "asc"), [channels[0], channels[1]]);
});

test("CSV содержит BOM, точку с запятой и экранирование", () => {
  const csv = core.toCsv(channels);
  assert.ok(csv.startsWith("\ufeffНазвание;Username;"));
  assert.ok(csv.includes('"Бета; медиа"'));
  assert.equal(csv.split("\r\n").length, 3);
});

test("TSV подходит для вставки в таблицу", () => {
  const tsv = core.toTsv(channels);
  assert.ok(tsv.startsWith("Название\tUsername\tTelegram URL"));
  assert.ok(tsv.includes("Альфа\t@alpha"));
});

test("строки экспорта сохраняют числа для XLSX", () => {
  const sheet = XLSX.utils.aoa_to_sheet([core.HEADERS, ...core.channelRows(channels)]);
  assert.equal(sheet.D2.t, "n");
  assert.equal(sheet.D2.v, 1200);
  assert.equal(sheet.F2.t, "n");
  assert.equal(sheet.F2.v, 12.5);
});

test("принимает пакеты закладки версий 1 и 2", () => {
  assert.equal(core.MESSAGE_VERSION, 2);
  [1, 2].forEach((version) => {
    assert.equal(core.isSupportedEnvelope({ type: "naklikay:tgstat-import", version, payload: { channels } }), true);
  });
  assert.equal(core.isSupportedEnvelope({ type: "naklikay:tgstat-import", version: 3, payload: { channels } }), false);
  assert.equal(core.isSupportedEnvelope({ type: "naklikay:tgstat-import", version: 2, payload: { html: "<html></html>" } }), false);
});
