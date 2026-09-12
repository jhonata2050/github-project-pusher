# Dossiê Técnico 01: Inventário de Rotas e Endpoints

Este documento mapeia e documenta cada uma das 52 rotas de interface (React/TanStack Router) e 21 endpoints de API (HTTP/Server Handlers) do **EQSAM Painel**, detalhando loaders, permissões de acesso, parâmetros de URL e regras de negócio associadas.

---

## 🌐 1. Rotas de Interface do Usuário (UI Routes)

### 1.1. Rotas Públicas & Autenticação
1. **`src/routes/index.tsx` (`/`)**:
   - **Propósito:** Landing page institucional ou redirecionamento inteligente do usuário autenticado para `/dashboard` ou `/auth`.
   - **Proteção:** Pública.
   - **Comportamento:** Carrega branding dinâmico (`useBranding`) e renderiza visão geral de planos e chamada para ação.

2. **`src/routes/auth.tsx` (`/auth`)**:
   - **Propósito:** Tela unificada de Login, Cadastro de novos clientes e Recuperação de Senha.
   - **Proteção:** Pública (redireciona para `/dashboard` se já autenticado).
   - **Regras Críticas:**
     - Cadastro: Coleta e persiste imediatamente em `public.profiles` os campos `full_name`, `phone`, `tax_id` (CPF/CNPJ) e `country`.
     - Login: Autentica via Supabase Auth (`signInWithPassword`) e estabelece sessão segura em cookies/JWT.

3. **`src/routes/auth.reset-password.tsx` (`/auth/reset-password`)**:
   - **Propósito:** Redefinição de senha através de token de recuperação recebido por e-mail.
   - **Proteção:** Pública com token de recuperação Supabase na URL / hash.
   - **Regras Críticas:** Recebe `access_token` ou código de troca PKCE e atualiza a senha do usuário via `supabase.auth.updateUser`.

4. **`src/routes/checkout.index.tsx` (`/checkout`)**:
   - **Propósito:** Catálogo unificado de checkout e contratação de serviços.
   - **Proteção:** Pública / Cliente.
   - **Parâmetros:** Query params opcionais de grupo de produtos, cupom e ciclo de faturamento.

5. **`src/routes/checkout.$productId.tsx` (`/checkout/:productId`)**:
   - **Propósito:** Fluxo transacional de contratação de um produto específico (VPS, Hospedagem, Domínio ou App).
   - **Proteção:** Pública com exigência de cadastro/login para finalizar pedido.
   - **Parâmetros de Rota:** `productId` (UUID do produto em `public.products`).
   - **Componentes:** `StepSummary.tsx` (cálculo de descontos e cupons) e `StepPayment.tsx` (escolha de gateway: Pix, Cartão, Saldo).

---

### 1.2. Área do Cliente Autenticado (`src/routes/_authenticated/*`)
Todas as rotas sob `_authenticated` são protegidas por middleware de sessão (`auth-middleware.ts`), exigindo um token válido do Supabase.

6. **`src/routes/_authenticated/dashboard.tsx` (`/dashboard`)**:
   - **Propósito:** Central de comando do cliente.
   - **Loaders:** Estatísticas de serviços ativos, faturas abertas, tickets recentes e saldo de carteira.
   - **Ações:** Links rápidos para contratação, abertura de suporte e pagamento de pendências.

7. **`src/routes/_authenticated/complete-profile.tsx` (`/complete-profile`)**:
   - **Propósito:** Bloqueio obrigatório caso o cliente não tenha preenchido CPF/CNPJ, telefone ou endereço completo.
   - **Comportamento:** Impede acesso ao restante do painel até a conclusão do cadastro.

8. **`src/routes/_authenticated/profile.tsx` (`/profile`)**:
   - **Propósito:** Edição de dados cadastrais, preferências de notificação e alteração de senha do cliente.

9. **`src/routes/_authenticated/services.index.tsx` (`/services`)**:
   - **Propósito:** Listagem tabular e em cards de todos os serviços contratados pelo cliente.
   - **Filtros:** Status (`active`, `pending`, `suspended`, `cancelled`), tipo de serviço (`cpanel`, `directadmin`, `vps`, `swarm`, `domain`).
   - **Tratamento de Exceções:** Exibição de badge visual de bloqueio de segurança caso `suspension_reason` contenha `BLOCK_DIRECTADMIN`.

