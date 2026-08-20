# Plano de Correção: Layout e Menus Administrativos

O usuário relatou que o menu não está funcionando e que "está tudo junto na mesma tela". Isso ocorre devido a dois problemas principais:
1.  **Financeiro (Tabs):** O uso de `forceMount={true}` nas abas de configurações financeiras faz com que todos os conteúdos sejam renderizados simultaneamente. A lógica de ocultação estava no elemento filho e não no `TabsContent`, resultando em sobreposição visual (margens e paddings acumulados).
2.  **Layout (AppShell):** A restrição de altura (`h-screen overflow-hidden`) no container principal da área administrativa, sem o `overflow-y-auto` correspondente no elemento `main` em dispositivos móveis, impede a rolagem da página e a interação com o menu.

## Alterações Propostas

### 1. Ajuste nas Abas de Configurações Financeiras
- Arquivo: `src/routes/_authenticated/admin/finance.tsx`
- Mover a classe `data-[state=inactive]:hidden` para o componente `TabsContent`.
- Isso garantirá que as abas inativas fiquem completamente ocultas (inclusive suas margens e espaçamentos), enquanto permanecem no DOM para que o `FormData` consiga capturar os valores de todos os campos ao salvar.

### 2. Correção de Rolagem e Interatividade no Layout
- Arquivo: `src/components/app/AppShell.tsx`
- Alterar `lg:overflow-y-auto` para `overflow-y-auto` no elemento `main`.
- Garantir que o container principal tenha `overflow-hidden` apenas quando necessário, permitindo que o `main` gerencie sua própria rolagem.
- Adicionar `pointer-events-auto` ao header móvel para garantir que cliques no botão de menu (hambúrguer) não sejam bloqueados por camadas invisíveis.

## Detalhes Técnicos
- Utilizar seletores de atributo do Tailwind (`data-[state=inactive]:hidden`) para gerenciar visibilidade baseada no estado do Radix UI.
- Ajustar as classes de utilitário do `AppShell` para suportar layouts de altura total (full-height) com áreas de conteúdo roláveis independentes.
