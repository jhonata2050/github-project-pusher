import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { generateSecureRandomSecret, isInsecureOrPlaceholderValue } from "../secret-generator";

export interface TemplateFileInfo {
  path: string;
  content: string;
}

/**
 * Retorna o diretório raiz canônico do container para o template/build_pack especificado.
 */
export function getTemplateContainerRoot(
  templateId?: string,
  buildPack?: string,
  category?: string
): string {
  if (!templateId && !buildPack && !category) {
    return "/var/www/html";
  }

  const tid = (templateId || "").toLowerCase();
  const cat = (category || "").toLowerCase();
  const bp = (buildPack || "").toLowerCase();

  // 1. WordPress e PHP Stacks -> /var/www/html
  if (
    tid.includes("wordpress") ||
    tid.includes("laravel") ||
    tid.includes("php") ||
    tid.includes("cpanel")
  ) {
    return "/var/www/html";
  }

  // 2. Sites estáticos Caddy / Nginx -> /var/www/html
  if (tid.includes("static-html") || bp === "static") {
    return "/var/www/html";
  }

  // 3. Automação N8N -> /home/node/.n8n
  if (tid.includes("n8n")) {
    return "/home/node/.n8n";
  }

  // 4. Uptime Kuma -> /app/data
  if (tid.includes("uptime-kuma") || tid.includes("kuma")) {
    return "/app/data";
  }

  // 4.1 Flowise AI -> /root/.flowise
  if (tid.includes("flowise")) {
    return "/root/.flowise";
  }

  // 4.2 NocoDB -> /usr/app/data
  if (tid.includes("nocodb")) {
    return "/usr/app/data";
  }

  // 4.3 Vaultwarden -> /data
  if (tid.includes("vaultwarden") || tid.includes("vault")) {
    return "/data";
  }

  // 5. Bancos de Dados
  if (tid.includes("postgres")) return "/var/lib/postgresql/data";
  if (tid.includes("mysql")) return "/var/lib/mysql";
  if (tid.includes("redis")) return "/data";
  if (tid.includes("pocketbase")) return "/pb_data";

  // 6. Bots (Discord, WhatsApp, Telegram, etc.) e APIs/Linguagens -> /app
  if (
    cat === "bots" ||
    cat === "apis" ||
    cat === "languages" ||
    tid.includes("bot") ||
    tid.includes("evolution") ||
    tid.includes("typebot") ||
    tid.includes("fastapi") ||
    tid.includes("fastify") ||
    tid.includes("python") ||
    tid.includes("nextjs") ||
    tid.includes("golang") ||
    tid.includes("rust") ||
    tid.includes("java")
  ) {
    return "/app";
  }

  // Fallback seguro: se categoria for websites -> /var/www/html, senão -> /app
  return cat === "websites" ? "/var/www/html" : "/app";
}

/**
 * Retorna os arquivos iniciais adequados para o template especificado.
 */
