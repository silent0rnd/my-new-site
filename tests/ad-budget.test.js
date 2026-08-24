const test = require("node:test");
const assert = require("node:assert");
const { buildCopyText, calculateAdBudget, getRsyEstimate, toNumber } = require("../tools/raschet-byudzheta-reklamy/ad-budget.js");

const base = {
  searchClicks: 1000,
  searchCpc: 200,
  searchSiteConversionPercent: 5,
  rsyClicks: 1000,
  rsyCpc: 80,
  rsySiteConversionPercent: 3,
  vatPercent: 22,
};

test("считает Поиск и РСЯ отдельно, затем складывает показатели", () => {
  const result = calculateAdBudget(base);
  assert.strictEqual(result.search.budget, 244000);
  assert.strictEqual(result.search.leads, 50);
  assert.strictEqual(result.search.cpl, 4880);
  assert.strictEqual(result.rsy.budget, 97600);
  assert.strictEqual(result.rsy.leads, 30);
  assert.strictEqual(result.rsy.cpl, 3253.3333333333335);
  assert.strictEqual(result.total.budget, 341600);
  assert.strictEqual(result.total.leads, 80);
  assert.strictEqual(result.total.cpl, 4270);
});

test("считает расширенную экономику по каждому каналу и общий итог", () => {
  const result = calculateAdBudget({ ...base, leadReachPercent: 100, leadToSalePercent: 30, averageCheck: 100000, marginPercent: 50, profitSharePercent: 50 });
  assert.strictEqual(result.search.sales, 15);
  assert.strictEqual(result.rsy.sales, 9);
  assert.strictEqual(result.total.sales, 24);
  assert.strictEqual(result.total.revenue, 2400000);
  assert.strictEqual(result.total.cpo, 14233.333333333334);
  assert.strictEqual(result.total.maximumCpo, 25000);
  assert.strictEqual(result.total.maximumCpl, 7500);
});

test("подставляет ориентир РСЯ и оставляет его редактируемым", () => {
  const estimate = getRsyEstimate({ searchClicks: "397,86", searchCpc: "40", searchSiteConversionPercent: "3" });
  assert.strictEqual(toNumber("12 500,50"), 12500.5);
  assert.strictEqual(estimate.rsyClicks, 397.86);
  assert.strictEqual(estimate.rsyCpc, 16);
  assert.strictEqual(estimate.rsySiteConversionPercent, 3);
  const result = calculateAdBudget({ searchClicks: 100, searchCpc: 50, searchSiteConversionPercent: 5, rsyClicks: 400, rsyCpc: 10, rsySiteConversionPercent: 2, vatPercent: 0 });
  assert.strictEqual(result.rsy.budget, 4000);
});

test("формирует текст с Поиском, РСЯ и общим итогом", () => {
  const text = buildCopyText(calculateAdBudget(base));
  assert.ok(text.includes("Поиск"));
  assert.ok(text.includes("РСЯ и баннерная реклама"));
  assert.ok(text.includes("Итого"));
  assert.ok(text.includes("341 600 ₽") || text.includes("341 600 ₽"));
});

test("не считает пустые, нулевые и некорректные поля", () => {
  assert.strictEqual(calculateAdBudget({ ...base, rsyClicks: "" }), null);
  assert.strictEqual(calculateAdBudget({ ...base, searchCpc: 0 }), null);
  assert.strictEqual(calculateAdBudget({ ...base, rsySiteConversionPercent: 101 }), null);
  assert.strictEqual(calculateAdBudget({ ...base, leadReachPercent: 100, leadToSalePercent: 20, averageCheck: 1000, marginPercent: 50, profitSharePercent: 0 }), null);
});
