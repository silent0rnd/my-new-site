/**
 * SEO Metrika module v4 for naklikay.ru
 * Add this file to the SAME Apps Script project as the main SEO monitoring script.
 * Do not replace the main Webmaster script.
 *
 * What it does:
 * 1) reads SEO registry from the "Фразы" sheet;
 * 2) fetches organic search visits from Yandex Metrica, excluding robots;
 * 3) compares last 28 full days with previous 28 full days;
 * 4) adds a 90-day context;
 * 5) writes results to "Метрика" and goal inventory to "Цели Метрики";
 * 6) stores OAuth token only in Script Properties;
 * 7) installs a weekly trigger on the same weekday as the main SEO report, about one hour later;
 * 8) validates the selected counter by real recent traffic and automatically switches away from an empty duplicate counter.
 */

const SEO_METRIKA_CFG = Object.freeze({
  DOMAIN: 'naklikay.ru',
  API_BASE: 'https://api-metrika.yandex.net',
  REPORT_PATH: '/stat/v1/data',
  COUNTERS_PATH: '/management/v1/counters',
  SHEET_REGISTRY: 'Фразы',
  SHEET_SETTINGS: 'Настройки',
  SHEET_METRIKA: 'Метрика',
  SHEET_GOALS: 'Цели Метрики',
  TOKEN_PROPERTY: 'YANDEX_METRIKA_OAUTH',
  FALLBACK_TOKEN_PROPERTY: 'OAUTH_TOKEN',
  COUNTER_PROPERTY: 'YANDEX_METRIKA_COUNTER_ID',
  TIMEZONE: 'Europe/Moscow',
  DEFAULT_MIN_VISITS: 10,
  REPORT_LIMIT: 100000,
  DEFAULT_WEEKLY_DAY: 'MONDAY',
  DEFAULT_WEEKLY_HOUR: 9,
  WEEKLY_DELAY_HOURS: 1
});

const SEO_METRIKA_HEADERS = Object.freeze([
  'Группа',
  'Тип',
  'Страница',
  'URL',
  'Визиты 28 дн',
  'Визиты пред. 28 дн',
  'Δ визитов, %',
  'Посетители 28 дн',
  'Просмотры 28 дн',
  'Глубина 28 дн',
  'Глубина пред. 28 дн',
  'Δ глубины, %',
  'Время 28 дн, сек',
  'Время пред. 28 дн, сек',
  'Δ времени, %',
  'Отказы 28 дн, %',
  'Отказы пред. 28 дн, %',
  'Δ отказов, п.п.',
  'Избранные цели 28 дн',
  'Конверсия в избранные цели, %',
  'Визиты 90 дн',
  'Избранные цели 90 дн',
  'Статус Метрики',
  'Период'
]);

/**
 * Run once after adding this file.
 * The function first checks whether the existing Yandex token can read Metrica.
 * If not, it asks for a separate token with metrika:read permission.
 */
function setupMetrikaMonitoring() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  metrikaEnsureStructure_();

  let token = String(props.getProperty(SEO_METRIKA_CFG.TOKEN_PROPERTY) || '').trim();
  let access = token ? metrikaTryResolveCounter_(token) : null;

  if (!access) {
    const fallback = String(props.getProperty(SEO_METRIKA_CFG.FALLBACK_TOKEN_PROPERTY) || '').trim();
    if (fallback) {
      const fallbackAccess = metrikaTryResolveCounter_(fallback);
      if (fallbackAccess) {
        token = fallback;
        access = fallbackAccess;
        props.setProperty(SEO_METRIKA_CFG.TOKEN_PROPERTY, token);
      }
    }
  }

  if (!access) {
    const response = ui.prompt(
      'Подключение Яндекс Метрики',
      'Вставьте OAuth-токен Яндекса с доступом metrika:read. Токен будет сохранён только в Script Properties.',
      ui.ButtonSet.OK_CANCEL
    );
    if (response.getSelectedButton() !== ui.Button.OK) return;

    token = String(response.getResponseText() || '').trim();
    if (!token) {
      ui.alert('Токен не введён. Настройка остановлена.');
      return;
    }

    access = metrikaTryResolveCounter_(token);
    if (!access) {
      ui.alert('Токен не даёт доступ к счётчику naklikay.ru. Нужен токен аккаунта с доступом к счётчику и правом metrika:read.');
      return;
    }
    props.setProperty(SEO_METRIKA_CFG.TOKEN_PROPERTY, token);
  }

  props.setProperty(SEO_METRIKA_CFG.COUNTER_PROPERTY, String(access.counterId));
  metrikaSetSettings_([
    ['METRIKA_ENABLED', 'TRUE'],
    ['METRIKA_COUNTER_ID', String(access.counterId)],
    ['LAST_METRIKA_ERROR', '']
  ]);

  const goalsInfo = metrikaRefreshGoals_(token, access.counterId);
  runMetrikaRefresh();
  metrikaInstallTrigger_();

  const favoriteText = goalsInfo.favoriteCount > 0
    ? 'Избранных целей: ' + goalsInfo.favoriteCount + '.'
    : 'Избранных целей: 0. Для конверсионных SEO-сигналов отметьте основные цели как избранные в Метрике.';

  ui.alert(
    'Метрика подключена. Счётчик: ' + access.counterId + '. ' + favoriteText +
    ' Еженедельное обновление установлено на тот же день, что и SEO-отчёт, примерно через час после него.'
  );
}

