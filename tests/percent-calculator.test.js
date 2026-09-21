const test = require("node:test");
const assert = require("node:assert");

const {
  addPercent,
  calculateFixedPlusPercent,
  calculateProgressiveFee,
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

test("считает вознаграждение по прогрессивной шкале на границах и между ними", () => {
  assert.deepStrictEqual(calculateProgressiveFee(100000), { budget: 100000, tier: "100 000-300 000 ₽", threshold: 100000, fixed: 30000, percent: 15, excess: 0, percentPart: 0, total: 30000 });
  assert.strictEqual(calculateProgressiveFee(300000).total, 60000);
  assert.strictEqual(calculateProgressiveFee(500000).total, 84000);
  assert.strictEqual(calculateProgressiveFee(700000).total, 108000);
  assert.strictEqual(calculateProgressiveFee(1500000).total, 164000);
  assert.strictEqual(calculateProgressiveFee(3000000).total, 224000);
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
  assert.strictEqual(calculateProgressiveFee(""), null);
  assert.strictEqual(calculateProgressiveFee(99999.99), null);
  assert.strictEqual(calculateProgressiveFee(-1), null);
  assert.strictEqual(calculateProgressiveFee("не число"), null);
});
