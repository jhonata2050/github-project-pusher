# Plano de Correção: Salvamento de Gateways e Configurações

O usuário relatou que, após salvar as configurações dos gateways, os campos aparecem vazios no sistema. Isso ocorre porque o sistema está configurado para deletar registros do banco de dados quando eles são salvos como strings vazias, o que causa a perda da referência visual e funcional se o salvamento não for capturado corretamente ou se houver um erro de sincronização entre o estado local do formulário e o que é enviado ao servidor.

## Problemas Identificados
1.  **Lógica de Deletar**: A função `updateSystemSettings` deleta chaves que recebem strings vazias. Se o formulário enviar campos vazios (por não estarem montados ou por erro de captura), os dados existentes são removidos.
2.  **Captura de Dados no Frontend**: No arquivo `finance.tsx`, o loop que captura os campos dos gateways pode estar falhando em pegar valores de campos que não foram alterados se o navegador não preencher o `FormData` corretamente para inputs do tipo `password` ou se houver conflito de nomes.
3.  **Visualização de "Vazio"**: O sistema interpreta `null` (retornado quando a chave não existe) como "não configurado", o que é correto, mas a limpeza agressiva do banco impede que o usuário veja o que salvou se houver qualquer falha parcial.

## Soluções Propostas

### 1. Refinar Backend (`src/lib/support.functions.ts`)
- Manter a proteção contra strings vazias, mas garantir que apenas chaves explicitamente enviadas e vazias sejam tratadas.
- Adicionar logs para depuração de quais chaves estão sendo alteradas ou deletadas.

### 2. Corrigir Frontend (`src/routes/_authenticated/admin/finance.tsx`)
- Garantir que a captura de `FormData` inclua todos os campos necessários, independentemente da aba ativa (o `Tabs` pode desmontar componentes, fazendo com que o `FormData` do formulário pai perca os valores).
- Mudar a estratégia: em vez de ler o DOM direto no `handleSave`, manter um estado local ou garantir que os campos não sejam desmontados.
- **Mudança Crucial**: Usar `forceMount` nas abas de Gateways e Prioridades para que os inputs permaneçam no DOM e seus valores sejam incluídos no `FormData` ao submeter o formulário.

### 3. Melhorar Feedback Visual
- Garantir que o `Badge` de status "Ativo/Inativo" reflita com precisão o estado do banco.

## Detalhes Técnicos
-   **Arquivo**: `src/routes/_authenticated/admin/finance.tsx`
    -   Adicionar `forceMount` aos `TabsContent`.
    -   Revisar o loop de `handleSave` para garantir que `formData.get(field.key)` pegue os valores corretos.
-   **Arquivo**: `src/lib/support.functions.ts`
    -   Revisar `updateSystemSettings` para evitar deleções acidentais.

---
Vou prosseguir com a implementação dessas correções.