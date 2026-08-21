# Plano de Implementação - Painel Administrativo Aprimorado e Gestão de Clientes

Este plano detalha a criação da tela de gerenciamento de clientes, logs de auditoria de provisionamento e filtros avançados para falhas no dashboard administrativo da EQSAM CLOUD.

## Alterações Propostas

### Backend (Servidores e Funções)

- **Nova Função de Auditoria:** Criação de `getClientProvisioningAudit` em `src/lib/provisioning.functions.ts` e sua implementação em `src/lib/provisioning.server.ts` para buscar o histórico completo de tentativas de ativação por cliente.
- **Expansão do Dossier:** Atualização de `fetchClientDossier` em `src/lib/client-dossier.server.ts` para incluir um resumo de métricas financeiras (saldo devedor) e contagem de serviços.

### Frontend (Interface do Admin)

#### 1. Tela de Detalhes do Cliente (`/admin/clients/$clientId`)
- **Aba Financeira:** Exibição de saldo devedor, listagem de faturas pendentes e histórico de pagamentos.
- **Aba Provisionamento:** Implementação de uma linha do tempo (Timeline) com `timestamps`, tentativas e códigos de erro de cada serviço vinculado ao cliente.
- **Histórico de VPS:** Listagem detalhada das instâncias de VPS contratadas, com status e data de vencimento.

#### 2. Dashboard Admin (`/admin/index.tsx`)
- **Filtros Avançados:** Adição de campos de busca na listagem de "Serviços Pendentes" para filtrar por:
  - Nome do Cliente
  - Produto
  - Data da Falha
  - Tipo de Erro (401, Timeout, IP Blocked, etc.)
- **Melhoria no Audit Log:** Acesso rápido ao log de auditoria diretamente do widget de falhas.

#### 3. Listagem de Clientes (`/admin/clients.tsx`)
- Adição de colunas rápidas para "Faturas Pendentes" e "VPS Ativas" na tabela principal.

## Detalhes Técnicos

- **Componentes:** Utilização de componentes `shadcn/ui` (`Table`, `Badge`, `Tabs`, `Dialog`) para manter a consistência visual "Apple-like" da EQSAM.
- **Dados:** Integração com as tabelas `provisioning_logs`, `services`, `invoices` e `profiles`.
- **Segurança:** Todas as novas funções de servidor utilizam `requireSupabaseAuth` e verificam o papel `admin` via `has_role`.

## Próximos Passos

1. Atualizar `fetchClientDossier` no servidor.
2. Implementar a interface de auditoria na tela do cliente.
3. Adicionar os filtros de busca no dashboard principal.
4. Validar o fluxo completo simulando falhas de provisionamento.