/**
 * Main refresh. Safe to run manually and by trigger.
 */
function runMetrikaRefresh() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;

  try {
    metrikaEnsureStructure_();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const props = PropertiesService.getScriptProperties();
    const enabled = String(metrikaGetSetting_('METRIKA_ENABLED') || '').toUpperCase() === 'TRUE';

    const token = String(
      props.getProperty(SEO_METRIKA_CFG.TOKEN_PROPERTY) ||
      props.getProperty(SEO_METRIKA_CFG.FALLBACK_TOKEN_PROPERTY) ||
      ''
    ).trim();

    if (!token) throw new Error('Не найден OAuth-токен Яндекс Метрики. Запустите setupMetrikaMonitoring().');

    const periods = metrikaBuildPeriods_();
    const preferredCounterId = Number(
      props.getProperty(SEO_METRIKA_CFG.COUNTER_PROPERTY) ||
      metrikaGetSetting_('METRIKA_COUNTER_ID') ||
      0
    );

    // V4: do not blindly trust a previously saved counter.
    // Among all counters attached to naklikay.ru select the one that actually
    // has the largest amount of recent organic traffic.
    const access = metrikaResolveCounter_(
      token,
      preferredCounterId,
      periods.current.from,
      periods.current.to
    );
    const counterId = access.counterId;

    props.setProperty(SEO_METRIKA_CFG.COUNTER_PROPERTY, String(counterId));
    metrikaSetSettings_([
      ['METRIKA_COUNTER_ID', String(counterId)],
      ['METRIKA_COUNTER_CHECK', access.diagnostic || '']
    ]);

    if (!enabled) {
      metrikaSetSettings_([['METRIKA_ENABLED', 'TRUE']]);
    }

    const current = metrikaFetchLandingReport_(token, counterId, periods.current.from, periods.current.to);
    const previous = metrikaFetchLandingReport_(token, counterId, periods.previous.from, periods.previous.to);
    const long90 = metrikaFetchLandingReport_(token, counterId, periods.long90.from, periods.long90.to);

    const goalsInfo = metrikaRefreshGoals_(token, counterId);
    const registry = metrikaReadRegistry_(ss);
    const minVisits = Number(metrikaGetSetting_('METRIKA_MIN_VISITS')) || SEO_METRIKA_CFG.DEFAULT_MIN_VISITS;

    const rows = registry.map(function(reg) {
      const path = metrikaNormalizePath_(reg.url);
      const cur = current.byPath[path] || metrikaEmptyMetrics_();
      const prev = previous.byPath[path] || metrikaEmptyMetrics_();
      const lng = long90.byPath[path] || metrikaEmptyMetrics_();

      const visitsDelta = metrikaPctChange_(cur.visits, prev.visits);
      const depthDelta = metrikaPctChange_(cur.pageDepth, prev.pageDepth);
      const timeDelta = metrikaPctChange_(cur.avgDuration, prev.avgDuration);
      const bounceDelta = metrikaRound_(cur.bounceRate - prev.bounceRate, 2);
      const status = metrikaStatus_(reg.group, cur, prev, minVisits, goalsInfo.favoriteCount);

      return [
        reg.group,
        reg.type,
        reg.page,
        reg.url,
        metrikaRound_(cur.visits, 0),
        metrikaRound_(prev.visits, 0),
        visitsDelta,
        metrikaRound_(cur.users, 0),
        metrikaRound_(cur.pageviews, 0),
        metrikaRound_(cur.pageDepth, 2),
        metrikaRound_(prev.pageDepth, 2),
        depthDelta,
        metrikaRound_(cur.avgDuration, 2),
        metrikaRound_(prev.avgDuration, 2),
        timeDelta,
        metrikaRound_(cur.bounceRate, 2),
        metrikaRound_(prev.bounceRate, 2),
        bounceDelta,
        metrikaRound_(cur.favoriteGoalsReaches, 0),
        metrikaRound_(cur.favoriteGoalsUserConversionRate, 2),
        metrikaRound_(lng.visits, 0),
        metrikaRound_(lng.favoriteGoalsReaches, 0),
        status,
        periods.current.from + ' - ' + periods.current.to
      ];
    });

    rows.sort(function(a, b) {
      const ga = Number(a[0]) || 99;
      const gb = Number(b[0]) || 99;
      if (ga !== gb) return ga - gb;
      return Number(b[4] || 0) - Number(a[4] || 0);
    });

    metrikaWriteReport_(ss, rows);

    metrikaSetSettings_([
      ['METRIKA_ENABLED', 'TRUE'],
      ['METRIKA_COUNTER_ID', String(counterId)],
      ['METRIKA_COUNTER_CHECK', access.diagnostic || ''],
      ['LAST_METRIKA_RUN', Utilities.formatDate(new Date(), SEO_METRIKA_CFG.TIMEZONE, 'dd.MM.yyyy HH:mm:ss')],
      ['LAST_METRIKA_ERROR', '']
    ]);
  } catch (e) {
    metrikaSetSettings_([['LAST_METRIKA_ERROR', String(e && e.message ? e.message : e)]]);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Run once after replacing v3 with v4.
 * Rechecks all counters for naklikay.ru by real recent traffic,
 * saves the correct counter ID and immediately rebuilds the Metrika sheet.
 */
function repairMetrikaMonitoring() {
  const ui = SpreadsheetApp.getUi();

  try {
    metrikaEnsureStructure_();

    const props = PropertiesService.getScriptProperties();
    const token = String(
      props.getProperty(SEO_METRIKA_CFG.TOKEN_PROPERTY) ||
      props.getProperty(SEO_METRIKA_CFG.FALLBACK_TOKEN_PROPERTY) ||
      ''
    ).trim();

    if (!token) {
      throw new Error('Не найден OAuth-токен Яндекс Метрики. Запустите setupMetrikaMonitoring().');
    }

    const periods = metrikaBuildPeriods_();
    const oldCounterId = Number(
      props.getProperty(SEO_METRIKA_CFG.COUNTER_PROPERTY) ||
      metrikaGetSetting_('METRIKA_COUNTER_ID') ||
      0
    );

    const access = metrikaResolveCounter_(
      token,
      oldCounterId,
      periods.current.from,
      periods.current.to
    );

    props.setProperty(SEO_METRIKA_CFG.COUNTER_PROPERTY, String(access.counterId));
    metrikaSetSettings_([
      ['METRIKA_ENABLED', 'TRUE'],
      ['METRIKA_COUNTER_ID', String(access.counterId)],
      ['METRIKA_COUNTER_CHECK', access.diagnostic || ''],
      ['LAST_METRIKA_ERROR', '']
    ]);

    runMetrikaRefresh();

    ui.alert(
      'Метрика исправлена. Был счётчик: ' + (oldCounterId || 'не задан') +
      '. Выбран счётчик: ' + access.counterId +
      '. SEO-визитов за текущие 28 полных дней: ' + access.organicVisits +
      '. Лист "Метрика" пересчитан.'
    );
  } catch (e) {
    metrikaSetSettings_([
      ['LAST_METRIKA_ERROR', String(e && e.message ? e.message : e)]
    ]);
    ui.alert('Ошибка исправления Метрики: ' + String(e && e.message ? e.message : e));
    throw e;
  }
}

/**
 * Optional connection test after setup.
 */
function checkMetrikaConnection() {
  const ui = SpreadsheetApp.getUi();
  try {
    const props = PropertiesService.getScriptProperties();
    const token = String(
      props.getProperty(SEO_METRIKA_CFG.TOKEN_PROPERTY) ||
      props.getProperty(SEO_METRIKA_CFG.FALLBACK_TOKEN_PROPERTY) ||
      ''
    ).trim();
    if (!token) throw new Error('Токен не найден. Запустите setupMetrikaMonitoring().');
    const access = metrikaResolveCounter_(token);
    const goals = metrikaRefreshGoals_(token, access.counterId);
    ui.alert('Подключение работает. Счётчик: ' + access.counterId + '. Целей: ' + goals.totalCount + ', избранных: ' + goals.favoriteCount + '.');
  } catch (e) {
    ui.alert('Ошибка подключения: ' + String(e && e.message ? e.message : e));
  }
}

function metrikaBuildPeriods_() {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  end.setDate(end.getDate() - 1); // yesterday: only complete days

  const currentTo = new Date(end);
  const currentFrom = new Date(end);
  currentFrom.setDate(currentFrom.getDate() - 27);

  const previousTo = new Date(currentFrom);
  previousTo.setDate(previousTo.getDate() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setDate(previousFrom.getDate() - 27);

  const longFrom = new Date(end);
  longFrom.setDate(longFrom.getDate() - 89);

  return {
    current: {from: metrikaDate_(currentFrom), to: metrikaDate_(currentTo)},
    previous: {from: metrikaDate_(previousFrom), to: metrikaDate_(previousTo)},
    long90: {from: metrikaDate_(longFrom), to: metrikaDate_(end)}
  };
}

function metrikaFetchLandingReport_(token, counterId, dateFrom, dateTo) {
  const params = {
    ids: String(counterId),
    dimensions: 'ym:s:startURLPath',
    metrics: [
      'ym:s:visits',
      'ym:s:users',
      'ym:s:pageviews',
      'ym:s:bounceRate',
      'ym:s:pageDepth',
      'ym:s:avgVisitDurationSeconds',
      'ym:s:favoriteGoalsReaches',
      'ym:s:favoriteGoalsUserConversionRate'
    ].join(','),
    filters: "ym:s:trafficSource=='organic' AND ym:s:isRobot=='No'",
    date1: dateFrom,
    date2: dateTo,
    accuracy: 'full',
    limit: String(SEO_METRIKA_CFG.REPORT_LIMIT),
    offset: '1',
    lang: 'ru'
  };

  const json = metrikaApiGet_(token, SEO_METRIKA_CFG.REPORT_PATH, params);
  const byPath = {};
  const data = Array.isArray(json.data) ? json.data : [];

  data.forEach(function(row) {
    const dim = row && row.dimensions && row.dimensions[0] ? row.dimensions[0] : {};
    const rawPath = dim.name != null ? dim.name : (dim.id != null ? dim.id : '');
    const path = metrikaNormalizePath_(rawPath);
    const m = Array.isArray(row.metrics) ? row.metrics : [];

    byPath[path] = {
      visits: Number(m[0]) || 0,
      users: Number(m[1]) || 0,
      pageviews: Number(m[2]) || 0,
      bounceRate: Number(m[3]) || 0,
      pageDepth: Number(m[4]) || 0,
      avgDuration: Number(m[5]) || 0,
      favoriteGoalsReaches: Number(m[6]) || 0,
      favoriteGoalsUserConversionRate: Number(m[7]) || 0
    };
  });

  return {
    byPath: byPath,
    sampled: !!json.sampled,
    sampleShare: Number(json.sample_share || 1),
    dataLag: Number(json.data_lag || 0)
  };
}

function metrikaRefreshGoals_(token, counterId) {
  const json = metrikaApiGet_(token, '/management/v1/counter/' + encodeURIComponent(counterId) + '/goals', {});
  const goals = Array.isArray(json.goals) ? json.goals : [];
  const rows = goals.map(function(g) {
    return [
      Number(g.id) || g.id || '',
      String(g.name || ''),
      String(g.type || ''),
      metrikaIsFavoriteGoal_(g) ? 'Да' : 'Нет',
      String(g.status || '')
    ];
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SEO_METRIKA_CFG.SHEET_GOALS) || ss.insertSheet(SEO_METRIKA_CFG.SHEET_GOALS);
  const headers = ['ID', 'Цель', 'Тип', 'Избранная', 'Статус'];
  sh.clearContents();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  metrikaFormatGoalsSheet_(sh, rows.length + 1);

  return {
    totalCount: goals.length,
    favoriteCount: goals.filter(function(g) { return metrikaIsFavoriteGoal_(g); }).length
  };
}

function metrikaIsFavoriteGoal_(goal) {
  if (!goal) return false;
  const value = goal.is_favorite;
  if (value === true || value === 1) return true;
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function metrikaReadRegistry_(ss) {
  const sh = ss.getSheetByName(SEO_METRIKA_CFG.SHEET_REGISTRY);
  if (!sh) throw new Error('Не найден лист "' + SEO_METRIKA_CFG.SHEET_REGISTRY + '".');

  const lastRow = sh.getLastRow();
  const lastCol = Math.max(sh.getLastColumn(), 6);
  if (lastRow < 2) return [];

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(function(v) { return String(v || '').trim(); });
  const idxEnabled = headers.indexOf('Вкл');
  const idxGroup = headers.indexOf('Группа');
  const idxType = headers.indexOf('Тип');
  const idxPage = headers.indexOf('Страница');
  const idxUrl = headers.indexOf('Целевой URL');

  if (idxGroup < 0 || idxType < 0 || idxPage < 0 || idxUrl < 0) {
    throw new Error('В листе "Фразы" не найдены обязательные колонки Группа / Тип / Страница / Целевой URL.');
  }

  const seen = {};
  const out = [];

  values.slice(1).forEach(function(row) {
    if (idxEnabled >= 0 && !metrikaTruthy_(row[idxEnabled])) return;
    const url = String(row[idxUrl] || '').trim();
    if (!url) return;
    const path = metrikaNormalizePath_(url);
    if (seen[path]) return;
    seen[path] = true;
    out.push({
      group: row[idxGroup],
      type: String(row[idxType] || ''),
      page: String(row[idxPage] || ''),
      url: url
    });
  });

  return out;
}

function metrikaStatus_(group, cur, prev, minVisits, favoriteGoalCount) {
  if (cur.visits <= 0 && prev.visits <= 0) return 'Нет SEO-визитов';
  if (cur.visits < minVisits || prev.visits < minVisits) return 'Мало данных';

  const visitsDelta = metrikaRawPctChange_(cur.visits, prev.visits);
  const depthDelta = metrikaRawPctChange_(cur.pageDepth, prev.pageDepth);
  const timeDelta = metrikaRawPctChange_(cur.avgDuration, prev.avgDuration);
  const bounceDelta = cur.bounceRate - prev.bounceRate;

  let downSignals = 0;
  if (depthDelta != null && depthDelta <= -20) downSignals++;
  if (timeDelta != null && timeDelta <= -35) downSignals++;
  if (bounceDelta >= 10) downSignals++;

  let upSignals = 0;
  if (depthDelta != null && depthDelta >= 20) upSignals++;
  if (timeDelta != null && timeDelta >= 35) upSignals++;
  if (bounceDelta <= -10) upSignals++;

  if (visitsDelta != null && visitsDelta <= -40) return 'Снижение SEO-визитов';
  if (downSignals >= 2) return 'Поведение ухудшилось';
  if (upSignals >= 2) return 'Поведение улучшилось';
  if (visitsDelta != null && visitsDelta >= 40) return 'Рост SEO-визитов';

  if (Number(group) === 1 && favoriteGoalCount > 0 && cur.favoriteGoalsReaches === 0 && cur.visits >= Math.max(30, minVisits)) {
    return 'Проверить конверсию';
  }

  return 'Стабильно';
}

function metrikaWriteReport_(ss, rows) {
  const sh = ss.getSheetByName(SEO_METRIKA_CFG.SHEET_METRIKA) || ss.insertSheet(SEO_METRIKA_CFG.SHEET_METRIKA);
  const width = SEO_METRIKA_HEADERS.length;

  sh.clearContents();
  sh.getRange(1, 1, 1, width).setValues([SEO_METRIKA_HEADERS]);
  if (rows.length) sh.getRange(2, 1, rows.length, width).setValues(rows);

  metrikaFormatReportSheet_(sh, rows.length + 1);
}

function metrikaEnsureStructure_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SEO_METRIKA_CFG.SHEET_METRIKA)) ss.insertSheet(SEO_METRIKA_CFG.SHEET_METRIKA);
  if (!ss.getSheetByName(SEO_METRIKA_CFG.SHEET_GOALS)) ss.insertSheet(SEO_METRIKA_CFG.SHEET_GOALS);

  const defaults = [
    ['METRIKA_ENABLED', 'Метрика для SEO', 'FALSE', 'TRUE после первичной настройки'],
    ['METRIKA_COUNTER_ID', 'Счётчик Метрики', '', 'Определяется автоматически по naklikay.ru'],
    ['METRIKA_COUNTER_CHECK', 'Проверка счётчика Метрики', '', 'Какой счётчик выбран и сколько трафика найдено за последние 28 полных дней'],
    ['METRIKA_MIN_VISITS', 'Мин. SEO-визитов для выводов', String(SEO_METRIKA_CFG.DEFAULT_MIN_VISITS), 'Ниже порога Метрика используется только как наблюдение'],
    ['METRIKA_PERIOD_DAYS', 'Основное окно Метрики', '28', 'Сравнение последних 28 дней с предыдущими 28'],
    ['LAST_METRIKA_RUN', 'Последнее обновление Метрики', '', 'Последнее успешное получение данных'],
    ['LAST_METRIKA_ERROR', 'Ошибка Метрики', '', 'Последняя ошибка модуля Метрики'],
    ['METRIKA_SEGMENT', 'Сегмент Метрики', 'Весь органический поиск, без роботов', 'Поведенческие данные всех поисковых систем, рекламный и роботный трафик исключён'],
    ['METRIKA_AUDIT_RULE', 'Правило выводов Метрики', 'Минимум 10 визитов за 28 дней; учитывать группу интента; сигнал = гипотеза', 'Не менять страницу только из-за одной поведенческой метрики'],
    ['METRIKA_SCHEDULE', 'Расписание Метрики', 'Еженедельно вместе с недельным SEO-циклом', 'Запуск в тот же день примерно через час после недельного SEO-отчёта']
  ];
  metrikaEnsureSettingsRows_(defaults);
}

function metrikaEnsureSettingsRows_(definitions) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SEO_METRIKA_CFG.SHEET_SETTINGS);
  if (!sh) throw new Error('Не найден лист "Настройки".');

  const lastRow = Math.max(sh.getLastRow(), 1);
  const values = sh.getRange(1, 1, lastRow, 4).getValues();
  const byKey = {};
  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0] || '').trim();
    if (key) byKey[key] = i + 1;
  }

  definitions.forEach(function(def) {
    const key = def[0];
    if (byKey[key]) return;
    sh.appendRow(def);
    byKey[key] = sh.getLastRow();
  });
}

