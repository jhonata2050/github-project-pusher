# Plano de Correção Definitiva da Autenticação DirectAdmin

Este plano visa alinhar a integração com o DirectAdmin à arquitetura do WHMCS, garantindo separação total entre as credenciais do sistema e as do painel de controle, além de um fluxo de SSO (Single Sign-On) seguro e isolado.

## Ações Realizadas

### 1. Separação de Credenciais
- **Sistema**: O cliente continuará usando seu e-mail e senha (hash no Supabase) para acessar o painel Eqsam.
- **DirectAdmin**: As contas no DirectAdmin terão seus próprios `username` e `password` gerados automaticamente no provisionamento, armazenados apenas na tabela `services` (sem misturar com a senha do perfil do usuário).
- **Servidor**: As credenciais administrativas (Login Keys) serão mantidas exclusivamente no backend, nunca expostas ao frontend.

### 2. Fluxo de Autenticação (SSO) Seguro
- O botão "Acessar DirectAdmin" não usará a senha do cliente nem alterará nenhuma senha.
- O backend validará a posse do serviço e gerará uma **One-Time Login URL** usando o endpoint `/api/login/url` (moderno) ou `CMD_API_LOGIN_KEYS` (legado/fallback).
- A URL gerada será temporária e de uso único, direcionando o cliente diretamente para a sessão dele, sem privilégios administrativos.

### 3. Reforço de Segurança no Backend
- Centralização da lógica de SSO em `DirectAdminProvider.server.ts` e `directadmin.server.ts`.
- Validação estrita: Bloqueio imediato se a URL de SSO gerada tentar autenticar como `admin`, `root` ou qualquer conta de sistema.
- Verificação do `usertype` no servidor remoto antes de permitir a geração da URL.

### 4. Ajustes no Provisionamento e Importação
- **Provisionamento**: Ao criar uma nova conta, o sistema gerará uma senha forte exclusiva para o DirectAdmin.
- **Importação WHMCS**: Ajuste para garantir que o mapeamento de `username` e `next_due_date` seja persistido corretamente, respeitando a separação de credenciais.

## Detalhes Técnicos

- **Modificação em `src/lib/directadmin.server.ts`**: Refatorar `getDASession` para ser a única fonte de verdade para geração de URLs de login, seguindo o padrão `da login-url`.
- **Modificação em `src/lib/whmcs-import.server.ts`**: Garantir que senhas do DirectAdmin importadas não substituam senhas de perfil do Lovable.
- **Reforço em `src/lib/security.server.ts`**: Adicionar logs de auditoria detalhados para cada tentativa de SSO, garantindo rastreabilidade.
- **Migração SQL**: Adição de campos necessários (se ausentes) para rastrear o status de SSO e capacidades do servidor.
