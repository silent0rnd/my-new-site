$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$homeJs = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "script.js")

function Assert-Match($value, $pattern, $message) {
  if ($value -notmatch $pattern) {
    throw $message
  }
}

Assert-Match $homeJs 'function revealVisibleCaseCard' "Case reveal must use one idempotent visibility helper"
Assert-Match $homeJs 'function queueVisibleMobileCaseCardsCheck' "Mobile case reveal fallback is missing"
Assert-Match $homeJs 'window\.requestAnimationFrame\(checkVisibleMobileCaseCards\)' "Mobile case reveal fallback must be throttled to one animation frame"
Assert-Match $homeJs 'window\.addEventListener\("scroll", queueVisibleMobileCaseCardsCheck, \{ passive: true \}\)' "Mobile case reveal fallback must listen to scrolling passively"
Assert-Match $homeJs 'visibleRatio >= 0\.14' "Mobile case reveal fallback must retain the observer visibility threshold"

Write-Output "mobile case reveal fallback checks passed"
