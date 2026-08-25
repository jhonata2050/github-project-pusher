# Plano de Correção e Aprimoramento dos Webhooks de Pagamento

Este plano visa corrigir as falhas no processamento de notificações de pagamento, garantindo que o sistema identifique corretamente os pagadores e ative/renove os serviços automaticamente através de webhooks robustos.

## Problemas Identificados
- **Processamento Incompleto**: Alguns webhooks não notificam o administrador ou o cliente após o sucesso.
- **Webhook Genérico Inexistente**: O campo "Link de Webhook do Sistema" aponta para `/api/public/webhook`, que não existe no projeto.
- **Inconsistência nos Retornos**: Alguns webhooks podem falhar sem logar o erro adequadamente ou sem responder com HTTP 200, causando tentativas infinitas dos gateways.
- **Falta de Tratamento de Eventos**: Alguns webhooks tratam apenas um subconjunto de eventos, ignorando atualizações de status importantes.

## Mudanças Propostas

### 1. Backend e Lógica de Negócio
- Criar o arquivo `src/routes/api/public/webhook.ts` para servir como o endpoint genérico exibido no painel admin. Este endpoint redirecionará ou processará notificações que não tenham rotas específicas.
- Unificar a lógica de sucesso de pagamento em uma função auxiliar em `src/lib/finance.server.ts` para garantir que **sempre** ocorra:
    1. Atualização da transação para `completed`.
    2. Atualização da fatura para `paid`.
    3. Provisionamento do serviço (`processProvisioning`).
    4. Notificação via WhatsApp para o cliente e administrador.

### 2. Integrações de Webhooks Existentes
Refatorar os seguintes arquivos para usar a nova lógica unificada e garantir respostas HTTP 200 consistentes:
- `src/routes/api/public/webhooks/stripe.ts`
- `src/routes/api/public/webhooks/mercadopago.ts`
- `src/routes/api/public/webhooks/abacatepay.ts`
- `src/routes/api/public/webhooks/woovi.ts`
- `src/routes/api/public/webhooks/paghiper.ts`
- `src/routes/api/public/webhooks/cajupay.ts`

### 3. Melhoria na Robustez
- Adicionar logs de erro detalhados usando `supabaseAdmin` na tabela `audit_logs` para facilitar o diagnóstico de webhooks que falham.
- Garantir que todos os webhooks respondam com `200 OK` mesmo se o processamento interno falhar após a validação da assinatura, evitando loops de retry do gateway para erros de lógica interna (logando o erro para ação manual).

## Detalhes Técnicos
- Nova função `handlePaymentSuccess(invoiceId: string, gateway: string, externalReference?: string)` em `src/lib/finance.server.ts`.
- Adição de blocos `try-catch` robustos em todos os handlers de webhook.
- Validação de entrada com Zod onde aplicável para evitar crashes por payload malformado.
