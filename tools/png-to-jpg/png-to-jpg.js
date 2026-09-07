const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const INVALID_FILENAME = /[\\/:*?"<>|]/;

function normalizeOutputName(value) {
  return String(value ?? "").trim().replace(/(?:\.(?:png|jpe?g))+$/i, "").trim();
}

function outputFilename(value) {
  return `${normalizeOutputName(value)}.jpg`;
}

function buildBatchOutputNames(value, count) {
  const base = normalizeOutputName(value);
  return Array.from({ length: Math.max(0, Number(count) || 0) }, (_, index) => `${base}-${index + 1}`);
}

function validateOutputName(value) {
  const name = normalizeOutputName(value);
  if (!name) return "Введите имя файла";
  if (INVALID_FILENAME.test(name)) return "В имени нельзя использовать \\ / : * ? \" < > |";
  return "";
}

function getNameErrors(items) {
  const errors = new Map();
  const names = new Map();
  items.forEach((item) => {
    const message = validateOutputName(item.outputName);
    if (message) errors.set(item.id, message);
    const normalized = normalizeOutputName(item.outputName).toLocaleLowerCase("ru-RU");
    if (normalized && !message) {
      const group = names.get(normalized) || [];
      group.push(item.id);
      names.set(normalized, group);
    }
  });
  names.forEach((ids) => ids.length > 1 && ids.forEach((id) => errors.set(id, "Такое имя уже используется")));
  return errors;
}

function isPngSignature(bytes) {
  return bytes && bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return "-";
  if (value < 1024) return `${value} Б`;
  const units = ["КБ", "МБ", "ГБ"];
  let size = value / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} ${units[index]}`;
}

function pluralImages(value) {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo > 10 && lastTwo < 20) return "изображений";
  if (last === 1) return "изображение";
  if (last >= 2 && last <= 4) return "изображения";
  return "изображений";
}

function sizeChangeText(sourceSize, resultSize) {
  if (!sourceSize) return "Изменение размера: -";
  const change = ((resultSize - sourceSize) / sourceSize) * 100;
  const sign = change > 0 ? "+" : "";
  return `Изменение размера: ${sign}${change.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`;
}

function getSizeSummary(items) {
  return items.reduce((summary, item) => {
    const sourceSize = Number(item.fileSize ?? item.file?.size) || 0;
    summary.sourceSize += sourceSize;
    if (Number.isFinite(item.resultSize) && item.resultSize > 0) {
      summary.convertedCount += 1;
      summary.convertedSourceSize += sourceSize;
      summary.resultSize += item.resultSize;
    }
    return summary;
  }, { sourceSize: 0, convertedSourceSize: 0, resultSize: 0, convertedCount: 0 });
}

const PngToJpgCore = { normalizeOutputName, outputFilename, buildBatchOutputNames, validateOutputName, getNameErrors, isPngSignature, formatBytes, pluralImages, sizeChangeText, getSizeSummary };
if (typeof module !== "undefined" && module.exports) module.exports = PngToJpgCore;

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-png-to-jpg]");
  if (!root) return;

  const input = root.querySelector("[data-png-file-input]");
  const dropzone = root.querySelector("[data-png-dropzone]");
  const status = root.querySelector("[data-png-status]");
  const controls = root.querySelector("[data-png-controls]");
  const listSection = root.querySelector("[data-png-list-section]");
  const list = root.querySelector("[data-png-list]");
  const actions = root.querySelector("[data-png-actions]");
  const quality = root.querySelector("[data-png-quality]");
  const qualityValue = root.querySelector("[data-png-quality-value]");
  const batchName = root.querySelector("[data-png-batch-name]");
  const applyBatchButton = root.querySelector("[data-png-apply-batch]");
  const background = root.querySelector("[data-png-background]");
  const backgroundValue = root.querySelector("[data-png-background-value]");
  const downloadAllButton = root.querySelector("[data-png-download-all]");
  const sizeSummary = root.querySelector("[data-png-size-summary]");
  const sourceTotal = root.querySelector("[data-png-source-total]");
  const resultTotal = root.querySelector("[data-png-result-total]");
  let items = [];
  let processing = false;
  let nextId = 1;
  let calculationTimer = 0;

  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("png-jpg-status--error", error);
  };
  const track = (goal) => {
    if (window.__naklikayMetrikaLoaded && typeof window.ym === "function") window.ym(110564693, "reachGoal", goal);
  };
  const revokeResult = (item) => {
    if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    item.resultUrl = "";
    item.resultBlob = null;
    item.resultSize = 0;
  };
  const releaseItem = (item) => {
    if (item.sourceUrl) URL.revokeObjectURL(item.sourceUrl);
    revokeResult(item);
  };
  const invalidateResults = () => items.forEach((item) => revokeResult(item));
  const cancelPendingCalculation = () => {
    if (calculationTimer) window.clearTimeout(calculationTimer);
    calculationTimer = 0;
  };
  const imageFromUrl = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось прочитать PNG"));
    image.src = url;
  });
  const toBlob = (canvas, qualityValue) => new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Не удалось создать JPG")), "image/jpeg", qualityValue));
  const verifyPng = async (file) => {
    try { return isPngSignature(new Uint8Array(await file.slice(0, PNG_SIGNATURE.length).arrayBuffer())); }
    catch (error) { return false; }
  };
  const validItems = () => items.filter((item) => !item.error);
  const createText = (tag, value, className = "") => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    return element;
  };
  const renderSizeSummary = () => {
    const summary = getSizeSummary(items);
    sizeSummary.hidden = !items.length;
    sourceTotal.textContent = `PNG: ${formatBytes(summary.sourceSize)}`;
    if (!summary.convertedCount) {
      resultTotal.textContent = "JPG: рассчитаем после конвертации";
      return;
    }
    const fullyConverted = summary.convertedCount === validItems().length;
    const label = fullyConverted ? "JPG" : `JPG (${summary.convertedCount} из ${validItems().length})`;
    resultTotal.textContent = `${label}: ${formatBytes(summary.resultSize)} · ${sizeChangeText(summary.convertedSourceSize, summary.resultSize)}`;
  };

  const render = () => {
    const nameErrors = getNameErrors(items);
    const valid = validItems();
    controls.hidden = !items.length;
    listSection.hidden = !items.length;
    actions.hidden = !items.length;
    batchName.disabled = processing || !items.length;
    applyBatchButton.disabled = processing || !items.length;
    quality.disabled = processing || !items.length;
    background.disabled = processing || !items.length;
    downloadAllButton.hidden = valid.filter((item) => item.resultBlob).length < 2 || processing;
    renderSizeSummary();
    list.replaceChildren();

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "png-jpg-file";
      card.dataset.pngItem = String(item.id);
      const preview = document.createElement("img");
      preview.className = "png-jpg-file__preview";
      preview.src = item.sourceUrl;
      preview.alt = "";
      card.append(preview);
      const details = document.createElement("div");
      details.className = "png-jpg-file__details";
      details.append(createText("strong", item.file.name, "png-jpg-file__source"));
      details.append(createText("span", item.width && item.height ? `${item.width} × ${item.height} · ${formatBytes(item.file.size)}` : formatBytes(item.file.size), "png-jpg-file__meta"));
      const field = document.createElement("label");
      field.className = "png-jpg-file__name";
      field.append(createText("span", "Имя JPG"));
      const inputBox = document.createElement("span");
      inputBox.className = "png-jpg-file__name-box";
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = item.outputName;
      nameInput.disabled = processing;
      nameInput.dataset.pngName = String(item.id);
      nameInput.setAttribute("aria-label", `Имя JPG для ${item.file.name}`);
      inputBox.append(nameInput, createText("span", ".jpg"));
      field.append(inputBox);
      const nameError = nameErrors.get(item.id);
      if (nameError) {
        const error = createText("span", nameError, "png-jpg-file__error");
        error.id = `png-name-error-${item.id}`;
        nameInput.setAttribute("aria-describedby", error.id);
        nameInput.setAttribute("aria-invalid", "true");
        field.append(error);
      }
      details.append(field);
      if (item.error) details.append(createText("p", item.error, "png-jpg-file__error"));
      if (item.resultBlob) {
        const result = document.createElement("div");
        result.className = "png-jpg-file__result";
        result.append(createText("strong", outputFilename(item.outputName)));
        result.append(createText("span", `PNG: ${formatBytes(item.file.size)} → JPG: ${formatBytes(item.resultSize)} · ${sizeChangeText(item.file.size, item.resultSize)}`));
        const download = document.createElement("button");
        download.type = "button";
        download.className = "png-jpg-download";
        download.dataset.pngDownload = String(item.id);
        download.textContent = "Скачать";
        result.append(download);
        details.append(result);
      }
      card.append(details);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "png-jpg-remove";
      remove.dataset.pngRemove = String(item.id);
      remove.disabled = processing;
      remove.textContent = "Удалить";
      card.append(remove);
      list.append(card);
    });
  };

  const addFiles = async (files) => {
    let added = 0;
    for (const file of files) {
      if (!(await verifyPng(file))) {
        setStatus("Этот файл не является PNG", true);
        continue;
      }
      const item = { id: nextId++, file, outputName: normalizeOutputName(file.name), sourceUrl: URL.createObjectURL(file), resultUrl: "", resultBlob: null, resultSize: 0, width: 0, height: 0, error: "" };
      try {
        const image = await imageFromUrl(item.sourceUrl);
        item.width = image.naturalWidth;
        item.height = image.naturalHeight;
        if (!item.width || !item.height) throw new Error("Не удалось прочитать PNG");
      } catch (error) {
        item.error = "Не удалось прочитать PNG";
      }
      items.push(item);
      added += 1;
    }
    if (added) {
      setStatus(`Добавлено: ${added} ${pluralImages(added)}.`);
      track("png_to_jpg_upload");
    }
    render();
    if (added) scheduleCalculation("Считаем точный вес JPG...");
  };
  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const convertItem = async (item, selectedQuality, selectedBackground) => {
    revokeResult(item);
    const image = await imageFromUrl(item.sourceUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    try {
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas недоступен в этом браузере");
      context.fillStyle = selectedBackground;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      const blob = await toBlob(canvas, selectedQuality);
      item.resultBlob = blob;
      item.resultSize = blob.size;
      item.resultUrl = URL.createObjectURL(blob);
      item.error = "";
    } finally {
      canvas.width = 1;
      canvas.height = 1;
    }
  };
  const convertAll = async (automatic = false) => {
    const nameErrors = getNameErrors(items);
    if (nameErrors.size) { setStatus("Исправьте имена файлов перед конвертацией.", true); render(); return; }
    const targets = validItems();
    if (!targets.length) return;
    const selectedQuality = Number(quality.value) / 100;
    const selectedBackground = background.value;
    processing = true;
    render();
    let successful = 0;
    for (let index = 0; index < targets.length; index += 1) {
      const item = targets[index];
      setStatus(`Конвертация ${index + 1} из ${targets.length}`);
      try { await convertItem(item, selectedQuality, selectedBackground); successful += 1; }
      catch (error) { item.error = error && error.message ? error.message : "Не удалось обработать PNG"; }
      render();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    processing = false;
    setStatus(successful ? `${automatic ? "Точный вес рассчитан" : "Готово"}: ${successful} ${pluralImages(successful)}.` : "Не удалось создать JPG. Попробуйте другой файл.", !successful);
    if (successful && !automatic) track("png_to_jpg_convert");
    render();
  };
  const qualityText = () => {
    const labels = { 60: " - минимальный вес", 80: " - рекомендовано", 90: " - высокое", 98: " - почти максимум качества", 100: " - максимум качества" };
    return `${quality.value}%${labels[quality.value] || ""}`;
  };
  const scheduleCalculation = (message) => {
    cancelPendingCalculation();
    invalidateResults();
    render();
    if (!items.length || getNameErrors(items).size) return;
    setStatus(message);
    calculationTimer = window.setTimeout(() => {
      calculationTimer = 0;
      void convertAll(true);
    }, 350);
  };
  const downloadAll = async () => {
    const converted = items.filter((item) => item.resultBlob);
    if (converted.length < 2 || !window.JSZip) { setStatus("Не удалось подготовить ZIP-архив.", true); return; }
    downloadAllButton.disabled = true;
    setStatus("Создаём ZIP-архив...");
    try {
      const zip = new window.JSZip();
      converted.forEach((item) => zip.file(outputFilename(item.outputName), item.resultBlob));
      download(await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } }), "png-to-jpg.zip");
      setStatus(`ZIP-архив готов: ${converted.length} ${pluralImages(converted.length)}.`);
      track("png_to_jpg_zip_download");
    } catch (error) { setStatus("Не удалось создать ZIP-архив.", true); }
    downloadAllButton.disabled = false;
  };

  input.addEventListener("change", () => { void addFiles(Array.from(input.files || [])); input.value = ""; });
  ["dragenter", "dragover"].forEach((eventName) => dropzone.addEventListener(eventName, (event) => { event.preventDefault(); dropzone.classList.add("is-dragging"); }));
  ["dragleave", "drop"].forEach((eventName) => dropzone.addEventListener(eventName, (event) => { event.preventDefault(); dropzone.classList.remove("is-dragging"); }));
  dropzone.addEventListener("drop", (event) => { void addFiles(Array.from(event.dataTransfer.files || [])); });
  quality.addEventListener("input", () => { qualityValue.textContent = qualityText(); });
  quality.addEventListener("change", () => { qualityValue.textContent = qualityText(); scheduleCalculation("Считаем точный вес JPG для выбранного качества..."); });
  background.addEventListener("change", () => { backgroundValue.textContent = background.value.toUpperCase(); scheduleCalculation("Считаем точный вес JPG с выбранным фоном..."); });
  list.addEventListener("change", (event) => {
    const field = event.target.closest("[data-png-name]");
    if (!field) return;
    const item = items.find((entry) => entry.id === Number(field.dataset.pngName));
    if (item) { item.outputName = normalizeOutputName(field.value); render(); }
  });
  list.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-png-remove]");
    const itemDownload = event.target.closest("[data-png-download]");
    if (remove) {
      const index = items.findIndex((item) => item.id === Number(remove.dataset.pngRemove));
      if (index >= 0) releaseItem(items.splice(index, 1)[0]);
      cancelPendingCalculation();
      render();
    }
    if (itemDownload) {
      const item = items.find((entry) => entry.id === Number(itemDownload.dataset.pngDownload));
      if (item && item.resultBlob) { download(item.resultBlob, outputFilename(item.outputName)); track("png_to_jpg_single_download"); }
    }
  });
  root.querySelector("[data-png-clear]").addEventListener("click", () => { cancelPendingCalculation(); items.forEach(releaseItem); items = []; input.value = ""; setStatus(""); render(); });
  applyBatchButton.addEventListener("click", () => {
    const message = validateOutputName(batchName.value);
    if (message) { setStatus(message, true); return; }
    const names = buildBatchOutputNames(batchName.value, items.length);
    items.forEach((item, index) => { item.outputName = names[index]; });
    batchName.value = normalizeOutputName(batchName.value);
    setStatus(`Общее имя применено к ${items.length} ${pluralImages(items.length)}.`);
    render();
  });
  downloadAllButton.addEventListener("click", () => { void downloadAll(); });
  render();
});
