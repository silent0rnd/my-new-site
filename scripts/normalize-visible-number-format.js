const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const write = process.argv.includes("--write");
const excludedDirectories = new Set([
  ".agents",
  ".claude",
  ".codex",
  ".git",
  "backups",
  "docs",
  "node_modules",
  "scripts",
  "tests",
  "tmp",
  "updated-chat-instructions",
]);
const fourDigitWithSeparator = /(?<!\d)([1-9])(?: |&nbsp;|\u00A0)(\d{3})(?!(?: |&nbsp;|\u00A0)\d{3})(?!\d)/g;
const ungroupedLongNumber = /(?<![\d.,])\d{5,}(?!\d)/g;
const protectedHtml = /<(script|style|svg|pre|code)\b[\s\S]*?<\/\1\s*>/gi;
const htmlTag = /<[^>]+>/g;
const visibleAttribute = /\b(alt|title|aria-label|data-caption|content)=("[^"]*"|'[^']*')/gi;
const javascriptString = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g;

function collectHtmlFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectHtmlFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeChunk(text, matches, separator) {
  let updated = text.replace(fourDigitWithSeparator, (source, first, rest) => {
    matches.push({ source, replacement: `${first}${rest}` });
    return `${first}${rest}`;
  });

  updated = updated.replace(ungroupedLongNumber, (source, offset, fullText) => {
    const before = fullText.slice(Math.max(0, offset - 16), offset);
    const after = fullText.slice(offset + source.length, offset + source.length + 12);
    if (/[+№]\s*$/.test(before)) return source;
    if (/(?:ИНН|ОГРНИП|индекс)\s*$/i.test(before)) return source;
    if (source.length === 12 || source.length === 15) return source;
    if (source.length === 6 && /^\s*,\s*г\./i.test(after)) return source;
    const replacement = source.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    matches.push({ source, replacement });
    return replacement;
  });

  return updated;
}

function normalizeTag(tag, matches) {
  return tag.replace(visibleAttribute, (source, name, quoted) => {
    const quote = quoted[0];
    const value = quoted.slice(1, -1);
    return `${name}=${quote}${normalizeChunk(value, matches, "&nbsp;")}${quote}`;
  });
}

function normalizeHtmlFragment(fragment, matches) {
  let result = "";
  let cursor = 0;

  for (const match of fragment.matchAll(htmlTag)) {
    result += normalizeChunk(fragment.slice(cursor, match.index), matches, "&nbsp;");
    result += normalizeTag(match[0], matches);
    cursor = match.index + match[0].length;
  }

  result += normalizeChunk(fragment.slice(cursor), matches, "&nbsp;");
  return result;
}

function normalizeJsonValue(value, matches, key = "", parent = null) {
  if (typeof value === "string") {
    if (/^(?:https?:|\/)/i.test(value)) return value;
    if (/^(?:taxID|postalCode)$/i.test(key)) return value;
    if (key === "value" && parent && /^(?:ИНН|ОГРНИП)$/i.test(parent.propertyID || "")) return value;
    return normalizeChunk(value, matches, "\u00A0");
  }
  if (Array.isArray(value)) return value.map((item) => normalizeJsonValue(item, matches, key, parent));
  if (value && typeof value === "object") {
    for (const childKey of Object.keys(value)) value[childKey] = normalizeJsonValue(value[childKey], matches, childKey, value);
  }
  return value;
}

function normalizeJsonLd(block, matches) {
  const openingEnd = block.indexOf(">") + 1;
  const closingStart = block.lastIndexOf("</script");
  const opening = block.slice(0, openingEnd);
  const closing = block.slice(closingStart);
  const json = block.slice(openingEnd, closingStart);
  const parsed = JSON.parse(json);
  return `${opening}${JSON.stringify(normalizeJsonValue(parsed, matches))}${closing}`;
}

function normalizeHtml(html, matches) {
  let result = "";
  let cursor = 0;

  for (const match of html.matchAll(protectedHtml)) {
    result += normalizeHtmlFragment(html.slice(cursor, match.index), matches);
    const block = match[0];
    const openingTag = block.slice(0, block.indexOf(">") + 1);
    const isJsonLd = match[1].toLowerCase() === "script" && /application\/ld\+json/i.test(openingTag);
    result += isJsonLd ? normalizeJsonLd(block, matches) : block;
    cursor = match.index + block.length;
  }

  result += normalizeHtmlFragment(html.slice(cursor), matches);
  return result;
}

function normalizeJavascriptStrings(source, matches) {
  return source.replace(javascriptString, (literal) => {
    const quote = literal[0];
    const value = literal.slice(1, -1);
    return `${quote}${normalizeChunk(value, matches, "\u00A0")}${quote}`;
  });
}

const targets = [
  ...collectHtmlFiles(root),
  path.join(root, "cases-data.js"),
];
const violations = [];
let changedFiles = 0;
let replacementCount = 0;

for (const file of targets) {
  const source = fs.readFileSync(file, "utf8");
  const matches = [];
  const updated = file.endsWith(".html")
    ? normalizeHtml(source, matches)
    : normalizeJavascriptStrings(source, matches);

  if (matches.length === 0) continue;

  replacementCount += matches.length;
  const relative = path.relative(root, file).replace(/\\/g, "/");
  violations.push({
    file: relative,
    count: matches.length,
    examples: [...new Set(matches.map((item) => `${item.source} to ${item.replacement}`))].slice(0, 5),
  });

  if (write) {
    fs.writeFileSync(file, updated, "utf8");
    changedFiles += 1;
  }
}

if (write) {
  console.log(`Нормализовано файлов: ${changedFiles}. Исправлено четырехзначных чисел: ${replacementCount}.`);
  process.exit(0);
}

if (violations.length > 0) {
  console.error(`Найдены числа с нарушенным разделением разрядов: ${replacementCount} в ${violations.length} файлах.`);
  for (const item of violations.slice(0, 30)) {
    console.error(`${item.file}: ${item.count}; ${item.examples.join(", ")}`);
  }
  if (violations.length > 30) console.error(`Еще файлов: ${violations.length - 30}.`);
  process.exit(1);
}

console.log(`Формат чисел проверен: ${targets.length} файлов, нарушений нет.`);
