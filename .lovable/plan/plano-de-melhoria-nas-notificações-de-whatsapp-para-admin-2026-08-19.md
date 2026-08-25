# Plano de Melhoria nas Notificações de WhatsApp para Admin

Este plano visa tornar as notificações de WhatsApp enviadas para os administradores mais detalhadas e precisas, conforme solicitado, incluindo informações completas do cliente e do ticket/evento.

## Alterações Propostas

### 1. Detalhamento na Abertura de Tickets
No arquivo `src/lib/support.functions.ts`, na função `createTicket`:
- Buscar o e-mail do cliente a partir do `context.userId`.
- Incluir no template da mensagem:
    - **ID do Ticket** (truncado para 8 caracteres).
    - **Nome do Cliente**.
    - **E-mail do Cliente**.
    - **Data e Hora de abertura** (formatada).
    - **Urgência (Prioridade)**.
    - **Status Atual** (Aberto).

### 2. Detalhamento na Resposta de Tickets
No arquivo `src/lib/support.functions.ts`, na função `replyTicket`:
- Buscar dados completos do cliente (nome e e-mail).
- Incluir no template da mensagem:
    - **ID do Ticket** (truncado).
    - **Nome de quem respondeu** (Admin ou Cliente).
    - **Dados do Cliente associado ao ticket**.
    - **Data e Hora da resposta**.

### 3. Padronização do Formato de Notificação Admin
No arquivo `src/lib/whatsapp.server.ts`, na função `notifyAdminWhatsApp`:
- Ajustar o cabeçalho `📢 *ALERTA ADMIN*` para garantir clareza visual.

## Detalhes Técnicos

- Utilização de `new Date().toLocaleString('pt-BR')` para data e hora.
- Utilização de `ticket.id.slice(0, 8)` para identificação rápida.
- Mapeamento de termos para português (ex: Urgência em vez de Priority).

## Verificação
- Testar a criação de um ticket como cliente e verificar a mensagem recebida pelo admin.
- Testar a resposta a um ticket e verificar o log/notificação.
