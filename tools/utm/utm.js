// Инструмент UTM-меток: сборка, расшифровка, размножение.
// Файл читают двое: браузер на странице /tools/utm/ и тест на Node
// (tests/utm-core.test.js). Поэтому сверху чистые функции без DOM,
// снизу работа с формой под проверкой на наличие document.

// ---------------------------------------------------------------------------
// Данные площадок
// ---------------------------------------------------------------------------

// Шаблоны собраны из рабочих меток, а не выдуманы. Пустое значение поля
// означает "поле есть, но заполняется вручную".
const UTM_PRESETS = [
  {
    id: "yandex-direct",
    label: "Яндекс Директ",
    note: "Универсальная разметка: кампания, объявление, Поиск или РСЯ, устройство, блок и позиция.",
    params: {
      utm_source: "yandex",
      utm_medium: "cpc",
      utm_campaign: "{campaign_id}",
      utm_content: "{ad_id}.{source_type}.{device_type}.{position_type}.{position}",
      utm_term: "{keyword}",
    },
  },
  {
    id: "yandex-direct-sources",
    label: "Директ по площадкам",
    note: "Источник разбивается по площадкам РСЯ. Удобно, когда чистите мусорные площадки.",
    params: {
      utm_source: "yandex_direct|{source}",
      utm_medium: "cpc",
      utm_campaign: "{campaign_name_lat}",
      utm_content: "{ad_id}.{source_type}",
      utm_term: "{keyword}",
    },
  },
  {
    id: "avito-ads",
    label: "Авито Ads",
    note: "Проверьте набор макросов в своем кабинете Авито: он меньше, чем у Директа.",
    params: {
      utm_source: "avito-ads",
      utm_medium: "cpc",
      utm_campaign: "",
      utm_content: "{ad_id}",
      utm_term: "{adgroup_id}",
    },
  },
  {
    id: "telegram-ads",
    label: "Telegram Ads",
    note: "Динамических макросов у площадки нет. Объявления различайте блоком «Размножьте метку» ниже.",
    params: {
      utm_source: "telegram-ads",
      utm_medium: "cpc",
      utm_campaign: "",
      utm_content: "",
      utm_term: "",
    },
  },
  {
    id: "vk-ads",
    label: "VK Реклама",
    note: "У VK макросы пишутся двойными фигурными скобками. Список сверьте со справкой кабинета.",
    params: {
      utm_source: "vk",
      utm_medium: "cpc",
      utm_campaign: "{{campaign_id}}",
      utm_content: "{{banner_id}}",
      utm_term: "",
    },
  },
  {
    id: "custom",
    label: "Своя",
    note: "Чистые поля. Заполняйте как вам нужно.",
    params: { utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "" },
  },
];

// Чем макрос станет после клика. Нужно, чтобы человек увидел результат заранее,
// а не через сутки в отчете.
const MACRO_EXAMPLES = {
  "{campaign_id}": "41235678",
  "{campaign_name_lat}": "poisk_moskva",
  "{campaign_type}": "type1",
  "{ad_id}": "17382940123",
  "{banner_id}": "17382940123",
  "{gbid}": "5544332",
  "{adgroup_id}": "7766554",
  "{keyword}": "kupit-divan",
  "{phrase_id}": "998877",
  "{source_type}": "context",
  "{source}": "avito.ru",
  "{device_type}": "mobile",
  "{position_type}": "premium",
  "{position}": "1",
  "{region_id}": "213",
  "{region_name}": "Moskva",
  "{match_type}": "syn",
  "{matched_keyword}": "divan-kupit",
  "{creative_id}": "88776655",
  "{retargeting_id}": "445566",
  "{adtarget_id}": "112233",
  "{yclid}": "16758432100000",
  "{campaign_name}": "poisk_moskva",
  "{geo}": "Moskva",
};

