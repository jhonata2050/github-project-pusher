# Plano de Melhoria de Monitoramento e Notificação de Provisionamento

Implementação de um sistema robusto para detectar, exibir e notificar falhas de provisionamento automático no painel administrativo e via WhatsApp.

## Alterações de Banco de Dados

### Tabelas
- Nenhuma alteração de esquema necessária no momento (campos `status`, `notes` e `error_message` já existem em `services`).

### RLS (Row Level Security)
- Nenhuma alteração necessária.

## Alterações no Backend

### 1. Refatoração do Fluxo de Provisionamento (`src/lib/finance.server.ts`)
- Melhorar a captura de erros no `processProvisioning`.
- Garantir que qualquer falha (DirectAdmin, timeout, erro de API) atualize o campo `status` para `pending` (se já não estiver) e preencha `notes` com detalhes técnicos legíveis.
- **Notificação Admin:** Em caso de erro crítico no provisionamento automático, disparar um alerta via WhatsApp para o admin imediatamente.

### 2. Notificações WhatsApp (`src/lib/whatsapp.server.ts`)
- Criar um novo tipo de evento no `notifyAdminWhatsApp` chamado `provisioning_error`.

## Alterações no Frontend (Admin)

### 1. Dashboard Admin (`src/routes/_authenticated/admin/index.tsx`)
- Aumentar o limite de exibição de serviços com erro/pendentes (de 5 para 10 ou 15).
- Adicionar uma contagem total de serviços pendentes de ação.
- Melhorar o visual do card "Pendências de Provisionamento" para destacar a gravidade.
- Garantir que a mensagem de erro (`notes` ou `error_message`) seja exibida de forma clara para que o admin saiba o que falhou sem precisar abrir cada cliente.

### 2. Detalhes do Cliente/Serviço (`src/routes/_authenticated/admin/clients.$clientId.tsx`)
- Otimizar o log de erros no dossiê do cliente para facilitar a depuração.

## Detalhes Técnicos
- O endpoint `/api/public/webhook` já utiliza `handlePaymentSuccess` que chama `processProvisioning`. A lógica de erro será centralizada no `processProvisioning`.
- Utilizar `notifyAdminWhatsApp` dentro do bloco `catch` do loop de provisionamento.
- Formatar a mensagem de alerta WhatsApp com: ID do Serviço, Cliente, Produto, Tipo de Erro e Link direto para o Admin resolver.

## Verificação
- Simular falha na API do DirectAdmin (usando credenciais inválidas em ambiente de teste) e verificar se o dashboard atualiza e o WhatsApp é enviado.
- Verificar se serviços com erro aparecem corretamente no dashboard admin.
