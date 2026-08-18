#!/bin/bash

# Agente de monitoramento simples para HostPanel
# Uso: curl -sSL ... | bash -s -- <VPS_ID>

VPS_ID=$1
API_URL="https://easy-push1231231sa1d131dscxsc.lovable.app/api/public/vps-metrics"

if [ -z "$VPS_ID" ]; then
    echo "Erro: VPS_ID não fornecido."
    exit 1
fi

echo "Instalando agente de monitoramento para VPS: $VPS_ID"

# Verificar dependências
for cmd in curl sar mpstat free df; do
    if ! command -v $cmd &> /dev/null; then
        echo "Instalando dependência: sysstat"
        apt-get update && apt-get install -y sysstat
        break
    fi
done

# Criar script de coleta
cat << 'EOF' > /usr/local/bin/hostpanel-agent.sh
#!/bin/bash
VPS_ID=$1
API_URL=$2

# Coletar métricas
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
RAM_USAGE=$(free | grep Mem | awk '{print $3/$2 * 100.0}')
DISK_USAGE=$(df / | grep / | awk '{print $5}' | sed 's/%//')

# Enviar para a API
curl -X POST "$API_URL" \
     -H "Content-Type: application/json" \
     -d "{\"vps_id\": \"$VPS_ID\", \"cpu\": $CPU_USAGE, \"ram\": $RAM_USAGE, \"disk\": $DISK_USAGE}"
EOF

chmod +x /usr/local/bin/hostpanel-agent.sh

# Adicionar ao crontab (a cada 1 minuto)
(crontab -l 2>/dev/null; echo "* * * * * /usr/local/bin/hostpanel-agent.sh $VPS_ID $API_URL") | crontab -

echo "Agente instalado com sucesso!"