// Что макрос означает человеческими словами. Таблица отчета показывает эту
// подпись рядом с макросом: выдуманное значение вроде "poisk_moskva" человек
// у себя в полях не писал и справедливо ему не верит.
const MACRO_LABELS = {
  "{campaign_id}": "номер кампании",
  "{campaign_name_lat}": "название кампании латиницей",
  "{campaign_type}": "тип кампании",
  "{ad_id}": "номер объявления",
  "{banner_id}": "номер объявления",
  "{gbid}": "номер группы объявлений",
  "{adgroup_id}": "номер группы объявлений",
  "{keyword}": "ключевая фраза",
  "{phrase_id}": "номер ключевой фразы",
  "{source_type}": "поиск или сеть",
  "{source}": "адрес площадки сети",
  "{device_type}": "устройство: компьютер, телефон, планшет",
  "{position_type}": "блок на странице поиска",
  "{position}": "номер позиции в блоке",
  "{region_id}": "номер региона",
  "{region_name}": "название региона",
  "{match_type}": "тип совпадения фразы",
  "{matched_keyword}": "фраза, по которой был показ",
  "{creative_id}": "номер креатива",
  "{retargeting_id}": "номер условия ретаргетинга",
  "{adtarget_id}": "номер условия автотаргетинга",
  "{yclid}": "номер клика Яндекса",
  "{campaign_name}": "название кампании",
  "{geo}": "регион",
};

// Как параметр называется в отчете Метрики.
const REPORT_COLUMNS = {
  utm_source: "Источник трафика",
  utm_medium: "Тип трафика",
  utm_campaign: "Кампания",
  utm_content: "Содержание объявления",
  utm_term: "Ключевая фраза",
};

const STANDARD_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

const MACRO_PATTERN = /\{\{[a-z_0-9]+\}\}|\{[a-z_0-9]+\}/gi;

// Русские буквы в английские. Нужно, чтобы метку можно было писать по-русски:
// так ее проще читать, а в отчет она должна уйти латиницей.
const TRANSLIT = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

// ---------------------------------------------------------------------------
// Чистые функции
// ---------------------------------------------------------------------------

// encodeURIComponent ломает фигурные скобки и вертикальную черту, а они нужны
// макросам живыми. Возвращаем их обратно, остальное кодируем как положено.
function encodeUtmValue(value) {
  return encodeURIComponent(String(value))
    .replace(/%7B/gi, "{")
    .replace(/%7D/gi, "}")
    .replace(/%7C/gi, "|");
}

// Переводит русские буквы в английские и убирает пробелы. Латиницу, цифры,
// точки и фигурные скобки макросов не трогает: они уже годятся для метки.
function translit(text) {
  return String(text || "")
    .replace(/[а-яё]/gi, (letter) => {
      const found = TRANSLIT[letter.toLowerCase()];
      return found === undefined ? letter : found;
    })
    .replace(/\s+/g, "-");
}

// Что площадка подставит вместо макросов. Пустая строка - в поле обычный текст.
function describeMacros(value) {
  const labels = (String(value || "").match(MACRO_PATTERN) || [])
    .map((macro) => MACRO_LABELS[macro.replace(/^\{\{/, "{").replace(/\}\}$/, "}").toLowerCase()])
    .filter(Boolean);

  return labels.length ? `Площадка подставит: ${Array.from(new Set(labels)).join(", ")}` : "";
}

// Собирает ссылку. Сама решает, ставить "?" или "&", не даёт второй знак
// вопроса и держит метки перед якорем "#".
function buildUtmUrl(baseUrl, params) {
  const base = String(baseUrl || "").trim();
  const pairs = (params || [])
    .filter((item) => item && String(item.key).trim() && String(item.value).trim())
    .map((item) => `${String(item.key).trim()}=${encodeUtmValue(String(item.value).trim())}`);

  if (!base) {
    return pairs.length ? `?${pairs.join("&")}` : "";
  }

  if (!pairs.length) {
    return base;
  }

  const hashIndex = base.indexOf("#");
  const head = hashIndex === -1 ? base : base.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : base.slice(hashIndex);
  const separator = head.includes("?") ? "&" : "?";
  const cleanHead = head.endsWith("&") || head.endsWith("?") ? head.slice(0, -1) : head;

  return `${cleanHead}${separator}${pairs.join("&")}${hash}`;
}

// Заменяет макросы примерами значений: так выглядит ссылка после клика.
function previewMacros(url) {
  return String(url || "").replace(MACRO_PATTERN, (macro) => {
    const single = macro.replace(/^\{\{/, "{").replace(/\}\}$/, "}").toLowerCase();
    return MACRO_EXAMPLES[single] || "значение";
  });
}

