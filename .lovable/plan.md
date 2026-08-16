# Plano de Correção: Catálogo e Grupos de Produtos

O usuário relatou impossibilidade de criar grupos de produtos e selecionar planos do DirectAdmin. Isso sugere problemas de interface (falta de local para criar grupos) e problemas de backend (RLS ou lógica de permissão).

## Ações a serem realizadas

### 1. Criar Interface para Gerenciamento de Grupos
- Criar a rota `src/routes/_authenticated/admin/product-groups.tsx` para permitir Listar, Criar, Editar e Excluir grupos de produtos.
- Adicionar o link para "Grupos de Produtos" no `ADMIN_SECTIONS` do `AppShell.tsx`.

### 2. Implementar Funções de Servidor para Grupos
- Adicionar `createProductGroup`, `updateProductGroup` e `deleteProductGroup` em `src/lib/support.functions.ts`.
- Garantir que essas funções usem `supabaseAdmin` para contornar falhas de RLS caso o usuário seja admin, ou ajustar as políticas RLS.

### 3. Ajustar Políticas de Segurança (RLS)
- Garantir `GRANT` de acesso nas tabelas `product_groups`, `products` e `product_prices`.
- Criar políticas RLS para permitir que administradores gerenciem essas tabelas.

### 4. Corrigir Seleção de Planos DirectAdmin
- Verificar por que a lista de pacotes não está sendo exibida ou não pode ser selecionada em `src/routes/_authenticated/admin/products.tsx`.
- Garantir que o `selectedServer` esteja sendo carregado corretamente e a mutation de sincronização funcione.

### 5. Verificação
- Testar a criação de um novo grupo.
- Testar a criação de um produto associado a esse grupo e a um pacote do DirectAdmin.
