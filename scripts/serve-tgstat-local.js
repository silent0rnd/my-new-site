const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const port = 8767;
const toolPath = "/tools/vygruzka-kanalov-iz-tgstat/";
const toolUrl = `http://${host}:${port}${toolPath}`;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function localFilename(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, toolUrl).pathname);
  const candidate = path.resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return path.join(candidate, "index.html");
  return candidate;
}

const server = http.createServer((request, response) => {
  let filename;
  try {
    filename = localFilename(request.url);
  } catch (_) {
    response.writeHead(400).end("Bad request");
    return;
  }
  if (!filename || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentTypes[path.extname(filename).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  fs.createReadStream(filename).pipe(response);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Порт ${port} уже занят. Закройте ранее запущенное окно локальной проверки и повторите запуск.`);
  } else console.error(error.message);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Локальная проверка TGStat запущена: ${toolUrl}`);
  console.log("Не закрывайте это окно во время проверки. Для остановки нажмите Ctrl+C.");
  if (process.env.TGSTAT_LOCAL_NO_OPEN !== "1") {
    const opener = spawn("cmd.exe", ["/c", "start", "", toolUrl], { detached: true, stdio: "ignore" });
    opener.unref();
  }
});
