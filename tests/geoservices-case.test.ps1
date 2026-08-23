$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $root "cases-data.js"
$pagePath = Join-Path $root "cases\geoservices-promotion\index.html"
$caseJsPath = Join-Path $root "case-page.js"
$homeJsPath = Join-Path $root "script.js"
$sitemapPath = Join-Path $root "sitemap.xml"

function Assert-Match($value, $pattern, $message) {
  if ($value -notmatch $pattern) {
    throw $message
  }
}

function Assert-NotMatch($value, $pattern, $message) {
  if ($value -match $pattern) {
    throw $message
  }
}

$data = Get-Content -Raw -Encoding UTF8 -LiteralPath $dataPath
$page = Get-Content -Raw -Encoding UTF8 -LiteralPath $pagePath
$caseJs = Get-Content -Raw -Encoding UTF8 -LiteralPath $caseJsPath
$homeJs = Get-Content -Raw -Encoding UTF8 -LiteralPath $homeJsPath
$sitemap = Get-Content -Raw -Encoding UTF8 -LiteralPath $sitemapPath

if (-not (Test-Path -LiteralPath $pagePath)) {
  throw "Geoservices case page is missing"
}

Assert-Match $data 'slug:\s*"geoservices-promotion"' "Geoservices case data is missing"
Assert-Match $data 'caseType:\s*"collection"' "Collection case type is missing"
Assert-Match $data 'isFeatured:\s*false' "Collection case must stay hidden on homepage"
Assert-Match $homeJs 'caseItem\.isFeatured !== false' "Homepage must exclude hidden case collections"
Assert-Match $page 'data-case-slug="geoservices-promotion"' "Geoservices page slug hook is missing"
Assert-Match $page 'case-breadcrumbs' "Geoservices page must have breadcrumbs"
Assert-Match $page '../../case-page\.js' "Geoservices page must load case renderer"
Assert-Match $caseJs 'renderCollectionProject' "Collection renderer is missing"
Assert-Match $caseJs 'activeLightboxImages' "Lightbox must switch between gallery image sets"
Assert-Match $caseJs 'currentCase\.projects\.map\(\(project,\s*index\)' "Collection projects must render in source order"
Assert-Match $sitemap 'https://naklikay\.ru/cases/geoservices-promotion/' "Geoservices URL is missing from sitemap"

$imagePaths = [regex]::Matches($data, 'assets/cases/(geoservices-[^"\s]+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
if ($imagePaths.Count -ne 28) {
  throw "Expected 28 geoservices images, found $($imagePaths.Count)"
}

foreach ($imagePath in $imagePaths) {
  $fullPath = Join-Path $root "assets\cases\$imagePath"
  if (-not (Test-Path -LiteralPath $fullPath)) {
    throw "Geoservices image is missing: $imagePath"
  }
}

foreach ($value in @("48 910", "1 018", "53", "670", "165", "192", "11", "33", "20")) {
  Assert-Match $data ([regex]::Escape($value)) "Source result missing: $value"
}

Assert-NotMatch $data ([char]0x2014) "Geoservices data contains a long dash"
Assert-NotMatch $page ([char]0x2014) "Geoservices page contains a long dash"
Assert-NotMatch $caseJs ([char]0x2014) "Case renderer contains a long dash"

Write-Output "geoservices case checks passed"
