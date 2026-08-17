$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$articlePath = Join-Path $root "blog/kak-rabotaet-yandex-direct/index.html"
$blogPath = Join-Path $root "blog/index.html"
$sitemapPath = Join-Path $root "sitemap.xml"
$robotsPath = Join-Path $root "robots.txt"

foreach ($path in @($articlePath, $blogPath, $sitemapPath, $robotsPath)) {
  if (-not (Test-Path $path)) {
    throw "Missing file: $path"
  }
}

foreach ($name in @("1.1.jpg", "1.2.jpg", "1.3.jpg", "1.1.webp", "1.2.webp", "1.3.webp")) {
  if (-not (Test-Path (Join-Path $root "blog/$name"))) {
    throw "Missing blog image: $name"
  }
}

$article = Get-Content -Raw -Encoding UTF8 -LiteralPath $articlePath
$blog = Get-Content -Raw -Encoding UTF8 -LiteralPath $blogPath
$sitemap = Get-Content -Raw -Encoding UTF8 -LiteralPath $sitemapPath
$robots = Get-Content -Raw -Encoding UTF8 -LiteralPath $robotsPath

function Assert-Contains($content, $needle, $message) {
  if (-not $content.Contains($needle)) {
    throw $message
  }
}

# Ровно один H1 на статье и на странице блога.
foreach ($pair in @(@($article, "article"), @($blog, "blog index"))) {
  $count = ([regex]::Matches($pair[0], "<h1[\s>]")).Count
  if ($count -ne 1) {
    throw "Expected exactly one H1 on $($pair[1]), found $count"
  }
}

Assert-Contains $article '<link rel="canonical" href="https://naklikay.ru/blog/kak-rabotaet-yandex-direct/" />' "Article canonical is wrong or missing"
Assert-Contains $blog '<link rel="canonical" href="https://naklikay.ru/blog/" />' "Blog index canonical is wrong or missing"
Assert-Contains $article '<title>Как работает Яндекс Директ: Поиск, РСЯ и заявки</title>' "Article SEO title changed"
Assert-Contains $article 'Как работает Яндекс Директ простыми словами.' "Article meta description changed"

if ($article -match "noindex" -or $blog -match "noindex") {
  throw "Blog pages must stay indexable"
}

if ($robots -match "Disallow:\s*/blog") {
  throw "robots.txt must not block /blog/"
}

Assert-Contains $robots "Sitemap: https://naklikay.ru/sitemap.xml" "robots.txt must point to the sitemap"

# Alt-тексты заданы заказчиком, менять их нельзя без согласования.
Assert-Contains $article 'alt="Как работает Яндекс Директ: реклама на Поиске и в РСЯ"' "alt for 1.1.jpg changed"
Assert-Contains $article 'alt="Как работает Яндекс Директ: путь пользователя от объявления до заявки"' "alt for 1.2.jpg changed"
Assert-Contains $article 'alt="Пример рекламы в РСЯ в Яндекс Директе"' "alt for 1.3.jpg changed"

foreach ($src in @("../1.1.jpg", "../1.2.jpg", "../1.3.jpg")) {
  Assert-Contains $article "src=`"$src`"" "Article must use the original JPG as fallback for $src"
}

# У картинок должны быть width/height, иначе текст прыгает при загрузке.
$imgTags = [regex]::Matches($article, "<img[\s\S]*?>")
foreach ($tag in $imgTags) {
  if ($tag.Value -notmatch 'width="\d+"' -or $tag.Value -notmatch 'height="\d+"') {
    throw "Every article image needs width and height: $($tag.Value)"
  }
}

Assert-Contains $sitemap "<loc>https://naklikay.ru/blog/</loc>" "Sitemap is missing the blog index"
Assert-Contains $sitemap "<loc>https://naklikay.ru/blog/kak-rabotaet-yandex-direct/</loc>" "Sitemap is missing the article"

# Внутренняя ссылка на статью, по которой её найдёт поисковый робот.
$index = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "index.html")
Assert-Contains $index '<a href="/blog/">Блог</a>' "Home page footer must link to the blog"
Assert-Contains $blog 'href="kak-rabotaet-yandex-direct/"' "Blog index must link to the article"

# Метрика подключается только через общий script.js, второго счётчика быть не должно.
foreach ($pair in @(@($article, "article"), @($blog, "blog index"))) {
  if ($pair[0] -match "mc\.yandex\.ru") {
    throw "Yandex Metrika must not be duplicated on $($pair[1])"
  }
  $scripts = ([regex]::Matches($pair[0], 'src="[^"]*script\.js')).Count
  if ($scripts -ne 1) {
    throw "Expected exactly one script.js include on $($pair[1]), found $scripts"
  }
}

# JSON-LD должен разбираться как валидный JSON.
$ldMatch = [regex]::Match($article, '<script type="application/ld\+json">([\s\S]*?)</script>')
if (-not $ldMatch.Success) {
  throw "Article is missing JSON-LD"
}

$ld = $ldMatch.Groups[1].Value | ConvertFrom-Json
$types = $ld.'@graph' | ForEach-Object { $_.'@type' }
foreach ($expected in @("BlogPosting", "BreadcrumbList")) {
  if ($types -notcontains $expected) {
    throw "JSON-LD is missing $expected"
  }
}

$posting = $ld.'@graph' | Where-Object { $_.'@type' -eq "BlogPosting" }
if ($posting.url -ne "https://naklikay.ru/blog/kak-rabotaet-yandex-direct/") {
  throw "JSON-LD url does not match the canonical"
}
if ($posting.author.name -ne "Максим Мирошников") {
  throw "JSON-LD author changed"
}

Write-Output "blog checks passed"
