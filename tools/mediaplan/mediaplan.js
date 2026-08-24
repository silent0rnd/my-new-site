const ROW_COLUMNS = [["phrase", "Фраза или группа фраз"], ["frequency", "Частотность в месяц"], ["impressions", "Прогноз показов"], ["clicks", "Прогноз кликов"], ["ctr", "CTR, %"], ["cpc", "Средняя цена клика, ₽"], ["budget", "Бюджет, ₽"]];
const INPUT_COLUMNS = new Set(["phrase", "frequency", "impressions", "clicks", "cpc"]);
const CHANNEL_LABELS = { search: "Поиск", network: "РСЯ" };

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const normalized = value.replace(/[\s\u00a0]/g, "").replace(",", ".");
  return normalized === "" ? Number.NaN : Number(normalized);
}

function number(value) {
  const result = toNumber(value);
  return Number.isFinite(result) && result >= 0 ? result : 0;
}

function calculateRow(row) {
  const frequency = number(row.frequency);
  const impressions = number(row.impressions);
  const clicks = number(row.clicks);
  const cpc = number(row.cpc);
  return { ...row, frequency, impressions, clicks, cpc, ctr: impressions > 0 ? clicks / impressions * 100 : 0, budget: clicks * cpc };
}

function calculateSection(section) {
  const rows = (section.rows || []).map(calculateRow);
  const totals = rows.reduce((sum, row) => ({
    frequency: sum.frequency + row.frequency,
    impressions: sum.impressions + row.impressions,
    clicks: sum.clicks + row.clicks,
    budget: sum.budget + row.budget
  }), { frequency: 0, impressions: 0, clicks: 0, budget: 0 });
  const clickToApplication = number(section.clickToApplication) / 100;
  const applicationToQualified = number(section.applicationToQualified) / 100;
  const qualifiedToSale = number(section.qualifiedToSale) / 100;
  totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions * 100 : 0;
  totals.cpc = totals.clicks > 0 ? totals.budget / totals.clicks : 0;
  totals.applications = totals.clicks * clickToApplication;
  totals.applicationCost = totals.applications > 0 ? totals.budget / totals.applications : 0;
  totals.qualifiedLeads = totals.applications * applicationToQualified;
  totals.qualifiedLeadCost = totals.qualifiedLeads > 0 ? totals.budget / totals.qualifiedLeads : 0;
  totals.sales = totals.qualifiedLeads * qualifiedToSale;
  totals.saleCost = totals.sales > 0 ? totals.budget / totals.sales : 0;
  return { rows, totals, clickToApplication: clickToApplication * 100, applicationToQualified: applicationToQualified * 100, qualifiedToSale: qualifiedToSale * 100 };
}

function calculateTotals(sections) {
  const calculated = {};
  Object.entries(sections).forEach(([key, section]) => { calculated[key] = calculateSection(section); });
  const totals = Object.values(calculated).reduce((sum, section) => {
    ["frequency", "impressions", "clicks", "budget", "applications", "qualifiedLeads", "sales"].forEach((key) => { sum[key] += section.totals[key]; });
    return sum;
  }, { frequency: 0, impressions: 0, clicks: 0, budget: 0, applications: 0, qualifiedLeads: 0, sales: 0 });
  totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions * 100 : 0;
  totals.cpc = totals.clicks > 0 ? totals.budget / totals.clicks : 0;
  totals.applicationCost = totals.applications > 0 ? totals.budget / totals.applications : 0;
  totals.qualifiedLeadCost = totals.qualifiedLeads > 0 ? totals.budget / totals.qualifiedLeads : 0;
  totals.saleCost = totals.sales > 0 ? totals.budget / totals.sales : 0;
  return { sections: calculated, totals };
}

