# Plano de Melhoria: Configurações Financeiras

Reestruturação da área de Configurações Financeiras para melhorar a usabilidade, organizar as opções logicamente e adicionar o campo essencial de link de webhook.

## Mudanças Propostas

### Backend (Banco de Dados e API)
*   As configurações serão salvas na tabela `system_settings` existente através da função `updateSystemSettings`.
*   Será adicionada suporte para o novo campo `system_webhook_url`.

### Interface (Frontend)
*   **Reorganização em Abas**: Implementar um sistema de abas (`Tabs`) para separar as configurações por contexto:
    1.  **Geral**: Automação de faturamento e link do webhook do sistema.
    2.  **Gateways**: Configurações específicas de cada método de pagamento (Stripe, Mercado Pago, etc).
    3.  **Prioridades**: Configuração da ordem de preferência dos gateways por método.
*   **Novo Campo de Webhook**: Adicionar um campo "Link de Webhook do Sistema" na aba Geral, com validação de URL e botão para copiar o link padrão do sistema (`/api/public/webhook`).
*   **Layout Limpo**: Substituir a lista longa de cards por uma interface mais compacta e categorizada.

### Segurança e Validação
*   O campo de webhook validará se a entrada é uma URL válida.
*   O acesso continua restrito a usuários com a role `admin`.

## Detalhes Técnicos
*   **Arquivo Principal**: `src/routes/_authenticated/admin/finance.tsx`.
*   **Componentes Radix**: Utilização de `Tabs`, `TabsList`, `TabsTrigger` e `TabsContent` para a navegação.
*   **Funções de Servidor**: Atualização da lógica de salvamento em `handleSave` para incluir o novo campo de webhook.
*   **Helpers**: O link sugerido para o webhook será baseado em `window.location.origin + "/api/public/webhook"`.

## Próximos Passos
1.  Modificar a estrutura de `AdminFinanceSettingsPage` para incluir o componente `Tabs`.
2.  Agrupar os inputs existentes nas abas correspondentes.
3.  Adicionar o novo card de "Configurações de Notificação" com o campo de Webhook.
4.  Validar o fluxo de salvamento e carregamento dos dados.
