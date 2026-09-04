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

test("service topic index covers every article", () => {
  assert.equal(topicIndex.version, 1);
  assert.equal(topicIndex.articles.length, articleSlugs.length);
  assert.deepEqual([...topicsBySlug.keys()].sort(), articleSlugs);

  for (const article of topicIndex.articles) {
    assert.ok(article.topic, `${article.slug} is missing its service topic`);
    assert.ok(article.topicLabel, `${article.slug} is missing its visible topic label`);
    assert.ok(Array.isArray(article.tags), `${article.slug} has invalid service tags`);
    assert.ok(article.intent, `${article.slug} is missing its intent`);
  }
});

test("every article has three valid related links after the author", () => {
  const topicCounts = new Map();
  for (const article of topicIndex.articles) {
    topicCounts.set(article.topic, (topicCounts.get(article.topic) || 0) + 1);
  }

  for (const slug of articleSlugs) {
    const html = fs.readFileSync(path.join(blogDir, slug, "index.html"), "utf8");
    assert.equal((html.match(/<section class="related-articles"/g) || []).length, 1, `${slug} needs one related section`);
    assert.ok(html.indexOf("<!-- related-articles:start -->") > html.indexOf('<aside class="article-author"'), `${slug} must place related articles after the author`);

    const relatedSlugs = [...html.matchAll(/<a class="related-article-card" href="\.\.\/([^/]+)\/" target="_blank" rel="noopener noreferrer">/g)]
      .map((match) => match[1]);
    assert.equal(relatedSlugs.length, 3, `${slug} needs three related cards`);
    assert.equal(new Set(relatedSlugs).size, 3, `${slug} has duplicate related cards`);
    assert.ok(!relatedSlugs.includes(slug), `${slug} links to itself`);

    for (const relatedSlug of relatedSlugs) {
      assert.ok(fs.existsSync(path.join(blogDir, relatedSlug, "index.html")), `${slug} links to missing article ${relatedSlug}`);
    }

    const topic = topicsBySlug.get(slug).topic;
    const expectedSameTopic = Math.min(3, topicCounts.get(topic) - 1);
    const actualSameTopic = relatedSlugs.filter((relatedSlug) => topicsBySlug.get(relatedSlug).topic === topic).length;
    assert.ok(actualSameTopic >= expectedSameTopic, `${slug} does not prioritize its topic`);

    for (const className of ["related-article-card__topic", "related-article-card__title", "related-article-card__description"]) {
      assert.equal((html.match(new RegExp(`class="${className}"`, "g")) || []).length, 3, `${slug} needs ${className} in every card`);
    }
    assert.doesNotMatch(html, /related-article-card__result|data-related-tags/, `${slug} exposes number-roll fields or service tags`);
  }
});

test("related article behavior is hover-only and has reduced-motion fallback", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

  assert.match(script, /function initRelatedArticleCardsHover\(\)/);
  assert.match(script, /document\.querySelectorAll\("\.related-article-card"\)/);
  assert.match(script, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(styles, /\.related-articles__list\s*{/);
  assert.match(styles, /\.related-article-card:hover/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.related-article-card/);
});
