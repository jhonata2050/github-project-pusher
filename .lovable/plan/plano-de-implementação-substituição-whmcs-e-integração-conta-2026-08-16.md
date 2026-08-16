# Plano de Implementação: Substituição WHMCS e Integração Contabo VPS

Este plano detalha as etapas para tornar o sistema o backend definitivo para revenda de VPS Contabo e hospedagem, eliminando a dependência do WHMCS.

## 1. Fluxo de Faturamento e Renovações (Crítico)
*   **Gerador de Faturas Recorrentes:** Automação para criar novas faturas 7-10 dias antes do vencimento.
*   **Lembretes por E-mail:** Notificações automáticas de cobrança, confirmação e atraso via Resend.
*   **Gestão de Saldo:** Permitir que clientes adicionem créditos para renovação automática.

## 2. Integração Nativa Contabo VPS
*   **Conectividade API:** Implementar cliente para a API da Contabo (Compute API) usando credenciais OAuth2.
*   **Provisionamento Automático:** Gatilho para criar a instância VPS assim que a fatura for paga.
*   **Painel de Controle VPS (Cliente):**
    *   Status em tempo real (Ligado/Desligado).
    *   Ações rápidas: Reiniciar, Reinstalar SO, Ligar/Desligar.
    *   Exibição de credenciais e IP atribuído.
*   **Gestão Administrativa:** Listagem de todas as VPS ativas na Contabo vinculadas aos clientes do HostPanel.

## 3. Registro e Gestão de Domínios
*   **Integração Registrar:** Conexão com APIs de registro (e.g. Registro.br, Namecheap) para venda direta.
*   **DNS Interno:** Interface simplificada para gestão de apontamentos (A, CNAME, MX).

## 4. Marketing e Comunicação
*   **E-mail Marketing:** Ferramenta para envio de e-mails em massa para a base.
*   **Sistema de Afiliados:** Programa de recompensas por indicação com comissões automáticas.

## Detalhes Técnicos
*   **Server Functions:** Criação de `vps.functions.ts` e `vps.server.ts` para isolar a lógica da Contabo.
*   **Database:** Novas tabelas `vps_instances` e `domain_registrations` para rastrear ativos externos.
*   **Segurança:** Armazenamento seguro de segredos de API no backend (add_secret).

## Próximos Passos Imediatos
1. Configurar o fluxo de renovação automática para evitar interrupção de serviços.
2. Iniciar o módulo de integração com a API da Contabo.
