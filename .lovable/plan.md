# Plano de Implementação: Sistema de Auditoria e Monitoramento de Provisionamento

Implementação de um ecossistema robusto para rastrear, filtrar e notificar falhas de provisionamento, garantindo o cumprimento de SLAs.

## 1. Banco de Dados e Backend

- **Nova Tabela `provisioning_logs`**:
    - `id` (uuid), `service_id` (uuid, FK), `user_id` (uuid, FK).
    - `attempt_number` (int), `status` (text: 'success', 'failure', 'pending').
    - `error_code` (text), `error_message` (text).
    - `metadata` (jsonb) para detalhes técnicos da API.
    - `created_at` (timestamp).
    - Habilitar RLS e permissões para `authenticated` (leitura) e `service_role`.
- **Refatoração do Provisionamento**:
    - Atualizar `src/lib/finance.server.ts` para inserir registros em `provisioning_logs` a cada tentativa (automática ou manual).
    - Incrementar o `attempt_number` baseado no histórico existente para aquele serviço.
- **Sistema de Notificações**:
    - Integrar disparo de e-mail em falhas críticas via `src/lib/emails.server.ts`.
    - Manter e aprimorar notificações via WhatsApp em `src/lib/whatsapp.server.ts`.

## 2. Painel Administrativo (Frontend)

- **Dashboard Admin (`src/routes/_authenticated/admin/index.tsx`)**:
    - **Novo Widget de SLA**: Lista de serviços `pending` ordenada por `updated_at` (mais antigos primeiro).
    - Alertas visuais (ex: badge vermelho para > 24h, amarelo para > 4h).
    - Busca e filtros rápidos por cliente/produto no widget de pendências.
- **Configurações Financeiras (`src/routes/_authenticated/admin/finance.tsx`)**:
    - Adicionar seção de "Notificações por E-mail" na aba de Notificações.
    - Campos para ativar/desativar alertas de provisionamento via e-mail.
- **Dossiê do Cliente e Serviço**:
    - Criar componente `ProvisioningHistory` para exibir a linha do tempo de tentativas.
    - Disponível em `src/routes/_authenticated/admin/clients.$clientId.tsx` e no modal de detalhes do serviço.

## Detalhes Técnicos

- **Cálculo de SLA**: Definir constantes de tempo no backend para categorizar a gravidade da pendência.
- **Busca Avançada**: Utilizar `TanStack Table` ou filtros de URL para permitir busca por Tipo de Erro e Datas no painel administrativo.
- **Segurança**: Garantir que apenas admins possam ver logs detalhados que contenham metadados sensíveis de APIs externas.

text
+-------------------+      +-----------------------+      +---------------------+
| Tentativa de      | ---> | Grava log de auditoria | ---> | Dispara Notificações |
| Provisionamento   |      | (provisioning_logs)   |      | (E-mail/WhatsApp)   |
+-------------------+      +-----------------------+      +---------------------+
                                     |
                                     v
                        +---------------------------+
                        | Dashboard Admin (SLA View)|
                        | Filtros & Busca Avançada  |
                        +---------------------------+
