$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$blogPath = Join-Path $root "blog/index.html"
$sitemapPath = Join-Path $root "sitemap.xml"
$robotsPath = Join-Path $root "robots.txt"

# Каждая статья блога описывается одной записью. Новая статья - новая запись.
$articles = @(
  @{
    Slug  = "kontekstnaya-reklama-novostroek"
    Title = "Контекстная реклама новостроек: как получать заявки из Яндекс Директа"
    Desc  = "Как настроить контекстную рекламу новостроек и жилых комплексов: Поиск, РСЯ, структура кампаний, посадочные страницы, аналитика, работа с лидами и реальные примеры из недвижимости."
    Images = @("kontekstnaya-reklama-novostroek-1", "kontekstnaya-reklama-novostroek-2", "kontekstnaya-reklama-novostroek-3")
    Alts  = @(
      "Разделение рекламных кампаний по жилым комплексам",
      "Путь лида от клика до сделки в рекламе новостроек",
      "Система рекламы новостройки от Директа до сделки"
    )
  },
  @{
    Slug  = "kak-sgenerirovat-utm-metki-dlya-yandex-direkta"
    Title = "Как сгенерировать UTM-метки для Яндекс Директа: шаблон и динамические параметры"
    Desc  = "Как создать UTM-метки для Яндекс Директа, какие параметры использовать и что передавать динамически. Готовый шаблон для Поиска и РСЯ с расшифровкой меток."
    Images = @("utm-yandex-direct-1", "utm-yandex-direct-2", "utm-yandex-direct-3")
    Alts  = @(
      "Состав UTM-метки для Яндекс Директа с параметрами источника, кампании, объявления и ключевой фразы",
      "Сравнение статических и динамических UTM-меток для Яндекс Директа",
      "Готовый шаблон UTM-меток с динамическими параметрами Яндекс Директа"
    )
  },
  @{
    Slug  = "kakoy-ctr-schitaetsya-horoshim-v-yandex-direkt"
    Title = "Какой CTR считается хорошим в Яндекс Директ: поиск, РСЯ и wCTR"
    Desc  = "Какой CTR считать хорошим в Яндекс Директе на поиске и в РСЯ, почему нельзя оценивать кликабельность без учета ставки и объема трафика и когда высокий CTR говорит о проблемах."
    Images = @("ctr-i-obem-trafika-sravnenie-pozitsiy", "chto-takoe-vzveshennyy-ctr-v-yandex-direkt", "otchet-po-ploshchadkam-rsya-proverka-trafika")
    Alts  = @(
      "Сравнение CTR на позициях с разным объемом трафика в Яндекс Директе",
      "Схема расчета взвешенного CTR в Яндекс Директе",
      "Отчет по площадкам РСЯ для проверки качества трафика"
    )
  },
  @{
    Slug  = "strategiya-v-yandex-direct"
    Title = "Какую стратегию выбрать в Яндекс Директ: конверсии, клики или ручные ставки"
    Desc  = "Разбираю, какую стратегию выбрать в Яндекс Директ: когда использовать максимум конверсий, максимум кликов и ручные ставки, сколько нужно конверсий для обучения алгоритмов и почему нельзя гарантировать первую позицию."
    Images = @("strategiya-yandex-direct-1", "strategiya-yandex-direct-2")
    Alts  = @(
      "Схема выбора стратегии в Яндекс Директе",
      "Как ставка влияет на участие в аукционе Яндекс Директа"
    )
  },
  @{
    Slug  = "cena-za-klik-v-yandex-direkte"
    Title = "Цена за клик в Яндекс Директе: что это и как управлять CPC"
    Desc  = "Что означает цена клика в Яндекс Директе, от чего зависит CPC, где менять ставки и почему самые дешевые переходы не всегда дают лучшие заявки."
    Images = @("cena-za-klik-v-yandex-direct-1", "cena-za-klik-v-yandex-direct-2", "cena-za-klik-v-yandex-direct-3")
    Alts  = @(
      "Расчет CPC: расход на рекламу делится на количество кликов",
      "Изменение ставки в разделе «Ставки и фразы» Яндекс Директа",
      "Сравнение кампаний с CPC 30 и 80 рублей: дорогой трафик дает больше заявок"
    )
  },
  @{
    Slug  = "kak-posmotret-obyavlenie-v-yandex-direct"
    Title = "Как посмотреть объявление в Яндекс Директ и увидеть его в поиске"
    Desc  = "Где посмотреть свое объявление в Яндекс Директе, как проверить баннер на реальной площадке и почему реклама может не отображаться у вас в поиске Яндекса, хотя показы идут."
    Images = @("kak-posmotret-obyavlenie-v-yandex-direct-1", "kak-posmotret-obyavlenie-v-yandex-direct-2", "kak-posmotret-obyavlenie-v-yandex-direct-3")
    Alts  = @(
      "Предпросмотр объявления в Яндекс Директе",
      "Функция Нацелиться на объявление в Яндекс Директе",
      "Почему свое объявление Яндекс Директ может не показываться в поиске"
    )
  },
  @{
    Slug  = "lending-v-yandex-direct"
    Title = "Что такое лендинг в Яндекс Директе: виды, примеры и где его создать"
    Desc  = "Объясняю, что такое лендинг в Яндекс Директе, зачем он нужен для рекламы, чем отличается от обычного сайта и где его лучше создавать: Tilda, WordPress, 1С-Битрикс, собственная разработка или конструкторы Яндекса."
    Images = @("lending-v-yandex-direct-1")
    Alts  = @("Схема работы лендинга в Яндекс Директе и варианты его создания")
  },
  @{
    Slug  = "oplata-za-konversii-yandex-direct"
    Title = "Оплата за конверсии в Яндекс Директ: как работает и кому подходит"
    Desc  = "Как работает оплата за конверсии в Яндекс Директе, почему нельзя просто назначить желаемую цену заявки и когда такая стратегия действительно дает результат."
    Images = @("1-nizkaya-cena-konversii", "2-perehod-na-oplatu-za-konversii", "3-nastroika-oplaty-za-konversii")
    Alts  = @(
      "Почему слишком низкая цена конверсии ограничивает показы в Яндекс Директе",
      "Переход от оплаты за клики к оплате за конверсии в Яндекс Директе",
      "Настройка оплаты за конверсии в рекламной кампании Яндекс Директа"
    )
  },
  @{
    Slug  = "kak-ostanovit-kampaniyu-v-yandex-direct"
    Title = "Как остановить кампанию в Яндекс Директе - пошаговая инструкция"
    Desc  = "Как быстро остановить рекламную кампанию в Яндекс Директе, что произойдет с показами и бюджетом, как поставить рекламу на паузу и чем остановка отличается от архивации и удаления."
    Images = @("kak-ostanovit-kampaniyu-v-yandex-direct-1", "kak-ostanovit-kampaniyu-v-yandex-direct-2")
    Alts  = @(
      "Как остановить кампанию в Яндекс Директе через меню действий",
      "Разница между остановкой архивированием и удалением кампании в Яндекс Директе"
    )
  },
  @{
    Slug  = "chto-takoe-fid-v-yandex-direct"
    Title = "Что такое фид в Яндекс Директ и для чего он нужен"
    Desc  = "Простыми словами о том, что такое фид в Яндекс Директе, какие данные в нем хранятся, как он используется для товарной рекламы и когда без него можно обойтись."
    Images = @("feed-yandex-direct-1", "feed-yandex-direct-2", "feed-yandex-direct-3")
    Alts  = @(
      "Схема работы фида в Яндекс Директе",
      "Пример полей товарного фида YML",
      "Раздел добавления фида в Яндекс Директе"
    )
  },
  @{
    Slug  = "vozvrat-deneg-yandex-direct"
    Title = "Яндекс Директ: можно ли вывести деньги и как вернуть остаток со счета"
    Desc  = "Можно ли вернуть деньги с Яндекс Директа после остановки рекламы или блокировки аккаунта. Пошаговая процедура возврата, документы, сроки и правила для физлиц, ИП и компаний."
    Images = @("1-vozvrat-sredstv-yandex-direct", "2-vozvrat-pri-blokirovke-yandex-direct", "3-kuda-vozvrashayutsya-dengi-yandex-direct")
    Alts  = @(
      "Форма возврата денежных средств из Яндекс Директа",
      "Как вернуть деньги из заблокированного аккаунта Яндекс Директа",
      "Куда возвращаются деньги с Яндекс Директа"
    )
  },
  @{
    Slug  = "chto-takoe-rsya-v-yandex-direct"
    Title = "Что такое РСЯ в Яндекс Директ и как она работает"
    Desc  = "РСЯ простыми словами: где показывается реклама, как Яндекс подбирает аудиторию, чем РСЯ отличается от поиска и когда этот формат подходит бизнесу."
    Images = @("chto-takoe-rsya-v-yandex-direct-1", "chto-takoe-rsya-v-yandex-direct-2", "chto-takoe-rsya-v-yandex-direct-3")
    Alts  = @(
      "Схема работы Рекламной сети Яндекса",
      "Сравнение рекламы в поиске Яндекса и в РСЯ",
      "Настройка показа РСЯ и комбинаторного объявления в Единой перфоманс-кампании"
    )
  },
  @{
    Slug  = "konversiya-v-yandex-direct"
    Title = "Конверсия в Яндекс Директ: что это, как считать CR и оценивать рекламу"
    Desc  = "Простое объяснение конверсии в Яндекс Директе: что считается конверсией, как рассчитывается CR, чем он отличается от CPA и как использовать эти показатели для оценки рекламы."
    Images = @("konversiya-yandex-direct-1", "konversiya-yandex-direct-2", "konversiya-yandex-direct-3")
    Alts  = @(
      "Расчет коэффициента конверсии: 10 заявок из 200 кликов дают CR 5 процентов",
      "Сравнение показателей CR и CPA в Яндекс Директе",
      "Как Яндекс Директ использует данные о конверсиях для оптимизации рекламной кампании"
    )
  },
  @{
    Slug  = "reklama-v-max-cherez-yandex-direct"
    Title = "Реклама в MAX через Яндекс Директ: способы запуска и отслеживания"
    Desc  = "Как запустить рекламу в MAX через Яндекс Директ: нативные посты в каналах, РСЯ через лендинг, передача запусков бота и подписок в Метрику."
    Images = @("01-reklama-max-cherez-yandex-direct", "02-nastroyka-reklamy-max-yandex-direct", "03-peredacha-zapuska-bota-max")
    Alts  = @(
      "Два способа рекламы MAX через Яндекс Директ",
      "Настройка рекламы в MAX через Яндекс Директ",
      "Передача запуска бота MAX в Яндекс Метрику"
    )
  },
  @{
    Slug  = "reklama-telegram-kanala-v-yandex-direkte"
    Title = "Реклама Telegram-канала в Яндекс Директе: как запустить и считать подписчиков"
    Desc  = "Как рекламировать Telegram-канал или бота через Яндекс Директ. Простые кампании без сайта и продвинутая схема с Метрикой, учетом подписок и оптимизацией по реальным конверсиям."
    Images = @("1-sposoba-reklamirovat-telegram-kanal-cherez-yandex-direct", "2-shema-sayt-prokladka-i-metrika", "3-otslezhivanie-zapuska-telegram-bota")
    Alts  = @(
      "Способы рекламы Telegram-канала через Яндекс Директ",
      "Схема отслеживания подписок Telegram в Яндекс Директе",
      "Отслеживание запуска Telegram-бота из Яндекс Директа"
    )
  },
  @{
    Slug  = "yandex-business-vs-yandex-direct"
    Title = "Чем отличается Яндекс Бизнес от Яндекс Директа и что выбрать"
    Desc  = "Разбираю разницу между Яндекс Бизнесом и Яндекс Директом. Когда локальному бизнесу важнее продвижение в Картах, а когда нужен полноценный рекламный кабинет."
    Images = @("1-yandex-business-vs-direct", "2-yandex-maps-local-business", "3-yandex-business-and-direct-together")
    Alts  = @(
      "Сравнение возможностей Яндекс Бизнеса и Яндекс Директа",
      "Возможности карточки локального бизнеса в Яндекс Картах",
      "Совместная работа Яндекс Бизнеса и Яндекс Директа"
    )
  },
  @{
    Slug  = "kombinatornye-obyavleniya-yandex-direct"
    Title = "Комбинаторные объявления в Яндекс Директе: что это и как настроить в 2026 году"
    Desc  = "Что такое комбинаторные объявления в Яндекс Директе, как они работают, сколько заголовков, текстов и креативов можно добавить, как настроить и оценивать результаты."
    Images = @("kominatornye-obyavleniya-yandex-direct-nastroyka", "kak-rabotayut-kombinatornye-obyavleniya", "master-otchetov-kombinatornye-obyavleniya")
    Alts  = @(
      "Настройка комбинаторного объявления в Яндекс Директе",
      "Как алгоритм Яндекс Директа комбинирует элементы объявления",
      "Отчет по комбинаторным объявлениям в Мастере отчетов Яндекс Директа"
    )
  },
  @{
    Slug  = "prognoz-byudzheta-yandex-direct"
    Title = "Прогноз бюджета Яндекс Директ: как рассчитать расходы, клики и заявки"
    Desc  = "Как сделать прогноз бюджета в Яндекс Директе, оценить стоимость кликов и перевести данные Яндекса в прогноз заявок, продаж, CPL, CPO и ДРР."
    Images = @("prognoz-byudzheta-yandex-direct", "raschet-byudzheta-yandex-direct")
    Alts  = @(
      "Настройка прогноза бюджета в Яндекс Директе",
      "Таблица расчета бюджета, заявок и продаж в Яндекс Директе"
    )
  },
  @{
    Slug  = "operatory-yandex-direct"
    Title = "Операторы Яндекс Директ: !, кавычки, скобки, плюс и минус-слова"
    Desc  = "Как работают операторы Яндекс Директ: восклицательный знак, кавычки, квадратные скобки, плюс, минус и другие символы."
    Images = @("shpargalka-po-operatoram-yandex-direct", "kavychki-i-kvadratnye-skobki-sravnenie")
    Alts  = @(
      "Шпаргалка по операторам Яндекс Директ",
      "Сравнение кавычек и квадратных скобок в операторах Яндекс Директ"
    )
  },
  @{
    Slug  = "kak-nastroit-yandex-direct"
    Title = "Как настроить рекламу в Яндекс Директ в 2026 году: инструкция"
    Desc  = "Как настроить рекламу в Яндекс Директ в 2026 году:"
    Images = @("01-smeshannyi-zapusk-yandex-direct", "02-kategorii-avtotargetinga-yandex-direct", "03-minus-frazy-poiskovye-zaprosy-yandex-direct", "04-kontrol-kampanii-yandex-direct")
    Alts  = @(
      "Схема показов Мастера кампаний в поиске, РСЯ и Яндекс Картах",
      "Пять категорий автотаргетинга в Яндекс Директе",
      "Добавление поискового запроса в минус-фразы Яндекс Директа",
      "Что проверять после запуска рекламы в Яндекс Директе"
    )
  },
  @{
    Slug  = "minus-frazy-yandex-direct"
    Title = "Минус-фразы для Яндекс Директа: как собрать список и правильно добавить"
    Desc  = "Как подобрать минус-фразы для Яндекс Директа через Вордстат, добавить их на уровне кампании или группы и регулярно очищать поисковые запросы после запуска рекламы."
    Images = @("minus-frazy-yandex-direct-1", "minus-frazy-yandex-direct-2", "minus-frazy-yandex-direct-3")
    Alts  = @(
      "Подбор минус-фраз через Яндекс Вордстат",
      "Массовое добавление минус-фраз в кампании Яндекс Директа",
      "Добавление минус-фраз из отчёта по поисковым запросам Яндекс Директа"
    )
  },
  @{
    Slug  = "kak-rabotaet-yandex-direct"
    Title = "Как работает Яндекс Директ: Поиск, РСЯ и заявки"
    Desc  = "Как работает Яндекс Директ простыми словами."
    Images = @("1.1", "1.2", "1.3")
    Alts  = @(
      "Как работает Яндекс Директ: реклама на Поиске и в РСЯ",
      "Как работает Яндекс Директ: путь пользователя от объявления до заявки",
      "Пример рекламы в РСЯ в Яндекс Директе"
    )
  },
  @{
    Slug  = "cpa-v-yandex-direct"
    Title = "CPA в Яндекс Директе: что это и как считать"
    Desc  = "CPA в Яндекс Директе - стоимость целевого действия."
    Images = @("2.1", "2.2", "2.3")
    Alts  = @(
      "Путь от объявления до заявки: чем выше конверсия сайта, тем ниже CPA",
      "Формула CPA: расходы на рекламу делятся на количество конверсий",
      "Фактический CPA, целевой CPA и оплата за конверсии в Яндекс Директе"
    )
  },
  @{
    Slug  = "upravlyayushchiy-akkaunt-yandex-direct"
    Title = "Как добавить управляющий аккаунт в Яндекс Директ: инструкция"
    Desc  = "Пошагово показываю, как добавить управляющий аккаунт в Яндекс Директе"
    Images = @("3.1")
    Alts  = @(
      "Как добавить управляющий аккаунт в Яндекс Директ - раздел Ваши представители и кнопка Добавить управляющий аккаунт"
    )
  },
  @{
    Slug  = "predstavitel-v-yandex-direct"
    Title = "Как добавить представителя в Яндекс Директ: пошаговая инструкция"
    Desc  = "какие права выдать подрядчику и почему Яндекс иногда не принимает пользователя."
    Images = @("4.1")
    Alts  = @(
      "Как добавить представителя в Яндекс Директ - путь через Инструменты и кнопка Добавить представителя"
    )
  },
  @{
    Slug  = "tseli-yandex-metriki-tilda"
    Title = "Цели Яндекс Метрики на Tilda: отправка форм и квиз"
    Desc  = "одна цель на отправку всех форм по регулярному выражению, отслеживание шагов квиза QZ101"
    Images = @("5.1", "5.2")
    Alts  = @(
      "Настройка цели отправки всех форм Tilda в Яндекс Метрике",
      "Настройка целей квиза Tilda QZ101 в Яндекс Метрике"
    )
  },
  @{
    Slug  = "kak-proverit-tsel-v-yandex-metrike"
    Title = "Как проверить цель в Яндекс Метрике: отладчик _ym_debug=2"
    Desc  = "параметр _ym_debug=2, встроенная панель отладки, вкладки Events и Console"
    Images = @("6.1", "6.2")
    Alts  = @(
      "Проверка цели Яндекс Метрики через _ym_debug=2",
      "Расширение Yandex Metrica Debugger для проверки целей Яндекс Метрики"
    )
  },
  @{
    Slug  = "kak-dat-dostup-k-yandex-metrike"
    Title = "Как дать доступ к Яндекс Метрике: пошаговая инструкция"
    Desc  = "«Настройки» - «Доступ» - «Добавить пользователя», какие права выбрать"
    Images = @("7.1", "7.2")
    Alts  = @(
      "Раздел «Настройки» и пункт «Доступ» в Яндекс Метрике",
      "Добавление пользователя с правами «Редактирование» в Яндекс Метрике"
    )
  },
  @{
    Slug  = "chastnyj-specialist-yandex-direct"
    Title = "Частный специалист по Яндекс Директ - настройка и ведение рекламы"
    Desc  = "Частный специалист по Яндекс Директ: настройка, ведение, аналитика и оптимизация рекламы. Работаю лично, по договору как ИП. Кейсы и условия сотрудничества."
    Images = @("chastnyj-specialist-yandex-direct-1", "chastnyj-specialist-yandex-direct-2", "chastnyj-specialist-yandex-direct-3")
    CardImage = "chastnyj-specialist-yandex-direct-1"
    Alts  = @(
      "Частный специалист по Яндекс Директ работает с рекламными кампаниями",
      "Проверка опыта, кейсов и аналитики при выборе специалиста по Яндекс Директ",
      "Этапы работы с рекламой от разбора бизнеса до отчета и новых гипотез"
    )
  }
  ,@{
    Slug  = "specialist-po-yandex-direct"
    Title = "Специалист по Яндекс Директ: настройка и ведение рекламы для бизнеса"
    Desc  = "Что делает специалист по Яндекс Директ, какие задачи берет на себя, как оценить опыт и выбрать подрядчика для настройки и ведения рекламы."
    Images = @("specialist-po-yandex-direct-1", "specialist-po-yandex-direct-2", "specialist-po-yandex-direct-3")
    CardImage = "specialist-po-yandex-direct"
    Alts  = @(
      "Специалист анализирует рекламные кампании в Яндекс Директ",
      "Этапы работы специалиста по Яндекс Директ",
      "Чек-лист выбора специалиста по Яндекс Директ"
    )
  }
  ,@{
    Slug  = "reklama-proizvodstvennoy-kompanii"
    Title = "Реклама производственной компании: как привлекать B2B-клиентов"
    Desc  = "Как настроить рекламу производственной компании: Яндекс Директ, поиск и РСЯ, посадочные страницы, аналитика и реальные примеры из производственных проектов."
    Images = @("reklama-proizvodstvennoy-kompanii-1", "reklama-proizvodstvennoy-kompanii-2")
    CardImage = "reklama-proizvodstvennoy-kompanii"
    Alts  = @(
      "Реклама производственной компании и привлечение B2B-клиентов",
      "Особенности продвижения производственной компании"
    )
  }
  ,@{
    Slug  = "kontekstnaya-reklama-agentstva-nedvizhimosti"
    Title = "Контекстная реклама агентства недвижимости: как получать заявки из Яндекс Директа"
    Desc  = "Как настроить контекстную рекламу агентства недвижимости: структура кампаний, Поиск и РСЯ, посадочные страницы, аналитика и реальные кейсы из Яндекс Директа."
    Images = @("kontekstnaya-reklama-agentstva-nedvizhimosti-1", "kontekstnaya-reklama-agentstva-nedvizhimosti-2", "kontekstnaya-reklama-agentstva-nedvizhimosti-3")
    CardImage = "kontekstnaya-reklama-agentstva-nedvizhimosti"
    Alts  = @(
      "Направления контекстной рекламы для агентства недвижимости",
      "Путь лида от клика до сделки в рекламе недвижимости",
      "Сценарии и экономика рекламы недвижимости"
    )
  }
  ,@{
    Slug  = "kontekstnaya-reklama-dlya-nedvizhimosti"
    Title = "Контекстная реклама для недвижимости: настройка Яндекс Директа и заявки"
    Desc  = "Как настроить контекстную рекламу для недвижимости в Яндекс Директе: Поиск, РСЯ, сегментация, посадочные страницы, аналитика и реальные кейсы."
    Images = @("kontekstnaya-reklama-dlya-nedvizhimosti-1", "kontekstnaya-reklama-dlya-nedvizhimosti-2", "kontekstnaya-reklama-dlya-nedvizhimosti-3")
    CardImage = "kontekstnaya-reklama-dlya-nedvizhimosti"
    Alts  = @(
      "Поиск и РСЯ в контекстной рекламе недвижимости",
      "Воронка контекстной рекламы недвижимости от клика до сделки",
      "Результаты контекстной рекламы недвижимости в двух проектах"
    )
  }
  ,@{
    Slug  = "kontekstnaya-reklama-kommercheskoy-nedvizhimosti"
    Title = "Контекстная реклама коммерческой недвижимости: как получать заявки из Яндекс Директа"
    Desc  = "Как настроить Яндекс Директ для продажи и аренды коммерческой недвижимости: сегментация спроса, Поиск, РСЯ, посадочные страницы, аналитика и реальные кейсы."
    Images = @("kontekstnaya-reklama-kommercheskoy-nedvizhimosti-1", "kontekstnaya-reklama-kommercheskoy-nedvizhimosti-2", "kontekstnaya-reklama-kommercheskoy-nedvizhimosti-3")
    CardImage = "kontekstnaya-reklama-kommercheskoy-nedvizhimosti"
    Alts  = @(
      "Сегментация рекламы коммерческой недвижимости по типам объектов",
      "Снижение стоимости лида в рекламе коммерческой недвижимости с 6000 до 1700 рублей",
      "Воронка аналитики контекстной рекламы коммерческой недвижимости"
    )
  }
)

