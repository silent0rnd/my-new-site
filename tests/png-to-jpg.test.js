const test = require("node:test");
const assert = require("node:assert");
const { normalizeOutputName, outputFilename, buildBatchOutputNames, validateOutputName, getNameErrors, isPngSignature, formatBytes, pluralImages, sizeChangeText, getSizeSummary } = require("../tools/png-to-jpg/png-to-jpg.js");

test("нормализует имя JPG без двойного расширения", () => {
  assert.strictEqual(normalizeOutputName(" photo.jpg.png "), "photo");
  assert.strictEqual(outputFilename("banner.png"), "banner.jpg");
});
test("формирует пакетные имена с суффиксом от единицы", () => {
  assert.deepStrictEqual(buildBatchOutputNames(" товар.jpg ", 3), ["товар-1", "товар-2", "товар-3"]);
});
test("отклоняет пустые и небезопасные имена", () => {
  assert.strictEqual(validateOutputName("   "), "Введите имя файла");
  assert.match(validateOutputName('bad<script>.png'), /нельзя использовать/);
});
test("находит конфликты итоговых имён", () => {
  const errors = getNameErrors([{ id: 1, outputName: "banner" }, { id: 2, outputName: "banner.jpg" }, { id: 3, outputName: "other" }]);
  assert.strictEqual(errors.get(1), "Такое имя уже используется");
  assert.strictEqual(errors.get(2), "Такое имя уже используется");
  assert.strictEqual(errors.has(3), false);
});
test("проверяет сигнатуру PNG", () => {
  assert.strictEqual(isPngSignature(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), true);
  assert.strictEqual(isPngSignature(Uint8Array.from([255, 216, 255, 224, 0, 1, 2, 3])), false);
});
test("форматирует размеры и формы слов", () => {
  assert.strictEqual(formatBytes(1536), "1,5 КБ");
  assert.strictEqual(pluralImages(1), "изображение");
  assert.strictEqual(pluralImages(2), "изображения");
  assert.strictEqual(pluralImages(5), "изображений");
  assert.strictEqual(sizeChangeText(1000, 1200), "Изменение размера: +20%");
});
test("считает общий вес исходников и готовых JPG", () => {
  const summary = getSizeSummary([{ fileSize: 1000, resultSize: 400 }, { fileSize: 2000, resultSize: 0 }, { fileSize: 3000, resultSize: 900 }]);
  assert.deepStrictEqual(summary, { sourceSize: 6000, convertedSourceSize: 4000, resultSize: 1300, convertedCount: 2 });
});
