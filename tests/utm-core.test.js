// Проверка логики инструмента UTM (/tools/utm/). Запуск: node --test tests/utm-core.test.js
// DOM здесь не нужен: tools/utm/utm.js отдаёт чистые функции через module.exports.

const test = require("node:test");
const assert = require("node:assert");

const {
  translit,
  describeMacros,
  buildUtmUrl,
  previewMacros,
  cleanRuleValue,
  buildRuleValues,
  multiplyUtm,
  buildBulkUrls,
  encodeState,
  decodeState,
  toCsv,
} = require("../tools/utm/utm.js");

const BASE_PARAMS = [
  { key: "utm_source", value: "yandex" },
  { key: "utm_medium", value: "cpc" },
  { key: "utm_campaign", value: "{campaign_id}" },
  { key: "utm_content", value: "" },
];

test("метки добавляются через ? и пустые поля пропускаются", () => {
  const url = buildUtmUrl("https://site.ru/usluga/", BASE_PARAMS);
  assert.strictEqual(url, "https://site.ru/usluga/?utm_source=yandex&utm_medium=cpc&utm_campaign={campaign_id}");
});

test("второй знак вопроса не появляется", () => {
  const url = buildUtmUrl("https://site.ru/?product=123", BASE_PARAMS);
  assert.strictEqual((url.match(/\?/g) || []).length, 1);
  assert.ok(url.includes("?product=123&utm_source=yandex"));
});

test("метки встают перед якорем", () => {
  const url = buildUtmUrl("https://site.ru/page/#form", BASE_PARAMS);
  assert.ok(url.endsWith("#form"));
  assert.ok(url.indexOf("utm_source") < url.indexOf("#form"));
});

test("фигурные скобки и вертикальная черта переживают кодирование", () => {
  const url = buildUtmUrl("https://site.ru/", [{ key: "utm_source", value: "yandex_direct|{source}" }]);
  assert.strictEqual(url, "https://site.ru/?utm_source=yandex_direct|{source}");
});

test("кириллица кодируется, ссылка не ломается", () => {
  const url = buildUtmUrl("https://site.ru/", [{ key: "utm_campaign", value: "лето" }]);
  assert.ok(!/[а-яё]/i.test(url));
});

test("макросы заменяются примерами", () => {
  const preview = previewMacros("https://site.ru/?utm_campaign={campaign_id}&utm_content={ad_id}.{source_type}");
  assert.ok(preview.includes("41235678"));
  assert.ok(preview.includes("17382940123"));
  assert.ok(preview.includes("context"));
  assert.ok(!preview.includes("{"));
});

test("русские буквы становятся английскими, пробел - дефисом", () => {
  assert.strictEqual(translit("поиск москва"), "poisk-moskva");
  // Заглавные уходят в нижний регистр: yandex и Yandex - две разные строки в отчёте.
  assert.strictEqual(translit("Ёлка Объявление"), "elka-obyavlenie");
});

test("макросы и латиница транслитерацию переживают", () => {
  assert.strictEqual(translit("{ad_id}.{source_type}"), "{ad_id}.{source_type}");
  assert.strictEqual(translit("{ad_id} тест"), "{ad_id}-test");
});

test("таблица объясняет макросы и молчит про обычный текст", () => {
  assert.strictEqual(describeMacros("{campaign_id}"), "Площадка подставит: номер кампании");
  assert.strictEqual(describeMacros("{ad_id}.{ad_id}"), "Площадка подставит: номер объявления");
  assert.strictEqual(describeMacros("leto-2026"), "");
});

test("номера идут с ведущим нулём", () => {
  const values = buildRuleValues({ type: "number", prefix: "ad-", from: 1, to: 20, pad: true });
  assert.strictEqual(values.length, 20);
  assert.strictEqual(values[0], "ad-01");
  assert.strictEqual(values[19], "ad-20");
});

