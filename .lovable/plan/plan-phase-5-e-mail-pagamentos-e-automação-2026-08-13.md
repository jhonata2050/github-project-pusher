# Plan: Phase 5 - E-mail, Pagamentos e Automação

Este plano foca na finalização das pendências críticas: sistema de e-mail (Resend), integração de pagamentos (AbacatePay) e o sistema de cron para suspensão automática.

## User Review Required

> [!IMPORTANT]
> A suspensão automática requer um gatilho externo (Cron). Vou configurar uma rota `/api/public/cron/maintenance` que deve ser chamada diariamente via ferramenta de cron externa ou Supabase pg_cron.

- **Configuração de E-mail**: Implementar o envio real via Resend usando a chave de API das configurações do sistema.
- **Gateway AbacatePay**: Conectar o checkout ao AbacatePay real quando a chave de API estiver presente.

## Proposed Changes

### Backend & Integrations

#### [E-mail] Implementação do Resend
- Criar `src/lib/emails.server.ts` para encapsular a lógica de envio via API do Resend.
- Adicionar suporte a templates básicos (Boas-vindas, Fatura Gerada, Fatura Paga, Suspensão).
- Integrar no fluxo de provisionamento e faturamento.

#### [Pagamentos] Integração AbacatePay
- Atualizar `src/lib/payments.server.ts` para realizar chamadas reais à API do AbacatePay (criação de billing).
- Implementar webhook em `src/routes/api/public/webhooks/abacatepay.ts` para processar confirmações de pagamento.

#### [Automação] Cron de Manutenção
- Criar `src/routes/api/public/cron/maintenance.ts` para:
  - Verificar faturas vencidas há 3 dias -> Suspender conta no DirectAdmin.
  - Verificar faturas vencidas há 30 dias -> Deletar conta no DirectAdmin.
  - Enviar lembretes de cobrança.

### UI & Admin
- Finalizar a aba "E-mail" e "Pagamentos" em `admin/settings` para permitir a inserção das chaves reais.
- Adicionar logs de e-mail e transações para o administrador.

## Technical Details
- **Segurança**: As rotas de API pública usarão verificação de segredo (CRON_SECRET) e assinaturas de webhook.
- **Resiliência**: Tratamento de erros em chamadas de API externas com logs no banco de dados.
- **Estética**: Manter o padrão AbacatePay (lime-green, rounded-3xl).
