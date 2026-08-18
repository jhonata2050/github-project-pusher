# Plano de Correção de Redirecionamento e Controle de Acesso

Corrigir o comportamento de redirecionamento indevido de usuários com perfil de cliente para a área administrativa e garantir que não tenham acesso a rotas restritas.

## Mudanças

### Frontend

- **Ajuste no Redirecionamento Pós-Login (`src/routes/auth.tsx`)**:
    - Substituir o redirecionamento fixo para `/dashboard` (ou o parâmetro `redirect`) por uma lógica baseada em papéis.
    - Se o usuário for administrador (`admin` ou `staff`), redirecionar para `/admin`.
    - Se for cliente, redirecionar para `/dashboard`.
- **Reforço de Segurança no Layout Administrativo (`src/routes/_authenticated/admin/route.tsx`)**:
    - Garantir que a verificação de `isStaff` seja infalível e redirecione clientes de volta para a área segura caso tentem acessar `/admin` manualmente.
- **Correção no Link de "Voltar para o Painel" (`src/routes/_authenticated/admin/route.tsx`)**:
    - Verificar se o botão de fallback aponta corretamente para `/dashboard` para usuários clientes que caírem em telas de erro de permissão.

## Detalhes Técnicos

- Utilizar o hook `useIsStaff` em `src/routes/auth.tsx` para decidir o destino inicial.
- Como o `useIsStaff` depende de uma query assíncrona (`useRoles`), adicionar um estado de espera ou realizar a verificação logo após o login ser confirmado.
- O arquivo `src/routes/_authenticated/admin/route.tsx` já possui uma verificação de `isStaff`, mas ela exibe uma tela de "Área Restrita". Vou considerar se um redirecionamento automático silencioso é preferível ou se a tela de aviso atual é suficiente conforme a imagem de referência (que mostra o painel administrativo sendo visualizado por um cliente).

## Verificação

- Criar um script Playwright que:
    1. Faz login com um usuário cliente.
    2. Verifica se ele cai em `/dashboard`.
    3. Tenta navegar manualmente para `/admin` e confirma que o acesso é bloqueado ou redirecionado.
    4. Faz login com um administrador e verifica se ele cai em `/admin`.
