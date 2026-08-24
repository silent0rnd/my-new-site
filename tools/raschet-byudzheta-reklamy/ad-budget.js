// Калькулятор бюджета рекламы. Чистые функции используются страницей и тестами.

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const normalized = value.replace(/[\s\u00a0\u202f]/g, "").replace(/,/g, ".");
  return normalized === "" ? Number.NaN : Number(normalized);
}

function calculateChannel({ clicks, cpc, siteConversionPercent, vatPercent }) {
  const values = [clicks, cpc, siteConversionPercent, vatPercent].map(toNumber);
  const [clickCount, costPerClick, siteConversion, vat] = values;
  if (!values.every(Number.isFinite)) return null;
  if (clickCount <= 0 || costPerClick <= 0 || siteConversion <= 0 || siteConversion > 100 || vat < 0 || vat > 100) return null;

  const budgetWithoutVat = clickCount * costPerClick;
  const budget = budgetWithoutVat * (1 + vat / 100);
  const leads = clickCount * (siteConversion / 100);
  return { clickCount, costPerClick, siteConversion, vat, budgetWithoutVat, budget, leads, cpl: budget / leads };
}

function addEconomy(channel, economy) {
  const qualifiedLeads = channel.leads * (economy.leadReach / 100);
  const sales = qualifiedLeads * (economy.leadToSale / 100);
  const revenue = sales * economy.check;
  return { ...channel, qualifiedLeads, sales, revenue, grossProfit: revenue * (economy.margin / 100), cpo: channel.budget / sales };
}

function calculateAdBudget(input) {
  const vatPercent = input.vatPercent ?? 22;
  const search = calculateChannel({
    clicks: input.searchClicks ?? input.clicks,
    cpc: input.searchCpc ?? input.cpc,
    siteConversionPercent: input.searchSiteConversionPercent ?? input.siteConversionPercent,
    vatPercent,
  });
  const rsy = calculateChannel({
    clicks: input.rsyClicks,
    cpc: input.rsyCpc,
    siteConversionPercent: input.rsySiteConversionPercent,
    vatPercent,
  });
  if (!search || !rsy) return null;

  const total = {
    budgetWithoutVat: search.budgetWithoutVat + rsy.budgetWithoutVat,
    budget: search.budget + rsy.budget,
    leads: search.leads + rsy.leads,
  };
  total.cpl = total.budget / total.leads;

  const extendedInputs = [input.leadReachPercent, input.leadToSalePercent, input.averageCheck, input.marginPercent, input.profitSharePercent];
  const hasExtendedValue = extendedInputs.some((value) => String(value ?? "").trim() !== "");
  if (!hasExtendedValue) return { search, rsy, total };

  const [leadReach, leadToSale, check, margin, profitShare] = extendedInputs.map(toNumber);
  if (![leadReach, leadToSale, check, margin, profitShare].every(Number.isFinite)) return null;
  if (leadReach <= 0 || leadReach > 100 || leadToSale <= 0 || leadToSale > 100 || check <= 0 || margin <= 0 || margin > 100 || profitShare <= 0 || profitShare > 100) return null;

  const economy = { leadReach, leadToSale, check, margin, profitShare };
  const searchWithEconomy = addEconomy(search, economy);
  const rsyWithEconomy = addEconomy(rsy, economy);
  const totalWithEconomy = {
    ...total,
    qualifiedLeads: searchWithEconomy.qualifiedLeads + rsyWithEconomy.qualifiedLeads,
    sales: searchWithEconomy.sales + rsyWithEconomy.sales,
    revenue: searchWithEconomy.revenue + rsyWithEconomy.revenue,
    grossProfit: searchWithEconomy.grossProfit + rsyWithEconomy.grossProfit,
  };
  totalWithEconomy.cpo = totalWithEconomy.budget / totalWithEconomy.sales;
  totalWithEconomy.maximumCpo = check * (margin / 100) * (profitShare / 100);
  totalWithEconomy.maximumCpl = totalWithEconomy.maximumCpo * (leadToSale / 100) * (leadReach / 100);
  return { search: searchWithEconomy, rsy: rsyWithEconomy, total: totalWithEconomy, economy };
}

function buildCopyText(data) {
  const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
  const count = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
  const channelLines = (name, channel) => [
    name,
    `Клики: ${count.format(channel.clickCount)}`,
    `Средняя цена клика: ${money.format(channel.costPerClick)} ₽`,
    `Конверсия сайта: ${count.format(channel.siteConversion)}%`,
    `Бюджет с НДС: ${money.format(channel.budget)} ₽`,
    `Прогноз лидов: ${count.format(channel.leads)}`,
    `Прогнозный CPL: ${money.format(channel.cpl)} ₽`,
  ];
  const lines = ["Расчёт бюджета рекламы в Яндекс Директе", "", ...channelLines("Поиск", data.search), "", ...channelLines("РСЯ и баннерная реклама", data.rsy), "", "Итого", `Бюджет с НДС: ${money.format(data.total.budget)} ₽`, `Прогноз лидов: ${count.format(data.total.leads)}`, `Прогнозный CPL: ${money.format(data.total.cpl)} ₽`];
  if (data.total.sales !== undefined) lines.push("", "Расширенная экономика", `Квалифицированные лиды: ${count.format(data.total.qualifiedLeads)}`, `Прогноз продаж: ${count.format(data.total.sales)}`, `Прогнозный CPO: ${money.format(data.total.cpo)} ₽`, `Выручка: ${money.format(data.total.revenue)} ₽`, `Валовая прибыль: ${money.format(data.total.grossProfit)} ₽`, `Допустимый CPL: ${money.format(data.total.maximumCpl)} ₽`, `Допустимый CPO: ${money.format(data.total.maximumCpo)} ₽`);
  return lines.join("\n");
}