foreach ($path in @($blogPath, $sitemapPath, $robotsPath)) {
  if (-not (Test-Path $path)) {
    throw "Missing file: $path"
  }
}

$blog = Get-Content -Raw -Encoding UTF8 -LiteralPath $blogPath
$sitemap = Get-Content -Raw -Encoding UTF8 -LiteralPath $sitemapPath
$robots = Get-Content -Raw -Encoding UTF8 -LiteralPath $robotsPath
$archiveContent = $blog
$archivePageRoot = Join-Path $root "blog/page"
if (Test-Path $archivePageRoot) {
  Get-ChildItem -LiteralPath $archivePageRoot -Directory | ForEach-Object {
    $archivePath = Join-Path $_.FullName "index.html"
    if (Test-Path $archivePath) {
      $archiveContent += Get-Content -Raw -Encoding UTF8 -LiteralPath $archivePath
    }
  }
}

function Assert-Contains($content, $needle, $message) {
  if (-not $content.Contains($needle)) {
    throw $message
  }
}

function Assert-SingleH1($content, $label) {
  $count = ([regex]::Matches($content, "<h1[\s>]")).Count
  if ($count -ne 1) {
    throw "Expected exactly one H1 on $label, found $count"
  }
}

function Assert-NoDuplicateMetrika($content, $label) {
  # Метрика подключается только через общий script.js, второго счётчика быть не должно.
  # Ищем именно загрузку счётчика (mc.yandex.ru/metrika/...), а не упоминание домена в тексте.
  if ($content -match "mc\.yandex\.ru/metrika") {
    throw "Yandex Metrika must not be duplicated on $label"
  }
  $scripts = ([regex]::Matches($content, 'src="[^"]*script\.js')).Count
  if ($scripts -ne 1) {
    throw "Expected exactly one script.js include on $label, found $scripts"
  }
}

