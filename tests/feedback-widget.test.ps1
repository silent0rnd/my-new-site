$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$script = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "script.js")
$css = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "styles.css")
$index = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $root "index.html")
$expectedHeroTriggerText = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('0J/QuNGI0Lgg0LIg0LvQuNGH0LrRgyE='))

function Assert-Contains($value, $expected, $message) {
  if (-not $value.Contains($expected)) {
    throw $message
  }
}

function Assert-Match($value, $pattern, $message) {
  if ($value -notmatch $pattern) {
    throw $message
  }
}

Assert-Contains $script 'function initFeedbackWidget()' "Feedback widget initializer is missing"
Assert-Contains $index 'class="hero-feedback-trigger"' "Returning hero feedback button is missing"
Assert-Match $index '<button[^>]*data-open-feedback-widget[^>]*aria-controls="feedback-widget-menu"[^>]*aria-expanded="false"[^>]*>[^<]+</button>' "Returning hero feedback button semantics are incomplete"
Assert-Contains $index $expectedHeroTriggerText "Returning hero feedback button text is incorrect"
Assert-Contains $script 'document.querySelector("[data-open-feedback-widget]")' "Returning hero feedback trigger binding is missing"
Assert-Match $script 'heroTrigger\?\.addEventListener\("click", \(\) => \{[\s\S]*?if \(isOpen\) \{[\s\S]*?setOpen\(false\);[\s\S]*?return;' "Returning hero feedback trigger must close the open widget on a second click"
Assert-Contains $script '!heroTrigger?.contains(event.target)' "Clicking the returning hero trigger must not be treated as an outside click"
Assert-Match $script 'heroTrigger\?\.addEventListener\("click", \(\) => \{[\s\S]*?returnFocusTarget = heroTrigger;[\s\S]*?setOpen\(true\);[\s\S]*?options\[0\]\?\.focus\(\);' "Returning hero trigger must open the widget and focus the first option"
Assert-Contains $script 'heroTrigger?.setAttribute("aria-expanded", String(isOpen))' "Returning hero trigger must mirror widget state"
Assert-Contains $script 'returnFocusTarget.focus()' "Escape must return focus to the control that opened the widget"
Assert-Contains $script 'https://t.me/miroshnikov_maxim' "Telegram profile link is missing"
Assert-Contains $script 'https://max.ru/u/f9LHodD0cOIgA7Bv0YjmbdPunU2SNMxoBHXbc-v6QicEIYa6pEGXQlYaqtE' "MAX profile link is missing"
Assert-Match $script 'target="_blank"[\s\S]*?rel="noopener noreferrer"' "Messenger links must open safely in a new tab"
Assert-Contains $script 'trigger.setAttribute("aria-expanded", "false")' "Initial aria-expanded state is missing"
Assert-Contains $script 'trigger.setAttribute("aria-controls", menuId)' "Trigger must reference the messenger menu"
Assert-Contains $script 'menu.setAttribute("aria-hidden", String(!isOpen))' "Menu visibility must be announced"
Assert-Contains $script 'option.tabIndex = isOpen ? 0 : -1' "Closed messenger links must be removed from the tab order"
Assert-Contains $script 'event.key !== "Enter" && event.key !== " "' "Enter and Space must toggle the widget"
Assert-Match $script 'event\.key === "Escape"[\s\S]*?returnFocus:\s*true' "Escape must close the widget and restore focus"
Assert-Match $script '!widget\.contains\(event\.target\)[\s\S]*?setOpen\(false\)' "Outside pointer press must close the widget"
Assert-Contains $script 'document.body.classList.add("cookie-consent-open")' "Cookie banner must expose its open state"
Assert-Match $script 'MutationObserver\([\s\S]*?cookie-consent-open[\s\S]*?setOpen\(false\)' "Cookie banner must close an open feedback widget"
Assert-Match $script 'initFeedbackWidget\(\);\s*initScrollToTopButton\(\);' "Feedback widget must initialize before the scroll button"

