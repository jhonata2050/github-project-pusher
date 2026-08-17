# Plano de Reestruturação do Fluxo de Compra e Automação de Checkout Pix

## 1. Reestruturação do Ciclo de Compra para Novos Clientes
O fluxo será alterado para que visitantes (não logados) sejam direcionados ao cadastro antes de acessarem a loja e o checkout.

- **Alteração na Home (`src/routes/index.tsx`):**
    - Ao clicar em "Contratar", se o usuário não estiver logado, redirecionar para `/auth?redirect=/dashboard&mode=signup`.
    - Isso incentiva o cadastro primeiro, conforme solicitado.
- **Alteração no Checkout (`src/routes/checkout.$productId.tsx`):**
    - Se um usuário deslogado tentar acessar um link direto de checkout, redirecionar para `/auth` com o parâmetro de retorno para o produto específico.
    - O passo "Conta" no checkout será simplificado ou removido, assumindo que o usuário já se autenticou.

## 2. Automação de Pagamento Pix no Checkout
O cliente não precisará mais escolher gateway ou clicar em "Pagar" após selecionar Pix; o pagamento será gerado imediatamente.

- **Alteração no `StepPayment.tsx` e `checkout.$productId.tsx`:**
    - Ao selecionar a opção "PIX" e fornecer o CPF/CNPJ (se necessário), o sistema chamará automaticamente a função de criação de pedido e geração de cobrança.
    - O checkout exibirá o QR Code e o código "Copia e Cola" na mesma tela, sem etapas adicionais.
- **Lógica de Seleção Automática de Gateway:**
    - Utilizar o sistema de prioridade já implementado (`payment_gateway_priority`) para selecionar o melhor gateway disponível que suporte Pix.

## Detalhes Técnicos
- **Frontend:** Atualização dos componentes `StepPayment` para gatilhos automáticos de `mutate`.
- **Backend:** A função `createOrder` retornará os dados de Pix se o método for Pix, permitindo exibição imediata.
- **UX:** Remoção de botões redundantes no passo de pagamento quando Pix estiver selecionado.
