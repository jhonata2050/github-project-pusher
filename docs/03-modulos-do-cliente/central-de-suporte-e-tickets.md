# Central de Suporte & Chamados (Tickets)

O módulo de suporte do **Painel EQSAM** (`/tickets` e `/tickets/$ticketId`) centraliza o relacionamento técnico e comercial entre o cliente e a equipe de atendimento através de um sistema de chamados estruturado, seguro e auditável.

---

## 🎫 Estrutura de um Chamado de Suporte

Cada ticket é composto pelos seguintes metadados fundamentais:

| Atributo | Valores Possíveis | Descrição / Comportamento |
| :--- | :--- | :--- |
| **Departamento** | *Suporte Técnico, Financeiro, Infraestrutura, Comercial* | Roteia a notificação interna para a equipe especializada competente. |
| **Prioridade** | *Baixa, Média, Alta, Urgente* | Define o SLA de primeira resposta e o destaque visual na fila do painel administrativo. |
| **Status** | *Aberto, Em Atendimento, Aguardando Cliente, Respondido, Fechado* | Controla o ciclo de vida do chamado e o fechamento automático por inatividade. |
| **Serviço Vinculado** | *Opcional (App Cloud, VPS ou Hospedagem)* | Conecta o chamado a um serviço específico, permitindo ao atendente inspecionar logs e status de imediato. |

---

## 💬 Fluxo de Comunicação & Troca de Mensagens

A experiência de atendimento foi desenhada como uma conversa contínua em formato de linha do tempo:

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Painel Web)
    participant Backend as Backend EQSAM (Tickets API)
    participant Storage as Supabase Storage (Anexos)
    participant Resend as Resend Email Service
    actor Staff as Atendente / Suporte

    Cliente->>Backend: Abre chamado com Assunto, Descrição e Anexos
    Backend->>Storage: Grava prints e arquivos de log com hash seguro
    Backend->>Staff: Notifica equipe técnica na fila administrativa
    Staff->>Backend: Analisa incidente e responde o chamado
    Backend->>Resend: Dispara e-mail para o cliente: "Novo parecer no chamado #1234"
    Backend-->>Cliente: Interface do ticket atualiza em tempo real com a resposta
    Cliente->>Backend: Envia réplica com esclarecimentos
    Staff->>Backend: Conclui chamado e define status como "Fechado"
```

---

## 📎 Gestão de Anexos e Arquivos de Diagnóstico

- **Upload Seguro:** Envio direto de capturas de tela (`.png`, `.jpg`, `.webp`), arquivos de configuração (`.env`, `.yaml`, `.json`) e arquivos compactados (`.zip`, `.log`).
- **Isolamento de Acesso:** Os arquivos são gravados em buckets privados com URLs assinadas e expiração temporária, impedindo acesso de terceiros não autenticados.
- **Visualizador Integrado:** Imagens anexadas contam com visualização em modal (Lightbox) direto na interface, sem necessidade de download prévio.

---

## 🔔 Notificações Multicanal

Para evitar que o cliente precise manter a aba do navegador aberta para saber se sua solicitação foi atendida:
1. **E-mail Transacional Instantâneo:** Disparado via Resend com o resumo da resposta do atendente e botão de acesso direto ao chamado.
2. **WhatsApp Notification (Opcional):** Disparo de mensagem no WhatsApp cadastrado no perfil com aviso de resposta e link do chamado.
