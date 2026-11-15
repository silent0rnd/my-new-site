// Bing Webmaster хранится отдельно от Яндекс Вебмастера.
const BING_CFG = {
  API_BASE: 'https://ssl.bing.com/webmaster/api.svc/json',
  API_KEY_PROPERTY: 'BING_WEBMASTER_API_KEY',
  SITE_URL: 'https://naklikay.ru/',
  SPREADSHEET_ID: '1ki2ik3KrdEvWwU21ogK02Fc5nBQECap09rgbyN_w-Fo',
  TIMEZONE: 'Europe/Moscow',
  AUTO_START_HOUR: 9,
  AUTO_START_MINUTE: 10,
  SUMMARY_SHEET: 'Bing-сводка',
  QUERIES_SHEET: 'Bing-запросы',
  TRIGGER_HANDLER: 'runBingRefreshAuto'
};

function saveBingApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Bing Webmaster API ключ',
    'Вставьте API ключ. Он сохранится в Script Properties, а не в таблице.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const apiKey = String(response.getResponseText() || '').trim();
  if (!apiKey) {
    ui.alert('Ключ не указан.');
    return;
  }

  PropertiesService.getScriptProperties()
    .setProperty(BING_CFG.API_KEY_PROPERTY, apiKey);

  ui.alert('Ключ сохранён. Теперь выберите «Bing: проверить подключение».');
}

function testBingConnection() {
  const ui = SpreadsheetApp.getUi();

  try {
    const report = refreshBingMonitoring_();
    ui.alert(
      'Bing подключён',
      'Получены данные до ' + (report.latestDate || 'без даты') +
        '. Запросов: ' + report.queryCount + '.',
      ui.ButtonSet.OK
    );
  } catch (e) {
    ui.alert('Ошибка Bing', bingErrorText_(e), ui.ButtonSet.OK);
  }
}

function installBingMonitoring() {
  const report = refreshBingMonitoring_();
  bingDeleteTriggers_();

  ScriptApp.newTrigger(BING_CFG.TRIGGER_HANDLER)
    .timeBased()
    .everyDays(1)
    .atHour(BING_CFG.AUTO_START_HOUR)
    .nearMinute(BING_CFG.AUTO_START_MINUTE)
    .inTimezone(BING_CFG.TIMEZONE)
    .create();
  return report;
}

function removeBingMonitoring() {
  bingDeleteTriggers_();
  SpreadsheetApp.getUi().alert('Bing автообновление отключено.');
}

function runBingRefreshAuto() {
  refreshBingMonitoring_();
}

function refreshBingMonitoring_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) {
    throw new Error('Другой SEO-сбор уже выполняется.');
  }

  try {
    const ss = bingSpreadsheet_();
    const sheets = bingEnsureSheets_(ss);
    const apiKey = bingGetApiKey_();
    const traffic = bingApiGet_('GetRankAndTrafficStats', {
      siteUrl: BING_CFG.SITE_URL
    }, apiKey);
    const queries = bingApiGet_('GetQueryStats', {
      siteUrl: BING_CFG.SITE_URL
    }, apiKey);

    const report = bingBuildReport_(traffic, queries);
    bingWriteSummary_(sheets.summary, report);
    bingWriteQueries_(sheets.queries, report.queries);
    return report;
  } catch (e) {
    const ss = bingSpreadsheet_();
    const sheets = bingEnsureSheets_(ss);
    bingWriteError_(sheets.summary, e);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function bingEnsureSheets_(ss) {
  return {
    summary: bingEnsureSheet_(ss, BING_CFG.SUMMARY_SHEET, [
      'Обновлено', 'Сайт', 'Статус', 'Последняя дата трафика',
      'Дней трафика', 'Показы 28 дн', 'Клики 28 дн', 'Запросов', 'Источник'
    ]),
    queries: bingEnsureSheet_(ss, BING_CFG.QUERIES_SHEET, [
      'Обновлено', 'Дата статистики', 'Запрос', 'Показы', 'Клики',
      'Средняя позиция показа', 'Средняя позиция клика', 'Источник'
    ])
  };
}

function bingEnsureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (existing.join('|') !== headers.join('|')) {
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function bingWriteSummary_(sheet, report) {
  sheet.getRange(2, 1, 1, 9).setValues([[
    bingNow_(),
    BING_CFG.SITE_URL,
    report.hasTraffic || report.hasQueries ? 'Готово' : 'Нет данных',
    report.latestDate || '',
    report.hasTraffic ? report.trafficDays : '',
    report.hasTraffic ? report.impressions28 : '',
    report.hasTraffic ? report.clicks28 : '',
    report.hasQueries ? report.queryCount : '',
    'Bing Webmaster API'
  ]]);
}

function bingWriteQueries_(sheet, queries) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }

  if (!queries.length) return;

  const updatedAt = bingNow_();
  const rows = queries.map(function(item) {
    return [
      updatedAt,
      item.date,
      item.query,
      item.impressions,
      item.clicks,
      item.avgImpressionPosition,
      item.avgClickPosition,
      'Bing Webmaster API'
    ];
  });
  sheet.getRange(2, 1, rows.length, 8).setValues(rows);
}

