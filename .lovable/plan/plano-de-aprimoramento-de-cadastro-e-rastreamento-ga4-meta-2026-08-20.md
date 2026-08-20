# Plano de Aprimoramento de Cadastro e Rastreamento (GA4/Meta)

Expandir o processo de cadastro de clientes para coletar informações detalhadas, incluindo origem do cliente, e integrar scripts de rastreamento para análise de vendas.

## Alterações de Banco de Dados

### Migração SQL
- Adicionar coluna `lead_source` (text) e `lead_source_other` (text) à tabela `public.profiles`.
- Adicionar `registration_completed` (boolean, default false) à tabela `public.profiles` para gerenciar o fluxo de finalização de cadastro OAuth.
- Garantir permissões de RLS e GRANTs para os novos campos.

## Alterações no Frontend

### Atualização do Formulário de Cadastro (`src/routes/auth.tsx`)
- Implementar validação de senha forte no Zod (maiúsculas, minúsculas, números, caracteres especiais, min 8).
- Adicionar campo obrigatório de `Nome Completo`.
- Adicionar campo de `Telefone` com máscara e validação.
- Adicionar componente de seleção para `Origem de Conhecimento` (Google, Facebook, Instagram, TikTok, Indicação, Outro).
- Implementar lógica condicional: se "Outro" for selecionado, exibir campo de texto livre obrigatório.

### Fluxo de Finalização de Cadastro OAuth
- Criar nova rota `src/routes/_authenticated/complete-profile.tsx` para usuários que logam via rede social mas não possuem `phone` ou `lead_source`.
- Adicionar middleware de redirecionamento no `AppShell.tsx` ou loader da rota raiz para garantir que usuários incompletos finalizem o perfil.

### Dashboard Administrativo (`src/routes/_authenticated/admin/index.tsx`)
- Adicionar novo card/seção com gráfico de Pizza (Recharts) mostrando a distribuição de `lead_source`.
- Implementar `getLeadSourceStats` em `src/lib/admin.server.ts` e exportar via `src/lib/dashboard-admin.functions.ts`.

## Rastreamento e Analytics

### Integração de Tags
- Configurar Google Tag Manager (GTM) como camada centralizadora.
- Injetar script do GTM no `<head>` em `src/routes/__root.tsx`.
- Criar utilitário `src/lib/analytics.ts` para disparar eventos `purchase`, `lead`, `sign_up`.
- Mapear eventos do GA4 e Meta Pixel via DataLayer do GTM.

## Detalhes Técnicos

### Validação de Senha
```typescript
const passwordSchema = z.string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Deve conter maiúscula")
  .regex(/[a-z]/, "Deve conter minúscula")
  .regex(/[0-9]/, "Deve conter número")
  .regex(/[^A-Za-z0-9]/, "Deve conter caractere especial");
```

### Gráfico de Origem
- Uso de `PieChart` do `recharts` com cores temáticas da marca (Lime/Slate).

### Privacidade e Consentimento
- Adicionar banner de consentimento de cookies básico respeitando a LGPD.
