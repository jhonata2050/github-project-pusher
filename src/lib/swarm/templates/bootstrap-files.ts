import { Buffer } from "buffer";
import type { ApplicationRecord } from "../../cloud-apps.server";
import { execSshCommand } from "../swarm-transport.server";

export async function writeStarterFilesIfEmpty(
  conn: any,
  stackDir: string,
  templateId: string,
  app: ApplicationRecord
): Promise<void> {
  if (templateId.includes("php") || templateId.includes("laravel")) {
    const starterPhp = `<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${app.name} — PHP 8.3</title><style>body{font-family:system-ui;background:#030b0b;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}.card{text-align:center;padding:2.5rem;background:#071a1a;border:1px solid #0f3838;border-radius:1.5rem;max-width:520px;box-shadow:0 20px 40px rgba(0,0,0,0.5)}.tag{display:inline-block;padding:4px 14px;background:rgba(34,197,94,0.15);color:#4ade80;border-radius:9999px;font-size:0.8rem;font-weight:700;margin-bottom:1rem}h1{margin:0 0 .5rem;color:#00f5ff}p{color:#94a3b8;font-size:0.9rem}.box{background:#020707;padding:12px;border-radius:10px;font-family:monospace;color:#38bdf8;font-size:0.85rem;margin-top:1rem}</style></head><body><div class="card"><div class="tag">● Online • PHP 8.3 Apache</div><h1>${app.name}</h1><p>Ambiente PHP pronto para desenvolvimento ou deploy com suporte a rotas e mod_rewrite.</p><div class="box">PHP <?= phpversion() ?> • DocumentRoot Ativo</div></div></body></html>`;
    await execSshCommand(conn, `echo "${Buffer.from(starterPhp).toString("base64")}" | base64 -d > ${stackDir}/html/index.php`);
  } else if (templateId.includes("go") || templateId.includes("fiber") || templateId.includes("gin")) {
    const starterGo = `package main
import (
  "fmt"
  "net/http"
  "os"
)
func main() {
  port := os.Getenv("PORT")
  if port == "" { port = "3000" }
  appName := os.Getenv("APP_NAME")
  if appName == "" { appName = "${app.name}" }
  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    fmt.Fprintf(w, "{\\"status\\":\\"online\\",\\"app\\":\\"%s\\",\\"runtime\\":\\"Go 1.22 Alpine\\",\\"cluster\\":\\"DK1\\"}\\n", appName)
  })
  fmt.Printf("Servidor Go em execução na porta %s...\\n", port)
  http.ListenAndServe(":"+port, nil)
}
`;
    await execSshCommand(conn, `echo "${Buffer.from(starterGo).toString("base64")}" | base64 -d > ${stackDir}/html/main.go`);
  } else if (templateId.includes("python") || templateId.includes("fastapi") || templateId.includes("flask") || templateId.includes("django")) {
    const isFastApi = templateId.includes("fastapi");
    const portNum = isFastApi ? 8000 : 5000;
    const starterPy = `import os
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

port = int(os.environ.get("PORT", ${portNum}))
app_name = os.environ.get("APP_NAME", "${app.name}")

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        data = {
            "status": "online",
            "app": app_name,
            "runtime": "Python 3.11 Slim",
            "cluster": "DK1 Swarm"
        }
        self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))

print(f"Servidor Python ativo na porta {port}")
HTTPServer(("0.0.0.0", port), Handler).serve_forever()
`;
    await execSshCommand(conn, `echo "${Buffer.from(starterPy).toString("base64")}" | base64 -d > ${stackDir}/html/main.py`);
  } else if (templateId.includes("java") || templateId.includes("spring")) {
    const starterJava = `import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.io.OutputStream;

public class Main {
    public static void main(String[] args) throws Exception {
        int port = 8080;
        try {
            String p = System.getenv("PORT");
            if (p != null) port = Integer.parseInt(p);
        } catch (Exception ignored) {}
        String appName = System.getenv().getOrDefault("APP_NAME", "${app.name}");

        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", exchange -> {
            String resp = "{\\"status\\":\\"online\\",\\"app\\":\\"" + appName + "\\",\\"runtime\\":\\"Java 21 Temurin OpenJDK\\"}\\n";
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, resp.getBytes().length);
            OutputStream os = exchange.getResponseBody();
            os.write(resp.getBytes());
            os.close();
        });
        System.out.println("Servidor Java 21 rodando na porta " + port);
        server.start();
    }
}
`;
    await execSshCommand(conn, `echo "${Buffer.from(starterJava).toString("base64")}" | base64 -d > ${stackDir}/html/Main.java`);
  } else if (templateId.includes("rust") || templateId.includes("actix")) {
    const starterRustCargo = `[package]
name = "rust_app"
version = "0.1.0"
edition = "2021"

[dependencies]
`;
    const starterRustMain = `use std::io::prelude::*;
use std::net::TcpListener;

fn main() {
    let listener = TcpListener::bind("0.0.0.0:8080").unwrap();
    println!("Servidor Rust ativo na porta 8080...");
    for stream in listener.incoming() {
        if let Ok(mut stream) = stream {
            let response = "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n{\\"status\\":\\"online\\",\\"app\\":\\"${app.name}\\",\\"runtime\\":\\"Rust 1.80 Alpine\\"}";
            let _ = stream.write_all(response.as_bytes());
        }
    }
}
`;
    await execSshCommand(
      conn,
      `mkdir -p ${stackDir}/html/src && echo "${Buffer.from(starterRustCargo).toString("base64")}" | base64 -d > ${stackDir}/html/Cargo.toml && echo "${Buffer.from(starterRustMain).toString("base64")}" | base64 -d > ${stackDir}/html/src/main.rs`
    );
  } else if (templateId.includes("discord")) {
    const starterPkg = JSON.stringify({
      name: "discord-bot-starter",
      version: "1.0.0",
      main: "index.js",
      scripts: { start: "node index.js" },
      dependencies: {}
    }, null, 2);
    const starterBot = `const http = require('http');
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: process.env.APP_NAME || '${app.name}',
    mode: 'Worker Background Ativo',
    uptime: Math.floor(process.uptime()) + 's'
  }));
});
server.listen(port, () => {
  console.log('[Discord Bot Worker] Healthcheck HTTP ativo na porta ' + port);
  console.log('[Discord Bot Worker] Para conectar à API do Discord, defina a variável DISCORD_TOKEN na aba Variáveis (.env).');
});
`;
    await execSshCommand(
      conn,
      `echo "${Buffer.from(starterPkg).toString("base64")}" | base64 -d > ${stackDir}/html/package.json && echo "${Buffer.from(starterBot).toString("base64")}" | base64 -d > ${stackDir}/html/index.js`
    );
  } else if (templateId.includes("fastify") || templateId.includes("express") || templateId.includes("next")) {
    const starterPkg = JSON.stringify({
      name: "node-app",
      version: "1.0.0",
      main: "index.js",
      scripts: { start: "node index.js" }
    }, null, 2);
    const starterNode = `const http = require('http');
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    app: process.env.APP_NAME || '${app.name}',
    runtime: 'Node.js 20 LTS',
    cluster: 'DK1'
  }));
});
server.listen(port, '0.0.0.0', () => {
  console.log('App Node.js ativo na porta ' + port);
});
`;
    await execSshCommand(
      conn,
      `echo "${Buffer.from(starterPkg).toString("base64")}" | base64 -d > ${stackDir}/html/package.json && echo "${Buffer.from(starterNode).toString("base64")}" | base64 -d > ${stackDir}/html/index.js`
    );
  } else {
    // Apenas grava página padrão se não for uma stack com container pré-empacotado
    const isSelfContainedImage =
      templateId.includes("wordpress") ||
      templateId.includes("ghost") ||
      templateId.includes("kuma") ||
      templateId.includes("evolution") ||
      templateId.includes("whatsapp") ||
      templateId.includes("n8n") ||
      templateId.includes("typebot") ||
      templateId.includes("pocketbase") ||
      templateId.includes("openstatus") ||
      templateId.includes("postgres") ||
      templateId.includes("mysql") ||
      templateId.includes("redis");

    if (!isSelfContainedImage) {
      const welcomeHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${app.name} — Online</title><style>body{font-family:system-ui;background:#000606;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}.card{text-align:center;padding:2.5rem;background:#040e0e;border:1px solid #0e2424;border-radius:1.5rem;max-width:480px}.tag{display:inline-block;padding:4px 12px;background:rgba(34,197,94,0.15);color:#4ade80;border-radius:9999px;font-size:0.8rem;font-weight:700;margin-bottom:1rem}h1{margin:0 0 .5rem;color:#00f5ff}p{color:#94a3b8;font-size:0.9rem}</style></head><body><div class="card"><div class="tag">● Online • Eqsam PaaS</div><h1>${app.name}</h1><p>Aplicação ativa e conectada ao cluster com sucesso.</p></div></body></html>`;
      const b64 = Buffer.from(welcomeHtml).toString("base64");
      await execSshCommand(conn, `echo "${b64}" | base64 -d > ${stackDir}/html/index.html`);
    }
  }
}
