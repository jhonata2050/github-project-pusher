# Plano de Correção e Melhorias (Admin & Contabo)

O usuário relatou que no Admin:
1. O grupo de produtos não exibe a opção "VPS".
2. Os planos da Contabo não estão aparecendo para seleção.
3. Precisa garantir a estética EQ SAM (AbacatePay) em todo o sistema.

## Etapa 1: Correção de Grupos de Produtos
Ao criar um produto, o dropdown de grupos só exibe grupos existentes. Se o grupo "VPS" não existir, ele não aparece.
- Criar migração SQL para garantir a existência do grupo padrão "Servidores VPS".
- Adicionar no Admin uma forma (ou botão rápido) para gerenciar/adicionar grupos de produtos se necessário, ou pelo menos garantir os padrões.

## Etapa 2: Correção da Sincronização de Planos Contabo
O erro de "planos não aparecem" geralmente ocorre por falha de autenticação ou retorno vazio da API.
- Revisar `getContaboProductTypes` em `src/lib/contabo.server.ts` para garantir que trata corretamente o array de produtos.
- Adicionar logs mais detalhados na Server Function `getContaboPlansFn` para depurar no sandbox.
- Verificar se a interface em `products.tsx` está tratando corretamente o estado de carregamento e erro da Query `contabo-plans`.

## Etapa 3: Melhorias Visuais e Branding (EQ SAM)
- Ajustar `AppShell.tsx` para garantir que o logo ocupe o espaço correto e siga as regras de design.
- Garantir que as cores OKLCH lime-green (AbacatePay) sejam aplicadas consistentemente via tokens Tailwind v4.
- Verificar o componente `Pagination.tsx` para garantir que as cores seguem o tema lime.

## Detalhes Técnicos
- **Migração SQL:** Inserir `Servidores VPS` em `product_groups` se não existir.
- **Contabo API:** O endpoint `/v1/compute/instances/products` retorna uma lista de planos. Precisamos garantir que o token é válido.
- **Frontend:** Atualizar `ProductsPage` para exibir erros amigáveis se a API da Contabo falhar (ex: "Configure a API em Financeiro").
