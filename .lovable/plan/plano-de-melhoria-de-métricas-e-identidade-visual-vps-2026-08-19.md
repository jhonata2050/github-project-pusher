# Plano de Melhoria de Métricas e Identidade Visual VPS

Este plano detalha a implementação de métricas históricas, remoção de menções à Contabo em favor da marca EQSAM CLOUD e adição de dados de acesso SSH.

## Alterações de Banco de Dados (Supabase)

1.  **Novas Colunas em `public.vps_instances`**:
    *   `ssh_host`: String (opcional)
    *   `ssh_port`: Integer (default 22)
    *   `ssh_user`: String (default 'root')
    *   `ssh_password`: String (opcional, sensível)
2.  **Nova Tabela `public.vps_metrics_history`**:
    *   `id`: UUID (PK)
    *   `vps_id`: UUID (FK para `vps_instances`, cascade delete)
    *   `cpu`: Integer
    *   `ram`: Integer
    *   `disk`: Integer
    *   `created_at`: Timestamptz (default now())
    *   Índice em `(vps_id, created_at)` para consultas rápidas.
3.  **Segurança (RLS)**:
    *   Habilitar RLS em `vps_metrics_history`.
    *   Políticas para permitir que usuários visualizem métricas de suas próprias instâncias.
    *   Políticas para administradores visualizarem tudo.
    *   Grant de acesso para `authenticated` e `service_role`.

## Backend (Server Functions e API)

1.  **`src/routes/api/public/vps-metrics.ts`**:
    *   Atualizar para, além de atualizar `last_metrics` na tabela `vps_instances`, inserir um novo registro na tabela `vps_metrics_history`.
2.  **`src/lib/vps.functions.ts`**:
    *   Adicionar função `getVPSMetricsHistory` para buscar dados agrupados por períodos (24h, 7d, 30d).
    *   Atualizar `getVPSDetails` para incluir os novos campos SSH.
3.  **`src/lib/vps-admin.functions.ts`**:
    *   Adicionar função `updateVPSSSHDetails` para permitir que o admin configure o acesso.

## Frontend (UI/UX)

1.  **Identidade Visual**:
    *   Substituir todas as ocorrências de "Cloud Server" ou referências genéricas que ainda restarem por "EQSAM CLOUD" na interface de VPS.
2.  **Página de Detalhes (`src/routes/_authenticated/vps/$vpsId.tsx`)**:
    *   Adicionar aba ou seção de "Gráficos de Uso" com seletores de período.
    *   Implementar gráficos (usando Recharts ou similar, se disponível, ou barras de progresso históricas) para CPU, RAM e Disco.
    *   Adicionar card de "Acesso SSH" exibindo Host, Porta, Usuário e um botão para mostrar a senha (se disponível).
3.  **Área Administrativa**:
    *   Adicionar campos SSH na edição de instância VPS no admin.

## Automatização

1.  **Script de Instalação**:
    *   Manter o script atual, que já é resiliente, mas garantir que ele seja o padrão para toda nova VPS.
    *   *Nota*: A implantação automática em toda nova VPS requer integração com o fluxo de provisionamento da Contabo (cloud-init ou scripts de pós-instalação), o que será preparado no backend.

## Detalhes Técnicos

*   O armazenamento de métricas será limitado por uma política de retenção (opcional, via cron no DB) para evitar crescimento excessivo.
*   A marca "EQSAM CLOUD" será centralizada em constantes se possível para facilitar futuras mudanças.
