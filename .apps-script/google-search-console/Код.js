/**
 * Google Search Console -> SEO мониторинг Google naklikay.ru
 * Отдельная таблица. Не изменяет Яндекс-мониторинг и его журнал усилений.
 * Использует OAuth владельца скрипта, токены не копируются и не записываются.
 * Сбор по 286 существующим URL, фильтр: страна RUS, Web, все устройства.
 */
const GSC = Object.freeze({
  settings: 'Настройки', registry: 'Реестр URL', summary: 'SEO-сводка',
  pages: 'Страницы', queries: 'Запросы по страницам',
  history: 'История страниц', indexing: 'Индексация',
  source: 'Google Search Console / RUS / WEB',
  limit: 25000, cap: 100000
});

function onOpen() {
  SpreadsheetApp.getUi().createMenu('SEO Google')
    .addItem('Подключить и включить автообновление', 'installGSC')
    .addItem('Обновить поисковые данные', 'refreshGSC')
    .addItem('Проверить следующую группу URL', 'inspectGSCBatch')
    .addToUi();
}

/** Выполнить один раз вручную под аккаунтом с доступом к Search Console. */
function installGSC() {
  const c = readSettings_();
  const property = property_(c);
  writeSetting_('GSC_PROPERTY', property);
  // Проверяем получение данных прежде, чем ставить расписание.
  refreshGSC();
  for (const t of ScriptApp.getProjectTriggers()) {
    if (['refreshGSC', 'inspectGSCBatch'].indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
    }
  }
  ScriptApp.newTrigger('refreshGSC').timeBased().everyDays(1).atHour(7).nearMinute(10).create();
  ScriptApp.newTrigger('inspectGSCBatch').timeBased().everyDays(1).atHour(8).nearMinute(10).create();
  Logger.log('GSC подключена. PRO Яндекса и его таблица не изменены. Свойство: ' + property);
}

