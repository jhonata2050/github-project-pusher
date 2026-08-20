# Plano de Implementação: Bloqueio de Acesso ao DirectAdmin

Este plano detalha a implementação de uma funcionalidade que permite aos administradores bloquear o acesso de clientes específicos ao painel do DirectAdmin, mantendo a operatividade do site e outros serviços.

## Objetivos
*   Adicionar controle administrativo para restringir o acesso SSO (Single Sign-On) ao DirectAdmin.
*   Garantir que serviços como sites, e-mails e bancos de dados continuem funcionando.
*   Manter a flexibilidade para reverter o bloqueio a qualquer momento.

## Alterações Técnicas

### 1. Banco de Dados (Supabase)
*   Adicionar a coluna `block_directadmin` (boolean, default false) à tabela `profiles`.
*   Atualizar permissões e grants para garantir que o campo possa ser lido e escrito pela equipe administrativa.

### 2. Funções de Servidor (Server Functions)
*   **`src/lib/admin.functions.ts`**: Atualizar o validador do Zod e a lógica da função `updateClientProfile` para incluir o campo `block_directadmin`.
*   **`src/lib/support.functions.ts`**: Modificar a função `getDASSOUrl` para verificar se o cliente proprietário do serviço possui o acesso bloqueado. Se bloqueado, a função deve lançar um erro impedindo a geração do URL de acesso.

### 3. Interface Administrativa (Frontend)
*   **`src/routes/_authenticated/admin/clients.$clientId.tsx`**:
    *   Adicionar um campo de "Checkbox" ou "Switch" na aba de "Dados" do cliente com o rótulo "Bloquear Acesso ao DirectAdmin".
    *   Integrar este novo campo com o formulário de atualização do perfil.

### 4. Interface do Cliente (Frontend)
*   **`src/routes/_authenticated/services.index.tsx`** e **`src/routes/_authenticated/services.$serviceId.tsx`**:
    *   Ajustar a exibição dos botões de "Acessar Painel" para refletir o estado de bloqueio (ex: desabilitar o botão ou mostrar um alerta caso o acesso seja solicitado).

## Verificação e Testes
*   Validar que o novo campo persiste corretamente no banco de dados.
*   Tentar acessar o DirectAdmin via painel do cliente com o bloqueio ativado e confirmar que o acesso é negado com a mensagem correia.
*   Confirmar que o bloqueio pode ser desfeito e o acesso restaurado instantaneamente.
