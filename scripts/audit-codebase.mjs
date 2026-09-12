import fs from "fs";
import path from "path";

const terms = [
  "new Client",
  "conn.end",
  "ssh2",
  "docker stats",
  "docker service",
  "docker service ls",
  "docker service inspect",
  "docker service logs",
  "docker container",
  "docker exec",
  "docker ps",
  "docker inspect",
  'select("*',
  "select('*",
  "env_vars",
  "password",
  "secret",
  "calculateDirectorySize",
  "refetchInterval",
];

const results = {};
terms.forEach((t) => (results[t] = []));

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (
        ent.name !== "node_modules" &&
        ent.name !== ".git" &&
        ent.name !== "dist" &&
        ent.name !== ".output" &&
        ent.name !== "backups"
      ) {
        walk(full);
      }
    } else if (
      ent.isFile() &&
      (full.endsWith(".ts") ||
        full.endsWith(".tsx") ||
        full.endsWith(".js") ||
        full.endsWith(".mjs"))
    ) {
      const content = fs.readFileSync(full, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, idx) => {
        terms.forEach((term) => {
          if (line.includes(term)) {
            results[term].push({
              file: full.replace(/\\/g, "/"),
              line: idx + 1,
              snippet: line.trim().slice(0, 100),
            });
          }
        });
      });
    }
  }
}

walk("src");

console.log("=== AUDITORIA GERAL DE PALAVRAS-CHAVE ===");
for (const [term, matches] of Object.entries(results)) {
  console.log(`\n--- Termo: "${term}" (${matches.length} ocorrências) ---`);
  // Print unique files
  const fileMap = new Map();
  matches.forEach((m) => {
    if (!fileMap.has(m.file)) fileMap.set(m.file, []);
    fileMap.get(m.file).push(m.line);
  });
  for (const [file, lines] of fileMap.entries()) {
    console.log(`  ${file}: linhas ${lines.join(", ")}`);
  }
}
