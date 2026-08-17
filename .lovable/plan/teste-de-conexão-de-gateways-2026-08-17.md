---
name: Teste de Conexão de Gateways
description: Testar a funcionalidade de validação de conexão em todos os gateways e garantir a estabilidade da interface (sem tela em branco).
type: feature
---

# Teste de Conexão de Gateways

O objetivo deste plano é verificar a robustez da funcionalidade de "Testar Conexão" na área administrativa de finanças, garantindo que:
1. Todos os gateways implementados (AbacatePay, Stripe, Mercado Pago, Woovi, PagHiper, CajuPay e Contabo) respondam corretamente ao teste.
2. Erros de rede ou credenciais inválidas sejam capturados graciosamente sem causar o travamento da interface (tela em branco).

## Ações
- Criar um script automatizado com Playwright para simular o clique no botão "Testar Conexão" em cada gateway.
- Verificar se o feedback visual (toast de sucesso ou erro) é exibido corretamente.
- Garantir que a aplicação permanece interativa após falhas de autenticação simuladas.

## Detalhes Técnicos
- O script navegará até `/admin/finance`.
- Para cada gateway listado em `GATEWAYS`:
  - Preencherá campos obrigatórios com valores fictícios (ou reais se disponíveis no ambiente de teste).
  - Acionará a função `testGatewayConnection` via interface.
  - Validará que o componente `AdminFinanceSettingsPage` não sofre crash.
- Ajustar `src/lib/gateway-validation.server.ts` se algum caso de borda (timeout ou resposta malformada da API externa) ainda puder lançar exceções não tratadas.
