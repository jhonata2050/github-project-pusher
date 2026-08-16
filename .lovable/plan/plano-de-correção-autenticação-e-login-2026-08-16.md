# Plano de Correção: Autenticação e Login

O sistema apresenta falhas na criação de contas e login devido a pendências na infraestrutura do banco de dados (Lovable Cloud) e configuração do Supabase.

## Problemas Identificados
1. **Ambiente Não Conectado**: O erro "Missing Supabase environment variable(s)" indica que o Lovable Cloud (Supabase) não foi totalmente provisionado ou as variáveis `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` não estão injetadas corretamente no runtime.
2. **Falta de Grant para Tabelas Públicas**: Embora as migrações existam no código, elas precisam ser aplicadas ao banco de dados real. As tabelas `profiles` e `user_roles` precisam de permissões explícitas (`GRANT`) para os papéis `authenticated` e `service_role`.
3. **Dependência de Chave Administrativa**: As funções de auditoria (`logPublicAuthEvent`) tentam usar `supabaseAdmin`, que requer a `SUPABASE_SERVICE_ROLE_KEY`. Sem esta chave, os eventos de login/cadastro falham silenciosamente ou geram avisos, o que pode estar interrompendo o fluxo se não forem tratados como opcionais.

## Etapas de Correção

### 1. Provisionamento do Backend
- Ativar o Lovable Cloud para este projeto para garantir que o banco de dados e as variáveis de ambiente estejam disponíveis.
- Aplicar as migrações SQL presentes em `supabase/migrations/` no banco de dados.

### 2. Ajustes de Código e Segurança
- **Tabelas e Permissões**: Garantir que toda tabela no esquema `public` tenha `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;` e `GRANT ALL ON public.<table> TO service_role;`.
- **Tratamento de Erros na Auditoria**: Reforçar a resiliência das funções em `src/lib/audit.functions.ts` para que a ausência de logs de auditoria nunca impeça o usuário de logar ou se cadastrar.
- **Middleware de Autenticação**: Verificar se o token JWT está sendo passado corretamente no cabeçalho `Authorization` nas requisições entre frontend e servidor.

### 3. Verificação
- Testar o fluxo de registro (`signup`) e verificar se o trigger `on_auth_user_created` cria corretamente o registro na tabela `profiles`.
- Validar se o login (`signin`) redireciona corretamente para o `/dashboard`.

## Próximos Passos
1. Habilitar Lovable Cloud.
2. Sincronizar migrações.
3. Testar fluxos de autenticação no preview.
