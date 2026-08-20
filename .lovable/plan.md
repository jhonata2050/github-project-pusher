# Plano de Correção do Fluxo de Redirecionamento de Novos Clientes

O objetivo é garantir que novos clientes que acessam links de venda imediata ou o checkout sejam direcionados para a tela de **Cadastro** em vez da tela de Login, facilitando a conversão.

## Alterações propostas

### Frontend

1.  **Ajuste na Rota de Autenticação (`src/routes/auth.tsx`)**:
    *   Detectar o parâmetro `redirect` na URL.
    *   Se o `redirect` contiver `/checkout/` e o usuário não estiver autenticado, mudar o modo inicial da página de `signin` para `signup`.
    *   Isso garantirá que, ao ser enviado para login por uma proteção de rota ou link direto, o novo cliente veja o formulário de cadastro primeiro.

2.  **Ajuste nos Links de Venda Imediata (`src/routes/_authenticated/admin/products.tsx`)**:
    *   Adicionar um parâmetro `mode=signup` nos links gerados para venda imediata, reforçando a intenção de cadastro.

## Detalhes técnicos
*   Modificação do estado inicial `mode` no componente `AuthPage` baseado no `searchParams`.
*   A lógica de redirecionamento pós-autenticação já existente será mantida para levar o cliente ao checkout após o cadastro.

---
*Este plano foca exclusivamente na experiência do usuário não autenticado ao tentar realizar uma compra.*
