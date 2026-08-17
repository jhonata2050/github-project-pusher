# Plano de Implementação: Planos Categorizados na Home

O objetivo é organizar a exibição dos planos na página inicial em categorias (grupos de produtos), permitindo que os clientes encontrem mais facilmente o serviço desejado.

## Alterações Propostas

### 1. Backend / Banco de Dados
- Nenhuma alteração de esquema é necessária, pois a tabela `product_groups` e a relação com `products` já existem.

### 2. Frontend (Página Inicial - `src/routes/index.tsx`)
- Atualizar a consulta `useQuery` para buscar tanto os produtos quanto os grupos de produtos.
- Modificar a renderização da seção "Escolha seu plano" para:
    - Agrupar os produtos por categoria.
    - Exibir cada categoria como uma subseção ou aba (Tabs).
    - Manter o design Apple-like minimalista.
- Garantir que grupos vazios (sem produtos visíveis) não sejam exibidos.

### 3. Ajustes no Painel Admin (`src/routes/_authenticated/admin/products.tsx`)
- Garantir que a lógica de "Visibilidade" dos produtos e grupos esteja sendo respeitada na home.

## Detalhes Técnicos
- Utilizar `useQuery` com `supabase.from('product_groups').select('..., products(...)')` ou realizar o agrupamento em memória no frontend.
- Implementar componente de `Tabs` do shadcn/ui para navegar entre as categorias caso haja mais de uma.
- Manter suporte a múltiplos ciclos de pagamento (priorizando o mensal na exibição rápida).

## Próximos Passos
- Validar se o usuário prefere visualização em "Tabs" (Abas) ou "Scroll vertical com títulos de categorias".
- Implementar a lógica de agrupamento.
