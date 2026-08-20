# Plano de Ação - Bloqueio de Acesso por Serviço

O usuário relatou que o botão "Bloquear Acesso ao DirectAdmin" no dossiê do cliente não funciona e que o objetivo é bloquear um **serviço específico** e não a conta inteira do cliente.

## Análise Técnica
1.  **Estado Atual**: O campo `block_directadmin` foi adicionado à tabela `profiles`, o que afeta todos os serviços do cliente simultaneamente. O switch na interface do admin em `clients.$clientId.tsx` atualiza este campo global.
2.  **Problema**: O usuário deseja que o bloqueio seja granular (por serviço).
3.  **Correção**: Mover a lógica de bloqueio da tabela `profiles` para a tabela `services`.

## Alterações Propostas

### 1. Banco de Dados (Supabase)
- Criar uma nova migração SQL para adicionar a coluna `block_directadmin` (boolean, default false) à tabela `public.services`.
- (Opcional) Manter a coluna em `profiles` ou removê-la se não for mais necessária para bloqueio global, mas o foco é o bloqueio por serviço.

### 2. Funções de Servidor
- **`src/lib/support.functions.ts`**:
    - Atualizar `updateServiceDetails` para aceitar o campo `block_directadmin`.
    - Atualizar `getDASSOUrl` para verificar o bloqueio diretamente na linha do serviço na tabela `services`, em vez de olhar para o perfil.
- **`src/lib/admin.server.ts`**:
    - Atualizar `updateServiceDetailsImplementation` para persistir o novo campo.

### 3. Interface Administrativa
- **`src/routes/_authenticated/admin/clients.$clientId.tsx`**:
    - Remover o switch de bloqueio global da aba "Dados".
    - Adicionar o switch de bloqueio dentro do modal de edição de serviço (na aba "Serviços"), permitindo que o administrador bloqueie cada serviço individualmente.

### 4. Interface do Cliente
- **`src/routes/_authenticated/services.index.tsx`**:
    - Atualizar a verificação de bloqueio no botão "Painel" para ler `svc.block_directadmin`.
- **`src/routes/_authenticated/services.$serviceId.tsx`**:
    - Atualizar a verificação de bloqueio no manipulador `handleSSO` para ler `service.block_directadmin`.

## Validação
- Abrir o dossiê de um cliente no admin.
- Ir em "Serviços", editar um serviço específico e ativar o bloqueio.
- Tentar acessar o painel desse serviço como cliente (deve ser bloqueado).
- Tentar acessar outro serviço do mesmo cliente (deve funcionar normalmente).