10. **`src/routes/_authenticated/services.$serviceId.tsx` (`/services/:serviceId`)**:
    - **Propósito:** Painel individual de gerenciamento do serviço de hospedagem.
    - **Ações:**
      - Botão SSO DirectAdmin (autenticação com um clique via `CMD_API_LOGIN_KEYS`).
      - Gerenciamento de senhas do painel, FTP e contas de e-mail.
      - Solicitação de cancelamento e visualização de ciclo de faturamento.

11. **`src/routes/_authenticated/apps/index.tsx` (`/apps`)**:
    - **Propósito:** Listagem de aplicações Cloud / PaaS gerenciadas pelo Docker Swarm.
    - **Loaders:** Status das stacks, nós do cluster e métricas consolidadas de CPU/Memória.

12. **`src/routes/_authenticated/apps/create.tsx` (`/apps/create`)**:
    - **Propósito:** Wizard de criação de novas aplicações a partir do catálogo dos 21 templates (Node.js, Python, PHP, Dockerfile, WordPress, n8n, etc.).
    - **Validações:** Validação de disco disponível no nó do Swarm antes do provisionamento.

13. **`src/routes/_authenticated/apps/$appId.tsx` (`/apps/:appId`)**:
    - **Propósito:** Centro de controle da aplicação PaaS.
    - **Funcionalidades Integradas:**
      - Abas de Monitoramento (logs de container em tempo real, telemetria).
      - Gerenciador de Arquivos Web (File Manager integrado com Code Editor).
      - Variáveis de Ambiente e Gerador de Segredos criptográficos.
      - Domínios e roteamento reverso SSL via Caddy/Traefik.
      - Ações de ciclo de vida (Start, Stop, Restart, Redeploy).

14. **`src/routes/_authenticated/vps/index.tsx` (`/vps`)**:
    - **Propósito:** Listagem de instâncias de Servidores Virtuais Privados (VPS Contabo).

15. **`src/routes/_authenticated/vps/$vpsId.tsx` (`/vps/:vpsId`)**:
    - **Propósito:** Painel individual de controle da VPS.
    - **Funcionalidades:** Ligar, desligar, reiniciar, reinstalar SO, gráficos de consumo de CPU/RAM/Disco e acesso ao console VNC/SSH.

16. **`src/routes/_authenticated/invoices.index.tsx` (`/invoices`)**:
    - **Propósito:** Histórico de faturas do cliente com status, data de vencimento e comprovantes em PDF.

17. **`src/routes/_authenticated/invoices.$invoiceId.tsx` (`/invoices/:invoiceId`)**:
    - **Propósito:** Visualização e pagamento de fatura específica com geração instantânea de QR Code Pix e boleto.

18. **`src/routes/_authenticated/wallet.tsx` (`/wallet`)**:
    - **Propósito:** Carteira digital pré-paga para recarga de saldo e pagamento automático de serviços.

19. **`src/routes/_authenticated/domains.index.tsx` (`/domains`)**:
    - **Propósito:** Gerenciamento de domínios registrados e zonas DNS.

20. **`src/routes/_authenticated/domains.search.tsx` (`/domains/search`)**:
    - **Propósito:** Consulta de disponibilidade Whois e contratação de novos domínios (.com.br, .com, .net, etc.).

21. **`src/routes/_authenticated/domains.$domainId.tsx` (`/domains/:domainId`)**:
    - **Propósito:** Edição de NameServers, DNSSEC e dados de contato do domínio.

22. **`src/routes/_authenticated/tickets.index.tsx` (`/tickets`)**:
    - **Propósito:** Central de chamados de suporte técnico.

23. **`src/routes/_authenticated/tickets.$ticketId.tsx` (`/tickets/:ticketId`)**:
    - **Propósito:** Linha do tempo de mensagens do ticket com upload de anexos e fechamento do chamado.

24. **`src/routes/_authenticated/affiliates.tsx` (`/affiliates`)**:
    - **Propósito:** Painel do programa de afiliados com link de indicação, taxa de conversão e solicitação de saque de comissões.

---

### 1.3. Painel Administrativo (`src/routes/_authenticated/admin/*`)
Todas as rotas administrativas exigem a role `admin` em `public.user_roles`.

25. **`src/routes/_authenticated/admin/index.tsx` (`/admin`)**:
    - **Propósito:** Dashboard executivo do operador com KPIs de faturamento mensal (MRR), total de clientes, servidores e chamados abertos.

