const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { parseHTML } = require("linkedom");

const root = path.resolve(__dirname, "..");
const blogDir = path.join(root, "blog");
const assetVersion = "20260908-article-toc-2";
const articleSlugs = fs.readdirSync(blogDir, { withFileTypes: true })
  .filter((item) => item.isDirectory() && item.name !== "page")
  .filter((item) => fs.existsSync(path.join(blogDir, item.name, "index.html")))
  .map((item) => item.name)
  .sort();

function normalizedText(element) {
  return element.textContent.replace(/\s+/g, " ").trim();
}

function contentHeadings(article) {
  return [...article.querySelectorAll("h2,h3")]
    .filter((heading) => !heading.closest(".article-toc") && !heading.closest(".related-articles"));
}

function expectedOutline(headings, slug) {
  const outline = [];
  let currentSection = null;

  for (const heading of headings) {
    assert.ok(heading.id, `${slug}: ${heading.tagName} is missing an id`);
    if (heading.tagName === "H2") {
      currentSection = { heading, children: [] };
      outline.push(currentSection);
    } else {
      assert.ok(currentSection, `${slug}: H3 appears before the first H2`);
      currentSection.children.push(heading);
    }
  }

  return outline;
}

test("every article has one complete static table of contents", () => {
  const topicIndex = JSON.parse(fs.readFileSync(path.join(root, "scripts", "blog-related-topics.json"), "utf8"));
  assert.equal(articleSlugs.length, topicIndex.articles.length, "table-of-contents coverage must match the blog article index");

  for (const slug of articleSlugs) {
    const html = fs.readFileSync(path.join(blogDir, slug, "index.html"), "utf8");
    assert.equal((html.match(/<!-- article-toc:start -->/g) || []).length, 1, `${slug}: needs one TOC start marker`);
    assert.equal((html.match(/<!-- article-toc:end -->/g) || []).length, 1, `${slug}: needs one TOC end marker`);
    assert.match(html, new RegExp(`styles\\.css\\?v=${assetVersion}`), `${slug}: stylesheet version is stale`);
    assert.match(html, new RegExp(`script\\.js\\?v=${assetVersion}`), `${slug}: script version is stale`);

    const { document } = parseHTML(html);
    const article = document.querySelector("article.legal-document");
    const toc = article?.querySelector(".article-toc");
    assert.ok(article, `${slug}: article document is missing`);
    assert.ok(toc, `${slug}: static table of contents is missing`);
    assert.equal(toc.id, "article-toc", `${slug}: table of contents anchor is wrong`);
    assert.equal(toc.getAttribute("aria-labelledby"), "article-toc-title", `${slug}: TOC accessible name is missing`);

    const headings = contentHeadings(article);
    assert.ok(headings.length > 0, `${slug}: content headings are missing`);
    assert.equal(headings[0].tagName, "H2", `${slug}: first content heading must be H2`);
    const outline = expectedOutline(headings, slug);
    const list = toc.querySelector(".article-toc__list");
    const items = [...list.children];
    assert.equal(items.length, outline.length, `${slug}: top-level TOC item count does not match H2 count`);

    outline.forEach((section, index) => {
      const item = items[index];
      const sectionLink = item.querySelector(".article-toc__link--section");
      assert.equal(sectionLink.getAttribute("href"), `#${section.heading.id}`, `${slug}: H2 anchor is wrong at item ${index + 1}`);
      assert.equal(normalizedText(sectionLink), normalizedText(section.heading), `${slug}: H2 label changed at item ${index + 1}`);
      assert.ok(sectionLink.hasAttribute("data-article-anchor"), `${slug}: H2 link is missing local-anchor marker`);
      assert.equal(sectionLink.hasAttribute("target"), false, `${slug}: H2 anchor must stay in the current tab`);

      const sublist = item.querySelector(".article-toc__sublist");
      const toggle = item.querySelector(".article-toc__toggle");
      if (!section.children.length) {
        assert.equal(sublist, null, `${slug}: empty H2 must not have a subsection list`);
        assert.equal(toggle, null, `${slug}: empty H2 must not have a subsection toggle`);
        return;
      }

      assert.ok(sublist, `${slug}: H3 list is missing at item ${index + 1}`);
      assert.ok(toggle, `${slug}: H3 toggle is missing at item ${index + 1}`);
      assert.equal(toggle.getAttribute("aria-expanded"), "false", `${slug}: H3 list must be collapsed initially`);
      assert.equal(toggle.getAttribute("aria-controls"), sublist.id, `${slug}: H3 toggle does not control its list`);
      assert.equal(sublist.hasAttribute("hidden"), true, `${slug}: H3 list must be hidden initially`);

      const subsectionLinks = [...sublist.querySelectorAll(".article-toc__link--subsection")];
      assert.equal(subsectionLinks.length, section.children.length, `${slug}: H3 item count is wrong at H2 ${index + 1}`);
      section.children.forEach((heading, childIndex) => {
        const link = subsectionLinks[childIndex];
        assert.equal(link.getAttribute("href"), `#${heading.id}`, `${slug}: H3 anchor is wrong at H2 ${index + 1}`);
        assert.equal(normalizedText(link), normalizedText(heading), `${slug}: H3 label changed at H2 ${index + 1}`);
        assert.equal(link.hasAttribute("target"), false, `${slug}: H3 anchor must stay in the current tab`);
      });
    });

    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    assert.equal(new Set(ids).size, ids.length, `${slug}: page contains duplicate ids`);
    assert.ok(html.indexOf("<!-- article-toc:start -->") < html.indexOf(`id="${headings[0].id}"`), `${slug}: table of contents must appear before the first section`);
  }
});

