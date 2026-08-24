// Логика калькулятора стоимости лида. Чистая функция ниже используется и
// страницей, и тестами - расчёт можно проверить без браузера.

const WORKING_COST_SHARE = 0.7;

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const normalized = value.replace(/[\s\u00a0]/g, "").replace(",", ".");
  return normalized === "" ? Number.NaN : Number(normalized);
}

function calculateLeadCost({ averageCheck, marginPercent, leadToSalePercent }) {
  const check = toNumber(averageCheck);
  const margin = toNumber(marginPercent);
  const conversion = toNumber(leadToSalePercent);

  if (!Number.isFinite(check) || !Number.isFinite(margin) || !Number.isFinite(conversion)) return null;
  if (check <= 0 || margin <= 0 || conversion <= 0 || margin > 100 || conversion > 100) return null;

  const profitPerSale = check * (margin / 100);
  const maximumLeadCost = profitPerSale * (conversion / 100);

  return {
    averageCheck: check,
    marginPercent: margin,
    leadToSalePercent: conversion,
    profitPerSale,
    maximumLeadCost,
    workingLeadCost: maximumLeadCost * WORKING_COST_SHARE,
  };
}

if (typeof module !== "undefined") {
  module.exports = { WORKING_COST_SHARE, calculateLeadCost, toNumber };
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-lead-cost]");

  if (root) {
    const fields = [...root.querySelectorAll("[data-lead-cost-input]")];
    const emptyState = root.querySelector("[data-lead-cost-empty]");
    const result = root.querySelector("[data-lead-cost-result]");
    const error = root.querySelector("[data-lead-cost-error]");
    const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
    const percent = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

    function setText(selector, text) {
      root.querySelectorAll(selector).forEach((node) => {
        node.textContent = text;
      });
    }

    function render() {
      const data = calculateLeadCost({
        averageCheck: root.querySelector("[name=average-check]").value,
        marginPercent: root.querySelector("[name=margin-percent]").value,
        leadToSalePercent: root.querySelector("[name=lead-to-sale-percent]").value,
      });
      const hasAnyValue = fields.some((field) => field.value.trim() !== "");

      result.hidden = !data;
      emptyState.hidden = Boolean(data);
      error.hidden = Boolean(data) || !hasAnyValue;

      if (!data) return;

      setText("[data-lead-cost-profit]", `${money.format(data.profitPerSale)} ₽`);
      setText("[data-lead-cost-maximum]", `${money.format(data.maximumLeadCost)} ₽`);
      setText("[data-lead-cost-working]", `${money.format(data.workingLeadCost)} ₽`);
      setText("[data-lead-cost-check]", `${money.format(data.averageCheck)} ₽`);
      setText("[data-lead-cost-margin]", `${percent.format(data.marginPercent)}%`);
      setText("[data-lead-cost-conversion]", `${percent.format(data.leadToSalePercent)}%`);
    }

    fields.forEach((field) => field.addEventListener("input", render));
    render();
  }
}
