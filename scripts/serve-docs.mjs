import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.resolve(__dirname, "..", "docs");

const PORT = parseInt(process.env.PORT || "4000", 10);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const server = http.createServer((req, res) => {
  // CORS permissivo para carregamento local de recursos
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Decodifica a URL limpa de query strings ou hashes
  const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  if (pathname === "/" || pathname === "") {
    pathname = "/index.html";
  }

  // Se qualquer requisição for para _sidebar.md em subpastas e não existir, direciona para o root _sidebar.md
  if (pathname.endsWith("_sidebar.md")) {
    const directCandidate = path.normalize(path.join(DOCS_DIR, pathname));
    if (!fs.existsSync(directCandidate)) {
      pathname = "/_sidebar.md";
    }
  }

  let safePath = path.normalize(path.join(DOCS_DIR, pathname));

  // Proteção contra path traversal
  if (!safePath.startsWith(DOCS_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Acesso Negado");
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Apenas faz fallback para index.html se NÃO for um recurso de dados (.md, .json, .css, .js, .png, etc.)
      const ext = path.extname(safePath).toLowerCase();
      if (ext && ext !== ".html") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`404 Arquivo Não Encontrado: ${pathname}`);
        return;
      }

      const indexPath = path.join(DOCS_DIR, "index.html");
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("404 Arquivo Não Encontrado");
        } else {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(indexData);
        }
      });
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(safePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("500 Erro Interno ao Ler Arquivo");
        return;
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log("\n========================================================");
  console.log(" ⚡ SERVIDOR DA DOCUMENTAÇÃO EQSAM INICIADO COM SUCESSO!");
  console.log("========================================================");
  console.log(` 📖 Acesse no seu navegador: \x1b[32m\x1b[1m${url}\x1b[0m`);
  console.log(` 📂 Pasta servida: ${DOCS_DIR}`);
  console.log(" Pressione Ctrl + C para encerrar.\n");

  // Tenta abrir o navegador automaticamente
  const startCmd =
    process.platform === "win32"
      ? `start ${url}`
      : process.platform === "darwin"
      ? `open ${url}`
      : `xdg-open ${url}`;

  exec(startCmd, () => {});
});
