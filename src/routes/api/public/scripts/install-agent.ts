import { createFileRoute } from '@tanstack/react-router';

const scriptContent = `#!/bin/bash

# Agente de monitoramento simples para HostPanel
# Uso: curl -sSL https://easy-push1231231sa1d131dscxsc.lovable.app/api/public/scripts/install-agent.sh | bash -s -- <VPS_ID>

VPS_ID=$1
API_URL="https://easy-push1231231sa1d131dscxsc.lovable.app/api/public/vps-metrics"

if [ -z "$VPS_ID" ]; then
    echo "Erro: VPS_ID não fornecido."
    echo "Uso correto: curl ... | bash -s -- SEU_UUID_DA_VPS"
    exit 1
fi

echo "Instalando agente de monitoramento para VPS: $VPS_ID"

if command -v apt-get &> /dev/null; then
    NEED_INSTALL=false
    for cmd in curl sar mpstat free df; do
        if ! command -v $cmd &> /dev/null; then
            NEED_INSTALL=true
            break
        fi
    done

    if [ "$NEED_INSTALL" = true ]; then
        echo "Instalando dependências (sysstat, curl)..."
        apt-get update && apt-get install -y sysstat curl
    fi
fi

cat << EOF > /usr/local/bin/hostpanel-agent.sh
#!/bin/bash
VPS_ID="$VPS_ID"
API_URL="$API_URL"

CPU_USAGE=\$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - \$1}')
RAM_USAGE=\$(free | grep Mem | awk '{print \$3/\$2 * 100.0}')
DISK_USAGE=\$(df / | grep / | tail -n 1 | awk '{print \$5}' | sed 's/%//')

# Garantir que os valores sejam números válidos ou 0
CPU_USAGE=\${CPU_USAGE:-0}
RAM_USAGE=\${RAM_USAGE:-0}
DISK_USAGE=\${DISK_USAGE:-0}

curl -s -X POST "\$API_URL" \\
     -H "Content-Type: application/json" \\
     -d "{\\"vps_id\\": \\"$VPS_ID\\", \\"cpu\\": \$CPU_USAGE, \\"ram\\": \$RAM_USAGE, \\"disk\\": \$DISK_USAGE}"
EOF

chmod +x /usr/local/bin/hostpanel-agent.sh

(crontab -l 2>/dev/null | grep -v "hostpanel-agent.sh") > /tmp/cron_tmp
echo "* * * * * /usr/local/bin/hostpanel-agent.sh > /dev/null 2>&1" >> /tmp/cron_tmp
crontab /tmp/cron_tmp
rm /tmp/cron_tmp

echo "Enviando primeira coleta de teste..."
/usr/local/bin/hostpanel-agent.sh

echo "Agente instalado e configurado com sucesso!"
`;

export const Route = createFileRoute('/api/public/scripts/install-agent')({
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
