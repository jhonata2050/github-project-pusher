#!/bin/bash

# Agente de monitoramento simples para Eqsam
# Uso: curl -sSL https://easy-push1231231sa1d131dscxsc.lovable.app/scripts/install-agent.sh | bash -s -- <VPS_ID>

VPS_ID=$1
# Usando o domínio atual do projeto para garantir que o script funcione no ambiente Lovable
API_URL="https://easy-push1231231sa1d131dscxsc.lovable.app/api/public/vps-metrics"

if [ -z "$VPS_ID" ]; then
    echo "Erro: VPS_ID não fornecido."
    echo "Uso correto: curl ... | bash -s -- SEU_UUID_DA_VPS"
    exit 1
fi

echo "Instalando agente de monitoramento para VPS: $VPS_ID"

# Verificar dependências e instalar se necessário (Debian/Ubuntu)
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

# Criar script de coleta
cat << EOF > /usr/local/bin/eqsam-agent.sh
#!/bin/bash
VPS_ID="$VPS_ID"
API_URL="$API_URL"

# Coletar métricas
# CPU: 100% - idle%
CPU_USAGE=\$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - \$1}')

# RAM: (used / total) * 100
RAM_USAGE=\$(free | grep Mem | awk '{print \$3/\$2 * 100.0}')

# DISK: uso do / em porcentagem
DISK_USAGE=\$(df / | grep / | awk '{print \$5}' | sed 's/%//')

# Enviar para a API via POST
curl -s -X POST "\$API_URL" \\
     -H "Content-Type: application/json" \\
     -d "{\"vps_id\": \"\$VPS_ID\", \"cpu\": \$CPU_USAGE, \"ram\": \$RAM_USAGE, \"disk\": \$DISK_USAGE}"
EOF

chmod +x /usr/local/bin/eqsam-agent.sh

# Adicionar ao crontab (a cada 1 minuto)
# Remove entrada anterior se existir para evitar duplicatas
(crontab -l 2>/dev/null | grep -v "eqsam-agent.sh") > /tmp/cron_tmp
echo "* * * * * /usr/local/bin/eqsam-agent.sh > /dev/null 2>&1" >> /tmp/cron_tmp
crontab /tmp/cron_tmp
rm /tmp/cron_tmp

# Executar uma vez agora para testar
echo "Enviando primeira coleta de teste..."
/usr/local/bin/eqsam-agent.sh

echo "Agente instalado e configurado com sucesso!"
