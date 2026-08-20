# Plan: Correção e Aprimoramento dos Webhooks de Pagamento (OpenPix/Woovi)

O usuário relatou que o webhook ainda não está funcionando corretamente, especificamente para o gateway OpenPix (Woovi). A análise identificou que a busca da transação no banco de dados estava usando a coluna errada (`id` em vez de `gateway_reference`) e que o endpoint não estava preparado para lidar com payloads de teste simplificados (sem o objeto `charge`), causando erros internos. Além disso, o endpoint genérico de webhook será aprimorado para detectar e processar notificações do OpenPix, já que muitos usuários acabam configurando a URL principal do sistema.

## Alterações

### 1. Webhook Específico do Woovi/OpenPix
- Arquivo: `src/routes/api/public/webhooks/woovi.ts`
- Alterar a busca da transação para usar `gateway_reference` em vez de `id`.
- Adicionar verificações de segurança para evitar quebras em payloads de teste (verificar se `payload.charge` existe).
- Garantir que retorne status 200 para qualquer evento de teste, facilitando o registro do webhook nos painéis dos gateways.

### 2. Webhook Genérico (Router)
- Arquivo: `src/routes/api/public/webhook.ts`
- Implementar detecção automática de eventos OpenPix (`OPENPIX:CHARGE_COMPLETED`).
- Se detectado, processar o pagamento usando a mesma lógica do webhook específico.
- Isso garante que o sistema funcione mesmo se o usuário configurar a URL "genérica" no painel da OpenPix.

### 3. Resiliência no Processamento de Pagamentos
- Arquivo: `src/lib/finance.server.ts`
- Verificar a idempotência na função `handlePaymentSuccess` para garantir que faturas já pagas não disparem novos provisionamentos ou erros.

## Detalhes Técnicos
- O payload enviado pelo usuário (`{"evento":"teste_webhook","event":"OPENPIX:CHARGE_COMPLETED"}`) será tratado como um sucesso de verificação.
- A correspondência da transação será feita via `gateway_reference` usando o `correlationID` fornecido pelo gateway.
- As respostas HTTP serão padronizadas para retornar 200 OK sempre que possível, evitando bloqueios por parte dos gateways que exigem confirmação de recebimento.
