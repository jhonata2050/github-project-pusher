# Plano de Implementação: Gestão de Planos e Sincronização Contabo

Corrigir a funcionalidade de criação de novos planos no painel administrativo e implementar a sincronização de planos VPS diretamente da API da Contabo.

## Alterações

### 1. Banco de Dados
- Nenhuma alteração de esquema necessária (tabelas `products`, `product_prices` e `product_groups` já existem).

### 2. Backend (Server Functions)
- **`src/lib/support.functions.ts`**:
    - Implementar `createProduct`: Função para criar um novo produto com seus respectivos preços.
    - Implementar `getProductGroups`: Para listar os grupos disponíveis (Hospedagem, VPS, etc) no formulário.
    - Atualizar `updateProduct` para suportar novos campos se necessário.
- **`src/lib/vps-admin.functions.ts`**:
    - Implementar `getContaboPlansFn`: Busca a lista de planos (Product IDs/Sizes) da API da Contabo.
- **`src/lib/contabo.server.ts`**:
    - Adicionar helper para buscar tipos de instâncias/planos da API Contabo.

### 3. Frontend (Admin)
- **`src/routes/_authenticated/admin/products.tsx`**:
    - Corrigir o botão "Novo" para abrir o modal de criação.
    - Adicionar campos para vincular um produto ao ID da Contabo quando o tipo for VPS.
    - Implementar a lógica de busca de planos da Contabo no modal de edição/criação.

## Detalhes Técnicos
- O provisionamento VPS Contabo requer o envio de um `productId` (ex: `vps-m`). A sincronização permitirá que o administrador escolha esses IDs oficiais em um dropdown, evitando erros de digitação.
- Utilização de `UPSERT` para garantir integridade na criação de preços.
