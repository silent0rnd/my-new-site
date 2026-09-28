const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function filesNamed(directory, filename) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesNamed(fullPath, filename);
    return entry.name === filename ? [fullPath] : [];
  });
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, "").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

test("content hierarchy keeps one font and defines the approved scales", () => {
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

  assert.match(css, /--text-font: "TT Masters"/);
  assert.match(css, /\.article-page \.article-lead,[\s\S]*font-size: clamp\(25px, 2\.9vw, 31px\)/);
  assert.match(css, /\.content-key-point[\s\S]*font-size: clamp\(28px, 3vw, 32px\)/);
  assert.match(css, /\.content-key-point[\s\S]*border-left: 3px solid #FF9800/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.content-key-point[\s\S]*font-size: 24px/);
});

test("article key points are standalone statements rather than formulas or flows", () => {
  const articles = filesNamed(path.join(root, "blog"), "index.html");
  const leadCount = articles.filter((file) => fs.readFileSync(file, "utf8").includes('class="article-lead"')).length;
  const keyPoints = articles.flatMap((file) => {
    const html = fs.readFileSync(file, "utf8");
    return [...html.matchAll(/<p[^>]*class="[^"]*\bcontent-key-point\b[^"]*"[^>]*>([\s\S]*?)<\/p>/g)]
      .map((match) => ({ file, text: stripTags(match[1]) }));
  });

  assert.ok(leadCount >= 138, "every published article must retain a lead");
  assert.ok(keyPoints.length >= 20, "curated articles must include key points");
  keyPoints.forEach(({ text }) => {
    assert.ok(text.length >= 90, "a key point must be a complete thought");
    assert.doesNotMatch(text, /(?:=|>|→|->|^\d+[.)])/);
  });
});

test("case data, client rendering and static rendering share the key-paragraph contract", () => {
  const data = fs.readFileSync(path.join(root, "cases-data.js"), "utf8");
  const client = fs.readFileSync(path.join(root, "case-page.js"), "utf8");
  const generator = fs.readFileSync(path.join(root, "scripts", "generate-cases.js"), "utf8");
  const caseFiles = filesNamed(path.join(root, "cases"), "index.html");

  assert.match(data, /function keyParagraph\(text\)/);
  assert.match(data, /emphasis: "key"/);
  assert.match(client, /function getParagraphData\(value, defaultEmphasis = ""\)/);
  assert.match(generator, /function paragraphHtml\(value, defaultEmphasis = ""\)/);
  assert.ok(caseFiles.length >= 43, "every case must be generated");
  const casesWithConclusion = caseFiles.filter((file) => fs.readFileSync(file, "utf8").includes('class="case-conclusion'));
  assert.ok(casesWithConclusion.length >= 42, "standard cases must retain a conclusion");
  casesWithConclusion.forEach((file) => {
    const html = fs.readFileSync(file, "utf8");
    assert.match(html, /<section class="case-conclusion[^>]*">[\s\S]*?<p class="content-key-point">/);
  });
});
