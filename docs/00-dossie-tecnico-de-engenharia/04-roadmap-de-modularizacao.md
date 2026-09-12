# Dossiê Técnico 04: Roadmap de Modularização e Refatoração Segura

Este documento estabelece as diretrizes de engenharia e a estratégia de fatiamento dos arquivos monolíticos do **EQSAM Painel**, garantindo que qualquer futura refatoração ocorra sem quebrar contratos existentes (*zero regressions*).

---

## 🎯 1. Princípios Imutáveis de Modularização

1. **Preservação de Fachadas (Facade Pattern):**
   Ao quebrar uma biblioteca ou serviço em submódulos menores, o arquivo original deve continuar existindo como uma fachada de reexportação (`export * from './submodule'`), garantindo que nenhum import externo quebre.
2. **Separação de Lógica de Negócio e Interface:**
   Rotas de página (`src/routes/*`) devem conter apenas orquestração de visualização e hooks de chamada; regras de cálculo, queries e chamadas externas devem residir em arquivos de serviço dedicados em `src/lib/`.
3. **Isolamento de Efeitos Colaterais:**
   Alterações no motor de VPS jamais devem impactar o motor de hospedagem DirectAdmin ou de faturamento.

---

## 📦 2. Roadmap das Frentes Monolíticas

### 2.1. Frente 1: Fatiamento da Rota de Apps PaaS (`src/routes/_authenticated/apps/$appId.tsx`)
- **Situação Atual:** Arquivo com mais de 2.500 linhas acumulando a UI de todas as abas, lógica de streaming de logs, polling de métricas, file manager e manipulação de segredos.
- **Estratégia de Fatiamento (Component Tabs Pattern):**
  - `src/components/apps/tabs/AppOverviewTab.tsx`: Visão geral, cards de status do container e botões de ação (Start/Stop/Restart).
  - `src/components/apps/tabs/AppLogsTab.tsx`: Terminal de streaming e visualizador de logs (`ContainerLogsViewer`).
  - `src/components/apps/tabs/AppFilesTab.tsx`: Integração com o Gerenciador de Arquivos e Code Editor.
  - `src/components/apps/tabs/AppEnvVarsTab.tsx`: Gestão de variáveis de ambiente e gerador de segredos.
  - `src/components/apps/tabs/AppDomainsTab.tsx`: Gestão de domínios e roteamento reverso Caddy/Traefik.
  - `src/components/apps/tabs/AppMetricsTab.tsx`: Gráficos de telemetria de CPU, memória e rede.
- **Garantia:** A rota `$appId.tsx` passa a ter menos de 250 linhas, atuando apenas como container orquestrador das abas.

---

### 2.2. Frente 2: Fatiamento do Motor Docker Swarm (`src/lib/swarm-cluster.server.ts`)
- **Situação Atual:** Arquivo com mais de 2.800 linhas acumulando comandos Docker via SSH, renderização de compose, checagem de nós e monitoramento.
- **Estratégia de Fatiamento (Módulos em `src/lib/swarm/`):**
  - `src/lib/swarm/swarm-deployer.server.ts`: Responsável exclusivamente por compor arquivos de stack e invocar `docker stack deploy`.
  - `src/lib/swarm/swarm-services.server.ts`: Consulta de status de serviços, tarefas (`docker service ps`) e réplicas.
  - `src/lib/swarm/swarm-routing.server.ts`: Configuração de labels Traefik/Caddy e subdomínios.
  - `src/lib/swarm/swarm-metrics.server.ts`: Coleta de consumo de recursos por container via `docker stats`.
  - `src/lib/swarm-cluster.server.ts`: Fachada que reexporta todas as funções com as assinaturas originais idênticas.

---

### 2.3. Frente 3: Fatiamento do Motor Financeiro (`src/lib/finance.server.ts`)
- **Situação Atual:** Acúmulo de ciclo de vida de faturas, cálculos de multas/juros, geração de PDF e orquestração de gateways.
- **Estratégia de Fatiamento (Módulos em `src/lib/finance/`):**
  - `src/lib/finance/invoice-lifecycle.server.ts`: Criação de faturas, cálculo de totais e baixa manual.
  - `src/lib/finance/gateway-dispatcher.server.ts`: Roteamento da transação para o gateway correto (Mercado Pago, PagHiper, Woovi, Stripe).
  - `src/lib/finance/wallet-manager.server.ts`: Gestão de saldo pré-pago e débitos automáticos.
  - `src/lib/finance.server.ts`: Fachada preservada.

---

## 🛡️ 3. Protocolo de Verificação Pós-Modularização

Antes de considerar qualquer etapa de modularização concluída, é obrigatório executar:
```bash
npm run check-all
```
O pipeline deve validar:
1. `npx tsc --noEmit` ➔ 0 erros de tipo.
2. `vitest run` ➔ 100% de aprovação nos testes automatizados.
3. `node scripts/test-all-queries.mjs` ➔ 0 erros em consultas ao banco de dados.
