import { calculateDatabasePort } from "../../app-subdomain";
import type { TemplateContext } from "./types";

export function buildPostgresCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, wildcard, getEnv, limits } = ctx;
  const dbPort = calculateDatabasePort(cleanId, "postgres");
  const pgDb = getEnv("POSTGRES_DB", "main");
  const pgUser = getEnv("POSTGRES_USER", "postgres");
  const pgPass = getEnv("POSTGRES_PASSWORD");

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
services:
  db:
    image: postgres:16-alpine
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_pg:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: "${pgDb}"
      POSTGRES_USER: "${pgUser}"
      POSTGRES_PASSWORD: "${pgPass}"
    ports:
      - target: 5432
        published: ${dbPort}
        mode: ingress
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.dbCpu}"
          memory: ${limits.dbMem}
  adminer:
    image: adminer:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      ADMINER_DEFAULT_SERVER: "db"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.adminerCpu}"
          memory: ${limits.adminerMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_adminer-http.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_adminer-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_adminer-http.service=${stackName}_adminer"
        - "traefik.http.routers.${stackName}_adminer-https.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_adminer-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_adminer-https.tls=true"
        - "traefik.http.routers.${stackName}_adminer-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_adminer-https.service=${stackName}_adminer"
        - "traefik.http.services.${stackName}_adminer.loadbalancer.server.port=8080"
`;
}

export function buildMySQLCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, wildcard, getEnv, limits } = ctx;
  const dbPort = calculateDatabasePort(cleanId, "mysql");
  const mysqlDb = getEnv("MYSQL_DATABASE", "main");
  const mysqlUser = getEnv("MYSQL_USER", "dbuser");
  const mysqlPass = getEnv("MYSQL_PASSWORD");
  const mysqlRootPass = getEnv("MYSQL_ROOT_PASSWORD");

  return `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_mysql:
    driver: local
services:
  db:
    image: mysql:8.4
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_mysql:/var/lib/mysql
    environment:
      MYSQL_DATABASE: "${mysqlDb}"
      MYSQL_USER: "${mysqlUser}"
      MYSQL_PASSWORD: "${mysqlPass}"
      MYSQL_ROOT_PASSWORD: "${mysqlRootPass}"
    ports:
      - target: 3306
        published: ${dbPort}
        mode: ingress
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.dbCpu}"
          memory: ${limits.dbMem}
  adminer:
    image: adminer:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      ADMINER_DEFAULT_SERVER: "db"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.adminerCpu}"
          memory: ${limits.adminerMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_adminer-http.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_adminer-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_adminer-http.service=${stackName}_adminer"
        - "traefik.http.routers.${stackName}_adminer-https.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_adminer-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_adminer-https.tls=true"
        - "traefik.http.routers.${stackName}_adminer-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_adminer-https.service=${stackName}_adminer"
        - "traefik.http.services.${stackName}_adminer.loadbalancer.server.port=8080"
`;
}

export function buildRedisCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, wildcard, getEnv, limits } = ctx;
  const dbPort = calculateDatabasePort(cleanId, "redis");
  const redisPass = getEnv("REDIS_PASSWORD");

  return `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_redis:
    driver: local
services:
  db:
    image: redis:7.2-alpine
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${redisPass}"]
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_redis:/data
    ports:
      - target: 6379
        published: ${dbPort}
        mode: ingress
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.dbCpu}"
          memory: ${limits.dbMem}
  rediscommander:
    image: rediscommander/redis-commander:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      REDIS_HOSTS: "local:db:6379:0:${redisPass}"
      PORT: "8081"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.adminerCpu}"
          memory: ${limits.adminerMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_rediscommander-http.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_rediscommander-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_rediscommander-http.service=${stackName}_rediscommander"
        - "traefik.http.routers.${stackName}_rediscommander-https.rule=Host(\`${cleanHost}\`) || Host(\`admin-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_rediscommander-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_rediscommander-https.tls=true"
        - "traefik.http.routers.${stackName}_rediscommander-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_rediscommander-https.service=${stackName}_rediscommander"
        - "traefik.http.services.${stackName}_rediscommander.loadbalancer.server.port=8081"
`;
}

export function buildPocketbaseCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, limits } = ctx;

  return `version: '3.8'
networks:
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_pb:
    driver: local
services:
  app:
    image: ghcr.io/muchobien/pocketbase:latest
    networks:
      - public-ingress
    volumes:
      - vol_${cleanId}_pb:/pb_data
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
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=8090"
`;
}