// Значения для одного правила размножения.
function buildRuleValues(rule) {
  if (!rule) {
    return [];
  }

  if (rule.type === "list") {
    // Список приходит откуда угодно: из таблицы (табы), из письма (запятые),
    // из блокнота (строки). Режем по всему сразу и сразу переводим в латиницу -
    // руками потом никто 50 каналов не перебивает.
    return String(rule.items || "")
      .split(/[\n,;\t]+/)
      .map((line) => translit(line.trim()))
      .filter(Boolean);
  }

  // Пустые "от" и "до" - правило просто не тронули. Молчим.
  if (String(rule.from).trim() === "" || String(rule.to).trim() === "") {
    return [];
  }

  const from = Number(rule.from);
  const to = Number(rule.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
    return [];
  }

  const width = String(Math.max(Math.abs(from), Math.abs(to))).length;
  const values = [];
  for (let current = from; current <= to; current += 1) {
    const number = rule.pad ? String(current).padStart(width, "0") : String(current);
    values.push(`${rule.prefix || ""}${number}`);
  }

  return values;
}

// ponytail: 5000 строк браузер отрисует, 200000 - повесит. Это не лимит для
// человека, а страховка. Понадобится больше - считать в Worker.
const MULTI_LIMIT = 5000;

// Наборы значений для одного ряда: [{key, value}, ...].
// combine = false - правила идут парами построчно (20 каналов + 20 объявлений
// дают 20 ссылок). combine = true - все сочетания (20 x 3 = 60 ссылок).
function buildRuleSets(activeRules, combine) {
  if (!activeRules.length) {
    return [];
  }

  if (combine) {
    let sets = [[]];
    activeRules.forEach((rule) => {
      const next = [];
      sets.forEach((set) => {
        rule.values.forEach((value) => {
          if (next.length < MULTI_LIMIT) {
            next.push(set.concat({ key: rule.key, value }));
          }
        });
      });
      sets = next;
    });
    return sets;
  }

  const count = Math.min(activeRules.reduce((max, rule) => Math.max(max, rule.values.length), 0), MULTI_LIMIT);
  const sets = [];
  for (let index = 0; index < count; index += 1) {
    // Правило короче остальных - поле остается с исходным значением.
    sets.push(activeRules.filter((rule) => rule.values[index] !== undefined).map((rule) => ({ key: rule.key, value: rule.values[index] })));
  }
  return sets;
}

// Одна ссылка - много меток.
function multiplyUtm(baseUrl, params, rules, combine) {
  const activeRules = (rules || [])
    .filter((rule) => rule && rule.key)
    .map((rule) => ({ key: rule.key, values: buildRuleValues(rule) }))
    .filter((rule) => rule.values.length);

  return buildRuleSets(activeRules, Boolean(combine)).map((set, index) => {
    const rowParams = (params || []).map((item) => {
      const found = set.find((candidate) => candidate.key === item.key);
      return found ? { key: item.key, value: found.value } : { key: item.key, value: item.value };
    });

    // Поле есть в правиле, но его нет в форме - метку все равно добавляем.
    set.forEach((candidate) => {
      if (!rowParams.some((item) => item.key === candidate.key)) {
        rowParams.push(candidate);
      }
    });

    return {
      index: index + 1,
      url: buildUtmUrl(baseUrl, rowParams),
      label: set.map((item) => item.value).join(" / "),
    };
  });
}

// Много адресов - одна метка.
function buildBulkUrls(text, params) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ index: index + 1, url: buildUtmUrl(line, params) }));
}

// Состояние формы в адресе страницы. Так шаблон пересылают коллеге одной
// ссылкой, без базы и аккаунтов.
function encodeState(state) {
  const search = new URLSearchParams();
  search.set("u", state.url || "");
  (state.params || []).forEach((item) => {
    if (item && String(item.key).trim()) {
      search.append(String(item.key).trim(), String(item.value || ""));
    }
  });
  return search.toString();
}

