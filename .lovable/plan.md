# Plano: Esclarecimento sobre Frequência de Atualização de Dados

O usuário perguntou com que frequência os dados são atualizados no sistema. Com base na análise do código, a atualização das métricas de monitoramento ocorre a cada minuto, enquanto outros dados (financeiros e perfil) são processados em tempo real ou sob demanda.

## Alterações Propostas

### Documentação (Memória do Projeto)
- Criar `mem://features/data-update-frequency.md` detalhando as frequências:
  - **Métricas VPS:** 1 minuto (via agente cron).
  - **Financeiro/Pagamentos:** Tempo real (via webhooks/gateways).
  - **Perfil/Suporte:** Instantâneo.
  - **Provedores Externos:** Sob demanda (sincronização manual no admin).

### Resposta ao Usuário
- Explicar de forma clara no chat que o monitoramento da VPS (CPU, RAM, HD) é atualizado a cada **1 minuto** pelo agente instalado, enquanto pagamentos e alterações de conta são processados em tempo real.

## Detalhes Técnicos
- O script `src/routes/api/public/scripts/install-agent.ts` configura uma `crontab` que executa `/usr/local/bin/eqsam-agent.sh` a cada minuto (`* * * * *`).
- O endpoint `src/routes/api/public/vps-metrics.ts` processa essas requisições POST e atualiza a tabela `vps_instances` e o histórico `vps_metrics_history`.