function metrikaGetSetting_(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SEO_METRIKA_CFG.SHEET_SETTINGS);
  if (!sh) return '';
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return '';
  const values = sh.getRange(2, 1, lastRow - 1, 3).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === key) return values[i][2];
  }
  return '';
}

function metrikaSetSettings_(pairs) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SEO_METRIKA_CFG.SHEET_SETTINGS);
  if (!sh) return;
  const lastRow = sh.getLastRow();
  const values = lastRow >= 2 ? sh.getRange(2, 1, lastRow - 1, 3).getValues() : [];
  const byKey = {};
  values.forEach(function(row, idx) {
    const key = String(row[0] || '').trim();
    if (key) byKey[key] = idx + 2;
  });

  pairs.forEach(function(pair) {
    const key = pair[0];
    const value = pair[1];
    if (byKey[key]) {
      sh.getRange(byKey[key], 3).setValue(value);
    }
  });
}

function metrikaResolveCounter_(token, preferredCounterId, dateFrom, dateTo) {
  const json = metrikaApiGet_(token, SEO_METRIKA_CFG.COUNTERS_PATH, {per_page: '1000'});
  const counters = Array.isArray(json.counters) ? json.counters : [];
  const domain = SEO_METRIKA_CFG.DOMAIN.replace(/^www\./i, '').toLowerCase();

  const candidates = counters.filter(function(c) {
    const values = [];
    if (c.site) values.push(c.site);
    if (c.site2 && c.site2.site) values.push(c.site2.site);
    if (c.site2 && c.site2.domain) values.push(c.site2.domain);
    if (Array.isArray(c.mirrors2)) {
      c.mirrors2.forEach(function(m) {
        if (m && m.site) values.push(m.site);
        if (m && m.domain) values.push(m.domain);
      });
    }
    return values.some(function(v) {
      return metrikaNormalizeDomain_(v) === domain;
    });
  });

  if (!candidates.length) {
    throw new Error('Среди доступных счётчиков не найден naklikay.ru.');
  }

  let probeFrom = dateFrom;
  let probeTo = dateTo;
  if (!probeFrom || !probeTo) {
    const periods = metrikaBuildPeriods_();
    probeFrom = periods.current.from;
    probeTo = periods.current.to;
  }

  const preferredId = Number(preferredCounterId) || 0;

  candidates.forEach(function(c) {
    c.__probe = {
      organicVisits: -1,
      totalVisits: -1,
      error: ''
    };
    try {
      c.__probe = metrikaProbeCounterTraffic_(
        token,
        Number(c.id),
        probeFrom,
        probeTo
      );
    } catch (e) {
      c.__probe.error = String(e && e.message ? e.message : e);
    }
  });

  candidates.sort(function(a, b) {
    const ao = Number(a.__probe && a.__probe.organicVisits);
    const bo = Number(b.__probe && b.__probe.organicVisits);
    if (ao !== bo) return bo - ao;

    const at = Number(a.__probe && a.__probe.totalVisits);
    const bt = Number(b.__probe && b.__probe.totalVisits);
    if (at !== bt) return bt - at;

    const ap = Number(a.id) === preferredId ? 1 : 0;
    const bp = Number(b.id) === preferredId ? 1 : 0;
    if (ap !== bp) return bp - ap;

    const aCode = String(a.code_status || '').toUpperCase() === 'CS_OK' ? 1 : 0;
    const bCode = String(b.code_status || '').toUpperCase() === 'CS_OK' ? 1 : 0;
    if (aCode !== bCode) return bCode - aCode;

    const aActive = String(a.status || '').toLowerCase() === 'active' ? 1 : 0;
    const bActive = String(b.status || '').toLowerCase() === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    return Number(b.id || 0) - Number(a.id || 0);
  });

  const selected = candidates[0];
  const probe = selected.__probe || {organicVisits: 0, totalVisits: 0, error: ''};

  const candidateSummary = candidates.map(function(c) {
    const p = c.__probe || {};
    const organic = Number(p.organicVisits);
    const total = Number(p.totalVisits);
    return '#' + c.id +
      ': SEO=' + (organic >= 0 ? organic : '?') +
      ', всего=' + (total >= 0 ? total : '?') +
      (p.error ? ', ошибка проверки' : '');
  }).join('; ');

  const diagnostic =
    'Выбран #' + selected.id +
    ': SEO-визиты=' + Math.max(0, Number(probe.organicVisits) || 0) +
    ', все визиты=' + Math.max(0, Number(probe.totalVisits) || 0) +
    ' за ' + probeFrom + ' - ' + probeTo +
    '. Кандидаты: ' + candidateSummary;

  return {
    counterId: Number(selected.id),
    counter: selected,
    organicVisits: Math.max(0, Number(probe.organicVisits) || 0),
    totalVisits: Math.max(0, Number(probe.totalVisits) || 0),
    diagnostic: diagnostic
  };
}