function refreshGSC() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Другое обновление ещё выполняется');
  writeSetting_('RUN_STATUS', 'ВЫПОЛНЯЕТСЯ');
  try {
    const c = readSettings_();
    const property = property_(c);
    writeSetting_('GSC_PROPERTY', property);
    const registry = registry_();
    if (registry.length !== 286) {
      throw new Error('Ожидается 286 включённых URL, фактически: ' + registry.length + '. Реестр вручную не расширять.');
    }
    const lookup = new Map(registry.map(r => [r.url, r]));
    const end = newestFinalDate_(property, c);
    const start90 = plusDays_(end, -89);
    // Дневные показатели по URL, из них формируются 7/28/90.
    const daily = analyticsRows_(property, start90, end, ['date', 'page'], c);
    const metrics = new Map(registry.map(r => [r.url, {7: zero_(), 28: zero_(), 90: zero_()}]));
    const dailyRows = [];
    const starts = {7: plusDays_(end, -6), 28: plusDays_(end, -27), 90: start90};
    for (const row of daily) {
      const keys = row.keys || [];
      const day = keys[0], url = keys[1];
      if (!lookup.has(url) || !day) continue;
      const impressions = Number(row.impressions || 0), clicks = Number(row.clicks || 0);
      const pos = Number(row.position || 0);
      dailyRows.push([day, url, lookup.get(url).group, impressions, clicks,
        percent_(clicks, impressions), round_(pos), GSC.source]);
      for (const days of [7, 28, 90]) {
        if (day >= starts[days]) {
          const m = metrics.get(url)[days];
          m.i += impressions; m.c += clicks; m.p += pos * impressions;
        }
      }
    }
    dailyRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])));

    // Отдельный агрегированный запрос важен: приватные запросы не обязаны
    // суммироваться в точные итоги по URL.
    const queryRows = [], counts = {};
    for (const days of [7, 28, 90]) {
      const rows = analyticsRows_(property, starts[days], end, ['page', 'query'], c);
      const unique = new Set();
      for (const row of rows) {
        const keys = row.keys || [];
        const url = keys[0], query = keys[1];
        if (!lookup.has(url) || !query) continue;
        unique.add(query);
        const imps = Number(row.impressions || 0), clicks = Number(row.clicks || 0);
        queryRows.push([days, end, lookup.get(url).group, url, query, imps, clicks,
          percent_(clicks, imps), round_(Number(row.position || 0)), GSC.source]);
      }
      counts[days] = unique.size;
    }
    queryRows.sort((a, b) => Number(a[0]) - Number(b[0]) || Number(b[5]) - Number(a[5]));
    const pageRows = registry.map(r => {
      const vals = [];
      for (const days of [7, 28, 90]) {
        const m = metrics.get(r.url)[days];
        vals.push(m.i, m.c, percent_(m.c, m.i), m.i ? round_(m.p / m.i) : '');
      }
      const p28 = metrics.get(r.url)[28];
      const avg = p28.i ? p28.p / p28.i : 0;
      let signal = 'Наблюдение';
      if (!p28.i) signal = 'Нет показов, проверить индекс';
      else if (p28.i >= 30 && avg >= 4 && avg <= 15) signal = 'Проверить запросы (4-15)';
      else if (p28.i >= 30 && avg <= 10 && percent_(p28.c, p28.i) < 2) signal = 'Проверить CTR';
      return [r.url, r.group, r.type, r.title, r.phrase, ...vals, end, signal];
    });
    // Сначала собираем весь новый срез в памяти, затем заменяем листы.
    writeBody_(GSC.history, dailyRows, 8);
    writeBody_(GSC.queries, queryRows, 10);
    writeBody_(GSC.pages, pageRows, 19);

    const totals = [7, 28, 90].map(days => {
      const ms = Array.from(metrics.values()).map(v => v[days]);
      const i = ms.reduce((s, m) => s + m.i, 0), clicks = ms.reduce((s, m) => s + m.c, 0);
      const weighted = ms.reduce((s, m) => s + m.p, 0);
      return {i, clicks, ctr: percent_(clicks, i), position: i ? round_(weighted / i) : '',
        pages: ms.filter(m => m.i > 0).length};
    });
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GSC.summary);
    sh.getRange(2, 2, 9, 3).setValues([
      [7, 28, 90].map(days => starts[days] + ' - ' + end),
      totals.map(t => t.i), totals.map(t => t.clicks), totals.map(t => t.ctr),
      totals.map(t => t.position), totals.map(t => t.pages),
      [286, 286, 286], [counts[7], counts[28], counts[90]],
      [now_(), now_(), now_()]
    ]);
    writeSetting_('DATA_END', end);
    writeSetting_('LAST_REFRESH', now_());
    writeSetting_('RUN_STATUS', 'ГОТОВО');
    writeSetting_('LAST_ERROR', '');
    Logger.log('GSC успешно: конец периода ' + end + '; страницы ' + pageRows.length +
      '; запросы ' + queryRows.length + '; дневные строки ' + dailyRows.length);
  } catch (e) {
    writeSetting_('RUN_STATUS', 'ERROR');
    writeSetting_('LAST_ERROR', String(e.message || e).slice(0, 900));
    Logger.log('Ошибка GSC: ' + String(e.message || e));
    throw e;
  } finally { lock.releaseLock(); }
}

/** Обходит по кругу 40 URL/день, не запрашивает новые URL и не тестирует живой сайт. */
function inspectGSCBatch() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Другая задача ещё выполняется');
  try {
    const c = readSettings_(), property = property_(c);
    const registry = registry_();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GSC.indexing);
    const stored = sheet.getRange(2, 1, registry.length, 12).getValues();
    let cursor = Math.max(0, Number(c.INDEX_CURSOR || 0)) % registry.length;
    const batch = Math.min(150, Math.max(1, Number(c.INDEX_BATCH_SIZE || 40)), registry.length);
    for (let i = 0; i < batch; i++) {
      const pos = (cursor + i) % registry.length;
      const r = registry[pos];
      try {
        const answer = gscRequest_('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
          inspectionUrl: r.url, siteUrl: property, languageCode: 'ru-RU'
        });
        const s = ((answer.inspectionResult || {}).indexStatusResult || {});
        stored[pos] = [r.url, r.group, now_(), s.verdict || '', s.coverageState || '',
          s.robotsTxtState || '', s.indexingState || '', s.pageFetchState || '',
          s.googleCanonical || '', s.userCanonical || '', s.lastCrawlTime || '', ''];
      } catch (e) {
        const msg = String(e.message || e).slice(0, 350);
        stored[pos][0] = r.url;
        stored[pos][1] = r.group;
        stored[pos][2] = now_();
        stored[pos][11] = msg;
        if (/HTTP (401|403|429|503)/.test(msg)) throw e;
      }
    }
    sheet.getRange(2, 1, stored.length, 12).setValues(stored);
    cursor = (cursor + batch) % registry.length;
    writeSetting_('INDEX_CURSOR', cursor);
    writeSetting_('LAST_INDEX_RUN', now_());
    Logger.log('URL Inspection: проверено ' + batch + ' URL; следующий курсор ' + cursor);
  } finally { lock.releaseLock(); }
}

