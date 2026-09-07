const test = require("node:test");
const assert = require("node:assert");

const {
  addPercent,
  calculateFixedPlusPercent,
  calculatePercent,
  calculatePercentOf,
  formatNumber,
  parseNumber,
  subtractPercent,
} = require("../tools/calculator-procentov/percent-calculator.js");

test("считает процент плюс фиксированную сумму по обязательным сценариям", () => {
  assert.deepStrictEqual(calculateFixedPlusPercent(500000, 5, 30000), { base: 500000, percent: 5, fixed: 30000, percentPart: 25000, total: 55000 });
  assert.strictEqual(calculateFixedPlusPercent(100000, 5, 0).total, 5000);
  assert.strictEqual(calculateFixedPlusPercent(100000, "2,5", 30000).total, 32500);
  assert.strictEqual(calculateFixedPlusPercent(0, 5, 30000).total, 30000);
  assert.strictEqual(calculateFixedPlusPercent("1 500 000", 5, "35 000").total, 110000);
});

test("принимает пробелы, точку и запятую и форматирует до двух знаков", () => {
  assert.strictEqual(parseNumber("500 000"), 500000);
  assert.strictEqual(parseNumber("500000.50"), 500000.5);
  assert.strictEqual(parseNumber("500000,50"), 500000.5);
  assert.strictEqual(formatNumber(12345.5).replace(/\u00a0/g, " "), "12 345,5");
  assert.strictEqual(formatNumber(100.00000000003), "100");
});

test("считает четыре стандартные процентные операции", () => {
  assert.strictEqual(calculatePercent(100000, 5), 5000);
  assert.strictEqual(calculatePercentOf(25, 500), 5);
  assert.strictEqual(addPercent(100000, 5), 105000);
  assert.strictEqual(subtractPercent(100000, 5), 95000);
});

test("корректно обрабатывает ноль, пустые и недопустимые значения", () => {
  assert.strictEqual(calculatePercent(0, 5), 0);
  assert.strictEqual(calculatePercentOf(25, 0), null);
  assert.strictEqual(calculatePercent("", 5), null);
  assert.strictEqual(calculatePercent(-1, 5), null);
  assert.strictEqual(calculatePercent(100, -5), null);
  assert.strictEqual(calculatePercent(Number.MAX_VALUE, 200), null);
  assert.strictEqual(calculateFixedPlusPercent(100, 5, "").total, 5);
});
