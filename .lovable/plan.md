# Plano de Implementação - Substituição de "Eqsam" por Logo

Este plano descreve as alterações necessárias para substituir o texto estático "Eqsam" ou o ícone de fallback pelo logo dinâmico do sistema em várias partes da aplicação, garantindo uma identidade visual consistente.

## Alterações Propostas

### 1. Ajuste no AppShell (Mobile e Desktop)
- No `src/components/app/AppShell.tsx`, a lógica de exibição do logo já existe, mas vamos garantir que ela seja aplicada corretamente tanto no cabeçalho mobile quanto na barra lateral desktop.
- Substituir o texto estático `branding.app_name` no cabeçalho mobile pelo componente de logo dinâmico.

### 2. Ajuste na Página Inicial (Landing Page)
- No `src/routes/index.tsx`, garantir que o cabeçalho utilize o logo dinâmico de forma proeminente.

### 3. Ajuste na Página de Login/Auth
- No `src/routes/auth.tsx`, a lógica já foi parcialmente implementada, mas vamos revisar para garantir que o logo apareça corretamente no centro do formulário.

## Detalhes Técnicos

- **Componente de Logo**: Utilizar o `branding.logo_url` obtido através do hook `useBranding()`.
- **Fallback**: Caso o `logo_url` seja nulo, manter o fallback atual (primeira letra do nome do app ou o nome do app em texto) para evitar que a interface fique vazia.
- **Estilização**: Ajustar as classes CSS (Tailwind) para garantir que o logo tenha um tamanho apropriado (max-height e aspect-ratio) em diferentes contextos.

## Passos de Verificação

1. Acessar a página de login e verificar se o logo aparece no lugar do texto "Eqsam.".
2. Acessar o dashboard em visualização mobile e verificar o cabeçalho.
3. Verificar a barra lateral no desktop.
4. Testar a alteração do logo nas configurações de branding para confirmar a reatividade.
