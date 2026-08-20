# Plano: Venda Imediata e Links Únicos de Compra

Este plano descreve as alterações necessárias para permitir que administradores marquem produtos como "Disponíveis para compra imediata", gerando links exclusivos que automatizam o cadastro e o redirecionamento dos clientes para a finalização da compra.

## Alterações Técnicas

### 1. Banco de Dados
- Adicionar a coluna `immediate_purchase` (boolean, default false) à tabela `public.products` via migração SQL.

### 2. Backend (Server Functions)
- Atualizar `updateProduct` e `createProduct` em `src/lib/support.functions.ts` para suportar o novo campo.
- Garantir que o validador Zod inclua `immediate_purchase`.

### 3. Interface Administrativa
- Modificar `src/routes/_authenticated/admin/products.tsx`:
    - Adicionar um switch no modal de edição de produtos para "Disponível para compra imediata".
    - Exibir o link único de compra no card do produto e no modal de edição.
    - O link seguirá o formato: `https://dominio.com/checkout/[productId]?immediate=true`.

### 4. Fluxo de Compra e Autenticação
- Ajustar a lógica de redirecionamento no `src/routes/auth.tsx`:
    - Detectar parâmetros de compra imediata no `redirect`.
    - Garantir que, após o cadastro ou login, o usuário seja enviado diretamente para o checkout do produto específico.
- Validar `src/routes/_authenticated/checkout.$productId.tsx` (ou rota similar) para garantir que o plano seja pré-selecionado corretamente.

## Detalhes Técnicos

- **Migração SQL**: Já preparada em `supabase/migrations/20260820150000_add_immediate_purchase_to_products.sql`.
- **Formato do Link**: O link será persistente baseado no UUID do produto.
- **UX**: O cliente não precisará navegar pelo catálogo se usar o link direto; ele cairá na tela de cadastro (se deslogado) e depois no pagamento.

---
Este plano foca na automação da jornada do cliente, removendo fricções entre o interesse de compra e o checkout final.
