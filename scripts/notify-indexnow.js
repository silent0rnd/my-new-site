const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://naklikay.ru";
const SITE_HOST = new URL(SITE_URL).hostname;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const KEY_FILE_NAME = "indexnow-key.txt";
const KEY_FILE_PATH = path.join(PROJECT_ROOT, KEY_FILE_NAME);

function readValues(argv, name) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== name) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Value is required after ${name}.`);
    values.push(value);
    index += 1;
  }
  return values;
}

function articleUrl(slug) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Invalid article slug: ${slug}`);
  return `${SITE_URL}/blog/${slug}/`;
}

function collectUrls(argv) {
  const urls = [
    ...readValues(argv, "--url"),
    ...readValues(argv, "--article").map(articleUrl),
  ];
  if (!urls.length) throw new Error("Use --url <url> or --article <slug>." );

  const normalized = [...new Set(urls)].map((value) => {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`Invalid URL: ${value}`);
    }
    if (parsed.protocol !== "https:" || parsed.hostname !== SITE_HOST) {
      throw new Error(`URL must belong to ${SITE_HOST}: ${value}`);
    }
    return parsed.toString();
  });
  return normalized;
}

async function main(argv = process.argv.slice(2)) {
  const urls = collectUrls(argv);
  if (urls.length > 10000) throw new Error("IndexNow accepts no more than 10000 URLs per request.");
  if (!fs.existsSync(KEY_FILE_PATH)) throw new Error(`Key file is missing: ${KEY_FILE_NAME}`);

  const key = fs.readFileSync(KEY_FILE_PATH, "utf8").trim();
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) throw new Error("IndexNow key has an invalid format.");

  const payload = {
    host: SITE_HOST,
    key,
    keyLocation: `${SITE_URL}/${KEY_FILE_NAME}`,
    urlList: urls,
  };

  if (argv.includes("--dry-run")) {
    console.log(JSON.stringify({ endpoint: ENDPOINT, host: payload.host, keyLocation: payload.keyLocation, urlList: payload.urlList }));
    return;
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`IndexNow returned HTTP ${response.status}: ${responseText || "no response body"}`);
  console.log(JSON.stringify({ endpoint: ENDPOINT, status: response.status, submitted: urls }));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { articleUrl, collectUrls, main };