test("список строк чистится от пустых строк", () => {
  const values = buildRuleValues({ type: "list", items: "divany\n\n kresla \nstoly" });
  assert.deepStrictEqual(values, ["divany", "kresla", "stoly"]);
});

test("размножение даёт по ссылке на объявление", () => {
  const rows = multiplyUtm("https://site.ru/", BASE_PARAMS, [
    { key: "utm_content", type: "number", prefix: "ad-", from: 1, to: 20, pad: true },
  ]);

  assert.strictEqual(rows.length, 20);
  assert.strictEqual(rows[0].index, 1);
  assert.ok(rows[0].url.includes("utm_content=ad-01"));
  assert.ok(rows[19].url.includes("utm_content=ad-20"));
  assert.ok(rows[0].url.includes("utm_source=yandex"));
});

test("из ссылки на канал остаётся только имя канала", () => {
  assert.strictEqual(cleanRuleValue("https://t.me/kaktus_mediakg"), "kaktus_mediakg");
  assert.strictEqual(cleanRuleValue("t.me/news24kg/"), "news24kg");
  assert.strictEqual(cleanRuleValue("@akipress"), "akipress");
  assert.strictEqual(cleanRuleValue("https://site.ru/divany/?utm_source=x"), "divany");
  // Голый домен: имени страницы нет, берём сам домен.
  assert.strictEqual(cleanRuleValue("https://site.ru/"), "site-ru");
  // Обычные значения и макросы площадок не портятся.
  assert.strictEqual(cleanRuleValue("telegram-ads"), "telegram-ads");
  assert.strictEqual(cleanRuleValue("{ad_id}.{source_type}"), "{ad_id}.{source_type}");
  assert.strictEqual(cleanRuleValue("Кактус Медиа"), "kaktus-media");
});

test("список ссылок на каналы едет в метку без мусора", () => {
  const rows = multiplyUtm("https://nsk.kg/", [{ key: "utm_source", value: "telegram-ads" }], [
    { key: "utm_campaign", type: "list", items: "https://t.me/kaktus_mediakg\nhttps://t.me/news24kg" },
  ]);

  assert.strictEqual(rows.length, 2);
  assert.ok(!rows[0].url.includes("%"), rows[0].url);
  assert.strictEqual(rows[0].url, "https://nsk.kg/?utm_source=telegram-ads&utm_campaign=kaktus_mediakg");
});

test("нетронутое правило молчит: пустые поля не дают значений", () => {
  assert.deepStrictEqual(buildRuleValues({ type: "number", prefix: "", from: "", to: "" }), []);
  assert.deepStrictEqual(buildRuleValues({ type: "list", items: "  \n " }), []);

  // Все пять правил на странице приходят всегда, работать должно только полное.
  const rows = multiplyUtm("https://site.ru/", BASE_PARAMS, [
    { key: "utm_source", type: "list", items: "" },
    { key: "utm_medium", type: "number", from: "", to: "" },
    { key: "utm_content", type: "list", items: "foto\nvideo" },
  ]);
  assert.strictEqual(rows.length, 2);
  assert.ok(rows[0].url.includes("utm_source=yandex"));
  assert.ok(rows[0].url.includes("utm_medium=cpc"));
});

test("список режется и по запятой, и по табу, и по строкам", () => {
  const values = buildRuleValues({ type: "list", items: "telegram, vk;avito\tozon\nwildberries" });
  assert.deepStrictEqual(values, ["telegram", "vk", "avito", "ozon", "wildberries"]);
});

test("русские названия каналов из списка становятся английскими", () => {
  const values = buildRuleValues({ type: "list", items: "Телеграм, ВК, Яндекс Директ" });
  assert.deepStrictEqual(values, ["telegram", "vk", "yandeks-direkt"]);
});

