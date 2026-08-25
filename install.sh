#!/usr/bin/env bash
# ==============================================================================
# 🚀 EQSAM PAINEL — SCRIPT DE INSTALAÇÃO AUTOMATIZADA PARA VPS LINUX (Ubuntu / Debian)
# ==============================================================================
set -e

# Cores para saída no terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sem cor

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${GREEN}       🚀 INICIANDO INSTALAÇÃO AUTOMATIZADA DO EQSAM PAINEL NA VPS     ${NC}"
echo -e "${BLUE}==============================================================================${NC}\n"

# 1. Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Por favor, execute este script como root: sudo bash install.sh${NC}"
  exit 1
fi

# 2. Atualização dos pacotes do sistema
echo -e "${YELLOW}📦 [1/7] Atualizando repositórios e pacotes do sistema...${NC}"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git unzip zip tar build-essential ufw htop net-tools ca-certificates gnupg lsb-release

# 3. Instalar Node.js 22 LTS
echo -e "${YELLOW}📦 [2/7] Instalando Node.js 22 LTS e NPM...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js $(node -v) e NPM $(npm -v) instalados com sucesso!${NC}"

# 4. Instalar Docker e Docker Compose
echo -e "${YELLOW}🐳 [3/7] Instalando Docker e Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi
echo -e "${GREEN}✓ Docker $(docker --version) ativo!${NC}"

# 5. Criar estrutura de diretórios do Filesystem real
echo -e "${YELLOW}📂 [4/7] Criando diretórios físicos de clientes e storage...${NC}"
INSTALL_DIR="/var/www/eqsam-painel"
STORAGE_DIR="/var/www/eqsam-painel/storage/apps"
CLIENTS_DIR="/var/www/clientes"

mkdir -p "$INSTALL_DIR"
mkdir -p "$STORAGE_DIR"
mkdir -p "$CLIENTS_DIR"
mkdir -p "/var/log/eqsam-painel"

# 6. Instalar Caddy Server para servir domínios e proxy reverso
echo -e "${YELLOW}🌐 [5/7] Instalando Caddy Server oficial...${NC}"
if ! command -v caddy &> /dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg --yes
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
systemctl enable caddy
systemctl start caddy

# 7. Configuração do Firewall (UFW)
echo -e "${YELLOW}🛡️  [6/7] Configurando regras de Firewall...${NC}"
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3000/tcp || true
ufw allow 8080/tcp || true
echo "y" | ufw enable || true

# 8. Criar serviço Systemd para o EQSAM Painel
echo -e "${YELLOW}⚙️  [7/7] Configurando serviço Systemd do EQSAM Painel...${NC}"
cat << 'EOF' > /etc/systemd/system/eqsam-painel.service
[Unit]
Description=EQSAM Painel - Hosting & Server Management
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/eqsam-painel
ExecStart=/usr/bin/npm run preview -- --port 8080 --host 0.0.0.0
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=STORAGE_PATH=/var/www/eqsam-painel/storage/apps

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${GREEN}🎉 INSTALAÇÃO BASE DA VPS CONCLUÍDA COM SUCESSO!${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo -e "Diretório da Aplicação: ${YELLOW}$INSTALL_DIR${NC}"
echo -e "Filesystem dos Clientes: ${YELLOW}$STORAGE_DIR${NC}"
echo -e "\nPara iniciar o painel na VPS:"
echo -e "  1. Copie os arquivos do projeto para ${YELLOW}/var/www/eqsam-painel${NC}"
echo -e "  2. Configure o arquivo ${YELLOW}/var/www/eqsam-painel/.env${NC}"
echo -e "  3. Execute: ${YELLOW}cd /var/www/eqsam-painel && npm install && npm run build${NC}"
echo -e "  4. Inicie o serviço: ${YELLOW}systemctl start eqsam-painel && systemctl enable eqsam-painel${NC}"
echo -e "${BLUE}==============================================================================${NC}\n"
