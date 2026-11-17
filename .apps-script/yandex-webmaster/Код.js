// SEO Webmaster v3.11: накопительная история запросов по URL, безопасная бесплатная PRO-квота.
const SEO_CFG = {
  API_BASE: 'https://api.webmaster.yandex.net/v4',
  SITEMAP_URL: 'https://naklikay.ru/sitemap.xml',
  TOKEN_PROPERTY: 'YANDEX_WEBMASTER_OAUTH',
  TIMEZONE: 'Europe/Moscow',
  PRO_HISTORY_DAYS: 28,
  PRO_PRIORITY_PATHS: [
    '/blog/reklama-psihologicheskogo-centra/',
    '/blog/yandex-direct-dlya-yuridicheskih-uslug/',
    '/blog/reklama-promyshlennogo-oborudovaniya/'
  ],
  PRO_FREE_DAILY_QUOTA: 100,
  PRO_FOLLOWUP_MINUTES: 30,
  AUTO_START_HOUR: 7,
  AUTO_START_MINUTE: 0,
  SETTINGS_LAYOUT_VERSION: 4,
  URL_ALIASES: {
    '/blog/kakoy-ctr-schitaetsya-horoshim-v-yandex-direct':
      '/blog/kakoy-ctr-schitaetsya-horoshim-v-yandex-direkt'
  },
  SHEETS: {
    PHRASES: 'Фразы',
    SUMMARY: 'SEO-сводка',
    GROUPS: 'Группы',
    QUERIES: 'Запросы',
    PAGES: 'Страницы',
    PROBLEMS: 'Проблемы',
    WEEKLY_HISTORY: 'Недельная история',
    PRO_RAW: 'URL-запросы PRO',
    PRO_COVERAGE: 'PRO-покрытие',
    PRO_REPORT: 'Запросы по страницам',
    SETTINGS: 'Настройки'
  },
  HEADERS: {
    QUERIES: [
      'Группа', 'Запрос', 'Страница', 'URL',
      'Позиция 7 дн', 'Было', 'Δ позиции',
      'Показы 7 дн', 'Было', 'Δ показов, %',
      'Клики 7 дн', 'Было', 'CTR, %', 'Спрос 7 дн', 'Статус'
    ],
    PAGES: [
      'Группа', 'Тип', 'Страница', 'URL', 'Популярный запрос', 'Запросов',
      'Позиция 7 дн', 'Было', 'Δ позиции',
      'Показы 7 дн', 'Было', 'Δ показов, %',
      'Клики 7 дн', 'Было', 'CTR, %', 'Статус'
    ],
    GROUPS: [
      'Группа', 'Страниц в карте', 'Реальных запросов',
      'ТОП-3', 'ТОП-10', 'ТОП-30',
      'Показы 7 дн', 'Показы пред. 7 дн', 'Δ показов, %',
      'Клики 7 дн', 'Клики пред. 7 дн',
      'Средняя позиция', 'Было', 'Δ позиции'
    ],
    PROBLEMS: [
      'Приоритет', 'Категория', 'Объект', 'Проблема',
      'Данные', 'Рекомендация', 'Дата / период', 'Источник'
    ],
    WEEKLY_HISTORY: [
      'Дата отчёта', 'Период', 'Показы', 'Клики', 'CTR, %',
      'Средняя позиция', 'Реальных запросов', 'ТОП-10',
      'Страниц в поиске', 'Исключено', 'FATAL', 'CRITICAL', 'Проблем всего'
    ],
    PRO_RAW: [
      'Дата', 'Группа', 'URL', 'Запрос', 'Регион',
      'Показы', 'Клики', 'Позиция', 'Загружено'
    ],
    PRO_COVERAGE: ['Дата', 'URL', 'Загружено'],
    PRO_REPORT: [
      'URL', 'Страница', 'Запрос', 'Показы', 'Клики', 'CTR, %',
      'Средняя позиция', 'Дней с показами', 'URL-дней в архиве', 'Первая дата', 'Последняя дата', 'Группа'
    ]
  }
};

let SITEMAP_SYNC_CACHE = null;

function onOpen() {
  try {
    ensureSettingsLayout_();
    ensureProHistorySheets_();
    hideTechnicalSheets_();
  } catch (ignore) {}

  SpreadsheetApp.getUi()
    .createMenu('SEO аудит')
    .addItem('1. Обновить SEO-данные сейчас', 'runSeoRefresh')
    .addItem('Отчёт по запросам из PRO', 'rebuildProQueryReport')
    .addSeparator()
    .addItem('2. Включить автообновление', 'installAutomation')
    .addItem('3. Отключить автообновление', 'removeAutomation')
    .addToUi();
}

function saveOAuthToken() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'OAuth-токен Яндекс Вебмастера',
    'Вставьте OAuth-токен. Он будет сохранён в Script Properties, а не в таблице.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  let token = String(response.getResponseText() || '').trim();
  token = token.replace(/^OAuth\s+/i, '');

  if (!token) {
    ui.alert('Токен пустой.');
    return;
  }

  PropertiesService.getScriptProperties()
    .setProperty(SEO_CFG.TOKEN_PROPERTY, token);

  ui.alert('OAuth-токен сохранён.');
}

function checkConnection() {
  const ui = SpreadsheetApp.getUi();

  try {
    const token = getToken_();
    const access = resolveAccess_(token);
    const hostInfo = apiGet_(token, hostPath_(access));

    ui.alert(
      'Подключение работает.\n\n' +
      'USER_ID: ' + access.userId + '\n' +
      'HOST_ID: ' + access.hostId + '\n' +
      'Сайт: ' + (hostInfo.unicode_host_url || hostInfo.ascii_host_url || access.siteUrl)
    );
  } catch (e) {
    setSetting_('LAST_ERROR', errorText_(e));
    ui.alert('Ошибка подключения:\n' + errorText_(e));
  }
}

// Совместимость со старым пунктом меню/триггером.
function runSeoMonitoring() {
  runWeeklySeoAudit();
}

