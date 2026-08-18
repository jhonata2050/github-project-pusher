# Plano: Correção do Agente de Monitoramento e Script de Instalação

O usuário reportou um erro `404: command not found` ao tentar executar o comando de instalação do agente. Isso ocorre porque o arquivo `install-agent.sh` não estava presente no repositório GitHub (que foi clonado para o Lovable) ou no diretório público do projeto. Além disso, as métricas em tempo real dependem de um endpoint para receber os dados do servidor.

## Alterações Propostas

### 1. Criar Script de Instalação Público
- Criar o diretório `public/scripts/`.
- Criar o arquivo `public/scripts/install-agent.sh` que será servido pelo próprio projeto.
- O script irá:
  - Validar o UUID da VPS.
  - Instalar dependências necessárias (`sysstat`, `curl`).
  - Criar um script de coleta em `/usr/local/bin/hostpanel-agent.sh`.
  - Configurar um cronjob para rodar a cada 1 minuto e enviar os dados para a nossa API.

### 2. Criar Endpoint de Métricas (API Pública)
- Criar `src/routes/api/public/vps-metrics.ts`.
- Este endpoint receberá os dados de CPU, RAM e Disco via POST.
- Os dados serão salvos na coluna `last_metrics` da tabela `vps_instances` usando `supabaseAdmin` para contornar restrições de RLS durante o recebimento (já que o servidor não tem autenticação de usuário).

### 3. Atualizar Interface de Detalhes da VPS
- Ajustar `src/routes/_authenticated/vps/$vpsId.tsx` para usar a URL correta do script (apontando para o próprio domínio do projeto no Lovable).
- Atualizar a lógica de exibição para priorizar os dados vindos do agente (`last_metrics`) quando os dados da API do provedor não estiverem disponíveis.

### 4. Banco de Dados
- Adicionar coluna `last_metrics` (JSONB) na tabela `vps_instances` se ainda não existir.

## Detalhes Técnicos
- O comando de instalação sugerido ao usuário será:
  `curl -sSL https://{projeto}.lovable.app/scripts/install-agent.sh | bash -s -- {vps_id}`
- O agente enviará dados no formato: `{"vps_id": "...", "cpu": 10, "ram": 45, "disk": 30}`.
