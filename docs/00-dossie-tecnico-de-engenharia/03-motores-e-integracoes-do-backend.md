# Dossiê Técnico 03: Motores e Integrações do Backend

Este documento disseca a arquitetura interna dos 6 motores de execução e integração que compõem o núcleo de backend do **EQSAM Painel**, explicitando regras de segurança, tratamento de erros, estratégias de resiliência e contratos de interface.

---

## 💳 1. Motor de Pagamentos & Webhooks (`src/lib/payments.server.ts` & `webhooks/*`)

### 1.1. Arquitetura de Confirmação Ativa (Anti-Fraude)
O sistema opera sob o princípio de **Zero Confiança no Payload Bruto**: nenhum webhook baixa faturas ou ativa serviços baseando-se unicamente nas informações enviadas no corpo da requisição HTTP.

```
[ Gateway de Pagamento ]
         │ Notificação POST (Webhook)
         ▼
[ Endpoint do Webhook ]
         │ Extrai ID da transação
         │ Consulta API Oficial do Gateway (GET)
         ▼
[ API Oficial do Gateway ]
         │ Retorna status verificado criptograficamente
         ▼
[ Validador de Status ] ─── Se NÃO for 'approved' / 'paid' ───► Ignora / Log de Auditoria
         │
         │ Se status === 'approved' / 'paid'
         ▼
[ Motor Financeiro ] ───► Baixa Fatura (`invoices.status = 'paid'`)
         │
         ▼
[ Motor de Provisionamento ] ───► Ativa/Desbloqueia Serviço (`services.status = 'active'`)
```

### 1.2. Regras Específicas por Gateway
- **Mercado Pago (`mercadopago.ts`):**
  - O evento `payment.created` é emitido quando o QR Code Pix é gerado, com status `pending`. Este evento é estritamente ignorado.
  - Ao receber a notificação com ID de pagamento, o servidor consulta `https://api.mercadopago.com/v1/payments/:id` com o Bearer Token obtido de `system_settings` (`mercadopago_access_token`). Apenas o status `approved` dispara a baixa.
- **Woovi / OpenPix (`woovi.ts`):**
  - Ignora `OPENPIX:CHARGE_CREATED`.
  - Processa apenas `OPENPIX:CHARGE_COMPLETED` e `OPENPIX:TRANSACTION_RECEIVED`.
- **PagHiper (`paghiper.ts`):**
  - Consulta credenciais `paghiper_api_key` e `paghiper_token` no banco.
  - Realiza requisição de confirmação POST em `https://pix.paghiper.com/invoice/notification/` ou `https://api.paghiper.com/transaction/notification/`. Baixa somente mediante `status === 'paid'`.
- **Stripe (`stripe.ts`):**
  - Valida o cabeçalho `stripe-signature` com o `stripe_webhook_secret`. Processa `checkout.session.completed`.

---

## 🌐 2. Motor DirectAdmin (`src/lib/directadmin.server.ts`)

### 2.1. Criação e Provisionamento de Contas
- Utiliza a API nativa do DirectAdmin (`CMD_API_ACCOUNT_USER`).
- Mapeia pacotes do painel para o nome do pacote configurado no servidor DirectAdmin.
- Salva o usuário e senha gerados no registro de `public.services`.

### 2.2. Autenticação Única (SSO com Um Clique)
- Não expõe a senha mestre do admin nem exige que o cliente digite credenciais.
- Utiliza o comando `CMD_API_LOGIN_KEYS` do DirectAdmin:
  1. Cria uma chave de sessão temporária de uso único (`one-time-key`) com expiração curta (60 segundos).
  2. Redireciona o navegador do cliente diretamente para a URL de login do servidor com a chave gerada.

### 2.3. Tratamento de Bloqueios de Segurança
- Caso o servidor DirectAdmin retorne erro de bloqueio de segurança ou IP restrito, o serviço armazena o status no campo `suspension_reason: 'BLOCK_DIRECTADMIN: Motivo do Bloqueio'`.
- A interface de usuário reconhece o prefixo `BLOCK_DIRECTADMIN` e exibe um badge visual de alerta e orientações para o cliente.

