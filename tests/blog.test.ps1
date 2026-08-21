$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$blogPath = Join-Path $root "blog/index.html"
$sitemapPath = Join-Path $root "sitemap.xml"
$robotsPath = Join-Path $root "robots.txt"

# Каждая статья блога описывается одной записью. Новая статья - новая запись.
$articles = @(
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

  # У каждой картинки должны быть и исходный JPG, и WebP.
  foreach ($name in $article.Images) {
    foreach ($ext in @("jpg", "webp")) {
      if (-not (Test-Path (Join-Path $root "blog/$name.$ext"))) {
        throw "Missing blog image: $name.$ext"
      }
    }
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
  Assert-Contains $blog "href=`"$slug/`"" "Blog index must link to $slug"

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
  Assert-Contains $archive "<link rel=`"canonical`" href=`"$expectedCanonical`" />" "Archive page $page needs a self-canonical"
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
