# Dossiê Técnico 02: Schema e Arquitetura de Dados

Este documento especifica a modelagem relacional completa do **EQSAM Painel**, mapeando todas as 25 tabelas públicas no Supabase, suas colunas reais, tipos de dados, chaves primárias, chaves estrangeiras, índices e convenções de armazenamento dinâmico.

---

## 🏛️ 1. Visão Geral da Arquitetura de Dados

O banco de dados é hospedado no PostgreSQL (Supabase) sob o schema `public`.
A autenticação de usuários é gerenciada pelo schema nativo `auth.users`, sendo espelhada e enriquecida na tabela `public.profiles`.

```
                    ┌─────────────────────────┐
                    │       auth.users        │
                    └────────────┬────────────┘
                                 │ 1:1
                                 ▼
                    ┌─────────────────────────┐
                    │     public.profiles     │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │ 1:N                   │ 1:N                   │ 1:N
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ public.services │     │ public.invoices │     │ public.tickets  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │ 1:N                   │ 1:N
         │                       ▼                       ▼
         │              ┌─────────────────┐     ┌─────────────────┐
         │              │  invoice_items  │     │ ticket_messages │
         │              └─────────────────┘     └─────────────────┘
         │ 1:1
         ├───────────────────────┐
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ public.servers  │     │  vps_instances  │
└─────────────────┘     └─────────────────┘
```

---

## 📋 2. Mapeamento Exaustivo das Tabelas

### 2.1. Controle de Usuários e Perfis
1. **`public.profiles`**:
   - **Chave Primária:** `id` (UUID, referencia `auth.users.id` com `ON DELETE CASCADE`).
   - **Colunas:**
     - `full_name` (`text`): Nome completo do cliente.
     - `email` (`text`): E-mail de login e notificações.
     - `phone` (`text`, nullable): Telefone/WhatsApp com DDD e DDI.
     - `tax_id` (`text`, nullable): Documento fiscal (CPF ou CNPJ validado).
     - `company` (`text`, nullable): Razão social ou nome fantasia.
     - `address_street`, `address_number`, `address_neighborhood`, `address_city`, `address_state`, `address_postal_code`, `country` (`text`): Endereço cadastral.
     - `wallet_balance` (`numeric(10,2)`, default 0.00): Saldo pré-pago em reais.
     - `created_at`, `updated_at` (`timestamptz`).

2. **`public.user_roles`**:
   - **Chave Primária:** `id` (UUID).
   - **Colunas:** `user_id` (UUID, referencia `profiles.id`), `role` (`text`: `'admin' | 'client'`), `created_at`.
   - **Regra:** O acesso a qualquer rota `/admin/*` requer obrigatoriamente um registro com `role = 'admin'` nesta tabela.

3. **`public.user_api_tokens`**:
   - **Chave Primária:** `id` (UUID).
   - **Colunas:** `user_id` (UUID), `name` (`text`), `token_hash` (`text`), `last_used_at` (`timestamptz`), `created_at`.
   - **Uso:** Autenticação programática via cabeçalho `Authorization: Bearer <token>`.

---

### 2.2. Catálogo de Produtos e Precificação
4. **`public.product_groups`**:
   - **Chave Primária:** `id` (UUID).
   - **Colunas:** `name` (`text`), `slug` (`text`, unique), `description` (`text`), `order_index` (`int4`), `is_active` (`bool`), `created_at`.
   - **Uso:** Categorias de exibição no checkout (ex: "VPS NVMe", "Hospedagem Web", "Bots Cloud").

5. **`public.products`**:
   - **Chave Primária:** `id` (UUID).
   - **Colunas:**
     - `group_id` (UUID, referencia `product_groups.id`).
     - `name` (`text`), `slug` (`text`, unique), `description` (`text`).
     - `type` (`text`: `'cpanel' | 'directadmin' | 'vps' | 'swarm' | 'domain'`).
     - `is_active` (`bool`), `features` (`jsonb`), `stock` (`int4`, nullable).
     - `created_at`, `updated_at`.

