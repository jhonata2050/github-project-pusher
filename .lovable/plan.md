# Plano: Verificação e Restauração de Configurações de Gateways

O usuário reportou que as configurações de gateways salvas anteriormente "desapareceram" após a limpeza de valores vazios no banco de dados.

## Análise
- **Causa Raiz**: Os registros que continham strings vazias (`""`) foram deletados para permitir que a interface mostrasse os placeholders corretamente e evitasse conflitos de lógica.
- **Estado Atual**: Consultas ao banco confirmam que as chaves de API (Stripe, Mercado Pago, etc.) não existem mais na tabela `system_settings` (foram deletadas conforme planejado).
- **Expectativa**: O usuário precisa reincerir as chaves. Se ele já as reinseriu e elas não persistiram, precisamos verificar o fluxo de salvamento.

## Ações Propostas

1. **Verificar Persistência**: Testar se o salvamento está funcionando corretamente no ambiente de produção.
2. **Normalização de Dados**: Ajustar a função `updateSystemSettings` em `src/lib/support.functions.ts` para garantir que ela não salve strings vazias se o usuário deixar o campo em branco, preferindo deletar a chave ou salvar `null`.
3. **Instrução ao Usuário**: Explicar que os dados "limpos" eram strings vazias inválidas e que é necessário preencher os campos reais uma última vez para que fiquem salvos corretamente.

## Detalhes Técnicos
- **Arquivo**: `src/lib/support.functions.ts`
- **Função**: `updateSystemSettings`
- **Melhoria**: Adicionar lógica para ignorar ou remover chaves que recebam valores vazios no `upsert`.
