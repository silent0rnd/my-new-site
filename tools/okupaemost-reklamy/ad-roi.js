function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;

  const normalized = value.replace(/[\s\u00a0\u202f]/g, "").replace(/,/g, ".");
  return normalized === "" ? Number.NaN : Number(normalized);
}

function calculateAdvertisingRoi({ adBudget, costPerLead, leadToSalePercent, averageCheck, marginPercent, specialistFee = 0 }) {
  const budget = toNumber(adBudget);
  const cpl = toNumber(costPerLead);
  const conversion = toNumber(leadToSalePercent);
  const check = toNumber(averageCheck);
  const margin = toNumber(marginPercent);
  const fee = specialistFee === "" || specialistFee == null ? 0 : toNumber(specialistFee);

  if (![budget, cpl, conversion, check, margin, fee].every(Number.isFinite)) return null;
  if (budget <= 0 || cpl <= 0 || check <= 0 || margin <= 0 || conversion <= 0 || margin > 100 || conversion > 100 || fee < 0) return null;

  const leads = budget / cpl;
  const sales = leads * (conversion / 100);
  const revenue = sales * check;
  const grossProfit = revenue * (margin / 100);
  const marketingCosts = budget + fee;
  const netProfit = grossProfit - marketingCosts;
  const romi = (netProfit / marketingCosts) * 100;
  const maximumCpl = (budget * (conversion / 100) * check * (margin / 100)) / marketingCosts;

  return { budget, cpl, conversion, check, margin, fee, leads, sales, revenue, grossProfit, marketingCosts, netProfit, romi, maximumCpl };
}

if (typeof module !== "undefined") {
  module.exports = { calculateAdvertisingRoi, toNumber };
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-advertising-roi]");

  if (root) {
    const fields = [...root.querySelectorAll("[data-advertising-roi-input]")];
    const emptyState = root.querySelector("[data-advertising-roi-empty]");
    const result = root.querySelector("[data-advertising-roi-result]");
    const error = root.querySelector("[data-advertising-roi-error]");
    const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
    const count = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
    const percent = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

    function setText(selector, text) {
      root.querySelectorAll(selector).forEach((node) => {
        node.textContent = text;
      });
    }

    function formatMoney(value) {
      return `${money.format(value)} ₽`;
    }

    function render() {
      const data = calculateAdvertisingRoi({
        adBudget: root.querySelector("[name=ad-budget]").value,
        costPerLead: root.querySelector("[name=cost-per-lead]").value,
        leadToSalePercent: root.querySelector("[name=lead-to-sale-percent]").value,
        averageCheck: root.querySelector("[name=average-check]").value,
        marginPercent: root.querySelector("[name=margin-percent]").value,
        specialistFee: root.querySelector("[name=specialist-fee]").value,
      });
      const requiredFields = fields.filter((field) => field.name !== "specialist-fee");
      const hasAnyValue = fields.some((field) => field.value.trim() !== "");
      const hasAllRequiredValues = requiredFields.every((field) => field.value.trim() !== "");

      result.hidden = !data;
      emptyState.hidden = Boolean(data) || hasAnyValue;
      error.hidden = Boolean(data) || !hasAnyValue || !hasAllRequiredValues;

      if (!data) return;

      const isProfitable = data.netProfit >= 0;
      setText("[data-advertising-roi-status-label]", isProfitable ? "Реклама окупается" : "Реклама пока не окупается");
      setText("[data-advertising-roi-status]", isProfitable ? `+${formatMoney(data.netProfit)}` : `−${formatMoney(Math.abs(data.netProfit))}`);
      setText("[data-advertising-roi-status-hint]", isProfitable ? "Чистая прибыль после всех затрат на маркетинг." : "Убыток после всех затрат на маркетинг.");
      setText("[data-advertising-roi-leads]", count.format(data.leads));
      setText("[data-advertising-roi-sales]", count.format(data.sales));
      setText("[data-advertising-roi-revenue]", formatMoney(data.revenue));
      setText("[data-advertising-roi-gross-profit]", formatMoney(data.grossProfit));
      setText("[data-advertising-roi-marketing-costs]", formatMoney(data.marketingCosts));
      setText("[data-advertising-roi-net-profit]", formatMoney(data.netProfit));
      setText("[data-advertising-roi-romi]", `${percent.format(data.romi)}%`);
      setText("[data-advertising-roi-maximum-cpl]", formatMoney(data.maximumCpl));
      setText("[data-advertising-roi-note]", data.cpl <= data.maximumCpl
        ? `Текущий CPL ниже предельного на ${formatMoney(data.maximumCpl - data.cpl)}.`
        : `Текущий CPL выше предельного на ${formatMoney(data.cpl - data.maximumCpl)}.`);
    }

    fields.forEach((field) => field.addEventListener("input", render));
    render();
  }
}
