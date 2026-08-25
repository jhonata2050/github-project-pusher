# Plano de Correção: Visibilidade e Comportamento de VPS

O sistema está tratando alguns serviços de VPS como hospedagem web porque a lógica de identificação depende de múltiplos fatores (tipo de produto e ciclo de faturamento) que não estão sincronizados. Além disso, a visualização do cliente está falhando ao buscar instâncias vinculadas devido a restrições de RLS.

## Alterações Propostas

### 1. Backend e Lógica de Dados
- **Refinar `getServiceServerDetails`:** Garantir que o `product_type` e o vínculo com `vps_instances` sejam retornados corretamente usando `supabaseAdmin` para contornar restrições de leitura.
- **Normalizar Identificação de VPS:** Padronizar a verificação de tipo de produto em todo o sistema, priorizando o campo `product_type` da tabela `products`.

### 2. Interface do Cliente (`/services`)
- **Correção da Listagem:** Ajustar o componente de cards para identificar corretamente serviços do tipo 'vps', exibindo o IP da instância e o botão "Monitorar" (que leva à área de VPS) em vez do botão "Painel" (SSO DirectAdmin).
- **Correção de Detalhes:** Na página de detalhes do serviço, ocultar ferramentas de hospedagem (E-mail, DB, DNS) para serviços VPS e exibir atalhos de monitoramento.

### 3. Interface Administrativa
- **Dossiê do Cliente:** Ajustar a lógica de vinculação de VPS no modal de edição de serviço para garantir que, uma vez vinculada, a instância apareça corretamente para o cliente.
- **Badge de Identificação:** Reforçar a sinalização visual de "VPS" nos serviços para evitar confusão com hospedagem compartilhada.

## Detalhes Técnicos
- Atualizar `src/lib/support.functions.ts` para incluir `products(product_type)` na busca de detalhes do serviço.
- Ajustar `src/routes/_authenticated/services.index.tsx` para usar o `product_type` retornado para alternar o layout do card.
- Garantir que a função `getMyVPSInstances` em `src/lib/vps.functions.ts` valide corretamente a posse do serviço antes de exibir a instância na área dedicada de VPS.
