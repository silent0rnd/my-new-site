$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root "index.html"
$cssPath = Join-Path $root "styles.css"
$jsPath = Join-Path $root "script.js"

$index = Get-Content -Raw -Encoding UTF8 -LiteralPath $indexPath
$css = Get-Content -Raw -Encoding UTF8 -LiteralPath $cssPath
$js = Get-Content -Raw -Encoding UTF8 -LiteralPath $jsPath

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

function Assert-PathExists($path, $message) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw $message
  }
}

function Assert-Contains($value, $needle, $message) {
  if ($value.IndexOf($needle) -lt 0) {
    throw $message
  }
}

$casesIndex = $index.IndexOf('<section class="cases-showcase"')
$reviewsIndex = $index.IndexOf('<section class="reviews-section"')

if ($casesIndex -lt 0 -or $reviewsIndex -lt 0 -or $reviewsIndex -lt $casesIndex) {
  throw "Reviews section must be after cases section"
}

Assert-Match $index 'id="reviews"' "Reviews anchor missing"
Assert-Match $index 'aria-labelledby="reviews-title"' "Reviews aria label missing"
Assert-Match $index 'data-reviews-gallery' "Reviews gallery hook missing"
$reviewsTitleText = -join ([char[]](0x041E, 0x0442, 0x0437, 0x044B, 0x0432, 0x044B))
$reviewsBodyText = -join ([char[]](0x0417, 0x0434, 0x0435, 0x0441, 0x044C, 0x0020, 0x0441, 0x043E, 0x0431, 0x0440, 0x0430, 0x043D, 0x044B, 0x0020, 0x0436, 0x0438, 0x0432, 0x044B, 0x0435, 0x0020, 0x043E, 0x0442, 0x0437, 0x044B, 0x0432, 0x044B, 0x0020, 0x043A, 0x043B, 0x0438, 0x0435, 0x043D, 0x0442, 0x043E, 0x0432, 0x003A, 0x0020, 0x0441, 0x043E, 0x043E, 0x0431, 0x0449, 0x0435, 0x043D, 0x0438, 0x044F, 0x002C, 0x0020, 0x043A, 0x043E, 0x0442, 0x043E, 0x0440, 0x044B, 0x0435, 0x0020, 0x044F, 0x0020, 0x043F, 0x043E, 0x043B, 0x0443, 0x0447, 0x0438, 0x043B, 0x0020, 0x043F, 0x043E, 0x0441, 0x043B, 0x0435, 0x0020, 0x0441, 0x043E, 0x0432, 0x043C, 0x0435, 0x0441, 0x0442, 0x043D, 0x043E, 0x0439, 0x0020, 0x0440, 0x0430, 0x0431, 0x043E, 0x0442, 0x044B, 0x002E))
Assert-Contains $index ('<h2 class="reviews-section__title" id="reviews-title">' + $reviewsTitleText + '</h2>') "Reviews title text missing"
$visibleIndexText = (($index -replace '<[^>]+>', ' ') -replace '\s+', ' ').Trim()
Assert-Contains $visibleIndexText $reviewsBodyText "Reviews text missing"
Assert-Contains $index 'reviews-section__text-highlight' "Reviews text highlight missing"
Assert-NotMatch $index 'reviews-section__eyebrow' "Reviews eyebrow must be removed"
Assert-NotMatch $index ([char]0x2014) "Homepage contains long dash"

foreach ($number in 1..9) {
  $fileName = "review-{0:D2}.webp" -f $number
  Assert-PathExists (Join-Path $root "images\reviews\$fileName") "Review image missing $fileName"
  Assert-Match $js ([regex]::Escape("images/reviews/$fileName")) "Review data missing $fileName"
}

Assert-Match $js "const reviewsData" "Reviews data array missing"
Assert-Match $js "reviewsTextHighlight" "Reviews text underline hook missing"
Assert-Match $js "reviewsTextUnderlineObserver" "Reviews text underline observer missing"
Assert-Match $js "reviews-gallery__stage" "Reviews stage missing"
Assert-Match $js "reviews-gallery__button" "Reviews buttons missing"
Assert-Match $js "reviews-gallery__dot" "Reviews dots missing"
Assert-Match $js "reviews-lightbox" "Reviews lightbox missing"
Assert-Match $js "openReviewLightbox\(index, button\)" "Reviews click open lightbox missing"
Assert-Match $js "is-tilting" "Reviews hover tilt class missing"
Assert-Match $js "--tilt-rotate-x" "Reviews hover tilt X missing"
Assert-Match $js "--tilt-rotate-y" "Reviews hover tilt Y missing"
Assert-Match $js "handleReviewLightboxKeydown" "Reviews keyboard handler missing"
Assert-Match $js "Escape" "Reviews Escape close missing"
Assert-Match $js "ArrowLeft" "Reviews ArrowLeft navigation missing"
Assert-Match $js "ArrowRight" "Reviews ArrowRight navigation missing"
Assert-Match $js "pointermove" "Reviews drag move missing"
Assert-NotMatch $js "REVIEWS_DRAG_THRESHOLD" "Reviews drag threshold must be removed"
Assert-NotMatch $js "pressedReviewButton" "Reviews pressed drag state must be removed"
Assert-NotMatch $js "reviewPointerDeltaX" "Reviews drag delta must be removed"
Assert-NotMatch $js "reviewIsDragging" "Reviews drag state must be removed"
Assert-NotMatch $js "is-dragging" "Reviews dragging class must be removed from JS"
Assert-NotMatch $js "case-gallery" "Reviews code must not reuse case gallery classes"
Assert-NotMatch $js "case-lightbox" "Reviews code must not reuse case lightbox classes"
Assert-NotMatch $js ([char]0x2014) "Homepage JS contains long dash"

Assert-Match $css "\.reviews-section\s*\{[\s\S]*background:\s*var\(--bg\)" "Reviews background must match site"
Assert-Match $css "\.reviews-section__inner\s*\{[\s\S]*max-width:\s*1180px[\s\S]*padding-left:\s*104px" "Reviews content axis missing"
Assert-Match $css "\.reviews-gallery__image\s*\{[\s\S]*object-fit:\s*contain" "Reviews images must not be cropped"
Assert-Match $css "\.reviews-gallery__button\.is-tilting\s*\{[\s\S]*--tilt-rotate-x" "Reviews hover tilt styles missing"
Assert-Match $css "\.reviews-gallery__dot\.is-active\s*\{[\s\S]*background:\s*#FF9800" "Reviews active dot accent missing"
Assert-Match $css "\.reviews-section__text-highlight\s*\{[\s\S]*display:\s*inline-block" "Reviews text highlight style missing"
Assert-Match $css "\.reviews-lightbox__image\s*\{[\s\S]*object-fit:\s*contain" "Reviews lightbox image containment missing"
Assert-Match $css "@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.reviews-gallery__button" "Reviews reduced motion missing"
Assert-NotMatch $css "\.reviews-gallery\.is-dragging" "Reviews drag CSS must be removed"
Assert-Match $css "@media \(max-width:\s*920px\)\s*\{[\s\S]*\.reviews-section__inner\s*\{[\s\S]*padding-left:\s*0" "Reviews tablet axis reset missing"
Assert-Match $css "@media \(max-width:\s*560px\)\s*\{[\s\S]*\.reviews-gallery__item\s*\{[\s\S]*width:\s*min\(82vw, 320px\)" "Reviews mobile sizing missing"
Assert-NotMatch $css ([char]0x2014) "CSS contains long dash"

Write-Output "reviews checks passed"