test("все сочетания: каждый канал умножается на каждое объявление", () => {
  const rules = [
    { key: "utm_source", type: "list", items: "tg\nvk\navito" },
    { key: "utm_content", type: "list", items: "foto\nvideo" },
  ];

  const paired = multiplyUtm("https://site.ru/", BASE_PARAMS, rules);
  assert.strictEqual(paired.length, 3);

  const combined = multiplyUtm("https://site.ru/", BASE_PARAMS, rules, true);
  assert.strictEqual(combined.length, 6);
  assert.ok(combined[0].url.includes("utm_source=tg") && combined[0].url.includes("utm_content=foto"));
  assert.ok(combined[5].url.includes("utm_source=avito") && combined[5].url.includes("utm_content=video"));
  assert.strictEqual(combined[0].label, "tg / foto");
  // Каждая ссылка своя: 6 разных строк, а не 6 копий.
  assert.strictEqual(new Set(combined.map((row) => row.url)).size, 6);
});

test("11 каналов и номера 1-2 дают 22 ссылки, а не 11", () => {
  const channels = Array.from({ length: 11 }, (item, index) => `kanal${index + 1}`).join("\n");
  const rules = [
    { key: "utm_campaign", type: "list", items: channels },
    { key: "utm_content", type: "number", prefix: "ad-", from: 1, to: 2, pad: false },
  ];

  const combined = multiplyUtm("https://nsk.kg/", BASE_PARAMS, rules, true);
  assert.strictEqual(combined.length, 22);
  // Каждый канал встречается дважды: с ad-1 и с ad-2.
  assert.ok(combined[0].url.includes("utm_campaign=kanal1") && combined[0].url.includes("utm_content=ad-1"));
  assert.ok(combined[1].url.includes("utm_campaign=kanal1") && combined[1].url.includes("utm_content=ad-2"));
  assert.strictEqual(new Set(combined.map((row) => row.url)).size, 22);

  assert.strictEqual(multiplyUtm("https://nsk.kg/", BASE_PARAMS, rules, false).length, 11);
});

test("два правила идут парами построчно, а не всеми сочетаниями", () => {
  const rows = multiplyUtm("https://site.ru/", BASE_PARAMS, [
    { key: "utm_campaign", type: "list", items: "a\nb" },
    { key: "utm_content", type: "list", items: "x\ny" },
  ]);

  assert.strictEqual(rows.length, 2);
  assert.ok(rows[0].url.includes("utm_campaign=a") && rows[0].url.includes("utm_content=x"));
  assert.ok(rows[1].url.includes("utm_campaign=b") && rows[1].url.includes("utm_content=y"));
});

test("короткое правило не затирает поле пустотой", () => {
  const rows = multiplyUtm("https://site.ru/", BASE_PARAMS, [
    { key: "utm_campaign", type: "list", items: "a" },
    { key: "utm_content", type: "list", items: "x\ny" },
  ]);

  assert.strictEqual(rows.length, 2);
  assert.ok(rows[1].url.includes("utm_campaign={campaign_id}"));
});

test("пакет ссылок размечает каждый адрес", () => {
  const rows = buildBulkUrls("https://site.ru/a/\n\nhttps://site.ru/b/?x=1", BASE_PARAMS);
  assert.strictEqual(rows.length, 2);
  assert.ok(rows[0].url.startsWith("https://site.ru/a/?utm_source=yandex"));
  assert.ok(rows[1].url.includes("?x=1&utm_source=yandex"));
});

test("шаблон переживает поездку через адрес страницы", () => {
  const state = { url: "https://site.ru/usluga/", params: BASE_PARAMS.filter((item) => item.value) };
  const restored = decodeState(`#${encodeState(state)}`);

  assert.strictEqual(restored.url, state.url);
  assert.deepStrictEqual(restored.params, state.params);
});

test("пустой адрес не даёт состояния", () => {
  assert.strictEqual(decodeState(""), null);
});

test("CSV содержит заголовок и все строки", () => {
  const csv = toCsv([
    { index: 1, url: "https://site.ru/?a=1" },
    { index: 2, url: "https://site.ru/?a=2" },
  ]);

  assert.strictEqual(csv.split("\r\n").length, 3);
  assert.ok(csv.startsWith("number;url"));
});
