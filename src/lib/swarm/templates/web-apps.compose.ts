import type { TemplateContext } from "./types";

export function buildWordPressCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, getEnv, limits } = ctx;
  const wpDbName = getEnv("WORDPRESS_DB_NAME", "wordpress");
  const wpDbUser = getEnv("WORDPRESS_DB_USER", "wordpress");
  const wpDbPass = getEnv("WORDPRESS_DB_PASSWORD");
  const wpRootPass = getEnv("MYSQL_ROOT_PASSWORD");

  return `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_db:
    driver: local
  vol_${cleanId}_html:
    driver: local
services:
  db:
    image: mysql:8.4
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_db:/var/lib/mysql
    environment:
      MYSQL_DATABASE: "${wpDbName}"
      MYSQL_USER: "${wpDbUser}"
      MYSQL_PASSWORD: "${wpDbPass}"
      MYSQL_ROOT_PASSWORD: "${wpRootPass}"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.dbWpCpu}"
          memory: ${limits.dbWpMem}
  app:
    image: wordpress:6.6-php8.3-apache
    networks:
      - net_${cleanId}
      - public-ingress
    volumes:
      - vol_${cleanId}_html:/var/www/html
    environment:
      WORDPRESS_DB_HOST: "db:3306"
      WORDPRESS_DB_USER: "${wpDbUser}"
      WORDPRESS_DB_PASSWORD: "${wpDbPass}"
      WORDPRESS_DB_NAME: "${wpDbName}"
      WORDPRESS_CONFIG_EXTRA: "if (isset(\\$_SERVER['HTTP_X_FORWARDED_PROTO']) && \\$_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') { \\$_SERVER['HTTPS'] = 'on'; }"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.appWpCpu}"
          memory: ${limits.appWpMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=80"
`;
}

export function buildN8NCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, getEnv, limits } = ctx;
  const n8nDbPass = getEnv("DB_POSTGRESDB_PASSWORD", getEnv("POSTGRES_PASSWORD"));
  const n8nEncKey = getEnv("N8N_ENCRYPTION_KEY");

  return `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_pg:
    driver: local
  vol_${cleanId}_data:
    driver: local
services:
  db:
    image: postgres:16-alpine
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_pg:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: "n8n"
      POSTGRES_USER: "n8n"
      POSTGRES_PASSWORD: "${n8nDbPass}"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.dbWpCpu}"
          memory: ${limits.dbWpMem}
  app:
    image: n8nio/n8n:1.55.0
    networks:
      - net_${cleanId}
      - public-ingress
    volumes:
      - vol_${cleanId}_data:/home/node/.n8n
    environment:
      DB_TYPE: "postgresdb"
      DB_POSTGRESDB_HOST: "db"
      DB_POSTGRESDB_PORT: "5432"
      DB_POSTGRESDB_DATABASE: "n8n"
      DB_POSTGRESDB_USER: "n8n"
      DB_POSTGRESDB_PASSWORD: "${n8nDbPass}"
      N8N_ENCRYPTION_KEY: "${n8nEncKey}"
      N8N_PORT: "5678"
      N8N_PROTOCOL: "https"
      WEBHOOK_URL: "https://${cleanHost}/"
      N8N_EDITOR_BASE_URL: "https://${cleanHost}/"
      GENERIC_TIMEZONE: "America/Sao_Paulo"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.appWpCpu}"
          memory: ${limits.appWpMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=5678"
`;
}

export function buildKumaCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, limits } = ctx;

  return `version: '3.8'
networks:
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_kuma:
    driver: local
services:
  app:
    image: louislam/uptime-kuma:1
    networks:
      - public-ingress
    volumes:
      - vol_${cleanId}_kuma:/app/data
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3001"
`;
}

export function buildGhostCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, limits } = ctx;

  return `version: '3.8'
networks:
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_ghost:
    driver: local
services:
  app:
    image: ghost:5-alpine
    networks:
      - public-ingress
    volumes:
      - vol_${cleanId}_ghost:/var/lib/ghost/content
    environment:
      url: "https://${cleanHost}"
      NODE_ENV: "production"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=2368"
`;
}