6. **`public.product_prices`**:
   - **Chave Primária:** `id` (UUID).
   - **Colunas:**
     - `product_id` (UUID, referencia `products.id`).
     - `billing_cycle` (`text`: `'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'biennial' | 'triennial' | 'onetime'`).
     - `price` (`numeric(10,2)`), `setup_fee` (`numeric(10,2)`, default 0.00).

7. **`public.coupons`**:
   - **Chave Primária:** `id` (UUID).
   - **Colunas:** `code` (`text`, uppercase, unique), `discount_type` (`'percentage' | 'fixed'`), `discount_value` (`numeric`), `max_uses` (`int4`), `used_count` (`int4`), `valid_until` (`timestamptz`), `is_active` (`bool`).

---

### 2.3. Contratos, Serviços e Infraestrutura
8. **`public.services`**:
   - **Chave Primária:** `id` (UUID).
   - **Colunas Reais:**
     - `user_id` (UUID, referencia `profiles.id`).
     - `product_id` (UUID, referencia `products.id`).
     - `server_id` (UUID, nullable, referencia `servers.id`).
     - `domain` (`text`, nullable): Domínio associado à conta.
     - `username` (`text`, nullable): Usuário da conta no DirectAdmin ou SSH.
     - `password` (`text`, nullable): Senha criptografada ou temporária.
     - `billing_cycle` (`text`), `amount` (`numeric(10,2)`).
     - `status` (`text`: `'active' | 'pending' | 'suspended' | 'cancelled' | 'terminated'`).
     - `suspension_reason` (`text`, nullable): Motivo da suspensão (ex: `'INADIMPLENCIA'` ou `'BLOCK_DIRECTADMIN: ...'`).
     - `notes` (`text`, nullable): Campo livre para logs de erro e histórico operacional.
     - `vps_hostname`, `vps_os_template`, `vps_region` (`text`, nullable): Metadados de instâncias VPS.
     - `first_payment_date`, `next_due_date`, `created_at`, `updated_at`.
   - **ATENÇÃO:** A coluna `error_message` NÃO existe no schema; mensagens de erro devem ser concatenadas em `notes`.

9. **`public.servers`**:
   - **Chave Primária:** `id` (UUID).
   - **Colunas Reais:**
     - `name` (`text`): Nome identificador do servidor.
     - `hostname` (`text`), `ip_address` (`text`), `type` (`'directadmin' | 'cpanel' | 'swarm'`).
     - `port` (`int4`), `username` (`text`), `api_token` (`text`).
     - `ssh_user`, `ssh_port`, `ssh_private_key`, `ssh_password` (`text`, nullable).
     - `is_active` (`bool`), `max_accounts` (`int4`), `current_accounts` (`int4`).
     - `created_at`, `updated_at`.
   - **ATENÇÃO:** As colunas `can_backup`, `auto_ssl` NÃO existem nesta tabela. Capabilities dinâmicas são armazenadas em `public.system_settings` sob a chave `server_caps_{serverId}`.

10. **`public.vps_instances`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas Reais:**
      - `service_id` (UUID, referencia `services.id`).
      - `user_id` (UUID, referencia `profiles.id`).
      - `external_id` (`text`): ID da instância na API da Contabo.
      - `name` (`text`): Nome da VPS.
      - `ip_address` (`text`, nullable): IPv4 público alocado.
      - `region` (`text`), `os_template` (`text`).
      - `status` (`text`: `'active' | 'provisioning' | 'stopped' | 'rebuilding' | 'error'`).
      - `created_at`, `updated_at`.

---

### 2.4. Faturamento, Transações e Carteira
11. **`public.orders`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `user_id` (UUID), `status` (`'pending' | 'completed' | 'cancelled'`), `total_amount` (`numeric`), `coupon_id` (UUID, nullable), `notes` (`text`), `created_at`.

