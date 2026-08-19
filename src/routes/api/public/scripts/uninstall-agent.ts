import { createFileRoute } from '@tanstack/react-router';

const scriptContent = `#!/bin/bash

echo "Desinstalando agente de monitoramento HostPanel..."

# Remover cronjob
(crontab -l 2>/dev/null | grep -v "hostpanel-agent.sh") > /tmp/cron_tmp
crontab /tmp/cron_tmp
rm /tmp/cron_tmp

# Remover arquivos
if [ -f /usr/local/bin/hostpanel-agent.sh ]; then
    rm /usr/local/bin/hostpanel-agent.sh
    echo "Script do agente removido."
fi

echo "Agente desinstalado com sucesso!"
`;

export const Route = createFileRoute('/api/public/scripts/uninstall-agent')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(scriptContent, {
          headers: {
            'Content-Type': 'text/x-shellscript',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      },
    },
  },
});
