# Plano de Desenvolvimento: Fase 3, 4 e Otimização

O sistema evoluirá para se tornar um substituto completo do WHMCS, com foco em automação real de servidores DirectAdmin, sincronização de planos e otimização de performance.

## 1. Otimização de Performance
- **Data Pre-fetching:** Implementar pre-fetching de dados nas rotas administrativas e de cliente usando `onMouseEnter` ou `onFocus` nos links do TanStack Router.
- **Cache de Queries:** Ajustar o `staleTime` das queries do TanStack Query para evitar re-fetches desnecessários em dados estáticos (ex: listas de produtos, configurações).
- **Redução de Hydration Missmatches:** Garantir que o estado inicial da sessão e perfis não causem saltos de layout.

## 2. Fase 3 e 4: Integração DirectAdmin e Automação
O objetivo é transformar os placeholders em integrações reais.

### Sincronização de Planos (Sellers Sync)
- Criar interface no Admin para listar pacotes diretamente do servidor DirectAdmin conectado.
- Permitir vincular um `Produto` do sistema a um `Pacote` do DirectAdmin.
- Implementar botão "Sincronizar Pacotes" que busca as configurações do servidor.

### Automação de Provisionamento
- **Fluxo de Ativação:** Após pagamento da fatura, o sistema deve:
  1. Gerar um usuário e senha aleatórios.
  2. Chamar a API do DirectAdmin para criar a conta no plano vinculado.
  3. Salvar as credenciais na tabela `services`.
  4. Enviar e-mail automático com os dados de acesso (via Resend).
- **Suspensão/Exclusão Automática:**
  1. Script de verificação diária para suspender contas com faturas vencidas há > 3 dias.
  2. Script para remover contas após 30 dias de inadimplência (conforme solicitado).

## 3. Gestão Administrativa
- **Editor de Produtos:** Criar formulário completo para editar planos (nome, slug, descrição, pacotes DA, preços).
- **Teste de Conexão:** Finalizar o botão "Testar Conexão" na área de servidores para validar credenciais da API em tempo real.

## Detalhes Técnicos
- **Server Functions:** Centralizar lógica do DirectAdmin em `src/lib/directadmin.server.ts` para segurança total de tokens.
- **Banco de Dados:** Atualizar RLS para garantir que clientes só vejam seus próprios dados de provisionamento.
- **Eventos:** Usar hooks do Supabase (Edge Functions ou triggers) para disparar ações de provisionamento após atualização do status da fatura para `paid`.

## User-facing Changes
- Dashboard Admin mais rápido.
- Área de "Meus Serviços" com detalhes reais do DirectAdmin (IP, Usuário, Senha, Link de Acesso).
- Gestão completa de planos no painel administrativo.