export function getTemplateStarterFiles(
  templateId: string,
  appName: string = "Aplicação",
  customEnvs: Array<{ key: string; value: string }> = []
): TemplateFileInfo[] {
  const tid = templateId.toLowerCase();

  // ==========================================
  // 1. WORDPRESS + MYSQL (wordpress-litespeed)
  // ==========================================
  if (tid.includes("wordpress")) {
    const dbName = customEnvs.find((e) => e.key === "WORDPRESS_DB_NAME")?.value || "wordpress";
    const dbUser = customEnvs.find((e) => e.key === "WORDPRESS_DB_USER")?.value || "wordpress";
    const rawDbPass = customEnvs.find((e) => e.key === "WORDPRESS_DB_PASSWORD")?.value;
    const dbPass = rawDbPass && !isInsecureOrPlaceholderValue("WORDPRESS_DB_PASSWORD", rawDbPass)
      ? rawDbPass
      : generateSecureRandomSecret("WORDPRESS_DB_PASSWORD");
    const dbHost = customEnvs.find((e) => e.key === "WORDPRESS_DB_HOST")?.value || "mysql:3306";

    return [
      {
        path: "index.php",
        content: `<?php
/**
 * Ponto de entrada padrão do WordPress no Cluster Eqsam PaaS.
 *
 * @package WordPress
 */
define( 'WP_USE_THEMES', true );

if ( ! isset( $wp_did_header ) ) {
	$wp_did_header = true;
	if ( file_exists( __DIR__ . '/wp-load.php' ) ) {
		require_once __DIR__ . '/wp-load.php';
		wp();
		require_once ABSPATH . WPINC . '/template-loader.php';
	} else {
		echo '<!DOCTYPE html><html lang="pt-BR"><head><title>WordPress Iniciando</title><meta charset="utf-8">';
		echo '<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:grid;place-items:center;min-height:100vh;margin:0;}.c{background:#1e293b;padding:2.5rem;border-radius:1rem;border:1px solid #334155;max-width:550px;text-align:center;}h1{color:#38bdf8;}</style></head><body>';
		echo '<div class="c"><h1>🚀 WordPress + MySQL Pronto!</h1><p>Seu ambiente WordPress está configurado no diretório seguro <code>/var/www/html</code> com banco de dados integrado.</p>';
		echo '<p>Para subir seus arquivos completos ou tema via ZIP, utilize o botão <strong>"Upload ZIP"</strong> na barra superior do Gerenciador de Arquivos.</p></div></body></html>';
	}
}
`,
      },
      {
        path: "wp-config.php",
        content: `<?php
/**
 * Configuração do WordPress provisionada automaticamente pelo Eqsam PaaS.
 */
define( 'DB_NAME', getenv('WORDPRESS_DB_NAME') ?: '${dbName}' );
define( 'DB_USER', getenv('WORDPRESS_DB_USER') ?: '${dbUser}' );
define( 'DB_PASSWORD', getenv('WORDPRESS_DB_PASSWORD') ?: '${dbPass}' );
define( 'DB_HOST', getenv('WORDPRESS_DB_HOST') ?: '${dbHost}' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );

// Chaves de segurança e Salt únicas criptograficamente aleatórias
define('AUTH_KEY',         '${generateSecureRandomSecret("AUTH_KEY")}');
define('SECURE_AUTH_KEY',  '${generateSecureRandomSecret("SECURE_AUTH_KEY")}');
define('LOGGED_IN_KEY',    '${generateSecureRandomSecret("LOGGED_IN_KEY")}');
define('NONCE_KEY',        '${generateSecureRandomSecret("NONCE_KEY")}');
define('AUTH_SALT',        '${generateSecureRandomSecret("AUTH_SALT")}');
define('SECURE_AUTH_SALT', '${generateSecureRandomSecret("SECURE_AUTH_SALT")}');
define('LOGGED_IN_SALT',   '${generateSecureRandomSecret("LOGGED_IN_SALT")}');
define('NONCE_SALT',       '${generateSecureRandomSecret("NONCE_SALT")}');

$table_prefix = 'wp_';

define( 'WP_DEBUG', false );
define( 'WP_MEMORY_LIMIT', '512M' );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

if ( file_exists( ABSPATH . 'wp-settings.php' ) ) {
	require_once ABSPATH . 'wp-settings.php';
}
`,
      },
      {
        path: ".htaccess",
        content: `# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
`,
      },
      {
        path: "README.md",
        content: `# 🚀 ${appName} — WordPress no Cluster Eqsam PaaS

Sua instância do WordPress está provisionada em ambiente isolado com aceleração de cache e SSL automático.

### 📁 Estrutura de Diretórios Recomendada:
- \`index.php\`: Ponto de entrada do site.
- \`wp-config.php\`: Configurações de banco de dados MySQL e chaves de autenticação.
- \`wp-content/plugins/\`: Envie novos plugins descompactados ou em formato ZIP.
- \`wp-content/themes/\`: Seus temas personalizados.
- \`wp-content/uploads/\`: Mídias e uploads do WordPress.
- \`.htaccess\`: Regras de reescrita para URLs amigáveis.

---
💡 **Dica:** Você pode enviar temas e plugins completos diretamente através do botão **"Upload / Extrair ZIP"** no Gerenciador de Arquivos do Painel.
`,
      },
      {
        path: "wp-content/plugins/.gitkeep",
        content: "",
      },
      {
        path: "wp-content/themes/.gitkeep",
        content: "",
      },
      {
        path: "wp-content/uploads/.gitkeep",
        content: "",
      },
    ];
  }

  // ==========================================
  // 2. DISCORD BOT (discord-bot-starter)
  // ==========================================
  if (tid.includes("discord")) {
    return [
      {
        path: "package.json",
        content: JSON.stringify(
          {
            name: "discord-bot",
            version: "1.0.0",
            description: "Discord Bot hospedado no Eqsam PaaS",
            main: "index.js",
            scripts: {
              start: "node index.js",
            },
            dependencies: {
              "discord.js": "^14.14.1",
              dotenv: "^16.4.5",
            },
          },
          null,
          2
        ),
      },
      {
        path: "index.js",
        content: `const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(\`[DISCORD BOT] Conectado com sucesso como \${readyClient.user.tag}!\`);
  console.log(\`[DISCORD BOT] Servidores monitorados: \${readyClient.guilds.cache.size}\`);
  console.log('[DISCORD BOT] Cluster Eqsam PaaS operacional 24/7.');
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === '!ping') {
    const latency = Date.now() - message.createdTimestamp;
    await message.reply(\`🏓 Pong! Latência de resposta: \${latency}ms | WebSocket: \${Math.round(client.ws.ping)}ms\`);
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token || token === 'SEU_BOT_TOKEN_AQUI') {
  console.warn('[AVISO] DISCORD_TOKEN não configurado. Edite o arquivo .env ou adicione a variável nas configurações do painel.');
} else {
  client.login(token).catch((err) => {
    console.error('[ERRO DISCORD LOGIN]:', err.message);
  });
}
`,
      },
      {
        path: ".env",
        content: `DISCORD_TOKEN=SEU_BOT_TOKEN_AQUI\nCLIENT_ID=SEU_CLIENT_ID_AQUI\nNODE_ENV=production\n`,
      },
      {
        path: "commands/ping.js",
        content: `module.exports = {
  name: 'ping',
  description: 'Responde com Pong e a latência atual.',
  async execute(interaction) {
    await interaction.reply('🏓 Pong!');
  },
};
`,
      },
      {
        path: "discloud.config",
        content: `NAME=DiscordBot\nTYPE=bot\nMAIN=index.js\nRAM=512\nAUTORESTART=true\nVERSION=latest\n`,
      },
      {
        path: "README.md",
        content: `# 🤖 ${appName} — Discord Bot (Discord.js v14)

Bot configurado para execução contínua com auto-restart em caso de falhas.

### 🚀 Como Configurar:
1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications).
2. Crie uma aplicação, vá em **Bot** e copie o seu **Token**.
3. Abra o arquivo \`.env\` aqui no Editor de Código e cole o token em \`DISCORD_TOKEN=...\`.
4. Reinicie a aplicação pelo painel para conectar seu bot!

### 📁 Estrutura:
- \`index.js\`: Ponto de entrada e inicialização do cliente Discord.
- \`commands/\`: Módulos de comandos do bot.
- \`.env\`: Chaves e credenciais seguras.
- \`discloud.config\`: Configuração de runtime e inicialização.
`,
      },
    ];
  }

  // ==========================================
  // 3. EVOLUTION API (whatsapp-evolution)
  // ==========================================
  if (tid.includes("evolution")) {
    const rawEvoKey = customEnvs.find((e) => e.key === "AUTHENTICATION_API_KEY")?.value;
    const evoKey = rawEvoKey && !isInsecureOrPlaceholderValue("AUTHENTICATION_API_KEY", rawEvoKey)
      ? rawEvoKey
      : generateSecureRandomSecret("AUTHENTICATION_API_KEY");

    return [
      {
        path: ".env",
        content: `SERVER_PORT=8080\nAUTHENTICATION_API_KEY=${evoKey}\nDATABASE_ENABLED=false\nLOG_LEVEL=ERROR,WARN,INFO\n`,
      },
      {
        path: "README.md",
        content: `# 💬 ${appName} — Evolution API (WhatsApp)

API de automação para WhatsApp com Baileys hospedada no Cluster Eqsam.

### 🔑 Chaves de Acesso:
- **Porta HTTP:** \`8080\`
- **API Key Padrão:** Definida no arquivo \`.env\` (\`AUTHENTICATION_API_KEY\`).
- **Documentação Swagger:** Acesse a rota \`/docs\` do seu domínio.
`,
      },
    ];
  }

  // ==========================================
  // 4. PYTHON (Flask / FastAPI)
  // ==========================================
  if (tid.includes("python") || tid.includes("fastapi") || tid.includes("flask") || tid.includes("django")) {
    return [
      {
        path: "main.py",
        content: `import os
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="${appName}", version="1.0.0")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "${appName}",
        "engine": "Python FastAPI",
        "cluster": "Eqsam Cloud PaaS",
        "message": "Aplicação Python operando com sucesso!"
    }

@app.get("/health")
def health_check():
    return JSONResponse(content={"status": "healthy"}, status_code=200)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
`,
      },
      {
        path: "requirements.txt",
        content: `fastapi>=0.109.0\nuvicorn[standard]>=0.27.0\npydantic>=2.6.0\npython-dotenv>=1.0.0\n`,
      },
      {
        path: ".env",
        content: `PORT=8000\nPYTHONUNBUFFERED=1\nENVIRONMENT=production\n`,
      },
      {
        path: "README.md",
        content: `# 🐍 ${appName} — Python Backend (FastAPI / Uvicorn)

Microsserviço assíncrono em Python com documentação Swagger automática.

### 📁 Arquivos:
- \`main.py\`: Servidor FastAPI com rotas \`/\` e \`/health\`.
- \`requirements.txt\`: Dependências pip instaladas automaticamente no build.
- \`.env\`: Variáveis de ambiente e porta de execução.
`,
      },
    ];
  }

  // ==========================================
  // 5. NEXT.JS / REACT (nextjs-react-app)
  // ==========================================
  if (tid.includes("nextjs") || tid.includes("react")) {
    return [
      {
        path: "package.json",
        content: JSON.stringify(
          {
            name: "nextjs-app",
            version: "1.0.0",
            private: true,
            scripts: {
              dev: "next dev",
              build: "next build",
              start: "next start",
            },
            dependencies: {
              next: "^14.1.0",
              react: "^18.2.0",
              "react-dom": "^18.2.0",
            },
          },
          null,
          2
        ),
      },
      {
        path: "next.config.js",
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
};
module.exports = nextConfig;
`,
      },
      {
        path: "src/app/page.tsx",
        content: `export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem', textAlign: 'center', minHeight: '100vh', background: '#09090b', color: '#f4f4f5' }}>
      <h1>🚀 ${appName}</h1>
      <p>Aplicação Next.js 14 em execução no cluster Eqsam PaaS.</p>
    </main>
  );
}
`,
      },
      {
        path: "src/app/layout.tsx",
        content: `export const metadata = {
  title: '${appName}',
  description: 'Criado no Eqsam Cloud PaaS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
`,
      },
      {
        path: "README.md",
        content: `# ⚛️ ${appName} — Next.js 14 (App Router)

Aplicação React moderna com SSR e empacotamento Nixpacks.
`,
      },
    ];
  }

  // ==========================================
  // 6. PHP / LARAVEL (php-laravel-app)
  // ==========================================
  if (tid.includes("laravel") || tid.includes("php")) {
    const rawAppKey = customEnvs.find((e) => e.key === "APP_KEY")?.value;
    const appKey = rawAppKey && !isInsecureOrPlaceholderValue("APP_KEY", rawAppKey)
      ? rawAppKey
      : generateSecureRandomSecret("APP_KEY");

    return [
      {
        path: "composer.json",
        content: JSON.stringify(
          {
            name: "eqsam/laravel-app",
            type: "project",
            description: "Projeto PHP no Eqsam PaaS",
            require: {
              php: "^8.2",
            },
          },
          null,
          2
        ),
      },
      {
        path: "public/index.php",
        content: `<?php
define('LARAVEL_START', microtime(true));
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${appName} — PHP Online</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: grid; place-items: center; min-height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 500px; }
    h1 { color: #f43f5e; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 PHP 8.3 Online!</h1>
    <p>Diretório raiz <code>/var/www/html</code> provisionado com sucesso.</p>
  </div>
</body>
</html>
`,
      },
      {
        path: ".htaccess",
        content: `<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/public/
    RewriteRule ^(.*)$ /public/$1 [L,QSA]
</IfModule>
`,
      },
      {
        path: ".env.example",
        content: `APP_NAME="${appName}"\nAPP_ENV=production\nAPP_KEY=${appKey}\nAPP_DEBUG=false\nAPP_URL=http://localhost\n`,
      },
      {
        path: "README.md",
        content: `# 🐘 ${appName} — PHP 8.3 / Laravel\n\nAmbiente PHP corporativo no diretório \`/var/www/html\`.\n`,
      },
    ];
  }

  // ==========================================
  // 7. N8N WORKFLOW AUTOMATION (n8n-automation)
  // ==========================================
  if (tid.includes("n8n")) {
    return [
      {
        path: ".env",
        content: `N8N_PORT=5678\nGENERIC_TIMEZONE=America/Sao_Paulo\nN8N_METRICS=true\nN8N_LOG_LEVEL=info\n`,
      },
      {
        path: "workflows/sample-webhook-flow.json",
        content: JSON.stringify(
          {
            name: "Exemplo de Webhook Eqsam",
            nodes: [
              {
                parameters: { path: "webhook-teste", responseMode: "onReceived" },
                name: "Webhook",
                type: "n8n-nodes-base.webhook",
                typeVersion: 1,
                position: [250, 300],
              },
            ],
            connections: {},
          },
          null,
          2
        ),
      },
      {
        path: "README.md",
        content: `# ⚡ ${appName} — N8N Workflow Automation

Instância N8N no cluster Eqsam PaaS.

- **Diretório de Dados:** \`/home/node/.n8n\`
- **Porta Padrão:** \`5678\`
- **Workflows:** Salvos na pasta \`workflows/\`.
`,
      },
    ];
  }

  // ==========================================
  // 7.5 FLOWISE AI (flowise-ai)
  // ==========================================
  if (tid.includes("flowise")) {
    return [
      {
        path: "README.md",
        content: `# 🤖 ${appName} — Flowise AI

Plataforma visual drag-and-drop de fluxos de inteligência artificial e chatbots no cluster Eqsam PaaS.

- **Diretório de Dados:** \`/root/.flowise\`
- **Porta:** \`3000\`
- **Banco Embutido:** SQLite (\`/root/.flowise/database.sqlite\`)
- **Compatibilidade:** OpenAI, Claude (Anthropic), Ollama, Llama 3, LangChain, WhatsApp e Webhooks.
`,
      },
    ];
  }

  // ==========================================
  // 7.6 NOCODB (nocodb-airtable)
  // ==========================================
  if (tid.includes("nocodb")) {
    return [
      {
        path: "README.md",
        content: `# 📊 ${appName} — NocoDB (Smart Spreadsheet)

Alternativa open-source ao Airtable no cluster Eqsam PaaS.

- **Diretório de Dados:** \`/usr/app/data\`
- **Porta:** \`8080\`
- **Banco Embutido:** SQLite (\`/usr/app/data/noco.db\`)
- **Recursos:** Tabelas inteligentes, Kanban, formulários públicos e APIs REST geradas automaticamente.
`,
      },
    ];
  }

  // ==========================================
  // 7.7 VAULTWARDEN (vaultwarden-server)
  // ==========================================
  if (tid.includes("vaultwarden") || tid.includes("vault")) {
    return [
      {
        path: "README.md",
        content: `# 🛡️ ${appName} — Vaultwarden (Cofre Bitwarden)

Servidor de senhas e dados criptografados compatível com Bitwarden no cluster Eqsam PaaS.

- **Diretório de Dados:** \`/data\`
- **Porta:** \`80\`
- **Compatibilidade:** Aplicativos oficiais Bitwarden (Android, iOS, extensões de Chrome/Firefox/Edge e Desktop).
- **Segurança:** Criptografia de ponta a ponta (Zero-Knowledge).
`,
      },
    ];
  }

  // ==========================================
  // 8. SITE ESTÁTICO (static-html-landing)
  // ==========================================
  if (tid.includes("static")) {
    return [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} — Online</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="container">
    <div class="badge">🚀 Cluster Eqsam PaaS</div>
    <h1>${appName}</h1>
    <p>Seu site estático com Caddy Server, HTTP/3 e compressão Zstandard está pronto.</p>
    <a href="#" class="btn" id="btnAction">Começar Agora</a>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #09090b;
  color: #f4f4f5;
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
}
.container {
  text-align: center;
  padding: 3rem;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 1.5rem;
  max-width: 540px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 1rem;
}
h1 {
  font-size: 2rem;
  margin: 0 0 1rem;
  color: #ffffff;
}
p {
  color: #a1a1aa;
  line-height: 1.6;
  margin-bottom: 2rem;
}
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #0ea5e9;
  color: #ffffff;
  text-decoration: none;
  border-radius: 0.75rem;
  font-weight: 600;
  transition: opacity 0.2s;
}
.btn:hover {
  opacity: 0.9;
}
`,
      },
      {
        path: "script.js",
        content: `console.log("[Eqsam PaaS] ${appName} carregado com sucesso!");
