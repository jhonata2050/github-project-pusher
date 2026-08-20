# Plano de Ação: Resiliência e Normalização de Webhooks

Este plano visa resolver de forma definitiva os erros de processamento de webhooks de múltiplos gateways, garantindo que o sistema seja resiliente a variações de payload, falhas de parsing e problemas de assinatura.

## Análise Técnica do Problema
O erro reportado no payload `{"data_criacao":"2026-08-20T15:34:43.889Z","evento":"teste_webhook","event":"OPENPIX:CHARGE_COMPLETED"}` ocorre porque:
1. **Validação de Assinatura**: O sistema tenta validar o HMAC, mas payloads de teste muitas vezes não o enviam ou usam chaves diferentes.
2. **Estrutura Inconsistente**: O sistema espera `payload.charge.correlationID`, mas no payload de teste esse campo não existe.
3. **Respostas de Erro**: O gateway (OpenPix) recebe erro 406/500 e continua tentando, causando sobrecarga ou logs de erro persistentes.

## Arquitetura Proposta

### 1. Normalização de Dados
Centralizar a lógica de extração de dados para que a função de negócio não precise conhecer a estrutura de cada gateway.

### 2. Idempotência e Segurança
- **Idempotência**: Verificar se a fatura já está paga ou se a transação já foi concluída antes de provisionar serviços.
- **Segurança**: Validação de assinatura rigorosa para produção, mas flexível para eventos de "teste" (apenas logando o teste).

### 3. Tratamento de Erros "Silencioso" para Gateways
Sempre retornar HTTP 200 para o gateway após registrar o recebimento no banco de dados, evitando retentativas infinitas por erros de lógica interna.

## Tarefas de Implementação

### Backend (Server Functions & Webhooks)
- **Centralizar Detecção**: Atualizar `src/routes/api/public/webhook.ts` para identificar o gateway pelo payload ou headers de forma mais robusta.
- **Robustez no Parsing**: Adicionar verificações de existência (`Optional Chaining`) em todos os campos de payload.
- **Auditoria Aprimorada**: Garantir que o `audit_logs` salve o payload bruto mesmo quando o processamento falha.
- **Refatorar Gateways Específicos**: Aplicar o padrão de "Parsing Seguro" nos webhooks de Stripe, Mercado Pago, AbacatePay e Woovi.

## Checklist de Validação
- [ ] O payload de teste da OpenPix retorna HTTP 200 sem gerar erro 500.
- [ ] A assinatura HMAC é validada apenas quando o header e o segredo estão presentes.
- [ ] O sistema identifica corretamente o `chargeId` mesmo em payloads simplificados.
- [ ] Transações duplicadas não geram provisionamento duplo (Idempotência).
- [ ] Logs de auditoria contêm o payload completo para depuração.

## Detalhes Técnicos (Para Desenvolvedores)
- Utilizar `payload?.charge?.correlationID || payload?.charge?.identifier` para evitar quebras.
- Implementar um `switch/case` ou `if/else` baseado em headers de assinatura exclusivos de cada gateway no endpoint genérico.
- Mover a lógica de extração de ID de transação para um utilitário se o número de gateways crescer.
