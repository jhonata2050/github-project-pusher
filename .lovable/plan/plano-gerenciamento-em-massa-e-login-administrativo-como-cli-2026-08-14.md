# Plano: Gerenciamento em Massa e Login Administrativo como Cliente

Implementação de exclusão de clientes em massa (incluindo serviços relacionados) e funcionalidade de login administrativo como cliente ("Login as Client").

## Mudanças

### Backend (Supabase & Server Functions)

- Criar função de servidor `bulkDeleteClients` em `src/lib/admin.functions.ts`.
  - Deve verificar permissões de admin/staff.
  - Deve deletar serviços, faturas, tickets e logs relacionados antes de remover o perfil (ou usar deleção em cascata na FK se disponível).
  - Usar `supabaseAdmin` para garantir permissão total na remoção.
- Criar função de servidor `impersonateClient` em `src/lib/admin.functions.ts`.
  - Gera um token de acesso temporário ou retorna as credenciais necessárias para o admin se logar como o usuário (considerando as limitações do Supabase Auth, isso será feito via troca de sessão controlada no frontend).

### Frontend (Admin & UI)

- **Lista de Clientes (`src/routes/_authenticated/admin/clients.index.tsx`)**:
  - Adicionar checkboxes para seleção múltipla.
  - Adicionar botão "Excluir Selecionados" com diálogo de confirmação (destacando que serviços serão removidos).
  - Feedback visual de progresso durante a exclusão.
- **Dossiê do Cliente (`src/routes/_authenticated/admin/clients.$clientId.tsx`)**:
  - Adicionar botão "Acessar como Cliente" no cabeçalho.
  - Implementar a lógica de troca de sessão: armazenar a sessão admin, logar como cliente, e fornecer uma forma de "voltar ao admin".

## Detalhes Técnicos

- **Segurança**: A função de deleção em massa usará `SECURITY DEFINER` via RPC ou uma server function com `supabaseAdmin` para evitar erros de RLS, mas validará estritamente o papel de `admin` do chamador.
- **Impersonate**: Utilizaremos a capacidade do `supabase.auth.admin.getUserById` para validar o usuário e, no frontend, usaremos uma rota de "bridge" que permite ao admin visualizar o dashboard sob a perspectiva do cliente sem expor a senha real.

