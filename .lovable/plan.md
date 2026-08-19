# Plano de Implementação: Integração com Evolution Go (WhatsApp)

Este plano detalha a integração do sistema com a plataforma Evolution Go para automatizar notificações via WhatsApp para clientes e administradores.

## Funcionalidades e Escopo

### 1. Configuração Administrativa
- Nova área em **Sistema > WhatsApp e Notificações** (/admin/whatsapp).
- Campo para o número de telefone do administrador (recebedor de alertas).
- Configuração da Evolution Go (URL da Instância, Token da Instância, Nome da Instância).
- Chave de API Global (opcional, para segurança).
- Toggle de ativação para diferentes tipos de notificações:
  - **Administrador:** Problemas no sistema, falhas de pagamento, renovações, ativações, suporte.
  - **Cliente:** Status de serviços, faturas, tickets.

### 2. Motor de Notificação (Backend)
- Implementação de um utilitário centralizado em `src/lib/whatsapp.server.ts`.
- Função `sendWhatsAppMessage` para abstrair a chamada à Evolution Go.
- Lógica de fallback e logs de auditoria para cada envio.

### 3. Gatilhos de Notificação (Hooks)
A integração será inserida nos fluxos existentes:
- **Pagamentos:** Webhooks de Stripe, Mercado Pago, etc. (sucesso/falha).
- **Provedoria:** `processProvisioning` em `finance.server.ts` (ativação).
- **Suporte:** `createTicket` e `replyTicket` em `support.functions.ts`.
- **Métricas:** `vps-metrics.ts` (alertas de CPU/RAM se implementado futuramente).

---

## Detalhes Técnicos (Desenvolvedor)

### Banco de Dados (Supabase)
As configurações serão armazenadas na tabela `system_settings` usando as seguintes chaves:
- `whatsapp_enabled` (boolean)
- `whatsapp_evolution_url` (string)
- `whatsapp_evolution_token` (string/secret)
- `whatsapp_evolution_instance` (string)
- `whatsapp_admin_phone` (string)
- `whatsapp_notify_admin_settings` (JSON: `{ "system_issues": true, "payment_failed": true, ... }`)
- `whatsapp_notify_client_settings` (JSON: `{ "service_activated": true, "invoice_due": true, ... }`)

### Componentes de UI
- **Admin Layout:** Adição do link no `AppShell.tsx` sob a seção "Sistema".
- **Settings Page:** `src/routes/_authenticated/admin/whatsapp.tsx` com componentes Shadcn (Switch, Input, Card).

### Segurança
- Chaves sensíveis serão tratadas via `system_settings` (acessíveis apenas por `supabaseAdmin`).
- Validação de número de telefone (formato internacional E.164).

### Etapas de Trabalho
1. Criar `src/lib/whatsapp.server.ts`.
2. Criar rota de configuração `/admin/whatsapp`.
3. Adicionar link no sidebar do `AppShell.tsx`.
4. Inserir chamadas de notificação nos webhooks e funções de suporte.
5. Validar via logs de auditoria.