12. **`public.invoices`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:**
      - `user_id` (UUID, referencia `profiles.id`).
      - `status` (`text`: `'pending' | 'paid' | 'cancelled' | 'refunded'`).
      - `subtotal`, `tax`, `discount`, `total` (`numeric(10,2)`).
      - `payment_method` (`text`: `'pix' | 'credit_card' | 'boleto' | 'wallet'`).
      - `due_date`, `paid_at` (`timestamptz`, nullable).
      - `pix_qrcode`, `pix_qrcode_text`, `boleto_url`, `boleto_barcode` (`text`, nullable).
      - `gateway_id`, `gateway_order_id` (`text`, nullable).
      - `created_at`, `updated_at`.

13. **`public.invoice_items`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `invoice_id` (UUID, referencia `invoices.id`), `service_id` (UUID, nullable), `description` (`text`), `amount` (`numeric`), `created_at`.

14. **`public.transactions`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `invoice_id` (UUID), `gateway` (`text`), `transaction_id` (`text`), `amount` (`numeric`), `status` (`text`), `payload` (`jsonb`), `created_at`.

15. **`public.wallet_transactions`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `user_id` (UUID), `amount` (`numeric`), `type` (`'credit' | 'debit'`), `description` (`text`), `balance_after` (`numeric`), `created_at`.

---

### 2.5. Suporte e Auditoria
16. **`public.tickets`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `user_id` (UUID), `service_id` (UUID, nullable), `subject` (`text`), `department` (`text`), `priority` (`'low' | 'medium' | 'high'`), `status` (`'open' | 'answered' | 'customer_reply' | 'closed'`), `created_at`, `updated_at`.

17. **`public.ticket_messages`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `ticket_id` (UUID), `user_id` (UUID), `message` (`text`), `attachments` (`jsonb`), `is_internal` (`bool`), `created_at`.

18. **`public.audit_logs`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `user_id` (UUID, nullable), `action` (`text`), `entity_type` (`text`), `entity_id` (`text`), `details` (`jsonb`), `ip_address` (`text`), `created_at`.

19. **`public.email_logs`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `to_email` (`text`), `subject` (`text`), `status` (`'sent' | 'failed'`), `error` (`text`, nullable), `created_at`.

20. **`public.system_settings`**:
    - **Chave Primária:** `key` (`text`).
    - **Colunas:** `value` (`text` ou string JSON), `updated_at` (`timestamptz`).
    - **Convenções Críticas:**
      - `mercadopago_access_token`, `woovi_app_id`, `paghiper_api_key`, `paghiper_token`: Credenciais de gateways.
      - `server_caps_{serverId}`: Capabilities de servidores sem suporte a colunas dedicadas.
      - `vps_metrics_{vps_id}`: Últimas métricas de CPU/Memória/Disco coletadas de VPSs.

---

### 2.6. Domínios, Afiliados e Importação WHMCS
21. **`public.domains`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `user_id` (UUID), `domain_name` (`text`), `registrar` (`'openprovider' | 'resellerclub'`), `status` (`'active' | 'pending' | 'expired'`), `nameservers` (`jsonb`), `auto_renew` (`bool`), `registration_date`, `expiration_date`.

22. **`public.affiliates`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `user_id` (UUID, unique), `code` (`text`, unique), `commission_rate` (`numeric`), `balance` (`numeric`), `total_earned` (`numeric`), `created_at`.

23. **`public.affiliate_referrals`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `affiliate_id` (UUID), `referred_user_id` (UUID), `order_id` (UUID, nullable), `commission_amount` (`numeric`), `status` (`'pending' | 'approved' | 'paid'`), `created_at`.

24. **`public.affiliate_withdrawals`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `affiliate_id` (UUID), `amount` (`numeric`), `pix_key` (`text`), `status` (`'pending' | 'paid' | 'rejected'`), `created_at`.

25. **`public.whmcs_imports`**:
    - **Chave Primária:** `id` (UUID).
    - **Colunas:** `file_name` (`text`), `imported_clients` (`int4`), `imported_services` (`int4`), `imported_invoices` (`int4`), `status` (`text`), `created_at`.
