# Plano de Correção: Estado de Carregamento Infinito no Pagamento

O objetivo deste plano é identificar e resolver a causa raiz do estado de "carregamento infinito" relatado pelo usuário durante o processo de pagamento, especificamente ao utilizar cartão de crédito.

## Análise de Causa Raiz Hipotética

Com base na inspeção do código em `src/routes/checkout.$productId.tsx` e `src/lib/payments.server.ts`, as possíveis causas são:

1.  **Redirecionamento bloqueado ou falho:** O front-end usa `window.location.href = paymentData.checkoutUrl` para redirecionar para o Stripe ou Mercado Pago. Se `paymentData.checkoutUrl` estiver indefinido ou se houver um erro silencioso antes disso, o estado `isProcessingPix` (que controla o loading) permanece `true`.
2.  **Ausência de feedback de erro:** Se a chamada para `startPayment` (server function) falhar, o bloco `catch` em `orderMutation` exibe um toast, mas se o erro ocorrer dentro da lógica de fallback do servidor de forma que retorne algo inesperado (não disparando o catch do front-end), o componente pode ficar travado.
3.  **Recursão ou Loop no Fallback:** A função `createPaymentSessionWithFallback` no servidor tenta múltiplos gateways. Se houver um timeout longo em um dos gateways ou uma falha de configuração que não é tratada rapidamente, a requisição pode demorar mais do que o esperado pelo cliente.

## Ações Propostas

### 1. Melhoria no Tratamento de Estado do Front-end
Garantir que o estado de carregamento seja resetado em todos os caminhos de saída (sucesso, erro ou redirecionamento).

- **Arquivo:** `src/routes/checkout.$productId.tsx`
- **Mudança:** Adicionar um `finally` ou garantir que `setIsProcessingPix(false)` seja chamado antes do redirecionamento ou em caso de erro não capturado.

### 2. Validação e Segurança no Redirecionamento
Garantir que o redirecionamento ocorra apenas se a URL for válida e fornecer feedback imediato.

### 3. Log de Depuração no Lado do Servidor
Adicionar logs mais detalhados para rastrear qual gateway está falhando e por que o fallback pode estar demorando.

- **Arquivo:** `src/lib/payments.server.ts`

### 4. Correção em `StepPayment`
O botão "Pagar Agora" desativa-se quando `isProcessingPix` é verdadeiro. Precisamos garantir que este estado reflita a realidade.

## Detalhes Técnicos

- Atualizar `orderMutation` para lidar melhor com o fluxo de redirecionamento de cartão.
- Corrigir a lógica de fallback para evitar esperas desnecessárias se um gateway estiver claramente mal configurado.
- Adicionar verificações de nulidade para `checkoutUrl`.

## Validação
- Testar o fluxo de pagamento com Cartão de Crédito (Stripe/Mercado Pago) simulando falha no primeiro gateway para testar o fallback.
- Verificar se o estado de carregamento desaparece se o redirecionamento for bem-sucedido ou se um erro ocorrer.
