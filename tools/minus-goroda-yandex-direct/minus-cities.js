(() => {
  const normalize = (value) => String(value || "").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  const compare = (left, right) => left.localeCompare(right, "ru-RU", { sensitivity: "base" });
  const cityKey = (city) => `${city.name}::${city.region}`;
  const displayCity = (city, duplicateNames) => duplicateNames.has(city.name) ? `${city.name} - ${city.region}` : city.name;
  const makeRows = (items, includeRegions) => includeRegions ? [["Название", "Тип", "Регион"], ...items.map((item) => [item.name, item.type === "region" ? "Регион" : "Город", item.region || ""])]: [["Город"], ...items.map((item) => [item.name])];
  const csvValue = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const toCsv = (items, includeRegions) => makeRows(items, includeRegions).map((row) => row.map(csvValue).join(";")).join("\r\n");
  function buildResult(data, selections, includeRegions) {
    const targetRegions = new Set(selections.filter((item) => item.kind === "region").map((item) => item.name));
    const targetCityNames = new Set(selections.filter((item) => item.kind === "city").map((item) => normalize(item.name)));
    const byName = new Map();
    data.cities.forEach((city) => { const nameKey = normalize(city.name); if (!targetRegions.has(city.region) && !targetCityNames.has(nameKey)) byName.set(nameKey, city); });
    const cities = [...byName.values()].sort((a, b) => compare(a.name, b.name));
    const regions = includeRegions ? data.regions.filter((region) => !targetRegions.has(region.name)).sort((a, b) => compare(a.name, b.name)) : [];
    const items = [...cities, ...regions];
    const text = items.map((item) => item.name).join("\n");
    return { cities, regions, items, text, characters: text.replace(/\s/g, "").length };
  }
  const api = { normalize, buildResult, toCsv, makeRows };
  if (typeof window !== "undefined") window.NaklikayMinusCities = api;
  const root = document.querySelector("[data-minus-cities]");
  if (!root) return;
  const search = root.querySelector("[data-minus-search]"); const suggestions = root.querySelector("[data-minus-suggestions]"); const chips = root.querySelector("[data-minus-chips]"); const setting = root.querySelector("[data-minus-regions]"); const clear = root.querySelector("[data-minus-clear]");
  const count = root.querySelector("[data-minus-count]"); const characters = root.querySelector("[data-minus-characters]"); const preview = root.querySelector("[data-minus-preview]"); const previewNote = root.querySelector("[data-minus-preview-note]"); const limit = root.querySelector("[data-minus-limit]"); const status = root.querySelector("[data-minus-status]"); const dataNote = root.querySelector("[data-minus-data-note]");
  const number = new Intl.NumberFormat("ru-RU"); let data; let selections = []; let result; let shown = []; let activeIndex = -1; let duplicateNames = new Set();
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  function currentOptions() {
    const query = normalize(search.value); if (!query || !data) return [];
    const used = new Set(selections.map((item) => item.key));
    return [...data.cities.map((city) => ({ kind: "city", key: cityKey(city), name: city.name, region: city.region, label: displayCity(city, duplicateNames) })), ...data.regions.map((region) => ({ kind: "region", key: `region::${region.name}`, name: region.name, label: region.name }))]
      .filter((item) => !used.has(item.key) && normalize(item.label).includes(query))
      .sort((a, b) => { const aStart = normalize(a.label).startsWith(query); const bStart = normalize(b.label).startsWith(query); return Number(bStart) - Number(aStart) || Number(a.kind === "region") - Number(b.kind === "region") || compare(a.label, b.label); }).slice(0, 12);
  }
  function renderSuggestions() { shown = currentOptions(); activeIndex = -1; suggestions.hidden = !shown.length; search.setAttribute("aria-expanded", String(Boolean(shown.length))); suggestions.innerHTML = shown.map((item, index) => `<button type="button" role="option" class="minus-cities-suggestion" data-index="${index}" aria-selected="false"><span>${escapeHtml(item.label)}</span><small>${item.kind === "region" ? "Регион" : "Город"}</small></button>`).join(""); }
  function renderChips() { chips.innerHTML = selections.map((item) => `<span class="minus-cities-chip">${escapeHtml(item.label)}<button type="button" aria-label="Удалить ${escapeHtml(item.label)}" data-key="${escapeHtml(item.key)}">×</button></span>`).join(""); chips.hidden = !selections.length; }
  function renderResult() { if (!data) return; result = buildResult(data, selections, setting.checked); count.textContent = `Готово: ${number.format(result.cities.length)} городов`; characters.textContent = `Символов без пробелов: ${number.format(result.characters)}`; const limitValue = 20000; limit.hidden = result.characters <= limitValue; if (!limit.hidden) limit.textContent = `Объём превышает лимит Яндекс Директа для минус-фраз на кампанию - ${number.format(limitValue)} символов без пробелов.`; const lines = result.text ? result.text.split("\n") : []; preview.textContent = lines.slice(0, 30).join("\n"); previewNote.textContent = `Показано ${number.format(Math.min(30, lines.length))} из ${number.format(lines.length)}`; }
  function add(item) { if (selections.some((selected) => selected.key === item.key)) return; selections.push(item); search.value = ""; suggestions.hidden = true; search.setAttribute("aria-expanded", "false"); renderChips(); renderResult(); search.focus(); }
  function download(content, type, filename) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 0); }
  async function copyText(text) { try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text); else { const area = document.createElement("textarea"); area.value = text; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); } status.textContent = "Список скопирован"; } catch { status.textContent = "Не удалось скопировать список. Скачайте TXT."; } }
  search.addEventListener("input", renderSuggestions); search.addEventListener("focus", renderSuggestions); search.addEventListener("keydown", (event) => { if (!shown.length) return; if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); activeIndex = (activeIndex + (event.key === "ArrowDown" ? 1 : shown.length - 1)) % shown.length; suggestions.querySelectorAll("button").forEach((item, index) => item.classList.toggle("is-active", index === activeIndex)); } if (event.key === "Enter" && activeIndex >= 0) { event.preventDefault(); add(shown[activeIndex]); } if (event.key === "Escape") { suggestions.hidden = true; search.setAttribute("aria-expanded", "false"); } });
  suggestions.addEventListener("pointerdown", (event) => { const button = event.target.closest("[data-index]"); if (!button) return; event.preventDefault(); add(shown[Number(button.dataset.index)]); });
  chips.addEventListener("click", (event) => { const button = event.target.closest("[data-key]"); if (!button) return; selections = selections.filter((item) => item.key !== button.dataset.key); renderChips(); renderResult(); });
  setting.addEventListener("change", renderResult); clear.addEventListener("click", () => { selections = []; setting.checked = false; search.value = ""; renderChips(); renderResult(); status.textContent = "Выбор очищен"; search.focus(); });
  root.querySelector("[data-minus-copy]").addEventListener("click", () => result && copyText(result.text));
  root.querySelectorAll("[data-minus-download]").forEach((button) => button.addEventListener("click", () => { if (!result) return; const type = button.dataset.minusDownload; if (type === "txt") download(result.text, "text/plain;charset=utf-8", "minus-goroda-yandex-direct.txt"); if (type === "csv") download(`\ufeff${toCsv(result.items, setting.checked)}`, "text/csv;charset=utf-8", "minus-goroda-yandex-direct.csv"); if (type === "xlsx") { if (!window.XLSX) { status.textContent = "Не удалось загрузить модуль XLSX."; return; } const sheet = window.XLSX.utils.aoa_to_sheet(makeRows(result.items, setting.checked)); sheet["!cols"] = setting.checked ? [{ wch: 34 }, { wch: 13 }, { wch: 42 }] : [{ wch: 34 }]; const book = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(book, sheet, "Минус-города"); window.XLSX.writeFile(book, "minus-goroda-yandex-direct.xlsx", { compression: true }); } }));
  fetch("../../data/russia-cities.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then((payload) => { if (!Array.isArray(payload.cities) || !Array.isArray(payload.regions)) throw new Error("Invalid data"); data = payload; const nameCounts = new Map(); data.cities.forEach((city) => { const key = normalize(city.name); nameCounts.set(key, (nameCounts.get(key) || 0) + 1); }); duplicateNames = new Set(data.cities.filter((city) => nameCounts.get(normalize(city.name)) > 1).map((city) => city.name)); dataNote.textContent = `${number.format(data.cities.length)} городов из локальной базы. Источник: ${data.source}.`; renderResult(); }).catch(() => { dataNote.textContent = "Не удалось загрузить локальную базу городов. Обновите страницу."; status.textContent = "Список временно недоступен."; });
})();
