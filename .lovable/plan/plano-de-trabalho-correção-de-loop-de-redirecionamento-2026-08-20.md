---
title: Corrigir Loop de Redirecionamento Pós-Cadastro
description: Resolver o conflito de redirecionamento entre a rota de dashboard e a rota de completar cadastro, garantindo que usuários com perfil completo não sejam redirecionados erroneamente.
type: feature
---

# Plano de Trabalho - Correção de Loop de Redirecionamento

O objetivo é corrigir um loop de redirecionamento onde o usuário é enviado simultaneamente para o `/dashboard` e `/complete-profile`. Isso geralmente ocorre quando a lógica de verificação de "perfil completo" no `AppShell.tsx` conflita com o redirecionamento após o salvamento dos dados na página de finalização de cadastro.

## Problemas Identificados

1.  **Redirecionamento Condicional no AppShell:** O `useEffect` no `src/components/app/AppShell.tsx` redireciona para `/complete-profile` se `registration_completed` for falso. Se houver um atraso na atualização do cache do React Query após a mutação, o componente pode tentar redirecionar o usuário de volta para a tela de conclusão antes que ele perceba que já terminou.
2.  **Verificação Duplicada:** A rota `/_authenticated/complete-profile.tsx` também possui sua própria lógica de redirecionamento para o dashboard caso o perfil já esteja completo, o que pode alimentar o loop se ambas as condições não estiverem perfeitamente sincronizadas.

## Alterações Técnicas

### Frontend

- **Arquivo:** `src/components/app/AppShell.tsx`
    - Refinar a lógica do `useEffect` que verifica `registration_completed`.
    - Adicionar uma verificação para garantir que o redirecionamento não ocorra enquanto os dados do perfil estão sendo carregados (`isLoading`).
    - Garantir que usuários administrativos (staff) não sejam afetados por essa regra, caso necessário.
- **Arquivo:** `src/routes/_authenticated/complete-profile.tsx`
    - Garantir que a mutação de atualização do perfil invalide as queries corretas (`['profile']`) antes de navegar para o `/dashboard`.
    - Adicionar um pequeno atraso ou aguardar a confirmação da invalidação do cache para evitar que o `AppShell` veja o estado antigo.

## Verificação

1.  Simular um login via OAuth que exija a finalização do cadastro.
2.  Completar os campos na tela `/complete-profile`.
3.  Verificar se o redirecionamento para `/dashboard` ocorre de forma única e estável.
4.  Confirmar que não há loops de redirecionamento ao navegar entre abas do painel após a conclusão.