function metrikaProbeCounterTraffic_(token, counterId, dateFrom, dateTo) {
  const common = {
    ids: String(counterId),
    metrics: 'ym:s:visits',
    date1: dateFrom,
    date2: dateTo,
    accuracy: 'full',
    lang: 'ru'
  };

  const organicParams = Object.assign({}, common, {
    filters: "ym:s:trafficSource=='organic' AND ym:s:isRobot=='No'"
  });

  const organicJson = metrikaApiGet_(
    token,
    SEO_METRIKA_CFG.REPORT_PATH,
    organicParams
  );
  const totalJson = metrikaApiGet_(
    token,
    SEO_METRIKA_CFG.REPORT_PATH,
    common
  );

  return {
    organicVisits: metrikaExtractVisitsTotal_(organicJson),
    totalVisits: metrikaExtractVisitsTotal_(totalJson),
    error: ''
  };
}

function metrikaExtractVisitsTotal_(json) {
  if (json && Array.isArray(json.totals) && json.totals.length) {
    return Number(json.totals[0]) || 0;
  }
  if (
    json &&
    Array.isArray(json.data) &&
    json.data.length &&
    Array.isArray(json.data[0].metrics) &&
    json.data[0].metrics.length
  ) {
    return Number(json.data[0].metrics[0]) || 0;
  }
  return 0;
}

