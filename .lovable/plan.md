# Plano de Ação: Diagnóstico e Correção de Acesso a Webhooks

O usuário relatou que ainda não tem acesso às notificações de webhook (HTTP 401 ou falha no processamento). As investigações mostram que o endpoint genérico `/api/public/webhook` está recebendo requisições e respondendo 200 OK, mas o processamento de negócio (como Woovi/OpenPix) pode estar falhando silenciosamente ou aguardando dados específicos.

## Problemas Identificados
1. **Endpoint Genérico vs Endpoints Específicos**: Existem múltiplos endpoints (`/api/public/webhook`, `/api/public/webhooks/woovi`, etc.). Se o gateway estiver enviando para um endpoint específico que possui validação de assinatura HMAC ativa, e o segredo não estiver configurado ou estiver incorreto, ele retornará 401.
2. **Normalização de Dados**: O endpoint genérico busca por `gateway_reference` na tabela `transactions`. Se o gateway enviar um ID que não corresponde exatamente ao que foi salvo na criação do pagamento, a transação não é encontrada.
3. **Falta de Logs de Erro Detalhados**: Embora existam logs de auditoria, eles não capturam a pilha de erros (stack trace) completa em todos os pontos, dificultando a depuração de falhas de lógica interna.

## Etapas de Implementação

### 1. Robustez no Endpoint Genérico
- Ajustar `src/routes/api/public/webhook.ts` para ser mais flexível com os campos de ID da Woovi (OpenPix).
- Garantir que mesmo falhas de busca no banco sejam logadas como `warning` no `audit_logs` para visibilidade.

### 2. Flexibilização de Assinaturas (Opcional/Segura)
- Adicionar um log explícito quando uma assinatura HMAC falha nos endpoints específicos, indicando qual chave está faltando ou inválida.
- Assegurar que o prefixo `/api/public/` esteja realmente livre de qualquer interferência de middleware de autenticação.

### 3. Melhoria na Auditoria
- Incluir mais contexto nos logs de auditoria quando um webhook é recebido mas não processado (ex: "Transação não encontrada para a referência X").

## Detalhes Técnicos
- Arquivos afetados:
    - `src/routes/api/public/webhook.ts`: Principal ponto de entrada.
    - `src/routes/api/public/webhooks/woovi.ts`: Ajuste na validação de assinatura.
- Verificação: Simulação de payloads reais via `curl` simulando o comportamento de gateways externos.
