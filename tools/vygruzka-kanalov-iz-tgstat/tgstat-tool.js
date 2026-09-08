(function (root) {
  "use strict";

  const HEADERS = ["Название", "Username", "Telegram URL", "Подписчики", "Охват поста", "ERR / читатели %", "Индекс цитирования"];
  const MESSAGE_VERSION = 2;
  const SUPPORTED_MESSAGE_VERSIONS = new Set([1, 2]);

  function valueOrEmpty(value) {
    return value == null ? "" : value;
  }

  function channelRows(channels) {
    return channels.map((channel) => [channel.name, channel.username, channel.telegramUrl, valueOrEmpty(channel.subscribers), valueOrEmpty(channel.postReach), valueOrEmpty(channel.err), valueOrEmpty(channel.citationIndex)]);
  }

  function escapeDelimited(value, separator) {
    let text = String(valueOrEmpty(value));
    if (text.includes('"')) text = text.replace(/"/g, '""');
    return text.includes(separator) || /["\r\n]/.test(text) ? `"${text}"` : text;
  }

  function toCsv(channels) {
    return `\ufeff${[HEADERS, ...channelRows(channels)].map((row) => row.map((value) => escapeDelimited(value, ";")).join(";")).join("\r\n")}`;
  }

  function toTsv(channels) {
    return [HEADERS, ...channelRows(channels)].map((row) => row.map((value) => String(valueOrEmpty(value)).replace(/\t/g, " ").replace(/[\r\n]+/g, " ")).join("\t")).join("\r\n");
  }

  function sortChannels(channels, key, direction) {
    const multiplier = direction === "asc" ? 1 : -1;
    return [...channels].sort((left, right) => {
      if (key === "name") return left.name.localeCompare(right.name, "ru", { sensitivity: "base" }) * multiplier;
      const a = left[key];
      const b = right[key];
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return (a - b) * multiplier;
    });
  }

  function dateSuffix(date) {
    return date.toISOString().slice(0, 10);
  }

  function isSupportedEnvelope(value) {
    return Boolean(
      value
      && value.type === "naklikay:tgstat-import"
      && SUPPORTED_MESSAGE_VERSIONS.has(value.version)
      && value.payload
      && Array.isArray(value.payload.channels)
    );
  }

  const core = { HEADERS, MESSAGE_VERSION, channelRows, toCsv, toTsv, sortChannels, dateSuffix, isSupportedEnvelope };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (!root || !root.document) return;

  document.addEventListener("DOMContentLoaded", () => {
    const tool = document.querySelector("[data-tgstat-tool]");
    if (!tool || !root.TgstatParser) return;

    const state = { channels: [], diagnostics: null, selected: new Set(), sortKey: "subscribers", sortDirection: "desc" };
    const status = tool.querySelector("[data-tgstat-status]");
    const results = tool.querySelector("[data-tgstat-results]");
    const tbody = tool.querySelector("[data-tgstat-tbody]");
    const selectAll = tool.querySelector("[data-tgstat-select-all]");
    const count = tool.querySelector("[data-tgstat-count]");
    const selectedCount = tool.querySelector("[data-tgstat-selected]");
    const diagnostic = tool.querySelector("[data-tgstat-diagnostic]");
    const bookmarkletLink = tool.querySelector("[data-tgstat-bookmarklet]");
    const pasteTarget = tool.querySelector("[data-tgstat-paste-target]");
    const serviceUrl = new URL(".", root.location.href).href;
    const bookmarkletCode = (root.TGSTAT_BOOKMARKLET_CODE || "").replace("__TGSTAT_SERVICE_URL__", serviceUrl);

    function setStatus(message, isError) {
      status.hidden = false;
      status.textContent = message;
      status.classList.toggle("tgstat-status--error", Boolean(isError));
    }

    function channelId(channel) {
      return (channel.username || channel.telegramUrl || channel.tgstatUrl).toLowerCase();
    }

    function visibleChannels() {
      return sortChannels(state.channels, state.sortKey, state.sortDirection);
    }

    function formatNumber(value) {
      return value == null ? "-" : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);
    }

    function appendTextCell(row, value, label) {
      const cell = document.createElement("td");
      cell.dataset.label = label;
      cell.textContent = value || "-";
      row.appendChild(cell);
      return cell;
    }

    function renderDiagnostics() {
      if (!state.diagnostics) return;
      const recognized = state.diagnostics.recognized || {};
      const total = state.channels.length;
      const labels = { name: "названия", telegramUrl: "Telegram URL", subscribers: "подписчики", postReach: "охват", err: "ERR", citationIndex: "индекс цитирования" };
      const parts = Object.keys(labels).map((key) => `${labels[key]}: ${recognized[key] || 0}`).join(", ");
      diagnostic.textContent = `Распознано - ${parts}.`;
      diagnostic.classList.toggle("tgstat-diagnostic--warning", total > 0 && ["name", "subscribers", "postReach", "citationIndex"].some((key) => (recognized[key] || 0) < total));
    }

    function render() {
      const visible = visibleChannels();
      tbody.replaceChildren();
      visible.forEach((channel) => {
        const id = channelId(channel);
        const row = document.createElement("tr");
        const selectCell = document.createElement("td");
        selectCell.dataset.label = "Выбрать";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = state.selected.has(id);
        checkbox.dataset.channelSelect = id;
        checkbox.setAttribute("aria-label", `Выбрать канал ${channel.name || channel.username}`);
        selectCell.appendChild(checkbox);
        row.appendChild(selectCell);

        const nameCell = document.createElement("td");
        nameCell.dataset.label = "Название";
        if (channel.tgstatUrl) {
          const link = document.createElement("a");
          link.href = channel.tgstatUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = channel.name || "Открыть в TGStat";
          nameCell.appendChild(link);
        } else nameCell.textContent = channel.name || "-";
        row.appendChild(nameCell);

        appendTextCell(row, channel.username, "Username");
        const telegramCell = appendTextCell(row, "", "Telegram");
        if (channel.telegramUrl) {
          const link = document.createElement("a");
          link.href = channel.telegramUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Открыть";
          telegramCell.replaceChildren(link);
        } else telegramCell.textContent = "-";
        appendTextCell(row, formatNumber(channel.subscribers), "Подписчики");
        appendTextCell(row, formatNumber(channel.postReach), "Охват поста");
        appendTextCell(row, formatNumber(channel.err), "ERR / читатели");
        appendTextCell(row, formatNumber(channel.citationIndex), "Индекс цитирования");
        tbody.appendChild(row);
      });

      const selectedVisible = visible.filter((channel) => state.selected.has(channelId(channel))).length;
      count.textContent = `Показано: ${visible.length} из ${state.channels.length}`;
      selectedCount.textContent = `Выбрано: ${selectedVisible} из ${visible.length}`;
      selectAll.checked = visible.length > 0 && selectedVisible === visible.length;
      selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
      tool.querySelectorAll("[data-tgstat-export]").forEach((button) => { button.disabled = visible.length === 0; });
    }

    function acceptChannels(channels, diagnostics) {
      const normalized = root.TgstatParser.deduplicateChannels(channels || []);
      if (!normalized.length) throw new Error("Не удалось найти данные Telegram-каналов.");
      state.channels = normalized;
      state.diagnostics = diagnostics || root.TgstatParser.diagnosticsFor((channels || []).length, normalized);
      state.selected = new Set(normalized.map(channelId));
      results.hidden = false;
      renderDiagnostics();
      render();
      results.scrollIntoView({ behavior: root.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      setStatus(`Готово: найдено ${state.diagnostics.rawCount}, после удаления дублей ${normalized.length}.`);
    }

    function importText(text) {
      const trimmed = String(text || "").trim();
      if (!trimmed) throw new Error("Вставьте данные каналов, которые подготовила закладка «Выгрузить TGStat».");
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return acceptChannels(parsed);
      if (isSupportedEnvelope(parsed)) return acceptChannels(parsed.payload.channels, parsed.payload.diagnostics);
      if (Array.isArray(parsed.channels)) return acceptChannels(parsed.channels, parsed.diagnostics);
      throw new Error("Вставленные данные не содержат списка каналов TGStat.");
    }

    function importFromLocationHash() {
      const prefix = "#import=";
      if (!root.location.hash.startsWith(prefix)) return;
      const encoded = root.location.hash.slice(prefix.length);
      root.history.replaceState(null, "", `${root.location.pathname}${root.location.search}`);
      try {
        importText(decodeURIComponent(encoded));
      } catch (error) {
        setStatus(error instanceof SyntaxError || error instanceof URIError ? "Данные перехода повреждены или скопированы не полностью." : error.message, true);
      }
    }

    function exportChannels() {
      const visible = visibleChannels();
      const checked = visible.filter((channel) => state.selected.has(channelId(channel)));
      return checked.length ? checked : visible;
    }

    function download(content, type, filename) {
      const url = URL.createObjectURL(new Blob([content], { type }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    async function copyText(text, successMessage) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand && document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Браузер запретил доступ к буферу обмена.");
      }
      setStatus(successMessage);
    }

    function downloadXlsx(channels) {
      if (!root.XLSX) throw new Error("Не удалось загрузить модуль XLSX.");
      const rows = [HEADERS, ...channelRows(channels)];
      const sheet = root.XLSX.utils.aoa_to_sheet(rows);
      sheet["!cols"] = [{ wch: 34 }, { wch: 24 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }];
      const workbook = root.XLSX.utils.book_new();
      root.XLSX.utils.book_append_sheet(workbook, sheet, "Каналы TGStat");
      root.XLSX.writeFile(workbook, `tgstat-channels-${dateSuffix(new Date())}.xlsx`, { compression: true });
    }

    if (bookmarkletCode) bookmarkletLink.href = bookmarkletCode;
    else {
      bookmarkletLink.removeAttribute("href");
      setStatus("Не удалось загрузить код закладки.", true);
    }

    importFromLocationHash();

    tool.addEventListener("click", async (event) => {
      const sortButton = event.target.closest("[data-sort]");
      if (sortButton) {
        const key = sortButton.dataset.sort;
        state.sortDirection = state.sortKey === key && state.sortDirection === "desc" ? "asc" : "desc";
        state.sortKey = key;
        render();
        return;
      }
      if (event.target.closest("[data-tgstat-copy-bookmarklet]")) {
        try { await copyText(bookmarkletCode, "Код закладки скопирован."); }
        catch (error) { setStatus(error.message, true); }
        return;
      }
      if (event.target.closest("[data-tgstat-import]")) {
        try {
          importText(pasteTarget.value);
          pasteTarget.value = "";
        } catch (error) {
          setStatus(error instanceof SyntaxError ? "Данные повреждены или скопированы не полностью." : error.message, true);
          pasteTarget.focus();
        }
        return;
      }
      const exportButton = event.target.closest("[data-tgstat-export]");
      if (exportButton) {
        const channels = exportChannels();
        try {
          if (exportButton.dataset.tgstatExport === "xlsx") downloadXlsx(channels);
          if (exportButton.dataset.tgstatExport === "csv") download(toCsv(channels), "text/csv;charset=utf-8", `tgstat-channels-${dateSuffix(new Date())}.csv`);
          if (exportButton.dataset.tgstatExport === "table") await copyText(toTsv(channels), "Таблица скопирована.");
          if (exportButton.dataset.tgstatExport === "links") await copyText(channels.map((channel) => channel.telegramUrl).filter(Boolean).join("\n"), "Telegram-ссылки скопированы.");
        } catch (error) { setStatus(error.message || "Не удалось подготовить экспорт.", true); }
      }
    });
    tool.addEventListener("change", async (event) => {
      if (event.target === selectAll) {
        visibleChannels().forEach((channel) => event.target.checked ? state.selected.add(channelId(channel)) : state.selected.delete(channelId(channel)));
        render();
        return;
      }
      if (event.target.matches("[data-channel-select]")) {
        if (event.target.checked) state.selected.add(event.target.dataset.channelSelect);
        else state.selected.delete(event.target.dataset.channelSelect);
        render();
      }
    });
  });
})(typeof window !== "undefined" ? window : null);