function runWeeklySeoAudit() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) {
    throw new Error('Другой запуск SEO-аудита уже выполняется.');
  }

  try {
    ensureRunStarted_('Подключаюсь к Яндекс Вебмастеру', 20);
    setSetting_('LAST_ERROR', '');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    assertSheets_(ss);
    syncRegistryWithSitemap_(ss);

    const token = getToken_();
    const access = resolveAccess_(token);
    const device = getSetting_('DEVICE') || 'ALL';
    const searchLocation = getSetting_('SEARCH_LOCATION') || 'WEB_LOCATION';
    const maxItems = clamp_(Number(getSetting_('MAX_ANALYTICS_ITEMS')) || 10000, 500, 50000);

    markRunStage_('Выполняется', 'Проверяю готовую PRO-выгрузку', 25);

    // Если асинхронная PRO-выгрузка уже готова, забираем её перед анализом.
    try {
      processPendingProExport_(ss, token, access);
    } catch (proErr) {
      setSetting_('LAST_PRO_ERROR', errorText_(proErr));
    }

    markRunStage_('Выполняется', 'Загружаю запросы и URL из Яндекс Вебмастера', 35);

    const registry = readRegistry_(ss);
    const registryByPath = {};
    registry.forEach(item => {
      registryByPath[canonicalPath_(item.url)] = item;
    });

    const queryFetch = fetchAllQueryAnalytics_(
      token, access, 'QUERY', device, searchLocation, maxItems
    );
    const urlFetch = fetchAllQueryAnalytics_(
      token, access, 'URL', device, searchLocation, maxItems
    );

    const latestDate = findLatestAnalyticsDate_(
      queryFetch.items.concat(urlFetch.items)
    );

    if (!latestDate) {
      throw new Error('Яндекс Вебмастер не вернул статистику мониторинга поисковых запросов за последние 2 недели.');
    }

    const periods = buildPeriods_(latestDate);

    const queryModels = buildAnalyticsModels_(
      queryFetch.items, 'QUERY', periods, registryByPath
    );
    const urlModelsBase = buildAnalyticsModels_(
      urlFetch.items, 'URL', periods, registryByPath
    );

    const visibleQueryModels = queryModels
      .filter(m => m.current.impressions > 0 || m.previous.impressions > 0)
      .sort(compareQueryModels_);

    const queryCountByPath = {};
    visibleQueryModels.forEach(m => {
      if (m.current.impressions <= 0) return;
      const path = canonicalPath_(m.complementary);
      if (!path) return;
      queryCountByPath[path] = (queryCountByPath[path] || 0) + 1;
    });

    markRunStage_('Выполняется', 'Загружаю индексирование, диагностику и ссылки', 50);

    const collectionErrors = [];

    const siteHistory = safeFetch_(
      () => fetchSiteSearchHistory_(token, access, periods),
      { indicators: {} },
      collectionErrors,
      'Общая поисковая статистика'
    );

    const hostSummary = safeFetch_(
      () => apiGet_(token, hostPath_(access) + '/summary'),
      {},
      collectionErrors,
      'Статистика индексирования'
    );

    const diagnostics = safeFetch_(
      () => apiGet_(token, hostPath_(access) + '/diagnostics'),
      { problems: {} },
      collectionErrors,
      'Диагностика'
    );

    const inSearchHistory = safeFetch_(
      () => apiGet_(
        token,
        hostPath_(access) + '/search-urls/in-search/history',
        { date_from: periods.previous.start, date_to: periods.current.end }
      ),
      { history: [] },
      collectionErrors,
      'История страниц в поиске'
    );

    const eventsHistory = safeFetch_(
      () => apiGet_(
        token,
        hostPath_(access) + '/search-urls/events/history',
        { date_from: periods.current.start, date_to: periods.current.end }
      ),
      { indicators: {} },
      collectionErrors,
      'История появления и выпадения страниц'
    );

    const inSearchSamplesResult = safeFetch_(
      () => fetchPagedGet_(
        token,
        hostPath_(access) + '/search-urls/in-search/samples',
        'samples',
        100,
        50000
      ),
      { items: [], count: null, failed: true },
      collectionErrors,
      'Страницы в поиске'
    );

    const eventSamplesResult = safeFetch_(
      () => fetchPagedGet_(
        token,
        hostPath_(access) + '/search-urls/events/samples',
        'samples',
        100,
        2000
      ),
      { items: [], count: null, failed: true },
      collectionErrors,
      'Примеры появления и выпадения страниц'
    );

    const brokenLinksResult = safeFetch_(
      () => fetchPagedGet_(
        token,
        hostPath_(access) + '/links/internal/broken/samples',
        'links',
        100,
        1000
      ),
      { items: [], count: null, failed: true },
      collectionErrors,
      'Неработающие внутренние ссылки'
    );

    markRunStage_('Выполняется', 'Анализирую страницы, запросы и позиции', 65);

    const inSearchSet = new Set();
    (inSearchSamplesResult.items || []).forEach(sample => {
      if (sample && sample.url) {
        inSearchSet.add(canonicalPath_(sample.url));
      }
    });

    const pageModels = mergePageModels_(
      registry,
      urlModelsBase,
      visibleQueryModels,
      queryCountByPath,
      inSearchSet,
      !inSearchSamplesResult.failed
    );

    const proOverlaps = buildProOverlaps_(
      ss,
      periods.current.start,
      periods.current.end,
      registryByPath
    );

    markRunStage_('Выполняется', 'Формирую SEO-проблемы и рекомендации', 75);

    const problems = buildProblems_({
      registry: registry,
      registryByPath: registryByPath,
      queryModels: queryModels,
      pageModels: pageModels,
      diagnostics: diagnostics,
      eventSamples: eventSamplesResult.items || [],
      brokenLinks: brokenLinksResult.items || [],
      brokenLinksCount: brokenLinksResult.count,
      inSearchAvailable: !inSearchSamplesResult.failed,
      periods: periods,
      proOverlaps: proOverlaps,
      collectionErrors: collectionErrors,
      analyticsTruncated: queryFetch.truncated || urlFetch.truncated
    });

    const siteCurrent = aggregateSiteHistory_(siteHistory, periods.current);
    const sitePrevious = aggregateSiteHistory_(siteHistory, periods.previous);

    const querySummaryCurrent = summarizeQueries_(queryModels, 'current');
    const querySummaryPrevious = summarizeQueries_(queryModels, 'previous');

    const pageHistoryCurrent = numericOrBlank_(hostSummary.searchable_pages_count);
    const pageHistoryPrevious = findNearestHistoryValue_(
      inSearchHistory.history || [],
      periods.previous.end
    );

    const appeared = sumIndicator_(
      eventsHistory.indicators || {},
      'APPEARED_IN_SEARCH',
      periods.current
    );
    const removed = sumIndicator_(
      eventsHistory.indicators || {},
      'REMOVED_FROM_SEARCH',
      periods.current
    );

    const diagCounts = countPresentDiagnostics_(diagnostics);
    const fatalCount = numberOrFallback_(
      hostSummary.site_problems && hostSummary.site_problems.FATAL,
      diagCounts.FATAL
    );
    const criticalCount = numberOrFallback_(
      hostSummary.site_problems && hostSummary.site_problems.CRITICAL,
      diagCounts.CRITICAL
    );

    markRunStage_('Выполняется', 'Записываю данные в листы отчёта', 88);

    updateTargetPhrases_(ss, registry, queryModels, periods);
    writeQueries_(ss, visibleQueryModels);
    writePages_(ss, pageModels);
    writeGroups_(ss, registry, queryModels);
    writeProblems_(ss, problems);

    const summaryValues = {
      periods: periods,
      siteCurrent: siteCurrent,
      sitePrevious: sitePrevious,
      queryCurrent: querySummaryCurrent,
      queryPrevious: querySummaryPrevious,
      searchableCurrent: pageHistoryCurrent,
      searchablePrevious: pageHistoryPrevious,
      appeared: appeared,
      removed: removed,
      excluded: numericOrBlank_(hostSummary.excluded_pages_count),
      sqi: numericOrBlank_(hostSummary.sqi),
      fatal: fatalCount,
      critical: criticalCount,
      broken: brokenLinksResult.count == null
        ? (brokenLinksResult.items || []).length
        : Number(brokenLinksResult.count),
      overlaps: proOverlaps.length,
      problemsTotal: problems.length
    };

    writeSummary_(ss, summaryValues);
    upsertWeeklyHistory_(ss, summaryValues);

    const finishedAt = nowText_();
    setSetting_('LAST_WEEKLY_RUN', finishedAt);
    setSetting_('LAST_ERROR', '');

    if (getSetting_('PRO_PENDING_TASK_ID')) {
      markRunStage_(
        'Ожидание PRO',
        'Основной SEO-отчёт готов. Жду PRO-выгрузку Яндекс Вебмастера',
        95
      );
    } else {
      completeRun_('SEO-данные полностью обновлены');
    }

    return;
  } catch (e) {
    setSetting_('LAST_ERROR', errorText_(e));
    markRunError_('Ошибка SEO-отчёта', e);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function runSeoRefresh() {
  const ui = SpreadsheetApp.getUi();

  startRun_('Запускаю обновление SEO-данных', 5);

  try {
    markRunStage_('Выполняется', 'Проверяю PRO-данные и доступную квоту', 10);
    let proState = 'ERROR';
    try {
      proState = runDailyCollector();
    } catch (proErr) {
      setSetting_('LAST_PRO_ERROR', errorText_(proErr));
      setSetting_('PRO_STATUS', 'ERROR');
      // Отказ PRO API не должен блокировать обычный SEO-отчёт.
    }

    if (proState === 'BUSY') {
      markRunStage_('Выполняется', 'Другой запуск уже выполняется', 5);
      ui.alert(
        'Обновление уже выполняется',
        'Сейчас уже идёт другой запуск SEO-мониторинга. Дождитесь его завершения, данные обновятся автоматически.',
        ui.ButtonSet.OK
      );
      return;
    }

    markRunStage_('Выполняется', 'Запускаю основной SEO-отчёт', 18);

    // Основной отчёт обновляем сразу. Если PRO ещё формируется,
    // после его готовности фоновый обработчик сам импортирует данные
    // и повторно пересчитает недельный SEO-отчёт.
    runWeeklySeoAudit();

    if (getSetting_('PRO_PENDING_TASK_ID')) {
      markRunStage_(
        'Ожидание PRO',
        'Основной SEO-отчёт готов. PRO-выгрузка формируется автоматически',
        95
      );
    } else {
      completeRun_('SEO-данные полностью обновлены');
    }

    ui.alert(
      'SEO-данные обновлены',
      seoRefreshMessage_(proState),
      ui.ButtonSet.OK
    );
  } catch (e) {
    setSetting_('LAST_ERROR', errorText_(e));
    markRunError_('Ошибка обновления SEO-данных', e);
    ui.alert('Ошибка обновления SEO-данных:\n' + errorText_(e));
    throw e;
  }
}

function runSeoRefreshAuto() {
  startRun_('Автоматическое утреннее обновление SEO', 5);

  try {
    markRunStage_('Выполняется', 'Проверяю PRO и запускаю дневной пакет', 10);
    let proState = 'ERROR';
    try {
      proState = runDailyCollector();
    } catch (proErr) {
      setSetting_('LAST_PRO_ERROR', errorText_(proErr));
      setSetting_('PRO_STATUS', 'ERROR');
      // Продолжаем основной ежедневный отчёт, даже если PRO временно недоступен.
    }

    if (proState === 'BUSY') {
      markRunStage_('Выполняется', 'Другой SEO-запуск уже выполняется. Повторю автоматически позже', 10);
      scheduleAutoRetry_();
      return;
    }

    markRunStage_('Выполняется', 'Обновляю все основные SEO-данные Яндекс Вебмастера', 18);
    runWeeklySeoAudit();

    if (getSetting_('PRO_PENDING_TASK_ID')) {
      markRunStage_(
        'Ожидание PRO',
        'Основной ежедневный SEO-отчёт готов. PRO формируется и будет импортирован автоматически',
        95
      );
    } else {
      completeRun_('Ежедневные SEO-данные полностью обновлены');
    }
  } catch (e) {
    setSetting_('LAST_ERROR', errorText_(e));
    markRunError_('Ошибка автоматического SEO-обновления', e);
    throw e;
  }
}

function scheduleAutoRetry_() {
  deleteTriggersByHandler_('runSeoRefreshAutoRetry');
  ScriptApp.newTrigger('runSeoRefreshAutoRetry')
    .timeBased()
    .after(15 * 60 * 1000)
    .create();
}

function runSeoRefreshAutoRetry() {
  deleteTriggersByHandler_('runSeoRefreshAutoRetry');
  runSeoRefreshAuto();
}

function seoRefreshMessage_(state) {
  const proMessage = getSetting_('PRO_STATUS_MESSAGE') || '';

  if (state === 'STARTED') {
    return 'Основные данные Яндекс Вебмастера обновлены.\n\n' +
      'PRO-выгрузка запущена и будет проверяться и загружаться автоматически. ' +
      'Ничего дополнительно нажимать не нужно.';
  }

  if (state === 'IN_PROGRESS') {
    return 'Основные данные Яндекс Вебмастера обновлены.\n\n' +
      'PRO-выгрузка уже формируется. Скрипт сам проверит её позже, загрузит результат ' +
      'и пересчитает отчёт.';
  }

  if (state === 'ERROR') {
    return 'Основной отчёт обновлён, но расширенная история запросов PRO сейчас недоступна. ' +
      'Причина записана в Настройках: ' +
      (getSetting_('LAST_PRO_ERROR') || 'нет подробностей');
  }

  if (state === 'QUOTA') {
    return 'Основные данные Яндекс Вебмастера обновлены.\n\n' +
      'PRO-данные за уже загруженные даты сохранены. Бесплатная PRO-квота на сегодня исчерпана.';
  }

  if (state === 'DISABLED') {
    return 'Основной SEO-отчёт обновлён. PRO-выгрузка отключена в настройках.';
  }

  if (state === 'BUSY') {
    return 'Обновление уже выполняется другим запуском. Дождитесь его завершения.';
  }

  return 'Основные данные Яндекс Вебмастера обновлены.\n\n' +
    (proMessage || 'PRO-данные актуальны, новой выгрузки сейчас не требуется.');
}

function showSeoStatus() {
  const ui = SpreadsheetApp.getUi();

  const proStatus = getSetting_('PRO_STATUS') || 'нет статуса';
  const proMessage = getSetting_('PRO_STATUS_MESSAGE') || 'нет сообщения';
  const lastImported = getSetting_('PRO_LAST_IMPORTED_DATE') || 'нет данных';
  const lastProRun = getSetting_('LAST_PRO_RUN') || 'не запускалось';
  const lastWeeklyRun = getSetting_('LAST_WEEKLY_RUN') || 'не запускалось';
  const lastProError = getSetting_('LAST_PRO_ERROR') || 'нет';
  const lastError = getSetting_('LAST_ERROR') || 'нет';
  const autoEnabled = getSetting_('AUTO_ENABLED') === 'TRUE' ? 'включено' : 'выключено';

  ui.alert(
    'Статус SEO-мониторинга',
    'Автообновление: ' + autoEnabled + '\n' +
      'PRO-статус: ' + proStatus + '\n' +
      'PRO: ' + proMessage + '\n' +
      'Последняя дата PRO: ' + lastImported + '\n' +
      'Последний запуск PRO: ' + lastProRun + '\n' +
      'Последний SEO-отчёт: ' + lastWeeklyRun + '\n' +
      'Ошибка PRO: ' + lastProError + '\n' +
      'Ошибка отчёта: ' + lastError,
    ui.ButtonSet.OK
  );
}

function runDailyCollector() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return 'BUSY';

  try {
    ensureRunStarted_('Проверяю PRO-выгрузку', 10);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    assertSheets_(ss);
    syncRegistryWithSitemap_(ss);

    if (!settingIsTrue_('PRO_ENABLED', true)) {
      setSetting_('PRO_STATUS', 'DISABLED');
      setSetting_('PRO_STATUS_MESSAGE', 'PRO-выгрузка отключена в дополнительных настройках.');
      setSetting_('LAST_PRO_ERROR', '');
      setSetting_('LAST_PRO_RUN', nowText_());
      markRunStage_('Выполняется', 'PRO отключена. Продолжаю основной SEO-отчёт', 15);
      return 'DISABLED';
    }

    const token = getToken_();
    const access = resolveAccess_(token);

    markRunStage_('Выполняется', 'Проверяю предыдущую PRO-задачу', 12);

    // Сначала забираем готовую ранее созданную выгрузку, если она есть.
    const pendingState = processPendingProExport_(ss, token, access);
    if (pendingState === 'IN_PROGRESS') {
      setSetting_('LAST_PRO_RUN', nowText_());
      setSetting_('LAST_PRO_ERROR', '');
      scheduleProFollowUp_();
      markRunStage_('Ожидание PRO', 'PRO-выгрузка ещё формируется в Яндекс Вебмастере', 95);
      return 'IN_PROGRESS';
    }

    // В сутки создаём только один новый бесплатный PRO-пакет.
    // Это не мешает проверять уже созданную задачу сколько угодно раз.
    const today = moscowDate_();
    if (normalizeDateText_(getSetting_('PRO_DAILY_BATCH_DATE')) === today) {
      setSetting_('LAST_PRO_RUN', nowText_());
      setSetting_('LAST_PRO_ERROR', '');
      if (!getSetting_('PRO_STATUS_MESSAGE')) {
        setSetting_('PRO_STATUS_MESSAGE', 'Сегодняшний PRO-пакет уже был запущен. Следующий новый пакет будет завтра.');
      }
      markRunStage_('Выполняется', 'Сегодняшний PRO-пакет уже обработан или запущен', 15);
      return 'DAILY_DONE';
    }

    ensureProHistorySheets_();
    const registry = readRegistry_(ss);
    const datesData = apiGet_(token, hostPath_(access) + '/pro/serp/dates');
    const availableDates = unique_((datesData.dates || [])
      .map(normalizeDateText_).filter(Boolean)).sort();
    if (!availableDates.length) {
      throw new Error('Яндекс Вебмастер не вернул доступные даты PRO-выгрузки.');
    }

    const plan = planProHistoryBatch_(ss, registry, availableDates);
    if (!plan || !plan.paths.length || !plan.dates.length) {
      setSetting_('PRO_STATUS', 'UP_TO_DATE');
      setSetting_('PRO_STATUS_MESSAGE',
        'История запросов за ' + SEO_CFG.PRO_HISTORY_DAYS +
        ' доступных дат по всем URL реестра собрана.');
      setSetting_('LAST_PRO_RUN', nowText_());
      markRunStage_('Выполняется', 'PRO-история за выбранный период собрана', 15);
      return 'UP_TO_DATE';
    }

    if (isProQuotaBlockedToday_()) {
      setSetting_('PRO_STATUS', 'QUOTA');
      setSetting_('PRO_STATUS_MESSAGE',
        'Бесплатная PRO-квота исчерпана. Накопительная история сохранена, продолжение завтра.');
      setSetting_('LAST_PRO_RUN', nowText_());
      markRunStage_('Выполняется', 'PRO-квота исчерпана; продолжаю основной отчёт', 15);
      return 'QUOTA';
    }

    let initData = null;
    let lastLimitError = null;
    let accepted = null;
    // Уменьшаем объём только при ошибке квоты; оплачиваемый тариф не используем.
    const attempts = proBatchAttempts_(plan);
    for (let a = 0; a < attempts.length; a++) {
      const attempt = attempts[a];
      try {
        initData = apiPost_(
          token,
          hostPath_(access) + '/pro/serp/queries/download/',
          {
            dates: attempt.dates,
            paths: attempt.paths,
            region_ids: [],
            use_pro_tariff: 'false'
          }
        );
        accepted = attempt;
        lastLimitError = null;
        break;
      } catch (quotaErr) {
        if (!isProLimitError_(quotaErr)) throw quotaErr;
        lastLimitError = quotaErr;
      }
    }

    if (!initData) {
      markProQuotaBlockedToday_();
      setSetting_('PRO_STATUS', 'QUOTA');
      setSetting_('LAST_PRO_RUN', nowText_());
      setSetting_('LAST_PRO_ERROR', errorText_(lastLimitError));
      setSetting_('PRO_STATUS_MESSAGE',
        'Бесплатная PRO-квота исчерпана. Новый пакет будет запущен завтра.');
      markRunStage_('Выполняется', 'PRO-квота исчерпана; продолжаю основной отчёт', 15);
      return 'QUOTA';
    }

    setSetting_('PRO_QUOTA_BLOCKED_DATE', '');
    if (initData.free_quota_remaining !== undefined) {
      setSetting_('PRO_FREE_QUOTA_REMAINING', String(initData.free_quota_remaining));
      setSetting_('PRO_FREE_QUOTA_DATE', moscowDate_());
    }

    if (!initData.task_id) {
      throw new Error('PRO API не вернул task_id.');
    }

    // Сохраняем точный прямоугольник URL x дата только после принятия задачи API.
    // Ключи старого курсора сохраняются для совместимости, но больше не управляют очередью.
    setSetting_('PRO_PENDING_TASK_ID', String(initData.task_id));
    setSetting_('PRO_PENDING_DATE', accepted.dates.join(','));
    setSetting_('PRO_PENDING_PATHS', accepted.paths.join('\n'));
    setSetting_('PRO_PENDING_NEXT_CURSOR', '');
    setSetting_('PRO_PENDING_BATCH_SIZE', String(accepted.paths.length));
    setSetting_('PRO_PENDING_TOTAL_URLS', String(accepted.paths.length));
    setSetting_('PRO_PENDING_CYCLE_COMPLETED', 'FALSE');
    setSetting_('PRO_DAILY_BATCH_DATE', today);
    setSetting_('PRO_STATUS', 'IN_PROGRESS');
    setSetting_('PRO_STATUS_MESSAGE',
      'Сбор истории: ' + accepted.paths.length + ' URL x ' + accepted.dates.length +
      ' дней = ' + accepted.paths.length * accepted.dates.length + ' URL-дней.');
    setSetting_('PRO_COVERAGE_STATUS',
      'Текущий пакет: ' + accepted.paths.length + ' URL, ' +
      accepted.dates.length + ' дат; ' + accepted.dates[0] + ' - ' +
      accepted.dates[accepted.dates.length - 1] + '.');
    setSetting_('LAST_PRO_RUN', nowText_());
    setSetting_('LAST_PRO_ERROR', '');

    scheduleProFollowUp_();
    markRunStage_('Ожидание PRO', 'PRO-пакет по сайту запущен и формируется в Яндекс Вебмастере', 95);
    return 'STARTED';
  } catch (e) {
    setSetting_('LAST_PRO_ERROR', errorText_(e));
    setSetting_('PRO_STATUS', 'ERROR');
    setSetting_('PRO_STATUS_MESSAGE', errorText_(e));
    markRunError_('Ошибка PRO-выгрузки', e);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

// v3.11: непрерывная история по парам URL + дата, без повторного расхода квоты.
function ensureProHistorySheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let coverage = ss.getSheetByName(SEO_CFG.SHEETS.PRO_COVERAGE);
  if (!coverage) {
    coverage = ss.insertSheet(SEO_CFG.SHEETS.PRO_COVERAGE);
  }
  coverage.getRange(1, 1, 1, 3).setValues([SEO_CFG.HEADERS.PRO_COVERAGE]);
  coverage.setFrozenRows(1);
  if (!coverage.isSheetHidden()) coverage.hideSheet();

  let report = ss.getSheetByName(SEO_CFG.SHEETS.PRO_REPORT);
  if (!report) {
    report = ss.insertSheet(SEO_CFG.SHEETS.PRO_REPORT);
    report.setFrozenRows(1);
    report.setColumnWidth(1, 360);
    report.setColumnWidth(2, 290);
    report.setColumnWidth(3, 370);
    report.setColumnWidths(4, 4, 110);
  }
  report.getRange(1, 1, 1, SEO_CFG.HEADERS.PRO_REPORT.length)
    .setValues([SEO_CFG.HEADERS.PRO_REPORT]);
  report.getRange(1, 1, 1, SEO_CFG.HEADERS.PRO_REPORT.length)
    .setFontWeight('bold');
}

function proCoverageKey_(date, path) {
  return normalizeDateText_(date) + '|' + canonicalPath_(path);
}

function readProCoverage_(ss) {
  const known = new Set();
  const coverage = ss.getSheetByName(SEO_CFG.SHEETS.PRO_COVERAGE);
  if (coverage && coverage.getLastRow() > 1) {
    const values = coverage.getRange(2, 1, coverage.getLastRow() - 1, 2).getValues();
    values.forEach(row => {
      const date = normalizeDateText_(row[0]);
      const path = canonicalPath_(row[1]);
      if (date && path) known.add(proCoverageKey_(date, path));
    });
  }
  // Старые выгрузки не теряем: их URL-дни уже содержатся на листе PRO.
  const raw = ss.getSheetByName(SEO_CFG.SHEETS.PRO_RAW);
  if (raw && raw.getLastRow() > 1) {
    const values = raw.getRange(2, 1, raw.getLastRow() - 1, 3).getValues();
    values.forEach(row => {
      const date = normalizeDateText_(row[0]);
      const path = canonicalPath_(row[2]);
      if (date && path) known.add(proCoverageKey_(date, path));
    });
  }
  return known;
}

function planProHistoryBatch_(ss, registry, availableDates) {
  const days = Math.max(1, Math.min(90, Number(SEO_CFG.PRO_HISTORY_DAYS) || 28));
  const recentDates = availableDates.slice(-days).sort();
  const known = readProCoverage_(ss);
  const byPath = {};
  (registry || []).filter(item => item.enabled)
    .filter(item => item.type !== 'Пагинация' && item.type !== 'Юридическая')
    .forEach(item => {
      const path = canonicalPath_(item.url);
      if (path && !byPath[path]) byPath[path] = { path: path, url: item.url };
    });

  const pageSheet = ss.getSheetByName(SEO_CFG.SHEETS.PAGES);
  const imps = {};
  if (pageSheet && pageSheet.getLastRow() >= 2) {
    const rows = pageSheet.getRange(2, 1, pageSheet.getLastRow() - 1, 17).getValues();
    rows.forEach(row => {
      const path = canonicalPath_(row[3]);
      if (path) imps[path] = Math.max(imps[path] || 0, Number(row[16]) || 0);
    });
  }
  const priorities = (SEO_CFG.PRO_PRIORITY_PATHS || []).map(canonicalPath_);
  const index = {};
  priorities.forEach((path, i) => { index[path] = i; });

  const items = Object.keys(byPath).map(path => {
    const missing = recentDates.filter(date => !known.has(proCoverageKey_(date, path)));
    return {
      path: path,
      missing: missing,
      priority: index.hasOwnProperty(path) ? index[path] : 9999,
      imps: imps[path] || 0
    };
  }).filter(x => x.missing.length);

  if (!items.length) return null;

  // Первая очередь: старые выбранные статьи. Потом другие страницы с
  // наибольшими реальными показами и самой неполной 28-дневной историей.
  items.sort((a, b) => {
    const aBackfill = a.missing.length >= 7 ? 0 : 1;
    const bBackfill = b.missing.length >= 7 ? 0 : 1;
    if (aBackfill !== bBackfill) return aBackfill - bBackfill;
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (b.imps !== a.imps) return b.imps - a.imps;
    if (b.missing.length !== a.missing.length) return b.missing.length - a.missing.length;
    return a.path.localeCompare(b.path);
  });

  const first = items[0];
  const dates = first.missing.slice(0, Math.min(days, SEO_CFG.PRO_FREE_DAILY_QUOTA - 1));
  const maxPaths = Math.min(
    Math.floor(SEO_CFG.PRO_FREE_DAILY_QUOTA / dates.length),
    100 - dates.length
  );
  const paths = [first.path];
  items.slice(1).forEach(item => {
    if (paths.length >= maxPaths) return;
    const missingSet = new Set(item.missing);
    if (dates.every(date => missingSet.has(date))) paths.push(item.path);
  });
  return { dates: dates, paths: paths };
}

function proBatchAttempts_(plan) {
  const attempts = [];
  const seen = new Set();
  function add(dates, paths) {
    if (!dates.length || !paths.length) return;
    if (dates.length + paths.length > 100 || dates.length * paths.length > SEO_CFG.PRO_FREE_DAILY_QUOTA) return;
    const key = dates.length + ':' + paths.length;
    if (seen.has(key)) return;
    seen.add(key);
    attempts.push({ dates: dates.slice(), paths: paths.slice() });
  }
  for (let p = plan.paths.length; p >= 1; p--) add(plan.dates, plan.paths.slice(0, p));
  // При неполной дневной квоте пытаемся взять короткий исторический отрезок.
  [14, 7, 3, 1].forEach(n => {
    if (n >= plan.dates.length) return;
    const ds = plan.dates.slice(0, n);
    const count = Math.min(plan.paths.length, Math.floor(SEO_CFG.PRO_FREE_DAILY_QUOTA / n), 100-n);
    add(ds, plan.paths.slice(0, count));
    add(ds, plan.paths.slice(0, 1));
  });
  return attempts;
}

function appendProCoverage_(ss, dates, paths) {
  if (!dates.length || !paths.length) return;
  ensureProHistorySheets_();
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.PRO_COVERAGE);
  const existing = readProCoverage_(ss);
  const collectedAt = new Date();
  const rows = [];
  dates.forEach(date => paths.forEach(path => {
    const key = proCoverageKey_(date, path);
    if (existing.has(key)) return;
    existing.add(key);
    rows.push([date, path, collectedAt]);
  }));
  if (!rows.length) return;
  const firstRow = sheet.getLastRow() + 1;
  ensureRows_(sheet, firstRow + rows.length - 1);
  sheet.getRange(firstRow, 1, rows.length, 3).setValues(rows);
  sheet.getRange(firstRow, 3, rows.length, 1).setNumberFormat('dd.MM.yyyy HH:mm:ss');
}

