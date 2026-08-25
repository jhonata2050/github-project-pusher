# Plano: Migração para Evolution API v2

Migrar a integração de WhatsApp do padrão "Evolution Go" (centralizado) para o padrão "Evolution API v2" (baseado em instâncias no path).

## Alterações Técnicas

### Backend (`src/lib/whatsapp.server.ts`)
- Alterar a construção da `targetUrl` para incluir o nome da instância no path: `${evolutionUrl}/message/sendText/${instance}`.
- Ajustar o payload JSON removendo o campo `instance` (que agora faz parte da URL).
- Manter a normalização do número com o sufixo `@s.whatsapp.net` para garantir compatibilidade.

### Interface Administrativa (`src/routes/_authenticated/admin/whatsapp.tsx`)
- Atualizar títulos e descrições de "Evolution Go" para "Evolution API v2".
- Ajustar o placeholder e exemplo da URL para refletir o padrão da v2.

## Verificação
- Testar a conexão através do botão "Testar Conexão" no painel administrativo.
- Validar os logs de auditoria (`audit_logs`) para garantir que o formato da requisição e a resposta da API estão corretos.
