function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function visibleText(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function figureCaptionIssues(html) {
  const pattern = /<figure\b[^>]*class=["'][^"']*\barticle-figure\b[^"']*["'][^>]*>([\s\S]*?)<\/figure>/gi;
  return [...String(html || "").matchAll(pattern)].flatMap((match, index) => {
    const figure = match[1];
    const src = (figure.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i) || [])[1] || `figure-${index + 1}`;
    const captions = [...figure.matchAll(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi)];
    if (captions.length !== 1) return [`${index + 1} (${src}): подписей ${captions.length}`];
    return visibleText(captions[0][1]) ? [] : [`${index + 1} (${src}): подпись пустая`];
  });
}

function assertArticleFigureCaptions(html, label = "статья") {
  const issues = figureCaptionIssues(html);
  if (issues.length) throw new Error(`${label}: у каждой иллюстрации нужна одна непустая подпись <figcaption>. ${issues.join("; ")}.`);
}

function assertSourceImageCaptions(blocks, label = "ARTICLE-BODY") {
  const images = blocks.filter((block) => block.type === "image");
  const issues = images.flatMap((block, index) => visibleText(block.caption)
    ? []
    : [`${index + 1} (${block.src || "без имени"}): подпись отсутствует`]);
  if (issues.length) throw new Error(`${label}: у каждой иллюстрации нужна непустая подпись. ${issues.join("; ")}.`);
}

module.exports = { assertArticleFigureCaptions, assertSourceImageCaptions, figureCaptionIssues };
