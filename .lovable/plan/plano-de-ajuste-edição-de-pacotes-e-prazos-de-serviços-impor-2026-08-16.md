# Plano de Ajuste: Edição de Pacotes e Prazos de Serviços Importados

Este plano visa permitir que administradores alterem o produto/plano vinculado a um serviço (especialmente importante para serviços importados do WHMCS que precisam ser vinculados a planos locais para cobrança) e definam ou ajustem a data de vencimento.

## Alterações

### 1. Funções de Servidor (`src/lib/support.functions.ts`)
- Expandir a função `updateServiceDetails` para aceitar `product_id` e `next_due_date`.
- Garantir que a data de vencimento seja devidamente processada e salva no banco de dados.

### 2. Interface Administrativa (`src/routes/_authenticated/admin/clients.$clientId.tsx`)
- Atualizar o modal "Gerenciar Serviço" para incluir:
    - Um seletor de **Plano/Produto** (permitindo alterar o pacote importado).
    - Um campo de **Data de Vencimento** (input tipo `date`).
- Buscar a lista de produtos disponíveis para preencher o seletor.

### 3. Ajuste no Dossiê do Cliente (`src/lib/client-dossier.server.ts`)
- Garantir que a busca de serviços inclua informações suficientes do produto para a interface de edição.

## Detalhes Técnicos
- Utilizar `type="date"` no input para facilitar a entrada de datas em dispositivos móveis e desktop.
- Garantir que o `product_id` alterado reflita corretamente nas futuras faturas geradas pelo sistema.
- Manter as permissões de RLS e validações de administrador já existentes.