function getRsyEstimate(searchValues) {
  return {
    rsyClicks: toNumber(searchValues.searchClicks) * 1,
    rsyCpc: toNumber(searchValues.searchCpc) * 0.4,
    rsySiteConversionPercent: toNumber(searchValues.searchSiteConversionPercent),
  };
}

if (typeof module !== "undefined") module.exports = { buildCopyText, calculateAdBudget, calculateChannel, getRsyEstimate, toNumber };

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-ad-budget]");
  if (!root) return;
  const form = root.querySelector("[data-ad-budget-form]");
  const fields = [...form.querySelectorAll("[data-ad-budget-input]")];
  const extended = root.querySelector("[data-ad-budget-extended]");
  const toggle = root.querySelector("[data-ad-budget-toggle]");
  const estimate = root.querySelector("[data-ad-budget-estimate]");
  const result = root.querySelector("[data-ad-budget-result]");
  const empty = root.querySelector("[data-ad-budget-empty]");
  const error = root.querySelector("[data-ad-budget-error]");
  const copy = root.querySelector("[data-ad-budget-copy]");
  const copyStatus = root.querySelector("[data-ad-budget-copy-status]");
  const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
  const count = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
  let current = null;
  const formatMoney = (value) => `${money.format(value)} ₽`;
  const setText = (name, value) => root.querySelectorAll(`[data-ad-budget-${name}]`).forEach((node) => { node.textContent = value; });
  const values = () => Object.fromEntries(fields.map((field) => [field.name, field.value]));

  function render() {
    current = calculateAdBudget(values());
    const hasAnyValue = fields.some((field) => field.value.trim() !== "");
    const requiredNames = ["searchClicks", "searchCpc", "searchSiteConversionPercent", "rsyClicks", "rsyCpc", "rsySiteConversionPercent", "vatPercent"];
    if (!extended.hidden) requiredNames.push("leadReachPercent", "leadToSalePercent", "averageCheck", "marginPercent", "profitSharePercent");
    const hasAllRequired = requiredNames.every((name) => root.querySelector(`[name="${name}"]`).value.trim() !== "");
    result.hidden = !current;
    empty.hidden = hasAnyValue;
    error.hidden = !hasAnyValue || !hasAllRequired || Boolean(current);
    copy.disabled = !current;
    if (!current) return;

    ["search", "rsy", "total"].forEach((name) => {
      const channel = current[name];
      setText(`${name}-budget`, formatMoney(channel.budget));
      setText(`${name}-leads`, count.format(channel.leads));
      setText(`${name}-cpl`, formatMoney(channel.cpl));
    });
    root.querySelector("[data-ad-budget-economy-result]").hidden = current.total.sales === undefined;
    if (current.total.sales !== undefined) {
      ["search", "rsy", "total"].forEach((name) => {
        const channel = current[name];
        setText(`${name}-sales`, count.format(channel.sales));
        setText(`${name}-cpo`, formatMoney(channel.cpo));
        setText(`${name}-revenue`, formatMoney(channel.revenue));
      });
      setText("total-qualified-leads", count.format(current.total.qualifiedLeads));
      setText("maximum-cpl", formatMoney(current.total.maximumCpl));
      setText("maximum-cpo", formatMoney(current.total.maximumCpo));
    }
  }

  toggle.addEventListener("click", () => {
    extended.hidden = !extended.hidden;
    toggle.setAttribute("aria-expanded", String(!extended.hidden));
    toggle.textContent = extended.hidden ? "Добавить экономику продаж" : "Скрыть экономику продаж";
    render();
  });
  estimate.addEventListener("click", () => {
    const estimateValues = getRsyEstimate(values());
    Object.entries(estimateValues).forEach(([name, value]) => { root.querySelector(`[name="${name}"]`).value = Number.isFinite(value) ? String(value) : ""; });
    render();
  });
  fields.forEach((field) => field.addEventListener("input", render));
  copy.addEventListener("click", async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(buildCopyText(current));
      copyStatus.textContent = "Расчёт скопирован.";
    } catch (clipboardError) {
      copyStatus.textContent = "Не удалось скопировать расчёт. Выделите текст результата вручную.";
    }
  });
  render();
});