// Суммирует клики/показы по URL и фразе; усредняет позицию с весом по показам.
// Данные относятся только к выгруженным URL-дням, а не к любому 28-дневному
// интервалу целиком, пока история не будет собрана полностью.
function rebuildProQueryReport() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) throw new Error('Другой SEO-запуск уже выполняется.');
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    rebuildProQueryReport_(ss);
  } finally {
    lock.releaseLock();
  }
}

function rebuildProQueryReport_(ss) {
  ensureProHistorySheets_();
  const raw = ss.getSheetByName(SEO_CFG.SHEETS.PRO_RAW);
  const report = ss.getSheetByName(SEO_CFG.SHEETS.PRO_REPORT);
  const registry = readRegistry_(ss);
  const byPath = {};
  registry.forEach(item => {
    const path = canonicalPath_(item.url);
    if (path && !byPath[path]) byPath[path] = item;
  });
  const count = raw ? raw.getLastRow() - 1 : 0;
  const data = count > 0 ? raw.getRange(2, 1, count, 8).getValues() : [];
  const coveredByPath = {};
  readProCoverage_(ss).forEach(key => {
    const idx = key.indexOf('|');
    if (idx < 0) return;
    const path = key.slice(idx + 1);
    coveredByPath[path] = (coveredByPath[path] || 0) + 1;
  });
  const result = {};
  data.forEach(row => {
    const date = normalizeDateText_(row[0]);
    const path = canonicalPath_(row[2]);
    const query = String(row[3] || '').trim();
    if (!date || !path || !query) return;
    const key = path + '\\u0001' + normalizePhrase_(query);
    if (!result[key]) {
      result[key] = {
        path: path, url: row[2], query: query,
        impressions: 0, clicks: 0, posWeighted: 0, posWeight: 0,
        dates: new Set(), first: date, last: date, group: row[1]
      };
    }
    const out = result[key];
    const imp = Number(row[5]) || 0;
    const clicks = Number(row[6]) || 0;
    const pos = toNumberOrNull_(row[7]);
    out.impressions += imp;
    out.clicks += clicks;
    if (pos !== null && imp > 0) {
      out.posWeighted += pos * imp;
      out.posWeight += imp;
    }
    if (imp > 0) out.dates.add(date);
    if (date < out.first) out.first = date;
    if (date > out.last) out.last = date;
  });

  const values = Object.keys(result).map(k => result[k]).sort((a,b) =>
    b.clicks-a.clicks || b.impressions-a.impressions ||
    a.path.localeCompare(b.path) || a.query.localeCompare(b.query)
  ).map(x => {
    const reg = byPath[x.path];
    return [
      reg ? reg.url : x.url,
      reg ? reg.page : '',
      x.query,
      x.impressions,
      x.clicks,
      x.impressions ? x.clicks / x.impressions * 100 : 0,
      x.posWeight ? x.posWeighted / x.posWeight : '',
      x.dates.size,
      coveredByPath[x.path] || 0,
      x.first, x.last,
      reg ? reg.group : x.group
    ];
  });

  writeRows_(report, SEO_CFG.HEADERS.PRO_REPORT, values);
  report.setFrozenRows(1);
  report.getRange(1, 1, 1, SEO_CFG.HEADERS.PRO_REPORT.length).setFontWeight('bold');
  if (values.length) {
    report.getRange(2, 4, values.length, 2).setNumberFormat('0');
    report.getRange(2, 6, values.length, 2).setNumberFormat('0.00');
  }
  setSetting_('PRO_QUERY_REPORT_STATUS',
    'Обновлено ' + nowText_() + ': ' + values.length +
    ' пар URL/запрос. Период зависит от реально загруженных URL-дней.');
}

function runProPoll() {
  return pollProAndRefresh_();
}

function runProFollowUp() {
  return pollProAndRefresh_();
}

function pollProAndRefresh_() {
  // Если нет ожидающей задачи, вообще не обращаемся к PRO API.
  if (!getSetting_('PRO_PENDING_TASK_ID')) return 'NONE';

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return 'BUSY';

  let state = 'NONE';
  let refreshWeekly = false;

  try {
    ensureRunStarted_('Проверяю готовность PRO-выгрузки', 92);
    markRunStage_('Выполняется', 'Проверяю готовность PRO-выгрузки', 92);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    assertSheets_(ss);

    const token = getToken_();
    const access = resolveAccess_(token);
    state = processPendingProExport_(ss, token, access);
    setSetting_('LAST_PRO_RUN', nowText_());

    if (state === 'IN_PROGRESS') {
      setSetting_('LAST_PRO_ERROR', '');
      scheduleProFollowUp_();
      markRunStage_('Ожидание PRO', 'PRO-выгрузка ещё формируется. Следующая проверка автоматическая', 95);
      return state;
    }

    if (state === 'SUCCESS') {
      setSetting_('LAST_PRO_ERROR', '');
      deleteTriggersByHandler_('runProFollowUp');
      markRunStage_('Выполняется', 'PRO-данные загружены. Пересчитываю SEO-отчёт', 97);
      refreshWeekly = true;
    }

    return state;
  } catch (e) {
    setSetting_('LAST_PRO_ERROR', errorText_(e));
    setSetting_('PRO_STATUS', 'ERROR');
    setSetting_('PRO_STATUS_MESSAGE', errorText_(e));
    markRunError_('Ошибка проверки PRO', e);
    throw e;
  } finally {
    lock.releaseLock();
    if (refreshWeekly) {
      try {
        runWeeklySeoAudit();
      } catch (auditErr) {
        setSetting_('LAST_ERROR', errorText_(auditErr));
        markRunError_('Ошибка пересчёта SEO-отчёта после PRO', auditErr);
      }
    }
  }
}

function scheduleProFollowUp_() {
  deleteTriggersByHandler_('runProFollowUp');

  ScriptApp.newTrigger('runProFollowUp')
    .timeBased()
    .after(SEO_CFG.PRO_FOLLOWUP_MINUTES * 60 * 1000)
    .create();
}

