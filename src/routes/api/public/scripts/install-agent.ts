import { createFileRoute } from '@tanstack/react-router';

const scriptContent = `#!/bin/bash

# Agente de monitoramento robusto para EQSAM CLOUD
# Uso: curl -sSL https://easy-push1231231sa1d131dscxsc.lovable.app/api/public/scripts/install-agent | bash -s -- <VPS_ID>

VPS_ID=$1
API_URL="https://easy-push1231231sa1d131dscxsc.lovable.app/api/public/vps-metrics"

if [ -z "$VPS_ID" ]; then
    echo "Erro: VPS_ID não fornecido."
    exit 1
fi

echo "Instalando agente de monitoramento para EQSAM CLOUD: $VPS_ID"

# Garantir dependências
if command -v apt-get &> /dev/null; then
    apt-get update -y > /dev/null 2>&1
    apt-get install -y sysstat curl bc > /dev/null 2>&1
fi

# Remover branding do provedor no terminal (MOTD)
if [ -f /etc/motd ]; then
    cat << 'BANNER' > /etc/motd
 ____________________________________________________________________
|                                                                    |
|                      BEM-VINDO A EQSAM CLOUD                       |
|____________________________________________________________________|

Este servidor e gerenciado via painel EQSAM (eqsam.com).
Para suporte, entre em contato via area do cliente.
BANNER
fi

# Remover scripts de MOTD dinâmicos que podem conter branding
rm -f /etc/update-motd.d/10-help-text 2>/dev/null
rm -f /etc/update-motd.d/50-landscape-sysinfo 2>/dev/null
rm -f /etc/update-motd.d/99-contabo-branding 2>/dev/null # Específico do provedor
[ -f /etc/legal ] && truncate -s 0 /etc/legal

# Criar o script de coleta

# Usamos um heredoc simples para evitar problemas com o compilador TS
cat << 'EOF' > /usr/local/bin/eqsam-agent.sh
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
if [ "\$DIFF_TOTAL" -eq "0" ]; then
    CPU_USAGE=0
else
    CPU_USAGE=\$(echo "100 * (\$DIFF_TOTAL - \$DIFF_IDLE) / \$DIFF_TOTAL" | bc -l 2>/dev/null || echo "0")
fi

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
DISK_USED_GB=\$(df -BG / | tail -1 | awk '{print \$3}' | sed 's/G//')
DISK_TOTAL_GB=\$(df -BG / | tail -1 | awk '{print \$2}' | sed 's/G//')

# Coleta de IOPS e Rede (amostragem de 1 segundo)
DSTAT1=\$(awk '\$3 ~ /^(sd|vd|nvme|xvd)/ && \$3 !~ /[0-9]\$/ {r+=\$4; w+=\$8} END {print r+0" "w+0}' /proc/diskstats)
NSTAT1=\$(awk 'NR>2 {gsub(":"," ",\$0); if (\$1 != "lo") {rx+=\$2; tx+=\$10}} END {print rx+0" "tx+0}' /proc/net/dev)
sleep 1
DSTAT2=\$(awk '\$3 ~ /^(sd|vd|nvme|xvd)/ && \$3 !~ /[0-9]\$/ {r+=\$4; w+=\$8} END {print r+0" "w+0}' /proc/diskstats)
NSTAT2=\$(awk 'NR>2 {gsub(":"," ",\$0); if (\$1 != "lo") {rx+=\$2; tx+=\$10}} END {print rx+0" "tx+0}' /proc/net/dev)

IOPS_READ=\$(( \$(echo \$DSTAT2 | cut -d' ' -f1) - \$(echo \$DSTAT1 | cut -d' ' -f1) ))
IOPS_WRITE=\$(( \$(echo \$DSTAT2 | cut -d' ' -f2) - \$(echo \$DSTAT1 | cut -d' ' -f2) ))
NET_IN_B=\$(( \$(echo \$NSTAT2 | cut -d' ' -f1) - \$(echo \$NSTAT1 | cut -d' ' -f1) ))
NET_OUT_B=\$(( \$(echo \$NSTAT2 | cut -d' ' -f2) - \$(echo \$NSTAT1 | cut -d' ' -f2) ))
NET_IN=\$(echo "scale=2; \$NET_IN_B / 1048576" | bc -l 2>/dev/null || echo "0")
NET_OUT=\$(echo "scale=2; \$NET_OUT_B / 1048576" | bc -l 2>/dev/null || echo "0")

[ "\$IOPS_READ" -lt 0 ] 2>/dev/null && IOPS_READ=0
[ "\$IOPS_WRITE" -lt 0 ] 2>/dev/null && IOPS_WRITE=0

# Limpar valores para garantir que sejam números puros no JSON
CPU_VAL=\$(printf "%.0f" "\$CPU_USAGE" 2>/dev/null || echo "0")
RAM_VAL=\$(printf "%.0f" "\$RAM_USAGE" 2>/dev/null || echo "0")
DISK_VAL=\$(printf "%.0f" "\$DISK_USAGE" 2>/dev/null || echo "0")
NET_IN_VAL=\$(printf "%.2f" "\$NET_IN" 2>/dev/null || echo "0")
NET_OUT_VAL=\$(printf "%.2f" "\$NET_OUT" 2>/dev/null || echo "0")
DISK_USED_VAL=\$(printf "%.0f" "\${DISK_USED_GB:-0}" 2>/dev/null || echo "0")
DISK_TOTAL_VAL=\$(printf "%.0f" "\${DISK_TOTAL_GB:-0}" 2>/dev/null || echo "0")

# Enviar métricas com silêncio total para evitar poluição
curl -s -X POST "\$API_URL" \\
     -H "Content-Type: application/json" \\
     -d "{\\"vps_id\\": \\"\$VPS_ID\\", \\"cpu\\": \$CPU_VAL, \\"ram\\": \$RAM_VAL, \\"disk\\": \$DISK_VAL, \\"iops_read\\": \$IOPS_READ, \\"iops_write\\": \$IOPS_WRITE, \\"net_in\\": \$NET_IN_VAL, \\"net_out\\": \$NET_OUT_VAL, \\"disk_used_gb\\": \$DISK_USED_VAL, \\"disk_total_gb\\": \$DISK_TOTAL_VAL}" > /dev/null 2>&1
EOF

# Substituir placeholders
sed -i "s|REPLACE_VPS_ID|$VPS_ID|g" /usr/local/bin/eqsam-agent.sh
sed -i "s|REPLACE_API_URL|$API_URL|g" /usr/local/bin/eqsam-agent.sh

chmod +x /usr/local/bin/eqsam-agent.sh

# Configurar Cron
(crontab -l 2>/dev/null | grep -v "eqsam-agent.sh") > /tmp/cron_tmp
echo "* * * * * /usr/local/bin/eqsam-agent.sh > /dev/null 2>&1" >> /tmp/cron_tmp
crontab /tmp/cron_tmp
rm /tmp/cron_tmp

echo "Enviando primeira coleta de teste..."
/usr/local/bin/eqsam-agent.sh

echo "Agente instalado com sucesso!"
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
