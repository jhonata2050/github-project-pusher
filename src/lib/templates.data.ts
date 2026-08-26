export interface AppTemplate {
  id: string;
  name: string;
  category: "websites" | "bots" | "automations" | "apis" | "languages" | "databases" | "tools" | "cms";
  icon: string;
  description: string;
  build_pack: "nixpacks" | "dockerfile" | "dockercompose" | "static";
  git_repository: string;
  git_branch: string;
  recommended_ram: number; // MB
  recommended_cpu: number; // vCPU
  default_port: number;
  start_command?: string;
  tags: string[];
  default_envs: Array<{ key: string; value: string; is_build_time?: boolean }>;
}

export const APP_TEMPLATES: AppTemplate[] = [
  // ==========================================
  // 1. SITES, CMS & LANDING PAGES (CADDY & NGINX)
  // ==========================================
  {
    id: "static-html-landing",
    name: "Site Estático (Caddy Server HTTP/3)",
    category: "websites",
    icon: "https://cdn.simpleicons.org/caddy/00ADD8",
    description: "Servidor Caddy moderno em Go com suporte nativo a HTTP/3 (QUIC), compressão Zstandard/Gzip e velocidade máxima para Landing Pages HTML/CSS/JS.",
    build_pack: "static",
    git_repository: "https://github.com/coollabsio/coolify-examples",
    git_branch: "main",
    recommended_ram: 256,
    recommended_cpu: 0.2,
    default_port: 80,
    tags: ["Caddy", "HTML", "CSS", "Landing Page", "HTTP/3", "Estático"],
    default_envs: [],
  },
  {
    id: "wordpress-litespeed",
    name: "WordPress + MySQL",
    category: "websites",
    icon: "https://cdn.simpleicons.org/wordpress/21759B",
    description: "O CMS mais popular do mundo para sites institucionais, blogs, lojas WooCommerce e portais com banco de dados MySQL integrado e SSL.",
    build_pack: "dockerfile",
    git_repository: "https://github.com/WordPress/WordPress",
    git_branch: "master",
    recommended_ram: 1024,
    recommended_cpu: 1.0,
    default_port: 80,
    tags: ["WordPress", "CMS", "Sites", "PHP", "WooCommerce"],
    default_envs: [
      { key: "WORDPRESS_DB_USER", value: "wordpress" },
      { key: "WORDPRESS_DB_PASSWORD", value: "eqsam_wp_pass_123" },
      { key: "WORDPRESS_DB_NAME", value: "wordpress" },
    ],
  },
  {
    id: "nextjs-react-app",
    name: "Next.js / React (SSR & Estático)",
    category: "websites",
    icon: "https://cdn.simpleicons.org/nextdotjs/000000",
    description: "Framework React #1 para aplicações web modernas, Server-Side Rendering (SSR), Landing Pages interativas e sistemas web com TypeScript.",
    build_pack: "nixpacks",
    git_repository: "https://github.com/vercel/nextjs-portfolio-starter",
    git_branch: "main",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 3000,
    start_command: "npx next start -H 0.0.0.0 -p 3000",
    tags: ["Next.js", "React", "TypeScript", "Frontend", "SSR"],
    default_envs: [
      { key: "HOSTNAME", value: "0.0.0.0" },
      { key: "HOST", value: "0.0.0.0" },
      { key: "PORT", value: "3000" },
      { key: "NODE_ENV", value: "production" },
    ],
  },
  {
    id: "ghost-cms",
    name: "Ghost CMS (Blog & Newsletters)",
    category: "websites",
    icon: "https://cdn.simpleicons.org/ghost/738A9C",
    description: "Plataforma premium e elegante para publicações, blogs profissionais e newsletters pagas em Node.js com altíssima velocidade.",
    build_pack: "nixpacks",
    git_repository: "https://github.com/TryGhost/Ghost",
    git_branch: "main",
    recommended_ram: 1024,
    recommended_cpu: 1.0,
    default_port: 2368,
    tags: ["Ghost", "Blog", "Newsletters", "CMS", "Node.js"],
    default_envs: [
      { key: "NODE_ENV", value: "production" },
      { key: "url", value: "http://localhost:2368" },
    ],
  },

  // ==========================================
  // 2. PRINCIPAIS LINGUAGENS & STACKS
  // ==========================================
  {
    id: "php-laravel-app",
    name: "PHP 8.3 / Laravel",
    category: "languages",
    icon: "https://cdn.simpleicons.org/laravel/FF2D20",
    description: "Framework PHP mais utilizado do mercado com Composer, suporte a rotas, Eloquent ORM, filas e servidor de alta performance.",
    build_pack: "nixpacks",
    git_repository: "https://github.com/laravel/laravel",
    git_branch: "11.x",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 8000,
    tags: ["PHP", "Laravel", "Composer", "Web App", "API"],
    default_envs: [
      { key: "APP_ENV", value: "production" },
      { key: "APP_DEBUG", value: "false" },
      { key: "APP_KEY", value: "base64:eqsam_laravel_placeholder_key=" },
    ],
  },
  {
    id: "python-django-flask",
    name: "Python (Django & Flask)",
    category: "languages",
    icon: "https://cdn.simpleicons.org/python/3776AB",
    description: "Stack completa para aplicações web corporativas e APIs em Python com Gunicorn, WSGI e banco de dados relacional.",
    build_pack: "nixpacks",
    git_repository: "https://github.com/pallets/flask",
    git_branch: "main",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 5000,
    tags: ["Python", "Django", "Flask", "Gunicorn", "Web App"],
    default_envs: [
      { key: "PORT", value: "5000" },
      { key: "PYTHONUNBUFFERED", value: "1" },
    ],
  },
  {
    id: "golang-fiber-gin",
    name: "Go / Golang (Fiber & Gin)",
    category: "languages",
    icon: "https://cdn.simpleicons.org/go/00ADD8",
    description: "Microsserviços e APIs compiladas em Golang de altíssima concorrência com consumo mínimo de memória RAM (a partir de 128MB).",
    build_pack: "nixpacks",
    git_repository: "https://github.com/gofiber/fiber",
    git_branch: "master",
    recommended_ram: 256,
    recommended_cpu: 0.5,
    default_port: 3000,
    tags: ["Go", "Golang", "Fiber", "Gin", "Microsserviço"],
    default_envs: [
      { key: "PORT", value: "3000" },
    ],
  },
  {
    id: "java-spring-boot",
    name: "Java 21 / Spring Boot 3",
    category: "languages",
    icon: "https://cdn.simpleicons.org/spring/6DB33F",
    description: "Framework empresarial líder para microsserviços robustos e arquitetura corporativa em Java moderno com Gradle ou Maven.",
    build_pack: "nixpacks",
    git_repository: "https://github.com/spring-projects/spring-boot",
    git_branch: "main",
    recommended_ram: 1024,
    recommended_cpu: 1.0,
    default_port: 8080,
    tags: ["Java", "Spring Boot", "JVM", "Corporativo", "API"],
    default_envs: [
      { key: "SERVER_PORT", value: "8080" },
    ],
  },
  {
    id: "rust-actix-web",
    name: "Rust (Actix Web & Axum)",
    category: "languages",
    icon: "https://cdn.simpleicons.org/rust/DEA584",
    description: "O auge da velocidade e eficiência. APIs em Rust sem garbage collector com latência em microsegundos e consumo mínimo de hardware.",
    build_pack: "nixpacks",
    git_repository: "https://github.com/actix/actix-web",
    git_branch: "master",
    recommended_ram: 256,
    recommended_cpu: 0.5,
    default_port: 8080,
    tags: ["Rust", "Actix", "Axum", "Ultra-Rápido", "Backend"],
    default_envs: [
      { key: "PORT", value: "8080" },
    ],
  },

  // ==========================================
  // 3. BOTS & ATENDIMENTO
  // ==========================================
  {
    id: "whatsapp-evolution",
    name: "Evolution API (WhatsApp)",
    category: "bots",
    icon: "https://cdn.simpleicons.org/whatsapp/25D366",
    description: "API completa e profissional para automação de WhatsApp com suporte a Baileys, Chatwoot, N8N e webhooks.",
    build_pack: "dockerfile",
    git_repository: "https://github.com/EvolutionAPI/evolution-api",
    git_branch: "main",
    recommended_ram: 1536,
    recommended_cpu: 1.0,
    default_port: 8080,
    tags: ["WhatsApp", "Evolution API", "Chatbot", "Node.js"],
    default_envs: [
      { key: "SERVER_PORT", value: "8080" },
      { key: "AUTHENTICATION_API_KEY", value: "eqsam_api_secret_key_12345" },
      { key: "DATABASE_ENABLED", value: "false" },
    ],
  },
  {
    id: "discord-bot-starter",
    name: "Discord Bot (Discord.js)",
    category: "bots",
    icon: "https://cdn.simpleicons.org/discord/5865F2",
    description: "Template inicial pronto para criar bots no Discord com comandos slash (/), TypeScript e Discord.js v14.",
    build_pack: "nixpacks",
    git_repository: "https://github.com/discordjs/discord.js",
    git_branch: "main",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 3000,
    tags: ["Discord", "Bot", "TypeScript", "Node.js"],
    default_envs: [
      { key: "DISCORD_TOKEN", value: "SEU_BOT_TOKEN_AQUI" },
      { key: "CLIENT_ID", value: "SEU_CLIENT_ID" },
      { key: "NODE_ENV", value: "production" },
    ],
  },
  {
    id: "typebot-viewer",
    name: "Typebot (Criador de Chatbots)",
    category: "bots",
    icon: "https://raw.githubusercontent.com/baptisteArno/typebot.io/main/apps/builder/public/favicon.svg",
    description: "Criador de chatbots interativos de alta conversão para sites, WhatsApp e atendimento com design moderno.",
    build_pack: "dockerfile",
    git_repository: "https://github.com/baptisteArno/typebot.io",
    git_branch: "main",
    recommended_ram: 2048,
    recommended_cpu: 1.5,
    default_port: 3000,
    tags: ["Typebot", "Chatbot", "Conversão", "WhatsApp"],
    default_envs: [
      { key: "PORT", value: "3000" },
      { key: "NODE_ENV", value: "production" },
    ],
  },

  // ==========================================
  // 4. AUTOMAÇÕES & FERRAMENTAS
  // ==========================================
  {
    id: "n8n-automation",
    name: "N8N Workflow Automation",
    category: "automations",
    icon: "https://cdn.simpleicons.org/n8n/EA4B71",
    description: "Plataforma líder em automação de fluxos de trabalho self-hosted com mais de 400 integrações (estilo Zapier / Make).",
    build_pack: "dockerfile",
    git_repository: "https://github.com/n8n-io/n8n",
    git_branch: "master",
    recommended_ram: 2048,
    recommended_cpu: 1.5,
    default_port: 5678,
    tags: ["N8N", "No-Code", "Automação", "Webhooks"],
    default_envs: [
      { key: "N8N_PORT", value: "5678" },
      { key: "GENERIC_TIMEZONE", value: "America/Sao_Paulo" },
      { key: "N8N_METRICS", value: "true" },
    ],
  },
  {
    id: "uptime-kuma",
    name: "Uptime Kuma (Monitor de Status)",
    category: "tools",
    icon: "https://cdn.simpleicons.org/uptimekuma/5CD796",
    description: "Ferramenta self-hosted para monitorar sites, portas, ping e enviar alertas no WhatsApp, Discord e Telegram.",
    build_pack: "dockerfile",
    git_repository: "https://github.com/louislam/uptime-kuma",
    git_branch: "master",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 3001,
    tags: ["Monitor", "Uptime", "Ping", "Alertas"],
    default_envs: [
      { key: "PORT", value: "3001" },
    ],
  },

  // ==========================================
  // 5. APIS & BACKEND
  // ==========================================
  {
    id: "fastify-api-starter",
    name: "Fastify / Express REST API",
    category: "apis",
    icon: "https://cdn.simpleicons.org/fastify/000000",
    description: "Estrutura moderna de API Node.js ultrarrápida com TypeScript, validação Zod e Swagger automático.",
    build_pack: "nixpacks",
    git_repository: "https://github.com/fastify/fastify",
    git_branch: "main",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 3000,
    tags: ["Fastify", "Node.js", "REST API", "Backend"],
    default_envs: [
      { key: "PORT", value: "3000" },
      { key: "NODE_ENV", value: "production" },
    ],
  },
  {
    id: "python-fastapi",
    name: "Python FastAPI Backend",
    category: "apis",
    icon: "https://cdn.simpleicons.org/fastapi/009688",
    description: "Microsserviço Python assíncrono de altíssima performance com documentação Swagger / OpenAPI nativa.",
    build_pack: "nixpacks",
    git_repository: "https://github.com/tiangolo/fastapi",
    git_branch: "master",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 8000,
    tags: ["Python", "FastAPI", "Uvicorn", "Swagger"],
    default_envs: [
      { key: "PORT", value: "8000" },
      { key: "PYTHONUNBUFFERED", value: "1" },
    ],
  },

  // ==========================================
  // 6. BANCOS DE DADOS
  // ==========================================
  {
    id: "postgresql-db",
    name: "PostgreSQL Database",
    category: "databases",
    icon: "https://cdn.simpleicons.org/postgresql/4169E1",
    description: "O banco de dados relacional e relacional-objeto mais avançado e confiável do mundo para aplicações modernas.",
    build_pack: "dockerfile",
    git_repository: "https://github.com/docker-library/postgres",
    git_branch: "master",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 5432,
    tags: ["PostgreSQL", "Postgres", "SQL", "Relacional", "Database"],
    default_envs: [
      { key: "POSTGRES_DB", value: "main" },
      { key: "POSTGRES_USER", value: "postgres" },
      { key: "POSTGRES_PASSWORD", value: "eqsam_postgres_pass_123" },
    ],
  },
  {
    id: "mysql-db",
    name: "MySQL Database",
    category: "databases",
    icon: "https://cdn.simpleicons.org/mysql/4479A1",
    description: "O sistema gerenciador de banco de dados relacional mais popular do mundo, ideal para WordPress, Laravel e sistemas web.",
    build_pack: "dockerfile",
    git_repository: "https://github.com/docker-library/mysql",
    git_branch: "master",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 3306,
    tags: ["MySQL", "SQL", "Database", "Relacional", "Web"],
    default_envs: [
      { key: "MYSQL_DATABASE", value: "main" },
      { key: "MYSQL_USER", value: "dbuser" },
      { key: "MYSQL_PASSWORD", value: "eqsam_mysql_pass_123" },
      { key: "MYSQL_ROOT_PASSWORD", value: "eqsam_root_pass_123" },
    ],
  },
  {
    id: "redis-standalone",
    name: "Redis Cache & Broker",
    category: "databases",
    icon: "https://cdn.simpleicons.org/redis/DC382D",
    description: "Banco de dados em memória ultrarrápido para filas, pub/sub, cache de sessões e alta velocidade.",
    build_pack: "dockerfile",
    git_repository: "https://github.com/redis/redis",
    git_branch: "7.2",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 6379,
    tags: ["Redis", "Cache", "PubSub", "Filas"],
    default_envs: [
      { key: "REDIS_PORT", value: "6379" },
    ],
  },
  {
    id: "pocketbase-backend",
    name: "PocketBase (Backend em 1 Arquivo)",
    category: "databases",
    icon: "https://cdn.simpleicons.org/pocketbase/B8DBE4",
    description: "Backend completo em Golang com banco SQLite em tempo real, autenticação de usuários e painel administrativo.",
    build_pack: "dockerfile",
    git_repository: "https://github.com/pocketbase/pocketbase",
    git_branch: "master",
    recommended_ram: 512,
    recommended_cpu: 0.5,
    default_port: 8090,
    tags: ["PocketBase", "SQLite", "Realtime", "Go"],
    default_envs: [
      { key: "PORT", value: "8090" },
    ],
  },
];