function deleteTriggersByHandler_(handlerName) {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === handlerName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function installAutomation() {
  removeAutomation_(false);

  ScriptApp.newTrigger('runSeoRefreshAuto')
    .timeBased()
    .everyDays(1)
    .atHour(SEO_CFG.AUTO_START_HOUR)
    .nearMinute(SEO_CFG.AUTO_START_MINUTE)
    .inTimezone(SEO_CFG.TIMEZONE)
    .create();

  setSetting_('AUTO_ENABLED', 'TRUE');
  setSetting_(
    'AUTO_SCHEDULE',
    'Ежедневно около ' + pad2_(SEO_CFG.AUTO_START_HOUR) + ':' + pad2_(SEO_CFG.AUTO_START_MINUTE) + ' по Москве'
  );
  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    'Автообновление включено',
    'Каждый день около ' + pad2_(SEO_CFG.AUTO_START_HOUR) + ':' + pad2_(SEO_CFG.AUTO_START_MINUTE) +
      ' по Москве запускается полный SEO-сбор Яндекс Вебмастера.\n\n' +
      'Основные данные обновляются сразу. PRO собирает историю запросов за 28 дней, ' +
      'сначала по приоритетным старым статьям, затем по остальным URL. ' +
      'Задача проверяется каждые ' + SEO_CFG.PRO_FOLLOWUP_MINUTES + ' минут до готовности.\n\n' +
      'Старт установлен раньше 09:00 специально, чтобы к началу рабочего дня таблица обычно уже была обновлена.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function removeAutomation() {
  removeAutomation_(true);
}

function removeAutomation_(showAlert) {
  const handlers = new Set([
    'runDailyCollector',
    'runProPoll',
    'runProFollowUp',
    'runWeeklySeoAudit',
    'runSeoMonitoring',
    'runSeoRefreshAuto',
    'runSeoRefreshAutoRetry'
  ]);

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (handlers.has(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  setSetting_('AUTO_ENABLED', 'FALSE');
  SpreadsheetApp.flush();

  if (showAlert) {
    SpreadsheetApp.getUi().alert('Автообновление отключено.');
  }
}

function moscowDate_() {
  return Utilities.formatDate(new Date(), SEO_CFG.TIMEZONE, 'yyyy-MM-dd');
}

function isProLimitError_(error) {
  const text = errorText_(error);
  return /LIMITS_EXCEEDED|PRO feature limits exceeded/i.test(text);
}

function markProQuotaBlockedToday_() {
  setSetting_('PRO_QUOTA_BLOCKED_DATE', moscowDate_());
}

function isProQuotaBlockedToday_() {
  const today = moscowDate_();
  const blockedDate = normalizeDateText_(getSetting_('PRO_QUOTA_BLOCKED_DATE'));

  if (blockedDate === today) return true;

  // Совместимость с v3.4: если сегодня уже была ошибка LIMITS_EXCEEDED,
  // автоматически считаем квоту исчерпанной, даже если новый флаг ещё не записан.
  const lastError = String(getSetting_('LAST_PRO_ERROR') || '');
  const lastRun = String(getSetting_('LAST_PRO_RUN') || '');
  const todayRu = Utilities.formatDate(new Date(), SEO_CFG.TIMEZONE, 'dd.MM.yyyy');

  if (
    /LIMITS_EXCEEDED|PRO feature limits exceeded/i.test(lastError) &&
    lastRun.indexOf(todayRu) === 0
  ) {
    markProQuotaBlockedToday_();
    return true;
  }

  // Старую блокировку просто игнорируем после смены московской даты.
  if (blockedDate && blockedDate !== today) {
    setSetting_('PRO_QUOTA_BLOCKED_DATE', '');
  }

  return false;
}

function processPendingProExport_(ss, token, access) {
  const taskId = getSetting_('PRO_PENDING_TASK_ID');
  const pendingDate = getSetting_('PRO_PENDING_DATE');

  if (!taskId) {
    // Не затираем последний содержательный статус (SUCCESS/UP_TO_DATE/QUOTA).
    if (!getSetting_('PRO_STATUS')) {
      setSetting_('PRO_STATUS', 'NONE');
      setSetting_('PRO_STATUS_MESSAGE', 'Нет ожидающей PRO-выгрузки');
    }
    return 'NONE';
  }

  const status = apiGet_(
    token,
    hostPath_(access) + '/pro/serp/queries/download/' + encodeURIComponent(taskId)
  );

  const state = String(status.download_status || '').toUpperCase();

  if (state === 'IN_PROGRESS') {
    setSetting_('PRO_STATUS', 'IN_PROGRESS');
    setSetting_(
      'PRO_STATUS_MESSAGE',
      'Отчёт формируется в Яндекс Вебмастере. Обычно 20 минут - 2 часа, иногда до 24 часов.'
    );
    return 'IN_PROGRESS';
  }

  if (state === 'FAILED') {
    const message = status.error_message || status.error_code || 'PRO-выгрузка завершилась ошибкой.';
    setSetting_('PRO_PENDING_TASK_ID', '');
    setSetting_('PRO_PENDING_DATE', '');
    setSetting_('PRO_PENDING_PATHS', '');
    setSetting_('PRO_PENDING_NEXT_CURSOR', '');
    setSetting_('PRO_PENDING_BATCH_SIZE', '');
    setSetting_('PRO_PENDING_TOTAL_URLS', '');
    setSetting_('PRO_PENDING_CYCLE_COMPLETED', '');
    setSetting_('PRO_DAILY_BATCH_DATE', '');
    setSetting_(
      'PRO_LAST_REQUESTED_DATE',
      getSetting_('PRO_LAST_IMPORTED_DATE') || ''
    );
    setSetting_('PRO_STATUS', 'FAILED');
    setSetting_('PRO_STATUS_MESSAGE', String(message));
    throw new Error(String(message));
  }

  if (state !== 'SUCCESS' || !status.url) {
    throw new Error('Неизвестный статус PRO-выгрузки: ' + (state || 'пусто'));
  }

  const response = UrlFetchApp.fetch(status.url, {
    method: 'get',
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Не удалось скачать PRO-отчёт. HTTP ' + code);
  }

  const registry = readRegistry_(ss);
  const registryByPath = {};
  registry.forEach(item => {
    registryByPath[canonicalPath_(item.url)] = item;
  });

  const rows = parseProReport_(response.getBlob(), pendingDate, registryByPath);
  ensureProHistorySheets_();
  appendProRows_(ss, rows);
  const completedPaths = String(getSetting_('PRO_PENDING_PATHS') || '')
    .split('\n').map(canonicalPath_).filter(Boolean);
  const completedDates = String(pendingDate || '').split(',')
    .map(normalizeDateText_).filter(Boolean);
  // Отмечаем даже пары URL/дата без показов: отсутствие строк не равно сбою.
  // Старые задачи v3.10 не имеют сохранённых путей и не попадают в покрытие.
  appendProCoverage_(ss, completedDates, completedPaths);
  rebuildProQueryReport_(ss);

  const importedDates = String(pendingDate || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .sort();

  const previousLastImported = normalizeDateText_(
    getSetting_('PRO_LAST_IMPORTED_DATE')
  );
  const latestImportedDate = [previousLastImported].concat(importedDates)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || '';

  setSetting_('PRO_LAST_IMPORTED_DATE', latestImportedDate);
  rememberProImportedDates_(importedDates);

  setSetting_('PRO_COVERAGE_STATUS',
    'Загружено ' + completedPaths.length + ' URL x ' +
    completedDates.length + ' дат; ' +
    (completedPaths.length * completedDates.length) + ' URL-дней.');

  setSetting_('PRO_PENDING_TASK_ID', '');
  setSetting_('PRO_PENDING_DATE', '');
  setSetting_('PRO_PENDING_PATHS', '');
  setSetting_('PRO_PENDING_NEXT_CURSOR', '');
  setSetting_('PRO_PENDING_BATCH_SIZE', '');
  setSetting_('PRO_PENDING_TOTAL_URLS', '');
  setSetting_('PRO_PENDING_CYCLE_COMPLETED', '');
  setSetting_('LAST_PRO_ERROR', '');
  setSetting_('PRO_STATUS', 'SUCCESS');
  setSetting_(
    'PRO_STATUS_MESSAGE',
    'PRO-пакет готов и импортирован. Сырые данные сохранены на техническом листе URL-запросы PRO.'
  );

  return 'SUCCESS';
}

function getKnownProDates_(ss) {
  const known = new Set();

  // Даты, которые уже успешно запрашивались, включая даты с нулём строк.
  String(getSetting_('PRO_IMPORTED_DATES') || '')
    .split(',')
    .map(v => normalizeDateText_(v))
    .filter(Boolean)
    .forEach(date => known.add(date));

  // Совместимость с предыдущей версией скрипта.
  const lastImported = normalizeDateText_(getSetting_('PRO_LAST_IMPORTED_DATE'));
  if (lastImported) known.add(lastImported);

  // Фактические даты, уже присутствующие на листе PRO.
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.PRO_RAW);
  if (sheet && sheet.getLastRow() >= 2) {
    const values = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, 1)
      .getDisplayValues();

    values.forEach(row => {
      const date = normalizeDateText_(row[0]);
      if (date) known.add(date);
    });
  }

  return known;
}

function rememberProImportedDates_(dates) {
  const known = new Set();

  String(getSetting_('PRO_IMPORTED_DATES') || '')
    .split(',')
    .map(v => normalizeDateText_(v))
    .filter(Boolean)
    .forEach(date => known.add(date));

  (dates || [])
    .map(v => normalizeDateText_(v))
    .filter(Boolean)
    .forEach(date => known.add(date));

  // Храним небольшой запас истории, чтобы даты без строк не запрашивались повторно.
  const stored = Array.from(known).sort().slice(-60);
  setSetting_('PRO_IMPORTED_DATES', stored.join(','));
}

function parseProReport_(blob, forcedDate, registryByPath) {
  let text = '';

  try {
    const bytes = blob.getBytes();
    const isZip = bytes.length >= 2 && bytes[0] === 80 && bytes[1] === 75;
    const isGzip = bytes.length >= 2 && bytes[0] === 31 && bytes[1] === -117;

    if (isZip) {
      const unpacked = Utilities.unzip(blob);
      if (!unpacked.length) return [];
      text = unpacked[0].getDataAsString('UTF-8');
    } else if (isGzip) {
      text = Utilities.ungzip(blob).getDataAsString('UTF-8');
    } else {
      text = blob.getDataAsString('UTF-8');
    }
  } catch (e) {
    text = blob.getDataAsString('UTF-8');
  }

  text = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = detectDelimiter_(firstLine);
  const table = Utilities.parseCsv(text, delimiter);

  if (table.length < 2) return [];

  const headers = table[0].map(normalizeHeader_);
  const index = headerIndexMap_(headers);

  const idxDate = findHeader_(index, ['date', 'дата']);
  const idxUrl = findHeader_(index, ['url', 'адрес', 'page', 'страница']);
  const idxHost = findHeader_(index, ['host', 'hostname', 'domain', 'хост', 'домен']);
  const idxPath = findHeader_(index, ['path', 'urlpath', 'путь']);
  const idxQuery = findHeader_(index, ['query', 'запрос', 'searchquery']);
  const idxRegionName = findHeader_(index, ['regionname', 'region_name', 'названиерегиона', 'регион']);
  const idxRegionId = findHeader_(index, ['regionid', 'region_id', 'idрегиона']);
  const idxClicks = findHeader_(index, ['clicks', 'клики']);
  const idxImpressions = findHeader_(index, ['impressions', 'показы', 'shows']);
  const idxPosition = findHeader_(index, ['position', 'позиция', 'ranking']);
  if (String(forcedDate || '').indexOf(',') >= 0 && idxDate < 0) {
    throw new Error('PRO-отчёт с несколькими датами не содержит колонку даты. Импорт остановлен без потери данных.');
  }

  const hasUrl = idxUrl >= 0;
  const hasHostPath = idxHost >= 0 && idxPath >= 0;

  if ((!hasUrl && !hasHostPath) || idxQuery < 0) {
    throw new Error(
      'В PRO-отчёте не найдены обязательные колонки query и адрес страницы ' +
      '(URL либо связка host + path). Заголовки: ' + table[0].join(' | ')
    );
  }

  const loadedAt = new Date();
  const result = [];

  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    const query = String(row[idxQuery] || '').trim();
    if (!query) continue;

    let url = hasUrl ? String(row[idxUrl] || '').trim() : '';

    // В актуальной PRO-выгрузке Яндекса отдельной колонки URL может не быть.
    // Тогда адрес страницы собираем из host + path.
    if (!url && hasHostPath) {
      let host = String(row[idxHost] || '').trim();
      let path = String(row[idxPath] || '').trim();

      if (host) {
        if (!/^https?:\/\//i.test(host)) {
          host = 'https://' + host.replace(/^\/+/, '');
        }

        host = host.replace(/\/+$/, '');

        if (!path) path = '/';
        if (!path.startsWith('/')) path = '/' + path;

        url = host + path;
      }
    }

    if (!url) continue;

    let region = '';
    if (idxRegionName >= 0) {
      region = String(row[idxRegionName] || '').trim();
    }
    if (!region && idxRegionId >= 0) {
      region = String(row[idxRegionId] || '').trim();
    }

    const reportDate = idxDate >= 0
      ? normalizeDateText_(row[idxDate])
      : String(forcedDate || '').split(',')[0].trim();

    const reg = registryByPath ? registryByPath[canonicalPath_(url)] : null;

    result.push([
      reportDate,
      reg ? reg.group : '',
      url,
      query,
      region,
      idxImpressions >= 0 ? blankIfNaN_(parseLocaleNumber_(row[idxImpressions])) || 0 : 0,
      idxClicks >= 0 ? blankIfNaN_(parseLocaleNumber_(row[idxClicks])) || 0 : 0,
      idxPosition >= 0 ? blankIfNaN_(parseLocaleNumber_(row[idxPosition])) : '',
      loadedAt
    ]);
  }

  return result;
}

function appendProRows_(ss, rows) {
  if (!rows.length) return;

  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.PRO_RAW);
  const lastRow = sheet.getLastRow();

  const existing = new Set();
  if (lastRow >= 2) {
    // Проверяем весь накопленный архив, включая старые строки.
    // Это исключает повторные подсчёты при повторном импорте задачи.
    const take = lastRow - 1;
    const start = 2;
    const values = sheet.getRange(start, 1, take, 5).getDisplayValues();

    values.forEach(row => {
      existing.add(proKey_(row[0], row[2], row[3], row[4]));
    });
  }

  const clean = [];
  rows.forEach(row => {
    const key = proKey_(row[0], row[2], row[3], row[4]);
    if (existing.has(key)) return;
    existing.add(key);
    clean.push(row);
  });

  if (!clean.length) return;

  ensureRows_(sheet, sheet.getLastRow() + clean.length + 1);

  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, clean.length, 9).setValues(clean);
  sheet.getRange(startRow, 6, clean.length, 2).setNumberFormat('0');
  sheet.getRange(startRow, 8, clean.length, 1).setNumberFormat('0.00');
  sheet.getRange(startRow, 9, clean.length, 1).setNumberFormat('dd.MM.yyyy HH:mm:ss');
}

function buildProOverlaps_(ss, dateFrom, dateTo, registryByPath) {
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.PRO_RAW);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const byQuery = {};

  values.forEach(row => {
    const date = normalizeDateText_(row[0]);
    if (!date || date < dateFrom || date > dateTo) return;

    const url = String(row[2] || '').trim();
    const query = String(row[3] || '').trim();
    const impressions = Number(row[5]) || 0;
    const position = toNumberOrNull_(row[7]);

    if (!query || !url || impressions <= 0) return;

    const path = canonicalPath_(url);
    const reg = registryByPath[path];
    if (!reg) return;
    if (reg.type === 'Пагинация' || reg.type === 'Юридическая') return;

    const qKey = normalizePhrase_(query);
    if (!byQuery[qKey]) {
      byQuery[qKey] = {
        query: query,
        urls: {}
      };
    }

    if (!byQuery[qKey].urls[path]) {
      byQuery[qKey].urls[path] = {
        path: path,
        url: reg.url,
        page: reg.page,
        group: reg.group,
        impressions: 0,
        posWeighted: 0,
        posWeight: 0
      };
    }

    const u = byQuery[qKey].urls[path];
    u.impressions += impressions;

    if (position != null) {
      u.posWeighted += position * impressions;
      u.posWeight += impressions;
    }
  });

  const overlaps = [];

  Object.keys(byQuery).forEach(key => {
    const entry = byQuery[key];
    const urls = Object.keys(entry.urls)
      .map(path => entry.urls[path])
      .filter(u => u.impressions > 0);

    if (urls.length < 2) return;

    urls.forEach(u => {
      u.position = u.posWeight > 0
        ? round2_(u.posWeighted / u.posWeight)
        : null;
    });

    urls.sort((a, b) => b.impressions - a.impressions);

    overlaps.push({
      query: entry.query,
      urls: urls,
      totalImpressions: urls.reduce((sum, u) => sum + u.impressions, 0)
    });
  });

  overlaps.sort((a, b) => b.totalImpressions - a.totalImpressions);
  return overlaps;
}

function fetchAllQueryAnalytics_(token, access, indicator, device, searchLocation, maxItems) {
  const endpoint = hostPath_(access) + '/query-analytics/list';
  const limit = 500;
  let offset = 0;
  let count = 0;
  let items = [];

  while (items.length < maxItems) {
    const data = apiPost_(token, endpoint, {
      offset: offset,
      limit: limit,
      device_type_indicator: device,
      search_location: searchLocation,
      text_indicator: indicator
    });

    const part = Array.isArray(data.text_indicator_to_statistics)
      ? data.text_indicator_to_statistics
      : [];

    count = Number(data.count) || part.length;
    items = items.concat(part);

    if (!part.length) break;
    offset += part.length;

    if (offset >= count || part.length < limit) break;
  }

  if (items.length > maxItems) {
    items = items.slice(0, maxItems);
  }

  return {
    items: items,
    count: count,
    truncated: count > items.length
  };
}

function buildAnalyticsModels_(items, indicator, periods, registryByPath) {
  return (items || []).map(item => {
    const text = item && item.text_indicator
      ? String(item.text_indicator.value || '')
      : '';

    const complementary = item && item.popular_complementary_indicator
      ? String(item.popular_complementary_indicator.value || '')
      : '';

    const current = aggregateItemStats_(item, periods.current);
    const previous = aggregateItemStats_(item, periods.previous);
    const deltaPosition = positionDelta_(current.position, previous.position);
    const deltaImpressionsPct = percentDelta_(
      current.impressions,
      previous.impressions
    );

    let registry = null;
    if (indicator === 'QUERY') {
      registry = registryByPath[canonicalPath_(complementary)] || null;
    } else {
      registry = registryByPath[canonicalPath_(text)] || null;
    }

    return {
      indicator: indicator,
      text: text,
      complementary: complementary,
      current: current,
      previous: previous,
      deltaPosition: deltaPosition,
      deltaImpressionsPct: deltaImpressionsPct,
      registry: registry,
      group: registry ? registry.group : 'Вне карты',
      type: registry ? registry.type : 'Вне карты',
      page: registry ? registry.page : '',
      targetUrl: registry ? registry.url : ''
    };
  });
}

function aggregateItemStats_(item, period) {
  const byDate = {};

  (item && Array.isArray(item.statistics) ? item.statistics : []).forEach(stat => {
    const date = normalizeDateText_(stat.date);
    if (!date || date < period.start || date > period.end) return;

    if (!byDate[date]) {
      byDate[date] = {
        impressions: null,
        clicks: null,
        position: null,
        demand: null
      };
    }

    const value = toNumberOrNull_(stat.value);
    const field = String(stat.field || '');

    if (field === 'IMPRESSIONS') byDate[date].impressions = value;
    if (field === 'CLICKS') byDate[date].clicks = value;
    if (field === 'POSITION') byDate[date].position = value;
    if (field === 'DEMAND') byDate[date].demand = value;
  });

  let impressions = 0;
  let clicks = 0;
  let demand = 0;
  let posWeighted = 0;
  let posWeight = 0;
  const positions = [];
  let hasData = false;

  Object.keys(byDate).forEach(date => {
    const d = byDate[date];
    hasData = true;

    const imp = d.impressions == null ? 0 : d.impressions;
    const clk = d.clicks == null ? 0 : d.clicks;
    const dem = d.demand == null ? 0 : d.demand;

    impressions += imp;
    clicks += clk;
    demand += dem;

    if (d.position != null) {
      positions.push(d.position);
      if (imp > 0) {
        posWeighted += d.position * imp;
        posWeight += imp;
      }
    }
  });

  let position = null;
  if (posWeight > 0) {
    position = posWeighted / posWeight;
  } else if (positions.length) {
    position = positions.reduce((a, b) => a + b, 0) / positions.length;
  }

  return {
    hasData: hasData,
    impressions: impressions,
    clicks: clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    position: position == null ? null : round2_(position),
    demand: demand
  };
}

function findLatestAnalyticsDate_(items) {
  let latest = '';

  (items || []).forEach(item => {
    (item && Array.isArray(item.statistics) ? item.statistics : []).forEach(stat => {
      const date = normalizeDateText_(stat.date);
      if (date && (!latest || date > latest)) latest = date;
    });
  });

  return latest;
}

function buildPeriods_(latestDate) {
  const end = parseIsoDate_(latestDate);
  const currentStart = addDays_(end, -6);
  const previousEnd = addDays_(end, -7);
  const previousStart = addDays_(end, -13);

  return {
    current: {
      start: isoDate_(currentStart),
      end: isoDate_(end)
    },
    previous: {
      start: isoDate_(previousStart),
      end: isoDate_(previousEnd)
    }
  };
}

function fetchSiteSearchHistory_(token, access, periods) {
  return apiGet_(
    token,
    hostPath_(access) + '/search-queries/all/history',
    {
      query_indicator: [
        'TOTAL_SHOWS',
        'TOTAL_CLICKS',
        'AVG_SHOW_POSITION'
      ],
      device_type_indicator: getSetting_('DEVICE') || 'ALL',
      date_from: periods.previous.start,
      date_to: periods.current.end
    }
  );
}

function aggregateSiteHistory_(data, period) {
  const indicators = data && data.indicators ? data.indicators : {};
  const showsByDate = historyToMap_(indicators.TOTAL_SHOWS || []);
  const clicksByDate = historyToMap_(indicators.TOTAL_CLICKS || []);
  const posByDate = historyToMap_(indicators.AVG_SHOW_POSITION || []);

  let shows = 0;
  let clicks = 0;
  let posWeighted = 0;
  let posWeight = 0;
  const positions = [];

  dateRange_(period.start, period.end).forEach(date => {
    const s = Number(showsByDate[date]) || 0;
    const c = Number(clicksByDate[date]) || 0;
    const p = toNumberOrNull_(posByDate[date]);

    shows += s;
    clicks += c;

    if (p != null) {
      positions.push(p);
      if (s > 0) {
        posWeighted += p * s;
        posWeight += s;
      }
    }
  });

  let position = null;
  if (posWeight > 0) {
    position = posWeighted / posWeight;
  } else if (positions.length) {
    position = positions.reduce((a, b) => a + b, 0) / positions.length;
  }

  return {
    impressions: shows,
    clicks: clicks,
    ctr: shows > 0 ? (clicks / shows) * 100 : 0,
    position: position == null ? null : round2_(position)
  };
}

