# Plano de Implementação: Gestão VPS Contabo e Automação Admin

Este plano detalha a implementação das funcionalidades restantes para a gestão de VPS Contabo no painel administrativo, incluindo configuração de API, sincronização de instâncias e atribuição de servidores a clientes.

## 1. Configuração da API Contabo no Admin
- **Objetivo:** Permitir que o administrador configure as credenciais da API Contabo (Client ID, Client Secret, API User, API Pass) diretamente pela interface.
- **Implementação:**
    - Criar tabela `vps_settings` para armazenar configurações criptografadas ou via `system_settings`.
    - Adicionar aba "VPS Contabo" em `admin/finance.tsx` ou nova rota `admin/vps/settings.tsx`.
    - Implementar Server Functions para salvar e testar a conexão.

## 2. Sincronização de Servidores Existentes
- **Objetivo:** Listar todos os servidores ativos na conta Contabo que ainda não estão vinculados a nenhum serviço no sistema.
- **Implementação:**
    - Criar Server Function `syncContaboInstances` que consome a API da Contabo.
    - Adicionar modal ou página de "Importar/Sincronizar" em `admin/vps/index.tsx`.
    - Exibir lista comparativa entre Contabo e Banco de Dados local.

## 3. Atribuição de Servidores a Clientes
- **Objetivo:** Vincular manualmente uma instância da Contabo a um cliente existente (útil para migrações ou correções).
- **Implementação:**
    - Adicionar botão "Vincular Cliente" na lista de instâncias sincronizadas.
    - Criar seletor de cliente/serviço para realizar o `INSERT` na tabela `vps_instances`.

## 4. Gestão Completa no Admin
- **Objetivo:** Permitir ações de energia (Ligar, Desligar, Reiniciar) e visualização de status em tempo real para o admin.
- **Implementação:**
    - Expandir `AdminVPSPage` com botões de ação que chamam `contaboAction` (já existente no `vps.functions.ts`, mas adaptada para bypass de `user_id` se for admin).
    - Adicionar visualização de logs específicos de VPS na auditoria.

## Detalhes Técnicos
- **Segurança:** Uso de `supabaseAdmin` em funções de sincronização para garantir que apenas administradores possam ver todos os servidores da conta master.
- **UX:** Seguindo o padrão AbacatePay (rounded-3xl, lime-green).
- **Componentes:** Utilização de `Dialog` para atribuição e `Skeleton` para carregamento de API externa.