function bingWriteError_(sheet, error) {
  sheet.getRange(2, 1, 1, 9).setValues([[
    bingNow_(),
    BING_CFG.SITE_URL,
    'Ошибка',
    '',
    '',
    '',
    '',
    '',
    bingErrorText_(error)
  ]]);
}

function bingBuildReport_(trafficPayload, queryPayload) {
  const traffic = bingArray_(trafficPayload).map(function(item) {
    return {
      date: bingApiDate_(item.Date),
      impressions: Number(item.Impressions) || 0,
      clicks: Number(item.Clicks) || 0
    };
  }).filter(function(item) {
    return item.date;
  }).sort(function(a, b) {
    return a.date.getTime() - b.date.getTime();
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 27);
  cutoff.setHours(0, 0, 0, 0);
  const recent = traffic.filter(function(item) {
    return item.date.getTime() >= cutoff.getTime();
  });

  const queries = bingArray_(queryPayload).map(function(item) {
    return {
      date: bingDateString_(bingApiDate_(item.Date)),
      query: String(item.Query || ''),
      impressions: Number(item.Impressions) || 0,
      clicks: Number(item.Clicks) || 0,
      avgImpressionPosition: Number(item.AvgImpressionPosition) || '',
      avgClickPosition: Number(item.AvgClickPosition) || ''
    };
  }).filter(function(item) {
    return item.query;
  }).sort(function(a, b) {
    return b.impressions - a.impressions;
  });

  return {
    hasTraffic: traffic.length > 0,
    hasQueries: queries.length > 0,
    latestDate: traffic.length ? bingDateString_(traffic[traffic.length - 1].date) : '',
    trafficDays: recent.length,
    impressions28: recent.reduce(function(sum, item) {
      return sum + item.impressions;
    }, 0),
    clicks28: recent.reduce(function(sum, item) {
      return sum + item.clicks;
    }, 0),
    queryCount: queries.length,
    queries: queries
  };
}

function bingApiGet_(method, params, apiKey) {
  const query = Object.keys(params).map(function(name) {
    return encodeURIComponent(name) + '=' + encodeURIComponent(params[name]);
  }).join('&');
  const url = BING_CFG.API_BASE + '/' + method + '?' + query +
    '&apikey=' + encodeURIComponent(apiKey);
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {Accept: 'application/json'}
  });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Bing API HTTP ' + code + '.');
  }

  const payload = JSON.parse(response.getContentText() || '{}');
  if (payload && payload.ErrorCode) {
    throw new Error('Bing API: ' + String(payload.Message || payload.ErrorCode));
  }
  return payload && Object.prototype.hasOwnProperty.call(payload, 'd') ? payload.d : payload;
}

function bingGetApiKey_() {
  const apiKey = PropertiesService.getScriptProperties()
    .getProperty(BING_CFG.API_KEY_PROPERTY);
  if (!apiKey) {
    throw new Error('Bing API ключ не найден. Сохраните его через меню SEO аудит.');
  }
  return apiKey;
}

function bingSpreadsheet_() {
  return SpreadsheetApp.openById(BING_CFG.SPREADSHEET_ID);
}

function bingDeleteTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === BING_CFG.TRIGGER_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function bingArray_(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function bingApiDate_(value) {
  if (value instanceof Date) return value;
  const match = String(value || '').match(/Date\((-?\d+)/);
  if (match) return new Date(Number(match[1]));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function bingDateString_(date) {
  if (!date) return '';
  return Utilities.formatDate(date, BING_CFG.TIMEZONE, 'yyyy-MM-dd');
}

function bingNow_() {
  return Utilities.formatDate(new Date(), BING_CFG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function bingErrorText_(error) {
  return String(error && error.message ? error.message : error).slice(0, 500);
}
