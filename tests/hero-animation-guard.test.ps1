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
$script = Get-Content -Raw -Encoding UTF8 (Join-Path $root "script.js")
$index = Get-Content -Raw -Encoding UTF8 (Join-Path $root "index.html")
$styles = Get-Content -Raw -Encoding UTF8 (Join-Path $root "styles.css")

Assert-Contains $script "function shouldRunHeroIntroAnimation()" "Missing hero animation guard"
Assert-Contains $script "const LETTER_DELAY_MS = 63;" "Hero letter stagger must be 30 percent faster"
Assert-Contains $script "const ANIMATION_DURATION_MS = 588;" "Hero roll duration must be 30 percent faster"
Assert-Contains $script "const TEXT_LETTER_DELAY_MS = 8;" "Hero text stagger must be faster"
Assert-Contains $script "const GLOBAL_ANIMATION_DELAY_MS = 3000;" "Hero intro must keep the video timing intact"
Assert-Contains $script "const heroAnimationDelay = hasHeroVideoPlayed ? 0 : GLOBAL_ANIMATION_DELAY_MS;" "Repeat visits must start hero text immediately"
Assert-Contains $script "const heroHighlightDelay = hasHeroVideoPlayed ? HIGHLIGHT_DELAY_MS - GLOBAL_ANIMATION_DELAY_MS : HIGHLIGHT_DELAY_MS;" "Repeat visits must shift hero underlines with the text animation"
Assert-Contains $styles "animation: text-roll-in 588ms" "Hero CSS roll duration must match JavaScript timing"
Assert-Contains $script 'window.location.hash' "Hero animation guard must skip hash navigation"
Assert-Contains $script "window.scrollY" "Hero animation guard must check restored scroll position"
Assert-Contains $script "if (shouldRunHeroIntroAnimation())" "Hero animation setup must be guarded"
Assert-Contains $script 'is-hero-intro-pending' "Hero intro pending class must be cleared after animation setup"
Assert-Contains $script 'naklikayScrollY' "Missing saved scroll key"
Assert-Contains $script 'scrollRestoration' "Missing manual scroll restoration"
Assert-Contains $script 'pagehide' "Missing scroll save on pagehide"
Assert-Contains $script 'restoreSavedScrollPosition' "Missing saved scroll restore function"
Assert-Contains $script 'if (isHomePage && savedScroll > 120' "Saved scroll must apply to the home page only, case pages open from the top"
Assert-Contains $script 'if (isHomePage) {' "Case pages must not overwrite the home page saved scroll"
Assert-Contains $index 'is-restoring-scroll' "Missing early scroll restore class in head"
Assert-Contains $index 'is-hero-intro-pending' "Missing early hero intro pending class in head"
Assert-NotContains $styles '.is-restoring-scroll .hero' "Scroll restore must not hide the whole hero portrait"
Assert-Contains $styles '.is-restoring-scroll .stats' "Scroll restore may hide text blocks, not the portrait"
Assert-Contains $styles '.is-restoring-scroll .intro' "Scroll restore may hide text blocks, not the portrait"
Assert-Contains $styles '.is-hero-intro-pending .stats strong' "Missing CSS to hide animated hero text before setup"

# Страховка: спрятанный ради анимации текст обязан показаться, даже если скрипт не отработал.
Assert-Contains $index '}, 4000);' "Head must keep the failsafe that unhides text if script.js never loads"
Assert-Contains $script 'const animationFailsafe = setTimeout' "Script must arm the animation failsafe before any animation setup"
Assert-Contains $script 'clearTimeout(animationFailsafe);' "Script must cancel the failsafe only after a clean run"
Assert-Contains $script 'document.querySelectorAll(".is-roll-paused")' "Failsafe must also unpause section and case titles"
Assert-Contains $script '    element.textContent = text;' "Text roll must put the plain text back if the split fails"

Write-Host "hero animation guard checks passed"
