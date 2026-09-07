const PHONE_HEADER_PATTERN = /^(phone|tel|telephone|телефон|мобильн\w*|номер)$/i;
const EMAIL_HEADER_PATTERN = /^(email|e-mail|mail|почта)$/i;

function cleanHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_.-]+/g, "");
}

function detectColumns(headers, rows = []) {
  const findByHeader = (pattern) => headers.reduce((found, header, index) => found !== null || !pattern.test(cleanHeader(header)) ? found : index, null);
  const result = { phone: findByHeader(PHONE_HEADER_PATTERN), email: findByHeader(EMAIL_HEADER_PATTERN) };
  const samples = rows.slice(0, 50);
  const findByValues = (field) => headers.reduce((best, header, index) => {
    if (index === result.phone || index === result.email) return best;
    const score = samples.reduce((total, row) => {
      const value = String(row[index] || "").trim();
      if (!value) return total;
      if (field === "phone") return total + (normalizePhone(value).valid ? 1 : 0);
      return total + (normalizeEmail(value).valid || value.includes("@") ? 1 : 0);
    }, 0);
    return score > best.score ? { index, score } : best;
  }, { index: null, score: 0 }).index;
  if (result.phone === null) result.phone = findByValues("phone");
  if (result.email === null) result.email = findByValues("email");
  return result;
}

function normalizePhone(value, allowRepair = false) {
  const original = String(value ?? "").trim();
  if (!original) return { value: "", valid: true, changed: false };
  const hasLetters = /[a-zа-яё]/i.test(original);
  const hasInvalidSymbols = /[^\d\s()+-]/.test(original);
  let digits = original.replace(/\D/g, "");
  if (/^89\d{9}$/.test(digits)) digits = `7${digits.slice(1)}`;
  else if (digits.length === 10 && /^9\d{9}$/.test(digits)) digits = `7${digits}`;
  const russianMobile = /^79\d{9}$/.test(digits);
  const international = !digits.startsWith("7") && !digits.startsWith("8") && /^[1-9]\d{7,14}$/.test(digits);
  const structurallyValid = russianMobile || international;
  if (!hasLetters && !hasInvalidSymbols && structurallyValid) return { value: digits, valid: true, changed: digits !== original };
  const repairable = !hasLetters && hasInvalidSymbols && structurallyValid;
  if (allowRepair && repairable) return { value: digits, valid: true, changed: true, repaired: true };
  return { value: "", valid: false, changed: false, suggestion: repairable ? digits : "" };
}