function decodeState(hash) {
  const text = String(hash || "").replace(/^#/, "");
  if (!text) {
    return null;
  }

  const search = new URLSearchParams(text);
  const params = [];
  let url = "";

  search.forEach((value, key) => {
    if (key === "u") {
      url = value;
      return;
    }
    params.push({ key, value });
  });

  if (!url && !params.length) {
    return null;
  }

  return { url, params };
}

function toCsv(rows) {
  const withLabel = rows.some((row) => row.label);
  const lines = [withLabel ? "number;value;url" : "number;url"];
  rows.forEach((row) => lines.push(withLabel ? `${row.index};${row.label || ""};${row.url}` : `${row.index};${row.url}`));
  return lines.join("\r\n");
}

// ---------------------------------------------------------------------------
// Страница
// ---------------------------------------------------------------------------

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector("[data-utm]");
    if (!root) {
      return;
    }

    const STORAGE_KEY = "naklikay-utm";
    const urlInput = root.querySelector("[data-utm-url]");
    const presetsBox = root.querySelector("[data-utm-presets]");
    const presetNote = root.querySelector("[data-utm-preset-note]");
    const resultBox = root.querySelector("[data-utm-result]");
    const lengthBox = root.querySelector("[data-utm-length]");
    const previewBox = root.querySelector("[data-utm-preview]");
    const tableBody = root.querySelector("[data-utm-table]");
    const multiRules = root.querySelector("[data-utm-multi-rules]");
    const multiResult = root.querySelector("[data-utm-multi-result]");
    const multiCount = root.querySelector("[data-utm-multi-count]");
    const multiCombine = root.querySelector("[data-multi-combine]");
    const bulkInput = root.querySelector("[data-utm-bulk-input]");
    const bulkResult = root.querySelector("[data-utm-bulk-result]");

    let multiRows = [];
    let bulkRows = [];

    function fieldInput(name) {
      return root.querySelector(`[data-utm-field="${name}"]`);
    }

    function readParams() {
      return STANDARD_FIELDS.map((name) => ({ key: name, value: fieldInput(name).value }));
    }

    function readState() {
      return { url: urlInput.value, params: readParams() };
    }

    function applyPreset(id) {
      const preset = UTM_PRESETS.find((item) => item.id === id) || UTM_PRESETS[0];

      STANDARD_FIELDS.forEach((name) => {
        fieldInput(name).value = preset.params[name] || "";
      });

      presetsBox.querySelectorAll("[data-preset]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.preset === preset.id);
        button.setAttribute("aria-pressed", button.dataset.preset === preset.id ? "true" : "false");
      });

      presetNote.textContent = preset.note;
      render();
    }

    function renderRows(container, rows, emptyText) {
      container.innerHTML = "";

      if (!rows.length) {
        const empty = document.createElement("p");
        empty.className = "utm-empty";
        empty.textContent = emptyText;
        container.append(empty);
        return;
      }

      const list = document.createElement("ol");
      list.className = "utm-rows";
      rows.forEach((row) => {
        const item = document.createElement("li");
        if (row.label) {
          const label = document.createElement("span");
          label.className = "utm-rows__label";
          label.textContent = row.label;
          item.append(label);
        }
        const code = document.createElement("code");
        code.textContent = row.url;
        item.append(code);
        list.append(item);
      });
      container.append(list);
    }

    function render() {
      const state = readState();
      const url = buildUtmUrl(state.url, state.params);

      resultBox.textContent = url || "Заполните адрес страницы и метки.";
      lengthBox.textContent = url ? `${url.length} символов` : "";
      previewBox.textContent = url ? previewMacros(url) : "";

      tableBody.innerHTML = "";
      state.params
        .filter((item) => String(item.key).trim() && String(item.value).trim())
        .forEach((item) => {
          const row = document.createElement("tr");
          const name = document.createElement("th");
          name.scope = "row";
          name.textContent = REPORT_COLUMNS[item.key] || `Параметр URL: ${item.key}`;
          const value = document.createElement("td");
          const code = document.createElement("code");
          // В таблице стоит то, что человек написал в поле. Выдуманные примеры
          // тут только путают: их в полях никто не набирал.
          code.textContent = item.value;
          value.append(code);

          const hintText = describeMacros(item.value);
          if (hintText) {
            const hint = document.createElement("span");
            hint.className = "utm-table__hint";
            hint.textContent = hintText;
            value.append(hint);
          }

          row.append(name, value);
          tableBody.append(row);
        });

      // Поля меняются и без клавиатуры: шаблон площадки, ссылка из адреса,
      // память браузера. Крестики после этого надо пересчитать.
      syncClearButtons();

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        // Приватный режим браузера запрещает запись. Инструменту это не мешает.
      }
    }

    function readMultiRules() {
      // Отдельных выключателей нет: правило работает, если в нем что-то вписано.
      // Пустое правило само отсеется в multiplyUtm.
      return Array.from(multiRules.querySelectorAll("[data-multi-rule]"))
        .map((row) => ({
          key: row.dataset.multiRule,
          type: row.querySelector("[data-multi-type]").value,
          prefix: row.querySelector("[data-multi-prefix]").value,
          from: row.querySelector("[data-multi-from]").value,
          to: row.querySelector("[data-multi-to]").value,
          pad: true,
          items: row.querySelector("[data-multi-items]").value,
        }));
    }

    async function copyText(text, button) {
      if (!text) {
        return;
      }

      const label = button.textContent;
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Скопировано";
      } catch (error) {
        // Без https и без разрешения буфер недоступен - выделяем текст сами,
        // чтобы человек скопировал руками.
        button.textContent = "Скопируйте вручную";
      }
      setTimeout(() => {
        button.textContent = label;
      }, 1600);
    }

    function downloadCsv(rows, name) {
      if (!rows.length) {
        return;
      }

      // ﻿ - метка кодировки. Без нее Excel открывает файл кракозябрами.
      const blob = new Blob([`﻿${toCsv(rows)}`], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    // --- Пресеты
    UTM_PRESETS.forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "utm-preset";
      button.dataset.preset = preset.id;
      button.setAttribute("aria-pressed", "false");
      button.textContent = preset.label;
      button.addEventListener("click", () => applyPreset(preset.id));
      presetsBox.append(button);
    });

    // --- Поля. Русские буквы меняем на английские, когда человек ушел из поля:
    // пока он пишет, текст должен оставаться читаемым.
    root.querySelectorAll("[data-utm-field]").forEach((input) => {
      input.addEventListener("input", render);
      input.addEventListener("blur", () => {
        const latin = translit(input.value);
        if (latin !== input.value) {
          input.value = latin;
          render();
        }
      });
    });

    urlInput.addEventListener("input", render);

    // --- Крестик очистки в каждом поле. Появляется, когда в поле что-то есть.
    // Списки и селекты пропускаем: у селекта чистить нечего, у поля с номером
    // крестик наехал бы на стрелки.
    const clearSyncers = [];
    root.querySelectorAll(".utm-input").forEach((field) => {
      if (field.tagName === "SELECT" || field.type === "number") {
        return;
      }

      const wrap = document.createElement("span");
      wrap.className = "utm-clearable";
      field.parentNode.insertBefore(wrap, field);
      wrap.append(field);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "utm-clear";
      button.setAttribute("aria-label", "Очистить поле");
      button.textContent = "×";
      button.addEventListener("click", () => {
        field.value = "";
        // Событие нужно, чтобы страница пересчитала ссылку так же, как при
        // ручном стирании текста.
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.focus();
      });
      wrap.append(button);

      const sync = () => wrap.classList.toggle("is-filled", field.value !== "");
      field.addEventListener("input", sync);
      clearSyncers.push(sync);
    });

    function syncClearButtons() {
      clearSyncers.forEach((sync) => sync());
    }

    // --- Копирование и ссылка на шаблон
    root.querySelectorAll("[data-utm-copy]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = root.querySelector(button.dataset.utmCopy);
        copyText(target ? target.textContent : "", button);
      });
    });

    const shareButton = root.querySelector("[data-utm-share]");
    shareButton.addEventListener("click", () => {
      const hash = encodeState(readState());
      const link = `${location.origin}${location.pathname}#${hash}`;
      history.replaceState(null, "", `#${hash}`);
      copyText(link, shareButton);
    });

    // Адрес самого сервиса, без настроек. Это чтобы дать инструмент коллеге.
    const shareToolButton = root.querySelector("[data-utm-share-tool]");
    shareToolButton.addEventListener("click", () => {
      copyText(`${location.origin}${location.pathname}`, shareToolButton);
    });

    // --- Размножение метки
    multiRules.querySelectorAll("[data-multi-rule]").forEach((row) => {
      const type = row.querySelector("[data-multi-type]");
      const syncType = () => {
        row.classList.toggle("is-list", type.value === "list");
      };
      type.addEventListener("change", syncType);
      syncType();
    });

    root.querySelector("[data-utm-multi-run]").addEventListener("click", () => {
      const state = readState();
      multiRows = multiplyUtm(state.url, state.params, readMultiRules(), multiCombine.checked);
      multiCount.textContent = multiRows.length
        ? `Готово ссылок: ${multiRows.length}${multiRows.length === MULTI_LIMIT ? " (это предел, сочетаний вышло больше)" : ""}`
        : "";
      renderRows(multiResult, multiRows, "Впишите список или номера в нужное поле и нажмите «Размножить».");
    });

    root.querySelector("[data-utm-multi-copy]").addEventListener("click", (event) => {
      copyText(multiRows.map((row) => row.url).join("\n"), event.currentTarget);
    });

    root.querySelector("[data-utm-multi-csv]").addEventListener("click", () => {
      downloadCsv(multiRows, "utm-links.csv");
    });

    root.querySelector("[data-utm-multi-clear]").addEventListener("click", () => {
      multiRows = [];
      multiCount.textContent = "";
      renderRows(multiResult, multiRows, "Впишите список или номера в нужное поле и нажмите «Размножить».");
    });

    // --- Пакет ссылок
    root.querySelector("[data-utm-bulk-run]").addEventListener("click", () => {
      bulkRows = buildBulkUrls(bulkInput.value, readState().params);
      renderRows(bulkResult, bulkRows, "Вставьте адреса страниц, по одному в строке.");
    });

    root.querySelector("[data-utm-bulk-copy]").addEventListener("click", (event) => {
      copyText(bulkRows.map((row) => row.url).join("\n"), event.currentTarget);
    });

    root.querySelector("[data-utm-bulk-csv]").addEventListener("click", () => {
      downloadCsv(bulkRows, "utm-bulk.csv");
    });

    // Чистим и сам список адресов, и разметку по нему: держать половину работы
    // на экране незачем.
    root.querySelector("[data-utm-bulk-clear]").addEventListener("click", () => {
      bulkRows = [];
      bulkInput.value = "";
      bulkInput.dispatchEvent(new Event("input", { bubbles: true }));
      renderRows(bulkResult, bulkRows, "Вставьте адреса страниц, по одному в строке.");
    });

    // --- Первый запуск: сначала ссылка из адреса, потом память браузера.
    function restore(state) {
      urlInput.value = state.url || "";
      STANDARD_FIELDS.forEach((name) => {
        const found = (state.params || []).find((item) => item.key === name);
        fieldInput(name).value = found ? found.value : "";
      });
    }

    const shared = decodeState(location.hash);
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      saved = null;
    }

    // Восстановленные значения могут не совпадать ни с одним шаблоном, поэтому
    // подсветку площадки снимаем: иначе она показывает не то, что в полях.
    function dropPresetHighlight(note) {
      presetsBox.querySelectorAll("[data-preset]").forEach((button) => {
        button.classList.remove("is-active");
        button.setAttribute("aria-pressed", "false");
      });
      presetNote.textContent = note;
    }

    applyPreset(UTM_PRESETS[0].id);

    if (shared) {
      restore(shared);
      dropPresetHighlight("Шаблон открыт по присланной ссылке.");
    } else if (saved && saved.params) {
      restore(saved);
      dropPresetHighlight("Это ваши значения с прошлого раза. Выберите площадку, чтобы начать заново.");
    }

    render();
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    UTM_PRESETS,
    MACRO_EXAMPLES,
    MACRO_LABELS,
    translit,
    describeMacros,
    buildUtmUrl,
    previewMacros,
    buildRuleValues,
    multiplyUtm,
    buildBulkUrls,
    encodeState,
    decodeState,
    toCsv,
  };
}
