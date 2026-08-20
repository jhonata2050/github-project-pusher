# Plano de Reforço de Segurança e Correção de Acesso

Objetivo: Corrigir a falha que permite acesso indevido à área administrativa e reforçar a segurança das funções de servidor.

## Ações Imediatas
- Reforçar `useIsStaff` para ser o único ponto de verdade no frontend para rotas `/admin/*`.
- Garantir que `AppShell` não oculte elementos de segurança baseados em estados de carregamento.
- Adicionar validações de redundância em `_authenticated/admin/route.tsx`.

## Reforço nas Funções de Servidor
- Todas as funções em `admin.functions.ts` e `support.functions.ts` devem validar explicitamente o papel `admin` via RPC no Supabase, ignorando claims do token JWT que podem estar desatualizados.
- O modo "impersonate" deve ser restrito e auditado rigorosamente.

## Detalhes Técnicos

### Frontend
- Ajustar `AppShell.tsx` para garantir que o redirecionamento de `needsCompletion` não atropele a proteção de `isStaff`.
- Adicionar um `layout` de proteção em `src/routes/_authenticated/admin/route.tsx` que faça um check síncrono (via cache) e asíncrono (via fetch) do status de admin.

### Backend (Server Functions)
- Atualizar `src/lib/admin.server.ts` para que `getAdminStatsImplementation` e outras funções usem o `context.userId` para re-verificar o papel `admin` diretamente no banco de dados em cada chamada, sem confiar apenas no middleware.
- Reforçar `validateDASSORequest` em `src/lib/security.server.ts` para ser infalível, verificando se o `userId` tem o papel `admin` antes de permitir qualquer bypass de propriedade.

### Auditoria
- Criar um log de segurança específico sempre que um usuário sem papel de admin tentar acessar uma rota `/admin`.

## Verificação
- Testar com o usuário `Vitoria` (cliente) tentando acessar `/admin`.
- Testar com o usuário `Jhonata` (admin) acessando `/admin`.
- Validar que o botão "Acessar Painel" no DirectAdmin para `Vitoria` não concede acesso de revendedor.
