# Plano de Reforço de Segurança DirectAdmin e Administrativa

O objetivo deste plano é garantir que nenhum cliente consiga acessar o painel administrativo do DirectAdmin ou áreas administrativas do sistema, implementando validações redundantes e correções nas rotas e funções de servidor.

## Mudanças Técnicas

### 1. Reforço no `validateDASSORequest`
- **Arquivo:** `src/lib/security.server.ts`
- **Ação:** Adicionar verificação explícita contra o banco de dados para garantir que o `username` solicitado não é um usuário administrativo do servidor DirectAdmin, mesmo que o banco de dados (por erro de importação ou manipulação) indique posse. Bloquear acesso se o serviço não estiver marcado como 'active' ou 'pending' (bloquear 'suspended').

### 2. Proteção nas Funções de Servidor Admin
- **Arquivo:** `src/lib/admin.server.ts`
- **Ação:** Atualizar todas as funções críticas (stats, profiles, branding) para realizar uma verificação redundante do papel de admin via `supabaseAdmin` usando o `context.userId`, ignorando caches ou claims do frontend.

### 3. Validação de Rota Administrativa
- **Arquivo:** `src/routes/_authenticated/admin/route.tsx`
- **Ação:** Implementar um "gate" no `loader` da rota que bloqueia o carregamento de dados se o usuário não for confirmado como admin no servidor.

### 4. Correção no SSO DirectAdmin
- **Arquivo:** `src/lib/directadmin.server.ts`
- **Ação:** Garantir que o parâmetro `user` na chamada `CMD_API_LOGIN_KEYS` seja validado rigorosamente e que logins em contas de sistema sejam rejeitados na camada final da API.

### 5. Auditoria e Alertas
- **Ação:** Disparar alerta via WhatsApp para os administradores sempre que uma tentativa de escalação de privilégios for detectada no `validateDASSORequest`.

## User-facing changes
- Nenhuma mudança visual esperada para administradores legítimos.
- Clientes que tentarem acessar áreas indevidas verão mensagens de erro de "Acesso Negado".
- Maior segurança e isolamento de dados entre clientes.