document.getElementById("btnAction")?.addEventListener("click", (e) => {
  e.preventDefault();
  alert("🎉 Aplicação ativa e pronta para edição no Gerenciador de Arquivos!");
});
`,
      },
      {
        path: "Caddyfile",
        content: `:80 {\n\troot * /var/www/html\n\tfile_server\n\tencode zstd gzip\n\ttry_files {path} /index.html\n}\n`,
      },
      {
        path: "README.md",
        content: `# 🌐 ${appName} — Site Estático com Servidor Caddy\n\nDiretório raiz: \`/var/www/html\`.\n`,
      },
    ];
  }

  // ==========================================
  // 9. FALLBACK PADRÃO PARA BOTS / NODE.JS
  // ==========================================
  return [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: appName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          version: "1.0.0",
          main: "index.js",
          scripts: {
            start: "node index.js",
          },
          dependencies: {
            dotenv: "^16.4.5",
          },
        },
        null,
        2
      ),
    },
    {
      path: "index.js",
      content: `require('dotenv').config();\nconsole.log('[EQSAM PAAS] Aplicação ${appName} iniciada com sucesso em /app!');\nsetInterval(() => {\n  console.log('[HEARTBEAT] ' + new Date().toISOString() + ' — Operação normal.');\n}, 30000);\n`,
    },
    {
      path: ".env",
      content: `NODE_ENV=production\nAPP_NAME="${appName}"\n`,
    },
    {
      path: "README.md",
      content: `# 🚀 ${appName}\n\nAplicação provisionada no diretório canônico \`/app\`.\n`,
    },
  ];
}

