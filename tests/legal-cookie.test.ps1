$ErrorActionPreference = "Stop"

function Assert-Contains {
  param(
    [string]$Content,
    [string]$Needle,
    [string]$Message
  )

  if (-not $Content.Contains($Needle)) {
    throw $Message
  }
}

function Assert-NotContains {
  param(
    [string]$Content,
    [string]$Needle,
    [string]$Message
  )

  if ($Content.Contains($Needle)) {
    throw $Message
  }
}

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root "index.html"
$stylesPath = Join-Path $root "styles.css"
$scriptPath = Join-Path $root "script.js"
$consentPath = Join-Path $root "personal-data-consent/index.html"
$cookiePath = Join-Path $root "cookie-policy/index.html"

if (-not (Test-Path $consentPath)) {
  throw "Missing personal-data-consent page"
}

if (-not (Test-Path $cookiePath)) {
  throw "Missing cookie-policy page"
}

$index = Get-Content -Raw -Encoding UTF8 $indexPath
$styles = Get-Content -Raw -Encoding UTF8 $stylesPath
$script = Get-Content -Raw -Encoding UTF8 $scriptPath
$consent = Get-Content -Raw -Encoding UTF8 $consentPath
$cookie = Get-Content -Raw -Encoding UTF8 $cookiePath

Assert-Contains $consent "personal-data-consent" "Consent page missing expected body class"
Assert-Contains $consent "2026" "Consent page missing current year"
Assert-Contains $consent "616509115086" "Consent page missing INN"
Assert-Contains $consent "322619600194754" "Consent page missing OGRNIP"
Assert-Contains $consent "naklikay.ru" "Consent page missing domain"
Assert-Contains $consent "direct@miroshnikov-maxim.ru" "Consent page missing email"

Assert-Contains $cookie "cookie-policy" "Cookie page missing expected body class"
Assert-Contains $cookie "2026" "Cookie page missing current year"
Assert-Contains $cookie "Yandex.Metrika" "Cookie page missing Yandex Metrika marker"
Assert-Contains $cookie "Google Analytics" "Cookie page missing absent-services disclosure"

Assert-Contains $index "/personal-data-consent/" "Index footer missing personal-data-consent link"
Assert-Contains $index "/cookie-policy/" "Index footer missing cookie-policy link"

Assert-Contains $styles ".cookie-consent" "Styles missing cookie consent block"
Assert-Contains $styles "left: 24px;" "Cookie banner must sit in lower-left on desktop"
Assert-Contains $styles "#FF9800" "Cookie banner must use accent color"
Assert-Contains $styles "translate3d(0, 18px, 0) scale(0.96)" "Cookie banner must start with a smooth entrance transform"
Assert-Contains $styles "360ms cubic-bezier(0.22, 1, 0.36, 1)" "Cookie banner must use smooth entrance timing"
Assert-Contains $styles "transition-delay: 120ms;" "Cookie icon must animate after the banner starts"

Assert-Contains $script "naklikayCookieConsent" "Script missing localStorage consent key"
Assert-Contains $script "COOKIE_CONSENT_DELAY_MS = 5000" "Cookie banner must appear after a 5 second delay"
Assert-Contains $script "COOKIE_CONSENT_ANIMATION_MS = 360" "Script must keep cookie removal synced with the animation"
Assert-Contains $script 'requestAnimationFrame(() => {' "Cookie banner must wait a paint frame before starting entrance animation"
Assert-Contains $script '      requestAnimationFrame(() => {' "Cookie banner entrance animation must start on the second animation frame"
Assert-Contains $script "loadYandexMetrika" "Script missing deferred Metrika loader"
Assert-Contains $script "110564693" "Script missing Yandex Metrika counter id"
Assert-Contains $script "https://mc.yandex.ru/metrika/tag.js?id=110564693" "Script missing Yandex Metrika loader URL with id"
Assert-Contains $script "ecommerce: `"dataLayer`"" "Script missing Yandex Metrika ecommerce option"
Assert-NotContains $script "data-cookie-settings" "Script must not create cookie settings trigger"
Assert-NotContains $consent "data-cookie-settings" "Consent footer must not include cookie settings trigger"
Assert-NotContains $cookie "data-cookie-settings" "Cookie footer must not include cookie settings trigger"
Assert-Contains $script 'case-detail-page' "Script must skip generated legal footer on case detail pages"

Write-Host "Legal and cookie checks passed"
