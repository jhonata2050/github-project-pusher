# Plano: Cadastro Internacional e Identificação Obrigatória

O objetivo é adaptar o sistema para aceitar clientes de qualquer lugar do mundo, tornando a identificação (documento) obrigatória e flexível, além de suportar endereços internacionais.

## Alterações Propostas

### 1. Banco de Dados (Supabase)
*   Adicionar a coluna `identification_type` à tabela `public.profiles` para diferenciar o tipo de documento (CPF, CNPJ, Tax ID, Passaporte, etc.).
*   Garantir que os campos de endereço (`country`, `state`, `city`, `postal_code`, `address_line`) estejam preparados para o fluxo.

### 2. Utilitários de Países
*   Criar `src/lib/countries.ts` contendo uma lista padronizada de países e seus respectivos códigos de discagem (DDI) para facilitar o preenchimento do telefone e validação de endereço.

### 3. Fluxo de Autenticação e Cadastro
*   **Página de Login/Cadastro (`src/routes/auth.tsx`)**:
    *   Adicionar campos obrigatórios de `tax_id` (documento) e `identification_type` no formulário de "Criar Conta".
    *   Implementar seleção de país para ajustar máscaras de telefone (opcional/flexível).
*   **Finalização de Perfil (`src/routes/_authenticated/complete-profile.tsx`)**:
    *   Incluir os mesmos campos de identificação e endereço completo para usuários que entram via Google (OAuth) e precisam completar o perfil.

### 4. Perfil do Usuário (`src/routes/_authenticated/profile.tsx`)
*   Restaurar o campo de documento (que havia sido ocultado anteriormente).
*   Adicionar seletor de país e tipo de identificação.
*   Tornar os campos de endereço obrigatórios para conformidade jurídica.

### 5. Administração (`src/routes/_authenticated/admin/clients.$clientId.tsx`)
*   Restaurar a visibilidade do campo de documento na visão do administrador.
*   Permitir que o administrador edite o tipo de identificação e o país do cliente.

### 6. Checkout (`src/routes/checkout.$productId.tsx` e `src/components/checkout/StepPayment.tsx`)
*   Ajustar a etapa de pagamento para buscar o `tax_id` já cadastrado no perfil, ou solicitar se estiver faltando, aceitando formatos internacionais.

## Detalhes Técnicos
*   **Zod Schemas**: Atualizar as validações para serem menos rígidas com formatos específicos do Brasil (como remover validação estrita de CPF/CNPJ quando o país não for Brasil).
*   **Máscaras**: Usar bibliotecas de máscara flexíveis ou apenas validação de comprimento e caracteres básicos para campos internacionais.

## Segurança e Conformidade
*   O campo `tax_id` continuará sendo protegido por RLS, acessível apenas pelo próprio usuário e por administradores.
*   A obrigatoriedade garante que cada conta tenha uma identidade fiscal associada, facilitando a emissão de faturas.
