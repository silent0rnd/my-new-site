(function () {
  "use strict";

  const SERVICE_URL = "__TGSTAT_SERVICE_URL__";
  const MESSAGE_VERSION = 2;
  const BOOKMARKLET_LABEL = "Выгрузить TGStat";
  const FALLBACK_DELAY = 1200;

  function showNotice(message, error) {
    const previous = document.getElementById("naklikay-tgstat-notice");
    if (previous) previous.remove();
    const notice = document.createElement("div");
    notice.id = "naklikay-tgstat-notice";
    notice.textContent = message;
    Object.assign(notice.style, {
      position: "fixed", top: "20px", right: "20px", zIndex: "2147483647", maxWidth: "360px",
      padding: "14px 18px", borderRadius: "12px", color: "#fff", background: error ? "#9f2f21" : "#202020",
      font: "15px/1.4 Arial,sans-serif", boxShadow: "0 10px 30px rgba(0,0,0,.25)"
    });
    document.documentElement.appendChild(notice);
    window.setTimeout(() => notice.remove(), 6000);
  }

  function copyWithSelection(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    Object.assign(textarea.style, { position: "fixed", left: "-9999px", top: "0", opacity: "0" });
    document.documentElement.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let copied = false;
    try {
      copied = Boolean(document.execCommand && document.execCommand("copy"));
    } catch (_) {
      copied = false;
    }
    textarea.remove();
    return copied;
  }

  function copyChannelData(text) {
    const copied = copyWithSelection(text);
    if (!copied && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    return copied;
  }

  function showFallbackPanel(text, copied) {
    const previous = document.getElementById("naklikay-tgstat-fallback");
    if (previous) previous.remove();
    const panel = document.createElement("section");
    panel.id = "naklikay-tgstat-fallback";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Резервная передача данных TGStat");
    Object.assign(panel.style, {
      position: "fixed", top: "20px", right: "20px", zIndex: "2147483647", width: "min(440px, calc(100vw - 40px))",
      boxSizing: "border-box", padding: "18px", border: "2px solid #ff9800", borderRadius: "12px", color: "#202020",
      background: "#fff", font: "15px/1.45 Arial,sans-serif", boxShadow: "0 14px 40px rgba(0,0,0,.3)"
    });
    const title = document.createElement("strong");
    title.textContent = `${BOOKMARKLET_LABEL}: переход не выполнен`;
    const description = document.createElement("p");
    description.textContent = copied
      ? "Данные каналов уже скопированы. Откройте сервис и вставьте их в резервное поле."
      : "Нажмите «Скопировать данные», затем откройте сервис и вставьте их в резервное поле.";
    description.style.margin = "10px 0";
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.readOnly = true;
    textarea.setAttribute("aria-label", "Данные найденных каналов");
    Object.assign(textarea.style, { width: "100%", height: "84px", boxSizing: "border-box", margin: "0 0 10px", padding: "8px", resize: "vertical" });
    const actions = document.createElement("div");
    Object.assign(actions.style, { display: "flex", flexWrap: "wrap", gap: "10px" });
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Скопировать данные";
    const serviceLink = document.createElement("a");
    serviceLink.href = SERVICE_URL;
    serviceLink.target = "_blank";
    serviceLink.rel = "noopener noreferrer";
    serviceLink.textContent = "Открыть сервис";
    [copyButton, serviceLink].forEach((control) => Object.assign(control.style, {
      display: "inline-flex", alignItems: "center", minHeight: "40px", boxSizing: "border-box", padding: "8px 12px",
      border: "1px solid #202020", borderRadius: "8px", background: "#fff", color: "#202020", font: "inherit", textDecoration: "none", cursor: "pointer"
    }));
    copyButton.addEventListener("click", async () => {
      let success = copyWithSelection(text);
      if (!success && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try { await navigator.clipboard.writeText(text); success = true; } catch (_) { success = false; }
      }
      description.textContent = success
        ? "Данные каналов скопированы. Откройте сервис и вставьте их в резервное поле."
        : "Браузер не разрешил копирование. Выделите данные в поле и скопируйте их через контекстное меню.";
    });
    actions.append(copyButton, serviceLink);
    panel.append(title, description, textarea, actions);
    document.documentElement.appendChild(panel);
  }

  function navigateToService(url) {
    const link = document.createElement("a");
    link.href = url;
    link.dataset.naklikayTgstatNavigation = "true";
    link.style.display = "none";
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
  }

  if (!/(^|\.)tgstat\.ru$/i.test(location.hostname)) {
    showNotice("Откройте страницу поиска каналов TGStat и запустите закладку еще раз.", true);
    return;
  }

  const result = TgstatParser.parseTgstatDocument(document);
  if (!result.channels.length) {
    showNotice("Не удалось найти каналы. Убедитесь, что результаты поиска уже загружены.", true);
    return;
  }

  const envelope = { type: "naklikay:tgstat-import", version: MESSAGE_VERSION, payload: result };
  const serialized = JSON.stringify(envelope);
  const copied = copyChannelData(serialized);
  const importUrl = `${SERVICE_URL}#import=${encodeURIComponent(serialized)}`;
  if (importUrl.length > 1500000) {
    showFallbackPanel(serialized, copied);
    return;
  }

  showNotice(`${BOOKMARKLET_LABEL}. Найдено каналов: ${result.diagnostics.rawCount}. Открываю таблицу...`);
  window.setTimeout(() => showFallbackPanel(serialized, copied), FALLBACK_DELAY);
  try {
    navigateToService(importUrl);
  } catch (_) {
    showFallbackPanel(serialized, copied);
  }
})();
