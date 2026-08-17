# Plano de Padronização da Validação de Gateways

O objetivo é consolidar a lógica de teste de conexão de todos os gateways em uma estrutura robusta, garantindo mensagens de erro padronizadas e em português.

## Alterações

### 1. Servidor: `src/lib/gateway-validation.server.ts`
- Refatorar a função `validateGateway` para usar uma estrutura de resposta uniforme.
- Implementar um tratador de erros genérico que converte exceções comuns de API e rede em mensagens amigáveis.
- Adicionar validação de presença de campos obrigatórios antes de tentar a conexão.
- Garantir que falhas de autenticação (401/403) retornem mensagens específicas sobre "Chave inválida".

### 2. Utilitários: `src/lib/gateway-errors.server.ts` (Novo)
- Criar um utilitário para mapear erros comuns de gateways para mensagens amigáveis:
    - 401/403 -> "Credenciais inválidas ou sem permissão."
    - 404 -> "Endpoint da API não encontrado."
    - Timeout/Rede -> "Servidor do gateway indisponível no momento."

### 3. Frontend: `src/routes/_authenticated/admin/finance.tsx`
- Ajustar o `handleTest` para garantir que ele capture qualquer erro de execução da server function e exiba o `message` retornado, mesmo em caso de falha.

## Detalhes Técnicos
- **Formato da Resposta:** `Promise<{ success: boolean; message: string; details?: any }>`
- **Gateways Cobertos:** AbacatePay, Stripe, Mercado Pago, Woovi, PagHiper, CajuPay e Contabo.
- **Segurança:** A validação continua ocorrendo no lado do servidor para proteger as chaves.

---
**Nota:** A instrução visual de texto ("\u2063") parece ser um artefato técnico e será tratada como uma confirmação de que o branding deve ser preservado.
