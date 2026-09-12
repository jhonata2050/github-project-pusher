# Catálogo dos 21 Templates & Validação de Disco

O **Painel EQSAM** acompanha um catálogo pré-otimizado com **21 templates prontos para produção**, abrangendo desde landing pages ultra-rápidas até microsserviços corporativos, bancos de dados e ferramentas de automação no **Docker Swarm**.

---

## 🛡️ Regra da Margem de Segurança de Disco (+20%)

Cada aplicação possui uma exigência de armazenamento base (`recommended_disk`) necessária para acomodar:
1. As camadas da imagem Docker puxadas do registry.
2. Os binários compilados e módulos (`node_modules`, dependências do Python, Composer, etc.).
3. O crescimento inicial de dados locais e arquivos de log.

Para garantir que o cliente nunca contrate um plano subdimensionado que resulte em travamentos ou contêineres corrompidos, o sistema aplica obrigatoriamente uma **margem de segurança de 20%**:

$$\text{Disco Exigido (MB)} = \left\lceil \text{recommended\_disk} \times 1{,}20 \right\rceil$$

---

## 📋 Tabela Técnica Completa dos 21 Templates

| # | Nome do Template & ID | Categoria | Build Pack / Runtime | Porta | RAM Mínima | CPU Mínima | Disco Base | Disco com Margem (+20%) |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **01** | **Site Estático Caddy HTTP/3**<br>`static-html-landing` | Websites | Static / Caddy | 80 | 256 MB | 0.2 vCPU | 512 MB | **615 MB** (0.6 GB) |
| **02** | **WordPress + MySQL**<br>`wordpress-litespeed` | Websites | Dockerfile / PHP | 80 | 1024 MB | 1.0 vCPU | 3.072 MB | **3.687 MB** (3.6 GB) |
| **03** | **Next.js / React SSR**<br>`nextjs-react-app` | Websites | Nixpacks / NEXTJS | 3000 | 512 MB | 0.5 vCPU | 1.536 MB | **1.844 MB** (1.8 GB) |
| **04** | **Ghost CMS & Newsletters**<br>`ghost-cms` | Websites | Nixpacks / NODE | 2368 | 1024 MB | 1.0 vCPU | 2.048 MB | **2.458 MB** (2.4 GB) |
| **05** | **PHP 8.3 / Laravel**<br>`php-laravel-app` | Languages | Nixpacks / PHP | 8000 | 512 MB | 0.5 vCPU | 1.024 MB | **1.229 MB** (1.2 GB) |
| **06** | **Python (Django & Flask)**<br>`python-django-flask` | Languages | Nixpacks / PYTHON | 5000 | 512 MB | 0.5 vCPU | 1.024 MB | **1.229 MB** (1.2 GB) |
| **07** | **Go / Golang (Fiber & Gin)**<br>`golang-fiber-gin` | Languages | Nixpacks / NODE | 3000 | 256 MB | 0.5 vCPU | 512 MB | **615 MB** (0.6 GB) |
| **08** | **Java 21 / Spring Boot 3**<br>`java-spring-boot` | Languages | Nixpacks / DOCKER | 8080 | 1024 MB | 1.0 vCPU | 2.048 MB | **2.458 MB** (2.4 GB) |
| **09** | **Rust (Actix & Axum)**<br>`rust-actix-web` | Languages | Nixpacks / DOCKER | 8080 | 256 MB | 0.5 vCPU | 512 MB | **615 MB** (0.6 GB) |
| **10** | **Evolution API (WhatsApp)**<br>`whatsapp-evolution` | Bots | Dockerfile / NODE | 8080 | 1536 MB | 1.0 vCPU | 2.048 MB | **2.458 MB** (2.4 GB) |
| **11** | **Discord Bot (Discord.js)**<br>`discord-bot-starter` | Bots | Nixpacks / NODE | 3000 | 512 MB | 0.5 vCPU | 512 MB | **615 MB** (0.6 GB) |
| **12** | **Typebot (Criador de Chatbots)**<br>`typebot-viewer` | Bots | Dockerfile / NODE | 3000 | 2048 MB | 1.5 vCPU | 3.584 MB | **4.301 MB** (4.2 GB) |
| **13** | **N8N Workflow Automation**<br>`n8n-automation` | Automations | Dockerfile / NODE | 5678 | 2048 MB | 1.5 vCPU | 2.560 MB | **3.072 MB** (3.0 GB) |
| **14** | **Uptime Kuma (Monitor)**<br>`uptime-kuma` | Tools | Dockerfile / NODE | 3001 | 512 MB | 0.5 vCPU | 1.024 MB | **1.229 MB** (1.2 GB) |
| **15** | **OpenStatus (Monitor & Status Page)**<br>`openstatus-monitor` | Tools | Dockerfile / DOCKER | 3000 | 1024 MB | 1.0 vCPU | 7.168 MB | **8.602 MB** (8.4 GB) |
| **16** | **Fastify REST API Starter**<br>`fastify-api-starter` | APIs | Nixpacks / NODE | 3000 | 512 MB | 0.5 vCPU | 512 MB | **615 MB** (0.6 GB) |
| **17** | **Python FastAPI Backend**<br>`python-fastapi` | APIs | Nixpacks / PYTHON | 8000 | 512 MB | 0.5 vCPU | 512 MB | **615 MB** (0.6 GB) |
| **18** | **PostgreSQL Database**<br>`postgresql-db` | Databases | Dockerfile / DOCKER | 5432 | 512 MB | 0.5 vCPU | 1.536 MB | **1.844 MB** (1.8 GB) |
| **19** | **MySQL Database**<br>`mysql-db` | Databases | Dockerfile / DOCKER | 3306 | 512 MB | 0.5 vCPU | 1.536 MB | **1.844 MB** (1.8 GB) |
| **20** | **Redis Cache & Broker**<br>`redis-standalone` | Databases | Dockerfile / DOCKER | 6379 | 512 MB | 0.5 vCPU | 512 MB | **615 MB** (0.6 GB) |
| **21** | **PocketBase (Backend em 1 Arquivo)**<br>`pocketbase-backend` | Databases | Dockerfile / DOCKER | 8090 | 512 MB | 0.5 vCPU | 512 MB | **615 MB** (0.6 GB) |

---

## 🔧 Variáveis Padrão por Template

Ao selecionar qualquer template, o painel inicializa automaticamente o formulário de variáveis de ambiente (`default_envs`) com chaves essenciais:

- **WordPress:** `WORDPRESS_DB_USER`, `WORDPRESS_DB_PASSWORD`, `WORDPRESS_DB_NAME`.
- **N8N:** `N8N_PORT`, `GENERIC_TIMEZONE=America/Sao_Paulo`, `N8N_METRICS=true`, `N8N_ENCRYPTION_KEY`.
- **Evolution API:** `SERVER_PORT=8080`, `AUTHENTICATION_API_KEY`, `DATABASE_ENABLED=false`.
- **Typebot:** `POSTGRES_PASSWORD`, `ENCRYPTION_SECRET`.
- **PostgreSQL / MySQL:** `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (geradas criptograficamente pelo painel).
- **OpenStatus:** `RESEND_API_KEY`, `ADMIN_EMAIL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_URL`.