function metrikaTryResolveCounter_(token) {
  try {
    return metrikaResolveCounter_(token, 0);
  } catch (e) {
    return null;
  }
}

function metrikaApiGet_(token, path, params) {
  const url = metrikaBuildUrl_(SEO_METRIKA_CFG.API_BASE + path, params || {});
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {Authorization: 'OAuth ' + token},
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const text = response.getContentText();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (e) {
    json = {};
  }

  if (code < 200 || code >= 300) {
    const apiMessage = json && json.message ? json.message : text;
    throw new Error('Яндекс Метрика API: HTTP ' + code + '. ' + String(apiMessage || 'Неизвестная ошибка'));
  }
  return json;
}

function metrikaBuildUrl_(base, params) {
  const parts = [];
  Object.keys(params || {}).forEach(function(key) {
    const value = params[key];
    if (value === '' || value === null || value === undefined) return;
    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
  });
  return base + (parts.length ? '?' + parts.join('&') : '');
}

function metrikaInstallTrigger_() {
  const handler = 'runMetrikaRefresh';
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === handler) ScriptApp.deleteTrigger(t);
  });

  const weeklyDay = String(metrikaGetSetting_('WEEKLY_DAY') || SEO_METRIKA_CFG.DEFAULT_WEEKLY_DAY).toUpperCase();
  const weeklyHour = Number(metrikaGetSetting_('WEEKLY_HOUR')) || SEO_METRIKA_CFG.DEFAULT_WEEKLY_HOUR;
  const triggerHour = Math.min(23, Math.max(0, weeklyHour + SEO_METRIKA_CFG.WEEKLY_DELAY_HOURS));
  const weekDayMap = {
    MONDAY: ScriptApp.WeekDay.MONDAY,
    TUESDAY: ScriptApp.WeekDay.TUESDAY,
    WEDNESDAY: ScriptApp.WeekDay.WEDNESDAY,
    THURSDAY: ScriptApp.WeekDay.THURSDAY,
    FRIDAY: ScriptApp.WeekDay.FRIDAY,
    SATURDAY: ScriptApp.WeekDay.SATURDAY,
    SUNDAY: ScriptApp.WeekDay.SUNDAY
  };
  const weekDay = weekDayMap[weeklyDay] || ScriptApp.WeekDay.MONDAY;

  ScriptApp.newTrigger(handler)
    .timeBased()
    .onWeekDay(weekDay)
    .atHour(triggerHour)
    .inTimezone(SEO_METRIKA_CFG.TIMEZONE)
    .create();
}