26. **`src/routes/_authenticated/admin/clients.index.tsx` (`/admin/clients`)**:
    - **Propósito:** Listagem geral de clientes com filtros de inadimplência e status.

27. **`src/routes/_authenticated/admin/clients.$clientId.tsx` (`/admin/clients/:clientId`)**:
    - **Propósito:** Dossiê 360° do cliente com impersonação de sessão, alteração manual de saldo, histórico de serviços e faturas.

28. **`src/routes/_authenticated/admin/servers.tsx` (`/admin/servers`)**:
    - **Propósito:** Gestão de servidores de hospedagem DirectAdmin e nós do Docker Swarm. Permite teste de conectividade SSH e capacidade.

29. **`src/routes/_authenticated/admin/products.tsx` (`/admin/products`)**:
    - **Propósito:** Cadastro e edição do catálogo de produtos e serviços.

30. **`src/routes/_authenticated/admin/product-groups.tsx` (`/admin/product-groups`)**:
    - **Propósito:** Organização de categorias (ex: Hospedagem, VPS, Bots, Domínios).

31. **`src/routes/_authenticated/admin/coupons.tsx` (`/admin/coupons`)**:
    - **Propósito:** Gestão de cupons de desconto (percentual ou fixo, limite de usos e datas de expiração).

32. **`src/routes/_authenticated/admin/invoices.tsx` (`/admin/invoices`)**:
    - **Propósito:** Controle financeiro global de faturas com baixa manual e cancelamento.

33. **`src/routes/_authenticated/admin/finance.tsx` (`/admin/finance`)**:
    - **Propósito:** Relatórios de conciliação bancária, saques de afiliados e fluxo de caixa.

34. **`src/routes/_authenticated/admin/tickets.tsx` (`/admin/tickets`)**:
    - **Propósito:** Central de atendimento de suporte aos clientes da equipe interna.

35. **`src/routes/_authenticated/admin/branding.tsx` (`/admin/branding`)**:
    - **Propósito:** Customização visual do painel (logotipo, cores primárias, favicon e metadados).

36. **`src/routes/_authenticated/admin/emails.tsx` (`/admin/emails`)**:
    - **Propósito:** Configuração do provedor SMTP/Resend e histórico de e-mails disparados.

37. **`src/routes/_authenticated/admin/whatsapp.tsx` (`/admin/whatsapp`)**:
    - **Propósito:** Configuração da API de mensagens de cobrança e alertas via WhatsApp.

38. **`src/routes/_authenticated/admin/logs.tsx` (`/admin/logs`)**:
    - **Propósito:** Trilha de auditoria detalhada de ações administrativas e de sistema.

39. **`src/routes/_authenticated/admin/database.tsx` (`/admin/database`)**:
    - **Propósito:** Visualizador de integridade de banco de dados e disparo de backups manuais.

40. **`src/routes/_authenticated/admin/import.tsx` (`/admin/import`)**:
    - **Propósito:** Assistente de migração e importação de bancos de dados WHMCS legados.

41. **`src/routes/_authenticated/admin/vps/index.tsx` (`/admin/vps`)**:
    - **Propósito:** Visão consolidada de todas as instâncias VPS ativas na Contabo.

42. **`src/routes/_authenticated/admin/vps/plans.tsx` (`/admin/vps/plans`)**:
    - **Propósito:** Mapeamento de planos e sabores Contabo para produtos do painel.

---

## 🔌 2. Endpoints de API (HTTP Endpoints)

### 2.1. Webhooks de Pagamento
1. **`src/routes/api/public/webhooks/mercadopago.ts` (`POST /api/public/webhooks/mercadopago`)**:
   - **Regra de Segurança:** NUNCA confia cegamente no payload. Consulta obrigatoriamente a API do Mercado Pago (`GET https://api.mercadopago.com/v1/payments/:id`) e só baixa a fatura se `status === 'approved'`.
2. **`src/routes/api/public/webhooks/woovi.ts` (`POST /api/public/webhooks/woovi`)**:
   - **Regra de Segurança:** Rejeita `CHARGE_CREATED`. Aprova apenas mediante os eventos `OPENPIX:CHARGE_COMPLETED` e `OPENPIX:TRANSACTION_RECEIVED`.
