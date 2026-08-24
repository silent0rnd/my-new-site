const test = require("node:test");
const assert = require("node:assert");

const { calculateAdvertisingRoi, toNumber } = require("../tools/okupaemost-reklamy/ad-roi.js");

test("считает окупаемость по данным исходной таблицы с корректным вычитанием затрат", () => {
  const result = calculateAdvertisingRoi({ adBudget: 100000, costPerLead: 2000, leadToSalePercent: 15, averageCheck: 200000, marginPercent: 20, specialistFee: 30000 });

  assert.strictEqual(result.leads, 50);
  assert.strictEqual(result.sales, 7.5);
  assert.strictEqual(result.revenue, 1500000);
  assert.strictEqual(result.grossProfit, 300000);
  assert.strictEqual(result.marketingCosts, 130000);
  assert.strictEqual(result.netProfit, 170000);
  assert.strictEqual(result.romi, 130.76923076923077);
  assert.strictEqual(result.maximumCpl, 4615.384615384615);
});

test("возвращает убыток, когда стоимость лида выше предельной", () => {
  const result = calculateAdvertisingRoi({ adBudget: 100000, costPerLead: 5000, leadToSalePercent: 10, averageCheck: 100000, marginPercent: 20, specialistFee: 0 });

  assert.strictEqual(result.netProfit, -60000);
  assert.strictEqual(result.romi, -60);
  assert.strictEqual(result.maximumCpl, 2000);
});

test("считает пустую оплату специалиста нулём и принимает дробные значения через запятую", () => {
  const result = calculateAdvertisingRoi({ adBudget: "12 500,50", costPerLead: "1 000,25", leadToSalePercent: "10,5", averageCheck: "30 000", marginPercent: "40,5", specialistFee: "" });

  assert.strictEqual(toNumber("12 500,50"), 12500.5);
  assert.strictEqual(result.fee, 0);
  assert.ok(Math.abs(result.netProfit - 3443.026993251686) < 0.000001);
});

test("не считает пустые, нулевые и выходящие за границы значения", () => {
  assert.strictEqual(calculateAdvertisingRoi({ adBudget: "", costPerLead: 1000, leadToSalePercent: 10, averageCheck: 10000, marginPercent: 20 }), null);
  assert.strictEqual(calculateAdvertisingRoi({ adBudget: 1000, costPerLead: 0, leadToSalePercent: 10, averageCheck: 10000, marginPercent: 20 }), null);
  assert.strictEqual(calculateAdvertisingRoi({ adBudget: 1000, costPerLead: 1000, leadToSalePercent: 101, averageCheck: 10000, marginPercent: 20 }), null);
  assert.strictEqual(calculateAdvertisingRoi({ adBudget: 1000, costPerLead: 1000, leadToSalePercent: 10, averageCheck: 10000, marginPercent: 20, specialistFee: -1 }), null);
});
