const { execFileSync } = require("child_process");
const path = require("path");

require("./blog-article-target.test.js");

execFileSync(
  process.execPath,
  [path.join(__dirname, "..", "scripts", "normalize-visible-number-format.js")],
  { stdio: "inherit" },
);