function summarizeQueries_(models, periodKey) {
  let realQueries = 0;
  let top3 = 0;
  let top10 = 0;
  let top30 = 0;

  (models || []).forEach(m => {
    const s = m[periodKey];
    if (!s || s.impressions <= 0) return;

    realQueries++;

    if (s.position != null && s.position <= 3) top3++;
    if (s.position != null && s.position <= 10) top10++;
    if (s.position != null && s.position <= 30) top30++;
  });

  return {
    realQueries: realQueries,
    top3: top3,
    top10: top10,
    top30: top30
  };
}

function mergePageModels_(
  registry,
  urlModelsBase,
  queryModels,
  queryCountByPath,
  inSearchSet,
  inSearchAvailable
) {
  const map = {};

  (urlModelsBase || []).forEach(m => {
    const path = canonicalPath_(m.text);
    if (!path) return;

    map[path] = {
      group: m.registry ? m.registry.group : 'Вне карты',
      type: m.registry ? m.registry.type : 'Вне карты',
      page: m.registry ? m.registry.page : '',
      url: m.registry ? m.registry.url : m.text,
      popularQuery: m.complementary || '',
      queryCount: queryCountByPath[path] || 0,
      current: m.current,
      previous: m.previous,
      deltaPosition: m.deltaPosition,
      deltaImpressionsPct: m.deltaImpressionsPct,
      inSearch: inSearchAvailable
        ? (inSearchSet.has(path) || m.current.impressions > 0)
        : null,
      registry: m.registry
    };
  });

  (registry || []).forEach(reg => {
    const path = canonicalPath_(reg.url);
    if (!path) return;

    if (!map[path]) {
      map[path] = {
        group: reg.group,
        type: reg.type,
        page: reg.page,
        url: reg.url,
        popularQuery: '',
        queryCount: queryCountByPath[path] || 0,
        current: emptyStats_(),
        previous: emptyStats_(),
        deltaPosition: null,
        deltaImpressionsPct: null,
        inSearch: inSearchAvailable ? inSearchSet.has(path) : null,
        registry: reg
      };
    } else {
      map[path].group = reg.group;
      map[path].type = reg.type;
      map[path].page = reg.page;
      map[path].url = reg.url;
      map[path].registry = reg;
      map[path].queryCount = queryCountByPath[path] || map[path].queryCount || 0;
    }
  });

  const rows = Object.keys(map).map(path => map[path]);

  rows.sort((a, b) => {
    const ga = groupSortValue_(a.group);
    const gb = groupSortValue_(b.group);
    if (ga !== gb) return ga - gb;

    if (b.current.impressions !== a.current.impressions) {
      return b.current.impressions - a.current.impressions;
    }

    return String(a.page || a.url).localeCompare(String(b.page || b.url), 'ru');
  });

  return rows;
}

function updateTargetPhrases_(ss, registry, queryModels, periods) {
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.PHRASES);
  const queryIndex = {};

  queryModels.forEach(m => {
    const key = normalizePhrase_(m.text);
    if (key && !queryIndex[key]) queryIndex[key] = m;
  });

  const matrix = registry.map(reg => {
    const m = queryIndex[normalizePhrase_(reg.phrase)];

    if (!m) {
      return [
        periods.current.end, '', '', '', '', '', '', '', '', '', '', '', 'Нет данных'
      ];
    }

    const c = m.current;
    const p = m.previous;
    const actualUrl = m.complementary || '';
    let urlMatch = '';

    if (c.impressions > 0 && actualUrl) {
      urlMatch = canonicalPath_(actualUrl) === canonicalPath_(reg.url);
    }

    return [
      periods.current.end,
      c.impressions,
      c.clicks,
      round2_(c.ctr),
      blankIfNull_(c.position),
      c.demand,
      actualUrl,
      urlMatch,
      blankIfNull_(p.position),
      blankIfNull_(m.deltaPosition),
      p.impressions,
      blankIfNull_(m.deltaImpressionsPct),
      targetPhraseStatus_(m, reg, urlMatch)
    ];
  });

  if (!matrix.length) return;

  sheet.getRange(2, 7, matrix.length, 13).setValues(matrix);
  sheet.getRange(2, 8, matrix.length, 2).setNumberFormat('0');
  sheet.getRange(2, 10, matrix.length, 3).setNumberFormat('0.00');
  sheet.getRange(2, 15, matrix.length, 2).setNumberFormat('0.00');
  sheet.getRange(2, 17, matrix.length, 1).setNumberFormat('0');
  sheet.getRange(2, 18, matrix.length, 1).setNumberFormat('0.00');
}

function writeQueries_(ss, models) {
  const rows = models.map(m => [
    m.group,
    m.text,
    m.page || '',
    m.complementary || '',
    blankIfNull_(m.current.position),
    blankIfNull_(m.previous.position),
    blankIfNull_(m.deltaPosition),
    m.current.impressions,
    m.previous.impressions,
    blankIfNull_(m.deltaImpressionsPct),
    m.current.clicks,
    m.previous.clicks,
    round2_(m.current.ctr),
    m.current.demand,
    queryStatus_(m)
  ]);

  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.QUERIES);
  writeRows_(sheet, SEO_CFG.HEADERS.QUERIES, rows);

  if (rows.length) {
    sheet.getRange(2, 5, rows.length, 3).setNumberFormat('0.00');
    sheet.getRange(2, 8, rows.length, 2).setNumberFormat('0');
    sheet.getRange(2, 10, rows.length, 1).setNumberFormat('0.00');
    sheet.getRange(2, 11, rows.length, 2).setNumberFormat('0');
    sheet.getRange(2, 13, rows.length, 2).setNumberFormat('0.00');
  }
}

function writePages_(ss, models) {
  const rows = models.map(m => [
    m.group,
    m.type,
    m.page || '',
    m.url || '',
    m.popularQuery || '',
    m.queryCount || 0,
    blankIfNull_(m.current.position),
    blankIfNull_(m.previous.position),
    blankIfNull_(m.deltaPosition),
    m.current.impressions,
    m.previous.impressions,
    blankIfNull_(m.deltaImpressionsPct),
    m.current.clicks,
    m.previous.clicks,
    round2_(m.current.ctr),
    pageStatus_(m)
  ]);

  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.PAGES);
  writeRows_(sheet, SEO_CFG.HEADERS.PAGES, rows);

  if (rows.length) {
    sheet.getRange(2, 6, rows.length, 1).setNumberFormat('0');
    sheet.getRange(2, 7, rows.length, 3).setNumberFormat('0.00');
    sheet.getRange(2, 10, rows.length, 2).setNumberFormat('0');
    sheet.getRange(2, 12, rows.length, 1).setNumberFormat('0.00');
    sheet.getRange(2, 13, rows.length, 2).setNumberFormat('0');
    sheet.getRange(2, 15, rows.length, 1).setNumberFormat('0.00');
  }
}

function writeGroups_(ss, registry, queryModels) {
  const definitions = [
    { key: 1, label: '1. Максимально коммерческие' },
    { key: 2, label: '2. Коммерческо-информационные' },
    { key: 3, label: '3. Информационные / сервисы' },
    { key: 'Вне карты', label: 'Вне карты' }
  ];

  const rows = definitions.map(def => {
    const groupQueries = queryModels.filter(m => String(m.group) === String(def.key));
    const current = aggregateModels_(groupQueries, 'current');
    const previous = aggregateModels_(groupQueries, 'previous');

    return [
      def.label,
      def.key === 'Вне карты'
        ? 0
        : registry.filter(r => String(r.group) === String(def.key)).length,
      current.realQueries,
      current.top3,
      current.top10,
      current.top30,
      current.impressions,
      previous.impressions,
      blankIfNull_(percentDelta_(current.impressions, previous.impressions)),
      current.clicks,
      previous.clicks,
      blankIfNull_(current.position),
      blankIfNull_(previous.position),
      blankIfNull_(positionDelta_(current.position, previous.position))
    ];
  });

  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.GROUPS);
  writeRows_(sheet, SEO_CFG.HEADERS.GROUPS, rows);

  sheet.getRange(2, 2, rows.length, 5).setNumberFormat('0');
  sheet.getRange(2, 7, rows.length, 2).setNumberFormat('0');
  sheet.getRange(2, 9, rows.length, 1).setNumberFormat('0.00');
  sheet.getRange(2, 10, rows.length, 2).setNumberFormat('0');
  sheet.getRange(2, 12, rows.length, 3).setNumberFormat('0.00');
}

function aggregateModels_(models, periodKey) {
  let impressions = 0;
  let clicks = 0;
  let realQueries = 0;
  let top3 = 0;
  let top10 = 0;
  let top30 = 0;
  let posWeighted = 0;
  let posWeight = 0;
  const posList = [];

  models.forEach(m => {
    const s = m[periodKey];
    if (!s) return;

    impressions += s.impressions;
    clicks += s.clicks;

    if (s.impressions > 0) {
      realQueries++;
      if (s.position != null && s.position <= 3) top3++;
      if (s.position != null && s.position <= 10) top10++;
      if (s.position != null && s.position <= 30) top30++;
    }

    if (s.position != null) {
      posList.push(s.position);
      if (s.impressions > 0) {
        posWeighted += s.position * s.impressions;
        posWeight += s.impressions;
      }
    }
  });

  let position = null;
  if (posWeight > 0) {
    position = posWeighted / posWeight;
  } else if (posList.length) {
    position = posList.reduce((a, b) => a + b, 0) / posList.length;
  }

  return {
    impressions: impressions,
    clicks: clicks,
    realQueries: realQueries,
    top3: top3,
    top10: top10,
    top30: top30,
    position: position == null ? null : round2_(position)
  };
}

function buildProblems_(ctx) {
  const issues = [];

  // Ошибки самого сборщика/API.
  (ctx.collectionErrors || []).forEach(err => {
    issues.push([
      'Сервис',
      'Сбор данных',
      err.label,
      'Не удалось получить часть данных Яндекс Вебмастера',
      err.message,
      'Проверить OAuth-доступ и повторить недельный отчёт. Остальные разделы отчёта могли обновиться нормально.',
      ctx.periods.current.end,
      'Скрипт'
    ]);
  });

  if (ctx.analyticsTruncated) {
    issues.push([
      'Проверить',
      'Данные',
      'Мониторинг поисковых запросов',
      'Список запросов или URL был обрезан лимитом MAX_ANALYTICS_ITEMS',
      'В настройках установлен ограничитель количества строк.',
      'Увеличить MAX_ANALYTICS_ITEMS, если листы и время выполнения позволяют.',
      ctx.periods.current.end,
      'Скрипт'
    ]);
  }

  // Официальная диагностика Вебмастера.
  const diagnostics = ctx.diagnostics && ctx.diagnostics.problems
    ? ctx.diagnostics.problems
    : {};

  Object.keys(diagnostics).forEach(code => {
    const p = diagnostics[code];
    if (!p || String(p.state) !== 'PRESENT') return;

    issues.push([
      severityToPriority_(p.severity),
      'Диагностика',
      code,
      diagnosticText_(code),
      'Статус: PRESENT; уровень: ' + String(p.severity || ''),
      diagnosticRecommendation_(code),
      normalizeDateText_(p.last_state_update),
      'Яндекс Вебмастер: диагностика'
    ]);
  });

  // Неработающие внутренние ссылки.
  (ctx.brokenLinks || []).forEach(link => {
    issues.push([
      'Важно',
      'Внутренние ссылки',
      String(link.destination_url || ''),
      'Яндекс считает внутреннюю ссылку неработающей',
      'Источник: ' + String(link.source_url || '') +
        '; обнаружена: ' + String(link.discovery_date || ''),
      'Проверить целевой URL. Исправить ссылку, восстановить страницу или настроить корректный редирект.',
      String(link.discovery_date || ''),
      'Яндекс Вебмастер: внутренние ссылки'
    ]);
  });

  // Страницы, выпавшие из поиска за текущий период.
  (ctx.eventSamples || []).forEach(sample => {
    if (!sample || String(sample.event) !== 'REMOVED_FROM_SEARCH') return;

    const date = normalizeDateText_(sample.event_date);
    if (!date || date < ctx.periods.current.start || date > ctx.periods.current.end) return;

    const path = canonicalPath_(sample.url);
    const reg = ctx.registryByPath[path];
    const reason = String(sample.excluded_url_status || '');

    issues.push([
      reg && Number(reg.group) === 1 ? 'Важно' : 'Проверить',
      'Индексирование',
      reg ? reg.url : String(sample.url || ''),
      'Страница выпала из поиска',
      'Причина Яндекса: ' + (reason || 'не указана') +
        (sample.bad_http_status ? '; HTTP ' + sample.bad_http_status : '') +
        (sample.target_url ? '; другой URL: ' + sample.target_url : ''),
      excludedStatusRecommendation_(reason),
      date,
      'Яндекс Вебмастер: события поиска'
    ]);
  });

  // Страницы карты, которые сейчас не находятся в поиске.
  if (ctx.inSearchAvailable) {
    ctx.pageModels.forEach(m => {
      if (!m.registry || !m.registry.enabled) return;
      if (m.type === 'Пагинация' || m.type === 'Юридическая') return;
      if (m.inSearch !== false) return;

      issues.push([
        Number(m.group) === 1 ? 'Важно' : 'Наблюдение',
        'Индексирование',
        m.url,
        'Целевая страница не найдена среди страниц в поиске',
        'Группа: ' + m.group + '; тип: ' + m.type +
          '; показы за 7 дней: ' + m.current.impressions,
        'Проверить дату публикации. Если прошло больше 7-14 дней, проверить robots/canonical/HTTP и отправить страницу на переобход.',
        ctx.periods.current.end,
        'Яндекс Вебмастер: страницы в поиске'
      ]);
    });
  }

  const minImpressions = Number(getSetting_('MIN_IMPRESSIONS_ALERT')) || 20;
  const dropImpPct = Number(getSetting_('DROP_IMPRESSIONS_PCT')) || 40;
  const dropPosition = Number(getSetting_('DROP_POSITION')) || 5;

  // Существенные падения по страницам.
  ctx.pageModels.forEach(m => {
    if (!m.registry) return;
    if (m.type === 'Пагинация' || m.type === 'Юридическая') return;

    if (
      m.previous.impressions >= minImpressions &&
      m.deltaImpressionsPct != null &&
      m.deltaImpressionsPct <= -dropImpPct
    ) {
      issues.push([
        Number(m.group) === 1 ? 'Важно' : 'Проверить',
        'Динамика страницы',
        m.url,
        'Сильно снизились показы страницы',
        m.previous.impressions + ' -> ' + m.current.impressions +
          ' (' + round2_(m.deltaImpressionsPct) + '%)',
        'Проверить запросы страницы, изменения контента, сниппета и конкуренцию. Не переписывать страницу только по одному недельному колебанию.',
        ctx.periods.current.start + ' - ' + ctx.periods.current.end,
        'Яндекс Вебмастер: мониторинг запросов'
      ]);
    }

    if (
      m.current.position != null &&
      m.previous.position != null &&
      (m.current.impressions + m.previous.impressions) >= minImpressions &&
      m.deltaPosition != null &&
      m.deltaPosition <= -dropPosition
    ) {
      issues.push([
        Number(m.group) === 1 ? 'Важно' : 'Проверить',
        'Динамика страницы',
        m.url,
        'Средняя позиция страницы ухудшилась',
        round2_(m.previous.position) + ' -> ' + round2_(m.current.position) +
          ' (' + round2_(m.deltaPosition) + ' п.)',
        'Посмотреть запросы страницы и изменения в выдаче. Реагировать, если падение сохраняется несколько недель или затрагивает важные коммерческие запросы.',
        ctx.periods.current.start + ' - ' + ctx.periods.current.end,
        'Яндекс Вебмастер: мониторинг запросов'
      ]);
    }
  });

  // Основная фраза страницы показывает другой URL. Только если есть реальные показы.
  const queryIndex = {};
  ctx.queryModels.forEach(m => {
    const key = normalizePhrase_(m.text);
    if (key && !queryIndex[key]) queryIndex[key] = m;
  });

  ctx.registry.forEach(reg => {
    if (!reg.enabled || !reg.phrase) return;

    const m = queryIndex[normalizePhrase_(reg.phrase)];
    if (!m || m.current.impressions <= 0 || !m.complementary) return;

    if (canonicalPath_(m.complementary) === canonicalPath_(reg.url)) return;

    issues.push([
      Number(reg.group) === 1 ? 'Важно' : 'Проверить',
      'Целевой запрос',
      reg.phrase,
      'По основной фразе Яндекс показывает другую страницу',
      'Целевая: ' + reg.url +
        '; фактическая: ' + m.complementary +
        '; показы: ' + m.current.impressions +
        '; позиция: ' + valueText_(m.current.position),
      'Проверить соответствие интентов двух страниц и внутреннюю перелинковку. Это сигнал о возможном пересечении, а не основание автоматически удалять страницу.',
      ctx.periods.current.start + ' - ' + ctx.periods.current.end,
      'Яндекс Вебмастер + карта целевых фраз'
    ]);
  });

  // Проверенное по детальной PRO-выгрузке пересечение нескольких URL по одному запросу.
  (ctx.proOverlaps || []).forEach(overlap => {
    const details = overlap.urls.map(u => {
      return u.url +
        ' | показы ' + u.impressions +
        (u.position != null ? ' | позиция ' + u.position : '');
    }).join(' ; ');

    issues.push([
      'Проверить',
      'Пересечение URL',
      overlap.query,
      'По одному поисковому запросу показываются несколько содержательных URL сайта',
      details,
      'Сравнить интенты и динамику URL. Если страницы решают одну задачу, развести контент или объединить. Если интенты разные, ничего не менять автоматически.',
      ctx.periods.current.start + ' - ' + ctx.periods.current.end,
      'Яндекс Вебмастер: расширенная URL-запрос выгрузка'
    ]);
  });

  const rank = {
    'Критично': 1,
    'Важно': 2,
    'Проверить': 3,
    'Сервис': 4,
    'Наблюдение': 5,
    'Рекомендация': 6
  };

  issues.sort((a, b) => {
    const ra = rank[a[0]] || 99;
    const rb = rank[b[0]] || 99;
    if (ra !== rb) return ra - rb;
    return String(a[1]).localeCompare(String(b[1]), 'ru');
  });

  return issues;
}

