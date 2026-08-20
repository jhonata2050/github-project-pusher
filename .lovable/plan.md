# Plano de Correção: Provisionamento Pós-Pagamento

O objetivo deste plano é garantir que, assim que um pagamento for confirmado via webhook (ou manualmente), o serviço associado seja provisionado corretamente no DirectAdmin ou na Contabo, resolvendo a falha onde a fatura consta como paga mas o serviço permanece pendente.

## Alterações Técnicas

### 1. Refinamento do Fluxo de Provisionamento (`src/lib/finance.server.ts`)
- **Melhoria no Log**: Adicionar logs detalhados para identificar exatamente onde o provisionamento falha (ex: falta de pacote DirectAdmin, erro na API, falta de servidor disponível).
- **Suporte a VPS**: Garantir que o `processProvisioning` também suporte o provisionamento de instâncias VPS quando o produto for uma VPS (atualmente focado em DirectAdmin).
- **Tratamento de Erros**: Adicionar um registro de erro no campo `notes` ou `metadata` do serviço em caso de falha no provisionamento, permitindo que o admin saiba o que corrigir.

### 2. Robustez do Webhook (`src/routes/api/public/webhook.ts`)
- **Fallback de Busca**: Se uma transação não for encontrada pelo `gateway_reference`, tentar buscar por metadados ou pelo ID da fatura embutido em campos como `correlationID` ou `client_reference_id`.
- **Idempotência**: Garantir que o processamento do pagamento e provisionamento não ocorra mais de uma vez para a mesma transação.

### 3. Melhoria na Lógica de Liquidação (`src/lib/finance.server.ts`)
- Certificar que o `processProvisioning` seja chamado **sempre** que uma fatura for marcada como `paid`, independentemente de ser via webhook ou alteração manual no admin.

## Detalhes de Implementação

### Provisionamento VPS
Se o produto não tiver `directadmin_package` mas for da categoria "VPS", o sistema deve:
1. Identificar o ID externo da instância (se já existir).
2. Se for uma nova compra, registrar o provisionamento pendente para ação manual ou via API da Contabo.

### Fallback de Webhook
Para o Woovi/OpenPix, a `correlationID` geralmente segue o padrão `invoice-{uuid}`. O webhook usará esse prefixo para localizar a fatura caso a transação no banco de dados ainda não exista por algum atraso de registro.

## Verificação
1. Simular uma notificação de webhook com um payload real.
2. Verificar se o status da fatura muda para `paid`.
3. Verificar se o serviço associado muda para `active` e se as credenciais aparecem no banco.
4. Validar o log de auditoria para confirmar o sucesso do processo.