# Plano: Mover Servidor Contabo e Renomear Categorias

O objetivo é realocar o servidor "Contabo" de uma categoria administrativa para outra e renomear a categoria de destino conforme solicitado.

## Alterações

### Backend (Banco de Dados)
- Renomear o grupo de produtos "Servidores DirectAdmin" para "Servidores" na tabela `public.product_groups`.
- Atribuir o servidor Contabo ao novo grupo "Servidores" (se houver uma tabela de vínculo direto, caso contrário, ajustar a configuração de exibição).

### Frontend (UI Administrativa)
- Atualizar `src/routes/_authenticated/admin/finance.tsx` para mudar o título da seção "Provedores de Infraestrutura (VPS)" (onde a Contabo reside atualmente) ou mover o componente de visualização.
- Ajustar os metadados de rota em `src/routes/_authenticated/admin/finance.tsx` para refletir o novo nome da categoria se necessário.
- Modificar o menu lateral em `src/components/app/AppShell.tsx` para garantir que o acesso ao gerenciamento da Contabo esteja sob a categoria "Servidores".

## Detalhes Técnicos
- Utilizar `supabase--migration` para alterar os nomes nos grupos de produtos.
- Ajustar `src/lib/gateways.ts` se houver referências estáticas às categorias.
- Atualizar as labels de breadcrumb e títulos de página nos arquivos de rotas afetados.

Ao final, a Contabo não aparecerá mais associada a "Financeiro e Gateways" e a categoria "Servidores DirectAdmin" passará a se chamar "Servidores".