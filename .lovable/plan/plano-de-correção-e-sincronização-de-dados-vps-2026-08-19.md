# Plano de Correção e Sincronização de Dados VPS

O usuário relatou que os dados das instâncias VPS (CPU, RAM, Disco, Região) ainda estão incorretos no painel, apesar de atualizações anteriores. A análise indica que os dados exibidos vêm da tabela `vps_instances`, que pode estar desatualizada em relação à realidade técnica (Contabo) ou ao que foi importado do WHMCS.

## Ações Propostas

### 1. Sincronização de Backend (Correção de Dados Falsos)
- Implementar uma função de sincronização em `src/lib/vps.functions.ts` que busca os detalhes reais da API Contabo e atualiza as colunas físicas (`cpu_cores`, `ram_gb`, `disk_gb`, `region`, `os_template`) da tabela `vps_instances`.
- Garantir que, se a API Contabo falhar, os dados manuais inseridos via Admin/Banco permaneçam como fallback.

### 2. Ajuste na Interface de Listagem
- Modificar `src/routes/_authenticated/vps/index.tsx` para garantir que o card da VPS utilize prioritariamente os dados de hardware (`cpu_cores`, `ram_gb`, `disk_gb`) em vez de tentar calcular métricas de uso em tempo real quando estas não estão disponíveis (exibindo "N/A" ou valores padrão incorretos).
- Corrigir a exibição da Região e do Sistema Operacional para refletir os valores reais do banco de dados sincronizado.

### 3. Melhoria na Detecção do Agente
- Ajustar a lógica em `src/routes/_authenticated/vps/$vpsId.tsx` para diferenciar claramente entre "Especificações do Servidor" (estáticas) e "Uso em Tempo Real" (dinâmicas via agente).
- Se o agente não estiver enviando dados, mostrar as especificações contratadas de forma clara, sem induzir ao erro de dados falsos.

## Detalhes Técnicos
- Utilizar `supabaseAdmin` para atualizações de hardware para evitar bloqueios de RLS durante a sincronização automática.
- Mapear os tipos de produto da Contabo (ex: VPS S, VPS M) para as capacidades reais se a API de instâncias não retornar os cores/RAM detalhados.

```typescript
// Exemplo de mapeamento Contabo
const CONTABO_SPECS = {
  'vps-s': { cpu: 4, ram: 8, disk: 200 },
  'vps-m': { cpu: 6, ram: 16, disk: 400 },
  // ...
}
```
