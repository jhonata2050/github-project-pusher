---
title: Eliminação de acesso não autorizado ao painel administrativo
description: Reforço da segurança em rotas administrativas e separação de contextos entre cliente e admin.
---

## Problema Identificado
Usuários com perfil de cliente estavam conseguindo visualizar e interagir com o menu administrativo ao navegar para rotas específicas, como `/vps`, devido a uma verificação de permissão insuficiente no `AppShell` e falta de proteção robusta em server functions e layouts.

## Solução Proposta

### 1. Reforço no AppShell
- Modificar o `AppShell` para garantir que `isAdminArea` seja estritamente baseado no papel do usuário (`isStaff`) E na rota atual.
- Ocultar o menu administrativo e o banner de "Ver como cliente" para usuários que não possuem papel administrativo.

### 2. Proteção de Rotas (Layouts)
- Garantir que `src/routes/_authenticated/admin/route.tsx` bloqueie qualquer usuário não-staff, redirecionando-os ou exibindo a tela de acesso negado (já iniciado, mas precisa ser validado em todas as sub-rotas).

### 3. Proteção em Server Functions
- Auditar e reforçar todas as server functions que realizam operações críticas ou retornam dados sensíveis, garantindo o uso de `has_role` no servidor.
- Especificamente em `src/lib/vps-admin.functions.ts` e `src/lib/admin.functions.ts`.

### 4. Correção da Rota /vps
- Assegurar que `src/routes/_authenticated/vps/index.tsx` (rota de cliente) use o `AppShell` com `area="client"` explicitamente ou que o `AppShell` detecte corretamente o contexto.

## Arquivos a serem modificados
- `src/components/app/AppShell.tsx`: Ajustar detecção de `isAdminArea` e visibilidade de menus.
- `src/lib/vps-admin.functions.ts`: Reforçar verificações de `has_role`.
- `src/lib/admin.functions.ts`: Reforçar verificações de `has_role`.
- `src/lib/support.functions.ts`: Verificar se todas as funções administrativas possuem gate de `has_role`.
- `src/routes/_authenticated/admin/route.tsx`: Refinar a barreira de acesso.
- `src/lib/audit.functions.ts`: Garantir que tentativas de acesso não autorizado sejam logadas.

## Validação
- Testar acesso com conta de cliente: não deve ver menu administrativo nem em `/vps` nem em qualquer rota sob `/admin/*`.
- Testar acesso com conta de admin: deve ver menu administrativo normalmente.
