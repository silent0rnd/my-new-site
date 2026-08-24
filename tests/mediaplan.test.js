const test = require("node:test");
const assert = require("node:assert");
const XLSX = require("xlsx");
const { calculateTotals, createWorkbook } = require("../tools/mediaplan/mediaplan.js");

const state = {
  search: { clickToApplication: "5", applicationToQualified: "40", qualifiedToSale: "50", rows: [{ phrase: "купить диван", frequency: "1200", impressions: "10000", clicks: "100", cpc: "150" }] },
  network: { clickToApplication: "2", applicationToQualified: "30", qualifiedToSale: "25", rows: [{ phrase: "диваны", frequency: "3000", impressions: "50000", clicks: "200", cpc: "30" }] }
};

test("Поиск и РСЯ считают всю воронку независимо", () => {
  const result = calculateTotals(state);
  assert.strictEqual(result.sections.search.totals.budget, 15000);
  assert.strictEqual(result.sections.search.totals.applications, 5);
  assert.strictEqual(result.sections.search.totals.qualifiedLeads, 2);
  assert.strictEqual(result.sections.search.totals.sales, 1);
  assert.strictEqual(result.sections.network.totals.budget, 6000);
  assert.strictEqual(result.sections.network.totals.applications, 4);
  assert.strictEqual(result.sections.network.totals.qualifiedLeads, 1.2);
  assert.strictEqual(result.sections.network.totals.sales, 0.3);
  assert.strictEqual(result.totals.budget, 21000);
  assert.strictEqual(result.totals.sales, 1.3);
});

test("Стоимость заявки, квалифицированного лида и продажи считается от итогов блока", () => {
  const result = calculateTotals(state).sections.search.totals;
  assert.strictEqual(result.ctr, 1);
  assert.strictEqual(result.applicationCost, 3000);
  assert.strictEqual(result.qualifiedLeadCost, 7500);
  assert.strictEqual(result.saleCost, 15000);
});

test("Нулевые или некорректные значения не создают бесконечные стоимости", () => {
  const result = calculateTotals({ search: { clickToApplication: "-1", applicationToQualified: "", qualifiedToSale: "", rows: [{ clicks: "10", cpc: "100", impressions: "0" }] }, network: { clickToApplication: "", applicationToQualified: "", qualifiedToSale: "", rows: [] } });
  assert.strictEqual(result.sections.search.totals.applications, 0);
  assert.strictEqual(result.sections.search.totals.sales, 0);
  assert.strictEqual(result.sections.search.totals.saleCost, 0);
});

test("Excel содержит две воронки, продажи и формулы", () => {
  const workbook = createWorkbook(XLSX, state);
  const sheet = workbook.Sheets["Медиаплан"];
  assert.deepStrictEqual(workbook.SheetNames, ["Медиаплан"]);
  assert.strictEqual(sheet.A3.v, "Поиск");
  assert.strictEqual(sheet.A4.v, "Конверсия клик → заявка");
  assert.strictEqual(sheet.G7.f, "D7*F7");
  assert.strictEqual(sheet.A14.v, "Продажи");
  assert.match(sheet.B14.f, /\$F\$4/);
  assert.strictEqual(sheet.A18.v, "РСЯ");
});
