---
name: Resolvendo visibilidade de VPS nos Serviços Contratados
description: Corrigir a query do dossiê do cliente para incluir instâncias VPS vinculadas e garantir que apareçam na lista de serviços.
type: feature
---

## Problema
Os serviços do tipo VPS não estão sendo exibidos corretamente no dossiê do cliente (seção de Serviços Contratados), impedindo a gestão administrativa.

## Causa Raiz
A query atual em `fetchClientDossier` busca apenas na tabela `services`. Embora as instâncias VPS tenham um `service_id`, o frontend pode estar esperando uma relação ou dados que não estão sendo retornados de forma completa, ou há uma falha na junção de dados entre `services` e `vps_instances`.

## Solução
1. **Expandir a query do servidor**: Atualizar `fetchClientDossier` em `src/lib/client-dossier.server.ts` para buscar também dados da tabela `vps_instances` relacionados aos serviços do cliente.
2. **Melhorar a junção de dados**: Garantir que o objeto retornado para o frontend contenha a informação de se o serviço possui uma instância VPS ativa e seus detalhes básicos (IP, External ID).
3. **Ajustar a UI**: Atualizar a tabela de serviços no dossiê do cliente para mostrar informações específicas de VPS (como IP) quando disponíveis, facilitando a identificação.

## Detalhes Técnicos
- Modificar `src/lib/client-dossier.server.ts` para incluir uma busca paralela em `vps_instances` filtrando por `service_id`.
- Mapear as instâncias encontradas de volta para o array de serviços no retorno da função.
- Garantir que o `supabaseAdmin` seja usado para acessar `vps_instances` se houver restrições de RLS para o staff.
