# Plano de Otimização Mobile e Responsividade (Área do Cliente)

O objetivo é garantir que a área do cliente do HostPanel seja totalmente funcional e visualmente impecável em dispositivos móveis, seguindo a estética AbacatePay (rounded-3xl, lime-green).

## Alterações Propostas

### 1. Refinamento do AppShell (Layout Global)
- Ajustar o padding do `main` em mobile para `px-2 py-4` para maximizar o espaço.
- Melhorar o `Mobile Header` para ser mais compacto e alinhado com a marca.
- Garantir que o `Sheet` (sidebar mobile) use `rounded-r-3xl` e tenha uma experiência de toque suave.

### 2. Dashboard do Cliente (`/dashboard`)
- Transformar os cards de KPI (`KpiCard`) para serem exibidos em 1 coluna em telas muito pequenas e 2 colunas em telas médias.
- Ajustar o grid de "Minhas hospedagens" e "Financeiro" para empilhamento vertical suave.

### 3. Listagem de Serviços (`/services`)
- Refatorar os cards de serviço para um layout mais compacto em mobile, reduzindo margens internas.
- Garantir que a barra de busca não "pule" o layout ao receber foco.

### 4. Gerenciamento de Serviço (`/services/$serviceId`)
- Transformar a grid de "Ações Rápidas" em um carrossel horizontal ou grid de 2 colunas bem ajustada para evitar excesso de rolagem vertical.
- Ajustar os cards de "Detalhes do Servidor" e "Status da Conta" para empilhamento vertical.

### 5. Faturas e Pagamento (`/invoices` & `/invoices/$invoiceId`)
- Melhorar a tabela de itens da fatura em mobile, possivelmente convertendo linhas em cards se o espaço for muito reduzido.
- Otimizar a visualização do PIX (QR Code e Código) para que caiba perfeitamente na tela sem necessidade de zoom.

### 6. Suporte/Tickets (`/tickets` & `/tickets/$ticketId`)
- Ajustar a visualização de chat do ticket para que a área de entrada de texto (`Textarea`) fique fixa ou mais acessível em mobile.
- Reduzir o tamanho das bolhas de mensagem e avatares em telas pequenas.

## Detalhes Técnicos
- Uso intensivo de utilitários Tailwind v4 (`sm:`, `md:`, `lg:`).
- Ajustes de `font-size` (usando `text-xs` ou `text-sm` em mobile para labels secundárias).
- Verificação de `touch-action` e áreas de clique (mínimo 44px para botões interativos).
- Garantir que todos os modais (`Dialog`, `Sheet`) usem as animações de entrada/saída corretas.

## Próximos Passos
- [ ] Aplicar ajustes no `AppShell.tsx`.
- [ ] Otimizar rotas de Dashboard e Serviços.
- [ ] Refinar rotas de Faturas e Tickets.
- [ ] Testar fluxos de checkout e SSO em simulador mobile.
