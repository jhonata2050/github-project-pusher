# Plano de Desenvolvimento: HostPanel (Fase 4 e 5)

Finalização da estrutura base e implementação das integrações críticas para substituição do WHMCS.

## Experiência do Usuário
- **Integração DirectAdmin**: Painel de controle simplificado para o cliente (mudar senha, ver estatísticas, gerenciar DNS básico).
- **Sistema de Tickets**: Interface de chat/mensagens em tempo real entre cliente e suporte.
- **Automação de E-mails**: Notificações automáticas de boas-vindas, faturas vencidas e suspensão de serviço.
- **Área Administrativa**: Gestão completa de servidores DirectAdmin e configurações globais do sistema.

## Detalhes Técnicos

### Infraestrutura & Segurança (Banco de Dados)
- Nova tabela `servers` para gerenciar credenciais de servidores DirectAdmin (criptografadas).
- Tabela `ticket_messages` e `tickets` com RLS para comunicação segura.
- Tabela `email_templates` e `settings` para personalização do sistema.
- `GRANT` e RLS rigorosos para separar Admin de Cliente/Revenda.

### Server Functions (`src/lib/directadmin.functions.ts` & `src/lib/tickets.functions.ts`)
- `provisionService`: Chamada à API do DirectAdmin para criar conta após pagamento.
- `suspendService` / `unsuspendService`: Automação de suspensão por inadimplência.
- `createTicket` / `replyTicket`: Lógica de processamento de suporte.
- `sendTransactionalEmail`: Wrapper para envio de e-mails via provedor configurado.

### Frontend & UI (Estética AbacatePay)
- `src/routes/_authenticated/admin/servers.tsx`: Configuração de múltiplos servidores.
- `src/routes/_authenticated/admin/settings.tsx`: Configurações de marca e financeiro.
- `src/routes/_authenticated/services.$serviceId.tsx`: Detalhes técnicos do serviço (Dashboard DirectAdmin).
- Refinamento do `AppShell` para garantir menus contextuais perfeitos.

### Integrações
- **DirectAdmin API**: Conector principal para gerenciamento de contas.
- **SMTP/Resend/SendGrid**: Integração para disparo de e-mails transacionais.
- **Webhooks**: Captura de eventos externos para atualizar status de serviços.

## Componentes
- `ServerStatusCard`: Monitoramento básico de saúde do servidor.
- `TicketThread`: Componente de conversa fluida.
- `DirectAdminQuickActions`: Botões de atalho (Login SSO, Mudar Senha, Webmail).
