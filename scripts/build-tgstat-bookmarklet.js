const fs = require("node:fs");
const path = require("node:path");
const terser = require("terser");

const root = path.resolve(__dirname, "..");
const toolDir = path.join(root, "tools", "vygruzka-kanalov-iz-tgstat");
const parser = fs.readFileSync(path.join(toolDir, "tgstat-parser.js"), "utf8");
const source = fs.readFileSync(path.join(toolDir, "bookmarklet-source.js"), "utf8");

(async () => {
  const result = await terser.minify(`${parser}\n${source}`, { compress: true, mangle: true, format: { comments: false } });
  if (!result.code) throw new Error("Terser не создал код bookmarklet.");
  const bookmarklet = `javascript:${result.code}`;
  fs.writeFileSync(path.join(toolDir, "bookmarklet.generated.js"), `window.TGSTAT_BOOKMARKLET_CODE=${JSON.stringify(bookmarklet)};\n`, "utf8");
  process.stdout.write(`Bookmarklet собран: ${bookmarklet.length} символов\n`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
