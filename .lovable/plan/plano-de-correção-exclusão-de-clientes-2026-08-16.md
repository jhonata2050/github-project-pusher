# Plano de Correção: Exclusão de Clientes

O sistema atualmente permite que administradores "excluam" perfis na tabela `public.profiles`, mas isso não remove a conta do usuário na tabela interna de autenticação (`auth.users`). Devido às relações de banco de dados, se o registro de autenticação permanecer, o sistema pode continuar exibindo ou recriando o perfil, causando a percepção de que a exclusão falhou.

## Ações Realizadas

### 1. Backend e Segurança
- **Identificação da Causa**: A exclusão era feita via cliente Supabase padrão (RLS), que só deletava a linha na tabela `public.profiles`.
- **Implementação de Remoção Completa**: Ajustar a função `bulkDeleteClientsImplementation` para usar o `supabaseAdmin` e remover os usuários diretamente da tabela `auth.users`. Como as tabelas do sistema possuem `ON DELETE CASCADE` para o `user_id`, a exclusão no `auth` limpará automaticamente o perfil e todos os dados vinculados (faturas, serviços, logs).

### 2. Ajustes de Código
- Modificar `src/lib/admin.server.ts` para importar `supabaseAdmin` dinamicamente.
- Alterar a lógica de `bulkDeleteClientsImplementation` para iterar sobre a lista de IDs e chamar `supabaseAdmin.auth.admin.deleteUser(id)`.

## Detalhes Técnicos
- A exclusão via `auth.admin.deleteUser` é a forma definitiva de remover um usuário no ecossistema Supabase.
- Isso garante a limpeza total dos dados e impede que o usuário volte a logar.
- A função continuará verificando se o solicitante tem a função de `admin` antes de proceder.
