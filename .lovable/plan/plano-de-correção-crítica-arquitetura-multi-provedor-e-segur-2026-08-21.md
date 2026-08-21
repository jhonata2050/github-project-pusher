# Plano de Correção Crítica — Arquitetura Multi-Provedor e Segurança SSO

Refatorar a arquitetura de autenticação e gerenciamento de infraestrutura para garantir isolamento total entre administradores e clientes, implementando uma camada de abstração de provedores (Hosting Providers).

## 1. Abstração de Provedores de Hospedagem
Criar uma interface padronizada e implementações específicas para isolar a lógica de cada painel (DirectAdmin, cPanel, etc.).

- Criar `src/lib/hosting-provider.ts` com a interface `HostingProvider`.
- Criar `src/lib/hosting-provider-factory.ts` para instanciar o provedor correto baseado no tipo do servidor.
- Implementar `DirectAdminProvider` em `src/lib/directadmin-provider.server.ts`.

## 2. Refatoração do DirectAdmin (Segurança SSO)
Corrigir a falha onde o cliente era autenticado como admin.

- Garantir que `generateClientLogin()` utilize apenas o usuário individual do cliente.
- Validar no backend que o `usertype` no DirectAdmin é estritamente 'user'.
- Bloquear login administrativo via SSO para qualquer usuário que não seja o desenvolvedor master.

## 3. Segurança de Credenciais e IDOR
Reforçar o isolamento de dados no backend.

- Mover todas as chamadas sensíveis de API para o backend (`createServerFn`).
- Implementar validação de propriedade (`service.user_id === authenticated_user.id`) em todas as funções de gerenciamento.
- Garantir que `api_token` e `api_user` administrativos nunca saiam do backend.

## 4. Banco de Dados e Relações
Validar e garantir a relação correta entre serviços e contas de provedor.

- Verificar se `services.username` e `services.server_id` estão sendo usados corretamente para identificar a conta no provedor.
- Garantir que as políticas de RLS no Supabase impeçam clientes de lerem a tabela `servers`.

## Detalhes Técnicos
- Camada de abstração via Strategy Pattern para Provedores.
- Validação multi-camada no SSO (Database ownership + Remote level check).
- Redução de exposição de credenciais em logs e respostas de API.
