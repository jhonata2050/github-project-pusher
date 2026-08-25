# Plano de Diferenciação de Planos VPS vs Hospedagem

Diferenciar o tratamento de Planos VPS no sistema, permitindo a vinculação direta a instâncias VPS, exibição de detalhes técnicos (IP, Status, Recursos) e separação da lógica de gerenciamento administrativo.

## Mudanças no Banco de Dados

- Criar migração para adicionar `vps_instance_id` na tabela `services` (opcional, já temos `vps_instances.service_id`, mas facilita buscas).
- **Decisão:** Manteremos a relação via `vps_instances.service_id` já existente (1:1), mas otimizaremos as consultas.

## Alterações no Backend (Server Functions)

1.  **`src/lib/client-dossier.server.ts`**:
    - Já configurado para trazer `vps_instances` no join de `services`.

2.  **`src/lib/support.functions.ts`**:
    - Atualizar `updateServiceDetails` para permitir vincular/desvincular uma instância VPS diretamente pelo ID da instância.

3.  **`src/lib/vps-admin.functions.ts`**:
    - Criar função `getAvailableVPSInstances` para listar instâncias não vinculadas ou do cliente específico.

## Alterações na Interface (Frontend)

1.  **`src/routes/_authenticated/admin/clients.$clientId.tsx`**:
    - **Lista de Serviços:** Melhorar o badge/ícone para distinguir VPS de Hosting.
    - **Modal "Gerenciar Serviço":**
        - Se o produto for do tipo 'vps', exibir campos específicos: IP Principal, Status da Instância, Sistema Operacional.
        - Adicionar seletor para vincular a uma instância VPS existente no sistema.
        - Ocultar campos de "Usuário do Servidor (SSO)" e "Servidor Vinculado" (DirectAdmin) se for VPS, focando em "Instância VPS".

2.  **`src/routes/_authenticated/admin/products.tsx`**:
    - Garantir que a criação de produtos permita definir claramente o `product_type` como 'vps' ou 'hosting'.

## Detalhes Técnicos
- O sistema usará `product_type === 'vps'` para alternar entre os formulários.
- A vinculação de VPS será feita atualizando o campo `service_id` na tabela `vps_instances`.
- Logs de auditoria registrarão trocas de vinculação.
