# Plano: Adição de ID do Ticket e Upload de Imagens no Suporte

O objetivo deste plano é adicionar a exibição do ID do ticket na lista de tickets e implementar a funcionalidade de upload de imagens (anexos) nas mensagens dos tickets, permitindo que os clientes enviem evidências visuais.

## Mudanças no Banco de Dados (Supabase)

1.  **Storage:** Criar o bucket `ticket-attachments` no Supabase Storage.
2.  **Tabela `ticket_messages`:** Adicionar a coluna `attachments` (tipo `text[]` ou `jsonb`) para armazenar as URLs dos arquivos anexados.
3.  **RLS (Storage):**
    *   Permitir `INSERT` para usuários autenticados (verificando se o ticket pertence a eles).
    *   Permitir `SELECT` para usuários autenticados (verificando se o ticket pertence a eles) e administradores.

## Backend (Server Functions)

1.  **`src/lib/support.functions.ts`:**
    *   Atualizar a função `replyTicket` para aceitar um array opcional de URLs de anexos.
    *   Atualizar `getTicketDetails` para garantir que as mensagens retornem os anexos.
    *   Criar uma nova função `uploadAttachment` (se necessário, ou usar o cliente Supabase diretamente no frontend para upload direto ao storage).

## Frontend (React)

1.  **`src/routes/_authenticated/tickets/index.tsx` (Lista de Tickets):**
    *   Adicionar a coluna/exibição do ID do Ticket (ex: `#12345`).
2.  **`src/routes/_authenticated/tickets.$ticketId.tsx` (Detalhes do Ticket):**
    *   Adicionar um campo de upload (ícone de clipe ou imagem) ao lado do campo de texto da resposta.
    *   Implementar a lógica de upload para o Supabase Storage.
    *   Exibir as imagens anexadas nas mensagens (como miniaturas clicáveis ou em tamanho real).
    *   Garantir que o ID do ticket esteja visível no cabeçalho ou sidebar (já está no sidebar como `#ticket.id.slice(0, 8)`, mas reforçar se necessário).

## Detalhes Técnicos

*   **Validação de Arquivos:** Limitar o tamanho do arquivo (ex: 5MB) e os tipos permitidos (jpg, png, webp, pdf).
*   **UX:** Mostrar progresso de upload e permitir remover anexos antes de enviar a resposta.

---

### Verificação

1.  Acessar a lista de tickets e ver o ID.
2.  Abrir um ticket, anexar uma imagem e responder.
3.  Verificar se a imagem aparece corretamente no histórico de mensagens.
4.  Validar se outro usuário não consegue acessar os anexos de um ticket que não é dele.