# --- Страница блога ---

Assert-SingleH1 $blog "blog index"
Assert-NoDuplicateMetrika $blog "blog index"
Assert-Contains $blog '<link rel="canonical" href="https://naklikay.ru/blog/" />' "Blog index canonical is wrong or missing"
Assert-Contains $sitemap "<loc>https://naklikay.ru/blog/</loc>" "Sitemap is missing the blog index"

if ($blog -match "noindex") {
  throw "Blog index must stay indexable"
}

if ($robots -match "Disallow:\s*/blog") {
  throw "robots.txt must not block /blog/"
}

# Строка Sitemap в robots.txt необязательна: карта сайта и так отправляется
# в Вебмастер. Проверяем только, что она не ведёт на чужой адрес.
if ($robots -match "(?m)^\s*Sitemap:\s*(\S+)" -and $Matches[1] -ne "https://naklikay.ru/sitemap.xml") {
  throw "robots.txt points to a foreign sitemap: $($Matches[1])"
}

# Внутренняя ссылка на блог, по которой его найдёт поисковый робот.
$index = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "index.html")
Assert-Contains $index '<a href="/blog/">Блог</a>' "Home page footer must link to the blog"

# --- Статьи ---

foreach ($article in $articles) {
  $slug = $article.Slug
  $url = "https://naklikay.ru/blog/$slug/"
  $articlePath = Join-Path $root "blog/$slug/index.html"

  if (-not (Test-Path $articlePath)) {
    throw "Missing article: $articlePath"
  }

  # Все иллюстрации статьи хранятся в исходном JPG. WebP нужен для обложки
  # карточки, а в старых статьях может быть подготовлен для каждой иллюстрации.
  foreach ($name in $article.Images) {
    if (-not (Test-Path (Join-Path $root "blog/$name.jpg"))) {
      throw "Missing blog image: $name.jpg"
    }
    if (-not $article.CardImage -and -not (Test-Path (Join-Path $root "blog/$name.webp"))) {
      throw "Missing blog image: $name.webp"
    }
  }
  if ($article.CardImage -and -not (Test-Path (Join-Path $root "blog/$($article.CardImage).webp"))) {
    throw "Missing blog card image: $($article.CardImage).webp"
  }

  $html = Get-Content -Raw -Encoding UTF8 -LiteralPath $articlePath

  Assert-SingleH1 $html $slug
  Assert-NoDuplicateMetrika $html $slug
  Assert-Contains $html "<link rel=`"canonical`" href=`"$url`" />" "Canonical is wrong or missing on $slug"
  Assert-Contains $html "<title>$($article.Title)</title>" "SEO title changed on $slug"
  Assert-Contains $html $article.Desc "Meta description changed on $slug"

  if ($html -match "noindex") {
    throw "Article $slug must stay indexable"
  }

  # Alt-тексты заданы заказчиком, менять их нельзя без согласования.
  foreach ($alt in $article.Alts) {
    Assert-Contains $html "alt=`"$alt`"" "alt text changed on $slug`: $alt"
  }

  # Fallback всегда исходный JPG, иначе в старых браузерах картинки пропадут.
  foreach ($name in $article.Images) {
    Assert-Contains $html "src=`"../$name.jpg`"" "Article $slug must use the original JPG as fallback for $name.jpg"
  }

  # У картинок должны быть width/height, иначе текст прыгает при загрузке.
  foreach ($tag in [regex]::Matches($html, "<img[\s\S]*?>")) {
    if ($tag.Value -notmatch 'width="\d+"' -or $tag.Value -notmatch 'height="\d+"') {
      throw "Every article image needs width and height on $slug`: $($tag.Value)"
    }
  }

  Assert-Contains $sitemap "<loc>$url</loc>" "Sitemap is missing $slug"
  if ($archiveContent -notmatch "href=`"(?:\.\./\.\./)?$([regex]::Escape($slug))/`"") {
    throw "Blog archive must link to $slug"
  }

  # JSON-LD должен разбираться как валидный JSON.
  $ldMatch = [regex]::Match($html, '<script type="application/ld\+json">([\s\S]*?)</script>')
  if (-not $ldMatch.Success) {
    throw "Article $slug is missing JSON-LD"
  }

  $ld = $ldMatch.Groups[1].Value | ConvertFrom-Json
  $types = $ld.'@graph' | ForEach-Object { $_.'@type' }
  foreach ($expected in @("BlogPosting", "BreadcrumbList")) {
    if ($types -notcontains $expected) {
      throw "JSON-LD on $slug is missing $expected"
    }
  }

  $posting = $ld.'@graph' | Where-Object { $_.'@type' -eq "BlogPosting" }
  if ($posting.url -ne $url) {
    throw "JSON-LD url does not match the canonical on $slug"
  }
  if ($posting.author.name -ne "Максим Мирошников") {
    throw "JSON-LD author changed on $slug"
  }

  if ($slug -eq "prognoz-byudzheta-yandex-direct") {
    $downloadPath = Join-Path $root "blog/$slug/raschet-byudzheta-yandex-direct.xlsx"
    if (-not (Test-Path $downloadPath)) {
      throw "Budget forecast article is missing the Excel download file"
    }
    Assert-Contains $html 'href="raschet-byudzheta-yandex-direct.xlsx" download' "Budget forecast article is missing the Excel download link"
  }
}

# --- SEO-пагинация архива ---

$generatorPath = Join-Path $root "scripts/generate-blog-archive.js"
if (-not (Test-Path $generatorPath)) {
  throw "Missing blog archive generator"
}

$generator = Get-Content -Raw -Encoding UTF8 -LiteralPath $generatorPath
Assert-Contains $generator 'const pageSize = 15;' "Blog page size must stay 15"
Assert-Contains $generator 'blog/page/${page}/' "Archive generator must create clean paginated URLs"
Assert-Contains $generator 'rel="canonical"' "Archive generator must emit self-canonicals"

$siteScript = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "script.js")
if ($siteScript -match 'history\.replaceState\(null, "", `/blog/page/' -or $siteScript -match 'observeNextPage') {
  throw "Blog pagination must remain direct HTML navigation without automatic page loading"
}

