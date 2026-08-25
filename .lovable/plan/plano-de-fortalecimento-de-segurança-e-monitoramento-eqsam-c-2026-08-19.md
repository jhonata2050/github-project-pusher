# Plano de Fortalecimento de Segurança e Monitoramento - EQSAM CLOUD

Melhorar a segurança da plataforma através da validação de webhooks de pagamento, remoção de credenciais de teste e implementação de monitoramento em funções críticas.

## 1. Limpeza de Placeholders
- Identificar e remover valores "placeholder" ou vazios em `system_settings` para gateways (AbacatePay, Stripe, Mercado Pago, CajuPay).

## 2. Segurança de Pagamentos (Webhooks)
- Implementar validação de assinatura para gateways que fornecem `webhook_secret`:
    - **Stripe**: Usar `stripe.webhooks.constructEvent` ou validação manual de HMAC.
    - **Mercado Pago**: Implementar validação de X-Signature.
    - **AbacatePay**: Implementar validação baseada no secret.
    - **Woovi**: Validar HMAC.

## 3. Monitoramento e Proteção de Funções Públicas
- **Validação de Domínio**: Adicionar logging de auditoria em `src/lib/checkout.functions.ts` para rastrear tentativas de registro de domínios bloqueados.
- **Métricas VPS**: Adicionar log de auditoria para monitorar a ingestão de métricas e detectar possíveis abusos no endpoint `/api/public/vps-metrics`.

## 4. Detalhes Técnicos
- As alterações nos webhooks serão feitas nos arquivos correspondentes em `src/routes/api/public/webhooks/*.ts`.
- O monitoramento usará a função `logPublicAuthEvent` ou uma nova versão genérica em `src/lib/audit.functions.ts`.
- RLS e RPC `has_role` permanecerão inalterados, garantindo a proteção atual.

## 5. Passos de Validação
- Testar a integridade das Server Functions modificadas.
- Verificar logs de auditoria após tentativas de uso das funções monitoradas.
- Confirmar que as chaves de API limpas não quebram o fluxo (lançando erros descritivos ao invés de falhas silenciosas).
