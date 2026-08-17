# Plano de Correção: Fluxo de Checkout para Visitantes

O objetivo é permitir que visitantes não logados iniciem o processo de contratação a partir da home, sendo direcionados para o cadastro/login e retornando automaticamente ao checkout após a autenticação.

## Alterações

### 1. Tornar a rota de Checkout pública
- Mover `src/routes/_authenticated/checkout.$productId.tsx` para `src/routes/checkout.$productId.tsx`.
- Remover o prefixo `/_authenticated` da definição da rota.
- Adicionar uma verificação manual de autenticação no componente: se o usuário não estiver logado ao clicar em "Confirmar pedido", redirecionar para `/auth` com o parâmetro `redirect` apontando de volta para o checkout.

### 2. Ajustar o fluxo de Autenticação (`src/routes/auth.tsx`)
- Capturar o parâmetro `redirect` da URL (ex: `/auth?redirect=/checkout/123`).
- Após o login ou cadastro bem-sucedido, verificar se existe um `redirect` e navegar para ele em vez do `/dashboard` padrão.

### 3. Atualizar links na Home (`src/routes/index.tsx`)
- Garantir que o link "Contratar" aponte para a nova rota `/checkout/$productId`.

## Detalhes Técnicos
- O TanStack Router atualizará o `routeTree.gen.ts` automaticamente ao mover o arquivo.
- Utilizaremos `Route.useSearch()` ou `window.location.search` para capturar o destino de redirecionamento.
- A lógica de proteção de rota que antes era global (via layout `_authenticated`) passa a ser específica do botão de ação no checkout para usuários anônimos.

## Verificação
- Acessar a home deslogado e clicar em "Contratar".
- Verificar se a página de checkout carrega com os detalhes do produto.
- Clicar em "Confirmar pedido" e ser redirecionado para `/auth`.
- Fazer login e ser levado de volta ao checkout com os dados preservados.