function writeProblems_(ss, problems) {
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.PROBLEMS);
  writeRows_(sheet, SEO_CFG.HEADERS.PROBLEMS, problems);

  if (problems.length) {
    sheet.getRange(2, 1, problems.length, 8).setWrap(true);
    sheet.setRowHeights(2, problems.length, 48);
  }
}

function writeSummary_(ss, values) {
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.SUMMARY);

  const c = values.siteCurrent;
  const p = values.sitePrevious;
  const qc = values.queryCurrent;
  const qp = values.queryPrevious;

  const rows = [
    [
      values.periods.current.start + ' - ' + values.periods.current.end,
      values.periods.previous.start + ' - ' + values.periods.previous.end,
      ''
    ],
    [c.impressions, p.impressions, percentDelta_(c.impressions, p.impressions)],
    [c.clicks, p.clicks, percentDelta_(c.clicks, p.clicks)],
    [round2_(c.ctr), round2_(p.ctr), round2_(c.ctr - p.ctr)],
    [blankIfNull_(c.position), blankIfNull_(p.position), blankIfNull_(positionDelta_(c.position, p.position))],
    [qc.realQueries, qp.realQueries, qc.realQueries - qp.realQueries],
    [qc.top3, qp.top3, qc.top3 - qp.top3],
    [qc.top10, qp.top10, qc.top10 - qp.top10],
    [qc.top30, qp.top30, qc.top30 - qp.top30],
    [blankIfNull_(values.searchableCurrent), blankIfNull_(values.searchablePrevious), numericDelta_(values.searchableCurrent, values.searchablePrevious)],
    [values.appeared, '', ''],
    [values.removed, '', ''],
    [blankIfNull_(values.excluded), '', ''],
    [blankIfNull_(values.sqi), '', ''],
    [values.fatal, '', ''],
    [values.critical, '', ''],
    [values.broken, '', ''],
    [values.overlaps, '', ''],
    [values.problemsTotal, '', '']
  ];

  sheet.getRange(2, 2, rows.length, 3).setValues(rows);

  sheet.getRange('B3:C4').setNumberFormat('0');
  sheet.getRange('D3:D4').setNumberFormat('0.00');
  sheet.getRange('B5:D6').setNumberFormat('0.00');
  sheet.getRange('B7:D20').setNumberFormat('0');
}

function upsertWeeklyHistory_(ss, values) {
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.WEEKLY_HISTORY);
  const reportDate = values.periods.current.end;

  const row = [
    reportDate,
    values.periods.current.start + ' - ' + values.periods.current.end,
    values.siteCurrent.impressions,
    values.siteCurrent.clicks,
    round2_(values.siteCurrent.ctr),
    blankIfNull_(values.siteCurrent.position),
    values.queryCurrent.realQueries,
    values.queryCurrent.top10,
    blankIfNull_(values.searchableCurrent),
    blankIfNull_(values.excluded),
    values.fatal,
    values.critical,
    values.problemsTotal
  ];

  let targetRow = sheet.getLastRow() + 1;

  if (sheet.getLastRow() >= 2) {
    const dates = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
    for (let i = 0; i < dates.length; i++) {
      if (normalizeDateText_(dates[i][0]) === reportDate) {
        targetRow = i + 2;
        break;
      }
    }
  }

  ensureRows_(sheet, targetRow);
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  sheet.getRange(targetRow, 3, 1, 2).setNumberFormat('0');
  sheet.getRange(targetRow, 5, 1, 2).setNumberFormat('0.00');
  sheet.getRange(targetRow, 7, 1, 7).setNumberFormat('0');
}

function readRegistry_(ss) {
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.PHRASES);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const result = [];

  rows.forEach((row, index) => {
    const phrase = String(row[4] || '').trim();
    const url = String(row[5] || '').trim();
    if (!url) return;

    result.push({
      row: index + 2,
      enabled: row[0] === true || String(row[0]).toUpperCase() === 'TRUE',
      group: row[1],
      type: String(row[2] || ''),
      page: String(row[3] || ''),
      phrase: phrase,
      url: url
    });
  });

  return result;
}

function syncRegistryWithSitemap_(ss) {
  if (SITEMAP_SYNC_CACHE) return SITEMAP_SYNC_CACHE;

  const result = {
    sourceUrls: 0,
    checkedUrls: 0,
    addedUrls: 0,
    skippedUrls: 0,
    duplicateUrls: 0,
    error: ''
  };

  try {
    const sheet = ss.getSheetByName(SEO_CFG.SHEETS.PHRASES);
    if (!sheet) throw new Error('Не найден лист «Фразы».');

    const response = UrlFetchApp.fetch(SEO_CFG.SITEMAP_URL, {
      muteHttpExceptions: true,
      followRedirects: true
    });
    const responseCode = response.getResponseCode();
    if (responseCode < 200 || responseCode >= 300) {
      throw new Error('Sitemap вернул HTTP ' + responseCode + '.');
    }

    const sitemapUrls = readSitemapUrls_(response.getContentText());
    result.sourceUrls = sitemapUrls.length;

    const registry = readRegistry_(ss);
    const knownPaths = new Set();
    registry.forEach(item => {
      const path = canonicalPath_(item.url);
      if (path) knownPaths.add(path);
    });

    const candidates = [];
    const seenPaths = new Set();

    sitemapUrls.forEach(url => {
      const path = canonicalPath_(url);
      if (!path || knownPaths.has(path)) return;
      if (seenPaths.has(path)) {
        result.duplicateUrls++;
        return;
      }
      seenPaths.add(path);
      candidates.push(url);
    });

    const rows = [];
    const notes = [];

    candidates.forEach(url => {
      result.checkedUrls++;
      const page = fetchIndexableSitemapPage_(url);
      if (!page.indexable) {
        result.skippedUrls++;
        return;
      }

      const reasons = [
        'Требует проверки: группа и контрольная фраза не назначены автоматически.'
      ];
      if (!page.page) reasons.push('Название страницы не определено из H1 или Title.');
      if (!page.type) reasons.push('Тип страницы не определён правилом URL.');

      rows.push([
        true,
        '',
        page.type,
        page.page,
        '',
        url
      ]);
      notes.push([reasons.join(' ')]);
      knownPaths.add(canonicalPath_(url));
      result.addedUrls++;
    });

    if (rows.length) {
      const startRow = sheet.getLastRow() + 1;
      ensureRows_(sheet, startRow + rows.length - 1);

      if (startRow > 2) {
        sheet
          .getRange(startRow - 1, 1, 1, Math.max(6, sheet.getLastColumn()))
          .copyTo(
            sheet.getRange(startRow, 1, rows.length, Math.max(6, sheet.getLastColumn())),
            SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
            false
          );
      }

      sheet.getRange(startRow, 1, rows.length, 6).setValues(rows);
      sheet.getRange(startRow, 2, notes.length, 1).setNotes(notes);
    }

    writeSitemapSyncState_(result);
  } catch (e) {
    result.error = errorText_(e);
    writeSitemapSyncState_(result);
    console.log('Sitemap sync skipped: ' + result.error);
  }

  SITEMAP_SYNC_CACHE = result;
  return result;
}

function readSitemapUrls_(xmlText) {
  const document = XmlService.parse(String(xmlText || ''));
  const root = document.getRootElement();
  const namespace = root.getNamespace();
  const nodes = root.getName() === 'urlset'
    ? root.getChildren('url', namespace)
    : [];
  const urls = [];
  const seen = new Set();

  nodes.forEach(node => {
    const loc = node.getChild('loc', namespace);
    const url = normalizeSitemapUrl_(loc ? loc.getText() : '');
    if (!url || seen.has(canonicalPath_(url))) return;
    seen.add(canonicalPath_(url));
    urls.push(url);
  });

  return urls;
}

function normalizeSitemapUrl_(value) {
  const url = String(value || '').trim();
  if (!/^https:\/\/(?:www\.)?naklikay\.ru(?:\/|$)/i.test(url)) return '';
  if (/[?#]/.test(url)) return '';

  const rawPath = url.replace(/^https:\/\/(?:www\.)?naklikay\.ru/i, '');
  const path = rawPath.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
  return 'https://naklikay.ru' + (path === '/' ? '/' : path + '/');
}

function fetchIndexableSitemapPage_(url) {
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true
    });
    const code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      return { indexable: false, reason: 'HTTP ' + code };
    }

    const html = response.getContentText() || '';
    const headers = response.getHeaders() || {};
    const headerRobots = String(
      headers['X-Robots-Tag'] || headers['x-robots-tag'] || ''
    ).toLowerCase();
    if (/\bnoindex\b/.test(headerRobots)) {
      return { indexable: false, reason: 'X-Robots-Tag noindex' };
    }

    const metaRobots = htmlMetaContent_(html, 'robots').toLowerCase();
    if (/\bnoindex\b/.test(metaRobots)) {
      return { indexable: false, reason: 'meta robots noindex' };
    }

    const canonical = htmlCanonical_(html);
    if (canonical && canonicalPath_(canonical) !== canonicalPath_(url)) {
      return { indexable: false, reason: 'canonical указывает на другой URL' };
    }

    return {
      indexable: true,
      type: inferPageType_(canonicalPath_(url)),
      page: htmlHeading_(html) || htmlTitle_(html)
    };
  } catch (e) {
    return { indexable: false, reason: errorText_(e) };
  }
}