function createBlankRow() {
  return { id: `phrase-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, phrase: "", frequency: "", impressions: "", clicks: "", cpc: "" };
}

function defaultState() {
  return {
    search: { clickToApplication: "5", applicationToQualified: "40", qualifiedToSale: "", rows: [createBlankRow()] },
    network: { clickToApplication: "2", applicationToQualified: "35", qualifiedToSale: "", rows: [createBlankRow()] }
  };
}

function setCell(sheet, address, value, format, formula) {
  sheet[address] = { t: "n", v: value, ...(format ? { z: format } : {}), ...(formula ? { f: formula } : {}) };
}

function appendMetric(sheet, row, label, value, formula) {
  sheet[`A${row}`] = { t: "s", v: label };
  const currency = label.includes("Цена") || label.includes("Стоимость") || label.includes("бюджет");
  setCell(sheet, `B${row}`, value, currency ? '#,##0.00 [$₽-419]' : "#,##0.00", formula);
}

function appendSection(XLSX, sheet, row, label, section) {
  const first = row;
  const conversionRow = row + 2;
  sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = { t: "s", v: label };
  row += 1;
  [["Конверсия клик → заявка", section.clickToApplication], ["Конверсия заявка → квалифицированный лид", section.applicationToQualified], ["Конверсия квалифицированный лид → продажа", section.qualifiedToSale]].forEach(([conversionLabel, conversion], index) => {
    const column = index * 2;
    sheet[XLSX.utils.encode_cell({ r: row, c: column })] = { t: "s", v: conversionLabel };
    setCell(sheet, XLSX.utils.encode_cell({ r: row, c: column + 1 }), conversion / 100, "0.0%");
  });
  row += 2;
  ROW_COLUMNS.forEach(([, columnLabel], column) => { sheet[XLSX.utils.encode_cell({ r: row, c: column })] = { t: "s", v: columnLabel }; });
  row += 1;
  section.rows.forEach((item) => {
    const excelRow = row + 1;
    const values = [item.phrase, item.frequency, item.impressions, item.clicks, item.ctr / 100, item.cpc, item.budget];
    values.forEach((value, column) => { sheet[XLSX.utils.encode_cell({ r: row, c: column })] = typeof value === "number" ? { t: "n", v: value } : { t: "s", v: value || "" }; });
    setCell(sheet, `E${excelRow}`, item.ctr / 100, "0.0%", `IFERROR(D${excelRow}/C${excelRow},0)`);
    setCell(sheet, `G${excelRow}`, item.budget, '#,##0.00 [$₽-419]', `D${excelRow}*F${excelRow}`);
    row += 1;
  });
  const totalRow = row + 1;
  const firstDataRow = first + 5;
  sheet[`A${totalRow}`] = { t: "s", v: `ИТОГО ${label.toUpperCase()}` };
  [["B", "frequency"], ["C", "impressions"], ["D", "clicks"], ["G", "budget"]].forEach(([column, key]) => setCell(sheet, `${column}${totalRow}`, section.totals[key], undefined, `SUM(${column}${firstDataRow}:${column}${totalRow - 1})`));
  setCell(sheet, `E${totalRow}`, section.totals.ctr / 100, "0.0%", `IFERROR(D${totalRow}/C${totalRow},0)`);
  setCell(sheet, `F${totalRow}`, section.totals.cpc, '#,##0.00 [$₽-419]', `IFERROR(G${totalRow}/D${totalRow},0)`);
  row += 2;
  const conversionExcelRow = conversionRow;
  const metrics = [
    ["Заявки", section.totals.applications, `D${totalRow}*$B$${conversionExcelRow}`],
    ["Цена заявки, ₽", section.totals.applicationCost, `IFERROR(G${totalRow}/(D${totalRow}*$B$${conversionExcelRow}),0)`],
    ["Квалифицированные лиды", section.totals.qualifiedLeads, `D${totalRow}*$B$${conversionExcelRow}*$D$${conversionExcelRow}`],
    ["Стоимость квалифицированного лида, ₽", section.totals.qualifiedLeadCost, `IFERROR(G${totalRow}/(D${totalRow}*$B$${conversionExcelRow}*$D$${conversionExcelRow}),0)`],
    ["Продажи", section.totals.sales, `D${totalRow}*$B$${conversionExcelRow}*$D$${conversionExcelRow}*$F$${conversionExcelRow}`],
    ["Стоимость продажи, ₽", section.totals.saleCost, `IFERROR(G${totalRow}/(D${totalRow}*$B$${conversionExcelRow}*$D$${conversionExcelRow}*$F$${conversionExcelRow}),0)`]
  ];
  metrics.forEach(([metricLabel, metricValue, formula]) => { appendMetric(sheet, row + 1, metricLabel, metricValue, formula); row += 1; });
  return row + 2;
}

function createWorkbook(XLSX, state) {
  const calculation = calculateTotals(state);
  const sheet = {};
  sheet.A1 = { t: "s", v: "Медиаплан Яндекс Директа" };
  let row = 2;
  row = appendSection(XLSX, sheet, row, "Поиск", calculation.sections.search);
  row = appendSection(XLSX, sheet, row, "РСЯ", calculation.sections.network);
  sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = { t: "s", v: "ОБЩИЙ ИТОГ" };
  row += 1;
  [["Показы", calculation.totals.impressions], ["Клики", calculation.totals.clicks], ["CTR", calculation.totals.ctr / 100], ["Средняя цена клика, ₽", calculation.totals.cpc], ["Заявки", calculation.totals.applications], ["Цена заявки, ₽", calculation.totals.applicationCost], ["Квалифицированные лиды", calculation.totals.qualifiedLeads], ["Стоимость квалифицированного лида, ₽", calculation.totals.qualifiedLeadCost], ["Продажи", calculation.totals.sales], ["Стоимость продажи, ₽", calculation.totals.saleCost], ["Общий бюджет, ₽", calculation.totals.budget]].forEach(([label, value]) => {
    const format = label === "CTR" ? "0.0%" : label.includes("Цена") || label.includes("Стоимость") || label.includes("бюджет") ? '#,##0.00 [$₽-419]' : "#,##0.00";
    setCell(sheet, XLSX.utils.encode_cell({ r: row, c: 1 }), value, format);
    sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = { t: "s", v: label };
    row += 1;
  });
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
  sheet["!cols"] = [{ wch: 42 }, { wch: 21 }, { wch: 19 }, { wch: 18 }, { wch: 11 }, { wch: 33 }, { wch: 18 }];
  sheet["!ref"] = `A1:G${row}`;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Медиаплан");
  return workbook;
}

if (typeof module !== "undefined" && module.exports) module.exports = { toNumber, calculateRow, calculateSection, calculateTotals, createBlankRow, defaultState, createWorkbook };

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-mediaplan]");
  if (!root) return;
  const storage = "naklikay-direct-mediaplan-v4";
  const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
  const count = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
  let state = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(storage) || localStorage.getItem("naklikay-direct-mediaplan-v3") || "null");
    if (saved && saved.search && saved.network) state = saved;
  } catch (error) {}
  ["search", "network"].forEach((key) => {
    if (typeof state[key].qualifiedToSale !== "string") state[key].qualifiedToSale = "";
  });
  const value = (item) => item === 0 ? "0" : item || "";
  const show = (key, item) => ["frequency", "impressions", "clicks", "applications", "qualifiedLeads", "sales"].includes(key) ? count.format(item) : key === "ctr" ? `${percent.format(item)}%` : `${money.format(item)} ₽`;
  const save = () => { try { localStorage.setItem(storage, JSON.stringify(state)); } catch (error) {} };
  const metrics = [["Показы", "impressions"], ["Клики", "clicks"], ["CTR", "ctr"], ["Средняя цена клика", "cpc"], ["Заявки", "applications"], ["Цена заявки", "applicationCost"], ["Квалифицированные лиды", "qualifiedLeads"], ["Стоимость квалифицированного лида", "qualifiedLeadCost"], ["Продажи", "sales"], ["Стоимость продажи", "saleCost"], ["Бюджет", "budget"]];
  function summary(box, totals) {
    box.innerHTML = metrics.map(([label, key]) => `<div class="mediaplan-stat"><span>${label}</span><strong>${show(key, totals[key])}</strong></div>`).join("");
  }
  function render() {
    const calculation = calculateTotals(state);
    ["search", "network"].forEach((key) => {
      const section = calculation.sections[key];
      const box = root.querySelector(`[data-section-rows="${key}"]`);
      box.innerHTML = "";
      ["clickToApplication", "applicationToQualified", "qualifiedToSale"].forEach((conversion) => { root.querySelector(`[data-conversion="${key}:${conversion}"]`).value = value(state[key][conversion]); });
      section.rows.forEach((row, index) => {
        const tr = document.createElement("tr");
        ROW_COLUMNS.forEach(([field, label]) => {
          const td = document.createElement("td");
          td.dataset.label = label;
          if (INPUT_COLUMNS.has(field)) {
            const input = document.createElement("input");
            input.className = "utm-input mediaplan-input";
            input.dataset.section = key;
            input.dataset.rowId = state[key].rows[index].id;
            input.dataset.key = field;
            input.value = value(state[key].rows[index][field]);
            input.inputMode = field === "phrase" ? "text" : "decimal";
            input.setAttribute("aria-label", `${label}, ${CHANNEL_LABELS[key]}, строка ${index + 1}`);
            td.append(input);
          } else td.textContent = show(field, row[field]);
          tr.append(td);
        });
        const actions = document.createElement("td");
        actions.className = "mediaplan-row-actions";
        actions.dataset.label = "Действия";
        [["duplicate", "Дублировать"], ["remove", "Удалить"]].forEach(([action, label]) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "mediaplan-row-button";
          button.dataset.action = action;
          button.dataset.section = key;
          button.dataset.rowId = state[key].rows[index].id;
          button.textContent = label;
          actions.append(button);
        });
        tr.append(actions);
        box.append(tr);
      });
      summary(root.querySelector(`[data-section-summary="${key}"]`), section.totals);
    });
    summary(root.querySelector("[data-mediaplan-summary]"), calculation.totals);
    save();
  }
  root.addEventListener("input", (event) => {
    const field = event.target;
    if (field.matches("[data-conversion]")) {
      const [section, key] = field.dataset.conversion.split(":");
      state[section][key] = field.value;
      render();
      return;
    }
    if (!field.matches("[data-row-id]")) return;
    const row = state[field.dataset.section].rows.find((item) => item.id === field.dataset.rowId);
    const cursor = field.selectionStart;
    if (row) row[field.dataset.key] = field.value;
    render();
    const next = root.querySelector(`[data-section="${field.dataset.section}"][data-row-id="${field.dataset.rowId}"][data-key="${field.dataset.key}"]`);
    if (next) { next.focus(); next.setSelectionRange(cursor, cursor); }
  });
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.addPhrase) { state[button.dataset.addPhrase].rows.push(createBlankRow()); render(); return; }
    const section = button.dataset.section;
    const index = section ? state[section].rows.findIndex((row) => row.id === button.dataset.rowId) : -1;
    if (index < 0) return;
    if (button.dataset.action === "duplicate") { state[section].rows.splice(index + 1, 0, { ...state[section].rows[index], id: createBlankRow().id }); render(); }
    if (button.dataset.action === "remove" && window.confirm("Удалить эту фразу из медиаплана?")) { state[section].rows.splice(index, 1); render(); }
  });
  root.querySelector("[data-mediaplan-clear]").addEventListener("click", () => { if (window.confirm("Очистить оба блока медиаплана?")) { state = defaultState(); render(); } });
  root.querySelector("[data-mediaplan-print]").addEventListener("click", () => window.print());
  root.querySelector("[data-mediaplan-xlsx]").addEventListener("click", () => window.XLSX.writeFile(createWorkbook(window.XLSX, state), "mediaplan-yandex-direct.xlsx", { compression: true }));
  render();
});
