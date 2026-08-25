# Plano: Definição de Gateways por Método de Pagamento

O objetivo é permitir que o administrador defina quais gateways serão utilizados especificamente para cada método de pagamento (PIX, Cartão, Boleto), em vez de uma prioridade global única.

## Alterações Propostas

### 1. Banco de Dados (Supabase)
- Nenhuma alteração de schema é estritamente necessária, pois usaremos a tabela `system_settings` (chave/valor) para armazenar as novas configurações:
    - `gateway_priority_pix`
    - `gateway_priority_credit_card`
    - `gateway_priority_boleto`

### 2. Backend (Lógica de Seleção)
- **`src/lib/payments.server.ts`**:
    - Atualizar `createPaymentSession` e a lógica de fallback para ler a prioridade específica do método solicitado (PIX, Cartão ou Boleto).
    - Se a prioridade específica estiver vazia, usar a prioridade global como fallback.

### 3. Frontend (Administração)
- **`src/routes/_authenticated/admin/finance.tsx`**:
    - Substituir o campo único "Prioridade de Gateways" por três campos específicos:
        - **Gateway para PIX**: Lista de IDs (ex: woovi, paghiper, mercadopago, cajupay).
        - **Gateway para Cartão**: Lista de IDs (ex: stripe, mercadopago).
        - **Gateway para Boleto**: Lista de IDs (ex: mercadopago, paghiper).
    - Manter a interface minimalista seguindo o padrão Apple-like do projeto.

### 4. Validação e Feedback
- Garantir que apenas gateways que suportam o método específico possam ser configurados nesses campos.
- Atualizar a documentação visual no admin para mostrar os IDs disponíveis por categoria.

## Plano de Ação
1. Modificar `src/routes/_authenticated/admin/finance.tsx` para incluir os novos campos de configuração.
2. Atualizar a lógica de fallback em `src/lib/payments.server.ts` para respeitar as novas configurações por método.
3. Validar o fluxo de checkout garantindo que o gateway correto seja chamado para cada opção selecionada pelo cliente.
