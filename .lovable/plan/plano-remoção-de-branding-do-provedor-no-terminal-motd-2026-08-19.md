# Plano: Remoção de Branding do Provedor no Terminal (MOTD)

O usuário relatou que a marca "Contabo" ainda aparece no terminal ao fazer login via SSH, apesar da solicitação anterior para remover menções a provedores. A imagem fornecida confirma que a mensagem de boas-vindas do sistema (MOTD - Message of the Day) contém o texto "This server is hosted by Contabo...".

Como essa mensagem é gerada pelo sistema operacional da VPS e não pelo nosso código frontend/backend, precisamos atualizar o script do agente (`eqsam-agent.sh`) para limpar essa configuração no servidor do cliente durante a instalação ou atualização.

## Alterações Propostas

### Backend (Script do Agente)
- Atualizar `src/routes/api/public/scripts/install-agent.ts`:
  - Adicionar comandos para remover ou limpar arquivos MOTD comuns que contêm branding do provedor.
  - Alvos: `/etc/motd`, `/etc/update-motd.d/*` e `/etc/legal`.
  - Inserir um banner personalizado da **EQSAM CLOUD** no lugar.

### Procedimento no Script
1. Fazer backup/limpar `/etc/motd`.
2. Remover scripts específicos do provedor em `/etc/update-motd.d/`.
3. Criar um novo `/etc/motd` com a identidade visual do cliente.

## Detalhes Técnicos
O script executará:
```bash
# Limpar MOTD padrão
echo "Welcome to EQSAM CLOUD!" > /etc/motd
# Remover mensagens de provedores externos se existirem
rm -f /etc/update-motd.d/10-help-text 2>/dev/null
rm -f /etc/update-motd.d/50-landscape-sysinfo 2>/dev/null
# Silenciar mensagens legais do provedor
[ -f /etc/legal ] && truncate -s 0 /etc/legal
```

Isso garantirá que, ao rodar o comando de instalação do agente (como solicitado anteriormente pelo usuário para cada VPS), o branding seja removido do terminal.
