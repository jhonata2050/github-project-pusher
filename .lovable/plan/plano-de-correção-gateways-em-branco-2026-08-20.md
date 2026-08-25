# Plano de Correção: Gateways em Branco

O problema onde os gateways aparecem em branco é causado pela falta de valores na tabela `system_settings` para as chaves correspondentes. Isso ocorre porque o sistema espera que as chaves de API e segredos estejam salvos no banco de dados, mas os registros atuais estão com a coluna `value` vazia (strings vazias).

## Alterações Propostas

### 1. Backend (Resiliência na Leitura)
- Ajustar `src/lib/support.functions.ts` para garantir que, se um valor estiver vazio no banco, ele retorne `null` ou mantenha a chave no objeto apenas se houver conteúdo, evitando que o frontend tente renderizar campos com strings vazias como se fossem dados válidos.

### 2. Frontend (Interface de Configuração)
- Modificar `src/routes/_authenticated/admin/finance.tsx` para:
  - Melhorar a exibição do status "Ativo/Inativo" baseado na presença real de dados.
  - Adicionar um aviso visual claro quando um gateway está configurado no código mas não tem credenciais no banco.
  - Garantir que o `defaultValue` dos campos de input não oculte a necessidade de preenchimento.

### 3. Banco de Dados (Investigação e Auditoria)
- Adicionar logs de auditoria quando houver falha na leitura de credenciais.

## Detalhes Técnicos
- O problema foi identificado via `supabase--read_query`, que mostrou chaves como `stripe_secret_key` com `value: ""`.
- A função `isGatewayConfigured` em `src/lib/gateways.ts` já faz uma verificação básica, mas a página de admin carrega esses valores vazios diretamente nos inputs, o que pode dar a impressão de que "algo sumiu" se o usuário esperava ver placeholders ou dados mascarados.
- Vou implementar uma melhoria no `updateSystemSettings` para evitar salvar strings vazias se o campo for obrigatório.

## Passos de Verificação
1. Acessar a página de Financeiro no Admin.
2. Validar se os campos agora exibem placeholders quando vazios.
3. Testar o salvamento de uma credencial e verificar se ela persiste corretamente.
