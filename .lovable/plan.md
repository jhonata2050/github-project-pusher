# Plano de Correção de Redirecionamento e Controle de Acesso

Corrigir o comportamento de redirecionamento indevido de usuários com perfil de cliente para a área administrativa e garantir que não tenham acesso a rotas restritas.

## Mudanças

### Frontend

- **Ajuste no Redirecionamento Pós-Login (`src/routes/auth.tsx`)**:
    - Substituir o redirecionamento fixo para `/dashboard` por uma lógica baseada em papéis.
    - Se o usuário for administrador (`admin` ou `staff`), redirecionar para `/admin`.
    - Se for cliente, redirecionar para `/dashboard`.
- **Reforço de Segurança no Layout Administrativo (`src/routes/_authenticated/admin/route.tsx`)**:
    - Garantir que a verificação de `isStaff` redirecione clientes de volta para a área segura caso tentem acessar `/admin` manualmente.

## Detalhes Técnicos

- Utilizar o hook `useIsStaff` para identificar o papel do usuário logado.
- Adicionar lógica de redirecionamento condicional no `useEffect` de `src/routes/auth.tsx`.

## Verificação

- Validar o redirecionamento automático para usuários Clientes e Administradores.
- Confirmar que o acesso direto a rotas `/admin/*` por clientes é bloqueado.
