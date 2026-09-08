const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseHTML } = require("linkedom");
const parser = require("../tools/vygruzka-kanalov-iz-tgstat/tgstat-parser.js");

function fixture(name) {
  const html = fs.readFileSync(path.join(__dirname, "fixtures", "tgstat", name), "utf8");
  return parseHTML(html).document;
}

test("нормализует целые числа, пробелы, k, m и десятичную запятую", () => {
  assert.equal(parser.parseNumber("12 340 подписчиков"), 12340);
  assert.equal(parser.parseNumber("12.3k"), 12300);
  assert.equal(parser.parseNumber("12,3k"), 12300);
  assert.equal(parser.parseNumber("1.2m"), 1200000);
  assert.equal(parser.parseNumber("1,2 млн"), 1200000);
  assert.equal(parser.parseNumber("нет данных"), null);
});

test("нормализует проценты как числа", () => {
  assert.equal(parser.parsePercentage("57%"), 57);
  assert.equal(parser.parsePercentage("18,5 %"), 18.5);
  assert.equal(parser.parsePercentage(""), null);
});

test("нормализует username и Telegram URL без tracking-параметров", () => {
  assert.equal(parser.normalizeUsername("https://t.me/Test_Channel?utm_source=x"), "@Test_Channel");
  assert.equal(parser.normalizeTelegramUrl("@Test_Channel"), "https://t.me/Test_Channel");
  assert.equal(parser.normalizeUsername("https://t.me/+privateInvite"), "");
});

test("разбирает несколько обычных карточек и сохраняет числовые значения", () => {
  const result = parser.parseTgstatDocument(fixture("channel-list.html"));
  assert.equal(result.channels.length, 2);
  assert.deepEqual(result.channels[0], {
    name: "Тестовый канал", username: "@test_channel", telegramUrl: "https://t.me/test_channel",
    tgstatUrl: "https://tgstat.ru/channel/@test_channel/stat", subscribers: 12340, postReach: 12300,
    err: 18.5, citationIndex: 57.4, category: "Маркетинг", extraMetrics: {}
  });
  assert.equal(result.channels[1].subscribers, 1200000);
  assert.equal(result.channels[1].postReach, 851500);
  assert.equal(result.channels[1].err, null);
});

test("разбирает частично измененную структуру и Telegram-ссылку", () => {
  const result = parser.parseTgstatDocument(fixture("partial-card.html"));
  assert.equal(result.channels.length, 1);
  assert.equal(result.channels[0].username, "@public_example");
  assert.equal(result.channels[0].telegramUrl, "https://t.me/public_example");
  assert.equal(result.channels[0].tgstatUrl, "https://tgstat.ru/channel/AbCdEf123/stat");
  assert.equal(result.channels[0].subscribers, 2500);
  assert.equal(result.channels[0].postReach, 3400);
  assert.equal(result.channels[0].citationIndex, null);
});

test("не придумывает username для TGStat ID", () => {
  const channel = parser.validateChannel({ name: "Закрытый", tgstatUrl: "https://tgstat.ru/channel/AbCdEf123/stat" });
  assert.equal(channel.username, "");
  assert.equal(channel.telegramUrl, "");
});

test("удаляет дубли username без учета регистра и объединяет поля", () => {
  const result = parser.parseTgstatDocument(fixture("duplicates.html"));
  assert.equal(result.channels.length, 1);
  assert.equal(result.channels[0].subscribers, 100);
  assert.equal(result.channels[0].postReach, 50);
  assert.equal(result.diagnostics.duplicatesRemoved, 1);
});

test("игнорирует посторонние элементы и возвращает пустой результат", () => {
  const result = parser.parseTgstatDocument(fixture("empty.html"));
  assert.deepEqual(result.channels, []);
  assert.equal(result.diagnostics.rawCount, 0);
});

test("валидация отклоняет полностью пустые записи", () => {
  assert.equal(parser.validateChannel({}), null);
  assert.equal(parser.validateChannel(null), null);
});