test("table of contents controls use local smooth navigation and reduced-motion fallback", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

  assert.match(script, /function initArticleTableOfContents\(\)/);
  assert.match(script, /function initArticleTocReturnButton\(\)/);
  assert.match(script, /link\.hasAttribute\("data-article-anchor"\)/);
  assert.match(script, /window\.history\.pushState\(null, "", hash\)/);
  assert.match(script, /behavior: prefersReducedMotion\.matches \? "auto" : "smooth"/);
  assert.match(script, /tableOfContents\.getBoundingClientRect\(\)\.bottom < 0/);
  assert.match(script, /character === " " \? "\\u00A0" : character/);
  assert.match(script, /const sublistAnimations = new WeakMap\(\)/);
  assert.match(script, /prefersReducedMotion\.matches \|\| typeof sublist\.animate !== "function"/);
  assert.match(script, /sublist\.hidden = !shouldExpand/);
  assert.match(script, /animation\.addEventListener\("finish"/);
  assert.match(styles, /\.article-toc\s*{/);
  assert.match(styles, /\.article-toc__toggle:focus-visible/);
  assert.match(styles, /height: 1\.5px;[\s\S]*?clip-path: inset\(0 100% 0 0\);/);
  assert.match(styles, /\.article-toc__link:hover::after,[\s\S]*?clip-path: inset\(0 0 0 0\);/);
  assert.doesNotMatch(styles, /\.article-toc__link:hover,[\s\S]*?transform: translateX\(3px\);/);
  assert.match(styles, /\.article-toc__sublist\.is-animating\s*{[\s\S]*?overflow: hidden;/);
  assert.match(styles, /\.article-toc-return\s*{/);
  assert.match(styles, /\.cookie-consent-open \.article-toc-return/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.article-toc-return/);
});

test("legacy article keeps its introduction before the table of contents", () => {
  const html = fs.readFileSync(path.join(blogDir, "a-b-testirovanie-sayta", "index.html"), "utf8");
  const { document } = parseHTML(html);
  const toc = document.querySelector(".article-toc");
  const precedingParagraphs = [...toc.parentElement.children]
    .slice(0, [...toc.parentElement.children].indexOf(toc))
    .filter((element) => element.tagName === "P");

  assert.ok(precedingParagraphs.length > 0, "legacy article introduction must stay before the table of contents");
  assert.equal(toc.nextElementSibling?.tagName, "H2", "table of contents must stay directly before the first main heading");
});
