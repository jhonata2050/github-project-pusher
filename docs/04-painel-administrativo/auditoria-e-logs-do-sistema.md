# Trilha de Auditoria & Logs do Sistema

A integridade operacional, conformidade regulatória e rastreabilidade total de ações no **Painel EQSAM** são mantidas através do módulo de auditoria (`/admin/logs`), garantindo que nenhuma alteração crítica ocorra de forma anônima ou invisível.

---

## 📜 Estrutura da Tabela de Auditoria (`public.audit_logs`)

Cada evento de modificação ou acesso sensível no sistema registra um registro imutável com a seguinte estrutura:

```sql
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Detalhamento dos Campos:
- **`user_id`:** Identificador único do operador ou cliente que disparou a ação.
- **`action`:** Verbo semântico da ação (ex: `service.restart`, `invoice.manual_paid`, `client.impersonate_start`, `app.env_update`).
- **`entity_type` / `entity_id`:** Alvo da operação (ex: entidade `application` com ID `f81d4fae-...`).
- **`details` (JSONB):** Dados contextuais ricos, incluindo diferencial *Antes / Depois* de parâmetros alterados.
- **`ip_address` / `user_agent`:** Rastreabilidade geográfica e identificador de navegador/dispositivo para perícia de segurança.

---

## 🔍 Eventos Auditados Automaticamente

```mermaid
graph TD
    subgraph "Eventos Registrados em Audit Logs"
        E1[Autenticação: Logins com Sucesso, Falhas de Senha, Resets]
        E2[Gestão de Contêineres: Deploys, Rebuilds, Paradas, Exclusões]
        E3[File Manager: Upload de Arquivos, Exclusões, Edição de Código]
        E4[Variáveis & Segredos: Adição, Alteração ou Remoção de Envs]
        E5[Financeiro: Baixas Manuais, Estornos, Criação de Cupons]
        E6[Impersonação: Início e Fim de Navegação como Cliente]
        E7[Cluster: Inclusão de Servidores, Drenagem de Nós (Drain)]
    end
```

---

## 🖥️ Logs Técnicos do Sistema (`system-logs.server.ts`)

Além da auditoria de usuários, o módulo exibe os **Logs Internos do Servidor**:
- Erros de execução capturados por manipuladores globais.
- Falhas transitórias no pool de conexões SSH2.
- Histórico de execução de tarefas agendadas (Cron jobs de backup e cobrança automática).
- Eventos de ativação ou recuperação do **Circuit Breaker**.
- Filtros por nível de severidade: `INFO`, `WARNING`, `ERROR`, `CRITICAL`.