3. **`src/routes/api/public/webhooks/paghiper.ts` (`POST /api/public/webhooks/paghiper`)**:
   - **Regra de Segurança:** Lê credenciais de `system_settings` e valida a autenticidade da transação via `/invoice/notification/` ou `/transaction/notification/`.
4. **`src/routes/api/public/webhooks/stripe.ts` (`POST /api/public/webhooks/stripe`)**:
   - **Regra de Segurança:** Valida assinatura do webhook Stripe e processa eventos `checkout.session.completed`.
5. **`src/routes/api/public/webhooks/abacatepay.ts` (`POST /api/public/webhooks/abacatepay`)**:
   - **Regra de Segurança:** Processa eventos de confirmação Pix do AbacatePay.
6. **`src/routes/api/public/webhooks/cajupay.ts` (`POST /api/public/webhooks/cajupay`)**:
   - **Regra de Segurança:** Processamento de pagamentos CajuPay.
7. **`src/routes/api/public/webhook.ts` (`POST /api/public/webhook`)**:
   - **Regra de Segurança:** Endpoint genérico legado mantido com validação ativa de status.

---

### 2.2. Gerenciador de Arquivos (File Manager API)
8. **`src/routes/api/file-manager/upload.ts` (`POST /api/file-manager/upload`)**:
   - **Propósito:** Recebimento de arquivos via stream multipart/form-data com restrição de tamanho e sanitização de caminho.
9. **`src/routes/api/file-manager/bundle/$appId.ts` (`GET /api/file-manager/bundle/:appId`)**:
   - **Propósito:** Download compactado de todo o diretório da aplicação em formato ZIP.
10. **`src/routes/api/file-manager/jobs/$jobId.ts` (`GET /api/file-manager/jobs/:jobId`)**:
    - **Propósito:** Consulta de progresso de operações pesadas assíncronas (extração ou compactação).
11. **`src/routes/api/file-manager/jobs/compress.ts` (`POST /api/file-manager/jobs/compress`)**:
    - **Propósito:** Enfileira compactação em segundo plano para evitar timeout HTTP em pastas grandes.
12. **`src/routes/api/file-manager/jobs/extract.ts` (`POST /api/file-manager/jobs/extract`)**:
    - **Propósito:** Enfileira descompactação (ZIP/TAR) com proteção estrita contra *Zip Slip* (extração fora do root).
13. **`src/routes/api/file-manager/logs/$appId.ts` (`GET /api/file-manager/logs/:appId`)**:
    - **Propósito:** Consulta de logs de operações de arquivos para auditoria.

---

### 2.3. Telemetria, Segurança e Rotinas do Sistema
14. **`src/routes/api/public/vps-metrics.ts` (`POST /api/public/vps-metrics`)**:
    - **Propósito:** Recebimento periódico de telemetria do agente instalado na VPS (CPU, RAM, Disco, IO).
    - **Resiliência:** Salva prioritariamente em `system_settings` com fallback seguro caso tabelas particionadas não existam.
15. **`src/routes/api/public/scripts/install-agent.ts` (`GET /api/public/scripts/install-agent`)**:
    - **Propósito:** Script bash para instalação do agente de telemetria em instâncias VPS com resolução de URL canônica.
16. **`src/routes/api/public/scripts/uninstall-agent.ts` (`GET /api/public/scripts/uninstall-agent`)**:
    - **Propósito:** Script bash para desinstalação e limpeza do agente de telemetria.
17. **`src/routes/api/public/cron/maintenance.ts` (`POST /api/public/cron/maintenance`)**:
    - **Propósito:** Tarefa periódica disparada por cron externo para verificar faturas vencidas, suspender serviços inadimplentes e renovar certificados SSL.
18. **`src/routes/api/public/password-reset.ts` (`POST /api/public/password-reset`)**:
    - **Propósito:** Disparo de e-mail de recuperação de senha com link canônico apontando para `/auth/reset-password`.
19. **`src/routes/api/public/branding.ts` (`GET /api/public/branding`)**:
    - **Propósito:** Retorna tema, logotipo e variáveis visuais configuradas no painel.
20. **`src/routes/api/public/vps/webhook.ts` (`POST /api/public/vps/webhook`)**:
    - **Propósito:** Notificações de ciclo de vida emitidas pela API da Contabo.
21. **`src/routes/api/user/tokens.ts` (`GET / POST / DELETE /api/user/tokens`)**:
    - **Propósito:** Gestão de API Tokens pessoais do cliente para integração com ferramentas externas.