function normalizeEmail(value, allowRepair = false) {
  const original = String(value ?? "");
  if (!original.trim()) return { value: "", valid: true, changed: false };
  const email = original.trim().toLowerCase();
  const pattern = /^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
  if (pattern.test(email)) return { value: email, valid: true, changed: email !== original };
  const isLatin = /^[\x00-\x7f]*$/.test(email);
  const hasSingleAt = (email.match(/@/g) || []).length === 1;
  const suggestion = isLatin && hasSingleAt ? email.replace(/[^a-z0-9@._+-]/g, "") : "";
  const repairable = suggestion !== email && pattern.test(suggestion);
  if (allowRepair && repairable) return { value: suggestion, valid: true, changed: true, repaired: true };
  return { value: "", valid: false, changed: false, suggestion: repairable ? suggestion : "" };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(records) {
  const fields = ["phone", "email"].filter((field) => records.some((record) => record[field]));
  return [fields.join(","), ...records.map((record) => fields.map((field) => csvCell(record[field])).join(","))].join("\r\n");
}

function processRows(rows, mapping, options = {}) {
  const metrics = { source: rows.length, valid: 0, phonesFixed: 0, emailsFixed: 0, duplicates: 0, errors: 0 };
  const records = [];
  const issues = [];
  const seen = new Set();
  rows.forEach((row, index) => {
    const phone = normalizePhone(mapping.phone === null ? "" : row[mapping.phone], options.rowPolicy === "repair");
    const email = normalizeEmail(mapping.email === null ? "" : row[mapping.email], options.rowPolicy === "repair");
    const rowIssues = [];
    if (!phone.valid || !email.valid) rowIssues.push("некорректные данные");
    const record = { phone: phone.valid ? phone.value : "", email: email.valid ? email.value : "" };
    if (!record.phone && !record.email) rowIssues.push("нет корректного телефона или email");
    if (phone.changed && phone.valid) metrics.phonesFixed += 1;
    if (email.changed && email.valid) metrics.emailsFixed += 1;
    if (rowIssues.length) {
      metrics.errors += 1;
      const suggestions = [["телефон", phone.suggestion], ["email", email.suggestion]].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
      issues.push({ row: index + 2, reason: rowIssues.join(", "), suggestion: suggestions.join("; ") });
    }
    if (!record.phone && !record.email) return;
    const key = `${record.phone}\u0000${record.email}`;
    if (seen.has(key)) {
      metrics.duplicates += 1;
      return;
    }
    seen.add(key);
    records.push(record);
  });
  metrics.valid = records.length;
  return { records, issues, metrics };
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashRecords(records) {
  return Promise.all(records.map(async (record) => ({
    phone: record.phone ? await sha256(record.phone) : "",
    email: record.email ? await sha256(record.email) : ""
  })));
}

const AudienceToolCore = { detectColumns, normalizePhone, normalizeEmail, csvCell, toCsv, processRows, sha256, hashRecords };
if (typeof module !== "undefined" && module.exports) module.exports = AudienceToolCore;
if (typeof self !== "undefined") self.AudienceToolCore = AudienceToolCore;

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-audience-tool]");
  if (!root) return;
  const fileInput = root.querySelector("[data-audience-file]");
  const dropzone = root.querySelector("[data-audience-dropzone]");
  const pasteBox = root.querySelector("[data-audience-paste]");
  const mappingBox = root.querySelector("[data-audience-mapping]");
  const resultBox = root.querySelector("[data-audience-results]");
  const status = root.querySelector("[data-audience-status]");
  let source = null;
  let result = null;
  let pendingPaste = "";
  let workerFailed = window.location.protocol === "file:";
  let worker = null;
  if (!workerFailed) {
    try { worker = new Worker("audience-worker.js?v=20260907-11"); }
    catch (error) { workerFailed = true; }
  }

  const setStatus = (message, error = false) => { status.textContent = message; status.hidden = !message; status.classList.toggle("audience-status--error", error); };
  const reset = () => { source = null; result = null; fileInput.value = ""; pasteBox.value = ""; mappingBox.hidden = true; resultBox.hidden = true; root.querySelector("[data-audience-reset]").hidden = true; setStatus(""); };
  const mapping = () => Object.fromEntries(["phone", "email"].map((key) => [key, Number.parseInt(mappingBox.querySelector(`[data-audience-map="${key}"]`).value, 10)]).map(([key, value]) => [key, Number.isInteger(value) && value >= 0 ? value : null]));
  const parsePastedSource = (text) => {
    const rows = text.includes("\t") ? text.split(/\r?\n/).filter((line) => line.trim()).map((line) => line.split("\t").map((cell) => cell.trim())) : text.split(/\r?\n/).filter((line) => line.trim()).map((line) => [line.trim()]);
    const width = Math.max(...rows.map((row) => row.length));
    const headers = Array.from({ length: width }, (_, index) => `Колонка ${index + 1}`);
    return { headers, rows, suggestedMapping: AudienceToolCore.detectColumns(headers, rows) };
  };
  const sourceFromMatrix = (matrix) => {
    if (!matrix.length) throw new Error("В файле нет данных.");
    const width = Math.max(...matrix.map((row) => row.length));
    const firstRow = Array.from({ length: width }, (_, index) => String(matrix[0][index] ?? "").trim());
    const hasHeaders = Object.values(AudienceToolCore.detectColumns(firstRow)).some((index) => index !== null);
    const headers = hasHeaders ? firstRow.map((value, index) => value || `Колонка ${index + 1}`) : Array.from({ length: width }, (_, index) => `Колонка ${index + 1}`);
    const rows = (hasHeaders ? matrix.slice(1) : matrix).filter((row) => row.some((value) => String(value || "").trim())).map((row) => Array.from({ length: width }, (_, index) => String(row[index] ?? "").trim()));
    if (!rows.length) throw new Error("В файле нет строк с данными.");
    return { headers, rows, suggestedMapping: AudienceToolCore.detectColumns(headers, rows) };
  };
  const setProcessing = (active) => {
    const button = mappingBox.querySelector("[data-audience-process]");
    if (!button) return;
    button.disabled = active;
    button.textContent = active ? "Обрабатываем..." : "Обработать таблицу";
  };
  const process = async () => {
    const selected = mapping();
    if (selected.phone === null && selected.email === null) { setStatus("Выберите хотя бы колонку телефона или email.", true); return; }
    if (selected.phone !== null && selected.phone === selected.email) { setStatus("Телефон и email должны быть разными колонками.", true); return; }
    setStatus("Обрабатываем данные только в браузере.");
    setProcessing(true);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (workerFailed) {
      const payload = AudienceToolCore.processRows(source.rows, selected, { rowPolicy: root.querySelector("[data-audience-row-policy]").value });
      if (root.querySelector("[data-audience-hash]").checked) payload.records = await AudienceToolCore.hashRecords(payload.records);
      renderResult(payload);
      return;
    }
    worker.postMessage({ type: "process", rows: source.rows, mapping: selected, hash: root.querySelector("[data-audience-hash]").checked, options: { rowPolicy: root.querySelector("[data-audience-row-policy]").value } });
  };
  const renderMapping = () => {
    const detected = source.suggestedMapping || AudienceToolCore.detectColumns(source.headers, source.rows);
    const options = ['<option value="">Не использовать</option>', ...source.headers.map((header, index) => `<option value="${index}">${header}</option>`)].join("");
    mappingBox.innerHTML = ["phone", "email"].map((key) => `<label class="utm-field"><span class="utm-field__name">${key === "phone" ? "Колонка телефона" : "Колонка email"}</span><select class="utm-input" data-audience-map="${key}">${options}</select></label>`).join("") + '<button class="utm-button" type="button" data-audience-process>Обработать таблицу</button>';
    ["phone", "email"].forEach((key) => { if (detected[key] !== null) mappingBox.querySelector(`[data-audience-map="${key}"]`).value = detected[key]; });
    mappingBox.hidden = false;
    root.querySelector("[data-audience-reset]").hidden = false;
    setStatus(`Найдено строк: ${source.rows.length}. Проверьте назначение колонок.`);
  };
  const renderResult = (payload) => {
    result = payload;
    const m = payload.metrics;
    root.querySelector("[data-audience-metrics]").innerHTML = [["Исходных строк", m.source], ["Корректных", m.valid], ["Исправлено телефонов", m.phonesFixed], ["Исправлено email", m.emailsFixed], ["Удалено дублей", m.duplicates], ["Ошибок", m.errors]].map(([label, value]) => `<div class="audience-metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
    root.querySelector("[data-audience-preview]").textContent = AudienceToolCore.toCsv(payload.records.slice(0, 10));
    const issues = root.querySelector("[data-audience-issues]");
    issues.innerHTML = payload.issues.length ? `<h2>Некорректные строки</h2><p class="utm-note">По умолчанию некорректные данные не включены в CSV. Выберите безопасное исправление выше, чтобы удалить только недопустимые символы, и обработайте таблицу повторно.</p><ul>${payload.issues.slice(0, 100).map((item) => `<li>Строка ${item.row}: ${item.reason}${item.suggestion ? `. Возможное исправление: ${item.suggestion}` : ""}</li>`).join("")}</ul>${payload.issues.length > 100 ? `<p class="utm-note">Показаны первые 100 ошибок из ${payload.issues.length}.</p>` : ""}` : "";
    root.querySelector("[data-audience-warning]").hidden = m.valid >= 100;
    resultBox.hidden = false;
    setProcessing(false);
    setStatus(`Готово: подготовлено строк ${m.valid}. Данные не покидали браузер.`);
    resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const read = async (file) => {
    if (!file) return;
    setStatus("Читаем файл локально в браузере.");
    try {
      const buffer = await file.arrayBuffer();
      if (!window.XLSX) throw new Error("Не удалось загрузить модуль чтения таблиц.");
      const workbook = window.XLSX.read(buffer, { type: "array", cellText: true });
      source = sourceFromMatrix(window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "", raw: false }));
      renderMapping();
      setStatus(`Файл прочитан: ${source.rows.length} строк. Проверьте колонки и нажмите «Обработать таблицу».`);
    } catch (error) { setStatus(error.message || "Не удалось прочитать файл.", true); }
  };
  if (worker) {
    worker.onerror = () => {
      workerFailed = true;
      if (!source && pendingPaste) { source = parsePastedSource(pendingPaste); renderMapping(); }
      if (source) process();
      else setStatus("Не удалось запустить обработчик файла. Обновите страницу через Ctrl+F5 и повторите попытку.", true);
    };
    worker.onmessage = (event) => {
      const data = event.data;
      if (data.type === "parsed") {
        source = data;
        pendingPaste = "";
        renderMapping();
        if (data.suggestedMapping && (data.suggestedMapping.phone !== null || data.suggestedMapping.email !== null)) process();
      } else if (data.type === "processed") renderResult(data);
      else if (data.type === "error") { setProcessing(false); setStatus(data.message, true); }
    };
  }
  fileInput.addEventListener("change", () => read(fileInput.files[0]));
  dropzone.addEventListener("dragover", (event) => { event.preventDefault(); dropzone.classList.add("is-dragging"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
  dropzone.addEventListener("drop", (event) => { event.preventDefault(); dropzone.classList.remove("is-dragging"); read(event.dataTransfer.files[0]); });
  root.addEventListener("click", (event) => { if (event.target.closest("[data-audience-process]")) process(); if (event.target.closest("[data-audience-reset]")) reset(); if (event.target.closest("[data-audience-download]") && result) { const blob = new Blob([AudienceToolCore.toCsv(result.records)], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "yandex-audiences.csv"; link.click(); URL.revokeObjectURL(link.href); } });
  root.querySelector("[data-audience-paste-submit]").addEventListener("click", () => { const text = pasteBox.value.trim(); if (!text) { setStatus("Вставьте таблицу из буфера обмена.", true); return; } pendingPaste = text; if (workerFailed) { source = parsePastedSource(text); renderMapping(); process(); return; } worker.postMessage({ type: "read", file: { name: "Вставленные данные.txt" }, text }); });
});
