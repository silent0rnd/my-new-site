const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const blogDir = path.join(root, "blog");
const topicIndex = JSON.parse(fs.readFileSync(path.join(root, "scripts", "blog-related-topics.json"), "utf8"));
const articleSlugs = fs.readdirSync(blogDir, { withFileTypes: true })
  .filter((item) => item.isDirectory() && item.name !== "page")
  .filter((item) => fs.existsSync(path.join(blogDir, item.name, "index.html")))
  .map((item) => item.name)
  .sort();
const topicsBySlug = new Map(topicIndex.articles.map((article) => [article.slug, article]));
const archivePages = fs.readdirSync(path.join(blogDir, "page"), { withFileTypes: true })
  .filter((item) => item.isDirectory() && /^\d+$/.test(item.name))
  .map((item) => path.join(blogDir, "page", item.name, "index.html"))
  .filter(fs.existsSync);
const archiveSlugs = new Set();
for (const file of [path.join(blogDir, "index.html"), ...archivePages]) {
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(/<h2 class="blog-card__title">\s*<a href="(?:\.\.\/\.\.\/)?([^/"]+)\//g)) {
    archiveSlugs.add(match[1]);
  }
}
const articleArgumentIndex = process.argv.indexOf("--article");
const requestedSlug = articleArgumentIndex >= 0 ? process.argv[articleArgumentIndex + 1] : "";
if (articleArgumentIndex >= 0 && !requestedSlug) throw new Error("Use --article <slug>.");
const targetSlugs = requestedSlug ? [requestedSlug] : articleSlugs;

if (requestedSlug) {
  test("service topic index covers the target article", () => {
    assert.ok(articleSlugs.includes(requestedSlug), `${requestedSlug} article page is missing`);
    assert.equal(topicsBySlug.has(requestedSlug), archiveSlugs.has(requestedSlug), `${requestedSlug} has inconsistent archive topic data`);
  });
} else {
  test("service topic index covers every archived article", () => {
    assert.equal(topicIndex.version, 1);
    assert.equal(topicIndex.articles.length, archiveSlugs.size);
    assert.deepEqual([...topicsBySlug.keys()].sort(), [...archiveSlugs].sort());

    for (const article of topicIndex.articles) {
      assert.ok(article.topic, `${article.slug} is missing its service topic`);
      assert.ok(article.topicLabel, `${article.slug} is missing its visible topic label`);
      assert.ok(Array.isArray(article.tags), `${article.slug} has invalid service tags`);
      assert.ok(article.intent, `${article.slug} is missing its intent`);
    }
  });
}

test(requestedSlug ? "target article has three valid related links after the author" : "every article has three valid related links after the author", () => {
  const topicCounts = new Map();
  for (const article of topicIndex.articles) {
    topicCounts.set(article.topic, (topicCounts.get(article.topic) || 0) + 1);
  }

  for (const slug of targetSlugs) {
    const html = fs.readFileSync(path.join(blogDir, slug, "index.html"), "utf8");
    assert.equal((html.match(/<section class="related-articles"/g) || []).length, 1, `${slug} needs one related section`);
    assert.ok(html.indexOf("<!-- related-articles:start -->") > html.indexOf('<aside class="article-author"'), `${slug} must place related articles after the author`);
    assert.match(html, /class="related-articles__binder"/, `${slug} needs the binder layout`);
    assert.match(html, /<ul class="related-articles__list">/, `${slug} needs a semantic list`);
    assert.equal((html.match(/class="related-articles__ring"/g) || []).length, 3, `${slug} needs three rings`);

    const relatedSlugs = [...html.matchAll(/<a class="related-article-card" href="\.\.\/([^/]+)\/" target="_blank" rel="noopener noreferrer">/g)]
      .map((match) => match[1]);
    assert.equal(relatedSlugs.length, 3, `${slug} needs three related cards`);
    assert.equal(new Set(relatedSlugs).size, 3, `${slug} has duplicate related cards`);
    assert.ok(!relatedSlugs.includes(slug), `${slug} links to itself`);

    for (const relatedSlug of relatedSlugs) {
      assert.ok(fs.existsSync(path.join(blogDir, relatedSlug, "index.html")), `${slug} links to missing article ${relatedSlug}`);
    }

    if (archiveSlugs.has(slug)) {
      const topicRecord = topicsBySlug.get(slug);
      assert.ok(topicRecord, `${slug} is missing from the service topic index`);
      const topic = topicRecord.topic;
      const expectedSameTopic = Math.min(3, topicCounts.get(topic) - 1);
      const actualSameTopic = relatedSlugs.filter((relatedSlug) => topicsBySlug.get(relatedSlug)?.topic === topic).length;
      assert.ok(actualSameTopic >= expectedSameTopic, `${slug} does not prioritize its topic`);
    }

    for (const className of ["related-article-card__topic", "related-article-card__title", "related-article-card__description"]) {
      assert.equal((html.match(new RegExp(`class="${className}"`, "g")) || []).length, 3, `${slug} needs ${className} in every card`);
    }
    assert.doesNotMatch(html, /related-article-card__result|data-related-tags/, `${slug} exposes number-roll fields or service tags`);
  }
});

test("related article feedback uses CSS hover and keyboard focus and respects reduced motion", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

  assert.doesNotMatch(script, /initRelatedArticleCardsHover|--related-article-hover/);
  assert.match(styles, /\.related-articles__list\s*{/);
  assert.match(styles, /\.related-article-card:is\(:hover, :focus-visible\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.related-article-card/);
});
