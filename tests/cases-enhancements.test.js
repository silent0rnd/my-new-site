const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "cases-data.js"), "utf8"), sandbox);

const cases = sandbox.window.siteCases;
assert.strictEqual(cases.length, 44, "Expected all 44 cases");

function sectionIllustrations(section) {
  return [
    section.illustration,
    section.illustrationAfterParagraph,
    ...(Array.isArray(section.illustrationsAfterParagraph) ? section.illustrationsAfterParagraph : []),
    section.illustrationAfterListItem,
  ].filter(Boolean);
}

for (const caseItem of cases) {
  assert.ok(caseItem.h1Title.startsWith("Продвижение"), `${caseItem.slug}: H1 must describe promotion`);
  assert.ok(caseItem.intro.includes("Результат -"), `${caseItem.slug}: intro must contain the result`);

  const pagePath = path.join(root, "cases", caseItem.slug, "index.html");
  const html = fs.readFileSync(pagePath, "utf8");
  const h1 = html.match(/<h1>([^<]+)<\/h1>/)?.[1];
  assert.strictEqual(h1, caseItem.h1Title, `${caseItem.slug}: generated H1 differs from h1Title`);
  assert.ok(html.includes(`<span aria-current="page">${caseItem.title}</span>`), `${caseItem.slug}: breadcrumb must keep card title`);
  assert.ok(html.includes('<aside class="article-author case-author"'), `${caseItem.slug}: visible author is missing`);
  assert.ok(!html.includes('<section class="case-cta">'), `${caseItem.slug}: CTA block must be absent`);
  assert.ok(html.includes('class="case-gallery__caption"'), `${caseItem.slug}: visible gallery caption is missing`);
  assert.ok(html.includes('class="case-lightbox__counter"'), `${caseItem.slug}: separate lightbox counter is missing`);

  for (const [sectionIndex, section] of (caseItem.sections || []).entries()) {
    for (const illustration of sectionIllustrations(section)) {
      const sourcePath = path.join(root, ...illustration.src.split("/"));
      assert.ok(fs.existsSync(sourcePath), `${caseItem.slug}: illustration source is missing in section ${sectionIndex + 1}: ${illustration.src}`);
      assert.ok(html.includes(`../../${illustration.src}`), `${caseItem.slug}: generated page does not reference illustration source in section ${sectionIndex + 1}: ${illustration.src}`);

      for (const width of illustration.responsiveWidths || []) {
        const responsiveSrc = illustration.src.replace(/\.[^.]+$/, `-${width}.webp`);
        const responsivePath = path.join(root, ...responsiveSrc.split("/"));
        assert.ok(fs.existsSync(responsivePath), `${caseItem.slug}: responsive illustration is missing in section ${sectionIndex + 1}: ${responsiveSrc}`);
        assert.ok(html.includes(`../../${responsiveSrc} ${width}w`), `${caseItem.slug}: generated page does not reference responsive illustration in section ${sectionIndex + 1}: ${responsiveSrc}`);
      }
    }
  }

  if (caseItem.seoTitle) {
    assert.ok(html.includes(`<title>${caseItem.seoTitle}</title>`), `${caseItem.slug}: SEO title changed`);
  } else {
    assert.ok(html.match(/<title>[^<]*Открытие бизнеса в ОАЭ[^<]*<\/title>/), `${caseItem.slug}: fallback SEO title must use card title`);
  }

  if (caseItem.seoDescription) {
    assert.ok(html.includes(`content="${caseItem.seoDescription}"`), `${caseItem.slug}: SEO description changed`);
  }

  if (caseItem.datePublished) {
    assert.ok(html.includes(`datetime="${caseItem.datePublished}"`), `${caseItem.slug}: publication date is missing`);
  }
  if (caseItem.dateModified) {
    assert.ok(html.includes(`datetime="${caseItem.dateModified}"`), `${caseItem.slug}: modified date is missing`);
  }

  const schemaText = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  const schema = JSON.parse(schemaText);
  const article = schema["@graph"].find((item) => item["@type"] === "Article");
  const breadcrumbs = schema["@graph"].find((item) => item["@type"] === "BreadcrumbList");
  assert.strictEqual(article.name, caseItem.h1Title, `${caseItem.slug}: schema name must use H1`);
  assert.strictEqual(article.about, caseItem.h1Title, `${caseItem.slug}: schema about must use H1`);
  assert.strictEqual(article.author["@id"], "https://naklikay.ru/#maxim-miroshnikov", `${caseItem.slug}: author entity is not linked`);
  assert.strictEqual(breadcrumbs.itemListElement[2].name, caseItem.title, `${caseItem.slug}: schema breadcrumb must keep card title`);
}

const undated = fs.readFileSync(path.join(root, "cases", "business-setup-uae-yandex-direct", "index.html"), "utf8");
assert.ok(!undated.includes('class="case-dates"'), "Case without known dates must not invent them");

console.log("case SEO enhancement checks passed");
