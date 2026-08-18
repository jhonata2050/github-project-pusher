# Plano de Refatoração da API de Servidores e Categorização

Este plano visa corrigir falhas na API de sincronização de planos da Contabo e organizar o retorno dos dados para permitir uma separação clara entre diferentes tipos de servidores/planos (como Cloud VPS vs VPS XL vs VDS).

## Problemas Identificados
1.  **Falha de Sincronização**: O endpoint de produtos da Contabo às vezes retorna uma lista plana e difícil de distinguir por categorias.
2.  **Tratamento de Erros**: Falta de robustez na captura de falhas de autenticação ou de rede, resultando em "loading infinito" ou erros não amigáveis na UI.
3.  **Estrutura de Resposta**: Os planos são retornados sem categorização, dificultando a seleção pelo administrador.

## Alterações Propostas

### 1. Refatoração do Servidor (`src/lib/contabo.server.ts`)
*   Adicionar lógica de categorização no método `getContaboProductTypes`.
*   O critério de separação será o `name` do produto (ex: "Cloud VPS", "VDS", "Storage VPS").
*   Implementar retentativas básicas e mensagens de erro mais específicas para cada estágio (Auth, Fetch, Parse).

### 2. Ajuste na Função de Servidor (`src/lib/vps-admin.functions.ts`)
*   Atualizar `getContaboPlansFn` para suportar o novo formato categorizado ou garantir que a ordenação facilite a distinção.

### 3. Melhoria na UI de Admin (`src/routes/_authenticated/admin/products.tsx`)
*   Modificar o seletor de planos Contabo para exibir os planos agrupados por categoria.
*   Adicionar tratamento visual para erros de API e estados vazios.

## Detalhes Técnicos
*   **Critério de Agrupamento**: Regex ou prefixos nos nomes retornados pela Contabo.
*   **Estrutura de Dados**: 
    ```typescript
    type CategorizedPlans = {
      category: string;
      items: ContaboPlan[];
    }[]
    ```
*   **Compatibilidade**: Manter o campo `productId` como chave primária para não quebrar vínculos existentes.

## Verificação
*   Testar a carga do catálogo em Admin > Produtos > Novo > Tipo VPS.
*   Verificar se os planos aparecem categorizados no dropdown de seleção.
*   Simular erro de API para garantir que o sistema não trave.

Irei prosseguir com a implementação destas melhorias.
