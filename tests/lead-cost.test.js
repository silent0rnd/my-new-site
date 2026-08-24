const test = require("node:test");
const assert = require("node:assert");

const { WORKING_COST_SHARE, calculateLeadCost, toNumber } = require("../tools/stoimost-lida/lead-cost.js");

test("считает предельную стоимость лида по примеру из сервиса", () => {
  const result = calculateLeadCost({ averageCheck: 130000, marginPercent: 35, leadToSalePercent: 5 });

  assert.strictEqual(result.profitPerSale, 45500);
  assert.strictEqual(result.maximumLeadCost, 2275);
  assert.strictEqual(result.workingLeadCost, 1592.5);
  assert.strictEqual(WORKING_COST_SHARE, 0.7);
});

test("поддерживает дробные значения и запятую в полях", () => {
  const result = calculateLeadCost({ averageCheck: "12 500,50", marginPercent: "34,5", leadToSalePercent: "3,25" });

  assert.strictEqual(toNumber("12 500,50"), 12500.5);
  assert.strictEqual(result.profitPerSale, 4312.6725);
  assert.strictEqual(result.maximumLeadCost, 140.16185625);
});

test("не считает пустые, нулевые и выходящие за границы проценты", () => {
  assert.strictEqual(calculateLeadCost({ averageCheck: "", marginPercent: 35, leadToSalePercent: 5 }), null);
  assert.strictEqual(calculateLeadCost({ averageCheck: 1000, marginPercent: 0, leadToSalePercent: 5 }), null);
  assert.strictEqual(calculateLeadCost({ averageCheck: 1000, marginPercent: 101, leadToSalePercent: 5 }), null);
  assert.strictEqual(calculateLeadCost({ averageCheck: 1000, marginPercent: 35, leadToSalePercent: 101 }), null);
});