function metrikaFormatReportSheet_(sh, lastRow) {
  const width = SEO_METRIKA_HEADERS.length;
  const header = sh.getRange(1, 1, 1, width);
  header.setBackground('#FF9800').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setFrozenRows(1);

  if (lastRow > 1) {
    sh.getRange(2, 5, lastRow - 1, 2).setNumberFormat('0');
    sh.getRange(2, 7, lastRow - 1, 1).setNumberFormat('0.00');
    sh.getRange(2, 8, lastRow - 1, 2).setNumberFormat('0');
    sh.getRange(2, 10, lastRow - 1, 9).setNumberFormat('0.00');
    sh.getRange(2, 19, lastRow - 1, 1).setNumberFormat('0');
    sh.getRange(2, 20, lastRow - 1, 1).setNumberFormat('0.00');
    sh.getRange(2, 21, lastRow - 1, 2).setNumberFormat('0');
    sh.getRange(2, 3, lastRow - 1, 2).setWrap(true).setVerticalAlignment('middle');
  }

  sh.setColumnWidth(1, 70);
  sh.setColumnWidth(2, 90);
  sh.setColumnWidth(3, 320);
  sh.setColumnWidth(4, 380);
  for (let c = 5; c <= 22; c++) sh.setColumnWidth(c, 120);
  sh.setColumnWidth(23, 180);
  sh.setColumnWidth(24, 185);

  const filter = sh.getFilter();
  if (filter) filter.remove();
  sh.getRange(1, 1, Math.max(lastRow, 2), width).createFilter();
}

