# Plano de Melhoria de Responsividade

O usuário relatou problemas de responsividade em várias páginas e popups (modais), com foco nos diálogos que estouram a tela ou dificultam a navegação em dispositivos móveis. O objetivo é garantir que todos os elementos interativos se adaptem corretamente a diferentes tamanhos de tela.

## Alterações Propostas

### 1. Componentes Base (UI)
- **Modais (Dialog):**
  - Ajustar `DialogContent` em `src/components/ui/dialog.tsx` para garantir que o conteúdo seja rolável quando a altura da tela for pequena.
  - Aplicar `max-h-[90vh]` e `overflow-y-auto`.
  - Melhorar o preenchimento em telas pequenas para evitar que o modal encoste nas bordas laterais (`w-[95%]`).

### 2. Páginas Específicas
- **Dossiê do Cliente (Admin):**
  - O formulário de edição de serviço em `src/routes/_authenticated/admin/clients.$clientId.tsx` é longo. Vou adicionar uma estrutura de scroll interno no modal e garantir que o grid de campos (`grid-cols-2`) mude para `grid-cols-1` em telas menores.
  - Garantir que as tabelas de auditoria e logs tenham `overflow-x-auto` (já parecem ter, mas vou revisar).
- **Checkout e Página Inicial:**
  - Revisar componentes de planos e checkout para garantir que o layout de colunas se adapte.
  - Ajustar padding e margens globais para evitar cortes de conteúdo.

### 3. Ajustes de Layout Global
- Revisar o `AppShell` ou componentes de navegação para garantir que o menu lateral não atrapalhe em resoluções específicas.

## Detalhes Técnicos
- Uso de classes utilitárias do Tailwind: `max-h-[90vh]`, `overflow-y-auto`, `grid-cols-1 sm:grid-cols-2`.
- Verificação de `DialogPrimitive.Content` para garantir que `PointerEvents` não quebrem o scroll.
- Ajuste de `DialogContent` para ser mais flexível:
  ```tsx
  // Exemplo de mudança no DialogContent
  "fixed left-[50%] top-[50%] z-50 grid w-[95%] max-w-lg ... overflow-y-auto max-h-[95vh]"
  ```
