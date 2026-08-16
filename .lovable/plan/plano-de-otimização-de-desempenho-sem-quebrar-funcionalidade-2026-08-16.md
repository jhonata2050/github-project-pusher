# Plano de Otimização de Desempenho (sem quebrar funcionalidades)

Diagnóstico feito lendo as rotas do painel, as server functions (`src/lib/*.functions.ts`) e os índices reais do banco.

## O que está deixando o sistema lento hoje

1. **Verificação de papel repetida em cada chamada**
   Quase toda server function faz um `SELECT` em `user_roles` antes da consulta real. Isso dobra o número de idas ao banco em cada tela (ex.: abrir Tickets = 2 consultas + contagem).

2. **`select("*")` em quase tudo**
   Listas de clientes, faturas, serviços, logs e o dossiê do cliente trazem todas as colunas (inclusive campos grandes como `metadata`, `notes`, `stats`). Mais bytes na rede = renderização mais lenta.

3. **Dossiê do cliente sem limite**
   `client-dossier.server.ts` busca faturas, serviços, tickets e e-mails do cliente **sem `limit`**. Em clientes antigos isso vira centenas de linhas por aba.

4. **`count: 'exact'` em listas paginadas**
   Em `tickets`/`logs`/`clients` o Postgres precisa varrer a tabela inteira só para mostrar o total.

5. **Índices faltando para os filtros mais usados**
   Existem índices por `user_id`, mas faltam os compostos usados nas ordenações: `services(user_id, created_at desc)`, `invoices(user_id, created_at desc)`, `tickets(user_id, updated_at desc)`, `email_logs(user_id, created_at desc)`, `invoice_items(invoice_id)`, `transactions(invoice_id)`, `vps_instances(service_id)`. Sem eles o banco ordena em memória.

6. **Cascata de carregamento no admin**
   `admin/route.tsx` bloqueia a tela com skeleton até `useRoles` + `useIsStaff` responderem (2 requisições em série) e só depois o filho começa a buscar dados. Em Produtos são 5 queries disparadas juntas, incluindo Contabo (API externa lenta) mesmo quando o modal está fechado.

7. **Invalidação global de cache**
   No `SIGNED_IN`/`USER_UPDATED` o app chama `queryClient.invalidateQueries()` sem filtro, refazendo todas as queries da sessão (inclusive as caras).

8. **Chamada externa síncrona na Contabo**
   `getContaboProductTypes` e a sincronização de instâncias vão à API da Contabo a cada abertura de tela, sem cache.

## Plano de correção (em ordem de ganho/risco)

### Etapa 1 — Banco de dados (ganho alto, risco zero)
- Migração criando os índices compostos listados acima (`CREATE INDEX IF NOT EXISTS`, nenhuma alteração de schema ou RLS).
- Nenhuma mudança de código: as mesmas consultas ficam mais rápidas.

### Etapa 2 — Consultas mais enxutas
- Trocar `select("*")` por listas explícitas de colunas nas **listagens** (clientes, faturas, serviços, tickets, logs). Telas de detalhe continuam completas.
- Adicionar `limit` nas quatro coleções do dossiê do cliente (ex.: 20 registros recentes por aba) com botão "ver mais".
- Trocar `count: 'exact'` por `count: 'planned'` nas listas grandes (logs/clientes), mantendo `exact` onde o total precisa ser preciso.

### Etapa 3 — Uma verificação de papel em vez de duas consultas
- Substituir o `SELECT user_roles` manual dentro das funções por uma chamada única a `has_role`/`is_staff` (funções já existentes, `security definer`), ou por um middleware que resolve o papel uma vez por requisição.
- Comportamento idêntico, metade das idas ao banco.

### Etapa 4 — Front-end: cache e cascata
- Unificar `useRoles` + `useIsStaff` em uma única query com `staleTime` longo, para o layout admin não bloquear duas vezes.
- Adiar queries caras com `enabled`: catálogo Contabo só carrega quando o modal de novo produto abre; sincronização Contabo só no clique.
- Definir `staleTime` maior (10–30 min) para dados quase estáticos: produtos, grupos, servidores, configurações.
- Restringir a invalidação global a chaves relevantes no login, em vez de `invalidateQueries()` sem filtro.

### Etapa 5 — Cache de dados externos
- Guardar o catálogo de planos Contabo em `system_settings` (ou cache em memória com TTL) e revalidar sob demanda, com botão "Atualizar catálogo".

## Por que essa é a melhor alternativa
O gargalo não é o React, é o **número e o peso das idas ao banco/API por tela**. Índices e consultas enxutas resolvem a maior parte sem tocar em regra de negócio, RLS ou layout. Alternativas como views materializadas, cache Redis ou SSR completo trariam risco de dados desatualizados e refatoração ampla, com ganho pequeno para o volume atual. As etapas são independentes e reversíveis: cada uma pode ser aplicada e validada isoladamente.

## Mudanças visíveis ao usuário
- Páginas do admin e do cliente abrem mais rápido, sem duplo skeleton.
- Dossiê do cliente carrega instantâneo, mostrando os registros recentes com opção de ver mais.
- Tela de produtos não trava esperando a Contabo.
- Nenhuma funcionalidade removida.