function inferPageType_(path) {
  if (path === '/') return 'Главная';
  if (/^\/blog\/page\/\d+$/.test(path)) return 'Пагинация';
  if (path === '/blog') return 'Хаб';
  if (/^\/blog\//.test(path)) return 'Статья';
  if (path === '/cases') return 'Хаб';
  if (/^\/cases\//.test(path)) return 'Кейс';
  if (/^\/tools\//.test(path) || path === '/tools') return 'Сервис';
  if (/\/(?:cookie-policy|personal-data-consent)$/.test(path)) return 'Юридическая';
  return '';
}

function htmlMetaContent_(html, name) {
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const nameMatch = tag.match(/\bname\s*=\s*["']([^"']+)["']/i);
    if (nameMatch && nameMatch[1].toLowerCase() === name.toLowerCase()) {
      const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
      return contentMatch ? decodeHtmlEntities_(contentMatch[1]) : '';
    }
  }
  return '';
}

function htmlCanonical_(html) {
  const tags = String(html || '').match(/<link\b[^>]*>/gi) || [];
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const relMatch = tag.match(/\brel\s*=\s*["']([^"']+)["']/i);
    if (!relMatch || !/(^|\s)canonical(\s|$)/i.test(relMatch[1])) continue;
    const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    return hrefMatch ? decodeHtmlEntities_(hrefMatch[1]).trim() : '';
  }
  return '';
}

function htmlHeading_(html) {
  const match = String(html || '').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? cleanHtmlText_(match[1]) : '';
}

function htmlTitle_(html) {
  const match = String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanHtmlText_(match[1]) : '';
}

function cleanHtmlText_(value) {
  return decodeHtmlEntities_(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities_(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function writeSitemapSyncState_(result) {
  try {
    PropertiesService.getScriptProperties().setProperties({
      SITEMAP_SYNC_LAST: nowText_(),
      SITEMAP_SYNC_SOURCE_URLS: String(result.sourceUrls || 0),
      SITEMAP_SYNC_ADDED_URLS: String(result.addedUrls || 0),
      SITEMAP_SYNC_SKIPPED_URLS: String(result.skippedUrls || 0),
      SITEMAP_SYNC_ERROR: String(result.error || '')
    });
  } catch (ignore) {}
}

function queryStatus_(m) {
  const c = m.current;
  const p = m.previous;

  if (c.impressions > 0 && p.impressions <= 0) return 'Новый';
  if (c.impressions <= 0 && p.impressions > 0) return 'Потерян';

  if (m.deltaPosition != null && m.deltaPosition >= 3) return 'Рост';
  if (m.deltaPosition != null && m.deltaPosition <= -3) return 'Падение';

  if (c.position != null && c.position <= 3) return 'ТОП-3';
  if (c.position != null && c.position <= 10) return 'ТОП-10';

  return 'Стабильно';
}

function pageStatus_(m) {
  const minImpressions = Number(getSetting_('MIN_IMPRESSIONS_ALERT')) || 20;
  const dropImpPct = Number(getSetting_('DROP_IMPRESSIONS_PCT')) || 40;
  const dropPosition = Number(getSetting_('DROP_POSITION')) || 5;

  if (m.inSearch === false && m.type !== 'Пагинация' && m.type !== 'Юридическая') {
    return 'Нет в поиске';
  }

  if (m.current.impressions > 0 && m.previous.impressions <= 0) {
    return 'Новая видимость';
  }

  if (m.current.impressions <= 0 && m.previous.impressions > 0) {
    return 'Потеря видимости';
  }

  if (
    m.previous.impressions >= minImpressions &&
    m.deltaImpressionsPct != null &&
    m.deltaImpressionsPct <= -dropImpPct
  ) {
    return 'Падение';
  }

  if (
    m.deltaPosition != null &&
    m.deltaPosition <= -dropPosition &&
    (m.current.impressions + m.previous.impressions) >= minImpressions
  ) {
    return 'Падение';
  }

  if (
    (m.deltaImpressionsPct != null && m.deltaImpressionsPct >= dropImpPct) ||
    (m.deltaPosition != null && m.deltaPosition >= dropPosition)
  ) {
    return 'Рост';
  }

  if (m.current.position != null && m.current.position <= 10) return 'ТОП-10';
  if (m.current.impressions > 0) return 'Есть видимость';
  if (m.inSearch === true) return 'В поиске, без показов';

  return 'Нет данных';
}

function targetPhraseStatus_(m, reg, urlMatch) {
  const c = m.current;
  const p = m.previous;

  if (!c.hasData && !p.hasData) return 'Нет данных';
  if (c.impressions <= 0 && c.demand <= 0) return 'Нет спроса';
  if (c.impressions <= 0 && p.impressions > 0) return 'Потерян';
  if (c.impressions <= 0) return 'Нет позиции';

  if (urlMatch === false) return 'Другой URL';

  if (m.deltaPosition != null && m.deltaPosition >= 3) return 'Рост';
  if (m.deltaPosition != null && m.deltaPosition <= -3) return 'Падение';

  if (c.position != null && c.position <= 3) return 'ТОП-3';
  if (c.position != null && c.position <= 10) return 'ТОП-10';
  if (c.position != null && c.position <= 30) return 'ТОП-30';

  return 'Есть позиция';
}

function compareQueryModels_(a, b) {
  if (b.current.impressions !== a.current.impressions) {
    return b.current.impressions - a.current.impressions;
  }

  if (b.previous.impressions !== a.previous.impressions) {
    return b.previous.impressions - a.previous.impressions;
  }

  return String(a.text).localeCompare(String(b.text), 'ru');
}

function writeRows_(sheet, headers, rows) {
  if (!sheet) throw new Error('Не найден лист для записи.');

  if (sheet.getLastRow() >= 2) {
    sheet
      .getRange(2, 1, sheet.getLastRow() - 1, headers.length)
      .clearContent();
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (!rows.length) return;

  ensureRows_(sheet, rows.length + 1);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function fetchPagedGet_(token, path, listKey, limit, maxItems) {
  let offset = 0;
  let count = 0;
  let items = [];

  while (items.length < maxItems) {
    const data = apiGet_(token, path, {
      offset: offset,
      limit: limit
    });

    const part = Array.isArray(data[listKey]) ? data[listKey] : [];
    count = Number(data.count) || part.length;
    items = items.concat(part);

    if (!part.length) break;
    offset += part.length;

    if (offset >= count || part.length < limit) break;
  }

  if (items.length > maxItems) {
    items = items.slice(0, maxItems);
  }

  return {
    items: items,
    count: count,
    truncated: count > items.length,
    failed: false
  };
}

function safeFetch_(fn, fallback, errors, label) {
  try {
    return fn();
  } catch (e) {
    errors.push({
      label: label,
      message: errorText_(e)
    });

    if (fallback && typeof fallback === 'object') {
      fallback.failed = true;
    }

    return fallback;
  }
}

function resolveAccess_(token) {
  const domain = getSetting_('DOMAIN') || 'naklikay.ru';

  let userId = String(getSetting_('USER_ID') || '').trim();
  let hostId = String(getSetting_('HOST_ID') || '').trim();
  let siteUrl = '';

  if (userId && hostId) {
    return {
      userId: userId,
      hostId: hostId,
      siteUrl: 'https://' + domain + '/'
    };
  }

  userId = String(getUserId_(token));
  const host = getHostForDomain_(token, userId, domain);
  hostId = String(host.host_id);

  siteUrl = host.unicode_host_url || host.ascii_host_url || ('https://' + domain + '/');

  setSetting_('USER_ID', userId);
  setSetting_('HOST_ID', hostId);

  return {
    userId: userId,
    hostId: hostId,
    siteUrl: siteUrl
  };
}

function getUserId_(token) {
  const data = apiGet_(token, '/user');
  if (!data || !data.user_id) {
    throw new Error('API не вернул user_id.');
  }
  return data.user_id;
}

function getHostForDomain_(token, userId, domain) {
  const data = apiGet_(token, '/user/' + encodeURIComponent(userId) + '/hosts');

  const normalizedDomain = extractDomain_(domain);
  const matches = [];

  (data.hosts || []).forEach(host => {
    const candidates = [host];
    if (host.main_mirror) candidates.push(host.main_mirror);

    candidates.forEach(candidate => {
      const urls = [
        candidate.ascii_host_url,
        candidate.unicode_host_url
      ].filter(Boolean);

      if (urls.some(url => extractDomain_(url) === normalizedDomain)) {
        matches.push(candidate);
      }
    });
  });

  if (!matches.length) {
    throw new Error(
      'Сайт ' + domain + ' не найден среди сайтов текущего пользователя Яндекс Вебмастера.'
    );
  }

  return matches.find(host => host.verified === true) || matches[0];
}

function apiGet_(token, path, params) {
  const url = buildUrl_(SEO_CFG.API_BASE + path, params || {});
  return apiRequestUrl_(token, url, 'get');
}

function apiPost_(token, path, payload) {
  const url = SEO_CFG.API_BASE + path;
  return apiRequestUrl_(token, url, 'post', payload);
}

function apiRequestUrl_(token, url, method, payload) {
  const options = {
    method: method || 'get',
    headers: {
      Authorization: 'OAuth ' + token,
      Accept: 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload !== undefined) {
    options.contentType = 'application/json; charset=UTF-8';
    options.payload = JSON.stringify(payload);
  }

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error(parseApiError_(code, text));
  }

  return text ? JSON.parse(text) : {};
}

function buildUrl_(base, params) {
  const pairs = [];

  Object.keys(params || {}).forEach(key => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach(v => {
        pairs.push(
          encodeURIComponent(key) + '=' + encodeURIComponent(String(v))
        );
      });
    } else {
      pairs.push(
        encodeURIComponent(key) + '=' + encodeURIComponent(String(value))
      );
    }
  });

  return pairs.length ? base + '?' + pairs.join('&') : base;
}

function hostPath_(access) {
  return '/user/' + encodeURIComponent(access.userId) +
    '/hosts/' + access.hostId;
}

function getToken_() {
  const token = PropertiesService.getScriptProperties()
    .getProperty(SEO_CFG.TOKEN_PROPERTY);

  if (!token) {
    throw new Error(
      'OAuth-токен не найден. Добавьте Script Property YANDEX_WEBMASTER_OAUTH.'
    );
  }

  return token;
}

function hideTechnicalSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [SEO_CFG.SHEETS.PRO_RAW, SEO_CFG.SHEETS.PRO_COVERAGE].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && !sheet.isSheetHidden()) sheet.hideSheet();
  });
}

function settingsUsesDashboard_(sheet) {
  if (!sheet) return false;
  return String(sheet.getRange(1, 1).getDisplayValue()).trim() === 'Ключ' &&
    String(sheet.getRange(1, 2).getDisplayValue()).trim() === 'Показатель' &&
    String(sheet.getRange(1, 3).getDisplayValue()).trim() === 'Значение';
}

function settingsVisibleDefinitions_() {
  return [
    ['RUN_STATUS', 'Статус выполнения', 'Текущее состояние системы'],
    ['RUN_STAGE', 'Текущий этап', 'Обновляется по мере выполнения скрипта'],
    ['RUN_PROGRESS', 'Прогресс', 'Ориентировочный прогресс текущего запуска'],
    ['RUN_STARTED_AT', 'Запуск начат', 'Время начала текущего запуска'],
    ['RUN_UPDATED_AT', 'Этап обновлён', 'Когда последний раз сменился этап'],
    ['LAST_REFRESH_RUN', 'Последнее полное обновление', 'Последнее успешное завершение всей цепочки'],
    ['LAST_WEEKLY_RUN', 'Последний SEO-отчёт', 'Последний пересчёт основного отчёта'],
    ['LAST_PRO_RUN', 'Последняя проверка PRO', 'Последнее обращение к PRO-выгрузке'],
    ['PRO_STATUS', 'Статус PRO', 'Состояние расширенной выгрузки Яндекс Вебмастера'],
    ['PRO_STATUS_MESSAGE', 'Что происходит с PRO', 'Подробное состояние PRO-выгрузки'],
    ['PRO_COVERAGE_STATUS', 'Охват PRO по сайту', 'Какая часть SEO-реестра уже пройдена в текущем цикле'],
    ['PRO_LAST_IMPORTED_DATE', 'Последняя дата PRO', 'Последняя успешно загруженная дата'],
    ['PRO_FREE_QUOTA_REMAINING', 'Остаток PRO-квоты', 'Сколько бесплатных URL-дней осталось'],
    ['PRO_FREE_QUOTA_DATE', 'Квота актуальна на дату', 'Дата, к которой относится остаток квоты'],
    ['PRO_QUERY_REPORT_STATUS', 'История запросов по страницам', 'Сводная выгрузка: URL, запрос, показы, клики, CTR'],
    ['AUTO_ENABLED', 'Автообновление', 'TRUE = включено, FALSE = выключено'],
    ['AUTO_SCHEDULE', 'Расписание', 'Когда автоматически запускается ежедневный SEO-сбор'],
    ['LAST_ERROR', 'Ошибка SEO', 'Последняя ошибка основного отчёта'],
    ['LAST_PRO_ERROR', 'Ошибка PRO', 'Последняя ошибка PRO-части']
  ];
}

function settingsAdvancedDefinitions_() {
  return [
    ['SETTINGS_LAYOUT_VERSION', 'Версия структуры настроек', 'Служебное поле'],
    ['PRO_ENABLED', 'PRO-выгрузка включена', 'Обычно TRUE'],
    ['DOMAIN', 'Домен', 'Домен сайта без протокола'],
    ['DEVICE', 'Устройство', 'ALL / DESKTOP / MOBILE_AND_TABLET'],
    ['SEARCH_LOCATION', 'Тип поиска', 'Обычно WEB_LOCATION'],
    ['MAX_ANALYTICS_ITEMS', 'Лимит строк аналитики', 'Максимум строк из API'],
    ['MIN_IMPRESSIONS_ALERT', 'Минимум показов для тревоги', 'Порог для сигналов динамики'],
    ['DROP_IMPRESSIONS_PCT', 'Порог падения показов, %', 'Порог для проблем'],
    ['DROP_POSITION', 'Порог падения позиции', 'В позициях'],
    ['USER_ID', 'Yandex Webmaster USER_ID', 'Служебное поле'],
    ['HOST_ID', 'Yandex Webmaster HOST_ID', 'Служебное поле'],
    ['PRO_PENDING_TASK_ID', 'Текущая PRO-задача', 'Служебное поле'],
    ['PRO_PENDING_DATE', 'Даты текущей PRO-задачи', 'Служебное поле'],
    ['PRO_PENDING_PATHS', 'URL текущей PRO-задачи', 'Служебное поле'],
    ['PRO_LAST_REQUESTED_DATE', 'Последняя запрошенная дата PRO', 'Служебное поле'],
    ['PRO_IMPORTED_DATES', 'Уже обработанные даты PRO', 'Служебное поле'],
    ['PRO_ROTATION_CURSOR', 'PRO: курсор обхода URL', 'Служебное поле'],
    ['PRO_ROTATION_CYCLE', 'PRO: номер цикла обхода', 'Служебное поле'],
    ['PRO_DAILY_BATCH_DATE', 'PRO: пакет уже запускался сегодня', 'Служебное поле'],
    ['PRO_PENDING_NEXT_CURSOR', 'PRO: следующий курсор', 'Служебное поле'],
    ['PRO_PENDING_BATCH_SIZE', 'PRO: размер текущего пакета', 'Служебное поле'],
    ['PRO_PENDING_TOTAL_URLS', 'PRO: всего URL в цикле', 'Служебное поле'],
    ['PRO_PENDING_CYCLE_COMPLETED', 'PRO: завершение цикла', 'Служебное поле'],
    ['PRO_QUOTA_BLOCKED_DATE', 'Дата блокировки PRO-квоты', 'Служебное поле']
  ];
}

function settingDefaultValue_(key) {
  const defaults = {
    RUN_STATUS: 'Готово к запуску',
    RUN_STAGE: 'Ожидание запуска',
    RUN_PROGRESS: '0%',
    AUTO_ENABLED: 'FALSE',
    AUTO_SCHEDULE: 'Ежедневно около 07:00 по Москве',
    SETTINGS_LAYOUT_VERSION: String(SEO_CFG.SETTINGS_LAYOUT_VERSION),
    PRO_ENABLED: 'TRUE',
    DOMAIN: 'naklikay.ru',
    DEVICE: 'ALL',
    SEARCH_LOCATION: 'WEB_LOCATION',
    MAX_ANALYTICS_ITEMS: '10000',
    PRO_ROTATION_CURSOR: '0',
    PRO_ROTATION_CYCLE: '1',
    MIN_IMPRESSIONS_ALERT: '20',
    DROP_IMPRESSIONS_PCT: '40',
    DROP_POSITION: '5'
  };
  return defaults.hasOwnProperty(key) ? defaults[key] : '';
}

function ensureSettingsLayout_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.SETTINGS);
  if (!sheet) return;

  if (settingsUsesDashboard_(sheet)) {
    const currentVersion = Number(getSetting_('SETTINGS_LAYOUT_VERSION')) || 0;
    if (currentVersion >= SEO_CFG.SETTINGS_LAYOUT_VERSION) return;
  }

  const existing = {};
  const lastRow = sheet.getLastRow();
  const wasDashboard = settingsUsesDashboard_(sheet);

  if (lastRow >= 2) {
    const width = wasDashboard ? Math.min(4, sheet.getMaxColumns()) : Math.min(3, sheet.getMaxColumns());
    const oldRows = sheet.getRange(2, 1, lastRow - 1, width).getDisplayValues();
    oldRows.forEach(row => {
      const key = String(row[0] || '').trim();
      if (!key) return;
      existing[key] = wasDashboard
        ? {
            value: String(row[2] || '').trim(),
            note: String(row[3] || '').trim()
          }
        : {
            value: String(row[1] || '').trim(),
            note: String(row[2] || '').trim()
          };
    });
  }

  const visibleDefs = settingsVisibleDefinitions_();
  const advancedDefs = settingsAdvancedDefinitions_();
  const known = new Set(visibleDefs.concat(advancedDefs).map(row => row[0]));

  const rows = [['Ключ', 'Показатель', 'Значение', 'Комментарий']];

  visibleDefs.forEach(def => {
    const old = existing[def[0]] || {};
    rows.push([
      def[0],
      def[1],
      old.value !== undefined && old.value !== '' ? old.value : settingDefaultValue_(def[0]),
      def[2]
    ]);
  });

  rows.push(['', 'Дополнительные настройки', 'Нажмите + слева, чтобы раскрыть', '']);
  const advancedStartRow = rows.length + 1;

  advancedDefs.forEach(def => {
    const old = existing[def[0]] || {};
    const value = def[0] === 'SETTINGS_LAYOUT_VERSION'
      ? String(SEO_CFG.SETTINGS_LAYOUT_VERSION)
      : (old.value !== undefined && old.value !== '' ? old.value : settingDefaultValue_(def[0]));
    rows.push([
      def[0],
      def[1],
      value,
      def[2]
    ]);
  });

  Object.keys(existing)
    .filter(key => !known.has(key))
    .sort()
    .forEach(key => {
      rows.push([key, 'Служебное: ' + key, existing[key].value || '', existing[key].note || 'Старое/служебное поле']);
    });

  ensureRows_(sheet, rows.length + 2);
  sheet.clear();
  sheet.showRows(1, sheet.getMaxRows());
  sheet.showColumns(1, Math.min(4, sheet.getMaxColumns()));
  sheet.getRange(1, 1, rows.length, 4).setValues(rows);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 170);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(3, 430);
  sheet.setColumnWidth(4, 320);
  sheet.hideColumns(1);

  sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  sheet.getRange(2, 2, visibleDefs.length, 1).setFontWeight('bold');
  const advancedHeaderRow = visibleDefs.length + 2;
  sheet.getRange(advancedHeaderRow, 2, 1, 3).setFontWeight('bold');
  sheet.getRange(1, 1, rows.length, 4).setVerticalAlignment('middle');
  sheet.getRange(1, 2, rows.length, 3).setWrap(true);

  const advancedCount = rows.length - advancedStartRow + 1;
  if (advancedCount > 0) {
    const advancedRange = sheet.getRange(advancedStartRow, 1, advancedCount, 4);
    advancedRange.shiftRowGroupDepth(1);
    const group = sheet.getRowGroup(advancedStartRow, 1);
    if (group) group.collapse();
  }
}