Assert-Contains $siteScript 'function openBlogLinksInNewTab()' "Shared script must open blog links in new tabs"
Assert-Contains $siteScript 'document.querySelectorAll("a[href]")' "Shared script must cover every blog link"
Assert-Contains $siteScript 'link.target = "_blank"' "Shared script must set the new-tab target for blog links"
Assert-Contains $siteScript 'new MutationObserver' "Shared script must cover links added after page load"

$allArticleSlugs = Get-ChildItem -LiteralPath $root/blog -Directory |
  Where-Object { $_.Name -ne "page" } |
  Where-Object { Test-Path (Join-Path $_.FullName "index.html") } |
  Select-Object -ExpandProperty Name

foreach ($slug in $allArticleSlugs) {
  Assert-Contains $sitemap "<loc>https://naklikay.ru/blog/$slug/</loc>" "Sitemap is missing article $slug"
}

$archivePageCount = [math]::Ceiling($allArticleSlugs.Count / 15.0)
for ($page = 1; $page -le $archivePageCount; $page++) {
  $archivePath = if ($page -eq 1) { $blogPath } else { Join-Path $root "blog/page/$page/index.html" }
  if (-not (Test-Path $archivePath)) {
    throw "Missing archive page $page"
  }

  $archive = Get-Content -Raw -Encoding UTF8 -LiteralPath $archivePath
  $expectedCanonical = if ($page -eq 1) { "https://naklikay.ru/blog/" } else { "https://naklikay.ru/blog/page/$page/" }
  $expectedAssetPrefix = if ($page -eq 1) { "../" } else { "../../../" }
  $expectedStylesheet = 'href="' + $expectedAssetPrefix + 'styles.css'
  $expectedScript = 'src="' + $expectedAssetPrefix + 'script.js'
  Assert-Contains $archive "<link rel=`"canonical`" href=`"$expectedCanonical`" />" "Archive page $page needs a self-canonical"
  Assert-Contains $archive $expectedStylesheet "Archive page $page must load the shared stylesheet"
  Assert-Contains $archive $expectedScript "Archive page $page must load the shared script"
  Assert-Contains $archive '<h1>Блог</h1>' "Archive page $page must keep the single blog heading"
  if ($archive -match 'Блог - страница|Страница \d+</span>') {
    throw "Archive page $page must not expose its technical page number outside the pagination control"
  }
  if ($archive -match "noindex") {
    throw "Archive page $page must stay indexable"
  }

  $cards = ([regex]::Matches($archive, '<article class="blog-card">')).Count
  if ($cards -lt 1 -or $cards -gt 15) {
    throw "Archive page $page must contain 1 to 15 cards, found $cards"
  }
  if ($cards -ne ([regex]::Matches($archive, '<h2 class="blog-card__title">\s*<a href="')).Count) {
    throw "Archive page $page has a card without a crawlable article link"
  }
}

if ($archivePageCount -gt 1) {
  Assert-Contains $blog 'class="blog-pagination"' "Blog index needs HTML pagination links"
  Assert-Contains $blog 'href="/blog/page/2/"' "Blog index must link to page 2"
  Assert-Contains $sitemap "<loc>https://naklikay.ru/blog/page/2/</loc>" "Sitemap is missing page 2"
} elseif (Test-Path (Join-Path $root "blog/page/2/index.html")) {
  throw "Page 2 must not exist while the archive has 15 or fewer articles"
}

Write-Output "blog checks passed"
