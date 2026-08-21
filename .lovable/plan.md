# Plano de Aprimoramento da Separação entre VPS e Hospedagem Web

Este plano detalha as correções necessárias para garantir que os serviços do tipo **VPS** sejam tratados de forma distinta da **Hospedagem Web** em toda a plataforma (Área do Cliente e Painel Admin), garantindo a visibilidade correta das instâncias.

## Problemas Identificados
- Confusão visual entre VPS e Hospedagem na Área do Cliente.
- Dificuldade na identificação de instâncias VPS vinculadas a serviços no dossiê do cliente (Admin).
- Falta de links diretos para a interface de monitoramento da VPS em locais estratégicos.
- Terminologia genérica ("Gerenciar Plano") sendo usada para servidores VPS.

## Ações Propostas

### 1. Ajustes na Área do Cliente
- **Listagem de Serviços (`src/routes/_authenticated/services.index.tsx`):**
    - Refinar a lógica de exibição para que, se o `product_type` for 'vps', o card exiba o IP da instância no lugar do domínio (se o domínio for nulo).
    - Mudar o texto do botão "Painel" para "Monitorar" ou similar quando for VPS, e redirecionar para a rota de detalhes da VPS (`/vps/$vpsId`) em vez do SSO do DirectAdmin.
- **Gerenciamento de Serviço (`src/routes/_authenticated/services.$serviceId.tsx`):**
    - Se for VPS, substituir a seção de "Ações Rápidas" (E-mails, DB, etc.) por atalhos de monitoramento de recursos (CPU, RAM, Disco).
    - Adicionar um link proeminente "Ir para Painel de Controle VPS".

### 2. Ajustes no Painel Administrativo
- **Dossiê do Cliente (`src/routes/_authenticated/admin/clients.$clientId.tsx`):**
    - Na aba de "Serviços", destacar visualmente instâncias VPS vinculadas.
    - Garantir que a coluna "Servidor/VPS" mostre claramente o `external_id` e o `ip_address` da instância Contabo.
    - Adicionar um botão de atalho para a visualização administrativa da VPS.

### 3. Melhoria na Lógica de Dados
- **Mapeamento de Funções (`src/lib/support.functions.ts`):**
    - Ajustar `getServiceServerDetails` para retornar metadados da instância VPS se disponível, permitindo que a interface tome decisões baseadas no estado real do servidor.
- **Dossiê Server-Side (`src/lib/client-dossier.server.ts`):**
    - Refinar o join para garantir que `vps_instances` traga todos os campos necessários para exibição imediata (IP, Status, Provedor).

## Detalhes Técnicos
- Utilização da coluna `product_type` da tabela `products` como discriminador principal.
- Uso do relacionamento `vps_instances.service_id` para vincular a entidade técnica ao serviço comercial.
- Condicional no React para alternar componentes de UI (Lucide Icons, Badges e Botões de Ação).

## Verificação
- Validar se um cliente com VPS visualiza o IP e o ícone de monitor corretamente.
- Confirmar se o admin consegue ver o status da VPS Contabo dentro do dossiê do cliente.
- Testar a navegação entre "/services/id" e "/vps/id" para serviços do tipo VPS.