function registry_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GSC.registry);
  if (!sh) throw new Error('Нет листа Реестр URL');
  return sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues()
    .filter(r => String(r[1]).toUpperCase() === 'TRUE' && String(r[6]).startsWith('https://naklikay.ru/'))
    .map(r => ({url: String(r[6]), group: Number(r[2]), type: String(r[3]),
      title: String(r[4]), phrase: String(r[5])}));
}

function readSettings_() {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GSC.settings);
  const out = {};
  for (const r of s.getRange(2, 1, s.getLastRow() - 1, 2).getValues()) {
    if (r[0]) out[String(r[0])] = r[1];
  }
  return out;
}
function writeSetting_(key, value) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GSC.settings);
  const keys = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < keys.length; i++) if (keys[i][0] === key) {
    sh.getRange(i + 2, 2).setValue(value); return;
  }
  throw new Error('В настройках отсутствует ' + key);
}
function property_(c) {
  const configured = String(c.GSC_PROPERTY || '').trim();
  if (configured) return configured;
  const response = gscRequest_('https://www.googleapis.com/webmasters/v3/sites');
  const all = (response.siteEntry || []).filter(x => x.permissionLevel !== 'siteUnverifiedUser')
    .map(x => x.siteUrl);
  for (const candidate of ['sc-domain:naklikay.ru', 'https://naklikay.ru/']) {
    if (all.indexOf(candidate) !== -1) return candidate;
  }
  throw new Error('Нет доступа к свойству naklikay.ru в GSC. Доступные свойства: ' + all.join(', '));
}
function newestFinalDate_(property, c) {
  const today = Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd');
  const from = plusDays_(today, -30);
  const rows = analyticsRows_(property, from, today, ['date'], c);
  const days = rows.map(r => (r.keys || [])[0]).filter(Boolean).sort();
  if (!days.length) throw new Error('Нет финализированных данных Google Web по России за последние 30 дней. Проверить свойство/страну.');
  return days[days.length - 1];
}
function analyticsRows_(property, start, end, dimensions, c) {
  const all = [], path = 'https://www.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(property) + '/searchAnalytics/query';
  for (let offset = 0; offset < GSC.cap; offset += GSC.limit) {
    const body = {startDate: start, endDate: end, dimensions, type: String(c.SEARCH_TYPE || 'web'),
      dataState: 'final', rowLimit: GSC.limit, startRow: offset,
      dimensionFilterGroups: [{groupType: 'and', filters: [{
        dimension: 'country', operator: 'equals', expression: String(c.COUNTRY || 'rus')
      }]}]};
    const rows = (gscRequest_(path, body).rows || []);
    all.push(...rows);
    if (rows.length < GSC.limit) return all;
  }
  throw new Error('Достигнут лимит ' + GSC.cap + ' строк API для ' + dimensions.join('/') +
    '. Срез не записан как полный.');
}
function gscRequest_(url, body) {
  const options = {method: body ? 'post' : 'get',
    headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Accept: 'application/json'},
    muteHttpExceptions: true};
  if (body) {options.contentType = 'application/json'; options.payload = JSON.stringify(body);}
  const resp = UrlFetchApp.fetch(url, options);
  const status = resp.getResponseCode(), text = resp.getContentText();
  if (status < 200 || status >= 300) throw new Error('HTTP ' + status + ': ' + text.slice(0, 450));
  return text ? JSON.parse(text) : {};
}
function writeBody_(name, rows, columns) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Нет листа ' + name);
  const required = rows.length + 1;
  if (sh.getMaxRows() < required) sh.insertRowsAfter(sh.getMaxRows(), required - sh.getMaxRows());
  const old = sh.getLastRow();
  if (old > 1) sh.getRange(2, 1, old - 1, columns).clearContent();
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000);
    sh.getRange(i + 2, 1, chunk.length, columns).setValues(chunk);
  }
  if ([GSC.queries, GSC.history].indexOf(name) !== -1) {
    const oldFilter = sh.getFilter();
    if (oldFilter) oldFilter.remove();
    sh.getRange(1, 1, Math.max(2, required), columns).createFilter();
  }
}
function zero_() { return {i: 0, c: 0, p: 0}; }
function plusDays_(iso, delta) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}
function now_() { return Utilities.formatDate(new Date(), 'Europe/Moscow', 'yyyy-MM-dd HH:mm:ss'); }
function round_(x) { return Math.round(x * 100) / 100; }
function percent_(c, i) { return i ? round_(100 * c / i) : 0; }
