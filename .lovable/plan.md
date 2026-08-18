# Plano de Implementação: Detalhes da VPS e Monitoramento de Recursos

O objetivo é reformular a interface de gerenciamento de VPS para o cliente, simplificando a listagem inicial e adicionando uma visão detalhada com métricas de consumo (RAM, HD, Rede) provenientes da API da Contabo.

## Alterações Propostas

### Backend (Server Functions & Helpers)

1.  **Novas Server Functions em `src/lib/vps.functions.ts`**:
    *   `getVPSDetails(instanceId)`: Busca informações completas de uma instância, incluindo status em tempo real e estatísticas.
2.  **Helpers em `src/lib/contabo.server.ts`**:
    *   Implementar `getContaboInstanceStats(instanceId)`: Chama a API da Contabo para obter métricas de uso de CPU, RAM, Disco e Rede.

### Frontend (Interface)

1.  **Página de Listagem (`src/routes/_authenticated/vps/index.tsx`)**:
    *   Simplificar o card da VPS na lista.
    *   Remover botões de ação direta da lista (ou mantê-los secundários).
    *   Adicionar um botão proeminente "Ver Detalhes".
2.  **Nova Rota de Detalhes (`src/routes/_authenticated/vps/$vpsId.tsx`)**:
    *   Criar uma nova página para exibir os detalhes de uma VPS específica.
    *   Exibir indicadores visuais (Progress bars/Charts) para uso de CPU, RAM e HD.
    *   Exibir tráfego de rede.
    *   Agrupar os controles de energia (Ligar, Parar, Reset) e Reinstalação nesta página.

## Detalhes Técnicos

### Estrutura de Pastas
*   `src/routes/_authenticated/vps/index.tsx`: Listagem simplificada.
*   `src/routes/_authenticated/vps/$vpsId.tsx`: (Novo) Detalhes da instância.
*   `src/lib/vps.functions.ts`: Adicionar lógica de busca de detalhes.
*   `src/lib/contabo.server.ts`: Adicionar integração com endpoints de estatísticas da Contabo.

### Considerações de Segurança
*   Garantir que as políticas RLS na tabela `vps_instances` permitam apenas que o dono da VPS ou o admin vejam os detalhes.
*   A server function `getVPSDetails` deve verificar se a `instanceId` pertence ao `userId` autenticado.

## Próximos Passos
1.  Atualizar `src/lib/contabo.server.ts` com o método de estatísticas.
2.  Atualizar `src/lib/vps.functions.ts` para expor o novo endpoint.
3.  Criar a rota de detalhes `$vpsId.tsx`.
4.  Refatorar a página `index.tsx` para o novo design simplificado.
