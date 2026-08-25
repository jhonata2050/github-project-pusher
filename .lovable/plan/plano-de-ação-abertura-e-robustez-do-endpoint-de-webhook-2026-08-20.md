# Plano de Ação: Abertura e Robustez do Endpoint de Webhook

O objetivo é garantir que o endpoint `/api/public/webhook` seja totalmente acessível por gateways de pagamento externos, sem exigência de autenticação, e que esteja preparado para processar payloads de diversos formatos (como o da OpenPix/Woovi fornecido) de maneira resiliente.

## Alterações Propostas

### Backend e Segurança

1.  **Abertura do Endpoint**: Verificar e garantir que o TanStack Router e o middleware de autenticação permitam requisições POST para a rota `/api/public/webhook` sem sessão ativa. Como a rota já está sob o prefixo `/api/public/`, ela deve ser ignorada pelo middleware de autenticação padrão.
2.  **Refatoração do Handler do Webhook (`src/routes/api/public/webhook.ts`)**:
    *   Remover qualquer barreira de autenticação residual (se houver).
    *   Garantir o processamento de `Content-Type: application/json`.
    *   Melhorar a detecção de eventos de teste (como `teste_webhook`).
    *   Estruturar a resposta para sempre retornar `HTTP 200 OK` após o recebimento e log inicial, evitando bloqueios do gateway.
3.  **Preparação para Validação de Assinaturas**:
    *   Manter a lógica de buscar segredos na tabela `system_settings`.
    *   Deixar o código organizado para validar assinaturas específicas se os headers apropriados estiverem presentes.

### Monitoramento e Auditoria

1.  **Registro de Payloads**: Assegurar que o `audit_logs` capture o payload bruto (`raw`) e o JSON parseado para facilitar o diagnóstico, especialmente para eventos desconhecidos.

## Detalhes Técnicos

*   **Endpoint**: `/api/public/webhook`
*   **Método**: `POST`
*   **Response**: `200 OK` (Body: "OK" ou JSON confirmatório)
*   **Payload de Teste Validado**:
    ```json
    {
      "data_criacao": "2026-08-20T16:00:14.533Z",
      "evento": "teste_webhook",
      "event": "OPENPIX:CHARGE_COMPLETED"
    }
    ```

## Checklist de Validação

1.  [ ] Executar `curl` externo (simulado via sandbox) sem tokens de autenticação.
2.  [ ] Verificar se o status code retornado é 200.
3.  [ ] Confirmar no banco de dados (`audit_logs`) se o payload foi registrado corretamente.
4.  [ ] Validar se eventos de teste não causam erros 500 ou quebras no fluxo de faturamento.