/**
 * Realiza o scaffolding físico no filesystem real da aplicação.
 * Se cleanMismatched for verdadeiro, remove arquivos conflitantes de outros modelos
 * (como Caddyfile/index.html em apps de WordPress ou Bots).
 */
export async function scaffoldTemplateFiles(
  clientRoot: string,
  templateId: string,
  appName: string = "Aplicação",
  customEnvs: Array<{ key: string; value: string }> = [],
  options: { cleanMismatched?: boolean } = {}
): Promise<void> {
  const isWp = templateId.toLowerCase().includes("wordpress");
  const isBotOrApi =
    templateId.toLowerCase().includes("bot") ||
    templateId.toLowerCase().includes("python") ||
    templateId.toLowerCase().includes("fastapi") ||
    templateId.toLowerCase().includes("evolution");

  // Se solicitado, limpar arquivos incompatíveis de modelos antigos
  if (options.cleanMismatched) {
    if (isWp || isBotOrApi) {
      const forbiddenInNonStatic = ["Caddyfile", "styles.css"];
      if (isBotOrApi) forbiddenInNonStatic.push("index.html");
      for (const f of forbiddenInNonStatic) {
        const full = path.join(clientRoot, f);
        if (fsSync.existsSync(full)) {
          try {
            await fs.unlink(full);
          } catch (e) {}
        }
      }
    }
    if (!isWp) {
      const forbiddenInNonWp = ["wp-config.php", ".htaccess"];
      for (const f of forbiddenInNonWp) {
        const full = path.join(clientRoot, f);
        if (fsSync.existsSync(full)) {
          try {
            await fs.unlink(full);
          } catch (e) {}
        }
      }
    }
  }

  const starterFiles = getTemplateStarterFiles(templateId, appName, customEnvs);

  for (const item of starterFiles) {
    const fullPath = path.join(clientRoot, item.path);
    const dir = path.dirname(fullPath);

    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Se o arquivo for .gitkeep ou se o arquivo ainda não existir, cria
    if (!fsSync.existsSync(fullPath) || options.cleanMismatched) {
      // Se options.cleanMismatched e o arquivo já existe e tem conteúdo de usuário, não sobrescrever se for wp-config ou .env
      const isSensitiveExisting =
        fsSync.existsSync(fullPath) &&
        (item.path === "wp-config.php" || item.path === ".env" || item.path === "index.php");

      if (!isSensitiveExisting) {
        await fs.writeFile(fullPath, item.content, "utf-8");
      }
    }
  }
}