---

## 🖥️ 3. Motor VPS Contabo (`src/lib/contabo.server.ts` & `src/lib/vps.functions.ts`)

### 3.1. Provisionamento Assíncrono
- Conecta-se à API Contabo (OAuth2 Bearer Token).
- Busca especificações do plano e sabor (`vpsFlavor`) a partir de `product.slug` ou especificações da VPS.
- Registra a instância em `public.vps_instances` com status inicial `provisioning`.

### 3.2. Telemetria e Coleta de Métricas
- O agente instalado na máquina cliente via script bash (`install-agent.ts`) envia métricas periódicas para `/api/public/vps-metrics`.
- **Resiliência:** As métricas são gravadas na tabela `system_settings` sob a chave `vps_metrics_{vps_id}` com timestamp de coleta, garantindo que o dashboard de gráficos continue operando perfeitamente mesmo na ausência de tabelas de séries temporais complexas.

---

## 🐳 4. Motor Docker Swarm & Caddy PaaS (`src/lib/swarm-cluster.server.ts` & `src/lib/cloud-apps.server.ts`)

### 4.1. Catálogo dos 21 Templates de Aplicação
- Suporte a Node.js, Python, PHP, Ruby, Go, Rust, Java, Dockerfile customizado, WordPress, Ghost, n8n, Evolution API, Typebot, Chatwoot, PostgreSQL, MySQL, Redis, MongoDB, RabbitMQ, Uptime Kuma e MinIO.
- Cada template define portas expostas, volumes persistentes e variáveis de ambiente obrigatórias.

### 4.2. Roteamento Reverso e Certificados SSL
- O tráfego HTTP/HTTPS é interceptado pelo Traefik / Caddy no nó gerente do Swarm.
- Labels automáticas do Docker Swarm configuram roteamento de subdomínios (ex: `app-nome.eqsam.cloud`) e emissão automática de certificados SSL via Let's Encrypt / ZeroSSL.

### 4.3. Pool de Conexões SSH
- Conexões administrativas aos nós do Swarm são gerenciadas por `ssh-connection-manager.server.ts`.
- Mantém conexões autenticadas por chave privada RSA/Ed25519 com *keep-alive* para execução rápida de comandos `docker stack deploy` e leitura de logs.

---

## 📁 5. Motor Web File Manager (`src/lib/file-manager/*`)

### 5.1. Isolamento e Proteção contra Path Traversal
- Qualquer caminho informado nas requisições do File Manager passa pela validação estrita de `security.ts`.
- Utiliza `path.resolve` e garante que o caminho absoluto resultante comece obrigatoriamente com o diretório raiz da aplicação (`appRootDirectory`).
- Bloqueia tentativas de navegação relativa (`../`, `..\\`), caracteres nulos (`\0`) e links simbólicos que apontem para fora do container.

### 5.2. Jobs Assíncronos de Extração e Compactação
- Operações de ZIP/TAR em diretórios volumosos são delegadas para `jobs.ts`.
- O cliente recebe um `jobId` imediatamente e realiza polling suave em `/api/file-manager/jobs/:jobId`, evitando timeouts do navegador e consumo excessivo de memória.

---

## ⏱️ 6. Motor de Manutenção e Rotinas Periódicas (`src/lib/cron.server.ts`)

- **Verificação de Faturas Vencidas:** Faturas com mais de 3 dias de atraso disparam notificações de cobrança via WhatsApp e e-mail.
- **Suspensão Automática de Serviços:** Serviços com faturas vencidas além do período de tolerância são suspensos automaticamente no DirectAdmin ou no Swarm.
- **Limpeza de Arquivos Temporários:** Expurga arquivos temporários de upload e logs de auditoria antigos.
