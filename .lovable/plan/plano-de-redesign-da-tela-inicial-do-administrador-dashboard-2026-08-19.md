# Plano de Redesign da Tela Inicial do Administrador (Dashboard)

Redesenhar a página inicial do painel administrativo para fornecer uma visão compacta e clara das informações críticas, priorizando alertas de tickets, provisionamento e métricas operacionais.

## Alterações Propostas

### 1. Backend (Servidor)
- **Atualizar `src/lib/admin.server.ts`**:
    - Adicionar busca por alertas críticos:
        - Tickets abertos com prioridade alta ou aguardando resposta do admin.
        - Serviços com erro de provisionamento (status `error`).
        - Faturas vencidas a mais de X dias.
    - Retornar uma lista de notificações recentes/críticas no objeto de resposta do `getAdminStatsImplementation`.

### 2. Frontend (Interface)
- **Modificar `src/routes/_authenticated/admin/index.tsx`**:
    - **Seção de Alertas Críticos**: Adicionar um novo componente de destaque no topo para alertas urgentes (Tickets, Provisionamento, Erros).
    - **Layout Compacto**: Reduzir o espaçamento vertical e otimizar o tamanho dos cards de estatísticas.
    - **Grid de Prioridade**: Reorganizar os cards para destacar primeiro o que exige ação imediata.
    - **Métricas Visuais**: Integrar indicadores de status rápidos (ex: badges coloridos para tickets abertos).

## Detalhes Técnicos

### Backend
- Modificar a função `getAdminStatsImplementation` para incluir:
    - Contagem e últimos tickets `open`.
    - Contagem de serviços com `status = 'error'`.
    - Buscar as 5 ações/eventos mais urgentes para exibir no topo.

### UI / UX
- Utilizar cores semânticas (vermelho para erros, laranja para pendências, azul para novos itens).
- Manter o tema "Apple-like minimal" com bordas arredondadas e sombras suaves, mas com maior densidade de informação conforme solicitado.

## Verificação
- Validar se os alertas aparecem corretamente quando há dados no banco.
- Testar a responsividade do novo layout compacto.