function setSettingsBatch_(pairs, flushNow) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.SETTINGS);
  if (!sheet) return;

  const isDashboard = settingsUsesDashboard_(sheet);
  const valueCol = isDashboard ? 3 : 2;
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const keys = lastRow >= 2
    ? sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().map(row => String(row[0] || '').trim())
    : [];

  Object.keys(pairs || {}).forEach(key => {
    const value = pairs[key];
    const index = keys.indexOf(key);
    if (index >= 0) {
      sheet.getRange(index + 2, valueCol).setValue(value);
    } else if (isDashboard) {
      sheet.appendRow([key, 'Служебное: ' + key, value, 'Служебное поле']);
      keys.push(key);
    } else {
      sheet.appendRow([key, value, '']);
      keys.push(key);
    }
  });

  if (flushNow) SpreadsheetApp.flush();
}

function startRun_(stage, progress) {
  const now = nowText_();
  setSettingsBatch_({
    RUN_STATUS: 'Выполняется',
    RUN_STAGE: stage || 'Запуск',
    RUN_PROGRESS: String(progress || 0) + '%',
    RUN_STARTED_AT: now,
    RUN_UPDATED_AT: now
  }, true);
}

function ensureRunStarted_(stage, progress) {
  const status = getSetting_('RUN_STATUS');
  if (status !== 'Выполняется' && status !== 'Ожидание PRO') {
    startRun_(stage, progress);
    return;
  }
  markRunStage_('Выполняется', stage, progress);
}

function markRunStage_(status, stage, progress) {
  setSettingsBatch_({
    RUN_STATUS: status || 'Выполняется',
    RUN_STAGE: stage || '',
    RUN_PROGRESS: String(progress == null ? '' : progress) + (progress == null ? '' : '%'),
    RUN_UPDATED_AT: nowText_()
  }, true);
}

function completeRun_(stage) {
  const now = nowText_();
  setSettingsBatch_({
    RUN_STATUS: 'Готово',
    RUN_STAGE: stage || 'Обновление завершено',
    RUN_PROGRESS: '100%',
    RUN_UPDATED_AT: now,
    LAST_REFRESH_RUN: now
  }, true);
}

function markRunError_(stage, error) {
  setSettingsBatch_({
    RUN_STATUS: 'Ошибка',
    RUN_STAGE: (stage || 'Ошибка') + ': ' + errorText_(error),
    RUN_UPDATED_AT: nowText_()
  }, true);
}

function getSetting_(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SEO_CFG.SHEETS.SETTINGS);
  if (!sheet || sheet.getLastRow() < 2) return '';

  const isDashboard = settingsUsesDashboard_(sheet);
  const width = isDashboard ? 3 : 2;
  const valueIndex = isDashboard ? 2 : 1;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getDisplayValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === key) {
      return String(values[i][valueIndex] || '').trim();
    }
  }

  return '';
}

function setSetting_(key, value) {
  setSettingsBatch_({ [key]: value }, false);
}

function settingIsTrue_(key, defaultValue) {
  const raw = getSetting_(key);
  if (!raw) return Boolean(defaultValue);
  return ['TRUE', '1', 'YES', 'ДА'].includes(String(raw).trim().toUpperCase());
}

function assertSheets_(ss) {
  const required = [
    SEO_CFG.SHEETS.PHRASES,
    SEO_CFG.SHEETS.SUMMARY,
    SEO_CFG.SHEETS.GROUPS,
    SEO_CFG.SHEETS.QUERIES,
    SEO_CFG.SHEETS.PAGES,
    SEO_CFG.SHEETS.PROBLEMS,
    SEO_CFG.SHEETS.WEEKLY_HISTORY,
    SEO_CFG.SHEETS.PRO_RAW,
    SEO_CFG.SHEETS.SETTINGS
  ];

  const missing = required.filter(name => !ss.getSheetByName(name));
  if (missing.length) {
    throw new Error('Не найдены листы: ' + missing.join(', '));
  }
}

function historyToMap_(records) {
  const map = {};
  (records || []).forEach(row => {
    const date = normalizeDateText_(row.date);
    if (date) map[date] = row.value;
  });
  return map;
}

function findNearestHistoryValue_(history, targetDate) {
  if (!Array.isArray(history) || !history.length) return null;

  let best = null;
  let bestDiff = Infinity;
  const target = parseIsoDate_(targetDate).getTime();

  history.forEach(row => {
    const date = normalizeDateText_(row.date);
    if (!date) return;

    const diff = Math.abs(parseIsoDate_(date).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = toNumberOrNull_(row.value);
    }
  });

  return best;
}

function sumIndicator_(indicators, key, period) {
  const rows = indicators && Array.isArray(indicators[key])
    ? indicators[key]
    : [];

  return rows.reduce((sum, row) => {
    const date = normalizeDateText_(row.date);
    if (!date || date < period.start || date > period.end) return sum;
    return sum + (Number(row.value) || 0);
  }, 0);
}

function countPresentDiagnostics_(diagnostics) {
  const counts = {
    FATAL: 0,
    CRITICAL: 0,
    POSSIBLE_PROBLEM: 0,
    RECOMMENDATION: 0
  };

  const problems = diagnostics && diagnostics.problems
    ? diagnostics.problems
    : {};

  Object.keys(problems).forEach(code => {
    const p = problems[code];
    if (!p || String(p.state) !== 'PRESENT') return;

    const sev = String(p.severity || '');
    if (counts.hasOwnProperty(sev)) counts[sev]++;
  });

  return counts;
}

function severityToPriority_(severity) {
  const value = String(severity || '');
  if (value === 'FATAL') return 'Критично';
  if (value === 'CRITICAL') return 'Важно';
  if (value === 'POSSIBLE_PROBLEM') return 'Проверить';
  return 'Рекомендация';
}

function diagnosticText_(code) {
  const map = {
    DISALLOWED_IN_ROBOTS: 'Сайт закрыт от индексирования в robots.txt',
    DNS_ERROR: 'Ошибка DNS при обходе сайта',
    MAIN_PAGE_ERROR: 'Главная страница возвращает ошибку',
    THREATS: 'Яндекс обнаружил угрозы или проблемы безопасности',
    SLOW_AVG_RESPONSE_TIME: 'Сервер отвечает слишком медленно',
    SSL_CERTIFICATE_ERROR: 'Проблема с SSL-сертификатом',
    DOCUMENTS_MISSING_DESCRIPTION: 'У многих страниц отсутствует Description',
    DOCUMENTS_MISSING_TITLE: 'У многих страниц отсутствует Title',
    ERROR_IN_ROBOTS_TXT: 'В robots.txt обнаружены ошибки',
    ERRORS_IN_SITEMAPS: 'В Sitemap обнаружены ошибки',
    MAIN_MIRROR_IS_NOT_HTTPS: 'Главное зеркало не использует HTTPS',
    MAIN_PAGE_REDIRECTS: 'Главная страница перенаправляет на другой сайт',
    NO_ROBOTS_TXT: 'robots.txt не найден',
    NO_SITEMAPS: 'Sitemap не найден',
    NO_SITEMAP_MODIFICATIONS: 'Sitemap давно не обновлялся',
    SOFT_404: 'Некорректно настроены ответы для несуществующих страниц',
    TOO_MANY_PAGE_DUPLICATES: 'Яндекс видит слишком много дублей страниц',
    NOT_MOBILE_FRIENDLY: 'Сайт не оптимизирован для мобильных устройств',
    NO_METRIKA_COUNTER: 'Проблема со счётчиком Яндекс Метрики',
    NO_REGIONS: 'Для сайта не задан регион'
  };

  return map[code] || ('Проблема Яндекс Вебмастера: ' + code);
}

function diagnosticRecommendation_(code) {
  if (code === 'ERROR_IN_ROBOTS_TXT' || code === 'DISALLOWED_IN_ROBOTS') {
    return 'Проверить robots.txt и правила Allow/Disallow для целевых страниц.';
  }

  if (code === 'ERRORS_IN_SITEMAPS' || code === 'NO_SITEMAPS') {
    return 'Проверить Sitemap в Вебмастере, доступность файла и список URL.';
  }

  if (code === 'SSL_CERTIFICATE_ERROR') {
    return 'Проверить сертификат, цепочку сертификатов и HTTPS на основном зеркале.';
  }

  if (code === 'TOO_MANY_PAGE_DUPLICATES') {
    return 'Проверить canonical, параметры URL, дубли и внутренние ссылки.';
  }

  if (code === 'MAIN_PAGE_ERROR' || code === 'DNS_ERROR') {
    return 'Проверить доступность сайта для робота Яндекса и ответы сервера.';
  }

  return 'Открыть соответствующую диагностику в Яндекс Вебмастере и устранить причину, если проблема актуальна.';
}

function excludedStatusRecommendation_(status) {
  const map = {
    NOTHING_FOUND: 'Проверить доступность страницы. Если она должна индексироваться, отправить на переобход.',
    HOST_ERROR: 'Проверить сервер, DNS и доступность сайта для робота Яндекса.',
    REDIRECT_NOTSEARCHABLE: 'Проверить, должен ли индексироваться исходный URL или только цель редиректа.',
    HTTP_ERROR: 'Проверить HTTP-код страницы и устранить ошибку.',
    NOT_CANONICAL: 'Проверить canonical. Если он указан неверно, исправить.',
    NOT_MAIN_MIRROR: 'Проверить главное зеркало и внутренние ссылки.',
    PARSER_ERROR: 'Проверить HTML страницы и ответ сервера.',
    ROBOTS_HOST_ERROR: 'Проверить robots.txt и доступность страницы для индексации.'
  };

  return map[status] ||
    'Проверить причину исключения в Яндекс Вебмастере и состояние страницы. Не восстанавливать URL автоматически без проверки.';
}

function detectDelimiter_(line) {
  const candidates = ['\t', ';', ','];
  let best = ',';
  let bestCount = -1;

  candidates.forEach(delimiter => {
    const count = String(line || '').split(delimiter).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  });

  return best;
}

function normalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, '');
}

function headerIndexMap_(headers) {
  const map = {};
  headers.forEach((h, i) => {
    map[h] = i;
  });
  return map;
}

function findHeader_(index, variants) {
  for (let i = 0; i < variants.length; i++) {
    const key = normalizeHeader_(variants[i]);
    if (index.hasOwnProperty(key)) return index[key];
  }
  return -1;
}

function parseLocaleNumber_(value) {
  const text = String(value == null ? '' : value)
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.');

  if (!text) return NaN;

  const num = Number(text);
  return Number.isFinite(num) ? num : NaN;
}

function canonicalPath_(url) {
  let value = String(url || '').trim();
  if (!value) return '';

  try {
    if (/^https?:\/\//i.test(value)) {
      value = value.replace(/^https?:\/\/[^/]+/i, '');
    }
  } catch (ignore) {}

  value = value.split('#')[0].split('?')[0];
  if (!value.startsWith('/')) value = '/' + value;

  value = value.replace(/\/+/g, '/');
  value = value.replace(/\/+$/, '');

  const path = value || '/';
  return (SEO_CFG.URL_ALIASES && SEO_CFG.URL_ALIASES[path]) || path;
}

function extractDomain_(value) {
  let text = String(value || '').trim().toLowerCase();
  text = text.replace(/^https?:\/\//, '');
  text = text.split('/')[0];
  text = text.split(':')[0];
  text = text.replace(/^www\./, '');
  return text;
}

function normalizePhrase_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeDateText_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, SEO_CFG.TIMEZONE, 'yyyy-MM-dd');
  }

  const text = String(value || '').trim();
  if (!text) return '';

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

  const ru = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (ru) return ru[3] + '-' + ru[2] + '-' + ru[1];

  return '';
}

function parseIsoDate_(value) {
  const parts = String(value).split('-').map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

function isoDate_(date) {
  return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
}

function addDays_(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + Number(days));
  return copy;
}

function dateRange_(from, to) {
  const result = [];
  let d = parseIsoDate_(from);
  const end = parseIsoDate_(to);

  while (d.getTime() <= end.getTime()) {
    result.push(isoDate_(d));
    d = addDays_(d, 1);
  }

  return result;
}

function positionDelta_(current, previous) {
  if (current == null || previous == null) return null;
  return round2_(previous - current);
}

function percentDelta_(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p <= 0) return null;
  return round2_(((c - p) / p) * 100);
}

function numericDelta_(current, previous) {
  if (current == null || previous == null || current === '' || previous === '') {
    return '';
  }
  return Number(current) - Number(previous);
}

function toNumberOrNull_(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function numericOrBlank_(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '';
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : '';
}

function numberOrFallback_(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : Number(fallback || 0);
}

function blankIfNull_(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '';
  }

  return Number.isFinite(Number(value)) ? Number(value) : '';
}

function blankIfNaN_(value) {
  return Number.isFinite(Number(value)) ? Number(value) : '';
}

function valueText_(value) {
  return value == null || !Number.isFinite(Number(value))
    ? 'нет'
    : String(round2_(Number(value)));
}

function emptyStats_() {
  return {
    hasData: false,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    position: null,
    demand: 0
  };
}

function proKey_(date, url, query, region) {
  return [
    normalizeDateText_(date),
    canonicalPath_(url),
    normalizePhrase_(query),
    String(region || '').trim().toLowerCase()
  ].join('\u0001');
}

function groupSortValue_(group) {
  const n = Number(group);
  if (Number.isFinite(n)) return n;
  return 99;
}

function ensureRows_(sheet, neededRows) {
  const current = sheet.getMaxRows();
  if (neededRows <= current) return;
  sheet.insertRowsAfter(current, neededRows - current);
}

function unique_(values) {
  return Array.from(new Set(values));
}

function round2_(value) {
  return Math.round(Number(value) * 100) / 100;
}

function clamp_(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function pad2_(value) {
  return String(value).padStart(2, '0');
}

function nowText_() {
  return Utilities.formatDate(new Date(), SEO_CFG.TIMEZONE, 'dd.MM.yyyy HH:mm:ss');
}

function getWeekDayEnum_(value) {
  const key = String(value || 'MONDAY').trim().toUpperCase();
  const map = {
    MONDAY: ScriptApp.WeekDay.MONDAY,
    TUESDAY: ScriptApp.WeekDay.TUESDAY,
    WEDNESDAY: ScriptApp.WeekDay.WEDNESDAY,
    THURSDAY: ScriptApp.WeekDay.THURSDAY,
    FRIDAY: ScriptApp.WeekDay.FRIDAY,
    SATURDAY: ScriptApp.WeekDay.SATURDAY,
    SUNDAY: ScriptApp.WeekDay.SUNDAY
  };
  return map[key] || ScriptApp.WeekDay.MONDAY;
}

function errorText_(e) {
  return String(e && e.message ? e.message : e);
}

function parseApiError_(code, text) {
  try {
    const data = JSON.parse(text || '{}');
    return 'HTTP ' + code + ': ' +
      (data.error_message || data.message || data.error_code || data.code || text);
  } catch (e) {
    return 'HTTP ' + code + ': ' + String(text || 'Неизвестная ошибка');
  }
}

function testYandexApi() {
  const token = getToken_();
  const access = resolveAccess_(token);

  apiGet_(token, hostPath_(access));
  console.log('Базовое подключение к Яндексу работает');

  const result = apiPost_(
    token,
    hostPath_(access) + '/query-analytics/list',
    {
      offset: 0,
      limit: 1,
      device_type_indicator: getSetting_('DEVICE') || 'ALL',
      search_location: getSetting_('SEARCH_LOCATION') || 'WEB_LOCATION',
      text_indicator: 'QUERY'
    }
  );

  console.log('SEO-аналитика работает. Запросов: ' + result.count);
}

function testYandexPRO() {
  const token = PropertiesService.getScriptProperties()
    .getProperty('YANDEX_WEBMASTER_OAUTH');

  if (!token) {
    Logger.log('Ошибка: OAuth-токен не найден');
    return;
  }

  const url = 'https://api.webmaster.yandex.net/v4/user/118463186/hosts/https:naklikay.ru:443/pro/serp/dates';

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: 'OAuth ' + token,
        Accept: 'application/json'
      },
      muteHttpExceptions: true
    });

    Logger.log('HTTP: ' + response.getResponseCode());
    Logger.log('Ответ: ' + response.getContentText());

  } catch (e) {
    Logger.log('Ошибка соединения: ' + e.message);
  }
}