Assert-Match $css '--scroll-to-top-width:\s*48px;[\s\S]*?--scroll-to-top-height:\s*54px;[\s\S]*?--feedback-trigger-size:\s*48px;' "Mobile floating-control sizes are missing"
Assert-Match $css '@media \(min-width:\s*561px\)[\s\S]*?--scroll-to-top-width:\s*58px;[\s\S]*?--scroll-to-top-height:\s*64px;[\s\S]*?--feedback-trigger-size:\s*58px;' "Desktop floating-control sizes are missing"
Assert-Match $css '\.feedback-widget__option\s*\{[\s\S]*?min-height:\s*44px;' "Messenger options must have a 44px touch target"
Assert-Match $css '\.hero-feedback-trigger::before\s*\{[\s\S]*?inset:\s*-9px -5px;' "Returning hero trigger must expose a 44px touch area"
Assert-Match $css '\.hero-feedback-trigger:focus-visible\s*\{[\s\S]*?outline:\s*2px solid currentColor;' "Returning hero trigger needs a visible keyboard focus"
Assert-Match $css '\.feedback-widget\.is-open \.feedback-widget__option--telegram\s*\{[\s\S]*?translate3d\(-\d+px,\s*-\d+px' "Telegram must open upward and left"
Assert-Match $css '\.feedback-widget\.is-open \.feedback-widget__option--max\s*\{[\s\S]*?translate3d\(-\d+px,\s*-\d+px' "MAX must open upward and left"
Assert-Match $css '@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.feedback-widget__option[\s\S]*?animation:\s*none;[\s\S]*?transition-duration:\s*0s;' "Reduced-motion fallback is missing"
Assert-Match $css '\.cookie-consent-open \.feedback-widget\s*\{[\s\S]*?visibility:\s*hidden;[\s\S]*?pointer-events:\s*none;' "Cookie banner must hide the widget on mobile"
Assert-Match $css '@media \(min-width:\s*721px\)[\s\S]*?\.cookie-consent-open \.feedback-widget[\s\S]*?visibility:\s*visible;' "Cookie banner must not hide the widget on wider screens"
Assert-Match $script 'feedback-widget__brand-mark--max" d="M27\.2 10\.6' "MAX must use its own symbol rather than text lettering"
Assert-Contains $script 'feedback-widget__chat" d="M17 17' "Main feedback control must use the Bubble icon"
Assert-Contains $script 'feedback-widget__dot--one' "Bubble must contain the first animated dot"
Assert-Contains $script 'feedback-widget__dot--two' "Bubble must contain the second animated dot"
Assert-Contains $script 'feedback-widget__dot--three' "Bubble must contain the third animated dot"
Assert-Match $script 'createFloatingControlLabel\(".+\?"\)' "Feedback widget handwriting label is missing"
Assert-Match $script 'createFloatingControlLabel\(".+!"\)' "Scroll-to-top handwriting label is missing"
Assert-Contains $script 'is-floating-control-label-burst' "Widget label burst state is missing"
Assert-Match $script 'const toggleWidget = \(\) => \{[\s\S]*?if \(isOpen\) \{[\s\S]*?setOpen\(false\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?playLabelBurst\(\);[\s\S]*?setOpen\(true\);' "Feedback label burst must run only when opening the widget"
Assert-Match $script 'widget\.addEventListener\("focusin", \(event\) => \{[\s\S]*?event\.target instanceof HTMLElement[\s\S]*?matches\(":focus-visible"\)[\s\S]*?setLabelVisible\(isKeyboardFocus\)' "Feedback label must appear on keyboard focus only"
Assert-Match $script 'const setLabelVisible = \(isVisible\) => \{[\s\S]*?widget\.classList\.toggle\("has-floating-control-label", isVisible && !isOpen\)' "Feedback label must stay hidden while the widget is open"
Assert-Match $script 'const AUTO_CLOSE_MS = 1000;' "Feedback widget must use a one-second auto-close delay"
Assert-Match $script 'widget\.addEventListener\("pointerleave", \(event\) => \{[\s\S]*?event\.pointerType === "mouse"[\s\S]*?scheduleAutoClose\(\)' "Feedback widget must auto-close only after the mouse leaves"
Assert-Match $script 'const scheduleAutoClose = \(\) => \{[\s\S]*?window\.setTimeout\(\(\) => \{[\s\S]*?!widget\.matches\(":hover"\)[\s\S]*?setOpen\(false\);[\s\S]*?\}, AUTO_CLOSE_MS\)' "Feedback widget must close after the pointer stays away"
Assert-Match $css '\.feedback-widget__trigger\s*\{[^}]*background:\s*transparent;' "Main feedback button must be transparent"
Assert-Match $css '\.feedback-widget__label\s*\{[^}]*background:\s*transparent;' "Messenger labels must not have a background"
Assert-Match $css '\.feedback-widget__option-circle\s*\{[^}]*background:\s*transparent;' "Messenger circles must be transparent"
Assert-Match $css '\.feedback-widget__option:hover \.feedback-widget__option-ring,[\s\S]*?color:\s*#FF9800;' "Only messenger circle contours may turn orange"
Assert-Match $css 'animation:\s*feedback-widget-wobble\s+5s' "Bubble must wobble about every five seconds"
Assert-Match $css 'feedback-widget-dot-pulse\s+900ms[\s\S]*?dot--two[\s\S]*?140ms[\s\S]*?dot--three[\s\S]*?280ms' "Bubble dots must animate in sequence"
Assert-Match $css '--floating-control-ease:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)' "Floating controls must use one shared motion curve"
Assert-Match $css '\.feedback-widget__option\s*\{[\s\S]*?translate3d\(6px,\s*7px,\s*0\)\s*scale\(0\.72\)[\s\S]*?opacity\s+180ms\s+var\(--floating-control-ease\)[\s\S]*?transform\s+300ms\s+var\(--floating-control-ease\)' "Messenger options must open from a softer initial state"
Assert-Match $css 'feedback-widget-option-ring-spin\s+540ms\s+var\(--floating-control-ease\)' "Messenger rings must use the shared smooth timing"
Assert-Match $css '@keyframes feedback-widget-option-ring-spin[\s\S]*?74%\s*\{[\s\S]*?rotate\(356deg\)[\s\S]*?88%\s*\{[\s\S]*?rotate\(361deg\)' "Messenger ring must settle gently at the end"
Assert-Match $css '@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.feedback-widget__dot[\s\S]*?animation:\s*none;' "Reduced motion must stop Bubble dot animation"
Assert-Match $css '@media \(min-width:\s*721px\)[\s\S]*?\.floating-control-label\s*\{' "Handwriting labels must be desktop-only"
Assert-Match $css 'floating-control-label-write\s+140ms' "Handwriting labels must draw in letter by letter"
Assert-Match $css 'floating-control-label-burst\s+360ms' "Handwriting labels must burst on click"
Assert-Match $css '@keyframes floating-control-label-burst[\s\S]*?45%\s*\{[\s\S]*?opacity:\s*0\.55;[\s\S]*?70%\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?100%\s*\{' "Handwriting labels must disappear before the final burst frame"
Assert-Match $css '@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.floating-control-label__letter[\s\S]*?animation:\s*none' "Reduced motion must disable handwriting label animation"
Assert-Match $css '@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.has-floating-control-label \.floating-control-label__letter[\s\S]*?opacity:\s*1' "Reduced motion must show the handwriting label without motion"

$widgetStart = $css.IndexOf(".feedback-widget {")
$widgetEnd = $css.IndexOf("@keyframes feedback-widget-wobble")
if ($widgetStart -lt 0 -or $widgetEnd -le $widgetStart) {
  throw "Feedback widget style block is incomplete"
}

$widgetCss = $css.Substring($widgetStart, $widgetEnd - $widgetStart)
if ($widgetCss -match '(box-shadow|text-shadow|filter\s*:)') {
  throw "Feedback widget must not use shadows, glow, or filters"
}

Write-Output "feedback widget checks passed"
