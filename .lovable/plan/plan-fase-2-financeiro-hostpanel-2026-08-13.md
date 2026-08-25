# Plan: Fase 2 — Financeiro (HostPanel)

Implementação do sistema de pedidos, faturas, serviços e promoções para substituição do WHMCS.

## 1. Banco de Dados (Esquema Financeiro)

### Tabelas a criar:
- `coupons`: Cupons de desconto (fixo/percentual, recorrente ou não).
- `orders`: Cabeçalho do pedido (vínculo cliente + cupom + status).
- `services`: Instâncias de produtos ativos para o cliente (vínculo ao DirectAdmin futuramente).
- `invoices`: Faturas (vínculo a pedido ou avulsa, status de pagamento).
- `invoice_items`: Itens da fatura (descrição, valor unitário, quantidade).
- `transactions`: Log de pagamentos/créditos.

### RLS e Permissões:
- Clientes: SELECT/INSERT próprio.
- Admin/Staff: SELECT/INSERT/UPDATE/DELETE total via `has_role`.
- `GRANT` explícito em todas as novas tabelas.

## 2. Lógica de Servidor (Server Functions)

- `createOrder`: Processa o carrinho, aplica cupom, cria pedido e gera a primeira fatura.
- `applyCoupon`: Valida cupom (data, limites, produto compatível).
- `getInvoiceDetails`: Busca fatura e itens com segurança.

## 3. Interface Administrativa (Financeiro)

- **Faturas**: Listagem geral, filtros por status (Paga, Pendente, Cancelada), visualização e baixa manual.
- **Cupons**: CRUD de promoções.
- **Pedidos/Serviços**: Gestão do ciclo de vida (Ativar, Suspender).

## 4. Interface do Cliente (Financeiro)

- **Minhas Faturas**: Lista de cobranças com status e botão de pagamento.
- **Visualização de Fatura**: Estilo AbacatePay (limpo, com detalhes dos itens e QR Code placeholder por enquanto).

## Detalhes Técnicos

- Status de faturas: `pending`, `paid`, `cancelled`, `refunded`, `overdue`.
- Status de serviços: `pending`, `active`, `suspended`, `terminated`.
- Utilização de `createServerFn` para criação de pedidos para garantir atomicidade.
