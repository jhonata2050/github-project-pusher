import { createFileRoute } from '@tanstack/react-router';

const scriptContent = \`#!/bin/bash

# Agente de monitoramento robusto para HostPanel
# Uso: curl -sSL https://easy-push1231231sa1d131dscxsc.lovable.app/api/public/scripts/install-agent | bash -s -- <VPS_ID>

VPS_ID=$1
API_URL="https://easy-push1231231sa1d131dscxsc.lovable.app/api/public/vps-metrics"

if [ -z "$VPS_ID" ]; then
    echo "Erro: VPS_ID não fornecido."
    exit 1
fi

echo "Instalando agente de monitoramento para VPS: $VPS_ID"

# Garantir dependências
if command -v apt-get &> /dev/null; then
    apt-get update -y > /dev/null 2>&1
    apt-get install -y sysstat curl bc > /dev/null 2>&1
fi

# Criar o script de coleta
cat << 'EOF' > /usr/local/bin/hostpanel-agent.sh
#!/bin/bash
VPS_ID="REPLACE_VPS_ID"
API_URL="REPLACE_API_URL"

# Coleta de CPU (robusta usando /proc/stat)
CPU_STATS1=($(grep 'cpu ' /proc/stat))
IDLE1=\${CPU_STATS1[4]}
TOTAL1=0
for i in \${!CPU_STATS1[@]}; do 
  if [ \$i -gt 0 ]; then TOTAL1=\$((TOTAL1 + \${CPU_STATS1[\$i]})); fi
done

sleep 1

CPU_STATS2=($(grep 'cpu ' /proc/stat))
IDLE2=\${CPU_STATS2[4]}
TOTAL2=0
for i in \${!CPU_STATS2[@]}; do
  if [ \$i -gt 0 ]; then TOTAL2=\$((TOTAL2 + \${CPU_STATS2[\$i]})); fi
done

DIFF_IDLE=\$((IDLE2 - IDLE1))
DIFF_TOTAL=\$((TOTAL2 - TOTAL1))
CPU_USAGE=\$(echo "100 * (\$DIFF_TOTAL - \$DIFF_IDLE) / \$DIFF_TOTAL" | bc -l 2>/dev/null || echo "0")

# Coleta de RAM (usando /proc/meminfo para ser universal)
MEM_TOTAL=\$(grep MemTotal /proc/meminfo | awk '{print \$2}')
MEM_AVAIL=\$(grep MemAvailable /proc/meminfo | awk '{print \$2}')
if [ -z "\$MEM_AVAIL" ]; then
    # Fallback para kernels antigos
    MEM_FREE=\$(grep MemFree /proc/meminfo | awk '{print \$2}')
    MEM_BUFF=\$(grep Buffers /proc/meminfo | awk '{print \$2}')
    MEM_CACH=\$(grep ^Cached /proc/meminfo | awk '{print \$2}')
    MEM_AVAIL=\$((MEM_FREE + MEM_BUFF + MEM_CACH))
fi
RAM_USAGE=\$(echo "100 * (\$MEM_TOTAL - \$MEM_AVAIL) / \$MEM_TOTAL" | bc -l 2>/dev/null || echo "0")

# Coleta de Disco
DISK_USAGE=\$(df / | tail -1 | awk '{print \$5}' | sed 's/%//')

# Limpar valores para garantir que sejam números puros no JSON
CPU_VAL=\$(printf "%.0f" "\$CPU_USAGE" 2>/dev/null || echo "0")
RAM_VAL=\$(printf "%.0f" "\$RAM_USAGE" 2>/dev/null || echo "0")
DISK_VAL=\$(printf "%.0f" "\$DISK_USAGE" 2>/dev/null || echo "0")

# Enviar métricas com silêncio total para evitar poluição
curl -s -X POST "\$API_URL" \\
     -H "Content-Type: application/json" \\
     -d "{\\"vps_id\\": \\"\$VPS_ID\\", \\"cpu\\": \$CPU_VAL, \\"ram\\": \$RAM_VAL, \\"disk\\": \$DISK_VAL}" > /dev/null 2>&1
EOF

# Substituir placeholders
sed -i "s|REPLACE_VPS_ID|$VPS_ID|g" /usr/local/bin/hostpanel-agent.sh
sed -i "s|REPLACE_API_URL|$API_URL|g" /usr/local/bin/hostpanel-agent.sh

chmod +x /usr/local/bin/hostpanel-agent.sh

# Configurar Cron
(crontab -l 2>/dev/null | grep -v "hostpanel-agent.sh") > /tmp/cron_tmp
echo "* * * * * /usr/local/bin/hostpanel-agent.sh > /dev/null 2>&1" >> /tmp/cron_tmp
crontab /tmp/cron_tmp
rm /tmp/cron_tmp

echo "Enviando primeira coleta de teste..."
/usr/local/bin/hostpanel-agent.sh

echo "Agente instalado com sucesso!"
\`;

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
