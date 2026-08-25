# Plano: Varredura Completa de Integridade do Sistema

Este plano detalha a execução de uma varredura diagnóstica para identificar falhas, anomalias e pontos de gargalo em módulos críticos da EQSAM CLOUD.

## Módulos e Critérios de Varredura

### 1. Rotas e Acessibilidade
- **Critério**: Verificar se todas as rotas principais (Admin, Dashboard, Checkout) estão carregando sem erros 404/500.
- **Ação**: Executar script Playwright para navegar pelas rotas `/`, `/auth`, `/checkout`, `/dashboard` e `/admin`.

### 2. Pagamentos e Gateways
- **Critério**: Validar a conectividade com CajuPay e PagHiper e a integridade dos webhooks.
- **Ação**: Verificar `src/lib/payments.server.ts` em busca de chaves ausentes ou URLs de callback incorretas. Inspecionar logs de transações recentes no banco.

### 3. Renovações e Cron (Maintenance)
- **Critério**: Garantir que o agendamento de faturas e suspensão de serviços está funcionando.
- **Ação**: Analisar `src/routes/api/public/cron/maintenance.ts` para validar a lógica de datas e integração com DirectAdmin.

### 4. Integrações VPS (API Contabo)
- **Critério**: Validar comunicação com a Contabo e coleta de métricas.
- **Ação**: Testar o endpoint de métricas e verificar falhas de autenticação nos logs de integração em `src/lib/contabo.server.ts`.

### 5. Ativações e Provisionamento
- **Critério**: Verificar se novos serviços estão sendo provisionados corretamente (DirectAdmin/VPS).
- **Ação**: Simular fluxo de ativação e verificar o tratamento de erros em `src/lib/finance.server.ts`.

## Execução Técnica

A varredura será realizada através de:
1.  **Auditoria Estática**: Verificação de arquivos de configuração e chaves de API.
2.  **Testes de Runtime**: Execução de scripts Playwright para simular interações críticas.
3.  **Inspeção de Logs**: Busca por exceptions recentes no banco de dados Supabase (tabela `logs` e `whmcs_imports`).

## Resultado Esperado
Um relatório consolidado no final da execução listando:
- Falhas críticas (bloqueantes)
- Anomalias de lógica ou performance
- Recomendações de correção imediata
