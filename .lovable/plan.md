# Plano de Melhoria: Chat e Notificações

Melhorar a experiência de suporte com identificação clara de remetentes no chat e notificações em tempo real.

## Alterações Sugeridas

### 1. Banco de Dados
- Criar tabela `public.notifications` para armazenar alertas persistentes.
- Configurar Row Level Security (RLS) para garantir que usuários acessem apenas suas próprias notificações.
- Habilitar Supabase Realtime para a nova tabela.

### 2. Interface de Chat (`src/routes/_authenticated/tickets.$ticketId.tsx`)
- Ajustar layout: mensagens do usuário atual à direita, mensagens do outro lado à esquerda.
- Cores distintas: verde marca para o próprio usuário, cinza suave para a outra parte.
- Exibir nomes corretamente (Nome do Cliente vs Eqsam Suporte).

### 3. Sistema de Notificações (`src/components/app/AppShell.tsx`)
- Implementar o "sininho" funcional com contador de mensagens não lidas.
- Adicionar escuta (Realtime) para novas notificações.
- Exibir lista de notificações recentes ao clicar no ícone.

### 4. Integração de Alertas
- Disparar notificações no banco quando um administrador responde a um ticket.
- Enviar mensagem via WhatsApp (usando a integração existente) para notificar o cliente sobre a resposta.

## Detalhes Técnicos
- **Migração SQL**: `CREATE TABLE public.notifications (...)`.
- **Server Functions**: Atualizar `replyTicket` para inserir na tabela de notificações.
- **Hook de Tempo Real**: Criar `useNotifications` para gerenciar a assinatura do Supabase.
