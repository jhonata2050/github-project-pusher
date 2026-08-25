# Plano de Correção: Permissões da Tabela de Servidores

O erro "new row violates row-level security policy for table 'servers'" indica que a tabela possui RLS (Row Level Security) habilitado, mas não existem políticas que permitam a inserção de novos registros por administradores, ou o usuário atual não tem a permissão necessária no banco.

## Ações a serem realizadas

### 1. Ajustar Políticas de Segurança (RLS)
- Garantir que a tabela `public.servers` tenha as permissões `GRANT` corretas para usuários autenticados e para a role de serviço.
- Criar políticas RLS que permitam:
    - Administradores visualizar todos os servidores.
    - Administradores inserir novos servidores.
    - Administradores atualizar servidores existentes.
    - Administradores excluir servidores.
- Nota: Usuários comuns não devem ter acesso direto a esta tabela por padrão, a menos que explicitamente necessário (a lógica do sistema parece restringir o gerenciamento ao admin).

### 2. Validar Funções de Servidor
- Revisar `createServerDA`, `updateServerDA` e `deleteServerDA` em `src/lib/support.functions.ts` para garantir que verifiquem corretamente o papel de administrador antes de realizar operações na tabela `servers`.
- Considerar o uso de `supabaseAdmin` caso a lógica exija ignorar RLS para operações críticas de sistema (embora o ideal seja ter políticas RLS robustas).

### 3. Verificação
- Tentar adicionar um novo servidor via interface administrativa.
- Tentar editar e excluir um servidor existente.
- Validar se o erro 500/RLS persiste.
