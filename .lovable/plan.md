# Plano de Ação - Restaurar Logo e Ajustar Branding

O usuário questionou o motivo da remoção do logo do sistema. Após análise técnica, identifiquei que o logo está configurado corretamente no banco de dados (`system_settings`), mas pode haver inconsistências na forma como ele é carregado ou exibido devido a mudanças recentes na lógica de branding dinâmico.

## Alterações Propostas

### 1. Ajuste no Hook de Branding
- Revisar `src/hooks/use-branding.ts` para garantir que o logo seja carregado corretamente e que os fallbacks não interfiram na exibição quando uma URL válida existe.
- Garantir que a lógica de "limpeza" de cores no painel administrativo não remova visualmente o logo se ele for parte da identidade.

### 2. Verificação do Componente de Logo
- Ajustar os componentes `AppShell.tsx`, `auth.tsx` e `index.tsx` para garantir que a lógica de renderização do logo (`branding.logo_url`) seja resiliente a valores vazios ou nulos, priorizando sempre a imagem configurada.

### 3. Melhoria na Lógica de Servidor
- Ajustar `getBrandingImplementation` em `src/lib/admin.server.ts` para garantir que a mesclagem dos valores do banco de dados com os padrões não resulte em perda de dados (como o `logo_url`).

## Detalhes Técnicos
- O banco de dados contém: `logo_url: "https://www.eqsam.com/cdn/imagens/eqsam-laranja.png"`.
- O código atual em `AppShell.tsx` e `index.tsx` utiliza `branding.logo_url ? <img ... /> : <span>...</span>`.
- Vou garantir que o estado inicial e o carregamento via API (`/api/public/branding`) não sobrescrevam a URL do logo com `null` indevidamente durante a hidratação ou navegação entre áreas (admin/cliente).

## Validação
- Verificar a exibição do logo na página inicial, tela de login e painel administrativo (mobile e desktop).
- Garantir que a troca entre o modo "admin" (branding padrão Eqsam) e "cliente" (branding customizado) não quebre a exibição do logo configurado.