function metrikaFormatGoalsSheet_(sh, lastRow) {
  sh.getRange(1, 1, 1, 5)
    .setBackground('#FF9800')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 100);
  sh.setColumnWidth(2, 320);
  sh.setColumnWidth(3, 150);
  sh.setColumnWidth(4, 120);
  sh.setColumnWidth(5, 140);
  const filter = sh.getFilter();
  if (filter) filter.remove();
  sh.getRange(1, 1, Math.max(lastRow, 2), 5).createFilter();
}

function metrikaNormalizePath_(value) {
  let s = String(value || '').trim();
  if (!s) return '/';
  s = s.replace(/^https?:\/\/[^/]+/i, '');
  s = s.split('#')[0].split('?')[0];
  if (!s) return '/';
  if (s.charAt(0) !== '/') s = '/' + s;
  s = s.replace(/\/{2,}/g, '/');
  if (s.length > 1 && s.slice(-1) !== '/') s += '/';
  return s;
}

function metrikaNormalizeDomain_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

function metrikaEmptyMetrics_() {
  return {
    visits: 0,
    users: 0,
    pageviews: 0,
    bounceRate: 0,
    pageDepth: 0,
    avgDuration: 0,
    favoriteGoalsReaches: 0,
    favoriteGoalsUserConversionRate: 0
  };
}

function metrikaRawPctChange_(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c === 0 ? 0 : null;
  return ((c - p) / p) * 100;
}

function metrikaPctChange_(current, previous) {
  const value = metrikaRawPctChange_(current, previous);
  return value == null ? '' : metrikaRound_(value, 2);
}

function metrikaRound_(value, digits) {
  const n = Number(value);
  if (!isFinite(n)) return 0;
  const p = Math.pow(10, digits || 0);
  return Math.round(n * p) / p;
}

function metrikaTruthy_(value) {
  if (value === true) return true;
  const s = String(value || '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'да' || s === 'yes';
}

function metrikaDate_(date) {
  return Utilities.formatDate(date, SEO_METRIKA_CFG.TIMEZONE, 'yyyy-MM-dd');
}